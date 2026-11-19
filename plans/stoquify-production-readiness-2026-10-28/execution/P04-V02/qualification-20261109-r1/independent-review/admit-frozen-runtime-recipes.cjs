// Independent fingerprints only; permits separately scoped verification, not current-checkout certification.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const packet=path.resolve(__dirname,'..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(packet,file))).digest('hex'),read=file=>JSON.parse(fs.readFileSync(path.join(packet,file)));
const prior=read('independent-review/RUNTIME-V3-ADMISSION.json'),scope=read('independent-review/FROZEN-SCOPE-ADMISSION.json');assert.equal(scope.verdict,'admit_frozen_artifact_qualification_only');assert.equal(scope.wholeCurrentCheckoutQualified,false);
for(const row of prior.files){const file=row.path==='run-runtime.cjs'?'runtime-versions/run-runtime-before-frozen-scope.cjs':row.path;assert.equal(sha(file),row.sha256,file+' drifted');}
const files=[
 {path:'frozen-scope-integrity.cjs',sha256:'2030587dca3828894d34ab69a2f4d32e1666c4468239d2cb6a7e4488a8f4e505'},
 {path:'browser/admit-source-frozen.cjs',sha256:'934427af536d02dde57512afd7a3a3fee1dfb1ae28eccef1b11dbeb28da67b78'},
 {path:'final-integrity-frozen.cjs',sha256:'772b5f1a76040dfa1138c0cf78dc22770bde74d6c95e9b63e91838d4759c684b'},
 {path:'run-runtime.cjs',sha256:'4700f4b259d9bd8fc9fbca5bdb79f02e2f4c5181187acf801d0e36ed723aa2a6'}
];for(const row of files)assert.equal(sha(row.path),row.sha256,row.path+' changed after review');
const report={at:new Date().toISOString(),reviewer:'/root/v02_review',verdict:'admitted_frozen_scope_successor_recipes',candidateId:scope.candidateId,artifactSha256:scope.artifactSha256,files,wholeCurrentCheckoutQualified:false,originalWholeCheckoutGateRemainsFailed:true,
 reviewedControls:['Frozen source and sealed artifact verified unchanged.','Exactly98 current critical path/hash pairs must equal the independent drift scan, and the reviewed Playwright driver is rehashed.','Every current production-input delta must equal the four independently reviewed accounting changes. Only the three named concurrent close documentation areas and tests are separately classified; unrelated control files are not silently exempted.','Original source-admission failure remains intact; source-admission-frozen.json and final-integrity-frozen.json are separate exclusive receipts.','Runtime explicitly requires frozen_artifact_only scope and currentCheckoutQualified:false and reports that limitation.','All prior real-session, browser-cache, provider, privacy, native-effect and owned cleanup controls remain unchanged.'],
 conditions:scope.conditions,qualificationOutcome:'pending_actual_execution'};
fs.writeFileSync(path.join(__dirname,'FROZEN-RUNTIME-RECIPE-ADMISSION.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({verdict:report.verdict,candidateId:report.candidateId,files:files.length,currentCheckoutQualified:false}));
