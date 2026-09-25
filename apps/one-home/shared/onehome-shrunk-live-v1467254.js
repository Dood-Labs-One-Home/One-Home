/* OH-254 — Real One Home Passport, Square production only, SHRUNK product adapter.
   Requires production activation: live functions + production seller credentials + enabled product.
   No test accounts, test cards, sandbox URLs, or client-selected prices. */
(()=>{'use strict';
const SB_URL='https://fshvettlltcujmwvikfq.supabase.co';
const KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(location.origin!=='https://doodlabs.app')return;
let sb=null,me=null,checkout=null,order=null,card=null,rows=[],busy=false,current=null;
const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(c)/100);
const status=(id,msg,tone='')=>{const e=$(id);if(e){e.textContent=msg;e.className='oh254-status'+(tone?' '+tone:'');}};
function passport(){
  if(sb)return sb;
  const existing=[window.oneHomePassportSupabase,window.doodProfileSupabase,window.doodSupabase,window.supabaseClient].find(c=>c?.auth?.getSession&&c.supabaseUrl===SB_URL);
  if(existing)return sb=existing;
  if(window.supabase?.createClient)return sb=window.supabase.createClient(SB_URL,KEY);
  throw Error('Your One Home Passport is still loading.');
}
async function invoke(name,body){
  const client=passport();const {data}=await client.auth.getSession();
  if(!data?.session?.access_token)throw Error('Please sign in to your existing One Home Passport.');
  const response=await fetch(`${SB_URL}/functions/v1/${name}`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify(body)});
  let result={};try{result=await response.json();}catch{}
  if(!response.ok||result.success===false){const error=new Error(result.error||'One Home could not complete the request.');error.payload=result;throw error;}
  return result;
}
const room=(action,params={})=>invoke('shrunk-live-collaboration',{action,...params});
const safeUuid=v=>/^[0-9a-f-]{36}$/i.test(v||'');
function template(){const host=$('onehomeShrunkCollabPage')?.querySelector('.oh-shrunk-room');if(!host||$('oh254LiveFlow'))return;
  const flow=document.createElement('section');flow.id='oh254LiveFlow';flow.className='oh254-live-flow';
  flow.innerHTML=`<section class="oh254-panel"><h2>SHRUNK Collaborations</h2><div id="oh254Identity" class="oh254-status" role="status">Checking your One Home Passport…</div>
    <div id="oh254Availability" class="oh254-status">Checking checkout availability…</div></section>
    <section id="oh254Application" class="oh254-panel" hidden><h2>Start your collaboration</h2><form id="oh254Form">
    <div class="oh254-fields"><label>I'm a<select name="collaborator_type" required><option value="creator">Creator</option><option value="brand">Brand</option></select></label>
    <label>Brand or creator name<input name="display_name" required minlength="2" maxlength="120"></label>
    <label>Contact name<input name="contact_name" required maxlength="120"></label>
    <label>Contact email<input name="contact_email" type="email" required maxlength="250"></label>
    <label>Category<input name="category" required maxlength="120"></label>
    <label>Location<input name="location_text" required maxlength="120"></label></div>
    <label>Website destination (optional)<input name="destination_url" type="url" pattern="https://.*" maxlength="1000" placeholder="https://"></label>
    <label>Tell us your collaboration idea<textarea name="creative_prompt" required minlength="10" maxlength="2000" rows="4"></textarea></label>
    <p class="oh254-note">Review your details before submitting. Your order is saved under your existing One Home Passport. Payment does not guarantee an inventory slot until the collaboration is accepted.</p>
    <button class="oh-shrunk-btn" id="oh254Submit" type="submit">Submit collaboration</button></form><div id="oh254FormStatus" class="oh254-status" role="status"></div></section>
    <section id="oh254History" class="oh254-panel" hidden><h2>My collaborations</h2><div id="oh254List" class="oh254-list"></div></section>
    <section id="oh254Checkout" class="oh254-panel" hidden><h2 id="oh254CheckoutName">Collaboration</h2><h3 id="oh254Price"></h3><div id="oh254CheckoutStatus" class="oh254-status" role="status"></div>
    <div id="oh254CardFields" hidden><div id="oh254Card"></div><button class="oh-shrunk-btn" id="oh254Pay" type="button" disabled>Pay securely</button><p class="oh254-note">Card details are entered into Square-hosted fields. The total comes from your One Home order.</p></div>
    <div id="oh254PaymentStatus" class="oh254-status" role="status"></div></section>`;
  host.appendChild(flow);$('oh254Form').addEventListener('submit',submit);$('oh254Pay').addEventListener('click',pay);
}
async function fetchMine(){const out=await room('mine');rows=out.collaborations||[];
  $('oh254List').replaceChildren();for(const item of rows){const wrap=document.createElement('div');wrap.className='oh254-item';const detail=document.createElement('div');detail.innerHTML=`<strong>${esc(item.display_name)}</strong><small>${item.payment_status==='paid'?'Payment confirmed':'Payment not complete'}</small>`;
  const button=document.createElement('button');button.className='oh-shrunk-btn';button.textContent=item.payment_status==='paid'?'View paid result':'Open checkout';button.addEventListener('click',()=>open(item));wrap.append(detail,button);$('oh254List').append(wrap);}
  $('oh254History').hidden=false;
}
async function refresh(){try{
  const client=passport(),{data}=await client.auth.getSession();if(!data.session){me=null;$('oh254Application').hidden=true;$('oh254History').hidden=true;$('oh254Checkout').hidden=true;status('oh254Identity','Sign in using the One Home Passport button above.','warn');return;}
  const verified=await client.auth.getUser();if(verified.error||!verified.data.user)throw Error('Your One Home Passport session has expired. Sign in again.');
  if(!me||me.id!==verified.data.user.id){me=verified.data.user;order=null;current=null;$('oh254Checkout').hidden=true;}
  status('oh254Identity','Signed in with your existing One Home Passport.','good');
  const cfg=await checkout.config();if(cfg.environment!=='production')throw Error('Production checkout configuration could not be verified.');
  status('oh254Availability','Secure card checkout is available.','good');$('oh254Application').hidden=false;
  const field=$('oh254Form').elements.contact_email;if(!field.value)field.value=me.email||'';
  await fetchMine();
}catch(e){status('oh254Availability',e.message||'Card checkout is not available.','warn');$('oh254Application').hidden=true;$('oh254History').hidden=true;$('oh254Checkout').hidden=true;}}
async function submit(event){event.preventDefault();if(busy||!me)return;const form=$('oh254Form');if(!form.reportValidity())return;
  const payload=Object.fromEntries(new FormData(form).entries());const pendingKey='oh254_live_collab_request_'+me.id;let saved=null;try{saved=JSON.parse(sessionStorage.getItem(pendingKey)||'null');}catch{}
  if(saved&&JSON.stringify(saved.fields)!==JSON.stringify(payload)){status('oh254FormStatus','Your previous submission needs confirmation. Reload this page before changing the details.','warn');return;}
  const key=saved?.id||crypto.randomUUID();if(!saved)sessionStorage.setItem(pendingKey,JSON.stringify({id:key,fields:payload}));const button=$('oh254Submit');busy=true;button.disabled=true;
  status('oh254FormStatus','Saving your collaboration…');
  try{const data=await room('submit',{client_request_id:key,...payload});sessionStorage.removeItem(pendingKey);status('oh254FormStatus','Collaboration saved. Open its checkout below.','good');form.reset();await fetchMine();const item=rows.find(x=>x.id===data.collaboration_id);if(item)await open(item);}
  catch(e){status('oh254FormStatus',`${e.message} This submission is saved for a safe retry; please do not create a second application.`, 'bad');}
  finally{busy=false;button.disabled=false;}
}
async function ensureSquare(){
  if(window.Square)return;
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://web.squarecdn.com/v1/square.js';script.async=true;script.onload=resolve;script.onerror=()=>reject(Error('Secure Square payment fields did not load. No payment was attempted.'));document.head.appendChild(script);});
}
async function open(item){if(busy||!safeUuid(item?.id))return;busy=true;current=item;order=null;
  $('oh254Checkout').hidden=false;$('oh254CardFields').hidden=true;$('oh254Pay').disabled=true;status('oh254PaymentStatus','');$('oh254CheckoutName').textContent=item.display_name;
  status('oh254CheckoutStatus','Loading your One Home order…');
  try{const prep=await room('prepare',{collaboration_id:item.id});const id=prep.generic_order?.order_id;if(!safeUuid(id))throw Error('One Home did not return an order.');
    const state=await checkout.state(id);order=state.order;if(order?.passport_id!==me.id||order.subject_id!==item.id)throw Error('Passport ownership verification failed.');
    $('oh254Price').textContent=money(order.amount_cents);
    if(order.order_status==='paid'){
      await room('sync',{order_id:order.id});$('oh254CardFields').hidden=true;status('oh254CheckoutStatus','Payment confirmed. This collaboration is already paid.','good');await fetchMine();return;
    }
    if(state.payment_pending||order.order_status==='review')throw Error('An earlier payment needs reconciliation. No new charge is allowed.');
    const cfg=await checkout.config();await ensureSquare();if(card){try{await card.destroy();}catch{}card=null;}
    $('oh254Card').replaceChildren();card=await checkout.mountCard(cfg,'#oh254Card');$('oh254CardFields').hidden=false;
    $('oh254Pay').textContent=`Pay ${money(order.amount_cents)} securely`;$('oh254Pay').disabled=false;status('oh254CheckoutStatus','Review the total and enter your card in the secure Square form.','good');
  }catch(e){status('oh254CheckoutStatus',e.message,'bad');}finally{busy=false;$('oh254Checkout').scrollIntoView({behavior:'smooth',block:'start'});}
}
async function pay(){if(busy||!me||!order||!card)return;busy=true;$('oh254Pay').disabled=true;let submitted=false;
  status('oh254PaymentStatus','Processing your payment…');
  try{await checkout.charge({card,order,email:me.email,onSubmitting(){submitted=true;}});
    const state=await checkout.state(order.id);if(state.order?.order_status!=='paid')throw Error('Square payment needs confirmation. Do not retry.');
    await room('sync',{order_id:order.id});$('oh254CardFields').hidden=true;status('oh254PaymentStatus','Payment completed. You will not be charged again for this order.','good');
    status('oh254CheckoutStatus','Payment confirmed.','good');await fetchMine();
  }catch(e){const state=submitted?await checkout.state(order.id).catch(()=>null):null;
    if(state?.order?.order_status==='paid'){await room('sync',{order_id:order.id}).catch(()=>null);$('oh254CardFields').hidden=true;status('oh254PaymentStatus','Payment confirmed. No additional charge is needed.','good');await fetchMine();}
    else if(e.cardValidation){status('oh254PaymentStatus',e.message,'warn');$('oh254Pay').disabled=false;}
    else if(submitted&&e.payload?.failure_code&&state?.order?.order_status==='unpaid'&&!state.payment_pending){status('oh254PaymentStatus','Payment was declined; no charge completed. You may use another card.','warn');$('oh254Pay').disabled=false;}
    else{status('oh254PaymentStatus','Payment status is unconfirmed. Do not retry or submit another payment; contact One Home support.','bad');}
  }finally{busy=false;}
}
function boot(){template();if(!$('oh254LiveFlow'))return;
  checkout=window.OneHomeProductionCardCheckout?.create({invoke,requireSandbox:false,paymentFunction:'onehome-square-live-payment'});
  if(!checkout){status('oh254Availability','Payment service could not be loaded.','bad');return;}
  passport().auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();
}
function wait(){if(!$('onehomeShrunkCollabPage')||!window.OneHomeProductionCardCheckout){setTimeout(wait,180);return;}boot();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();
