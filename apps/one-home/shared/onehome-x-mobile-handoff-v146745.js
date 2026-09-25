/* One Home v14.67.45 — X mobile EVM handoff.
   X is the acquisition surface. One Home is the router. MetaMask is the EVM signer.
   On mobile X links, keep the exact mint + source=x and continue inside MetaMask's
   dapp browser before Passport sign-in so auth and wallet live in the same browser. */
(function(){
  'use strict';
  if(window.OneHomeXMobileHandoff&&window.OneHomeXMobileHandoff.version==='14.67.45')return;

  const VERSION='14.67.45';
  const DISMISS_KEY='onehome_x_mobile_handoff_dismiss_v146745:';

  function text(v){return String(v==null?'':v).trim();}
  function mobile(){
    const ua=navigator.userAgent||'';
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints>1 && /Macintosh/i.test(ua));
  }
  function campaignId(){
    try{
      const path=text(location.pathname).match(/^\/mint\/([0-9a-f-]{36})\/?$/i);
      if(path)return path[1];
      const q=text(new URLSearchParams(location.search).get('campaign'));
      return /^[0-9a-f-]{36}$/i.test(q)?q:'';
    }catch(_e){return '';}
  }
  function source(){
    try{
      const p=new URLSearchParams(location.search||'');
      const explicit=text(p.get('source')||p.get('src')||p.get('utm_source')).toLowerCase();
      if(explicit==='x'||explicit==='twitter'||explicit==='twitter-x')return 'x';
    }catch(_e){}
    try{return text(window.OneHomeMintSource?.context(campaignId())?.source).toLowerCase();}catch(_e){return '';}
  }
  function isEvm(){
    try{return Boolean(text(new URLSearchParams(location.search||'').get('chain')));}catch(_e){return false;}
  }
  function injectedWallet(){
    try{
      if(window.ethereum?.isMetaMask)return true;
      if(Array.isArray(window.ethereum?.providers)&&window.ethereum.providers.some(function(p){return p&&p.isMetaMask;}))return true;
    }catch(_e){}
    return /MetaMaskMobile/i.test(navigator.userAgent||'');
  }
  function currentTarget(){
    try{
      const u=new URL(location.href);
      u.searchParams.set('source','x');
      return u;
    }catch(_e){return null;}
  }
  function metamaskUrl(){
    const target=currentTarget();
    if(!target)return '';
    return 'https://metamask.app.link/dapp/'+target.toString().replace(/^https?:\/\//i,'');
  }
  function dismissKey(){return DISMISS_KEY+(campaignId()||'mint');}
  function wasDismissed(){try{return sessionStorage.getItem(dismissKey())==='1';}catch(_e){return false;}}
  function dismiss(){
    try{sessionStorage.setItem(dismissKey(),'1');}catch(_e){}
    document.getElementById('oneHomeXMobileHandoff')?.remove();
  }
  async function copyLink(button){
    const target=currentTarget();
    if(!target)return;
    try{
      await navigator.clipboard.writeText(target.toString());
      if(button){const old=button.textContent;button.textContent='Mint Link Copied';setTimeout(function(){button.textContent=old;},1600);}
    }catch(_e){
      window.prompt('Copy this exact One Home mint link:',target.toString());
    }
  }
  function openMetaMask(){
    const link=metamaskUrl();
    if(!link)return;
    // This must run directly from a collector tap so mobile browsers are allowed
    // to launch the wallet app/universal link.
    location.href=link;
  }
  function render(){
    if(document.getElementById('oneHomeXMobileHandoff'))return;
    if(!mobile()||source()!=='x'||!isEvm()||injectedWallet()||wasDismissed())return;

    const style=document.createElement('style');
    style.id='oneHomeXMobileHandoffStyle';
    style.textContent=`
      #oneHomeXMobileHandoff{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.88);backdrop-filter:blur(8px);font-family:Arial,sans-serif;color:#fff}
      #oneHomeXMobileHandoff .ohx-card{width:min(520px,100%);box-sizing:border-box;background:#0b0f12;border:1px solid #49534f;border-radius:22px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.65)}
      #oneHomeXMobileHandoff .ohx-kicker{font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#e62acb;margin:0 0 8px}
      #oneHomeXMobileHandoff h2{font-size:27px;line-height:1.08;margin:0 0 12px}
      #oneHomeXMobileHandoff p{font-size:15px;line-height:1.5;color:#d8dfdc;margin:0 0 12px}
      #oneHomeXMobileHandoff .ohx-note{font-size:13px;color:#aebbb6}
      #oneHomeXMobileHandoff .ohx-actions{display:grid;gap:10px;margin-top:18px}
      #oneHomeXMobileHandoff button{appearance:none;border:0;border-radius:999px;padding:14px 18px;font:900 15px/1 Arial,sans-serif;cursor:pointer}
      #oneHomeXMobileHandoff .ohx-primary{background:#e62acb;color:#fff}
      #oneHomeXMobileHandoff .ohx-secondary{background:#182127;color:#fff;border:1px solid #47534f}
      #oneHomeXMobileHandoff .ohx-link{background:transparent;color:#c9d2ce;text-decoration:underline;padding:9px 12px}
    `;
    document.head.appendChild(style);

    const wrap=document.createElement('div');
    wrap.id='oneHomeXMobileHandoff';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');
    wrap.setAttribute('aria-labelledby','oneHomeXMobileHandoffTitle');
    wrap.innerHTML=`<section class="ohx-card">
      <p class="ohx-kicker">X → One Home</p>
      <h2 id="oneHomeXMobileHandoffTitle">Continue this mint in MetaMask</h2>
      <p>You opened an EVM mint from X's mobile browser. Continue in MetaMask before signing in so your One Home Passport session and the wallet used to mint stay in the same mobile browser.</p>
      <p class="ohx-note">Your exact mint and <strong>X source attribution</strong> travel with you. You will return to this same collection, then sign in to One Home and mint normally.</p>
      <div class="ohx-actions">
        <button class="ohx-primary" id="oneHomeXOpenMetaMask" type="button">Continue in MetaMask</button>
        <button class="ohx-secondary" id="oneHomeXCopyMintLink" type="button">Copy Exact Mint Link</button>
        <button class="ohx-link" id="oneHomeXStayHere" type="button">Stay in X browser</button>
      </div>
    </section>`;
    document.body.appendChild(wrap);
    document.getElementById('oneHomeXOpenMetaMask')?.addEventListener('click',openMetaMask);
    document.getElementById('oneHomeXCopyMintLink')?.addEventListener('click',function(){copyLink(this);});
    document.getElementById('oneHomeXStayHere')?.addEventListener('click',dismiss);
  }
  function init(){
    // Give the MetaMask mobile browser a short moment to inject its provider.
    // If it does, no handoff prompt is needed.
    setTimeout(render,180);
    window.addEventListener('ethereum#initialized',function(){document.getElementById('oneHomeXMobileHandoff')?.remove();},{once:true});
  }

  window.OneHomeXMobileHandoff={version:VERSION,render:render,metamaskUrl:metamaskUrl,dismiss:dismiss};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
