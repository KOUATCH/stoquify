// Read-only final browser-cache recipe fingerprints; writes one independent receipt.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const packet=path.resolve(__dirname,'..'),root=path.resolve(packet,'../../../../..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(packet,file))).digest('hex');
const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'RUNTIME-V2-ADMISSION.json')));
for(const row of prior.files){const file=row.path==='run-runtime.cjs'?'runtime-versions/run-runtime-before-auth-v3.cjs':row.path;assert.equal(sha(file),row.sha256,file+' drifted');}
assert.equal(sha('browser/versions/run-browser-before-bfcache.cjs'),'e3d185bb877bf8a509037450dd95bd2d54c775d9eb87dc7ba6574c275fa0c3f1');
const files=[
  {path:'run-runtime.cjs',sha256:'9009e8c9b73321c2aa0e45fa7d05d831cf02bf90586c3edf515257676ca8685b'},
  {path:'browser/run-browser.cjs',sha256:'b9d90992d712c45e289224da67b906f77b95c4b8607c9e42d280aad25cbdca9d'},
  {path:'browser/run-auth-transport-v3.cjs',sha256:'0e89ac37db95b2cb82be132c553664db550e895d04737c79d18136a219fc5574'}
];for(const row of files)assert.equal(sha(row.path),row.sha256,row.path+' changed after review');
const sourceFile=path.join(root,'node_modules/playwright-core/lib/coreBundle.js'),source=fs.readFileSync(sourceFile);assert(source.includes(Buffer.from('"--disable-back-forward-cache"')));
const result={at:new Date().toISOString(),reviewer:'/root/v02_review',verdict:'admitted_final_browser_cache_recipes_only',candidateId:prior.candidateId,priorReceipt:'RUNTIME-V2-ADMISSION.json',files,playwrightDriver:{path:'node_modules/playwright-core/lib/coreBundle.js',sha256:crypto.createHash('sha256').update(source).digest('hex')},
  changes:['Remove only Playwright default --disable-back-forward-cache from both Chromium launches; proxy, loopback resolver and private-original protection unchanged.','Passively observe native page lifecycle, persisted events and navigation/cache metadata; no application response or cache eligibility manipulation.','Select authv3 with unchanged116 planned groups and fixtures.','Keep event-start private DOM and historical document Response bytes observational; settled consumer rendering and actual new-request denial remain enforced.'],
  preconditions:prior.preconditions,
  interpretation:['History traversal does not itself prove a BFCache hit; require a relevant trusted persisted pageshow event.','No private BFCache hit means that specific recovery path is unqualified, not automatically defective.','Passive event-time DOM does not prove painted disclosure or create an instantaneous erasure requirement.','Historical Response bytes returned by Playwright are not newly delivered server bytes without independent request evidence.','Existing real signed-cookie lifetime, native state effects, authorized controls, artifact integrity and cleanup requirements remain unchanged.'],
  runtimeQualification:'pending'};
fs.writeFileSync(path.join(__dirname,'RUNTIME-V3-ADMISSION.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({verdict:result.verdict,candidateId:result.candidateId,files:files.length}));
