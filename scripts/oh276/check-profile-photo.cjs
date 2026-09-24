const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');const contract=JSON.parse(fs.readFileSync(path.join(__dirname,'profile-photo-contract.json')));
const wizard=fs.readFileSync(path.join(root,'apps/one-home/passport/profile-wizard.js'));
if(crypto.createHash('sha256').update(wizard).digest('hex')!==contract.wizard_sha256)throw Error('Protected Passport photo wizard changed. Review the change and rerun behavior/browser tests before updating its contract.');
const html=fs.readFileSync(path.join(root,'apps/one-home/index.html'),'utf8');
for(const token of ['id="oneHomeProfileWizardAvatarFile"','id="oneHomeProfileWizardAvatarPreview"','id="oneHomeProfileWizardSaveBtn"','/passport/profile-wizard.js?v=1467256',"window.addEventListener('onehome:profile-saved'",'requestSaveVersion!==profileSaveVersion'])if(!html.includes(token))throw Error('Protected photo integration missing: '+token);
for(const script of ['test-profile-photo.cjs','test-profile-cache.cjs'])cp.execFileSync(process.execPath,[path.join(__dirname,script)],{stdio:'inherit',env:{...process.env,TEST_FILTER:'',PROFILE_WIZARD_SOURCE:''}});
console.log('Protected profile-photo contract passed.');
