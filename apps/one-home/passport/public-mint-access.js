/* One Home public mint page.
   Collection artwork and mint details are loaded from the mint saved in Rare Ink Studio. */
(function(){
  'use strict';

  const SUPABASE_URL = 'https://fshvettlltcujmwvikfq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1';
  const LEGACY_MINT_COLLECTION_KEY = 'onehome_active_mint_collection_id';
  const MINT_CAMPAIGN_KEY = 'onehome_active_mint_campaign_id_v1368';
  const FOUNDER_ELIGIBILITY_KEY = 'onehome_founder_eligibility';
  const STANDARD_ELIGIBILITY_KEY = 'onehome_mint_eligibility_v1368';
  const WALLET_KEY = 'onehome_passport_verified_wallet';
  const PROVIDER_KEY = 'onehome_passport_verified_provider';
  const ACCESS_CACHE_MS = 60 * 1000;
  const DEFAULT_FOUNDER_ART = 'assets/founder-supply-drop-sealed.png';
  const DEFAULT_STANDARD_ART = 'assets/one-home-image-placeholder.png';
  const PENDING_MINT_KEY = 'onehome_pending_wallet_mint_claim';
  const LEGACY_PENDING_MINT_KEY = 'onehome_pending_xaman_mint_claim';
  let currentMint = null;
  let loadingPromise = null;
  let loadingKey = '';
  let loadingController = null;
  let loadSequence = 0;
  let mintPollTimer = null;
  let accessCheckPromise = null;
  let accessCheckKey = '';
  let accessResumeTimer = null;

  function q(id){ return document.getElementById(id); }
  function text(id,value){ const el=q(id); if(el) el.textContent=String(value ?? ''); }
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

  function getSupabase(){
    if(window.doodProfileSupabase?.auth) return window.doodProfileSupabase;
    if(window.doodSupabase?.auth) return window.doodSupabase;
    if(window.supabaseClient?.auth) return window.supabaseClient;
    if(window.supabase?.createClient){
      window.oneHomePublicMintSupabase = window.oneHomePublicMintSupabase || window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      return window.oneHomePublicMintSupabase;
    }
    return null;
  }

  async function isAuthenticated(){
    try{
      const sb=getSupabase();
      if(!sb) return false;
      const result=await sb.auth.getUser();
      return Boolean(result?.data?.user && !result.error);
    }catch(_error){ return false; }
  }

  function activeCollectionId(){
    try{
      const params=new URLSearchParams(window.location.search);
      const query=String(params.get('collection') || '').trim();
      if(/^[0-9a-f-]{36}$/i.test(query)) return query;
      const match=String(window.location.hash || '').match(/#mint\/([0-9a-f-]{36})/i);
      if(match) return match[1];
      return sessionStorage.getItem(LEGACY_MINT_COLLECTION_KEY) || '';
    }catch(_error){ return ''; }
  }

  function activeCampaignId(){
    try{
      const params=new URLSearchParams(window.location.search);
      const query=String(params.get('campaign') || '').trim();
      if(/^[0-9a-f-]{36}$/i.test(query)) return query;
      return sessionStorage.getItem(MINT_CAMPAIGN_KEY) || '';
    }catch(_error){ return ''; }
  }

  function requestedNetwork(){
    try{
      const value=String(new URLSearchParams(window.location.search).get('network') || '').toLowerCase();
      return value==='mainnet'?'mainnet':value==='testnet'?'testnet':'';
    }catch(_error){ return ''; }
  }
  function rememberCollection(id){
    const value=String(id || '').trim();
    if(/^[0-9a-f-]{36}$/i.test(value)) sessionStorage.setItem(LEGACY_MINT_COLLECTION_KEY,value);
  }

  function rememberCampaign(id){
    const value=String(id || '').trim();
    if(/^[0-9a-f-]{36}$/i.test(value)) sessionStorage.setItem(MINT_CAMPAIGN_KEY,value);
  }
  function readStoredJson(key){
    try{
      const sessionValue=sessionStorage.getItem(key);
      if(sessionValue) return JSON.parse(sessionValue);
    }catch(_error){}
    try{
      const localValue=localStorage.getItem(key);
      if(localValue) return JSON.parse(localValue);
    }catch(_error){}
    return null;
  }

  function storeEligibility(value,founder){
    const key=founder?FOUNDER_ELIGIBILITY_KEY:STANDARD_ELIGIBILITY_KEY;
    try{ sessionStorage.setItem(key,JSON.stringify(value)); }catch(_error){}
    if(founder){ try{ localStorage.setItem(key,JSON.stringify(value)); }catch(_error){} }
  }
  function clearEligibility(founder){
    const keys=founder?[FOUNDER_ELIGIBILITY_KEY]:[STANDARD_ELIGIBILITY_KEY];
    keys.forEach(function(key){
      try{ sessionStorage.removeItem(key); }catch(_error){}
      if(founder){ try{ localStorage.removeItem(key); }catch(_error){} }
    });
  }
  function verifiedWallet(){
    try{
      return String(sessionStorage.getItem(WALLET_KEY) || localStorage.getItem(WALLET_KEY) || '').trim();
    }catch(_error){ return ''; }
  }

  function eligibilityFor(data,maxAge){
    try{
      const founder=data?.access_mode==='founder' || data?.is_founder===true;
      const key=founder?FOUNDER_ELIGIBILITY_KEY:STANDARD_ELIGIBILITY_KEY;
      const stored=readStoredJson(key);
      if(!stored || stored.eligible !== true) return null;
      const campaignId=String(data?.campaign?.id || '').trim();
      const collectionId=String(data?.collection?.id || '').trim();
      if(campaignId && stored.campaign_id && String(stored.campaign_id)!==campaignId) return null;
      if(!stored.campaign_id && collectionId && stored.collection_id && String(stored.collection_id)!==collectionId) return null;
      if(Date.now() - Number(stored.checked_at || 0) > Number(maxAge || 30 * 60 * 1000)) return null;
      const wallet=verifiedWallet();
      if(!wallet || String(stored.wallet || '').toLowerCase() !== wallet.toLowerCase()) return null;
      return stored;
    }catch(_error){ return null; }
  }
  function isMobileBrowser(){
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent || ''));
  }

  function setLoading(target){
    currentMint=null;
    const supplied=target && typeof target==='object' ? target : {};
    const founder=supplied.founder===true || (!supplied.campaign_id && !supplied.collection_id);
    text('founderMintHeaderPath',founder?'FOUNDER DROP':'MINT');
    text('founderMintDropLabel',founder?'FOUNDER SUPPLY DROP':'PUBLISHED MINT');
    text('founderMintSealStatus','LOADING');
    text('founderMintName','LOADING MINT');
    text('founderMintDescription','Loading the collection information saved by the creator.');
    text('founderMintPrice','—');
    text('founderMintSupply','—');
    text('founderMintStatusLabel','LOADING');
    text('founderMintQuantity','—');
    const image=q('founderMintArtwork');
    if(image){
      image.src=founder?DEFAULT_FOUNDER_ART:DEFAULT_STANDARD_ART;
      image.alt=founder?'88 Squared Founder Supply Drop sealed package':'Published mint artwork is loading';
      image.hidden=false;
    }
    const status=q('founderMintStatus');
    if(status){
      status.classList.add('is-preparing');
      status.innerHTML='<strong>LOADING PUBLISHED MINT</strong><span>One Home is retrieving the collection details saved by the creator.</span>';
    }
    setButtons(false);
  }

  function setButtons(enabled){
    const xaman=q('founderMintXamanBtn');
    if(xaman){xaman.disabled=!enabled;xaman.setAttribute('aria-disabled',String(!enabled));}
    const crossmark=q('founderMintCrossmarkBtn');
    if(crossmark){
      crossmark.hidden=isMobileBrowser();
      crossmark.disabled=!enabled || isMobileBrowser();
      crossmark.setAttribute('aria-disabled',String(!enabled || isMobileBrowser()));
      crossmark.title=isMobileBrowser()?'Crossmark minting is available on desktop.':'Mint with Crossmark';
    }
  }

  async function session(){
    const sb=getSupabase();
    if(!sb) return null;
    const result=await sb.auth.getSession();
    return result?.data?.session || null;
  }

  async function callFunction(name,body,authenticated){
    const headers={'Content-Type':'application/json','apikey':SUPABASE_KEY};
    if(authenticated){
      const current=await session();
      if(!current?.access_token) throw new Error('Your Home ID session expired. Sign in again.');
      headers.Authorization='Bearer '+current.access_token;
    }
    const response=await fetch(FUNCTIONS_BASE+'/'+name,{method:'POST',headers,body:JSON.stringify(body||{})});
    const data=await response.json().catch(function(){return {};});
    if(!response.ok && data.success!==true) throw new Error(data.error || 'The mint request could not be completed.');
    return {data,status:response.status};
  }


  async function verifyMintAccess(data,force){
    const campaignId=String(data?.campaign?.id || '').trim();
    const collectionId=String(data?.collection?.id || '').trim();
    const wallet=verifiedWallet();
    const founder=data?.access_mode==='founder' || data?.is_founder===true;
    if(!campaignId || !wallet) return null;

    const recent=force === true ? null : eligibilityFor(data,ACCESS_CACHE_MS);
    if(recent) return recent;

    const key=wallet.toLowerCase()+'|'+campaignId+'|'+(founder?'founder':'standard');
    if(accessCheckPromise && accessCheckKey===key) return accessCheckPromise;
    accessCheckKey=key;
    accessCheckPromise=(async function(){
      try{
        const result=founder
          ? await callFunction('xrpl-check-mint-gates',{campaign_id:campaignId,collection_id:collectionId,wallet_address:wallet},true)
          : await callFunction('check-mint-eligibility',{campaign_id:campaignId,collector_wallet:wallet},true);
        const gateData=result.data || {};
        if(gateData.eligible !== true){
          clearEligibility(founder);
          return null;
        }
        const verified={
          eligible:true,
          campaign_id:campaignId,
          collection_id:collectionId,
          wallet:wallet,
          provider:String(sessionStorage.getItem(PROVIDER_KEY) || localStorage.getItem(PROVIDER_KEY) || ''),
          checked_at:Date.now(),
          source:'backend'
        };
        storeEligibility(verified,founder);
        return verified;
      }catch(error){
        console.error('One Home mint access verification',error);
        return null;
      }finally{
        accessCheckPromise=null;
        accessCheckKey='';
      }
    })();
    return accessCheckPromise;
  }
  function readPendingMint(){try{return JSON.parse(localStorage.getItem(PENDING_MINT_KEY)||localStorage.getItem(LEGACY_PENDING_MINT_KEY)||'null');}catch(_error){return null;}}
  function savePendingMint(value){try{localStorage.setItem(PENDING_MINT_KEY,JSON.stringify({...value,saved_at:Date.now()}));}catch(_error){}}
  function clearPendingMint(){try{localStorage.removeItem(PENDING_MINT_KEY);localStorage.removeItem(LEGACY_PENDING_MINT_KEY);}catch(_error){}if(mintPollTimer){clearTimeout(mintPollTimer);mintPollTimer=null;}}
  function scheduleMintVerification(){if(mintPollTimer)clearTimeout(mintPollTimer);mintPollTimer=setTimeout(function(){verifyPendingMint(true);},3500);}

  function isAppleSafari(){
    const ua=navigator.userAgent || '';
    const appleMobile=/iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
    const safariEngine=/Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    return appleMobile && safariEngine;
  }

  function findCrossmarkSdk(){
    const browserWindows=[window];
    try{if(window.parent&&window.parent!==window)browserWindows.push(window.parent);}catch(_error){}
    try{if(window.top&&window.top!==window&&window.top!==window.parent)browserWindows.push(window.top);}catch(_error){}
    for(const browserWindow of browserWindows){
      try{
        const sdk=browserWindow.xrpl?.crossmark||browserWindow.crossmark||browserWindow.CROSSMARK||null;
        if(sdk) return sdk;
      }catch(_error){}
    }
    return null;
  }

  function crossmarkAddress(result){
    const candidates=[result?.response?.data?.address,result?.response?.address,result?.response?.data?.resp?.address,result?.data?.address,result?.address];
    return String(candidates.find(Boolean)||'').trim();
  }

  function crossmarkTransactionHash(result){
    const candidates=[result?.response?.data?.resp?.result?.hash,result?.response?.data?.resp?.hash,result?.response?.data?.resp?.result?.tx_json?.hash,result?.response?.data?.hash,result?.response?.hash,result?.data?.resp?.result?.hash,result?.data?.hash,result?.result?.hash,result?.hash];
    return String(candidates.find(function(value){return /^[A-F0-9]{64}$/i.test(String(value||''));})||'').toUpperCase();
  }

  async function crossmarkSignIn(sdk){
    if(typeof sdk?.methods?.signInAndWait==='function') return sdk.methods.signInAndWait();
    if(typeof sdk?.async?.signInAndWait==='function') return sdk.async.signInAndWait();
    if(typeof sdk?.signInAndWait==='function') return sdk.signInAndWait();
    throw new Error('Crossmark is installed, but wallet verification could not be opened.');
  }

  async function crossmarkSignAndSubmit(sdk,transaction){
    if(typeof sdk?.methods?.signAndSubmitAndWait==='function') return sdk.methods.signAndSubmitAndWait(transaction);
    if(typeof sdk?.async?.signAndSubmitAndWait==='function') return sdk.async.signAndSubmitAndWait(transaction);
    if(typeof sdk?.signAndSubmitAndWait==='function') return sdk.signAndSubmitAndWait(transaction);
    throw new Error('Crossmark is installed, but transaction signing could not be opened.');
  }

  function showMintXamanLaunch(signUrl,message){
    const url=String(signUrl || '').trim();
    const status=q('founderMintStatus');
    if(!status || !url) return false;
    status.classList.remove('is-preparing');
    status.innerHTML='';
    const strong=document.createElement('strong');
    strong.textContent='OPEN XAMAN';
    const span=document.createElement('span');
    span.textContent=message || 'Tap below to open Xaman, approve the transaction, then return to Safari.';
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.className='founder-mint-entry-button';
    anchor.textContent='Open Xaman';
    anchor.setAttribute('aria-label','Open the Xaman mint request');
    anchor.style.display='inline-flex';
    anchor.style.marginTop='12px';
    anchor.addEventListener('click',function(){ scheduleMintVerification(); });
    status.appendChild(strong);
    status.appendChild(span);
    status.appendChild(anchor);
    return true;
  }

  async function verifyPendingMint(quiet){
    const pending=readPendingMint();
    if(!pending?.claim_id || !pending?.reservation_token) return false;
    const status=q('founderMintStatus');
    try{
      const provider=String(pending.wallet_provider||'xaman').toLowerCase()==='crossmark'?'crossmark':'xaman';
      const functionName=provider==='crossmark'?'verify-crossmark-mint-claim':'verify-xaman-mint-claim';
      const payload={claim_id:pending.claim_id,reservation_token:pending.reservation_token};
      if(provider==='crossmark'&&pending.transaction_hash) payload.transaction_hash=pending.transaction_hash;
      const result=await callFunction(functionName,payload,true);
      if(result.data?.completed){
        clearPendingMint();
        await loadMint(pending.campaign_id ? {campaign_id:pending.campaign_id,network:pending.network||''} : {collection_id:pending.collection_id || activeCollectionId()});
        if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>MINT COMPLETE</strong><span>Your NFT is now in your XRPL wallet. Your NFT is now in your XRPL wallet.</span>';}
        return true;
      }
      if(result.data?.pending || result.status===202){
        if(provider==='xaman' && isAppleSafari() && pending.sign_url){
          showMintXamanLaunch(pending.sign_url,String(result.data?.message || 'If Xaman has not opened yet, tap below. After signing, return to Safari.'));
        }else if(status){
          status.innerHTML='<strong>CONFIRMING ON XRPL</strong><span>'+String(result.data?.message || 'Your signed transaction is waiting for final validation.')+'</span>';
        }
        scheduleMintVerification();
        return false;
      }
      scheduleMintVerification();
      return false;
    }catch(error){
      clearPendingMint();
      if(status) status.innerHTML='<strong>MINT NOT COMPLETED</strong><span>'+String(error?.message || 'The transaction could not be verified.')+'</span>';
      if(!quiet) console.error('One Home mint verification',error);
      return false;
    }
  }

  async function resumePendingMint(){
    const pending=readPendingMint();
    if(!pending?.claim_id) return;
    showPage('onehomeFounderMintPage');
    window.scrollTo({top:0,behavior:'instant'});
    await loadMint(pending.campaign_id ? {campaign_id:pending.campaign_id,network:pending.network||''} : {collection_id:pending.collection_id || activeCollectionId()});
    const status=q('founderMintStatus');
    const provider=String(pending.wallet_provider||'xaman').toLowerCase()==='crossmark'?'crossmark':'xaman';
    if(provider==='xaman' && isAppleSafari() && pending.sign_url){
      showMintXamanLaunch(pending.sign_url,'If Xaman did not open, tap below. After signing, return to Safari.');
    }else if(status){
      status.innerHTML='<strong>CHECKING YOUR '+(provider==='crossmark'?'CROSSMARK':'XAMAN')+' MINT</strong><span>One Home is confirming the signed transaction on the XRP Ledger.</span>';
    }
    await verifyPendingMint(true);
  }

  function featureList(data){
    const collection=data.collection || {};
    const list=[];
    if(collection.physical_enabled) list.push('Physical Item Included');
    if(collection.reveal_enabled) list.push('Reveal Collection');
    if(collection.future_updates_enabled) list.push('Evolving NFT + Living COA');
    if(collection.travel_tracker_enabled) list.push('Travel Tracker');
    if(!list.length) list.push('XRPL Digital Collectible');
    return list.slice(0,4);
  }

  function stateLabel(state){
    return ({open:'OPEN',published:'PUBLISHED',scheduled:'COMING SOON',ended:'CLOSED',sold_out:'SOLD OUT'})[state] || 'PUBLISHED';
  }

  function renderArtwork(data){
    const image=q('founderMintArtwork');
    const stage=q('founderMintArtworkStage');
    const fallback=q('founderMintCrateFallback');
    if(!image) return;
    const publishedArtwork=String(data?.artwork_url || '').trim();
    const founder=data?.access_mode==='founder' || data?.is_founder===true;
    image.src=publishedArtwork || (founder?DEFAULT_FOUNDER_ART:DEFAULT_STANDARD_ART);
    image.alt=publishedArtwork
      ? (data?.collection?.name || 'Collection')+' artwork'
      : founder
        ? '88 Squared Founder Supply Drop sealed package'
        : (data?.collection?.name || 'Published mint')+' artwork placeholder';
    image.hidden=false;
    stage?.classList.add('has-published-art');
    if(fallback) fallback.hidden=true;
  }

  async function renderAccessState(data){
    const founder=data?.access_mode==='founder' || data?.is_founder===true;
    const authenticated=await isAuthenticated();
    const banner=q('founderMintReadyBanner');
    const verify=q('founderMintVerifyBtn');
    banner?.classList.remove('is-waiting','is-error');

    if(!authenticated){
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','1');
      text('founderMintReadyTitle','Create or sign in to your One Home Passport');
      text('founderMintWallet','Your place in this mint will be remembered.');
      if(verify){ verify.hidden=false; verify.textContent='Sign In to Continue'; }
      setButtons(false);
      return {authenticated:false,eligible:false};
    }

    const wallet=verifiedWallet();
    if(!wallet){
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','2');
      text('founderMintReadyTitle',founder?'Verify Founder access':'Connect a mint wallet');
      text('founderMintWallet',founder?'Connect the wallet holding the Founder requirements.':'Connect the Xaman or Crossmark wallet that will receive the NFT.');
      if(verify){ verify.hidden=false; verify.textContent=founder?'Verify Founder Access':'Connect Wallet'; }
      setButtons(false);
      return {authenticated:true,eligible:false};
    }

    let eligibility=eligibilityFor(data,ACCESS_CACHE_MS);
    if(!eligibility){
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','…');
      text('founderMintReadyTitle',founder?'Confirming Founder access':'Confirming mint access');
      text('founderMintWallet',wallet.slice(0,8)+'…'+wallet.slice(-6)+' is being checked.');
      if(verify){ verify.hidden=true; }
      setButtons(false);
      eligibility=await verifyMintAccess(data,false);
    }

    if(!eligibility){
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','2');
      text('founderMintReadyTitle',founder?'Verify Founder access':'Mint access needs attention');
      text('founderMintWallet',founder?'Tap below to check the Founder requirements again.':'This wallet could not be approved for this mint.');
      if(verify){ verify.hidden=false; verify.textContent=founder?'Verify Founder Access':'Check Mint Access'; }
      setButtons(false);
      return {authenticated:true,eligible:false};
    }

    text('founderMintReadyIcon','✓');
    text('founderMintReadyTitle','Your access is confirmed');
    text('founderMintWallet',wallet.slice(0,8)+'…'+wallet.slice(-6)+' is ready.');
    if(verify) verify.hidden=true;
    setButtons(Boolean(data.claim_ready));
    return {authenticated:true,eligible:true};
  }
  async function renderMint(data){
    currentMint=data;
    const collection=data.collection || {};
    const settings=data.settings || {};
    if(data.campaign?.id) rememberCampaign(data.campaign.id);
    else rememberCollection(collection.id);

    const founder=data?.access_mode==='founder' || data?.is_founder===true;
    const network=String(data?.campaign?.network || data?.collection?.network || '').toLowerCase()==='mainnet'?'mainnet':'testnet';
    text('founderMintPathSection',founder ? 'FOUNDER SUPPLY DROP' : 'PUBLIC MINT');
    text('founderMintHeaderPath',founder ? 'FOUNDER DROP' : network==='testnet' ? 'TESTNET MINT' : 'MAINNET MINT');
    text('founderMintDropLabel',founder ? 'FOUNDER SUPPLY DROP' : network==='testnet' ? 'XRPL TESTNET MINT' : 'XRPL MAINNET MINT');
    text('founderMintSealStatus',collection.reveal_enabled ? 'SEALED' : stateLabel(data.sale_state));
    text('founderMintName',collection.name || 'Published Collection');
    text('founderMintDescription',collection.description || 'A collection published on One Home.');
    text('founderMintPrice',(Number(settings.price) || 0)+' '+(settings.currency || 'XRP'));
    text('founderMintSupply',Math.max(0,Number(data.remaining)||0)+' / '+Math.max(0,Number(collection.supply)||0));
    text('founderMintStatusLabel',stateLabel(data.sale_state));
    text('founderMintQuantity',Math.max(1,Number(settings.per_wallet_limit)||1)+' PER WALLET');
    text('founderMintCrateSupply',Math.max(0,Number(data.remaining)||0)+' / '+Math.max(0,Number(collection.supply)||0));
    text('founderMintArtEyebrow',collection.reveal_enabled ? 'The reveal begins after the collection closes.' : 'Published on One Home');
    text('founderMintRevealTitle',collection.reveal_enabled ? 'SEALED UNTIL REVEAL' : 'READY TO COLLECT');
    text('founderMintRevealCopy',collection.reveal_enabled ? 'The final artwork is assigned through the reveal settings saved by the creator.' : 'The collection artwork and details shown here come directly from the published mint.');
    text('founderMintAccessLabel',founder ? 'Verified Founder Access' : 'One Home Mint Access');
    text('founderMintPaymentNote',(network==='testnet'?'This is an XRPL Testnet mint. No Mainnet NFT or XRP is involved. ':'')+(data.gate_count ? 'Access requirements are checked before minting. ' : '')+'The mint price is paid in '+(settings.currency || 'XRP')+'.');

    const includes=q('founderMintIncludes');
    if(includes){
      includes.innerHTML=featureList(data).map(function(label){
        return '<div><span>✓</span><strong>'+String(label).replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];})+'</strong></div>';
      }).join('');
    }

    renderArtwork(data);
    const access=await renderAccessState(data);
    const status=q('founderMintStatus');
    if(!status) return;

    status.classList.toggle('is-preparing',data.sale_state !== 'open' || !data.claim_ready);
    if(data.sale_state === 'sold_out'){
      status.innerHTML='<strong>COLLECTION SOLD OUT</strong><span>Every available item in this collection has been claimed.</span>';
      setButtons(false);
    }else if(data.sale_state === 'scheduled'){
      status.innerHTML='<strong>DROP SCHEDULED</strong><span>This mint will open at the start time saved by the creator.</span>';
      setButtons(false);
    }else if(data.sale_state === 'ended'){
      status.innerHTML='<strong>MINT CLOSED</strong><span>The collection is no longer accepting new mints.</span>';
      setButtons(false);
    }else if(!access.authenticated){
      status.innerHTML='<strong>WELCOME HOME</strong><span>Enter through the front door before continuing to this mint.</span>';
    }else if(!access.eligible){
      status.innerHTML='<strong>ACCESS CHECK REQUIRED</strong><span>Verify the qualifying wallet to continue.</span>';
    }else if(!data.claim_ready){
      status.innerHTML='<strong>COLLECTION PAGE PUBLISHED</strong><span>The mint will unlock here as soon as the collection is opened for collectors.</span>';
      setButtons(false);
    }else{
      status.classList.remove('is-preparing');
      status.innerHTML='<strong>READY TO MINT</strong><span>Choose Xaman or Crossmark and review the full request before approving.</span>';
      setButtons(true);
    }
  }

  function renderError(message){
    renderArtwork({collection:{name:'Published Mint'}});
    text('founderMintSealStatus','NOT OPEN');
    text('founderMintName','MINT NOT AVAILABLE');
    text('founderMintDescription',message || 'This mint has not been published yet.');
    text('founderMintStatusLabel','PREPARING');
    const status=q('founderMintStatus');
    if(status) status.innerHTML='<strong>MINT PAGE READY</strong><span>'+String(message || 'The collection will appear here after it is published on One Home.')+'</span>';
    setButtons(false);
  }

  async function loadMint(target){
    const supplied=target && typeof target==='object' ? target : {};
    const forceFounder=supplied.founder===true;
    const campaignId=forceFounder?'':String(supplied.campaign_id || (typeof target==='string'?target:'') || activeCampaignId() || '').trim();
    const collectionId=forceFounder?'':String(supplied.collection_id || (!campaignId?activeCollectionId():'') || '').trim();
    const network=String(supplied.network || requestedNetwork() || '').toLowerCase();
    const requestBody=campaignId
      ? {campaign_id:campaignId,network:network}
      : collectionId
        ? {collection_id:collectionId,network:network}
        : {founder:true,network:'mainnet'};
    const requestKey=JSON.stringify(requestBody);

    if(loadingPromise && loadingKey===requestKey) return loadingPromise;

    if(loadingController){
      try{loadingController.abort();}catch(_error){}
    }

    const sequence=++loadSequence;
    const controller=new AbortController();
    loadingController=controller;
    loadingKey=requestKey;
    setLoading(requestBody);

    const requestPromise=(async function(){
      try{
        const response=await fetch(FUNCTIONS_BASE+'/get-public-mint',{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
          body:JSON.stringify(requestBody),
          signal:controller.signal
        });
        const data=await response.json().catch(function(){return {};});
        if(!response.ok || data.success===false) throw new Error(data.error || 'The published mint could not be loaded.');
        if(sequence!==loadSequence) return null;
        if(campaignId && String(data?.campaign?.id || '')!==campaignId) throw new Error('The requested mint campaign did not match the published mint response.');
        if(network && String(data?.campaign?.network || data?.collection?.network || '').toLowerCase()!==network) throw new Error('The requested mint network did not match the published mint response.');
        await renderMint(data);
        return data;
      }catch(error){
        if(error?.name==='AbortError' || sequence!==loadSequence) return null;
        renderError(error?.message || 'The published mint could not be loaded.');
        return null;
      }finally{
        if(sequence===loadSequence){
          loadingPromise=null;
          loadingKey='';
          loadingController=null;
        }
      }
    })();
    loadingPromise=requestPromise;
    return requestPromise;
  }
  async function openMint(target){
    const supplied=target && typeof target==='object' ? target : {};
    const forceFounder=supplied.founder===true;
    const campaignId=forceFounder?'':String(supplied.campaign_id || (typeof target==='string'?target:'') || '').trim();
    if(forceFounder){try{sessionStorage.removeItem(MINT_CAMPAIGN_KEY);}catch(_error){}}
    else if(campaignId) rememberCampaign(campaignId);
    showPage('onehomeFounderMintPage');
    window.scrollTo({top:0,behavior:'instant'});
    return loadMint(campaignId ? {campaign_id:campaignId,network:supplied.network||requestedNetwork()} : supplied.founder===true ? {founder:true} : {collection_id:supplied.collection_id||activeCollectionId()});
  }
  async function refresh(){
    if(q('onehomeFounderMintPage')?.classList.contains('active')){
      if(currentMint?.campaign?.id) return loadMint({campaign_id:currentMint.campaign.id,network:currentMint.campaign.network||''});
      return loadMint(activeCampaignId()?{campaign_id:activeCampaignId(),network:requestedNetwork()}:{founder:true});
    }
    return currentMint;
  }
  async function start(provider){
    const status=q('founderMintStatus');
    const walletProvider=String(provider || '').toLowerCase()==='crossmark'?'crossmark':'xaman';
    if(walletProvider==='crossmark'&&isMobileBrowser()){
      if(status) status.innerHTML='<strong>OPEN CROSSMARK ON DESKTOP</strong><span>Crossmark minting is available from its desktop browser extension.</span>';
      return;
    }
    // Open the Xaman destination synchronously from the collector's tap.
    // Waiting for Passport, eligibility, inventory, and payload requests first
    // causes mobile browsers to block the launch as an unsolicited popup.
    const xamanWindow=walletProvider==='xaman'
      ? window.open('about:blank','onehome-xaman-mint')
      : null;
    if(xamanWindow){
      try{
        xamanWindow.opener=null;
        xamanWindow.document.title='Opening Xaman…';
        xamanWindow.document.body.innerHTML='<p style="font-family:system-ui;padding:24px">Preparing your Xaman request…</p>';
      }catch(_error){}
    }
    if(!currentMint){ if(xamanWindow&&!xamanWindow.closed)xamanWindow.close(); await loadMint(activeCampaignId()?{campaign_id:activeCampaignId(),network:requestedNetwork()}:{collection_id:activeCollectionId()}); return; }
    const access=await renderAccessState(currentMint);
    if(!access.authenticated || !access.eligible){
      if(xamanWindow&&!xamanWindow.closed)xamanWindow.close();
      if(status) status.innerHTML='<strong>ACCESS CHECK REQUIRED</strong><span>Complete the One Home Passport and wallet access check first.</span>';
      return;
    }
    if(!currentMint.claim_ready || !currentMint.campaign?.id){
      if(xamanWindow&&!xamanWindow.closed)xamanWindow.close();
      if(status) status.innerHTML='<strong>COLLECTION PAGE PUBLISHED</strong><span>The mint will unlock here when the collection is opened for collectors.</span>';
      return;
    }
    const eligibility=eligibilityFor(currentMint,ACCESS_CACHE_MS) || await verifyMintAccess(currentMint,true);
    const wallet=String(eligibility?.wallet || verifiedWallet() || '').trim();
    if(!wallet){
      if(xamanWindow&&!xamanWindow.closed)xamanWindow.close();
      if(status) status.innerHTML='<strong>VERIFIED WALLET REQUIRED</strong><span>Return to Founder verification and connect the wallet that will receive the NFT.</span>';
      return;
    }
    const appleSafari=walletProvider==='xaman'&&isAppleSafari();
    try{
      setButtons(false);
      let crossmarkSdk=null;
      if(walletProvider==='crossmark'){
        crossmarkSdk=findCrossmarkSdk();
        if(!crossmarkSdk) throw new Error('Open or install the Crossmark browser extension, then try again.');
        if(status){status.classList.add('is-preparing');status.innerHTML='<strong>CONNECT CROSSMARK</strong><span>Confirm the wallet that will receive this NFT.</span>';}
        const signIn=await crossmarkSignIn(crossmarkSdk);
        const connected=crossmarkAddress(signIn);
        if(!connected) throw new Error('Crossmark did not return a wallet address.');
        if(connected.toLowerCase()!==wallet.toLowerCase()) throw new Error('Crossmark opened a different wallet than the wallet verified for this mint.');
      }
      if(status){status.classList.add('is-preparing');status.innerHTML='<strong>RESERVING YOUR NFT</strong><span>One Home is securely selecting the next available NFT.</span>';}
      const claimFunction=String(currentMint.campaign?.mint_method || '').toLowerCase()==='on_demand'?'on-demand-mint-manager':'create-mint-claim';
      const claimResult=await callFunction(claimFunction,{
        campaign_id:currentMint.campaign.id,
        campaign_slug:currentMint.campaign.slug,
        slug:currentMint.campaign.slug,
        collector_wallet:wallet,
        wallet_address:wallet,
        wallet,
        wallet_provider:walletProvider,
        provider:walletProvider
      },true);
      const claim=claimResult.data?.claim || claimResult.data || {};
      const claimId=String(claim.id || claimResult.data?.claim_id || '').trim();
      const reservationToken=String(claim.reservation_token || claimResult.data?.reservation_token || '').trim();
      if(!claimId || !reservationToken) throw new Error('One Home did not receive a valid reserved mint claim.');
      if(walletProvider==='crossmark'){
        const transaction=claimResult.data?.transaction;
        if(!transaction || transaction.TransactionType!=='NFTokenAcceptOffer') throw new Error('One Home did not receive a valid Crossmark mint transaction.');
        if(status) status.innerHTML='<strong>APPROVE IN CROSSMARK</strong><span>Review the price and transaction details, then approve the mint.</span>';
        const signed=await crossmarkSignAndSubmit(crossmarkSdk,transaction);
        const transactionHash=crossmarkTransactionHash(signed);
        if(!transactionHash) throw new Error('Crossmark signed the request but did not return a transaction hash.');
        savePendingMint({claim_id:claimId,reservation_token:reservationToken,transaction_hash:transactionHash,wallet_provider:'crossmark',collection_id:currentMint.collection?.id||'',campaign_id:currentMint.campaign.id,network:currentMint.campaign.network||currentMint.collection?.network||''});
        if(status) status.innerHTML='<strong>CONFIRMING ON XRPL</strong><span>Your Crossmark transaction is being verified.</span>';
        await verifyPendingMint(false);
        return;
      }
      if(status) status.innerHTML='<strong>CREATING XAMAN REQUEST</strong><span>Your NFT is reserved while the signing request is prepared.</span>';
      const requestResult=await callFunction('create-xaman-mint-request',{claim_id:claimId,reservation_token:reservationToken},true);
      const xaman=requestResult.data?.xaman || {};
      const signUrl=String(xaman.sign_url || requestResult.data?.sign_url || '').trim();
      if(!signUrl) throw new Error('Xaman did not return a signing link.');
      savePendingMint({claim_id:claimId,reservation_token:reservationToken,payload_uuid:xaman.payload_uuid||'',sign_url:signUrl,wallet_provider:'xaman',collection_id:currentMint.collection?.id||'',campaign_id:currentMint.campaign.id,network:currentMint.campaign.network||currentMint.collection?.network||''});
      if(status) status.innerHTML='<strong>APPROVE IN XAMAN</strong><span>One Home is opening Xaman. Review the transaction, approve it, then return here.</span>';
      let launched=false;
      if(xamanWindow && !xamanWindow.closed){
        try{xamanWindow.location.replace(signUrl);xamanWindow.focus();launched=true;}catch(_error){}
      }
      if(!launched){
        try{window.location.assign(signUrl);launched=true;}catch(_error){}
      }
      if(!launched){
        showMintXamanLaunch(signUrl,'Xaman is ready. Tap Open Xaman to approve the transaction.');
      }else if(appleSafari && status){
        const fallback=document.createElement('a');
        fallback.href=signUrl;
        fallback.textContent='Open Xaman Again';
        fallback.className='founder-mint-entry-button';
        fallback.style.display='inline-flex';
        fallback.style.marginTop='12px';
        status.appendChild(fallback);
      }
      scheduleMintVerification();
    }catch(error){
      if(xamanWindow && !xamanWindow.closed) xamanWindow.close();
      if(!readPendingMint()?.claim_id) clearPendingMint();
      if(status) status.innerHTML='<strong>MINT COULD NOT START</strong><span>'+String(error?.message || 'Please try again.')+'</span>';
      await renderAccessState(currentMint);
    }
  }

  async function openDestinationOptions(){
    const authenticated=await isAuthenticated();
    try{ sessionStorage.setItem('onehome_passport_destination','choice'); }catch(_error){}
    if(authenticated){
      if(typeof window.oneHomePassportShowChoice === 'function') window.oneHomePassportShowChoice();
      else showPage('onehomeEntryChoicePage');
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    if(typeof window.openOneHomePassportEntrance === 'function') window.openOneHomePassportEntrance('choice');
    else showPage('onehomePassportEntrancePage');
  }

  async function verifyAccess(){
    const authenticated=await isAuthenticated();
    if(!authenticated){
      try{ sessionStorage.setItem('onehome_passport_destination','mint'); }catch(_error){}
      if(typeof window.openOneHomePassportEntrance === 'function') window.openOneHomePassportEntrance('mint');
      else showPage('onehomePassportEntrancePage');
      return;
    }
    const founder=currentMint?.access_mode==='founder' || currentMint?.is_founder===true;
    if(founder && typeof window.oneHomePassportContinueToFounder === 'function'){
      window.oneHomePassportContinueToFounder();
      return;
    }
    const status=q('founderMintStatus');
    if(status) status.innerHTML='<strong>CONNECT A WALLET</strong><span>Open your One Home Passport and connect the Xaman or Crossmark wallet that will receive this NFT.</span>';
    if(typeof window.oneHomePassportShowChoice === 'function') window.oneHomePassportShowChoice();
  }
  function init(){
    q('founderMintOptionsBtn')?.addEventListener('click',openDestinationOptions);
    q('founderMintVerifyBtn')?.addEventListener('click',verifyAccess);

    const params=new URLSearchParams(window.location.search);
    if(params.get('passport') === 'mint' || String(window.location.hash || '').startsWith('#mint/')){
      const explicitCampaign=String(params.get('campaign') || '').trim();
      const collectionId=activeCollectionId();
      if(/^[0-9a-f-]{36}$/i.test(explicitCampaign)) rememberCampaign(explicitCampaign);
      else if(params.get('passport') === 'mint'){
        // The campaign-free route is reserved for the Founder/Mainnet mint.
        // Never allow a prior Testnet campaign to take over this page.
        try{sessionStorage.removeItem(MINT_CAMPAIGN_KEY);}catch(_error){}
        if(collectionId) rememberCollection(collectionId);
      }else if(collectionId) rememberCollection(collectionId);
    }
    if(params.get('xaman_mint_payload') || readPendingMint()) setTimeout(resumePendingMint,150);

    const resumeAccess=function(){
      if(!q('onehomeFounderMintPage')?.classList.contains('active') || !currentMint) return;
      clearTimeout(accessResumeTimer);
      accessResumeTimer=setTimeout(async function(){
        await verifyMintAccess(currentMint,true);
        await renderMint(currentMint);
      },180);
    };
    window.addEventListener('pageshow',resumeAccess);
    window.addEventListener('focus',resumeAccess);
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible') resumeAccess();
    });
  }

  window.oneHomePublicMintOpen=openMint;
  window.oneHomePublicMintRefresh=refresh;
  window.oneHomePublicMintStart=start;
  window.openOneHomePublicMint=openMint;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
