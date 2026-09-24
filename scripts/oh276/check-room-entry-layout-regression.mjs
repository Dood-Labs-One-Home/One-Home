import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const mint=await readFile(resolve(root,'apps/one-home/mint-studio.html'),'utf8');
const creator=await readFile(resolve(root,'apps/one-home/tools/nft-creator/index.html'),'utf8');
const errors=[];

for(const token of [
  'id="ohRoomEntryCenterV1467236"',
  '#mintHomePanel:not([hidden]){min-height:calc(100dvh - 220px);display:flex!important;align-items:center;justify-content:center',
  '#mintHomePanel:not([hidden]) #mintDoors{width:min(860px,100%);margin:0 auto!important;border:0!important}',
  '#mintHomePanel #mintDoors .choice{border:0!important}',
  '.mint-workspace-nav{border-bottom:0!important;padding-bottom:0!important}'
]) if(!mint.includes(token)) errors.push('Mint Studio room-entry layout missing '+JSON.stringify(token));

for(const token of [
  '.ri-creator-home-kiss{max-width:900px;margin:0 auto;min-height:calc(100dvh - 80px);display:flex;flex-direction:column;justify-content:center',
  '#riCreatorTypeHome:not([hidden]){min-height:calc(100dvh - 80px);display:flex;flex-direction:column;justify-content:center',
  '.ri-creator-home-kiss .ri-project-list-head{padding-bottom:12px;border-bottom:0!important}',
  '.ri-creator-home-kiss .ri-project-row{border-top:0!important}'
]) if(!creator.includes(token)) errors.push('NFT Creator centered/no-line room layout missing '+JSON.stringify(token));

// OH-276 authorized Fuji EVM configuration/labels/cache references are included below.
// Earlier product-owner freeze for OH-269: the only authorized Mint Studio runtime
// change is the bounded pre-transaction EVM metadata finalization repair. Freeze
// all script tags at the verified OH-269 baseline so later releases cannot drift.
const scriptBlocks=[...mint.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(m=>m[0]);
const oh274Helper='<script defer src="/shared/onehome-oh274-mint-ui.js?v=1467274"></script>';
const helperMatches=scriptBlocks.filter(block=>block===oh274Helper);
const frozenScriptBlocks=scriptBlocks.filter(block=>block!==oh274Helper);
const scriptHash=createHash('sha256').update(frozenScriptBlocks.join('\n')).digest('hex');
const expectedScriptHash='40b6d3607258ae128d0189deca67df505f24b323068f96531135e5e284728938';
if(scriptBlocks.length!==13||helperMatches.length!==1) errors.push('Mint Studio may contain only the 12 verified OH-269 script tags plus the single authorized OH-274 UI helper.');
if(frozenScriptBlocks.length!==12) errors.push('Mint Studio frozen script count changed from the verified OH-269 baseline.');
if(scriptHash!==expectedScriptHash) errors.push('Mint Studio executable JavaScript/script references changed from the reviewed OH-276 Fuji EVM baseline.');

if(errors.length){
  console.error('ROOM ENTRY LAYOUT REGRESSION FAILED');
  for(const error of errors) console.error(' - '+error);
  process.exit(1);
}
console.log('Room entry layout regression passed: centered/no-line entry screens preserved; the reviewed OH-276 EVM script set and OH-274 presentation helper are preserved.');
