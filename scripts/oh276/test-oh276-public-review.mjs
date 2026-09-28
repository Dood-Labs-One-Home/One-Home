import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=b=>createHash('sha256').update(b).digest('hex');
const provenance=JSON.parse(read('docs/oh276-dependency-provenance.json'));
test('bookings page contains no captured RUM script and keeps the original authorization runtime',()=>{
 const page=read('apps/one-home/shrunk-bookings-admin.html');
 assert.doesNotMatch(page,/netlify-rum-container|data-netlify-cwv-token|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
 assert.match(page,/id="controls" hidden/);assert.match(page,/id="calendar" hidden/);assert.match(page,/id="bookingsSection" hidden/);
 assert.match(page,/\/shared\/onehome-shrunk-admin-v1467255\.js\?v=1467255/);
 assert.equal(sha(read('apps/one-home/shared/onehome-shrunk-admin-v1467255.js')),provenance.admin_runtime_sha256);
});
async function adminHarness({origin='https://doodlabs.app',session=true,authorized=false}={}){
 const nodes={},calls=[];const node=id=>nodes[id]??=( {hidden:['controls','calendar','bookingsSection'].includes(id),className:'',textContent:'',addEventListener(){},replaceChildren(){},appendChild(){}} );
 const context={window:{supabase:{createClient(){return{auth:{async getSession(){return{data:{session:session?{access_token:'unit-test-session'}:null}}}}}}}},location:{origin},document:{getElementById:node,createElement:()=>node('element-'+Object.keys(nodes).length)},fetch:async(url,opts)=>{calls.push({url,opts});return{ok:authorized,json:async()=>authorized?{success:true,settings:{sales_open:false,default_capacity:8},months:[],bookings:[]}:{success:false,error:'Admin access denied'}}},Date,console};
 vm.runInNewContext(read('apps/one-home/shared/onehome-shrunk-admin-v1467255.js'),context,{timeout:1000});await new Promise(setImmediate);
 return {nodes,calls,node};
}
test('booking admin rejects missing session without any backend call',async()=>{const h=await adminHarness({session:false});assert.equal(h.calls.length,0);assert.equal(h.node('controls').hidden,true);assert.match(h.node('signIn').textContent,/sign in/i)});
test('booking admin keeps private sections hidden after server denial',async()=>{const h=await adminHarness();assert.equal(h.calls.length,1);assert.equal(h.calls[0].opts.headers.Authorization,'Bearer unit-test-session');assert.equal(h.node('controls').hidden,true);assert.equal(h.node('calendar').hidden,true);assert.match(h.node('signIn').textContent,/denied/)});
test('booking admin reveals controls only after successful mocked authorization',async()=>{const h=await adminHarness({authorized:true});assert.equal(h.calls.length,1);assert.equal(JSON.parse(h.calls[0].opts.body).action,'status');assert.equal(h.node('controls').hidden,false);assert.equal(h.node('bookingsSection').hidden,false)});
test('booking admin retains its production-origin guard',async()=>{const h=await adminHarness({origin:'http://localhost:8080'});assert.equal(h.calls.length,0)});
const id='11111111-1111-4111-8111-111111111111';
function mintHarness({coverOk=true,slug='example-mint',linkFails=false}={}){
 const calls=[],exports={};const context={exports,URLSearchParams,console:{log(){},error(){}},fetch:async(url,opts)=>{calls.push({url,opts});if(url.endsWith('/onehome_public_mint_cover'))return{ok:coverOk,status:503,text:async()=>'',json:async()=>({name:'<script>bad()</script>',description:'A "public" mint',network:'testnet'})};if(linkFails)throw Error('mock link lookup unavailable');return{ok:true,json:async()=>({public_slug:slug})}}};
 vm.runInNewContext(read('netlify/functions/mint-share.js'),context,{timeout:1000});return{handler:exports.handler,calls};
}
test('mint-share invalid ID returns 404 without contacting any service',async()=>{const h=mintHarness();assert.equal((await h.handler({path:'/mint-share/not-a-uuid'})).statusCode,404);assert.equal(h.calls.length,0)});
test('mint-share escapes public metadata and pins canonical host and slug route',async()=>{const h=mintHarness();const r=await h.handler({path:'/mint-share/'+id,headers:{host:'attacker.invalid','x-forwarded-host':'attacker.invalid'},queryStringParameters:{chain:'avalanche-fuji'}});assert.equal(r.statusCode,200);assert.match(r.body,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);assert.doesNotMatch(r.body,/<script>bad\(\)<\/script>|attacker\.invalid/);assert.match(r.body,/https:\/\/doodlabs\.app\/mint-share\//);assert.match(r.body,/\/m\/example-mint\?source=x/);assert.equal(h.calls.length,2);assert.ok(h.calls.every(c=>c.url.includes('/rest/v1/rpc/')))});
test('mint-share fallback preserves Fuji and cannot redirect to an external URL',async()=>{const h=mintHarness({linkFails:true});const r=await h.handler({path:'/mint-share/'+id,queryStringParameters:{chain:'avalanche-fuji',route:'https://attacker.invalid'}});assert.equal(r.statusCode,200);assert.ok(r.body.includes('/mint/'+id+'?source=x&chain=avalanche-fuji'));assert.doesNotMatch(r.body,/location\.replace\("https:\/\/attacker/)});
test('mint-share failed cover lookup returns a no-store 503',async()=>{const h=mintHarness({coverOk:false});const r=await h.handler({queryStringParameters:{campaign:id}});assert.equal(r.statusCode,503);assert.equal(r.headers['Cache-Control'],'no-store')});
test('recovered dependency files match the reviewed exact-version hashes',()=>{for(const f of provenance.runtime_files)assert.equal(sha(fs.readFileSync(path.join(root,f.destination))),f.sha256,f.destination)});
test('archive workers retain their exact relative runtime layout',()=>{
 const dir='apps/one-home/assets/vendor/un7z-opfs-1.0.2/';assert.match(read(dir+'worker/opfs-extractor.js'),/from '\.\.\/dist\/7zz\.js'/);
 for(const p of [dir+'dist/7zz.wasm','apps/one-home/assets/vendor/7z-wasm-1.2.0/7zz.wasm'])assert.equal(WebAssembly.validate(fs.readFileSync(path.join(root,p))),true,p);
});
