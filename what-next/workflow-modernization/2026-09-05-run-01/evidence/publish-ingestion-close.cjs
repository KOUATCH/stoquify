'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const mode = process.argv[2];
if (!['--publish', '--finalize'].includes(mode)) { console.log('Inert; explicit local checkpoint publication/finalization required.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = 'INGESTION_CLOSE_2026-10-04.md', names = {
  jest: 'evidence/ingestion-close-jest-83632cb2-0758-418d-9c44-7db25f92b4b5.json',
  typecheck: 'evidence/ingestion-close-typecheck-2f75e7f5-e109-4c74-ac51-57410723ca7b.json',
  lint: 'evidence/ingestion-close-lint-1c1a243d-ec98-4d88-bbaa-bd2604102f4a.json',
  runtime: 'lanes/environment/ingestion-close-acceptance-170c13bc-7c48-48de-b5bc-8dc9fcd2bb3e.json',
};
const bindings = {}, receipts = {};
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(dir, name)), value = JSON.parse(bytes); receipts[key] = value; bindings[name] = sha(bytes);
  assert.equal(value.passed, true); assert.equal(value.sourceStable, true);
  const sources = value.sourcesAfter || value.sourceAfter; assert.ok(Object.keys(sources).length > 0);
  for (const [file, hash] of Object.entries(sources)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Changed source: ' + file);
}
assert.deepEqual(receipts.jest.summary, { passed: 198, failed: 0, pending: 0, suites: 10, failedSuites: 0 });
assert.equal(receipts.runtime.checks.length, 11); assert.ok(receipts.runtime.checks.every(row => row.passed)); assert.equal(receipts.runtime.outsideUnchanged, true);
assert.ok(receipts.runtime.checks.find(row => row.name === 'late-source-event-outbox-close-rollback-and-retry').result.cases.every(row => row.allObservedRowsRolledBack && row.financialUnchanged));
assert.equal(receipts.runtime.checks.find(row => row.name === 'retained-certified-export-and-current-rejection-truth').result.originalCertifiedBytesRetained, true);
for (const name of [report, 'INGESTION_CLOSE_CHECKLIST_2026-10-04.md', 'lanes/environment/ingestion-close-baseline-b39fa5ea-0625-4fad-8423-94ad40f810ad.json', 'evidence/ingestion-close-jest-a76ccb67-966b-4843-abbd-4eb562b76b37.json', 'evidence/ingestion-close-jest-c42f1865-d105-49ca-a927-15f07fae40df.json', 'evidence/ingestion-close-before-20261004.json']) bindings[name] = sha(fs.readFileSync(path.join(dir, name)));
const registerFile = path.join(dir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(dir, 'CURRENT_PROGRESS.md');
const registerBeforeHash = '4cd74cd95c616352ad5e380a0accdb4b36af25c0d18c37b9497f8194daf00416', progressBeforeHash = 'd68109c6fb240ed07531c44ca92ef12bb039bf51e89352c05cb2bcab0145f1cb';
function validate(r) { const counts = {}; for (const row of r.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
  assert.equal(r.workflows.length, 270); assert.equal(r.families.length, 17); assert.equal(r.coverage.unmappedEntrySources, 191); assert.equal(r.discoveryComplete, false);
  assert.deepEqual(counts, { Queued: 264, 'Complete—verified': 4, 'In progress': 2 }); return counts;
}
if (mode === '--finalize') {
  const out = path.resolve(process.argv[3]); assert.equal(path.dirname(out), __dirname); assert.ok(path.basename(out).startsWith('ingestion-close-checkpoint-'));
  const pending = JSON.parse(fs.readFileSync(path.join(out, 'register-publication.json'))); assert.deepEqual(pending.bindings, bindings);
  assert.equal(sha(fs.readFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'))), registerBeforeHash); assert.equal(sha(fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'))), progressBeforeHash);
  const register = fs.readFileSync(registerFile), progress = fs.readFileSync(progressFile); assert.equal(sha(register), pending.registerAfter);
  assert.equal(progress.toString().replace(/\r\n/g, '\n'), fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.next.md'), 'utf8')); assert.ok(progress.toString().split(/\s+/).length <= 700);
  const r = JSON.parse(register), counts = validate(r);
  for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) { const row = r.workflows.find(row => row.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false); assert.equal(row.closureReview.ingestionCloseCurrent, true); }
  const publication = { ...pending, finalizedAt: new Date().toISOString(), progressAfter: sha(progress), counts, passed: true };
  fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash: pending.registerAfter, progressHash: publication.progressAfter, counts, passed: true })); process.exit(0);
}
const before = fs.readFileSync(registerFile), progressBefore = fs.readFileSync(progressFile);
assert.equal(sha(before), registerBeforeHash); assert.equal(sha(progressBefore), progressBeforeHash);
const r = JSON.parse(before), counts = validate(r), at = new Date().toISOString();
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const row = r.workflows.find(row => row.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false);
  row.closureReview.ingestionCloseCurrent = true;
  row.closureReview.ingestionClose = { at, report, currentReceipts: names, reproducedGaps: 4, runtimeCases: 11, sourceFiles: Object.keys(receipts.runtime.sourcesAfter).length, allTenantPeriods: true, financialRecordsPreserved: true, retainedCertifiedBytes: true, workflowClosure: false };
  row.closureReview.reconciliationProducerCloseCurrent = false; row.closureReview.suspenseResolutionCloseCurrent = false; row.closureReview.exceptionClosePublicationCurrent = false;
  row.closureReview.ingestionSourceImpact = 'Prior raw producer, exception and suspense runtime receipts include changed ingestion/shared registry files and are historical at exact-source scope. Current ingestion/Close/signing regression and genuine retained certified-export checks cover affected behavior without claiming all earlier scenarios were rerun. No completed workflow reopened solely due to broad fixture hashes.';
  row.closureReview.verifiedCriteria.push('Provider capture, statement import, rejected signature and altered-provider-event prior-period Close gaps reproduced and corrected. Complete assessment coordination before provider rows, post-wait committed reads, critical exception provenance, real PostgreSQL publication locks, atomic source/event/outbox/Close rollback and retry, simultaneous single-source duplicates, stopped-new-work retained replay, provider/payload denials and retained certified bytes verified.');
  row.evidence = [...new Set([...row.evidence, report, ...Object.values(names)])];
  row.remaining = row.remaining.map(text => text
    .replace('manual allocation and provider ingestion remain to be verified against the same collector.', 'provider ingestion now has scoped verification in INGESTION_CLOSE_2026-10-04.md; manual allocation and remaining producer scope/order still require verification.')
    .replace('Next reproduce provider-event and statement-import publication, whose overlap-limited invalidation conflicts with tenant-wide evidence availability.', 'Provider-event and statement-import publication, including critical rejection, now have scoped verification. Next reproduce suspense posting/correction/recovery scope and ordering against Close.'));
  row.remaining.push('Suspense posting still uses posting-period/date invalidation, and correction/recovery retain source-before-assessment ordering. Reproduce these boundaries next; manual allocation, source-link repair and certificate hash-drift/export scope remain queued for consumer-based review. See ' + report + '.');
  row.implementationStatus += ' Ingestion now coordinates the complete Close scope before provider rows, preserves duplicate/admission behavior and marks critical rejected evidence through a distinct exception descriptor.';
  row.runtimeStatus += ' Ingestion checkpoint: 198 tests/10 suites, full TypeScript, five-file lint and 11 PostgreSQL scenarios pass; real lock orders, atomic outbox/Close rollback, duplicates, denials and retained certified exports verified. Parent closure remains open.';
}
r.updatedAt = at; r.executionPolicy.note = 'Cash primary, Close supporting. Four provider ingestion/Close gaps corrected and 11 runtime scenarios verified. Next suspense posting/correction/recovery publication scope and lock compatibility; retain manual allocation, source repair/hash drift, full authority/accessibility/capacity and original external/manual-posting approval dependencies.';
const next = Buffer.from(JSON.stringify(r, null, 2) + '\n'); assert.ok(next.length >= before.length); const registerAfter = sha(next);
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${registerAfter}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. Four ingestion/Close gaps corrected; no workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Provider/statement ingestion → Close | Other producers, authority, full recovery | Engineering; suspense posting/recovery |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Accepted/rejected evidence, races, retained exports | Other producers, statements, accessibility/capacity | Engineering; same handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** Actual event capture, statement import, rejected signature and altered-event detection each let an earlier-period collector persist 16 obsolete rows. Ingestion now coordinates every tenant assessment before provider rows and rereads committed provider/idempotency state after waits. Critical rejections have their own exception-based invalidation reason. Statement admission precedes coordination; retained duplicates remain usable when new work stops. No workflow discovered, reopened or closed.

**Verification:** 198 tests/ten suites, full no-emit TypeScript and five-file lint passed. Eleven PostgreSQL scenarios verify all four branches, zero obsolete rows, Read Committed freshness, both observed lock orders, source/event/outbox/Close rollback and retry, simultaneous single-source duplicates, provider/payload denials, stopped-work retained replay and original certified bytes. Financial records and outside-fixture fingerprints remain intact. [Detailed correction, receipts and guidance](${report}). No new UI/browser claim.

**Failures retained:** Two unit attempts exposed incomplete raw-lock mocks and assertions against the wrong error/metadata fields. Final checks verify the existing ingestion reason and actual durable exception payload; production controls were not weakened. Earlier raw producer/exception/suspense bindings are historical after ingestion and the shared registry changed. Current affected-boundary tests and genuine retained exports pass; previous scenarios were not all repeated.

**Next:** Reproduce suspense posting/correction/recovery → Close. Posting still narrows invalidation to its posting period/date; correction/recovery still lock source rows before assessment coordination. Manual allocation, source-link repair and certificate hash-drift/export scope remain queued for consumer-based review. Keep Cash primary and Close supporting.

**Remaining:** Full financial/authority/transport lifecycles, authentic bank/provider evidence, native accessibility/true zoom, representative provider latency/pool/period performance and worker delivery/rollout. Existing static boundary and separately controlled aggregate policy/release gates remain unresolved. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All original requirements and 17 families remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const out = path.join(__dirname, 'ingestion-close-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'), before, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'), progressBefore, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.next.md'), progress, { flag: 'wx' });
assert.equal(sha(fs.readFileSync(registerFile)), registerBeforeHash);
const fd = fs.openSync(registerFile, 'r+'); try { fs.writeFileSync(fd, next); } finally { fs.closeSync(fd); }
assert.equal(sha(fs.readFileSync(registerFile)), registerAfter); assert.equal(sha(fs.readFileSync(progressFile)), progressBeforeHash);
const pending = { at, report, registerBefore: registerBeforeHash, registerAfter, progressBefore: progressBeforeHash, counts, bindings, currentReceipts: names, reproducedGapsCorrected: 4, runtimeScenarios: 11, workflowClosures: 0, goalComplete: false };
fs.writeFileSync(path.join(out, 'register-publication.json'), JSON.stringify(pending, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ checkpoint: out, registerHash: registerAfter, nextProgress: path.join(out, 'CURRENT_PROGRESS.next.md'), counts }));
