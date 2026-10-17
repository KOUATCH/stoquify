// One-use guarded checkpoint. Receipt configuration is reviewed by the coordinator.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const runDir = path.resolve(__dirname, '..'), root = path.resolve(runDir, '../../..');
const configPath = path.resolve(process.argv[2]); assert.ok(configPath.startsWith(__dirname + path.sep));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative));
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const registerFile = path.join(runDir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(runDir, 'CURRENT_PROGRESS.md');
const original = fs.readFileSync(registerFile), oldProgress = fs.readFileSync(progressFile);
assert.equal(sha(original), '00707bb0ea36b734f79ec41f712b517be845695afdef7e1a5543a07466f3f28b', 'Register changed since baseline');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
assert.equal(head, '62a56036a5ac9b37236a20c9b148052199069479');
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const at = new Date().toISOString(), id = crypto.randomUUID(), reviewName = 'close-current-recovery-review-' + id + '.json';
const review = { at, id, head, branch, classification: 'progress', complete: false, primary: 'FA-CASH-COMMAND', supporting: 'FA-CLOSE-PACK', receipts: [], currentSource: {}, artifacts: {}, independentReviews: config.independentReviews, limitations: config.limitations };
for (const entry of config.receipts) {
  const file = path.join(runDir, entry.file), bytes = fs.readFileSync(file), receipt = JSON.parse(bytes);
  assert.equal(receipt.passed, entry.expectedPassed !== false, entry.file);
  assert.equal(receipt.sourceStable, true, entry.file + ' unstable');
  if ('outsideUnchanged' in receipt) assert.equal(receipt.outsideUnchanged, true);
  if ('noOperationFinancialEffects' in receipt) assert.equal(receipt.noOperationFinancialEffects, true);
  const sources = receipt.sourceAfter || receipt.sourcesAfter; assert.ok(sources);
  const superseded = [];
  for (const [sourceFile, sourceHash] of Object.entries(sources)) {
    const current = sha(read(sourceFile));
    if (current !== sourceHash) { assert.ok(entry.allowedSuperseded.includes(sourceFile), entry.file + ': unexpected source revision ' + sourceFile); superseded.push({ file: sourceFile, recorded: sourceHash, current }); }
    review.currentSource[sourceFile] = current;
  }
  review.receipts.push({ file: entry.file, sha256: sha(bytes), passed: receipt.passed, scope: entry.scope, superseded });
  review.artifacts[relative(file)] = sha(bytes);
  for (const artifact of [receipt.log, receipt.jest].filter(Boolean)) review.artifacts[artifact] = sha(read(artifact));
  for (const journey of receipt.journeys || []) {
    for (const name of journey.screenshots || []) { const shot = path.join(path.dirname(file), name); review.artifacts[relative(shot)] = sha(fs.readFileSync(shot)); }
    if (journey.artifact) { const artifact = path.join(path.dirname(file), journey.artifact.file); assert.equal(sha(fs.readFileSync(artifact)), journey.artifact.fileSha256); review.artifacts[relative(artifact)] = journey.artifact.fileSha256; }
  }
}
for (const file of config.artifacts) { const full = path.join(runDir, file); review.artifacts[relative(full)] = sha(fs.readFileSync(full)); }
const registry = JSON.parse(original), cash = registry.workflows.find(w => w.id === 'FA-CASH-COMMAND'), close = registry.workflows.find(w => w.id === 'FA-CLOSE-PACK');
assert.ok(cash && close); assert.equal(registry.workflows.length, 270); assert.equal(registry.families.length, 17);
const counts = Object.fromEntries(Object.keys(registry.coverage.statusCounts).map(key => [key, registry.workflows.filter(w => w.status === key).length]));
assert.equal(counts['Complete—verified'], 4); assert.equal(counts['In progress'], 2);
const unmapped = registry.entrySourceReconciliation.filter(entry => !entry.matchedWorkflowIds?.length).length; assert.equal(unmapped, 191);
const next = [
  'Current assessment recovery and immediate zero-count invalidation are verified; original historical obligations remain. Establish source-bound historical missing-evidence replacement; finding acceptance currently contains no replacement ID/hash.',
  'Implement and verify unique-current assessment creation/certification concurrency; equal-time ambiguity blocks the aggregate but selected-run export is not a unique-latest gate. Preserve historical reading and draft export.',
  'Complete all remaining producers/cumulative period scope, future-period actual recovery, new-run discovery, multi-period ordering, failure/rollback and outbox delivery lifecycle; whole Cash source/authority and original lifecycle checklist remain open.',
  'Clarify already-certified export/retrieval guidance: current screenshot says Close run is not READY / Certified export blocked beside a successful retained export. Full EN/FR, native assistive technology, true zoom, inherited contrast/hydration and representative production latency; authentic country/payroll prerequisites and all original workflow families remain.',
];
for (const workflow of [cash, close]) {
  workflow.implementationStatus = 'current_period_assessment_recovery_zero_count_invalidation_and_deferred_auth_focus_integrated';
  workflow.runtimeStatus = 'scoped_regression_actual_local_database_and_en_fr_cash_close_recovery_verified';
  workflow.evidence.push('CLOSE_CURRENT_ASSESSMENT_2026-10-01.md', 'evidence/' + reviewName);
  workflow.remaining = workflow.remaining.filter(text => !text.startsWith('Cash aggregate remains blocked by retained older') && !text.startsWith('Actual zero-variance count changes evidence') && !text.startsWith('Authorized stale denial now retains evidence'));
  workflow.remaining.push(...next);
  workflow.closureReview.complete = false; workflow.closureReview.latestScopedReview = 'evidence/' + reviewName;
  const criterionKey = Array.isArray(workflow.closureReview.verifiedCriteria) ? 'verifiedCriteria' : 'criteriaVerified';
  if (!Array.isArray(workflow.closureReview[criterionKey])) workflow.closureReview[criterionKey] = [];
  workflow.closureReview[criterionKey] = [...new Set([...workflow.closureReview[criterionKey], ...config.verifiedCriteria])];
  if (Array.isArray(workflow.closureReview.remaining)) workflow.closureReview.remaining = [...new Set([
    ...workflow.closureReview.remaining.filter(text => !text.startsWith('Cash aggregate remains blocked by retained older') && !text.startsWith('Actual zero-variance count changes evidence')),
    ...next,
  ])];
  workflow.closureReview.closeAggregateRecoveryVerified = true;
  workflow.closureReview.currentAssessmentRecoveryBindingCurrent = true;
  workflow.closureReview.closeDenialRecoveryBindingCurrent = false;
  workflow.closureReview.priorCloseEvidenceNote = 'Prior receipts remain retained. This checkpoint binds current assessment/count recovery and deferred focus; changed source hashes do not recertify every older runtime ordering, handoff or complete workflow.';
}
for (const key of config.affectedHistoricalBindingFlags) if (key in cash.closureReview) cash.closureReview[key] = false;
registry.updatedAt = at; registry.coverage.statusCounts = counts; registry.coverage.unmappedEntrySources = unmapped;
registry.executionPolicy.supportingDependency = 'FA-CLOSE-PACK: unique-current assessment, source-bound evidence recovery and retained history';
registry.executionPolicy.note = 'Current-period Cash recovery, immediate zero-count invalidation and deferred identity focus verified. No workflow closed/split. Continue unique-current concurrency and source-bound unavailable-evidence recovery, retaining all original families and downstream requirements.';
registry.sourceReconciliation.current = false;
const updated = Buffer.from(JSON.stringify(registry, null, 2) + '\n'), registerHash = sha(updated);
const progress = `# Current progress\n\nUpdated ${at}; HEAD ${head} on ${branch}. Shared changes preserved. Register SHA256: ${registerHash}. Current scoped evidence is bound; full-register reconciliation remains incomplete.\n\n**Position:** 270 workflows discovered; discovery incomplete; 191 unmapped source entries. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow closed this turn.\n\n| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |\n|---|---|---|---|---|---|---|\n| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Current-period recovery, retained obligations and proof handoff | Source-bound missing-evidence replacement; whole-source/authority lifecycle | Engineering | Bind replacement evidence without rewriting history |\n| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Immediate zero-count invalidation, replay, reassessment and independent export | Unique-current assessment concurrency, all producers and delivery | Accounting engineering | Serialize assessment creation and current certification |\n| Next 1 | PR-17: reconciliation exceptions | Queued | Prior correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |\n| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |\n| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards and improve diagnostics |\n\n**Since the previous report:** Cash now grades the newest assessment per period; older invalidation remains historical while unresolved findings and missing evidence retain their force. Newer failed/running/voided assessments never fall back to old certification. Cash and Close use consistent creation-time discovery. Zero-variance counts invalidate cumulative dependent periods transactionally with correct count-session provenance. Identity focus restoration tolerates delayed enablement and still requires deliberate action retry.\n\n**Verification:** Initial 346 tests/11 suites passed; final affected checks passed 63 inventory/pack tests and 50 UI tests (overlapping counts). Final lint, TypeScript and focused static gates passed. Four real database checks covered recovery, the original unchanged fixture, concurrent snapshot/invalidation and failed-query retry. Actual EN1440/FR320 Cash→Close→certification→Proof journeys passed with keyboard focus, bounded reflow, downloaded hashes and retained old proof. Sources, outside fixtures and operation financial fingerprints stayed unchanged. Initial browser failures were misdiagnosed: they occurred before authentication because the driver focused a disabled button. Its readiness wait is corrected; original focus assertions and failed receipts remain. [Detailed evidence and guidance](CLOSE_CURRENT_ASSESSMENT_2026-10-01.md).\n\n**Remaining:** Finding acceptance has no replacement evidence ID/hash; do not infer restored evidence from text or a resolved status. Equal-time ambiguity blocks the aggregate, but selected-run certification needs a unique-current concurrency contract. Future-period runtime proof, other producers, interrupted recovery and outbox delivery remain open. Whole Cash lifecycle, genuine country/payroll prerequisites, full accessibility/hydration and production performance remain. Receipt/invoice legacy and carrying-value conflicts remain retained. All 17 original families remain in the [register](WORKFLOW_REGISTER.json). No migration, deployment, live approval, external message, payment or X1 clearance occurred. No user action blocks the next local implementation. ETA remains unreliable.\n`;
assert.ok(progress.split(/\s+/).length <= 700);
review.workflowCounts = counts; review.discovered = 270; review.unmapped = unmapped; review.registerBeforeSha256 = sha(original); review.registerAfterSha256 = registerHash;
review.progressSha256 = sha(progress); review.progressWords = progress.split(/\s+/).length;
const backup = path.join(__dirname, 'close-current-register-before-' + id + '.json'); fs.writeFileSync(backup, original, { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, 'close-current-progress-before-' + id + '.md'), oldProgress, { flag: 'wx' });
// Atomic rename avoids Windows mapped-file truncation while preserving exact backups.
function replace(file, bytes) { const temp = file + '.' + id + '.tmp'; fs.writeFileSync(temp, bytes, { flag: 'wx' }); fs.renameSync(temp, file); assert.equal(sha(fs.readFileSync(file)), sha(bytes)); }
replace(registerFile, updated); replace(progressFile, Buffer.from(progress));
fs.writeFileSync(path.join(__dirname, reviewName), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ review: relative(path.join(__dirname, reviewName)), registerSha256: registerHash, counts, progressWords: review.progressWords, passed: true }));
