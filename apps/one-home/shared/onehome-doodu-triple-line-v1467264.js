/* OH-264: the fifth Dood U category. Launch the real Triple Line app, not the handoff document.
 * The unmodified Japanese-locked app source is bundled outside public/ in integrations/triple-line/.
 * Standalone launch preserves microphone permissions and the app's existing origin-bound lesson library.
 */
(function () {
  'use strict';
  if (window.__ONEHOME_DOODU_TRIPLE_LINE_V1467264__) return;
  window.__ONEHOME_DOODU_TRIPLE_LINE_V1467264__ = true;

  const APP_URL = 'https://heart-mist-bloom-frost.grok.me/';
  const DOOR_ID = 'doodUTripleLineDoor';
  const DIRECTORY = '#doodUPage .doodu-house-directory .oh-room-grid';
  const LABELS = new Map([
    ['Art & Design', 'Art & Design'],
    ['AI & Video', 'AI & Video'],
    ['XRPL & Business', 'XRPL & Business']
  ]);

  function normalizeLabels(grid) {
    for (const button of grid.querySelectorAll('button.oh-room-button')) {
      const current = (button.textContent || '').trim().replace(/^Open\s+/i, '');
      if (LABELS.has(current) && button.textContent.trim() !== LABELS.get(current)) {
        button.textContent = LABELS.get(current);
      }
    }
  }

  function launch() {
    // A real click must synchronously open the app so mobile browsers allow the new tab.
    // Do not iframe here: One Home's existing Permissions-Policy disables iframe microphones.
    const tab = window.open(APP_URL, '_blank', 'noopener,noreferrer');
    if (tab && typeof tab.focus === 'function') tab.focus();
  }

  function addDoor() {
    const grid = document.querySelector(DIRECTORY);
    if (!grid) return;
    normalizeLabels(grid);
    let door = document.getElementById(DOOR_ID);
    if (door && door.parentElement !== grid) door.remove(), door = null;
    if (!door) {
      door = document.createElement('button');
      door.id = DOOR_ID;
      door.type = 'button';
      grid.appendChild(door);
    } else {
      // Removes any previously attached oversized-door click handler.
      const clean = door.cloneNode(false);
      door.replaceWith(clean);
      door = clean;
    }
    door.className = 'onehome-v15-btn oh-room-button doodu-triple-door';
    door.textContent = 'Triple Line';
    door.setAttribute('aria-label', 'Triple Line');
    door.addEventListener('click', launch);
  }

  function install() {
    const api = window.OneHomeDoodU;
    if (!api || typeof api.home !== 'function') return;
    if (!api.__tripleLineHomeWrappedV1467264) {
      const originalHome = api.home;
      api.home = function () {
        const result = originalHome.apply(this, arguments);
        addDoor();
        return result;
      };
      api.__tripleLineHomeWrappedV1467264 = true;
    }
    api.openTripleLine = launch;
    addDoor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, {once: true});
  } else install();
  window.addEventListener('onehome:page-activated', event => {
    const detail = event && event.detail || {};
    if ((detail.pageId || detail.id) === 'doodUPage') install();
  });
})();
