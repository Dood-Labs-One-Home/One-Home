import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const mint=await readFile(resolve(root,'apps/one-home/mint-studio.html'),'utf8');
const creator=await readFile(resolve(root,'apps/one-home/tools/nft-creator/index.html'),'utf8');
const projects=await readFile(resolve(root,'apps/one-home/shared/onehome-creator-projects.js'),'utf8');
const headers=await readFile(resolve(root,'apps/one-home/_headers'),'utf8');
const release=JSON.parse(await readFile(resolve(root,'scripts/oh276/release-verification.json'),'utf8'));
const errors=[];

const requiredMint=[
  'One Home v14.67.232 — Creator trait handoff, removal, and ordering are saved exactly as shown.',
  'const MINT_DRAFT_SCHEMA_VERSION=1467232;',
  'data-shared-trait-move="-1"',
  'data-shared-trait-move="1"',
  'data-artwork-trait-move="-1"',
  'data-artwork-trait-move="1"',
  'function moveSharedTraitRow(row,direction)',
  'traitsOverridePresent:traitOverridesTouched,traits:customTraits(),perImageTraits:perImageTraits()',
  "handoff()?.collection&&!seed.traitsOverridePresent",
  "handoff()?.collection&&!m.traitsOverridePresent",
  "row.querySelector('.trait-remove').onclick=()=>{row.remove();refreshSharedTraitControls();persistTraitChange()}",
  'perImageTraitsState[key].splice(target,0,moved);renderArtworkTraits();persistTraitChange()',
  'const incomingStateHasTraits=traitStateCount(incomingState)>0;',
  'function repairCreatorHandoffTraitsFromProject(handoffValue,projectRecord)',
  "'|traits:'+traitSignature+'|'",
  'previousDraftSchemaVersion<1467232',
  'creatorTraitsFromHandoff(collection,h.traitState)',
  "/tools/nft-creator/index.html?v=1467232&embedded=mint&release=1467232&fresh="
];
const requiredCreator=[
  'oneHomeCreatorTraitOrderV1467232',
  'creatorTraitStateVersion=1467232',
  "const traitState=creatorTraitState(p);",
  "traitStateSignature:JSON.stringify(traitState)",
  "version:'3.5'",
  'data-move-shared',
  'data-move-image',
  "return {mode:'advanced',fields,placeholder:null,finalImages,metadataItems,mintMetadataItems:metadataItems,sharedTraits:shared,perImageTraits",
  'Creator has trait data, but the Creator-to-Mint handoff is empty.'
];
const requiredProjects=[
  'const shared=sharedTraitsFromHandoff(collection);',
  "version:'NightShotsGeneratorV3MultiArtist'",
  'sharedTraits:shared,perImageTraits:perImageTraits',
  'traits:shared',
  "select('id,owner_id,mint_handoff_updated_at,mint_handoff_data')",
  'One Home did not preserve the Creator trait order while saving to your Passport. Nothing will continue to Mint; try again.',
  'One Home did not preserve the exact Creator trait list while saving to your Passport. Nothing will continue to Mint; try again.'
];
for(const token of requiredMint)if(!mint.includes(token))errors.push('mint-studio missing '+JSON.stringify(token));
for(const token of requiredCreator)if(!creator.includes(token))errors.push('creator missing '+JSON.stringify(token));
for(const token of requiredProjects)if(!projects.includes(token))errors.push('creator-project manager missing '+JSON.stringify(token));
for(const token of ['persistTraitRemoval()','row.remove();const remaining=customTraits();setTraits(remaining);persistTraitRemoval()'])if(mint.includes(token))errors.push('obsolete '+JSON.stringify(token));

function extractFunction(source,name){
  const marker='function '+name+'(';
  const start=source.indexOf(marker);
  if(start<0)throw new Error('Function not found: '+name);
  const brace=source.indexOf('{',start);
  let depth=0,quote='',escaped=false,lineComment=false,blockComment=false;
  for(let i=brace;i<source.length;i++){
    const c=source[i],n=source[i+1]||'';
    if(lineComment){if(c==='\n')lineComment=false;continue;}
    if(blockComment){if(c==='*'&&n==='/'){blockComment=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(c===quote){quote='';continue;}continue;}
    if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    if(c==='}'&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error('Function unterminated: '+name);
}
function syntaxCheckInline(source,label){
  const re=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;let match,index=0;
  while((match=re.exec(source))){
    const attrs=match[1]||'',body=match[2]||'';index++;
    if(!body.trim()||/\bsrc\s*=/i.test(attrs)||/\btype\s*=\s*["']module["']/i.test(attrs))continue;
    try{new vm.Script(body,{filename:label+'#inline-'+index});}catch(error){errors.push(label+' inline script '+index+' syntax error: '+error.message);}
  }
}
syntaxCheckInline(mint,'mint-studio.html');
syntaxCheckInline(creator,'tools/nft-creator/index.html');
try{
  const code=['copyAttributes','creatorTraitKey','creatorTraitState','creatorTraitStateCount','creatorExpectedTraitCount'].map(name=>extractFunction(creator,name)).join('\n')+`
    const sample={mode:'advanced',sharedTraits:[{trait_type:'Style',value:'SHRUNK'},{trait_type:'Series',value:'1'}],perImageTraits:{'1':[{trait_type:'Background',value:'Pink'},{trait_type:'Eyes',value:'Blue'}],'2':[{trait_type:'Background',value:'Green'}]}};
    const state=creatorTraitState(sample);
    if(state.version!==1467232)throw new Error('creator trait-state version mismatch');
    if(state.shared.map(x=>x.trait_type).join(',')!=='Style,Series')throw new Error('Creator shared trait order changed');
    if(state.perImage['1'].map(x=>x.trait_type).join(',')!=='Background,Eyes')throw new Error('Creator per-image trait order changed');
    if(creatorTraitStateCount(state)!==5)throw new Error('Creator trait count mismatch');
    const systemOnly={mode:'randomized',metadataItems:[{attributes:[{trait_type:'Source Artwork',value:1},{trait_type:'Edition',value:'1 of 2'}]}],editionPlan:[{traits:[]}],sharedTraits:[]};
    if(creatorExpectedTraitCount(systemOnly)!==0)throw new Error('system-only randomized metadata falsely triggers trait guard');
  `;
  vm.runInNewContext(code,Object.create(null),{timeout:1000});
}catch(error){errors.push('Creator trait behavior execution failed: '+error.message);}
try{
  const code=['cleanTraitList','isSystemTrait','traitKey','traitStateCount','creatorProjectTraitState','repairCreatorHandoffTraitsFromProject','creatorTraitsFromHandoff'].map(name=>extractFunction(mint,name)).join('\n')+`
    const project={type:'advanced',draftData:{version:'NightShotsGeneratorV3MultiArtist',sharedTraits:[{trait_type:'Style',value:'SHRUNK'}],artists:[{id:'a1',name:'Ink'}],generatedRecords:[{kept:true,items:[{layer:'Background',trait:'Pink',artistId:'a1'},{layer:'Eyes',trait:'Blue',artistId:'a1'}],comboCount:2,collectionRarity:4.5,rarityTier:'Rare',rank:7}]}};
    const old={collection:{mode:'advanced',sharedTraits:[],perImageTraits:{}},traitState:{version:1467231,shared:[],perImage:{}},traitStateSignature:'old'};
    repairCreatorHandoffTraitsFromProject(old,project);
    if(traitStateCount(old.traitState)<3)throw new Error('old empty Advanced handoff was not recovered from Creator project data');
    const rendered=creatorTraitsFromHandoff(old.collection,old.traitState);
    if(rendered.shared[0]?.trait_type!=='Style')throw new Error('recovered shared trait missing');
    if(rendered.perImage['1']?.[0]?.trait_type!=='Background'||rendered.perImage['1']?.[1]?.trait_type!=='Eyes')throw new Error('recovered generated trait order changed');
  `;
  vm.runInNewContext(code,Object.create(null),{timeout:1000});
}catch(error){errors.push('Mint trait recovery behavior execution failed: '+error.message);}
if(release.version!=='14.67.241')errors.push('release-verification version is not 14.67.241');
for(const [path,checks] of Object.entries(release.header_checks||{})){
  if(checks['x-onehome-release']&&!checks['x-onehome-release'].includes('14.67.241'))errors.push(path+' header verifier release identity mismatch');
}
for(const route of ['/open-mints','/open-mints.html','/open-mints-v1467218.js']){
  const at=headers.indexOf(route+'\n');
  if(at<0||!headers.slice(at,at+280).includes('X-OneHome-Release: 14.67.241'))errors.push('_headers release identity mismatch for '+route);
}
if(errors.length){console.error('TRAIT ORDER/REMOVAL REGRESSION FAILED');for(const error of errors)console.error(' - '+error);process.exit(1)}
console.log('Trait handoff/order regression passed: inline Creator/Mint JavaScript parses; actual trait-state helpers preserve order; Advanced empty handoffs recover from Passport project data; signatures include trait state; pre-v232 empty overrides auto-repair; Mint edits remain authoritative once touched.');
