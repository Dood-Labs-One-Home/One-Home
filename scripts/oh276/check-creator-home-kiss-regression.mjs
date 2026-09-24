import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const html=await readFile(resolve(root,'apps/one-home/tools/nft-creator/index.html'),'utf8');
const errors=[];
const required=[
  'id="riCreatorHomeKissV1467236"',
  'One Home v14.67.236 — centered NFT Creator room-entry KISS styling. Live minting/signing/Open Mint runtime unchanged.',
  'class="ri-creator-home-kiss"',
  'class="ri-creator-home-title">NFT Creator</h1>',
  'aria-label="NFT Creator actions"',
  'id="riStartNewProject">Start New Collection</button>',
  'id="riContinueProjects">Continue Saved Collection</button>',
  'id="riManageProjects">Manage Drafts</button>',
  'border-radius:999px!important',
  'background:rgba(4,6,8,.68)!important',
  'min-height:calc(100dvh - 80px);display:flex;flex-direction:column;justify-content:center',
  '#riCreatorTypeHome:not([hidden]){min-height:calc(100dvh - 80px);display:flex;flex-direction:column;justify-content:center',
  '.ri-creator-home-kiss .ri-project-list-head{padding-bottom:12px;border-bottom:0!important}',
  '.ri-creator-home-kiss .ri-project-row{border-top:0!important',
  '.ri-creator-home-kiss .ri-project-list-panel{margin-top:22px!important;padding:18px 0 0!important;background:transparent!important;border:0!important'
];
for(const token of required)if(!html.includes(token))errors.push('missing '+JSON.stringify(token));
for(const token of [
  'What would you like to do?</h2>',
  'Start something new, continue a saved collection, or remove a draft you no longer need.',
  'class="ri-project-primary">Start a New Collection</button>'
])if(html.includes(token))errors.push('obsolete Creator landing content remains '+JSON.stringify(token));

const landingStart=html.indexOf('<section id="riCreatorDoorHome"');
const landingEnd=html.indexOf('<div id="riCreatorTypeHome"',landingStart);
if(landingStart<0||landingEnd<0)errors.push('Creator landing page bounds missing');
else{
  const landing=html.slice(landingStart,landingEnd);
  const actions=[...landing.matchAll(/id="(riStartNewProject|riContinueProjects|riManageProjects)"/g)].map(m=>m[1]);
  if(actions.join(',')!=='riStartNewProject,riContinueProjects,riManageProjects')errors.push('Creator landing does not expose exactly the three expected actions in order');
}

// This release is UI-only. Parse every inline script to ensure the HTML edit did not break Creator behavior.
let scriptCount=0;
for(const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)){
  scriptCount++;
  try{new Function(match[1]);}catch(error){errors.push('inline Creator script '+scriptCount+' syntax error: '+error.message)}
}
if(!scriptCount)errors.push('no inline Creator scripts were syntax checked');
if(errors.length){console.error('CREATOR HOME KISS REGRESSION FAILED');for(const e of errors)console.error(' - '+e);process.exit(1)}
console.log('Creator Home KISS regression passed: concise three-action landing, centered room entry, no divider lines, pill styling, and all inline Creator JavaScript parses.');
