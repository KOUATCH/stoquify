const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const packet=path.dirname(__dirname),root=path.resolve(__dirname,'../../../../../..');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const put=(name,value)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const common={at:new Date().toISOString(),reviewer:'/root/v02_review',passed:true,productChangesByReviewer:false};
const priorSource=read(path.join(__dirname,'REPAIR-SOURCE-ADMISSION.json'));
const source=priorSource.files.map(row=>({path:row.path,sha256:sha(path.join(root,row.path))}));
assert.equal(source.find(r=>r.path==='lib/auth.ts').sha256,'181e15aad556024353b1e988cce6ccb5eb9679dfc50620427b81aa059a8c7064');
const inventories=['inventory/source-after-repair-manifest-v3.json','inventory/source-after-manifest-v3.json'].map(name=>{
 const manifest=read(path.join(packet,name));for(const row of manifest.files)assert.equal(sha(path.join(root,row.path)),row.sha256,'Current source differs: '+row.path);
 return {path:name,sha256:sha(path.join(packet,name)),inputs:manifest.files.length};
});
put('REPAIR-SOURCE-ADMISSION-v2.json',{...common,scope:'Final corrected R06 source admitted for isolated qualification; supersedes first source admission only',files:source,inventories,previousAdmissionSha256:sha(path.join(__dirname,'REPAIR-SOURCE-ADMISSION.json')),reviewFindings:[
 'Raw installed getSession factory propagates store errors instead of helper catch-to-null. BetterCall endpoint.mjs confirms asResponse false throws API errors and returnHeaders true wraps even native null.',
 'Cloned context forces GET, asResponse false, returnHeaders true, returnStatus false, cache bypass and refresh suppression; existing cached context cannot supply authority.',
 'Header propagation follows installed SDK semantics: append set-cookie and set singleton headers; existing unrelated headers are preserved.',
 'Current user eligibility, public templates, default protected pathless operations, global cache disable and exact application APIError normalization remain within the previously reviewed bounded repair.',
 'Three added store-error tests and one native null/header regression supplement prior tests; source-derived transient error concern is not claimed as an observed runtime exploit.'
 ],limitations:priorSource.limitations});
const priorUnit=read(path.join(__dirname,'UNIT-RECIPE-ADMISSION.json'));
const unitFiles=['run-v2.cjs','jest.config.cjs','guard.cjs','preload.cjs'].map(name=>{
 const p=path.join(packet,'unit',name),result=cp.spawnSync(process.execPath,['--check',p],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0);
 return {path:path.relative(root,p).replaceAll('\\','/'),sha256:sha(p),syntaxExit:0};
});
assert.equal(unitFiles[0].sha256,'cda4c1e201ea55104e03f43a7d8a7d4eafe5d39427563092ea097aed5ef8a3f4');
for(const old of priorUnit.files.filter(r=>!r.path.endsWith('/run.cjs')))assert.equal(sha(path.join(root,old.path)),old.sha256);
put('UNIT-RECIPE-ADMISSION-v2.json',{...priorUnit,...common,scope:'Reviewed successor recipe uses exclusive attempt02; definitions reviewed after execution receipt was already present, no retroactive pre-execution timing claim',files:unitFiles,selectedInputs:source,change:'Only exclusive output directory and command label differ from prior run recipe. Isolation guards/config unchanged.',sideEffects:{...priorUnit.sideEffects,allowed:['unit/attempt02 logs and JSON','unit/cache if Jest writes its configured cache directory']}});
const unitReceipt=read(path.join(packet,'unit/attempt02/receipt.json')),jest=read(path.join(packet,'unit/attempt02/jest.json'));
assert.equal(unitReceipt.status,0);assert.equal(unitReceipt.signal,null);assert.equal(unitReceipt.error,null);assert.equal(jest.success,true);assert.equal(jest.numPassedTests,87);assert.equal(jest.numTotalTests,87);assert.equal(jest.numFailedTests,0);assert.equal(jest.numPendingTests,0);assert.equal(jest.numPassedTestSuites,4);
put('UNIT-OUTCOME-REVIEW-v2.json',{...common,evidenceClass:'mocked unit tests only',receiptSha256:sha(path.join(packet,'unit/attempt02/receipt.json')),jestSha256:sha(path.join(packet,'unit/attempt02/jest.json')),passedTests:87,totalTests:87,failedTests:0,pendingTests:0,passedSuites:4,sourceAdmissionSha256:sha(path.join(__dirname,'REPAIR-SOURCE-ADMISSION-v2.json')),actualNativeDatabaseOrBrowserProof:false,prior83TestOutcomePreserved:true});
const reconciliationPath=path.join(packet,'dependency-reconciliation.json'),deps=read(reconciliationPath),handoff=read(path.join(packet,'dependency-staging-interrupted.json'));
assert.equal(deps.passed,true);assert.equal(deps.classification,'independent_full_byte_equality_after_incomplete_serial_handoff');assert.equal(deps.serialChecksAssumedPassed,false);assert.equal(deps.physicalCopyExact,true);assert.equal(deps.archivedInputUnchanged,true);assert.equal(deps.generatedClientMustBeRegenerated,true);assert.equal(deps.dependencyManifest.files,152806);assert.equal(deps.dependencyManifest.bytes,2998378443);
assert.equal(handoff.serialIntegrityVerified,false);assert.equal(handoff.finalSchemaAssertionReached,false);assert.equal(deps.initialReceiptSha256,sha(path.join(packet,'dependency-staging-interrupted.json')));assert.equal(deps.schemaReviewSha256,sha(path.join(__dirname,'CONCURRENT-SCHEMA-REVIEW.json')));
assert.equal(sha(path.join(packet,'reconcile-dependencies-v3.cjs')),'3813558895c77e3cdca4d73467230afb805213c1699384fba43d0f8d7716929f');
assert.equal(sha(deps.dependencyManifest.path),deps.dependencyManifest.compressedSha256);for(const row of deps.currentBindings)assert.equal(sha(path.join(root,row.path)),row.sha256);
put('DEPENDENCY-RECONCILIATION-ADMISSION.json',{...common,receiptSha256:sha(reconciliationPath),scope:'Actual full byte equality after explicitly incomplete serial handoff',verifiedFileCount:deps.dependencyManifest.files,verifiedBytes:deps.dependencyManifest.bytes,physicalCopyExact:true,archivedInputUnchanged:true,serialChecksAssumedPassed:false,reviewMethod:'Frozen admitted verifier hashes both complete trees against preserved initial manifest; reviewed receipt and source/control bindings. No redundant third tree traversal.',generatedClientMustBeRegenerated:true,currentBindings:deps.currentBindings,limitations:['Installed copy reuse does not prove clean installation reproducibility.','New schema/private generated client and isolated build remain separate pending gates.']});
const oldPrep=read(path.join(__dirname,'PREPARATION-BUILD-RECIPE-ADMISSION.json')),manifestName='preparation-build-recipe-manifest-v3.json',prep=read(path.join(packet,manifestName));
for(const row of prep.files){assert.equal(sha(path.join(packet,row.path)),row.sha256);const old=oldPrep.files.find(r=>r.path===row.path);if(old)assert.equal(row.sha256,old.sha256);else assert(['prepare-candidate-v2.cjs','admit-preparation-v3.cjs'].includes(row.path));}
assert.equal(fs.readFileSync(path.join(packet,'prepare-candidate-v2.cjs'),'utf8'),fs.readFileSync(path.join(packet,'prepare-candidate.cjs'),'utf8').replaceAll('REPAIR-SOURCE-ADMISSION.json','REPAIR-SOURCE-ADMISSION-v2.json'));
assert.equal(fs.readFileSync(path.join(packet,'admit-preparation-v3.cjs'),'utf8'),fs.readFileSync(path.join(packet,'admit-preparation.cjs'),'utf8').replaceAll('REPAIR-SOURCE-ADMISSION.json','REPAIR-SOURCE-ADMISSION-v2.json').replaceAll('source-after-repair-manifest.json','source-after-repair-manifest-v3.json'));
for(const name of ['prepare-candidate-v2.cjs','admit-preparation-v3.cjs'])assert.equal(cp.spawnSync(process.execPath,['--check',path.join(packet,name)],{encoding:'utf8',windowsHide:true}).status,0);
put('PREPARATION-BUILD-RECIPE-ADMISSION-v2.json',{...oldPrep,...common,manifestSha256:sha(path.join(packet,manifestName)),files:prep.files,change:'Only final source admission and immutable v3 inventory filenames change; original recipes and prior admissions preserved.',conditions:[
 'Do not rerun original interrupted staging or old reconciliation recipes. Actual admitted v3 full reconciliation supersedes their pending integrity gate.',
 'Candidate capture requires receipt-bound dependency admission and final REPAIR-SOURCE-ADMISSION-v2.',
 ...oldPrep.conditions.slice(3)
 ],actualDependencyReconciliationSha256:sha(reconciliationPath),actualNewBuildOutcomeClaimed:false});
console.log(JSON.stringify({passed:true,sourceFiles:source.length,inventories,units:87,dependencyFiles:152806,admissionsWritten:5}));
