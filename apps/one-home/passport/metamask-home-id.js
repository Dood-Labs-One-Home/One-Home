/* One Home v14.67.115 — MetaMask Home ID sign-in/create from the shared chain/wallet dropdown.
   Mobile Safari/Chrome no longer waits on a background relay approval that may
   never surface. External mobile browsers open the same One Home entrance in
   MetaMask's in-app browser; once there, One Home uses MetaMask's injected
   EIP-1193 provider directly for account access + personal_sign.
   Desktop extension and MetaMask in-app browser use the same injected path.
   Desktop without the extension retains the MetaMask Connect QR fallback. */
(function(){
  'use strict';
  if(window.__oneHomeMetaMaskHomeIdV1467115)return;
  window.__oneHomeMetaMaskHomeIdV1467115=true;

  var SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
  var SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var ENDPOINT=SUPABASE_URL+'/functions/v1/metamask-home-id';
  var SDK_PATH='/assets/vendor/metamask-connect-multichain-1.2.0.js';
  var EVM_NETWORKS={
    'arbitrum-sepolia':{label:'Arbitrum — Testnet',scope:'eip155:421614',rpc:'https://sepolia-rollup.arbitrum.io/rpc'},
    'base-mainnet':{label:'Base',scope:'eip155:8453',rpc:'https://mainnet.base.org'},
    'base-sepolia':{label:'Base — Testnet',scope:'eip155:84532',rpc:'https://sepolia.base.org'},
    'bsc-testnet':{label:'BNB Chain — Testnet',scope:'eip155:97',rpc:'https://data-seed-prebsc-1-s1.binance.org:8545'},
    'ethereum-sepolia':{label:'Ethereum — Testnet',scope:'eip155:11155111',rpc:'https://ethereum-sepolia-rpc.publicnode.com'},
    'hedera-testnet':{label:'Hedera — Testnet',scope:'eip155:296',rpc:'https://testnet.hashio.io/api'},
    'linea-sepolia':{label:'Linea — Testnet',scope:'eip155:59141',rpc:'https://rpc.sepolia.linea.build'},
    'optimism-sepolia':{label:'Optimism — Testnet',scope:'eip155:11155420',rpc:'https://sepolia.optimism.io'},
    'polygon-amoy':{label:'Polygon — Testnet',scope:'eip155:80002',rpc:'https://polygon-amoy.drpc.org'},
    'sei-atlantic-2':{label:'Sei — Testnet',scope:'eip155:1328',rpc:'https://evm-rpc-testnet.sei-apis.com'}
  };
  var DEFAULT_CHAIN='ethereum-sepolia';
  var MOBILE_MARKER='onehome_metamask_home_id';
  var CHAIN_MARKER='onehome_metamask_chain';
  var sdkPromise=null;
  var clientPromise=null;
  var busy=false;

  function q(id){return document.getElementById(id);}
  function clean(value){return String(value==null?'':value).trim();}
  function lower(value){return clean(value).toLowerCase();}
  function short(value){var v=clean(value);return v.length>18?v.slice(0,8)+'…'+v.slice(-6):v;}
  function normalizeAddress(value){var v=lower(value);return /^0x[a-f0-9]{40}$/.test(v)?v:'';}

  function supabase(){
    if(window.oneHomePassportSupabase&&window.oneHomePassportSupabase.auth)return window.oneHomePassportSupabase;
    if(window.doodProfileSupabase&&window.doodProfileSupabase.auth)return window.doodProfileSupabase;
    if(window.doodSupabase&&window.doodSupabase.auth)return window.doodSupabase;
    if(window.supabaseClient&&window.supabaseClient.auth)return window.supabaseClient;
    if(window.supabase&&window.supabase.createClient){
      window.oneHomePassportSupabase=window.oneHomePassportSupabase||window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      return window.oneHomePassportSupabase;
    }
    return null;
  }

  function markerMode(){
    try{
      var value=lower(new URLSearchParams(window.location.search||'').get(MOBILE_MARKER));
      return value==='signin'||value==='create'?value:'';
    }catch(_error){return '';}
  }

  function markerChain(){
    try{var value=lower(new URLSearchParams(window.location.search||'').get(CHAIN_MARKER));return EVM_NETWORKS[value]?value:'';}catch(_error){return '';}
  }

  function selectedChain(requested){
    var key=lower(requested||markerChain()||DEFAULT_CHAIN);
    return EVM_NETWORKS[key]?key:DEFAULT_CHAIN;
  }

  function currentMode(){
    var marked=markerMode();
    if(marked)return marked;
    var signin=q('passportSignInTab');
    if(signin&&(signin.classList.contains('is-active')||signin.getAttribute('aria-selected')==='true'))return 'signin';
    return 'create';
  }

  function isMobile(){
    var ua=String(navigator.userAgent||'');
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)||(navigator.maxTouchPoints>1&&/Macintosh/i.test(ua));
  }

  function isMetaMaskInAppBrowser(){
    var ua=String(navigator.userAgent||'');
    return /MetaMaskMobile/i.test(ua)||Boolean(window.ReactNativeWebView&&/MetaMask/i.test(ua));
  }

  function findInjectedMetaMask(){
    var root=window.ethereum;
    if(!root)return null;
    var providers=Array.isArray(root.providers)?root.providers:[];
    var found=providers.find(function(provider){return provider&&provider.isMetaMask&&!provider.isBraveWallet;});
    if(found)return found;
    if(root.isMetaMask&&!root.isBraveWallet)return root;
    return null;
  }

  function waitForInjectedMetaMask(timeoutMs){
    var immediate=findInjectedMetaMask();
    if(immediate)return Promise.resolve(immediate);
    return new Promise(function(resolve){
      var settled=false;
      var timer=null;
      var poll=null;
      function finish(provider){
        if(settled)return;
        settled=true;
        window.removeEventListener('ethereum#initialized',check);
        if(timer)clearTimeout(timer);
        if(poll)clearInterval(poll);
        resolve(provider||null);
      }
      function check(){var provider=findInjectedMetaMask();if(provider)finish(provider);}
      window.addEventListener('ethereum#initialized',check,{once:false});
      poll=setInterval(check,100);
      timer=setTimeout(function(){finish(findInjectedMetaMask());},Math.max(300,Number(timeoutMs)||1400));
      check();
    });
  }

  function setStatus(message,kind){
    var el=q('passportStatus');
    if(!el)return;
    el.textContent=String(message||'');
    el.classList.toggle('is-visible',Boolean(message));
    el.classList.toggle('is-error',kind==='error');
    el.classList.toggle('is-success',kind==='success');
  }

  function setBusy(active,label){
    busy=active;
    document.querySelectorAll('#passportWalletLoginMenu button[data-passport-wallet-login]').forEach(function(button){
      if(active){
        if(!button.dataset.oneHomeOriginalHtml)button.dataset.oneHomeOriginalHtml=button.innerHTML;
        button.disabled=true;
        if(button.dataset.passportWalletLogin==='metamask'&&label){
          var span=button.querySelector('span');if(span)span.textContent=label;
        }
      }else{
        button.disabled=false;
        if(button.dataset.oneHomeOriginalHtml){button.innerHTML=button.dataset.oneHomeOriginalHtml;delete button.dataset.oneHomeOriginalHtml;}
      }
    });
    ['passportEmailSubmitBtn','passportForgotPasswordBtn'].forEach(function(id){var button=q(id);if(button)button.disabled=!!active;});
  }

  function friendlyError(error){
    var code=Number(error&&error.code);
    var message=String(error&&error.message||error||'MetaMask could not finish the One Home ID request.');
    if(code===4001||/reject|denied|cancel/i.test(message))return 'The MetaMask request was cancelled.';
    if(code===-32002||/already pending|pending request/i.test(message))return 'MetaMask already has a request waiting. Open MetaMask and finish or reject it, then try again.';
    if(/METAMASK_PASSPORT_NOT_FOUND|No One Home Passport is linked/i.test(message))return 'No One Home Passport is linked to this MetaMask wallet yet. Choose Create My One Home ID, or sign in with your existing One Home ID and link MetaMask in Passport Wallets.';
    if(/expired/i.test(message))return 'The MetaMask sign-in request expired. Try again.';
    if(/not found|install/i.test(message))return 'Open or install MetaMask, then try again.';
    return message;
  }

  function mobileDappLink(mode,chainKey){
    var target=new URL(window.location.href);
    target.searchParams.set(MOBILE_MARKER,mode==='create'?'create':'signin');
    target.searchParams.set(CHAIN_MARKER,selectedChain(chainKey));
    target.searchParams.set('onehome_metamask_mobile','1');
    return 'https://metamask.app.link/dapp/'+target.toString().replace(/^https?:\/\//i,'');
  }

  function openInsideMetaMask(mode,chainKey){
    var key=selectedChain(chainKey),network=EVM_NETWORKS[key],url=mobileDappLink(mode,key);
    setBusy(true,'Opening MetaMask…');
    setStatus('Opening One Home inside MetaMask for '+network.label+'. When it opens, choose '+network.label+' → MetaMask to approve your '+(mode==='create'?'One Home ID creation.':'sign-in.'),'');
    setTimeout(function(){window.location.assign(url);},40);
    setTimeout(function(){if(document.visibilityState==='visible')setBusy(false);},2500);
  }

  function loadSdk(){
    if(window.OneHomeMetaMaskSDK&&typeof window.OneHomeMetaMaskSDK.createMultichainClient==='function')return Promise.resolve(window.OneHomeMetaMaskSDK);
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise(function(resolve,reject){
      var prior=document.querySelector('script[data-onehome-metamask-home-id-sdk],script[src*="metamask-connect-multichain"]');
      var script=prior||document.createElement('script');
      function ready(){
        if(window.OneHomeMetaMaskSDK&&typeof window.OneHomeMetaMaskSDK.createMultichainClient==='function')resolve(window.OneHomeMetaMaskSDK);
        else reject(new Error('MetaMask access did not finish loading. Refresh and try again.'));
      }
      script.addEventListener('load',ready,{once:true});
      script.addEventListener('error',function(){reject(new Error('MetaMask access could not load. Refresh and try again.'));},{once:true});
      if(!prior){script.src=SDK_PATH;script.async=true;script.dataset.onehomeMetamaskHomeIdSdk='1';document.head.appendChild(script);}
    }).catch(function(error){sdkPromise=null;throw error;});
    return sdkPromise;
  }

  async function walletClient(){
    if(clientPromise)return clientPromise;
    clientPromise=loadSdk().then(function(sdk){
      var supported={};Object.keys(EVM_NETWORKS).forEach(function(key){supported[EVM_NETWORKS[key].scope]=EVM_NETWORKS[key].rpc;});
      return sdk.createMultichainClient({
        dapp:{name:'One Home',url:window.location.origin,iconUrl:window.location.origin+'/assets/one-home-logo.png'},
        api:{supportedNetworks:supported},
        analytics:{enabled:false},
        ui:{preferExtension:true,showInstallModal:true}
      });
    }).catch(function(error){clientPromise=null;throw error;});
    return clientPromise;
  }

  function accountFromSession(session,scope){
    var scopes=session&&session.sessionScopes||{};
    var accounts=scopes[scope]&&Array.isArray(scopes[scope].accounts)?scopes[scope].accounts:[];
    var prefix=scope+':';
    var account=accounts.find(function(value){return String(value||'').indexOf(prefix)===0;});
    return normalizeAddress(account?String(account).slice(prefix.length):'');
  }

  function utf8Hex(value){
    return '0x'+Array.from(new TextEncoder().encode(String(value||''))).map(function(byte){return byte.toString(16).padStart(2,'0');}).join('');
  }

  async function call(body){
    var response=await fetch(ENDPOINT,{
      method:'POST',
      cache:'no-store',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify(body||{})
    });
    var data=await response.json().catch(function(){return {};});
    if(!response.ok||data.success===false){
      var error=new Error(String(data.error||'The MetaMask One Home ID request could not be completed.'));
      error.code=data.code||response.status;
      throw error;
    }
    return data;
  }

  async function finishHomeId(mode,address,signMessage){
    setBusy(true,'Approve in MetaMask…');
    setStatus('Confirm '+short(address)+' by signing the One Home message in MetaMask.','');
    var challenge=await call({action:'challenge',wallet_address:address,mode:mode});
    var signature=await signMessage(challenge.challenge_message,address);
    signature=typeof signature==='string'?signature:String(signature&&signature.result||signature&&signature.signature||'');
    if(!/^0x[a-fA-F0-9]{130}$/.test(signature))throw new Error('MetaMask did not return a valid ownership signature.');

    setBusy(true,'Opening One Home…');
    setStatus('MetaMask confirmed. Opening your One Home Passport…','');
    var completed=await call({
      action:'complete',
      challenge_id:challenge.challenge_id,
      browser_nonce:challenge.browser_nonce,
      wallet_address:address,
      signature:signature
    });
    if(!completed.token_hash)throw new Error('One Home verified MetaMask but did not return a Passport session.');

    var sb=supabase();
    if(!sb)throw new Error('One Home ID access is still loading. Refresh and try again.');
    var verified=await sb.auth.verifyOtp({token_hash:String(completed.token_hash),type:String(completed.verification_type||'magiclink')});
    if(verified.error)throw verified.error;

    try{sessionStorage.setItem('onehome_metamask_last_home_id_wallet',address);}catch(_error){}
    setStatus(completed.created_new_passport?'MetaMask verified. Your new One Home ID is ready.':'MetaMask verified. Welcome back to your One Home Passport.','success');
    // entrance.js listens for SIGNED_IN and performs the normal One Home route.
  }

  async function startInjected(provider,mode){
    setBusy(true,'Connect MetaMask…');
    setStatus('Approve access to your MetaMask account. One Home will then ask you to sign one ownership message.','');
    var accounts=await provider.request({method:'eth_requestAccounts',params:[]});
    var address=normalizeAddress(Array.isArray(accounts)?accounts[0]:'');
    if(!address)throw new Error('MetaMask did not return an EVM account.');
    await finishHomeId(mode,address,function(message,walletAddress){
      return provider.request({method:'personal_sign',params:[utf8Hex(message),walletAddress]});
    });
  }

  async function startDesktopFallback(mode,chainKey){
    var key=selectedChain(chainKey),scope=EVM_NETWORKS[key].scope,wallet=await walletClient();
    await wallet.connect([scope],[],undefined,true);
    var walletSession=await wallet.provider.getSession();
    var address=accountFromSession(walletSession,scope);
    if(!address)throw new Error('MetaMask did not return an account for '+EVM_NETWORKS[key].label+'.');
    await finishHomeId(mode,address,function(message,walletAddress){
      return wallet.invokeMethod({scope:scope,request:{method:'personal_sign',params:[utf8Hex(message),walletAddress]}});
    });
  }

  async function start(chainKey){
    if(busy)return;
    var mode=currentMode(),key=selectedChain(chainKey);

    // On normal mobile Safari/Chrome, do not start a relay request and then
    // background Safari. Open the exact One Home page inside MetaMask instead.
    // The approval is then performed through MetaMask's injected provider.
    if(isMobile()&&!isMetaMaskInAppBrowser()&&!findInjectedMetaMask()){
      openInsideMetaMask(mode,key);
      return;
    }

    setBusy(true,'Checking MetaMask…');
    setStatus('Preparing '+EVM_NETWORKS[key].label+' → MetaMask…','');
    try{
      var provider=await waitForInjectedMetaMask(1400);
      if(provider){
        await startInjected(provider,mode);
      }else{
        // Desktop-only fallback: extension not injected, so allow the existing
        // QR/mobile connection option. External mobile never reaches this path.
        await startDesktopFallback(mode,key);
      }
    }catch(error){
      console.error('MetaMask Home ID',error);
      setBusy(false);
      setStatus(friendlyError(error),'error');
    }
  }

  function applyMobileReturnContext(){
    var mode=markerMode();
    if(!mode)return;
    var key=selectedChain(markerChain()),network=EVM_NETWORKS[key];
    var tab=q(mode==='signin'?'passportSignInTab':'passportCreateTab');
    if(tab&&!tab.classList.contains('is-active')){try{tab.click();}catch(_error){}}
    var picker=q('passportWalletPicker');if(picker)picker.open=true;
    document.querySelectorAll('#passportWalletLoginMenu button[data-passport-wallet-login="metamask"]').forEach(function(button){
      var span=button.querySelector('span');if(!span)return;
      if(String(button.dataset.passportWalletChain||'')===key)span.textContent=mode==='create'?'Approve Creation with MetaMask':'Approve Sign In with MetaMask';
      else span.textContent='MetaMask';
    });
    setStatus('One Home is now open inside MetaMask for '+network.label+'. Choose '+network.label+' → MetaMask below to approve account access and sign in.','');
  }

  function bind(){setTimeout(applyMobileReturnContext,80);}

  window.OneHomeMetaMaskHomeId={start:start};

  window.addEventListener('pageshow',function(){
    if(document.visibilityState==='visible'&&busy&&!isMetaMaskInAppBrowser())setBusy(false);
  });
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'&&busy&&!isMetaMaskInAppBrowser())setBusy(false);
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  [400,1000,2200].forEach(function(ms){setTimeout(bind,ms);});
})();
