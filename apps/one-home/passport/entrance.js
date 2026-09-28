/* One Home v14.67.47 — X in-app Passport email login + exact mint return + same-origin auth proxy.
   One Home Private Passport — front-door and Founder journey.
   The porch remains public. Authentication is validated through Supabase.
   Wallet possession is verified through Xaman, Crossmark, and the MetaMask Home ID bridge. */
(function(){
  'use strict';

  const SUPABASE_URL = 'https://fshvettlltcujmwvikfq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1';
  const AUTH_STORAGE_KEY = 'sb-fshvettlltcujmwvikfq-auth-token';
  const X_STAY_KEY = 'onehome_x_stay_browser_v146747';
  const MINT_COLLECTION_KEY = 'onehome_active_mint_collection_id';
  const MINT_CAMPAIGN_KEY = 'onehome_active_mint_campaign_id_v1369';
  const DESTINATION_KEY = 'onehome_passport_destination';
  const WALLET_KEY = 'onehome_passport_verified_wallet';
  const PROVIDER_KEY = 'onehome_passport_verified_provider';
  const FOUNDER_ELIGIBILITY_KEY = 'onehome_founder_eligibility';
  const XAMAN_UUID_KEY = 'onehome_passport_xaman_uuid';
  const XAMAN_NONCE_KEY = 'onehome_passport_xaman_nonce';
  const XAMAN_CONTEXT_KEY = 'onehome_passport_xaman_context';
  const XAMAN_LINK_KEY = 'onehome_passport_xaman_link';
  const XAMAN_WS_KEY = 'onehome_passport_xaman_websocket';
  const FOUNDER_CACHE_KEY = 'onehome_founder_eligibility_cache_v2';
  const XAMAN_CREATE_ENDPOINT = FUNCTIONS_BASE + '/xaman-create-home-id';
  const XAMAN_COMPLETE_ENDPOINT = FUNCTIONS_BASE + '/xaman-complete-home-id';
  const CROSSMARK_CREATE_ENDPOINT = FUNCTIONS_BASE + '/crossmark-create-home-id-challenge';
  const CROSSMARK_COMPLETE_ENDPOINT = FUNCTIONS_BASE + '/crossmark-complete-home-id';
  const PASSPORT_WALLET_LINK_ENDPOINT = FUNCTIONS_BASE + '/passport-wallet-link';
  let mode = 'create';
  let xamanTimer = null;
  let xamanAttempts = 0;
  let xamanContext = 'entrance';
  let xamanResumeBusy = false;
  let xamanSocket = null;
  let xamanResumeTimeouts = [];
  let passportSessionCache = null;
  let founderCheckPromise = null;
  let founderCheckKey = '';
  let founderFocusTimer = null;
  let emailAuthBusy = false;

  function q(id){ return document.getElementById(id); }
  function walletEntryEsc(value){ return String(value == null ? '' : value).replace(/[&<>\"]/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]||char;}); }
  function walletLoginCapability(chain,provider){
    const ecosystem=String(chain&&chain.ecosystem||'').toLowerCase();
    const key=String(provider&&provider.key||'').toLowerCase();
    if(key==='xaman'||key==='crossmark')return {enabled:true,provider:key};
    if(key==='metamask'&&ecosystem==='evm')return {enabled:true,provider:'metamask'};
    if(key==='joey'&&ecosystem==='xrpl'&&String(chain&&chain.key||'').toLowerCase()==='xrpl-mainnet')return {enabled:true,provider:'joey',note:'Linked Passport sign-in'};
    return {enabled:false,note:'Passport link only'};
  }
  function renderWalletLoginMenu(){
    const menu=q('passportWalletLoginMenu');if(!menu)return;
    const catalog=Array.isArray(window.OneHomePassportWalletCatalog)?window.OneHomePassportWalletCatalog.slice():[];
    if(!catalog.length){menu.innerHTML='<div class="passport-wallet-login-loading">Wallet options are still loading…</div>';return;}
    catalog.sort(function(a,b){return String(a.label||'').localeCompare(String(b.label||''));});
    menu.innerHTML=catalog.map(function(chain){
      const providers=(Array.isArray(chain.providers)?chain.providers.slice():[]).sort(function(a,b){return String(a.label||'').localeCompare(String(b.label||''));});
      const buttons=providers.map(function(provider){
        const capability=walletLoginCapability(chain,provider),entryId=capability.provider==='xaman'?'passportXamanBtn':capability.provider==='crossmark'?'passportCrossmarkBtn':'',idAttr=entryId?' id="'+entryId+'"':'',attrs=capability.enabled?' data-passport-wallet-login="'+walletEntryEsc(capability.provider)+'" data-passport-wallet-chain="'+walletEntryEsc(chain.key)+'"':' disabled aria-disabled="true"';
        return '<button type="button"'+idAttr+attrs+'><span>'+walletEntryEsc(provider.label)+'</span>'+(capability.note?'<small>'+walletEntryEsc(capability.note)+'</small>':'')+'</button>';
      }).join('');
      return '<div class="passport-wallet-login-chain"><strong>'+walletEntryEsc(chain.label)+'</strong><div class="passport-wallet-login-provider-list">'+buttons+'</div></div>';
    }).join('');
  }

  function normalizeDestination(value){
    const destination = String(value || '').trim().toLowerCase();
    if(destination === 'mint' || destination === 'founder-supply-drop') return 'mint';
    if(destination === 'onehome-start' || destination === 'home') return 'onehome-start';
    return 'choice';
  }

  function currentDestination(){
    return normalizeDestination(localStorage.getItem(DESTINATION_KEY) || sessionStorage.getItem(DESTINATION_KEY) || 'choice');
  }

  function rememberDestination(value){
    const destination = normalizeDestination(value);
    sessionStorage.setItem(DESTINATION_KEY,destination);
    localStorage.setItem(DESTINATION_KEY,destination);
    return destination;
  }

  function updateEntranceDestinationCopy(){
    const destination = currentDestination();
    const banner = q('passportDestinationBanner');
    const title = q('passportDestinationTitle');
    const copy = q('passportDestinationCopy');
    if(!banner) return;
    if(destination === 'mint'){
      banner.hidden = false;
      const campaignId=activeMintCampaignId();
      if(title) title.textContent = campaignId
        ? "You're signing in to continue to this mint."
        : "You're signing in to continue to the Founder Supply Drop.";
      if(copy) copy.textContent = campaignId
        ? 'After sign-in, we will return you directly to this collection’s mint page.'
        : 'After sign-in, we will return you to the Founder access check and mint journey.';
    }else{
      banner.hidden = true;
    }
  }

  function collectionIdFromLocation(){
    try{
      const params = new URLSearchParams(window.location.search);
      const value = String(params.get('collection') || '').trim();
      if(/^[0-9a-f-]{36}$/i.test(value)) return value;
      const match = String(window.location.hash || '').match(/#mint\/([0-9a-f-]{36})/i);
      return match ? match[1] : '';
    }catch(_error){ return ''; }
  }

  function campaignIdFromLocation(){
    try{
      const value=String(new URLSearchParams(window.location.search).get('campaign') || '').trim();
      return /^[0-9a-f-]{36}$/i.test(value) ? value : '';
    }catch(_error){ return ''; }
  }

  function mintNetworkFromLocation(){
    try{
      const value=String(new URLSearchParams(window.location.search).get('network') || '').toLowerCase();
      return value==='mainnet'?'mainnet':value==='testnet'?'testnet':'';
    }catch(_error){ return ''; }
  }


  function exactMintReturnFromLocation(campaignId){
    const id=String(campaignId||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id))return '';
    try{
      const raw=String(new URLSearchParams(window.location.search).get('return')||'').trim();
      if(!raw)return '';
      const url=new URL(raw,window.location.origin);
      if(url.origin!==window.location.origin)return '';
      const mintMatch=String(url.pathname||'').match(/^\/mint\/([0-9a-f-]{36})\/?$/i);
      const testCampaign=String(url.searchParams.get('campaign')||'').trim();
      const allowed=(mintMatch&&String(mintMatch[1]).toLowerCase()===id.toLowerCase()) ||
        (url.pathname==='/test-mint.html'&&String(testCampaign).toLowerCase()===id.toLowerCase());
      if(!allowed)return '';
      return url.pathname+(url.search?url.search:'')+(url.hash||'');
    }catch(_error){return '';}
  }

  function mintReturnWithSource(path,campaignId){
    try{return window.OneHomeMintSource?.appendSource(path,campaignId)||path;}catch(_error){return path;}
  }

  function rememberMintCampaign(id){
    const value=String(id || '').trim();
    if(/^[0-9a-f-]{36}$/i.test(value)) sessionStorage.setItem(MINT_CAMPAIGN_KEY,value);
    return value;
  }

  function activeMintCampaignId(){
    return campaignIdFromLocation() || sessionStorage.getItem(MINT_CAMPAIGN_KEY) || '';
  }

  function rememberMintCollection(id){
    const value = String(id || '').trim();
    if(/^[0-9a-f-]{36}$/i.test(value)){
      sessionStorage.setItem(MINT_COLLECTION_KEY,value);
      localStorage.setItem(MINT_COLLECTION_KEY,value);
    }
    return value;
  }

  function activeMintCollectionId(){
    const value = collectionIdFromLocation() || sessionStorage.getItem(MINT_COLLECTION_KEY) || localStorage.getItem(MINT_COLLECTION_KEY) || '';
    if(value === 'd6431e61-6f32-4b65-a5a7-dd91de36d8ab'){
      sessionStorage.removeItem(MINT_COLLECTION_KEY);
      localStorage.removeItem(MINT_COLLECTION_KEY);
      sessionStorage.removeItem(FOUNDER_ELIGIBILITY_KEY);
      return '';
    }
    return value;
  }

  async function resolveFounderCollectionId(){
    const locationId = collectionIdFromLocation();
    if(locationId) return rememberMintCollection(locationId);
    try{
      const response = await fetch(FUNCTIONS_BASE + '/get-public-mint',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({founder:true})
      });
      const data = await response.json().catch(function(){ return {}; });
      const currentId = String(data?.collection?.id || '').trim();
      if(response.ok && /^[0-9a-f-]{36}$/i.test(currentId)){
        const oldId = activeMintCollectionId();
        rememberMintCollection(currentId);
        if(oldId && oldId !== currentId) sessionStorage.removeItem(FOUNDER_ELIGIBILITY_KEY);
        return currentId;
      }
    }catch(_error){}
    const saved = activeMintCollectionId();
    return /^[0-9a-f-]{36}$/i.test(saved) ? saved : '';
  }

  function getSupabase(){
    if(window.doodProfileSupabase && window.doodProfileSupabase.auth) return window.doodProfileSupabase;
    if(window.doodSupabase && window.doodSupabase.auth) return window.doodSupabase;
    if(window.supabaseClient && window.supabaseClient.auth) return window.supabaseClient;
    if(window.supabase && window.supabase.createClient){
      window.oneHomePassportSupabase = window.oneHomePassportSupabase || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return window.oneHomePassportSupabase;
    }
    return null;
  }

  function mobileBrowser(){
    const ua=String(navigator.userAgent||'');
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints>1 && /Macintosh/i.test(ua));
  }

  function readXStayIntent(){
    const stores=[window.sessionStorage,window.localStorage];
    for(const store of stores){
      try{
        const raw=store?.getItem?.(X_STAY_KEY)||'';
        const saved=JSON.parse(raw||'null');
        if(!saved||saved.source!=='x') continue;
        if(Date.now()-Number(saved.saved_at||0)>2*60*60*1000) continue;
        const current=activeMintCampaignId();
        if(current&&saved.campaign_id&&String(saved.campaign_id).toLowerCase()!==String(current).toLowerCase()) continue;
        return saved;
      }catch(_error){}
    }
    return null;
  }

  function xSourcedMobilePasswordFlow(){
    if(!mobileBrowser()) return false;
    if(readXStayIntent()) return true;
    try{
      const params=new URLSearchParams(window.location.search||'');
      const direct=String(params.get('source')||params.get('src')||params.get('utm_source')||'').toLowerCase();
      if(direct==='x'||direct==='twitter'||direct==='twitter-x') return true;
      const rawReturn=String(params.get('return')||'').trim();
      if(rawReturn){
        const target=new URL(rawReturn,window.location.origin);
        const source=String(target.searchParams.get('source')||target.searchParams.get('src')||target.searchParams.get('utm_source')||'').toLowerCase();
        if(source==='x'||source==='twitter'||source==='twitter-x') return true;
      }
    }catch(_error){}
    try{
      const context=window.OneHomeMintSource?.context?.(activeMintCampaignId());
      if(String(context?.source||'').toLowerCase()==='x') return true;
    }catch(_error){}
    return false;
  }

  function persistPassportSession(session){
    if(!session?.access_token || !session?.refresh_token || !session?.user) return false;
    cachePassportSession(session);
    const encoded=JSON.stringify(session);
    let stored=false;
    try{
      if(window.OneHomeAuthStorage?.storeRaw){
        stored=window.OneHomeAuthStorage.storeRaw(AUTH_STORAGE_KEY,encoded) || stored;
      }
    }catch(_error){}
    try{localStorage.setItem(AUTH_STORAGE_KEY,encoded);stored=true;}catch(_error){}
    try{sessionStorage.setItem(AUTH_STORAGE_KEY,encoded);stored=true;}catch(_error){}
    return stored;
  }

  function directPasswordSession(payload){
    if(!payload?.access_token || !payload?.refresh_token || !payload?.user) return null;
    const expiresIn=Math.max(0,Number(payload.expires_in)||0);
    const expiresAt=Math.max(0,Number(payload.expires_at)||0) || (expiresIn?Math.floor(Date.now()/1000)+expiresIn:0);
    return {
      access_token:String(payload.access_token),
      refresh_token:String(payload.refresh_token),
      token_type:String(payload.token_type||'bearer'),
      expires_in:expiresIn,
      expires_at:expiresAt,
      user:payload.user
    };
  }

  function requestEmbeddedPasswordGrant(email,password){
    return new Promise(function(resolve,reject){
      let settled=false;
      const xhr=new XMLHttpRequest();
      function finish(fn,value){
        if(settled)return;
        settled=true;
        fn(value);
      }
      try{
        xhr.open('POST','/onehome-auth/token?grant_type=password',true);
        xhr.timeout=15000;
        xhr.setRequestHeader('Content-Type','application/json');
        xhr.setRequestHeader('Accept','application/json');
        xhr.setRequestHeader('apikey',SUPABASE_KEY);
        xhr.setRequestHeader('x-client-info','one-home-x-mobile/14.67.47');
        xhr.onload=function(){
          let payload={};
          try{payload=JSON.parse(xhr.responseText||'{}');}catch(_error){}
          if(xhr.status>=200&&xhr.status<300){finish(resolve,payload);return;}
          const message=String(payload?.msg||payload?.message||payload?.error_description||payload?.error||'Email or password is incorrect.');
          const error=new Error(message);
          error.status=xhr.status;
          finish(reject,error);
        };
        xhr.onerror=function(){finish(reject,new Error('The X browser could not reach One Home login. Check your connection and try again.'));};
        xhr.ontimeout=function(){finish(reject,new Error('The X browser did not finish the One Home login request. Check your connection and try again.'));};
        xhr.onabort=function(){finish(reject,new Error('The One Home login request was interrupted. Please try again.'));};
        xhr.send(JSON.stringify({email:email,password:password}));
      }catch(error){finish(reject,error);}
    });
  }

  async function signInWithPasswordForEmbeddedBrowser(email,password){
    const payload=await requestEmbeddedPasswordGrant(email,password);
    const session=directPasswordSession(payload);
    if(!session) throw new Error('One Home verified the login, but the Passport session was not returned. Please try again.');
    if(!persistPassportSession(session)) throw new Error('This browser would not save your One Home Passport session. Open the mint in Safari, Chrome, or MetaMask and try again.');
    return {data:{session:session,user:session.user},error:null};
  }

  function returnToExactMintAfterEmailSignIn(){
    if(currentDestination()!=='mint') return false;
    const campaignId=activeMintCampaignId();
    if(!/^[0-9a-f-]{36}$/i.test(String(campaignId||''))) return false;
    const requested=String(exactMintReturnFromLocation(campaignId)||readXStayIntent()?.exact_url||'').trim();
    if(!requested) return false;
    const target=mintReturnWithSource(requested,campaignId);
    window.location.replace(target);
    return true;
  }

  function showPage(id){
    const target = document.getElementById(id);
    if(target && target.classList.contains('page-view')){
      document.querySelectorAll('.page-view').forEach(function(page){
        page.classList.remove('active');
        page.setAttribute('aria-hidden','true');
      });
      target.hidden = false;
      target.removeAttribute('inert');
      target.removeAttribute('aria-hidden');
      target.style.removeProperty('display');
      target.style.removeProperty('visibility');
      target.classList.add('active');
      return;
    }
    if(typeof window.oneHomeV15Show === 'function') window.oneHomeV15Show(id);
    else if(typeof window.showPage === 'function') window.showPage(id);
  }

  function setStatus(message, kind, targetId){
    const el = q(targetId || 'passportStatus');
    if(!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-visible', Boolean(message));
    el.classList.toggle('is-error', kind === 'error');
    el.classList.toggle('is-success', kind === 'success');
  }

  function setBusy(ids, busy, busyText){
    ids.forEach(function(id){
      const el = q(id);
      if(!el) return;
      if(busy){
        if(!el.dataset.originalHtml) el.dataset.originalHtml = el.innerHTML;
        el.disabled = true;
        if(busyText) el.textContent = busyText;
      }else{
        el.disabled = false;
        if(el.dataset.originalHtml){ el.innerHTML = el.dataset.originalHtml; delete el.dataset.originalHtml; }
      }
    });
  }

  function setMode(nextMode){
    mode = nextMode === 'create' ? 'create' : 'signin';
    const signTab = q('passportSignInTab');
    const createTab = q('passportCreateTab');
    const submit = q('passportEmailSubmitBtn');
    const password = q('passportPassword');
    if(signTab){
      signTab.dataset.label = 'Sign In';
      signTab.setAttribute('aria-label','Sign In');
      signTab.classList.toggle('is-active', mode === 'signin');
      signTab.setAttribute('aria-selected', String(mode === 'signin'));
    }
    if(createTab){
      createTab.dataset.label = 'Create My One Home ID';
      createTab.setAttribute('aria-label','Create My One Home ID');
      createTab.classList.toggle('is-active', mode === 'create');
      createTab.setAttribute('aria-selected', String(mode === 'create'));
    }
    if(submit) submit.textContent = mode === 'create' ? 'Create My One Home ID' : 'Sign In';
    if(password){
      password.setAttribute('autocomplete', mode === 'create' ? 'new-password' : 'current-password');
      password.placeholder = mode === 'create' ? 'Create a password' : 'Enter your password';
    }
    setStatus('', '');
    setTimeout(function(){ q('passportEmail')?.focus(); }, 50);
  }

  function enterOneHomeEcosystem(){
    rememberDestination('choice');
    showPage('onehomeExplorePage');
    window.scrollTo({top:0,behavior:'instant'});
  }

  function openPassportFromMainEntry(){
    if(typeof window.oneHomeJourneyOpenPassport === 'function') window.oneHomeJourneyOpenPassport();
  }

  function openRareRoutesFromMainEntry(){
    if(typeof window.oneHomeV15Show === 'function') window.oneHomeV15Show('onehomeRareRoutesPage');
    else showPage('onehomeRareRoutesPage');
    window.scrollTo({top:0,behavior:'instant'});
  }

  function openMintsFromMainEntry(){
    window.location.assign('/open-mints.html?v=1467218');
  }

  function showEntryChoice(){
    rememberDestination('choice');
    showPage('onehomeEntryChoicePage');
    window.scrollTo({top:0,behavior:'instant'});
  }

  async function routeAfterAuthentication(){
    const destination = currentDestination();
    if(destination === 'mint'){
      const campaignId=activeMintCampaignId();
      if(campaignId){
        await openPublishedMintCampaign(campaignId,mintNetworkFromLocation(),exactMintReturnFromLocation(campaignId));
      }else{
        await continueToFounder();
      }
      return;
    }
    if(destination === 'onehome-start'){
      enterOneHomeEcosystem();
      return;
    }
    showEntryChoice();
  }

  function setEntranceControlsHidden(hidden){
    ['passportEmailPanel','passportWalletColumn','passportForgotPasswordBtn'].forEach(function(id){
      const el = q(id);
      if(el) el.hidden = hidden;
    });
    const tabs = q('passportSignInTab')?.parentElement;
    if(tabs) tabs.hidden = hidden;
  }

  function setWalletEntryBusy(busy){
    document.querySelectorAll('#passportWalletLoginMenu button[data-passport-wallet-login]').forEach(function(button){
      button.disabled=!!busy;
    });
  }

  function showIdentitySuccess(message){
    const panel = q('passportSuccessPanel');
    const copy = q('passportSuccessMessage');
    if(copy) copy.textContent = message || 'Your One Home ID is ready.';
    if(panel) panel.hidden = false;
    setEntranceControlsHidden(true);
    setStatus('', '');
  }

  function hideIdentitySuccess(){
    const panel = q('passportSuccessPanel');
    if(panel) panel.hidden = true;
    setEntranceControlsHidden(false);
  }

  function cachePassportSession(session){
    if(session?.access_token && session?.user) passportSessionCache = session;
    return passportSessionCache;
  }

  async function getSession(){
    if(passportSessionCache?.access_token && passportSessionCache?.user) return passportSessionCache;
    try{
      const sb = getSupabase();
      if(!sb) return null;
      const result = await sb.auth.getSession();
      return cachePassportSession(result?.data?.session || null);
    }catch(_error){ return null; }
  }

  async function getSessionToken(){
    const session = await getSession();
    return session?.access_token || null;
  }

  async function hasAuthenticatedHomeId(){
    const session = await getSession();
    return Boolean(session?.user && session?.access_token);
  }

  async function handleEmailSubmit(event){
    event.preventDefault();
    hideIdentitySuccess();
    const sb = getSupabase();
    if(!sb){ setStatus('Home ID access is still loading. Refresh the page and try again.', 'error'); return; }
    const email = String(q('passportEmail')?.value || '').trim();
    const password = String(q('passportPassword')?.value || '');
    if(!email || !password){ setStatus('Enter your email and password first.', 'error'); return; }
    if(password.length < 6){ setStatus('Password must be at least 6 characters.', 'error'); return; }

    setBusy(['passportEmailSubmitBtn','passportForgotPasswordBtn'], true, mode === 'create' ? 'Creating Home ID…' : 'Signing In…');
    setWalletEntryBusy(true);
    setStatus(mode === 'create' ? 'Creating your Home ID…' : 'Verifying your Home ID…', '');
    emailAuthBusy = true;
    try{
      if(mode === 'create'){
        const destination = currentDestination();
        const collection = activeMintCollectionId();
        const campaign = activeMintCampaignId();
        const network = mintNetworkFromLocation();
        const exactReturn=campaign?exactMintReturnFromLocation(campaign):'';
        const redirectTo = window.location.origin + window.location.pathname + '?passport=entry&from=' + encodeURIComponent(destination) + (campaign ? '&campaign=' + encodeURIComponent(campaign) + (network ? '&network=' + encodeURIComponent(network) : '') + (exactReturn?'&return='+encodeURIComponent(exactReturn):'') : (collection ? '&collection=' + encodeURIComponent(collection) : ''));
        const result = await sb.auth.signUp({email:email,password:password,options:{emailRedirectTo:redirectTo}});
        if(result.error) throw result.error;
        if(result.data?.session){
          persistPassportSession(result.data.session);
          await routeAfterAuthentication();
        }else{
          setStatus('Your One Home ID was created. Check your email to confirm it, then return here and sign in.', 'success');
        }
      }else{
        const embeddedXFlow=xSourcedMobilePasswordFlow();
        const result=embeddedXFlow
          ? await signInWithPasswordForEmbeddedBrowser(email,password)
          : await sb.auth.signInWithPassword({email:email,password:password});
        if(result?.error) throw result.error;
        const signedInSession=result?.data?.session || null;
        if(!signedInSession?.user || !signedInSession?.access_token) throw new Error('One Home did not receive a Passport session. Please try again.');
        persistPassportSession(signedInSession);
        setStatus('Signed in. Returning you to your mint…','success');
        if(returnToExactMintAfterEmailSignIn()) return;
        await routeAfterAuthentication();
      }
    }catch(error){
      setStatus(error?.message || 'Home ID verification did not finish. Try again.', 'error');
    }finally{
      emailAuthBusy = false;
      setBusy(['passportEmailSubmitBtn','passportForgotPasswordBtn'], false);
      setWalletEntryBusy(false);
    }
  }

  async function forgotPassword(){
    hideIdentitySuccess();
    const sb = getSupabase();
    const email = String(q('passportEmail')?.value || '').trim();
    if(!sb){ setStatus('Home ID access is still loading. Refresh the page and try again.', 'error'); return; }
    if(!email){ setStatus('Enter your email first, then choose Forgot your password.', 'error'); return; }
    setBusy(['passportForgotPasswordBtn'], true, 'Sending…');
    try{
      const destination = currentDestination();
      const collection = activeMintCollectionId();
      const campaign = activeMintCampaignId();
      const network = mintNetworkFromLocation();
      const exactReturn=campaign?exactMintReturnFromLocation(campaign):'';
      const redirectTo = window.location.origin + window.location.pathname + '?passport=entry&from=' + encodeURIComponent(destination) + (campaign ? '&campaign=' + encodeURIComponent(campaign) + (network ? '&network=' + encodeURIComponent(network) : '') + (exactReturn?'&return='+encodeURIComponent(exactReturn):'') : (collection ? '&collection=' + encodeURIComponent(collection) : ''));
      const result = await sb.auth.resetPasswordForEmail(email,{redirectTo:redirectTo});
      if(result.error) throw result.error;
      setStatus('Password reset link sent. Check your email.', 'success');
    }catch(error){
      setStatus(error?.message || 'The reset email could not be sent.', 'error');
    }finally{ setBusy(['passportForgotPasswordBtn'], false); }
  }

  function createBrowserNonce(){
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let raw = '';
    bytes.forEach(function(byte){ raw += String.fromCharCode(byte); });
    return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function xamanLinkFrom(data){
    return String(data?.next?.always || data?.next?.no_push_msg_received || data?.next_always || data?.sign_url || '').trim();
  }

  function isAppleSafari(){
    const ua = navigator.userAgent || '';
    const appleMobile = /iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
    const safariEngine = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    return appleMobile && safariEngine;
  }

  function showXamanLaunchButton(link,statusId,message){
    const safeLink = String(link || '').trim();
    const el = q(statusId || 'passportStatus');
    if(!el || !safeLink) return false;
    setStatus(message || 'Your Xaman request is ready. Tap Open Xaman below, approve it, then return to Safari.','',statusId);
    const spacer = document.createElement('div');
    spacer.style.height = '10px';
    const anchor = document.createElement('a');
    anchor.className = 'passport-fix-button';
    anchor.href = safeLink;
    anchor.textContent = 'Open Xaman';
    anchor.setAttribute('aria-label','Open the Xaman signing request');
    anchor.addEventListener('click',function(){
      anchor.textContent = 'Open Xaman Again';
    });
    el.appendChild(spacer);
    el.appendChild(anchor);
    el.classList.add('is-visible');
    return true;
  }

  function openXamanLink(data,statusId){
    const link = xamanLinkFrom(data);
    if(!link) return false;
    try{
      localStorage.setItem(XAMAN_LINK_KEY,link);
      sessionStorage.setItem(XAMAN_LINK_KEY,link);
    }catch(_error){}
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent || ''));
    if(isAppleSafari()){
      return showXamanLaunchButton(link,statusId,'Safari requires one more tap to open Xaman securely.');
    }
    if(mobile){
      window.location.assign(link);
      return true;
    }
    const opened = window.open(link,'_blank','noopener,noreferrer');
    if(!opened) window.location.assign(link);
    return true;
  }

  function stopXamanPolling(){
    if(xamanTimer){ clearInterval(xamanTimer); xamanTimer = null; }
    xamanResumeTimeouts.forEach(function(timer){ clearTimeout(timer); });
    xamanResumeTimeouts = [];
    if(xamanSocket){
      try{ xamanSocket.close(); }catch(_error){}
      xamanSocket = null;
    }
    xamanAttempts = 0;
  }

  function saveXamanVerificationState(uuid,context){
    localStorage.setItem(XAMAN_UUID_KEY,uuid);
    localStorage.setItem(XAMAN_CONTEXT_KEY,context);
    sessionStorage.setItem(XAMAN_UUID_KEY,uuid);
    sessionStorage.setItem(XAMAN_CONTEXT_KEY,context);
  }

  function clearXamanVerificationState(){
    localStorage.removeItem(XAMAN_UUID_KEY);
    localStorage.removeItem(XAMAN_CONTEXT_KEY);
    localStorage.removeItem(XAMAN_NONCE_KEY);
    localStorage.removeItem(XAMAN_LINK_KEY);
    localStorage.removeItem(XAMAN_WS_KEY);
    sessionStorage.removeItem(XAMAN_UUID_KEY);
    sessionStorage.removeItem(XAMAN_CONTEXT_KEY);
    sessionStorage.removeItem(XAMAN_NONCE_KEY);
    sessionStorage.removeItem(XAMAN_LINK_KEY);
    sessionStorage.removeItem(XAMAN_WS_KEY);
  }

  function savedXamanUuid(){
    return localStorage.getItem(XAMAN_UUID_KEY) || sessionStorage.getItem(XAMAN_UUID_KEY) || '';
  }

  function savedXamanContext(){
    return localStorage.getItem(XAMAN_CONTEXT_KEY) || sessionStorage.getItem(XAMAN_CONTEXT_KEY) || 'entrance';
  }

  function restoreXamanReturnStateFromUrl(){
    try{
      const params = new URLSearchParams(window.location.search);
      const nonce = String(params.get('xaman_nonce') || '').trim();
      const uuid = String(params.get('xaman') || '').trim();
      const context = String(params.get('xaman_context') || 'entrance').trim() === 'founder' ? 'founder' : 'entrance';
      if(/^[A-Za-z0-9_-]{40,100}$/.test(nonce)){
        localStorage.setItem(XAMAN_NONCE_KEY,nonce);
        sessionStorage.setItem(XAMAN_NONCE_KEY,nonce);
      }
      if(/^[0-9a-f-]{36}$/i.test(uuid)) saveXamanVerificationState(uuid,context);
      if(nonce){
        params.delete('xaman_nonce');
        const clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
        history.replaceState(null,'',clean);
      }
    }catch(_error){}
  }

  async function checkXaman(uuid,context){
    if(context === 'entrance'){
      const nonce = localStorage.getItem(XAMAN_NONCE_KEY) || sessionStorage.getItem(XAMAN_NONCE_KEY) || '';
      if(!nonce) throw new Error('The secure wallet sign-in return code is missing. Start Xaman sign-in again.');
      const response = await fetch(XAMAN_COMPLETE_ENDPOINT,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({uuid:uuid,nonce:nonce})
      });
      const data = await response.json().catch(function(){ return {}; });
      if(!response.ok) throw new Error(data.error || 'Xaman Home ID sign-in could not be completed.');
      return data;
    }
    const token = await getSessionToken();
    const response = await fetch(FUNCTIONS_BASE + '/xaman-check-payload',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,...(token?{'Authorization':'Bearer '+token}:{})},
      body:JSON.stringify({uuid:uuid,purpose:'profile_wallet_link'})
    });
    const data = await response.json().catch(function(){ return {}; });
    if(!response.ok) throw new Error(data.error || 'Xaman approval could not be checked.');
    return data;
  }

  async function handleVerifiedWallet(address, provider, context, authenticatedHint){
    const previousWallet = sessionStorage.getItem(WALLET_KEY) || localStorage.getItem(WALLET_KEY) || '';
    if(previousWallet && previousWallet.toLowerCase() !== address.toLowerCase()){
      sessionStorage.removeItem(FOUNDER_ELIGIBILITY_KEY);
    }
    sessionStorage.setItem(WALLET_KEY,address);
    sessionStorage.setItem(PROVIDER_KEY,provider);
    localStorage.setItem(WALLET_KEY,address);
    localStorage.setItem(PROVIDER_KEY,provider);
    if(provider === 'crossmark' && context === 'profile'){
      localStorage.setItem('dood_profile_wallet_address',address);
      localStorage.setItem('dood_profile_wallet_provider','crossmark');
      localStorage.setItem('dood_profile_wallet_connected_at',new Date().toISOString());
      localStorage.removeItem('onehome_profile_wallet_switch_pending');
      localStorage.removeItem('onehome_profile_wallet_switch_pending_at');
      try{
        window.dispatchEvent(new CustomEvent('onehome-profile-wallet-changed',{
          detail:{address:address,provider:'crossmark',serverLinked:true}
        }));
      }catch(_error){}
      setTimeout(async function(){
        try{
          if(typeof window.doodV186ERefreshWalletSaveStatus === 'function'){
            await window.doodV186ERefreshWalletSaveStatus();
          }
        }catch(_error){}
        try{
          if(typeof window.doodV186FCleanWalletCard === 'function'){
            window.doodV186FCleanWalletCard();
          }
        }catch(_error){}
      },250);
    }
    const authenticated = authenticatedHint === true ? true : await hasAuthenticatedHomeId();
    if(context === 'profile'){
      setStatus('Crossmark is linked to your One Home Passport.','success','crossmarkProfileStatusPill');
      try{
        if(typeof window.oneHomeRefreshProfileWalletCards === 'function'){
          window.oneHomeRefreshProfileWalletCards();
        }
      }catch(_error){}
      return;
    }
    if(context === 'founder'){
      renderFounderWallet(address,provider);
      if(!authenticated){
        setStatus('Your wallet is confirmed, but the Home ID session is not ready. Return to the front door and choose either email or wallet sign-in.','error','passportFounderStatus');
        return;
      }
      await checkFounderEligibility(address);
      return;
    }
    if(authenticated){
      await routeAfterAuthentication();
    }else{
      setStatus('The wallet was verified, but the wallet Home ID session could not be opened. Try Xaman sign-in again.','error');
    }
  }

  async function resolveXaman(uuid,context){
    if(xamanResumeBusy) return false;
    xamanResumeBusy = true;
    const area = context === 'founder' ? 'founder' : 'entrance';
    const buttonId = area === 'founder' ? 'passportFounderXamanBtn' : 'passportXamanBtn';
    const statusId = area === 'founder' ? 'passportFounderStatus' : 'passportStatus';
    try{
      const data = await checkXaman(uuid,area);
      if(data.waiting) return false;
      if(data.cancelled || data.expired){
        stopXamanPolling();
        clearXamanVerificationState();
        setBusy([buttonId],false);
        setStatus('The Xaman request was cancelled or expired.','error',statusId);
        return true;
      }
      if(data.signed && data.wallet_address){
        if(area === 'entrance' && data.token_hash){
          const sb = getSupabase();
          if(!sb) throw new Error('Home ID access is still loading. Refresh and try again.');
          const verificationType = String(data.verification_type || 'magiclink');
          const verified = await sb.auth.verifyOtp({token_hash:data.token_hash,type:verificationType});
          if(verified.error) throw verified.error;
          cachePassportSession(verified?.data?.session || null);
        }
        stopXamanPolling();
        clearXamanVerificationState();
        setBusy([buttonId],false);
        await handleVerifiedWallet(data.wallet_address,'xaman',area,area === 'entrance');
        return true;
      }
      return false;
    }catch(error){
      stopXamanPolling();
      setBusy([buttonId],false);
      setStatus(error?.message || 'Xaman verification did not finish.','error',statusId);
      return true;
    }finally{
      xamanResumeBusy = false;
    }
  }

  function saveXamanWebsocket(url){
    const value = String(url || '').trim();
    if(!value) return;
    try{
      localStorage.setItem(XAMAN_WS_KEY,value);
      sessionStorage.setItem(XAMAN_WS_KEY,value);
    }catch(_error){}
  }

  function connectXamanWebsocket(uuid,context,url){
    const websocketUrl = String(url || localStorage.getItem(XAMAN_WS_KEY) || sessionStorage.getItem(XAMAN_WS_KEY) || '').trim();
    if(!websocketUrl || typeof WebSocket !== 'function') return;
    if(xamanSocket){ try{xamanSocket.close();}catch(_error){} }
    try{
      xamanSocket = new WebSocket(websocketUrl);
      xamanSocket.onmessage = function(event){
        let message = {};
        try{ message = JSON.parse(event.data || '{}'); }catch(_error){}
        if(message?.signed === true || message?.resolved === true || message?.expired === true || message?.cancelled === true){
          resolveXaman(uuid,context);
        }
      };
      xamanSocket.onerror = function(){ /* visibility resume remains the reliable fallback on iOS */ };
    }catch(_error){}
  }

  function scheduleXamanResumeChecks(uuid,context){
    xamanResumeTimeouts.forEach(function(timer){ clearTimeout(timer); });
    xamanResumeTimeouts = [0,650,1500,3000].map(function(delay){
      return setTimeout(function(){
        if(document.visibilityState !== 'hidden') resolveXaman(uuid,context);
      },delay);
    });
  }

  function beginXamanPolling(uuid, context, websocketUrl){
    stopXamanPolling();
    xamanContext = context === 'founder' ? 'founder' : 'entrance';
    const buttonId = xamanContext === 'founder' ? 'passportFounderXamanBtn' : 'passportXamanBtn';
    const statusId = xamanContext === 'founder' ? 'passportFounderStatus' : 'passportStatus';
    if(websocketUrl) saveXamanWebsocket(websocketUrl);
    connectXamanWebsocket(uuid,xamanContext,websocketUrl);
    scheduleXamanResumeChecks(uuid,xamanContext);
    xamanTimer = setInterval(async function(){
      if(document.visibilityState === 'hidden') return;
      xamanAttempts += 1;
      if(xamanAttempts > 60){
        stopXamanPolling();
        clearXamanVerificationState();
        setBusy([buttonId],false);
        setStatus('The Xaman request timed out. Try again.','error',statusId);
        return;
      }
      await resolveXaman(uuid,xamanContext);
    },5000);
  }

  async function startXaman(context){
    const area = context === 'founder' ? 'founder' : 'entrance';
    const buttonId = area === 'founder' ? 'passportFounderXamanBtn' : 'passportXamanBtn';
    const statusId = area === 'founder' ? 'passportFounderStatus' : 'passportStatus';
    if(area === 'entrance') hideIdentitySuccess();
    stopXamanPolling();
    clearXamanVerificationState();
    setBusy([buttonId],true,'Opening Xaman…');
    setStatus('Preparing secure wallet verification…','',statusId);
    try{
      let response;
      if(area === 'entrance'){
        const nonce = createBrowserNonce();
        localStorage.setItem(XAMAN_NONCE_KEY,nonce);
        sessionStorage.setItem(XAMAN_NONCE_KEY,nonce);
        const collectionId = await resolveFounderCollectionId();
        response = await fetch(XAMAN_CREATE_ENDPOINT,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
          body:JSON.stringify({
            nonce:nonce,
            context:'entrance',
            destination:currentDestination(),
            collection_id:collectionId || null
          })
        });
      }else{
        const token = await getSessionToken();
        response = await fetch(FUNCTIONS_BASE + '/xaman-create-payload',{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,...(token?{'Authorization':'Bearer '+token}:{})},
          body:JSON.stringify({app:'one-home',purpose:'profile_wallet_link'})
        });
      }
      const data = await response.json().catch(function(){ return {}; });
      if(!response.ok || !data.uuid) throw new Error(data.error || 'Could not create the Xaman verification request.');
      saveXamanVerificationState(data.uuid,area);
      setStatus('Your Xaman request is ready.','',statusId);
      beginXamanPolling(data.uuid,area,data.websocket_status || data?.refs?.websocket_status || '');
      if(!openXamanLink(data,statusId)) throw new Error('Xaman could not be opened.');
    }catch(error){
      clearXamanVerificationState();
      stopXamanPolling();
      setBusy([buttonId],false);
      setStatus(error?.message || 'Xaman verification did not start.','error',statusId);
    }
  }

  function resumeXamanVerification(){
    const uuid = savedXamanUuid();
    if(!uuid) return;
    const context = savedXamanContext();
    const statusId = context === 'founder' ? 'passportFounderStatus' : 'passportStatus';
    const buttonId = context === 'founder' ? 'passportFounderXamanBtn' : 'passportXamanBtn';
    setBusy([buttonId],true,'Checking Xaman…');
    setStatus('Checking your Xaman approval…','',statusId);
    const savedLink = localStorage.getItem(XAMAN_LINK_KEY) || sessionStorage.getItem(XAMAN_LINK_KEY) || '';
    if(isAppleSafari() && savedLink){
      showXamanLaunchButton(savedLink,statusId,'Checking your Xaman approval. If Xaman did not open, tap below.');
    }
    if(!xamanTimer) beginXamanPolling(uuid,context,localStorage.getItem(XAMAN_WS_KEY) || sessionStorage.getItem(XAMAN_WS_KEY) || '');
    else scheduleXamanResumeChecks(uuid,context);
  }

  function findCrossmarkSdk(){
    return window.xrpl?.crossmark || window.crossmark || window.CROSSMARK || null;
  }

  function crossmarkAddress(result){
    const candidates=[
      result?.response?.data?.address,
      result?.response?.address,
      result?.response?.data?.resp?.address,
      result?.response?.data?.resp?.result?.address,
      result?.data?.address,
      result?.address
    ];
    return String(candidates.find(Boolean) || '').trim();
  }

  function crossmarkPublicKey(result){
    const candidates=[
      result?.response?.data?.publicKey,
      result?.response?.data?.public_key,
      result?.response?.publicKey,
      result?.response?.public_key,
      result?.data?.publicKey,
      result?.data?.public_key,
      result?.publicKey,
      result?.public_key
    ];
    return String(candidates.find(Boolean) || '').trim();
  }

  function crossmarkSignature(result){
    const candidates=[
      result?.response?.data?.signature,
      result?.response?.signature,
      result?.data?.signature,
      result?.signature
    ];
    return String(candidates.find(Boolean) || '').trim();
  }

  async function callCrossmarkHomeIdFunction(endpoint,body){
    const response=await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify(body || {})
    });
    const data=await response.json().catch(function(){ return {}; });
    if(!response.ok) throw new Error(data.error || 'The secure Crossmark request could not be completed.');
    return data;
  }

  async function crossmarkSignIn(sdk,method,challengeHex){
    if(sdk?.methods?.signInAndWait === method) return sdk.methods.signInAndWait(challengeHex);
    if(sdk?.async?.signInAndWait === method) return sdk.async.signInAndWait(challengeHex);
    return method.call(sdk,challengeHex);
  }

  async function linkCrossmarkToPassport(payload){
    const token = await getSessionToken();
    if(!token) throw new Error('Sign in to your One Home Passport before linking Crossmark.');
    const response = await fetch(PASSPORT_WALLET_LINK_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+token},
      body:JSON.stringify(Object.assign({provider:'crossmark'},payload||{}))
    });
    const data = await response.json().catch(function(){ return {}; });
    if(!response.ok) throw new Error(data.error || 'Crossmark could not be linked to this Passport.');
    return data;
  }

  async function startCrossmark(context){
    const area = context === 'founder' ? 'founder' : (context === 'profile' ? 'profile' : 'entrance');
    const buttonId = area === 'founder' ? 'passportFounderCrossmarkBtn' : (area === 'profile' ? 'crossmarkProfileConnectBtn' : 'passportCrossmarkBtn');
    const statusId = area === 'founder' ? 'passportFounderStatus' : (area === 'profile' ? 'crossmarkProfileStatusPill' : 'passportStatus');
    if(area === 'entrance') hideIdentitySuccess();
    const sdk = findCrossmarkSdk();
    if(!sdk){
      setStatus('Crossmark was not found. Install or unlock the Crossmark extension, then refresh this page.','error',statusId);
      return;
    }
    const method = sdk?.methods?.signInAndWait || sdk?.async?.signInAndWait || sdk?.signInAndWait;
    if(typeof method !== 'function'){
      setStatus('Crossmark is available, but its verification request could not be opened. Refresh Crossmark and this page.','error',statusId);
      return;
    }
    setBusy([buttonId],true,'Opening Crossmark…');
    setStatus('Complete the Crossmark verification request.','',statusId);
    try{
      setStatus('Preparing your secure Crossmark sign-in…','',statusId);
      const challenge = await callCrossmarkHomeIdFunction(CROSSMARK_CREATE_ENDPOINT,{purpose:'home_id'});
      const challengeId = String(challenge?.challenge_id || '').trim();
      const challengeHex = String(challenge?.challenge_hex || '').trim();
      const browserNonce = String(challenge?.browser_nonce || '').trim();
      if(!challengeId || !challengeHex || !browserNonce) throw new Error('One Home did not receive a complete Crossmark verification request.');

      setStatus('Approve the One Home verification message in Crossmark. This does not authorize a payment.','',statusId);
      const result = await crossmarkSignIn(sdk,method,challengeHex);
      const address = crossmarkAddress(result);
      if(!address || !/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) throw new Error('Crossmark did not return a verified wallet address.');
      const publicKey = crossmarkPublicKey(result);
      const signature = crossmarkSignature(result);
      if(!publicKey || !signature) throw new Error('Crossmark did not return the signed verification details.');

      setStatus('Confirming your Crossmark wallet…','',statusId);
      const proof={
        challenge_id:challengeId,
        browser_nonce:browserNonce,
        wallet_address:address,
        public_key:publicKey,
        signature:signature
      };
      if(area === 'profile'){
        const linked=await linkCrossmarkToPassport(proof);
        await handleVerifiedWallet(String(linked.wallet_address||address),'crossmark',area,true);
      }else{
        const completed = await callCrossmarkHomeIdFunction(CROSSMARK_COMPLETE_ENDPOINT,proof);
        const tokenHash = String(completed?.token_hash || '').trim();
        const verificationType = String(completed?.verification_type || 'magiclink').trim();
        if(completed?.signed !== true || !tokenHash) throw new Error('The verified Crossmark wallet could not open a Home ID session.');
        if(area === 'entrance'){
          const sb = getSupabase();
          if(!sb) throw new Error('Home ID access is still loading. Refresh and try again.');
          const verified = await sb.auth.verifyOtp({token_hash:tokenHash,type:verificationType});
          if(verified.error) throw verified.error;
          cachePassportSession(verified?.data?.session || null);
          await handleVerifiedWallet(address,'crossmark',area,true);
        }else{
          const authenticated = await hasAuthenticatedHomeId();
          if(!authenticated) throw new Error('Sign in to your One Home Passport before checking this Crossmark wallet.');
          await handleVerifiedWallet(address,'crossmark',area,true);
        }
      }
    }catch(error){
      const message = String(error?.message || error || '');
      if(area === 'profile'){
        const profileStatus = q(statusId);
        if(profileStatus) profileStatus.dataset.providerTransientUntil = String(Date.now() + 12000);
      }
      setStatus(/cancel|reject/i.test(message) ? 'The Crossmark request was cancelled.' : (message || 'Crossmark verification did not finish.'),'error',statusId);
    }finally{ setBusy([buttonId],false); }
  }

  function setFounderResult(id,state,text){
    const row = q(id);
    if(!row) return;
    row.classList.toggle('is-confirmed',state === 'confirmed');
    row.classList.toggle('is-failed',state === 'failed');
    const icon = row.querySelector('span');
    const copy = row.querySelector('strong');
    if(icon) icon.textContent = state === 'confirmed' ? '✓' : (state === 'failed' ? '×' : '…');
    if(copy) copy.textContent = text;
  }

  function renderFounderWallet(address,provider){
    setFounderResult('passportWalletResult','confirmed','Wallet Connected');
    setStatus('Wallet confirmed: '+address.slice(0,8)+'…'+address.slice(-6)+' via '+(provider === 'xaman' ? 'Xaman' : 'Crossmark')+'.','success','passportFounderStatus');
  }

  function showFounderAction(id,show){
    const action=q(id);
    if(action) action.hidden=!show;
  }

  function readGateNumber(gate,keys){
    for(const key of keys){
      const value=Number(gate?.[key]);
      if(Number.isFinite(value)) return value;
    }
    return null;
  }

  function findGate(gates,words,index){
    const match = gates.find(function(g){
      const text = String(g?.gate_name || g?.gate_type || '').toLowerCase();
      return words.some(function(word){ return text.includes(word); });
    });
    return match || gates[index] || null;
  }

  function founderCacheRead(walletAddress,collectionId){
    try{
      const cached = JSON.parse(sessionStorage.getItem(FOUNDER_CACHE_KEY) || 'null');
      if(!cached || cached.wallet !== walletAddress || cached.collection_id !== collectionId) return null;
      if(Date.now() - Number(cached.checked_at || 0) > 60000) return null;
      return cached.data || null;
    }catch(_error){ return null; }
  }

  function founderCacheWrite(walletAddress,collectionId,data){
    try{
      sessionStorage.setItem(FOUNDER_CACHE_KEY,JSON.stringify({wallet:walletAddress,collection_id:collectionId,checked_at:Date.now(),data:data}));
    }catch(_error){}
  }

  function renderFounderEligibilityData(data,collectionId,walletAddress){
    const gates = Array.isArray(data.gates) ? data.gates : [];
    const quill = findGate(gates,['quill','nft'],0);
    const dood = findGate(gates,['dood','coin','currency'],1);
    setFounderResult('passportQuillResult',quill?.passed ? 'confirmed' : 'failed',quill?.passed ? 'Quill Key Verified' : 'Quill Key Not Found');
    showFounderAction('passportQuillAction',!quill?.passed);
    const required=readGateNumber(dood,['required','minimum','minimum_balance','required_amount','threshold']) ?? 88888;
    const balance=readGateNumber(dood,['balance','current_balance','actual','held_amount','amount']);
    const progress=q('passportDoodProgress');
    const needed=q('passportDoodNeeded');
    let failedLabel=required.toLocaleString()+' dOOd Required';
    if(balance !== null){
      failedLabel=balance.toLocaleString()+' / '+required.toLocaleString()+' dOOd';
      if(progress) progress.textContent=failedLabel;
      if(needed) needed.textContent='Need '+Math.max(0,required-balance).toLocaleString()+' more.';
    }else{
      if(progress) progress.textContent=required.toLocaleString()+' dOOd required.';
      if(needed) needed.textContent='Get dOOd, then return here.';
    }
    setFounderResult('passportDoodResult',dood?.passed ? 'confirmed' : 'failed',dood?.passed ? 'dOOd Balance Verified' : failedLabel);
    showFounderAction('passportDoodAction',!dood?.passed);
    const enter = q('passportEnterFounderDropBtn');
    if(enter) enter.disabled = !data.eligible;
    if(data.eligible){
      const verifiedAccess={eligible:true,collection_id:collectionId,wallet:walletAddress,provider:sessionStorage.getItem(PROVIDER_KEY) || localStorage.getItem(PROVIDER_KEY) || '',checked_at:Date.now()};
      try{ sessionStorage.setItem(FOUNDER_ELIGIBILITY_KEY,JSON.stringify(verifiedAccess)); }catch(_error){}
      try{ localStorage.setItem(FOUNDER_ELIGIBILITY_KEY,JSON.stringify(verifiedAccess)); }catch(_error){}
    }else{
      try{ sessionStorage.removeItem(FOUNDER_ELIGIBILITY_KEY); }catch(_error){}
      try{ localStorage.removeItem(FOUNDER_ELIGIBILITY_KEY); }catch(_error){}
    }
    setStatus(data.eligible ? 'Welcome to the Founder Supply Drop.' : 'This wallet does not meet every Founder Supply Drop requirement yet.',data.eligible ? 'success' : 'error','passportFounderStatus');
  }

  async function checkFounderEligibility(walletAddress,force){
    const collectionId = await resolveFounderCollectionId();
    if(!collectionId){
      setStatus('The live Founder Supply Drop could not be identified. Refresh and try again.','error','passportFounderStatus');
      return;
    }
    const key = String(walletAddress || '').toLowerCase()+'|'+collectionId;
    if(founderCheckPromise && founderCheckKey === key) return founderCheckPromise;
    const cached = force === true ? null : founderCacheRead(walletAddress,collectionId);
    if(cached){
      renderFounderEligibilityData(cached,collectionId,walletAddress);
      return cached;
    }
    founderCheckKey = key;
    founderCheckPromise = (async function(){
      const token = await getSessionToken();
      if(!token){
        setStatus('Your One Home ID session has expired. Return to the front door and sign in again.','error','passportFounderStatus');
        return null;
      }
      setFounderResult('passportQuillResult','waiting','Checking Quill Key…');
      setFounderResult('passportDoodResult','waiting','Checking dOOd balance…');
      setBusy(['passportFounderXamanBtn','passportFounderCrossmarkBtn'],true,'Checking…');
      setStatus('Checking Founder Supply Drop eligibility…','','passportFounderStatus');
      const controller = new AbortController();
      const timeout = setTimeout(function(){ controller.abort(); },15000);
      try{
        const response = await fetch(FUNCTIONS_BASE + '/xrpl-check-mint-gates',{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+token},
          body:JSON.stringify({collection_id:collectionId,wallet_address:walletAddress}),
          signal:controller.signal
        });
        const data = await response.json().catch(function(){ return {}; });
        if(!response.ok) throw new Error(data.error || 'The Founder eligibility check could not be completed.');
        founderCacheWrite(walletAddress,collectionId,data);
        renderFounderEligibilityData(data,collectionId,walletAddress);
        return data;
      }catch(error){
        setFounderResult('passportQuillResult','waiting','Quill Key verification could not finish.');
        setFounderResult('passportDoodResult','waiting','dOOd balance verification could not finish.');
        const message = error?.name === 'AbortError' ? 'The mobile verification took too long. Tap Retry Check.' : (error?.message || 'The Founder eligibility check could not be completed.');
        setStatus(message,'error','passportFounderStatus');
        return null;
      }finally{
        clearTimeout(timeout);
        setBusy(['passportFounderXamanBtn','passportFounderCrossmarkBtn'],false);
        founderCheckPromise = null;
        founderCheckKey = '';
      }
    })();
    return founderCheckPromise;
  }

  async function continueToFounder(){
    const authenticated = await hasAuthenticatedHomeId();
    if(!authenticated){
      hideIdentitySuccess();
      setStatus('Your Home ID session has expired. Sign in again.','error');
      return null;
    }
    rememberDestination('mint');
    showPage('onehomeFounderEligibilityPage');
    setFounderResult('passportIdentityResult','confirmed','Home ID Verified');
    setFounderResult('passportWalletResult','failed','Wallet Not Connected');
    setFounderResult('passportQuillResult','waiting','Quill Key Not Checked');
    setFounderResult('passportDoodResult','waiting','dOOd Balance Not Checked');
    showFounderAction('passportQuillAction',false);
    showFounderAction('passportDoodAction',false);
    const enter = q('passportEnterFounderDropBtn');
    if(enter) enter.disabled = true;
    const wallet = sessionStorage.getItem(WALLET_KEY) || localStorage.getItem(WALLET_KEY) || '';
    const provider = sessionStorage.getItem(PROVIDER_KEY) || localStorage.getItem(PROVIDER_KEY) || '';
    if(wallet){
      renderFounderWallet(wallet,provider);
      return await checkFounderEligibility(wallet);
    }else{
      setStatus('Choose Xaman or Crossmark to check the Founder requirements.','','passportFounderStatus');
      return null;
    }
  }

  function readFounderEligibility(collectionId,walletAddress){
    try{
      const parsed = JSON.parse(sessionStorage.getItem(FOUNDER_ELIGIBILITY_KEY) || localStorage.getItem(FOUNDER_ELIGIBILITY_KEY) || 'null');
      if(!parsed || parsed.eligible !== true) return null;
      if(collectionId && String(parsed.collection_id || '') !== String(collectionId)) return null;
      if(walletAddress && String(parsed.wallet || '').toLowerCase() !== String(walletAddress).toLowerCase()) return null;
      if(!Number(parsed.checked_at) || Date.now() - Number(parsed.checked_at) > 30 * 60 * 1000) return null;
      return parsed;
    }catch(_error){ return null; }
  }

  async function routeRequestedMint(){
    rememberDestination('mint');
    // Only an explicit campaign in the current URL may select a standard mint.
    // A previous Testnet campaign saved in this browser must never replace the
    // campaign-free Founder/Mainnet route.
    const campaignId=campaignIdFromLocation();
    const authenticated=await hasAuthenticatedHomeId();
    if(!authenticated){
      openEntrance('mint');
      return;
    }

    if(campaignId){
      await openPublishedMintCampaign(campaignId,mintNetworkFromLocation(),exactMintReturnFromLocation(campaignId));
      return;
    }

    const collectionId=await resolveFounderCollectionId();
    const wallet=sessionStorage.getItem(WALLET_KEY) || localStorage.getItem(WALLET_KEY) || '';
    if(wallet && readFounderEligibility(collectionId,wallet)){
      await openFounderMint(collectionId);
      return;
    }
    const eligibility=await continueToFounder();
    if(eligibility?.eligible === true) await openFounderMint(collectionId);
  }
  function updateFounderMintWallet(){
    const wallet = sessionStorage.getItem(WALLET_KEY) || localStorage.getItem(WALLET_KEY) || '';
    const provider = sessionStorage.getItem(PROVIDER_KEY) || localStorage.getItem(PROVIDER_KEY) || '';
    const el = q('founderMintWallet');
    if(!el) return;
    if(wallet){
      const label = provider === 'xaman' ? 'Xaman' : (provider === 'crossmark' ? 'Crossmark' : 'wallet');
      el.textContent = wallet.slice(0,8)+'…'+wallet.slice(-6)+' verified with '+label+'.';
    }else{
      el.textContent = 'Verified wallet ready.';
    }
  }

  function setFounderMintState(){
    if(typeof window.oneHomePublicMintRefresh === 'function') window.oneHomePublicMintRefresh();
  }

  async function openPublishedMintCampaign(campaignId,network,exactReturn){
    const id=rememberMintCampaign(campaignId);
    if(!id) return;
    rememberDestination('mint');
    const requested=String(exactReturn||exactMintReturnFromLocation(id)||'').trim();
    if(requested){window.location.assign(mintReturnWithSource(requested,id));return;}
    const targetNetwork=String(network || 'testnet').toLowerCase()==='mainnet'?'mainnet':'testnet';
    const target=targetNetwork==='testnet'
      ? `/test-mint.html?campaign=${encodeURIComponent(id)}&network=testnet`
      : `/mint/${encodeURIComponent(id)}?network=mainnet&v=146744`;
    window.location.assign(mintReturnWithSource(target,id));
  }

  async function openFounderMint(collectionId){
    try{sessionStorage.removeItem(MINT_CAMPAIGN_KEY);}catch(_error){}
    if(collectionId) rememberMintCollection(collectionId);
    rememberDestination('mint');
    showPage('onehomeFounderMintPage');
    updateFounderMintWallet();
    if(typeof window.oneHomePublicMintOpen === 'function'){
      await window.oneHomePublicMintOpen({founder:true});
    }
  }
  function handleFounderMintRequest(provider){
    if(typeof window.oneHomePublicMintStart === 'function'){
      window.oneHomePublicMintStart(String(provider || '').toLowerCase());
      return;
    }
    const status = q('founderMintStatus');
    if(status) status.innerHTML = '<strong>MINT CONNECTION IS LOADING</strong><span>Please wait a moment and try again.</span>';
  }

  function backToFounderEligibility(){
    showPage('onehomeFounderEligibilityPage');
  }

  function enterFounderDrop(){
    const button = q('passportEnterFounderDropBtn');
    if(button?.disabled) return;
    openFounderMint();
  }

  function backToPorch(){
    stopXamanPolling();
    showPage('homePage');
  }

  function backToFrontDoor(){
    showEntryChoice();
  }

  function clearAccountSessionCaches(){
    const keys = [
      WALLET_KEY,
      PROVIDER_KEY,
      FOUNDER_ELIGIBILITY_KEY,
      FOUNDER_CACHE_KEY,
      'dood_profile_wallet_address',
      'dood_profile_wallet_provider',
      'dood_profile_wallet_connected_at',
      'dood_profile_wallet_username',
      'dood_wallet_address',
      'dood_wallet_provider',
      'wallet_address',
      'xaman_wallet_address',
      'xumm_wallet_address',
      'doodProfileBackup',
      'doodProfileBackupV186T',
      'doodlabsLastKnownProfileV96',
      'doodlabsProfilesV2',
      'dood_profile_backup',
      'doodUser',
      'dood_session',
      'xaman_payload',
      'xamanSession',
      'dood_identity_session',
      'dood_identity_profile_me',
      'dood_identity_last_error',
      'dood_identity_last_debug',
      'dood_identity_profile_me_error'
    ];
    keys.forEach(function(key){
      try{ localStorage.removeItem(key); }catch(_error){}
      try{ sessionStorage.removeItem(key); }catch(_error){}
    });
    clearXamanVerificationState();
    try{
      if(window.DoodIdentity && typeof window.DoodIdentity.clearSession === 'function'){
        window.DoodIdentity.clearSession();
      }
    }catch(_error){}
  }

  async function logout(){
    const button = q('oneHomePassportLogoutBtn');
    const status = q('oneHomePassportLogoutStatus');
    if(button?.disabled) return;
    if(button){
      button.disabled = true;
      button.dataset.originalText = button.textContent || 'Log Out';
      button.textContent = 'Logging Out…';
    }
    if(status){ status.hidden = true; status.textContent = ''; }
    stopXamanPolling();
    try{
      const sb = getSupabase();
      if(!sb?.auth?.signOut) throw new Error('Account access is still loading. Please try again.');
      const result = await sb.auth.signOut();
      if(result?.error) throw result.error;
      passportSessionCache = null;
      try{ window.dispatchEvent(new CustomEvent('onehome:logout')); }catch(_error){}
      clearAccountSessionCaches();
      window.location.replace('/');
    }catch(error){
      if(status){
        status.textContent = String(error?.message || 'Log out could not be completed. Please try again.');
        status.hidden = false;
      }
      if(button){
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Log Out';
        delete button.dataset.originalText;
      }
    }
  }

  async function refreshExistingSession(){
    const authenticated = await hasAuthenticatedHomeId();
    if(authenticated) await routeAfterAuthentication();
    else hideIdentitySuccess();
  }

  function openEntrance(destination){
    const params = new URLSearchParams(window.location.search);
    const isMintRoute = params.get('passport') === 'mint' || String(window.location.hash || '').startsWith('#mint/');
    const requested = destination || (isMintRoute ? 'mint' : (params.get('from') || 'choice'));
    rememberDestination(requested);
    updateEntranceDestinationCopy();
    showPage('onehomePassportEntrancePage');
    refreshExistingSession();
    setTimeout(function(){ q('passportEmail')?.focus(); },120);
  }

  function init(){
    restoreXamanReturnStateFromUrl();
    q('passportSignInTab')?.addEventListener('click',function(){ setMode('signin'); });
    q('passportCreateTab')?.addEventListener('click',function(){ setMode('create'); });
    q('passportHeaderSignInBtn')?.addEventListener('click',function(){ hideIdentitySuccess(); setMode('signin'); });
    q('passportEmailForm')?.addEventListener('submit',handleEmailSubmit);
    q('passportForgotPasswordBtn')?.addEventListener('click',forgotPassword);
    renderWalletLoginMenu();
    q('passportWalletLoginMenu')?.addEventListener('click',function(event){
      const button=event.target&&event.target.closest?event.target.closest('button[data-passport-wallet-login]'):null;
      if(!button||button.disabled)return;
      const provider=String(button.dataset.passportWalletLogin||'').toLowerCase();
      const picker=q('passportWalletPicker');if(picker)picker.open=false;
      if(provider==='xaman'){startXaman('entrance');return;}
      if(provider==='crossmark'){startCrossmark('entrance');return;}
      if(provider==='metamask'){
        if(window.OneHomeMetaMaskHomeId&&typeof window.OneHomeMetaMaskHomeId.start==='function'){window.OneHomeMetaMaskHomeId.start(String(button.dataset.passportWalletChain||''));return;}
        setStatus('MetaMask sign-in is still loading. Try again in a moment.','error');
        return;
      }
      if(provider==='joey'){
        if(window.OneHomeJoeyHomeId&&typeof window.OneHomeJoeyHomeId.start==='function'){window.OneHomeJoeyHomeId.start();return;}
        setStatus('Joey ownership sign-in is still loading. Try again in a moment.','error');
      }
    });
    q('passportContinueFounderBtn')?.addEventListener('click',showEntryChoice);
    q('passportChoiceFounderBtn')?.addEventListener('click',continueToFounder);
    q('passportChoicePassportBtn')?.addEventListener('click',openPassportFromMainEntry);
    q('passportChoiceHomeBtn')?.addEventListener('click',enterOneHomeEcosystem);
    q('passportChoiceRareRoutesBtn')?.addEventListener('click',openRareRoutesFromMainEntry);
    q('passportChoiceOpenMintsBtn')?.addEventListener('click',openMintsFromMainEntry);
    q('passportChoiceBackBtn')?.addEventListener('click',backToPorch);
    q('oneHomePassportLogoutBtn')?.addEventListener('click',logout);
    q('passportBackToPorchBtn')?.addEventListener('click',backToPorch);
    q('passportFounderBackBtn')?.addEventListener('click',backToFrontDoor);
    q('passportFounderXamanBtn')?.addEventListener('click',function(){ startXaman('founder'); });
    window.addEventListener('focus',function(){
      if(!q('onehomeFounderEligibilityPage')?.classList.contains('active')) return;
      clearTimeout(founderFocusTimer);
      founderFocusTimer=setTimeout(function(){
        const wallet=sessionStorage.getItem(WALLET_KEY) || localStorage.getItem(WALLET_KEY) || '';
        if(wallet) checkFounderEligibility(wallet,false);
      },350);
    });
    q('passportFounderCrossmarkBtn')?.addEventListener('click',function(){ startCrossmark('founder'); });
    q('passportEnterFounderDropBtn')?.addEventListener('click',enterFounderDrop);
    q('founderMintBackBtn')?.addEventListener('click',backToFounderEligibility);
    q('founderMintXamanBtn')?.addEventListener('click',function(){ handleFounderMintRequest('Xaman'); });
    q('founderMintCrossmarkBtn')?.addEventListener('click',function(){ handleFounderMintRequest('Crossmark'); });
    setMode('create');

    const params = new URLSearchParams(window.location.search);
    const locationCampaign = campaignIdFromLocation();
    const locationCollection = collectionIdFromLocation();
    if(locationCampaign) rememberMintCampaign(locationCampaign);
    else if(params.get('passport') === 'mint'){
      // A campaign-free mint URL is the established Founder/Mainnet page.
      // Clear any prior Testnet campaign remembered by this browser.
      sessionStorage.removeItem(MINT_CAMPAIGN_KEY);
      if(locationCollection) rememberMintCollection(locationCollection);
      else resolveFounderCollectionId();
    }else if(locationCollection) rememberMintCollection(locationCollection);
    else if(currentDestination() === 'mint') resolveFounderCollectionId();
    if(params.get('passport') === 'entry') openEntrance(params.get('from') || 'choice');
    const requestedMintRoute=params.get('passport') === 'mint' || String(window.location.hash || '').startsWith('#mint/');
    if(requestedMintRoute){
      // Route the exact campaign before any generic Founder refresh can begin.
      // This prevents a campaign-free request from occupying the shared loader
      // and swallowing the requested Testnet campaign.
      routeRequestedMint();
    }else{
      setFounderMintState();
    }

    resumeXamanVerification();
    window.addEventListener('pageshow',resumeXamanVerification);
    window.addEventListener('focus',resumeXamanVerification);
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState === 'visible') resumeXamanVerification();
    });

    const sb = getSupabase();
    if(sb?.auth?.onAuthStateChange && !window.__oneHomePassportAuthBound){
      window.__oneHomePassportAuthBound = true;
      sb.auth.onAuthStateChange(function(event,session){
        if(session) cachePassportSession(session);
        if(event === 'SIGNED_OUT') passportSessionCache = null;
        if((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user && !emailAuthBusy && q('onehomePassportEntrancePage')?.classList.contains('active')){
          routeAfterAuthentication();
        }
      });
    }
  }

  window.openOneHomePassportEntrance = openEntrance;
  window.oneHomePassportShowChoice = showEntryChoice;
  window.oneHomePassportBackToPorch = backToPorch;
  window.oneHomePassportContinueToFounder = continueToFounder;
  window.oneHomePassportShowChoice = showEntryChoice;
  window.oneHomePassportEnterEcosystem = enterOneHomeEcosystem;
  window.oneHomePassportLogout = logout;
  window.oneHomeConnectCrossmarkProfile = function(){ return startCrossmark('profile'); };
  window.openFounderSupplyDrop = openFounderMint;
  window.oneHomeActiveMintCollectionId = activeMintCollectionId;
  window.oneHomeActiveMintCampaignId = activeMintCampaignId;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
