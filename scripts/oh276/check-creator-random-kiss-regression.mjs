import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const html=await readFile(resolve(root,'apps/one-home/tools/nft-creator/index.html'),'utf8');
const errors=[];
const required=[
  'id="riRandomKissV1467235"',
  'One Home v14.67.235 — Randomized NFT Creator KISS navigation + bounded Creator-to-Mint handoff. Live mint runtime unchanged.',
  'data-random-step-nav="1" aria-current="step">1. Collection</button>',
  'data-random-step-nav="2">2. Artwork</button>',
  'data-random-step-nav="3">3. Details</button>',
  'data-random-step-nav="4">4. Supply</button>',
  'data-random-step-nav="5">5. Distribution</button>',
  'data-random-step-nav="6">6. Traits</button>',
  'data-random-step-nav="7">7. Review</button>',
  'data-random-step-nav="8">8. Finish</button>',
  'function goToRandomStep(target){saveDraft();showStep(Number(target)||1,false)}',
  "section.querySelectorAll('[data-random-step-nav]').forEach(function(button){button.onclick=function(){goToRandomStep(button.dataset.randomStepNav)}})",
  'id="randomMintStatus"',
  '.ri-random-embedded-progress{display:none!important}',
  'html.onehome-embedded-creator-boot .ri-random-embedded-progress{display:flex!important}',
  'function creatorHandoffTimeout(promise,label,ms=45000)',
  "creatorHandoffTimeout(saveOneHomeMintHandoff(handoff,handoffId),'Optional browser cache timed out.',2500)",
  'if(opened!==true){button.disabled=false;button.textContent=original}',
  "return false;\n }\n};\nwindow.__OM_BUILD_PROJECT=project;"
];
for(const token of required)if(!html.includes(token))errors.push('missing '+JSON.stringify(token));

const wizardStart=html.indexOf('<nav class="ri-random-step-nav"');
const wizardEnd=html.indexOf('`;workspace.appendChild(section);',wizardStart);
if(wizardStart<0||wizardEnd<0)errors.push('Randomized wizard markup bounds missing');
else{
  const wizard=html.slice(wizardStart,wizardEnd);
  const buttons=[...wizard.matchAll(/data-random-step-nav="(\d+)"/g)].map(m=>Number(m[1]));
  if(buttons.length!==8||buttons.join(',')!=='1,2,3,4,5,6,7,8')errors.push('Randomized wizard does not expose exactly steps 1-8 at the top');
  if(/class="[^"]*randomBack/.test(wizard))errors.push('Randomized wizard still contains a bottom Back button');
  if(!wizard.includes('ri-random-embedded-progress'))errors.push('embedded Mint compatibility progress marker is missing');
}

const navStart=html.indexOf('function goToRandomStep(target)');
const navEnd=html.indexOf('function next()',navStart);
if(navStart<0||navEnd<0)errors.push('Randomized direct navigation helper missing');
else{
  const nav=html.slice(navStart,navEnd);
  for(const forbidden of ['continueToOneHomeMint','prepareMint','beginXaman','openPublicMint','authorize','sign','invokeMint']){
    if(nav.includes(forbidden))errors.push('Randomized step navigation must not execute '+forbidden);
  }
  if(!nav.includes('saveDraft();')||!nav.includes('showStep('))errors.push('Randomized step navigation must only save and render the chosen Creator step');
}

const transferStart=html.indexOf('window.continueToOneHomeMint=async function(){');
const transferEnd=html.indexOf('window.__OM_BUILD_PROJECT=project;',transferStart);
if(transferStart<0||transferEnd<0)errors.push('Creator-to-Mint transfer function missing');
else{
  const transfer=html.slice(transferStart,transferEnd);
  if(!transfer.includes("return false}"))errors.push('validation failure does not return false to re-enable the Finish button');
  if(!transfer.includes('return true;'))errors.push('successful Creator-to-Mint navigation does not return true');
  if(!transfer.includes("creatorHandoffTimeout(manager.saveBeforeMint()"))errors.push('Passport project save is not timeout bounded');
  if(!transfer.includes("creatorHandoffTimeout(manager.saveMintHandoff(handoff)"))errors.push('Passport handoff verification is not timeout bounded');
}

// Parse every inline non-src script so a Creator syntax regression cannot ship.
let scriptCount=0;
for(const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)){
  scriptCount++;
  try{new Function(match[1]);}catch(error){errors.push('inline Creator script '+scriptCount+' syntax error: '+error.message)}
}
if(!scriptCount)errors.push('no inline Creator scripts were syntax checked');

if(errors.length){console.error('CREATOR RANDOM KISS REGRESSION FAILED');for(const e of errors)console.error(' - '+e);process.exit(1)}
console.log('Creator Randomized KISS regression passed: 8 direct top steps, no bottom Back controls, visible non-sticking handoff feedback, bounded Passport/cache waits, and all inline Creator JavaScript parses.');
