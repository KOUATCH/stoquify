const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file)));
const staticFile='evidence/proof-completeness-checks-d0f80961-b576-45ce-bf65-b764de05edf9.json',runtimeFile='lanes/environment/proof-completeness-corrected-84b05cfd-980d-4ab7-8783-6df941d1d0df.json',baselineFile='lanes/environment/proof-completeness-baseline-f7b89bb6-be5a-4e93-bc57-656f70f346fb.json';
const tests=read(staticFile),runtime=read(runtimeFile),baseline=read(baselineFile),prior=read('evidence/cash-source-copy-review-2026-09-30.json');
assert.ok(tests.passed&&tests.sourceStable&&tests.steps.length===3&&tests.steps.every(step=>step.status===0));assert.match(tests.steps[0].stderr,/Tests:\s+40 passed, 40 total/);
assert.ok(runtime.passed&&runtime.sourceStable&&runtime.crossTenantDenied&&runtime.resolvedPaymentClear);assert.equal(runtime.checks.length,4);assert.ok(runtime.checks.every(row=>row.grade==='blocked'&&row.noBusinessMutation));
assert.ok(baseline.passed&&baseline.checks.every(row=>row.grade!=='blocked'&&row.blockers.length===0));
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));assert.deepEqual(priorImpact.map(row=>row.file),['services/evidence/proof-trail.service.ts']);assert.equal(priorImpact[0].before,baseline.sourceAfter[priorImpact[0].file]);
const report='CASH_PROOF_COMPLETENESS_2026-09-30.md',reviewFile='evidence/cash-proof-completeness-review-2026-09-30.json';
const receiptFiles=[staticFile,runtimeFile,baselineFile,'evidence/proof-completeness-checks-39697116-f03c-40be-8348-6b41eb29ac2a.json','lanes/environment/proof-completeness-corrected-385148ba-08c5-4337-aad6-eb0244f0630b.json'];
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,
 verifiedSubcriteria:['proof_grading_checks_complete_tenant_subject_blockers_beyond_display_caps','proof_aggregate_failures_propagate_and_missing_subject_denies','proof_owned_database_hidden_blockers_and_unchanged_read_records'],
 receipts:receiptFiles.map(file=>({file,sha256:hash(path.join(__dirname,file))})),artifacts:[],remaining:prior.remaining,
 limits:['No new proof browser or localization evidence','Journal hidden-event and older certified-export cases unit-verified','Concurrent reads are not an atomic approval snapshot','Local duration measurements are not production budgets']};
let source=fs.readFileSync(path.join(__dirname,'reconcile-current-progress.cjs'),'utf8');
function replace(before,after){assert.ok(source.includes(before),before);source=source.replace(before,after);}
const old="const cashSourceCopyCurrent = Object.entries(cashSourceCopy.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);";
replace(old,`const cashProofCompleteness = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...cashProofCompleteness.receipts, ...cashProofCompleteness.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Proof completeness evidence changed');
for (const row of cashProofCompleteness.priorImpact) if (cashSourceCopy.sourceHashes[row.file] !== row.before || cashProofCompleteness.sourceHashes[row.file] !== row.after) throw new Error('Invalid proof completeness impact');
const cashProofCompletenessCurrent = Object.entries(cashProofCompleteness.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashProofCompletenessCurrent) throw new Error('Proof completeness dependency changed; review required');
const cashSourceCopyCurrent = cashProofCompletenessCurrent && Object.entries(cashSourceCopy.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === (cashProofCompleteness.priorImpact.find(row => row.file === source)?.after ?? expected));`);
const prefix='cashSourceCopy.priorImpact.find(row => row.file === source)?.after ??';assert.equal(source.split(prefix).length-1,13);source=source.split(prefix).join('cashProofCompleteness.priorImpact.find(row => row.file === source)?.after ?? '+prefix);
replace('...cashSourceCopy.verifiedSubcriteria]','...cashSourceCopy.verifiedSubcriteria, ...cashProofCompleteness.verifiedSubcriteria]');
replace('cashRead.remaining = cashSourceCopy.remaining;',`cashRead.remaining = cashProofCompleteness.remaining;
for (const report of [cashProofCompleteness.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.proofCompletenessBindingCurrent = cashProofCompletenessCurrent;
cashRead.implementationStatus = 'cash_source_presentation_and_complete_proof_blocker_grading_corrected';
cashRead.runtimeStatus = 'owned_cash_handoffs_and_hidden_proof_blockers_with_unchanged_read_records_verified';`);
const start=source.indexOf('**Since the previous report:**'),end=source.indexOf('\n\n**Remaining priority:**',start);assert.ok(start>0&&end>start);
source=source.slice(0,start)+'**Since the previous report:** Found and corrected proof grades that ignored blockers outside the first 10 or 20 displayed records. Actual isolated database cases now block reconciliation, payment and close proofs correctly, including older failed events. Read fingerprints remain unchanged, foreign-tenant access is denied and resolved synthetic payment issues clear. All 40 focused tests, lint and TypeScript pass. [Evidence and guidance](CASH_PROOF_COMPLETENESS_2026-09-30.md). A failed test fixture was corrected without relaxing source validation. No workflow added or closed; proof localization remains next.'+source.slice(end);
replace('Source admission; handoffs; currency; EN/FR read model','Source admission; handoffs; EN/FR; complete proof blocker counts');
// Write only after every expected edit has been validated.
fs.writeFileSync(path.join(__dirname,reviewFile),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'reconcile-current-progress.cjs'),source);
console.log(JSON.stringify({reviewFile,priorImpact}));
