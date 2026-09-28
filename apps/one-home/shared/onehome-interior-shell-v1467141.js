(function(){
'use strict';
if(window.__ONEHOME_INTERIOR_SHELL_V1467141__)return;
window.__ONEHOME_INTERIOR_SHELL_V1467141__=true;

var SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
var SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
var TABLE='onehome_admin_overrides';
var APPEARANCE_KEY='onehome:global:appearance';
var COLOR_KEY='onehome_neon_button_color';
var ENABLED_KEY='onehome_neon_enabled';
var COLORS=[
  {key:'pink',name:'Hot Pink',hex:'#ff2bd6',rgb:'255,43,214'},
  {key:'blue',name:'Electric Blue',hex:'#20a7ff',rgb:'32,167,255'},
  {key:'cyan',name:'Cyan',hex:'#00f5ff',rgb:'0,245,255'},
  {key:'green',name:'Neon Green',hex:'#39ff88',rgb:'57,255,136'},
  {key:'purple',name:'Purple',hex:'#b15cff',rgb:'177,92,255'},
  {key:'orange',name:'Orange',hex:'#ff8a2a',rgb:'255,138,42'},
  {key:'yellow',name:'Yellow',hex:'#ffe94a',rgb:'255,233,74'},
  {key:'red',name:'Red',hex:'#ff3b5c',rgb:'255,59,92'}
];
var defaults={
  desktop_background:'/assets/spooky-time-main-entry-pc-v1467200.webp',
  mobile_background:'/assets/spooky-time-main-entry-mobile-v1467200.webp',
  default_neon_on:false,
  default_neon_color:'pink',
  desktop_button_scale:1.10,
  background_library:[
    {name:'Spooky Season',desktop:'/assets/spooky-time-main-entry-pc-v1467200.webp',mobile:'/assets/spooky-time-main-entry-mobile-v1467200.webp'},
    {name:'Classic One Home',desktop:'/assets/one-home-room-pc-background.webp?v=1231',mobile:'/assets/one-home-room-mobile-background.webp?v=1231'}
  ]
};
var settings=Object.assign({},defaults);
var currentColor=COLORS[0];
var neonEnabled=false;
var menu=null;
var NAV_KEY='onehome_navigation_stack_v146740';
var RETURN_KEY='onehome_navigation_return_v146740';
var EXTERNAL_ORIGIN_KEY='onehome_navigation_external_origin_v146740';
var navStack=[];
var suppressRecord=false;

function clean(v){return String(v==null?'':v).trim();}
function byColor(value){value=clean(value).toLowerCase();for(var i=0;i<COLORS.length;i++)if(COLORS[i].key===value||COLORS[i].hex.toLowerCase()===value)return COLORS[i];return COLORS[0];}
function safeUrl(value,fallback){value=clean(value);if(value==='/assets/spooky-time-main-entry-pc-v1416.png')value='/assets/spooky-time-main-entry-pc-v1467200.webp';if(value==='/assets/spooky-time-main-entry-mobile-v1416.png')value='/assets/spooky-time-main-entry-mobile-v1467200.webp';if(!value)return fallback;if(value.charAt(0)==='/'||/^https?:\/\//i.test(value)||/^data:image\//i.test(value))return value;return fallback;}
function cssUrl(value){return 'url(\"'+String(value).replace(/\"/g,'%22')+'\")';}
function loadNavStack(){
  try{var raw=sessionStorage.getItem(NAV_KEY);var parsed=raw?JSON.parse(raw):[];navStack=Array.isArray(parsed)?parsed:[];}catch(_e){navStack=[];}
}
function saveNavStack(){try{sessionStorage.setItem(NAV_KEY,JSON.stringify(navStack.slice(-80)));}catch(_e){}}
function entryKey(e){return !e?'':(e.type==='spa'?'spa:'+clean(e.id):'url:'+clean(e.url));}
function pushEntry(e){if(!e||!entryKey(e))return;var last=navStack.length?navStack[navStack.length-1]:null;if(entryKey(last)===entryKey(e))return;navStack.push(e);if(navStack.length>80)navStack.shift();saveNavStack();}
function pendingReturn(){
  try{
    var stored=clean(sessionStorage.getItem(RETURN_KEY)||'');
    if(stored)return stored;
    var statePage=history&&history.state&&clean(history.state.oneHomeReturnPage||'');
    if(statePage)return statePage;
    var params=new URLSearchParams(location.search||'');
    return clean(params.get('oh_return')||'');
  }catch(_e){return '';}
}
function setPendingReturn(id){try{sessionStorage.setItem(RETURN_KEY,clean(id));}catch(_e){}}
function clearPendingReturn(){
  try{document.documentElement.classList.remove('onehome-return-boot');}catch(_eClass){}
  try{sessionStorage.removeItem(RETURN_KEY);}catch(_e){}
  try{
    var u=new URL(location.href),state=Object.assign({},history.state||{});delete state.oneHomeReturnPage;
    if(u.searchParams.has('oh_return'))u.searchParams.delete('oh_return');
    history.replaceState(state,'',u.pathname+(u.search?u.search:'')+(u.hash||''));
  }catch(_e2){}
}
function setExternalOrigin(entry){try{if(entry&&entryKey(entry))sessionStorage.setItem(EXTERNAL_ORIGIN_KEY,JSON.stringify(entry));}catch(_e){}}
function takeExternalOrigin(){try{var raw=sessionStorage.getItem(EXTERNAL_ORIGIN_KEY);if(!raw)return null;sessionStorage.removeItem(EXTERNAL_ORIGIN_KEY);var e=JSON.parse(raw);return e&&entryKey(e)?e:null;}catch(_e){return null;}}
function isSpaDocument(){return !!document.getElementById('onehomeEntryChoicePage');}
function activePage(){return document.querySelector('.page-view.active[id]');}
function activePageId(){var p=activePage();return p&&p.id||'';}
function isMainEntry(){return isSpaDocument()&&activePageId()==='onehomeEntryChoicePage';}
function isFrontPorch(){return isSpaDocument()&&activePageId()==='homePage';}
function shellShouldShow(){try{if(new URLSearchParams(location.search||'').get('embedded')==='mint')return false}catch(_error){}return !isFrontPorch();}
function currentEntry(){
  if(isSpaDocument()){var id=activePageId();return id?{type:'spa',id:id}:null;}
  return {type:'url',url:location.pathname+location.search+location.hash};
}
function recordCurrent(){if(suppressRecord)return;var e=currentEntry();if(e)pushEntry(e);}
function recordPage(id){if(suppressRecord)return;id=clean(id);if(id)pushEntry({type:'spa',id:id});}
function applyBackground(){
  var root=document.documentElement;
  var desktop=safeUrl(settings.desktop_background,defaults.desktop_background);
  var mobile=safeUrl(settings.mobile_background,desktop||defaults.mobile_background);
  root.style.setProperty('--onehome-interior-bg-desktop',cssUrl(desktop));
  root.style.setProperty('--onehome-interior-bg-mobile',cssUrl(mobile));
  var scale=Number(settings.desktop_button_scale);if(!Number.isFinite(scale)||scale<1||scale>1.3)scale=1.10;
  root.style.setProperty('--onehome-desktop-button-scale',String(scale));
}
function updatePreviousVisibility(){
  if(!menu)return;
  var btn=menu.querySelector('.oh-prev-page');if(!btn)return;
  var show=shellShouldShow()&&!isMainEntry();
  btn.hidden=!show;
  btn.setAttribute('aria-hidden',show?'false':'true');
}
function setMenuOpen(open,returnFocus){
  if(!menu)return;
  open=!!open&&shellShouldShow();
  var toggle=menu.querySelector('.oh-menu-toggle');
  var panel=menu.querySelector('.oh-menu-panel');
  var backdrop=menu.querySelector('.oh-menu-backdrop');
  menu.classList.toggle('open',open);
  if(toggle){
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close One Home controls':'Open One Home controls');
    toggle.textContent=open?'×':'☰';
  }
  if(panel)panel.setAttribute('aria-hidden',open?'false':'true');
  if(backdrop)backdrop.hidden=!open;
  document.body.classList.toggle('oh-menu-open',open);
  if(!open&&returnFocus&&toggle){try{toggle.focus({preventScroll:true});}catch(_e){toggle.focus();}}
}
function setShellVisibility(){
  var show=shellShouldShow();
  document.documentElement.classList.toggle('onehome-interior-shell-active',show);
  document.body.classList.toggle('onehome-interior-shell-active',show);
  if(menu&&!show)setMenuOpen(false,false);
  updatePreviousVisibility();
}
function installShowPageHook(){
  if(window.__ONEHOME_SHOWPAGE_HOOK_V1467141__||typeof window.showPage!=='function')return;
  var original=window.showPage;
  window.showPage=function(id){
    var from=activePageId();
    if(!suppressRecord&&from&&clean(id)&&from!==clean(id))pushEntry({type:'spa',id:from});
    var result=original.apply(this,arguments);
    try{window.dispatchEvent(new CustomEvent('onehome:page-activated',{detail:{pageId:clean(id)}}));}catch(_e){}
    return result;
  };
  window.__ONEHOME_SHOWPAGE_HOOK_V1467141__=true;
}
function showInternalPage(id){
  id=clean(id);if(!id)return false;
  try{if(typeof window.showPage==='function'){window.showPage(id);return true;}}catch(_e){}
  var pages=document.querySelectorAll('.page-view');var target=document.getElementById(id);if(!target)return false;
  pages.forEach(function(el){el.classList.remove('active')});target.classList.add('active');
  try{window.scrollTo({top:0,behavior:'auto'})}catch(_e2){window.scrollTo(0,0)}
  try{window.dispatchEvent(new CustomEvent('onehome:page-activated',{detail:{pageId:id}}))}catch(_e3){}
  return true;
}
function goPage(id){recordCurrent();return showInternalPage(id);}
function goUrl(url){
  url=clean(url);if(!url)return;
  var origin=currentEntry();
  if(origin){
    pushEntry(origin);setExternalOrigin(origin);
    if(origin.type==='spa'&&clean(origin.id)){
      try{history.replaceState(Object.assign({},history.state||{},{oneHomeReturnPage:origin.id}),'',location.href);}catch(_eState){}
    }
  }
  /* Carry the exact SPA room into standalone One Home tools. This is a real URL
     hint, not a second renderer, and lets Previous Page return to the room that
     opened the tool even if browser history/session state changes. */
  try{
    if(origin&&origin.type==='spa'&&clean(origin.id)){
      var u=new URL(url,location.origin);
      if(u.origin===location.origin&&!u.searchParams.has('oh_from')){
        u.searchParams.set('oh_from',origin.id);
        url=u.pathname+u.search+u.hash;
      }
    }
  }catch(_e){}
  location.assign(url);
}
function defaultStandaloneParent(){
  var path=clean(location.pathname).toLowerCase();
  if(path.indexOf('/tools/nft-creator/')===0)return 'onehomeCreatePage';
  if(path==='/mint-studio.html'||path==='/open-mints.html'||path==='/mint-preview.html')return 'onehomeCreatePage';
  if(path==='/burn-to-build.html'||path==='/time-capsule.html')return 'onehomeOtherCreativeToolsPage';
  if(path==='/nft-updates.html')return 'onehomePassportCreatorPage';
  return 'onehomeEntryChoicePage';
}
function safeInternalReturnPage(id){
  id=clean(id);
  /* The Front Porch is public entry, never an authenticated interior return target. */
  if(!id||id==='homePage')return 'onehomeEntryChoicePage';
  return id;
}
function returnToSpa(id){
  id=safeInternalReturnPage(id);if(!id)return false;
  setPendingReturn(id);
  try{sessionStorage.removeItem(EXTERNAL_ORIGIN_KEY);}catch(_e){}
  var url='/?oh_return='+encodeURIComponent(id);
  try{location.replace(url);}catch(_e2){location.assign(url);}
  return true;
}
function previousPage(){
  loadNavStack();
  var current=currentEntry();

  /* Standalone One Home tools never use browser history to return to a SPA room.
     Browser history was the source of the Front Porch/Public Passports detours.
     The explicit oh_from room is authoritative. */
  if(!isSpaDocument()){
    try{
      var params=new URLSearchParams(location.search||'');
      if(params.get('route')==='rare-routes')returnToSpa('rareRoutesSystemPage');
      var hinted=clean(params.get('oh_from')||'');
      if(hinted)return returnToSpa(hinted);
    }catch(_e0){}

    var origin=takeExternalOrigin();
    if(origin){
      if(origin.type==='spa'&&clean(origin.id))return returnToSpa(origin.id);
      if(origin.type==='url'&&clean(origin.url)){try{location.replace(origin.url);}catch(_e1){location.assign(origin.url);}return;}
    }

    /* Directly opened standalone tools still return to their logical One Home parent,
       never to the Front Porch by accident. */
    return returnToSpa(defaultStandaloneParent());
  }

  if(current)pushEntry(current);
  if(navStack.length>1){
    navStack.pop();var target=navStack[navStack.length-1];saveNavStack();
    if(target&&target.type==='spa'&&clean(target.id)){
      var targetId=safeInternalReturnPage(target.id);
      if(document.getElementById(targetId)){
        suppressRecord=true;showInternalPage(targetId);suppressRecord=false;updatePreviousVisibility();setMenuOpen(false,false);return;
      }
      return returnToSpa(targetId);
    }
    if(target&&target.type==='url'&&clean(target.url)){location.assign(target.url);return;}
  }

  /* Main SPA fallback returns to the authenticated 2x2 destination hub, never the Front Porch. */
  if(!isMainEntry()&&document.getElementById('onehomeEntryChoicePage')){
    suppressRecord=true;showInternalPage('onehomeEntryChoicePage');suppressRecord=false;updatePreviousVisibility();return;
  }
}
function restorePendingReturn(){
  var id=safeInternalReturnPage(pendingReturn());if(!id||!isSpaDocument()||!document.getElementById(id))return false;
  suppressRecord=true;var ok=showInternalPage(id);suppressRecord=false;
  if(ok){pushEntry({type:'spa',id:id});updatePreviousVisibility();}
  return ok;
}
function finalizePendingReturn(){clearPendingReturn();}
function styleKnownButtons(){
  var selector=['.onehome-v15-btn:not(.primary)','.btn:not(.primary):not(.danger)','.machine-btn:not(.primary)','.creator-city-btn:not(.primary)','.project-mini-btn','.dood-v148-message-btn:not(.primary)','.dood-v185z-profile-actions button:not(.primary):not(.danger)','.dood-v186y-heart-btn','.mini-nav button','.mini-nav a','.rare-routes-neon-button','.onehome-journey-button'].join(',');
  var root=activePage()||document;
  var nodes=root.querySelectorAll?root.querySelectorAll(selector):[];
  for(var i=0;i<nodes.length;i++){
    var el=nodes[i];el.classList.add('onehome-user-neon');el.setAttribute('data-onehome-user-neon','1');
  }
}
function syncSwatches(){
  if(!menu)return;
  menu.querySelectorAll('.oh-neon-swatch').forEach(function(b){
    var c=byColor(b.dataset.key||'pink');
    b.setAttribute('aria-pressed',String(b.dataset.key===currentColor.key));
    b.style.setProperty('box-shadow',neonEnabled?'0 0 10px '+c.hex:'none','important');
    b.style.setProperty('filter','none','important');
    b.style.setProperty('text-shadow','none','important');
  });
  var sw=menu.querySelector('.oh-neon-switch');if(sw)sw.textContent=neonEnabled?'ON':'OFF';
}
function applyNeon(color,enabled,save){
  currentColor=byColor(color||currentColor.key);
  neonEnabled=enabled!==false;
  var root=document.documentElement;
  var effectiveHex=neonEnabled?currentColor.hex:'#ffffff';
  var effectiveRgb=neonEnabled?currentColor.rgb:'255,255,255';
  /* Keep the selected color in JS/localStorage, but publish the EFFECTIVE color at
     the root. Passport and several legacy rooms read root variables directly. */
  root.style.setProperty('--onehome-neon',effectiveHex);
  root.style.setProperty('--onehome-neon-rgb',effectiveRgb);
  root.style.setProperty('--onehome-shell-neon',effectiveHex);
  root.style.setProperty('--onehome-shell-neon-rgb',effectiveRgb);
  root.setAttribute('data-onehome-neon',currentColor.key);
  root.setAttribute('data-onehome-neon-enabled',neonEnabled?'1':'0');
  root.classList.toggle('onehome-neon-off',!neonEnabled);document.body.classList.toggle('onehome-neon-off',!neonEnabled);
  if(save){try{localStorage.setItem(COLOR_KEY,currentColor.key);localStorage.setItem(ENABLED_KEY,neonEnabled?'1':'0');}catch(_e){}}
  syncSwatches();styleKnownButtons();
  /* Legacy neon helpers can write the selected color back to :root. Reassert the
     effective OFF/ON value after they run so every room agrees with the switch. */
  root.style.setProperty('--onehome-neon',effectiveHex);
  root.style.setProperty('--onehome-neon-rgb',effectiveRgb);
  root.style.setProperty('--onehome-shell-neon',effectiveHex);
  root.style.setProperty('--onehome-shell-neon-rgb',effectiveRgb);
  styleKnownButtons();
  try{window.dispatchEvent(new CustomEvent('onehome:neon-changed',{detail:{enabled:neonEnabled,color:currentColor.key,hex:effectiveHex,rgb:effectiveRgb}}));}catch(_e){}
}
function savedPreference(){
  var color='',enabled=null;
  try{color=localStorage.getItem(COLOR_KEY)||'';var raw=clean(localStorage.getItem(ENABLED_KEY)).toLowerCase();if(raw==='1'||raw==='true'||raw==='on'||raw==='enabled')enabled=true;else if(raw==='0'||raw==='false'||raw==='off'||raw==='disabled')enabled=false;}catch(_e){}
  return {color:color||settings.default_neon_color||'pink',enabled:enabled===null?settings.default_neon_on!==false:enabled};
}
function getClient(){
  try{
    if(window.doodSupabase&&window.doodSupabase.auth)return window.doodSupabase;
    if(window.doodProfileSupabase&&window.doodProfileSupabase.auth)return window.doodProfileSupabase;
    if(window.oneHomePassportSupabase&&window.oneHomePassportSupabase.auth)return window.oneHomePassportSupabase;
    if(window.supabase&&window.supabase.createClient){window.__onehomeShellSb=window.__onehomeShellSb||window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return window.__onehomeShellSb;}
  }catch(_e){}
  return null;
}

async function syncLogoutVisibility(){
  if(!menu)return;
  var btn=menu.querySelector('.oh-logout');if(!btn)return;
  var signed=false;
  try{var c=getClient();if(c&&c.auth&&c.auth.getSession){var r=await c.auth.getSession();signed=!!(r&&r.data&&r.data.session);}}catch(_e){}
  if(!signed){
    try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';var v=localStorage.getItem(k)||'';if(/^sb-.*auth-token$/i.test(k)&&/access_token/.test(v)){signed=true;break;}}}catch(_e){}
  }
  btn.style.display=signed?'':'none';
}

async function logout(){
  var btn=menu&&menu.querySelector('.oh-logout');if(btn){btn.disabled=true;btn.textContent='Logging out…';}
  try{var c=getClient();if(c&&c.auth&&c.auth.signOut)await c.auth.signOut();}catch(_e){}
  try{
    Object.keys(localStorage).forEach(function(k){if(/^sb-|supabase|onehome.*session|dood.*session/i.test(k))localStorage.removeItem(k);});
  }catch(_e){}
  location.href='/';
}

function contactModal(){
  var existing=document.getElementById('onehomeRareInkContactModal');
  if(existing)return existing;
  var modal=document.createElement('div');
  modal.id='onehomeRareInkContactModal';
  modal.className='oh-contact-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="oh-contact-backdrop" data-oh-contact-close="1"></div>'+ 
    '<section class="oh-contact-card" role="dialog" aria-modal="true" aria-labelledby="ohContactTitle">'+
      '<div class="oh-contact-head"><div><div class="oh-contact-kicker">RARE INK STUDIO</div><h2 id="ohContactTitle">Contact Rare Ink Studio</h2></div><button class="oh-contact-close" type="button" aria-label="Close contact form">×</button></div>'+ 
      '<p class="oh-contact-copy">Questions, support, feedback, creator help, or business inquiries — send us a message here.</p>'+ 
      '<form id="onehomeRareInkContactForm" class="oh-contact-form" novalidate>'+ 
        '<input type="hidden" name="form-name" value="rare-ink-studio-contact">'+ 
        '<input type="hidden" name="subject" value="New One Home message — Rare Ink Studio">'+ 
        '<input type="hidden" name="page_url" value="">'+ 
        '<p class="oh-contact-hp" aria-hidden="true"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>'+ 
        '<label>Name <input name="name" type="text" maxlength="120" autocomplete="name" required></label>'+ 
        '<label>Reply email <input name="email" type="email" maxlength="254" autocomplete="email" required></label>'+ 
        '<label>One Home Passport / username <input name="passport" type="text" maxlength="120" autocomplete="off" placeholder="Optional"></label>'+ 
        '<label>What can we help with? <select name="topic"><option value="General">General</option><option value="One Home support">One Home support</option><option value="Creator / business">Creator / business</option><option value="Wallet / mint support">Wallet / mint support</option><option value="Feedback">Feedback</option><option value="Other">Other</option></select></label>'+ 
        '<label>Message <textarea name="message" rows="6" maxlength="5000" required></textarea></label>'+ 
        '<div class="oh-contact-status" aria-live="polite"></div>'+ 
        '<button class="oh-contact-submit" type="submit">Send Message</button>'+ 
      '</form>'+ 
      '<p class="oh-contact-note">Your reply email is included so Rare Ink Studio can respond directly.</p>'+ 
    '</section>';
  document.body.appendChild(modal);
  var close=function(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('oh-contact-open');
  };
  modal.querySelector('.oh-contact-close').addEventListener('click',close);
  modal.querySelector('.oh-contact-backdrop').addEventListener('click',close);
  var form=modal.querySelector('#onehomeRareInkContactForm');
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    var status=form.querySelector('.oh-contact-status');
    var submit=form.querySelector('.oh-contact-submit');
    var nameField=form.elements.namedItem('name');
    var emailField=form.elements.namedItem('email');
    var messageField=form.elements.namedItem('message');
    var name=clean(nameField&&nameField.value);
    var email=clean(emailField&&emailField.value);
    var message=clean(messageField&&messageField.value);
    if(!name||!email||!message){status.textContent='Please add your name, reply email, and message.';return;}
    if(!/^\S+@\S+\.\S+$/.test(email)){status.textContent='Please enter a valid reply email.';return;}
    var pageField=form.elements.namedItem('page_url');if(pageField)pageField.value=location.href;
    submit.disabled=true;submit.textContent='Sending…';status.textContent='';
    try{
      var body=new URLSearchParams();
      Array.prototype.forEach.call(form.elements,function(el){if(el&&el.name)body.append(el.name,el.value||'');});
      var response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
      if(!response.ok)throw new Error('Form submission failed');
      form.reset();
      status.textContent='Message sent to Rare Ink Studio. Thank you.';
      submit.textContent='Sent';
      setTimeout(function(){submit.disabled=false;submit.textContent='Send Message';},1800);
    }catch(_e){
      status.textContent='We could not send that message right now. Please try again.';
      submit.disabled=false;submit.textContent='Send Message';
    }
  });
  modal.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  return modal;
}
function openContact(){
  setMenuOpen(false,false);
  var modal=contactModal();
  var pageField=modal.querySelector('input[name="page_url"]');if(pageField)pageField.value=location.href;
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('oh-contact-open');
  var first=modal.querySelector('input[name="name"]');if(first){setTimeout(function(){try{first.focus({preventScroll:true});}catch(_e){first.focus();}},20);}
}
function buildMenu(){
  if(document.getElementById('onehomeGlobalMenu')){menu=document.getElementById('onehomeGlobalMenu');return;}
  menu=document.createElement('div');menu.id='onehomeGlobalMenu';menu.setAttribute('data-oh-admin-skip','true');
  menu.innerHTML='<div class="oh-shell-controls">'+
      '<button class="oh-prev-page" type="button" aria-label="Go to previous page">← Previous Page</button>'+ 
      '<button class="oh-menu-toggle" type="button" aria-label="Open One Home controls" aria-expanded="false" aria-controls="onehomeGlobalMenuPanel">☰</button>'+
    '</div>'+ 
    '<div class="oh-menu-backdrop" aria-hidden="true" hidden></div>'+ 
    '<div class="oh-menu-panel" id="onehomeGlobalMenuPanel" role="dialog" aria-modal="true" aria-hidden="true" aria-label="One Home controls">'+
      '<div class="oh-menu-title"><span>ONE HOME</span><span style="margin-left:auto;opacity:.68">CONTROLS</span></div>'+ 
      '<div class="oh-menu-section">'+
        '<div class="oh-menu-row"><span class="oh-menu-label">Neon</span><button class="oh-neon-switch" type="button">ON</button></div>'+ 
        '<div class="oh-neon-swatches"></div>'+
      '</div>'+
      '<button class="oh-menu-action oh-contact-action" type="button">Contact Rare Ink Studio</button>'+
      '<button class="oh-menu-action oh-logout" type="button">Log Out</button>'+
    '</div>';
  document.body.appendChild(menu);
  var toggle=menu.querySelector('.oh-menu-toggle');
  var previous=menu.querySelector('.oh-prev-page');if(previous)previous.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setMenuOpen(false,false);previousPage();});
  toggle.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setMenuOpen(!menu.classList.contains('open'),false);});
  var backdrop=menu.querySelector('.oh-menu-backdrop');if(backdrop)backdrop.addEventListener('click',function(){setMenuOpen(false,true);});
  menu.querySelector('.oh-neon-switch').addEventListener('click',function(){applyNeon(currentColor.key,!neonEnabled,true);});
  var swatches=menu.querySelector('.oh-neon-swatches');
  COLORS.forEach(function(c){var b=document.createElement('button');b.type='button';b.className='oh-neon-swatch';b.dataset.key=c.key;b.style.setProperty('--swatch',c.hex);b.style.setProperty('background-color',c.hex,'important');b.style.setProperty('border-color',c.hex,'important');b.title=c.name;b.setAttribute('aria-label',c.name);b.addEventListener('click',function(){applyNeon(c.key,neonEnabled,true);});swatches.appendChild(b);});
  menu.querySelector('.oh-contact-action').addEventListener('click',openContact);
  menu.querySelector('.oh-logout').addEventListener('click',logout);
  menu.querySelector('.oh-logout').style.display='none';
  syncLogoutVisibility();
  updatePreviousVisibility();
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu&&menu.classList.contains('open')){e.preventDefault();setMenuOpen(false,true);}});
}
async function loadSettings(){
  try{
    var url=SUPABASE_URL+'/rest/v1/'+TABLE+'?select=value&element_key=eq.'+encodeURIComponent(APPEARANCE_KEY)+'&is_active=eq.true&limit=1';
    var response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
    if(response.ok){var rows=await response.json();if(rows&&rows[0]&&rows[0].value)settings=Object.assign({},defaults,rows[0].value);}
  }catch(_e){}
  applyBackground();var pref=savedPreference();applyNeon(pref.color,pref.enabled,false);setShellVisibility();
}
function resync(e){var id=e&&e.detail&&e.detail.pageId||activePageId();if(id)recordPage(id);else recordCurrent();var pref=savedPreference();applyNeon(pref.color,pref.enabled,false);setShellVisibility();syncLogoutVisibility();setTimeout(function(){var p=savedPreference();applyNeon(p.color,p.enabled,false);styleKnownButtons();},25);setTimeout(function(){var p=savedPreference();applyNeon(p.color,p.enabled,false);styleKnownButtons();},250);setTimeout(function(){var p=savedPreference();applyNeon(p.color,p.enabled,false);styleKnownButtons();},950);}
function init(){loadNavStack();installShowPageHook();buildMenu();applyBackground();var pref=savedPreference();applyNeon(pref.color,pref.enabled,false);if(!pendingReturn())recordCurrent();setShellVisibility();loadSettings();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('onehome:page-activated',resync);
window.addEventListener('pageshow',resync);
window.addEventListener('popstate',resync);
window.addEventListener('resize',function(){setShellVisibility();});
window.addEventListener('storage',function(e){if(!e||e.key===COLOR_KEY||e.key===ENABLED_KEY){var p=savedPreference();applyNeon(p.color,p.enabled,false);}});
document.addEventListener('visibilitychange',function(){if(!document.hidden){var p=savedPreference();applyNeon(p.color,p.enabled,false);}});
window.OneHomeNavigation={goPage:goPage,goUrl:goUrl,previous:previousPage,restorePendingReturn:restorePendingReturn,finalizePendingReturn:finalizePendingReturn,pendingReturn:pendingReturn,recordCurrent:recordCurrent};
window.OneHomeInteriorShell={refresh:loadSettings,applyNeon:applyNeon,settings:function(){return Object.assign({},settings);}};
})();
