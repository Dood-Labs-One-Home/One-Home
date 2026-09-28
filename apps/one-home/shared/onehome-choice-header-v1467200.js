/* One Home v14.67.200 — shared mobile logo alignment. */
(function(){
  'use strict';
  if(window.__oneHomeChoiceLogoV1467200) return;
  window.__oneHomeChoiceLogoV1467200 = true;

  var CHOICE_URL = '/one-home/'; // Passport · Explore Rooms · Rare Routes · Open Mints
  var LOGO_URL = '/assets/one-home-return-logo.png?v=1278';
  var EXCLUDED_PAGE_IDS = {
    homePage:true,
    onehomePassportEntrancePage:true,
    onehomeEntryChoicePage:true
  };
  var syncingSpaLogo = false;

  function rememberChoice(){
    try{
      localStorage.setItem('onehome_passport_destination','choice');
      sessionStorage.setItem('onehome_passport_destination','choice');
    }catch(_error){}
  }

  function showChoicesIn(targetWindow){
    try{
      if(targetWindow && typeof targetWindow.oneHomePassportShowChoice === 'function'){
        targetWindow.oneHomePassportShowChoice();
        return true;
      }
    }catch(_error){}
    return false;
  }

  function returnToChoices(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    rememberChoice();

    if(window.parent && window.parent !== window && showChoicesIn(window.parent)){
      return false;
    }
    if(showChoicesIn(window)){
      try{
        if(new URLSearchParams(window.location.search).get('onehome') === 'choices'){
          window.history.replaceState({},'',window.location.pathname || '/');
        }
      }catch(_error){}
      return false;
    }
    window.location.assign(CHOICE_URL);
    return false;
  }

  window.oneHomeReturnToChoices = returnToChoices;

  function setLogoImage(control){
    if(!control) return;
    var image = control.querySelector('img');
    if(!image){
      image = document.createElement('img');
      control.insertBefore(image,control.firstChild);
    }
    image.src = LOGO_URL;
    image.alt = 'One Home';
  }

  function bindLogo(control){
    if(!control) return;
    if(control.dataset.onehomeChoiceBound === '1') return;
    control.setAttribute('aria-label','Return to One Home Choices');
    control.setAttribute('title','Return to One Home Choices');
    if(control.tagName === 'A') control.setAttribute('href',CHOICE_URL);
    setLogoImage(control);
    control.dataset.onehomeChoiceBound = '1';
    control.addEventListener('click',returnToChoices);
  }

  function createLogoButton(id){
    var button = document.createElement('button');
    button.type = 'button';
    if(id) button.id = id;
    button.setAttribute('aria-label','Return to One Home Choices');
    button.setAttribute('title','Return to One Home Choices');
    button.innerHTML = '<img src="'+LOGO_URL+'" alt="One Home">'
      + '<span class="onehome-choice-sr-only">Return to One Home Choices</span>';
    bindLogo(button);
    return button;
  }

  function removeLegacyChoiceHeaders(){
    document.querySelectorAll('.onehome-choice-header').forEach(function(header){
      header.remove();
    });
  }

  function collapseLogoContainer(control){
    if(!control) return;
    var container = control.closest('.passport-site-strip,.top');
    if(!container) return;
    if(container.dataset.onehomeLogoOnlyCollapsed === '1') return;
    container.dataset.onehomeLogoOnlyCollapsed = '1';
    container.classList.add('onehome-logo-only-banner');
    [
      ['display','block'],
      ['position','static'],
      ['inset','auto'],
      ['width','0px'],
      ['max-width','0px'],
      ['min-width','0px'],
      ['height','0px'],
      ['max-height','0px'],
      ['min-height','0px'],
      ['margin','0px'],
      ['padding','0px'],
      ['border','0px'],
      ['border-radius','0px'],
      ['background','transparent'],
      ['background-image','none'],
      ['box-shadow','none'],
      ['backdrop-filter','none'],
      ['-webkit-backdrop-filter','none'],
      ['overflow','visible']
    ].forEach(function(rule){
      container.style.setProperty(rule[0],rule[1],'important');
    });
  }

  function existingFounderLogo(page){
    if(!page) return null;
    var mintButton = page.querySelector('#founderMintOptionsBtn');
    if(mintButton){
      if(!mintButton.classList.contains('onehome-existing-choice-logo')){
        mintButton.classList.add('onehome-existing-choice-logo');
      }
      bindLogo(mintButton);
      collapseLogoContainer(mintButton);
      return mintButton;
    }

    var image = page.querySelector('.passport-header-onehome-logo');
    if(!image) return null;
    var control = image.closest('button,a');
    if(!control){
      control = document.createElement('button');
      control.type = 'button';
      image.parentNode.insertBefore(control,image);
      control.appendChild(image);
    }
    if(!control.classList.contains('onehome-existing-choice-logo')){
      control.classList.add('onehome-existing-choice-logo');
    }
    bindLogo(control);
    collapseLogoContainer(control);
    return control;
  }

  function activeSpaPage(){
    var pages = Array.prototype.slice.call(document.querySelectorAll('main .page-view.active'));
    return pages.length ? pages[pages.length - 1] : null;
  }

  function ensureFloatingLogo(){
    var button = document.getElementById('oneHomeChoiceLogoControl');
    if(!button){
      button = createLogoButton('oneHomeChoiceLogoControl');
      button.hidden = true;
      document.body.appendChild(button);
    }
    return button;
  }

  function syncSpaLogo(){
    if(syncingSpaLogo) return;
    syncingSpaLogo = true;

    try{
    var button = ensureFloatingLogo();
    var page = activeSpaPage();
    var showFloating = Boolean(page && page.id && !EXCLUDED_PAGE_IDS[page.id]);

    if(showFloating && existingFounderLogo(page)){
      showFloating = false;
    }

    button.hidden = !showFloating;
    document.body.classList.toggle('onehome-choice-logo-visible',showFloating);
    removeLegacyChoiceHeaders();
    }finally{
      syncingSpaLogo = false;
    }
  }

  function installStandaloneLogo(){
    try{
      if(window.parent && window.parent !== window
        && window.parent.document
        && window.parent.document.getElementById('oneHomeChoiceLogoControl')){
        return;
      }
    }catch(_error){}

    var image = document.querySelector(
      'main .top img[src*="one-home-logo"],'
      +'body > .top img[src*="one-home-logo"]'
    );
    var control = image ? image.closest('a,button') : null;

    if(control && String(control.textContent || '').trim()){
      control = null;
    }

    if(image && !control){
      control = createLogoButton();
      control.classList.add('onehome-inline-choice-logo');
      image.parentNode.insertBefore(control,image);
      image.remove();
      var top = control.closest('.top');
      if(top) top.insertBefore(control,top.firstChild);
    }else if(control){
      control.classList.add('onehome-inline-choice-logo');
      bindLogo(control);
    }else{
      control = createLogoButton('oneHomeChoiceLogoControl');
      document.body.appendChild(control);
    }
    collapseLogoContainer(control);

    document.querySelectorAll('a[href="/"]').forEach(function(link){
      if(link === control) return;
      if(/back to one home/i.test(link.textContent || '')){
        link.href = CHOICE_URL;
        link.textContent = 'One Home Choices';
      }
    });
  }

  function openRequestedChoice(){
    var requested = false;
    try{ requested = new URLSearchParams(window.location.search).get('onehome') === 'choices'; }catch(_error){}
    if(!requested || !document.getElementById('onehomeEntryChoicePage')) return;
    rememberChoice();
    var attempts = 0;
    var timer = window.setInterval(function(){
      attempts += 1;
      if(showChoicesIn(window) || attempts > 50){
        window.clearInterval(timer);
        if(attempts <= 50){
          try{ window.history.replaceState({},'',window.location.pathname || '/'); }catch(_error){}
        }
      }
    },80);
  }

  function run(){
    try{if(new URLSearchParams(window.location.search||'').get('embedded')==='mint')return;}catch(_error){}
    removeLegacyChoiceHeaders();
    if(document.getElementById('onehomeEntryChoicePage')){
      openRequestedChoice();
      syncSpaLogo();
      window.addEventListener('onehome:page-activated',function(){setTimeout(syncSpaLogo,0);});
      document.addEventListener('click',function(){ setTimeout(syncSpaLogo,0); },true);
      window.addEventListener('popstate',syncSpaLogo);
    }else{
      installStandaloneLogo();
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',run);
  else run();
})();
