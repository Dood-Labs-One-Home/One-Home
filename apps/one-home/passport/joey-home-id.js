/* One Home v14.67.134 — Joey Wallet ownership sign-in for an existing Passport.
   Uses the existing OneHomeJoeyWallet Mainnet connector and requests one
   non-submitted AccountSet+Memo signature. One Home independently verifies the
   signed XRPL transaction server-side before opening the linked Passport. */
(function(){
  'use strict';
  if(window.__oneHomeJoeyHomeIdV1467134)return;
  window.__oneHomeJoeyHomeIdV1467134=true;

  var SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
  var SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var ENDPOINT=SUPABASE_URL+'/functions/v1/joey-home-id';
  var busy=false;

  function q(id){return document.getElementById(id);}
  function clean(value){return String(value==null?'':value).trim();}
  function short(value){var v=clean(value);return v.length>18?v.slice(0,8)+'…'+v.slice(-6):v;}
  function validAddress(value){return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(clean(value));}

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

  function setStatus(message,kind){
    var el=q('passportStatus');if(!el)return;
    el.textContent=String(message||'');
    el.classList.toggle('is-visible',Boolean(message));
    el.classList.toggle('is-error',kind==='error');
    el.classList.toggle('is-success',kind==='success');
  }

  function joeyButtons(){return Array.prototype.slice.call(document.querySelectorAll('#passportWalletLoginMenu button[data-passport-wallet-login="joey"]'));}
  function setBusy(active,label){
    busy=!!active;
    joeyButtons().forEach(function(button){
      if(active){
        if(!button.dataset.oneHomeJoeyOriginalHtml)button.dataset.oneHomeJoeyOriginalHtml=button.innerHTML;
        button.disabled=true;
        if(label){var span=button.querySelector('span');if(span)span.textContent=label;}
      }else{
        button.disabled=false;
        if(button.dataset.oneHomeJoeyOriginalHtml){button.innerHTML=button.dataset.oneHomeJoeyOriginalHtml;delete button.dataset.oneHomeJoeyOriginalHtml;}
      }
    });
  }

  function friendlyError(error){
    var message=String(error&&error.message||error||'Joey ownership sign-in did not finish.');
    if(/cancel|reject|declin/i.test(message))return 'The Joey request was cancelled.';
    if(/JOEY_PASSPORT_NOT_FOUND|No One Home Passport is linked/i.test(message))return 'No One Home Passport is linked to this Joey wallet yet. Sign in using your existing method, then add Joey under Passport → Wallets.';
    if(/expired/i.test(message))return 'The Joey ownership request expired. Try again.';
    if(/different wallet|Switch Joey/i.test(message))return 'Joey is using a different XRP wallet. Switch Joey to the wallet linked to your Passport and try again.';
    return message;
  }

  async function waitForRuntime(){
    if(window.OneHomeJoeyWallet&&typeof window.OneHomeJoeyWallet.connect==='function')return window.OneHomeJoeyWallet;
    var started=Date.now();
    while(Date.now()-started<7000){
      await new Promise(function(resolve){setTimeout(resolve,100);});
      if(window.OneHomeJoeyWallet&&typeof window.OneHomeJoeyWallet.connect==='function')return window.OneHomeJoeyWallet;
    }
    throw new Error('Joey Wallet sign-in is still loading. Refresh One Home and try again.');
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
      var error=new Error(String(data.error||'The Joey One Home ID request could not be completed.'));
      error.code=data.code||response.status;
      throw error;
    }
    return data;
  }

  async function start(){
    if(busy)return;
    setBusy(true,'Connect Joey…');
    setStatus('Connect the Joey wallet already linked to your One Home Passport. One Home will request one ownership signature; it will not be submitted to the XRP Ledger.','');
    try{
      var runtime=await waitForRuntime();
      var connected=await runtime.connect();
      var address=clean(connected&&connected.address||runtime.getAddress&&runtime.getAddress()||'');
      if(!validAddress(address))throw new Error('Joey did not return a valid XRP Ledger account.');

      setBusy(true,'Prepare proof…');
      setStatus('Preparing a secure ownership request for '+short(address)+'…','');
      var challenge=await call({action:'challenge',wallet_address:address,mode:'signin'});
      if(!challenge.transaction||challenge.chain_id!=='xrpl:0')throw new Error('One Home did not return a valid Joey Mainnet ownership request.');

      setBusy(true,'Approve in Joey…');
      setStatus('Approve the One Home ownership signature in Joey. This AccountSet proof contains no account-setting changes and One Home will not submit it.','');
      var signed=await runtime.signWithoutSubmit(challenge.transaction,address,'AccountSet');
      if(!signed||!signed.signed)throw new Error('Joey did not return the signed ownership proof.');

      setBusy(true,'Opening Passport…');
      setStatus('Joey confirmed. Verifying ownership and opening your linked One Home Passport…','');
      var completed=await call({
        action:'complete',
        challenge_id:challenge.challenge_id,
        browser_nonce:challenge.browser_nonce,
        wallet_address:address,
        signed_transaction:signed.signed
      });
      if(!completed.token_hash)throw new Error('One Home verified Joey but did not return a Passport session.');

      var sb=supabase();
      if(!sb)throw new Error('One Home ID access is still loading. Refresh the page and try again.');
      var verified=await sb.auth.verifyOtp({token_hash:String(completed.token_hash),type:String(completed.verification_type||'magiclink')});
      if(verified.error)throw verified.error;

      try{sessionStorage.setItem('onehome_joey_last_home_id_wallet',address);}catch(_error){}
      setStatus('Joey verified. Welcome back to your One Home Passport.','success');
      // entrance.js observes the Supabase SIGNED_IN event and performs the normal route.
    }catch(error){
      setStatus(friendlyError(error),'error');
    }finally{
      setBusy(false);
    }
  }

  window.OneHomeJoeyHomeId=Object.freeze({start:start});
})();
