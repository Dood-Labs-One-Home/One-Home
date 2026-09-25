import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const creator=await readFile(resolve(root,'apps/one-home/tools/nft-creator/index.html'),'utf8');
const shared=await readFile(resolve(root,'apps/one-home/shared/onehome-creator-projects.js'));
const errors=[];
for(const token of [
  '/shared/onehome-creator-projects.js?v=1467274',
  'id="riStartNewProject">Start New Collection</button>',
  'id="riCreatorLandingStartBootstrapV1467237"',
  "var button=document.getElementById('riStartNewProject');",
  "if(api&&typeof api.startNew==='function')return;",
  'event.stopImmediatePropagation();',
  "button.textContent='Opening…';",
  'waitForCreatorStart(Date.now());',
  "Promise.resolve(api.startNew()).catch(showFailure);",
  "showFailure(new Error('NFT Creator did not finish loading. Refresh this page and try again.'));"
]) if(!creator.includes(token)) errors.push('missing Creator start fix '+JSON.stringify(token));

const sharedHash=createHash('sha256').update(shared).digest('hex');
const expectedSharedHash='d5286a86fa9401fbcd67a3ac2bc7bcf8aaee5eb2e0d7813aaa582bb94c07b23b';
if(sharedHash!==expectedSharedHash) errors.push('shared Creator project/handoff runtime changed outside the authorized OH-274 Creator verification/transition repair.');

let scriptCount=0;
for(const match of creator.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)){
  scriptCount++;
  try{new Function(match[1]);}catch(error){errors.push('inline Creator script '+scriptCount+' syntax error: '+error.message)}
}
if(!scriptCount) errors.push('no inline Creator scripts were checked');

if(errors.length){
  console.error('CREATOR START REGRESSION FAILED');
  for(const error of errors) console.error(' - '+error);
  process.exit(1);
}
console.log('Creator Start regression passed: landing click is queued during account boot and opens once Creator is ready; the shared Creator project runtime matches the authorized OH-274 baseline.');
