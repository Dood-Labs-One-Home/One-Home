/* One Home v14.67.159 — XRPL / Xaman Passport wallet link controller.
   Clean iPhone Safari return recovery, based on the previously proven mobile Xaman pattern.

   Architecture:
   - passport_wallets remains the authoritative linked-wallet list.
   - xaman-create-payload v14.67.156 creates a SignIn payload.
   - passport-wallet-link remains the only writer that verifies and links the exact Xaman r-address.
   - Multiple Xaman addresses remain separate passport_wallets rows.
   - The payload UUID is saved BEFORE leaving Safari and is resumed from either the Xaman return URL
     or durable same-origin browser storage after the app switch.
   - iOS recovery does not depend on a single focus event or on the return URL surviving intact.
*/
(function(){
  'use strict';
  if(window.__oneHomeXamanWallets1467159) return;
  window.__oneHomeXamanWallets1467159 = true;

  var FUNCTIONS_BASE = 'https://fshvettlltcujmwvikfq.supabase.co/functions/v1';
  var STATE_KEY = 'onehome_xaman_wallet_link_v1467159';
  var PREVIOUS_STATE_KEY = 'onehome_xaman_wallet_link_v1467158';
  var LEGACY_UUID_KEY = 'dood_xaman_last_uuid';
  var LEGACY_STARTED_KEY = 'dood_xaman_started_at';
  var MAX_AGE_MS = 15 * 60 * 1000;
  var pollTimer = null;
  var resumeTimer = null;
  var completing = false;

  function text(v){ return String(v == null ? '' : v).trim(); }
  function validUuid(v){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(v)); }
  function validWallet(v){ return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(text(v)); }
  function isMobile(){ return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ''); }
  function shortWallet(v){ v=text(v); return v.length>18 ? v.slice(0,8)+'…'+v.slice(-7) : v; }

  function status(message,type){
    if(typeof window.oneHomeWalletTreeSetStatus === 'function'){
      try{ window.oneHomeWalletTreeSetStatus(message,type||''); return; }catch(_e){}
    }
    var el=document.getElementById('walletProfileStatus');
    if(el) el.textContent=String(message||'');
  }

  function getClient(){
    return [
      window.oneHomePassportSupabase,
      window.doodProfileSupabase,
      window.doodSupabase,
      window.supabaseClient,
      window.db
    ].find(function(c){return c&&c.auth}) || null;
  }

  async function getSessionToken(waitMs){
    var deadline=Date.now()+Math.max(0,Number(waitMs)||0);
    do{
      var c=getClient();
      if(c&&c.auth&&typeof c.auth.getSession==='function'){
        try{
          var r=await c.auth.getSession();
          var token=r&&r.data&&r.data.session&&r.data.session.access_token;
          if(token) return token;
        }catch(_e){}
      }
      if(Date.now()>=deadline) break;
      await new Promise(function(resolve){setTimeout(resolve,200)});
    }while(true);
    throw new Error('Sign in to your One Home Passport before linking Xaman.');
  }

  function parseState(raw){
    try{
      var row=JSON.parse(raw||'null');
      if(!row||!validUuid(row.uuid)) return null;
      var created=Number(row.created_at||0);
      if(!created||Date.now()-created>MAX_AGE_MS) return null;
      return {uuid:text(row.uuid),created_at:created,return_to:'wallets',chain_key:'xrpl-mainnet'};
    }catch(_e){ return null; }
  }

  function migrateLegacyState(){
    var uuid='';
    var started='';
    try{ uuid=text(localStorage.getItem(LEGACY_UUID_KEY)||sessionStorage.getItem(LEGACY_UUID_KEY)); }catch(_e){}
    try{ started=text(localStorage.getItem(LEGACY_STARTED_KEY)||sessionStorage.getItem(LEGACY_STARTED_KEY)); }catch(_e){}
    if(!validUuid(uuid)) return null;
    var created=Date.parse(started||'');
    if(!Number.isFinite(created)||Date.now()-created>MAX_AGE_MS) return null;
    return {uuid:uuid,created_at:created,return_to:'wallets',chain_key:'xrpl-mainnet'};
  }

  function readState(){
    var raws=[];
    try{ raws.push(localStorage.getItem(STATE_KEY)); }catch(_e){}
    try{ raws.push(sessionStorage.getItem(STATE_KEY)); }catch(_e){}
    try{ raws.push(localStorage.getItem(PREVIOUS_STATE_KEY)); }catch(_e){}
    try{ raws.push(sessionStorage.getItem(PREVIOUS_STATE_KEY)); }catch(_e){}
    for(var i=0;i<raws.length;i++){
      var row=parseState(raws[i]);
      if(row){ writeState(row.uuid,row.created_at); return row; }
    }
    var legacy=migrateLegacyState();
    if(legacy){ writeState(legacy.uuid,legacy.created_at); return legacy; }
    return null;
  }

  function writeState(uuid,createdAt){
    var row={
      uuid:text(uuid),
      created_at:Number(createdAt)||Date.now(),
      return_to:'wallets',
      chain_key:'xrpl-mainnet'
    };
    var raw=JSON.stringify(row);
    try{ localStorage.setItem(STATE_KEY,raw); }catch(_e){}
    try{ sessionStorage.setItem(STATE_KEY,raw); }catch(_e){}
    return row;
  }

  function clearState(){
    [STATE_KEY,PREVIOUS_STATE_KEY,LEGACY_UUID_KEY,LEGACY_STARTED_KEY].forEach(function(k){
      try{ localStorage.removeItem(k); }catch(_e){}
      try{ sessionStorage.removeItem(k); }catch(_e){}
    });
  }

  function stopPolling(){
    if(pollTimer){ clearInterval(pollTimer); pollTimer=null; }
  }

  function returnPath(){
    return window.location.origin + '/?onehome=wallets';
  }

  async function createPayload(){
    var token=await getSessionToken(3000);
    var response=await fetch(FUNCTIONS_BASE+'/xaman-create-payload',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({
        app:'one-home',
        purpose:'profile_wallet_link',
        return_path:returnPath()
      })
    });
    var data={};
    try{ data=await response.json(); }catch(_e){}
    if(!response.ok||!validUuid(data.uuid)){
      throw new Error(text(data.error)||'Xaman could not create the wallet confirmation request.');
    }
    var link=text(data&&data.next&&(data.next.always||data.next.no_push_msg_received));
    if(!link) throw new Error('Xaman did not return a wallet confirmation link.');
    return {uuid:data.uuid,link:link};
  }

  async function linkPayload(uuid){
    var token=await getSessionToken(12000);
    var response=await fetch(FUNCTIONS_BASE+'/passport-wallet-link',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({provider:'xaman',uuid:uuid})
    });
    var data={};
    try{ data=await response.json(); }catch(_e){}
    return {ok:response.ok,status:response.status,data:data};
  }

  function markLinked(data){
    var wallet=text(data&&data.wallet_address);
    if(!validWallet(wallet)) throw new Error('Xaman returned an invalid XRP Ledger wallet address.');
    var connectedAt=text(data&&data.verified_at)||new Date().toISOString();
    try{
      localStorage.setItem('dood_profile_wallet_address',wallet);
      localStorage.setItem('dood_profile_wallet_provider','xaman');
      localStorage.setItem('dood_profile_wallet_connected_at',connectedAt);
      localStorage.removeItem('onehome_profile_wallet_switch_pending');
      localStorage.removeItem('onehome_profile_wallet_switch_pending_at');
    }catch(_e){}
    try{
      window.dispatchEvent(new CustomEvent('onehome-profile-wallet-changed',{
        detail:{address:wallet,provider:'xaman',pending:false,serverLinked:true,wallet_id:data&&data.id||null}
      }));
    }catch(_e){}
    return wallet;
  }

  function openWallets(){
    try{ document.documentElement.classList.remove('onehome-return-boot'); }catch(_e){}
    var tries=0;
    function attempt(){
      tries++;
      if(typeof window.oneHomeWalletTreeOpenChain==='function'){
        window.oneHomeWalletTreeOpenChain('xrpl-mainnet');
        return;
      }
      if(typeof window.oneHomeV1455OpenWallets==='function'){
        window.oneHomeV1455OpenWallets('xrpl-mainnet');
        return;
      }
      if(tries<50) setTimeout(attempt,120);
    }
    attempt();
  }

  function cleanReturnUrl(){
    try{
      var u=new URL(window.location.href);
      u.searchParams.delete('xaman_wallet_payload');
      u.searchParams.set('onehome','wallets');
      history.replaceState(history.state||{},'',u.pathname+'?'+u.searchParams.toString()+u.hash);
    }catch(_e){}
  }

  function isWaiting(result){
    var message=text(result&&result.data&&result.data.error).toLowerCase();
    return result&&result.status===409&&message.indexOf('waiting')>=0;
  }

  function isEnded(result){
    var message=text(result&&result.data&&result.data.error).toLowerCase();
    return result&&result.status===409&&(message.indexOf('cancel')>=0||message.indexOf('expired')>=0);
  }

  function isAuthPending(result){
    return result&&(result.status===401||result.status===403);
  }

  async function complete(uuid){
    uuid=text(uuid);
    if(!validUuid(uuid)) throw new Error('The Xaman wallet confirmation reference is invalid.');
    if(completing) return {pending:true,uuid:uuid};
    completing=true;
    try{
      status('Confirming the Xaman wallet with your Passport…');
      var result=await linkPayload(uuid);
      if(result.ok){
        stopPolling();
        var wallet=markLinked(result.data||{});
        clearState();
        cleanReturnUrl();
        openWallets();
        if(typeof window.oneHomeWalletTreeRefresh==='function') setTimeout(window.oneHomeWalletTreeRefresh,180);
        status('Xaman linked: '+shortWallet(wallet)+'. This wallet is now Primary.','success');
        return {linked:true,provider:'xaman',wallet_address:wallet,is_active:true};
      }
      if(isWaiting(result)){
        status('Waiting for Xaman approval…');
        return {pending:true,provider:'xaman',uuid:uuid};
      }
      if(isAuthPending(result)){
        status('Restoring your One Home Passport session…');
        return {pending:true,provider:'xaman',uuid:uuid,auth_pending:true};
      }
      if(isEnded(result)){
        stopPolling();
        clearState();
        throw new Error(text(result.data.error)||'The Xaman request was cancelled or expired.');
      }
      throw new Error(text(result.data&&result.data.error)||'Xaman could not be linked to this Passport.');
    }finally{
      completing=false;
    }
  }

  function startPolling(uuid){
    stopPolling();
    var state=readState();
    var started=state?Number(state.created_at):Date.now();
    pollTimer=setInterval(async function(){
      if(Date.now()-started>MAX_AGE_MS){
        stopPolling();
        clearState();
        status('Xaman confirmation timed out. Try Add Wallet again.','error');
        return;
      }
      if(document.visibilityState==='hidden') return;
      try{
        var result=await complete(uuid);
        if(result&&result.linked) stopPolling();
      }catch(error){
        stopPolling();
        status(text(error&&error.message||error)||'Xaman wallet linking did not complete.','error');
      }
    },2500);
  }

  function uuidFromUrl(){
    try{
      var params=new URLSearchParams(window.location.search||'');
      var value=text(params.get('xaman_wallet_payload'));
      return validUuid(value)?value:'';
    }catch(_e){ return ''; }
  }

  async function resume(){
    var urlUuid=uuidFromUrl();
    var saved=readState();
    var uuid=urlUuid||(saved&&validUuid(saved.uuid)?saved.uuid:'');
    if(!uuid) return false;

    writeState(uuid,saved&&saved.created_at);
    try{
      var result=await complete(uuid);
      if(result&&result.pending) startPolling(uuid);
      return result;
    }catch(error){
      var message=text(error&&error.message||error)||'Xaman wallet linking did not complete.';
      if(/sign in to your one home passport/i.test(message)){
        status('Restoring your One Home Passport session…');
        return {pending:true,provider:'xaman',uuid:uuid,auth_pending:true};
      }
      status(message,'error');
      openWallets();
      return false;
    }
  }

  function scheduleResume(delay){
    if(resumeTimer) clearTimeout(resumeTimer);
    resumeTimer=setTimeout(function(){
      resumeTimer=null;
      var saved=readState();
      var urlUuid=uuidFromUrl();
      if(!urlUuid&&!saved) return;
      resume().then(function(result){
        if(result&&result.pending&&validUuid(result.uuid)) startPolling(result.uuid);
      }).catch(function(error){
        status(text(error&&error.message||error)||'Xaman wallet linking did not complete.','error');
      });
    },Math.max(0,Number(delay)||0));
  }

  async function link(){
    stopPolling();
    status('Creating Xaman wallet confirmation…');
    var payload=await createPayload();

    // This is the critical iOS contract: persist the exact payload before Safari leaves
    // the One Home origin. The return URL is helpful, but not required for recovery.
    writeState(payload.uuid);

    status('Approve the wallet in Xaman. When Safari returns, One Home will save that exact address.');
    if(isMobile()){
      window.location.href=payload.link;
    }else{
      var popup=window.open(payload.link,'_blank','noopener,noreferrer');
      if(!popup) window.location.href=payload.link;
      else startPolling(payload.uuid);
    }
    return {pending:true,provider:'xaman',uuid:payload.uuid};
  }

  window.OneHomeXamanWallets={link:link,resume:resume,complete:complete};

  // Compatibility names route to this single implementation only.
  window.connectProfileWallet=link;
  window.connectXamanWallet=link;
  window.openXamanWallet=link;
  window.startWalletConnect=link;
  window.openWalletTools=function(){openWallets();return true;};
  window.connectWallet=function(){openWallets();return true;};
  window.doodV133WalletSignIn=function(){
    var menu=document.getElementById('doodV130Menu');
    if(menu) menu.classList.remove('open');
    openWallets();
  };

  function boot(){
    var route='';
    try{ route=text(new URLSearchParams(window.location.search||'').get('onehome')).toLowerCase(); }catch(_e){}
    if(route==='wallets') openWallets();

    // Proven mobile behavior: resume whenever a valid saved Xaman request exists,
    // even if iOS Safari restored the original page without the return query string.
    if(uuidFromUrl()||readState()){
      scheduleResume(120);
      setTimeout(function(){ if(uuidFromUrl()||readState()) scheduleResume(0); },850);
      setTimeout(function(){ if(uuidFromUrl()||readState()) scheduleResume(0); },2200);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  // iPhone Safari does not guarantee one specific lifecycle event when returning from Xaman.
  // The previously working One Home flow listened to focus + visibility; pageshow is added for
  // restored/frozen Safari pages. All three resume the SAME saved UUID through the SAME controller.
  window.addEventListener('pageshow',function(){ if(uuidFromUrl()||readState()) scheduleResume(220); });
  window.addEventListener('focus',function(){ if(uuidFromUrl()||readState()) scheduleResume(350); });
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden&&(uuidFromUrl()||readState())) scheduleResume(350);
  });
})();
