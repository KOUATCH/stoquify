const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const run = path.resolve(__dirname, '..'), root = path.resolve(run, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
if (process.argv[2] !== '--prepare') { console.log('Inert: --prepare and four source-bound receipt paths required'); process.exit(0); }
const refs = process.argv.slice(3); assert.equal(refs.length, 4);
const receipts = {}, source = {}, results = refs.map((relative, index) => {
  const filename = path.resolve(run, relative); assert.ok(filename.startsWith(run + path.sep));
  const bytes = fs.readFileSync(filename), result = JSON.parse(bytes); receipts[relative] = sha(bytes);
  if (index < 3) assert.equal(result.passed, true);
  assert.equal(result.sourceStable, true); assert.deepEqual(result.sourceBefore, result.sourceAfter);
  for (const [name, hash] of Object.entries(result.sourceAfter)) { assert.equal(sha(fs.readFileSync(path.join(root, name))), hash, name); if (source[name]) assert.equal(source[name], hash); source[name] = hash; }
  return result;
});
assert.equal(results[0].summary.passed, 58); assert.equal(results[1].phase, 'typecheck'); assert.equal(results[2].phase, 'lint'); assert.equal(results[3].outsideUnchanged, true); assert.equal(results[3].passed, true); assert.equal(results[3].financialUnchanged, true);
const runtime = results[3], count = runtime.checks.filter(row => row.passed).length;
const registerBefore = fs.readFileSync(path.join(run, 'WORKFLOW_REGISTER.json')), progressBefore = fs.readFileSync(path.join(run, 'CURRENT_PROGRESS.md'));
assert.equal(sha(registerBefore), 'cd058e0ace36fed95d67b033a0445b10f8dee050c52c46f2c9106b3ed77269af');
assert.equal(sha(progressBefore), '835b0941d94ffe58c03e565d7c0a1b29f81bda03db4cfeab543ce84fe057f810');
const register = JSON.parse(registerBefore), at = new Date().toISOString(), report = 'CLOSE_EVIDENCE_WORKFLOW_2026-10-03.md';
for (const row of register.workflows.filter(row => ['FA-CASH-COMMAND', 'FA-CLOSE-PACK'].includes(row.id))) {
  row.evidence = [...row.evidence, report, ...refs];
  row.closeEvidenceInterface = { updatedAt: at, report, focusedTests: 58, runtimePassedChecks: count, runtimePassed: runtime.passed === true, browserVerified: false, workflowClosure: false };
  row.remaining = row.remaining.map(text => text.replace('Historical missing-evidence request/response UI integration', 'Historical missing-evidence request/response UI is integrated; its browser, expiry/retry and bounded-list completion proof remains'));
  row.remaining.push(`Close evidence recovery panel integrated with current-role and module-scoped reads/actions. ${count}/4 persisted read-model lifecycle checks passed; browser, expired-request retry, full concurrency and bounded-list completion remain unverified. See ${report}.`);
}
register.updatedAt = at;
const counts = Object.fromEntries(['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'].map(status => [status, register.workflows.filter(row => row.status === status).length]));
assert.equal(register.workflows.length, 270); assert.deepEqual(counts, { Queued: 264, 'In progress': 2, 'Verification pending': 0, 'Blocked—engineering': 0, 'Blocked—external': 0, 'Complete—verified': 4 });
const nextRegister = Buffer.from(JSON.stringify(register, null, 2) + '\n');
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${sha(nextRegister)}. Shared changes preserved.

**Position:** 270 workflows / 17 families; discovery incomplete, 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No new workflow closure or denominator change. Previous turn was verified progress on cash evidence recovery and EN/FR journeys.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash lifecycle and EN/FR proof; Close recovery panel integrated | Complete user recovery, all producers and authority | Engineering; prior manual-period approval outstanding | Verify new Close panel in browser |
| Supporting | FA-CLOSE-PACK: reliable retained evidence | In progress | Historical recovery read model; ${count}/4 persisted checks | Expiry/retry, bounded lists, concurrency, original purchase recovery | Engineering | Complete recovery edge cases and browser proof |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and complete recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Identity owner | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Since the previous report:** Added the Close period's missing-evidence panel using existing request, response and replacement-acceptance services. Historical missing findings remain visible after newer assessments. Queues and colleague choices use current tenant permissions; private responses require review access. Read-only module access disables writes, including restored commands. Drafts/pending requests are tenant/user/period scoped; password verification never implicitly accepts evidence. The no-period state regression found by testing was corrected.

**Verification:** 58 focused checks across four suites, current no-emit TypeScript and changed-file lint passed. Persisted lifecycle: ${count}/4 checks passed; overall ${runtime.passed ? 'passed' : 'not passed'}. Sources stable and outside-fixture observations unchanged. New-panel browser verification remains incomplete. [Implementation, failed attempts, operating inputs and exact remaining criteria](${report}). Prior cash proof remains separate: five database checks and two EN/FR browser journeys; it does not establish this new interface's completion.

**Remaining:** Request-expiry retry, full role/session/concurrency proof, bounded-list completion and new-panel accessibility/browser journeys. Bank import/provenance, actual bank finalization, concurrent evidence reuse and the original purchase/Close recovery criteria remain. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request. Other producers, draft freshness, manual-session/legacy-role authority, signing/publication races, delivery, country/payroll evidence and capacity remain required.

All families and queued requirements remain in the [register](WORKFLOW_REGISTER.json): identity/access/modules, finance/ledger/close, sales/POS, inventory/purchasing, payroll, compliance/evidence/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const directory = path.join(run, 'evidence', 'close-evidence-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(directory);
for (const [name, bytes] of Object.entries({ 'WORKFLOW_REGISTER.json': registerBefore, 'CURRENT_PROGRESS.md': progressBefore, 'NEXT_WORKFLOW_REGISTER.json': nextRegister, 'NEXT_CURRENT_PROGRESS.md': progress })) fs.writeFileSync(path.join(directory, name), bytes, { flag: 'wx' });
const receipt = { at, receipts, source, counts, workflowClosures: 0, registerBefore: sha(registerBefore), progressBefore: sha(progressBefore), registerAfter: sha(nextRegister), progressAfter: sha(Buffer.from(progress)) };
fs.writeFileSync(path.join(directory, 'prepared-publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ prepared: directory, registerAfter: receipt.registerAfter, progressAfter: receipt.progressAfter }));
