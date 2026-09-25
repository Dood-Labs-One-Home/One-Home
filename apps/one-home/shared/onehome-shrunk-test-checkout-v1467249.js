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
const PENDING='onehome_shrunk_test_pending_application_v1';
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
// Reusable One Home checkout; SHRUNK-specific order creation/sync remains in this room.
const squareCheckout=window.OneHomeCardCheckout.create({invoke:fn,requireSandbox:true});
async function signIn(){const email=$('email').value.trim(),password=$('password').value;if(!email||!password)return status('authStatus','Enter your email and password.','warn');status('authStatus','Verifying your Test Passport…');try{const s=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});save(s);await validate()}catch(e){status('authStatus',e.message,'bad')}}
async function signOut(){try{if(token())await api('/auth/v1/logout',{method:'POST',headers:{Authorization:`Bearer ${token()}`}})}catch{}save(null);location.reload()}
async function validate(){const s=session();if(!s?.access_token)return;try{currentUser=await api('/auth/v1/user',{method:'GET',headers:{Authorization:`Bearer ${s.access_token}`}});$('signedOut').classList.add('hidden');$('signedIn').classList.remove('hidden');$('collabPanel').classList.remove('hidden');$('applicationPanel').classList.remove('hidden');$('passportIdentity').textContent=`${currentUser.email||'Test Passport'} · ${currentUser.id}`;status('authStatus','Your Test Passport is ready.','good');await loadCollaborations();if(!$('collaborationForm').elements.contact_email.value)$('collaborationForm').elements.contact_email.value=currentUser.email||'';recoverApplication();}catch(e){save(null);status('authStatus','Your test session expired. Sign in again.','warn')}}
async function loadCollaborations(){status('collabStatus','Loading your collaborations…');try{const d=await fn('shrunk-supply-drop-collaboration-manager',{action:'mine'});const rows=d.collaborations||[];if(!rows.length){$('collabList').replaceChildren();status('collabStatus','No collaborations yet. Complete the form above to begin.','warn');return}$('collabList').innerHTML=rows.map(x=>`<div class="collab"><div><strong>${esc(x.display_name)}</strong><small>Status: ${esc((x.collaboration_status||'').replaceAll('_',' '))} · Payment: ${esc((x.payment_status||'').replaceAll('_',' '))}</small></div><button class="btn" data-collab="${esc(x.id)}">${x.payment_status==='paid'?'View Paid Result':'Checkout'}</button></div>`).join('');$('collabList').querySelectorAll('[data-collab]').forEach(b=>b.addEventListener('click',()=>openCheckout(rows.find(x=>x.id===b.dataset.collab))));status('collabStatus',`${rows.length} collaboration${rows.length===1?'':'s'} found.`,'good')}catch(e){status('collabStatus',e.message,'bad')}}
// The same Passport session is shared with the existing standalone Sandbox checkout.
// A submitted application is always server-owned; the client never chooses its price.
function formData(){
  const form=$('collaborationForm');
  return {
    collaborator_type:form.elements.collaborator_type.value,
    display_name:form.elements.display_name.value.trim(),
    contact_name:form.elements.contact_name.value.trim(),
    contact_email:form.elements.contact_email.value.trim(),
    category:form.elements.category.value.trim(),
    location_text:form.elements.location_text.value.trim(),
    destination_url:form.elements.destination_url.value.trim(),
    creative_prompt:form.elements.creative_prompt.value.trim()
  };
}
function recoverApplication(){
  let pending;try{pending=JSON.parse(sessionStorage.getItem(PENDING)||'null')}catch{}
  if(!pending||pending.passport_id!==currentUser?.id||!pending.fields)return;
  const form=$('collaborationForm');
  for(const [name,value] of Object.entries(pending.fields))if(form.elements[name])form.elements[name].value=value;
  status('formStatus','An earlier request may have reached One Home. Retry this saved application to avoid creating a duplicate.','warn');
}
async function createSandboxCollaboration(event){
  event.preventDefault();
  if(!currentUser?.id||!currentUser?.email)return status('formStatus','Sign in to your existing Test Passport first.','warn');
  const form=$('collaborationForm');
  if(!form.reportValidity())return;
  const button=$('newSandboxCollab');if(button.disabled)return;
  const fields=formData();
  const eligible=['creator','brand'];
  if(!eligible.includes(fields.collaborator_type))return status('formStatus','Choose Creator or Brand.','bad');
  // Hold the original payload and request ID across a timeout/reload. Never silently
  // generate a second order when the first submit may already have succeeded.
  let pending;try{pending=JSON.parse(sessionStorage.getItem(PENDING)||'null')}catch{}
  if(pending?.passport_id===currentUser.id&&pending.client_request_id){
    if(JSON.stringify(fields)!==JSON.stringify(pending.fields)){
      return status('formStatus','A previous submission is still unresolved. Restore the saved application and retry before changing its details.','warn');
    }
  }else{
    pending={passport_id:currentUser.id,client_request_id:crypto.randomUUID(),fields};
    sessionStorage.setItem(PENDING,JSON.stringify(pending));
  }
  button.disabled=true;status('formStatus','Submitting your collaboration to One Home…');
  try{
    const result=await fn('shrunk-supply-drop-collaboration-manager',{
      action:'submit',client_request_id:pending.client_request_id,...pending.fields
    });
    if(!result?.order?.id)throw new Error('The collaboration did not return an order. Retry this saved application.');
    sessionStorage.removeItem(PENDING);
    status('formStatus','Your unpaid collaboration was saved under this Passport. Choose Checkout below.','good');
    await loadCollaborations();
    $('collabPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){
    status('formStatus',`${e.message} Your application is saved in this tab for a safe retry.`,'bad');
  }finally{button.disabled=false;}
}
async function openCheckout(collab){currentCollaboration=collab;currentOrder=null;$('checkoutPanel').classList.remove('hidden');$('checkoutName').textContent=collab.display_name||'SHRUNK Collaboration';$('checkoutMeta').textContent=`Collaboration ${collab.id}`;$('price').textContent='…';$('payButton').textContent='Loading checkout…';$('payButton').disabled=true;$('cardWrap').classList.add('hidden');status('squareStatus','Preparing a One Home card order…');status('paymentStatus','');$('resultPanel').classList.add('hidden');try{
  const prepared=await fn('shrunk-card-checkout-adapter',{action:'prepare',collaboration_id:collab.id});
  const orderId=prepared?.generic_order?.order_id;
  if(!orderId)throw new Error('The SHRUNK adapter did not return a One Home card order.');
  const cfg=await squareCheckout.config();
  const state=await squareCheckout.state(orderId);
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
  await initCard(cfg);
  $('cardWrap').classList.remove('hidden');$('payButton').disabled=false;
  $('checkoutPanel').scrollIntoView({behavior:'smooth',block:'start'});
}catch(e){status('squareStatus',e.message,'bad')}}
async function initCard(cfg){if(card){try{await card.destroy()}catch{}card=null}$('card-container').replaceChildren();card=await squareCheckout.mountCard(cfg,'#card-container')}
async function syncShrunk(orderId){if(!orderId)return null;try{return await fn('shrunk-card-checkout-adapter',{action:'sync',order_id:orderId})}catch(e){return {success:false,error:e.message,payload:e.payload||null}}}
async function pay(){
  if(!card||!currentCollaboration||!currentOrder?.id)return;
  const btn=$('payButton');btn.disabled=true;
  status('paymentStatus','Checking the Square Sandbox card…');
  let requestSent=false;
  try{
    // Site-wide payment handling belongs to the shared checkout core.
    const payment=await squareCheckout.charge({card,order:currentOrder,email:currentUser?.email,onSubmitting(){requestSent=true;status('paymentStatus','Square accepted the card details. Processing the One Home order…');}});
    const synced=await syncShrunk(currentOrder.id);
    const state=await squareCheckout.state(currentOrder.id);
    const confirmed=state?.order?.order_status==='paid'&&(synced?.applied===true||synced?.already_applied===true);
    status('paymentStatus',confirmed?'Sandbox payment completed and SHRUNK status confirmed.':'Square returned a result. Fulfillment confirmation is still pending.',confirmed?'good':'warn');
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
$('collaborationForm').addEventListener('submit',createSandboxCollaboration);$('signIn').addEventListener('click',signIn);$('signOut').addEventListener('click',signOut);$('payButton').addEventListener('click',pay);$('password').addEventListener('keydown',e=>{if(e.key==='Enter')signIn()});validate();
// This file shares the exact OH-248 native SHRUNK room renderer and CSS, without
// ever loading the production One Home app or production Supabase credentials.
window.oneHomeJourneyOpenPassport=()=>$('authPanel').scrollIntoView({behavior:'smooth',block:'start'});
document.addEventListener('DOMContentLoaded',()=>{
  const room=$('onehomeShrunkCollabPage');const workflow=$('ohTestFlow');
  if(!room||!workflow){status('authStatus','The SHRUNK room could not be loaded. Restart the preview.','bad');return;}
  room.querySelector('.oh-shrunk-room')?.appendChild(workflow);
  const actions=room.querySelector('.oh-shrunk-actions');
  if(actions){
    const start=document.createElement('button');start.type='button';start.className='oh-shrunk-btn';start.textContent='Start a Collaboration';
    start.addEventListener('click',()=>$('authPanel').scrollIntoView({behavior:'smooth',block:'start'}));
    actions.prepend(start);
    const home=room.querySelector('#sc-public-home');if(home){home.textContent='My Collaborations';
      home.addEventListener('click',event=>{event.stopImmediatePropagation();$('collabPanel').scrollIntoView({behavior:'smooth',block:'start'});},true);
    }
  }
});
})();
