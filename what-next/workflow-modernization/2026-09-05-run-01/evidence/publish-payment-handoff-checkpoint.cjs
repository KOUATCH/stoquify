// Publish only current, source-bound verification. No application or database writes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const run = path.resolve(__dirname, '..'), root = path.resolve(run, '../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
if (!['--run', '--prepare'].includes(process.argv[2])) { console.log('Prepared only: supply Jest, typecheck, lint and runtime receipt paths relative to this run.'); process.exit(0); }
const supplied = process.argv.slice(3); assert.ok(supplied.length === 4 || supplied.length === 5);
const source = {}, receipts = {};
function inspect(relative, requirePass) {
  const file = path.resolve(run, relative); assert.ok(file.startsWith(run + path.sep));
  const bytes = fs.readFileSync(file), value = JSON.parse(bytes); receipts[relative] = sha(bytes);
  if (requirePass) assert.equal(value.passed, true, relative);
  assert.equal(value.sourceStable, true, relative);
  const before = value.sourceBefore || value.sourcesBefore, after = value.sourceAfter || value.sourcesAfter;
  assert.deepEqual(before, after, relative);
  for (const [name, hash] of Object.entries(after)) {
    assert.equal(sha(fs.readFileSync(path.join(root, name))), hash, name);
    if (source[name]) assert.equal(source[name], hash); source[name] = hash;
  }
  return value;
}
const testPath = supplied[0];
const tests = inspect(testPath, true); assert.equal(tests.summary.passed, 330); assert.equal(tests.summary.failed, 0);
const types = inspect(supplied[1], true), lint = inspect(supplied[2], true), runtime = inspect(supplied[3], false);
assert.equal(types.phase, 'typecheck'); assert.equal(lint.phase, 'lint');
assert.equal(runtime.outsideUnchanged, true);
const count = runtime.checks.filter(row => row.status === 'passed').length;
const browser = supplied[4] ? inspect(supplied[4], false) : null;
if (browser) assert.equal(browser.outsideUnchanged, true);
const browserSummary = browser ? (browser.passed ? 'Both EN/FR browser journeys passed' : `${browser.journeys.filter(row => row.passed).length}/2 browser journeys passed; remaining browser criteria stay open`) : 'Browser verification remains open';
const registerPath = path.join(run, 'WORKFLOW_REGISTER.json'), progressPath = path.join(run, 'CURRENT_PROGRESS.md');
const before = fs.readFileSync(registerPath), previousProgress = fs.readFileSync(progressPath);
assert.equal(sha(before), '7748820483c36b7777959629f6c0bb6d1e9d9f848d9478e42aa2af86d457d955');
assert.equal(sha(previousProgress), '9d49cd2e2f449fdbc314eff7c2de618ac11cbf8fddf35df460f7c3c59b5f17cd');
const register = JSON.parse(before), id = crypto.randomUUID(), at = new Date().toISOString();
assert.equal(register.workflows.length, 270);
const report = 'SUPPLIER_PAYMENT_RECONCILIATION_HANDOFF_2026-10-01.md';
const remaining = `Supplier-payment handoff implemented with focused checks; ${count}/5 cash runtime checks passed, complete runtime=${runtime.passed === true}. ${browserSummary}. Historical missing-evidence request/response UI integration, bank import provenance and actual bank lifecycle, cross-payment contention, complete accessibility, and the original four purchase/Close recovery criteria remain open. See ${report}.`;
for (const workflow of register.workflows.filter(row => ['FA-CASH-COMMAND', 'FA-CLOSE-PACK', 'PA-023', 'PA-031'].includes(row.id))) {
  workflow.evidence = [...(workflow.evidence || []), report, ...supplied];
  workflow.remaining = (workflow.remaining || []).map(text => text.includes('supplier-payment reconciliation handoff remains unimplemented') || text.includes('Complete the source-owned supplier-payment to reconciliation admission') ? remaining : text);
  if (!workflow.remaining.includes(remaining)) workflow.remaining.push(remaining);
  workflow.supplierPaymentHandoff = { updatedAt: at, report, focusedTests: 330, runtimePassedChecks: count, runtimeComplete: runtime.passed === true, browserPassed: browser?.passed === true, workflowClosure: false };
}
register.updatedAt = at;
const counts = Object.fromEntries(['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'].map(status => [status, register.workflows.filter(row => row.status === status).length]));
assert.deepEqual(counts, { Queued: 264, 'In progress': 2, 'Verification pending': 0, 'Blocked—engineering': 0, 'Blocked—external': 0, 'Complete—verified': 4 });
const next = Buffer.from(JSON.stringify(register, null, 2) + '\n'), hash = sha(next);
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${hash}. Shared changes preserved.

**Position:** 270 workflows / 17 families; discovery incomplete, 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; all other statuses zero. No new workflow closure or denominator change. Previous turn was progress through implementation and verification; other historical closures were not broadly revalidated.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Journal/delivery proof; actual cash evidence recovery | All producers, authority and full lifecycle | Engineering; earlier manual-period approval outstanding | Connect historical-evidence request/response UI |
| Supporting | FA-CLOSE-PACK: reliable retained evidence | In progress | Validated cash-review consumer; ${count}/5 cash runtime checks | Recovery UI, bank provenance, original recovery, global scope | Engineering | Verify complete user recovery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and full recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards and improve diagnostics |

**Since the previous report:** Implemented source-owned supplier-payment evidence proposals, independent decisions, withdrawal, history and EN/FR UI. Cash review preserves the original journal/payment and resolves only the original obligation. Invalid proof fails Data Trust/Close reads. Reconciliation matchers now reject an obsolete payment changed during a provider-lock wait. Password verification requires deliberate confirmation; lost-response requests and drafts are retained.

**Verification:** 330 focused tests / 13 suites, no-emit TypeScript and changed-file lint passed with stable sources; lint retains one ref-cleanup warning. Cash runtime: ${count}/5 checks passed; overall ${runtime.passed ? 'passed' : 'not passed'}. ${browserSummary}. Outside-fixture observations stayed unchanged. Withdrawal invalidations now bind the retained decision hash. Recovery exercises independent acceptance of replacement evidence while preserving the historical missing record; a new assessment alone correctly leaves that obligation open. Failed attempts remain documented. [Detailed implementation, results and operating guide](${report}). This does not establish complete workflow, statutory, security or release certification.

**Remaining:** Historical missing-evidence request/response actions lack UI callers; service recovery is not complete user recovery. Bank import/provenance, actual bank finalization, concurrent evidence reuse, ${browser?.passed ? 'complete accessibility' : 'EN/FR browser completion'} and original purchase/Close recovery remain open. Earlier all-period manual-posting helper was rejected by automatic approval review for contention and remains unapplied pending the existing approval request. Other writers, draft freshness, manual-session/legacy-role authority, signing/publication races, interrupted delivery and capacity remain required.

All 17 families and other queued requirements remain in the [register](WORKFLOW_REGISTER.json): identity/access/modules, finance/ledger/close, sales/POS, inventory/purchasing, payroll, compliance/evidence/reporting, notifications/integrations and AI. PA-023/PA-031 remain connected queued dependencies. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const backup = path.join(run, 'evidence', 'payment-handoff-checkpoint-' + id); fs.mkdirSync(backup);
fs.writeFileSync(path.join(backup, 'WORKFLOW_REGISTER.json'), before, { flag: 'wx' });
fs.writeFileSync(path.join(backup, 'CURRENT_PROGRESS.md'), previousProgress, { flag: 'wx' });
const receipt = { at, receipts, source, counts, cashChecksPassed: count, cashRuntimePassed: runtime.passed === true, workflowClosures: 0, registerBefore: sha(before), registerAfter: hash, progressAfter: sha(Buffer.from(progress)) };
fs.writeFileSync(path.join(backup, 'NEXT_WORKFLOW_REGISTER.json'), next, { flag: 'wx' });
fs.writeFileSync(path.join(backup, 'NEXT_CURRENT_PROGRESS.md'), progress, { flag: 'wx' });
if (process.argv[2] === '--prepare') {
  fs.writeFileSync(path.join(backup, 'prepared-publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ prepared: backup, registerHash: hash, progressHash: receipt.progressAfter, counts }));
  process.exit(0);
}
fs.writeFileSync(registerPath, next); fs.writeFileSync(progressPath, progress);
fs.writeFileSync(path.join(backup, 'publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ publication: path.join(backup, 'publication.json'), registerHash: hash, counts, cashChecksPassed: count }));
