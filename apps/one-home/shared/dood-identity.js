/* Dood Labs / One Home Phase 1 Dood Identity/Profile Bridge - V219
   Base: clean V203. UI-safe: no layout/menu/routing/profile-save changes.
   Purpose: sync the currently connected Xaman/XRPL wallet to G's labApi and store dood_identity_session.
*/
(function(){
  'use strict';
  if (window.DoodIdentity && window.DoodIdentity.__v219IdentityBridge) return;

  var LAB_API_BASE = 'https://us-central1-dood-rewards-16760.cloudfunctions.net/labApi';
  var SESSION_KEY = 'dood_identity_session';
  var LAST_ERROR_KEY = 'dood_identity_last_error';
  var LAST_DEBUG_KEY = 'dood_identity_last_debug';
  var PROFILE_ME_KEY = 'dood_identity_profile_me';
  var PROFILE_ME_ERROR_KEY = 'dood_identity_profile_me_error';
  var syncing = null;
  var lastWalletSynced = '';
  var syncGeneration = 0;
  var profileMePromise = null;
  var PROFILE_ME_TTL = 30000;

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function lower(v){ return clean(v).toLowerCase(); }
  function truthy(v){ return v === true || v === 1 || lower(v) === 'true' || lower(v) === '1'; }
  function safeJsonParse(v){ try { return JSON.parse(v); } catch(e) { return null; } }
  function writeJson(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {} }
  function removeKey(key){ try { localStorage.removeItem(key); } catch(e) {} }

  // XRPL classic address format screen. Do not lowercase; XRPL addresses are case-sensitive.
  function looksLikeXrpl(v){
    v = clean(v);
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(v);
  }

  function setError(message, extra){
    writeJson(LAST_ERROR_KEY, {
      ok:false,
      message: clean(message),
      extra: extra || null,
      at: new Date().toISOString(),
      source:'dood-identity-v219'
    });
  }
  function clearError(){ removeKey(LAST_ERROR_KEY); }

  function searchObjectForWallet(obj, depth){
    if (!obj || depth > 4) return '';
    if (typeof obj === 'string') return looksLikeXrpl(obj) ? clean(obj) : '';
    if (Array.isArray(obj)) {
      for (var i=0;i<obj.length;i++){ var a=searchObjectForWallet(obj[i], depth+1); if(a) return a; }
      return '';
    }
    if (typeof obj === 'object') {
      var priority = ['wallet','wallet_address','walletAddress','primary_wallet','primaryWallet','address','account','classicAddress','xrplAddress'];
      for (var p=0;p<priority.length;p++){
        var pv = obj[priority[p]];
        if (looksLikeXrpl(pv)) return clean(pv);
      }
      for (var k in obj){
        if (!Object.prototype.hasOwnProperty.call(obj,k)) continue;
        var found = searchObjectForWallet(obj[k], depth+1);
        if (found) return found;
      }
    }
    return '';
  }

  function getLocalWallet(){
    var directKeys = [
      'dood_profile_wallet_address',
      'dood_wallet_address',
      'wallet_address',
      'xaman_wallet_address',
      'xumm_wallet_address'
    ];
    for (var i=0;i<directKeys.length;i++){
      var direct = clean(localStorage.getItem(directKeys[i]));
      if (looksLikeXrpl(direct)) return direct;
    }
    var scanKeys = [
      'doodProfileBackup','doodProfileBackupV186T','doodlabsLastKnownProfileV96',
      'doodlabsProfilesV2','dood_profile_backup','doodUser','dood_session','xaman_payload','xamanSession'
    ];
    for (var s=0;s<scanKeys.length;s++){
      var raw = localStorage.getItem(scanKeys[s]);
      var parsed = raw ? safeJsonParse(raw) : null;
      var found = searchObjectForWallet(parsed || raw, 0);
      if (found) return found;
    }
    return '';
  }

  function getWalletType(){
    var provider = clean(localStorage.getItem('dood_profile_wallet_provider') || localStorage.getItem('dood_wallet_provider') || 'xaman');
    if (/xaman/i.test(provider)) return 'xaman';
    if (/xumm/i.test(provider)) return 'xumm';
    return provider || 'xaman';
  }

  function normalize(data, walletAddress){
    data = data || {};
    var profile = data.profile || (data.data && data.data.profile) || {};
    var wallet = data.wallet || (data.data && data.data.wallet) || {};
    var outWallet = clean(wallet.wallet_address || wallet.walletAddress || profile.primary_wallet || profile.primaryWallet || walletAddress);
    var session = data.session || (data.data && data.data.session) || {};
    var token = getSessionTokenFrom(data);
    var profileId = clean(data.profileId || data.profile_id || session.profileId || session.profile_id || profile.id || profile.profile_id || profile.profileId || '');
    var expiresAt = clean(data.expiresAt || data.expires_at || session.expiresAt || session.expires_at || '');
    return {
      ok: data.ok !== false,
      token: token,
      profileId: profileId,
      expiresAt: expiresAt,
      session: session,
      profile: {
        id: clean(profile.id || profile.profile_id || profile.profileId || ''),
        dood_id: clean(profile.dood_id || profile.doodId || ''),
        username: clean(profile.username || ''),
        display_name: clean(profile.display_name || profile.displayName || ''),
        avatar_url: clean(profile.avatar_url || profile.avatarUrl || ''),
        bio: clean(profile.bio || ''),
        role_type: clean(profile.role_type || profile.roleType || ''),
        profile_complete: truthy(profile.profile_complete) || truthy(profile.profileComplete) || truthy(data.profile_complete) || truthy(data.profileComplete),
        primary_wallet: clean(profile.primary_wallet || profile.primaryWallet || outWallet)
      },
      wallet: {
        wallet_address: outWallet,
        normalized_wallet_address: clean(wallet.normalized_wallet_address || wallet.normalizedWalletAddress || outWallet),
        chain: clean(wallet.chain || 'xrpl'),
        wallet_type: clean(wallet.wallet_type || wallet.walletType || getWalletType()),
        is_primary: wallet.is_primary !== false
      },
      synced_at: new Date().toISOString(),
      source: 'labApi',
      bridge_version: 'V219'
    };
  }

  async function postWalletConnect(walletAddress){
    var walletType = getWalletType();

    // V215 fix retained: send classic XRPL address as top-level wallet string.
    // Send the classic XRPL address as a TOP-LEVEL STRING named "wallet" first.
    // Do not send a nested wallet object. Do not lowercase the address.
    var payload = {
      wallet: walletAddress,
      wallet_address: walletAddress,
      walletAddress: walletAddress,
      primary_wallet: walletAddress,
      primaryWallet: walletAddress,
      address: walletAddress,
      account: walletAddress,
      chain: 'xrpl',
      wallet_type: walletType,
      walletType: walletType,
      wallet_provider: 'xaman',
      provider: 'xaman',
      source: location.hostname || 'doodlabs.app'
    };

    writeJson(LAST_DEBUG_KEY, {
      at: new Date().toISOString(),
      source:'dood-identity-v219',
      endpoint: LAB_API_BASE + '/api/auth/wallet-connect',
      wallet_address: walletAddress,
      wallet_address_length: walletAddress.length,
      payload_keys: Object.keys(payload),
      payload_wallet_string_present: typeof payload.wallet === 'string'
    });

    var res = await fetch(LAB_API_BASE + '/api/auth/wallet-connect', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
      body: JSON.stringify(payload)
    });
    var text = '';
    try { text = await res.text(); } catch(e) {}
    var data = text ? safeJsonParse(text) : {};
    if (!data) data = { raw:text };
    if (!res.ok || data.ok === false) {
      throw new Error(clean(data.error || data.message || data.raw || ('labApi HTTP ' + res.status)));
    }
    return data;
  }


  function getSessionTokenFrom(data){
    data = data || {};
    return clean(data.token || data.access_token || data.accessToken || data.jwt ||
      (data.session && (data.session.token || data.session.access_token || data.session.accessToken || data.session.jwt)) ||
      (data.data && (data.data.token || data.data.access_token || data.data.accessToken || data.data.jwt)) || '');
  }

  function profileMeHeaders(){
    var headers = { 'Accept':'application/json' };
    var current = safeJsonParse(localStorage.getItem(SESSION_KEY) || 'null') || {};
    var token = clean(current.token || current.access_token || current.accessToken || current.jwt || (current.session && (current.session.token || current.session.access_token || current.session.accessToken || current.session.jwt)) || '');
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  function normalizeProfileMe(data, fallbackSession){
    data = data || {};
    fallbackSession = fallbackSession || {};
    var profile = data.profile || (data.data && data.data.profile) || (data.ok && data.dood_id ? data : {}) || {};
    var wallet = data.wallet || (data.data && data.data.wallet) || fallbackSession.wallet || {};
    var fallbackProfile = fallbackSession.profile || {};
    var walletAddress = clean(wallet.wallet_address || wallet.walletAddress || profile.primary_wallet || profile.primaryWallet || fallbackProfile.primary_wallet || '');
    return {
      ok: data.ok !== false,
      profile: {
        id: clean(profile.id || profile.profile_id || profile.profileId || fallbackProfile.id || ''),
        dood_id: clean(profile.dood_id || profile.doodId || fallbackProfile.dood_id || ''),
        username: clean(profile.username || fallbackProfile.username || ''),
        display_name: clean(profile.display_name || profile.displayName || fallbackProfile.display_name || ''),
        avatar_url: clean(profile.avatar_url || profile.avatarUrl || fallbackProfile.avatar_url || ''),
        bio: clean(profile.bio || fallbackProfile.bio || ''),
        role_type: clean(profile.role_type || profile.roleType || fallbackProfile.role_type || ''),
        profile_complete: truthy(profile.profile_complete) || truthy(profile.profileComplete) || truthy(data.profile_complete) || truthy(data.profileComplete) || truthy(fallbackProfile.profile_complete) || truthy(fallbackProfile.profileComplete),
        primary_wallet: clean(profile.primary_wallet || profile.primaryWallet || fallbackProfile.primary_wallet || walletAddress)
      },
      wallet: {
        wallet_address: walletAddress || clean(fallbackSession.wallet && fallbackSession.wallet.wallet_address || ''),
        normalized_wallet_address: clean(wallet.normalized_wallet_address || wallet.normalizedWalletAddress || walletAddress || ''),
        chain: clean(wallet.chain || 'xrpl'),
        wallet_type: clean(wallet.wallet_type || wallet.walletType || getWalletType()),
        is_primary: wallet.is_primary !== false
      },
      fetched_at: new Date().toISOString(),
      source: data.ok === undefined && fallbackSession.profile ? 'dood_identity_session_fallback' : 'labApi GET /api/profile/me',
      bridge_version: 'V219'
    };
  }

  async function fetchProfileMe(force){
    var generation = syncGeneration;
    var requestedWallet = getLocalWallet();
    var session = safeJsonParse(localStorage.getItem(SESSION_KEY) || 'null');
    var sessionWallet = clean(session && session.wallet && session.wallet.wallet_address);
    if (!session || !session.profile || !session.profile.dood_id || force || (requestedWallet && lower(sessionWallet) !== lower(requestedWallet))) {
      session = await syncFromLabWallet();
      if (!session) return null;
      sessionWallet = clean(session && session.wallet && session.wallet.wallet_address);
      if (requestedWallet && lower(getLocalWallet()) === lower(requestedWallet) && lower(sessionWallet) === lower(requestedWallet)) {
        generation = syncGeneration;
      }
    }
    if (generation !== syncGeneration) return null;
    session = session || safeJsonParse(localStorage.getItem(SESSION_KEY) || 'null') || {};
    var walletAddress = clean((session.wallet && session.wallet.wallet_address) || getLocalWallet());
    var headers = profileMeHeaders();
    if (!headers.Authorization) {
      session = await syncFromLabWallet();
      headers = profileMeHeaders();
    }
    try {
      if (!headers.Authorization) throw new Error('No dood_identity_session.token. Reconnect wallet first.');
      var res = await fetch(LAB_API_BASE + '/api/profile/me', {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: headers
      });
      if (generation !== syncGeneration) return null;
      var text = '';
      try { text = await res.text(); } catch(e) {}
      var data = text ? safeJsonParse(text) : {};
      if (!data) data = { raw:text };
      if (!res.ok || data.ok === false) throw new Error(clean(data.error || data.message || data.raw || ('labApi Passport HTTP ' + res.status)));
      var profileMe = normalizeProfileMe(data, session);
      if (generation !== syncGeneration) return null;
      writeJson(PROFILE_ME_KEY, profileMe);
      removeKey(PROFILE_ME_ERROR_KEY);
      try { window.dispatchEvent(new CustomEvent('dood_identity_profile_me', { detail: profileMe })); } catch(e) {}
      return profileMe;
    } catch(err) {
      if (generation !== syncGeneration) return null;
      var fallback = normalizeProfileMe({}, session);
      writeJson(PROFILE_ME_KEY, fallback);
      writeJson(PROFILE_ME_ERROR_KEY, {
        ok:false,
        message: err && err.message ? err.message : String(err || 'Unknown profile/me error'),
        at: new Date().toISOString(),
        source:'dood-identity-v219',
        note:'Using dood_identity_session fallback until GET /api/profile/me is available to this browser.'
      });
      try { window.dispatchEvent(new CustomEvent('dood_identity_profile_me', { detail: fallback })); } catch(e) {}
      return fallback;
    }
  }

  async function getProfileMe(force){
    var cached = safeJsonParse(localStorage.getItem(PROFILE_ME_KEY) || 'null');
    var cachedAt = cached && cached.fetched_at ? Date.parse(cached.fetched_at) : 0;
    var cachedWallet = clean(cached && cached.wallet && cached.wallet.wallet_address);
    var currentWallet = getLocalWallet();
    if (!force && cached && cachedAt && currentWallet && lower(cachedWallet) === lower(currentWallet) && Date.now() - cachedAt < PROFILE_ME_TTL) return cached;
    if (profileMePromise) return profileMePromise;
    var generation = syncGeneration;
    var requestedWallet = currentWallet;
    var currentRequest = fetchProfileMe(!!force).then(function(result){
      if (!result) return null;
      var resultWallet = clean(result && result.wallet && result.wallet.wallet_address);
      if (requestedWallet) return lower(getLocalWallet()) === lower(requestedWallet) && lower(resultWallet) === lower(requestedWallet) ? result : null;
      return generation === syncGeneration ? result : null;
    }).finally(function(){
      if (profileMePromise === currentRequest) profileMePromise = null;
    });
    profileMePromise = currentRequest;
    return currentRequest;
  }

  async function syncFromLabWallet(){
    var generation = syncGeneration;
    var walletAddress = getLocalWallet();
    if (!walletAddress) {
      setError('No valid XRPL wallet address found in local app storage yet. Connect wallet first.');
      return null;
    }

    var current = safeJsonParse(localStorage.getItem(SESSION_KEY) || 'null');
    var previousWallet = clean((current && current.wallet && current.wallet.wallet_address) || lastWalletSynced);
    if (previousWallet && lower(previousWallet) !== lower(walletAddress)) {
      syncGeneration += 1;
      generation = syncGeneration;
      removeKey(PROFILE_ME_KEY);
      removeKey(PROFILE_ME_ERROR_KEY);
      profileMePromise = null;
      syncing = null;
    }
    var currentToken = clean(current && (current.token || current.access_token || current.accessToken || current.jwt || (current.session && (current.session.token || current.session.access_token || current.session.accessToken || current.session.jwt))) || '');
    if (current && currentToken && current.profile && current.profile.dood_id && current.wallet && lower(current.wallet.wallet_address) === lower(walletAddress)) {
      return current;
    }
    if (syncing) return syncing;

    var currentSync = (async function(){
      try {
        lastWalletSynced = walletAddress;
        var data = await postWalletConnect(walletAddress);
        if (generation !== syncGeneration) return null;
        var session = normalize(data, walletAddress);
        if (generation !== syncGeneration) return null;
        writeJson(SESSION_KEY, session);
        if (session.profile && session.profile.dood_id) clearError();
        else setError('labApi responded but did not return profile.dood_id.', data);
        try { window.dispatchEvent(new CustomEvent('dood_identity_synced', { detail: session })); } catch(e) {}
        try { setTimeout(function(){ if(generation === syncGeneration) getProfileMe(false).catch(function(){}); }, 150); } catch(e) {}
        return session;
      } catch(err) {
        if (generation !== syncGeneration) return null;
        setError(err && err.message ? err.message : String(err || 'Unknown labApi sync error'));
        return null;
      } finally {
        if (syncing === currentSync) syncing = null;
      }
    })();
    syncing = currentSync;
    return currentSync;
  }

  function scheduleSync(ms){
    try { setTimeout(function(){ syncFromLabWallet().catch(function(){}); }, ms || 0); } catch(e) {}
  }

  function allowedRole(value){
    value = lower(value);
    return ['collector','artist','both','explorer'].indexOf(value) !== -1 ? value : '';
  }

  async function patchProfileMe(fields){
    var generation = syncGeneration;
    var requestedWallet = getLocalWallet();
    fields = fields || {};
    var session = safeJsonParse(localStorage.getItem(SESSION_KEY) || 'null') || {};
    var headers = profileMeHeaders();
    var sessionWallet = clean(session && session.wallet && session.wallet.wallet_address);
    if (!headers.Authorization || (requestedWallet && lower(sessionWallet) !== lower(requestedWallet))) {
      session = await syncFromLabWallet();
      if (!session) return null;
      sessionWallet = clean(session && session.wallet && session.wallet.wallet_address);
      if (requestedWallet && lower(getLocalWallet()) === lower(requestedWallet) && lower(sessionWallet) === lower(requestedWallet)) generation = syncGeneration;
      headers = profileMeHeaders();
    }
    if (!headers.Authorization) throw new Error('No dood_identity_session.token. Connect wallet first.');

    // One Home shared profile source of truth: only these four editable fields.
    var role = allowedRole(fields.role_type);
    if (!role) throw new Error('Choose Collector, Artist, Both, or Explorer.');
    var payload = {
      display_name: clean(fields.display_name),
      avatar_url: clean(fields.avatar_url),
      bio: clean(fields.bio),
      role_type: role
    };
    headers['Content-Type'] = 'application/json';

    var res = await fetch(LAB_API_BASE + '/api/profile/me', {
      method: 'PATCH',
      mode: 'cors',
      credentials: 'omit',
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (generation !== syncGeneration) return null;
    var text = '';
    try { text = await res.text(); } catch(e) {}
    var data = text ? safeJsonParse(text) : {};
    if (!data) data = { raw:text };
    if (!res.ok || data.ok === false) {
      throw new Error(clean(data.error || data.message || data.raw || ('labApi Passport update HTTP ' + res.status)));
    }
    // Always re-read server state after a successful save.
    if (profileMePromise) {
      try { await profileMePromise; } catch(e) {}
      if (generation !== syncGeneration) return null;
    }
    return await getProfileMe(true);
  }

  window.DoodIdentity = {
    __v219IdentityBridge: true,
    LAB_API_BASE: LAB_API_BASE,
    SESSION_KEY: SESSION_KEY,
    LAST_ERROR_KEY: LAST_ERROR_KEY,
    PROFILE_ME_KEY: PROFILE_ME_KEY,
    PROFILE_ME_ERROR_KEY: PROFILE_ME_ERROR_KEY,
    getLocalWallet: getLocalWallet,
    getSession: function(){ return safeJsonParse(localStorage.getItem(SESSION_KEY) || 'null'); },
    clearSession: function(){
      syncGeneration += 1;
      [SESSION_KEY, LAST_ERROR_KEY, LAST_DEBUG_KEY, PROFILE_ME_KEY, PROFILE_ME_ERROR_KEY].forEach(function(key){
        try { localStorage.removeItem(key); } catch(e) {}
        try { sessionStorage.removeItem(key); } catch(e) {}
      });
      lastWalletSynced = '';
      syncing = null;
      profileMePromise = null;
    },
    getProfileMe: getProfileMe,
    patchProfileMe: patchProfileMe,
    syncFromLabWallet: syncFromLabWallet
  };

  // Passive only. No menu/button/layout patching.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ scheduleSync(800); scheduleSync(2500); scheduleSync(5500); });
  } else {
    scheduleSync(800); scheduleSync(2500); scheduleSync(5500);
  }

  var checks = 0;
  var timer = setInterval(function(){
    checks++;
    var wallet = getLocalWallet();
    if (wallet && lower(wallet) !== lower(lastWalletSynced)) scheduleSync(10);
    if (checks > 25) clearInterval(timer);
  }, 1000);

  window.addEventListener('focus', function(){ scheduleSync(500); });
  window.addEventListener('storage', function(e){
    if (e && /wallet/i.test(e.key || '')) scheduleSync(250);
  });
})();
