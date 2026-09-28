/* One Home v14.67.256 — owner-scoped, one-time Passport photo upload ticket.
   One focused editor for Passport identity/public Passport fields only.
   Wallets, Community Command, account access, creator projects, and NFT holdings live on their own surfaces. */
(function(){
  'use strict';
  if(window.__oneHomeProfileWizardV1462) return;
  window.__oneHomeProfileWizardV1462=true;

  var STEP_COUNT=5;
  var step=1;
  var loaded=false;
  var loading=false;
  var saving=false;
  var existingProfile=null;
  var selectedFile=null;
  var objectUrl='';
  var uploadedFile=null;
  var uploadedUrl='';
  var photoError='';
  var FALLBACK_AVATAR=(function(){try{return new URL('/assets/one-home-logo.png',window.location.origin).href;}catch(e){return '/assets/one-home-logo.png';}})();

  function q(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function page(){return q('profilePage');}
  function active(){var p=page();return !!(p&&p.classList.contains('active')&&!p.classList.contains('onehome-wallet-only'));}
  function cleanUsername(v){return txt(v).replace(/^@/,'').replace(/[^a-z0-9_\-]/gi,'').toLowerCase();}
  function cleanWebsite(v){v=txt(v);if(!v)return '';if(/^https?:\/\//i.test(v))return v;if(/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(v))return 'https://'+v;return v;}
  function realHttps(v){return /^https:\/\//i.test(txt(v));}
  function roleToLegacy(role){return role==='artist'?'Creator':role==='collector'?'Collector':role==='both'?'Both':'';}
  function legacyToRole(v){v=txt(v).toLowerCase();if(v==='creator'||v==='artist')return 'artist';if(v==='collector')return 'collector';if(v==='both'||v==='creator + collector'||v==='creator+collector')return 'both';return '';}

  function client(){
    if(window.oneHomePassportSupabase&&window.oneHomePassportSupabase.auth)return window.oneHomePassportSupabase;
    if(window.doodProfileSupabase&&window.doodProfileSupabase.auth)return window.doodProfileSupabase;
    if(window.doodSupabase&&window.doodSupabase.auth)return window.doodSupabase;
    if(window.supabaseClient&&window.supabaseClient.auth)return window.supabaseClient;
    if(window.supabase&&window.supabase.createClient){
      var url=window.DOOD_SUPABASE_URL||window.SUPABASE_URL||'https://fshvettlltcujmwvikfq.supabase.co';
      var key=window.DOOD_SUPABASE_KEY||window.SUPABASE_KEY||'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
      window.doodProfileSupabase=window.supabase.createClient(url,key);
      return window.doodProfileSupabase;
    }
    return null;
  }
  async function currentUser(){
    var c=client();
    if(!c||!c.auth)throw new Error('Your One Home Passport is still loading.');
    var sessionResult=await c.auth.getSession();
    var session=sessionResult&&sessionResult.data?sessionResult.data.session:null;
    if(session&&session.user)return session.user;
    var r=await c.auth.getUser();
    if(r.error)throw r.error;
    if(!r.data||!r.data.user)throw new Error('Sign in to your One Home Passport before updating your Passport.');
    return r.data.user;
  }
  function status(message,type){
    var el=q('oneHomeProfileWizardStatus');if(!el)return;
    var visible=Boolean(txt(message));
    el.textContent=visible?txt(message):'';
    el.className='onehome-profile-wizard-status'+(visible?' is-'+(type||'info'):'');
    el.hidden=!visible;
    var photoStatus=q('oneHomeProfileWizardPhotoStatus');
    if(photoStatus){photoStatus.textContent=el.textContent;photoStatus.className=el.className;photoStatus.hidden=el.hidden;}
  }

  function currentProfileNeon(){
    var rootStyle=getComputedStyle(document.documentElement);
    return {
      color:String(rootStyle.getPropertyValue('--onehome-neon')||'#ff2bd6').trim()||'#ff2bd6',
      rgb:String(rootStyle.getPropertyValue('--onehome-neon-rgb')||'255,43,214').trim()||'255,43,214'
    };
  }
  function applyProfileNeon(){
    if(!active())return;
    var neon=currentProfileNeon();
    var p=page();
    var shell=q('oneHomeProfileWizardShell');
    if(p){p.style.setProperty('--profile-page-neon',neon.color);p.style.setProperty('--profile-page-neon-rgb',neon.rgb);}
    if(shell){shell.style.setProperty('--profile-page-neon',neon.color);shell.style.setProperty('--profile-page-neon-rgb',neon.rgb);}
    var back=q('onehomeV1414PassportBack');
    if(back){
      back.classList.remove('btn','onehome-user-neon');
      back.removeAttribute('data-onehome-user-neon');
      back.style.setProperty('color',neon.color,'important');
      back.style.setProperty('border-color',neon.color,'important');
      back.style.setProperty('background','rgba('+neon.rgb+',.08)','important');
      back.style.setProperty('text-shadow','none','important');
      back.style.setProperty('box-shadow','none','important');
      back.style.setProperty('filter','none','important');
    }
    if(!shell)return;
    var colorNodes=shell.querySelectorAll('.onehome-profile-wizard-title,.onehome-profile-wizard-step h2,.onehome-profile-wizard-field label,.onehome-profile-wizard-handle,.onehome-profile-wizard-btn,.onehome-profile-wizard-progress button.is-active,.onehome-profile-wizard-progress button.is-complete');
    for(var i=0;i<colorNodes.length;i++){
      colorNodes[i].style.setProperty('color',neon.color,'important');
      colorNodes[i].style.setProperty('text-shadow','none','important');
      colorNodes[i].style.setProperty('box-shadow','none','important');
      colorNodes[i].style.setProperty('filter','none','important');
    }
    var borderNodes=shell.querySelectorAll('.onehome-profile-wizard-btn,.onehome-profile-wizard-progress button.is-active,.onehome-profile-wizard-progress button.is-complete,.onehome-profile-wizard-field input,.onehome-profile-wizard-field textarea,.onehome-profile-wizard-field select,.onehome-profile-wizard-avatar,.onehome-profile-wizard-review img');
    for(var j=0;j<borderNodes.length;j++)borderNodes[j].style.setProperty('border-color',neon.color,'important');
  }
  function value(id){var el=q(id);return txt(el&&el.value);}
  function setValue(id,v){var el=q(id);if(el&&v!=null)el.value=String(v);}
  function role(){var el=q('oneHomeProfileWizardRole');return el?el.value:'';}
  function avatarUrl(){
    var preview=q('oneHomeProfileWizardAvatarPreview');
    var stored=value('oneHomeProfileWizardAvatarUrl');
    if(realHttps(stored))return stored;
    if(preview&&realHttps(preview.src))return preview.src;
    return FALLBACK_AVATAR;
  }
  function setAvatar(url){
    url=realHttps(url)?url:FALLBACK_AVATAR;
    setValue('oneHomeProfileWizardAvatarUrl',url);
    var preview=q('oneHomeProfileWizardAvatarPreview');if(preview)preview.src=url;
  }
  function setStep(next){
    step=Math.max(1,Math.min(STEP_COUNT,Number(next)||1));
    document.querySelectorAll('#oneHomeProfileWizardShell .onehome-profile-wizard-step').forEach(function(el){el.classList.toggle('is-active',Number(el.getAttribute('data-step'))===step);});
    document.querySelectorAll('#oneHomeProfileWizardShell [data-wizard-step-button]').forEach(function(btn){
      var n=Number(btn.getAttribute('data-wizard-step-button'));
      btn.classList.toggle('is-active',n===step);
      btn.classList.toggle('is-complete',n<step);
      btn.setAttribute('aria-current',n===step?'step':'false');
    });
    if(step===5)renderReview();
    var shell=q('oneHomeProfileWizardShell');
    if(shell&&active())setTimeout(function(){shell.scrollIntoView({behavior:'smooth',block:'start'});},20);
    applyProfileNeon();
  }
  function validateStep(n){
    if(photoError){status(photoError,'error');setStep(2);return false;}
    if(n===1){
      if(!value('oneHomeProfileWizardDisplayName')){status('Add your display name before continuing.','error');return false;}
      var u=cleanUsername(value('oneHomeProfileWizardUsername'));
      setValue('oneHomeProfileWizardUsername',u);
      if(!u){status('Add a username before continuing.','error');return false;}
    }
    if(n===1 && !role()){status('Choose Collector, Creator, or Both before continuing.','error');return false;}
    status('');return true;
  }
  function renderReview(){
    var img=q('oneHomeProfileWizardReviewImage');if(img)img.src=(q('oneHomeProfileWizardAvatarPreview')&&q('oneHomeProfileWizardAvatarPreview').src)||FALLBACK_AVATAR;
    var name=q('oneHomeProfileWizardReviewName');if(name)name.textContent=value('oneHomeProfileWizardDisplayName')||'Your Name';
    var handle=q('oneHomeProfileWizardReviewHandle');if(handle)handle.textContent='@'+(cleanUsername(value('oneHomeProfileWizardUsername'))||'username');
    var bio=q('oneHomeProfileWizardReviewBio');if(bio)bio.textContent=value('oneHomeProfileWizardBio')||'';
    var loc=q('oneHomeProfileWizardReviewLocation');if(loc)loc.textContent=value('oneHomeProfileWizardLocation')?('Location: '+value('oneHomeProfileWizardLocation')):'Location: Not added';
    var web=q('oneHomeProfileWizardReviewWebsite');if(web)web.textContent=value('oneHomeProfileWizardWebsite')?('Website: '+cleanWebsite(value('oneHomeProfileWizardWebsite'))):'Website: Not added';
    var r=q('oneHomeProfileWizardReviewRole');if(r){var map={artist:'Creator',collector:'Collector',both:'Both'};r.textContent='Role: '+(map[role()]||'Choose one');}
  }

  async function profileApi(action,payload){
    var c=client();
    if(!c||!c.auth)throw new Error('Your One Home Passport is still loading.');
    var sessionResult=await c.auth.getSession();
    var accessToken=sessionResult&&sessionResult.data&&sessionResult.data.session?sessionResult.data.session.access_token:'';
    if(!accessToken)throw new Error('Sign in to your One Home Passport before updating your Passport.');
    var base=window.DOOD_SUPABASE_URL||window.SUPABASE_URL||'https://fshvettlltcujmwvikfq.supabase.co';
    var key=window.DOOD_SUPABASE_KEY||window.SUPABASE_KEY||'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
    var response=await fetch(String(base).replace(/\/$/,'')+'/functions/v1/passport-profile-manager',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+accessToken},
      body:JSON.stringify(Object.assign({action:action},payload||{}))
    });
    var data=await response.json().catch(function(){return {};});
    if(!response.ok||data.success===false){
      var error=new Error(data.error||'Your Passport could not be saved.');
      error.code=String(data.code||'');
      throw error;
    }
    return data;
  }
  async function dbProfile(_user){
    var result=await profileApi('get');
    return result&&result.profile?result.profile:null;
  }
  async function sharedProfile(){
    if(!window.DoodIdentity||typeof window.DoodIdentity.getProfileMe!=='function')return null;
    try{return await window.DoodIdentity.getProfileMe(false);}catch(e){return null;}
  }
  function profileObject(shared){return (shared&&shared.profile)||shared||{};}
  async function load(){
    if(loading)return;loading=true;
    try{
      status('Loading your Passport…');
      var user=await currentUser();
      existingProfile=await dbProfile(user)||null;
      var db=existingProfile||{};
      setValue('oneHomeProfileWizardDisplayName',txt(db.display_name));
      setValue('oneHomeProfileWizardUsername',txt(db.username));
      setValue('oneHomeProfileWizardBio',txt(db.bio));
      setValue('oneHomeProfileWizardLocation',txt(db.location));
      setValue('oneHomeProfileWizardWebsite',txt(db.website_url||db.app));
      var pic=txt(db.profile_pic_url||db.avatar_url||db.profile_image_url||db.pfp_url);
      if(!selectedFile)setAvatar(realHttps(pic)?pic:FALLBACK_AVATAR);
      var roleValue=legacyToRole(db.role_type||db.profile_type);
      var roleSelect=q('oneHomeProfileWizardRole');if(roleSelect)roleSelect.value=roleValue;
      loaded=true;
      renderReview();
      status(existingProfile?'Your saved Passport is ready to update.':'Create your Passport, then save it.');
      sharedProfile().then(function(shared){
        if(!shared||!active())return;
        var sp=profileObject(shared);
        function fill(id,v){if(!value(id)&&txt(v))setValue(id,txt(v));}
        fill('oneHomeProfileWizardDisplayName',sp.display_name||sp.displayName);
        fill('oneHomeProfileWizardBio',sp.bio);
        var preview=q('oneHomeProfileWizardAvatarPreview');
        var sharedPic=txt(sp.avatar_url||sp.avatarUrl);
        if(!selectedFile&&realHttps(sharedPic)&&(!preview||preview.src===FALLBACK_AVATAR||/one-home-logo\.png/i.test(preview.src)))setAvatar(sharedPic);
        if(roleSelect&&!roleSelect.value&&txt(sp.role_type||sp.roleType))roleSelect.value=legacyToRole(sp.role_type||sp.roleType);
        renderReview();
      }).catch(function(){});
    }catch(error){
      status(txt(error&&error.message||error||'Your Passport could not be loaded.'),'error');
    }finally{loading=false;}
  }

  function safeName(name){return txt(name||'profile').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'profile';}
  function extension(file){
    var n=txt(file&&file.name).split('.').pop();if(n&&n.length<=5)return n.toLowerCase().replace(/[^a-z0-9]/g,'')||'png';
    if(file&&file.type==='image/jpeg')return'jpg';if(file&&file.type==='image/webp')return'webp';if(file&&file.type==='image/gif')return'gif';return'png';
  }
  function validatePhoto(file){
    if(!file)return '';
    var type=txt(file.type).toLowerCase();
    if(!/^image\/(png|jpeg|webp|gif)$/.test(type))return 'Choose a PNG, JPG, WEBP or GIF photo. Export HEIC photos as JPG first.';
    if(!file.size)return 'That photo is empty. Choose another photo.';
    if(file.size>10*1024*1024)return 'Choose a photo smaller than 10 MB.';
    return '';
  }
  async function uploadAvatar(file,user){
    if(!file)return avatarUrl();
    var problem=validatePhoto(file);if(problem)throw new Error(problem);
    if(uploadedFile===file&&realHttps(uploadedUrl))return uploadedUrl;
    var c=client();
    var sessionResult=await c.auth.getSession();
    var accessToken=sessionResult&&sessionResult.data&&sessionResult.data.session?sessionResult.data.session.access_token:'';
    if(!accessToken)throw new Error('Sign in to your One Home Passport before uploading a photo.');
    var base=window.DOOD_SUPABASE_URL||window.SUPABASE_URL||'https://fshvettlltcujmwvikfq.supabase.co';
    var key=window.DOOD_SUPABASE_KEY||window.SUPABASE_KEY||'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
    var ticketResponse=await fetch(String(base).replace(/\/$/,'')+'/functions/v1/passport-avatar-upload-manager',{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+accessToken},body:JSON.stringify({content_type:file.type,size:file.size})});
    var ticket=await ticketResponse.json().catch(function(){return {};});
    if(!ticketResponse.ok||ticket.success===false||!ticket.path||!ticket.token)throw new Error(ticket.error||'Your photo upload could not be prepared. Please try again.');
    // Frozen contract: the server derives this one-time path from the verified Passport auth UUID.
    var bucket=c.storage.from(ticket.bucket||'doodlabs-media');
    var up=await bucket.uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type,cacheControl:'3600'});
    if(up.error)throw new Error('Your photo was not uploaded. '+txt(up.error.message)+' Your saved photo has not changed.');
    var url=txt(ticket.public_url);
    if(!url){var pub=bucket.getPublicUrl(ticket.path);url=pub&&pub.data?txt(pub.data.publicUrl):'';}
    if(!realHttps(url))throw new Error('Your photo upload did not return a usable image URL. Please try again.');
    uploadedFile=file;uploadedUrl=url;
    return url;
  }
  async function saveDb(_user,data){
    var result=await profileApi('save',data);
    existingProfile=result&&result.profile?result.profile:Object.assign({},existingProfile||{},data);
    return existingProfile;
  }
  async function saveShared(data){
    if(!window.DoodIdentity||typeof window.DoodIdentity.patchProfileMe!=='function')return {ok:false,message:'One Home Passport sync is not available in this browser yet.'};
    try{
      if(typeof window.DoodIdentity.syncFromLabWallet==='function')await window.DoodIdentity.syncFromLabWallet();
      var result=await window.DoodIdentity.patchProfileMe({display_name:data.display_name,bio:data.bio,avatar_url:data.avatar_url,role_type:data.role_type});
      return {ok:true,data:result};
    }catch(error){return {ok:false,message:txt(error&&error.message||error)};}
  }
  async function save(){
    if(saving)return;
    if(loading||!loaded){status('Wait for your Passport to finish loading before saving.','error');return;}
    if(!validateStep(1)||!validateStep(3))return;
    saving=true;
    var button=q('oneHomeProfileWizardSaveBtn');if(button)button.disabled=true;
    var photoButton=q('oneHomeProfileWizardSavePhotoBtn');if(photoButton)photoButton.disabled=true;
    var fileInput=q('oneHomeProfileWizardAvatarFile');if(fileInput)fileInput.disabled=true;
    var done=q('oneHomeProfileWizardComplete');if(done)done.classList.remove('is-visible');
    try{
      status('Saving your Passport…');
      var user=await currentUser();
      var avatar=await uploadAvatar(selectedFile,user);
      var data={
        display_name:value('oneHomeProfileWizardDisplayName'),
        username:cleanUsername(value('oneHomeProfileWizardUsername')),
        bio:value('oneHomeProfileWizardBio'),
        location:value('oneHomeProfileWizardLocation'),
        website_url:cleanWebsite(value('oneHomeProfileWizardWebsite')),
        avatar_url:avatar,
        role_type:role()
      };
      setValue('oneHomeProfileWizardUsername',data.username);
      setValue('oneHomeProfileWizardWebsite',data.website_url);
      await saveDb(user,data);
      var savedPhoto=txt(existingProfile&&(existingProfile.profile_pic_url||existingProfile.avatar_url||existingProfile.profile_image_url||existingProfile.pfp_url));
      if(savedPhoto!==avatar)throw new Error('The photo could not be confirmed in your saved Passport. Please try saving again.');
      setAvatar(savedPhoto);
      selectedFile=null;uploadedFile=null;uploadedUrl='';
      if(fileInput)fileInput.value='';
      if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
      // The Passport save is authoritative. Optional wallet sync must not block success.
      saveShared(data).catch(function(){});
      try{localStorage.setItem('doodProfileBackup',JSON.stringify(Object.assign({},existingProfile||{},data)));}catch(e){}
      try{window.dispatchEvent(new CustomEvent('onehome:profile-saved',{detail:{profile:existingProfile,shared:false}}));}catch(e){}
      renderReview();
      if(done){done.textContent='Passport saved. Your photo and profile are up to date.';done.classList.add('is-visible');}
      status('Passport saved.','success');
    }catch(error){
      status(txt(error&&error.message||error||'Your Passport could not be saved.'),'error');
    }finally{saving=false;if(button)button.disabled=false;if(photoButton)photoButton.disabled=false;if(fileInput)fileInput.disabled=false;}
  }

  function bind(){
    var shell=q('oneHomeProfileWizardShell');if(!shell||shell.dataset.bound==='1')return;shell.dataset.bound='1';
    var photoField=q('oneHomeProfileWizardAvatarFile');
    if(photoField&&!q('oneHomeProfileWizardSavePhotoBtn')){
      var photoButton=document.createElement('button');photoButton.id='oneHomeProfileWizardSavePhotoBtn';photoButton.type='button';photoButton.className='onehome-profile-wizard-btn is-primary';photoButton.textContent='Save Photo';photoField.parentNode.appendChild(photoButton);
      var photoStatus=document.createElement('div');photoStatus.id='oneHomeProfileWizardPhotoStatus';photoStatus.setAttribute('aria-live','polite');photoStatus.hidden=true;photoField.parentNode.appendChild(photoStatus);
    }
    shell.addEventListener('click',function(event){
      var next=event.target.closest('[data-wizard-next]');
      if(next){event.preventDefault();if(validateStep(step))setStep(step+1);return;}
      var prev=event.target.closest('[data-wizard-prev]');
      if(prev){event.preventDefault();setStep(step-1);return;}
      var jump=event.target.closest('[data-wizard-step-button]');
      if(jump){event.preventDefault();var n=Number(jump.getAttribute('data-wizard-step-button'));if(n<=step||validateStep(step))setStep(n);return;}
      var saveBtn=event.target.closest('#oneHomeProfileWizardSaveBtn,#oneHomeProfileWizardSavePhotoBtn');if(saveBtn){event.preventDefault();save();return;}
    });
    ['oneHomeProfileWizardDisplayName','oneHomeProfileWizardUsername','oneHomeProfileWizardBio','oneHomeProfileWizardLocation','oneHomeProfileWizardWebsite','oneHomeProfileWizardRole'].forEach(function(id){var el=q(id);if(el)el.addEventListener('input',renderReview);});
    var file=q('oneHomeProfileWizardAvatarFile');
    if(file)file.addEventListener('change',function(){
      if(saving)return;
      var nextFile=file.files&&file.files[0]?file.files[0]:null;
      if(!nextFile)return; // Cancelling the picker preserves the previous selection.
      photoError=validatePhoto(nextFile);
      if(photoError){file.value='';status(photoError,'error');return;}
      selectedFile=nextFile;uploadedFile=null;uploadedUrl='';
      var done=q('oneHomeProfileWizardComplete');if(done)done.classList.remove('is-visible');
      status('Photo selected. Choose Save Photo to keep it.');
      if(objectUrl){try{URL.revokeObjectURL(objectUrl);}catch(e){}objectUrl='';}
      if(selectedFile){objectUrl=URL.createObjectURL(selectedFile);var img=q('oneHomeProfileWizardAvatarPreview');if(img)img.src=objectUrl;}
      else setAvatar(value('oneHomeProfileWizardAvatarUrl')||FALLBACK_AVATAR);
      renderReview();
    });
  }
  function cleanLegacyChildren(){
    var p=page();if(!p||p.classList.contains('onehome-wallet-only'))return;
    var allowed={'oneHomeProfileWizardShell':1,'walletProfileLoginBox':1,'onehomeV1414PassportBack':1};
    Array.prototype.slice.call(p.children).forEach(function(child){if(!allowed[child.id])child.remove();});
  }
  function open(){
    var p=page();if(!p)return;
    p.classList.remove('onehome-wallet-only');
    if(typeof window.oneHomeV15Show==='function')window.oneHomeV15Show('profilePage');
    else if(typeof window.safeShow==='function')window.safeShow('profilePage');
    else if(typeof window.showPage==='function')window.showPage('profilePage');
    cleanLegacyChildren();bind();setStep(1);applyProfileNeon();if(!loaded)setTimeout(load,40);else renderReview();
  }
  window.oneHomeProfileWizardOpen=open;
  window.oneHomeV1414OpenPassportEditor=function(){open();};

  var p=page();
  if(p&&window.MutationObserver){
    new MutationObserver(function(){
      if(active()){cleanLegacyChildren();bind();applyProfileNeon();if(!loaded&&!loading)setTimeout(load,30);}
    }).observe(p,{attributes:true,attributeFilter:['class'],childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){bind();cleanLegacyChildren();if(active()){applyProfileNeon();load();}});
  else {bind();cleanLegacyChildren();if(active()){applyProfileNeon();load();}}
  window.addEventListener('onehome:page-activated',function(){if(active()){cleanLegacyChildren();bind();applyProfileNeon();if(!loaded&&!loading)load();}});
  if(window.MutationObserver){
    new MutationObserver(function(){if(active())applyProfileNeon();}).observe(document.documentElement,{attributes:true,attributeFilter:['style','data-onehome-neon']});
  }
  window.oneHomeProfileWizardApplyNeon=applyProfileNeon;
})();
