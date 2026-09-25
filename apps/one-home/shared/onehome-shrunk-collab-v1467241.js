/* One Home v14.67.241 — SHRUNK room + native Passport top action. No test Auth, payment, or backend endpoints. */
(function(){'use strict';
if(window.__OH_SHRUNK_PUBLIC_241__)return;window.__OH_SHRUNK_PUBLIC_241__=true;
const PAGE='onehomeShrunkCollabPage';
function init(){
 const host=document.querySelector('main#top')||document.getElementById('top')||document.querySelector('main');
 if(!host||document.getElementById(PAGE))return;
 const root=document.createElement('div');root.className='page-view';root.id=PAGE;
 root.setAttribute('aria-label','SHRUNK Supply Drop collaborations');
 root.innerHTML=`<section class="onehome-journey-shell oh-shrunk-room">
  <div class="oh-shrunk-bar"><button class="oh-shrunk-btn" type="button" id="sc-public-return">← My Passport</button></div>
  <div class="onehome-journey-hero"><h1>SHRUNK SUPPLY DROP</h1><p>Give us your brand. We'll SHRUNK it. Your board. Your sticker. Your card. Your Supply Drop.</p></div>
  <section class="oh-shrunk-panel"><h2>Become Part of a Supply Drop</h2><p>$44 gets you into a Supply Drop. $388 puts <strong>you</strong> into the Supply Drop.</p>
  <div class="oh-shrunk-grid"><div class="oh-shrunk-info"><h3>Initial Collaboration</h3><div class="oh-shrunk-price">$388</div><p>We design the board, sticker and card, manufacture your collaboration, and include it in a SHRUNK Supply Drop production run.</p><ul><li>Custom SHRUNK fingerboard based on your brand or artwork</li><li>Your guaranteed personal Supply Drop containing your board</li><li>Custom sticker and card design</li><li>QR/link destination</li><li>Initial design, printing and manufacturing</li></ul></div>
  <div class="oh-shrunk-info"><h3>Just want a Supply Drop?</h3><div class="oh-shrunk-price">$44</div><p>The Supply Drop is the product. Opening runs include a guaranteed deck. Later runs are discovery packs with changing contents.</p><p>Future contents are not fixed and may include boards, hardware, artwork, games and other physical surprises.</p></div></div>
  <div class="oh-shrunk-actions"><button class="oh-shrunk-btn" type="button" id="sc-public-passport">Open My Passport</button><button class="oh-shrunk-btn" type="button" id="sc-public-home">Explore One Home</button></div>
  </section></section>`;
 host.appendChild(root);
 function openPassport(){if(typeof window.oneHomeJourneyOpenPassport==='function')window.oneHomeJourneyOpenPassport();else if(typeof window.oneHomeV15Show==='function')window.oneHomeV15Show('onehomeEntryChoicePage');}
 function show(){if(typeof window.oneHomeV15Show==='function')window.oneHomeV15Show(PAGE);else if(typeof window.showPage==='function')window.showPage(PAGE);else{document.querySelectorAll('.page-view').forEach(x=>x.classList.remove('active'));root.classList.add('active')}window.scrollTo(0,0)}
 window.oneHomeOpenShrunkCollaboration=show;
 root.querySelector('#sc-public-return').addEventListener('click',openPassport);
 root.querySelector('#sc-public-passport').addEventListener('click',openPassport);
 root.querySelector('#sc-public-home').addEventListener('click',()=>window.oneHomeV15Show?.('onehomeEntryChoicePage'));
 function ensurePassportButton(){
  const nav=document.getElementById('onehomeV1414PassportIdentityNav');
  const actions=nav&&nav.querySelector('.onehome-v1414-passport-actions');
  if(!actions||actions.querySelector('[data-oh-shrunk]'))return;
  const btn=document.createElement('button');
  btn.className='onehome-journey-button';btn.type='button';btn.setAttribute('data-oh-shrunk','');btn.textContent='SHRUNK Collaborations';btn.addEventListener('click',show);
  const homeOps=actions.querySelector('[data-oh-homeops]');
  if(homeOps)homeOps.insertAdjacentElement('beforebegin',btn);else actions.appendChild(btn);
 }
 const observer=new MutationObserver(ensurePassportButton);observer.observe(document.documentElement,{subtree:true,childList:true});
 window.addEventListener('onehome:page-activated',ensurePassportButton);
 ensurePassportButton();
 if(new URLSearchParams(location.search).get('shrunk')==='collaborate')setTimeout(show,500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
