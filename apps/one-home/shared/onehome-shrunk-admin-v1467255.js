/* OH-255: admin control surface; server verifies One Home Passport and admin role on every request. */
(()=>{'use strict';
const URL='https://fshvettlltcujmwvikfq.supabase.co',KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB',$=id=>document.getElementById(id);
if(location.origin!=='https://doodlabs.app')return;
const sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'onehome-admin-auth-v2'}});
let state=null,busy=false;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const month=m=>new Date(m+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
const notice=(s,tone='')=>{const e=$('message');e.textContent=s;e.className='status '+tone;};
async function call(action,extra={}){
 const {data,error}=await sb.auth.getSession();if(error||!data?.session?.access_token)throw Error('Please sign in on One Home Admin first.');
 const response=await fetch(`${URL}/functions/v1/shrunk-live-admin`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({action,...extra})});
 const result=await response.json().catch(()=>({}));if(!response.ok||!result.success)throw Error(result.error||'SHRUNK Admin is unavailable.');return result;
}
async function refresh(){
 state=await call('status');$('signIn').textContent='Authorized One Home administrator';$('signIn').className='status good';
 for(const id of ['controls','calendar','bookingsSection'])$(id).hidden=false;
 $('sales').checked=state.settings.sales_open;$('capacity').value=state.settings.default_capacity;
 $('months').replaceChildren();
 for(const m of state.months){const wrap=document.createElement('div');wrap.className='month';
  wrap.innerHTML=`<strong>${esc(month(m.feature_month))}</strong><p>${m.booked} reserved or paid · ${m.remaining} remaining</p>
   <label>Capacity<input type="number" min="0" max="100" step="1" value="${Number(m.capacity)}" data-cap></label>
   <label class="line"><input type="checkbox" data-open ${m.booking_open?'checked':''}> Accept bookings for this month</label>
   <button type="button" data-save-month>Save ${esc(month(m.feature_month))}</button>`;
  wrap.querySelector('[data-save-month]').addEventListener('click',()=>changeMonth(m,wrap));$('months').appendChild(wrap);
 }
 const table=document.createElement('table');table.innerHTML='<thead><tr><th>Feature month</th><th>Creator / brand</th><th>Contact</th><th>Booking</th><th>Payment</th><th>Created</th></tr></thead>';
 const tbody=document.createElement('tbody');for(const c of state.bookings){const tr=document.createElement('tr');const order=c.order;
  tr.innerHTML=`<td>${esc(month(c.feature_month))}</td><td>${esc(c.display_name)}</td><td>${esc(c.contact_name)}<br>${esc(c.contact_email)}</td><td>${esc(c.booking_state)}</td><td>${esc(order?.order_status||c.payment_status)}</td><td>${esc(new Date(c.created_at).toLocaleDateString())}</td>`;tbody.appendChild(tr);}
 table.appendChild(tbody);$('bookings').replaceChildren(table);
}
async function changeMonth(m,wrap){if(busy)return;const input=wrap.querySelector('[data-cap]'),capacity=Number(input.value),booking_open=wrap.querySelector('[data-open]').checked;
 if(!Number.isInteger(capacity)||capacity<0||capacity>100){notice('Month capacity must be 0–100.','bad');return;}
 busy=true;try{await call('month',{feature_month:m.feature_month,capacity,booking_open});notice(`${month(m.feature_month)} updated. Existing bookings preserved.`,'good');await refresh();}catch(e){notice(e.message,'bad');}finally{busy=false;}}
async function save(){if(busy)return;const capacity=Number($('capacity').value),sales_open=$('sales').checked;
 if(!Number.isInteger(capacity)||capacity<1||capacity>100){notice('Default capacity must be 1–100.','bad');return;}
 if(sales_open&&!state?.settings.sales_open&&!confirm('Enable real $388 SHRUNK collaboration purchases for the next six full feature months? Existing Passport holders will be charged real money.')){
  $('sales').checked=false;return;}
 busy=true;$('saveSettings').disabled=true;
 try{const res=await call('settings',{sales_open,default_capacity:capacity});notice(res.sales_open?'Live $388 collaboration bookings are now open.':'New collaboration sales are paused. Paid bookings remain intact.','good');await refresh();}
 catch(e){notice(e.message,'bad');$('sales').checked=!!state?.settings.sales_open;}
 finally{busy=false;$('saveSettings').disabled=false;}
}
$('saveSettings').addEventListener('click',save);
$('verifySquare').addEventListener('click',async()=>{if(busy)return;busy=true;try{const d=await call('readiness');$('squareReadiness').textContent=d.square.reason;$('squareReadiness').className='status '+(d.square.ready?'good':'bad');}catch(e){notice(e.message,'bad');}finally{busy=false;}});
(async()=>{try{await refresh();}catch(e){$('signIn').textContent=e.message+' Open One Home Admin, sign in, then return here.';$('signIn').className='status bad';}})();
})();
