// Freeze one reviewed milestone only after all three current evidence receipts pass.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const run = __dirname, root = path.resolve(run, '../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8').replace(/^\uFEFF/, ''));
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const args = process.argv.slice(2); ensure(args.length === 3, 'Pass exact combined-check, database and browser receipt paths relative to the run directory.');
for (const file of args) ensure(!path.isAbsolute(file) && !file.split(/[\\/]/).includes('..'), 'Receipt must be within this run directory.');
const [checks, database, browser] = args.map(read);
ensure(checks.passed && checks.sourceStable && checks.steps.length === 3 && checks.steps.every(step => step.status === 0 && step.sourceStable), 'Combined verification must pass.');
ensure(database.passed && database.sourceStable && database.originalUnchanged && database.checks.length === 14 && database.checks.every(row => row.status === 'passed'), 'All 14 actual database checks must pass.');
ensure(browser.passed && browser.sourceStable && browser.originalUnchanged && browser.journeys.length === 6 && browser.journeys.every(row => row.passed), 'All six actual browser journeys must pass.');
const sourceHashes = {};
for (const bindings of [checks.sourceAfter, database.sourcesAfter, browser.sourcesAfter]) for (const [file, expected] of Object.entries(bindings)) {
  ensure(typeof expected === 'string', 'Invalid source binding: ' + file);
  ensure(!sourceHashes[file] || sourceHashes[file] === expected, 'Evidence source mismatch: ' + file);
  ensure(hash(fs.readFileSync(path.join(root, file))) === expected, 'Current source changed: ' + file);
  sourceHashes[file] = expected;
}
const receiptPaths = new Set(args);
for (const step of checks.steps) for (const row of [step.log, step.receipt].filter(Boolean)) {
  ensure(hash(fs.readFileSync(path.join(run, row.file))) === row.sha256, 'Check artifact changed: ' + row.file); receiptPaths.add(row.file);
}
for (const journey of browser.journeys) for (const row of journey.screenshots) {
  const file = 'lanes/environment/' + row.file;
  ensure(hash(fs.readFileSync(path.join(run, file))) === row.sha256, 'Screenshot changed: ' + file); receiptPaths.add(file);
}
const impactFile = 'evidence/operational-receipt-prior-impact-2026-09-30.json', impact = read(impactFile);
const priorImpact = impact.priorImpact;
ensure(Array.isArray(priorImpact) && priorImpact.length > 0, 'Explicit reviewed predecessor map required.');
for (const row of priorImpact) ensure(sourceHashes[row.file] === row.after, 'Reviewed impact does not match verified source: ' + row.file);
const previous = read('evidence/receipt-capacity-review-2026-09-30.json');
const remaining = [
  'Operational source-bound receipt accounting, partial invoices, return recovery and funded supplier credit now have current focused database/browser proof. Fractional independently rounded return costs still need a cumulative stock/source allocation contract. Legacy retro-recognition and unproven return credit remain review-blocked. Complete mixed/nonstock statutory treatment, CASH_DRAWER_CLOSE/EXPENSE_APPROVAL setup and connected lifecycle closure.',
  ...previous.remaining.filter(value => !value.startsWith('Receipt stock replay') && !value.startsWith('Visual inspection of the EN desktop')),
];
const report = 'OPERATIONAL_RECEIPT_ACCOUNTING_2026-09-30.md';
const artifactPaths = [report, impactFile, 'evidence/operational-receipt-first-attempt-2026-09-30.md', 'evidence/close-assurance-test-bridge-review-620ad18c-3249-43ba-b601-5c93e2b45be7.json'];
const record = {
  at: new Date().toISOString(), passed: true, workflow: 'FA-CASH-COMMAND', status: 'In progress', report,
  verificationSummary: { tests: checks.steps.find(row => row.name === 'jest').results.passed, suites: checks.steps.find(row => row.name === 'jest').results.passedSuites, lintFiles: checks.steps.find(row => row.name === 'lint').results.files, lintErrors: checks.steps.find(row => row.name === 'lint').results.errors, lintWarnings: checks.steps.find(row => row.name === 'lint').results.warnings, typecheckPassed: checks.steps.find(row => row.name === 'typecheck').status === 0, databaseScenarios: database.checks.length, browserJourneys: browser.journeys.length },
  sourceHashes, priorImpact, newSources: impact.newSources,
  receipts: [...receiptPaths].map(file => ({ file, sha256: hash(fs.readFileSync(path.join(run, file))) })),
  artifacts: artifactPaths.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(run, file))) })),
  verifiedSubcriteria: ['receipt_operational_whole_source_and_acceptance_date', 'receipt_currency_and_no_duplicate_invoice_accrual', 'receipt_atomic_return_accounting_recovery', 'receipt_recovery_current_authority_stale_and_concurrent_retry', 'return_actual_accrual_claim_allocation_and_exact_reversal', 'supplier_credit_requires_funded_return_claim', 'receipt_recovery_en_fr_password_lost_response_and_history', 'invoice_dialog_local_reflow', 'receiving_tracking_revision_lock_order_and_retained_currency'],
  remaining,
  limitations: ['Synthetic owned local setup is not statutory approval, a customer activation or production certification.', 'Four historical workflow closures are not upgraded by this correction; full register reconciliation is separate.', 'Fractional return residual allocation and authentic legacy reconciliation remain engineering work.'],
};
const file = 'evidence/operational-receipt-review-2026-09-30.json';
fs.writeFileSync(path.join(run, file), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file, sha256: hash(fs.readFileSync(path.join(run, file))), sources: Object.keys(sourceHashes).length, artifacts: record.artifacts.length, receipts: record.receipts.length }));
