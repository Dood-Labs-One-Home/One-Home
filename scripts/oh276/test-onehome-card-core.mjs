import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const core=readFileSync(new URL('../../apps/one-home/shared/onehome-card-checkout-core-v1467249.js',import.meta.url),'utf8');
const calls=[];
const sandbox={window:{isSecureContext:true},location:{protocol:'https:'},crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'}};
vm.createContext(sandbox);vm.runInContext(core,sandbox);
const checkout=sandbox.window.OneHomeCardCheckout.create({invoke:async(name,payload)=>{calls.push({name,payload});if(payload.action==='config')return {environment:'production',application_id:'production-app',location_id:'loc'};return {order:{id:'order-1',amount_cents:38800,currency:'USD'}}}});
let rejected=false;
try{await checkout.config()}catch(e){rejected=/Sandbox configuration was not verified/.test(e.message)}
if(!rejected||calls.length!==1)throw Error('Production Square configuration was not blocked.');
console.log('PASS: site-wide card core rejects production Square configuration in test mode.');
let paymentCalls=0;
const safe=sandbox.window.OneHomeCardCheckout.create({invoke:async(name,payload)=>{if(payload.action==='create_payment')paymentCalls++;return {success:true}}});
let invalid=false;
try{await safe.charge({card:{tokenize:async()=>({status:'INVALID',errors:[{field:'cvv',type:'VALIDATION_ERROR'}]})},order:{id:'order-1',amount_cents:38800,currency:'USD'}})}catch(e){invalid=Boolean(e.cardValidation)&&e.fields?.[0]?.field==='cvv'}
if(!invalid||paymentCalls)throw Error('Invalid card reached payment endpoint.');
console.log('PASS: invalid card never calls payment service.');
const order={id:'order-1',amount_cents:38800,currency:'USD'};
const sent=[];
const success=sandbox.window.OneHomeCardCheckout.create({invoke:async(name,payload)=>{sent.push({name,payload});return {success:true,order:{order_status:'paid'}}}});
let charged=false;
await success.charge({card:{tokenize:async(d)=>{if(d.amount!=='388.00'||d.currencyCode!=='USD')throw Error('Bad amount');return {status:'OK',token:'square-sandbox-token'}}},order,onSubmitting:()=>charged=true});
if(!charged||sent.length!==1||sent[0].name!=='onehome-square-card-payment'||sent[0].payload.action!=='create_payment'||sent[0].payload.order_id!==order.id||'amount_cents' in sent[0].payload)throw Error('Generic payment request failed contract.');
console.log('PASS: generic checkout uses server-owned order ID, Square token, no client-supplied price.');
