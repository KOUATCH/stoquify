const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), {spawnSync} = require('node:child_process');
const workspace = path.resolve(__dirname, '../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const checkFile = 'evidence/cash-proof-checks-38e16fcc-b952-47e4-b861-3bf95bda6d17.json';
const checkBytes = fs.readFileSync(path.join(__dirname, checkFile)), checks = JSON.parse(checkBytes);
assert.equal(checks.sourceStable, true);
for (const name of ['jest', 'lint']) assert.equal(checks.steps.find(step => step.name === name).status, 0);
for (const [file, expected] of Object.entries(checks.sourceAfter)) assert.equal(hash(fs.readFileSync(path.join(workspace, file))), expected, file);
const pageTest = 'app/[locale]/(dashboard)/dashboard/finance/cash-command/__tests__/page.test.tsx';
const pageLint = spawnSync(process.execPath, ['node_modules/eslint/bin/eslint.js', pageTest], {cwd:workspace, encoding:'utf8', windowsHide:true, timeout:120000});
assert.equal(pageLint.status, 0, pageLint.stdout + pageLint.stderr);
const review = {
  at: new Date().toISOString(), workflow: 'FA-CASH-COMMAND', status: 'In progress', completeWorkflowVerified: false,
  report: 'CASH_COMMAND_PROOF_BOUNDARY_2026-09-27.md',
  receipt: {file:checkFile, sha256:hash(checkBytes)}, sourceHashes:checks.sourceAfter,
  focusedTestsAndLintPassed:true, fullTypecheckPassed:false,
  fullTypecheck:checks.steps.find(step => step.name === 'typecheck'),
  pageTestLint:{status:pageLint.status,stdout:pageLint.stdout,stderr:pageLint.stderr},
  verifiedSubcriteria:[
    'unit_proof_identifiers_authorized_before_discovery', 'unit_module_admission_ordering_and_request_revocation',
    'unit_tenant_period_and_posted_journal_query_contract', 'unit_read_intent_and_propagated_query_failures',
  ],
  remaining:[
    'Critical: authorize all Cash Command domain totals, briefs, risks, trust signals and inherited snapshot metadata; queue filtering alone does not protect them.',
    'Cash Command proof drawer identity, concurrent request order, transport recovery and scope withdrawal require correction and runtime verification.',
    'Current proof-discovery database and EN/FR browser verification remain pending; full TypeScript is blocked by three unrelated accountant-work-desk errors recorded in the receipt.',
  ],
};
const reviewPath = path.join(__dirname, 'evidence/cash-proof-boundary-review-2026-09-27.json');
fs.writeFileSync(reviewPath, JSON.stringify(review,null,2)+'\n', {flag:'wx'});
const generatorPath = path.join(__dirname, 'reconcile-current-progress.cjs');
const original = fs.readFileSync(generatorPath,'utf8'); let source = original.replace(/\r\n/g,'\n');
const anchor = "const currentCashLane = JSON.parse(fs.readFileSync(cashLaneFile, 'utf8'));";
assert.ok(source.includes(anchor));
source = source.replace(anchor, `const cashProof = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-proof-boundary-review-2026-09-27.json')));
if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, cashProof.receipt.file))).digest('hex') !== cashProof.receipt.sha256) throw new Error('Cash proof receipt changed');
const cashProofCurrent = Object.entries(cashProof.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
cashRead.closureReview.verifiedCriteria = cashProofCurrent ? cashProof.verifiedSubcriteria : [];
cashRead.closureReview.note = 'Proof-discovery correction has focused unit/route evidence; aggregate authorization, actual database/browser proof lifecycle and full workflow closure remain open.';
cashRead.closureReview.proofSourceBindingCurrent = cashProofCurrent;
cashRead.implementationStatus = 'partial_proof_discovery_authorization_corrected_aggregate_authorization_pending';
for (const gap of cashProof.remaining) if (!cashRead.remaining.includes(gap)) cashRead.remaining.push(gap);
if (!cashRead.evidence.includes(cashProof.report)) cashRead.evidence.push(cashProof.report);
` + anchor);
source = source.replace('{ status: cashRead.status, closureReview: cashRead.closureReview }', '{ status: cashRead.status, closureReview: cashRead.closureReview, remaining: cashRead.remaining, evidence: cashRead.evidence, implementationStatus: cashRead.implementationStatus }');
source = source.replace('PR-19 and ID-05 closed this checkpoint; PR-10 and AN-DAILY-DIGEST remain verified.', 'No new workflow closed this checkpoint; PR-19, ID-05, PR-10 and AN-DAILY-DIGEST remain verified.');
source = source.replace('| Primary | FA-CASH-COMMAND: reliable finance actions | In progress | Prior currency/null contracts and consumer checks | Full runtime/localization and genuine posted-payroll lifecycle | Engineering | Reconcile retained evidence and exact handoff criteria |', '| Primary | FA-CASH-COMMAND: reliable finance actions | In progress | Proof-discovery authorization and posted-journal query contract; prior currency/null checks | Aggregate authorization, proof recovery, runtime/EN/FR and genuine posted payroll | Engineering | Correct domain projections before cosmetic work |');
const sinceStart = source.indexOf('**Since the previous report:**'); const sinceEnd = source.indexOf('\n\n**Backlog:**', sinceStart);
assert.ok(sinceStart > 0 && sinceEnd > sinceStart);
source = source.slice(0,sinceStart) + '**Since the previous report:** Reproduced unauthorized proof-identifier discovery and corrected permission/module admission before record queries, with posted-only journal selection. Denial and empty results remain distinct, and query failures propagate. All 27 focused tests across four suites and changed-file lint passed. Full TypeScript reported three unrelated accountant-work-desk errors; its failure is retained. The page test import issue was repaired without replacing its real route guard. Source binding for the focused proof checks is ${cashProofCurrent ? "current" : "changed—revalidation required"}. See [bounded correction and remaining defects](CASH_COMMAND_PROOF_BOUNDARY_2026-09-27.md) and its [receipt](evidence/cash-proof-boundary-review-2026-09-27.json). No workflows were added or reopened.\n\n**Priority rationale:** Cash Command still exposes some domain aggregates and metadata without their specific permissions, so that remains the next security correction within the same primary workflow. Multiple proof drawers also share request state. Neither the patch nor the tests establish complete workflow safety. Current database/browser proof and EN/FR evidence remain pending. No migration, deployment or live mutation occurred.' + source.slice(sinceEnd);
const retained = generatorPath + '.retained-' + crypto.randomUUID(); fs.writeFileSync(retained,original,{flag:'wx'});
const pending = generatorPath + '.pending-' + crypto.randomUUID(); fs.writeFileSync(pending,source.replace(/\n/g,'\r\n'),{flag:'wx'}); fs.renameSync(pending,generatorPath);
console.log(JSON.stringify({review:path.relative(workspace,reviewPath),focusedPassed:true,fullTypecheckPassed:false}));
