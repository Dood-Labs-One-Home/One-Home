/* One Home OH-260 — Catch & Fry inherits the active One Home Passport.
 * The One Home access token stays on One Home. The game receives only a
 * short-lived, game-bound capability for UNVERIFIED result history.
 */
(function () {
  'use strict';
  if (window.OneHomeCatchFryPilot) return;

  var HOME_ORIGINS = new Set(['https://doodlabs.app', 'https://one-home-test.netlify.app']);
  var GAME_KEY = 'catch_and_fry';
  var GAME_ORIGIN = 'https://rare-ink-studio.github.io';
  var GAME_URL = GAME_ORIGIN + '/Catch-and-Fry/';
  var API = 'https://fshvettlltcujmwvikfq.supabase.co';
  var PUBLIC_KEY = window.DOOD_SUPABASE_KEY || window.SUPABASE_KEY || 'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var current = null;

  function sbClient() {
    return window.doodSupabase || window.doodProfileSupabase || window.oneHomePassportSupabase || null;
  }

  function status(state, value) {
    if (current === state) state.status.textContent = String(value);
  }

  function validLaunch(data) {
    return data && data.game_key === GAME_KEY && data.target_origin === GAME_ORIGIN &&
      uuid.test(String(data.session_id || '')) && /^[0-9a-f]{64}$/.test(String(data.capability || '')) &&
      typeof data.expires_at === 'string' && Date.parse(data.expires_at) > Date.now() &&
      Date.parse(data.expires_at) <= Date.now() + 91 * 60000;
  }

  function close() {
    if (!current) return;
    var state = current;
    current = null;
    window.removeEventListener('message', state.message);
    window.removeEventListener('keydown', state.onKey);
    if (state.subscription && state.subscription.unsubscribe) state.subscription.unsubscribe();
    if (state.frame) state.frame.src = 'about:blank';
    if (state.overlay) state.overlay.remove();
    document.body.style.overflow = state.oldBody;
    document.documentElement.style.overflow = state.oldHtml;
  }

  function deliver(state) {
    if (current !== state || !state.frame || !state.ready || !state.launch || state.delivered) return;
    if (!validLaunch(state.launch)) {
      status(state, 'Passport play session expired. Return to Arcade and reopen the game.');
      return;
    }
    state.frame.contentWindow.postMessage({
      type: 'OH_GAME_LAUNCH',
      version: 1,
      game_key: GAME_KEY,
      target_origin: GAME_ORIGIN,
      session_id: state.launch.session_id,
      capability: state.launch.capability,
      expires_at: state.launch.expires_at,
      passport: {
        username: String(state.passport && state.passport.username || '').slice(0, 64),
        display_name: String(state.passport && state.passport.display_name || '').slice(0, 64)
      }
    }, GAME_ORIGIN);
    state.delivered = true;
    status(state, 'Passport linked automatically. Catch, fry and save your score as UNVERIFIED.');
  }

  async function history(state) {
    if (current !== state || !state.userId || !state.sb) return;
    status(state, 'Checking your saved Passport game history…');
    try {
      var response = await state.sb.rpc('onehome_game_my_history', { p_limit: 50 });
      if (current !== state) return;
      if (response.error) throw response.error;
      state.history.replaceChildren();
      var rows = Array.isArray(response.data) ? response.data : [];
      rows.filter(function (row) { return row.game_key === GAME_KEY; }).forEach(function (row) {
        var item = document.createElement('p');
        item.textContent = 'Catch & Fry · ' + String(row.primary_score == null ? '?' : row.primary_score) +
          ' · ' + String(row.verification_status || 'unverified').toUpperCase();
        state.history.appendChild(item);
      });
      status(state, state.history.children.length ? 'Passport play history loaded.' : 'No saved Catch & Fry results yet.');
    } catch (error) {
      status(state, 'Could not load history: ' + String(error && error.message || error));
    }
  }

  async function linkExistingPassport(state) {
    if (current !== state || state.linking || state.launch) return;
    state.linking = true;
    var sb = state.sb;
    if (!sb || !sb.auth || !sb.auth.getSession) {
      status(state, 'Sign in to One Home to save scores. Guest play remains available.');
      state.linking = false;
      return;
    }
    try {
      var sessionResponse = await sb.auth.getSession();
      if (current !== state) return;
      var authSession = sessionResponse && sessionResponse.data && sessionResponse.data.session;
      var user = authSession && authSession.user;
      if (!authSession || !user || user.is_anonymous || !authSession.access_token) {
        status(state, 'Sign in to One Home to save scores. Guest play remains available.');
        return;
      }
      var verified = await sb.auth.getUser();
      if (current !== state) return;
      if (verified.error || !verified.data || !verified.data.user || verified.data.user.id !== user.id || verified.data.user.is_anonymous) {
        throw Error('Sign in to your One Home Passport again to save scores.');
      }
      state.userId = user.id;
      var profileResponse = await sb.from('dood_profiles')
        .select('username,display_name,status')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (profileResponse.error || !profileResponse.data) throw Error('A published One Home Passport is required.');
      state.passport = profileResponse.data;
      if (sb.auth.onAuthStateChange) {
        var listener = sb.auth.onAuthStateChange(function (_event, next) {
          if (current !== state) return;
          if (!next || !next.user || next.user.id !== state.userId) close();
        });
        state.subscription = listener && listener.data && listener.data.subscription;
      }
      status(state, 'Linking your existing Passport in the background…');
      var response = await fetch(API + '/functions/v1/onehome-game-launch', {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: { apikey: PUBLIC_KEY, Authorization: 'Bearer ' + authSession.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_key: GAME_KEY })
      });
      var data = await response.json().catch(function () { return {}; });
      if (current !== state) return;
      if (!response.ok) throw Error(data.error || 'Passport launch unavailable (' + response.status + ').');
      if (!validLaunch(data)) throw Error('Passport launch could not be verified.');
      state.launch = data;
      deliver(state);
      if (!state.ready && state.frame && state.frame.contentWindow) {
        state.frame.contentWindow.postMessage({ type: 'OH_GAME_PING', game_key: GAME_KEY }, GAME_ORIGIN);
      }
    } catch (error) {
      status(state, 'Guest play is available; Passport score saving is unavailable: ' + String(error && error.message || error));
    } finally {
      state.linking = false;
    }
  }

  function open(row) {
    close();
    if (!HOME_ORIGINS.has(location.origin) || String(row && row.game_key || '').toLowerCase() !== GAME_KEY) return;
    if (typeof window.OneHomeGameStageClose === 'function') window.OneHomeGameStageClose();
    if (window.OneHomeRolliesPilot && typeof window.OneHomeRolliesPilot.close === 'function') window.OneHomeRolliesPilot.close();
    var overlay = document.createElement('div');
    overlay.className = 'onehome-game-stage-screen onehome-catch-fry-screen';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Catch and Fry');
    overlay.innerHTML = '<header class="onehome-game-stage-bar"><button type="button" data-oh-close>← Back to Arcade</button>' +
      '<span class="onehome-game-stage-title">Catch & Fry</span><button type="button" data-oh-history-toggle aria-expanded="false">History</button></header>' +
      '<p class="onehome-game-stage-status" data-oh-status role="status" aria-live="polite">Opening Catch & Fry…</p>' +
      '<main class="onehome-game-stage-play" data-oh-mount></main>' +
      '<section class="onehome-game-stage-history" data-oh-history-panel hidden><div class="onehome-game-stage-history-header">' +
      '<strong>Passport play history · UNVERIFIED</strong><button type="button" data-oh-refresh disabled>Refresh</button></div>' +
      '<div data-oh-history-list></div></section>';
    var state = {
      overlay: overlay, sb: sbClient(), oldBody: document.body.style.overflow,
      oldHtml: document.documentElement.style.overflow, status: overlay.querySelector('[data-oh-status]'),
      mount: overlay.querySelector('[data-oh-mount]'), history: overlay.querySelector('[data-oh-history-list]'),
      refresh: overlay.querySelector('[data-oh-refresh]'), frame: null, ready: false, delivered: false,
      userId: null, passport: null, launch: null, linking: false, subscription: null
    };
    current = state;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    state.frame = document.createElement('iframe');
    state.frame.className = 'onehome-game-stage-frame';
    state.frame.title = 'Catch & Fry';
    state.frame.referrerPolicy = 'no-referrer';
    state.frame.allow = 'fullscreen';
    state.frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups');
    state.frame.src = GAME_URL;
    state.frame.addEventListener('load', function () {
      if (current !== state || !state.frame || !state.frame.contentWindow) return;
      state.ready = false;
      state.delivered = false;
      state.frame.contentWindow.postMessage({ type: 'OH_GAME_PING', game_key: GAME_KEY }, GAME_ORIGIN);
    });
    state.mount.appendChild(state.frame);
    state.message = function (event) {
      if (current !== state || !state.frame || event.origin !== GAME_ORIGIN || event.source !== state.frame.contentWindow) return;
      if (event.data && event.data.type === 'OH_GAME_READY' && event.data.game_key === GAME_KEY) {
        state.ready = true;
        deliver(state);
      }
    };
    window.addEventListener('message', state.message);
    overlay.querySelector('[data-oh-close]').addEventListener('click', close);
    state.onKey = function (event) { if (event.key === 'Escape' && document.activeElement !== state.frame) close(); };
    window.addEventListener('keydown', state.onKey);
    var toggle = overlay.querySelector('[data-oh-history-toggle]');
    var panel = overlay.querySelector('[data-oh-history-panel]');
    toggle.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) void history(state);
    });
    state.refresh.addEventListener('click', function () { void history(state); });
    overlay.querySelector('[data-oh-close]').focus();
    void linkExistingPassport(state).then(function () {
      if (current === state && state.userId) state.refresh.disabled = false;
    });
  }

  window.OneHomeCatchFryPilot = { open: open, close: close };
})();
