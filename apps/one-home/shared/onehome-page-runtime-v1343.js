(function(){
'use strict';
if(window.OneHomePageRuntime)return;

const PROFILE_PAGES=new Set(['profilePage','profilesPage','publicProfilePage','socialCommandPage','socialInboxPage','notificationsPage']);
const listeners=new Set();
const watchedPages=new WeakSet();
const brokenImages=new Set();
let activePageId='';
let activeContentObserver=null;
let pageListObserver=null;
let pageContentRows=null;
let pageContentPromise=null;

function currentPage(){return document.querySelector('.page-view.active[id]')||null}
function currentId(){const page=currentPage();return page?page.id:''}
function isCurrent(){const ids=Array.from(arguments).flat().filter(Boolean);return ids.length?ids.includes(activePageId):!!activePageId}
function isActive(){return !document.hidden&&isCurrent.apply(null,arguments)}
function profileActive(){return !document.hidden&&PROFILE_PAGES.has(activePageId)}
function safeAbsolute(value){try{return new URL(String(value||''),location.href).href}catch(_error){return String(value||'')}}
function isExpiredDiscord(value){
  try{
    const url=new URL(String(value||''),location.href);
    if(!/^(?:media|cdn)\.discordapp\.(?:net|com)$/i.test(url.hostname))return false;
    const expiry=parseInt(url.searchParams.get('ex')||'',16);
    return Number.isFinite(expiry)&&expiry>0&&expiry*1000<Date.now();
  }catch(_error){return false}
}
function fallbackFor(img,source){
  if(/my_doodette\.jpe?g/i.test(source||''))return '/my_doodette.jpg';
  if(img&&/ember/i.test((img.alt||'')+' '+source))return '/assets/ember-pfp.svg';
  return '/assets/one-home-image-placeholder.png';
}
function replaceBrokenImage(img,force){
  if(!(img instanceof HTMLImageElement)||img.dataset.oneHomeImageFallback==='1')return;
  const source=img.getAttribute('src')||'';
  if(!source)return;
  const absolute=safeAbsolute(source);
  if(force||/my_doodette\.jpe?g/i.test(source)||isExpiredDiscord(source)||brokenImages.has(absolute)){
    if(force||isExpiredDiscord(source))brokenImages.add(absolute);
    img.dataset.oneHomeImageFallback='1';
    img.src=fallbackFor(img,source);
    if(!img.alt)img.alt='Image awaiting replacement';
  }
}
function scanImages(root){
  if(!root)return;
  if(root instanceof HTMLImageElement)replaceBrokenImage(root,false);
  if(root.querySelectorAll)root.querySelectorAll('img[src]').forEach(function(img){replaceBrokenImage(img,false)});
}
function observeActiveContent(page){
  if(activeContentObserver)activeContentObserver.disconnect();
  if(!page||!window.MutationObserver)return;
  activeContentObserver=new MutationObserver(function(records){
    records.forEach(function(record){
      if(record.type==='attributes'){replaceBrokenImage(record.target,false);return}
      record.addedNodes.forEach(function(node){if(node.nodeType===1)scanImages(node)});
    });
  });
  activeContentObserver.observe(page,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
}
function sleepClosedRoom(previous,next){
  if(previous==='liveFramePage'&&next!=='liveFramePage'){
    const frame=document.getElementById('liveFrame');
    if(frame&&frame.getAttribute('src')&&frame.getAttribute('src')!=='about:blank')frame.src='about:blank';
  }
}
function emit(force){
  const page=currentPage(),next=page?page.id:'';
  if(!force&&next===activePageId)return;
  const previous=activePageId;
  activePageId=next;
  if(document.body){
    if(next)document.body.dataset.oneHomeActivePage=next;else delete document.body.dataset.oneHomeActivePage;
    const protectedViews=new Set(['homePage','onehomePassportEntrancePage','onehomeEntryChoicePage','onehomeFounderEligibilityPage','onehomeFounderMintPage']);
    document.body.classList.toggle('onehome-room-background-active',!!next&&!protectedViews.has(next));
  }
  sleepClosedRoom(previous,next);
  observeActiveContent(page);
  scanImages(page);
  const detail={id:next,previousId:previous,page:page};
  listeners.forEach(function(listener){try{listener(detail)}catch(error){console.warn('One Home page listener',error)}});
  window.dispatchEvent(new CustomEvent('onehome:page-activated',{detail:detail}));
}
function watchPage(page){
  if(!page||watchedPages.has(page)||!window.MutationObserver)return;
  watchedPages.add(page);
  new MutationObserver(function(){if(page.classList.contains('active')||page.id===activePageId)queueMicrotask(function(){emit(false)})}).observe(page,{attributes:true,attributeFilter:['class']});
}
function registerPages(root){
  if(!root)return;
  if(root.matches&&root.matches('.page-view[id]'))watchPage(root);
  if(root.querySelectorAll)root.querySelectorAll('.page-view[id]').forEach(watchPage);
}
function onChange(listener,runNow){
  if(typeof listener!=='function')return function(){};
  listeners.add(listener);
  if(runNow)listener({id:activePageId,previousId:'',page:currentPage()});
  return function(){listeners.delete(listener)};
}
function getClient(){
  return window.doodSupabase||window.doodProfileSupabase||window.oneHomePassportSupabase||
    (window.supabase&&window.supabase.createClient?window.supabase.createClient(window.DOOD_SUPABASE_URL||'https://fshvettlltcujmwvikfq.supabase.co',window.DOOD_SUPABASE_KEY||'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB'):null);
}
async function loadPageContent(force){
  if(pageContentRows&&!force)return pageContentRows;
  if(pageContentPromise&&!force)return pageContentPromise;
  pageContentPromise=(async function(){
    const client=getClient();if(!client)return [];
    const result=await client.from('site_page_content').select('*').eq('is_active',true).order('sort_order',{ascending:true});
    if(result.error)throw result.error;
    pageContentRows=Array.isArray(result.data)?result.data:[];
    return pageContentRows;
  })();
  try{return await pageContentPromise}finally{pageContentPromise=null}
}
function start(){
  registerPages(document);
  activePageId=currentId();
  const main=document.querySelector('main');
  if(main&&window.MutationObserver){
    pageListObserver=new MutationObserver(function(records){records.forEach(function(record){record.addedNodes.forEach(function(node){if(node.nodeType===1)registerPages(node)})});emit(false)});
    pageListObserver.observe(main,{childList:true});
  }
  document.addEventListener('error',function(event){
    const img=event.target;if(!(img instanceof HTMLImageElement))return;
    brokenImages.add(safeAbsolute(img.getAttribute('src')||img.src));
    replaceBrokenImage(img,true);
  },true);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)emit(true)});
  observeActiveContent(currentPage());
  emit(true);
}

window.OneHomePageRuntime={
  build:'1343',currentId:function(){return activePageId},isCurrent:isCurrent,isActive:isActive,
  profileActive:profileActive,onChange:onChange,scanImages:scanImages,loadPageContent:loadPageContent,
  refreshPageContent:function(){return loadPageContent(true)},emit:function(){emit(true)}
};
window.oneHomePageIsActive=function(){return isActive.apply(null,arguments)};
window.oneHomeProfileIsActive=profileActive;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
