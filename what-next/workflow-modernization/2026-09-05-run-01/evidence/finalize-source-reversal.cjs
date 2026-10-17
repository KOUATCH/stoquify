// Guarded coordinator checkpoint. Does not change workflow statuses or family scope.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const run=path.resolve(__dirname,'..'),root=path.resolve(run,'../../..'),configPath=path.resolve(process.argv[2]);
assert.equal(path.dirname(configPath),__dirname);
const config=JSON.parse(fs.readFileSync(configPath,'utf8')),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),rel=file=>path.relative(root,file).replaceAll('\\','/');
const registerFile=path.join(run,'WORKFLOW_REGISTER.json'),progressFile=path.join(run,'CURRENT_PROGRESS.md');
const before=fs.readFileSync(registerFile),beforeProgress=fs.readFileSync(progressFile),baselineDir=path.join(__dirname,'source-reversal-before-shared-2db62bd3-0fcb-45f5-b66e-eb5452c295af');
const baseline=JSON.parse(fs.readFileSync(path.join(baselineDir,'manifest.json'),'utf8').replace(/^\uFEFF/,''));
for(const file of [registerFile,progressFile]) { const saved=baseline.files.find(row=>row.path===rel(file));assert.ok(saved);assert.equal(sha(fs.readFileSync(file)),saved.sha256);assert.equal(sha(fs.readFileSync(path.join(root,saved.savedPath))),saved.sha256); }
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();assert.equal(head,'62a56036a5ac9b37236a20c9b148052199069479');
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),at=new Date().toISOString(),id=crypto.randomUUID(),name='source-reversal-review-'+id+'.json';
const review={at,head,branch,classification:'progress',complete:false,primary:'FA-CASH-COMMAND',supporting:'FA-CLOSE-PACK',receipts:[],currentSource:{},artifacts:{},limitations:config.limitations};
const artifact=file=>{const bytes=fs.readFileSync(file);review.artifacts[rel(file)]=sha(bytes);return bytes;};
for(const prefix of ['source-reversal-jest-','source-reversal-typecheck-','source-reversal-lint-','inventory-adjustment-reversal-runtime-','journal-suspense-runtime-']) assert.ok(config.receipts.some(file=>path.basename(file).startsWith(prefix)),prefix);
if(config.purchaseApplied)assert.ok(config.receipts.some(file=>path.basename(file).startsWith('purchase-reversal-order-runtime-')));
for(const fileName of config.receipts) {
  const file=path.join(run,fileName),receipt=JSON.parse(artifact(file));assert.equal(receipt.passed,true,fileName);assert.equal(receipt.sourceStable,true,fileName);
  if('outsideUnchanged' in receipt)assert.equal(receipt.outsideUnchanged,true,fileName);
  const sources=receipt.sourceAfter||receipt.sourcesAfter;assert.ok(sources);
  for(const [source,hash] of Object.entries(sources)) { assert.equal(sha(fs.readFileSync(path.join(root,source))),hash,fileName+': stale '+source);review.currentSource[source]=hash; }
  review.receipts.push({file:fileName,sha256:sha(fs.readFileSync(file)),summary:receipt.summary,checks:receipt.checks?.length});
  for(const extra of [receipt.log,receipt.jest].filter(Boolean))artifact(path.join(root,extra));
}
for(const file of config.artifacts)artifact(path.join(run,file));artifact(configPath);artifact(__filename);
const register=JSON.parse(before),ids=['FA-CASH-COMMAND','FA-CLOSE-PACK'];assert.equal(register.workflows.length,270);assert.equal(register.families.length,17);
const unrelated=JSON.stringify(register.workflows.filter(row=>!ids.includes(row.id))),families=JSON.stringify(register.families),statuses=JSON.stringify(register.workflows.map(row=>[row.id,row.status]));
for(const workflow of register.workflows.filter(row=>ids.includes(row.id))) {
  assert.equal(workflow.status,'In progress');workflow.implementationStatus=config.implementationStatus;workflow.runtimeStatus=config.runtimeStatus;
  workflow.evidence.push('SOURCE_REVERSAL_ORDER_2026-10-01.md','evidence/'+name);
  const predecessor='Manual/customer-settlement reversal ordering is verified. Inventory-adjustment reversal, purchase correction, both suspense reversal paths and ordinary/other producers still need coordinated publication review. Broad operating/forecast hash freshness, interrupted processing and outbox delivery remain open; this is not universal evidence freshness or whole Cash/Close closure.';
  assert.ok(workflow.remaining.includes(predecessor));workflow.remaining=workflow.remaining.map(item=>item===predecessor?config.remaining:item);
  const closure=workflow.closureReview;closure.complete=false;closure.latestScopedReview='evidence/'+name;
  closure.verifiedCriteria=[...new Set([...(closure.verifiedCriteria||[]),...config.verifiedCriteria])];
  closure.sourceOwnedReversalOrderingCurrent=true;closure.purchaseReversalOrderingCurrent=!!config.purchaseApplied;
  closure.journalReversalOrderingBoundaryCurrent=false;
  closure.priorCloseEvidenceNote='Current source-owned reversal evidence is scoped to the new report. Earlier manual/customer-settlement runtime bindings and unrelated workflow closures are historical; shared focused regressions pass, but all older evidence has not been recertified. Full Cash/Close lifecycle remains open.';
}
assert.equal(JSON.stringify(register.workflows.filter(row=>!ids.includes(row.id))),unrelated);assert.equal(JSON.stringify(register.families),families);assert.equal(JSON.stringify(register.workflows.map(row=>[row.id,row.status])),statuses);
const counts=Object.fromEntries(Object.keys(register.coverage.statusCounts).map(key=>[key,register.workflows.filter(row=>row.status===key).length]));assert.equal(counts['Complete—verified'],4);assert.equal(counts['In progress'],2);assert.equal(counts.Queued,264);
const unmapped=register.entrySourceReconciliation.filter(row=>!row.matchedWorkflowIds?.length).length;assert.equal(unmapped,191);
register.updatedAt=at;register.coverage.statusCounts=counts;register.coverage.unmappedEntrySources=unmapped;register.sourceReconciliation.current=false;register.sourceReconciliation.latestScopedReview='evidence/'+name;
register.executionPolicy.supportingDependency='FA-CLOSE-PACK: remaining source producers, evidence freshness and delivery';
register.executionPolicy.note='Source-owned reversal milestone advanced with current scoped evidence. No workflow closed, renamed or split. Preserve full Cash lifecycle, producer handoffs and delivery requirements.';
const bytes=Buffer.from(JSON.stringify(register,null,2)+'\n'),registerHash=sha(bytes);
const progress=`# Current progress

Updated ${at}; HEAD ${head}, branch ${branch}. Shared changes preserved. Register SHA256: ${registerHash}. Full-register source reconciliation remains incomplete.

**Position:** 270 discovered workflows, 17 families, 191 unmapped entries; discovery incomplete. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow closed this turn.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Source-owned corrections and retained evidence | Complete financial/source lifecycle | Engineering | Complete remaining handoffs and recovery |
| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Ordered source reversal and stale-evidence handling | Other producers, freshness and delivery | Accounting engineering | Resolve remaining producer dependencies |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Delivered:** ${config.delivered}

**Verification:** ${config.verificationSummary} [Detailed results, failures and operating guidance](SOURCE_REVERSAL_ORDER_2026-10-01.md). No changed UI or fresh browser evidence is claimed. These are engineering results, not customer, statutory or release approval.

**Remaining:** ${config.remaining} Full Cash lifecycle, genuine country/payroll prerequisites, complete accessibility, production capacity/performance and source reconciliation remain open. Earlier claims are not all recertified.

All original families remain in the [register](WORKFLOW_REGISTER.json): identity, organization/access, modules, master data, sales, POS/offline, inventory, purchasing/AP, payments, finance/close, HRIS/payroll, compliance, analytics, evidence/governance, notifications, integrations and AI. Unrelated 268 workflow rows, all families and all statuses are unchanged. No migration, deployment, live activation, real payment, external message or X1 clearance occurred. ${config.nextAction} ETA remains unreliable.
`;
assert.ok(progress.split(/\s+/).length<=700);
Object.assign(review,{workflowCounts:counts,unmapped,registerBeforeSha256:sha(before),registerAfterSha256:registerHash,progressSha256:sha(progress),progressWords:progress.split(/\s+/).length});
function replace(file,value,expected){const temp=file+'.'+id+'.tmp';fs.writeFileSync(temp,value,{flag:'wx'});assert.equal(sha(fs.readFileSync(file)),expected,'Concurrent checkpoint edit');fs.renameSync(temp,file);assert.equal(sha(fs.readFileSync(file)),sha(value));}
fs.writeFileSync(path.join(__dirname,name),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
try {replace(registerFile,bytes,sha(before));replace(progressFile,Buffer.from(progress),sha(beforeProgress));}
catch(error) {const recovery=[];for(const [file,prior,ours] of [[registerFile,before,bytes],[progressFile,beforeProgress,Buffer.from(progress)]]) {try {const actual=sha(fs.readFileSync(file));if(actual===sha(prior)){recovery.push({file:rel(file),status:'unchanged'});continue;}assert.equal(actual,sha(ours));replace(file,prior,sha(ours));recovery.push({file:rel(file),status:'restored'});}catch(e){recovery.push({file:rel(file),status:'restore-failed',error:String(e.message)});}}fs.writeFileSync(path.join(__dirname,'source-reversal-checkpoint-failed-'+id+'.json'),JSON.stringify({at,error:String(error.message),recovery},null,2)+'\n',{flag:'wx'});throw error;}
console.log(JSON.stringify({review:rel(path.join(__dirname,name)),registerHash,counts,progressWords:review.progressWords,sources:Object.keys(review.currentSource).length,passed:true}));
