// One-use local checkpoint. Refuses stale or nonterminal verification evidence.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const runDir=path.resolve(__dirname,'..'),root=path.resolve(runDir,'../../..');
const configFile=path.resolve(process.argv[2]);assert.equal(path.dirname(configFile),__dirname);
const config=JSON.parse(fs.readFileSync(configFile,'utf8'));
for(const prefix of ['close-authority-jest-','close-authority-typecheck-','close-authority-lint-','close-acceptance-authority-runtime-','close-acceptance-authority-browser-'])assert.ok(config.receipts.some(file=>path.basename(file).startsWith(prefix)),prefix);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),relative=file=>path.relative(root,file).replaceAll('\\','/');
const registerFile=path.join(runDir,'WORKFLOW_REGISTER.json'),progressFile=path.join(runDir,'CURRENT_PROGRESS.md');
const before=fs.readFileSync(registerFile),beforeProgress=fs.readFileSync(progressFile);
assert.equal(sha(before),'7644d66803417742e9ef2b668b7b1fa7c2dd794da94588bdec9058381cdea616','Register changed since accepted baseline');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();assert.equal(head,'62a56036a5ac9b37236a20c9b148052199069479');
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const at=new Date().toISOString(),id=crypto.randomUUID(),name='close-authority-review-'+id+'.json';
const review={at,id,head,branch,classification:'progress',complete:false,primary:'FA-CASH-COMMAND',supporting:'FA-CLOSE-PACK',receipts:[],currentSource:{},artifacts:{},limitations:config.limitations};
function artifact(file){const bytes=fs.readFileSync(file);review.artifacts[relative(file)]=sha(bytes);return bytes;}
for(const fileName of config.receipts){
 const file=path.join(runDir,fileName),receipt=JSON.parse(artifact(file));assert.equal(receipt.passed,true,fileName);assert.equal(receipt.sourceStable,true,fileName);
 for(const key of ['outsideUnchanged','noOperationFinancialEffects'])if(key in receipt)assert.equal(receipt[key],true,fileName+': '+key);
 const sources=receipt.sourceAfter||receipt.sourcesAfter;assert.ok(sources,fileName);
 for(const [source,hash] of Object.entries(sources)){assert.equal(sha(fs.readFileSync(path.join(root,source))),hash,fileName+': stale '+source);review.currentSource[source]=hash;}
 review.receipts.push({file:fileName,sha256:sha(fs.readFileSync(file)),summary:receipt.summary,checks:receipt.checks?.length,journeys:receipt.journeys?.length});
 for(const extra of [receipt.log,receipt.jest].filter(Boolean))artifact(path.join(root,extra));
 for(const fixture of receipt.fixtures||[])if(fixture.grant?.file)assert.equal(sha(artifact(path.join(path.dirname(file),fixture.grant.file))),fixture.grant.fileSha256);
 for(const journey of receipt.journeys||[])for(const shot of journey.screenshots||[])artifact(path.join(path.dirname(file),shot));
}
for(const fileName of config.artifacts)artifact(path.join(runDir,fileName));
artifact(configFile);artifact(__filename);
const register=JSON.parse(before),ids=['FA-CASH-COMMAND','FA-CLOSE-PACK'];
assert.equal(register.workflows.length,270);assert.equal(register.families.length,17);
const unrelated=JSON.stringify(register.workflows.filter(w=>!ids.includes(w.id))),families=JSON.stringify(register.families);
const resolved=text=>text.startsWith('Post-wait checks reread active home identity, delegated REVIEW access and authentication age. Revalidate current home-role permissions, account/organization policy and module entitlement across waits;');
for(const workflow of register.workflows.filter(w=>ids.includes(w.id))){
 assert.equal(workflow.status,'In progress');workflow.implementationStatus='persisted_authority_for_source_bound_close_evidence_acceptance';workflow.runtimeStatus='scoped_authority_denial_revocation_ordering_and_delegated_en_fr_recovery_verified';
 workflow.evidence.push('CLOSE_ACCEPTANCE_AUTHORITY_2026-10-01.md','evidence/'+name);
 workflow.remaining=workflow.remaining.filter(text=>!resolved(text));
 workflow.remaining.push('Persisted authority for missing Close evidence acceptance is verified for current roles/account/organization/session/delegation/modules, post-wait expiry, role/session revocation ordering and delegated EN/FR recovery. Other source producers, assessment discovery/multi-period ordering, interruption/delivery and whole Cash/Close lifecycle remain open.');
 const closure=workflow.closureReview;closure.complete=false;closure.latestScopedReview='evidence/'+name;closure.verifiedCriteria=[...new Set([...(closure.verifiedCriteria||[]),...config.verifiedCriteria])];
 if(Array.isArray(closure.remaining))closure.remaining=closure.remaining.filter(text=>!resolved(text));
 closure.missingEvidenceAcceptanceAuthorityCurrent=true;closure.uniqueCurrentAssessmentBindingCurrent=false;
 closure.priorCloseEvidenceNote='This checkpoint binds current persisted acceptance authority and related source-bound replacement regressions. Prior evidence is retained; no blanket recertification of all historical Cash/Close checks or workflow closure is asserted.';
}
assert.equal(JSON.stringify(register.workflows.filter(w=>!ids.includes(w.id))),unrelated);assert.equal(JSON.stringify(register.families),families);
const counts=Object.fromEntries(Object.keys(register.coverage.statusCounts).map(key=>[key,register.workflows.filter(w=>w.status===key).length]));
assert.equal(counts['Complete—verified'],4);assert.equal(counts['In progress'],2);assert.equal(counts.Queued,264);
const unmapped=register.entrySourceReconciliation.filter(row=>!row.matchedWorkflowIds?.length).length;assert.equal(unmapped,191);
register.updatedAt=at;register.coverage.statusCounts=counts;register.coverage.unmappedEntrySources=unmapped;
register.sourceReconciliation.current=false;register.sourceReconciliation.latestScopedReview='evidence/'+name;
register.executionPolicy.supportingDependency='FA-CLOSE-PACK: source lifecycle, producer publication ordering and retained history';
register.executionPolicy.note='Current persisted Close evidence acceptance authority verified. No workflow closed, renamed or split. Continue original Cash closure scope with participating producer discovery/period ordering and delivery/recovery.';
const bytes=Buffer.from(JSON.stringify(register,null,2)+'\n'),registerHash=sha(bytes);
const progress=`# Current progress

Updated ${at}; HEAD ${head}, branch ${branch}. Shared changes preserved. Register SHA256: ${registerHash}. Full-register source reconciliation remains incomplete.

**Position:** 270 workflows discovered; discovery incomplete; 191 unmapped entries. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow closed this turn.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Current authority protects source-bound missing-evidence acceptance | Whole source/authority lifecycle | Engineering | Close the zero-variance count/publication race |
| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Current account, roles, session, delegation and module authority survives waits | Producer discovery, multi-period ordering, delivery/recovery | Accounting engineering | Order affected existing-period locks before discovery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Delivered:** Both Close acceptance actions derive session proof from authenticated server context. The transaction verifies persisted home roles, usable account, home/target organizations, exact password-assured session, delegated REVIEW and canonical module access. Locks retain that authority through commit; expiry is checked again after waits. Revoked authority cannot authorize retries. Valid external accountants need no client membership, and read-only home accounting remains sufficient when client Close writes are allowed. Original evidence, independent review, exact selection binding and financial controls remain intact.

**Verification:** ${config.verificationSummary} [Detailed evidence, user recovery and rollout instructions](CLOSE_ACCEPTANCE_AUTHORITY_2026-10-01.md). Scope is a delivered correction; no customer, statutory or release approval is established.

**Remaining:** Source-writer discovery can still miss new assessments; participating producers need period locks and global multi-period ordering. Other producers, future-period recovery, interrupted processing/outbox delivery, whole Cash lifecycle, authentic country/payroll prerequisites, full accessibility and production performance remain open. Legacy receipt/invoice and carrying-value conflicts remain retained. Current evidence does not recertify every historical checkpoint.

All 17 original families remain in the [register](WORKFLOW_REGISTER.json): identity, organization/access, modules, master data, sales, POS/offline, inventory, purchasing/AP, payments, finance/close, HRIS/payroll, compliance, analytics, evidence/governance, notifications, integrations and AI. Unrelated 268 workflow rows, all families and all statuses are unchanged. No migration, deployment, live activation, payment, external message or X1 clearance occurred. No user input blocks the next local implementation. ETA remains unreliable.
`;
assert.ok(progress.split(/\s+/).length<=700);
Object.assign(review,{workflowCounts:counts,unmapped,registerBeforeSha256:sha(before),registerAfterSha256:registerHash,progressSha256:sha(progress),progressWords:progress.split(/\s+/).length});
fs.writeFileSync(path.join(__dirname,'close-authority-register-before-'+id+'.json'),before,{flag:'wx'});fs.writeFileSync(path.join(__dirname,'close-authority-progress-before-'+id+'.md'),beforeProgress,{flag:'wx'});
function replace(file,value){const temp=file+'.'+id+'.tmp';fs.writeFileSync(temp,value,{flag:'wx'});fs.renameSync(temp,file);assert.equal(sha(fs.readFileSync(file)),sha(value));}
// Publish immutable evidence before mutable documents can refer to it. Retain
// backups and restore only our exact content if a later replacement fails.
fs.writeFileSync(path.join(__dirname,name),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
try { replace(registerFile,bytes);replace(progressFile,Buffer.from(progress)); }
catch(error){
 const recovery=[];
 for(const [file,prior,ours] of [[registerFile,before,bytes],[progressFile,beforeProgress,Buffer.from(progress)]]){
  try { const actual=sha(fs.readFileSync(file));if(actual===sha(prior)){recovery.push({file:relative(file),status:'unchanged'});continue;}
   assert.equal(actual,sha(ours),'Concurrent content changed; refusing rollback overwrite');
   replace(file,prior);recovery.push({file:relative(file),status:'restored'});
  }catch(restoreError){recovery.push({file:relative(file),status:'restore-failed',error:String(restoreError.message)});}
 }
 fs.writeFileSync(path.join(__dirname,'close-authority-checkpoint-failed-'+id+'.json'),JSON.stringify({at,id,error:String(error.message),recovery},null,2)+'\n',{flag:'wx'});
 throw error;
}
console.log(JSON.stringify({review:relative(path.join(__dirname,name)),registerHash,counts,progressWords:review.progressWords,sources:Object.keys(review.currentSource).length,passed:true}));
