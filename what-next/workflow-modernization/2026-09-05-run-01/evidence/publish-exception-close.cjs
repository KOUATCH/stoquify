'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const mode = process.argv[2];
if (!['--publish', '--finalize'].includes(mode)) { console.log('Inert; --publish prepares the local checkpoint; --finalize verifies the applied progress document.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = 'EXCEPTION_CLOSE_2026-10-04.md';
const names = {
  jest: 'evidence/exception-close-jest-8bc50190-cd55-4c9e-b075-f1a11903fc83.json',
  typecheck: 'evidence/exception-close-typecheck-19e956be-566c-4ad7-a49d-bc296f26f49f.json',
  lint: 'evidence/exception-close-lint-3ac55df2-9a89-487e-9650-61db64e9c8fe.json',
  runtime: 'lanes/environment/exception-close-acceptance-1ee541d6-a573-40d6-a0be-70e992db5aa2.json',
  duplicate: 'lanes/environment/exception-close-duplicate-732f7106-b0ab-4733-b94e-c446ded8f39d.json',
};
const bindings = {}, receipts = {};
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(dir, name)), value = JSON.parse(bytes);
  bindings[name] = sha(bytes); receipts[key] = value;
  assert.equal(value.passed, true); assert.equal(value.sourceStable, true);
  const sources = value.sourcesAfter || value.sourceAfter; assert.ok(Object.keys(sources).length > 0);
  for (const [file, hash] of Object.entries(sources)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Changed source: ' + file);
}
assert.deepEqual(receipts.jest.summary, { passed: 248, failed: 0, pending: 0, suites: 10, failedSuites: 0 });
assert.equal(receipts.runtime.checks.length, 10); assert.ok(receipts.runtime.checks.every(check => check.passed));
assert.equal(receipts.runtime.financialAndAllocationsUnchanged, true); assert.equal(receipts.runtime.outsideUnchanged, true);
assert.equal(receipts.duplicate.outsideUnchanged, true); assert.equal(receipts.duplicate.result.financialUnchanged, true);
assert.equal(receipts.duplicate.result.singleReceiptAndApproval, true); assert.equal(receipts.duplicate.result.changedDecisionRefusedWithoutEffects, true);
for (const name of [report, 'EXCEPTION_CLOSE_CHECKLIST_2026-10-04.md', 'lanes/environment/exception-close-baseline-f5ff444d-a4b1-4e89-9f9a-38f43679351b.json', 'lanes/environment/exception-close-baseline-dedf1466-073b-4090-90c7-48ef3c23e253.json']) bindings[name] = sha(fs.readFileSync(path.join(dir, name)));
const priorName = 'lanes/environment/reconciliation-producer-close-acceptance-8d5e9fc4-2a23-4610-afcd-4cec704963e1.json';
const prior = JSON.parse(fs.readFileSync(path.join(dir, priorName)));
const priorChanged = Object.entries(prior.sourcesAfter).filter(([file, hash]) => sha(fs.readFileSync(path.join(root, file))) !== hash).map(([file]) => file);
assert.deepEqual(priorChanged, []);
const registerFile = path.join(dir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(dir, 'CURRENT_PROGRESS.md');
const beforeHash = '255f4bffc4c628969b0b53565b804dc656699fe3744a14a03ef17e1ce4a5ad6c';
const progressBeforeHash = '0316e63d43a7999aecc78d45b567702cb33e168a53a278b3bdf2777c187f7f11';
function validateRegister(r) {
  const counts = {}; for (const row of r.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
  assert.equal(r.workflows.length, 270); assert.equal(r.families.length, 17); assert.equal(r.discoveryComplete, false); assert.equal(r.coverage.unmappedEntrySources, 191);
  assert.deepEqual(counts, { Queued: 264, 'Complete—verified': 4, 'In progress': 2 }); return counts;
}
if (mode === '--finalize') {
  const out = path.resolve(process.argv[3]);
  assert.equal(path.dirname(out), __dirname); assert.ok(path.basename(out).startsWith('exception-close-checkpoint-'));
  const pending = JSON.parse(fs.readFileSync(path.join(out, 'register-publication.json')));
  assert.deepEqual(pending.bindings, bindings);
  assert.equal(sha(fs.readFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'))), beforeHash);
  assert.equal(sha(fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'))), progressBeforeHash);
  const register = fs.readFileSync(registerFile), progress = fs.readFileSync(progressFile);
  assert.equal(sha(register), pending.registerAfter);
  // apply_patch can normalize newlines; bind the exact applied bytes below.
  assert.equal(progress.toString().replace(/\r\n/g, '\n'), fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.next.md'), 'utf8'));
  assert.ok(progress.toString().split(/\s+/).length <= 700);
  const r = JSON.parse(register), counts = validateRegister(r);
  for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
    const row = r.workflows.find(row => row.id === id);
    assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false); assert.equal(row.closureReview.exceptionClosePublicationCurrent, true);
  }
  const publication = { ...pending, finalizedAt: new Date().toISOString(), progressAfter: sha(progress), counts, passed: true };
  fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash: pending.registerAfter, progressHash: publication.progressAfter, counts, passed: true }));
  process.exit(0);
}
const before = fs.readFileSync(registerFile), progressBefore = fs.readFileSync(progressFile);
assert.equal(sha(before), beforeHash); assert.equal(sha(progressBefore), progressBeforeHash);
const r = JSON.parse(before), counts = validateRegister(r), at = new Date().toISOString();
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const row = r.workflows.find(row => row.id === id);
  assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false);
  row.closureReview.exceptionClosePublicationCurrent = true;
  row.closureReview.exceptionClosePublication = { at, report, runtimeReceipt: names.runtime, duplicateReceipt: names.duplicate, sourceFiles: Object.keys(receipts.runtime.sourcesAfter).length, reproducedDefects: 2, runtimeCases: 11, allTenantPeriods: true, financialAndAllocationsUnchanged: true, retainedExports: true, workflowClosure: false };
  row.closureReview.exceptionCloseSourceImpact = 'Previous reconciliation producer runtime source bindings remain unchanged. Current exception approval/withdrawal proof adds full scope, actual races and retained history; it does not claim all older scenarios were rerun or close/reopen a parent workflow.';
  row.closureReview.verifiedCriteria.push('Exception approval and signed-source withdrawal Close invalidation gaps reproduced and corrected: complete tenant period ordering, obsolete collector discard, whole-transaction snapshot retry, both actual PostgreSQL lock orders, post-wait authentication, source/reviewer/tenant/revision refusal, late rollback/retry, concurrent duplicate/conflicting decision, retained signature/export history, unchanged financial/allocation and outside-fixture records.');
  row.evidence = [...new Set([...row.evidence, report, ...Object.values(names)])];
  row.remaining = row.remaining.map(text => text
    .replace('exception decisions, manual allocation and provider ingestion remain to be verified against the same collector.', 'exception approval and signed-source withdrawal now have scoped verification in EXCEPTION_CLOSE_2026-10-04.md; suspense financial resolution, manual allocation and provider ingestion remain to be verified against the same collector.')
    .replace('Next inspect/reproduce exception approval and source withdrawal against Close publication; current source narrows invalidation to run/date periods.', 'Exception approval/source withdrawal now have scoped verification. Next reproduce suspense financial-resolution approval against Close publication: the source still narrows invalidation to original/clearing journal periods while Close counts tenant-wide open suspense.'));
  row.implementationStatus += ' Exception approval/source withdrawal now use complete ordered Close targets and bounded snapshot retry with authentication rechecked after waits.';
  row.runtimeStatus += ' Exception checkpoint: 248 focused tests, full TypeScript, two-file lint and 11 isolated PostgreSQL cases pass; financial/allocation and outside-fixture records unchanged. Parent closure remains open.';
}
r.updatedAt = at;
r.executionPolicy.note = 'Cash primary, Close supporting. Exception approval and signed-source withdrawal publication defects corrected and 11 PostgreSQL cases verified. Next suspense financial-resolution approval against the tenant-wide open-suspense collector; other producers, authority/accessibility/capacity, genuine statements and the manual-posting approval dependency remain.';
const next = Buffer.from(JSON.stringify(r, null, 2) + '\n'); assert.ok(next.length >= before.length); const registerAfter = sha(next);
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${registerAfter}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. Two exception/Close defects corrected; no workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Exception approval/withdrawal → Close | Other producers, authority, full recovery | Engineering; suspense resolution handoff |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Full period scope, races, retained history | Statements, other producers, accessibility/capacity | Engineering; same handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** Actual exception approval and withdrawal of a signed source left prior-year Close observations unmarked as stale. Approved decisions now coordinate all tenant periods before the exception row, compare committed assessment membership, restart stale Serializable snapshots within three attempts, recheck authentication after waits and invalidate atomically. Rejections preserve current source/certificate state; exact replay repeats no effects. No workflow discovered, reopened or closed.

**Verification:** 248 tests/ten suites, full no-emit TypeScript and two-file lint passed. Ten PostgreSQL cases verify prior-period scope, zero obsolete collector rows, snapshot restart, both observed lock orders, independent reviewer/tenant/revision/authentication refusal, late rollback/retry, retained signatures/exports and the financial-treatment branch. One additional concurrent duplicate check verifies one durable receipt, safe conflict and exact replay. All 253 main runtime source bindings, financial/allocation fingerprints and outside-fixture records remained stable. Previous producer runtime bindings also remain current. [Detailed correction, receipts and operating guidance](${report}). UI unchanged; no new browser claim.

**Failures and limitations:** The first baseline verifier selected an unrelated fixture payment; it now selects through the actual run match and provider. Both attempts are retained; product behavior was not altered to fit the verifier. Full provider-statement evidence remains required. Native accessibility, broader persisted role/session races, aggregate policy/release gates and the existing journal-page static boundary finding remain open.

**Next:** Reproduce and correct suspense financial-resolution approval → Close publication. Current source invalidates only original/clearing journal periods, but Close directly consumes the tenant-wide open-suspense count. Manual allocation and provider event/statement ingestion remain queued producer reviews. Keep Cash primary and Close supporting.

**Remaining:** Broader financial/authority/transport lifecycles, bank/external evidence, worker deployment, native assistive technology/true zoom and representative period/pool performance. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All 17 families and original requirements remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const out = path.join(__dirname, 'exception-close-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'), before, { flag: 'wx' });
fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'), progressBefore, { flag: 'wx' });
fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.next.md'), progress, { flag: 'wx' });
assert.equal(sha(fs.readFileSync(registerFile)), beforeHash);
const fd = fs.openSync(registerFile, 'r+'); try { fs.writeFileSync(fd, next); } finally { fs.closeSync(fd); }
assert.equal(sha(fs.readFileSync(registerFile)), registerAfter); assert.equal(sha(fs.readFileSync(progressFile)), progressBeforeHash);
const pending = { at, report, registerBefore: beforeHash, registerAfter, progressBefore: progressBeforeHash, counts, bindings, currentReceipts: names, previousProducerBindingsUnchanged: true, reproducedDefectsCorrected: 2, workflowClosures: 0, goalComplete: false };
fs.writeFileSync(path.join(out, 'register-publication.json'), JSON.stringify(pending, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ checkpoint: out, registerHash: registerAfter, nextProgress: path.join(out, 'CURRENT_PROGRESS.next.md'), counts }));
