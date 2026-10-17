'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const mode = process.argv[2];
if (!['--publish', '--finalize'].includes(mode)) { console.log('Inert; explicit checkpoint publication/finalization required.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = 'SUSPENSE_RESOLUTION_CLOSE_2026-10-04.md';
const names = {
  jest: 'evidence/suspense-resolution-close-jest-3edeece1-7782-4a16-83ba-3243f8bbbc7b.json',
  typecheck: 'evidence/suspense-resolution-close-typecheck-36053f43-5114-4dbc-85e5-cc79705b6dad.json',
  lint: 'evidence/suspense-resolution-close-lint-52055280-ce17-40b1-ae55-0b0d2c224148.json',
  first: 'lanes/environment/suspense-resolution-close-acceptance-c7166888-b5aa-4aee-a804-a7938802d7c7.json',
  remaining: 'lanes/environment/suspense-resolution-close-remaining-acceptance-b488b195-7de2-47c0-9a3a-549e64d13e9e.json',
};
const bindings = {}, receipts = {}, uniqueSources = new Set();
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(dir, name)), value = JSON.parse(bytes); receipts[key] = value; bindings[name] = sha(bytes);
  assert.equal(value.sourceStable, true); assert.equal(value.passed, key !== 'first');
  const sources = value.sourcesAfter || value.sourceAfter; assert.ok(Object.keys(sources).length > 0);
  for (const [file, hash] of Object.entries(sources)) { assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Changed source: ' + file); uniqueSources.add(file.replaceAll('\\', '/')); }
}
assert.deepEqual(receipts.jest.summary, { passed: 257, failed: 0, pending: 0, suites: 15, failedSuites: 0 });
assert.equal(receipts.first.checks.length, 9); assert.equal(receipts.remaining.checks.length, 2);
assert.equal(receipts.first.outsideUnchanged, true); assert.equal(receipts.remaining.outsideUnchanged, true);
assert.equal(receipts.first.checks.filter(row => row.passed).length, 7); assert.ok(receipts.remaining.checks.every(row => row.passed));
const failedNames = receipts.first.checks.filter(row => !row.passed).map(row => row.name).sort();
assert.deepEqual(failedNames, receipts.remaining.checks.map(row => row.name).sort());
const finalChecks = receipts.first.checks.filter(row => row.passed).concat(receipts.remaining.checks);
assert.equal(new Set(finalChecks.map(row => row.name)).size, 9);
for (const name of [report, 'SUSPENSE_RESOLUTION_CLOSE_CHECKLIST_2026-10-04.md', 'lanes/environment/suspense-resolution-close-baseline-75af51ab-7bf5-435a-899d-ac64ab48fb97.json', 'lanes/environment/suspense-resolution-close-acceptance-e1c23c01-1d53-46ec-9027-bd859841f1ab.json', 'evidence/suspense-resolution-close-jest-8bf97612-cd78-43cd-9acb-d194eb84996a.json', 'evidence/suspense-resolution-close-jest-c17ea488-2260-49c6-ba63-19eb58a0ecfe.json']) bindings[name] = sha(fs.readFileSync(path.join(dir, name)));
const registerFile = path.join(dir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(dir, 'CURRENT_PROGRESS.md');
const registerBeforeHash = '5accaf47914242982858e2363c2f725fc1e82d5cafd82d879bd4ada21178eacf', progressBeforeHash = '57171c903bf42c5299568cdeac7f8ed5da4425063d52d20fd0e1679b8a899331';
function validate(r) { const counts = {}; for (const row of r.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
  assert.equal(r.workflows.length, 270); assert.equal(r.families.length, 17); assert.equal(r.coverage.unmappedEntrySources, 191); assert.equal(r.discoveryComplete, false);
  assert.deepEqual(counts, { Queued: 264, 'Complete—verified': 4, 'In progress': 2 }); return counts;
}
if (mode === '--finalize') {
  const out = path.resolve(process.argv[3]); assert.equal(path.dirname(out), __dirname); assert.ok(path.basename(out).startsWith('suspense-resolution-close-checkpoint-'));
  const pending = JSON.parse(fs.readFileSync(path.join(out, 'register-publication.json'))); assert.deepEqual(pending.bindings, bindings);
  assert.equal(sha(fs.readFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'))), registerBeforeHash); assert.equal(sha(fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'))), progressBeforeHash);
  const register = fs.readFileSync(registerFile), progress = fs.readFileSync(progressFile); assert.equal(sha(register), pending.registerAfter);
  assert.equal(progress.toString().replace(/\r\n/g, '\n'), fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.next.md'), 'utf8')); assert.ok(progress.toString().split(/\s+/).length <= 700);
  const r = JSON.parse(register), counts = validate(r);
  for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) { const row = r.workflows.find(row => row.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false); assert.equal(row.closureReview.suspenseResolutionCloseCurrent, true); }
  const publication = { ...pending, finalizedAt: new Date().toISOString(), progressAfter: sha(progress), counts, passed: true };
  fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash: pending.registerAfter, progressHash: publication.progressAfter, counts, passed: true })); process.exit(0);
}
const before = fs.readFileSync(registerFile), progressBefore = fs.readFileSync(progressFile);
assert.equal(sha(before), registerBeforeHash); assert.equal(sha(progressBefore), progressBeforeHash);
const r = JSON.parse(before), counts = validate(r), at = new Date().toISOString();
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const row = r.workflows.find(row => row.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false);
  row.closureReview.suspenseResolutionCloseCurrent = true;
  row.closureReview.suspenseResolutionClose = { at, report, currentReceipts: names, reproducedDefects: 1, runtimeCases: 9, runtimeComposition: 'Seven first-run passing cases plus two corrected verifier checks; original failed receipt retained.', allTenantPeriods: true, financialRecordsPreserved: true, workflowClosure: false };
  row.closureReview.exceptionClosePublicationCurrent = false;
  row.closureReview.suspenseResolutionSourceImpact = 'Earlier exception runtime binding includes the now-changed suspense-resolution prerequisite and is historical at exact-file scope. Current downstream exception/financial-proof tests pass; prior eleven exception cases were not all rerun. Previous creation/refresh/preparation runtime bindings remain unchanged. No completed workflow reopened.';
  row.closureReview.verifiedCriteria.push('Suspense financial-resolution prior-period Close publication gap reproduced and corrected. Complete period coordination, obsolete collector discard, stale snapshot retry, both actual PostgreSQL lock orders, rejection, maker/tenant/permission/auth/revision refusal, exact replay/conflicting decision, late source-and-Close rollback/new-transaction retry and simultaneous single allocation verified. Existing financial records unchanged; control access audit retained.');
  row.evidence = [...new Set([...row.evidence, report, ...Object.values(names)])];
  row.remaining = row.remaining.map(text => text
    .replace('suspense financial resolution, manual allocation and provider ingestion remain to be verified against the same collector.', 'suspense financial resolution now has scoped verification in SUSPENSE_RESOLUTION_CLOSE_2026-10-04.md; manual allocation and provider ingestion remain to be verified against the same collector.')
    .replace('Next reproduce suspense financial-resolution approval against Close publication: the source still narrows invalidation to original/clearing journal periods while Close counts tenant-wide open suspense.', 'Suspense financial-resolution approval now has scoped verification. Next reproduce provider-event and statement-import publication, whose overlap-limited invalidation conflicts with tenant-wide evidence availability.'));
  row.remaining.push('Review suspense correction/recovery source-before-assessment lock ordering against new producer coordination under stale/conflicting commands. Preserve full original authority, native accessibility, external statements, worker/capacity and lifecycle requirements. See ' + report + '.');
  row.implementationStatus += ' Suspense resolution now coordinates all tenant Close periods before source locks and invalidates once atomically, with bounded snapshot retry and post-wait authentication.';
  row.runtimeStatus += ' Suspense resolution checkpoint: 257 tests/15 suites, full TypeScript, two-file lint and nine database scenarios verified across seven original passing cases and two corrected verifier checks; prior failures retained. Full Cash/Close closure remains open.';
}
r.updatedAt = at; r.executionPolicy.note = 'Cash primary, Close supporting. Suspense financial-resolution publication correction verified. Next provider-event/statement-import evidence against the tenant-wide Close collector; keep manual allocation, suspense correction/recovery ordering, broader authority/accessibility/capacity and original external/manual-posting approval dependencies.';
const next = Buffer.from(JSON.stringify(r, null, 2) + '\n'); assert.ok(next.length >= before.length); const registerAfter = sha(next);
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${registerAfter}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. One suspense/Close defect corrected; no workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Suspense resolution → Close | Other producers, authority, full recovery | Engineering; provider/statement handoff |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Complete scope, races, rollback and replay | Statements, other producers, accessibility/capacity | Engineering; same handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** Actual approval resolved suspense but left a prior-year Close collector unmarked, persisting 17 obsolete rows. Approval now coordinates every tenant period before source locks, retries proven obsolete snapshots within three attempts, rechecks authentication after waits and invalidates once atomically. No new journal is posted. Rejection retains the open source; replay retains its allocation. No workflow discovered, reopened or closed.

**Verification:** 257 tests/15 suites, full no-emit TypeScript and two-file lint passed. Nine database scenarios are verified: seven passing first-run cases plus two corrected verifier checks. They cover prior-period scope, zero obsolete rows, fresh assessment, stale-snapshot retry, both observed PostgreSQL lock orders, denied authority/revision, exact replay, conflicting decision, late source-and-Close rollback and simultaneous single allocation. Financial records and outside-fixture fingerprints remain intact. [Detailed correction, receipts and guidance](${report}). UI unchanged; no new browser claim.

**Failures retained:** Initial duplicate fixture ID stopped setup. The first complete acceptance run had two verifier failures: incorrect access to a wrapped transaction result and an overlong synthetic invoice name. Corrected checks passed without product changes or repeating the seven successful cases. Unit fixture corrections added audit-log support and asserted the existing authentication error code. Earlier exception runtime binding is historical after its financial-resolution prerequisite changed; current downstream tests pass, without claiming every earlier case was rerun.

**Next:** Reproduce provider-event capture and statement import → Close publication. Their invalidation is date-limited while Close consumes organization-wide evidence availability. Keep manual allocation and suspense correction/recovery lock-order compatibility queued. Cash remains primary, Close supporting.

**Remaining:** Full financial/authority/transport lifecycles, bank/provider evidence, native accessibility/true zoom, representative pool/period performance and worker rollout. Existing static boundary and separately controlled aggregate policy/release gates remain unresolved. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All original requirements and 17 families remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const out = path.join(__dirname, 'suspense-resolution-close-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'), before, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'), progressBefore, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.next.md'), progress, { flag: 'wx' });
assert.equal(sha(fs.readFileSync(registerFile)), registerBeforeHash);
const fd = fs.openSync(registerFile, 'r+'); try { fs.writeFileSync(fd, next); } finally { fs.closeSync(fd); }
assert.equal(sha(fs.readFileSync(registerFile)), registerAfter); assert.equal(sha(fs.readFileSync(progressFile)), progressBeforeHash);
const pending = { at, report, registerBefore: registerBeforeHash, registerAfter, progressBefore: progressBeforeHash, counts, bindings, currentReceipts: names, uniqueBoundSourceFiles: uniqueSources.size, verifiedRuntimeCases: finalChecks.map(row => row.name), originalAcceptancePassed: false, correctedRemainingPassed: true, reproducedDefectsCorrected: 1, workflowClosures: 0, goalComplete: false };
fs.writeFileSync(path.join(out, 'register-publication.json'), JSON.stringify(pending, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ checkpoint: out, registerHash: registerAfter, nextProgress: path.join(out, 'CURRENT_PROGRESS.next.md'), counts }));
