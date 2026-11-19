// Read-only fingerprint verification and an exclusive independent admission receipt.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const packet=path.resolve(__dirname,'..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(packet,file))).digest('hex');
const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'RUNTIME-RECIPE-ADMISSION.json')));
for(const row of prior.files){const file=row.path==='run-runtime.cjs'?'runtime-versions/run-runtime-before-provider-proof.cjs':row.path;assert.equal(sha(file),row.sha256,file+' drifted');}
const files=[
  {path:'run-runtime.cjs',sha256:'897868db3191e8f9ec63ff8d52ad6272fcfc6f0f51e8da6a40d7010dba761d8e'},
  {path:'database/provider-authority-proof.cjs',sha256:'2e7828c59f17123fdfc8b3ef80b284a5fe023181147371b9e5559ef1ad652d49'},
  {path:'browser/run-auth-transport-v2.cjs',sha256:'a70e1d5df2fcb24593c250e80a2c0d26a9e77b9840253d7500dfc1f90dfcc255'}
];
for(const row of files)assert.equal(sha(row.path),row.sha256,row.path+' changed after review');
const supplementary=JSON.parse(fs.readFileSync(path.join(__dirname,'SUCCESSOR-SOURCE-REVIEW.json')));assert.equal(supplementary.passed,true);assert.equal(supplementary.candidateId,prior.candidateId);
const result={at:new Date().toISOString(),reviewer:'/root/v02_review',verdict:'admitted_successor_recipes_only',candidateId:prior.candidateId,priorReceipt:'RUNTIME-RECIPE-ADMISSION.json',unchangedPriorInputsVerified:true,files,
  changes:['Select the versioned116-group auth successor; original91-group harness and admission remain immutable.','Add current-profile strict ownership/authority-field negatives and four core-provider foreign-Origin negatives.','Qualify active/revoked/expired HEAD as installed-router unsupported404 with no body/auth headers/state changes, separately from GET authorization.','Prepare eight private inventory forward-history entries before authority transition; record new response bytes and restored DOM separately.','Capture read-only current native provider actor, active/nondeleted organization, tenant-scoped nonreserved roles, permissions and active module grants immediately before protocol.'],
  safety:'No product changes or new external calls. All prior exact-target, real-session, cache-lifetime, state-effect, private-original protection and cleanup controls remain applicable.',
  preconditions:prior.preconditions,
  evidenceLimits:['Admission is not a runtime pass. All116 auth groups,22 baseline groups and23 protocol groups must be reconciled with actual observations.','Unsupported HEAD is not proof that a GET guard ran.','Provider preconditions and reviewed source support the managed-only refusal classification; generic500 alone cannot establish the reached branch.','Absent completed native focus revalidation is incomplete evidence, not an invented push-revocation requirement.']};
fs.writeFileSync(path.join(__dirname,'RUNTIME-V2-ADMISSION.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({verdict:result.verdict,candidateId:result.candidateId,files:files.length}));
