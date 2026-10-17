// One-use scoped checkpoint. All receipts must be terminal, passed and source-current.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const runDir=path.resolve(__dirname,'..'),root=path.resolve(runDir,'../../..');
const configFile=path.resolve(process.argv[2]);assert.ok(configFile.startsWith(__dirname+path.sep));
const config=JSON.parse(fs.readFileSync(configFile,'utf8'));
for(const required of ['close-replacement-jest-','close-replacement-typecheck-','close-replacement-lint-','close-replacement-runtime-','close-replacement-browser-','close-replacement-order-runtime-']) assert.ok(config.receipts.some(name=>name.includes(required)),required);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),rel=file=>path.relative(root,file).replaceAll('\\','/');
const registerFile=path.join(runDir,'WORKFLOW_REGISTER.json'),progressFile=path.join(runDir,'CURRENT_PROGRESS.md');
const before=fs.readFileSync(registerFile),beforeProgress=fs.readFileSync(progressFile);
assert.equal(sha(before),'02afd47642018205fde079950fd68266c765d63a7faf45aeeaf72a209d88e511','Baseline register changed');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();assert.equal(head,'62a56036a5ac9b37236a20c9b148052199069479');
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const at=new Date().toISOString(),id=crypto.randomUUID(),reviewName='close-replacement-review-'+id+'.json';
const review={at,id,head,branch,classification:'progress',complete:false,primary:'FA-CASH-COMMAND',supporting:'FA-CLOSE-PACK',receipts:[],currentSource:{},artifacts:{},limitations:config.limitations};
function artifact(file){const bytes=fs.readFileSync(file);review.artifacts[rel(file)]=sha(bytes);return bytes;}
for(const name of config.receipts){
 const file=path.join(runDir,name),receipt=JSON.parse(artifact(file));assert.equal(receipt.passed,true,name);assert.equal(receipt.sourceStable,true,name);
 for(const key of ['outsideUnchanged','noOperationFinancialEffects'])if(key in receipt)assert.equal(receipt[key],true,name+' '+key);
 const sources=receipt.sourceAfter||receipt.sourcesAfter;assert.ok(sources,name);
 for(const [source,hash] of Object.entries(sources)){assert.equal(sha(fs.readFileSync(path.join(root,source))),hash,name+': stale '+source);review.currentSource[source]=hash;}
 review.receipts.push({file:name,sha256:sha(fs.readFileSync(file)),summary:receipt.summary,checks:receipt.checks?.length,journeys:receipt.journeys?.length});
 for(const extra of [receipt.log,receipt.jest].filter(Boolean))artifact(path.join(root,extra));
 for(const journey of receipt.journeys||[]){for(const shot of journey.screenshots||[])artifact(path.join(path.dirname(file),shot));if(journey.grant?.file)assert.equal(sha(artifact(path.join(path.dirname(file),journey.grant.file))),journey.grant.fileSha256);}
}
for(const name of config.artifacts)artifact(path.join(runDir,name));
artifact(configFile);artifact(__filename);
const registry=JSON.parse(before),ids=['FA-CASH-COMMAND','FA-CLOSE-PACK'];
assert.equal(registry.workflows.length,270);assert.equal(registry.families.length,17);
const unrelated=JSON.stringify(registry.workflows.filter(w=>!ids.includes(w.id))),families=JSON.stringify(registry.families);
const obsolete=text=>text.includes('Establish source-bound historical missing-evidence replacement; finding acceptance currently contains no replacement ID/hash.');
for(const w of registry.workflows.filter(w=>ids.includes(w.id))){
 assert.equal(w.status,'In progress');w.implementationStatus='source_bound_missing_close_evidence_replacement_integrated';w.runtimeStatus='scoped_collection_review_history_and_en_fr_stale_preview_recovery_verified';
 w.evidence.push('CLOSE_EVIDENCE_REPLACEMENT_2026-10-01.md','evidence/'+reviewName);w.remaining=w.remaining.filter(text=>!obsolete(text));
 w.remaining.push('Source-bound historical missing-evidence replacement is verified for collection receipts, reviewed acceptance, historical aggregation, concurrent publication and EN/FR recovery. Complete all remaining source producers and the full Cash/Close lifecycle; no workflow closure is inferred.',
 'Post-wait checks reread active home identity, delegated REVIEW access and authentication age. Revalidate current home-role permissions, account/organization policy and module entitlement across waits; transport permission checks alone do not prove concurrent revocation safety.');
 const c=w.closureReview;c.complete=false;c.latestScopedReview='evidence/'+reviewName;c.verifiedCriteria=[...new Set([...(c.verifiedCriteria||[]),...config.verifiedCriteria])];
 if(Array.isArray(c.remaining))c.remaining=c.remaining.filter(text=>!obsolete(text));
 c.missingEvidenceReplacementBindingCurrent=true;c.uniqueCurrentAssessmentBindingCurrent=false;
 c.priorCloseEvidenceNote='Historical receipts remain retained. This checkpoint binds collection receipts, source-reviewed replacement, historical aggregation and its actual publication/review/browser boundaries. It does not re-certify every older Close/Cash source binding or full lifecycle.';
}
assert.equal(JSON.stringify(registry.workflows.filter(w=>!ids.includes(w.id))),unrelated);assert.equal(JSON.stringify(registry.families),families);
const counts=Object.fromEntries(Object.keys(registry.coverage.statusCounts).map(key=>[key,registry.workflows.filter(w=>w.status===key).length]));
assert.equal(counts['Complete—verified'],4);assert.equal(counts['In progress'],2);assert.equal(counts.Queued,264);
const unmapped=registry.entrySourceReconciliation.filter(row=>!row.matchedWorkflowIds?.length).length;assert.equal(unmapped,191);
registry.updatedAt=at;registry.coverage.statusCounts=counts;registry.coverage.unmappedEntrySources=unmapped;registry.sourceReconciliation.current=false;registry.sourceReconciliation.latestScopedReview='evidence/'+reviewName;
registry.executionPolicy.supportingDependency='FA-CLOSE-PACK: source lifecycle, producer publication ordering and retained history';
registry.executionPolicy.note='Reviewed replacement of historical unavailable evidence verified. No workflow closed or split. Continue the original Cash closure checklist through current authority across waits, participating-producer period locks and delivery/recovery.';
const updated=Buffer.from(JSON.stringify(registry,null,2)+'\n'),registerHash=sha(updated);
const progress=`# Current progress

Updated ${at}; HEAD ${head}, branch ${branch}. Shared changes preserved. Register SHA256: ${registerHash}. Full-register source reconciliation remains incomplete.

**Position:** 270 workflows discovered; discovery incomplete; 191 unmapped entries. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow closed this turn.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Reviewed replacement reduces retained missing-evidence count without rewriting history | Whole source/authority lifecycle | Engineering | Revalidate current authority across waits |
| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Collection receipts, preview binding and publication/review ordering | Producer discovery, multi-period ordering, delivery/recovery | Accounting engineering | Coordinate producer period locks |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Delivered:** Successful collectors persist an integrity receipt binding the complete recorded observation, including honest empty results. Failed queries cannot produce that receipt. Acceptance requires explicit review of a newer matching collector and its exact preview digest. Altered, unavailable or stale previews reject. Exact retries retain one acceptance. Only verified original-obligation/replacement chains reduce historical missing-evidence counts; original runs, evidence and exports stay unchanged. A recovered source does not clear failed business controls or certify the close.

**Verification:** ${config.verificationSummary} [Detailed evidence, instructions and recovery](CLOSE_EVIDENCE_REPLACEMENT_2026-10-01.md). No customer, statutory or release approval is established.

**Remaining:** Home-role permissions and complete account/organization/module authority must be revalidated across waits; current checks reread active identity, delegated access and authentication age. Source-writer discovery can still miss new assessments; participating producers need period locks and global multi-period ordering. Other producers, future-period recovery, interrupted processing/outbox delivery, whole Cash lifecycle, authentic country/payroll prerequisites, full accessibility and production performance remain open. Legacy receipt/invoice and carrying-value conflicts remain retained.

All 17 original families remain in the [register](WORKFLOW_REGISTER.json): identity, organization/access, modules, master data, sales, POS/offline, inventory, purchasing/AP, payments, finance/close, HRIS/payroll, compliance, analytics, evidence/governance, notifications, integrations and AI. Unrelated 268 workflow rows, all families and all workflow statuses are unchanged. No migration, deployment, live activation, payment, external message or X1 clearance occurred. No user input blocks the next local implementation. ETA remains unreliable.
`;
assert.ok(progress.split(/\s+/).length<=700);review.workflowCounts=counts;review.unmapped=unmapped;review.registerBeforeSha256=sha(before);review.registerAfterSha256=registerHash;review.progressSha256=sha(progress);review.progressWords=progress.split(/\s+/).length;
fs.writeFileSync(path.join(__dirname,'close-replacement-register-before-'+id+'.json'),before,{flag:'wx'});fs.writeFileSync(path.join(__dirname,'close-replacement-progress-before-'+id+'.md'),beforeProgress,{flag:'wx'});
function replace(file,bytes){const temp=file+'.'+id+'.tmp';fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,file);assert.equal(sha(fs.readFileSync(file)),sha(bytes));}
replace(registerFile,updated);replace(progressFile,Buffer.from(progress));fs.writeFileSync(path.join(__dirname,reviewName),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({review:rel(path.join(__dirname,reviewName)),registerHash,counts,progressWords:review.progressWords,sources:Object.keys(review.currentSource).length,passed:true}));
