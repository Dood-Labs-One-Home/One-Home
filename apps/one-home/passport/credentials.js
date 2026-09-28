/* ONE HOME v14.67.172 — progressive Passport credentials.
   No placeholders are rendered. A credential appears only after the server has
   verified an established qualifying item for that Passport. */
(function(){
  'use strict';
  if(window.__oneHomePassportCredentialsV1467172)return;
  window.__oneHomePassportCredentialsV1467172=true;

  const SUPABASE_URL=window.DOOD_SUPABASE_URL||'https://fshvettlltcujmwvikfq.supabase.co';
  const ENDPOINT=SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/passport-credential-manager';
  let requestSerial=0;
  const cache=new Map();
  const CACHE_MS=60*1000;

  function esc(value){return String(value||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]})}
  function usernameFromPage(){
    const match=String(location.pathname||'').match(/^\/profile\/([^/?#]+)/i);
    if(match)return decodeURIComponent(match[1]).replace(/^@/,'').toLowerCase();
    const handle=document.querySelector('.public-profile-full .public-handle');
    return String(handle&&handle.textContent||'').trim().replace(/^@/,'').toLowerCase();
  }
  function installStyle(){
    if(document.getElementById('oneHomePassportCredentialsStyle'))return;
    const style=document.createElement('style');
    style.id='oneHomePassportCredentialsStyle';
    style.textContent=`
      .onehome-passport-credentials{display:flex;gap:8px;flex-wrap:wrap;margin:11px 0 4px}
      .onehome-passport-self-credentials{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:0 auto 16px;max-width:900px}
      .onehome-passport-credential{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,216,77,.72);background:rgba(255,216,77,.08);color:#ffe88a;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:900;letter-spacing:.02em}
      .onehome-passport-credential::before{content:'✦';font-size:11px}
      .onehome-passport-credential.is-historical{border-color:rgba(186,169,153,.55);background:rgba(186,169,153,.07);color:#d8c9bc}
      .onehome-passport-credential small{font:inherit;font-size:9px;letter-spacing:.09em;text-transform:uppercase;opacity:.78}
    `;
    document.head.appendChild(style);
  }
  function badgeMarkup(rows){
    return rows.map(function(row){
      const historical=String(row.status||'').toLowerCase()==='historical';
      return '<span class="onehome-passport-credential'+(historical?' is-historical':'')+'">'+esc(row.label)+(historical?' <small>Historical</small>':'')+'</span>';
    }).join('');
  }
  async function fetchPublicCredentials(username){
    const cached=cache.get('public:'+username);
    if(cached&&Date.now()-cached.at<CACHE_MS)return cached.data;
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'public_passport',username:username})});
    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{}}catch(_e){data={success:false,error:raw||'Credential response could not be read.'}}
    if(!response.ok||data.success===false)throw new Error(data.error||'Passport credentials could not be loaded.');
    cache.set('public:'+username,{at:Date.now(),data:data});
    return data;
  }
  async function fetchSelfCredentials(){
    const sb=window.doodProfileSupabase||window.doodSupabase;
    if(!sb||!sb.auth||typeof sb.auth.getSession!=='function')return {credentials:[]};
    const sessionResult=await sb.auth.getSession();
    const token=sessionResult&&sessionResult.data&&sessionResult.data.session&&sessionResult.data.session.access_token;
    if(!token)return {credentials:[]};
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action:'self_passport'})});
    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{}}catch(_e){data={success:false,error:raw||'Credential response could not be read.'}}
    if(!response.ok||data.success===false)throw new Error(data.error||'Passport credentials could not be loaded.');
    return data;
  }
  function removePublicRows(){document.querySelectorAll('.onehome-passport-credentials').forEach(function(el){el.remove()})}
  function removeSelfRows(){document.querySelectorAll('.onehome-passport-self-credentials').forEach(function(el){el.remove()})}
  async function renderPublic(){
    const full=document.querySelector('.public-profile-full');
    const username=usernameFromPage();
    if(!full||!username){removePublicRows();return}
    const serial=++requestSerial;
    try{
      const data=await fetchPublicCredentials(username);
      if(serial!==requestSerial||username!==usernameFromPage())return;
      removePublicRows();
      const rows=Array.isArray(data.credentials)?data.credentials:[];
      if(!rows.length)return;
      installStyle();
      const host=document.createElement('div');
      host.className='onehome-passport-credentials';
      host.setAttribute('aria-label','Verified Passport credentials');
      host.innerHTML=badgeMarkup(rows);
      const firstBadges=full.querySelector('.profile-badge-row');
      const handle=full.querySelector('.public-handle');
      if(firstBadges)firstBadges.insertAdjacentElement('afterend',host);
      else if(handle)handle.insertAdjacentElement('afterend',host);
      else full.insertBefore(host,full.firstChild);
    }catch(error){console.warn('One Home Passport credentials:',error&&error.message||error);removePublicRows()}
  }
  async function renderSelf(){
    const page=document.getElementById('profilePage');
    if(!page||!page.classList.contains('active')){removeSelfRows();return}
    try{
      const data=await fetchSelfCredentials();
      removeSelfRows();
      const rows=Array.isArray(data.credentials)?data.credentials:[];
      if(!rows.length)return;
      installStyle();
      const shell=document.getElementById('oneHomeProfileWizardShell');
      const title=document.getElementById('oneHomeProfileWizardTitle');
      if(!shell)return;
      const host=document.createElement('div');
      host.className='onehome-passport-self-credentials';
      host.setAttribute('aria-label','My verified Passport credentials');
      host.innerHTML=badgeMarkup(rows);
      if(title)title.insertAdjacentElement('afterend',host);else shell.insertBefore(host,shell.firstChild);
    }catch(error){console.warn('One Home Passport self credentials:',error&&error.message||error);removeSelfRows()}
  }
  function render(){renderPublic();renderSelf()}

  window.addEventListener('onehome:profiles-rendered',function(){setTimeout(renderPublic,0)});
  window.addEventListener('popstate',function(){setTimeout(render,0)});
  window.addEventListener('focus',function(){if(document.getElementById('profilePage')?.classList.contains('active'))setTimeout(renderSelf,0)});
  window.addEventListener('onehome:passport-credentials-refresh',function(){cache.clear();setTimeout(render,0)});
  ['onehome-xrpl-wallet-linked','onehome-chain-wallet-changed'].forEach(function(name){window.addEventListener(name,function(){cache.clear();setTimeout(renderSelf,100)})});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){
    const page=document.getElementById('profilePage');
    if(page)new MutationObserver(function(){if(page.classList.contains('active'))renderSelf();else removeSelfRows()}).observe(page,{attributes:true,attributeFilter:['class']});
    setTimeout(render,250);
  });
  else {
    const page=document.getElementById('profilePage');
    if(page)new MutationObserver(function(){if(page.classList.contains('active'))renderSelf();else removeSelfRows()}).observe(page,{attributes:true,attributeFilter:['class']});
    setTimeout(render,250);
  }
})();
