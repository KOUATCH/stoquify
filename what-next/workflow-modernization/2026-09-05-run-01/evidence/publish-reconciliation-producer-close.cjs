'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--publish') { console.log('Inert; --publish validates receipts and updates only the local workflow checkpoint.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const reportName = 'RECONCILIATION_PRODUCER_CLOSE_2026-10-04.md';
const names = {
  jest: 'evidence/reconciliation-producer-close-jest-553deadc-8136-4f31-9068-740c8ef2c3ea.json',
  typecheck: 'evidence/reconciliation-producer-close-typecheck-8f2a5cee-93c2-4889-8848-8146f576e072.json',
  lint: 'evidence/reconciliation-producer-close-lint-9ff977cf-1f1d-4854-9c7d-5865550f5cc0.json',
  runtime: 'lanes/environment/reconciliation-producer-close-acceptance-8d5e9fc4-2a23-4610-afcd-4cec704963e1.json',
};
const bindings = {}, receipts = {};
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(dir, name)), value = JSON.parse(bytes); bindings[name] = sha(bytes); receipts[key] = value;
  assert.equal(value.passed, true); assert.equal(value.sourceStable, true);
  for (const [file, hash] of Object.entries(value.sourcesAfter || value.sourceAfter)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Changed bound source: ' + file);
}
assert.equal(receipts.jest.summary.passed, 212); assert.equal(receipts.jest.summary.failed, 0); assert.equal(receipts.jest.summary.pending, 0);
assert.equal(receipts.runtime.checks.length, 9); assert.ok(receipts.runtime.checks.every(row => row.passed)); assert.equal(receipts.runtime.financialUnchanged, true); assert.equal(receipts.runtime.outsideUnchanged, true);
for (const name of [reportName, 'RECONCILIATION_PRODUCER_CLOSE_CHECKLIST_2026-10-04.md', 'lanes/environment/reconciliation-producer-close-baseline-bdb77cb4-a781-4905-85b0-3b9ef5b34b56.json', 'lanes/environment/reconciliation-producer-close-baseline-0b2e3b72-324e-4fea-ad0d-3855d15f28a3.json']) bindings[name] = sha(fs.readFileSync(path.join(dir, name)));
const registerFile = path.join(dir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(dir, 'CURRENT_PROGRESS.md'), before = fs.readFileSync(registerFile), progressBefore = fs.readFileSync(progressFile);
assert.equal(sha(before), '6bfcb8c464a8778733feae9d589b6f06ccf555725758912b08872a3f805aa8f2');
assert.equal(sha(progressBefore), '8ce8c57831545ba32a5eb69379f9ec7682e8f46cdb1ce0c176396696bf906926');
const r = JSON.parse(before), at = new Date().toISOString(), counts = {};
for (const row of r.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
assert.equal(r.workflows.length, 270); assert.equal(r.families.length, 17); assert.equal(r.coverage.unmappedEntrySources, 191); assert.equal(r.discoveryComplete, false);
assert.deepEqual(counts, { Queued: 264, 'Complete—verified': 4, 'In progress': 2 });
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const row = r.workflows.find(value => value.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false);
  row.closureReview.reconciliationProducerCloseCurrent = true;
  row.closureReview.reconciliationProducerClose = { at, report: reportName, runtimeReceipt: names.runtime, sourceFiles: Object.keys(receipts.runtime.sourcesAfter).length, reproducedDefects: 3, runtimeCases: 9, allTenantPeriods: true, financialUnchanged: true, retainedExports: true, workflowClosure: false };
  row.closureReview.signingClosePublicationCurrent = false;
  row.closureReview.reconciliationProducerSourceImpact = 'The shared Close registry adds CREATED/PREPARED descriptors, so previous raw signing/purchase file bindings are historical. Current 212-test regression and actual signing/retained-certificate recovery cover affected behavior; prior five signing and four purchase scenarios were not all rerun. No completed workflow was reopened.';
  row.closureReview.verifiedCriteria.push('Reconciliation creation, unsigned refresh and preparation invalidation gaps reproduced and corrected: complete tenant period ordering, one stale-snapshot restart, both observed PostgreSQL publication orders, discarded obsolete collectors, signed refresh late rollback/new-transaction retry/exact replay, prior signature and certified-export retention, authority/revision refusal and financial/outside-fixture no-effects verified.');
  row.evidence = [...new Set([...row.evidence, reportName, ...Object.values(names)])];
  row.remaining = row.remaining.map(text => text.replace('complete reconciliation run creation/refresh and other producers against the organization-wide collector, including no-run/non-overlapping periods.', 'reconciliation creation/refresh/preparation now have scoped verification in RECONCILIATION_PRODUCER_CLOSE_2026-10-04.md; exception decisions, manual allocation and provider ingestion remain to be verified against the same collector.'));
  row.remaining.push('Next inspect/reproduce exception approval and source withdrawal against Close publication; current source narrows invalidation to run/date periods. Other producer boundaries, genuine provider statements, broader authority, native accessibility, worker rollout, capacity and release gates remain open. See ' + reportName + '.');
  row.implementationStatus += ' Reconciliation creation, incorporation and preparation now coordinate complete Close period scope and atomically retain typed stale evidence; refresh/preparation recheck authentication after waits.';
  row.runtimeStatus += ' Latest producer checkpoint: 212 focused tests, TypeScript/lint and nine owned PostgreSQL cases pass; unchanged observed finances and outside-fixture records. Full workflow closure remains open.';
}
r.updatedAt = at; r.executionPolicy.note = 'Cash primary, Close supporting. Three reconciliation producer invalidation defects corrected and nine PostgreSQL cases verified. Next exception approval/source withdrawal against Close publication; retain genuine statements, other producers, authority/accessibility/capacity and the manual-posting approval dependency.';
const next = Buffer.from(JSON.stringify(r, null, 2) + '\n'); assert.ok(next.length >= before.length); const registerAfter = sha(next);
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${registerAfter}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. Three reconciliation producer defects corrected; no workflow closure or denominator change. This turn made progress.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Creation, refresh and preparation → Close | Remaining producers, authority, full recovery | Engineering; exception decisions/source withdrawal |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Complete period scope, publication races, retained history | Statements, other producers, capacity/accessibility | Engineering; same producer handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** Actual services reproduced missing Close invalidation after creation, unsigned source incorporation and preparation. These producers now acquire the complete ordered tenant-period set, compare Serializable membership with committed observations, restart obsolete snapshots within three attempts and invalidate in the source transaction. Preparation/refresh recheck authentication age after waits. New typed creation/preparation reasons preserve existing audit/export semantics. No workflow discovered, reopened or closed.

**Verification:** 212 focused tests/nine suites, full no-emit TypeScript and eight-file lint passed. Nine PostgreSQL cases verify earlier-period scope, discarded obsolete collectors, stale-snapshot restart, both observed lock orders, signed refresh late rollback/retry, exact replay, denied authority/revision and retained signature/export bytes. All 242 source bindings, financial fingerprints and outside-fixture records remained stable. [Detailed correction, receipts and operating guidance](${reportName}). UI unchanged; no new browser claim.

**Failures and limitations:** The first baseline check incorrectly attributed an already-stale certificate to creation; provider setup had invalidated it. The corrected check isolates actual creation against a newly published assessment; both attempts remain recorded. Previous raw signing/purchase source bindings are historical after the additive shared registry change; current affected-boundary tests and actual signing/retention pass without claiming every earlier scenario was rerun. Genuine provider-statement evidence remains required. The unchanged static boundary finding and separately controlled aggregate policy/release gates remain unresolved.

**Next:** Reproduce and correct exception approval/source withdrawal → Close publication. Current source still narrows its invalidation to run/date periods. Manual allocation and provider event/statement ingestion are other unverified producers. Keep Cash primary and Close supporting.

**Remaining:** Broader authority/transport and financial lifecycles, bank/external evidence, worker deployment, native assistive technology/true zoom, representative period/pool performance and the full original inventory. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All 17 families remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const out = path.join(__dirname, 'reconciliation-producer-close-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'), before, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'), progressBefore, { flag: 'wx' });
assert.equal(sha(fs.readFileSync(registerFile)), sha(before)); const fd = fs.openSync(registerFile, 'r+'); try { fs.writeFileSync(fd, next); } finally { fs.closeSync(fd); }
assert.equal(sha(fs.readFileSync(registerFile)), registerAfter);
assert.equal(sha(fs.readFileSync(progressFile)), sha(progressBefore)); fs.writeFileSync(progressFile, progress);
assert.equal(fs.readFileSync(progressFile, 'utf8'), progress);
const publication = { at, report: reportName, registerBefore: sha(before), registerAfter, progressBefore: sha(progressBefore), progressAfter: sha(Buffer.from(progress)), counts, bindings, currentReceipts: names, reproducedDefectsCorrected: 3, workflowClosures: 0, goalComplete: false, passed: true };
fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash: registerAfter, progressHash: publication.progressAfter, counts }));
