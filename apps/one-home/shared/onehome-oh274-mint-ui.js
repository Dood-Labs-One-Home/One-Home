/* One Home OH-274 — UI-only immediate Mint Home feedback. Existing Mint save/runtime remains authoritative. */
(function(){
 'use strict';
 function $(id){return document.getElementById(id)}
 function showMintHomeImmediately(){
   var wizard=$('wizardPanel'),home=$('mintHomePanel'),my=$('myMintsPanel'),drafts=$('draftMintsPanel');
   if(!wizard||wizard.hidden||!home)return;
   wizard.hidden=true;if(my)my.hidden=true;if(drafts)drafts.hidden=true;home.hidden=false;
   document.body.classList.remove('mint-wizard-open','creator-inline-active');
   try{home.scrollIntoView({behavior:'auto',block:'start'})}catch(_error){}
 }
 function bind(){var button=$('backToMintHomeBtn');if(!button||button.dataset.oh274Bound==='1')return;button.dataset.oh274Bound='1';button.addEventListener('click',showMintHomeImmediately,true)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
