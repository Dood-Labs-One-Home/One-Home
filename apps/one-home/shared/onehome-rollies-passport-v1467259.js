/* One Home OH-259 — automatic existing Passport + complete Speakeasy at its daily door.
 * No independent sign-in, browser-selected Passport ID, weekly prizes or verified score claims.
 */
(function () {
  'use strict';
  if (window.OneHomeRolliesPilot) return;
  var HOME = 'https://doodlabs.app';
  var GAME = 'https://deploy-preview-2--rollies-speakeasy.netlify.app';
  var API = 'https://fshvettlltcujmwvikfq.supabase.co';
  var PUBLIC_KEY = window.DOOD_SUPABASE_KEY || window.SUPABASE_KEY || 'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var current = null;
  function sbClient() { return window.doodSupabase || window.doodProfileSupabase || window.oneHomePassportSupabase || null; }
  function status(s, value) { if(current===s) s.status.textContent=String(value); }
  function validLaunch(d) {
    return d && d.game_key === 'rollies_speakeasy' && d.target_origin === GAME &&
      uuid.test(String(d.session_id || '')) && /^[0-9a-f]{64}$/.test(String(d.capability || '')) &&
      typeof d.expires_at === 'string' && Date.parse(d.expires_at) > Date.now() &&
      Date.parse(d.expires_at) <= Date.now()+91*60000;
  }
  function close() {
    if(!current)return;
    var s=current;current=null;
    window.removeEventListener('message',s.message);
    window.removeEventListener('keydown',s.onKey);
    if(s.subscription&&s.subscription.unsubscribe)s.subscription.unsubscribe();
    if(s.frame)s.frame.src='about:blank';
    if(s.overlay)s.overlay.remove();
    document.body.style.overflow=s.oldBody;
    document.documentElement.style.overflow=s.oldHtml;
  }
  function deliver(s) {
    if(current!==s||!s.frame||!s.ready||!s.launch||s.delivered)return;
    if(!validLaunch(s.launch)){status(s,'Passport play session expired. Return to Arcade and reopen the game.');return;}
    s.frame.contentWindow.postMessage({
      type:'OH_GAME_LAUNCH',version:1,game_key:'rollies_speakeasy',
      session_id:s.launch.session_id,capability:s.launch.capability,expires_at:s.launch.expires_at
    },GAME);
    s.delivered=true;
    status(s,'Passport linked automatically. Pick tonight’s door to enter. Results are unverified play history.');
  }
  async function history(s) {
    if(current!==s||!s.userId||!s.sb)return;
    status(s,'Checking your saved Passport game history…');
    try {
      var r=await s.sb.rpc('onehome_game_my_history',{p_limit:30});
      if(current!==s)return;
      if(r.error)throw r.error;
      s.history.replaceChildren();
      var rows=Array.isArray(r.data)?r.data:[];
      rows.filter(function(x){return x.game_key==='rollies_speakeasy';}).forEach(function(x){
        var item=document.createElement('p');
        item.textContent=String(x.subgame||'Game')+' · '+String(x.primary_score==null?'?':x.primary_score)+' · '+String(x.verification_status||'unverified').toUpperCase()+' · '+String(x.mode||'');
        s.history.appendChild(item);
      });
      status(s,s.history.children.length?'Passport play history loaded.':'No saved Speakeasy results yet.');
    }catch(e){status(s,'Could not load history: '+String(e&&e.message||e));}
  }
  async function linkExistingPassport(s) {
    if(current!==s||s.linking||s.launch)return;
    s.linking=true;
    var sb=s.sb;
    if(!sb||!sb.auth||!sb.auth.getSession){status(s,'Sign in to One Home to save scores. You can still pick a door.');s.linking=false;return;}
    try {
      var session=await sb.auth.getSession();
      if(current!==s)return;
      var authSession=session&&session.data&&session.data.session;
      var user=authSession&&authSession.user;
      if(!authSession||!user||user.is_anonymous||!authSession.access_token){status(s,'Sign in to One Home to save scores. You can still pick a door.');return;}
      var verified=await sb.auth.getUser();
      if(current!==s)return;
      if(verified.error||!verified.data||!verified.data.user||verified.data.user.id!==user.id||verified.data.user.is_anonymous)throw Error('Sign in to your One Home Passport again to save scores.');
      s.userId=user.id;
      if(sb.auth.onAuthStateChange){
        var listener=sb.auth.onAuthStateChange(function(_event,next){
          if(current!==s)return;
          if(!next||!next.user||next.user.id!==s.userId)close();
        });
        s.subscription=listener&&listener.data&&listener.data.subscription;
      }
      status(s,'Linking your existing Passport in the background…');
      var response=await fetch(API+'/functions/v1/onehome-game-launch',{
        method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
        headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+authSession.access_token,'Content-Type':'application/json'},
        body:JSON.stringify({game_key:'rollies_speakeasy'})
      });
      var data=await response.json().catch(function(){return {};});
      if(current!==s)return;
      if(!response.ok)throw Error(data.error||'Passport launch unavailable ('+response.status+').');
      if(!validLaunch(data))throw Error('Passport launch could not be verified.');
      s.launch=data;
      deliver(s); // READY may have arrived before the Passport request completed.
      if(!s.ready&&s.frame&&s.frame.contentWindow)s.frame.contentWindow.postMessage({type:'OH_GAME_PING',game_key:'rollies_speakeasy'},GAME);
    }catch(e){status(s,'Door play is available; Passport result saving is unavailable: '+String(e&&e.message||e));}
    finally {s.linking=false;}
  }
  function open(row) {
    close();
    if(location.origin!==HOME||String(row&&row.game_key||'').toLowerCase()!=='rollies_speakeasy')return;
    if(typeof window.OneHomeGameStageClose==='function')window.OneHomeGameStageClose();
    var overlay=document.createElement('div');
    overlay.className='onehome-game-stage-screen onehome-speakeasy-screen';
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Rollies Speakeasy');
    overlay.innerHTML='<header class="onehome-game-stage-bar"><button type="button" data-oh-close>← Back to Arcade</button><span class="onehome-game-stage-title">Rollies Speakeasy</span><button type="button" data-oh-history-toggle aria-expanded="false">History</button></header>'+ 
      '<p class="onehome-game-stage-status" data-oh-status role="status" aria-live="polite">Opening the Speakeasy doors…</p>'+ 
      '<main class="onehome-game-stage-play" data-oh-mount></main>'+ 
      '<section class="onehome-game-stage-history" data-oh-history-panel hidden><div class="onehome-game-stage-history-header"><strong>Passport play history · unverified</strong><button type="button" data-oh-refresh disabled>Refresh</button></div><div data-oh-history-list></div></section>';
    var s={overlay:overlay,sb:sbClient(),oldBody:document.body.style.overflow,oldHtml:document.documentElement.style.overflow,
      status:overlay.querySelector('[data-oh-status]'),mount:overlay.querySelector('[data-oh-mount]'),
      history:overlay.querySelector('[data-oh-history-list]'),refresh:overlay.querySelector('[data-oh-refresh]'),
      frame:null,ready:false,delivered:false,userId:null,launch:null,linking:false,subscription:null};
    current=s;document.body.appendChild(overlay);
    document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';
    s.frame=document.createElement('iframe');
    s.frame.className='onehome-game-stage-frame';s.frame.title='Rollies Speakeasy — daily door and all games';
    s.frame.referrerPolicy='no-referrer';s.frame.allow='fullscreen';
    s.frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups');
    // The ROOT route shows the daily door; /bowl was a testing-only shortcut.
    s.frame.src=GAME+'/';
    s.frame.addEventListener('load',function(){
      if(current!==s||!s.frame||!s.frame.contentWindow)return;
      s.ready=false;s.delivered=false;
      s.frame.contentWindow.postMessage({type:'OH_GAME_PING',game_key:'rollies_speakeasy'},GAME);
    });
    s.mount.appendChild(s.frame);
    s.message=function(event){
      if(current!==s||!s.frame||event.origin!==GAME||event.source!==s.frame.contentWindow)return;
      if(event.data&&event.data.type==='OH_GAME_READY'&&event.data.game_key==='rollies_speakeasy'){
        s.ready=true;deliver(s);
      }
    };
    window.addEventListener('message',s.message);
    overlay.querySelector('[data-oh-close]').addEventListener('click',close);
    s.onKey=function(e){if(e.key==='Escape'&&document.activeElement!==s.frame)close();};
    window.addEventListener('keydown',s.onKey);
    var toggle=overlay.querySelector('[data-oh-history-toggle]');
    var panel=overlay.querySelector('[data-oh-history-panel]');
    toggle.addEventListener('click',function(){
      panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));
      if(!panel.hidden)void history(s);
    });
    s.refresh.addEventListener('click',function(){void history(s);});
    overlay.querySelector('[data-oh-close]').focus();
    // No extra Connect/Guest choice or new login: use the active One Home session.
    void linkExistingPassport(s).then(function(){if(current===s&&s.userId)s.refresh.disabled=false;});
  }
  window.OneHomeRolliesPilot={open:open,close:close};
})();
