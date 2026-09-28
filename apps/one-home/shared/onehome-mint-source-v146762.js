/* One Home v14.67.62 — Universal mint source attribution + dedicated X share bridge.
   Passport = identity. Wallet = signature. One Home = router.
   X Web Intent cannot attach media, so One Home shares a lightweight social-preview page
   instead of asking the full transactional mint page to double as an OG/Twitter card page. */
(function(){
  'use strict';
  if(window.OneHomeMintSource&&window.OneHomeMintSource.version==='14.67.62')return;

  const VERSION='14.67.62';
  const CARD_VERSION='146762';
  const STORAGE_PREFIX='onehome_mint_source_v146744:';
  const MAX_AGE=24*60*60*1000;

  function text(value){return String(value==null?'':value).trim();}
  function validCampaignId(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value));}
  function normalizeSource(value){
    let source=text(value).toLowerCase().replace(/\s+/g,'-');
    if(!source)return '';
    if(source==='twitter'||source==='twitter-x'||source==='x-twitter')source='x';
    if(source==='rare_routes'||source==='rareroutes')source='rare-routes';
    if(source==='community'||source==='notifications')source='community-command';
    if(source==='direct-link')source='direct';
    source=source.replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
    return source;
  }
  function safeDetail(value){return text(value).replace(/[\u0000-\u001f\u007f]+/g,' ').slice(0,180);}
  function uuid(){
    try{if(crypto&&typeof crypto.randomUUID==='function')return crypto.randomUUID();}catch(_error){}
    try{const a=new Uint8Array(16);crypto.getRandomValues(a);a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;return Array.from(a).map(function(v,i){return ([4,6,8,10].includes(i)?'-':'')+v.toString(16).padStart(2,'0')}).join('');}catch(_error){}
    return 'visit-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
  }
  function campaignIdFromPath(pathname){
    const match=text(pathname).match(/^\/mint\/([0-9a-f-]{36})(?:\/|$)/i);
    return match&&validCampaignId(match[1])?match[1]:'';
  }
  function campaignIdFromLocation(){
    try{
      const pathId=campaignIdFromPath(location.pathname);
      if(pathId)return pathId;
      const q=text(new URLSearchParams(location.search).get('campaign'));
      return validCampaignId(q)?q:'';
    }catch(_error){return '';}
  }
  function referrerSource(){
    let host='';
    try{host=new URL(document.referrer||'').hostname.toLowerCase();}catch(_error){}
    if(!host)return {source:'direct',detail:'direct'};
    if(host==='x.com'||host.endsWith('.x.com')||host==='twitter.com'||host.endsWith('.twitter.com')||host==='t.co')return {source:'x',detail:host};
    if(host==='discord.com'||host.endsWith('.discord.com')||host==='discord.gg'||host.endsWith('.discord.gg'))return {source:'discord',detail:host};
    if(host===location.hostname.toLowerCase()||host.endsWith('.'+location.hostname.toLowerCase()))return {source:'one-home',detail:host};
    return {source:'external',detail:host};
  }
  function explicitSource(){
    try{
      const p=new URLSearchParams(location.search||'');
      const supplied=normalizeSource(p.get('source')||p.get('src')||p.get('utm_source'));
      if(supplied)return {source:supplied,detail:safeDetail(p.get('ref')||p.get('utm_campaign')||p.get('utm_medium')||'')};
      if(p.get('route')==='rare-routes')return {source:'rare-routes',detail:'route=rare-routes'};
    }catch(_error){}
    return null;
  }
  function storageKey(campaignId){return STORAGE_PREFIX+text(campaignId).toLowerCase();}
  function readStored(campaignId){
    if(!validCampaignId(campaignId))return null;
    const key=storageKey(campaignId);
    for(const store of [sessionStorage,localStorage]){
      try{
        const raw=store.getItem(key);if(!raw)continue;
        const value=JSON.parse(raw);
        if(!value||!value.visit_id||!normalizeSource(value.source)||Date.now()-Number(value.created_at||0)>MAX_AGE){store.removeItem(key);continue;}
        return value;
      }catch(_error){}
    }
    return null;
  }
  function storeContext(value){
    if(!value||!validCampaignId(value.campaign_id))return value;
    const encoded=JSON.stringify(value),key=storageKey(value.campaign_id);
    try{sessionStorage.setItem(key,encoded);}catch(_error){}
    try{localStorage.setItem(key,encoded);}catch(_error){}
    return value;
  }
  function capture(campaignId){
    const id=validCampaignId(campaignId)?text(campaignId):campaignIdFromLocation();
    if(!id)return null;
    const prior=readStored(id);
    const explicit=explicitSource();
    const derived=referrerSource();
    const chosen=explicit||prior||derived;
    const now=Date.now();
    const chosenSource=normalizeSource(chosen&&chosen.source)||'direct';
    const newExplicitVisit=Boolean(explicit&&prior&&normalizeSource(prior.source)!==chosenSource);
    const value={
      campaign_id:id,
      visit_id:prior&&prior.visit_id&&!newExplicitVisit?prior.visit_id:uuid(),
      source:chosenSource,
      source_detail:safeDetail(explicit&&explicit.detail||(!newExplicitVisit&&prior&&prior.source_detail)||derived.detail||''),
      first_landing:prior&&prior.first_landing&&!newExplicitVisit?prior.first_landing:(location.pathname+location.search),
      created_at:prior&&Number(prior.created_at)&&!newExplicitVisit?Number(prior.created_at):now,
      last_seen_at:now
    };
    return storeContext(value);
  }
  function context(campaignId){return readStored(campaignId)||capture(campaignId);}
  function appendSource(url,campaignId){
    const raw=text(url);if(!raw)return raw;
    try{
      const u=new URL(raw,location.origin);
      if(u.origin!==location.origin)return raw;
      const ctx=context(campaignId||campaignIdFromLocation());
      if(ctx&&ctx.source&&!u.searchParams.get('source'))u.searchParams.set('source',ctx.source);
      return u.pathname+(u.search?u.search:'')+(u.hash||'');
    }catch(_error){return raw;}
  }
  function mintUrl(options){
    const opts=options||{};
    const id=text(opts.campaignId||opts.campaign_id);
    if(!validCampaignId(id))return '';
    const u=new URL('/mint/'+encodeURIComponent(id),location.origin);
    const chain=text(opts.chain||opts.chain_key).toLowerCase();
    const network=text(opts.network).toLowerCase();
    if(chain)u.searchParams.set('chain',chain);
    else if(network==='mainnet'||network==='testnet')u.searchParams.set('network',network);
    if(opts.route==='rare-routes')u.searchParams.set('route','rare-routes');
    const source=normalizeSource(opts.source||'');
    if(source)u.searchParams.set('source',source);
    return u.pathname+(u.search?u.search:'');
  }
  function xIntentUrl(options){
    const opts=options||{};
    const u=new URL('https://x.com/intent/tweet');
    const copy=text(opts.text);
    const target=text(opts.url);
    if(copy)u.searchParams.set('text',copy);
    if(target)u.searchParams.set('url',target);
    return u.toString();
  }
  function destinationFromTarget(rawTarget){
    try{
      const target=new URL(rawTarget,location.origin);
      if(target.origin!==location.origin)return null;
      const id=campaignIdFromPath(target.pathname)||text(target.searchParams.get('campaign'));
      if(!validCampaignId(id))return null;
      target.pathname='/mint/'+id;
      ['campaign','preview','embedded','xaman_mint_payload','xaman_wallet_payload','return','oh_return','v','card','xcard'].forEach(function(key){target.searchParams.delete(key);});
      target.searchParams.set('source','x');
      return {id:id,url:target.pathname+(target.search||'')};
    }catch(_error){return null;}
  }
  function sharePageUrl(options){
    const opts=options||{};
    const name=text(opts.name)||'One Home Mint';
    const parsed=destinationFromTarget(text(opts.url));
    const suppliedId=text(opts.campaignId||opts.campaign_id);
    const id=parsed&&parsed.id||(validCampaignId(suppliedId)?suppliedId:'');
    if(!id)return text(opts.url);
    const destination=parsed&&parsed.url||('/mint/'+id+'?source=x');
    const page=new URL('/mint-share.html',location.origin);
    page.searchParams.set('campaign',id);
    page.searchParams.set('name',name.slice(0,100));
    page.searchParams.set('to',destination);
    page.searchParams.set('v',CARD_VERSION);
    return page.toString();
  }
  function shareMintToX(options){
    const opts=options||{};
    const name=text(opts.name)||'this mint';
    const target=sharePageUrl({name:name,url:text(opts.url),campaignId:opts.campaignId||opts.campaign_id});
    const copy=text(opts.text)||(opts.afterMint?'I just minted '+name+' on One Home 🏠':'Mint '+name+' on One Home 🏠');
    const intent=xIntentUrl({text:copy,url:target});
    const opened=window.open(intent,'_blank','noopener,noreferrer');
    if(!opened){try{window.location.assign(intent);}catch(_error){}}
    return intent;
  }
  function currentMintShareUrl(campaignId){
    const id=validCampaignId(campaignId)?text(campaignId):campaignIdFromLocation();
    if(!id)return location.href;
    try{
      const u=new URL(location.href);
      ['campaign','preview','embedded','xaman_mint_payload','xaman_wallet_payload','return','oh_return','v','card','xcard'].forEach(function(key){u.searchParams.delete(key);});
      u.pathname='/mint/'+id;
      u.searchParams.set('source','x');
      return u.toString();
    }catch(_error){return location.origin+'/mint/'+id+'?source=x';}
  }

  window.OneHomeMintSource={
    version:VERSION,
    cardVersion:CARD_VERSION,
    validCampaignId:validCampaignId,
    normalizeSource:normalizeSource,
    campaignIdFromLocation:campaignIdFromLocation,
    capture:capture,
    context:context,
    appendSource:appendSource,
    mintUrl:mintUrl,
    xIntentUrl:xIntentUrl,
    sharePageUrl:sharePageUrl,
    shareMintToX:shareMintToX,
    currentMintShareUrl:currentMintShareUrl
  };
})();
