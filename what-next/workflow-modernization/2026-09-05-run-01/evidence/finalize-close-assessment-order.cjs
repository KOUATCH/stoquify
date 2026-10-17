// One-use guarded checkpoint; execute only after reviewing terminal receipts.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const runDir = path.resolve(__dirname, '..'), root = path.resolve(runDir, '../../..');
const configPath = path.resolve(process.argv[2]); assert.ok(configPath.startsWith(__dirname + path.sep));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
assert.ok(config.receipts.some(name => name.includes('close-unique-current-browser-')), 'Final browser receipt required');
assert.ok(!config.verificationSummary.startsWith('Pending'), 'Final verification summary required');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const rel = file => path.relative(root, file).replaceAll('\\', '/');
const registerFile = path.join(runDir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(runDir, 'CURRENT_PROGRESS.md');
const original = fs.readFileSync(registerFile), oldProgress = fs.readFileSync(progressFile);
assert.equal(sha(original), 'da65cd51c5dfc0e3fa7b22dfc8f2ef7bb28380bee2e9c2bf617cec2353724e90', 'Register changed since baseline');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
assert.equal(head, '62a56036a5ac9b37236a20c9b148052199069479');
const at = new Date().toISOString(), id = crypto.randomUUID(), reviewName = 'close-assessment-order-review-' + id + '.json';
const review = { at, id, head, classification: 'progress', complete: false, primary: 'FA-CASH-COMMAND', supporting: 'FA-CLOSE-PACK', receipts: [], currentSource: {}, artifacts: {}, limitations: config.limitations };
function artifact(file) { const bytes = fs.readFileSync(file); review.artifacts[rel(file)] = sha(bytes); return bytes; }
for (const name of config.receipts) {
  const file = path.join(runDir, name), receipt = JSON.parse(artifact(file));
  assert.equal(receipt.passed, true, name); assert.equal(receipt.sourceStable, true, name);
  for (const key of ['outsideUnchanged', 'noOperationFinancialEffects']) if (key in receipt) assert.equal(receipt[key], true, name + ' ' + key);
  const sources = receipt.sourceAfter || receipt.sourcesAfter; assert.ok(sources, name);
  for (const [source, hash] of Object.entries(sources)) { assert.equal(sha(fs.readFileSync(path.join(root, source))), hash, name + ': stale source ' + source); review.currentSource[source] = hash; }
  review.receipts.push({ file: name, sha256: review.artifacts[rel(file)], summary: receipt.summary, checks: receipt.checks?.length, journeys: receipt.journeys?.length });
  for (const name of [receipt.log, receipt.jest].filter(Boolean)) artifact(path.join(root, name));
  for (const journey of receipt.journeys || []) {
    for (const name of journey.screenshots || []) artifact(path.join(path.dirname(file), name));
    if (journey.artifact) assert.equal(sha(artifact(path.join(path.dirname(file), journey.artifact.file))), journey.artifact.fileSha256);
  }
}
for (const name of config.artifacts) artifact(path.join(runDir, name));
const registry = JSON.parse(original), ids = ['FA-CASH-COMMAND', 'FA-CLOSE-PACK'];
assert.equal(registry.workflows.length, 270); assert.equal(registry.families.length, 17);
const untouched = JSON.stringify(registry.workflows.filter(w => !ids.includes(w.id))), families = JSON.stringify(registry.families);
const obsolete = text => text.startsWith('Implement and verify unique-current assessment creation/certification concurrency;') || text.startsWith('Clarify already-certified export/retrieval guidance:');
for (const workflow of registry.workflows.filter(w => ids.includes(w.id))) {
  assert.equal(workflow.status, 'In progress');
  workflow.implementationStatus = 'unique_current_assessment_publication_certification_and_proof_integrated';
  workflow.runtimeStatus = 'scoped_unit_database_concurrency_and_en_fr_stale_submission_recovery_verified';
  workflow.evidence.push('CLOSE_ASSESSMENT_ORDER_2026-10-01.md', 'evidence/' + reviewName);
  workflow.remaining = workflow.remaining.filter(text => !obsolete(text));
  workflow.remaining.push('Unique-current publication/certification and related-period tenant guards are verified. Source-writer target discovery can still miss a newly published assessment; complete participating-producer period locking and global multi-period ordering.', 'Already-recorded certification guidance is corrected. Native assistive technology, true zoom, inherited localization/contrast/hydration and representative production latency remain; no statutory, security or release certification is claimed.');
  const closure = workflow.closureReview;
  closure.complete = false; closure.latestScopedReview = 'evidence/' + reviewName;
  closure.verifiedCriteria = [...new Set([...(closure.verifiedCriteria || []), ...config.verifiedCriteria])];
  if (Array.isArray(closure.remaining)) closure.remaining = closure.remaining.filter(text => !obsolete(text));
  closure.uniqueCurrentAssessmentBindingCurrent = true;
  closure.currentAssessmentRecoveryBindingCurrent = false;
  closure.priorCloseEvidenceNote = 'Historical receipts are retained. This checkpoint binds unique-current admission, both publication/certification orderings, existing invalidation races and localized stale-submission recovery. It does not recertify every prior Cash handoff or complete lifecycle.';
}
const cash = registry.workflows.find(w => w.id === ids[0]);
for (const key of ['proofPresentationBindingCurrent', 'proofCompletenessBindingCurrent', 'closeDestinationProofBindingCurrent']) if (key in cash.closureReview) cash.closureReview[key] = false;
const counts = Object.fromEntries(Object.keys(registry.coverage.statusCounts).map(key => [key, registry.workflows.filter(w => w.status === key).length]));
assert.equal(counts['Complete—verified'], 4); assert.equal(counts['In progress'], 2);
const unmapped = registry.entrySourceReconciliation.filter(entry => !entry.matchedWorkflowIds?.length).length; assert.equal(unmapped, 191);
registry.updatedAt = at; registry.coverage.statusCounts = counts; registry.coverage.unmappedEntrySources = unmapped;
registry.executionPolicy.supportingDependency = 'FA-CLOSE-PACK: source-bound evidence recovery, producer publication ordering and retained history';
registry.executionPolicy.note = 'Unique-current assessment admission and controlled stale-submission recovery verified. No workflow closed or split. Continue the existing Cash closure checklist through source-bound unavailable-evidence replacement and all producer lifecycle boundaries.';
registry.sourceReconciliation.current = false; registry.sourceReconciliation.latestScopedReview = 'evidence/' + reviewName;
assert.equal(JSON.stringify(registry.workflows.filter(w => !ids.includes(w.id))), untouched); assert.equal(JSON.stringify(registry.families), families);
const updated = Buffer.from(JSON.stringify(registry, null, 2) + '\n'), registerHash = sha(updated);
const progress = `# Current progress

Updated ${at}; HEAD ${head}, branch codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: ${registerHash}. Full-register source reconciliation remains incomplete.

**Position:** 270 workflows discovered; discovery incomplete; 191 unmapped entries. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow closed this turn.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Current/historical Close proof agrees with admission | Source-bound missing-evidence replacement; full source/authority lifecycle | Engineering | Link authoritative replacement evidence |
| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Unique-current publication/certification ordering and stale-submit recovery | Producer discovery, multi-period ordering, delivery/recovery | Accounting engineering | Coordinate producer period locks |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Delivered:** Assessment publication and certification now serialize per tenant/period. The database supplies strictly increasing publication times; ties or clock regression cannot silently select a winner. Certification requires the unique latest, non-voided assessment. Related-period ownership is checked. Historical assessment status, drafts and recorded exports remain available. Dashboard/proof reads share coherent selection; EN/FR messages explain historical, tied and voided states. Already-recorded certification has accurate guidance.

**Verification:** ${config.verificationSummary} [Detailed evidence and operating guidance](CLOSE_ASSESSMENT_ORDER_2026-10-01.md). No customer, statutory or release approval is established.

**Remaining:** A source writer can discover old run IDs before a new assessment is published; all participating producers need verified period locking and global multi-period order. Historical unavailable evidence needs replacement ID/hash binding. Other producers, future-period recovery, interrupted processing/outbox delivery, whole Cash lifecycle, authentic country/payroll prerequisites, full accessibility/hydration and production performance remain open. Receipt/invoice legacy and carrying-value conflicts remain retained.

All 17 original families remain in the [register](WORKFLOW_REGISTER.json): identity, organization/access, modules, master data, sales, POS/offline, inventory, purchasing/AP, payments, finance/close, HRIS/payroll, compliance, analytics, evidence/governance, notifications, integrations and AI. Unrelated 268 workflow rows, all families and all workflow statuses are unchanged. No migration, deployment, live activation, payment, external message or X1 clearance occurred. No user input blocks the next local implementation. ETA remains unreliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
review.workflowCounts = counts; review.unmapped = unmapped; review.registerBeforeSha256 = sha(original); review.registerAfterSha256 = registerHash; review.progressSha256 = sha(progress); review.progressWords = progress.split(/\s+/).length;
fs.writeFileSync(path.join(__dirname, 'close-order-register-before-' + id + '.json'), original, { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, 'close-order-progress-before-' + id + '.md'), oldProgress, { flag: 'wx' });
function replace(file, bytes) { const temp = file + '.' + id + '.tmp'; fs.writeFileSync(temp, bytes, { flag: 'wx' }); fs.renameSync(temp, file); assert.equal(sha(fs.readFileSync(file)), sha(bytes)); }
replace(registerFile, updated); replace(progressFile, Buffer.from(progress));
fs.writeFileSync(path.join(__dirname, reviewName), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ review: rel(path.join(__dirname, reviewName)), registerSha256: registerHash, counts, progressWords: review.progressWords, sourceCount: Object.keys(review.currentSource).length, passed: true }));
