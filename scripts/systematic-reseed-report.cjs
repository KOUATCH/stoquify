#!/usr/bin/env node
// Assemble a sanitized evidence index after the execution and verification stages.
const fs=require('fs');
const path=require('path');
const {OUT,RUN,save}=require('./systematic-reseed-local.cjs');
const read=name=>JSON.parse(fs.readFileSync(path.join(OUT,name),'utf8'));
const profile=read('source-final-profile.json');
const preservation=read('source-final-preservation-check.json');
const checks=read('checks/source/results.json');
const browser=read('source-browser-results.json');
const business=read('assurance/source-business-invariants.json');
const gates=read('assurance/gate-execution-results.json');
const reference=read('source-reference.json').result;
const manifest={
 generatedAt:new Date().toISOString(),datasetVersion:RUN,referenceDate:'2026-09-27',minimumPerItem:'1500.000',
 overallStatus:'APPLIED_WITH_RECORDED_BLOCKERS',productionCertified:false,
 commit:'62a56036a5ac9b37236a20c9b148052199069479',
 target:profile.target,candidate:'stoquify_reseed_local_20260927_1500',smoke:'stoquify_reseed_smoke_local_20260927',applicationDatabaseSettingChanged:false,
 executionEntryPoint:'scripts/run-systematic-reseed.cjs --apply --source --stage <reference|scenarios|financial|inventory>',
 sourceStages:['reference','scenarios','financial','inventory'].map(stage=>{const r=read('source-'+stage+'.json');return {stage,startedAt:r.startedAt,finishedAt:r.finishedAt,artifact:'source-'+stage+'.json'};}),
 backupRestore:read('backup-restore.json'),
 stock:profile.stock,physicalTables:profile.tableCount,sourceSnapshotRows:profile.totalRows,
 preservation:{passed:preservation.passed,tables:preservation.tables,artifact:'source-final-preservation-check.json'},
 access:{rolesAdded:reference.roles.filter(r=>r.status==='added').length,personasAdded:reference.personas.filter(r=>r.status==='added').length,secretValuesPublished:false,credentialsArtifact:'.seed-artifacts/'+RUN+'/source-verified-credentials.json'},
 integrityArtifact:'source-final-integrity.json',ledgerArtifact:'source-inventory-canonical-reconciliation.json',
 sourceChecks:checks,browser,
 isolatedPosSmoke:read('isolated-pos-smoke-rerun.json'),
 rerun:read('rerun-verification.json'),
 typecheck:read('typecheck-result.json'),
 businessInvariants:business.results.map(r=>({id:r.id,status:r.status,findingCount:r.findingCount})),
 staticGates:gates.gates.map(g=>({gate:g.gate,exitCode:g.exitCode,blockers:g.blockers})),
 focusedTestEvidence:['inventory-focused-tests.json','inventory-ui-focused-tests.json','assurance/financial-repair-test-results.md','assurance/role-cockpit-gate-repair-results.md','assurance/purchasing-ap-gate-repair-results.md','reference-and-smoke-tests.json'],
 completeReadinessBlockedBy:['24 historical receipt-source discrepancies','24 protected sales fixtures with line arithmetic and header/line tax inconsistencies','48 legacy stock movements missing business-event evidence','192 legacy generic JSON payload fields','product tax classification and preserved role permission conflicts','real statutory source-artifact expert approval','remaining unexecuted lifecycle and accessibility/localization coverage'],
 handover:'HANDOVER.md',coverage:'assurance/schema-coverage.json',reviewers:'assurance/REVIEWER_MATRIX.md',runbook:'assurance/RESEED_RUNBOOK.md',
 unrelatedWorkingTreeChangesPreserved:true,
};
save(path.join(OUT,'execution-manifest.json'),manifest);
console.log(JSON.stringify({status:manifest.overallStatus,stock:manifest.stock,preservation:preservation.passed,checksPassed:checks.every(c=>c.exitCode===0),browserPassed:browser.results.every(r=>r.status==='PASS'),typecheck:manifest.typecheck.exitCode,report:'HANDOVER.md'}));
