const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..'),read=file=>JSON.parse(fs.readFileSync(path.join(root,file))),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const priorFile='evidence/cash-payment-reconciliation-proof-review-2026-09-30.json',prior=read(priorFile);
const baselineFile='lanes/environment/close-proof-baseline-7b700f0a-fb10-4645-81a8-953101dc0ad4.json',baseline=read(baselineFile);
const runtimeFile='lanes/environment/close-proof-corrected-8488c6c5-37d5-4448-9050-b6f5272e2251.json',runtime=read(runtimeFile);
const checksFile='evidence/close-proof-checks-6bf1546e-b13a-42ee-a05b-8d40581ab6aa.json',checks=read(checksFile);
const browserFile='lanes/environment/cash-close-proof-3f285fd6-8ce8-4e80-a249-0e4976de304b.json',browser=read(browserFile);
const freshnessFile='lanes/environment/close-inventory-freshness-a77cf5b7-7e26-4591-8d82-e002296f20ac.json',freshness=read(freshnessFile);
for(const value of [baseline,runtime,checks,browser,freshness])assert.ok(value.passed&&value.sourceStable);
assert.equal(baseline.reproduced.length,3);assert.equal(runtime.checks.length,5);assert.ok(runtime.checks.every(row=>row.actual===row.expected&&row.readPreservedBusinessRecords));assert.ok(runtime.deniedExportHadNoBusinessEffects);assert.equal(runtime.draft.isCertified,false);assert.equal(runtime.review.status,'CHANGES_REQUESTED');
assert.equal(checks.steps.length,3);assert.ok(checks.steps.every(row=>row.status===0&&!row.error));assert.ok(checks.steps[0].stderr.includes('91 passed'));
assert.equal(browser.cases.length,4);assert.ok(browser.readsPreservedBusinessRecords);assert.ok(browser.cases.every(row=>row.actualResponse&&row.localizedBlockers&&row.keyboardContainmentAndReturn&&row.noHorizontalOverflow));assert.ok(freshness.observation.identicalReturnedBusinessEvidence&&freshness.observation.fixedCutoffReproducesFirstHash);
const sourceHashes={...prior.sourceHashes,...checks.sourceAfter,...runtime.sourceAfter,...browser.sourceAfter,...freshness.sourceAfter};for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const changed=['services/evidence/proof-trail.service.ts','services/evidence/evidence-grade.service.ts','components/evidence/proof-trail-presentation.ts','services/evidence/__tests__/proof-trail.service.test.ts'];
const priorImpact=changed.map(file=>{const before=baseline.sourceBefore[file]??prior.sourceHashes[file];assert.equal(before,prior.sourceHashes[file]);
 if(!baseline.sourceBefore[file]){const folder=path.dirname(path.join(repo,file)),prefix=path.basename(file)+'.retained-';assert.ok(fs.readdirSync(folder).some(name=>name.startsWith(prefix)&&hash(path.join(folder,name))===before),'retained original must substantiate '+file)}
 return{file,before,after:sourceHashes[file],priorReview:priorFile};});
const report='CASH_CLOSE_PROOF_2026-09-30.md',reviewFile='evidence/cash-close-proof-review-2026-09-30.json',remaining=[...prior.remaining];
remaining[0]='Payment/manual approval and signed-reconciliation proof lifecycles remain locally verified with synthetic prerequisites. Close proof now respects invalidation, unavailable controls and missing certified exports; actual assessment/review/draft/refusal and EN/FR desktop/mobile checks pass. Genuine certified-close remains open: unchanged inventory evidence produces a different freshness hash solely from a new observation cutoff (engineering defect), and current export also requires payroll pilot-cycle certification. Correct the freshness contract without hiding later/backdated writes; retain authentic payroll/statutory prerequisites. Prior payroll journal proof remains limited to synthetic calculated inputs.';
const artifacts=[report,'run-close-proof-checks.cjs','apply-close-proof.cjs','lanes/environment/verify-close-proof-lifecycle.cjs','lanes/environment/verify-close-proof-browser.cjs','lanes/environment/verify-close-inventory-freshness.cjs','lanes/environment/close-proof-source-before-7b700f0a-fb10-4645-81a8-953101dc0ad4.json',...browser.cases.map(row=>'lanes/environment/'+row.screenshot)];
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,verifiedSubcriteria:['close_proof_respects_recorded_invalidation_and_retains_historical_exports_without_current_certification','close_certified_status_requires_retained_export_and_unavailable_controls_are_covered','actual_close_assessment_review_draft_export_and_certification_denial_without_financial_effects','close_proof_en_fr_desktop_mobile_keyboard_and_private_metadata_preservation'],newEngineeringFinding:freshness.finding,receipts:[baselineFile,runtimeFile,checksFile,browserFile,freshnessFile].map(file=>({file,sha256:hash(path.join(root,file))})),artifacts:artifacts.map(file=>({file,sha256:hash(path.join(root,file))})),remaining};
const target=path.join(root,'reconcile-current-progress.cjs');let source=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n');assert.ok(!source.includes('const cashCloseProof ='));
const top=`const cashCloseProof = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...cashCloseProof.receipts, ...cashCloseProof.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash close proof evidence changed');
for (const [file, expected] of Object.entries(cashCloseProof.sourceHashes)) if (crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', file))).digest('hex') !== expected) throw new Error('Cash close proof source changed: ' + file);
for (const row of cashCloseProof.priorImpact) if (JSON.parse(fs.readFileSync(path.join(root, row.priorReview))).sourceHashes[row.file] !== row.before || cashCloseProof.sourceHashes[row.file] !== row.after) throw new Error('Cash close proof prior impact changed');
function cashCloseProofExpected(source, expected) {
  const row = cashCloseProof.priorImpact.find(row => row.file === source);
  if (!row) return expected;
  if (row.before !== expected) throw new Error('Cash close proof prior binding mismatch: ' + source);
  return row.after;
}
`;
source=source.replace('const root = __dirname;','const root = __dirname;\n'+top);
for(const name of ['cashPaymentProof','cashBatch']){const old=`for (const [file, expected] of Object.entries(${name}.sourceHashes)) if (crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', file))).digest('hex') !== expected)`;assert.ok(source.includes(old));source=source.replace(old,old.replace('!== expected)','!== cashCloseProofExpected(file, expected))'));}
const old=`function cashPaymentProofExpected(source, expected) {
  const row = cashPaymentProof.priorImpact.find(row => row.file === source);
  if (!row) return expected;
  if (row.before !== expected) throw new Error('Cash payment proof prior binding mismatch: ' + source);
  return row.after;
}`;assert.ok(source.includes(old));source=source.replace(old,old.replace('if (!row) return expected;','if (!row) return cashCloseProofExpected(source, expected);').replace('return row.after;','return cashCloseProofExpected(source, row.after);'));
source=source.replace('cashRead.remaining = cashPaymentProof.remaining;',`cashRead.remaining = cashCloseProof.remaining;
cashRead.closureReview.cashCloseProofBindingCurrent = true;
cashRead.closureReview.verifiedCriteria = [...new Set([...(cashRead.closureReview.verifiedCriteria ?? []), ...cashCloseProof.verifiedSubcriteria])];
for (const report of [cashCloseProof.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);`);
source=source.replace("cashRead.closureReview.note = 'Actual local payment matching/approval and signed-reconciliation proof lifecycles now pass, alongside prior payroll journal proof. Synthetic setup/authentication/calculation preconditions remain explicit. Certified-close, full upstream/provider/payroll/declaration and complete accessibility/latency remain open.';","cashRead.closureReview.note = 'Close invalidation/missing-export/unavailable-control proof corrected and actual assessment/review/draft/refusal verified. Genuine certification remains open: inventory freshness cutoff defect and payroll pilot prerequisites. Earlier payment/reconciliation/payroll proof evidence retains its synthetic-precondition limits. Complete accessibility and production latency remain open.';");
source=source.replace('Verify certified-close proof; finish accessibility/recovery and retain statutory dependency','Correct inventory freshness comparison; retain close/payroll certification prerequisites');
const start=source.indexOf('**Since the previous report:**'),end=source.indexOf('\n\n**Remaining priority:**',start);assert.ok(start>0&&end>start);
source=source.slice(0,start)+'**Since the previous report:** Corrected close proof that trusted missing exports, invalidated history and unavailable controls. Actual assessment/review/draft export and certification refusal pass; EN desktop/FR mobile verify both draft and invalidated proof. 91 tests, lint and TypeScript pass. Reproduced a new engineering blocker: unchanged inventory evidence hashes differ solely because the observation cutoff changes. [Evidence and remaining certification limits](CASH_CLOSE_PROOF_2026-09-30.md). No whole workflow closed. Next: fix freshness comparison without hiding later financial changes.'+source.slice(end);
fs.writeFileSync(path.join(root,reviewFile),JSON.stringify(review,null,2)+'\n',{flag:'wx'});fs.writeFileSync(target+'.retained-'+crypto.randomUUID(),fs.readFileSync(target),{flag:'wx'});const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source))}finally{fs.closeSync(fd)}console.log(JSON.stringify({reviewFile}));
