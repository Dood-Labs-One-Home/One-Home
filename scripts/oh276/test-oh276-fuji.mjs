import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../../apps/one-home/'+p,import.meta.url),'utf8');
const mint=read('mint-studio.html'),buyer=read('passport/campaign-mint-page.js');
const config=vm.runInNewContext(mint.match(/const FALLBACK_EVM_TEST_NETWORKS=(\[[\s\S]*?\n \]);/)[1]);
const fallbacks=vm.runInNewContext('('+buyer.match(/const FALLBACK_EVM_NETWORKS=(\{[\s\S]*?\n  \});/)[1]+')');
test('creator and collector use Fuji, AVAX and the same network config',()=>{
 const creator=config.find(x=>x.chain_key==='avalanche-fuji'),collector=fallbacks['avalanche-fuji'];
 for(const c of [creator,collector]){
 assert.equal(c.chain_id,43113);assert.equal(c.chain_id_hex,'0xa869');assert.equal(c.environment,'testnet');assert.equal(c.native_symbol,'AVAX');assert.equal(c.wallet_add_chain.nativeCurrency.decimals,18);assert.equal(c.wallet_add_chain.rpcUrls[0],'https://api.avax-test.network/ext/bc/C/rpc');
 }
 assert.equal(JSON.stringify(creator),JSON.stringify(collector));
 assert.equal(config.some(c=>c.chain_key==='avalanche-mainnet'),false);
});
test('Passport wallet tree includes explicitly selected MetaMask Fuji in alphabetical order',()=>{
 const html=read('index.html'),block=html.match(/var CHAINS=(\[[\s\S]*?\]\.sort\(function\(a,b\)\{return a.label.localeCompare\(b.label\)\}\));/)[1];
 const rows=vm.runInNewContext(block,{window:{}});const a=rows.find(r=>r.key==='avalanche-fuji');
 assert.equal(a.ecosystem,'evm');assert.equal(a.providers[0].key,'metamask');
 assert.deepEqual([...rows.map(r=>r.label)],[...rows.map(r=>r.label)].sort((a,b)=>a.localeCompare(b)));
 assert.match(html,/selectedChainKey=''/);
});
test('Avalanche Mainnet is present but locked',()=>{\n const window={};vm.runInNewContext(read('shared/onehome-chain-identity-v1467114.js'),{window});\n const d=window.OneHomeChainIdentity.describe({chain_key:'avalanche-mainnet'});\n assert.equal(d.ecosystem,'evm');assert.equal(d.symbol,'AVAX');assert.equal(d.testOnly,false);assert.equal(d.known,true);\n const mainnet=fallbacks['avalanche-mainnet'];assert.equal(mainnet.chain_id,43114);assert.equal(mainnet.locked,true);assert.equal(mainnet.wallet_enabled,false);assert.equal(mainnet.mint_enabled,false);\n});\ntest('canonical identity distinguishes Fuji from mainnet',()=>{
 const window={};vm.runInNewContext(read('shared/onehome-chain-identity-v1467114.js'),{window});
 const d=window.OneHomeChainIdentity.describe({chain_key:'avalanche-fuji'});
 assert.equal(d.ecosystem,'evm');assert.equal(d.symbol,'AVAX');assert.equal(d.testOnly,true);assert.equal(d.known,true);
});
test('creator labels Fuji as Avalanche and preserves other family names',()=>{
 const body=mint.match(/function evmFamilyKey\(value\)\{[^\n]+/)[0];const context={};vm.runInNewContext(body,context);
 assert.equal(context.evmFamilyKey('avalanche-fuji'),'avalanche');assert.equal(context.evmFamilyKey('ethereum-sepolia'),'ethereum');assert.equal(context.evmFamilyKey('base-mainnet'),'base');
});
