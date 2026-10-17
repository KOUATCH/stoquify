"use strict";
// Evidence/checkpoint only. No database, migrations, browser, Git mutations or release promotion.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
assert.equal(process.argv[2], '--run');
const root = process.cwd(), run = 'what-next/workflow-modernization/2026-09-05-run-01';
const browserName = process.argv[3]; assert.match(browserName || '', /^fractional-receipt-browser-[a-f0-9-]+\.json$/);
const read = file => fs.readFileSync(path.join(root, file));
const json = file => JSON.parse(read(file));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const writeNew = (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const at = new Date().toISOString(), id = crypto.randomUUID();
const e = name => `${run}/evidence/${name}`, env = name => `${run}/lanes/environment/${name}`;
const unitFile = e('fractional-jest-c2cc1db3-a8fc-44be-9f60-bd67bb88c54c.json');
const lintFile = e('fractional-lint-1a4c33f2-10fb-45cf-bc73-c151bdf95cd9.json');
const typeFile = e('fractional-typecheck-18b7ac8c-e717-446e-901a-c28dc902949c.json');
const dbFile = env('fractional-receipt-valuation-de1bc432-f3cc-4e76-bc0d-f773b45679bc.json');
const retryFile = env('fractional-receipt-valuation-abb869c1-a546-4588-9def-b5cfff50b9cb.json');
const migrationFile = env('fractional-zero-credit-schema-apply-3bc34ffc-6845-4904-af48-450c0e71369a.json');
const browserFile = env(browserName);
const driverPath = env('verify-fractional-receipt-valuation.cjs');
function current(sources, ignored = []) {
  assert.ok(sources && Object.keys(sources).length > 0);
  for (const [file, hash] of Object.entries(sources)) if (!ignored.includes(file)) assert.equal(sha(read(file)), hash, `Current source mismatch: ${file}`);
}
for (const file of [unitFile, lintFile, typeFile]) {
  const value = json(file); assert.equal(value.passed, true); assert.equal(value.exitCode, 0); assert.equal(value.sourceStable, true); current(value.sourceHashes);
}
const unit = json(unitFile); assert.deepEqual(unit.summary, { passed: 402, failed: 0, suites: 18, pending: 0 });
const database = json(dbFile), retry = json(retryFile);
assert.equal(database.sourceStable, true); assert.equal(database.originalUnchanged, true);
assert.equal(database.checks.length, 12); assert.equal(database.checks.filter(c => c.status === 'passed').length, 11);
assert.match(database.checks.find(c => c.status === 'failed').name, /originally zero-value receipt/);
current(database.sourcesAfter, [driverPath]);
assert.equal(retry.passed, true); assert.equal(retry.sourceStable, true); assert.equal(retry.originalUnchanged, true);
assert.equal(retry.checks.length, 1); assert.equal(retry.checks[0].caseId, 'original-zero'); assert.equal(retry.checks[0].status, 'passed'); current(retry.sourcesAfter);
const browser = json(browserFile);
assert.equal(browser.passed, true); assert.equal(browser.sourceStable, true); assert.equal(browser.originalUnchanged, true); current(browser.sourcesAfter);
assert.deepEqual(browser.journeys.map(j => [j.locale, j.width, j.passed]), [['en', 1440, true], ['fr', 320, true]]);
for (const journey of browser.journeys) for (const image of journey.screenshots) assert.equal(sha(read(env(image.file))), image.sha256);
const migration = json(migrationFile); assert.equal(migration.passed, true); assert.equal(migration.applied, true); assert.equal(migration.historyRecorded, true); assert.equal(migration.rehearsalRolledBack, true); assert.deepEqual(migration.before, migration.after);
assert.equal(sha(read('prisma/migrations/20260930231500_supplier_credit_zero_value_evidence/migration.sql')), migration.checksum);
const receiptRefs = [
  [unitFile, '402 tests / 18 suites; current source bindings'], [lintFile, 'Changed-file lint; current source bindings'], [typeFile, 'Existing TypeScript script body; current source bindings'],
  [dbFile, '11 passed cases accepted; original-zero failed driver assertion retained and superseded only by the focused retry'],
  [retryFile, 'One selected original-zero scenario passed; eleven skipped here and not counted again'],
  [browserFile, 'Actual EN desktop / FR mobile recovery, password, stale state, lost response and retained zero-return evidence'],
  [migrationFile, 'Only owned local zero-credit migration; rehearsal, unchanged records and exact history'],
].map(([file, scope]) => ({ file, sha256: sha(read(file)), scope }));
const indexFile = e(`fractional-runtime-index-${id}.json`); writeNew(indexFile, receiptRefs);
const builder = e('build-fractional-source-impact-final.cjs');
const built = spawnSync(process.execPath, [builder, '--write-final', '--runtime-index', indexFile], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(built.status, 0, built.stderr || built.stdout);
const sourceImpact = JSON.parse(built.stdout.trim().split(/\r?\n/).at(-1));
assert.equal(sourceImpact.sourceReviewPassed, true); assert.equal(sha(read(sourceImpact.file)), sourceImpact.sha256);
const registerFile = `${run}/WORKFLOW_REGISTER.json`, originalRegister = read(registerFile);
assert.equal(sha(originalRegister), '1908741e0c7c6ccad9627fd3583ce1fe5ce708c2f6febfbe2d04cd961d0db57c');
const register = JSON.parse(originalRegister), workflow = register.workflows.find(w => w.id === 'FA-CASH-COMMAND'); assert.ok(workflow);
const reviewFile = e(`fractional-receipt-review-${id}.json`), reportFile = `${run}/FRACTIONAL_RECEIPT_VALUATION_2026-10-01.md`;
const review = {
  at, status: 'verified_correction_workflow_open', passed: true, workflow: workflow.id,
  sourceImpact: { file: sourceImpact.file, sha256: sourceImpact.sha256 }, runtimeIndex: { file: indexFile, sha256: sha(read(indexFile)) },
  checks: { focusedTests: 402, suites: 18, lint: 'passed', typecheck: 'passed', databaseScenarios: 12, databaseExecution: 'Eleven passing scenarios in the full run plus one corrected-driver focused rerun; no failed or skipped case silently promoted.', browserJourneys: 2, localMigration: 'applied_and_registered' },
  databaseDriverReview: { earlierHash: database.sourcesAfter[driverPath], currentHash: sha(read(driverPath)), effect: 'Fixes the original-zero reversal response assumption by verifying retained evidence and adds explicit single-case selection. Product and inherited driver dependencies are unchanged between accepted runs; their current hashes were checked.' },
  visualReview: { scope: 'Root visually inspected actual EN desktop and FR320 recovery screenshots; automated checks verify local reflow, keyboard focus and accessible control names. No native screen-reader or comprehensive accessibility certification.' },
  boundaries: ['Owned local database only', 'Synthetic roles, tax arithmetic and rules are not statutory approval', 'No production, live payments, external messages or X1 clearance', 'Legacy allocations are not backfilled or relabeled', 'Complete workflow and full-register reconciliation remain open'],
  failedAttempts: [env('fractional-receipt-valuation-6b6902f6-bb55-4ebc-a02e-e2b2a7516b48.json'), dbFile, e('fractional-typecheck-225c0937-4704-456b-86c6-8737dc9661f8.json')],
  report: reportFile,
};
writeNew(reviewFile, review);
fs.writeFileSync(path.join(root, e(`fractional-register-before-${id}.json`)), originalRegister, { flag: 'wx' });
workflow.implementationStatus = 'versioned_fractional_receipt_return_invoice_credit_and_utc_period_controls';
workflow.runtimeStatus = '402_focused_tests_12_database_scenarios_2_en_fr_recovery_journeys_verified';
workflow.evidence.push(path.basename(reportFile), path.relative(path.join(root, run), path.join(root, reviewFile)).replace(/\\/g, '/'));
workflow.remaining[0] = 'Versioned fractional receipt costs, interleaved invoice/return pools, exact reversals, net/tax credit residuals, zero-journal recovery and UTC period comparisons now have current focused database/browser evidence. Legacy retro-recognition and unproven return credits remain review-blocked. Complete authentic legacy evidence, mixed/nonstock statutory treatment, CASH_DRAWER_CLOSE/EXPENSE_APPROVAL setup and the complete connected lifecycle; no parent workflow closure is implied.';
workflow.remaining[workflow.remaining.length - 1] = 'The exact posting-service drift review passed. Full-register source reconciliation remains incomplete after the fractional/UTC dependency changes. Real close-assessment races, interrupted-process recovery and full lifecycle evidence remain open.';
workflow.closureReview.fractionalReceiptBindingCurrent = true;
workflow.closureReview.completeWorkflowVerified = false;
workflow.closureReview.verifiedCriteria.push(...[
  'fractional_receipt_remaining_pool_conservation_and_exact_non_tail_reversal',
  'actual_stock_projection_and_class3_tieout_with_explicit_zero',
  'actual_invoice_return_pool_interleaving_and_concurrent_retries',
  'actual_credit_net_tax_claim_residuals_and_exact_reversals',
  'actual_zero_credit_missing_closed_period_denial_and_exact_replay',
  'actual_zero_original_receipt_full_return_reversal_without_journals',
  'actual_locked_period_lookup_utc_session_timezone_consistency',
  'zero_return_recovery_en_fr_password_stale_lost_response_and_history',
]);
register.updatedAt = at;
register.coverage.statusCounts = Object.fromEntries(Object.keys(register.coverage.statusCounts).map(status => [status, register.workflows.filter(w => w.status === status).length]));
register.sourceReconciliation = { ...register.sourceReconciliation, current: false, evidence: path.relative(path.join(root, run), path.join(root, reviewFile)).replace(/\\/g, '/'), interpretation: 'The fractional receipt correction has current source-bound runtime evidence; exact posting-service drift was reviewed. Full-register reconciliation has not been rerun for all changed dependencies, so historical closures are not freshly recertified.' };
fs.writeFileSync(path.join(root, registerFile), JSON.stringify(register, null, 2) + '\n');
const registerHash = sha(read(registerFile));
const progress = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479 on codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: ${registerHash}. The fractional receipt correction has current source-bound evidence; full-register reconciliation remains incomplete.

**Position:** ${register.workflows.length} discovered workflows; discovery incomplete; ${register.coverage.unmappedEntrySources} unmapped source entries. Recorded statuses: Queued 265, In progress 1, Complete—verified 4; all others zero. Prior closures remain historical pending full reconciliation. No new workflow closed or was reclassified.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: reliable finance actions | In progress | Fractional source/stock/accounting conservation and UTC period lookup | Legacy treatment, complete close/payroll handoffs, accessibility, representative latency | Engineering/accounting | Reconcile remaining lifecycle criteria against the closure checklist |
| Supporting | Receipt/invoice accounting | In progress | Exact returns/credits/reversals, zero outcomes, net/tax residuals, EN/FR recovery | Authentic legacy evidence, mixed/nonstock treatment, full downstream lifecycle | Engineering | Resolve the next evidence-backed source treatment |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior source/correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards and improve diagnostics |

**Since the previous report:** Fractional returns now consume a verified remaining-value pool; the final draw takes the exact residual. Stock, rebuilds and accounting use the same explicit value, including zero. Exact reversals retain original amounts. Credits independently conserve commercial net/tax and inventory claims; verified zero credits preserve quantity without fake journals. New credits/reversals retain period controls. Receipt recovery explains no-journal outcomes in EN/FR and survives stale previews, password verification, a lost response and reload.

**Verified:** 402 tests/18 suites, changed-file lint, TypeScript, twelve owned-database scenarios across a full run and one focused rerun, and EN1440/FR320 application journeys. Current source bindings and outside-fixture records remained unchanged. Only the reviewed local zero-credit migration was applied, with rollback rehearsal and exact history. [Milestone, evidence and operating guidance](FRACTIONAL_RECEIPT_VALUATION_2026-10-01.md).

**Failures and follow-up:** Database verification exposed a timezone coercion defect in the locked period query; explicit UTC comparison fixed it while preserving row locks. The initial missing-month hypothesis was disproved. Type errors and one incorrect driver response assertion were corrected; failed evidence remains retained. No new workflow was discovered or reopened. Authentic legacy evidence, setup applicability, full close/payroll proof, CNPS/IRPP expert provenance, native accessibility and representative latency remain open. No production deployment, real payment, external message or simulated X1 clearance occurred. All 17 families remain in the [register](WORKFLOW_REGISTER.json). ETA remains unreliable while discovery and full validation are incomplete.
`;
assert.ok(progress.trim().split(/\s+/).length <= 700);
fs.writeFileSync(path.join(root, `${run}/CURRENT_PROGRESS.md`), progress);
writeNew(e(`fractional-register-followup-${id}.json`), { at, before: sha(originalRegister), after: registerHash, review: { file: reviewFile, sha256: sha(read(reviewFile)) }, statusCounts: register.coverage.statusCounts, completeWorkflowVerified: false, fullReconciliationCurrent: false, currentProgressSha256: sha(read(`${run}/CURRENT_PROGRESS.md`)) });
console.log(JSON.stringify({ reviewFile, sourceImpact: sourceImpact.file, registerHash, statusCounts: register.coverage.statusCounts, currentProgressWords: progress.trim().split(/\s+/).length }));
