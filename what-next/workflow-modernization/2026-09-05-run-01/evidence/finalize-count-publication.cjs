// Local scoped checkpoint; source evidence must be terminal and current.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const runDir=path.resolve(__dirname,'..'),root=path.resolve(runDir,'../../..'),configFile=path.resolve(process.argv[2]);assert.equal(path.dirname(configFile),__dirname);
const config=JSON.parse(fs.readFileSync(configFile,'utf8'));
for(const prefix of ['count-publication-jest-','count-publication-typecheck-','count-publication-lint-','count-publication-runtime-'])assert.ok(config.receipts.some(file=>path.basename(file).startsWith(prefix)),prefix);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),relative=file=>path.relative(root,file).replaceAll('\\','/');
const registerFile=path.join(runDir,'WORKFLOW_REGISTER.json'),progressFile=path.join(runDir,'CURRENT_PROGRESS.md'),before=fs.readFileSync(registerFile),beforeProgress=fs.readFileSync(progressFile);
assert.equal(sha(before),'18c17c20765035303a9b2de429cb32a74db3bf39b4b257db59db7b85f05c917e','Register changed since baseline');
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'count-publication-before-95fa0a2e-ff74-4daa-9aa0-c36306088bdf.json'),'utf8'));
for(const file of [registerFile,progressFile]){const saved=baseline.files.find(row=>row.path===relative(file));assert.ok(saved);assert.equal(sha(fs.readFileSync(file)),saved.sha256);assert.equal(sha(Buffer.from(saved.base64,'base64')),saved.sha256);}
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();assert.equal(head,'62a56036a5ac9b37236a20c9b148052199069479');
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),at=new Date().toISOString(),id=crypto.randomUUID(),name='count-publication-review-'+id+'.json';
const review={at,id,head,branch,classification:'progress',complete:false,primary:'FA-CASH-COMMAND',supporting:'FA-CLOSE-PACK',receipts:[],currentSource:{},artifacts:{},limitations:config.limitations};
function artifact(file){const bytes=fs.readFileSync(file);review.artifacts[relative(file)]=sha(bytes);return bytes;}
for(const receiptName of config.receipts){
 const file=path.join(runDir,receiptName),receipt=JSON.parse(artifact(file));assert.equal(receipt.passed,true,receiptName);assert.equal(receipt.sourceStable,true,receiptName);
 for(const key of ['outsideUnchanged','noOperationFinancialEffects'])if(key in receipt)assert.equal(receipt[key],true,receiptName+': '+key);
 const sources=receipt.sourceAfter||receipt.sourcesAfter;assert.ok(sources);
 for(const [source,hash] of Object.entries(sources)){assert.equal(sha(fs.readFileSync(path.join(root,source))),hash,receiptName+': stale '+source);review.currentSource[source]=hash;}
 review.receipts.push({file:receiptName,sha256:sha(fs.readFileSync(file)),summary:receipt.summary,checks:receipt.checks?.length});
 for(const extra of [receipt.log,receipt.jest].filter(Boolean))artifact(path.join(root,extra));
 for(const check of receipt.checks||[])for(const retained of check.retainedArtifacts||[]){assert.equal(sha(artifact(path.join(path.dirname(file),retained.file))),retained.bytesHash);}
}
for(const file of config.artifacts)artifact(path.join(runDir,file));artifact(configFile);artifact(__filename);
const register=JSON.parse(before),ids=['FA-CASH-COMMAND','FA-CLOSE-PACK'];assert.equal(register.workflows.length,270);assert.equal(register.families.length,17);
const unrelated=JSON.stringify(register.workflows.filter(w=>!ids.includes(w.id))),families=JSON.stringify(register.families);
for(const workflow of register.workflows.filter(w=>ids.includes(w.id))){
 assert.equal(workflow.status,'In progress');workflow.implementationStatus='zero_variance_count_assessment_publication_order_integrated';workflow.runtimeStatus='scoped_existing_period_discovery_order_rollback_and_recovery_verified';
 workflow.evidence.push('COUNT_PUBLICATION_ORDER_2026-10-01.md','evidence/'+name);
 workflow.remaining.push('Zero-variance physical counts now serialize with assessment publication across the resolved existing period set. Concurrent creation of new accounting periods, other source producers/global multi-period ordering, interruption/delivery and complete Cash/Close lifecycle remain open.');
 const closure=workflow.closureReview;closure.complete=false;closure.latestScopedReview='evidence/'+name;closure.verifiedCriteria=[...new Set([...(closure.verifiedCriteria||[]),...config.verifiedCriteria])];
 closure.zeroVarianceCountExistingPeriodPublicationCurrent=true;closure.uniqueCurrentAssessmentBindingCurrent=false;
 closure.priorCloseEvidenceNote='Current source-bound checks cover the zero-variance count publication boundary and affected Close regressions. Prior UI, authority and all-domain records remain scoped historical evidence; this checkpoint does not recertify every previous claim or close either workflow.';
}
assert.equal(JSON.stringify(register.workflows.filter(w=>!ids.includes(w.id))),unrelated);assert.equal(JSON.stringify(register.families),families);
const counts=Object.fromEntries(Object.keys(register.coverage.statusCounts).map(key=>[key,register.workflows.filter(w=>w.status===key).length]));assert.equal(counts['Complete—verified'],4);assert.equal(counts['In progress'],2);assert.equal(counts.Queued,264);
const unmapped=register.entrySourceReconciliation.filter(row=>!row.matchedWorkflowIds?.length).length;assert.equal(unmapped,191);
register.updatedAt=at;register.coverage.statusCounts=counts;register.coverage.unmappedEntrySources=unmapped;register.sourceReconciliation.current=false;register.sourceReconciliation.latestScopedReview='evidence/'+name;
register.executionPolicy.supportingDependency='FA-CLOSE-PACK: source lifecycle, complete period scope, producer ordering and retained history';
register.executionPolicy.note='Existing-period zero-variance count publication ordering verified. No workflow closed, renamed or split. Continue original Cash closure scope through new-period coordination, other source writers and delivery/recovery.';
const bytes=Buffer.from(JSON.stringify(register,null,2)+'\n'),registerHash=sha(bytes);
const progress=`# Current progress

Updated ${at}; HEAD ${head}, branch ${branch}. Shared changes preserved. Register SHA256: ${registerHash}. Full-register source reconciliation remains incomplete.

**Position:** 270 workflows discovered; discovery incomplete; 191 unmapped entries. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow closed this turn.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Zero-variance count commits cannot escape assessment discovery for locked existing periods | Whole source/authority lifecycle | Engineering | Coordinate concurrent new-period creation |
| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Ordered period locks, post-wait visibility, retained history and recovery | Other producers, global ordering, delivery/recovery | Accounting engineering | Extend complete period-scope protocol |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Delivered:** Zero-variance posting resolves affected existing tenant periods, including later periods without assessments, then acquires the complete sorted lock set before source writes. Own transactions use Read Committed; incompatible supplied transactions reject before mutation. Assessment creation waits for committed count evidence, or the count invalidates an already published RUNNING assessment that late collectors cannot restore to READY. Original evidence and export contents remain retained. Financial variance behavior and unrelated producers remain separate.

**Verification:** ${config.verificationSummary} [Detailed evidence, user recovery and rollout instructions](COUNT_PUBLICATION_ORDER_2026-10-01.md). No changed UI or new browser screenshot is claimed. This is a delivered correction, not customer, statutory or release approval.

**Remaining:** Concurrent creation of periods after scope discovery requires coordination. Other producers and journal reversal need complete multi-period ordering. Future-period recovery, interrupted processing/outbox delivery, full Cash lifecycle, genuine country/payroll prerequisites, complete accessibility and production performance remain open. Legacy receipt/invoice/carrying-value conflicts are retained. Current evidence does not recertify every historical checkpoint.

All 17 original families remain in the [register](WORKFLOW_REGISTER.json): identity, organization/access, modules, master data, sales, POS/offline, inventory, purchasing/AP, payments, finance/close, HRIS/payroll, compliance, analytics, evidence/governance, notifications, integrations and AI. Unrelated 268 workflow rows, all families and all statuses are unchanged. No migration, deployment, live activation, payment, external message or X1 clearance occurred. No user input blocks the next local implementation. ETA remains unreliable.
`;
assert.ok(progress.split(/\s+/).length<=700);Object.assign(review,{workflowCounts:counts,unmapped,registerBeforeSha256:sha(before),registerAfterSha256:registerHash,progressSha256:sha(progress),progressWords:progress.split(/\s+/).length});
// Coordinator is the sole mutable-register/progress writer. Recheck immediately
// before rename as well; a filesystem rename is not an atomic compare-and-set.
function replace(file,value,expected){const temp=file+'.'+id+'.tmp';fs.writeFileSync(temp,value,{flag:'wx'});assert.equal(sha(fs.readFileSync(file)),expected,'Concurrent checkpoint edit; refusing overwrite');fs.renameSync(temp,file);assert.equal(sha(fs.readFileSync(file)),sha(value));}
fs.writeFileSync(path.join(__dirname,name),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
try{replace(registerFile,bytes,sha(before));replace(progressFile,Buffer.from(progress),sha(beforeProgress));}catch(error){const recovery=[];for(const [file,prior,ours] of [[registerFile,before,bytes],[progressFile,beforeProgress,Buffer.from(progress)]]){try{const actual=sha(fs.readFileSync(file));if(actual===sha(prior)){recovery.push({file:relative(file),status:'unchanged'});continue;}assert.equal(actual,sha(ours),'Refusing concurrent content overwrite');replace(file,prior,sha(ours));recovery.push({file:relative(file),status:'restored'});}catch(restoreError){recovery.push({file:relative(file),status:'restore-failed',error:String(restoreError.message)});}}fs.writeFileSync(path.join(__dirname,'count-publication-checkpoint-failed-'+id+'.json'),JSON.stringify({at,id,error:String(error.message),recovery},null,2)+'\n',{flag:'wx'});throw error;}
console.log(JSON.stringify({review:relative(path.join(__dirname,name)),registerHash,counts,progressWords:review.progressWords,sources:Object.keys(review.currentSource).length,passed:true}));
