// Publish this bounded milestone only after exact current-source proof succeeds.
// No application, database, migration or deployment mutations.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const run = path.resolve(__dirname, '..'), root = path.resolve(run, '../../..');
const read = file => fs.readFileSync(path.join(run, file));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const predecessor = 'c230dbac28b896df15da47948651164431b089896847411f3b4d4c7bd8c1b530';
const predecessorProgress = '9007237d3e4d771e31e5ca41821e32b7111c62b9099bdeeb49618228a8c01aba';
const sources = {}, receipts = {};
function verify(file, browser = false) {
  const bytes = read(file), value = JSON.parse(bytes);
  assert.equal(value.passed, true, file); assert.equal(value.sourceStable, true, file);
  const before = browser ? value.sourcesBefore : value.sourceBefore;
  const after = browser ? value.sourcesAfter : value.sourceAfter;
  assert.deepEqual(before, after, file);
  for (const [relative, expected] of Object.entries(after)) {
    assert.equal(hash(fs.readFileSync(path.join(root, relative))), expected, relative);
    if (sources[relative]) assert.equal(sources[relative], expected, relative);
    sources[relative] = expected;
  }
  receipts[file] = hash(bytes);
  return value;
}
if (process.argv[2] !== '--run') { console.log('Prepared only. --run requires the successful current browser receipt basename.'); process.exit(0); }
assert.match(process.argv[3] || '', /^manual-journal-recovery-browser-[a-f0-9-]+\.json$/);
const jest = verify('evidence/manual-journal-recovery-jest-b99e8967-31e6-4237-b6c3-1e8b059bf1a5.json');
assert.deepEqual(jest.summary, { passed: 70, failed: 0, pending: 0, suites: 4, failedSuites: 0 });
verify('evidence/manual-journal-recovery-typecheck-aef5d171-463d-4559-b878-53179ce1fbb0.json');
verify('evidence/manual-journal-recovery-lint-dbb58ba4-eeae-4178-9e5c-11f91041575b.json');
const browser = verify('lanes/environment/' + process.argv[3], true);
assert.equal(browser.outsideUnchanged, true); assert.equal(browser.journeys.length, 2);
for (const journey of browser.journeys) {
  assert.equal(journey.passed, true); assert.deepEqual(journey.errors, []);
  assert.deepEqual(journey.operations.map(operation => operation.operation), ['post', 'reverse']);
  for (const operation of journey.operations) { assert.equal(operation.noAutomaticRetry, true); assert.equal(operation.persistentSuccessFocusedAfterRowActionUnmount, true); }
  assert.equal(journey.readOnly.noFinancialEffects, true);
  assert.deepEqual(journey.readOnly.viewports.map(viewport => viewport.viewport), [1440, 768, 320]);
}
assert.equal(sources['services/accounting/journal-posting-order.service.ts'], 'f74cd6d9e9e62fa74ec8fec7c0dfc5fe4f69f17f3132eb576fd0384461f78ddc');
assert.equal(sources['services/accounting/journal-reversal-order.service.ts'], 'f6b6a6765094e726614c4b9c0be004c6265e50657ad3f319c0317e9ed4442e09');
const registerBytes = read('WORKFLOW_REGISTER.json'), progressBytes = read('CURRENT_PROGRESS.md');
assert.equal(hash(registerBytes), predecessor, 'Do not overwrite a changed shared register');
assert.equal(hash(progressBytes), predecessorProgress, 'Do not overwrite changed shared progress');
const before = JSON.parse(registerBytes), next = structuredClone(before), at = new Date().toISOString();
assert.equal(before.workflows.length, 270); assert.equal(before.families.length, 17);
const checkpoint = 'evidence/manual-journal-recovery-checkpoint-' + crypto.randomUUID() + '.json';
const reports = ['MANUAL_JOURNAL_RECOVERY_2026-10-01.md', 'MANUAL_JOURNAL_RECOVERY_REVIEW_2026-10-01.md'];
const reportHashes = Object.fromEntries(reports.map(file => [file, hash(read(file))]));
const targetIds = ['FA-CASH-COMMAND', 'FA-CLOSE-PACK'];
for (const workflow of next.workflows.filter(value => targetIds.includes(value.id))) {
  assert.equal(workflow.status, 'In progress'); assert.equal(workflow.closureReview.complete, false);
  workflow.implementationStatus = 'Manual journal review now preserves operation, reason/date and identity recovery through table refresh; commands wait for hydration, success feedback persists, and failed/partial reads remain distinct from empty results. Existing server-owned authority and source restrictions remain. Earlier-period Close scope is unchanged.';
  workflow.runtimeStatus = '70 tests/four suites, full no-emit TypeScript and five-file lint passed. Actual EN desktop and FR 320px posting/reversal recovery passed with distinct actors and exact persisted effects; read-only history and keyboard reflow passed at 1440/768/320px in both locales. Stable sources and observed outside-fixture state. Two failed browser attempts retained; full Cash/Close remains open.';
  workflow.evidence.push(...reports, checkpoint);
  workflow.closureReview.latestScopedReview = checkpoint;
  workflow.closureReview.manualJournalRecoveryVerified = true;
  workflow.closureReview.verifiedCriteria.push('Journal page distinguishes failed/partial/successfully empty reads; exact nominal currency groups and retained states, critical command permissions and source restrictions are covered by focused tests.', 'Actual EN/FR manual posting and reversal preserve explicit correction details through genuine expired-authentication refusal and password confirmation; deliberate retry yields exact persisted effects with stable success focus and unchanged observed outside-fixture state.', 'Real table remount and hydration regression, pending/failed/successful read barriers, scoped context changes, and actual keyboard/read-only reflow at 1440/768/320px are verified. No full accessibility or workflow closure is inferred.');
}
const cash = next.workflows.find(value => value.id === 'FA-CASH-COMMAND');
const priorRemaining = 'Complete manual journal in-page fresh-authentication recovery with preserved operation and deliberate retry; expose only permitted manual-source commands with reviewable reversal reason/date; distinguish failed/partial queries from zero-row states. Verify EN/FR, keyboard and narrow/desktop actual journals. See MANUAL_REVERSAL_AUTHORITY_2026-10-01.md.';
assert.equal(cash.remaining.filter(value => value === priorRemaining).length, 1);
cash.remaining = cash.remaining.map(value => value === priorRemaining ? 'Manual journal recovery is verified for actual EN/FR posting/reversal, distinct roles, keyboard and responsive read-only history. Browser-injected read outages, native screen reader/zoom, full inherited console/contrast, interrupted delivery and whole Cash/Close lifecycle remain open. See MANUAL_JOURNAL_RECOVERY_2026-10-01.md.' : value);
next.updatedAt = at;
next.executionPolicy.note = 'Journal recovery acceptance criteria verified. No workflow closed, renamed or split; earlier-period scope remains unapproved/runtime-failed and the full Cash/Close lifecycle remains active. Preserve the full objective and all original requirements.';
assert.deepEqual(before.families, next.families); assert.deepEqual(before.coverage, next.coverage);
const unaffected = value => value.workflows.filter(workflow => !targetIds.includes(workflow.id));
assert.deepEqual(unaffected(before), unaffected(next)); assert.equal(unaffected(next).length, 268);
assert.deepEqual(before.workflows.map(value => value.status), next.workflows.map(value => value.status));
const newRegister = Buffer.from(JSON.stringify(next, null, 2) + '\n'), registerHash = hash(newRegister);
const progress = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479, branch codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: ${registerHash}.

**Position:** 270 workflows, 17 families, 191 unmapped entries; discovery incomplete. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow completed or added this checkpoint.

| Priority | Workflow and outcome | Status | Delivered/verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Journal data truth, allowed commands and actual EN/FR recovery | Authority, all producers, delivery and full lifecycle | Engineering; period scope needs user approval | Resolve remaining producer/freshness and recovery criteria |
| Supporting | FA-CLOSE-PACK: reliable retained evidence | In progress | Controlled compensation and retained journal history | Earlier-period scope, producers and delivery | Engineering; two historical scope failures | Apply/reverify exact scope only if approved |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Since the previous report:** Delivered journal review with preserved correction details, in-page password confirmation and deliberate financial retry. Command visibility respects critical permissions and source ownership. Failed/partial reads do not become zero rows; totals preserve separate currencies and exact cents. Table refresh no longer loses the dialog or success focus, and triggers wait for hydration. No workflow was closed or split.

**Verification:** 70 tests/four suites, full no-emit TypeScript and five-file lint passed. Real EN desktop and FR 320px posting/reversal journeys passed with distinct actors, genuine expired-authentication refusal, no automatic retry and exact database effects. Read-only history, keyboard and reflow passed at 1440/768/320px in both languages. Sources and observed outside-fixture state remained stable. Two failed browser attempts exposed lost dialog state and an initial-button readiness gap; both receipts are retained. Failed-read rendering is unit-tested, not browser fault-injected. Native screen reader, actual zoom, inherited console/contrast and production performance remain unverified. [Correction, evidence and operating guide](MANUAL_JOURNAL_RECOVERY_2026-10-01.md); [independent review](MANUAL_JOURNAL_RECOVERY_REVIEW_2026-10-01.md).

**Unchanged blocker:** Earlier-period Close invalidation remains incomplete with two retained PostgreSQL scope failures. Automatic approval review rejected the all-period posting helper twice for contention risk; it remains unapplied pending explicit user approval. Posting/reversal scope helpers are unchanged. [Exact proposal](MANUAL_POSTING_SCOPE_REVIEW_2026-10-01.md).

**Remaining:** Producer scope, draft-created snapshot freshness, purchase recovery, role/session revocation serialization, interruption/outbox delivery, genuine country/payroll prerequisites and full accessibility/capacity. Financial, sales/POS, inventory/purchasing, HRIS, identity/access/modules, compliance/evidence/reporting, notifications/integrations and AI families retain their original backlog in the [register](WORKFLOW_REGISTER.json). The other 268 rows, all 17 families and statuses are unchanged. No migration, reset, deployment, live activation, payment to a customer, external message or X1 clearance occurred. The full goal remains active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const stem = path.join(run, checkpoint.replace(/\.json$/, ''));
fs.writeFileSync(stem + '-register-before.json', registerBytes, { flag: 'wx' });
fs.writeFileSync(stem + '-progress-before.md', progressBytes, { flag: 'wx' });
const result = { at, complete: false, primary: targetIds[0], supporting: targetIds[1], predecessorRegisterHash: predecessor, predecessorProgressHash: predecessorProgress, registerHash, progressHash: hash(progress), publicationReceipt: checkpoint.replace(/\.json$/, '-publication.json'), source: sources, receipts, reports: reportHashes, counts: next.coverage.statusCounts, unchangedOtherRows: 268, unchangedFamilies: 17, browserJourneys: browser.journeys.map(value => ({ locale: value.locale, passed: value.passed, operations: value.operations.map(operation => operation.operation), viewports: value.readOnly.viewports.map(viewport => viewport.viewport) })), limitation: 'This immutable evidence record is prepared before publication; consult publicationReceipt for the paired-write outcome. Bounded journal recovery milestone only; whole workflow and goal remain active. Rejected all-period helper unchanged.' };
// The referenced immutable evidence exists before either mutable summary changes.
fs.writeFileSync(path.join(run, checkpoint), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
const replacements = [
  { file: 'WORKFLOW_REGISTER.json', before: registerBytes, oldHash: predecessor, bytes: newRegister, newHash: registerHash },
  { file: 'CURRENT_PROGRESS.md', before: progressBytes, oldHash: predecessorProgress, bytes: Buffer.from(progress), newHash: result.progressHash },
];
for (const [index, item] of replacements.entries()) {
  item.temporary = stem + '-replacement-' + index + '.tmp';
  fs.writeFileSync(item.temporary, item.bytes, { flag: 'wx' });
  assert.equal(hash(fs.readFileSync(item.temporary)), item.newHash);
}
const replaced = [];
try {
  for (const [relative, expected] of Object.entries(sources)) assert.equal(hash(fs.readFileSync(path.join(root, relative))), expected, relative);
  for (const [file, expected] of Object.entries(reportHashes)) assert.equal(hash(read(file)), expected, file);
  for (const item of replacements) {
    for (const other of replacements) assert.equal(hash(read(other.file)), replaced.includes(other) ? other.newHash : other.oldHash, 'Concurrent edit: ' + other.file);
    // Same-directory atomic file replacement avoids a partial/truncated JSON file.
    fs.renameSync(item.temporary, path.join(run, item.file));
    replaced.push(item);
    assert.equal(hash(read(item.file)), item.newHash);
  }
  for (const item of replacements) assert.equal(hash(read(item.file)), item.newHash);
  fs.writeFileSync(path.join(run, result.publicationReceipt), JSON.stringify({ at: new Date().toISOString(), published: true, checkpoint, registerHash, progressHash: result.progressHash }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ checkpoint, publicationReceipt: result.publicationReceipt, registerHash, words: progress.split(/\s+/).length, complete: false, unchangedOtherRows: 268 }));
} catch (error) {
  const recovery = [];
  for (const [index, item] of [...replaced].reverse().entries()) {
    try {
      if (hash(read(item.file)) !== item.newHash) { recovery.push({ file: item.file, restored: false, reason: 'Concurrent content preserved' }); continue; }
      const temporary = stem + '-restore-' + index + '.tmp';
      fs.writeFileSync(temporary, item.before, { flag: 'wx' });
      assert.equal(hash(read(item.file)), item.newHash, 'Concurrent content changed before recovery');
      fs.renameSync(temporary, path.join(run, item.file));
      assert.equal(hash(read(item.file)), item.oldHash);
      recovery.push({ file: item.file, restored: true });
    } catch (restoreError) { recovery.push({ file: item.file, restored: false, reason: restoreError.message }); }
  }
  fs.writeFileSync(stem + '-publication-failure.json', JSON.stringify({ at: new Date().toISOString(), published: false, error: error.message, recovery }, null, 2) + '\n', { flag: 'wx' });
  throw error;
}
