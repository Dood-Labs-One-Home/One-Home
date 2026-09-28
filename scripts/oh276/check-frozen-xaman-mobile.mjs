import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const contract=JSON.parse(await readFile(resolve(here,'frozen-xaman-mobile-contract.json'),'utf8'));
const source=await readFile(resolve(root,contract.source_file),'utf8');
const sha256=value=>createHash('sha256').update(value).digest('hex');

function extractFunction(name){
  const marker=`function ${name}(`;
  const start=source.indexOf(marker);
  if(start<0) throw new Error(`Frozen Xaman function missing: ${name}`);
  const brace=source.indexOf('{',start);
  if(brace<0) throw new Error(`Frozen Xaman function body missing: ${name}`);
  let depth=0, quote='', escaped=false, lineComment=false, blockComment=false;
  for(let i=brace;i<source.length;i++){
    const c=source[i], n=source[i+1]||'';
    if(lineComment){ if(c==='\n') lineComment=false; continue; }
    if(blockComment){ if(c==='*'&&n==='/'){ blockComment=false; i++; } continue; }
    if(quote){
      if(escaped){escaped=false;continue;}
      if(c==='\\'){escaped=true;continue;}
      if(c===quote){quote='';continue;}
      continue;
    }
    if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{') depth++;
    if(c==='}'){
      depth--;
      if(depth===0) return source.slice(start,i+1);
    }
  }
  throw new Error(`Frozen Xaman function is unterminated: ${name}`);
}

function extractPublicMobileBranch(){
  const startMarker='}else if(mobileXamanMint && simplePublicXrplUi()){';
  const endMarker='}else if(mobileXamanMint){';
  const start=source.indexOf(startMarker);
  if(start<0) throw new Error('Frozen public mobile Xaman launch branch is missing');
  const end=source.indexOf(endMarker,start+startMarker.length);
  if(end<0) throw new Error('Frozen public mobile Xaman launch branch boundary is missing');
  return source.slice(start,end);
}

const actual={
  finishWalletConnection:sha256(extractFunction('finishWalletConnection')),
  connectXamanMintWallet:sha256(extractFunction('connectXamanMintWallet')),
  showMintXamanLaunch:sha256(extractFunction('showMintXamanLaunch')),
  publicMobileXamanLaunchBranch:sha256(extractPublicMobileBranch()),
};

let failed=false;
for(const [name,expected] of Object.entries(contract.sections||{})){
  if(actual[name]!==expected){
    failed=true;
    console.error(`FROZEN XAMAN CONTRACT VIOLATION: ${name}`);
    console.error(`  expected ${expected}`);
    console.error(`  actual   ${actual[name]||'missing'}`);
  }
}
if(failed){
  console.error('The proven v14.67.219 Safari/Xaman mobile working model was changed. Restore the frozen behavior. Only Ink can explicitly authorize changing this contract.');
  process.exit(1);
}
console.log('Frozen Safari/Xaman mobile contract passed: v14.67.219 working model preserved.');
