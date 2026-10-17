const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const run = path.resolve(__dirname, '..'), root = path.resolve(run, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
if (process.argv[2] !== '--prepare') { console.log('Inert: --prepare and five passing receipt paths required'); process.exit(0); }
const refs = process.argv.slice(3); assert.equal(refs.length, 5); const sources = {}, receipts = {};
const values = refs.map(name => {
  const file = path.resolve(run, name); assert.ok(file.startsWith(run + path.sep)); const bytes = fs.readFileSync(file), value = JSON.parse(bytes); receipts[name] = sha(bytes);
  assert.equal(value.passed, true); assert.equal(value.sourceStable, true); assert.deepEqual(value.sourceBefore, value.sourceAfter);
  for (const [file, hash] of Object.entries(value.sourceAfter)) { assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, file); if (sources[file]) assert.equal(sources[file], hash); sources[file] = hash; }
  return value;
});
assert.deepEqual(values[0].summary, { passed: 636, failed: 0, skipped: 0, suites: 24, failedSuites: 0 });
assert.equal(values[1].phase, 'typecheck'); assert.equal(values[2].phase, 'lint'); assert.equal(values[3].checks.length, 7); assert.ok(values[3].checks.every(row => row.passed)); assert.equal(values[3].commentsUnchanged, true);
for (const value of values.slice(3)) { assert.equal(value.outsideUnchanged, true); assert.equal(value.financialUnchanged, true); }
assert.equal(values[4].journeys.length, 2);
for (const row of values[4].journeys) {
  for (const flag of ['passed', 'correctFailureShown', 'keyboardRefresh', 'sourceRecordsUnchanged']) assert.equal(row[flag], true);
  assert.equal(row.viewports.length, 3); for (const v of row.viewports) assert.ok(v.content <= v.width + 1 && v.pageWidth <= v.viewport + 1 && v.reducedMotion);
}
const registerBefore = fs.readFileSync(path.join(run, 'WORKFLOW_REGISTER.json')), progressBefore = fs.readFileSync(path.join(run, 'CURRENT_PROGRESS.md'));
assert.equal(sha(registerBefore), 'f3c98fa126743998a4fa39c8804034a845dc7313dd5e52e5797b0b14acd4561f');
assert.equal(sha(progressBefore), '640796aa535a4b7d889c43ae16657195d05755c534b1440892d67d2c315ce43e');
const register = JSON.parse(registerBefore), at = new Date().toISOString(), report = 'CLOSE_NOTIFICATION_PROVENANCE_2026-10-04.md'; assert.ok(fs.existsSync(path.join(run, report)));
for (const row of register.workflows.filter(row => ['FA-CASH-COMMAND', 'FA-CLOSE-PACK'].includes(row.id))) {
  row.evidence = [...new Set([...row.evidence, report, ...refs])];
  row.notificationProvenance = { updatedAt: at, report, focusedTests: 636, runtimeChecks: 7, browserJourneys: 2, requestResponseStatusSeparated: true, realDeliveryVerified: false, workflowClosure: false };
  row.remaining.push(`The delegated work desk now binds request and response-review notification statuses to their own exact event/correlation keys. Synthetic contrasting statuses and actual EN/FR display are verified; they do not prove delivery. Current source has no Close notification delivery consumer or durable Close inbox destination; response events still target original requesters. Implement destination, current-authority routing, leased worker, operator recovery and actual publication verification. Delegated pending-request replacement/recovery compatibility also remains open. See ${report}.`);
}
register.updatedAt = at;
const counts = Object.fromEntries(['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'].map(status => [status, register.workflows.filter(row => row.status === status).length]));
assert.equal(register.workflows.length, 270); assert.equal(counts.Queued, 264); assert.equal(counts['In progress'], 2); assert.equal(counts['Complete—verified'], 4);
const nextRegister = Buffer.from(JSON.stringify(register, null, 2) + '\n');
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${sha(nextRegister)}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Verified progress | Remaining closure | Blocker/owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash/Close recovery and current authority | All producers, authority and complete recovery | Engineering; complete recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Departed-requester supervision and correct notification provenance | Durable notification delivery, delegated compatibility, races/accessibility | Engineering; implement Close destination and delivery consumer |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and improve diagnostics |

**Since the previous report:** Corrected the accountant work desk's notification provenance. Submitted response rows formerly displayed the original request's notification status. They now use the response event and correlation key; missing or mismatched evidence stays unknown and read errors propagate. EN/FR labels identify request versus response-review notifications. This prevents request success from hiding review-notification failure. No workflow was discovered, reopened or closed.

**Verification:** 636 focused tests, no-emit TypeScript and lint passed. Seven owned-PostgreSQL scenarios contrast request/response states and verify missing-event and revoked-mandate behavior. Actual EN/FR accountant-portfolio screens show response failure despite request success, retain it after keyboard refresh, and fit 1440/768/320px with reduced motion. Source, financial and outside-fixture fingerprints match. These are explicitly synthetic notification states, not delivery evidence. See the [single detailed record](${report}) for receipts, screenshots, timings and guidance.

**Actionable finding:** Close producers retain notification outbox messages, but current source has no Close delivery consumer or durable Close notification destination. Response events still name the original requester. The existing generic worker supplies leases/backoff; reconciliation's destination is domain-specific. Implement the Close destination, permission-controlled audience resolution, consumer and operator recovery, then verify actual publication and retry. Do not mark queued messages sent manually. Delegated pending-request projection also needs compatibility with recipient replacement and authorized evidence recovery.

**Remaining:** Correction where no valid evidence chain matches finding state; further authority races, diagnostics, full accessibility/zoom and capacity. Scoped tab drafts retain 24-hour expiry/privacy limits; investigation remains bounded to 100 records/audits and latest 20 recovery events. Bank import/provenance, finalization, concurrent evidence reuse, original cash/purchase/Close handoffs, other producers, freshness, manual-session/legacy-role authority, signing/publication races and country/payroll evidence remain. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request.

All families remain in the [register](WORKFLOW_REGISTER.json): identity/modules, finance, sales/POS, inventory/purchasing, payroll, compliance/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const directory = path.join(run, 'evidence', 'close-notification-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(directory);
for (const [name, bytes] of Object.entries({ 'WORKFLOW_REGISTER.json': registerBefore, 'CURRENT_PROGRESS.md': progressBefore, 'NEXT_WORKFLOW_REGISTER.json': nextRegister, 'NEXT_CURRENT_PROGRESS.md': progress })) fs.writeFileSync(path.join(directory, name), bytes, { flag: 'wx' });
const publication = { at, receipts, sources, counts, workflowClosures: 0, registerBefore: sha(registerBefore), progressBefore: sha(progressBefore), registerAfter: sha(nextRegister), progressAfter: sha(Buffer.from(progress)) };
fs.writeFileSync(path.join(directory, 'prepared-publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ prepared: directory, registerAfter: publication.registerAfter, progressAfter: publication.progressAfter }));
