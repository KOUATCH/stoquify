const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));
const output='evidence/terminal-archive-v124.json';assert.ok(!fs.existsSync(path.join(__dirname,output)));
const baseline=read('evidence/source-baseline-v124.json');
const beforeFile='lanes/environment/terminal-race-v124-before-f1336a18-82e0-4f04-94dd-124428239569.json',afterFile='lanes/environment/terminal-race-v124-after-06f8c4c4-7325-422d-a657-ba35f06b6bd5.json',after=read(afterFile);
assert.ok(after.passed&&after.sourceStable);
for(const [file,digest]of Object.entries(after.sourcesAfter)){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),digest);
  assert.equal(baseline.sources.find(row=>row.path===file)?.sha256,digest);
}
const laneFile='lanes/pos-offline/WORKFLOW_REGISTER.json',lane=read(laneFile);
const workflow=lane.workflows.find(row=>row.id==='POS-TERMINAL-ARCHIVE');assert.ok(workflow);
workflow.implementationStatus='archive_atomic_claim_corrected_edit_deactivation_path_still_open';
workflow.reviewStatus='source_and_actual_postgres_interleaving';
workflow.runtimeStatus='partial_service_database_verified_browser_not_visited';
workflow.evidence.push('../../TERMINAL_ARCHIVE_V124.md','../../'+output);
workflow.remaining=['Terminal edit/deactivation check-write race remains; actual EN/FR terminal browser rejection/retry, dialog accessibility, module/read-only lifecycle and connected effects need verification.'];
lane.evidenceDate=new Date().toISOString();fs.writeFileSync(path.join(__dirname,laneFile),JSON.stringify(lane,null,2)+'\n');
execFileSync(process.execPath,[path.join(__dirname,'update-workflow-register.cjs')],{cwd:root,stdio:'pipe',windowsHide:true});
const register=read('WORKFLOW_REGISTER.json');
const note='\n\n## v124 — Terminal archive/open concurrency\n\nReproduced an inactive terminal with a newly opened active shift in owned PostgreSQL. Archive now checks tenant and empty session link atomically, preserving a shift that opened first and preventing opening after deactivation. Actual before/after checks, 48 tests / three suites, typecheck and two-file lint passed. [Review and recovery guide](TERMINAL_ARCHIVE_V124.md), [evidence](evidence/terminal-archive-v124.json). Terminal edit/deactivation has a separate unresolved race; actual terminal EN/FR browser recovery remains unvisited. No migration, payment, deployment or certification.\n\nCoverage remains '+register.coverage.discoveredWorkflows+' provisional workflows / '+register.coverage.completeWorkflowsVerified+' whole workflows complete / '+register.coverage.unmappedEntrySources+' unmapped entry sources. Continue terminal edit and UI recovery, then remaining registered workflows.\n';
for(const file of ['WORKFLOW_MAP.md','FINDINGS_AND_REMEDIATION.md','IMPLEMENTATION_REPORT.md','DESIGN_SYSTEM_AND_UX.md','VERIFICATION.md','ROLLOUT_AND_RECOVERY.md','USER_AND_OPERATOR_GUIDE.md','COMPLETION_AUDIT.md','NEXT_BATCH.md'])fs.appendFileSync(path.join(__dirname,file),note);
fs.writeFileSync(path.join(__dirname,output),JSON.stringify({at:new Date().toISOString(),baseline:'evidence/source-baseline-v124.json',sources:after.sourcesAfter,before:{file:beforeFile,receipt:'9df366'},after:{file:afterFile,receipt:'420e69'},tests:{passed:48,suites:3,receipt:'7f3fd8'},typecheck:{passed:true,receipt:'8d077b'},lint:{passed:true,files:2,receipt:'2ee110'},browser:{status:'not_visited_for_terminal_workflow'},coverage:register.coverage,wholeWorkflowComplete:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,coverage:register.coverage,wholeWorkflowComplete:false}));
