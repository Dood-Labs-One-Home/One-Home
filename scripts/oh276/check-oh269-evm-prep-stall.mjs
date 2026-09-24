import fs from 'node:fs';

const file='apps/one-home/mint-studio.html';
const src=fs.readFileSync(file,'utf8');
const errors=[];
const requireText=(text,label)=>{if(!src.includes(text))errors.push(label)};

requireText('async function mintPreparationOperation(operation,label,timeoutMs=18000,attempts=3)','bounded mint preparation helper missing');
requireText("error.code='ONEHOME_PREP_TIMEOUT'",'mint preparation timeout code missing');
requireText('No contract transaction was submitted. It is safe to retry.','safe retry guardrail missing');
requireText('Finalizing ${laneLabel} metadata…','EVM/Stellar marker finalization progress missing');
requireText('()=>uploadPublic(markerPath,markerBlob)', 'metadata marker upload is not wrapped');
requireText("()=>sb.from('nft_collection_files').upsert(row",'metadata verification upsert is not wrapped');
requireText('`${laneLabel} metadata ready.`','metadata ready progress missing');
requireText("showMessage('sepoliaDeployStatus','Open MetaMask and confirm the '+name+' contract deployment.')",'MetaMask confirmation boundary changed');
requireText("method:'eth_sendTransaction'",'EVM deploy transaction call missing');

const prepStart=src.indexOf('async function prepareEvmCreatorCollection()');
const prepEnd=src.indexOf('function restoredMintType',prepStart);
const deployStart=src.indexOf('async function deployEvmContract()');
const txIndex=src.indexOf("method:'eth_sendTransaction'",deployStart);
const saveCollectionIndex=src.indexOf('const collectionId=await saveCreatorCollectionToSupabase();',prepStart);
const prepareDeploymentIndex=src.indexOf("callEvmCreator('prepare_deployment'",prepStart);
if(!(prepStart>=0&&prepEnd>prepStart&&deployStart>prepEnd&&txIndex>deployStart))errors.push('EVM prepare/deploy ordering is malformed');
if(!(saveCollectionIndex>prepStart&&prepareDeploymentIndex>saveCollectionIndex&&prepareDeploymentIndex<prepEnd))errors.push('collection metadata preparation must still complete before the EVM deployment record is prepared');

if(errors.length){
 console.error('OH-269 EVM PREPARATION STALL CHECK FAILED');
 for(const error of errors)console.error('- '+error);
 process.exit(1);
}
console.log('PASS: OH-269 bounds metadata finalization and preserves the pre-transaction EVM deployment boundary.');
