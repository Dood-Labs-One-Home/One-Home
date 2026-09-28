/* One Home Firebase Front Door Bridge V14
   Canonical identity read for Ember plus Ask Ember conversation panel and Destination Registry action routing.
   This bridge does NOT use Supabase profile data to decide Ember status.
   It creates/refreshes the Firebase identity session from the existing One Home wallet,
   reads GET /api/profile/me, and renders Ember from profile_complete/profileComplete.
*/
(function(){
  'use strict';
  var API='https://us-central1-dood-rewards-16760.cloudfunctions.net/labApi';
  var SESSION_KEY='dood_identity_session';
  var PROFILE_KEY='dood_identity_profile_me';
  var lastProfile=null, observerStarted=false, renderTimer=null, identityGeneration=0;

  function clean(v){ return String(v==null?'':v).trim(); }
  function truthy(v){ var s=clean(v).toLowerCase(); return v===true||v===1||s==='true'||s==='1'; }
  function json(v){ try{return JSON.parse(v);}catch(e){return null;} }
  function write(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  function wallet(){
    try{
      var w=clean(localStorage.getItem('dood_profile_wallet_address')||localStorage.getItem('dood_wallet_address')||localStorage.getItem('wallet_address')||'');
      return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(w)?w:'';
    }catch(e){return '';}
  }
  function door(){ return document.getElementById('onehomeV227FrontDoor'); }
  function setText(sel,value){ var root=door(), node=root&&root.querySelector(sel); if(node)node.textContent=clean(value); }
  function goProfile(){ try{if(typeof window.safeShow==='function'){window.safeShow('profilePage');return;}}catch(e){} try{if(typeof window.showPage==='function')window.showPage('profilePage');}catch(e){} }
  function render(profile){
    if(!profile) return;
    var complete=truthy(profile.profile_complete)||truthy(profile.profileComplete);
    var title,copy,steps,button;
    if(complete){
      title='Welcome back — your Passport is complete.';
      copy='Your shared One Home Passport is connected and ready. Explore your rooms, games, and memories.';
      steps=['Your shared Dood identity is connected.','Your Passport is complete.','Explore rooms, games, and memories.'];
      button='Your Passport';
    }else{
      title='Your Passport needs one more step.';
      copy='Your wallet is connected. Add a display name, bio, shared Avatar Image URL, and Passport type, then save your Passport.';
      steps=['Your wallet is connected.','Complete your shared Passport.','Explore rooms, games, and memories.'];
      button='Complete Passport';
    }
    window.__oneHomeFirebaseLiveEmber={locked:true,profile:profile,complete:complete,checking:false};
    setText('[data-dood-text-key="home_ember_title"]',title);
    setText('[data-dood-text-key="home_ember_copy"]',copy);
    setText('[data-dood-text-key="home_ember_step_1"]',steps[0]);
    setText('[data-dood-text-key="home_ember_step_2"]',steps[1]);
    setText('[data-dood-text-key="home_ember_step_3"]',steps[2]);
    var root=door(), btn=root&&root.querySelector('[data-dood-text-key="home_profile_button"]');
    if(btn){btn.textContent=button;btn.onclick=goProfile;}
  }
  function renderChecking(){
    // Only show checking when there is an existing wallet/session signal.
    if(!wallet() && !token()) return;
    window.__oneHomeFirebaseLiveEmber={checking:true,locked:true};
    setText('[data-dood-text-key="home_ember_title"]','Checking your One Home Passport...');
    setText('[data-dood-text-key="home_ember_copy"]','Ember is verifying your Home ID and Passport status.');
    setText('[data-dood-text-key="home_ember_step_1"]','Your identity session is being checked.');
    setText('[data-dood-text-key="home_ember_step_2"]','Your shared Passport is being read from Firebase.');
    setText('[data-dood-text-key="home_ember_step_3"]','Ember will update once, then stay stable.');
  }
  function scheduleRender(){
    if(!lastProfile) return;
    clearTimeout(renderTimer);
    renderTimer=setTimeout(function(){render(lastProfile);},60);
  }
  function normalizeProfile(payload, fallback){
    var p=(payload&&payload.profile)||(payload&&payload.data&&payload.data.profile)||payload||{};
    var f=fallback||{};
    return {
      dood_id:clean(p.dood_id||p.doodId||f.dood_id||f.doodId),
      display_name:clean(p.display_name||p.displayName||f.display_name||f.displayName),
      bio:clean(p.bio||f.bio),
      avatar_url:clean(p.avatar_url||p.avatarUrl||f.avatar_url||f.avatarUrl),
      role_type:clean(p.role_type||p.roleType||f.role_type||f.roleType),
      profile_complete:truthy(p.profile_complete)||truthy(p.profileComplete)||truthy(payload&&payload.profile_complete)||truthy(payload&&payload.profileComplete)||truthy(f.profile_complete)||truthy(f.profileComplete),
      profileComplete:truthy(p.profileComplete)||truthy(p.profile_complete)||truthy(payload&&payload.profileComplete)||truthy(payload&&payload.profile_complete)||truthy(f.profileComplete)||truthy(f.profile_complete)
    };
  }
  async function establishAndRead(){
    var generation=identityGeneration;
    var w=wallet();
    if(!w) return null;
    var connect=await fetch(API+'/api/auth/wallet-connect',{
      method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
      headers:{'Accept':'application/json','Content-Type':'application/json','X-Lab-Wallet':w},
      body:JSON.stringify({wallet:w,provider:'xaman',origin:location.origin})
    });
    var data=await connect.json().catch(function(){return {};});
    if(generation!==identityGeneration)return null;
    if(!connect.ok||data.ok===false) throw new Error(clean(data.error||data.message||('wallet-connect HTTP '+connect.status)));
    var s=data.session||{};
    var token=clean(s.token||s.access_token||s.accessToken||s.sessionToken);
    if(!token) throw new Error('Firebase wallet-connect did not return an identity session token.');
    var seed={token:token,expiresAt:s.expiresAt||s.expires_at||'',profileId:s.profileId||s.profile_id||'',wallet:s.wallet||w,provider:s.provider||'xaman',profile:normalizeProfile(data.profile||{}, {})};
    if(generation!==identityGeneration)return null;
    write(SESSION_KEY,seed);
    var me=await fetch(API+'/api/profile/me',{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Accept':'application/json','Authorization':'Bearer '+token}});
    var meData=await me.json().catch(function(){return {};});
    if(generation!==identityGeneration)return null;
    if(!me.ok||meData.ok===false) throw new Error(clean(meData.error||meData.message||('Passport HTTP '+me.status)));
    var p=normalizeProfile(meData,seed.profile);
    var snapshot={ok:true,profile:p,session:{token:token,expiresAt:seed.expiresAt,profileId:seed.profileId,wallet:seed.wallet,provider:seed.provider}};
    if(generation!==identityGeneration)return null;
    write(PROFILE_KEY,snapshot);
    seed.profile=p; write(SESSION_KEY,seed);
    return p;
  }
  function loadEvents(){
    fetch(API+'/api/lab/ecosystem/events?limit=8',{headers:{'Accept':'application/json'},cache:'no-store'}).then(function(r){return r.json();}).then(function(b){
      var rows=b&&((b.events)||(b.data)); var root=door(),track=root&&root.querySelector('.onehome-v227-live-feed-track');
      if(!track||!Array.isArray(rows)||!rows.length) return;
      var esc=function(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
      var html=rows.slice(0,8).map(function(row){return '<span class="onehome-v227-live-item profile"><i class="feed-dot"></i><b>One Home:</b> '+esc(row&&(row.label||row.title||row.text||row.snippet)||'New activity in One Home')+'</span>';});
      track.innerHTML=html.concat(html).join('');
    }).catch(function(){});
  }


  var EMBER_MESSAGE_ENDPOINT = API + '/api/lab/ember/message';
  var CONVO_KEY = 'onehome_ember_conversation_id';

  function session(){ return json(localStorage.getItem(SESSION_KEY)||'{}')||{}; }
  function token(){ return clean(session().token||session().access_token||session().accessToken||session().sessionToken); }
  function esc(v){ return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  var DESTINATION_HOST='xrplhome.io';
  var DESTINATION_REGISTRY_URL=API+'/api/lab/destinations?host='+encodeURIComponent(DESTINATION_HOST);
  var DESTINATION_RESOLVE_URL=API+'/api/lab/destinations/resolve?action={ACTION_ID}&host='+encodeURIComponent(DESTINATION_HOST);
  var DESTINATION_CACHE_KEY='onehome_destination_registry_xrplhome_v1';
  var destinationCache=null, destinationCachePromise=null;
  function showActionNotice(text){
    var row=document.getElementById('onehomeEmberSuggestedActions');
    if(!row) return;
    var note=document.createElement('span');
    note.style.cssText='color:#ffd86b;font-size:12px;font-weight:900;padding:8px 2px;';
    note.textContent=clean(text);
    row.appendChild(note);
  }
  function readDestinationCache(){
    if(destinationCache) return destinationCache;
    var cached=json(localStorage.getItem(DESTINATION_CACHE_KEY)||'{}')||{};
    if(cached && cached.ok && cached.destinations && cached.cachedAt && (Date.now()-cached.cachedAt)<300000){
      destinationCache=cached;
      return destinationCache;
    }
    return null;
  }
  function writeDestinationCache(registry){
    if(!registry || registry.ok===false || !registry.destinations) return registry;
    registry.cachedAt=Date.now();
    destinationCache=registry;
    write(DESTINATION_CACHE_KEY,registry);
    return registry;
  }
  async function loadDestinationRegistry(force){
    if(!force){
      var cached=readDestinationCache();
      if(cached) return cached;
      if(destinationCachePromise) return destinationCachePromise;
    }
    destinationCachePromise=fetch(DESTINATION_REGISTRY_URL,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Accept':'application/json'}})
      .then(function(r){return r.json().then(function(data){ if(!r.ok||data.ok===false) throw new Error(clean(data.error||data.message||('Destination registry HTTP '+r.status))); return writeDestinationCache(data); });})
      .finally(function(){destinationCachePromise=null;});
    return destinationCachePromise;
  }
  async function resolveDestination(action){
    action=clean(action);
    if(!action) return null;
    var registry=await loadDestinationRegistry(false).catch(function(){return null;});
    var dest=registry && registry.destinations && registry.destinations[action];
    if(dest) return dest;
    var url=DESTINATION_RESOLVE_URL.replace('{ACTION_ID}',encodeURIComponent(action));
    var res=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Accept':'application/json'}});
    var data=await res.json().catch(function(){return {};});
    if(!res.ok || data.ok===false) return null;
    return data.destination || data.result || data;
  }
  function openDestination(dest){
    if(!dest || !clean(dest.href)) return false;
    var href=clean(dest.href);
    var external=dest.external===true;
    try{
      var u=new URL(href,location.href);
      if(external || u.origin!==location.origin){ window.open(u.href,'_blank','noopener,noreferrer'); return true; }
      location.href=u.href;
      return true;
    }catch(e){ return false; }
  }
  async function applySuggestedAction(action){
    action=clean(action);
    if(!action) return false;
    try{
      var dest=await resolveDestination(action);
      if(!dest){ showActionNotice('That destination is not available yet.'); return false; }
      return openDestination(dest);
    }catch(err){
      console.warn('[One Home V14] Destination resolve failed:',clean(err&&err.message||err));
      showActionNotice('That destination could not be opened yet.');
      return false;
    }
  }
  function ensureChatStyles(){
    if(document.getElementById('onehome-ember-chat-styles')) return;
    var style=document.createElement('style');
    style.id='onehome-ember-chat-styles';
    style.textContent='\
      .onehome-ember-chat-backdrop{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.52);display:flex;align-items:flex-end;justify-content:flex-end;padding:18px}\
      .onehome-ember-chat{width:min(430px,calc(100vw - 24px));max-height:min(720px,calc(100vh - 32px));border:1px solid rgba(85,255,154,.42);border-radius:24px;background:linear-gradient(160deg,rgba(8,18,12,.98),rgba(10,7,24,.98));box-shadow:0 28px 70px rgba(0,0,0,.55);color:#eafff0;display:flex;flex-direction:column;overflow:hidden}\
      .onehome-ember-chat-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;border-bottom:1px solid rgba(85,255,154,.18)}\
      .onehome-ember-chat-head b{font-size:18px}.onehome-ember-chat-head span{color:#9affbd;font-size:12px;font-weight:900}.onehome-ember-chat-close{border:1px solid rgba(255,255,255,.20);background:rgba(255,255,255,.07);color:#fff;border-radius:999px;width:34px;height:34px;font-weight:900}\
      .onehome-ember-chat-log{padding:16px;overflow:auto;display:flex;flex-direction:column;gap:10px;min-height:220px}\
      .onehome-ember-msg{border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:11px 13px;line-height:1.45;max-width:92%;white-space:pre-wrap}\
      .onehome-ember-msg.user{align-self:flex-end;background:rgba(255,75,216,.14);border-color:rgba(255,75,216,.28)}\
      .onehome-ember-msg.ember{align-self:flex-start;background:rgba(85,255,154,.10);border-color:rgba(85,255,154,.28)}\
      .onehome-ember-actions-row{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 12px}.onehome-ember-actions-row button{border:1px solid rgba(85,255,154,.30);background:rgba(85,255,154,.08);color:#eafff0;border-radius:999px;padding:9px 11px;font-weight:900}\
      .onehome-ember-chat-form{display:flex;gap:8px;padding:14px 16px 16px;border-top:1px solid rgba(85,255,154,.16)}\
      .onehome-ember-chat-form input{flex:1;border:1px solid rgba(85,255,154,.30);border-radius:14px;background:rgba(0,0,0,.28);color:#fff;padding:12px 13px;outline:none}.onehome-ember-chat-form button{border:1px solid rgba(85,255,154,.42);border-radius:14px;background:linear-gradient(135deg,rgba(85,255,154,.22),rgba(0,255,208,.12));color:#eafff0;font-weight:1000;padding:0 15px}\
      @media(max-width:640px){.onehome-ember-chat-backdrop{padding:10px;align-items:flex-end}.onehome-ember-chat{width:100%;max-height:86vh;border-radius:22px}}';
    document.head.appendChild(style);
  }
  function addMsg(kind,text){
    var log=document.getElementById('onehomeEmberChatLog'); if(!log) return;
    var div=document.createElement('div'); div.className='onehome-ember-msg '+kind; div.textContent=clean(text);
    log.appendChild(div); log.scrollTop=log.scrollHeight;
  }
  function setSuggestedActions(actions){
    var row=document.getElementById('onehomeEmberSuggestedActions'); if(!row) return;
    row.innerHTML='';
    if(!Array.isArray(actions)||!actions.length) return;
    actions.slice(0,4).forEach(function(a){
      var label=clean(a&&a.label); var action=clean(a&&a.action); if(!label||!action) return;
      var btn=document.createElement('button'); btn.type='button'; btn.textContent=label; btn.onclick=function(ev){ if(ev){ev.preventDefault();ev.stopPropagation();} applySuggestedAction(action); };
      row.appendChild(btn);
    });
  }
  function closeEmberChat(){ var el=document.getElementById('onehomeEmberChatBackdrop'); if(el) el.remove(); }
  function openEmberChat(){
    ensureChatStyles();
    var existing=document.getElementById('onehomeEmberChatBackdrop'); if(existing){ existing.remove(); return openEmberChat(); }
    var backdrop=document.createElement('div'); backdrop.id='onehomeEmberChatBackdrop'; backdrop.className='onehome-ember-chat-backdrop';
    backdrop.innerHTML='<section class="onehome-ember-chat" role="dialog" aria-modal="true" aria-label="Ask Ember">'+
      '<div class="onehome-ember-chat-head"><div><b>Ask Ember</b><br><span>One Home guide</span></div><button type="button" class="onehome-ember-chat-close" aria-label="Close">×</button></div>'+
      '<div class="onehome-ember-chat-log" id="onehomeEmberChatLog"></div><div class="onehome-ember-actions-row" id="onehomeEmberSuggestedActions"></div>'+
      '<form class="onehome-ember-chat-form" id="onehomeEmberChatForm"><input id="onehomeEmberChatInput" autocomplete="off" maxlength="900" placeholder="Ask Ember what to do next..."><button type="submit">Send</button></form>'+
      '</section>';
    document.body.appendChild(backdrop);
    backdrop.querySelector('.onehome-ember-chat-close').onclick=closeEmberChat;
    backdrop.addEventListener('click',function(e){ if(e.target===backdrop) closeEmberChat(); });
    var name=(lastProfile&&lastProfile.display_name)||'there';
    addMsg('ember','Hi '+name+'. I can help you explore One Home, open your Passport, find rooms, or choose what to do next.');
    setSuggestedActions([{label:'Open Explore',action:'open-explore'},{label:'Open My Home',action:'open-my-home'},{label:'Open Rollies Arcade',action:'open-rollies-arcade'},{label:'Open Passport',action:'open-profile'}]);
    var input=document.getElementById('onehomeEmberChatInput'); if(input) setTimeout(function(){input.focus();},80);
    document.getElementById('onehomeEmberChatForm').addEventListener('submit',function(e){e.preventDefault(); sendEmberMessage();});
  }
  async function ensureTokenForChat(){
    var t=token(); if(t) return t;
    var p=await establishAndRead(); if(p){ lastProfile=p; render(p); }
    t=token(); if(!t) throw new Error('Please reconnect your wallet so Ember can verify your Home ID.');
    return t;
  }
  async function postEmberMessage(message, retrying){
    var t=await ensureTokenForChat();
    var cid=clean(localStorage.getItem(CONVO_KEY)||'');
    var body={message:message,page:(location.pathname&&location.pathname!=='/'?location.pathname:'/one-home/'),activityContext:{source:'ask-ember',room:'one-home'}};
    if(cid) body.conversationId=cid;
    var res=await fetch(EMBER_MESSAGE_ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Accept':'application/json','Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify(body)});
    var data=await res.json().catch(function(){return {};});
    if(res.status===401 && !retrying){ try{localStorage.removeItem(SESSION_KEY);}catch(e){} await establishAndRead(); return postEmberMessage(message,true); }
    if(res.status===403){ try{localStorage.removeItem(CONVO_KEY);}catch(e){} throw new Error('That Ember conversation belonged to a different session. I cleared it. Please send your message again.'); }
    if(!res.ok || data.ok===false) throw new Error(clean(data.error||data.message||('Ember message failed: HTTP '+res.status)));
    var conv=clean(data.conversationId||data.conversation_id); if(conv) try{localStorage.setItem(CONVO_KEY,conv);}catch(e){}
    return data;
  }
  async function sendEmberMessage(){
    var input=document.getElementById('onehomeEmberChatInput'); if(!input) return;
    var msg=clean(input.value); if(!msg) return;
    input.value=''; addMsg('user',msg); setSuggestedActions([]); addMsg('ember','Thinking...');
    var log=document.getElementById('onehomeEmberChatLog'); var thinking=log&&log.lastElementChild;
    try{
      var data=await postEmberMessage(msg,false);
      if(thinking) thinking.textContent=clean(data.reply||'I am here, but I did not receive reply text.');
      var actions=data.suggestedActions||data.suggested_actions||[];
      setSuggestedActions(actions);
    }catch(err){ if(thinking) thinking.textContent=clean(err&&err.message||err||'Ember could not answer yet.'); }
  }
  function armAskButtons(){
    var nodes=document.querySelectorAll('[data-onehome-ember],#doodV162AskQuill');
    Array.prototype.forEach.call(nodes,function(btn){
      try{
        btn.setAttribute('data-onehome-ember','1');
        btn.onclick=function(ev){ if(ev){ev.preventDefault();ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();} openEmberChat(); return false; };
      }catch(e){}
    });
  }
  function wireAskEmber(){
    window.askEmber=openEmberChat;
    window.oneHomeOpenEmberChat=openEmberChat;
    armAskButtons();
    document.addEventListener('click',function(e){
      var target=e.target&&e.target.closest&&e.target.closest('[data-onehome-ember],#doodV162AskQuill');
      if(!target) return;
      e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      openEmberChat();
    },true);
    window.addEventListener('onehome:page-activated',function(){setTimeout(armAskButtons,50);});
  }

  function wakeHome(){
    if(!window.oneHomePageIsActive || window.oneHomePageIsActive('homePage')){
      loadEvents();
      if(lastProfile) scheduleRender();
    }
  }
  function boot(){
    var cached=json(localStorage.getItem(PROFILE_KEY)||'{}')||{};
    var profile=cached.profile||null;
    if(profile){lastProfile=normalizeProfile(profile,{});render(lastProfile);}else renderChecking();
    wakeHome();
  }
  function init(){
    wireAskEmber();
    boot();
    window.addEventListener('dood_identity_synced',function(e){var p=e&&e.detail&&e.detail.profile;if(p){lastProfile=normalizeProfile(p,lastProfile||{});scheduleRender();}});
    window.addEventListener('dood_identity_profile_me',function(e){var p=e&&e.detail&&(e.detail.profile||e.detail);if(p&&clean(p.dood_id||p.doodId)){lastProfile=normalizeProfile(p,lastProfile||{});scheduleRender();}});
    window.addEventListener('onehome:logout',function(){identityGeneration+=1;lastProfile=null;clearTimeout(renderTimer);});
    window.addEventListener('onehome:page-activated',wakeHome);
    if(!observerStarted){observerStarted=true;var home=document.getElementById('homePage');if(home&&window.MutationObserver){new MutationObserver(function(){if(!window.oneHomePageIsActive||window.oneHomePageIsActive('homePage'))scheduleRender();}).observe(home,{childList:true,subtree:true});}}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,250);},{once:true});else setTimeout(init,250);
})();
