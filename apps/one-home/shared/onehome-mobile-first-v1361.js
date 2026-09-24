/* One Home v13.60 — mobile progress and artwork preview enhancements */
(function(){
  'use strict';
  if(window.__oneHomeMobileFirstV1360) return;
  window.__oneHomeMobileFirstV1360 = true;

  function createLightbox(){
    if(document.getElementById('ohArtworkLightbox')) return;
    var box=document.createElement('div');
    box.id='ohArtworkLightbox';
    box.className='oh-artwork-lightbox';
    box.hidden=true;
    box.innerHTML='<div class="oh-artwork-lightbox-card" role="dialog" aria-modal="true" aria-label="Artwork preview"><img alt="Artwork preview"><button type="button" class="btn alt">Close Artwork</button></div>';
    var close=function(){box.hidden=true;box.querySelector('img').removeAttribute('src');};
    box.querySelector('button').addEventListener('click',close);
    box.addEventListener('click',function(event){if(event.target===box)close();});
    document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!box.hidden)close();});
    document.body.appendChild(box);
  }

  window.oneHomeOpenArtworkPreview=function(src,alt){
    if(!src) return;
    createLightbox();
    var box=document.getElementById('ohArtworkLightbox');
    var image=box.querySelector('img');
    image.src=src;
    image.alt=alt||'Artwork preview';
    box.hidden=false;
    box.querySelector('button').focus({preventScroll:true});
  };

  function init(){
    createLightbox();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
