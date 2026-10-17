const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..');const read=file=>JSON.parse(fs.readFileSync(path.join(root,file)));const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const priorFile='evidence/cash-request-profile-review-2026-09-30.json',prior=read(priorFile),sourcePriorFile='evidence/cash-sources-review-2026-09-28.json',sourcePrior=read(sourcePriorFile);
const checksFile='evidence/cash-batch-checks-f4b96620-a543-4c50-8f10-de1b8a3843c1.json',checks=read(checksFile);
const beforeFile='lanes/environment/cash-authority-reads-42fb447e-e04b-42b9-a5f7-a76da64c55f7.json',afterFile='lanes/environment/cash-authority-reads-0af2a927-7973-49af-bff0-037112a63d97.json',before=read(beforeFile),after=read(afterFile);
const browserFile='lanes/environment/cash-batch-navigation-profile-4b052f4a-ea19-490b-b57b-f57bd4be16d7.json',browser=read(browserFile),restorationFile='lanes/environment/cash-batch-profiler-restored-2026-09-30.json',restoration=read(restorationFile);
for(const value of [checks,before,after,browser])assert.ok(value.passed&&value.sourceStable);
assert.equal(checks.steps.length,3);assert.ok(checks.steps.every(row=>row.status===0&&!row.error));assert.ok(checks.steps[0].stderr.includes('114 passed'));
assert.equal(before.samples.length,3);assert.equal(after.samples.length,3);
for(let i=0;i<3;i++){
 const b=before.samples[i],a=after.samples[i];assert.equal(a.resultHash,b.resultHash);const expected={...b.counts};expected['Organization.findFirst']-=5;expected['TenantModuleConfiguration.findUnique']-=5;expected['TenantModuleGrant.findMany']-=5;assert.deepEqual(a.counts,expected);
}
assert.equal(browser.samples.length,4);assert.ok(browser.samples.every(row=>row.errors.length===0&&row.spans.length===4));assert.ok(restoration.restored);
for(const row of restoration.rows){assert.equal(row.before,row.after);assert.equal(hash(path.join(repo,row.file)),row.after);assert.equal(browser.sourceAfter[row.file],row.during);assert.equal(prior.sourceHashes[row.file],row.before);}
const sourceHashes={...prior.sourceHashes,...checks.sourceAfter};
for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
for(const [file,expected]of Object.entries(after.sourceAfter))assert.equal(sourceHashes[file],expected,file);
const impactFiles=['services/cash-command/cash-command-sources.service.ts','services/cash-command/__tests__/cash-command.service.test.ts','services/cash-command/__tests__/cash-command-sources.service.test.ts'];
const priorImpact=impactFiles.map(file=>({file,before:prior.sourceHashes[file]??sourcePrior.sourceHashes[file],after:sourceHashes[file],priorReview:prior.sourceHashes[file]?priorFile:sourcePriorFile}));assert.ok(priorImpact.every(row=>row.before&&row.after&&row.before!==row.after));
assert.equal(before.sourceBefore[impactFiles[0]],priorImpact[0].before);
const report='CASH_AUTHORITY_BATCH_2026-09-30.md',reviewFile='evidence/cash-authority-batch-review-2026-09-30.json',remaining=[...prior.remaining];
remaining[3]='Cash source admission now removes 15 repeated authority model reads per all-permitted load with identical owned-fixture results, per-module decision/audit equivalence and actual EN/FR route verification. Development Cash spans remain variable (1.74–5.39s), so no end-to-end speedup or performance closure is claimed. Representative production/cache-enabled latency and remaining accessibility/hydration checks stay open.';
const artifacts=[report,'run-cash-batch-checks.cjs','lanes/environment/measure-cash-authority-reads.cjs','lanes/environment/prepare-cash-batch-profile.cjs','lanes/environment/profile-cash-batch-navigation.cjs','lanes/environment/manage-cash-batch-profiler.cjs','lanes/environment/cash-batch-profiler.ts','lanes/environment/cash-batch-spans-2026-09-30.jsonl',...browser.samples.map(row=>'lanes/environment/'+row.screenshot)];
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,verifiedSubcriteria:['cash_request_local_read_admission_batch_decision_and_audit_equivalence','cash_source_authority_reads_reduced_15_with_identical_owned_results','cash_en_fr_route_after_batch_and_exact_diagnostic_restoration'],receipts:[checksFile,beforeFile,afterFile,browserFile,restorationFile,'evidence/cash-batch-checks-07bfe596-5033-44e1-86e8-ae96d763391e.json'].map(file=>({file,sha256:hash(path.join(root,file))})),artifacts:artifacts.map(file=>({file,sha256:hash(path.join(root,file))})),remaining,limits:['No production performance pass or proven page speedup','No transactionally atomic multi-query authority snapshot or write authorization','No full financial workflow closure']};
const file=path.join(root,'reconcile-current-progress.cjs');let source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');assert.ok(!source.includes('const cashBatch ='));
const top=`const cashBatch = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...cashBatch.receipts, ...cashBatch.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash batch evidence changed');
for (const [file, expected] of Object.entries(cashBatch.sourceHashes)) if (crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', file))).digest('hex') !== expected) throw new Error('Cash batch source changed: ' + file);
for (const row of cashBatch.priorImpact) if (JSON.parse(fs.readFileSync(path.join(root, row.priorReview))).sourceHashes[row.file] !== row.before || cashBatch.sourceHashes[row.file] !== row.after) throw new Error('Cash batch prior impact changed');
function cashBatchExpected(source, expected) {
  const row = cashBatch.priorImpact.find(row => row.file === source);
  if (!row) return expected;
  if (row.before !== expected) throw new Error('Cash batch prior binding mismatch: ' + source);
  return row.after;
}
`;
source=source.replace('const root = __dirname;','const root = __dirname;\n'+top);
for(const label of ['Cash contrast source changed: ','Cash request profile source changed: ']){const needle="!== expected) throw new Error('"+label;assert.ok(source.includes(needle));source=source.replace(needle,"!== cashBatchExpected(file, expected)) throw new Error('"+label);}
const oldContrast=`function cashContrastExpected(source, expected) {
  const row = cashContrast.priorImpact.find(row => row.file === source);
  if (!row) return expected;
  if (row.before !== expected) throw new Error('Cash contrast prior binding mismatch: ' + source);
  return row.after;
}`;
assert.ok(source.includes(oldContrast));source=source.replace(oldContrast,oldContrast.replace('if (!row) return expected;','if (!row) return cashBatchExpected(source, expected);').replace('return row.after;','return cashBatchExpected(source, row.after);'));
const oldAccessibility=`function cashAccessibilityExpected(source, expected) {
  const row = cashAccessibility.priorImpact.find(row => row.file === source);
  if (!row) return expected;`;
assert.ok(source.includes(oldAccessibility));source=source.replace(oldAccessibility,oldAccessibility.replace('if (!row) return expected;','if (!row) return cashContrastExpected(source, expected);'));
const marker='cashRead.remaining = cashRequestProfile.remaining;';assert.ok(source.includes(marker));source=source.replace(marker,`cashRead.remaining = cashBatch.remaining;
cashRead.closureReview.cashAuthorityBatchBindingCurrent = true;
cashRead.closureReview.verifiedCriteria = [...new Set([...(cashRead.closureReview.verifiedCriteria ?? []), ...cashBatch.verifiedSubcriteria])];
for (const report of [cashBatch.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);`);
const start=source.indexOf('**Since the previous report:**'),end=source.indexOf('\n\n**Remaining priority:**',start);assert.ok(start>0&&end>start);
source=source.slice(0,start)+'**Since the previous report:** Implemented per-call module read batching for Cash sources: 15 fewer authority reads with identical owned-database result hashes. All 114 focused tests, lint and TypeScript pass; actual EN/FR routes and exact instrumentation restoration pass. Development request timings remain variable, so no page-speed or performance closure is claimed. [Correction, evidence and limits](CASH_AUTHORITY_BATCH_2026-09-30.md). No whole workflow closed; financial lifecycles, statutory review and remaining accessibility/performance requirements remain.'+source.slice(end);
fs.writeFileSync(path.join(root,reviewFile),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(file+'.retained-'+crypto.randomUUID(),fs.readFileSync(file),{flag:'wx'});const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}console.log(JSON.stringify({reviewFile}));
