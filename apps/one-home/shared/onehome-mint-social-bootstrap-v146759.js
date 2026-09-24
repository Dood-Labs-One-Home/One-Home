/* One Home v14.67.58 — early mint social metadata bootstrap.
   Runs in <head> before the full mint runtime. Netlify Prerender waits until
   this script resolves the exact campaign metadata through a same-origin proxy. */
(function(global){
  'use strict';

  const VERSION='146759';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  const SUPABASE_FUNCTIONS='https://fshvettlltcujmwvikfq.supabase.co/functions/v1';
  const RARE_ROUTES_SEASON1='e7a97a65-aec2-4d0e-9075-fb100b692fc7';
  const DEFAULT_IMAGE=global.location.origin+'/assets/one-home-image-placeholder.png';

  function campaignId(){
    try{
      const match=String(global.location.pathname||'').match(/^\/mint\/([0-9a-f-]{36})(?:\/|$)/i);
      if(match&&match[1])return match[1];
      const q=new URLSearchParams(global.location.search||'');
      const value=String(q.get('campaign')||'').trim();
      return /^[0-9a-f-]{36}$/i.test(value)?value:'';
    }catch(_error){return '';}
  }
  function network(){
    try{return String(new URLSearchParams(global.location.search||'').get('network')||'').trim().toLowerCase();}catch(_error){return '';}
  }
  function clean(value,fallback){
    const text=String(value==null?'':value).replace(/\s+/g,' ').trim();
    return text||String(fallback||'');
  }
  function isPlaceholder(value){
    const s=clean(value,'').toLowerCase();
    return !s||s.includes('one-home-image-placeholder')||s.includes('image-awaiting-replacement')||s.includes('image_awaiting_replacement');
  }
  function upsert(kind,key,value){
    if(!value)return;
    let node=document.head.querySelector('meta['+kind+'="'+key.replace(/"/g,'\\"')+'"]');
    if(!node){node=document.createElement('meta');node.setAttribute(kind,key);document.head.appendChild(node);}
    node.setAttribute('content',String(value));
  }
  function remove(kind,key){
    document.head.querySelectorAll('meta['+kind+'="'+key.replace(/"/g,'\\"')+'"]').forEach(function(node){node.remove();});
  }
  function cardImageUrl(id){
    return SUPABASE_FUNCTIONS+'/onehome-mint-page?mode=image&campaign='+encodeURIComponent(id)+'&v='+VERSION;
  }
  function canonicalUrl(id){
    const base=global.location.origin+'/mint/'+encodeURIComponent(id);
    try{
      const path=String(global.location.pathname||'');
      if(path.toLowerCase()===('/mint/'+String(id).toLowerCase()+'/card-146759'))return global.location.origin+path;
    }catch(_error){}
    return base;
  }
  function apply(meta){
    const id=meta.id;
    const titleBase=clean(meta.title,id===RARE_ROUTES_SEASON1?'Rare Routes — Season 1':'One Home Mint');
    const title=titleBase+' | One Home';
    const description=clean(meta.description,'Mint this collectible on One Home.').slice(0,190);
    const image=cardImageUrl(id);
    const canonical=canonicalUrl(id);

    document.title=title;
    upsert('name','robots','index,follow,max-image-preview:large');
    upsert('name','description',description);
    upsert('property','og:type','website');
    upsert('property','og:site_name','One Home');
    upsert('property','og:title',title);
    upsert('property','og:description',description);
    upsert('property','og:url',canonical);
    upsert('property','og:image',image);
    upsert('property','og:image:secure_url',image);
    upsert('property','og:image:type','image/png');
    upsert('property','og:image:width','1200');
    upsert('property','og:image:height','630');
    upsert('property','og:image:alt',titleBase+' mint artwork');
    upsert('name','twitter:card','summary_large_image');
    upsert('name','twitter:title',title);
    upsert('name','twitter:description',description);
    upsert('name','twitter:image',image);
    upsert('name','twitter:image:alt',titleBase+' mint artwork');
    let canonicalNode=document.head.querySelector('link[rel="canonical"]');
    if(!canonicalNode){canonicalNode=document.createElement('link');canonicalNode.rel='canonical';document.head.appendChild(canonicalNode);}
    canonicalNode.href=canonical;
    document.documentElement.dataset.onehomeSocialCardReady='1';
    document.documentElement.dataset.onehomeSocialCardVersion=VERSION;
    document.documentElement.dataset.onehomeSocialCardImage=image;
  }

  async function fetchMetadata(id){
    const controller=new AbortController();
    const timer=setTimeout(function(){controller.abort();},8000);
    try{
      const body={campaign_id:id};
      const n=network();
      if(n==='mainnet'||n==='testnet')body.network=n;
      const response=await fetch('/onehome-public-mint',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY},
        body:JSON.stringify(body),
        cache:'no-store',
        credentials:'omit',
        signal:controller.signal
      });
      const data=await response.json().catch(function(){return {};});
      if(!response.ok||data.success===false)throw new Error(data.error||('Public mint metadata returned '+response.status));
      const campaign=data.campaign||{};
      const collection=data.collection||{};
      const artwork=[campaign.cover_image_url,data.cover_image_url,collection.cover_image_url,campaign.share_image_url,data.artwork_url,campaign.artwork_url,campaign.banner_url,collection.artwork_url,collection.banner_url]
        .map(function(v){return clean(v,'');}).find(function(v){return v&&!isPlaceholder(v);})||'';
      return {
        id:id,
        title:campaign.name||collection.name||data.name||(id===RARE_ROUTES_SEASON1?'Rare Routes — Season 1':'One Home Mint'),
        description:campaign.description||collection.description||data.description||'Mint this collectible on One Home.',
        artwork:artwork
      };
    }finally{clearTimeout(timer);}
  }

  async function start(){
    const id=campaignId();
    if(!id){try{global.prerenderReady=true;}catch(_error){}return null;}
    try{
      const meta=await fetchMetadata(id);
      apply(meta);
      return meta;
    }catch(error){
      console.warn('One Home social metadata bootstrap',error);
      // Never hand X the editor placeholder. The image endpoint independently
      // resolves the campaign artwork server-side even if this metadata request fails.
      apply({
        id:id,
        title:id===RARE_ROUTES_SEASON1?'Rare Routes — Season 1':'One Home Mint',
        description:'Mint this collectible on One Home.',
        artwork:''
      });
      return null;
    }finally{
      try{global.prerenderReady=true;}catch(_error){}
    }
  }

  global.OneHomeMintSocialCard={version:VERSION,campaignId:campaignId,cardImageUrl:cardImageUrl,apply:apply,start:start};
  global.__oneHomeMintSocialMetadataPromise=start();
})(window);
