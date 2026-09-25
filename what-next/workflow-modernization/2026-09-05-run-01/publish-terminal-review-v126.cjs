const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));
const output='evidence/terminal-review-v126.json';assert.ok(!fs.existsSync(path.join(__dirname,output)));
const browserName=process.argv[2];assert.match(browserName,/^terminal-review-browser-v126-[a-f0-9-]+\.json$/);
const browserFile='lanes/environment/'+browserName,browser=read(browserFile),baseline=read('evidence/source-baseline-v126.json');
assert.ok(browser.passed&&browser.sourceStable&&browser.browser.length===2&&browser.browser.every(row=>row.invalidDetailsExplained&&row.reviewDoesNotSave&&row.reviewedMergeSaved&&row.serverReadRevoked&&row.revocationHidesDataAndRestoredAccessRecovers&&!row.pageErrors.length&&row.screenshots.length===3));
for(const [file,digest]of Object.entries(browser.sourcesAfter)){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),digest);
 assert.equal(baseline.sources.find(row=>row.path===file)?.sha256,digest);
}
const laneFile='lanes/pos-offline/WORKFLOW_REGISTER.json',lane=read(laneFile);
for(const workflow of lane.workflows.filter(row=>['POS-TERMINAL-UPDATE','POS-TERMINAL-READ'].includes(row.id))){
 workflow.implementationStatus='required_revision_scoped_reads_and_explicit_retained_draft_review';
 workflow.reviewStatus='source_owned_postgres_and_actual_en_fr_browser';
 workflow.runtimeStatus='partial_stale_review_save_and_actual_role_recovery_verified';
 workflow.evidence.push('../../TERMINAL_REVIEW_V126.md','../../'+output);
 workflow.remaining=['Complete module/read-only and operation-role consistency, archive revision binding, creation/history journeys and native accessibility remain open.'];
}
lane.evidenceDate=new Date().toISOString();fs.writeFileSync(path.join(__dirname,laneFile),JSON.stringify(lane,null,2)+'\n');
execFileSync(process.execPath,[path.join(__dirname,'update-workflow-register.cjs')],{cwd:root,stdio:'pipe',windowsHide:true});
const register=read('WORKFLOW_REGISTER.json');
const note='\n\n## v126 — Required terminal revision and retained-draft review\n\nReproduced stale overwrite and added a server revision required before updates. A fresh comparison preserves explicitly edited fields and newer untouched fields; accepting review does not save. Terminal management reads now bind cache and responses to current tenant/actor and permissions; restored access refreshes authority on retry. [Guide and evidence](TERMINAL_REVIEW_V126.md), [aggregate](evidence/terminal-review-v126.json). PostgreSQL stale/missing/concurrent checks, 24 focused tests / five suites and actual EN/FR validation/review/role-recovery journeys passed. No migration, payment or deployment.\n\nCoverage remains '+register.coverage.discoveredWorkflows+' provisional workflows / '+register.coverage.completeWorkflowsVerified+' whole workflows complete / '+register.coverage.unmappedEntrySources+' unmapped entry sources. Module/read-only and operation-role consistency, archive revision binding, full terminal creation/history and remaining platform workflows require continued work.\n';
for(const file of ['WORKFLOW_MAP.md','FINDINGS_AND_REMEDIATION.md','IMPLEMENTATION_REPORT.md','DESIGN_SYSTEM_AND_UX.md','VERIFICATION.md','ROLLOUT_AND_RECOVERY.md','USER_AND_OPERATOR_GUIDE.md','COMPLETION_AUDIT.md','NEXT_BATCH.md'])fs.appendFileSync(path.join(__dirname,file),note);
fs.writeFileSync(path.join(__dirname,output),JSON.stringify({at:new Date().toISOString(),baseline:'evidence/source-baseline-v126.json',sources:browser.sourcesAfter,tests:{passed:24,suites:5,receipt:'a24792'},typecheck:{passed:true,receipt:'be6573'},lint:{passed:true,files:11,receipt:'e323c7'},database:{before:'lanes/environment/terminal-revision-v126-before-d3404f5d-9441-4f7f-accb-851216f0c9b6.json',after:'lanes/environment/terminal-revision-v126-after-abf9b5b7-65f2-4cc7-822d-b64c4e1c5842.json',receipts:['40cb94','a909a6']},browser:{file:browserFile,receipt:'8f5b81',...browser},verificationDetails:'TERMINAL_REVIEW_V126.md',coverage:register.coverage,wholeWorkflowComplete:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,coverage:register.coverage,wholeWorkflowComplete:false}));
