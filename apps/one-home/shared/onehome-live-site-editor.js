(function(){
  'use strict';
  if(window.__ONEHOME_LIVE_SITE_EDITOR__) return;
  window.__ONEHOME_LIVE_SITE_EDITOR__ = true;

  const SUPABASE_URL = 'https://fshvettlltcujmwvikfq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  const TABLE = 'onehome_admin_overrides';
  const PREVIEW_MODE = new URLSearchParams(location.search).get('onehome_admin_preview') === '1';

  const PAGE_LABELS = {
    globalHeader: 'Global Header & Navigation', globalFooter: 'Global Footer',
    homePage: 'Front Porch', onehomePassportEntrancePage: 'Sign In / Create Home ID',
    onehomeEntryChoicePage: 'Destination Choice', onehomeFounderEligibilityPage: 'Founder Eligibility',
    onehomeFounderMintPage: 'Founder Mint Page', onehomeStartHerePage: 'Start Here',
    onehomeExplorePage: 'Explore Rooms', onehomeRareInkPage: 'Rare Ink Studio',
    onehomeCreatePage: 'Creative Studio', onehomeCollectPage: 'Collect',
    onehomePlayPage: 'Play', onehomeFounderPage: 'Founder Room',
    onehomeLabPage: 'Lab / XRPL Home', onehomeMyHomePage: 'My Home',
    arcadePage: 'Rollies Arcade', creatorPage: 'Creator Tools', collectorPage: 'Collector Area',
    shopPage: 'Shop', nightShotsPage: 'Night Shots', doodUPage: 'Dood U', labPage: 'The Lab',
    profilePage: 'Passport', comingSoonPage: 'Coming Soon Screen',
    liveFramePage: 'Embedded Tool Screen', nftCreatorPage: 'NFT Creator'
  };
  const PREFERRED_ORDER = [
    'globalHeader','homePage','onehomePassportEntrancePage','onehomeEntryChoicePage',
    'onehomeFounderEligibilityPage','onehomeFounderMintPage','onehomeStartHerePage',
    'onehomeExplorePage','onehomeRareInkPage','onehomeCreatePage','onehomeCollectPage',
    'onehomePlayPage','onehomeFounderPage','onehomeMyHomePage','arcadePage','nightShotsPage',
    'profilePage','creatorPage','collectorPage','shopPage','doodUPage','onehomeLabPage','labPage',
    'liveFramePage','comingSoonPage','globalFooter','nftCreatorPage'
  ];
  const EXCLUDED_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','CODE','PRE','SVG','PATH','META','LINK']);
  const BOX_HINT = /(card|panel|section|box|tile|choice|step|banner|status|hero|toolbar|notice|result|stage|shell|wrap|grid|actions|nav|modal|form)/i;
  const state = {
    overrides: new Map(), defaults: new Map(), elements: new Map(), paths: new WeakMap(),
    scheduled: false, loaded: false, observer: null
  };

  function pageLabel(id){
    return PAGE_LABELS[id] || String(id||'Page').replace(/Page$/,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,m=>m.toUpperCase());
  }
  function isSkipped(el){
    if(!el || el.nodeType!==1) return false;
    return !!el.closest('[data-oh-admin-skip="true"],.onehome-legacy-home-layer,[aria-hidden="true"][inert]');
  }
  function rootEntries(){
    if(location.pathname.includes('/tools/nft-creator')) return [{id:'nftCreatorPage',el:document.body}];
    const out=[];
    const header=document.querySelector('body > header, header'); if(header) out.push({id:'globalHeader',el:header});
    const selector=PREVIEW_MODE?'.page-view[id]':'.page-view.active[id]';
    document.querySelectorAll(selector).forEach(el=>{ if(!isSkipped(el)) out.push({id:el.id,el}); });
    const footer=document.querySelector('body > footer, footer'); if(footer) out.push({id:'globalFooter',el:footer});
    return out;
  }
  function meaningfulClass(el){
    return Array.from(el.classList||[]).find(c=>! /^(active|hidden|show|open|selected|focus|page-view)$/i.test(c)) || '';
  }
  function elementIndex(el){
    const p=el.parentElement; if(!p) return 1;
    return Math.max(1,Array.from(p.children).indexOf(el)+1);
  }
  function pathFor(el,root,pageId){
    if(state.paths.has(el)) return state.paths.get(el);
    let key;
    if(el===root) key=`${pageId}::root`;
    else if(el.id) key=`${pageId}#${el.id}`;
    else {
      const parts=[]; let cur=el;
      while(cur && cur!==root){
        if(cur.id){parts.unshift('#'+cur.id);break;}
        const cls=meaningfulClass(cur);
        parts.unshift(cur.tagName.toLowerCase()+(cls?'.'+cls:'')+`:nth-child(${elementIndex(cur)})`);
        cur=cur.parentElement;
      }
      key=`${pageId}>${parts.join('>')}`;
    }
    state.paths.set(el,key); return key;
  }
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function rememberDefault(key,value){ if(!state.defaults.has(key)) state.defaults.set(key,clone(value)); }
  function currentBackground(el){
    try{
      const cs=getComputedStyle(el);
      return {visible:cs.display!=='none'&&cs.visibility!=='hidden',
        background_image:cs.backgroundImage&&cs.backgroundImage!=='none'?cs.backgroundImage.replace(/^url\(["']?|["']?\)$/g,''):'',
        background_color:cs.backgroundColor&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'?cs.backgroundColor:'',
        text_color:cs.color||'',border_color:cs.borderColor||'',
        width:'',max_width:'',height:'',min_height:'',padding:'',border_radius:''};
    }catch(_){return {visible:true,background_image:'',background_color:'',text_color:'',border_color:'',width:'',max_width:'',height:'',min_height:'',padding:'',border_radius:''};}
  }
  function directTextNodes(el){
    return Array.from(el.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE && n.nodeValue && n.nodeValue.trim());
  }
  function indexRoot(root,pageId){
    const all=[root,...root.querySelectorAll('*')];
    all.forEach(el=>{
      if(EXCLUDED_TAGS.has(el.tagName)||isSkipped(el)) return;
      const base=pathFor(el,root,pageId);
      directTextNodes(el).forEach((node,idx)=>{
        const key=`${base}::text:${idx+1}`;
        rememberDefault(key,{text:node.nodeValue,visible:true});
        state.elements.set(key,node);
      });
      if(el.matches('img')){
        const key=base+'::image'; rememberDefault(key,{src:el.getAttribute('src')||'',alt:el.getAttribute('alt')||'',title:el.getAttribute('title')||'',visible:true,width:'',height:'',max_width:'',object_fit:''});
        state.elements.set(key,el);
      }
      if(el.matches('a[href]')){
        const key=base+'::link'; rememberDefault(key,{href:el.getAttribute('href')||'',title:el.getAttribute('title')||'',aria_label:el.getAttribute('aria-label')||'',visible:true});
        state.elements.set(key,el);
      }
      if(el.matches('input[placeholder],textarea[placeholder]')){
        const key=base+'::input'; rememberDefault(key,{placeholder:el.getAttribute('placeholder')||'',aria_label:el.getAttribute('aria-label')||'',visible:true});
        state.elements.set(key,el);
      }
      const cls=typeof el.className==='string'?el.className:'';
      if(el===root||BOX_HINT.test(cls)){
        const key=base+'::box'; rememberDefault(key,currentBackground(el)); state.elements.set(key,el);
      }
    });
  }
  function normalizeSize(value){
    const raw=String(value??'').trim();
    if(!raw)return '';
    if(/^\d+(?:\.\d+)?$/.test(raw))return raw+'px';
    if(/^(auto|fit-content|max-content|min-content|inherit|initial|unset)$/i.test(raw))return raw;
    if(/^\d+(?:\.\d+)?(?:px|%|vw|vh|rem|em|ch|vmin|vmax)$/i.test(raw))return raw;
    return '';
  }
  function applySizeStyle(el,property,value){
    if(typeof value!=='string')return;
    const normalized=normalizeSize(value);
    normalized?el.style.setProperty(property,normalized,'important'):el.style.removeProperty(property);
  }
  function syncEmptyTextContainer(node){
    const el=node&&node.parentElement; if(!el) return;
    const cls=typeof el.className==='string'?el.className:'';
    if(!BOX_HINT.test(cls)) return;
    const hasContent=(el.textContent||'').trim()!=='' || !!el.querySelector('img,video,svg,input,textarea,select,button,a[href],iframe,canvas');
    if(!hasContent){
      if(!el.hasAttribute('data-oh-empty-text-display')) el.setAttribute('data-oh-empty-text-display',el.style.display||'');
      el.setAttribute('data-oh-empty-text-hidden','true');
      el.style.setProperty('display','none','important');
    }else if(el.getAttribute('data-oh-empty-text-hidden')==='true'){
      const prior=el.getAttribute('data-oh-empty-text-display')||'';
      el.style.removeProperty('display');
      if(prior) el.style.display=prior;
      el.removeAttribute('data-oh-empty-text-hidden');
      el.removeAttribute('data-oh-empty-text-display');
    }
  }
  function applyValue(key,value){
    const target=state.elements.get(key); if(!target||!value) return;
    if(key.includes('::text:')){
      const def=state.defaults.get(key)||{text:''};
      target.nodeValue=value.visible===false?'':(typeof value.text==='string'?value.text:def.text||'');
      syncEmptyTextContainer(target);
      return;
    }
    const el=target;
    if(key.endsWith('::image')){
      if(typeof value.src==='string'&&value.src) el.setAttribute('src',value.src);
      if(typeof value.alt==='string') el.setAttribute('alt',value.alt);
      if(typeof value.title==='string') value.title?el.setAttribute('title',value.title):el.removeAttribute('title');
      el.style.display=value.visible===false?'none':'';
      applySizeStyle(el,'width',value.width);
      applySizeStyle(el,'height',value.height);
      applySizeStyle(el,'max-width',value.max_width);
      if(typeof value.object_fit==='string') value.object_fit?el.style.setProperty('object-fit',value.object_fit,'important'):el.style.removeProperty('object-fit');
      return;
    }
    if(key.endsWith('::link')){
      if(typeof value.href==='string') el.setAttribute('href',value.href);
      if(typeof value.title==='string') value.title?el.setAttribute('title',value.title):el.removeAttribute('title');
      if(typeof value.aria_label==='string') value.aria_label?el.setAttribute('aria-label',value.aria_label):el.removeAttribute('aria-label');
      el.style.display=value.visible===false?'none':''; return;
    }
    if(key.endsWith('::input')){
      if(typeof value.placeholder==='string') el.setAttribute('placeholder',value.placeholder);
      if(typeof value.aria_label==='string') value.aria_label?el.setAttribute('aria-label',value.aria_label):el.removeAttribute('aria-label');
      el.style.display=value.visible===false?'none':''; return;
    }
    if(key.endsWith('::box')){
      el.style.display=value.visible===false?'none':'';
      if(typeof value.background_image==='string') value.background_image?el.style.setProperty('background-image',`url("${value.background_image.replace(/"/g,'%22')}")`,'important'):el.style.removeProperty('background-image');
      if(typeof value.background_color==='string') value.background_color?el.style.setProperty('background-color',value.background_color,'important'):el.style.removeProperty('background-color');
      if(typeof value.text_color==='string') value.text_color?el.style.setProperty('color',value.text_color,'important'):el.style.removeProperty('color');
      if(typeof value.border_color==='string') value.border_color?el.style.setProperty('border-color',value.border_color,'important'):el.style.removeProperty('border-color');
      applySizeStyle(el,'width',value.width);
      applySizeStyle(el,'max-width',value.max_width);
      applySizeStyle(el,'height',value.height);
      applySizeStyle(el,'min-height',value.min_height);
      applySizeStyle(el,'padding',value.padding);
      applySizeStyle(el,'border-radius',value.border_radius);
      if(typeof value.margin_inline==='string') value.margin_inline?el.style.setProperty('margin-inline',value.margin_inline,'important'):el.style.removeProperty('margin-inline');
    }
  }
  function applyOverrides(){state.overrides.forEach((value,key)=>applyValue(key,value));}
  function indexAll(){
    state.elements.clear(); state.paths=new WeakMap();
    rootEntries().forEach(({id,el})=>indexRoot(el,id)); applyOverrides();
  }
  function scheduleIndex(){
    if(state.scheduled) return; state.scheduled=true;
    setTimeout(()=>{state.scheduled=false;indexAll();if(PREVIEW_MODE)sendInventory();},180);
  }
  async function loadOverrides(){
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=element_key,value,is_active&is_active=eq.true`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
      if(!response.ok) throw new Error(await response.text());
      const rows=await response.json(); state.overrides.clear();
      (rows||[]).forEach(row=>state.overrides.set(row.element_key,row.value||{})); state.loaded=true; indexAll();
      if(PREVIEW_MODE)sendInventory();
    }catch(err){console.warn('[One Home Site Editor] Overrides unavailable; built-in content remains active.',err);}
  }
  function nearestLabel(node){
    const el=node&&node.nodeType===Node.TEXT_NODE?node.parentElement:node;
    if(!el)return 'Item';
    const text=(el.textContent||'').replace(/\s+/g,' ').trim(); if(text)return text.slice(0,90);
    return (el.getAttribute&&((el.getAttribute('aria-label')||el.getAttribute('alt'))))||meaningfulClass(el)||el.tagName.toLowerCase();
  }
  function pageForNode(node){
    if(location.pathname.includes('/tools/nft-creator')) return 'nftCreatorPage';
    const el=node&&node.nodeType===Node.TEXT_NODE?node.parentElement:node;
    const page=el&&el.closest&&el.closest('.page-view[id]'); if(page)return page.id;
    if(el&&el.closest&&el.closest('header'))return 'globalHeader';
    if(el&&el.closest&&el.closest('footer'))return 'globalFooter'; return 'globalHeader';
  }
  function nearestContainerKey(node){
    const start=node&&node.nodeType===Node.TEXT_NODE?node.parentElement:node;
    let el=start;
    while(el&&el!==document.documentElement){
      const cls=typeof el.className==='string'?el.className:'';
      if(BOX_HINT.test(cls)){
        const path=state.paths.get(el);if(path)return path+'::box';
      }
      el=el.parentElement;
    }
    return null;
  }
  function inventory(){
    const items=[];
    state.defaults.forEach((def,key)=>{
      const node=state.elements.get(key); if(!node)return;
      const pageId=pageForNode(node); let type='box';
      if(key.includes('::text:'))type='text'; else if(key.endsWith('::image'))type='image'; else if(key.endsWith('::link'))type='link'; else if(key.endsWith('::input'))type='input';
      const ov=state.overrides.get(key)||null;
      items.push({key,pageId,pageLabel:pageLabel(pageId),type,label:nearestLabel(node),tag:node.nodeType===Node.TEXT_NODE?'text':node.tagName.toLowerCase(),containerKey:type==='text'?nearestContainerKey(node):null,defaultValue:def,overrideValue:ov,currentValue:ov||def});
    });
    const rank=id=>{const i=PREFERRED_ORDER.indexOf(id);return i<0?999:i;};
    items.sort((a,b)=>rank(a.pageId)-rank(b.pageId)||a.key.localeCompare(b.key));
    const ids=[...new Set(items.map(x=>x.pageId))].sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b));
    return {pages:ids.map(id=>({id,label:pageLabel(id),count:items.filter(x=>x.pageId===id).length})),items,path:location.pathname,ready:true,generated_at:new Date().toISOString()};
  }
  function sendInventory(){
    if(window.parent===window)return; indexAll();
    window.parent.postMessage({type:'onehome-admin-inventory',payload:inventory()},location.origin);
  }
  function showPage(pageId){
    try{
      if(pageId==='globalHeader'||pageId==='globalFooter'){window.scrollTo({top:pageId==='globalHeader'?0:document.body.scrollHeight,behavior:'auto'});return;}
      if(typeof window.oneHomeV15Show==='function')window.oneHomeV15Show(pageId);
      else if(typeof window.safeShow==='function')window.safeShow(pageId);
      else if(typeof window.showPage==='function')window.showPage(pageId);
      else document.querySelectorAll('.page-view').forEach(p=>p.classList.toggle('active',p.id===pageId));
    }catch(err){console.warn('[One Home Site Editor] Page preview failed',err);}
    setTimeout(()=>document.getElementById(pageId)?.scrollIntoView({block:'start'}),100);
  }
  function highlight(key){
    document.querySelectorAll('.oh-admin-highlight').forEach(el=>el.classList.remove('oh-admin-highlight'));
    const node=state.elements.get(key);if(!node)return;const el=node.nodeType===Node.TEXT_NODE?node.parentElement:node;
    el.classList.add('oh-admin-highlight');el.scrollIntoView({behavior:'auto',block:'center'});
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||!event.data)return;const msg=event.data;
    if(msg.type==='onehome-admin-get-inventory')sendInventory();
    else if(msg.type==='onehome-admin-show-page')showPage(msg.pageId);
    else if(msg.type==='onehome-admin-highlight')highlight(msg.key);
    else if(msg.type==='onehome-admin-temp-apply')applyValue(msg.key,msg.value||{});
    else if(msg.type==='onehome-admin-reload')loadOverrides();
  });
  document.addEventListener('error',event=>{
    const img=event.target;if(!(img instanceof HTMLImageElement)||img.dataset.ohFallback==='1')return;
    img.dataset.ohFallback='1';img.src='/assets/one-home-image-placeholder.png';img.alt=img.alt||'Image awaiting replacement';
  },true);
  const style=document.createElement('style');
  style.textContent='.oh-admin-highlight{outline:4px solid #ff2638!important;outline-offset:4px!important;box-shadow:0 0 0 8px rgba(255,38,56,.2)!important}.oh-admin-preview *{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
  document.head.appendChild(style);
  window.__ONEHOME_ADMIN_DEBUG__={inventory:inventory,indexAll:indexAll,sendInventory:sendInventory};
  function start(){
    if(PREVIEW_MODE)document.documentElement.classList.add('oh-admin-preview');
    indexAll();loadOverrides();
    if(PREVIEW_MODE){
      state.observer=new MutationObserver(scheduleIndex);state.observer.observe(document.documentElement,{childList:true,subtree:true});
      [350,900,1800,3200,5200].forEach(ms=>setTimeout(()=>{indexAll();sendInventory();},ms));
    }else{
      const observeActive=function(detail){
        if(state.observer)state.observer.disconnect();
        const page=detail&&detail.page?detail.page:document.querySelector('.page-view.active[id]');
        if(page){state.observer=new MutationObserver(scheduleIndex);state.observer.observe(page,{childList:true,subtree:true})}
        scheduleIndex();
      };
      if(window.OneHomePageRuntime)window.OneHomePageRuntime.onChange(observeActive,true);
      else window.addEventListener('onehome:page-activated',function(event){observeActive(event.detail)});
      setTimeout(indexAll,500);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
