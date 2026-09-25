const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));
const output='evidence/terminal-edit-v125.json';assert.ok(!fs.existsSync(path.join(__dirname,output)));
const browserName=process.argv[2];assert.match(browserName,/^terminal-browser-v125-[a-f0-9-]+\.json$/);
const browserFile='lanes/environment/'+browserName,browser=read(browserFile),baseline=read('evidence/source-baseline-v125.json');
assert.ok(browser.passed&&browser.sourceStable&&browser.browser.length===2&&browser.browser.every(row=>row.portalThemeBound&&row.dialogFocusContained&&row.correctedDraftSaved&&row.archiveDenialRetainsDialog&&row.keyboardIdleArchivePersisted&&!row.pageErrors.length&&row.screenshots.length===3));
for(const [file,digest]of Object.entries(browser.sourcesAfter)){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),digest);
 assert.equal(baseline.sources.find(row=>row.path===file)?.sha256,digest);
}
const laneFile='lanes/pos-offline/WORKFLOW_REGISTER.json',lane=read(laneFile);
for(const workflow of lane.workflows.filter(row=>['POS-TERMINAL-UPDATE','POS-TERMINAL-ARCHIVE'].includes(row.id))){
 workflow.implementationStatus='transactional_edit_and_archive_claim_with_localized_retained_recovery';
 workflow.reviewStatus='source_owned_postgres_and_actual_en_fr_browser';
 workflow.runtimeStatus='partial_concurrency_history_rollback_edit_correction_archive_denial_and_success_verified';
 workflow.evidence.push('../../TERMINAL_EDIT_V125.md','../../'+output);
 workflow.remaining=['Stale form revision conflicts, current actor-scoped management cache, complete module/read-only/role change checks, creation/history journeys and native accessibility remain open.'];
}
lane.evidenceDate=new Date().toISOString();fs.writeFileSync(path.join(__dirname,laneFile),JSON.stringify(lane,null,2)+'\n');
execFileSync(process.execPath,[path.join(__dirname,'update-workflow-register.cjs')],{cwd:root,stdio:'pipe',windowsHide:true});
const register=read('WORKFLOW_REGISTER.json');
const note='\n\n## v125 — Terminal edit integrity and EN/FR recovery\n\nReproduced and corrected concurrent edit/deactivation, relocation of active/historical stations and silent reactivation from omitted fields. Serializable edits include drawer preparation; controlled failure rolls everything back and explicit retry creates one drawer. Actual EN/FR dialogs preserve rejected edits, save corrected input, retain archive denial and perform keyboard-confirmed idle deactivation. Fixed a disappearing row menu and a portal theme defect found during browser/visual review. [Guide and review](TERMINAL_EDIT_V125.md), [evidence](evidence/terminal-edit-v125.json). 51 focused tests / four suites and real PostgreSQL before/after checks passed. Final browser has six desktop/tablet/mobile screenshots and bounded focus checks; native accessibility is not certified. No migration, payment or deployment.\n\nCoverage: '+register.coverage.discoveredWorkflows+' provisional workflows / '+register.coverage.completeWorkflowsVerified+' whole workflows complete / '+register.coverage.unmappedEntrySources+' unmapped entry sources. Continue stale-form handling, management access/cache consistency and remaining platform workflows.\n';
for(const file of ['WORKFLOW_MAP.md','FINDINGS_AND_REMEDIATION.md','IMPLEMENTATION_REPORT.md','DESIGN_SYSTEM_AND_UX.md','VERIFICATION.md','ROLLOUT_AND_RECOVERY.md','USER_AND_OPERATOR_GUIDE.md','COMPLETION_AUDIT.md','NEXT_BATCH.md'])fs.appendFileSync(path.join(__dirname,file),note);
fs.writeFileSync(path.join(__dirname,output),JSON.stringify({at:new Date().toISOString(),baseline:'evidence/source-baseline-v125.json',sources:browser.sourcesAfter,tests:{passed:51,suites:4,receipt:'62ba83'},typecheck:{passed:true,receipt:'a9d03f'},lint:{passed:true,files:5,receipts:['fb2408','26807f']},database:{before:'lanes/environment/terminal-edit-v125-before-362fad36-9423-4ecc-ac71-06dd56737771.json',after:'lanes/environment/terminal-edit-v125-after-ca3469ad-00d8-4ff4-b09b-e8ec2ebd32cb.json',receipts:['5b24d0','ca2737']},browser:{file:browserFile,receipt:'c3dbc4',...browser},verificationDetails:'TERMINAL_EDIT_V125.md',coverage:register.coverage,wholeWorkflowComplete:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,coverage:register.coverage,wholeWorkflowComplete:false}));
