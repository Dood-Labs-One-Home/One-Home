/* One Home Core Wallet — mainnet EVM and Avalanche X/P ownership linking.
   Uses Core's EIP-1193 provider. Wallet linking is off-chain and never sends AVAX. */
(function(){
  'use strict';
  if(window.OneHomeCoreWallets) return;

  var SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
  var SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var ENDPOINT=SUPABASE_URL+'/functions/v1/onehome-core-wallet';
  var CORE_EVM_CHAIN='avalanche-mainnet';
  var CORE_MAINNET_CHAIN_ID='0xa86a';
  var busy=false;
  var announcedProvider=null;

  function clean(value){return String(value==null?'':value).trim();}
  function lower(value){return clean(value).toLowerCase();}
  function isEvmAddress(value){return /^0x[a-fA-F0-9]{40}$/.test(clean(value));}
  function isCoreInfo(detail){return !!(detail&&detail.info&&detail.info.rdns==='app.core.extension'&&detail.provider&&typeof detail.provider.request==='function');}

  function getCoreProvider(){
    if(window.avalanche&&typeof window.avalanche.request==='function') return Promise.resolve(window.avalanche);
    if(announcedProvider) return Promise.resolve(announcedProvider);
    return new Promise(function(resolve){
      var done=false;
      function finish(provider){
        if(done) return;
        done=true;
        window.removeEventListener('eip6963:announceProvider',onAnnounce);
        resolve(provider||null);
      }
      function onAnnounce(event){
        if(isCoreInfo(event&&event.detail)){
          announcedProvider=event.detail.provider;
          finish(announcedProvider);
        }
      }
      window.addEventListener('eip6963:announceProvider',onAnnounce);
      window.dispatchEvent(new Event('eip6963:requestProvider'));
      setTimeout(function(){finish(null)},300);
    });
  }

  function supabase(){
    return [window.oneHomePassportSupabase,window.doodProfileSupabase,window.doodSupabase,window.supabaseClient]
      .find(function(client){return client&&client.auth})||null;
  }

  async function passportSession(){
    var client=supabase();
    if(!client) throw new Error('Your One Home Passport is still loading.');
    var result=await client.auth.getSession();
    if(result.error) throw result.error;
    var session=result.data&&result.data.session;
    if(!session||!session.user||!session.access_token) throw new Error('Sign in to your One Home Passport first.');
    return session;
  }

  async function callFunction(session,body){
    var response=await fetch(ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+session.access_token},
      body:JSON.stringify(body||{})
    });
    var data=await response.json().catch(function(){return {}});
    if(!response.ok||data.success===false||data.error){
      var error=new Error(clean(data.error)||'The Core wallet request could not be completed.');
      error.code=data.code||response.status;
      throw error;
    }
    return data;
  }

  function utf8Hex(value){
    return '0x'+Array.from(new TextEncoder().encode(String(value||'')))
      .map(function(byte){return byte.toString(16).padStart(2,'0')}).join('');
  }

  function friendlyError(error){
    var code=Number(error&&error.code);
    var message=clean(error&&error.message||error||'Core could not finish connecting.');
    if(code===4001||/reject|denied|cancel/i.test(message)) return 'The Core request was cancelled.';
    if(/core_extension_required|core.*not detected|extension is not available/i.test(message)) return 'Open One Home in the browser where the Core Extension is installed, then try again.';
    if(/wallet_already_linked_to_another_passport/i.test(message)) return 'This Core wallet is already linked to another One Home Passport.';
    if(/chain_not_available/i.test(message)) return 'Core wallet linking is not enabled for this Avalanche network yet.';
    if(/mainnet.*address|switch.*mainnet|fuji/i.test(message)) return 'Switch Core to Avalanche Mainnet, then try again.';
    if(/expired/i.test(message)) return 'The wallet proof expired. Please reconnect.';
    return message;
  }

  async function connectEvm(provider,session){
    var accounts=await provider.request({method:'eth_requestAccounts',params:[]});
    var address=Array.isArray(accounts)?clean(accounts[0]):'';
    if(!isEvmAddress(address)) throw new Error('Core did not return an EVM account.');
    var chainId=lower(await provider.request({method:'eth_chainId',params:[]}));
    if(chainId!==CORE_MAINNET_CHAIN_ID){
      await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:CORE_MAINNET_CHAIN_ID}]});
      chainId=lower(await provider.request({method:'eth_chainId',params:[]}));
    }
    if(chainId!==CORE_MAINNET_CHAIN_ID) throw new Error('Switch Core to Avalanche Mainnet, then try again.');

    var challenge=await callFunction(session,{
      action:'challenge',kind:'evm',chain_key:CORE_EVM_CHAIN,wallet_address:address
    });
    if(!challenge.challenge_id||!challenge.browser_nonce||!challenge.challenge_message) throw new Error('One Home did not return a complete Core ownership proof.');
    var signature=await provider.request({
      method:'personal_sign',
      params:[utf8Hex(challenge.challenge_message),address]
    });
    signature=clean(signature&&signature.result||signature);
    if(!/^0x(?:[a-fA-F0-9]{128}|[a-fA-F0-9]{130})$/.test(signature)) throw new Error('Core did not return a valid EVM ownership signature.');

    var completed=await callFunction(session,{
      action:'complete',kind:'evm',challenge_id:challenge.challenge_id,browser_nonce:challenge.browser_nonce,
      wallet_address:address,chain_key:CORE_EVM_CHAIN,signature:signature
    });
    var wallet=completed&&completed.wallet;
    if(!completed.linked||!wallet||lower(wallet.wallet_address)!==lower(address)||wallet.provider!=='core'){
      throw new Error('Core approved the request, but One Home could not confirm the verified Passport wallet.');
    }
    return wallet;
  }

  function accountRecords(result){
    var records=[];
    if(Array.isArray(result)){
      result.forEach(function(value,index){if(value&&typeof value==='object')records.push({value:value,index:Number.isInteger(value.index)?value.index:index})});
      return records;
    }
    if(result&&result.accounts&&typeof result.accounts==='object') return accountRecords(result.accounts);
    if(result&&typeof result==='object'){
      Object.keys(result).forEach(function(key){
        var value=result[key];
        if(value&&typeof value==='object'){
          var index=Number.isInteger(value.index)?value.index:(/^\d+$/.test(key)?Number(key):null);
          records.push({value:value,index:index});
        }
      });
    }
    return records;
  }

  function collectStrings(value,output,depth){
    if(depth>8||value==null) return output;
    if(typeof value==='string'){output.push(value);return output}
    if(Array.isArray(value)){value.forEach(function(item){collectStrings(item,output,depth+1)});return output}
    if(typeof value==='object'){Object.keys(value).forEach(function(key){collectStrings(value[key],output,depth+1)})}
    return output;
  }

  function activeAccount(records,evmAddress){
    return records.find(function(item){
      var value=item.value;
      return value.active===true||value.isActive===true||value.selected===true;
    })||records.find(function(item){
      return collectStrings(item.value,[],0).some(function(value){return lower(value)===lower(evmAddress)})
    })||records[0]||null;
  }

  function xpAddressFor(record,chainAlias){
    var strings=collectStrings(record&&record.value,[],0);
    var wanted=chainAlias.toLowerCase()+'-avax1';
    var value=strings.find(function(item){return lower(item).indexOf(wanted)===0})||
      strings.find(function(item){return /^(?:[xp]-)?avax1[a-z0-9]+$/i.test(clean(item))});
    if(!value) throw new Error('Core did not expose the X/P address for its connected account. Open Core and reconnect this site.');
    value=lower(value).replace(/^[xp]-/,'');
    if(value.indexOf('fuji1')===0) throw new Error('Switch Core to Avalanche Mainnet, then try again.');
    if(value.indexOf('avax1')!==0) throw new Error('Core returned an address outside Avalanche Mainnet.');
    return chainAlias.toUpperCase()+'-'+value;
  }

  async function connectXp(provider,session,chainKey){
    var alias=chainKey==='avalanche-x-mainnet'?'X':chainKey==='avalanche-p-mainnet'?'P':'';
    if(!alias) throw new Error('Choose an Avalanche X-Chain or P-Chain wallet.');
    var evmAccounts=await provider.request({method:'eth_requestAccounts',params:[]});
    var evmAddress=Array.isArray(evmAccounts)?clean(evmAccounts[0]):'';
    if(!isEvmAddress(evmAddress)) throw new Error('Connect your Core account first.');
    var result=await provider.request({method:'avalanche_getAccounts',params:[]});
    var records=accountRecords(result);
    var selected=activeAccount(records,evmAddress);
    if(!selected) throw new Error('Core did not return an account for this site.');
    var address=xpAddressFor(selected,alias);

    var challenge=await callFunction(session,{
      action:'challenge',kind:'xp',chain_key:chainKey,wallet_address:address
    });
    if(!challenge.challenge_id||!challenge.browser_nonce||!challenge.challenge_message) throw new Error('One Home did not return a complete Core ownership proof.');
    var params=[challenge.challenge_message];
    if(Number.isInteger(selected.index)&&selected.index>=0) params.push(selected.index);
    var signature=await provider.request({method:'avalanche_signMessage',params:params});
    signature=clean(signature&&signature.result||signature);
    if(!signature) throw new Error('Core did not return an X/P ownership signature.');

    var completed=await callFunction(session,{
      action:'complete',kind:'xp',challenge_id:challenge.challenge_id,browser_nonce:challenge.browser_nonce,
      wallet_address:address,chain_key:chainKey,signature:signature
    });
    var wallet=completed&&completed.wallet;
    if(!completed.linked||!wallet||lower(wallet.wallet_address)!==lower(address)||wallet.provider!=='core'){
      throw new Error('Core approved the request, but One Home could not confirm the verified Passport wallet.');
    }
    return wallet;
  }

  async function link(kind,chainKey){
    if(busy) throw new Error('A Core wallet request is already in progress.');
    busy=true;
    try{
      var provider=await getCoreProvider();
      if(!provider) throw new Error('CORE_EXTENSION_REQUIRED');
      var session=await passportSession();
      var wallet=kind==='evm'?await connectEvm(provider,session):kind==='xp'?await connectXp(provider,session,chainKey):null;
      if(!wallet) throw new Error('That Core wallet type is not supported.');
      try{window.dispatchEvent(new CustomEvent('onehome-chain-wallet-changed',{detail:{
        ecosystem:wallet.ecosystem,chain_key:wallet.verification_chain_key,wallet_address:wallet.wallet_address,wallet_id:wallet.id||''
      }}))}catch(_error){}
      return wallet;
    }catch(error){
      var wrapped=new Error(friendlyError(error));
      wrapped.code=error&&error.code;
      wrapped.cause=error;
      throw wrapped;
    }finally{busy=false}
  }

  window.OneHomeCoreWallets={
    version:'1.0.0',
    link:link,
    linkEvm:function(chainKey){return link('evm',chainKey||CORE_EVM_CHAIN)},
    linkXp:function(chainKey){return link('xp',chainKey)}
  };
})();