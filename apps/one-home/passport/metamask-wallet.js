/* One Home v14.67.110 — canonical MetaMask Passport linking with native mobile deeplink.
   EVM linking is chain-aware and server-authoritative via passport-evm-wallet.
   Solana Devnet linking remains isolated on the existing Solana ownership service. */
(function(){
  'use strict';

  if(window.__oneHomeMetaMaskWalletsV1467110)return;
  window.__oneHomeMetaMaskWalletsV1467110=true;

  var SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
  var SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var FUNCTIONS_BASE=SUPABASE_URL+'/functions/v1';
  var EVM_ENDPOINT=FUNCTIONS_BASE+'/passport-evm-wallet';
  var LEGACY_CHALLENGE_ENDPOINT=FUNCTIONS_BASE+'/onehome-wallet-challenge';
  var LEGACY_COMPLETE_ENDPOINT=FUNCTIONS_BASE+'/onehome-wallet-complete';
  var SDK_PATH='/assets/vendor/metamask-connect-multichain-1.2.0.js';
  var SOLANA_SCOPE='solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
  var SOLANA_CHAIN_KEY='solana-devnet';
  var SOLANA_RPC='https://api.devnet.solana.com';

  var sdkPromise=null;
  var clientCache=new Map();
  var linkBusy=false;

  function clean(value){return String(value==null?'':value).trim();}
  function lower(value){return clean(value).toLowerCase();}
  function isEvmAddress(value){return /^0x[a-fA-F0-9]{40}$/.test(clean(value));}

  function supabase(){
    return [
      window.oneHomePassportSupabase,
      window.doodProfileSupabase,
      window.doodSupabase,
      window.supabaseClient
    ].find(function(client){return client&&client.auth;})||null;
  }

  async function passportSession(){
    var client=supabase();
    if(!client)throw new Error('Your One Home Passport is still loading.');
    var result=await client.auth.getSession();
    if(result.error)throw result.error;
    var session=result.data&&result.data.session;
    if(!session||!session.user||!session.access_token)throw new Error('Sign in to your One Home Passport first.');
    return session;
  }

  function friendlyError(error){
    var code=Number(error&&error.code);
    var message=clean(error&&error.message||error||'MetaMask could not finish connecting.');
    if(code===4001||/reject|denied|cancel/i.test(message))return 'The MetaMask request was cancelled.';
    if(code===-32002||/already pending|pending request/i.test(message))return 'MetaMask already has a request waiting. Open MetaMask and finish or reject it, then try again.';
    if(/wallet_mismatch/i.test(message)||/different account/i.test(message))return message;
    if(/expired/i.test(message))return 'The MetaMask wallet-link request expired. Please try again.';
    if(/already verified under another/i.test(message)||/already linked to another/i.test(message))return message;
    if(/install|not found/i.test(message))return 'Open or install MetaMask, then try again.';
    return message||'MetaMask could not finish connecting.';
  }

  async function callEndpoint(endpoint,token,body){
    var response=await fetch(endpoint,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_KEY,
        'Authorization':'Bearer '+token
      },
      body:JSON.stringify(body||{})
    });
    var data=await response.json().catch(function(){return {};});
    if(!response.ok||data.success===false||data.ok===false||data.error){
      var error=new Error(clean(data.error)||'The wallet request could not be completed.');
      error.code=data.code||response.status;
      error.data=data;
      throw error;
    }
    return data;
  }

  function loadSdk(){
    if(window.OneHomeMetaMaskSDK&&typeof window.OneHomeMetaMaskSDK.createMultichainClient==='function')return Promise.resolve(window.OneHomeMetaMaskSDK);
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise(function(resolve,reject){
      var prior=document.querySelector('script[data-onehome-metamask-sdk]');
      var script=prior||document.createElement('script');
      function ready(){
        if(window.OneHomeMetaMaskSDK&&typeof window.OneHomeMetaMaskSDK.createMultichainClient==='function')resolve(window.OneHomeMetaMaskSDK);
        else reject(new Error('MetaMask access did not finish loading. Refresh and try again.'));
      }
      script.addEventListener('load',ready,{once:true});
      script.addEventListener('error',function(){reject(new Error('MetaMask access could not load. Refresh and try again.'));},{once:true});
      if(!prior){
        script.src=SDK_PATH;
        script.async=true;
        script.dataset.onehomeMetamaskSdk='1';
        document.head.appendChild(script);
      }
    }).catch(function(error){sdkPromise=null;throw error;});
    return sdkPromise;
  }

  async function multichainClient(scope,rpc){
    var key=scope+'|'+rpc;
    if(clientCache.has(key))return clientCache.get(key);
    var promise=loadSdk().then(function(sdk){
      return sdk.createMultichainClient({
        dapp:{
          name:'One Home',
          url:window.location.origin,
          iconUrl:window.location.origin+'/assets/one-home-logo.png'
        },
        api:{supportedNetworks:{[scope]:rpc}},
        analytics:{enabled:false},
        ui:{preferExtension:true,showInstallModal:false}
      });
    }).catch(function(error){clientCache.delete(key);throw error;});
    clientCache.set(key,promise);
    return promise;
  }

  function accountFromSession(session,scope){
    var scopes=session&&session.sessionScopes||{};
    var accounts=scopes[scope]&&Array.isArray(scopes[scope].accounts)?scopes[scope].accounts:[];
    var prefix=scope+':';
    var account=accounts.find(function(value){return clean(value).indexOf(prefix)===0;});
    return account?clean(account).slice(prefix.length):'';
  }

  function utf8Hex(value){
    return '0x'+Array.from(new TextEncoder().encode(String(value||''))).map(function(byte){return byte.toString(16).padStart(2,'0');}).join('');
  }

  function injectedMetaMaskProvider(){
    var root=window.ethereum;
    if(!root)return null;
    var providers=Array.isArray(root.providers)?root.providers:[];
    var found=providers.find(function(provider){return provider&&provider.isMetaMask&&!provider.isBraveWallet;});
    if(found)return found;
    if(root.isMetaMask&&!root.isBraveWallet)return root;
    return null;
  }

  async function injectedMetaMaskAddress(provider){
    var accounts=await provider.request({method:'eth_requestAccounts',params:[]});
    var address=Array.isArray(accounts)?clean(accounts[0]):'';
    if(!isEvmAddress(address))throw new Error('MetaMask did not return an EVM account.');
    return address;
  }

  function utf8Base64(value){
    var bytes=new TextEncoder().encode(String(value||''));
    var binary='';
    for(var i=0;i<bytes.length;i+=1)binary+=String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function evmList(){
    var session=await passportSession();
    return callEndpoint(EVM_ENDPOINT,session.access_token,{action:'list'});
  }

  async function evmNetwork(chainKey){
    var key=lower(chainKey);
    if(!key)throw new Error('Choose the EVM network before linking MetaMask.');
    var list=await evmList();
    var chain=(Array.isArray(list.chains)?list.chains:[]).find(function(item){return lower(item.chain_key)===key;});
    if(!chain)throw new Error('That EVM network is not currently available for MetaMask in One Home.');
    var chainId=Number(chain.chain_id);
    var rpcUrls=Array.isArray(chain.rpc_urls)?chain.rpc_urls.filter(Boolean):[];
    var add=chain.wallet_add_chain||{};
    if(!rpcUrls.length&&Array.isArray(add.rpcUrls))rpcUrls=add.rpcUrls.filter(Boolean);
    if(!Number.isSafeInteger(chainId)||chainId<=0||!rpcUrls.length)throw new Error((chain.display_name||key)+' is missing its MetaMask network configuration.');
    return Object.assign({},chain,{chain_id:chainId,scope:'eip155:'+String(chainId),rpc:rpcUrls[0]});
  }

  async function connectEvm(chainKey,expectedAddress){
    var session=await passportSession();
    var chain=await evmNetwork(chainKey);
    var expected=clean(expectedAddress);
    if(expected&&!isEvmAddress(expected))throw new Error('Enter the complete 0x MetaMask wallet address you want to use.');

    var provider=injectedMetaMaskProvider();
    var wallet=null;
    var address='';
    if(provider){
      // Desktop extension and MetaMask's in-app browser use the injected
      // provider directly. This avoids relay/deeplink approval gaps on mobile.
      address=await injectedMetaMaskAddress(provider);
    }else{
      wallet=await multichainClient(chain.scope,chain.rpc);
      await wallet.connect([chain.scope],[],undefined,true);
      var walletSession=await wallet.provider.getSession();
      address=accountFromSession(walletSession,chain.scope);
    }
    if(!isEvmAddress(address))throw new Error('MetaMask did not return an EVM account for '+(chain.display_name||chain.chain_key)+'.');
    if(expected&&lower(address)!==lower(expected)){
      throw new Error('MetaMask is using '+address+', but you entered '+expected+'. Switch to that exact MetaMask account and try again.');
    }

    var challenge=await callEndpoint(EVM_ENDPOINT,session.access_token,{
      action:'challenge',
      chain_key:chain.chain_key,
      wallet_address:address
    });
    if(!challenge.challenge_id||!challenge.browser_nonce||!challenge.challenge_message)throw new Error('One Home did not return a complete MetaMask ownership challenge.');

    var signature;
    if(provider){
      signature=await provider.request({
        method:'personal_sign',
        params:[utf8Hex(challenge.challenge_message),address]
      });
    }else{
      signature=await wallet.invokeMethod({
        scope:chain.scope,
        request:{
          method:'personal_sign',
          params:[utf8Hex(challenge.challenge_message),address]
        }
      });
    }
    signature=clean(signature&&signature.result||signature);
    if(!/^0x(?:[a-fA-F0-9]{128}|[a-fA-F0-9]{130})$/.test(signature))throw new Error('MetaMask did not return a valid ownership signature.');

    var completed=await callEndpoint(EVM_ENDPOINT,session.access_token,{
      action:'complete',
      challenge_id:challenge.challenge_id,
      browser_nonce:challenge.browser_nonce,
      wallet_address:address,
      chain_key:chain.chain_key,
      signature:signature
    });

    var verified=completed&&completed.wallet;
    if(!completed.linked||!verified||lower(verified.wallet_address)!==lower(address)){
      throw new Error('MetaMask approved the request, but One Home could not confirm the verified Passport wallet.');
    }

    try{window.dispatchEvent(new CustomEvent('onehome-metamask-wallet-linked',{detail:{ecosystem:'evm',chain_key:chain.chain_key,wallet_address:address,wallet_id:verified.id||''}}));}catch(_error){}
    try{window.dispatchEvent(new CustomEvent('onehome-chain-wallet-changed',{detail:{ecosystem:'evm',chain_key:chain.chain_key,wallet_address:address,wallet_id:verified.id||''}}));}catch(_error){}
    return verified;
  }

  async function connectSolana(expectedAddress){
    var session=await passportSession();
    var wallet=await multichainClient(SOLANA_SCOPE,SOLANA_RPC);
    await wallet.connect([SOLANA_SCOPE],[],{solana_accountChanged_notifications:true},true);
    var walletSession=await wallet.provider.getSession();
    var address=accountFromSession(walletSession,SOLANA_SCOPE);
    if(!address)throw new Error('MetaMask did not return a Solana Devnet account.');
    if(expectedAddress&&clean(expectedAddress)!==address)throw new Error('MetaMask is using a different Solana account than the wallet you entered.');

    var challenge=await callEndpoint(LEGACY_CHALLENGE_ENDPOINT,session.access_token,{
      ecosystem:'solana',
      chain_key:SOLANA_CHAIN_KEY,
      wallet_address:address
    });
    if(challenge.already_linked){
      try{window.dispatchEvent(new CustomEvent('onehome-metamask-wallet-linked',{detail:{ecosystem:'solana',chain_key:SOLANA_CHAIN_KEY,wallet_address:address,wallet_id:challenge.wallet_id||''}}));}catch(_error){}
      return {id:challenge.wallet_id||'',provider:'metamask',ecosystem:'solana',wallet_address:address,verification_chain_key:SOLANA_CHAIN_KEY,status:'verified'};
    }

    var signed=await wallet.invokeMethod({
      scope:SOLANA_SCOPE,
      request:{method:'signMessage',params:{account:{address:address},message:utf8Base64(challenge.challenge_message)}}
    });
    var signature=clean(signed&&signed.signature||signed);
    var completed=await callEndpoint(LEGACY_COMPLETE_ENDPOINT,session.access_token,{
      challenge_id:challenge.challenge_id,
      browser_nonce:challenge.browser_nonce,
      wallet_address:address,
      public_key:address,
      signature:signature
    });
    if(!completed.wallet_id)throw new Error('MetaMask signed the Solana ownership request, but One Home could not confirm the linked wallet.');
    try{window.dispatchEvent(new CustomEvent('onehome-metamask-wallet-linked',{detail:{ecosystem:'solana',chain_key:SOLANA_CHAIN_KEY,wallet_address:address,wallet_id:completed.wallet_id}}));}catch(_error){}
    return {id:completed.wallet_id,provider:'metamask',ecosystem:'solana',wallet_address:address,verification_chain_key:SOLANA_CHAIN_KEY,status:'verified'};
  }

  async function link(ecosystem,chainKey,expectedAddress){
    if(linkBusy)throw new Error('A MetaMask wallet request is already in progress.');
    linkBusy=true;
    try{
      if(ecosystem==='evm')return await connectEvm(chainKey,expectedAddress);
      if(ecosystem==='solana')return await connectSolana(expectedAddress);
      throw new Error('That MetaMask wallet type is not supported.');
    }catch(error){
      var wrapped=new Error(friendlyError(error));
      wrapped.code=error&&error.code;
      wrapped.cause=error;
      throw wrapped;
    }finally{
      linkBusy=false;
    }
  }

  window.OneHomeMetaMaskWallets={
    version:'14.67.110',
    link:link,
    linkEvm:function(chainKey,expectedAddress){return link('evm',chainKey,expectedAddress);},
    listEvm:evmList,
    refresh:evmList
  };
})();
