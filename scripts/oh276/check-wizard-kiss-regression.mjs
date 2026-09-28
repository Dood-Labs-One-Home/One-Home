import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const html=await readFile(resolve(root,'apps/one-home/mint-studio.html'),'utf8');
const errors=[];
const required=[
  'One Home v14.67.233 — KISS Artwork resume/navigation repair; public mint runtime unchanged.',
  'id="ohMintKissArtworkV1467233"',
  '#wizardPanel.panel{background:transparent!important;border:0!important;',
  '<h2>Artwork</h2>',
  '<label for="createCollectionMode">Artwork method</label>',
  '<div class="actions artwork-step-actions"><button class="btn" id="step2NextBtn" data-next="3">Next: Mint Settings</button></div>',
  '<button type="button" class="step-pill active" data-pill="1" aria-current="step">1. Collection</button>',
  '<button type="button" class="step-pill" data-pill="8">7. Open Mint</button>',
  "document.querySelectorAll('.step-pill[data-pill]').forEach(btn=>btn.onclick=()=>{",
  'function repairDraftArtworkSource(copy)',
  "if(isCreatorArtworkMode(mode)&&hasCreatorConnection)copy.source='creator';",
  "if(isCreatorArtworkMode(mode)&&(activeCreatorProjectId||handoff()?.collection||selectedArtworkCount>0))selectedSource='creator'",
  "showMessage('sourceMessage','Choose an artwork method.')"
];
for(const token of required)if(!html.includes(token))errors.push('missing '+JSON.stringify(token));
if(!html.includes('One Home v14.67.234 — Mint Studio hero branding removed only; wizard behavior and live mint runtime unchanged.'))errors.push('v14.67.234 visual release marker missing');
if(html.includes('<section class="hero mint-hero-kiss">')||html.includes('>RARE INK STUDIO</span><h1>Mint</h1>'))errors.push('removed Rare Ink Studio / Mint hero is still present');
const artworkStart=html.indexOf('<div class="wizard-step artwork-creator-step" data-step="2" hidden>');
const settingsStart=html.indexOf('<div class="wizard-step" data-step="3" hidden>');
if(artworkStart<0||settingsStart<0||settingsStart<=artworkStart)errors.push('Artwork step bounds missing');
else{
  const artwork=html.slice(artworkStart,settingsStart);
  if(artwork.includes('data-prev='))errors.push('Artwork step still contains a redundant Back button');
  if(artwork.includes('Create or add your collection'))errors.push('old verbose Artwork heading remains');
  if(artwork.includes('How would you like to create your collection?'))errors.push('old verbose Artwork label remains');
}
// Direct tab navigation must not call any execution action.
const navStart=html.indexOf("document.querySelectorAll('.step-pill[data-pill]')");
const navEnd=html.indexOf("document.querySelectorAll('[data-next]')",navStart);
if(navStart<0||navEnd<0)errors.push('direct section navigation block missing');
else{
  const nav=html.slice(navStart,navEnd);
  for(const forbidden of ['ensureCampaign(','prepareMintBtn','openPublicMintBtn','beginXaman','deployStellarContract','deployEvm','invokeMint(']){
    if(nav.includes(forbidden))errors.push('section navigation must not execute mint action '+forbidden);
  }
  if(!nav.includes('persistWorkingDraft();')||!nav.includes('showStep(target);'))errors.push('section navigation must only persist and show target');
}

try{
  const a=html.match(/function isCreatorArtworkMode\(value\)\{[\s\S]*?\}\n function repairDraftArtworkSource\(copy\)\{[\s\S]*?\n \}/);
  if(!a)throw new Error('source-repair helpers could not be extracted');
  const helpers=new Function(a[0]+'; return {isCreatorArtworkMode,repairDraftArtworkSource};')();
  const restored=helpers.repairDraftArtworkSource({source:'',creationMode:'randomized',creatorProjectId:'project-123',artworkCount:88});
  if(restored.source!=='creator')throw new Error('Randomized Creator draft did not restore source=creator');
  const explicit=helpers.repairDraftArtworkSource({source:'files',creationMode:'randomized',creatorProjectId:'project-123'});
  if(explicit.source!=='files')throw new Error('explicit non-Creator source was overwritten');
  const incomplete=helpers.repairDraftArtworkSource({source:'',creationMode:'randomized',artworkCount:88});
  if(incomplete.source)throw new Error('draft without Creator project connection was force-labeled creator before source restore');
}catch(error){errors.push('executable draft source repair failed: '+error.message);}

if(errors.length){console.error('WIZARD KISS REGRESSION FAILED');for(const e of errors)console.error(' - '+e);process.exit(1)}
console.log('Wizard KISS regression passed: borderless shell, concise Artwork page, direct section navigation, and Creator draft source recovery are present without mint execution.');
