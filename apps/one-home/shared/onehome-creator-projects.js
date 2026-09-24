(function(){
'use strict';

const BUILD='1374';
const ACTIVE_KEY='onehome_creator_active_project_v1333';
const MIGRATION_KEY='onehome_creator_projects_migrated_v1333';
const PROJECT_DB='onehome_creator_projects_v1333';
const PROJECT_STORE='projects';
const ACCOUNT_CACHE_KEY='onehome_creator_cache_owner_v1341';
const SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
const SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
const SUPABASE_STORAGE_KEY='sb-fshvettlltcujmwvikfq-auth-token';
const REMOTE_TABLE='creator_projects';
const REMOTE_BUCKET='creator-drafts';
const MINT_DRAFT_TABLE='mint_drafts';
const MINT_DRAFT_BUCKET='mint-drafts';
let accountUser=null;
let accountClient=null;
let accountReady=false;
let remoteTimers=new Map();
let remoteLocks=new Map();
let remoteBinarySignatures=new Map();
let verifiedRemoteProjectData=new Map();
let pendingFirstTransfers=[];
const TYPE_CONFIG={
  single:{label:'Single NFT',mode:'simple',help:'Create one unique NFT from one finished image.',draftKey:'onehome_single_nft_draft_v1325',dbName:'onehome_single_nft_artwork',dbStore:'artwork',dbKey:'single'},
  edition:{label:'Edition — Same Image',mode:'simple',help:'Create multiple NFTs that share the same finished image.',draftKey:'onehome_edition_nft_draft_v1329',dbName:'onehome_creator_artwork_v1329',dbStore:'artwork',dbKey:'edition'},
  multi:{label:'Collection — Multiple Images',mode:'multi',help:'Upload finished images and choose how many NFTs use each one.',draftKey:'onehome_multi_image_draft_v1331',dbName:'onehome_multi_image_artwork_v1331',dbStore:'artwork',dbKey:'multi'},
  randomized:{label:'Randomized Collection',mode:'multi',help:'Upload finished images and distribute them across the collection at random.',draftKey:'onehome_randomized_collection_draft_v1332',dbName:'onehome_randomized_collection_artwork_v1332',dbStore:'artwork',dbKey:'randomized'},
  advanced:{label:'Advanced Randomizer',mode:'advanced',help:'Build artwork from a base image and transparent layers, with optional artists, saved traits, rarity settings, and rules.',draftKey:'nightShotsAutoSaveProject',dbName:null,dbStore:null,dbKey:null}
};

function creatorTypeFromSavedData(record,fallback){
  const data=record&&record.draftData;
  const direct=String(data&&data.type||record&&record.savedCreatorType||record&&record.creatorType||'').toLowerCase();
  if(TYPE_CONFIG[direct])return direct;
  if(data&&data.advancedWizard)return 'advanced';
  if(data&&Array.isArray(data.generatedRecords))return 'advanced';
  if(data&&data.state){
    const distribution=String(data.state.distributionStyle||'').toLowerCase();
    if(distribution||String(data.type||'').toLowerCase()==='randomized')return 'randomized';
    return 'multi';
  }
  const proposed=String(record&&record.type||fallback||'').toLowerCase();
  return TYPE_CONFIG[proposed]?proposed:'single';
}
function normalizeCreatorRecord(record,fallback){
  if(!record)return record;
  const resolved=creatorTypeFromSavedData(record,fallback);
  record.type=resolved;
  record.savedCreatorType=resolved;
  return record;
}

function creatorRecordHasContent(record){
  if(!record||!record.draftData)return false;
  const type=creatorTypeFromSavedData(record,record.type);
  if(type==='multi'||type==='randomized')return !!(record.draftData.state&&Array.isArray(record.draftData.state.items)&&record.draftData.state.items.length&&Array.isArray(record.artwork)&&record.artwork.length);
  if(type==='advanced')return !!(record.draftData.advancedWizard||Array.isArray(record.draftData.generatedRecords)||record.draftData.collection);
  return !!(record.artwork||record.draftData.name||record.draftData.baseName);
}
function creatorRecordHasDraftData(record){
  if(!record||typeof record!=='object')return false;
  if(record.draftData)return true;
  if(Array.isArray(record.artwork))return record.artwork.length>0;
  if(record.artwork)return true;
  return !!(record.specialOptions&&Object.keys(record.specialOptions).length);
}
function creatorRecordIsUsable(record){
  return !!(record&&typeof record==='object'&&(record.id||record.type||record.savedCreatorType||record.name||record.draftData!==undefined||record.artwork!==undefined));
}

function $(id){return document.getElementById(id)}
const EMBEDDED_MINT_CONTEXT_PREFIX='onehome_mint_creator_context_';
function embeddedMintContext(query){
  const id=String(query&&query.get('mintContext')||'').trim();
  if(!id)return null;
  try{
    const raw=sessionStorage.getItem(EMBEDDED_MINT_CONTEXT_PREFIX+id);
    const data=parseJson(raw);
    if(!data||typeof data!=='object')return null;
    const collectionName=String(data.collectionName||'').trim();
    const description=String(data.description||'');
    const supply=Math.max(1,Math.min(10000,Number(data.supply)||1));
    if(!collectionName)return null;
    return {id:id,collectionName:collectionName,description:description,supply:supply,baseName:String(data.baseName||collectionName).trim()||collectionName};
  }catch(_error){return null}
}
function setCreatorCarryValue(id,value){
  const node=$(id);if(!node||value===undefined||value===null)return;
  node.value=String(value);
  node.dispatchEvent(new Event('input',{bubbles:true}));
}
async function applyEmbeddedMintContext(type,context){
  if(!context||!TYPE_CONFIG[type])return;
  const name=context.collectionName,description=context.description,supply=context.supply,baseName=context.baseName||name;
  if(type==='single'){
    setCreatorCarryValue('singleNftName',name);setCreatorCarryValue('singleNftDescription',description);
  }else if(type==='edition'){
    setCreatorCarryValue('editionName',name);setCreatorCarryValue('editionBaseName',baseName);setCreatorCarryValue('editionDescription',description);setCreatorCarryValue('editionQuantity',Math.max(2,supply));
  }else if(type==='multi'){
    setCreatorCarryValue('multiCollectionName',name);setCreatorCarryValue('multiBaseName',baseName);setCreatorCarryValue('multiDescription',description);
  }else if(type==='randomized'){
    setCreatorCarryValue('randomCollectionName',name);setCreatorCarryValue('randomBaseName',baseName);setCreatorCarryValue('randomDescription',description);setCreatorCarryValue('randomSupply',Math.max(2,supply));
  }else if(type==='advanced'){
    setCreatorCarryValue('advancedCollectionName',name);setCreatorCarryValue('advancedBaseName',baseName);setCreatorCarryValue('advancedDescription',description);setCreatorCarryValue('advancedSupply',supply);
  }
  if(typeof flushActiveWizard==='function')await flushActiveWizard().catch(function(){});
  if(typeof captureProject==='function')await captureProject().catch(function(){});
}
function uid(){return crypto.randomUUID?crypto.randomUUID():'project-'+Date.now()+'-'+Math.random().toString(16).slice(2)}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
function now(){return new Date().toISOString()}
function activeId(){return localStorage.getItem(ACTIVE_KEY)||''}
function setActive(id){if(id)localStorage.setItem(ACTIVE_KEY,id);else localStorage.removeItem(ACTIVE_KEY)}
function notifyEmbeddedMintProjectSaved(record){
  try{
    const query=new URLSearchParams(location.search);
    if(query.get('embedded')!=='mint'||window.parent===window||!record||!record.id)return;
    window.parent.postMessage({type:'onehome-creator-project-saved',creatorProjectId:String(record.id),creatorType:String(record.type||''),name:String(record.name||''),updatedAt:String(record.updatedAt||now())},location.origin);
  }catch(_error){}
}
function workspaceIsEditing(){
  const workspace=$('riCreatorWorkspace');
  const type=document.documentElement.dataset.creatorType||'';
  return !!(workspace&&workspace.style.display!=='none'&&TYPE_CONFIG[type]);
}
function parseJson(value){try{return JSON.parse(value||'null')}catch(_error){return null}}
function draftName(type,data){
  if(!data)return 'Untitled Collection';
  if(type==='single')return String(data.name||'Untitled NFT').trim()||'Untitled NFT';
  if(type==='edition')return String(data.name||data.baseName||'Untitled Edition').trim()||'Untitled Edition';
  if(type==='multi'||type==='randomized')return String(data.state&&data.state.collectionName||data.state&&data.state.baseName||'Untitled Collection').trim()||'Untitled Collection';
  if(type==='advanced')return String(data.collection&&data.collection.collectionName||'Untitled Advanced Collection').trim()||'Untitled Advanced Collection';
  return 'Untitled Collection';
}
function draftStep(data){return Math.max(1,Number(data&&((data.advancedWizard&&data.advancedWizard.step)||data.wizardStep||data.step))||1)}
function formatDate(value){
  const date=new Date(value||Date.now());
  if(Number.isNaN(date.getTime()))return 'Recently saved';
  return date.toLocaleString([], {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
}

function getCreatorClient(){
  if(accountClient)return accountClient;
  try{
    const host=window.parent&&window.parent!==window?window.parent:null;
    if(host){
      if(host.oneHomePassportSupabase&&host.oneHomePassportSupabase.auth)accountClient=host.oneHomePassportSupabase;
      else if(host.doodProfileSupabase&&host.doodProfileSupabase.auth)accountClient=host.doodProfileSupabase;
      else if(host.doodSupabase&&host.doodSupabase.auth)accountClient=host.doodSupabase;
      else if(host.supabaseClient&&host.supabaseClient.auth)accountClient=host.supabaseClient;
    }
  }catch(_error){}
  if(accountClient)return accountClient;
  if(window.oneHomePassportSupabase&&window.oneHomePassportSupabase.auth)accountClient=window.oneHomePassportSupabase;
  else if(window.doodProfileSupabase&&window.doodProfileSupabase.auth)accountClient=window.doodProfileSupabase;
  else if(window.doodSupabase&&window.doodSupabase.auth)accountClient=window.doodSupabase;
  else if(window.supabaseClient&&window.supabaseClient.auth)accountClient=window.supabaseClient;
  else if(window.supabase&&window.supabase.createClient)accountClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:SUPABASE_STORAGE_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return accountClient;
}
async function authenticatedCreator(){
  const client=getCreatorClient();
  if(!client)throw new Error('Your One Home Passport could not be checked. Return to One Home and sign in again.');
  const sessionResult=await client.auth.getSession();
  if(sessionResult.error)throw sessionResult.error;
  if(!sessionResult.data.session)throw new Error('Sign in to your One Home Passport before opening NFT Creator.');
  const userResult=await client.auth.getUser();
  if(userResult.error)throw userResult.error;
  if(!userResult.data.user)throw new Error('Your One Home Passport session is not available. Return to One Home and sign in again.');
  accountUser=userResult.data.user;
  return accountUser;
}
function showAccountGate(message){
  document.documentElement.removeAttribute('data-creator-type');
  document.body.innerHTML='<main style="min-height:80vh;display:grid;place-items:center;padding:24px;background:#0b1220;color:#fff;font-family:Arial,sans-serif"><section style="width:min(620px,100%);background:#111827;border:1px solid #475569;border-radius:20px;padding:28px"><h1 style="margin:0 0 12px;font-size:34px">Sign in to open NFT Creator</h1><p style="color:#d1d5db;line-height:1.6">'+esc(message||'Your saved collections are private and open only through your One Home Passport.')+'</p><a href="/?passport=entry&from=onehome-start" target="_top" style="display:inline-block;margin-top:12px;padding:13px 20px;border-radius:999px;background:#a81798;color:#fff;text-decoration:none;font-weight:900">Return to One Home Sign In</a></section></main>';
}
function accountNotice(text,bad){
  let box=$('riCreatorAccountNotice');
  const home=$('riCreatorProjectHome');
  if(!home)return;
  if(!box){box=document.createElement('div');box.id='riCreatorAccountNotice';box.style.cssText='margin:14px 0;padding:12px 14px;border-radius:12px;border:1px solid #3f6b50;background:#153321;color:#dcfce7;font-weight:800;line-height:1.45';home.insertBefore(box,home.firstChild)}
  box.textContent=text;box.style.borderColor=bad?'#9f3d49':'#3f6b50';box.style.background=bad?'#3b151b':'#153321';box.style.color=bad?'#ffe4e6':'#dcfce7';box.hidden=!text;
}
function isPlainObject(value){return !!value&&Object.prototype.toString.call(value)==='[object Object]'}
function safePart(value){return String(value||'asset').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'asset'}
function quickHash(value){let hash=2166136261;const text=String(value||'');const stride=Math.max(1,Math.floor(text.length/2048));for(let index=0;index<text.length;index+=stride){hash^=text.charCodeAt(index);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16)}
function collectBinarySignature(value,parts,seen){
  parts=parts||[];seen=seen||new WeakSet();
  if(value instanceof Blob){parts.push(['blob',value.name||'',value.type||'',value.size||0,value.lastModified||0].join(':'));return parts}
  if(typeof value==='string'&&/^data:[^,]*,/i.test(value)){parts.push('data:'+value.length+':'+quickHash(value));return parts}
  if(!value||typeof value!=='object'||seen.has(value))return parts;
  seen.add(value);
  if(Array.isArray(value))value.forEach(function(item){collectBinarySignature(item,parts,seen)});
  else Object.keys(value).sort().forEach(function(key){collectBinarySignature(value[key],parts,seen)});
  return parts;
}
function dataUrlBinary(value){
  const match=String(value||'').match(/^data:([^;,]*)(;base64)?,(.*)$/s);
  if(!match)throw new Error('Saved artwork could not be prepared.');
  const type=match[1]||'application/octet-stream';
  const raw=match[2]?atob(match[3]):decodeURIComponent(match[3]);
  if(!raw.length)throw new Error('Saved artwork is empty and cannot be uploaded.');
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return {bytes:bytes,type:type};
}
function dataUrlBlob(value){
  const binary=dataUrlBinary(value);
  return new Blob([binary.bytes],{type:binary.type});
}
function blobToBytes(blob){
  if(!blob||typeof blob.size!=='number'||blob.size<1)return Promise.reject(new Error('Saved artwork is empty and cannot be uploaded.'));
  if(typeof blob.arrayBuffer==='function')return blob.arrayBuffer().then(function(buffer){return new Uint8Array(buffer)});
  return new Promise(function(resolve,reject){
    const reader=new FileReader();
    reader.onload=function(){
      const buffer=reader.result;
      if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<1){reject(new Error('Saved artwork could not be converted to upload bytes.'));return}
      resolve(new Uint8Array(buffer));
    };
    reader.onerror=function(){reject(reader.error||new Error('Saved artwork could not be opened.'))};
    reader.readAsArrayBuffer(blob);
  });
}
async function uploadRemoteBinary(path,bytes,contentType){
  if(!(bytes instanceof Uint8Array))bytes=new Uint8Array(bytes||0);
  if(!bytes.byteLength)throw new Error('Saved artwork is empty and cannot be uploaded.');
  // Do not pass Blob/File here. Supabase's Blob upload branch serializes as
  // multipart FormData; Safari/WebKit can produce an empty multipart file body.
  // Uint8Array uses Supabase Storage's raw binary upload branch instead.
  const result=await getCreatorClient().storage.from(REMOTE_BUCKET).upload(path,bytes,{upsert:true,contentType:contentType||'application/octet-stream',cacheControl:'0'});
  if(result.error)throw result.error;
  return result.data;
}
function blobToDataUrl(blob){return new Promise(function(resolve,reject){const reader=new FileReader();reader.onload=function(){resolve(String(reader.result||''))};reader.onerror=function(){reject(reader.error||new Error('Saved artwork could not be opened.'))};reader.readAsDataURL(blob)})}
async function encodeRemoteValue(value,context,seen){
  seen=seen||new WeakSet();
  if(value&&isPlainObject(value)&&value.__onehome_asset&&value.path){
    if(!Array.isArray(context.paths))context.paths=[];
    if(!context.paths.includes(value.path))context.paths.push(value.path);
    return Object.assign({},value);
  }
  if(value instanceof Blob){
    const cache=context.assetCache||(context.assetCache=new Map());
    const cacheKey=['blob',value.name||'',value.type||'',value.size||0,value.lastModified||0].join(':');
    if(cache.has(cacheKey))return cache.get(cacheKey);
    const index=context.assetIndex++;
    const name=safePart(value.name||('artwork-'+(index+1)));
    const baseFolder=context.baseFolder||accountUser.id+'/'+context.projectId+'/files';
    const path=baseFolder+'/'+String(index).padStart(4,'0')+'-'+name;
    context.paths.push(path);
    if(context.upload){const bytes=await blobToBytes(value);await uploadRemoteBinary(path,bytes,value.type||'application/octet-stream')}
    const reference={__onehome_asset:'file',path:path,name:value.name||name,type:value.type||'application/octet-stream',lastModified:value.lastModified||Date.now()};
    cache.set(cacheKey,reference);return reference;
  }
  if(typeof value==='string'&&/^data:[^,]*,/i.test(value)){
    const cache=context.assetCache||(context.assetCache=new Map()),cacheKey='data:'+value.length+':'+quickHash(value);
    if(cache.has(cacheKey))return cache.get(cacheKey);
    const binary=dataUrlBinary(value),index=context.assetIndex++;
    const extension=(binary.type.split('/')[1]||'bin').replace(/[^a-z0-9]+/gi,'');
    const baseFolder=context.baseFolder||accountUser.id+'/'+context.projectId+'/files';
    const path=baseFolder+'/'+String(index).padStart(4,'0')+'-embedded.'+extension;
    context.paths.push(path);
    if(context.upload)await uploadRemoteBinary(path,binary.bytes,binary.type||'application/octet-stream');
    const reference={__onehome_asset:'data-url',path:path,type:binary.type||'application/octet-stream'};
    cache.set(cacheKey,reference);return reference;
  }
  if(value==null||typeof value!=='object')return value;
  if(seen.has(value))return null;
  seen.add(value);
  if(Array.isArray(value)){const list=[];for(const item of value)list.push(await encodeRemoteValue(item,context,seen));return list}
  if(!isPlainObject(value))return null;
  const output={};for(const key of Object.keys(value))output[key]=await encodeRemoteValue(value[key],context,seen);return output;
}

function creatorRemoteArtworkRefs(projectData){
  const artwork=projectData&&projectData.artwork;
  const list=Array.isArray(artwork)?artwork:(artwork?[artwork]:[]);
  return list.filter(function(item){return item&&isPlainObject(item)&&item.__onehome_asset&&item.path});
}
function handoffArtworkAliasCache(handoff,projectData){
  const cache=new Map();
  const images=handoff&&handoff.collection&&Array.isArray(handoff.collection.finalImages)?handoff.collection.finalImages:[];
  const refs=creatorRemoteArtworkRefs(projectData);
  if(!images.length||refs.length!==images.length)return cache;
  const namesMatch=images.every(function(image,index){
    const imageName=String(image&&image.name||'').trim().toLowerCase();
    const refName=String(refs[index]&&refs[index].name||'').trim().toLowerCase();
    return !imageName||!refName||imageName===refName;
  });
  if(!namesMatch)return cache;
  images.forEach(function(image,index){
    const data=String(image&&image.data||'');
    const ref=refs[index];
    if(!/^data:[^,]*,/i.test(data)||!ref||!ref.path)return;
    const dataType=(data.match(/^data:([^;,]+)/i)||[])[1]||ref.type||'application/octet-stream';
    cache.set('data:'+data.length+':'+quickHash(data),{__onehome_asset:'data-url',path:ref.path,type:dataType});
  });
  return cache;
}

async function decodeRemoteValue(value,cache,bucket){
  cache=cache||new Map();bucket=bucket||REMOTE_BUCKET;
  if(value&&isPlainObject(value)&&value.__onehome_asset&&value.path){
    let blob=cache.get(value.path);
    if(!blob){const result=await getCreatorClient().storage.from(bucket).download(value.path);if(result.error)throw result.error;blob=result.data;cache.set(value.path,blob)}
    if(value.__onehome_asset==='data-url')return await blobToDataUrl(blob);
    try{return new File([blob],value.name||'artwork',{type:value.type||blob.type||'application/octet-stream',lastModified:Number(value.lastModified)||Date.now()})}catch(_error){blob.name=value.name||'artwork';return blob}
  }
  if(Array.isArray(value)){const list=[];for(const item of value)list.push(await decodeRemoteValue(item,cache,bucket));return list}
  if(!isPlainObject(value))return value;
  const output={};for(const key of Object.keys(value))output[key]=await decodeRemoteValue(value[key],cache,bucket);return output;
}

function missingRemoteObject(error){
  const text=String(error&&error.message||error||'').toLowerCase();
  return text.includes('object not found')||text.includes('not found')||text.includes('no such key')||text.includes('404');
}
function fileFromDataUrl(data,name){
  if(!data||!/^data:[^,]*,/i.test(String(data)))return null;
  const blob=dataUrlBlob(data);
  try{return new File([blob],name||'artwork',{type:blob.type||'application/octet-stream',lastModified:Date.now()})}
  catch(_error){blob.name=name||'artwork';return blob}
}
function specialOptionsFromHandoff(collection){
  const source=collection&&collection.specialOptions||{};
  const reward=source.burnReward||null;
  const rewardArt=reward&&reward.reward&&reward.reward.artwork||null;
  return {
    mintCoverFile:collection&&collection.cover&&collection.cover.data?fileFromDataUrl(collection.cover.data,collection.cover.name||'mint-cover.png'):null,
    revealEnabled:!!source.revealEnabled,
    revealMethod:source.revealMethod||'manual',
    revealDate:source.revealDate||'',
    placeholderFile:collection&&collection.placeholder&&collection.placeholder.data?fileFromDataUrl(collection.placeholder.data,collection.placeholder.name||'unrevealed.png'):null,
    physicalEnabled:!!source.physicalEnabled,
    physicalDescription:source.physicalDescription||'',
    redemptionMethod:source.redemptionMethod||'collector_request',
    physicalQuantity:Math.max(1,Number(source.physicalQuantity)||Number(collection&&collection.fields&&collection.fields.supply)||1),
    shippingRequired:source.shippingRequired!==false,
    travelTrackerEnabled:!!source.travelTrackerEnabled,
    burnRequired:!!source.burnRequired,
    burnRewardEnabled:!!source.burnRewardEnabled,
    burnRewardVersion:reward&&reward.version||1,
    burnRewardCampaignName:reward&&reward.campaignName||'',
    burnRewardCampaignDescription:reward&&reward.campaignDescription||'',
    burnRewardPieces:Array.isArray(reward&&reward.pieces)?reward.pieces:[],
    burnRewardRequiredPieceCount:Number(reward&&reward.requiredPieceCount)||0,
    burnRewardMaximumRedemptions:Number(reward&&reward.maximumRedemptions)||0,
    burnRewardRewardName:reward&&reward.reward&&reward.reward.name||'',
    burnRewardRewardDescription:reward&&reward.reward&&reward.reward.description||'',
    burnRewardArtworkFile:rewardArt&&rewardArt.data?fileFromDataUrl(rewardArt.data,rewardArt.name||'reward.png'):null,
    burnRewardTransferFee:Number(reward&&reward.reward&&reward.reward.transferFee)||0,
    burnRewardAllowTimeCapsule:reward?reward.allowTimeCapsule!==false:true,
    burnRewardNetwork:reward&&reward.network||'testnet'
  };
}
function sharedTraitsFromHandoff(collection){
  if(Array.isArray(collection&&collection.sharedTraits))return collection.sharedTraits.map(function(item){return {trait_type:String(item&&item.trait_type||''),value:item&&item.value!=null?item.value:''}}).filter(function(item){return item.trait_type});
  const metadata=Array.isArray(collection&&collection.metadataItems)&&collection.metadataItems.length?collection.metadataItems:Array.isArray(collection&&collection.mintMetadataItems)?collection.mintMetadataItems:[];
  if(!metadata.length)return [];
  const representatives=[];
  const seenSources=new Set();
  for(const item of metadata){
    const source=String(item&&item.source_artwork_number||'');
    if(source){if(seenSources.has(source))continue;seenSources.add(source)}
    representatives.push(Array.isArray(item&&item.attributes)?item.attributes:[]);
    if(!source&&representatives.length>=Math.min(metadata.length,100))break;
  }
  if(!representatives.length)return [];
  const excluded=new Set(['source artwork','edition','status']);
  const perImage=new Set();
  for(const planItem of Array.isArray(collection&&collection.editionPlan)?collection.editionPlan:[]){
    for(const trait of Array.isArray(planItem&&planItem.traits)?planItem.traits:[]){
      perImage.add(String(trait&&trait.trait_type||'').trim().toLowerCase()+'\u0000'+String(trait&&trait.value!=null?trait.value:''));
    }
  }
  const normalized=representatives.map(function(list){const map=new Map();for(const trait of list){const type=String(trait&&trait.trait_type||'').trim(),value=trait&&trait.value!=null?trait.value:'';if(!type||excluded.has(type.toLowerCase()))continue;const key=type.toLowerCase()+'\u0000'+String(value);if(!perImage.has(key))map.set(key,{trait_type:type,value:value})}return map});
  const first=normalized[0]||new Map();
  return Array.from(first.entries()).filter(function(entry){return normalized.every(function(map){return map.has(entry[0])})}).map(function(entry){return entry[1]});
}

function creatorRecordFromHandoff(row,handoff){
  const collection=handoff&&handoff.collection||null;
  if(!collection||!collection.fields)throw new Error('The saved Creator backup is incomplete.');
  const mode=String(collection.mode||'simple').toLowerCase();
  const type=mode==='multi'?'multi':mode==='randomized'?'randomized':mode==='advanced'?'advanced':'single';
  const finals=Array.isArray(collection.finalImages)?collection.finalImages:[];
  const plan=Array.isArray(collection.editionPlan)?collection.editionPlan:[];
  const artwork=finals.map(function(item,index){return fileFromDataUrl(item&&item.data,item&&item.name||('artwork-'+(index+1)+'.png'))}).filter(Boolean);
  let draftData=null;
  if(type==='multi'||type==='randomized'){
    const items=finals.map(function(image,index){
      const detail=plan[index]||{};
      return {name:String(detail.name||collection.fields.baseName||('NFT '+(index+1))),description:String(detail.description||collection.fields.description||''),quantity:Math.max(type==='randomized'?0:1,Number(detail.quantity!=null?detail.quantity:image&&image.quantity)||1),traits:Array.isArray(detail.traits)?detail.traits:[]};
    });
    const shared=sharedTraitsFromHandoff(collection);
    draftData={type:type,step:type==='multi'?6:7,activeDetail:1,activeTrait:1,state:{collectionName:String(collection.fields.collectionName||row.name||'Untitled Collection'),baseName:String(collection.fields.baseName||'NFT'),description:String(collection.fields.description||''),sharedTraits:shared,items:items,supply:Number(collection.fields.supply)||items.reduce(function(sum,item){return sum+(Number(item.quantity)||0)},0),distributionStyle:String(collection.fields.distributionStyle||'even'),assignments:Array.isArray(collection.assignments)?collection.assignments:[],seed:String(collection.commitment||'')},savedAt:row.updated_at||now()};
  }else if(type==='single'){
    const quantity=Math.max(1,Number(collection.fields.supply)||1);
    const shared=sharedTraitsFromHandoff(collection);
    draftData=quantity>1?{type:'edition',step:5,name:String(collection.fields.collectionName||row.name||'Untitled Edition'),baseName:String(collection.fields.baseName||'NFT'),description:String(collection.fields.description||''),quantity:quantity,traits:shared,savedAt:row.updated_at||now()}:{type:'single',step:4,name:String(collection.fields.collectionName||row.name||'Untitled NFT'),description:String(collection.fields.description||''),traits:shared,savedAt:row.updated_at||now()};
  }else{
    const shared=Array.isArray(collection.sharedTraits)?collection.sharedTraits:sharedTraitsFromHandoff(collection);
    const perImageTraits=collection.perImageTraits&&typeof collection.perImageTraits==='object'?collection.perImageTraits:{};
    draftData={type:'advanced',version:'NightShotsGeneratorV3MultiArtist',advancedWizard:{step:8},wizardStep:8,collection:{collectionName:String(collection.fields.collectionName||row.name||'Untitled Advanced Collection'),nftBaseName:String(collection.fields.baseName||'NFT'),supplyAmount:String(Number(collection.fields.supply)||finals.length||0),description:String(collection.fields.description||'')},sharedTraits:shared,perImageTraits:perImageTraits,generatedRecords:[],savedAt:row.updated_at||now()};
  }
  const resolvedType=draftData&&draftData.type==='edition'?'edition':type;
  return normalizeCreatorRecord({id:row.id,ownerId:row.owner_id,status:row.status||'draft',type:resolvedType,savedCreatorType:resolvedType,name:row.name||collection.fields.collectionName||'Untitled Collection',step:draftStep(draftData),createdAt:row.created_at||handoff.createdAt||now(),updatedAt:row.updated_at||handoff.createdAt||now(),draftData:draftData,artwork:resolvedType==='single'?artwork[0]||null:artwork,specialOptions:specialOptionsFromHandoff(collection),remoteStub:false,remoteVerifiedAt:now(),recoveredFromMintHandoff:true},resolvedType);
}
async function verifyRemotePaths(paths){
  const unique=Array.from(new Set((paths||[]).filter(Boolean)));
  for(const path of unique){
    const result=await getCreatorClient().storage.from(REMOTE_BUCKET).download(path);
    if(result.error||!result.data||Number(result.data.size||0)<1)throw new Error('One Home could not verify the saved artwork file: '+path.split('/').pop());
  }
}

function openProjectDb(){
  return new Promise(function(resolve,reject){
    const request=indexedDB.open(PROJECT_DB,1);
    request.onupgradeneeded=function(){const db=request.result;if(!db.objectStoreNames.contains(PROJECT_STORE))db.createObjectStore(PROJECT_STORE,{keyPath:'id'})};
    request.onsuccess=function(){resolve(request.result)};
    request.onerror=function(){reject(request.error||new Error('Saved collections could not be opened.'))};
  });
}
async function withProjectStore(mode,fn){
  const db=await openProjectDb();
  try{
    return await new Promise(function(resolve,reject){
      const tx=db.transaction(PROJECT_STORE,mode);
      const store=tx.objectStore(PROJECT_STORE);
      let result;
      try{result=fn(store,tx,resolve,reject)}catch(error){reject(error);return}
      tx.oncomplete=function(){if(result!==undefined&&typeof result!=='object')resolve(result)};
      tx.onerror=function(){reject(tx.error||new Error('Saved collections could not be updated.'))};
      tx.onabort=function(){reject(tx.error||new Error('Saved collections could not be updated.'))};
    });
  }finally{db.close()}
}
async function getLocalProject(id){
  if(!id)return null;
  const db=await openProjectDb();
  try{return await new Promise(function(resolve,reject){const tx=db.transaction(PROJECT_STORE,'readonly');const req=tx.objectStore(PROJECT_STORE).get(id);req.onsuccess=function(){resolve(req.result||null)};req.onerror=function(){reject(req.error)}})}finally{db.close()}
}
async function getLocalProjects(){
  const db=await openProjectDb();
  try{return await new Promise(function(resolve,reject){const tx=db.transaction(PROJECT_STORE,'readonly');const req=tx.objectStore(PROJECT_STORE).getAll();req.onsuccess=function(){resolve(Array.isArray(req.result)?req.result:[])};req.onerror=function(){reject(req.error)}})}finally{db.close()}
}
async function putLocalProject(record){
  const db=await openProjectDb();
  try{await new Promise(function(resolve,reject){const tx=db.transaction(PROJECT_STORE,'readwrite');tx.objectStore(PROJECT_STORE).put(record);tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error)}})}finally{db.close()}
  return record;
}
async function removeLocalProject(id){
  const db=await openProjectDb();
  try{await new Promise(function(resolve,reject){const tx=db.transaction(PROJECT_STORE,'readwrite');tx.objectStore(PROJECT_STORE).delete(id);tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error)}})}finally{db.close()}
}

async function clearLocalProjects(){
  const db=await openProjectDb();
  try{await new Promise(function(resolve,reject){const tx=db.transaction(PROJECT_STORE,'readwrite');tx.objectStore(PROJECT_STORE).clear();tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error)}})}finally{db.close()}
}
async function cleanupRemoteFolder(folder,keepPaths){
  const listed=await getCreatorClient().storage.from(REMOTE_BUCKET).list(folder,{limit:1000});
  if(listed.error)throw listed.error;
  const keep=new Set(keepPaths||[]),remove=(listed.data||[]).filter(function(item){return item&&item.name&&!keep.has(folder+'/'+item.name)}).map(function(item){return folder+'/'+item.name});
  if(remove.length){const result=await getCreatorClient().storage.from(REMOTE_BUCKET).remove(remove);if(result.error)throw result.error}
}
async function cleanupRemoteFiles(projectId,keepPaths){
  return await cleanupRemoteFolder(accountUser.id+'/'+projectId+'/files',keepPaths);
}
async function syncProjectNow(record,options){
  if(!accountReady||!accountUser||!record)return record;
  options=options||{};
  const previous=remoteLocks.get(record.id)||Promise.resolve();
  const task=previous.catch(function(){}).then(async function(){
    const latest=normalizeCreatorRecord(await getLocalProject(record.id)||record,record.type);
    if(latest.ownerId&&latest.ownerId!==accountUser.id)throw new Error('This saved collection belongs to a different Home ID.');
    latest.ownerId=accountUser.id;
    latest.ownerLabel=String(accountUser.email||accountUser.user_metadata&&accountUser.user_metadata.home_id||accountUser.user_metadata&&accountUser.user_metadata.wallet_address||('Home ID '+accountUser.id.slice(0,8))).trim();
    const signature=collectBinarySignature(latest).join('|');
    const upload=options.forceUpload===true||remoteBinarySignatures.get(latest.id)!==signature;
    const context={projectId:latest.id,baseFolder:accountUser.id+'/'+latest.id+'/files',assetIndex:0,paths:[],upload:upload};
    const encoded=await encodeRemoteValue(latest,context);
    if(upload&&context.paths.length)await verifyRemotePaths(context.paths);
    const row={id:latest.id,owner_id:accountUser.id,status:latest.status||'draft',creator_type:latest.type,name:latest.name||'Untitled Collection',wizard_step:Math.max(1,Number(latest.step)||1),project_data:encoded,created_at:latest.createdAt||now(),updated_at:now()};
    const saved=await getCreatorClient().from(REMOTE_TABLE).upsert(row,{onConflict:'id'}).select('id,owner_id,updated_at').single();
    if(saved.error)throw saved.error;
    if(!saved.data||saved.data.owner_id!==accountUser.id)throw new Error('The saved collection could not be verified under your Home ID.');
    if(upload)await cleanupRemoteFiles(latest.id,context.paths);
    remoteBinarySignatures.set(latest.id,signature);
    latest.ownerId=accountUser.id;latest.updatedAt=saved.data.updated_at||latest.updatedAt||now();latest.remoteVerifiedAt=now();latest.remoteStub=false;
    await putLocalProject(latest);
    localStorage.setItem('onehome_creator_repaired_1359_'+accountUser.id+'_'+latest.id,'1');
    notifyEmbeddedMintProjectSaved(latest);
    return latest;
  }).finally(function(){if(remoteLocks.get(record.id)===task)remoteLocks.delete(record.id)});
  remoteLocks.set(record.id,task);
  return await task;
}

function scheduleRemoteSync(record,delay){
  if(!accountReady||!accountUser||!record)return;
  const old=remoteTimers.get(record.id);if(old)clearTimeout(old);
  const timer=setTimeout(function(){remoteTimers.delete(record.id);syncProjectNow(record).catch(function(error){console.warn('Creator account save failed',error)})},delay==null?1400:delay);
  remoteTimers.set(record.id,timer);
}
async function flushRemoteSync(id){
  if(!accountReady||!accountUser)return;
  const target=id||activeId();if(!target)return;
  const timer=remoteTimers.get(target);if(timer){clearTimeout(timer);remoteTimers.delete(target)}
  const record=await getLocalProject(target);if(record)await syncProjectNow(record);
  const lock=remoteLocks.get(target);if(lock)await lock;
}
async function creatorRecordFromMintDraftRow(row){
  if(!row||!row.creator_project_id||!row.source_data)return null;
  const decoded=await decodeRemoteValue(row.source_data,new Map(),MINT_DRAFT_BUCKET);
  if(!decoded||decoded.kind!=='creator-handoff'||!decoded.data||!decoded.data.collection)return null;
  const fakeRow={id:row.creator_project_id,owner_id:row.owner_user_id,status:'draft',name:row.name||'Untitled Collection',created_at:row.created_at,updated_at:row.updated_at};
  const record=creatorRecordFromHandoff(fakeRow,decoded.data);
  record.recoveredFromMintBackup=true;
  await putLocalProject(record);
  await syncProjectNow(record,{forceUpload:true});
  return record;
}
async function recoverCreatorFromMintDraft(projectId){
  if(!accountReady||!accountUser||!projectId)return null;
  const result=await getCreatorClient().from(MINT_DRAFT_TABLE).select('id,owner_user_id,creator_project_id,name,source_data,created_at,updated_at').eq('owner_user_id',accountUser.id).eq('creator_project_id',projectId).order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)return null;
  try{return await creatorRecordFromMintDraftRow(result.data)}catch(error){console.warn('Creator recovery from Mint backup failed',error);return null}
}

async function getProject(id){
  if(!id)return null;
  let local=await getLocalProject(id);
  if(local&&local.ownerId===accountUser?.id&&!local.remoteStub&&creatorRecordHasContent(local))return normalizeCreatorRecord(local,local.type);
  if(local&&local.ownerId===accountUser?.id&&!local.remoteStub&&workspaceIsEditing()&&activeId()===id)return normalizeCreatorRecord(local,local.type);
  if(!accountReady||!accountUser)return local;
  const result=await getCreatorClient().from(REMOTE_TABLE).select('*').eq('id',id).eq('owner_id',accountUser.id).maybeSingle();
  if(result.error)throw result.error;
  if(!result.data){
    const mintRecovered=await recoverCreatorFromMintDraft(id);
    if(mintRecovered){accountNotice('This saved collection was restored from its Passport Mint backup.');return mintRecovered}
    return null;
  }
  let record=null,primaryError=null;
  try{
    const decoded=normalizeCreatorRecord(await decodeRemoteValue(result.data.project_data||{}),result.data.creator_type);
    if(!creatorRecordIsUsable(decoded))throw new Error('The saved Creator project record could not be decoded.');
    record=decoded;
  }catch(error){primaryError=error;console.warn('Creator Passport project artwork restore failed',error)}
  if(!record&&result.data.mint_handoff_data){
    try{
      const handoff=await decodeRemoteValue(result.data.mint_handoff_data,new Map(),REMOTE_BUCKET);
      record=creatorRecordFromHandoff(result.data,handoff);
      record.recoveredFromMintHandoff=true;
      accountNotice('This saved collection was repaired from its Passport Mint handoff.');
    }catch(error){console.warn('Creator Passport Mint handoff restore failed',error);if(!primaryError)primaryError=error}
  }
  if(!record&&local&&!local.remoteStub&&creatorRecordHasContent(local)){
    await syncProjectNow(local,{forceUpload:true});
    record=local;
  }
  if(!record){
    const mintRecovered=await recoverCreatorFromMintDraft(id);
    if(mintRecovered){accountNotice('This saved collection was restored from its independent Passport Mint backup.');return mintRecovered}
  }
  if(!record){
    const raw=result.data.project_data;
    const emptyRemote=!raw||(isPlainObject(raw)&&Object.keys(raw).length===0);
    if(emptyRemote&&!result.data.mint_handoff_data){
      const fallbackType=TYPE_CONFIG[result.data.creator_type]?result.data.creator_type:(local&&TYPE_CONFIG[local.type]?local.type:'single');
      record=normalizeCreatorRecord({id:result.data.id,ownerId:result.data.owner_id,status:result.data.status||'draft',type:fallbackType,savedCreatorType:fallbackType,name:result.data.name||(local&&local.name)||'Untitled Collection',step:Math.max(1,Number(result.data.wizard_step)||1),createdAt:result.data.created_at||now(),updatedAt:result.data.updated_at||now(),draftData:local&&local.draftData||null,artwork:local&&local.artwork||null,specialOptions:local&&local.specialOptions||{},remoteStub:false,remoteVerifiedAt:now()},fallbackType);
    }else{
      if(missingRemoteObject(primaryError))throw new Error('This collection needs one repair from the original computer. Open its Mint there once after deploying the latest One Home package.');
      throw primaryError||new Error('This saved collection could not be opened.');
    }
  }
  record.id=result.data.id;record.ownerId=result.data.owner_id;record.status=result.data.status;record.name=result.data.name||record.name;record.step=result.data.wizard_step||record.step;record.createdAt=result.data.created_at||record.createdAt;record.updatedAt=result.data.updated_at||record.updatedAt;record.remoteStub=false;record.remoteVerifiedAt=now();
  await putLocalProject(record);
  if(record.recoveredFromMintHandoff||record.type!==result.data.creator_type)await syncProjectNow(record,{forceUpload:true});
  remoteBinarySignatures.set(record.id,collectBinarySignature(record).join('|'));
  return record;
}

async function getProjects(){
  if(!accountReady||!accountUser)return await getLocalProjects();
  const result=await getCreatorClient().from(REMOTE_TABLE).select('id,owner_id,status,creator_type,name,wizard_step,created_at,updated_at').order('updated_at',{ascending:false});
  if(result.error)throw result.error;
  const local=await getLocalProjects(),ownedLocal=local.filter(function(item){return item.ownerId===accountUser.id}),byId=new Map(ownedLocal.map(function(item){return [item.id,item]})),remoteIds=new Set();
  const rows=[];
  for(const item of result.data||[]){
    remoteIds.add(item.id);
    let record=byId.get(item.id);
    if(!record){record={id:item.id,ownerId:item.owner_id,status:item.status,type:item.creator_type,name:item.name,step:item.wizard_step,createdAt:item.created_at,updatedAt:item.updated_at,remoteStub:true};await putLocalProject(record)}
    else{
      const hasLocalContent=creatorRecordHasContent(record)||creatorRecordHasDraftData(record);
      record.ownerId=item.owner_id;record.status=item.status;record.type=creatorTypeFromSavedData(record,item.creator_type);record.name=hasLocalContent?(record.name||item.name):item.name;record.step=hasLocalContent?(record.step||item.wizard_step):item.wizard_step;record.createdAt=record.createdAt||item.created_at;
      if(!hasLocalContent){record.updatedAt=item.updated_at;record.remoteStub=true}else record.remoteStub=false;
      await putLocalProject(record);
    }
    rows.push(record);
  }
  try{
    const mintResult=await getCreatorClient().from(MINT_DRAFT_TABLE).select('id,owner_user_id,creator_project_id,name,source_data,created_at,updated_at').eq('owner_user_id',accountUser.id).not('creator_project_id','is',null).order('updated_at',{ascending:false});
    if(mintResult.error)throw mintResult.error;
    const known=new Set(rows.map(function(item){return String(item.id)}));
    for(const mintRow of mintResult.data||[]){
      const projectId=String(mintRow.creator_project_id||'');
      if(!projectId||known.has(projectId)||!mintRow.source_data)continue;
      try{
        const recovered=await creatorRecordFromMintDraftRow(mintRow);
        if(recovered){rows.push(recovered);known.add(projectId);remoteIds.add(projectId);accountNotice('A Creator collection was restored from its Passport Mint backup.')}
      }catch(error){console.warn('Creator list Mint backup recovery skipped',error)}
    }
  }catch(error){console.warn('Creator Mint backup list could not be checked',error)}
  for(const record of ownedLocal){
    if(remoteIds.has(record.id))continue;
    if(!record.remoteVerifiedAt&&!record.remoteStub&&creatorRecordHasContent(record))rows.push(record);
    else if(!rows.some(function(item){return item.id===record.id}))await removeLocalProject(record.id);
  }
  rows.sort(function(a,b){return new Date(b.updatedAt||0)-new Date(a.updatedAt||0)});
  return rows;
}
async function putProject(record){
  normalizeCreatorRecord(record,record&&record.type);
  if(accountUser)record.ownerId=accountUser.id;
  await putLocalProject(record);
  scheduleRemoteSync(record);
  return record;
}
async function removeProject(id){
  const record=await getLocalProject(id);
  if(!record)return;
  if(record.status&&record.status!=='draft')throw new Error('Only an unfinished draft can be deleted.');
  const timer=remoteTimers.get(id);if(timer){clearTimeout(timer);remoteTimers.delete(id)}
  const lock=remoteLocks.get(id);if(lock)await lock;
  if(accountReady&&accountUser){
    const folders=[accountUser.id+'/'+id+'/files',accountUser.id+'/'+id+'/mint-handoff/files'];
    const paths=[];
    for(const folder of folders){const listed=await getCreatorClient().storage.from(REMOTE_BUCKET).list(folder,{limit:1000});if(listed.error)throw listed.error;(listed.data||[]).filter(function(item){return item&&item.name}).forEach(function(item){paths.push(folder+'/'+item.name)})}
    const deleted=await getCreatorClient().from(REMOTE_TABLE).delete().eq('id',id).eq('status','draft').select('id');
    if(deleted.error)throw deleted.error;
    if(!deleted.data||deleted.data.length!==1)throw new Error('This draft could not be deleted. It may no longer be unfinished.');
    if(paths.length){const removed=await getCreatorClient().storage.from(REMOTE_BUCKET).remove(paths);if(removed.error)console.warn('Unused draft artwork cleanup will be retried later',removed.error)}
  }
  await removeLocalProject(id);
  remoteBinarySignatures.delete(id);
}

function openLegacyDb(config){
  return new Promise(function(resolve,reject){
    if(!config||!config.dbName){resolve(null);return}
    const req=indexedDB.open(config.dbName,1);
    req.onupgradeneeded=function(){if(!req.result.objectStoreNames.contains(config.dbStore))req.result.createObjectStore(config.dbStore)};
    req.onsuccess=function(){resolve(req.result)};
    req.onerror=function(){reject(req.error)};
  });
}
async function readLegacyArtwork(type){
  const config=TYPE_CONFIG[type];
  if(!config||!config.dbName)return null;
  const db=await openLegacyDb(config);
  try{return await new Promise(function(resolve,reject){const tx=db.transaction(config.dbStore,'readonly');const req=tx.objectStore(config.dbStore).get(config.dbKey);req.onsuccess=function(){resolve(req.result||null)};req.onerror=function(){reject(req.error)}})}finally{db.close()}
}
async function writeLegacyArtwork(type,value){
  const config=TYPE_CONFIG[type];
  if(!config||!config.dbName)return;
  const db=await openLegacyDb(config);
  try{await new Promise(function(resolve,reject){const tx=db.transaction(config.dbStore,'readwrite');const store=tx.objectStore(config.dbStore);if(value==null)store.delete(config.dbKey);else store.put(value,config.dbKey);tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error)}})}finally{db.close()}
}
async function clearLegacyType(type){
  const config=TYPE_CONFIG[type];
  if(!config)return;
  if(config.draftKey)localStorage.removeItem(config.draftKey);
  if(type==='advanced'){localStorage.removeItem('onehome_advanced_wizard_v1335');localStorage.removeItem('onehome_advanced_wizard_v1336')}
  await writeLegacyArtwork(type,null).catch(function(){});
}
async function clearAllLegacy(){
  for(const type of Object.keys(TYPE_CONFIG))await clearLegacyType(type);
  localStorage.removeItem('onehome_nft_creator_type');
}
async function writeLegacyProject(record){
  normalizeCreatorRecord(record,record&&record.type);
  if(!record||!record.type)return;
  const config=TYPE_CONFIG[record.type];
  if(!config)return;
  if(config.draftKey){
    if(record.type==='advanced'){
      localStorage.removeItem(config.draftKey);
    }else if(record.draftData){
      localStorage.setItem(config.draftKey,JSON.stringify(record.draftData));
    }else localStorage.removeItem(config.draftKey);
  }
  await writeLegacyArtwork(record.type,record.artwork==null?null:record.artwork);
  localStorage.setItem('onehome_nft_creator_type',record.type);
}

async function captureProject(idOverride){
  const id=idOverride||activeId();
  if(!id)return null;
  // Capture the live Creator form into its local draft before requiring the
  // Passport copy to be complete. New projects intentionally begin as an
  // empty local shell, so validating the remote copy first can block the
  // very save that would make the project complete.
  let record=await getLocalProject(id);
  if(record&&accountUser&&record.ownerId&&record.ownerId!==accountUser.id)record=null;
  if(!record)record=await getProject(id);
  if(!record)return null;
  // A saved project may remain the active ID while the Creator home is open.
  // Never overwrite that saved project with empty, unmounted wizard fields.
  if(!workspaceIsEditing())return record;
  normalizeCreatorRecord(record,record.type);
  const visibleType=document.documentElement.dataset.creatorType||'';
  const type=TYPE_CONFIG[record.type]?record.type:(TYPE_CONFIG[visibleType]?visibleType:'single');
  if(type){
    const config=TYPE_CONFIG[type];
    record.type=type;
    if(config&&config.draftKey){
      let data=null;
      if(type==='advanced'&&window.OneHomeAdvancedWizard&&typeof window.OneHomeAdvancedWizard.captureProjectData==='function'){
        data=await window.OneHomeAdvancedWizard.captureProjectData();
      }else data=parseJson(localStorage.getItem(config.draftKey));
      if(data){record.draftData=data;record.name=draftName(type,data);record.step=draftStep(data);record.updatedAt=data.savedAt||now()}
      record.artwork=await readLegacyArtwork(type).catch(function(){return record.artwork||null});
    }else{
      record.name=String(($('collectionName')&&$('collectionName').value)||record.name||'Untitled Collection').trim()||'Untitled Collection';
      record.updatedAt=now();
    }
  }
  record.updatedAt=record.updatedAt||now();
  record.status='draft';
  await putProject(record);
  notifyEmbeddedMintProjectSaved(record);
  return record;
}

async function migrateLegacyDrafts(){
  if(localStorage.getItem(MIGRATION_KEY)==='1')return;
  const existing=await getLocalProjects();
  const importedKeys=new Set(existing.map(function(item){return item.importedFrom}).filter(Boolean));
  let preferred='';
  const lastType=localStorage.getItem('onehome_nft_creator_type')||'';
  for(const type of ['single','edition','multi','randomized','advanced']){
    const config=TYPE_CONFIG[type];
    if(importedKeys.has(config.draftKey))continue;
    const data=parseJson(localStorage.getItem(config.draftKey));
    if(!data)continue;
    const record={id:uid(),ownerId:accountUser&&accountUser.id||'',status:'draft',type:type,name:draftName(type,data),step:draftStep(data),createdAt:data.savedAt||now(),updatedAt:data.savedAt||now(),draftData:data,artwork:await readLegacyArtwork(type).catch(function(){return null}),specialOptions:{},importedFrom:config.draftKey};
    await putLocalProject(record);
    if(type===lastType)preferred=record.id;
  }
  if(preferred&&!activeId())setActive(preferred);
  localStorage.setItem(MIGRATION_KEY,'1');
}

let captureTimer=0;
function scheduleCapture(){
  clearTimeout(captureTimer);
  if(!workspaceIsEditing())return;
  captureTimer=setTimeout(function(){
    if(!workspaceIsEditing())return;
    captureProject().catch(function(error){console.warn('Creator draft capture failed',error)});
  },180);
}
async function getActiveProject(){
  const id=activeId();if(!id)return null;
  const local=await getLocalProject(id);
  if(local&&(!accountUser||!local.ownerId||local.ownerId===accountUser.id))return normalizeCreatorRecord(local,local.type);
  return await getProject(id);
}
async function getSpecialOptions(){const record=await getActiveProject();return record&&record.specialOptions?record.specialOptions:{}}
async function saveSpecialOptions(options){
  const id=activeId();
  if(!id)return null;
  let record=await getLocalProject(id);
  if(record&&accountUser&&record.ownerId&&record.ownerId!==accountUser.id)record=null;
  if(!record)record=await getProject(id);
  if(!record)return null;
  record.specialOptions=options||{};
  record.updatedAt=now();
  await putProject(record);
  return record;
}

async function saveAdvancedProjectData(project){
  const id=activeId();
  if(!id||!project)return null;
  let record=await getLocalProject(id);
  if(record&&accountUser&&record.ownerId&&record.ownerId!==accountUser.id)record=null;
  if(!record)record=await getProject(id);
  if(!record){record={id:id,status:'draft',type:'advanced',createdAt:now(),specialOptions:{}}}
  record.type='advanced';
  record.status='draft';
  record.draftData=project;
  record.name=draftName('advanced',project);
  record.step=draftStep(project);
  record.updatedAt=project.savedAt||now();
  record.createdAt=record.createdAt||record.updatedAt;
  await putProject(record);
  return record;
}

async function flushActiveWizard(){
  if(!workspaceIsEditing())return;
  if(document.documentElement.dataset.creatorType==='advanced'&&window.OneHomeAdvancedWizard&&typeof window.OneHomeAdvancedWizard.flushSave==='function'){
    await window.OneHomeAdvancedWizard.flushSave();
  }
}

async function saveBeforeMint(){
  if(!accountReady||!accountUser)throw new Error('Sign in to your One Home Passport before continuing to Mint.');
  await flushActiveWizard();
  const record=await captureProject();
  if(!record||!record.id)throw new Error('Save this Creator collection before continuing to Mint.');
  if(!creatorRecordHasContent(record))throw new Error('Finish the collection artwork and details before continuing to Mint.');

  // Passport is authoritative for Creator -> Mint. A valid browser/IndexedDB
  // copy is not enough to continue on Safari/mobile.
  await flushRemoteSync(record.id);
  const remote=await getCreatorClient().from(REMOTE_TABLE)
    .select('id,owner_id,status,updated_at,project_data')
    .eq('id',record.id)
    .eq('owner_id',accountUser.id)
    .maybeSingle();
  if(remote.error)throw remote.error;
  if(!remote.data||remote.data.owner_id!==accountUser.id||remote.data.status!=='draft'){
    throw new Error('The Creator collection could not be verified under your Passport. Save it and try again.');
  }

  verifiedRemoteProjectData.set(record.id,remote.data.project_data||{});
  record.ownerId=accountUser.id;
  record.remoteVerifiedAt=now();
  record.remoteStub=false;
  record.updatedAt=remote.data.updated_at||record.updatedAt||now();
  await putLocalProject(record).catch(function(error){console.warn('Creator browser cache update skipped after Passport verification',error)});
  return record;
}

function stableVerificationJson(value){
  if(Array.isArray(value))return '['+value.map(stableVerificationJson).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value).sort().map(function(key){return JSON.stringify(key)+':'+stableVerificationJson(value[key])}).join(',')+'}';
  }
  return JSON.stringify(value);
}
async function saveMintHandoff(handoff){
  if(!accountReady||!accountUser)throw new Error('Sign in to your One Home Passport before continuing to Mint.');
  if(!handoff||!handoff.creatorProjectId)throw new Error('The Creator project ID is missing from this Mint handoff.');
  const projectId=String(handoff.creatorProjectId);
  let projectData=verifiedRemoteProjectData.get(projectId)||null;
  if(!projectData){
    await flushRemoteSync(projectId);
    const verified=await getCreatorClient().from(REMOTE_TABLE).select('id,owner_id,status,project_data').eq('id',projectId).eq('owner_id',accountUser.id).maybeSingle();
    if(verified.error)throw verified.error;
    if(!verified.data||verified.data.owner_id!==accountUser.id||verified.data.status!=='draft')throw new Error('The Creator collection could not be verified under your Passport. Save it and try again.');
    projectData=verified.data.project_data||{};
    verifiedRemoteProjectData.set(projectId,projectData);
  }
  const baseFolder=accountUser.id+'/'+projectId+'/mint-handoff/files';
  const context={projectId:projectId,baseFolder:baseFolder,assetIndex:0,paths:[],upload:true,assetCache:handoffArtworkAliasCache(handoff,projectData)};
  const encoded=await encodeRemoteValue(handoff,context);
  if(context.paths.length)await verifyRemotePaths(context.paths);
  const saved=await getCreatorClient().from(REMOTE_TABLE).update({mint_handoff_data:encoded,mint_handoff_updated_at:now(),updated_at:now()}).eq('id',projectId).eq('owner_id',accountUser.id).select('id,owner_id,mint_handoff_updated_at,mint_handoff_data').single();
  if(saved.error){console.error('Passport Creator-to-Mint save failed',saved.error);throw new Error('One Home could not save this collection to your Passport. Please try again.');}
  if(!saved.data||saved.data.owner_id!==accountUser.id)throw new Error('One Home could not verify this collection under your Passport. Please try again.');
  const stored=typeof saved.data.mint_handoff_data==='string'?parseJson(saved.data.mint_handoff_data):saved.data.mint_handoff_data;
  const expectedTraitSignature=String(handoff.traitStateSignature||'');
  const storedTraitSignature=String(stored&&stored.traitStateSignature||'');
  if(expectedTraitSignature&&storedTraitSignature!==expectedTraitSignature)throw new Error('One Home did not preserve the Creator trait order while saving to your Passport. Nothing will continue to Mint; try again.');
  if(expectedTraitSignature&&stableVerificationJson(stored&&stored.traitState||null)!==stableVerificationJson(handoff.traitState||null))throw new Error('One Home did not preserve the exact Creator trait list while saving to your Passport. Nothing will continue to Mint; try again.');
  await cleanupRemoteFolder(baseFolder,context.paths);
  return saved.data;
}

window.OneHomeCreatorProjects={
  build:BUILD,
  getProjects:getProjects,
  getProject:getProject,
  getActiveProject:getActiveProject,
  getSpecialOptions:getSpecialOptions,
  saveSpecialOptions:saveSpecialOptions,
  saveAdvancedProjectData:saveAdvancedProjectData,
  captureActive:captureProject,
  saveBeforeMint:saveBeforeMint,
  saveMintHandoff:saveMintHandoff,
  flushRemoteSync:flushRemoteSync,
  startNew:null,
  showHome:null,
  resumeProject:null
};

function removeCreatorOnlyExtras(){
  const updates=$('nftUpdatesUniversal');if(updates){const shell=updates.closest('.ri-v86-shell');(shell||updates).remove()}
  document.querySelectorAll('button,.easy-choice,[role="button"]').forEach(function(node){const words=(node.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();if(words.includes('mint & json')||words==='mint and json'||words==='nft updates')node.remove()});
}

async function setupCreatorHome(){
  const home=$('riCreatorDoorHome'),projectHome=$('riCreatorProjectHome'),typeHome=$('riCreatorTypeHome'),workspace=$('riCreatorWorkspace');
  const select=$('riCreatorType'),start=$('riCreatorStart'),help=$('riCreatorHelp'),back=workspace&&workspace.querySelector('.ri-back-doors');
  const startNewButton=$('riStartNewProject'),continueButton=$('riContinueProjects'),manageButton=$('riManageProjects'),listPanel=$('riProjectListPanel'),list=$('riProjectList'),listTitle=$('riProjectListTitle'),listHelp=$('riProjectListHelp'),closeList=$('riCloseProjectList'),backToProjects=$('riBackToProjectHome'),workspaceNew=$('riWorkspaceNewProject');
  if(!home||!projectHome||!typeHome||!workspace||!select||!start||!help||!back)return;
  let pendingNew=false;

  function resetSpecialScreen(){
    delete document.documentElement.dataset.creatorSpecial;
    const panel=$('riCreatorSpecialOptions');
    if(panel){panel.hidden=true;panel.style.setProperty('display','none','important')}
    window.dispatchEvent(new CustomEvent('onehome:creator-special-reset'));
  }

  function describe(){const item=TYPE_CONFIG[select.value];help.textContent=item?item.help:'';start.disabled=!item}
  function showProjectHome(){
    pendingNew=false;
    resetSpecialScreen();
    delete document.documentElement.dataset.creatorType;
    workspace.style.display='none';home.style.display='block';projectHome.hidden=false;typeHome.hidden=true;listPanel.hidden=true;select.value='';describe();
    renderButtons().catch(function(){});
    window.scrollTo({top:0,behavior:'auto'});
  }
  function showTypeHome(){
    resetSpecialScreen();
    workspace.style.display='none';home.style.display='block';projectHome.hidden=true;typeHome.hidden=false;listPanel.hidden=true;select.value='';describe();window.scrollTo({top:0,behavior:'auto'});
  }
  async function openType(type){
    clearTimeout(captureTimer);
    resetSpecialScreen();
    let id=activeId();let record=id?await getProject(id):null;
    if(pendingNew||!record){
      record={id:uid(),status:'draft',type:type,savedCreatorType:type,name:'Untitled '+(type==='single'?'NFT':'Collection'),step:1,createdAt:now(),updatedAt:now(),draftData:null,artwork:null,specialOptions:{}};
      await putProject(record);setActive(record.id);pendingNew=false;
    }else{
      normalizeCreatorRecord(record,type);
      type=record.type;
    }
    const item=TYPE_CONFIG[type];if(!item)return;
    localStorage.setItem('onehome_nft_creator_type',type);
    document.documentElement.dataset.creatorType=type;
    home.style.display='none';workspace.style.display='block';
    const room=$('riRoomName');if(room)room.textContent=item.label;
    if(typeof window.selectMode==='function')window.selectMode(item.mode);
    window.dispatchEvent(new CustomEvent('onehome:creator-type',{detail:{type:type,label:item.label,mode:item.mode}}));
    if(type==='single'&&typeof window.oneHomeActivateSingleWizard==='function')await window.oneHomeActivateSingleWizard();
    if(type==='edition'&&typeof window.oneHomeActivateEditionWizard==='function')await window.oneHomeActivateEditionWizard();
    if(type==='multi'&&typeof window.oneHomeActivateMultiWizard==='function')await window.oneHomeActivateMultiWizard();
    if(type==='randomized'&&typeof window.oneHomeActivateRandomizedWizard==='function')await window.oneHomeActivateRandomizedWizard();
    if(type==='advanced'&&typeof window.oneHomeActivateAdvancedWizard==='function')await window.oneHomeActivateAdvancedWizard();
    window.scrollTo({top:0,behavior:'auto'});removeCreatorOnlyExtras();
  }
  async function startNewFlow(){
    clearTimeout(captureTimer);
    await flushActiveWizard().catch(function(){});
    await captureProject().catch(function(){});
    await flushRemoteSync().catch(function(error){throw error});
    resetSpecialScreen();
    setActive('');
    await clearAllLegacy();
    pendingNew=true;
    window.dispatchEvent(new CustomEvent('onehome:creator-start-new'));
    showTypeHome();
  }
  async function continueProject(id){
    clearTimeout(captureTimer);
    await flushActiveWizard().catch(function(){});
    await captureProject().catch(function(){});
    await flushRemoteSync().catch(function(error){throw error});
    resetSpecialScreen();
    const record=normalizeCreatorRecord(await getProject(id));if(!record||!TYPE_CONFIG[record.type])return;
    await putLocalProject(record);await clearAllLegacy();await writeLegacyProject(record);setActive(record.id);pendingNew=false;await openType(record.type);
  }
  async function deleteProject(id){
    const record=await getProject(id);if(!record)return;
    const confirmed=window.confirm('Delete this draft?\n\nThis will remove the unfinished collection and its saved artwork. This cannot be undone.');
    if(!confirmed)return;
    if(activeId()===id){await clearLegacyType(record.type);setActive('')}
    await removeProject(id);await renderList('manage');await renderButtons();
  }
  async function renderButtons(){
    const projects=(await getProjects()).filter(function(item){return item.status==='draft'});
    continueButton.disabled=projects.length===0;manageButton.disabled=projects.length===0;
  }
  async function renderList(mode){
    const projects=(await getProjects()).filter(function(item){return item.status==='draft'}).sort(function(a,b){return new Date(b.updatedAt||0)-new Date(a.updatedAt||0)});
    listTitle.textContent=mode==='manage'?'Manage Saved Drafts':'Continue a Saved Collection';
    listHelp.textContent=mode==='manage'?'Delete only the unfinished drafts you no longer need.':'Choose the collection you want to continue.';
    list.innerHTML=projects.length?projects.map(function(record){
      const type=TYPE_CONFIG[record.type];
      return '<div class="ri-project-row" data-project="'+esc(record.id)+'"><div class="ri-project-meta"><strong>'+esc(record.name||'Untitled Collection')+'</strong><span>'+esc(type?type.label:'Collection')+' · Step '+esc(record.step||1)+' · Saved '+esc(formatDate(record.updatedAt))+'</span></div><div class="ri-project-row-actions"><button type="button" data-action="continue" data-id="'+esc(record.id)+'">Continue</button>'+(mode==='manage'?'<button type="button" data-action="delete" data-id="'+esc(record.id)+'">Delete Draft</button>':'')+'</div></div>';
    }).join(''):'<div class="ri-project-empty">There are no saved drafts yet.</div>';
    list.querySelectorAll('[data-action="continue"]').forEach(function(button){button.onclick=function(){continueProject(button.dataset.id).catch(showHomeError)}});
    list.querySelectorAll('[data-action="delete"]').forEach(function(button){button.onclick=function(){deleteProject(button.dataset.id).catch(showHomeError)}});
    listPanel.hidden=false;
  }
  function showHomeError(error){alert(error&&error.message?error.message:'The saved collection could not be opened.')}

  select.addEventListener('change',describe);
  start.addEventListener('click',function(){openType(select.value).catch(showHomeError)});
  startNewButton.addEventListener('click',function(){startNewFlow().catch(showHomeError)});
  workspaceNew.addEventListener('click',function(){startNewFlow().catch(showHomeError)});
  continueButton.addEventListener('click',function(){renderList('continue').catch(showHomeError)});
  manageButton.addEventListener('click',function(){renderList('manage').catch(showHomeError)});
  closeList.addEventListener('click',function(){listPanel.hidden=true});
  backToProjects.addEventListener('click',showProjectHome);
  back.addEventListener('click',async function(){try{await flushActiveWizard();await captureProject();await flushRemoteSync();showProjectHome()}catch(error){showHomeError(error)}});

  window.OneHomeCreatorProjects.startNew=startNewFlow;
  window.OneHomeCreatorProjects.showHome=showProjectHome;
  window.OneHomeCreatorProjects.resumeProject=continueProject;

  document.addEventListener('input',function(){if(workspace.style.display!=='none'&&document.documentElement.dataset.creatorType!=='advanced')scheduleCapture()},true);
  document.addEventListener('change',function(){if(workspace.style.display!=='none'&&document.documentElement.dataset.creatorType!=='advanced')scheduleCapture()},true);
  document.addEventListener('click',function(event){
    if(workspace.style.display==='none')return;
    const control=event.target.closest('.singleSave,.editionSave,.multiSave,.randomSave,.advancedSave,.singleNext,.editionNext,.multiNext,.randomNext,.advancedNext,.singleBack,.editionBack,.multiBack,.randomBack,.advancedBack');
    if(!control)return;
    if(document.documentElement.dataset.creatorType!=='advanced')setTimeout(scheduleCapture,30);
    if(control.matches('.singleSave,.editionSave,.multiSave,.randomSave,.advancedSave'))setTimeout(function(){flushActiveWizard().then(function(){return captureProject()}).then(function(){return flushRemoteSync()}).catch(function(error){console.warn('Creator save verification failed',error)})},80);
  },true);
  window.addEventListener('beforeunload',function(){scheduleCapture()});

  const query=new URLSearchParams(location.search),requestedProject=query.get('resumeProject')||'',requestedType=query.get('creatorType')||'',requestedMode=query.get('mode')||'',embedded=query.get('embedded')==='mint';
  const mintContext=embedded?embeddedMintContext(query):null;
  if(embedded){document.body.classList.add('ri-embedded-mint');back.style.display='none';workspaceNew.style.display='none';if(mintContext)window.__ONEHOME_EMBEDDED_MINT_CONTEXT__=mintContext}
  if(requestedProject){
    const record=await getProject(requestedProject).catch(function(){return null});
    if(record&&TYPE_CONFIG[record.type])await continueProject(requestedProject);
    else{showProjectHome();accountNotice('That saved collection could not be reopened. Choose it from Continue a Saved Collection.',true)}
  }
  else if(TYPE_CONFIG[requestedType]){pendingNew=true;showTypeHome();select.value=requestedType;describe();await openType(requestedType);if(mintContext)await applyEmbeddedMintContext(requestedType,mintContext)}
  else if(['simple','multi','advanced'].includes(requestedMode)){const fallback=Object.keys(TYPE_CONFIG).find(function(key){return TYPE_CONFIG[key].mode===requestedMode})||'single';pendingNew=true;showTypeHome();select.value=fallback;describe();await openType(fallback);if(mintContext)await applyEmbeddedMintContext(fallback,mintContext)}
  else showProjectHome();
  removeCreatorOnlyExtras();setTimeout(removeCreatorOnlyExtras,50);setTimeout(removeCreatorOnlyExtras,500);
}

function installSpecialOptions(){
  const workspace=$('riCreatorWorkspace');if(!workspace||$('riCreatorSpecialOptions'))return;
  const style=document.createElement('style');style.id='riCreatorSpecialOptionsStyleV1467195';style.textContent=`
html[data-creator-special="1"] #riCreatorWorkspace> :not(.ri-workspace-top):not(#riCreatorSpecialOptions){display:none!important}
html[data-creator-special="1"] #riCreatorSpecialOptions{display:block!important}
#riCreatorSpecialOptions{max-width:780px;margin:0 auto}.ri-special-card{background:#111827;border:1px solid #3f4f6c;border-radius:20px;padding:26px}.ri-special-card h2{font-size:30px;margin:0 0 8px}.ri-special-card>p{color:#cbd5e1;line-height:1.5}.ri-special-choice{border:1px solid #475569;border-radius:16px;padding:18px;margin-top:18px;background:#172033}.ri-special-choice label.main{display:flex;gap:11px;align-items:center;font-size:18px;font-weight:900}.ri-special-fields{display:grid;gap:14px;margin-top:15px}.ri-special-fields[hidden]{display:none!important}.ri-special-field{display:grid;gap:7px}.ri-special-field label{font-weight:800}.ri-special-field input,.ri-special-field textarea,.ri-special-field select{box-sizing:border-box;width:100%;border:1px solid #64748b;border-radius:11px;background:#fff;color:#111;padding:12px 13px;font-size:16px}.ri-special-preview{max-width:300px;margin-top:10px}.ri-special-preview img{display:block;width:100%;max-height:280px;object-fit:contain;border-radius:12px;background:#090d16}.ri-special-actions{display:flex;justify-content:space-between;gap:12px;margin-top:22px;flex-wrap:wrap}.ri-special-actions button{border:0;border-radius:12px;padding:13px 20px;font-weight:900;font-size:16px;cursor:pointer}.ri-special-actions .primary{background:#a81798;color:#fff}.ri-special-actions .secondary{background:#334155;color:#fff;border:1px solid #64748b}.ri-special-help{margin-top:8px;padding:11px 12px;border-radius:10px;background:#0f172a;color:#cbd5e1;line-height:1.5;font-size:14px}.ri-special-message{display:none;margin-top:14px;padding:12px 14px;border-radius:11px;background:#451a03;color:#ffedd5}@media(max-width:680px){.ri-special-actions{display:grid}.ri-special-actions button{width:100%}}
`;
  document.body.appendChild(style);
  const panel=document.createElement('section');panel.id='riCreatorSpecialOptions';panel.hidden=true;panel.innerHTML=`
<div class="ri-special-card">
  <h2>Would you like to add anything special?</h2>
  <p>Artwork features stay here. Redeemable benefits are configured after mint setup.</p>
  <div class="ri-special-choice">
    <label class="main"><input type="checkbox" id="riSpecialReveal"> Reveal the final artwork later</label>
    <div id="riSpecialRevealFields" class="ri-special-fields" hidden>
      <div class="ri-special-field"><label for="riSpecialPlaceholder">Unrevealed placeholder artwork</label><input id="riSpecialPlaceholder" type="file" accept="image/*"><div id="riSpecialPlaceholderPreview" class="ri-special-preview"></div></div>
      <div class="ri-special-field"><label for="riSpecialRevealMethod">How should the reveal happen?</label><select id="riSpecialRevealMethod"><option value="manual">Reveal manually</option><option value="collection_complete">Reveal when every NFT has been claimed</option><option value="date">Reveal on a specific date and time</option></select><div id="riSpecialRevealMethodHelp" class="ri-special-help"></div></div>
      <div class="ri-special-field" id="riSpecialRevealDateWrap" hidden><label for="riSpecialRevealDate">Specific reveal date and time</label><input id="riSpecialRevealDate" type="datetime-local"></div>
    </div>
  </div>
  <div class="ri-special-choice"><div class="ri-special-help"><strong>Redeemables:</strong> In Create a Mint choose <strong>Yes</strong> for redeemable benefits. After mint setup, open Passport → Creator → Redeemables to add physical items, quantities, shipping, matching-set rewards, and fulfillment rules.</div></div>
  <div id="riSpecialMessage" class="ri-special-message"></div>
  <div class="ri-special-actions"><button type="button" id="riSpecialBack" class="secondary">Back</button><button type="button" id="riSpecialContinue" class="primary">Continue</button></div>
</div>`;
  workspace.appendChild(panel);
  let pendingButton=null,bypassButton=null,placeholderFile=null,previewUrl='';
  function showMessage(text){const box=$('riSpecialMessage');box.textContent=text;box.style.display='block'}
  function clearMessage(){$('riSpecialMessage').style.display='none'}
  function normalizeRevealMethod(value){if(value==='mint_out'||value==='sold_out'||value==='collection_complete')return'collection_complete';if(value==='date'||value==='scheduled')return'date';return'manual'}
  function revealMethodHelp(value){if(value==='collection_complete')return'For this collection, the reveal happens after the final NFT is minted and claimed.';if(value==='date')return'The final artwork becomes visible automatically on the date and time you choose.';return'You choose when the final artwork becomes visible to collectors.'}
  function updateVisibility(){const enabled=$('riSpecialReveal').checked;$('riSpecialRevealFields').hidden=!enabled;const method=normalizeRevealMethod($('riSpecialRevealMethod').value);$('riSpecialRevealMethod').value=method;$('riSpecialRevealDateWrap').hidden=method!=='date';const help=$('riSpecialRevealMethodHelp');if(help)help.textContent=revealMethodHelp(method)}
  function renderPreview(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=''}const box=$('riSpecialPlaceholderPreview');if(!placeholderFile){box.innerHTML='<div style="color:#94a3b8">No placeholder selected.</div>';return}previewUrl=URL.createObjectURL(placeholderFile);box.innerHTML='<img src="'+previewUrl+'" alt="Unrevealed placeholder"><div style="margin-top:7px;color:#cbd5e1">'+esc(placeholderFile.name)+'</div>'}
  function resetPanelState(){pendingButton=null;bypassButton=null;placeholderFile=null;clearMessage();if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=''}const input=$('riSpecialPlaceholder');if(input)input.value='';const preview=$('riSpecialPlaceholderPreview');if(preview)preview.innerHTML='<div style="color:#94a3b8">No placeholder selected.</div>';panel.hidden=true;panel.style.setProperty('display','none','important');delete document.documentElement.dataset.creatorSpecial}
  window.addEventListener('onehome:creator-special-reset',resetPanelState);
  async function openPanel(button){pendingButton=button;clearMessage();await flushActiveWizard();const liveRecord=await captureProject();if(!liveRecord||!creatorRecordHasContent(liveRecord))throw new Error('One Home could not capture the completed Creator collection. Save the draft once and try again.');const options=liveRecord.specialOptions||{};$('riSpecialReveal').checked=!!options.revealEnabled;$('riSpecialRevealMethod').value=normalizeRevealMethod(options.revealMethod);$('riSpecialRevealDate').value=options.revealDate||'';placeholderFile=options.placeholderFile||null;const input=$('riSpecialPlaceholder');if(input)input.value='';renderPreview();updateVisibility();panel.hidden=false;panel.style.setProperty('display','block','important');document.documentElement.dataset.creatorSpecial='1';const focus=function(){try{window.scrollTo({top:0,behavior:'auto'})}catch(_error){window.scrollTo(0,0)}try{window.OneHomeEmbeddedMintBridge?.focusStep('special',1)}catch(_error){}};focus();requestAnimationFrame(focus);setTimeout(focus,80)}
  function closePanel(){panel.hidden=true;panel.style.setProperty('display','none','important');delete document.documentElement.dataset.creatorSpecial;window.scrollTo({top:0,behavior:'auto'})}
  async function saveAndContinue(){clearMessage();const revealEnabled=$('riSpecialReveal').checked,revealMethod=normalizeRevealMethod($('riSpecialRevealMethod').value);if(revealEnabled&&!placeholderFile){showMessage('Add the unrevealed placeholder artwork before continuing.');return}if(revealEnabled&&revealMethod==='date'&&!$('riSpecialRevealDate').value){showMessage('Choose the reveal date and time.');return}const existingOptions=await getSpecialOptions();const options={mintCoverFile:existingOptions&&existingOptions.mintCoverFile||null,revealEnabled,placeholderFile:revealEnabled?placeholderFile:null,revealMethod,revealDate:revealEnabled&&revealMethod==='date'?$('riSpecialRevealDate').value:'',physicalEnabled:false,physicalDescription:'',physicalQuantity:0,shippingRequired:false,travelTrackerEnabled:false,burnRequired:false,burnRewardEnabled:false};await captureProject();await saveSpecialOptions(options);await flushRemoteSync();closePanel();const button=pendingButton;pendingButton=null;if(button){bypassButton=button;button.click();setTimeout(function(){bypassButton=null},0)}}
  function isReviewContinue(button){const type=document.documentElement.dataset.creatorType||'';const definitions={single:{className:'singleNext',step:'4'},edition:{className:'editionNext',step:'5'},multi:{className:'multiNext',step:'5'},randomized:{className:'randomNext',step:'7'},advanced:{className:'advancedNext',step:'8'}};const def=definitions[type];if(!def||!button.classList.contains(def.className))return false;const stepPanel=button.closest('[data-step]');return!!stepPanel&&stepPanel.dataset.step===def.step&&!stepPanel.hidden}
  document.addEventListener('click',function(event){const button=event.target.closest('button');if(!button||button===bypassButton)return;if(isReviewContinue(button)){event.preventDefault();event.stopImmediatePropagation();openPanel(button).catch(function(error){alert(error&&error.message?error.message:'The optional settings could not be opened.')})}},true);
  $('riSpecialReveal').addEventListener('change',updateVisibility);$('riSpecialRevealMethod').addEventListener('change',updateVisibility);$('riSpecialPlaceholder').addEventListener('change',function(event){const file=event.target.files&&event.target.files[0];if(file&&!String(file.type||'').startsWith('image/')){showMessage('Choose an image file for the placeholder.');event.target.value='';return}placeholderFile=file||null;renderPreview()});$('riSpecialBack').addEventListener('click',function(){pendingButton=null;closePanel()});$('riSpecialContinue').addEventListener('click',function(){saveAndContinue().catch(function(error){showMessage(error&&error.message?error.message:'These options could not be saved.')})});
}


async function recoverActiveLegacyProject(){
  const id=activeId();if(!id)return null;
  let record=await getLocalProject(id);if(!record)return null;
  normalizeCreatorRecord(record,record.type);
  const hinted=String(localStorage.getItem('onehome_nft_creator_type')||'').toLowerCase();
  const type=TYPE_CONFIG[hinted]?hinted:record.type;
  if(!TYPE_CONFIG[type]||type!==record.type)return null;
  const config=TYPE_CONFIG[type];
  let data=null,artwork=null;
  if(type==='advanced'&&window.OneHomeAdvancedWizard&&typeof window.OneHomeAdvancedWizard.captureProjectData==='function'){
    try{data=await window.OneHomeAdvancedWizard.captureProjectData()}catch(_error){}
  }else if(config.draftKey)data=parseJson(localStorage.getItem(config.draftKey));
  if(config.dbName)artwork=await readLegacyArtwork(type).catch(function(){return null});
  const hasArtwork=Array.isArray(artwork)?artwork.length>0:!!artwork;
  if(!data&&!hasArtwork)return null;
  if(data){record.draftData=data;record.name=draftName(type,data);record.step=draftStep(data);record.updatedAt=data.savedAt||now()}
  if(hasArtwork)record.artwork=artwork;
  record.type=type;record.savedCreatorType=type;record.status='draft';record.remoteStub=false;record.updatedAt=record.updatedAt||now();
  await putLocalProject(record);
  return record;
}

async function prepareCreatorAccount(){
  const user=await authenticatedCreator();
  const priorOwner=localStorage.getItem(ACCOUNT_CACHE_KEY)||'';
  if(priorOwner&&priorOwner!==user.id){
    await clearLocalProjects();
    await clearAllLegacy();
    setActive('');
    localStorage.removeItem(MIGRATION_KEY);
  }
  await recoverActiveLegacyProject().catch(function(error){console.warn('Creator active draft recovery skipped',error)});
  accountReady=true;
  await migrateLegacyDrafts();
  pendingFirstTransfers=[];
  const local=await getLocalProjects();
  for(const record of local){
    if(record.ownerId&&record.ownerId!==user.id){await removeLocalProject(record.id);continue}
    if(record.remoteStub)continue;
    const repairKey='onehome_creator_repaired_1359_'+user.id+'_'+record.id;
    const needsFirstTransfer=!record.ownerId||!record.remoteVerifiedAt||localStorage.getItem(repairKey)!=='1';
    record.ownerId=user.id;
    await putLocalProject(record);
    if(needsFirstTransfer)pendingFirstTransfers.push(record);
  }
  localStorage.setItem(ACCOUNT_CACHE_KEY,user.id);
  await clearAllLegacy();
  setActive('');
  const client=getCreatorClient();
  if(client&&client.auth&&typeof client.auth.onAuthStateChange==='function')client.auth.onAuthStateChange(function(event,session){
    const nextId=session&&session.user&&session.user.id||'';
    if(event==='SIGNED_OUT'||(accountUser&&nextId&&nextId!==accountUser.id)){
      accountReady=false;accountUser=null;verifiedRemoteProjectData.clear();
      Promise.resolve().then(clearAllLegacy).then(clearLocalProjects).then(function(){setActive('');localStorage.removeItem(ACCOUNT_CACHE_KEY);showAccountGate('Your Home ID session ended. Sign in again to open your private saved collections.')}).catch(function(){});
    }
  });
}

async function finishFirstTransfers(){
  const queue=pendingFirstTransfers.slice();
  pendingFirstTransfers=[];
  if(!queue.length)return;
  accountNotice('Your Creator is ready. Finishing your older saved collections in the background…');
  const failed=[];
  for(const record of queue){
    try{await syncProjectNow(record,{forceUpload:true})}catch(error){failed.push(record);console.warn('Creator saved collection transfer',error)}
  }
  if(failed.length){
    pendingFirstTransfers=failed;
    accountNotice('The Creator is ready, but one or more older saved collections still need to finish saving. Open the collection and choose Save Draft to try again.',true);
    return;
  }
  accountNotice('Your saved collections are ready.');
  setTimeout(function(){accountNotice('')},3500);
}

async function boot(){
  try{
    await prepareCreatorAccount();
    await setupCreatorHome();
    installSpecialOptions();
    finishFirstTransfers().catch(function(error){console.warn('Creator saved collection transfer',error);accountNotice('The Creator is ready, but an older saved collection still needs to finish saving. Open it and choose Save Draft to try again.',true)});
  }catch(error){
    console.error(error);
    showAccountGate(error&&error.message?error.message:'The NFT Creator could not verify your Home ID.');
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
