(function(){
'use strict';

const PROJECT_KEY='nightShotsAutoSaveProject';
const TOTAL_STEPS=9;
let step=1;
let state={multipleArtists:null,useSavedTraits:false,useRules:false};
let activationPromise=null;
let saveTimer=0;
let saving=Promise.resolve();
let messageTimer=0;
let restoredProjectId='';

function $(id){return document.getElementById(id)}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
function parse(value){try{return JSON.parse(value||'null')}catch(_error){return null}}
function safeType(value){return String(value||'').trim()}
function layerName(value){return typeof displayLayerName==='function'?displayLayerName(value):safeType(value)}
function generatedItems(){return (typeof generatedRandomNFTsForExport!=='undefined'&&Array.isArray(generatedRandomNFTsForExport))?generatedRandomNFTsForExport.filter(function(item){return item&&item.kept!==false}):[]}
function allTraits(){return (typeof randomizerTraits!=='undefined'&&Array.isArray(randomizerTraits))?randomizerTraits:[]}
function allArtists(){return (typeof artists!=='undefined'&&Array.isArray(artists))?artists:[]}
function allRules(){return (typeof randomizerTraitRules!=='undefined'&&Array.isArray(randomizerTraitRules))?randomizerTraitRules:[]}


function resetAdvancedRuntime(){
  if(typeof randomizerTraits!=='undefined')randomizerTraits=[];
  if(typeof randomizerTraitRules!=='undefined')randomizerTraitRules=[];
  if(typeof randomizerLayerChances!=='undefined')randomizerLayerChances={};
  if(typeof randomizerLayerOrder!=='undefined')randomizerLayerOrder=[];
  if(typeof generatedRandomNFTsForExport!=='undefined')generatedRandomNFTsForExport=[];
  if(typeof sharedTraits!=='undefined')sharedTraits=[];
  if(typeof perImageTraits!=='undefined')perImageTraits={};
  if(typeof artists!=='undefined')artists=[{id:'unassigned',name:'Unassigned Artist',handle:'',website:'',wallet:'',credit:''}];
  if(typeof selectedArtistIds!=='undefined')selectedArtistIds=[];
  if(typeof artistCombinationMode!=='undefined')artistCombinationMode='none';
  if($('collectionName'))$('collectionName').value='';
  if($('nftBaseName'))$('nftBaseName').value='';
  if($('singleNftDescription'))$('singleNftDescription').value='';
  if($('supplyAmount'))$('supplyAmount').value='10';
  if($('advancedOneOfOneCount'))$('advancedOneOfOneCount').value='0';
  try{if(typeof renderArtistManager==='function')renderArtistManager()}catch(_error){}
  try{if(typeof renderRandomTraits==='function')renderRandomTraits()}catch(_error){}
  try{if(typeof renderSharedTraits==='function')renderSharedTraits()}catch(_error){}
  try{if(typeof refreshTraitRuleOptions==='function')refreshTraitRuleOptions()}catch(_error){}
  try{if(typeof renderTraitRules==='function')renderTraitRules()}catch(_error){}
  const output=$('generatedRandomNFTs');if(output)output.innerHTML='';
  const status=$('generationStatus');if(status){status.style.display='none';status.textContent='Ready to generate.'}
}

function showMessage(text,bad){
  const box=$('advancedWizardMessage');
  if(!box)return;
  clearTimeout(messageTimer);
  box.textContent=text;
  box.className='ri-advanced-message'+(bad?' bad':'');
  box.style.display='block';
  messageTimer=setTimeout(function(){box.style.display='none'},3200);
}

function syncLegacyFields(){
  if($('collectionName'))$('collectionName').value=$('advancedCollectionName')?.value||'';
  if($('nftBaseName'))$('nftBaseName').value=$('advancedBaseName')?.value||'NFT';
  if($('singleNftDescription'))$('singleNftDescription').value=$('advancedDescription')?.value||'';
  if($('supplyAmount'))$('supplyAmount').value=String(Math.max(1,Math.min(10000,Number($('advancedSupply')?.value)||1)));
  if($('advancedOneOfOneCount'))$('advancedOneOfOneCount').value=String(Math.max(0,Math.min(Number($('advancedSupply')?.value)||1,Number($('advancedOneOfOneSimple')?.value)||0)));
}

function loadLegacyFields(){
  if($('advancedCollectionName'))$('advancedCollectionName').value=$('collectionName')?.value||'';
  if($('advancedBaseName'))$('advancedBaseName').value=$('nftBaseName')?.value||'NFT';
  if($('advancedDescription'))$('advancedDescription').value=$('singleNftDescription')?.value||'';
  if($('advancedSupply'))$('advancedSupply').value=String(Math.max(1,Math.min(10000,Number($('supplyAmount')?.value)||10)));
  if($('advancedOneOfOneSimple'))$('advancedOneOfOneSimple').value=String(Math.max(0,Number($('advancedOneOfOneCount')?.value)||0));
}

function updateWindowState(){
  window.__ONEHOME_ADVANCED_WIZARD_STATE__={
    step:step,
    multipleArtists:state.multipleArtists===true,
    artistChoiceMade:state.multipleArtists!==null,
    useSavedTraits:!!state.useSavedTraits,
    useRules:!!state.useRules
  };
}

function lightweightProject(project){
  if(!project)return null;
  const copy=Object.assign({},project);
  const traits=Array.isArray(project.randomizerTraits)?project.randomizerTraits:[];
  copy.randomizerTraits=traits.map(function(item){return Object.assign({},item,{imageURL:''})});
  copy.traits=copy.randomizerTraits;
  return copy;
}

async function captureProjectData(){
  syncLegacyFields();
  updateWindowState();
  if(typeof getNightShotsProjectData!=='function')return null;
  const project=await getNightShotsProjectData();
  project.advancedWizard=Object.assign({},window.__ONEHOME_ADVANCED_WIZARD_STATE__);
  project.wizardStep=step;
  return project;
}

async function saveNow(showConfirmation){
  clearTimeout(saveTimer);
  saving=saving.then(async function(){
    const project=await captureProjectData();
    if(!project)return;
    let savedOnline=false;
    if(window.OneHomeCreatorProjects&&typeof window.OneHomeCreatorProjects.saveAdvancedProjectData==='function'){
      await window.OneHomeCreatorProjects.saveAdvancedProjectData(project);
      savedOnline=true;
    }
    try{localStorage.setItem(PROJECT_KEY,JSON.stringify(lightweightProject(project)))}catch(error){console.warn('Advanced local backup skipped',error)}
    if(!savedOnline&&window.OneHomeCreatorProjects&&typeof window.OneHomeCreatorProjects.captureActive==='function'){
      await window.OneHomeCreatorProjects.captureActive();
    }
    if(showConfirmation)showMessage('Draft saved.');
  }).catch(function(error){console.error('Advanced randomizer save failed',error);showMessage('The draft could not be saved.',true)});
  return saving;
}

function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(function(){saveNow(false)},450);
}

function selectedChoice(group,value){
  document.querySelectorAll('[data-choice-group="'+group+'"]').forEach(function(button){button.classList.toggle('active',button.dataset.choice===value)});
}

function setArtistChoice(value){
  state.multipleArtists=value==='yes';
  selectedChoice('artists',value);
  if(state.multipleArtists&&typeof artistCombinationMode!=='undefined'&&artistCombinationMode==='none'){
    artistCombinationMode='selected';
    if($('artistCombinationMode'))$('artistCombinationMode').value='selected';
  }
  renderArtistControls();
  saveNow(false);
}

function setSavedTraitChoice(value){
  state.useSavedTraits=value==='yes';
  selectedChoice('savedTraits',value);
  const slot=$('advancedSavedTraitsSlot');if(slot)slot.hidden=!state.useSavedTraits;
  saveNow(false);
}

function setRulesChoice(value){
  const enable=value==='yes';
  if(!enable&&allRules().length){
    if(!window.confirm('Remove the rules already added to this collection?'))return;
    if(typeof randomizerTraitRules!=='undefined')randomizerTraitRules=[];
    if(typeof renderTraitRules==='function')renderTraitRules();
    if(typeof refreshTraitRuleOptions==='function')refreshTraitRuleOptions();
  }
  state.useRules=enable;
  selectedChoice('rules',value);
  const slot=$('advancedRulesSlot');if(slot)slot.hidden=!state.useRules;
  saveNow(false);
}

function artistOptions(selected){
  const list=allArtists().filter(function(item){return item&&item.id!=='unassigned'});
  const source=state.multipleArtists&&list.length?list:allArtists();
  return source.map(function(item){return '<option value="'+esc(item.id)+'" '+(item.id===selected?'selected':'')+'>'+esc(item.name)+'</option>'}).join('')||'<option value="unassigned">Creator</option>';
}

function refreshArtistSelects(){
  ['advancedBaseArtist','advancedLayerArtist'].forEach(function(id){
    const select=$(id);if(!select)return;
    const old=select.value;
    select.innerHTML=artistOptions(old);
    if(Array.from(select.options).some(function(option){return option.value===old}))select.value=old;
  });
}

function renderArtistControls(){
  const slot=$('advancedArtistManagerSlot');
  const note=$('advancedArtistSummary');
  if(!slot||!note)return;
  slot.hidden=!state.multipleArtists;
  note.textContent=state.multipleArtists?'Add each contributing artist below, then choose how their work can be combined.':'This collection will use one artist. Artist Manager stays closed.';
  const filter=$('artistTraitFilter');if(filter){filter.style.display='none';const label=filter.previousElementSibling;if(label&&label.tagName==='LABEL')label.style.display='none'}
  const artistList=$('artistList');if(artistList)Array.from(artistList.children).forEach(function(row){const strong=row.querySelector('strong');if(strong&&strong.textContent.trim()==='Unassigned Artist')row.style.display='none'});
  refreshArtistSelects();
}

function traitImage(item){return item&&item.imageURL?String(item.imageURL):''}
function artistLabel(item){const name=String(item&&item.artistName||'').trim();const id=String(item&&item.artistId||'').trim();return (!name||name==='Unassigned Artist'||id==='unassigned')?'Creator':name}
function isBase(item){return layerName(item&&item.layer).toLowerCase()==='background'||layerName(item&&item.layer).toLowerCase()==='base'}

function removeTraitAt(index){
  if(typeof randomizerTraits==='undefined'||!randomizerTraits[index])return;
  const old=randomizerTraits[index];
  if(old.imageURL&&String(old.imageURL).startsWith('blob:')){try{URL.revokeObjectURL(old.imageURL)}catch(_error){}}
  randomizerTraits.splice(index,1);
  if(typeof renderRandomTraits==='function')renderRandomTraits();
  if(typeof refreshTraitRuleOptions==='function')refreshTraitRuleOptions();
  renderLayerSummaries();
  saveNow(false);
}

function ensureBackgroundFirst(){
  if(typeof randomizerLayerOrder==='undefined')return;
  const existing=[];
  allTraits().forEach(function(item){const name=layerName(item.layer);if(name&&!existing.includes(name))existing.push(name)});
  const background=existing.find(function(name){return name.toLowerCase()==='background'||name.toLowerCase()==='base'});
  const ordered=(Array.isArray(randomizerLayerOrder)?randomizerLayerOrder:[]).filter(function(name){return existing.includes(name)&&name!==background});
  existing.forEach(function(name){if(name!==background&&!ordered.includes(name))ordered.push(name)});
  randomizerLayerOrder=background?[background].concat(ordered):ordered;
}

function moveOverlayLayer(layer,direction){
  ensureBackgroundFirst();
  if(typeof randomizerLayerOrder==='undefined')return;
  const background=randomizerLayerOrder.find(function(name){return name.toLowerCase()==='background'||name.toLowerCase()==='base'});
  const overlays=randomizerLayerOrder.filter(function(name){return name!==background});
  const index=overlays.indexOf(layer);if(index<0)return;
  const next=index+direction;if(next<0||next>=overlays.length)return;
  const temp=overlays[next];overlays[next]=overlays[index];overlays[index]=temp;
  randomizerLayerOrder=background?[background].concat(overlays):overlays;
  if(typeof renderRandomTraits==='function')renderRandomTraits();
  renderLayerSummaries();
  saveNow(false);
}

function renderBaseSummary(){
  const box=$('advancedBaseSummary');if(!box)return;
  const entries=allTraits().map(function(item,index){return {item:item,index:index}}).filter(function(entry){return isBase(entry.item)});
  box.innerHTML=entries.length?entries.map(function(entry){const item=entry.item;return '<div class="ri-advanced-preview">'+(traitImage(item)?'<img src="'+esc(traitImage(item))+'" alt="Base layer">':'<div></div>')+'<div><strong>'+esc(item.trait||'Base image')+'</strong><div style="color:#cbd5e1;margin-top:5px">Background · 100% · '+esc(artistLabel(item))+'</div><button type="button" class="ri-advanced-secondary" data-remove-trait="'+entry.index+'" style="margin-top:10px">Remove Base</button></div></div>'}).join(''):'<div class="ri-advanced-help">No base image added yet.</div>';
}

function orderedLayers(){
  ensureBackgroundFirst();
  const names=[];
  if(typeof randomizerLayerOrder!=='undefined'&&Array.isArray(randomizerLayerOrder))randomizerLayerOrder.forEach(function(name){if(!names.includes(name))names.push(name)});
  allTraits().forEach(function(item){const name=layerName(item.layer);if(name&&!names.includes(name))names.push(name)});
  return names;
}

function renderOverlaySummary(){
  const box=$('advancedLayerSummary');if(!box)return;
  const order=orderedLayers().filter(function(name){return name.toLowerCase()!=='background'&&name.toLowerCase()!=='base'});
  if(!order.length){box.innerHTML='<div class="ri-advanced-help">No overlay layers added yet.</div>';return}
  box.innerHTML=order.map(function(layer,index){
    const entries=allTraits().map(function(item,itemIndex){return {item:item,index:itemIndex}}).filter(function(entry){return layerName(entry.item.layer)===layer});
    return '<div class="ri-advanced-section-toggle"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h3>'+esc(layer)+'</h3><p>'+entries.length+' option'+(entries.length===1?'':'s')+' in this layer. Layers lower in this list are drawn later and appear on top.</p></div><div class="ri-advanced-item-actions"><button type="button" data-move-layer="'+esc(layer)+'" data-direction="-1" '+(index===0?'disabled':'')+'>Move Up</button><button type="button" data-move-layer="'+esc(layer)+'" data-direction="1" '+(index===order.length-1?'disabled':'')+'>Move Down</button></div></div><div class="ri-advanced-list">'+entries.map(function(entry){const item=entry.item;return '<div class="ri-advanced-item">'+(traitImage(item)?'<img src="'+esc(traitImage(item))+'" alt="'+esc(item.trait)+'">':'<div></div>')+'<div><strong>'+esc(item.trait||'Trait')+'</strong><small>Rarity: '+esc(item.rarity||'0')+'% · '+esc(artistLabel(item))+'</small></div><div class="ri-advanced-item-actions"><button type="button" class="danger" data-remove-trait="'+entry.index+'">Remove</button></div></div>'}).join('')+'</div></div>';
  }).join('');
}

function renderLayerSummaries(){
  renderBaseSummary();
  renderOverlaySummary();
  refreshArtistSelects();
  const count=$('advancedTraitCount');if(count)count.textContent=String(allTraits().length);
  const rules=$('advancedRuleCount');if(rules)rules.textContent=String(allRules().length);
  const generated=$('advancedGeneratedCount');if(generated)generated.textContent=String(generatedItems().length);
}

function copyFileToLegacy(file){
  const input=$('randomTraitImage');
  if(!input||!file)return false;
  try{const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;return true}catch(error){console.error(error);return false}
}

async function addTraitFromForm(kind){
  const isBackground=kind==='base';
  const layer=isBackground?'Background':safeType($('advancedLayerName')?.value);
  const trait=safeType((isBackground?$('advancedBaseTraitName'):$('advancedLayerTraitName'))?.value);
  const rarity=isBackground?'100':safeType($('advancedLayerRarity')?.value);
  const artist=(isBackground?$('advancedBaseArtist'):$('advancedLayerArtist'))?.value||'unassigned';
  const file=(isBackground?$('advancedBaseFile'):$('advancedLayerFile'))?.files?.[0]||null;
  if(!layer){showMessage('Add the layer name.',true);return}
  if(!trait){showMessage(isBackground?'Name the base image.':'Name this layer option.',true);return}
  if(!isBackground&&(!(Number(rarity)>=0)||Number(rarity)>100)){showMessage('Enter a rarity from 0 to 100.',true);return}
  if(!file){showMessage('Choose the image for this layer.',true);return}
  if(!String(file.type||'').startsWith('image/')){showMessage('Choose an image file.',true);return}
  if(isBackground){
    for(let index=allTraits().length-1;index>=0;index--){if(isBase(allTraits()[index]))removeTraitAt(index)}
  }
  if($('randomLayerName'))$('randomLayerName').value=layer;
  if($('randomTraitName'))$('randomTraitName').value=trait;
  if($('randomTraitRarity'))$('randomTraitRarity').value=rarity;
  if($('randomTraitArtist'))$('randomTraitArtist').value=artist;
  if(!copyFileToLegacy(file)){showMessage('The image could not be prepared.',true);return}
  if(typeof showRandomTraitImageName==='function')showRandomTraitImageName();
  if(typeof addRandomTrait!=='function'){showMessage('The layer builder is not available.',true);return}
  addRandomTrait();
  ensureBackgroundFirst();
  if(isBackground){$('advancedBaseFile').value='';$('advancedBaseTraitName').value=''}else{$('advancedLayerFile').value='';$('advancedLayerTraitName').value='';}
  renderLayerSummaries();
  await saveNow(false);
  showMessage(isBackground?'Base image saved.':'Layer option saved.');
}

function renderGenerationSummary(){
  const items=generatedItems();
  const box=$('advancedGenerationSummary');if(!box)return;
  box.innerHTML=items.length?'<div class="ri-advanced-help"><strong>'+items.length+' generated NFT'+(items.length===1?'':'s')+' are saved with this draft.</strong><br>You can generate again to replace them before continuing.</div>':'<div class="ri-advanced-help">The collection has not been generated yet.</div>';
  renderLayerSummaries();
}

function renderReview(){
  syncLegacyFields();
  const items=generatedItems();
  const artistCount=allArtists().filter(function(item){return item&&item.id!=='unassigned'}).length;
  const oneCount=items.filter(function(item){return !!item.oneOfOne}).length;
  const baseCount=allTraits().filter(isBase).length;
  const overlayCount=allTraits().length-baseCount;
  const box=$('advancedReview');if(!box)return;
  box.innerHTML='<div class="ri-advanced-review-grid">'+
  '<div class="ri-advanced-review-item"><strong>Collection</strong>'+esc($('advancedCollectionName')?.value||'Not added')+'</div>'+
  '<div class="ri-advanced-review-item"><strong>NFT name</strong>'+esc($('advancedBaseName')?.value||'Not added')+'</div>'+
  '<div class="ri-advanced-review-item"><strong>Supply</strong>'+esc($('advancedSupply')?.value||'0')+'</div>'+
  '<div class="ri-advanced-review-item"><strong>Generated</strong>'+String(items.length)+'</div>'+
  '<div class="ri-advanced-review-item"><strong>Base image</strong>'+(baseCount?'Ready':'Missing')+'</div>'+
  '<div class="ri-advanced-review-item"><strong>Overlay options</strong>'+String(overlayCount)+'</div>'+
  '<div class="ri-advanced-review-item"><strong>Artists</strong>'+(state.multipleArtists?String(artistCount):'One artist')+'</div>'+
  '<div class="ri-advanced-review-item"><strong>Rules</strong>'+(state.useRules?String(allRules().length):'None')+'</div>'+
  '<div class="ri-advanced-review-item"><strong>True 1/1 NFTs</strong>'+String(oneCount)+'</div></div>'+
  '<div class="ri-advanced-review-item" style="margin-top:14px"><strong>Description</strong><div style="margin-top:6px;color:#e5e7eb">'+esc($('advancedDescription')?.value||'No description added.')+'</div></div>';
}

function validateBefore(target){
  syncLegacyFields();
  if(target>=2){
    if(!safeType($('advancedCollectionName')?.value))return 'Add a collection name first.';
    if(!safeType($('advancedBaseName')?.value))return 'Add the NFT name first.';
    if(!(Number($('advancedSupply')?.value)>0))return 'Enter how many NFTs to generate.';
  }
  if(target>=3&&state.multipleArtists===null)return 'Choose Yes or No for the artist question.';
  if(target>=5&&!allTraits().some(isBase))return 'Add the base image before continuing.';
  if(target>=7&&allTraits().length<2)return 'Add at least one overlay layer option before continuing.';
  if(target>=8&&!generatedItems().length)return 'Generate the collection before reviewing it.';
  if(target>=9&&!generatedItems().length)return 'Generate the collection before finishing.';
  return '';
}

function visibleStepNumber(){return step}
function updateStep(){
  document.querySelectorAll('#riAdvancedWizard .ri-advanced-step').forEach(function(panel){panel.hidden=Number(panel.dataset.step)!==step});
  $('advancedStepText').textContent='Step '+visibleStepNumber()+' of '+TOTAL_STEPS;
  $('advancedProgressBar').style.width=(step/TOTAL_STEPS*100)+'%';
  if(step===3)renderArtistControls();
  if(step===4||step===5)renderLayerSummaries();
  if(step===6){selectedChoice('rules',state.useRules?'yes':'no');$('advancedRulesSlot').hidden=!state.useRules;}
  if(step===7)renderGenerationSummary();
  if(step===8)renderReview();
  window.scrollTo({top:0,behavior:'auto'});
}

async function showStep(next,save){
  step=Math.max(1,Math.min(TOTAL_STEPS,Number(next)||1));
  updateWindowState();
  updateStep();
  if(save!==false)await saveNow(false);
}

async function goNext(){
  let target=step+1;
  if(step===2&&state.multipleArtists===false)target=4;
  const issue=validateBefore(target);
  if(issue){showMessage(issue,true);return}
  await showStep(target,true);
}

async function goBack(){
  let target=step-1;
  if(step===4&&state.multipleArtists===false)target=2;
  await showStep(target,true);
}

function mountLegacyBlocks(){
  const artist=$('artistManager');if(artist&&$('advancedArtistManagerSlot'))$('advancedArtistManagerSlot').appendChild(artist);
  const saved=$('savedTraitSetManager');if(saved&&$('advancedSavedTraitsSlot'))$('advancedSavedTraitsSlot').appendChild(saved);
  const rules=$('traitRuleEngineBox');if(rules&&$('advancedRulesSlot'))$('advancedRulesSlot').appendChild(rules);
  const generateButton=document.querySelector('button[onclick*="startRandomNFTGeneration"]');
  const clearButton=document.querySelector('button[onclick*="removeGeneratedNFTs"]');
  const status=$('generationStatus');const results=$('generatedRandomNFTs');const generationSlot=$('advancedGenerationSlot');
  [generateButton,clearButton,status,results].forEach(function(node){if(node&&generationSlot)generationSlot.appendChild(node)});
  const sharedInput=$('traitType');const sharedCard=sharedInput&&sharedInput.parentElement&&sharedInput.parentElement.parentElement;
  if(sharedCard&&$('advancedSharedTraitsSlot'))$('advancedSharedTraitsSlot').appendChild(sharedCard);
  const sharedList=$('traitList');const sharedListCard=sharedList&&sharedList.parentElement;
  if(sharedListCard&&$('advancedSharedTraitListSlot'))$('advancedSharedTraitListSlot').appendChild(sharedListCard);
  const mainZip=$('mainGenerateZipButton');if(mainZip)mainZip.style.display='none';
  const easyFinish=document.querySelector('#riCreatorWorkspace .easy-finish');if(easyFinish)easyFinish.style.display='none';
  const legacyBuilder=$('traitBuilderContent');if(legacyBuilder)legacyBuilder.style.display='none';
  const legacyOne=$('advancedOneOfOneBox');if(legacyOne)legacyOne.style.display='none';
}

function build(){
  if($('riAdvancedWizard'))return;
  const workspace=$('riCreatorWorkspace');if(!workspace)return;
  const section=document.createElement('section');section.id='riAdvancedWizard';section.innerHTML=`
<div class="ri-advanced-progress"><strong id="advancedStepText">Step 1 of 9</strong><div class="ri-advanced-track"><div class="ri-advanced-bar" id="advancedProgressBar"></div></div></div>
<div id="advancedWizardMessage" class="ri-advanced-message"></div>

<div class="ri-advanced-step" data-step="1"><div class="ri-advanced-card"><h2>Name your collection</h2><p>Tell us what you are creating and how many NFTs should be generated.</p><div class="ri-advanced-field"><label for="advancedCollectionName">Collection name</label><input id="advancedCollectionName" maxlength="160" placeholder="Example: One Home Tickets"></div><div class="ri-advanced-field"><label for="advancedBaseName">NFT name</label><input id="advancedBaseName" maxlength="120" placeholder="Example: Golden Ticket"></div><div class="ri-advanced-field"><label for="advancedDescription">Description</label><textarea id="advancedDescription" maxlength="1200" placeholder="Describe the collection and what makes it special."></textarea></div><div class="ri-advanced-field"><label for="advancedSupply">How many NFTs should be generated?</label><input id="advancedSupply" type="number" min="1" max="10000" step="1" value="10"></div><div class="ri-advanced-save-note">This step is saved automatically.</div><div class="ri-advanced-actions"><button type="button" class="ri-advanced-secondary" id="advancedStartNew">Start New Collection</button><div class="right"><button type="button" class="ri-advanced-secondary advancedSave">Save Draft</button><button type="button" class="ri-advanced-primary advancedNext">Continue</button></div></div></div></div>

<div class="ri-advanced-step" data-step="2" hidden><div class="ri-advanced-card"><h2>Are you using more than one artist?</h2><p>This controls whether Artist Manager and artist-combination choices are needed.</p><div class="ri-advanced-choice-grid"><button type="button" class="ri-advanced-choice" data-choice-group="artists" data-choice="no"><strong>No</strong><span>One artist created the base image and all overlay layers.</span></button><button type="button" class="ri-advanced-choice" data-choice-group="artists" data-choice="yes"><strong>Yes</strong><span>Different artists contributed images or layers to this collection.</span></button></div><div class="ri-advanced-actions"><button type="button" class="ri-advanced-secondary advancedBack">Back</button><div class="right"><button type="button" class="ri-advanced-secondary advancedSave">Save Draft</button><button type="button" class="ri-advanced-primary advancedNext">Continue</button></div></div></div></div>

<div class="ri-advanced-step" data-step="3" hidden><div class="ri-advanced-card"><h2>Add the contributing artists</h2><p id="advancedArtistSummary"></p><div id="advancedArtistManagerSlot" class="ri-advanced-legacy-slot"></div><div class="ri-advanced-actions"><button type="button" class="ri-advanced-secondary advancedBack">Back</button><div class="right"><button type="button" class="ri-advanced-secondary advancedSave">Save Draft</button><button type="button" class="ri-advanced-primary advancedNext">Continue</button></div></div></div></div>

<div class="ri-advanced-step" data-step="4" hidden><div class="ri-advanced-card"><h2>Add the base image</h2><p>This image sits behind every other layer. The base is always included at 100%.</p><div class="ri-advanced-form-grid"><div class="ri-advanced-field"><label for="advancedBaseTraitName">Base image name</label><input id="advancedBaseTraitName" placeholder="Example: Midnight Background"></div><div class="ri-advanced-field"><label for="advancedBaseArtist">Artist</label><select id="advancedBaseArtist"></select></div></div><div class="ri-advanced-upload-box"><div class="ri-advanced-field"><label for="advancedBaseFile">Choose the base image</label><input id="advancedBaseFile" type="file" accept="image/*"></div><button type="button" id="advancedAddBase" class="ri-advanced-primary">Save Base Image</button></div><div id="advancedBaseSummary"></div><div class="ri-advanced-actions"><button type="button" class="ri-advanced-secondary advancedBack">Back</button><div class="right"><button type="button" class="ri-advanced-secondary advancedSave">Save Draft</button><button type="button" class="ri-advanced-primary advancedNext">Continue</button></div></div></div></div>

<div class="ri-advanced-step" data-step="5" hidden><div class="ri-advanced-card"><h2>Add the overlay layers</h2><p>Use transparent PNG images for characters, clothing, eyes, hats, accessories, and other artwork placed over the base.</p><div class="ri-advanced-form-grid"><div class="ri-advanced-field"><label for="advancedLayerName">Layer name</label><input id="advancedLayerName" placeholder="Example: Hat"></div><div class="ri-advanced-field"><label for="advancedLayerTraitName">Option name</label><input id="advancedLayerTraitName" placeholder="Example: Gold Crown"></div><div class="ri-advanced-field"><label for="advancedLayerRarity">Rarity percentage</label><input id="advancedLayerRarity" type="number" min="0" max="100" step="0.01" value="100"></div><div class="ri-advanced-field"><label for="advancedLayerArtist">Artist</label><select id="advancedLayerArtist"></select></div></div><div class="ri-advanced-upload-box"><div class="ri-advanced-field"><label for="advancedLayerFile">Choose the transparent layer image</label><input id="advancedLayerFile" type="file" accept="image/*"></div><button type="button" id="advancedAddLayer" class="ri-advanced-primary">Add Layer Option</button></div><div class="ri-advanced-section-toggle"><h3>Do you want to open a saved trait set?</h3><p>Saved trait tools stay closed unless you choose Yes.</p><div class="ri-advanced-choice-grid"><button type="button" class="ri-advanced-choice" data-choice-group="savedTraits" data-choice="no"><strong>No</strong><span>Continue with the layers added here.</span></button><button type="button" class="ri-advanced-choice" data-choice-group="savedTraits" data-choice="yes"><strong>Yes</strong><span>Open saved trait sets to add or replace layer options.</span></button></div><div id="advancedSavedTraitsSlot" class="ri-advanced-legacy-slot" hidden></div></div><div id="advancedLayerSummary" class="ri-advanced-list"></div><div class="ri-advanced-actions"><button type="button" class="ri-advanced-secondary advancedBack">Back</button><div class="right"><button type="button" class="ri-advanced-secondary advancedSave">Save Draft</button><button type="button" class="ri-advanced-primary advancedNext">Continue</button></div></div></div></div>

<div class="ri-advanced-step" data-step="6" hidden><div class="ri-advanced-card"><h2>Does this collection need combination rules?</h2><p>Rules can prevent unwanted combinations or require one option whenever another option appears.</p><div class="ri-advanced-choice-grid"><button type="button" class="ri-advanced-choice" data-choice-group="rules" data-choice="no"><strong>No</strong><span>Any valid layer combination can be generated.</span></button><button type="button" class="ri-advanced-choice" data-choice-group="rules" data-choice="yes"><strong>Yes</strong><span>Open the rule helper and create the needed rules.</span></button></div><div id="advancedRulesSlot" class="ri-advanced-legacy-slot" hidden></div><div class="ri-advanced-actions"><button type="button" class="ri-advanced-secondary advancedBack">Back</button><div class="right"><button type="button" class="ri-advanced-secondary advancedSave">Save Draft</button><button type="button" class="ri-advanced-primary advancedNext">Continue</button></div></div></div></div>

<div class="ri-advanced-step" data-step="7" hidden><div class="ri-advanced-card"><h2>Generate the collection</h2><p>Choose how many true one-of-one NFTs you need, then generate and review the combined artwork.</p><div class="ri-advanced-field"><label for="advancedOneOfOneSimple">How many true 1/1 NFTs?</label><input id="advancedOneOfOneSimple" type="number" min="0" max="589" step="1" value="0"></div><div class="ri-advanced-help">A true 1/1 combination appears only once in the generated collection. The number cannot exceed the collection supply.</div><div id="advancedGenerationSummary"></div><div id="advancedGenerationSlot" class="ri-advanced-legacy-slot"></div><div class="ri-advanced-actions"><button type="button" class="ri-advanced-secondary advancedBack">Back</button><div class="right"><button type="button" class="ri-advanced-secondary advancedSave">Save Draft</button><button type="button" class="ri-advanced-primary advancedNext">Continue</button></div></div></div></div>

<div class="ri-advanced-step" data-step="8" hidden><div class="ri-advanced-card"><h2>Add shared traits and review</h2><p>Shared traits are optional and apply to every NFT. Review the collection before continuing.</p><div id="advancedSharedTraitsSlot" class="ri-advanced-legacy-slot"></div><div id="advancedSharedTraitListSlot" class="ri-advanced-legacy-slot" style="margin-top:14px"></div><div class="ri-advanced-review-grid"><div class="ri-advanced-review-item"><strong>Layer traits</strong><span id="advancedTraitCount">0</span></div><div class="ri-advanced-review-item"><strong>Rules</strong><span id="advancedRuleCount">0</span></div><div class="ri-advanced-review-item"><strong>Generated NFTs</strong><span id="advancedGeneratedCount">0</span></div></div><div id="advancedReview"></div><div class="ri-advanced-actions"><button type="button" class="ri-advanced-secondary advancedBack">Back</button><div class="right"><button type="button" class="ri-advanced-secondary advancedSave">Save Draft</button><button type="button" class="ri-advanced-primary advancedNext">Looks Good</button></div></div></div></div>

<div class="ri-advanced-step" data-step="9" hidden><div class="ri-advanced-card"><h2>Your advanced randomized collection is ready</h2><p>Choose what you would like to do next.</p><div class="ri-advanced-finish-grid"><button type="button" id="advancedFinishSave">Save Collection</button><button type="button" id="advancedFinishMint" class="primary">Continue to Mint</button><button type="button" id="advancedFinishDownload">Download Collection Files</button></div><div class="ri-advanced-actions"><button type="button" class="ri-advanced-secondary advancedBack">Back</button></div></div></div>`;
  workspace.appendChild(section);

  section.querySelectorAll('.advancedNext').forEach(function(button){button.addEventListener('click',goNext)});
  section.querySelectorAll('.advancedBack').forEach(function(button){button.addEventListener('click',goBack)});
  section.querySelectorAll('.advancedSave').forEach(function(button){button.addEventListener('click',function(){saveNow(true)})});
  section.querySelectorAll('[data-choice-group="artists"]').forEach(function(button){button.addEventListener('click',function(){setArtistChoice(button.dataset.choice)})});
  section.querySelectorAll('[data-choice-group="savedTraits"]').forEach(function(button){button.addEventListener('click',function(){setSavedTraitChoice(button.dataset.choice)})});
  section.querySelectorAll('[data-choice-group="rules"]').forEach(function(button){button.addEventListener('click',function(){setRulesChoice(button.dataset.choice)})});
  $('advancedAddBase').addEventListener('click',function(){addTraitFromForm('base')});
  $('advancedAddLayer').addEventListener('click',function(){addTraitFromForm('layer')});
  $('advancedStartNew').addEventListener('click',function(){if(window.OneHomeCreatorProjects&&typeof window.OneHomeCreatorProjects.startNew==='function')window.OneHomeCreatorProjects.startNew()});
  ['advancedCollectionName','advancedBaseName','advancedDescription','advancedSupply','advancedOneOfOneSimple'].forEach(function(id){$(id).addEventListener('input',function(){syncLegacyFields();scheduleSave()})});
  $('advancedFinishSave').addEventListener('click',async function(){await saveNow(false);if(typeof saveNightShotsProject==='function')await saveNightShotsProject();else showMessage('Save is not available.',true)});
  $('advancedFinishMint').addEventListener('click',async function(){await saveNow(false);const button=this;button.disabled=true;showMessage('Opening your mint setup…');try{if(typeof window.continueToOneHomeMint!=='function')throw new Error('Mint setup is not available.');await window.continueToOneHomeMint()}catch(error){button.disabled=false;showMessage(error&&error.message?error.message:'The collection could not be sent to Mint.',true)}});
  $('advancedFinishDownload').addEventListener('click',async function(){await saveNow(false);if(typeof window.downloadMintJsonFiles==='function')window.downloadMintJsonFiles();else showMessage('Download is not available.',true)});

  section.addEventListener('click',function(event){
    const remove=event.target.closest('[data-remove-trait]');if(remove){removeTraitAt(Number(remove.dataset.removeTrait));return}
    const move=event.target.closest('[data-move-layer]');if(move&&!move.disabled){moveOverlayLayer(move.dataset.moveLayer,Number(move.dataset.direction)||0);return}
    if(event.target.closest('#advancedArtistManagerSlot button,#advancedSavedTraitsSlot button,#advancedRulesSlot button,#advancedGenerationSlot button,#advancedSharedTraitsSlot button,#advancedSharedTraitListSlot button'))setTimeout(function(){renderArtistControls();renderLayerSummaries();renderGenerationSummary();saveNow(false)},180);
  });
  section.addEventListener('input',function(event){if(event.target.closest('#advancedArtistManagerSlot,#advancedSavedTraitsSlot,#advancedRulesSlot,#advancedGenerationSlot,#advancedSharedTraitsSlot,#advancedSharedTraitListSlot'))scheduleSave()},true);
  section.addEventListener('change',function(event){if(event.target.closest('#advancedArtistManagerSlot,#advancedSavedTraitsSlot,#advancedRulesSlot,#advancedGenerationSlot,#advancedSharedTraitsSlot,#advancedSharedTraitListSlot'))scheduleSave()},true);
}

async function restoreCurrentProject(){
  let project=null;
  restoredProjectId='';
  if(window.OneHomeCreatorProjects&&typeof window.OneHomeCreatorProjects.getActiveProject==='function'){
    const record=await window.OneHomeCreatorProjects.getActiveProject();
    if(record&&record.type==='advanced'&&record.draftData){project=record.draftData;restoredProjectId=record.id||''}
  }
  if(!project)project=parse(localStorage.getItem(PROJECT_KEY));
  if(project&&typeof applyNightShotsProject==='function')applyNightShotsProject(project);
  if(!project)resetAdvancedRuntime();
  const wizard=project&&project.advancedWizard?project.advancedWizard:{};
  state.multipleArtists=wizard.artistChoiceMade===true?(wizard.multipleArtists===true):null;
  state.useSavedTraits=!!wizard.useSavedTraits;
  state.useRules=!!wizard.useRules;
  step=Math.max(1,Math.min(TOTAL_STEPS,Number(wizard.step||project&&project.wizardStep)||1));
  updateWindowState();
  loadLegacyFields();
  selectedChoice('artists',state.multipleArtists===null?'':(state.multipleArtists?'yes':'no'));
  selectedChoice('savedTraits',state.useSavedTraits?'yes':'no');
  selectedChoice('rules',state.useRules?'yes':'no');
  $('advancedSavedTraitsSlot').hidden=!state.useSavedTraits;
  $('advancedRulesSlot').hidden=!state.useRules;
  renderArtistControls();
  setTimeout(function(){renderArtistControls();renderLayerSummaries();renderGenerationSummary();updateStep()},120);
}

async function activate(){
  build();
  document.documentElement.dataset.creatorType='advanced';
  mountLegacyBlocks();
  if(activationPromise)return activationPromise;
  activationPromise=(async function(){await restoreCurrentProject();updateStep()})().finally(function(){activationPromise=null});
  return activationPromise;
}

window.OneHomeAdvancedWizard={
  flushSave:function(){return saveNow(false)},
  captureProjectData:captureProjectData
};
window.oneHomeActivateAdvancedWizard=activate;
window.addEventListener('onehome:creator-type',function(event){if(event.detail&&event.detail.type==='advanced')activate()});
window.addEventListener('onehome:advanced-data-changed',function(){renderLayerSummaries();renderGenerationSummary();saveNow(false)});
window.addEventListener('onehome:creator-start-new',function(){resetAdvancedRuntime();state={multipleArtists:null,useSavedTraits:false,useRules:false};step=1;window.__ONEHOME_ADVANCED_WIZARD_STATE__={step:1,multipleArtists:false,artistChoiceMade:false,useSavedTraits:false,useRules:false};if($('riAdvancedWizard')){loadLegacyFields();renderArtistControls();renderLayerSummaries();renderGenerationSummary();updateStep()}});

function boot(){build();if(document.documentElement.dataset.creatorType==='advanced')activate()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
