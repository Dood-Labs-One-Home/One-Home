/* One Home game pilot OH-257: authenticated Passport -> Rollies preview.
 * Independent game capability only; JWT stays in One Home. No mint, payments,
 * leaderboard awards, or weekly participation. This is unverified history.
 */
(function () {
  'use strict';
  if (window.OneHomeRolliesPilot) return;
  var HOME = 'https://doodlabs.app';
  var GAME = 'https://deploy-preview-2--rollies-speakeasy.netlify.app';
  var API = 'https://fshvettlltcujmwvikfq.supabase.co';
  var PUBLIC_KEY = window.DOOD_SUPABASE_KEY || window.SUPABASE_KEY || 'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var safe = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (x) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]; }); };
  var current = null;
  function sbClient() {
    return window.doodSupabase || window.doodProfileSupabase || window.oneHomePassportSupabase || null;
  }
  function clear() {
    if (!current) return;
    var s = current; current = null;
    window.removeEventListener('message', s.message);
    if (s.authSubscription && s.authSubscription.unsubscribe) s.authSubscription.unsubscribe();
    if (s.frame) s.frame.src = 'about:blank';
    if (s.overlay) s.overlay.remove();
  }
  function status(s, message) { if (current === s) s.status.textContent = message; }
  function validLaunch(data) {
    return data && data.game_key === 'rollies_speakeasy' && data.target_origin === GAME &&
      uuid.test(String(data.session_id || '')) && /^[0-9a-f]{64}$/.test(String(data.capability || '')) &&
      typeof data.expires_at === 'string' && Date.parse(data.expires_at) > Date.now() &&
      Date.parse(data.expires_at) <= Date.now() + 91 * 60000;
  }
  function beginFrame(s, isGuest) {
    if (current !== s || s.frame) return;
    s.mount.hidden = false;
    s.frame = document.createElement('iframe');
    s.frame.title = isGuest ? 'Rollies Speakeasy Bowling guest game' : 'Rollies Speakeasy Bowling Passport game';
    s.frame.referrerPolicy = 'no-referrer';
    s.frame.allow = 'fullscreen';
    s.frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups');
    s.frame.src = GAME + '/bowl';
    s.frame.addEventListener('load', function () {
      if (current !== s || !s.frame || !s.frame.contentWindow) return;
      s.frame.contentWindow.postMessage({type:'OH_GAME_PING',game_key:'rollies_speakeasy'}, GAME);
    });
    s.mount.replaceChildren(s.frame);
  }
  function deliver(s) {
    if (current !== s || !s.frame || !s.launch || s.delivered) return;
    if (!validLaunch(s.launch)) { status(s, 'Game connection expired. Close and launch again.'); return; }
    s.frame.contentWindow.postMessage({
      type:'OH_GAME_LAUNCH',version:1,game_key:'rollies_speakeasy',
      session_id:s.launch.session_id,capability:s.launch.capability,expires_at:s.launch.expires_at
    }, GAME);
    s.delivered = true;
    status(s, 'Passport linked. Finish a solo Bowling game, then select Refresh my game history. Scores are unverified.');
  }
  async function showHistory(s) {
    if (current !== s || !s.userId) return;
    status(s, 'Checking your saved Passport play history…');
    var reply = await s.sb.rpc('onehome_game_my_history', {p_limit: 12});
    if (current !== s) return;
    if (reply.error) { status(s, 'Could not load game history: ' + reply.error.message); return; }
    s.history.replaceChildren();
    var rows = Array.isArray(reply.data) ? reply.data : [];
    rows.filter(function (r) { return r.game_key === 'rollies_speakeasy'; }).forEach(function (r) {
      var el = document.createElement('p');
      el.textContent = String(r.subgame || 'Game') + ' · ' + String(r.primary_score == null ? '?' : r.primary_score) +
        ' · ' + String(r.verification_status || 'unverified').toUpperCase() + ' · ' + String(r.mode || '');
      s.history.appendChild(el);
    });
    status(s, s.history.children.length ? 'Your latest unverified Rollies Speakeasy results are shown below.' : 'No saved Speakeasy results yet. Finish a Bowling game and refresh.');
  }
  async function launch(s) {
    if (current !== s || !s.userId || s.launch || s.frame) return;
    s.play.disabled = true;
    status(s, 'Checking your published One Home Passport…');
    try {
      var session = await s.sb.auth.getSession();
      var token = session && session.data && session.data.session && session.data.session.access_token;
      if (!token) throw Error('Your Passport session expired. Sign in to One Home again.');
      var verified = await s.sb.auth.getUser();
      if (verified.error || !verified.data || !verified.data.user || verified.data.user.id !== s.userId || verified.data.user.is_anonymous)
        throw Error('Passport verification failed. Please sign in again.');
      var response = await fetch(API + '/functions/v1/onehome-game-launch', {
        method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
        headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({game_key:'rollies_speakeasy'})
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw Error(data.error || 'The game could not issue a Passport launch (' + response.status + ').');
      if (!validLaunch(data)) throw Error('Game returned an invalid launch; no Passport was linked.');
      if (current !== s) return;
      s.launch = data;
      beginFrame(s, false);
      status(s, 'Waiting for Bowling to confirm its Passport connection…');
    } catch (e) {
      status(s, e && e.message ? e.message : 'Passport launch failed.');
      s.play.disabled = false;
    }
  }
  async function open(row) {
    clear();
    if (location.origin !== HOME) return;
    var sb = sbClient();
    var overlay = document.createElement('div');
    overlay.className = 'onehome-game-modal-backdrop';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Rollies Speakeasy Bowling');
    overlay.innerHTML = '<div class="onehome-game-modal onehome-rollies-modal">' +
      '<button type="button" class="onehome-user-neon" data-oh-close>← Back to Arcade</button>' +
      '<h2>Rollies Speakeasy · Bowling</h2><p>Play Rare’s Bowling here in One Home. Passport scores are saved as <strong>unverified history</strong>, not leaderboard positions or prizes.</p>' +
      '<div class="onehome-game-modal-actions"><button type="button" data-oh-play disabled>Connect my Passport &amp; play</button>' +
      '<button type="button" data-oh-guest>Play as guest</button><button type="button" data-oh-history disabled>Refresh my game history</button></div>' +
      '<p data-oh-status role="status" aria-live="polite">Checking your One Home Passport session…</p>' +
      '<div class="onehome-rollies-frame" data-oh-mount hidden></div><div class="onehome-rollies-history" data-oh-history-list></div>' +
      '</div>';
    document.body.appendChild(overlay);
    var s = {overlay:overlay, sb:sb, status:overlay.querySelector('[data-oh-status]'),
      play:overlay.querySelector('[data-oh-play]'), guest:overlay.querySelector('[data-oh-guest]'),
      refresh:overlay.querySelector('[data-oh-history]'), mount:overlay.querySelector('[data-oh-mount]'),
      history:overlay.querySelector('[data-oh-history-list]'), frame:null, userId:null, launch:null, delivered:false, authSubscription:null};
    current = s;
    s.message = function (e) {
      if (current !== s || !s.frame || e.origin !== GAME || e.source !== s.frame.contentWindow) return;
      if (e.data && e.data.type === 'OH_GAME_READY' && e.data.game_key === 'rollies_speakeasy') deliver(s);
    };
    window.addEventListener('message', s.message);
    overlay.querySelector('[data-oh-close]').addEventListener('click', clear);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) clear(); });
    s.play.addEventListener('click', function () { void launch(s); });
    s.guest.addEventListener('click', function () {
      if (s.frame) return;
      s.play.disabled = true; s.guest.disabled = true;
      beginFrame(s, true); status(s, 'Playing as guest. Guest scores are never assigned to a Passport.');
    });
    s.refresh.addEventListener('click', function () { void showHistory(s); });
    if (!sb || !sb.auth || !sb.auth.getSession) {
      status(s, 'Sign in to your One Home Passport to link a score. Guest play is available.'); return;
    }
    try {
      var session = await sb.auth.getSession();
      var user = session && session.data && session.data.session && session.data.session.user;
      if (!user || user.is_anonymous) { status(s, 'Sign in to One Home first to link your Passport, or play as guest.'); return; }
      var checked = await sb.auth.getUser();
      if (current !== s) return;
      if (checked.error || !checked.data || !checked.data.user || checked.data.user.id !== user.id) {
        status(s, 'Sign in to One Home first to link your Passport, or play as guest.'); return;
      }
      s.userId = user.id;
      s.play.disabled = false;
      s.refresh.disabled = false;
      status(s, 'Passport sign-in found. Connect your Passport to start Bowling.');
      if (sb.auth.onAuthStateChange) {
        var listener = sb.auth.onAuthStateChange(function (_event, next) {
          if (current === s && s.userId && next && next.user && next.user.id !== s.userId) clear();
          if (current === s && s.userId && !next) clear();
        });
        s.authSubscription = listener && listener.data && listener.data.subscription;
      }
      void showHistory(s);
    } catch (e) { if (current === s) status(s, 'Passport sign-in could not be checked. Guest play is available.'); }
  }
  window.OneHomeRolliesPilot = {open:open,close:clear};
})();
