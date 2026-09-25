const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const output = 'evidence/pos-read-v123.json'; assert.ok(!fs.existsSync(path.join(__dirname, output)));
const baseline = read('evidence/source-baseline-v123.json');
const browserFile = 'lanes/environment/pos-read-browser-v123-97d99b70-87f9-42b0-b6f2-8857119a698e.json', browser = read(browserFile);
assert.ok(browser.passed && browser.sourceStable && browser.browser.every(row => row.retryPreservesUnsavedQuantity && !row.pageErrors.length));
for (const [file, digest] of Object.entries(browser.sourcesAfter)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), digest);
  assert.equal(baseline.sources.find(row => row.path === file)?.sha256, digest);
}
const laneFile = 'lanes/pos-offline/WORKFLOW_REGISTER.json', lane = read(laneFile);
for (const workflow of lane.workflows.filter(row => ['POS-CATALOG','POS-CART','POS-SHIFT-OPEN','POS-SHIFT-CLOSE','POS-RECEIPT-ACCESS'].includes(row.id))) {
  workflow.evidence.push('../../POS_READ_V123.md', '../../'+output);
  workflow.readStateReview = {serverScope:true,currentPermission:true,failedReadsExplicit:true,wholeWorkflowComplete:false};
  if (workflow.id === 'POS-CART' || workflow.id === 'POS-CATALOG') workflow.runtimeStatus = 'partial_en_fr_scoped_reads_transport_failure_recovery_and_retained_quantity_verified';
  workflow.remaining = workflow.remaining.map(text => text.replace('scoped query cache and honest failed-read states; ', ''));
}
lane.evidenceDate = new Date().toISOString();
fs.writeFileSync(path.join(__dirname,laneFile), JSON.stringify(lane,null,2)+'\n');
execFileSync(process.execPath,[path.join(__dirname,'update-workflow-register.cjs')],{cwd:root,stdio:'pipe',windowsHide:true});
const register = read('WORKFLOW_REGISTER.json');
const note = '\n\n## v123 — Current POS read scope and recoverable failure\n\nTen POS reads now bind server responses and cache entries to the current tenant/actor and current permissions. Required read failures block checkout instead of claiming an empty cart or closed shift. Real EN/FR transport-failure recovery preserves entered quantities; explicit correction persists them. See [review and guide](POS_READ_V123.md) and [source-bound evidence](evidence/pos-read-v123.json). 56 distinct focused tests / seven suites, production typecheck, changed-file lint and owned browser checks passed. No payment, journal, migration or deployment.\n\nCoverage: '+register.coverage.discoveredWorkflows+' provisional workflows / '+register.coverage.completeWorkflowsVerified+' whole workflows complete / '+register.coverage.unmappedEntrySources+' unmapped entry sources. Terminal concurrency, module/read-only consistency, unknown-outcome cart additions, full checkout/refund/void/offline and remaining platform workflows require continued implementation and verification.\n';
for(const file of ['WORKFLOW_MAP.md','FINDINGS_AND_REMEDIATION.md','IMPLEMENTATION_REPORT.md','DESIGN_SYSTEM_AND_UX.md','VERIFICATION.md','ROLLOUT_AND_RECOVERY.md','USER_AND_OPERATOR_GUIDE.md','COMPLETION_AUDIT.md','NEXT_BATCH.md']) fs.appendFileSync(path.join(__dirname,file),note);
fs.writeFileSync(path.join(__dirname,output),JSON.stringify({at:new Date().toISOString(),baseline:'evidence/source-baseline-v123.json',sources:browser.sourcesAfter,tests:{passed:56,suites:7,receipts:['630a8a','9b514d'],before:'7658de',intermediateFailures:['07ff85','31188f','13d281']},typecheck:{passed:true,receipt:'c38517',scope:'Final production source; added revocation test subsequently verified by Jest/lint'},lint:{passed:true,receipts:['ed0de2','9b514d'],files:15},browser:{file:browserFile,receipt:'f04ef4',...browser},coverage:register.coverage,selectedSkill:'007-aqstoqflow-pos-ledger-controls',wholeWorkflowComplete:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,coverage:register.coverage,wholeWorkflowComplete:false}));
