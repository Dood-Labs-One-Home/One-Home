(function(){
'use strict';
if(window.__ONEHOME_GLOBAL_APPEARANCE_V1467200__)return;
window.__ONEHOME_GLOBAL_APPEARANCE_V1467200__=true;
var SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
var SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
var TABLE='onehome_admin_overrides';
var APPEARANCE_KEY='onehome:global:appearance';
var SERVER_CACHE_KEY='onehome_global_appearance_cache_v1467200';
var SERVER_CACHE_MS=15*60*1000;
var ENABLED_KEY='onehome_neon_enabled';
var COLOR_KEY='onehome_neon_button_color';
var DEFAULT_MIGRATION_KEY='onehome_no_neon_default_v1467142';
var COLORS={pink:['#ff2bd6','255,43,214'],blue:['#20a7ff','32,167,255'],cyan:['#00f5ff','0,245,255'],green:['#39ff88','57,255,136'],purple:['#b15cff','177,92,255'],orange:['#ff8a2a','255,138,42'],yellow:['#ffe94a','255,233,74'],red:['#ff3b5c','255,59,92']};
var LEGACY_NEON_RGB=new Set([
 '255,43,214','255,54,214','255,77,240','237,34,204','243,38,209','255,50,210','255,79,216','255,20,157','159,11,143','211,50,189',
 '0,245,255','0,255,208','0,242,255','32,167,255','77,195,255','57,255,136','72,255,106','85,255,154','0,214,143',
 '177,92,255','166,107,255','255,138,42','255,159,67','255,233,74','255,216,77','255,59,92','255,77,109'
]);
var serverDefault=false,serverColor='pink',suppressed=new Map(),observer=null,scanQueued=false,pendingRoots=new Set();
var VISUAL_SELECTOR='img,picture,video,canvas,source,svg';
var CANDIDATE_SELECTOR='[class*=\"neon\" i],[class*=\"glow\" i],[style*=\"drop-shadow\" i],[style*=\"box-shadow\" i],[style*=\"text-shadow\" i],.onehome-user-neon,[data-onehome-user-neon=\"1\"]';
function clean(v){return String(v==null?'':v).trim();}
function readExplicit(){try{var raw=clean(localStorage.getItem(ENABLED_KEY)).toLowerCase();if(/^(1|true|on|enabled)$/.test(raw))return true;if(/^(0|false|off|disabled)$/.test(raw))return false;}catch(_e){}return null;}
function readColor(){try{var c=clean(localStorage.getItem(COLOR_KEY)).toLowerCase();if(COLORS[c])return c;}catch(_e){}return COLORS[serverColor]?serverColor:'pink';}
function isVisual(el){return !!(el&&el.nodeType===1&&el.matches&&el.matches(VISUAL_SELECTOR));}
function rgbKey(value){var m=clean(value).match(/^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);return m?[m[1],m[2],m[3]].join(','):'';}
function isLegacyNeonColor(value){var key=rgbKey(value);return !!key&&LEGACY_NEON_RGB.has(key);}
function remember(el,rec,prop,replacement){if(!(prop in rec))rec[prop]={value:el.style.getPropertyValue(prop),priority:el.style.getPropertyPriority(prop)};if(el.style.getPropertyValue(prop)!==replacement||el.style.getPropertyPriority(prop)!=='important')el.style.setProperty(prop,replacement,'important');}
function visualHasGlow(el){if(!isVisual(el))return false;var cls=clean(el.getAttribute&&el.getAttribute('class')).toLowerCase(),inline=clean(el.getAttribute&&el.getAttribute('style')).toLowerCase();if(/(?:neon|glow)/.test(cls)||/drop-shadow\s*\(/.test(inline))return true;try{return /drop-shadow\s*\(/i.test(clean(getComputedStyle(el).filter));}catch(_e){return false;}}
function neutralize(el){
 if(!el||el.nodeType!==1||!el.style)return;
 if(el.closest&&el.closest('#doodUCoursePage,#doodULetterPage,#dooduColorModal,.page-view:not(.active)'))return;
 var visual=isVisual(el),computed=null;try{computed=getComputedStyle(el);}catch(_e){}
 var rec=suppressed.get(el)||{},changed=false;
 function set(prop,value){remember(el,rec,prop,value);changed=true;}
 if(visual){var vf=clean(computed&&computed.filter)||clean(el.style.getPropertyValue('filter'));if(/drop-shadow\s*\(/i.test(vf)||visualHasGlow(el))set('filter','none');}
 else{
  var box=clean(computed&&computed.boxShadow),ts=clean(computed&&computed.textShadow),filter=clean(computed&&computed.filter);
  if(box&&box!=='none')set('box-shadow','none');if(ts&&ts!=='none')set('text-shadow','none');if(/drop-shadow\s*\(/i.test(filter))set('filter','none');
  if(isLegacyNeonColor(computed&&computed.color))set('color','#ffffff');
  if(isLegacyNeonColor(computed&&computed.backgroundColor))set('background-color','rgba(0,0,0,.62)');
  ['border-top-color','border-right-color','border-bottom-color','border-left-color'].forEach(function(prop){if(isLegacyNeonColor(computed&&computed.getPropertyValue(prop)))set(prop,'rgba(255,255,255,.56)');});
  if(isLegacyNeonColor(computed&&computed.outlineColor))set('outline-color','rgba(255,255,255,.56)');
  if(isLegacyNeonColor(computed&&computed.textDecorationColor))set('text-decoration-color','#ffffff');
 }
 if(changed)suppressed.set(el,rec);
}
function isCandidate(el){try{return !!(el&&el.nodeType===1&&el.matches&&el.matches(CANDIDATE_SELECTOR));}catch(_e){return false;}}
function scanRoot(root){if(!root)return;if(isCandidate(root))neutralize(root);if(root.querySelectorAll)root.querySelectorAll(CANDIDATE_SELECTOR).forEach(neutralize);}
function flushScan(){scanQueued=false;if(readExplicit()!==false&&document.documentElement.getAttribute('data-onehome-neon-enabled')!=='0'){pendingRoots.clear();return;}var roots=Array.from(pendingRoots).filter(function(root,i,all){return !all.some(function(parent,j){return i!==j&&parent.contains&&parent.contains(root)})});pendingRoots.clear();if(!roots.length){var active=document.querySelector('.page-view.active');roots=[active||document.body||document.documentElement];}if(observer)observer.disconnect();roots.forEach(scanRoot);if(observer)observer.observe(document.documentElement,{subtree:true,childList:true});}
function queueScan(root){if(root)pendingRoots.add(root);if(scanQueued)return;scanQueued=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,0)})(flushScan);}
function restoreInline(){suppressed.forEach(function(rec,el){if(!el||!el.style)return;Object.keys(rec).forEach(function(prop){var old=rec[prop]||{};if(old.value)el.style.setProperty(prop,old.value,old.priority||'');else el.style.removeProperty(prop);});});suppressed.clear();}
function ensureObserver(){if(observer||!window.MutationObserver)return;observer=new MutationObserver(function(records){if(document.documentElement.getAttribute('data-onehome-neon-enabled')!=='0')return;records.forEach(function(record){Array.prototype.forEach.call(record.addedNodes||[],function(node){if(node&&node.nodeType===1)queueScan(node);});});});observer.observe(document.documentElement,{subtree:true,childList:true});}
function publishRootVariables(enabled,color){var root=document.documentElement,pair=enabled?COLORS[color]:['#ffffff','255,255,255'],glow=enabled?'rgba('+pair[1]+',.35)':'transparent';var vars={
 '--onehome-neon':pair[0],'--onehome-neon-rgb':pair[1],'--onehome-shell-neon':pair[0],'--onehome-shell-neon-rgb':pair[1],
 '--wallet-accent':pair[0],'--wallet-accent-rgb':pair[1],'--wallet-glow':enabled?'0 0 18px rgba('+pair[1]+',.38)':'none',
 '--profile-page-neon':pair[0],'--profile-page-neon-rgb':pair[1],'--wallet-page-neon':pair[0],
 '--dood-accent':pair[0],'--dood-main-accent':pair[0],'--dood-theme-accent':pair[0],'--theme-accent':pair[0],'--accent':pair[0],
 '--dood-accent-glow':glow,'--dood-main-accent-glow':glow,'--dood-theme-glow':glow,'--theme-glow':glow,'--accent-glow':glow
 };Object.keys(vars).forEach(function(name){root.style.setProperty(name,vars[name]);});return pair;}
function apply(enabled,color,save,dispatch){enabled=enabled===true;color=COLORS[color]?color:'pink';var root=document.documentElement,pair=publishRootVariables(enabled,color);root.classList.toggle('onehome-neon-off',!enabled);root.setAttribute('data-onehome-neon-enabled',enabled?'1':'0');root.setAttribute('data-onehome-neon',color);if(document.body){document.body.classList.toggle('onehome-neon-off',!enabled);document.body.setAttribute('data-onehome-neon-enabled',enabled?'1':'0');}if(save){try{localStorage.setItem(ENABLED_KEY,enabled?'1':'0');localStorage.setItem(COLOR_KEY,color);}catch(_e){}}if(enabled)restoreInline();else{ensureObserver();queueScan(document.body||document.documentElement);}if(dispatch!==false){try{window.dispatchEvent(new CustomEvent('onehome:neon-changed',{detail:{enabled:enabled,color:color,hex:pair[0],rgb:pair[1]}}));}catch(_e){}}return enabled;}
function refreshFromPreference(){var explicit=readExplicit(),enabled=explicit===null?serverDefault:explicit,color=readColor(),root=document.documentElement;if(root.getAttribute('data-onehome-neon-enabled')===(enabled?'1':'0')&&root.getAttribute('data-onehome-neon')===color)return enabled;return apply(enabled,color,false,false);}
async function loadServerDefault(){try{var now=Date.now(),cached=null;try{cached=JSON.parse(localStorage.getItem(SERVER_CACHE_KEY)||'null');}catch(_cacheError){}if(cached&&now-Number(cached.saved_at||0)<SERVER_CACHE_MS&&cached.value){var cv=cached.value;if(cv&&typeof cv==='object'){serverDefault=cv.default_neon_on===true;serverColor=COLORS[String(cv.default_neon_color||'').toLowerCase()]?String(cv.default_neon_color).toLowerCase():'pink';}refreshFromPreference();return;}var url=SUPABASE_URL+'/rest/v1/'+TABLE+'?select=value&element_key=eq.'+encodeURIComponent(APPEARANCE_KEY)+'&is_active=eq.true&limit=1';var response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY},cache:'default'});if(response.ok){var rows=await response.json();var value=rows&&rows[0]&&rows[0].value;if(value&&typeof value==='object'){serverDefault=value.default_neon_on===true;serverColor=COLORS[String(value.default_neon_color||'').toLowerCase()]?String(value.default_neon_color).toLowerCase():'pink';try{localStorage.setItem(SERVER_CACHE_KEY,JSON.stringify({saved_at:now,value:value}));}catch(_storeError){}}}}catch(_e){}refreshFromPreference();}
try{if(localStorage.getItem(DEFAULT_MIGRATION_KEY)!=='1'){localStorage.setItem(ENABLED_KEY,'0');localStorage.setItem(DEFAULT_MIGRATION_KEY,'1');}}catch(_e){}
var initial=readExplicit();apply(initial===null?false:initial,readColor(),false,false);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){refreshFromPreference();loadServerDefault();},{once:true});else{refreshFromPreference();loadServerDefault();}
window.addEventListener('storage',function(e){if(!e||e.key===ENABLED_KEY||e.key===COLOR_KEY)refreshFromPreference();});window.addEventListener('pageshow',refreshFromPreference);window.addEventListener('focus',refreshFromPreference);window.addEventListener('onehome:page-activated',refreshFromPreference);window.addEventListener('onehome:neon-changed',function(e){var d=e&&e.detail||{};if(typeof d.enabled==='boolean')apply(d.enabled,COLORS[d.color]?d.color:readColor(),false,false);});
window.OneHomeGlobalAppearance={refresh:refreshFromPreference,setNeon:function(enabled,color){return apply(enabled,color||readColor(),true,true);},enabled:function(){var v=readExplicit();return v===null?serverDefault:v;}};
function oneHomeFastHubLinks(){if(document.getElementById('onehomeEntryChoicePage'))return;document.querySelectorAll('a,button').forEach(function(control){var img=control.querySelector&&control.querySelector('img[alt=\"One Home\"],img[src*=\"one-home-logo\"],img[src*=\"one-home-return-logo\"]');var label=String(control.getAttribute&&control.getAttribute('aria-label')||control.getAttribute&&control.getAttribute('title')||'').toLowerCase();if(!img&&!/one home choices|return to one home/.test(label))return;if(control.tagName==='A')control.setAttribute('href','/one-home/');if(control.dataset)control.dataset.onehomeHubDestination='fast-hub';});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',oneHomeFastHubLinks,{once:true});else oneHomeFastHubLinks();
window.addEventListener('pageshow',oneHomeFastHubLinks);
})();
