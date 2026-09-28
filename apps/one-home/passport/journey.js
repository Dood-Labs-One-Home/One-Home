/* One Home v14.53 — Passport single-source crisp Neon sync; verified participation preserved */
(function () {
  'use strict';
  if (window.__oneHomeJourneyV1403) return;
  window.__oneHomeJourneyV1403 = true;

  var VERSION = '14.51';
  var SUPABASE_URL = 'https://fshvettlltcujmwvikfq.supabase.co';
  var SUPABASE_ORIGIN = new URL(SUPABASE_URL).origin;
  var SUPABASE_KEY = 'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var ENDPOINT = SUPABASE_URL + '/functions/v1/onehome-journey';
  var GAME_KEY = 'smash-house';
  var QUALIFYING_EVENT = 'creation_saved';
  var activeParticipation = null;
  var startPromise = null;
  var passportCompletionPromise = null;
  var participationCompletionPromise = null;
  var participationReadyTimer = null;
  var participationLaunchNumber = 0;
  var inlineProfilePromise = null;
  var currentJourney = null;
  var cachedSession = null;
  var sessionPromise = null;
  var journeyLoadPromise = null;
  var journeyLoadedAt = 0;
  var JOURNEY_CACHE_TTL = 15000;
  var authGeneration = 0;
  var activeUserId = '';
  var inlineProfileDraft = { displayName: '', username: '' };
  var inlineProfileNotice = { message: '', type: '' };

  function q(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function formatDate(value) {
    if (!value) return 'Not yet';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }
  function client() {
    if (window.oneHomePassportSupabase && window.oneHomePassportSupabase.auth) return window.oneHomePassportSupabase;
    if (window.doodProfileSupabase && window.doodProfileSupabase.auth) return window.doodProfileSupabase;
    if (window.doodSupabase && window.doodSupabase.auth) return window.doodSupabase;
    if (window.supabaseClient && window.supabaseClient.auth) return window.supabaseClient;
    if (window.supabase && window.supabase.createClient) {
      window.oneHomeJourneySupabase = window.oneHomeJourneySupabase || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return window.oneHomeJourneySupabase;
    }
    return null;
  }
  function adoptSession(nextSession) {
    var nextUserId = nextSession && nextSession.user ? String(nextSession.user.id || '') : '';
    if (nextUserId !== activeUserId) {
      activeUserId = nextUserId;
      authGeneration += 1;
      currentJourney = null;
      journeyLoadedAt = 0;
      journeyLoadPromise = null;
    }
    cachedSession = nextSession && nextSession.access_token && nextSession.user ? nextSession : null;
    return cachedSession;
  }
  async function session() {
    if (cachedSession && cachedSession.access_token && cachedSession.user) return cachedSession;
    if (sessionPromise) return sessionPromise;
    var sb = client();
    if (!sb) return null;
    var requestedGeneration = authGeneration;
    sessionPromise = sb.auth.getSession().then(function (result) {
      if (requestedGeneration !== authGeneration) return cachedSession;
      return adoptSession(result && result.data ? result.data.session : null);
    }).catch(function () { return null; }).finally(function () { sessionPromise = null; });
    return sessionPromise;
  }
  async function request(action, payload, suppliedSession) {
    var activeSession = suppliedSession || await session();
    if (!activeSession || !activeSession.access_token || !activeSession.user) {
      throw new Error('Sign in to your One Home ID first.');
    }
    var response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + activeSession.access_token
      },
      body: JSON.stringify(Object.assign({ action: action }, payload || {}))
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.error) throw new Error(data.error || 'The Passport journey could not be loaded.');
    return data.data;
  }
  function showPage(id) {
    if (typeof window.oneHomeV15Show === 'function') window.oneHomeV15Show(id);
    else if (typeof window.safeShow === 'function') window.safeShow(id);
    else if (typeof window.showPage === 'function') window.showPage(id);
  }
  function openSignIn() {
    try { sessionStorage.setItem('onehome_passport_destination', 'onehome-start'); } catch (_error) {}
    if (typeof window.openOneHomePassportEntrance === 'function') window.openOneHomePassportEntrance('onehome-start');
    else showPage('onehomePassportEntrancePage');
  }
  function openProfile() { showPage('profilePage'); }
  function friendlyError(error) {
    var message = String(error && error.message || error || 'Please try again.');
    if (/PASSPORT_NOT_STARTED/i.test(message)) return 'Begin your Passport first.';
    if (/PASSPORT_PROFILE_INCOMPLETE/i.test(message)) return 'Your Passport still needs a display name and username.';
    if (/PASSPORT_NOT_COMPLETED/i.test(message)) return 'Complete your Passport before earning Participation Tickets.';
    if (/PARTICIPATION_SERVER_PROOF/i.test(message)) return 'One Home could not verify the saved Smash House creation.';
    if (/SMASH_HOUSE_(ARTWORK_IDS|FRAGMENT|CREATION|SERVER_HIT_PROOF)/i.test(message)) return 'One Home could not verify the saved Smash House artwork. Reset the game and start a fresh participation session.';
    return message.replace(/_/g, ' ');
  }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function normalizeUsername(value) {
    return clean(value).replace(/^@+/, '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  }
  function profileSaveError(error) {
    var message = String(error && error.message || error || 'Passport could not be saved.');
    var code = String(error && error.code || '');
    if (code === '23505' || /username.*unique|unique.*username|username.*already|dood_profiles_username/i.test(message)) {
      return 'That username is already taken. Choose another username.';
    }
    if (/row-level security|permission denied|not authorized|jwt|auth/i.test(message)) {
      return 'One Home could not save this Passport. Please retry. If it continues, send the exact error shown below.';
    }
    return message.replace(/_/g, ' ');
  }
  function setInlineProfileNotice(message, type) {
    inlineProfileNotice = { message: clean(message), type: type || '' };
    var status = q('oneHomeJourneyProfileStatus');
    if (!status) return;
    status.className = 'onehome-journey-form-status' + (type ? ' is-' + type : '');
    status.textContent = inlineProfileNotice.message;
    status.hidden = !inlineProfileNotice.message;
  }
  async function hydrateInlineProfile() {
    var journey = currentJourney && currentJourney.journey;
    if (!journey || journey.status === 'completed') return;
    var activeSession = await session();
    var sb = client();
    if (!activeSession || !activeSession.user || !sb) return;
    var result = await sb.from('dood_profiles')
      .select('display_name,username')
      .eq('user_id', activeSession.user.id)
      .maybeSingle();
    if (result.error && result.error.code !== 'PGRST116') throw result.error;
    if (result.data) {
      inlineProfileDraft.displayName = clean(result.data.display_name);
      inlineProfileDraft.username = clean(result.data.username);
    }
    var displayInput = q('oneHomeJourneyDisplayName');
    var usernameInput = q('oneHomeJourneyUsername');
    if (displayInput && document.activeElement !== displayInput) displayInput.value = inlineProfileDraft.displayName;
    if (usernameInput && document.activeElement !== usernameInput) usernameInput.value = inlineProfileDraft.username;
  }
  async function saveInlineProfileAndComplete() {
    if (inlineProfilePromise) return inlineProfilePromise;
    inlineProfilePromise = (async function () {
      var displayInput = q('oneHomeJourneyDisplayName');
      var usernameInput = q('oneHomeJourneyUsername');
      var button = q('oneHomeJourneySaveComplete');
      var displayName = clean(displayInput && displayInput.value);
      var username = normalizeUsername(usernameInput && usernameInput.value);
      inlineProfileDraft.displayName = displayName;
      inlineProfileDraft.username = username;
      if (!displayName) {
        setInlineProfileNotice('Enter your Display Name.', 'error');
        if (displayInput) displayInput.focus();
        return null;
      }
      if (!username) {
        setInlineProfileNotice('Enter your Username.', 'error');
        if (usernameInput) usernameInput.focus();
        return null;
      }
      var activeSession = await session();
      var sb = client();
      if (!activeSession || !activeSession.user || !sb) throw new Error('Sign in to your One Home ID first.');
      if (button) { button.disabled = true; button.textContent = 'Saving…'; }
      setInlineProfileNotice('Saving your Passport profile…', '');
      // Reuse the existing protected profile-save RPC instead of writing
      // directly to dood_profiles from the browser. The RPC is the same
      // server path used by the working full profile builder.
      var existingResult = await sb.from('dood_profiles')
        .select('*')
        .eq('user_id', activeSession.user.id)
        .maybeSingle();
      if (existingResult.error && existingResult.error.code !== 'PGRST116') throw existingResult.error;
      var existing = existingResult.data || {};
      // Keep the Passport front door limited to the two approved fields.
      // Existing optional profile data is copied only when it already exists;
      // a new Passport is not silently published or assigned a profile type.
      var payload = {
        user_id: activeSession.user.id,
        email: existing.email || activeSession.user.email || null,
        display_name: displayName,
        username: username,
        account_identity_type: existing.account_identity_type || 'email_only',
        status: existing.status || 'draft',
        is_public: existing.is_public === true,
        updated_at: new Date().toISOString()
      };
      if (existing.id) payload.id = existing.id;
      [
        'wallet_address','wallet_provider','wallet_connected_at','wallet_verified',
        'profile_type','bio','location','website_url','profile_pic_url','banner_url',
        'creator_categories','featured_project','current_build','nft_collection',
        'physical_collection','collab_status','reviewer_notes','owned_collections',
        'wishlist','favorite_artists','favorite_collections','sticker_collection',
        'rare_ink_collection'
      ].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(existing, key)) payload[key] = existing[key];
      });

      var saved = await sb.rpc('save_dood_profile_flexible', { profile_payload: payload });
      if (saved.error && /save_dood_profile_flexible/i.test(String(saved.error.message || ''))) {
        saved = await sb.rpc('save_dood_profile', { profile_payload: payload });
      }
      if (saved.error) throw saved.error;

      var verified = await sb.from('dood_profiles')
        .select('user_id,display_name,username')
        .eq('user_id', activeSession.user.id)
        .maybeSingle();
      if (verified.error) throw verified.error;
      if (!verified.data || verified.data.user_id !== activeSession.user.id || clean(verified.data.display_name) !== displayName || normalizeUsername(verified.data.username) !== username) {
        throw new Error('Passport save could not be verified.');
      }
      setInlineProfileNotice('Passport saved. Completing your Passport…', 'success');
      await request('complete_passport');
      inlineProfileNotice = { message: "You’re Home. Your Welcome Home Stamp and permanent Welcome Home Ticket are saved.", type: 'success' };
      var data = await request('get_journey');
      renderJourney(data);
      journeyLoadedAt = Date.now();
      return data;
    })().catch(function (error) {
      setInlineProfileNotice(profileSaveError(error), 'error');
      var button = q('oneHomeJourneySaveComplete');
      if (button) { button.disabled = false; button.textContent = 'Save & Complete My Passport'; }
      return null;
    }).finally(function () { inlineProfilePromise = null; });
    return inlineProfilePromise;
  }
  function ensureJourneyPage() {
    if (q('onehomePassportJourneyPage')) return q('onehomePassportJourneyPage');
    var main = q('top') || document.querySelector('main');
    if (!main) return null;
    var page = document.createElement('div');
    page.className = 'page-view';
    page.id = 'onehomePassportJourneyPage';
    page.setAttribute('aria-label', 'My One Home Passport journey');
    page.innerHTML = '<section class="onehome-journey-shell">' +
      '<div class="onehome-journey-hero"><p class="onehome-journey-eyebrow">One Home Private Passport</p><h1>MY PASSPORT</h1><p>Begin your Passport, add your display name and username, and keep your journey saved to your One Home ID.</p></div>' +
      '<div id="oneHomeJourneyContent" class="onehome-journey-grid"><article class="onehome-journey-card"><h2>Loading Passport…</h2><p>Please wait while One Home retrieves your saved journey.</p></article></div>' +
      '</section>';
    main.appendChild(page);
    return page;
  }
  function ensureEntryChoiceButton() {
    if (q('oneHomeJourneyChoiceButton')) return;
    var panel = document.querySelector('#onehomeEntryChoicePage .passport-choice-panel');
    if (!panel) return;
    var button = document.createElement('button');
    button.id = 'oneHomeJourneyChoiceButton';
    button.className = 'onehome-journey-button secondary';
    button.type = 'button';
    button.textContent = 'Open My Passport';
    button.addEventListener('click', window.oneHomeJourneyOpenPassport);
    panel.appendChild(button);
  }
  function ensureStartCard() {
    var page = q('onehomeStartHerePage');
    if (!page || q('oneHomeJourneyStartCard')) return;
    var section = page.querySelector('.onehome-v15-section') || page;
    var card = document.createElement('article');
    card.id = 'oneHomeJourneyStartCard';
    card.className = 'onehome-journey-inline-card';
    card.innerHTML = '<h3>My Passport Journey</h3><p id="oneHomeJourneyStartSummary">Sign in to view or begin your Passport.</p><button class="onehome-journey-button" type="button">Open My Passport</button>';
    card.querySelector('button').addEventListener('click', window.oneHomeJourneyOpenPassport);
    section.insertBefore(card, section.firstChild);
  }
  function ensureLiveStatus() {
    var page = q('liveFramePage');
    if (!page) return null;
    var status = q('oneHomeParticipationStatus');
    if (!status) {
      status = document.createElement('div');
      status.id = 'oneHomeParticipationStatus';
      status.className = 'onehome-participation-status';
      var frame = q('liveFrame');
      if (frame && frame.parentNode) frame.parentNode.insertBefore(status, frame);
      else page.insertBefore(status, page.firstChild);
    }
    return status;
  }
  function setParticipationStatus(title, copy, type) {
    var status = ensureLiveStatus();
    if (!status) return;
    status.className = 'onehome-participation-status is-visible' + (type ? ' is-' + type : '');
    status.innerHTML = '<strong>' + esc(title) + '</strong><span>' + esc(copy) + '</span>';
  }
  /* Passport Neon is intentionally scoped to this page only. Older builds could leave
     !important inline Neon values on Passport buttons. The site-wide picker also
     stops click propagation on each swatch, so bubble listeners could miss a color
     change. This one capture-phase sync reads the picker's current root variables,
     removes legacy Neon markers/properties from Passport buttons, and reapplies a
     crisp no-glow color. */
  function syncPassportNeonButtons() {
    var page = q('onehomePassportJourneyPage');
    if (!page) return;
    var rootStyle = getComputedStyle(document.documentElement);
    var color = String(rootStyle.getPropertyValue('--onehome-neon') || '#ff2bd6').trim() || '#ff2bd6';
    var rgb = String(rootStyle.getPropertyValue('--onehome-neon-rgb') || '255,43,214').trim() || '255,43,214';
    Array.prototype.forEach.call(page.querySelectorAll('.onehome-journey-button'), function (button) {
      button.classList.remove('onehome-user-neon');
      button.removeAttribute('data-onehome-user-neon');
      ['color','border-color','background','text-shadow','box-shadow','filter','outline-color','--accent','--accent-glow'].forEach(function (name) {
        button.style.removeProperty(name);
      });
      button.style.setProperty('color', color, 'important');
      button.style.setProperty('border-color', color, 'important');
      button.style.setProperty('background', 'rgba(' + rgb + ',.10)', 'important');
      button.style.setProperty('text-shadow', 'none', 'important');
      button.style.setProperty('box-shadow', 'none', 'important');
      button.style.setProperty('filter', 'none', 'important');
    });
  }
  function queuePassportNeonSync() {
    var run = function () { syncPassportNeonButtons(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  function renderJourney(data) {
    currentJourney = data || {};
    var content = q('oneHomeJourneyContent');
    if (!content) return;
    var journey = currentJourney.journey || null;
    var started = !!journey;
    var completed = !!(journey && journey.status === 'completed');
    var stamps = Array.isArray(currentJourney.stamps) ? currentJourney.stamps : [];
    var tickets = Array.isArray(currentJourney.tickets) ? currentJourney.tickets : [];
    var activities = Array.isArray(currentJourney.activities) ? currentJourney.activities : [];
    var welcomeStamp = stamps.find(function (item) { return item.stamp_key === 'welcome_home'; });
    var welcomeTicket = tickets.find(function (item) { return item.ticket_type === 'welcome_home' || item.ticket_key === 'welcome_home'; });
    var participationTickets = tickets.filter(function (item) { return item.ticket_type === 'participation'; });

    function newestFirst(items, dateFields) {
      return items.slice().sort(function (a, b) {
        function stamp(item) {
          for (var i = 0; i < dateFields.length; i += 1) {
            var value = item && item[dateFields[i]];
            if (!value) continue;
            var parsed = Date.parse(value);
            if (Number.isFinite(parsed)) return parsed;
          }
          return 0;
        }
        return stamp(b) - stamp(a);
      });
    }
    function activityLabel(activity) {
      return activity.game_key === GAME_KEY ? 'Smash House — verified creation saved' : (activity.game_key || 'Participation');
    }

    var sortedParticipationTickets = newestFirst(participationTickets, ['granted_at', 'created_at', 'earned_date']);
    var sortedActivities = newestFirst(activities, ['completed_at', 'created_at', 'activity_date']);

    var ticketHtml = sortedParticipationTickets.length ? sortedParticipationTickets.map(function (ticket) {
      return '<div class="onehome-journey-ticket"><div><strong>' + esc(ticket.ticket_name || 'Participation Ticket') + '</strong><small>' + esc(ticket.earned_date || formatDate(ticket.granted_at || ticket.created_at)) + '</small></div><span>' + esc(ticket.status || 'active') + '</span></div>';
    }).join('') : '<p class="onehome-journey-empty">No Participation Tickets earned yet.</p>';

    var recentTicketHtml = sortedParticipationTickets.length ? sortedParticipationTickets.slice(0, 3).map(function (ticket) {
      return '<div class="onehome-journey-recent-item"><strong>' + esc(ticket.ticket_name || 'Participation Ticket') + '</strong><small>' + esc(ticket.earned_date || formatDate(ticket.granted_at || ticket.created_at)) + '</small></div>';
    }).join('') : '<p class="onehome-journey-empty onehome-journey-recent-empty">No Participation Tickets earned yet.</p>';

    var activityHtml = sortedActivities.length ? '<ul>' + sortedActivities.slice(0, 10).map(function (activity) {
      return '<li>' + esc(activityLabel(activity)) + ' · ' + esc(activity.activity_date || formatDate(activity.completed_at || activity.created_at)) + '</li>';
    }).join('') + '</ul>' : '<p class="onehome-journey-empty">No qualifying participation recorded yet.</p>';

    var recentActivityHtml = sortedActivities.length ? sortedActivities.slice(0, 3).map(function (activity) {
      return '<div class="onehome-journey-recent-item"><strong>' + esc(activityLabel(activity)) + '</strong><small>' + esc(activity.activity_date || formatDate(activity.completed_at || activity.created_at)) + '</small></div>';
    }).join('') : '<p class="onehome-journey-empty onehome-journey-recent-empty">No qualifying participation recorded yet.</p>';

    var passportActions = '';
    if (!started) {
      passportActions = '<button class="onehome-journey-button" id="oneHomeJourneyBegin" type="button">Begin My Passport</button>';
    } else if (!completed) {
      passportActions = '<form class="onehome-journey-profile-form" id="oneHomeJourneyProfileForm" novalidate>' +
        '<div class="onehome-journey-field"><label for="oneHomeJourneyDisplayName">Display Name</label><input id="oneHomeJourneyDisplayName" name="display_name" type="text" maxlength="80" autocomplete="name" value="' + esc(inlineProfileDraft.displayName) + '" placeholder="What should we call you?" required></div>' +
        '<div class="onehome-journey-field"><label for="oneHomeJourneyUsername">Username</label><div class="onehome-journey-username"><span aria-hidden="true">@</span><input id="oneHomeJourneyUsername" name="username" type="text" maxlength="40" autocomplete="username" autocapitalize="none" spellcheck="false" value="' + esc(inlineProfileDraft.username) + '" placeholder="yourname" required></div></div>' +
        '<p class="onehome-journey-form-help">Bio and Passport Image are optional. You can customize them later.</p>' +
        '<div id="oneHomeJourneyProfileStatus" class="onehome-journey-form-status' + (inlineProfileNotice.type ? ' is-' + esc(inlineProfileNotice.type) : '') + '" role="status" aria-live="polite"' + (inlineProfileNotice.message ? '' : ' hidden') + '>' + esc(inlineProfileNotice.message) + '</div>' +
        '<button class="onehome-journey-button onehome-journey-save-complete" id="oneHomeJourneySaveComplete" type="submit">Save & Complete My Passport</button>' +
        '</form>';
    } else {
      passportActions = '<div class="onehome-journey-complete-actions"><p class="onehome-journey-home-message">You’re Home.</p><button class="onehome-journey-button" id="oneHomeJourneyCustomizeProfile" type="button">Customize My Passport</button></div>';
    }

    content.innerHTML =
      '<article class="onehome-journey-card onehome-journey-card-passport">' +
        '<div class="onehome-journey-card-title"><h2>Passport</h2><span class="onehome-journey-status-chip">' + (completed ? 'Complete' : started ? 'Started' : 'Not started') + '</span></div>' +
        '<div class="onehome-journey-passport-meta">' +
          '<div class="onehome-journey-meta-item"><span>Owner</span><strong>Your authenticated One Home ID</strong></div>' +
          '<div class="onehome-journey-meta-item"><span>Activated</span><strong>' + esc(started ? formatDate(journey.activated_at) : 'Not yet') + '</strong></div>' +
          '<div class="onehome-journey-meta-item"><span>Completed</span><strong>' + esc(completed ? formatDate(journey.completed_at) : 'Not yet') + '</strong></div>' +
        '</div>' + passportActions +
      '</article>' +
      '<article class="onehome-journey-card onehome-journey-card-stamp"><div class="onehome-journey-card-title"><h2>Welcome Home Stamp</h2></div><p>' + esc(welcomeStamp ? ('Granted ' + formatDate(welcomeStamp.granted_at)) : 'Not received') + '</p></article>' +
      '<article class="onehome-journey-card onehome-journey-card-ticket"><div class="onehome-journey-card-title"><h2>Welcome Home Ticket</h2></div><p>' + esc(welcomeTicket ? ('Collected ' + formatDate(welcomeTicket.granted_at || welcomeTicket.created_at)) : 'Not received') + '</p></article>' +
      '<article class="onehome-journey-card onehome-journey-dropdown-card onehome-journey-card-participation"><details class="onehome-journey-details"><summary><h2>Participation Tickets</h2><div class="onehome-journey-recent-preview" aria-label="Most recent Participation Tickets">' + recentTicketHtml + '</div></summary><div class="onehome-journey-details-body">' + ticketHtml + '</div></details></article>' +
      '<article class="onehome-journey-card onehome-journey-dropdown-card onehome-journey-card-history"><details class="onehome-journey-details"><summary><h2>Participation History</h2><div class="onehome-journey-recent-preview" aria-label="Most recent Participation History">' + recentActivityHtml + '</div></summary><div class="onehome-journey-details-body">' + activityHtml + '</div></details></article>' +
      '<article class="onehome-journey-card onehome-journey-card-initial"><div class="onehome-journey-card-title"><h2>Initial Loop</h2></div><div class="onehome-journey-initial-row"><p>Qualifying action: break an item and save the resulting creation.</p><button class="onehome-journey-button" id="oneHomeJourneyPlaySmash" type="button"' + (completed ? '' : ' disabled aria-disabled="true"') + '>Play Smash House</button></div></article>';

    queuePassportNeonSync();
    var begin = q('oneHomeJourneyBegin');
    if (begin) begin.addEventListener('click', function () { startPassport(true); });
    var form = q('oneHomeJourneyProfileForm');
    if (form) {
      form.addEventListener('input', function () {
        var displayInput = q('oneHomeJourneyDisplayName');
        var usernameInput = q('oneHomeJourneyUsername');
        inlineProfileDraft.displayName = clean(displayInput && displayInput.value);
        inlineProfileDraft.username = normalizeUsername(usernameInput && usernameInput.value);
      });
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        saveInlineProfileAndComplete();
      });
      hydrateInlineProfile().catch(function (error) { setInlineProfileNotice(profileSaveError(error), 'error'); });
    }
    var customize = q('oneHomeJourneyCustomizeProfile');
    if (customize) customize.addEventListener('click', openProfile);
    var play = q('oneHomeJourneyPlaySmash');
    if (play && completed) play.addEventListener('click', function () { window.oneHomeJourneyOpenGame(GAME_KEY); });
    updateSummary();
  }
  function updateSummary() {
    var summary = q('oneHomeJourneyStartSummary');
    if (!summary) return;
    var journey = currentJourney && currentJourney.journey;
    if (!journey) {
      summary.textContent = 'Sign in to view or begin your Passport.';
      return;
    }
    if (journey.status !== 'completed') {
      summary.textContent = 'Passport started · add your display name and username to receive Welcome Home rewards.';
      return;
    }
    var tickets = Array.isArray(currentJourney.tickets) ? currentJourney.tickets : [];
    var participationCount = tickets.filter(function (item) { return item.ticket_type === 'participation'; }).length;
    summary.textContent = 'Passport complete · permanent Welcome Home Ticket saved · ' + participationCount + ' Participation Ticket' + (participationCount === 1 ? '' : 's') + ' earned.';
  }
  async function startPassport(showResult) {
    if (startPromise) return startPromise;
    startPromise = (async function () {
      await request('start_passport');
      var data = await request('get_journey');
      renderJourney(data);
      journeyLoadedAt = Date.now();
      if (showResult) alert('Your Passport has started. Enter your Display Name and Username below to finish it.');
      return data;
    })().catch(function (error) {
      if (showResult) alert('Passport could not start: ' + friendlyError(error));
      throw error;
    }).finally(function () { startPromise = null; });
    return startPromise;
  }
  async function completePassport(showResult) {
    if (passportCompletionPromise) return passportCompletionPromise;
    passportCompletionPromise = (async function () {
      await request('complete_passport');
      var data = await request('get_journey');
      renderJourney(data);
      journeyLoadedAt = Date.now();
      if (showResult) alert('Passport complete. Your Welcome Home Stamp and permanent Welcome Home Ticket are saved.');
      return data;
    })().catch(function (error) {
      if (showResult) alert('Passport is not complete yet: ' + friendlyError(error));
      throw error;
    }).finally(function () { passportCompletionPromise = null; });
    return passportCompletionPromise;
  }
  async function loadJourney(force, suppliedSession) {
    var activeSession = suppliedSession ? adoptSession(suppliedSession) : await session();
    if (!activeSession || !activeSession.user) {
      currentJourney = null;
      journeyLoadedAt = 0;
      updateSummary();
      return null;
    }
    if (!force && currentJourney && Date.now() - journeyLoadedAt < JOURNEY_CACHE_TTL) {
      renderJourney(currentJourney);
      return currentJourney;
    }
    if (journeyLoadPromise) return journeyLoadPromise;
    var requestedGeneration = authGeneration;
    var requestedUserId = String(activeSession.user.id || '');
    var currentLoad = request('get_journey', null, activeSession).then(function (data) {
      if (requestedGeneration !== authGeneration || requestedUserId !== activeUserId) return null;
      renderJourney(data || {});
      journeyLoadedAt = Date.now();
      return data;
    }).finally(function () { if (journeyLoadPromise === currentLoad) journeyLoadPromise = null; });
    journeyLoadPromise = currentLoad;
    return currentLoad;
  }
  window.oneHomeJourneyOpenPassport = async function () {
    ensureJourneyPage();
    var activeSession = await session();
    if (!activeSession || !activeSession.user) {
      openSignIn();
      return;
    }
    showPage('onehomePassportJourneyPage');
    var content = q('oneHomeJourneyContent');
    if (content && (!currentJourney || Date.now() - journeyLoadedAt >= JOURNEY_CACHE_TTL)) content.innerHTML = '<article class="onehome-journey-card"><h2>Loading Passport…</h2><p>Please wait while One Home retrieves your saved journey.</p></article>';
    try { await loadJourney(false, activeSession); }
    catch (error) {
      if (content) content.innerHTML = '<article class="onehome-journey-card"><h2>Passport could not load</h2><p>' + esc(friendlyError(error)) + '</p></article>';
    }
  };
  var participationReportedHeight = 0;
  function participationViewportHeight() {
    var viewport = window.visualViewport;
    var height = viewport && Number(viewport.height) > 0 ? Number(viewport.height) : Number(window.innerHeight || 0);
    return height > 0 ? height : 720;
  }
  function rememberParticipationFrameHeight(value) {
    var height = Number(value || 0);
    if (Number.isFinite(height) && height >= 320 && height <= 6000) {
      participationReportedHeight = Math.ceil(height);
    }
  }
  function fitParticipationGameFrame() {
    var frame = q('liveFrame');
    if (!frame || frame.getAttribute('data-onehome-smash-fit') !== 'true') return;
    var wrap = frame.closest('.live-frame-wrap');
    if (!wrap) return;
    var mobile = !!(window.matchMedia && window.matchMedia('(max-width: 700px)').matches);

    /* Smash House uses one page scrollbar on every screen size. The verified
       game reports its intrinsic content height and the iframe expands to match
       it, so desktop and mobile do not need a second scrollbar inside the game. */
    if (participationReportedHeight >= 320) {
      var contentHeight = participationReportedHeight + 2;
      wrap.style.height = contentHeight + 'px';
      wrap.style.minHeight = '0';
      wrap.style.maxHeight = 'none';
      wrap.style.overflow = 'visible';
      frame.style.height = contentHeight + 'px';
      frame.style.minHeight = '0';
      frame.style.maxHeight = 'none';
      frame.style.overflow = 'hidden';
      frame.setAttribute('scrolling', 'no');
      return;
    }

    /* Before the child sends its first size report, use the prior fitted frame
       only as a temporary loading fallback. */
    var viewportHeight = participationViewportHeight();
    var rect = wrap.getBoundingClientRect();
    var top = rect && Number.isFinite(rect.top) ? rect.top : frame.getBoundingClientRect().top;
    var bottomSpace = mobile ? 8 : 12;
    var fallbackRatio = mobile ? 0.80 : 0.84;
    var available = Math.floor(viewportHeight - Math.max(0, top) - bottomSpace);
    if (!Number.isFinite(available) || available < 320) {
      available = Math.floor(viewportHeight * fallbackRatio);
    }
    var fitted = Math.max(320, Math.min(Math.floor(viewportHeight - bottomSpace), available));
    wrap.style.height = fitted + 'px';
    wrap.style.minHeight = '320px';
    wrap.style.maxHeight = fitted + 'px';
    wrap.style.overflow = 'hidden';
    frame.style.height = '100%';
    frame.style.minHeight = '0';
    frame.style.maxHeight = '100%';
    frame.style.overflow = 'auto';
    frame.setAttribute('scrolling', 'yes');
  }
  function releaseParticipationGameFrame() {
    participationReportedHeight = 0;
    var frame = q('liveFrame');
    if (!frame) return;
    var wrap = frame.closest('.live-frame-wrap');
    var external = q('liveFrameExternal');
    frame.removeAttribute('srcdoc');
    frame.removeAttribute('data-onehome-smash-fit');
    frame.removeAttribute('referrerpolicy');
    frame.src = 'about:blank';
    ['height','min-height','max-height','overflow'].forEach(function (name) { frame.style.removeProperty(name); });
    frame.setAttribute('scrolling', 'yes');
    if (wrap) ['height','min-height','max-height','overflow'].forEach(function (name) { wrap.style.removeProperty(name); });
    if (external) {
      external.hidden = false;
      external.style.removeProperty('display');
    }
  }
  window.oneHomeJourneyReleaseGameFrame = releaseParticipationGameFrame;
  function isVerifiedGameUrl(value, sessionId) {
    try {
      var url = new URL(String(value || ''));
      var endpoint = new URL(ENDPOINT);
      return url.protocol === 'https:' &&
        url.origin === SUPABASE_ORIGIN &&
        url.pathname === endpoint.pathname &&
        url.searchParams.get('mode') === GAME_KEY &&
        url.searchParams.get('session_id') === String(sessionId || '') &&
        /^[0-9a-f]{64}$/i.test(url.searchParams.get('launch_token') || '');
    } catch (_error) {
      return false;
    }
  }
  function openVerifiedGameDocument(title, html, returnPage, backLabel) {
    var frame = q('liveFrame');
    if (!frame) throw new Error('SMASH_HOUSE_GAME_FRAME_NOT_FOUND');
    var heading = q('liveFrameTitle');
    var external = q('liveFrameExternal');
    var backButton = q('liveFrameBackDistrict');
    var wrap = frame.closest('.live-frame-wrap');
    if (heading) heading.textContent = title;
    if (external) {
      external.hidden = true;
      external.removeAttribute('href');
      external.style.setProperty('display', 'none', 'important');
    }
    if (backButton) backButton.textContent = backLabel || '← Back';
    if (wrap) ['height','min-height','max-height','overflow'].forEach(function (name) { wrap.style.removeProperty(name); });
    ['height','min-height','max-height','overflow'].forEach(function (name) { frame.style.removeProperty(name); });
    participationReportedHeight = 0;
    frame.setAttribute('data-onehome-smash-fit', 'true');
    frame.setAttribute('scrolling', 'yes');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.removeAttribute('srcdoc');
    frame.src = 'about:blank';
    frame.srcdoc = html;
    if (typeof window.__oneHomeSetLiveFrameReturnPage === 'function') {
      window.__oneHomeSetLiveFrameReturnPage(returnPage || 'arcadePage');
    }
    showPage('liveFramePage');
    requestAnimationFrame(function () {
      fitParticipationGameFrame();
      setTimeout(fitParticipationGameFrame, 120);
      setTimeout(fitParticipationGameFrame, 600);
    });
  }
  function verifiedGameDocument(html) {
    var source = String(html || '');
    return /<!doctype\s+html/i.test(source) &&
      /<html[\s>]/i.test(source) &&
      source.indexOf('<base href="https://rare-ink-studio.github.io/Smash-House/">') !== -1 &&
      source.indexOf('onehome:participation-game-ready') !== -1 &&
      source.indexOf('function oneHomeBridgeRequest') !== -1 &&
      source.indexOf('onehome:participation-bridge-request') !== -1 &&
      source.indexOf('function oneHomeRecordSmashHit') !== -1 &&
      source.indexOf('oneHomeSaveVerifiedCreation') !== -1 &&
      source.indexOf('test.crossOrigin = "anonymous"') !== -1 &&
      source.indexOf('image.crossOrigin = "anonymous"') !== -1;
  }
  window.oneHomeJourneyOpenGame = async function (gameKey) {
    if (gameKey !== GAME_KEY) return;
    var activeSession = await session();
    if (!activeSession || !activeSession.user) {
      openSignIn();
      return;
    }
    var thisLaunch = ++participationLaunchNumber;
    if (participationReadyTimer) {
      clearTimeout(participationReadyTimer);
      participationReadyTimer = null;
    }
    try {
      setParticipationStatus('Opening verified Smash House…', 'One Home is creating a protected participation session.', '');
      var participation = await request('start_participation', {
        game_key: GAME_KEY,
        qualifying_event: QUALIFYING_EVENT
      });
      if (!participation || !participation.id || !participation.game_url) throw new Error('The verified participation session did not start.');
      if (!isVerifiedGameUrl(participation.game_url, participation.id)) throw new Error('SMASH_HOUSE_GAME_URL_INVALID');
      activeParticipation = {
        sessionId: participation.id,
        gameKey: GAME_KEY,
        qualifyingEvent: QUALIFYING_EVENT,
        gameUrl: participation.game_url,
        startedAt: participation.started_at || new Date().toISOString()
      };
      try { sessionStorage.setItem('onehome_active_participation_session', JSON.stringify(activeParticipation)); } catch (_error) {}
      setParticipationStatus('Loading verified Smash House…', 'One Home is preparing the protected game document.', '');
      var gameResponse = await fetch(participation.game_url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit',
        headers: { Accept: 'application/json' }
      });
      var gamePayload = await gameResponse.json().catch(function () { return null; });
      if (!gameResponse.ok || !gamePayload || gamePayload.error) {
        throw new Error(gamePayload && gamePayload.error || ('SMASH_HOUSE_HTTP_' + gameResponse.status));
      }
      var gameHtml = gamePayload && gamePayload.data && gamePayload.data.game_html;
      if (!verifiedGameDocument(gameHtml)) throw new Error('SMASH_HOUSE_PLAYABLE_DOCUMENT_INVALID');
      openVerifiedGameDocument(
        'Smash House',
        gameHtml,
        'arcadePage',
        '← Back to Rollies Arcade'
      );
      participationReadyTimer = setTimeout(function () {
        if (thisLaunch !== participationLaunchNumber || !activeParticipation || activeParticipation.sessionId !== participation.id) return;
        setParticipationStatus(
          'Smash House could not open securely',
          'Return to My Passport and try Play Smash House again. Opening the public game does not count as verified participation.',
          'error'
        );
      }, 12000);
    } catch (error) {
      releaseParticipationGameFrame();
      activeParticipation = null;
      try { sessionStorage.removeItem('onehome_active_participation_session'); } catch (_error) {}
      setParticipationStatus('Participation could not start', friendlyError(error), 'error');
      alert('Participation could not start: ' + friendlyError(error));
    }
  };
  function enableSmashHouseFreePlay(frame, sessionId, ticketAwarded) {
    if (!frame || !frame.contentWindow || !sessionId) return false;
    try {
      frame.contentWindow.postMessage({
        type: 'onehome:participation-free-play',
        version: VERSION,
        gameKey: GAME_KEY,
        qualifyingEvent: QUALIFYING_EVENT,
        sessionId: sessionId,
        ticketAwarded: ticketAwarded === true
      }, window.location.origin);
      return true;
    } catch (_error) {
      return false;
    }
  }
  async function completeParticipation(detail) {
    if (participationCompletionPromise) return participationCompletionPromise;
    participationCompletionPromise = (async function () {
      if (!activeParticipation || detail.sessionId !== activeParticipation.sessionId || !detail.proofId) return;
      setParticipationStatus('Saved creation verified', 'Saving your Participation Ticket to your Passport…', '');
      var result = await request('complete_participation', {
        session_id: activeParticipation.sessionId,
        proof_id: detail.proofId
      });
      var ticketAwarded = !!(result && result.ticket_awarded);
      var completedSessionId = activeParticipation.sessionId;
      var frame = q('liveFrame');
      if (ticketAwarded) {
        setParticipationStatus('Participation Ticket earned', 'Today’s ticket is saved to your One Home Passport. Keep playing Smash House as much as you like.', 'success');
      } else {
        setParticipationStatus('Today’s ticket is already saved', 'Your daily reward is protected. Keep playing Smash House as much as you like.', 'success');
      }
      // The verified daily participation session is complete, but the game
      // itself must remain open. Switch the already-loaded Smash House iframe
      // to local free play instead of clearing it to about:blank.
      enableSmashHouseFreePlay(frame, completedSessionId, ticketAwarded);
      try { sessionStorage.removeItem('onehome_active_participation_session'); } catch (_error) {}
      activeParticipation = null;
      await loadJourney(true);
    })().catch(function (error) {
      setParticipationStatus('Ticket could not be saved', friendlyError(error), 'error');
    }).finally(function () { participationCompletionPromise = null; });
    return participationCompletionPromise;
  }
  function restoreActiveParticipation() {
    try {
      var saved = JSON.parse(sessionStorage.getItem('onehome_active_participation_session') || 'null');
      if (saved && saved.sessionId && saved.gameKey === GAME_KEY && saved.gameUrl) activeParticipation = saved;
    } catch (_error) {}
  }
  function smashHousePlayControl(target) {
    if (!target || !target.closest) return null;
    var control = target.closest('button,a');
    if (!control || !control.closest('#arcadePage')) return null;
    var label = String(control.textContent || '').trim();
    if (!/Play Game/i.test(label)) return null;
    var card = control.closest('.game-card,article,.card,[data-live-arcade-game]');
    var context = String((card && card.textContent) || control.getAttribute('onclick') || '');
    return /Smash House/i.test(context) ? control : null;
  }
  function markSmashHouseButtons() {
    Array.from(document.querySelectorAll('#arcadePage button,#arcadePage a')).forEach(function (control) {
      if (!smashHousePlayControl(control)) return;
      control.setAttribute('data-onehome-participation-game', GAME_KEY);
    });
  }
  function connectSmashHouseButtons() {
    if (window.__oneHomeSmashHouseDelegationBound) {
      markSmashHouseButtons();
      return;
    }
    window.__oneHomeSmashHouseDelegationBound = true;
    document.addEventListener('click', function (event) {
      var control = smashHousePlayControl(event.target);
      if (!control) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      window.oneHomeJourneyOpenGame(GAME_KEY);
    }, true);
    markSmashHouseButtons();
    var arcade = q('arcadePage');
    if (arcade && window.MutationObserver) {
      new MutationObserver(function () { markSmashHouseButtons(); }).observe(arcade, { childList: true, subtree: true });
    }
  }
  function bindAuth() {
    var sb = client();
    if (!sb || !sb.auth || !sb.auth.onAuthStateChange || window.__oneHomeJourneyAuthBound) return;
    window.__oneHomeJourneyAuthBound = true;
    sb.auth.onAuthStateChange(function (event, authSession) {
      adoptSession(authSession || null);
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && authSession && authSession.user) {
        if (q('onehomePassportJourneyPage')?.classList.contains('active')) {
          setTimeout(function () { loadJourney(true, authSession).catch(function () {}); }, 50);
        }
      }
      if (event === 'SIGNED_OUT') {
        cachedSession = null;
        sessionPromise = null;
        journeyLoadPromise = null;
        journeyLoadedAt = 0;
        currentJourney = null;
        activeParticipation = null;
        releaseParticipationGameFrame();
        try { sessionStorage.removeItem('onehome_active_participation_session'); } catch (_error) {}
        updateSummary();
      }
    });
  }
  function postParticipationBridgeResponse(frame, detail, response) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage(Object.assign({
      type: 'onehome:participation-bridge-response',
      gameKey: GAME_KEY,
      qualifyingEvent: QUALIFYING_EVENT,
      sessionId: activeParticipation && activeParticipation.sessionId || '',
      requestId: clean(detail && detail.requestId)
    }, response || {}), '*');
  }
  async function handleParticipationBridgeRequest(frame, detail) {
    var requestId = clean(detail && detail.requestId);
    var action = clean(detail && detail.action);
    var payload = detail && detail.payload && typeof detail.payload === 'object' && !Array.isArray(detail.payload)
      ? detail.payload
      : {};
    if (!requestId || requestId.length > 180) return;
    try {
      var safePayload;
      if (action === 'record_smash_house_hit') {
        safePayload = {
          session_id: activeParticipation.sessionId,
          event_token: clean(payload.event_token),
          object_key: clean(payload.object_key),
          gameplay: payload.gameplay && typeof payload.gameplay === 'object' && !Array.isArray(payload.gameplay)
            ? payload.gameplay
            : {}
        };
      } else if (action === 'record_smash_house_save') {
        safePayload = {
          session_id: activeParticipation.sessionId,
          save_token: clean(payload.save_token),
          gameplay: payload.gameplay && typeof payload.gameplay === 'object' && !Array.isArray(payload.gameplay)
            ? payload.gameplay
            : {},
          creation: payload.creation && typeof payload.creation === 'object' && !Array.isArray(payload.creation)
            ? payload.creation
            : {}
        };
      } else {
        throw new Error('UNSUPPORTED_PARTICIPATION_BRIDGE_ACTION');
      }
      var data = await request(action, safePayload);
      postParticipationBridgeResponse(frame, detail, { ok: true, data: data });
    } catch (error) {
      var message = friendlyError(error);
      postParticipationBridgeResponse(frame, detail, { ok: false, error: message });
      if (action === 'record_smash_house_save') {
        setParticipationStatus('Ticket could not be verified', message, 'error');
      } else {
        setParticipationStatus('Participation verification stopped', message, 'error');
      }
    }
  }
  function init() {
    ensureJourneyPage();
    window.addEventListener('onehome:page-activated', queuePassportNeonSync);
    window.addEventListener('pageshow', queuePassportNeonSync);
    window.addEventListener('storage', function (event) {
      if (event && event.key === 'onehome_neon_button_color') queuePassportNeonSync();
    });
    ensureEntryChoiceButton();
    ensureStartCard();
    ensureLiveStatus();
    connectSmashHouseButtons();
    restoreActiveParticipation();
    bindAuth();
    window.addEventListener('onehome:profile-saved', function () {
      if (!currentJourney || !currentJourney.journey || currentJourney.journey.status === 'completed') return;
      completePassport(false).catch(function () {});
    });
    window.addEventListener('message', function (event) {
      var detail = event && event.data || {};
      var frame = q('liveFrame');
      var trustedFrameOrigin = event.origin === SUPABASE_ORIGIN || event.origin === window.location.origin;
      if (!trustedFrameOrigin || !frame || event.source !== frame.contentWindow) return;
      if (detail.gameKey !== GAME_KEY || detail.qualifyingEvent !== QUALIFYING_EVENT) return;
      if (!activeParticipation || detail.sessionId !== activeParticipation.sessionId) return;
      if (detail.type === 'onehome:participation-bridge-request') {
        void handleParticipationBridgeRequest(frame, detail);
        return;
      }
      if (detail.type === 'onehome:participation-game-ready') {
        rememberParticipationFrameHeight(detail.height);
        fitParticipationGameFrame();
        if (participationReadyTimer) {
          clearTimeout(participationReadyTimer);
          participationReadyTimer = null;
        }
        setParticipationStatus(
          'Verified participation session ready',
          'Break an item in Smash House, then save the creation. Opening the game alone cannot earn a ticket.',
          'success'
        );
        return;
      }
      if (detail.type === 'onehome:participation-frame-size') {
        rememberParticipationFrameHeight(detail.height);
        fitParticipationGameFrame();
        return;
      }
      if (detail.type === 'onehome:participation-verification-error') {
        if (participationReadyTimer) {
          clearTimeout(participationReadyTimer);
          participationReadyTimer = null;
        }
        setParticipationStatus(
          'Participation verification stopped',
          detail.message || 'One Home could not verify the Smash House action. Return to My Passport and start a fresh session.',
          'error'
        );
        return;
      }
      if (detail.type === 'onehome:participation-proof-ready') completeParticipation(detail);
    });
    window.addEventListener('focus', function () {
      if (!q('onehomePassportJourneyPage')?.classList.contains('active')) return;
      loadJourney(false).catch(function () {});
    });
    window.addEventListener('resize', fitParticipationGameFrame);
    if (window.visualViewport && window.visualViewport.addEventListener) {
      window.visualViewport.addEventListener('resize', fitParticipationGameFrame);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
