import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
// OH-276: authorized Fuji EVM configuration and cache references; XRPL signing stays frozen separately.
const expected={
  'apps/one-home/campaign-mint.html':'171fe901e02aaf5d5f4bfce8b09965ccf397b654a629a444cdf8bfcf27a6d206',
  'apps/one-home/passport/campaign-mint-page.js':'3421c19678e3eae061fe666efc313efc31fbb86508f0ffcd835f88531f6e7ffc',
  // OH-266 intentionally extends only the directory shell; the frozen native mint/signing runtime remains protected below.
  'apps/one-home/open-mints.html':'4a293fcaeb90e399a900e371fb3146a32dc8e6c9ba36cd9d7927bcf2872a0a4b',
  'apps/one-home/open-mints-v1467218.js':'837d240781bc682577568da772f506e3a7d8d9964d234f397b952f84917ac172',
  // OH-274 authorizes only Creator presentation/transition + canonical Passport trait verification in this shared runtime.
  'apps/one-home/shared/onehome-creator-projects.js':'d5286a86fa9401fbcd67a3ac2bc7bcf8aaee5eb2e0d7813aaa582bb94c07b23b',
  'apps/one-home/creator-mint-admin.html':'0efa76d3a61d5cb6732fd9c47544c91556cf349038685f06062bbbee865abc4a',
  'apps/one-home/nft-updates.html':'c95a64f2e5c7488dceb71f9349728b972042c55622e5c494761bf75d12df8de4'
};
const errors=[];
for(const [path,hash] of Object.entries(expected)){
  try{const bytes=await readFile(resolve(root,path));const actual=createHash('sha256').update(bytes).digest('hex');if(actual!==hash)errors.push(path+' changed from the reviewed protected release baseline');}
  catch(error){errors.push(path+': '+error.message)}
}
if(errors.length){console.error('V235 PROTECTED MINT FILE CHECK FAILED');for(const e of errors)console.error(' - '+e);process.exit(1)}
console.log('Protected release files passed: reviewed OH-276 Fuji EVM configuration/cache changes match; redemption admin, NFT Updates, and shared Creator runtime retain their previous hashes.');
