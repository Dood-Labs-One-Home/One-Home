/* One Home v14.67.141 — disk-backed large 7Z Mint import with creator metadata preservation.
   The staged archive is read as one continuous private Storage stream into OPFS. Token metadata
   is matched to artwork by the creator's source filename identity (with explicit
   metadata image references as a strict fallback), validated one-to-one, and stored
   as one private metadata bundle for fast handoff. No token metadata is regenerated. */

const WORKER_URL = '/assets/vendor/onehome-7z-workerfs-v1467141.js?v=1467141';

function text(value){ return String(value ?? '').trim(); }
function safeName(value,fallback='file'){
  const raw=text(value).replace(/\\/g,'/').split('/').pop()||fallback;
  return raw.replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||fallback;
}
function normalizePath(value){ return text(value).replace(/\\/g,'/').replace(/^\.\//,'').replace(/^\/+/, ''); }
function basename(value){ const parts=normalizePath(value).split('/'); return String(parts[parts.length-1]||''); }
function lowerBase(value){ return basename(value).toLowerCase(); }
function fileStem(value){ return lowerBase(value).replace(/\.[^.]+$/,''); }
function imageMime(value){
  const ext=lowerBase(value).split('.').pop();
  return ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',avif:'image/avif'})[ext]||'application/octet-stream';
}
function isImagePath(value){ return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(normalizePath(value)); }
function isJsonPath(value){ return /\.json$/i.test(normalizePath(value)); }
function isProjectJsonPath(value){
  const p=normalizePath(value);
  return /(^|\/)(mint-draft\.json|[^/]*complete-mint-draft[^/]*\.json|collection\.json|mint-configuration\.json)$/i.test(p);
}
function isLikelyTokenImage(entry){
  const p=normalizePath(entry?.path||entry?.Path).toLowerCase();
  const b=lowerBase(p);
  return !/(^|[-_])(cover|placeholder|unrevealed)([-_.]|$)/i.test(b);
}
function unsafePath(value){
  const p=String(value||'').replace(/\\/g,'/');
  return /^(?:[a-zA-Z]:|\/)/.test(p)||p.split('/').some(part=>part==='..');
}
function dataUrlBlob(dataUrl){
  const match=String(dataUrl||'').match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if(!match)return null;
  const mime=match[1]||'application/octet-stream';
  if(match[2]){
    const raw=atob(match[3]||'');
    const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  }
  return new Blob([decodeURIComponent(match[3]||'')],{type:mime});
}
function naturalCompare(a,b){ return String(a||'').localeCompare(String(b||''),undefined,{numeric:true,sensitivity:'base'}); }
async function mapWithConcurrency(items,limit,worker){const list=Array.isArray(items)?items:[],results=new Array(list.length);let next=0;async function run(){for(;;){const index=next++;if(index>=list.length)return;results[index]=await worker(list[index],index)}}await Promise.all(Array.from({length:Math.min(Math.max(1,limit),Math.max(1,list.length))},()=>run()));return results;}

async function removeOpfsTree(root,name){
  try{await root.removeEntry(name,{recursive:true});}catch(_error){}
}
async function walkOpfs(dir,prefix='',out=[]){
  for await(const [name,handle] of dir.entries()){
    const rel=prefix?`${prefix}/${name}`:name;
    if(unsafePath(rel))throw new Error(`The 7Z package contains an unsafe path and was stopped: ${rel}`);
    if(handle.kind==='directory')await walkOpfs(handle,rel,out);
    else if(handle.kind==='file')out.push({path:normalizePath(rel),handle});
  }
  return out;
}
async function readJsonEntry(entry){
  const file=await entry.handle.getFile();
  try{return JSON.parse(await file.text());}catch(_error){return null;}
}
function chooseCandidateEntries(entries){
  return entries.filter(e=>isProjectJsonPath(e.path));
}
function chooseArchiveDraft(parsed){
  const byBase=pattern=>parsed.find(item=>pattern.test(item.path));
  let selected=byBase(/(^|\/)mint-draft\.json$/i)||byBase(/complete-mint-draft[^/]*\.json$/i)||parsed.find(item=>item.value&&typeof item.value==='object'&&item.value.collection&&Array.isArray(item.value.collection.finalImages));
  if(selected)return selected.value;
  const collectionFile=byBase(/(^|\/)collection\.json$/i),settingsFile=byBase(/(^|\/)mint-configuration\.json$/i);
  if(collectionFile){
    const src=collectionFile.value||{},settings=settingsFile?.value&&typeof settingsFile.value==='object'?settingsFile.value:{},supply=Number(src.supply||src.totalSupply||0)||0;
    return {version:'browser-7z-import',feature:'One Home Archive Mint Package',createdAt:new Date().toISOString(),collection:{fields:{collectionName:String(src.name||src.collectionName||''),baseName:String(src.baseName||'NFT'),description:String(src.description||''),supply,type:String(src.collectionType||src.type||'nft'),revealEnabled:String(src.mintType||'').toLowerCase()==='reveal'},finalImages:[],metadataItems:[],mintMetadataItems:[],specialOptions:src.specialOptions||null},settings};
  }
  selected=parsed.find(item=>item.value&&typeof item.value==='object'&&(item.value.fields||item.value.finalImages));
  return selected?selected.value:null;
}
function inferredDraft(fileName,supply){
  const name=text(fileName).replace(/\.7z$/i,'').replace(/[-_]+/g,' ').trim()||'Imported Collection';
  return {version:'browser-7z-import',feature:'One Home Generic 7Z Mint Package',createdAt:new Date().toISOString(),collection:{fields:{collectionName:name,baseName:'NFT',description:'',supply:Math.max(1,Number(supply)||1),type:'nft',revealEnabled:false},finalImages:[],metadataItems:[],mintMetadataItems:[]},settings:{}};
}
function buildEntryMaps(imageEntries){
  const full=new Map(),base=new Map(),stem=new Map();
  for(const entry of imageEntries){
    const normalized=normalizePath(entry.path);full.set(normalized.toLowerCase(),entry);
    const b=lowerBase(normalized);if(!base.has(b))base.set(b,[]);base.get(b).push(entry);
    const s=fileStem(normalized);if(!stem.has(s))stem.set(s,[]);stem.get(s).push(entry);
  }
  return {full,base,stem};
}
function matchImage(maps,refs){
  for(const ref of refs){
    const raw=text(ref);if(!raw||/^data:/i.test(raw)||/^https?:/i.test(raw))continue;
    const normalized=normalizePath(raw.replace(/^file:\/\//i,'')).toLowerCase();
    if(maps.full.has(normalized))return maps.full.get(normalized);
    const matches=maps.base.get(lowerBase(normalized))||[];if(matches.length===1)return matches[0];
  }
  return null;
}
function metadataImageRef(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return '';
  const direct=[value.image,value.image_url,value.imageUrl,value.image_uri,value.imageUri].map(text).find(Boolean);
  if(direct)return direct;
  const props=value.properties&&typeof value.properties==='object'?value.properties:{};
  const propDirect=[props.image,props.image_url,props.imageUrl].map(text).find(Boolean);
  if(propDirect)return propDirect;
  for(const list of [value.files,value.media,props.files]){
    if(!Array.isArray(list))continue;
    for(const item of list){
      if(typeof item==='string'&&text(item))return text(item);
      if(item&&typeof item==='object'){
        const found=[item.uri,item.url,item.src,item.image].map(text).find(Boolean);
        if(found)return found;
      }
    }
  }
  return '';
}
function metadataName(value,fallback){
  return text(value?.name||value?.title)||fallback;
}
function pairSort(a,b){
  const an=Number(a.stem),bn=Number(b.stem);
  const ai=/^\d+$/.test(a.stem),bi=/^\d+$/.test(b.stem);
  if(ai&&bi&&an!==bn)return an-bn;
  if(ai!==bi)return ai?-1:1;
  return naturalCompare(a.stem,b.stem)||naturalCompare(a.imageEntry.path,b.imageEntry.path);
}
function sampleNames(values,limit=8){
  return values.slice(0,limit).map(value=>basename(value?.path||value)).filter(Boolean).join(', ');
}
async function buildTokenMetadataPlan(entries,imageEntries,expectedSupply){
  const maps=buildEntryMaps(imageEntries);
  const jsonEntries=entries.filter(entry=>isJsonPath(entry.path)&&!isProjectJsonPath(entry.path));
  const probable=jsonEntries.filter(entry=>{
    const p=normalizePath(entry.path).toLowerCase();
    return /(^|\/)metadata(\/|$)/i.test(p)||(maps.stem.get(fileStem(entry.path))||[]).length>0;
  });
  if(!probable.length)return {active:false,pairs:[],records:[],count:0};

  const pairs=[],invalid=[],unmatched=[],duplicates=[],usedImages=new Set();
  const parsedMetadata=await mapWithConcurrency(probable,16,async entry=>({entry,value:await readJsonEntry(entry)}));
  for(const row of parsedMetadata){
    const entry=row.entry,value=row.value;
    if(!value||typeof value!=='object'||Array.isArray(value)){invalid.push(entry);continue}
    let image=null;
    const sameStem=maps.stem.get(fileStem(entry.path))||[];
    if(sameStem.length===1)image=sameStem[0];
    if(!image){
      const ref=metadataImageRef(value);
      if(ref){
        const byRef=maps.base.get(lowerBase(ref))||[];
        if(byRef.length===1)image=byRef[0];
      }
    }
    if(!image){unmatched.push(entry);continue}
    if(usedImages.has(image.path)){duplicates.push(entry);continue}
    usedImages.add(image.path);
    pairs.push({stem:fileStem(entry.path),metadataEntry:entry,metadata:value,imageEntry:image});
  }

  const metadataFolderPresent=probable.some(entry=>/(^|\/)metadata(\/|$)/i.test(normalizePath(entry.path)));
  if(metadataFolderPresent&&(invalid.length||unmatched.length||duplicates.length)){
    const pieces=[];
    if(invalid.length)pieces.push(`${invalid.length} invalid JSON file${invalid.length===1?'':'s'}${sampleNames(invalid)?`: ${sampleNames(invalid)}`:''}`);
    if(unmatched.length)pieces.push(`${unmatched.length} metadata file${unmatched.length===1?'':'s'} without matching artwork${sampleNames(unmatched)?`: ${sampleNames(unmatched)}`:''}`);
    if(duplicates.length)pieces.push(`${duplicates.length} duplicate metadata match${duplicates.length===1?'':'es'}${sampleNames(duplicates)?`: ${sampleNames(duplicates)}`:''}`);
    throw new Error(`Creator metadata validation failed: ${pieces.join('; ')}. One Home did not replace or guess any metadata.`);
  }
  if(!pairs.length){
    if(metadataFolderPresent)throw new Error('Creator metadata JSON files were found, but none could be matched one-to-one with artwork. One Home did not guess the pairing.');
    return {active:false,pairs:[],records:[],count:0};
  }

  pairs.sort(pairSort);
  const supply=Math.max(0,Number(expectedSupply)||0);
  if(supply&&pairs.length!==supply){
    throw new Error(`Creator metadata/artwork pairing found ${pairs.length} complete NFT pair${pairs.length===1?'':'s'}, but the collection supply is ${supply}. One Home stopped before mint setup so no NFT metadata could be mispaired.`);
  }

  const records=pairs.map((pair,index)=>({
    inventory_number:index+1,
    source_stem:pair.stem,
    metadata_source_name:basename(pair.metadataEntry.path),
    metadata_source_path:normalizePath(pair.metadataEntry.path),
    artwork_source_name:basename(pair.imageEntry.path),
    artwork_source_path:normalizePath(pair.imageEntry.path),
    metadata:pair.metadata,
  }));
  return {active:true,pairs,records,count:pairs.length};
}
async function uploadPrivate(sb,bucket,path,body,contentType,relayUpload){
  const blob=body instanceof Blob?body:new Blob([body],{type:contentType||'application/octet-stream'});
  const type=contentType||blob.type||'application/octet-stream';
  if(typeof relayUpload==='function'){
    await relayUpload(blob,path,type);
    return;
  }
  const result=await sb.storage.from(bucket).upload(path,blob,{upsert:true,contentType:type,cacheControl:'0'});
  if(result.error)throw result.error;
}
async function verifyWorkerAsset(){
  const response=await fetch(WORKER_URL,{method:'GET',cache:'no-store'}).catch(error=>{throw new Error(`One Home could not load its 7Z worker (${String(error?.message||error||'network failure')}).`)});
  if(!response.ok)throw new Error(`One Home 7Z worker is missing from this deployment (HTTP ${response.status}).`);
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(type&&!type.includes('javascript')&&!type.includes('ecmascript')&&!type.includes('text/plain'))throw new Error(`One Home 7Z worker was served with the wrong file type (${type}).`);
  try{await response.body?.cancel()}catch(_error){}
}
function extractRemoteToOpfs(sourceUrl,expectedSize,destPath,onProgress){
  return new Promise(async(resolve,reject)=>{
    let worker=null;
    try{
      if(!sourceUrl)throw new Error('The staged 7Z package signed read URL is unavailable.');
      if(!Number.isFinite(expectedSize)||expectedSize<=0)throw new Error('The staged 7Z package size is unavailable.');
      await verifyWorkerAsset();
      worker=new Worker(WORKER_URL);
      const id=crypto.randomUUID();
      worker.onmessage=event=>{
        const msg=event.data||{};if(msg.id&&msg.id!==id)return;
        if(msg.type==='progress'){onProgress?.(msg);return;}
        if(msg.type==='done'){worker.terminate();resolve();return;}
        if(msg.type==='error'){worker.terminate();reject(new Error(msg.message||'The browser 7Z decoder could not extract this package.'));}
      };
      worker.onerror=event=>{const message=event?.message||'The browser 7Z decoder could not start.';try{worker.terminate()}catch(_error){}reject(new Error(message));};
      worker.postMessage({type:'extract-remote',id,sourceUrl,expectedSize,destPath});
    }catch(error){try{worker?.terminate()}catch(_error){}reject(error);}
  });
}

export function supported(){
  return typeof Worker==='function'&&!!navigator.storage&&typeof navigator.storage.getDirectory==='function'&&typeof WebAssembly==='object';
}

export async function process7zMintPackage({file,sourceUrl,expectedSize,sb,bucket='mint-imports',userId,jobId,relayUpload,uploadConcurrency=4,beforeMaterialize,onProgress}){
  if(!supported())throw new Error('This browser cannot use One Home large 7Z processing. Update Chromium/Chrome and try again.');
  if(!file||!Number(file.size))throw new Error('The selected 7Z package is empty.');
  if(!sourceUrl)throw new Error('The staged 7Z package signed read URL is unavailable. Try the import again.');
  const sourceSize=Number(expectedSize||file.size||0);if(!Number.isFinite(sourceSize)||sourceSize<=0)throw new Error('The staged 7Z package size is invalid.');
  try{await navigator.storage.persist?.()}catch(_error){}
  const estimate=await navigator.storage.estimate().catch(()=>({}));
  const available=Math.max(0,Number(estimate.quota||0)-Number(estimate.usage||0));
  if(available&&available<sourceSize*1.25)console.warn('One Home OPFS free-space estimate is tight',{available,fileSize:sourceSize});

  const root=await navigator.storage.getDirectory();
  const destName=`onehome-mint-${jobId.replace(/[^a-zA-Z0-9_-]/g,'')}`;
  await removeOpfsTree(root,destName);
  onProgress?.({stage:'Opening staged 7Z package',percent:64,detail:'Preparing your Mint package.'});
  try{
    await extractRemoteToOpfs(sourceUrl,sourceSize,destName,info=>{
      const processed=Number(info.processedBytes||0),total=Number(info.totalBytes||sourceSize||0),ratio=total?Math.min(1,processed/total):0;
      if(info.phase==='connecting'){onProgress?.({stage:'Opening staged 7Z package',percent:64,detail:String(info.detail||'Opening the staged archive from private Storage.')});return;}
      if(info.phase==='download'){
        onProgress?.({stage:'Reading staged 7Z package',percent:64+(ratio*12),detail:`${(processed/1024/1024).toFixed(1)} MB of ${(total/1024/1024).toFixed(1)} MB`});
        return;
      }
      if(info.phase==='prepare'){onProgress?.({stage:'Preparing Mint package',percent:76.5,detail:'Preparing your Mint package.'});return;}
      onProgress?.({stage:'Extracting 7Z package',percent:77+(ratio*7),detail:info.currentFile?`Extracting ${basename(info.currentFile)}`:`Extracted ${(processed/1024/1024).toFixed(1)} MB`});
    });

    const dest=await root.getDirectoryHandle(destName);
    const entries=await walkOpfs(dest);
    if(!entries.length)throw new Error('The 7Z package extracted successfully but contained no files.');
    const imageEntries=entries.filter(entry=>isImagePath(entry.path)&&!entry.path.startsWith('__MACOSX/')&&!entry.path.split('/').some(part=>part.startsWith('.')));
    const likelyImages=imageEntries.filter(isLikelyTokenImage);
    onProgress?.({stage:'Reading Mint project',percent:84,detail:`Found ${imageEntries.length} supported image${imageEntries.length===1?'':'s'}. Checking creator metadata before restoring artwork.`});

    const parsed=[];
    for(const candidate of chooseCandidateEntries(entries)){
      const value=await readJsonEntry(candidate);if(value)parsed.push({path:candidate.path,value});
    }
    let draft=chooseArchiveDraft(parsed);
    const initialCollection=draft?.collection&&typeof draft.collection==='object'?draft.collection:draft;
    const expectedSupply=Number(initialCollection?.fields?.supply||initialCollection?.supply||0)||0;
    const tokenPlan=await buildTokenMetadataPlan(entries,imageEntries,expectedSupply);
    if(!draft)draft=inferredDraft(file.name,tokenPlan.active?tokenPlan.count:likelyImages.length||imageEntries.length);
    const collection=draft?.collection&&typeof draft.collection==='object'?draft.collection:draft;
    if(!collection||typeof collection!=='object')throw new Error('The package does not contain a recognizable One Home collection object.');

    if(tokenPlan.active){
      const fields=collection.fields&&typeof collection.fields==='object'?collection.fields:collection;
      const configuredSupply=Number(fields.supply||collection.supply||0)||0;
      if(configuredSupply&&configuredSupply!==tokenPlan.count)throw new Error(`Creator metadata/artwork pairing found ${tokenPlan.count} complete NFTs, but the collection supply is ${configuredSupply}.`);
      if(collection.fields&&typeof collection.fields==='object')collection.fields.supply=tokenPlan.count;
      else collection.supply=tokenPlan.count;
      collection.finalImages=tokenPlan.pairs.map((pair,index)=>({
        name:metadataName(pair.metadata,basename(pair.imageEntry.path)||`Artwork ${index+1}`),
        sourceName:basename(pair.imageEntry.path),
        metadataSourceName:basename(pair.metadataEntry.path),
        sourceStem:pair.stem,
        __entry:pair.imageEntry,
      }));
      collection.metadataItems=[];
      collection.mintMetadataItems=[];
    }

    const metadata=Array.isArray(collection.mintMetadataItems)&&collection.mintMetadataItems.length?collection.mintMetadataItems:Array.isArray(collection.metadataItems)?collection.metadataItems:[];
    let finalImages=Array.isArray(collection.finalImages)?collection.finalImages.slice():[];
    const maps=buildEntryMaps(imageEntries);
    if(!finalImages.length&&metadata.length)finalImages=metadata.map((meta,index)=>({name:text(meta?.name)||`Artwork ${index+1}`,sourceName:text(meta?.file||meta?.filename||meta?.image||meta?.image_url||meta?.imageUrl),__refs:[meta?.image,meta?.image_url,meta?.imageUrl,meta?.file,meta?.filename]}));
    if(!finalImages.length){
      const supply=Number(collection.fields?.supply||collection.supply||0)||0;
      const candidates=likelyImages.length&&(!supply||likelyImages.length===supply)?likelyImages:imageEntries.filter(isLikelyTokenImage);
      finalImages=candidates.slice().sort((a,b)=>naturalCompare(a.path,b.path)).map((entry,index)=>({name:basename(entry.path)||`Artwork ${index+1}`,sourceName:basename(entry.path),__entry:entry}));
    }
    if(!finalImages.length)throw new Error('No artwork images were found in this Mint package.');
    if(finalImages.length>=1000&&!tokenPlan.active){
      throw new Error(`One Home found ${finalImages.length} artwork files in this large creator package but no token-specific creator JSON metadata. One Home will not generate replacement metadata or allow approval. Confirm the original 7Z contains one JSON file for each NFT.`);
    }

    // For an accepted delegated handoff, do not clear any previously derived files
    // until the entire immutable source archive has been downloaded, extracted, and
    // its artwork/creator-JSON pairing has passed validation. This leaves the source
    // untouched and avoids destroying the previous derived state on a download error.
    if(typeof beforeMaterialize==='function'){
      onProgress?.({stage:'Preparing clean creator package',percent:85.5,detail:'Source archive verified. Clearing only old derived artwork + metadata before saving the validated replacement.'});
      await beforeMaterialize({artworkCount:finalImages.length,metadataCount:tokenPlan.active?tokenPlan.count:0,pairedCount:tokenPlan.active?tokenPlan.count:0});
    }

    let metadataBundlePath='';
    const stagedPaths=[];
    if(tokenPlan.active){
      metadataBundlePath=`${userId}/${jobId}/metadata/imported-metadata.json`;
      const metadataBundle=new Blob([JSON.stringify({version:1,source:'creator-package',pairing_mode:'source-filename-identity',count:tokenPlan.count,items:tokenPlan.records})],{type:'application/json'});
      onProgress?.({stage:'Saving creator metadata',percent:86,detail:`Validated ${tokenPlan.count} artwork + metadata pair${tokenPlan.count===1?'':'s'}. Saving the creator metadata as one protected bundle.`});
      await uploadPrivate(sb,bucket,metadataBundlePath,metadataBundle,'application/json',relayUpload);
      stagedPaths.push(metadataBundlePath);
      collection.importedMetadata={count:tokenPlan.count,paired_count:tokenPlan.count,bundle_storage_bucket:bucket,bundle_storage_path:metadataBundlePath,pairing_mode:'source-filename-identity'};
    }

    const fallbackEntries=likelyImages.length===finalImages.length?likelyImages:(imageEntries.length===finalImages.length?imageEntries:[]);
    let stagedArtworkCount=0;
    const uploadWorkers=Math.min(12,Math.max(1,Math.round(Number(uploadConcurrency)||4)));
    const output=await mapWithConcurrency(finalImages,uploadWorkers,async(image,index)=>{
      image=image||{};const meta=metadata[index]||{};let blob=null,sourceName=text(image.sourceName||image.name)||`artwork-${index+1}.png`,mime='';
      if(/^data:/i.test(text(image.data))){blob=dataUrlBlob(image.data);mime=blob?.type||'';}
      if(!blob){
        const entry=image.__entry||matchImage(maps,[image.archivePath,image.path,image.file,image.filename,image.sourceName,image.name,image.url,...(image.__refs||[]),meta.image,meta.image_url,meta.imageUrl,meta.file,meta.filename])||fallbackEntries[index]||null;
        if(entry){blob=await entry.handle.getFile();mime=blob.type||imageMime(entry.path);sourceName=text(image.sourceName)||basename(entry.path)||sourceName;}
      }
      if(!blob)throw new Error(`Artwork ${index+1} could not be matched to an image inside this package.`);
      const padded=String(index+1).padStart(Math.max(3,String(finalImages.length).length),'0'),targetPath=`${userId}/${jobId}/artwork/${padded}-${safeName(sourceName,`artwork-${padded}.png`)}`;
      await uploadPrivate(sb,bucket,targetPath,blob,mime||imageMime(sourceName),relayUpload);stagedPaths.push(targetPath);
      const clean={...image};delete clean.data;delete clean.url;delete clean.__refs;delete clean.__entry;clean.name=text(image.name)||sourceName;clean.sourceName=sourceName;clean.storage_bucket=bucket;clean.storage_path=targetPath;clean.media_type=mime||imageMime(sourceName);clean.file_size=blob.size;
      stagedArtworkCount+=1;if(stagedArtworkCount===finalImages.length||stagedArtworkCount%10===0){const percent=87+Math.round((stagedArtworkCount/finalImages.length)*10);onProgress?.({stage:'Saving artwork to One Home',percent:Math.min(97,percent),detail:`${stagedArtworkCount} of ${finalImages.length} artwork images saved`});}
      return clean;
    });
    collection.finalImages=output;

    let cover=collection.cover&&typeof collection.cover==='object'?{...collection.cover}:null,coverBlob=null,coverName=text(cover?.name)||'mint-cover.png',coverMime='';
    if(/^data:/i.test(text(cover?.data))){coverBlob=dataUrlBlob(cover.data);coverMime=coverBlob?.type||'';}
    if(!coverBlob){
      const explicit=cover?matchImage(maps,[cover.archivePath,cover.path,cover.file,cover.filename,cover.name,cover.url]):null;
      const detected=explicit||imageEntries.find(entry=>/(^|\/)(cover|mint-cover)[^/]*\.(png|jpe?g|webp|gif|svg|avif)$/i.test(entry.path));
      if(detected){coverBlob=await detected.handle.getFile();coverMime=coverBlob.type||imageMime(detected.path);coverName=basename(detected.path)||coverName;}
    }
    if(coverBlob){
      const coverPath=`${userId}/${jobId}/cover/${safeName(coverName,'mint-cover.png')}`;
      await uploadPrivate(sb,bucket,coverPath,coverBlob,coverMime||imageMime(coverName),relayUpload);stagedPaths.push(coverPath);
      cover={...(cover||{}),name:coverName,storage_bucket:bucket,storage_path:coverPath,media_type:coverMime||imageMime(coverName),file_size:coverBlob.size};delete cover.data;delete cover.url;collection.cover=cover;
    }

    const manifestPath=`${userId}/${jobId}/manifest/mint-draft.json`;
    const manifest={...draft,__onehome_import:{version:'14.67.141',job_id:jobId,bucket,source_path:null,manifest_path:manifestPath,staged_paths:stagedPaths,metadata_bundle_path:metadataBundlePath||null,metadata_count:tokenPlan.active?tokenPlan.count:0,artwork_count:output.length,paired_count:tokenPlan.active?tokenPlan.count:0,pairing_mode:tokenPlan.active?'source-filename-identity':null,original_file_name:file.name,original_file_size:sourceSize,processed_at:new Date().toISOString(),processing_mode:'browser-full-stream-workerfs-opfs-7z'}};
    const manifestBlob=new Blob([JSON.stringify(manifest)],{type:'application/json'});
    await uploadPrivate(sb,bucket,manifestPath,manifestBlob,'application/json',relayUpload);
    const detail=tokenPlan.active?`${output.length} artwork + ${tokenPlan.count} creator metadata file${tokenPlan.count===1?'':'s'} matched and ready to mint.`:`${output.length} artwork image${output.length===1?'':'s'} restored and ready to mint.`;
    onProgress?.({stage:'Complete',percent:100,detail});
    return {manifest,manifestPath,stagedPaths,artworkCount:output.length,metadataCount:tokenPlan.active?tokenPlan.count:0,pairedCount:tokenPlan.active?tokenPlan.count:0};
  }finally{
    await removeOpfsTree(root,destName);
  }
}

/* Pure helper exposed for build validation only; it has no browser side effects. */
export const __oneHomeImportTest={fileStem,naturalCompare,isProjectJsonPath,metadataImageRef,pairSort,buildTokenMetadataPlan};
