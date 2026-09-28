(()=>{
'use strict';
// Square accepts localhost for development, but the browser's saved-card autofill
// can still refuse HTTP. This Sandbox test is now HTTPS-only with a user-trusted,
// short-lived localhost certificate. Nothing here ever accepts real card details.
if(location.hostname==='127.0.0.1'||(location.hostname==='localhost'&&location.protocol!=='https:')){
  const target=`https://localhost:5173${location.pathname}${location.search}${location.hash}`;
  location.replace(target);
  return;
}
if(location.hostname!=='localhost'||location.protocol!=='https:'||!window.isSecureContext){
  document.body.textContent='This test checkout requires trusted HTTPS at https://localhost:5173. Start it with START-SQUARE-SANDBOX-WINDOWS.cmd.';
  return;
}
// A previous test launcher used persistent localStorage. Remove that stale token.
try { localStorage.removeItem('onehome_square_sandbox_session_v2'); } catch {}
const SUPABASE_URL='https://pkliihvrgoumnnksorau.supabase.co';
const API_KEY='sb_publishable_DKcvBELxC9sXvoNWh8roDQ_M5V2-46z';
const STORE='onehome_square_sandbox_session_v3';
const PENDING='onehome_square_sandbox_pending_collaboration_v1';
const $=id=>document.getElementById(id);
let currentUser=null,currentCollaboration=null,currentOrder=null,card=null;
function session(){try{return JSON.parse(sessionStorage.getItem(STORE)||'null')}catch{return null}}
function save(s){s?sessionStorage.setItem(STORE,JSON.stringify(s)):sessionStorage.removeItem(STORE)}
function token(){return session()?.access_token||''}
function status(id,msg,tone=''){const e=$(id);e.textContent=String(msg||'');e.className='status'+(tone?' '+tone:'')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function money(cents,currency='USD'){try{return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(Number(cents||0)/100)}catch{return `$${(Number(cents||0)/100).toFixed(2)}`}}
async function api(path,opt={}){const headers=Object.assign({'apikey':API_KEY,'Content-Type':'application/json'},opt.headers||{});const r=await fetch(SUPABASE_URL+path,{...opt,headers});let p={};try{p=await r.json()}catch{}if(!r.ok)throw new Error(p?.msg||p?.message||p?.error_description||p?.error||`Request failed (${r.status})`);return p}
async function fn(name,body){if(!token())throw new Error('Sign in to your Test Passport first.');const r=await fetch(`${SUPABASE_URL}/functions/v1/${name}`,{method:'POST',headers:{'apikey':API_KEY,'Authorization':`Bearer ${token()}`,'Content-Type':'application/json'},body:JSON.stringify(body)});let p={};try{p=await r.json()}catch{}if(!r.ok||p?.success===false){const e=new Error(p?.error||`Request failed (${r.status})`);e.payload=p;e.status=r.status;throw e}return p}
async function signIn(){const email=$('email').value.trim(),password=$('password').value;if(!email||!password)return status('authStatus','Enter your email and password.','warn');status('authStatus','Verifying your Test Passport…');try{const s=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});save(s);await validate()}catch(e){status('authStatus',e.message,'bad')}}
async function signOut(){sessionStorage.removeItem(PENDING);try{if(token())await api('/auth/v1/logout',{method:'POST',headers:{Authorization:`Bearer ${token()}`}})}catch{}save(null);location.reload()}
async function validate(){const s=session();if(!s?.access_token)return;try{currentUser=await api('/auth/v1/user',{method:'GET',headers:{Authorization:`Bearer ${s.access_token}`}});$('signedOut').classList.add('hidden');$('signedIn').classList.remove('hidden');$('collabPanel').classList.remove('hidden');$('passportIdentity').textContent=`${currentUser.email||'Test Passport'} · ${currentUser.id}`;status('authStatus','Your Test Passport is ready.','good');await loadCollaborations()}catch(e){save(null);status('authStatus','Your test session expired. Sign in again.','warn')}}
async function loadCollaborations(){status('collabStatus','Loading your collaborations…');try{const d=await fn('shrunk-supply-drop-collaboration-manager',{action:'mine'});const rows=d.collaborations||[];if(!rows.length){status('collabStatus','No collaborations found in this Test Passport.','warn');return}$('collabList').innerHTML=rows.map(x=>`<div class="collab"><div><strong>${esc(x.display_name)}</strong><small>Status: ${esc((x.collaboration_status||'').replaceAll('_',' '))} · Payment: ${esc((x.payment_status||'').replaceAll('_',' '))}</small></div><button class="btn" data-collab="${esc(x.id)}">${x.payment_status==='paid'?'View Paid Result':'Test Checkout'}</button></div>`).join('');$('collabList').querySelectorAll('[data-collab]').forEach(b=>b.addEventListener('click',()=>openCheckout(rows.find(x=>x.id===b.dataset.collab))));status('collabStatus',`${rows.length} collaboration${rows.length===1?'':'s'} found.`,'good')}catch(e){status('collabStatus',e.message,'bad')}}
async function createSandboxCollaboration(){
  if(!currentUser?.id||!currentUser?.email)return status('collabStatus','Sign in to your Test Passport first.','warn');
  const button=$('newSandboxCollab');
  if(button.disabled)return;
  button.disabled=true;
  const name=`Square Sandbox Test ${new Date().toISOString().slice(0,19).replace('T',' ')} UTC`;
  let pending;
  try{pending=JSON.parse(sessionStorage.getItem(PENDING)||'null')}catch{}
  if(!pending||pending.passport_id!==currentUser.id||!pending.client_request_id){
    pending={passport_id:currentUser.id,client_request_id:crypto.randomUUID(),display_name:name};
    sessionStorage.setItem(PENDING,JSON.stringify(pending));
  }
  status('collabStatus','Creating an unpaid Sandbox collaboration under your existing Passport…');
  try{
    const result=await fn('shrunk-supply-drop-collaboration-manager',{
      action:'submit',client_request_id:pending.client_request_id,
      collaborator_type:'creator',display_name:pending.display_name,
      contact_name:'Test Passport',contact_email:currentUser.email,
      category:'Sandbox testing',location_text:'Sandbox only',
      creative_prompt:'Square Sandbox-only card payment testing. No real production or fulfillment.'
    });
    if(!result?.order?.id)throw new Error('The Sandbox collaboration did not return an order. Please try again.');
    sessionStorage.removeItem(PENDING);
    await loadCollaborations();
    status('collabStatus',`Created ${pending.display_name}. Choose Test Checkout beside it to try the decline card. Your paid collaboration is unchanged.`,'good');
    $('collabPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){
    status('collabStatus',`${e.message} You can retry without duplicating this request.`,'bad');
  }finally{button.disabled=false;}
}
async function openCheckout(collab){currentCollaboration=collab;currentOrder=null;$('checkoutPanel').classList.remove('hidden');$('checkoutName').textContent=collab.display_name||'SHRUNK Collaboration';$('checkoutMeta').textContent=`Collaboration ${collab.id}`;$('price').textContent='…';$('payButton').textContent='Loading checkout…';$('payButton').disabled=true;$('cardWrap').classList.add('hidden');status('squareStatus','Preparing a One Home card order…');status('paymentStatus','');$('resultPanel').classList.add('hidden');try{
  const prepared=await fn('shrunk-card-checkout-adapter',{action:'prepare',collaboration_id:collab.id});
  const orderId=prepared?.generic_order?.order_id;
  if(!orderId)throw new Error('The SHRUNK adapter did not return a One Home card order.');
  const cfg=await fn('onehome-square-card-payment',{action:'config'});
  const state=await fn('onehome-square-card-payment',{action:'checkout_state',order_id:orderId});
  currentOrder=state?.order||prepared?.generic_order||null;
  if(!currentOrder?.id)throw new Error('The One Home card order could not be loaded.');
  const total=money(currentOrder.amount_cents,currentOrder.currency||'USD');
  $('price').textContent=total;
  $('payButton').textContent=`Pay ${total} in Square Sandbox`;
  $('checkoutMeta').textContent=`One Home order ${currentOrder.id}`;
  if(currentOrder.order_status==='paid'){
    status('squareStatus','This One Home card order is already paid. Syncing SHRUNK status…','good');
    const synced=await fn('shrunk-card-checkout-adapter',{action:'sync',order_id:currentOrder.id});
    showResult({payment_state:state,shrunk_sync:synced});
    await loadCollaborations();
    return;
  }
  status('squareStatus',`Square Sandbox connected · server order total ${total}`,'good');
  await initCard(cfg.application_id,cfg.location_id);
  $('cardWrap').classList.remove('hidden');$('payButton').disabled=false;
  $('checkoutPanel').scrollIntoView({behavior:'smooth',block:'start'});
}catch(e){status('squareStatus',e.message,'bad')}}
async function initCard(appId,locationId){if(!window.isSecureContext||location.protocol!=='https:')throw new Error('This card form requires trusted HTTPS. Restart the OH-247 secure launcher.');if(!window.Square)throw new Error('Square Sandbox SDK did not load. Check your internet connection.');if(card){try{await card.destroy()}catch{}card=null}$('card-container').innerHTML='';const payments=window.Square.payments(appId,locationId);card=await payments.card();await card.attach('#card-container')}
async function syncShrunk(orderId){if(!orderId)return null;try{return await fn('shrunk-card-checkout-adapter',{action:'sync',order_id:orderId})}catch(e){return {success:false,error:e.message,payload:e.payload||null}}}
function cardValidationMessage(errors){
  const fields=Array.isArray(errors)?errors:[];
  if(!fields.length)return 'Check the card number, expiration date, CVV, and postal code. No payment was attempted.';
  const names={cardNumber:'card number',cvv:'CVV',expirationDate:'expiration date',postalCode:'postal code'};
  const invalid=[...new Set(fields.map(x=>names[x?.field]||'card details'))];
  return `Please correct your ${invalid.join(', ')}. No payment was attempted.`;
}
async function pay(){
  if(!card||!currentCollaboration||!currentOrder?.id)return;
  const btn=$('payButton');btn.disabled=true;
  status('paymentStatus','Checking the Square Sandbox card…');
  let requestSent=false;
  try{
    const amount=(Number(currentOrder.amount_cents)/100).toFixed(2);
    const currency=currentOrder.currency||'USD';
    // Square owns the iframe fields; no raw card data ever enters One Home JavaScript.
    // Charge verification is performed as part of Square's card.tokenize(details).
    const details={amount,currencyCode:currency,intent:'CHARGE',customerInitiated:true,sellerKeyedIn:false,
      billingContact:{email:currentUser?.email||undefined,countryCode:'US'}};
    const tr=await card.tokenize(details);
    if(tr.status!=='OK'||!tr.token){
      const error=new Error(cardValidationMessage(tr.errors));
      error.cardValidation=true;
      error.fields=Array.isArray(tr.errors)?tr.errors.map(x=>({field:x.field||'unknown',type:x.type||'VALIDATION_ERROR'})):[];
      throw error;
    }
    status('paymentStatus','Square accepted the card details. Processing the One Home order…');
    requestSent=true;
    const payment=await fn('onehome-square-card-payment',{action:'create_payment',order_id:currentOrder.id,source_id:tr.token,request_id:crypto.randomUUID()});
    const synced=await syncShrunk(currentOrder.id);
    const state=await fn('onehome-square-card-payment',{action:'checkout_state',order_id:currentOrder.id});
    const confirmed=state?.order?.order_status==='paid'&&synced?.applied===true;
    status('paymentStatus',confirmed?'Sandbox payment completed and SHRUNK slot confirmed.':'Square returned a result. Fulfillment confirmation is still pending.',confirmed?'good':'warn');
    showResult({payment,shrunk_sync:synced,payment_state:state});
    await loadCollaborations();
  }catch(e){
    const code=e?.payload?.failure_code?` (${e.payload.failure_code})`:'';
    status('paymentStatus',`${e.message}${code}`,'bad');
    if(e.cardValidation){
      showResult({stage:'card_validation',charged:false,errors:e.fields,generic_order_status:currentOrder?.order_status||'unknown'});
    }else{
      const synced=requestSent?await syncShrunk(currentOrder?.id):null;
      showResult({stage:requestSent?'payment_processing':'card_tokenization',charged:'not confirmed',
        error:e?.payload?.error||e.message,failure_code:e?.payload?.failure_code||null,shrunk_sync:synced});
    }
    await loadCollaborations();
    btn.disabled=false;
  }
}
function showResult(data){
  $('resultPanel').classList.remove('hidden');
  const order=data?.payment_state?.order||data?.payment?.order||{};
  const sync=data?.shrunk_sync||{};
  const paid=order.order_status==='paid'&&(sync.applied===true||sync.already_applied===true);
  const validation=data?.stage==='card_validation';
  status('resultStatus',paid?'PASS — card payment completed and SHRUNK fulfillment synced.':validation?'Card fields need correction. No payment was attempted.':'Payment is not confirmed. Review the result below.',paid?'good':'warn');
  $('resultDetail').textContent=JSON.stringify(data,null,2);
  $('resultPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
$('newSandboxCollab').addEventListener('click',createSandboxCollaboration);$('signIn').addEventListener('click',signIn);$('signOut').addEventListener('click',signOut);$('payButton').addEventListener('click',pay);$('password').addEventListener('keydown',e=>{if(e.key==='Enter')signIn()});validate();
})();
