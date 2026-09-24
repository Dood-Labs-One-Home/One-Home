/* OH-263: additive Dood U Triple Line doorway. Existing lessons, artwork and app are untouched. */
(function () {
  'use strict';
  if (window.__ONEHOME_DOODU_TRIPLE_LINE_V1467263__) return;
  window.__ONEHOME_DOODU_TRIPLE_LINE_V1467263__ = true;

  // The URL below was provided as the Triple Line handoff; no app source is bundled.
  const TRIPLE_LINE_URL = 'https://heart-mist-bloom-frost.grok.me/handoff.html';
  const PAGE_ID = 'doodUTripleLinePage';
  const DOOR_ID = 'doodUTripleLineDoor';

  function getPage() {
    let page = document.getElementById(PAGE_ID);
    if (!page) {
      const main = document.getElementById('top') || document.querySelector('main') || document.body;
      page = document.createElement('div');
      page.id = PAGE_ID;
      page.className = 'page-view';
      page.setAttribute('aria-label', 'Triple Line language learning');
      main.appendChild(page);
    }
    return page;
  }

  function showPage(id) {
    const page = document.getElementById(id);
    if (!page) return;
    try {
      if (typeof window.oneHomeV15Show === 'function') window.oneHomeV15Show(id);
      else if (typeof window.showPage === 'function') window.showPage(id);
    } catch (error) { console.warn('Triple Line route:', error); }
    if (!page.classList.contains('active')) {
      document.querySelectorAll('.page-view').forEach(item => item.classList.remove('active'));
      page.classList.add('active');
    }
    try { window.scrollTo({top: 0, behavior: 'instant'}); } catch (_error) {}
  }

  function renderTripleLine() {
    const page = getPage();
    if (page.dataset.tripleLineVersion === '1467263') return page;
    page.innerHTML = `
      <div class="doodu-triple-room">
        <div class="doodu-triple-inner">
          <button type="button" class="doodu-triple-back" id="doodUTripleLineBack">← Dood U</button>
          <section class="doodu-triple-hero" aria-labelledby="doodUTripleLineTitle">
            <div class="doodu-triple-lines" aria-hidden="true"><i></i><i></i><i></i></div>
            <div class="doodu-triple-heading">
              <p class="doodu-triple-eyebrow">DOOD U · LANGUAGE LEARNING</p>
              <h1 id="doodUTripleLineTitle">TRIPLE LINE</h1>
              <p class="doodu-triple-tagline">Learn through what you love.</p>
            </div>
            <p class="doodu-triple-description">Turn songs, videos, conversations and recordings into lessons with the original line, pronunciation and meaning.</p>
            <p class="doodu-triple-languages" aria-label="Languages available">Italian <span>·</span> Spanish <span>·</span> French <span>·</span> Japanese</p>
            <a class="doodu-triple-open" id="doodUTripleLineOpen" target="_blank" rel="noopener noreferrer">Open Triple Line ↗</a>
          </section>
        </div>
      </div>`;
    const open = page.querySelector('#doodUTripleLineOpen');
    open.href = TRIPLE_LINE_URL;
    page.querySelector('#doodUTripleLineBack').addEventListener('click', () => {
      if (window.OneHomeDoodU && typeof window.OneHomeDoodU.home === 'function') window.OneHomeDoodU.home();
      else showPage('doodUPage');
    });
    page.dataset.tripleLineVersion = '1467263';
    return page;
  }

  function openTripleLine() {
    renderTripleLine();
    showPage(PAGE_ID);
  }

  function install() {
    const api = window.OneHomeDoodU;
    if (!api || typeof api.home !== 'function') return;
    if (!api.__tripleLineHomeWrapped) {
      const originalHome = api.home;
      api.home = function () {
        const result = originalHome.apply(this, arguments);
        addDoor();
        return result;
      };
      api.__tripleLineHomeWrapped = true;
    }
    api.openTripleLine = openTripleLine;
    addDoor();
    renderTripleLine();
  }

  function addDoor() {
    const grid = document.querySelector('#doodUPage .doodu-house-directory .oh-room-grid');
    if (!grid || document.getElementById(DOOR_ID)) return;
    const door = document.createElement('button');
    door.id = DOOR_ID;
    door.type = 'button';
    door.className = 'onehome-v15-btn oh-room-button doodu-triple-door';
    const name = document.createElement('strong');
    name.textContent = 'TRIPLE LINE';
    const subtitle = document.createElement('span');
    subtitle.textContent = 'Learn through what you love.';
    const languages = document.createElement('small');
    languages.textContent = 'Italian · Spanish · French · Japanese';
    door.append(name, subtitle, languages);
    door.addEventListener('click', openTripleLine);
    grid.appendChild(door);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once: true});
  else install();
  window.addEventListener('onehome:page-activated', event => {
    const detail = event && event.detail || {};
    const id = detail.pageId || detail.id;
    if (id === 'doodUPage') install();
    else if (id === PAGE_ID) renderTripleLine();
  });
})();
