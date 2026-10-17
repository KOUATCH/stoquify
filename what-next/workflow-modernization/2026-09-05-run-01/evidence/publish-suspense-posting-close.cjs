'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const mode = process.argv[2];
if (!['--publish', '--finalize'].includes(mode)) { console.log('Inert; explicit checkpoint mode required.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = value => crypto.createHash('sha256').update(value).digest('hex');
const report = 'SUSPENSE_POSTING_CLOSE_2026-10-04.md';
const names = {
  jest: 'evidence/suspense-posting-close-jest-f9c8824d-9e4b-4cb6-9f2e-a521c0375d9e.json',
  typecheck: 'evidence/suspense-posting-close-typecheck-f140bb97-1cca-4415-9d0a-9681fbab4d93.json',
  lint: 'evidence/suspense-posting-close-lint-f1b1768d-dff0-4199-97c6-109765865b6f.json',
  runtime: 'lanes/environment/suspense-posting-close-acceptance-041770c6-ec33-4a56-a9ae-c9baebefd8c4.json',
  correction: 'lanes/environment/suspense-correction-lock-acceptance-2f05d450-c425-4841-aac6-a3a27760c99f.json',
};
const bindings = {}, receipts = {};
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(dir, name)), value = JSON.parse(bytes); receipts[key] = value; bindings[name] = sha(bytes);
  assert.equal(value.passed, true); assert.equal(value.sourceStable, true);
  const source = value.sourcesAfter || value.sourceAfter; assert.ok(Object.keys(source).length);
  for (const [file, hash] of Object.entries(source)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Changed source: ' + file);
}
assert.deepEqual(receipts.jest.summary, { passed: 169, failed: 0, pending: 0, suites: 9, failedSuites: 0 });
for (const [key, count] of [['runtime', 7], ['correction', 1]]) {
  assert.equal(receipts[key].checks.length, count); assert.ok(receipts[key].checks.every(row => row.passed)); assert.equal(receipts[key].outsideUnchanged, true);
}
assert.equal(receipts.correction.checks[0].replayAssessmentLocks, 0);
assert.ok(receipts.correction.checks[0].rawErrors.every(error => error.postgres !== '40P01'));
for (const name of [report, 'SUSPENSE_POSTING_CLOSE_CHECKLIST_2026-10-04.md',
  'lanes/environment/suspense-posting-close-baseline-84cf7aff-753e-43ed-bd03-d9f88f2284c9.json',
  'lanes/environment/suspense-correction-lock-baseline-48715793-4a60-4478-8aae-54a609ae9bec.json',
  'lanes/environment/suspense-posting-close-acceptance-2bee8261-6838-44bd-a7bf-6bb1511d71cf.json',
  'evidence/suspense-posting-close-jest-a6b0eb2d-3268-471b-8ed1-23274b28c40e.json',
  'evidence/suspense-posting-close-before-20261004.json']) bindings[name] = sha(fs.readFileSync(path.join(dir, name)));
const registerFile = path.join(dir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(dir, 'CURRENT_PROGRESS.md');
const oldRegister = '5536439084df6b8bf6e9e556d690f9933d73411371851cdafed97f9d6395e767', oldProgress = '504c52ff3c3fc4678fb02acd7378061738822830c0d64d33f82a70f0d2a1d0f3';
function validate(register) {
  const counts = {}; for (const row of register.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
  assert.equal(register.workflows.length, 270); assert.equal(register.families.length, 17); assert.equal(register.coverage.unmappedEntrySources, 191); assert.equal(register.discoveryComplete, false);
  assert.deepEqual(counts, { Queued: 264, 'Complete—verified': 4, 'In progress': 2 }); return counts;
}
if (mode === '--finalize') {
  const out = path.resolve(process.argv[3]); assert.equal(path.dirname(out), __dirname); assert.ok(path.basename(out).startsWith('suspense-posting-close-checkpoint-'));
  const pending = JSON.parse(fs.readFileSync(path.join(out, 'register-publication.json'))); assert.deepEqual(pending.bindings, bindings);
  assert.equal(sha(fs.readFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'))), oldRegister);
  assert.equal(sha(fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'))), oldProgress);
  const register = fs.readFileSync(registerFile), progress = fs.readFileSync(progressFile); assert.equal(sha(register), pending.registerAfter);
  assert.equal(progress.toString().replace(/\r\n/g, '\n'), fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.next.md'), 'utf8')); assert.ok(progress.toString().split(/\s+/).length <= 700);
  const counts = validate(JSON.parse(register));
  const publication = { ...pending, finalizedAt: new Date().toISOString(), progressAfter: sha(progress), counts, passed: true };
  fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash: pending.registerAfter, progressHash: publication.progressAfter, counts, passed: true })); process.exit(0);
}
const before = fs.readFileSync(registerFile), progressBefore = fs.readFileSync(progressFile);
assert.equal(sha(before), oldRegister); assert.equal(sha(progressBefore), oldProgress);
const register = JSON.parse(before), counts = validate(register), at = new Date().toISOString();
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const row = register.workflows.find(row => row.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false);
  row.closureReview.suspensePostingCloseCurrent = true;
  row.closureReview.suspensePostingClose = { at, report, receipts: names, runtimeScenarios: 8, stalePublicationCorrected: true, retainedReplayDeadlockCorrected: true, parentWorkflowComplete: false };
  row.closureReview.verifiedCriteria.push('Suspense posting invalidates complete tenant Close scope: earlier-period obsolete status reproduced, zero obsolete rows after correction, both PostgreSQL publication lock orders, whole-snapshot retry, once-only balanced posting, retained closed-period replay, source/event/outbox/Close rollback and fresh retry, actor/revision/object denials verified. Real correction-versus-retained-posting deadlock reproduced and removed by omitting unnecessary assessment locks for retained replay.');
  row.evidence = [...new Set([...row.evidence, report, ...Object.values(names)])];
  row.remaining = row.remaining.map(value => value.replace('Suspense posting still uses posting-period/date invalidation, and correction/recovery retain source-before-assessment ordering. Reproduce these boundaries next;', 'Suspense posting scope and its retained-replay deadlock now have scoped verification. Correction/recovery still need broader lock compatibility and lifecycle review;'));
  row.remaining.push('Continue correction/recovery versus valid and stale commands, resolution replay, period closure and assessment publication; the specific retained-posting replay deadlock is corrected, not every reverse lock order. See ' + report + '.');
  row.implementationStatus += ' Suspense posting now coordinates complete Close scope, advances authentication through waits, and avoids unnecessary assessment locks during retained replay.';
  row.runtimeStatus += ' Posting checkpoint: 169 tests/9 suites, final TypeScript and two-file lint pass; eight current PostgreSQL cases include stale suppression, balanced single posting, rollback, replay and removal of an observed 40P01 deadlock. Full parent closure remains open.';
}
register.updatedAt = at;
register.executionPolicy.note = 'Cash primary, Close supporting. Suspense posting stale publication and retained-replay deadlock corrected with eight PostgreSQL scenarios. Next broader correction/recovery lock compatibility and lifecycle; preserve remaining manual allocation, source repair/hash drift, authority/accessibility/capacity, external evidence and unapplied manual-posting approval dependencies.';
const next = Buffer.from(JSON.stringify(register, null, 2) + '\n'); assert.ok(next.length >= before.length); const registerAfter = sha(next);
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${registerAfter}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. Posting stale evidence and a retained-replay deadlock corrected; no workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Suspense posting, replay and correction collision | Broader correction/recovery, authority and delivery | Engineering; reverse lock compatibility |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Posting scope, races and rollback | Other producers, statements, accessibility/capacity | Engineering; same handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** A real posting left an earlier-period collector able to persist 15 obsolete rows, including the prior suspense status. New postings now coordinate the full Close scope before source rows and advance authentication through waits. A further database reproduction found a deadlock between source correction and retained posting replay. Replay now omits unnecessary assessment locks, retains source/receipt verification and returns a normal stale-state conflict if correction supersedes it. No discovered workflow was reopened, closed or added.

**Verification:** 169 tests/nine suites, full no-emit TypeScript and two-file lint pass. Eight PostgreSQL scenarios verify zero obsolete rows, both observed publication lock orders, whole-snapshot retry, balanced once-only posting, closed-period retained replay, financial/source/receipt/outbox/Close rollback and retry, denials and the corrected deadlock. Outside-fixture fingerprints are unchanged. [Correction, receipts and operating guidance](${report}). No new browser/accessibility or performance certification is claimed.

**Failures retained:** One unit assertion used the wrong AND/OR query shape. One database fixture exceeded the existing invoice-number limit. Both were corrected without weakening production rules. The reproduced 40P01 deadlock led to a production fix; current collision verification observes source waiting and a safe 40001 conflict after correction. Earlier intermediate receipts remain historical where final source changed. Published ingestion evidence remains applicable; it does not bind the changed posting service.

**Next:** Review correction/recovery against other valid and stale commands, resolution replay, period closure and assessment publication. Their source-before-assessment ordering still needs consumer-based verification. Manual allocation, source-link repair and certificate drift/export scope remain queued. Keep Cash primary and Close supporting.

**Remaining:** Full authority/transport/recovery lifecycles, authentic provider evidence, native accessibility/true zoom, representative period/pool performance and worker delivery/rollout. Existing static boundary and separately controlled aggregate policy/release gates remain open. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All original requirements and 17 families remain in the [register](WORKFLOW_REGISTER.json). The full goal stays active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const out = path.join(__dirname, 'suspense-posting-close-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'), before, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'), progressBefore, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.next.md'), progress, { flag: 'wx' });
assert.equal(sha(fs.readFileSync(registerFile)), oldRegister);
const fd = fs.openSync(registerFile, 'r+'); try { fs.writeFileSync(fd, next); } finally { fs.closeSync(fd); }
assert.equal(sha(fs.readFileSync(registerFile)), registerAfter); assert.equal(sha(fs.readFileSync(progressFile)), oldProgress);
const pending = { at, report, registerBefore: oldRegister, registerAfter, progressBefore: oldProgress, counts, bindings, receipts: names, runtimeScenarios: 8, workflowClosures: 0, goalComplete: false };
fs.writeFileSync(path.join(out, 'register-publication.json'), JSON.stringify(pending, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ checkpoint: out, registerHash: registerAfter, nextProgress: path.join(out, 'CURRENT_PROGRESS.next.md'), counts }));
