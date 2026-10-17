const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..'), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(root, file)), json = file => JSON.parse(read(file));
const oldFile = 'evidence/password-change-receipt.json', old = json(oldFile);
const dbFile = 'lanes/environment/password-change-074ffe12-a22.json', database = json(dbFile);
const browserFile = 'lanes/environment/password-current-browser-27dc050a-456c-4b62-805e-7dfeccd8bd68.json', browser = json(browserFile);
const checksFile = 'evidence/password-current-checks-41e69f07-e427-4da3-85ba-32b4444e0663.json', checks = json(checksFile);
assert.ok(database.sourceStable && database.originalAuthorityUnchanged && database.passed === 19 && database.failed === 0);
assert.ok(browser.passed && browser.sourceStable && browser.originalUnchanged && browser.journeys.length === 2);
for (const row of browser.journeys) {
  assert.ok(row.passed && row.oneAudit && row.oldPasswordRejected && row.newPasswordAccepted && row.revokedSessions >= 2 && row.draftPreservedAfterTransport);
  assert.ok(row.scans.every(scan => scan.violations.length === 0)); assert.ok(row.contrast.length === 9 && row.contrast.every(size => size.measured.every(item => item.measured && item.passes)));
}
assert.ok(checks.passed && checks.sourceStable && checks.steps.length === 3 && checks.steps.every(row => row.status === 0));
const sourceHashes = {};
const independentLocaleChanges = [];
for (const data of [database.sourcesBefore, browser.sourceBefore, checks.sourceBefore]) for (const [file, expected] of Object.entries(data)) {
  const bytes = fs.readFileSync(path.join(repo, file));
  if (file.startsWith('messages/') && hash(bytes) !== expected) {
    const restored = require('./reviewed-independent-module-copy.cjs')(bytes.toString('utf8'), file);
    assert.equal(hash(restored), expected, file);
    if (!independentLocaleChanges.some(row => row.file === file)) independentLocaleChanges.push({ file, before: expected, after: hash(bytes), reconstructedBefore: hash(restored), explanation: 'Only the exactly hashed moduleComposition.experience block was added; all other dictionary bytes remain bound.' });
  } else assert.equal(hash(bytes), expected, file);
  if (!file.startsWith('messages/')) sourceHashes[file] = expected;
}
const formFile = 'components/Forms/ChangePasswordForm.tsx', form = fs.readFileSync(path.join(repo, formFile), 'utf8');
const restored = form.replace('p-3 text-sm text-[var(--dash-text)] outline-none', 'p-3 text-sm text-[var(--dash-danger)] outline-none').replace('mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-danger)]', 'mt-0.5 h-4 w-4 shrink-0');
assert.equal(hash(restored), old.sources[formFile], 'Only the reviewed presentation correction may preserve historical form behavior');
const sourceComparison = Object.entries(old.sources).map(([file, before]) => ({ file, before, after: hash(fs.readFileSync(path.join(repo, file))), unchanged: before === hash(fs.readFileSync(path.join(repo, file))) }));
const scanner = require(path.join(repo, 'scripts/module-surface-inventory.js'));
const scanned = scanner.buildModuleSurfaceInventory(repo, { mode: 'report' });
const records = scanned.records.filter(row => ['actions/users/updateUserPassword.ts', 'app/[locale]/(dashboard)/dashboard/change-password/page.tsx'].includes(row.file));
assert.equal(records.length, 2); const findings = scanner.moduleSurfaceGapFindings({ records });
const staticReview = { at: new Date().toISOString(), status: findings.length ? 'scanner-findings-retained' : 'no-findings', records, findings,
  disposition: 'Conditional self/admin requirePermission and delegated withChangePasswordSurfaceAccess are verified through current source, protected-action/route tests and real denied browser/service cases. No finding is relabeled as a scanner pass. Settings module mode remains observe, as existing code specifies. Cross-domain scanner recognition remains MC-11 follow-up, not an absent password permission guard.',
  sources: Object.fromEntries(['scripts/module-surface-inventory.js', 'actions/users/updateUserPassword.ts', 'app/[locale]/(dashboard)/dashboard/change-password/page.tsx', 'app/[locale]/(dashboard)/dashboard/change-password/change-password-route-access.tsx', 'app/[locale]/(dashboard)/dashboard/change-password/change-password-route-data-access.ts'].map(file => [file, hash(fs.readFileSync(path.join(repo, file)))])) };
const staticFile = 'evidence/password-current-static-review-2026-09-27.json'; fs.writeFileSync(path.join(root, staticFile), JSON.stringify(staticReview, null, 2) + '\n', { flag: 'wx' });
const translations = ['en', 'fr'].map(locale => { const file = 'messages/' + locale + '.json'; return { file, namespace: 'passwordChange', sha256: hash(JSON.stringify(JSON.parse(fs.readFileSync(path.join(repo, file))).passwordChange)) }; });
const criteria = [
  ['entry_personas_and_authority', 'Permission-scoped account menu, direct route denial, protected self/admin action, tenant/current actor checks and actual password assurance.', [dbFile, browserFile, checksFile]],
  ['atomic_credentials_and_sessions', 'Actual synchronized user/account hashes, history, target-session revocation, reset-link invalidation and one audit; administrator session retained.', [dbFile, browserFile]],
  ['concurrent_current_authority', 'One concurrent winner; credential/session/assurance/actor/role/membership/organization changes prevent stale commit; final-lock revocations wait.', [dbFile]],
  ['failure_and_recovery', 'Audit/credential failures roll back, wrong/reused passwords leave state unchanged, EN/FR transport failure retains draft and localized sign-in accepts only new password.', [dbFile, browserFile, checksFile]],
  ['accessible_localized_presentation', 'EN/FR keyboard feedback, 320/768/1440 layouts, controlled text enlargement, reduced motion, normal/error/recovery contrast and current account-menu handoff.', [browserFile]],
  ['supported_admin_boundary', 'Existing administrator action/service is verified; no dedicated target UI is claimed or added.', [dbFile, checksFile]],
  ['static_runtime_reconciliation', 'Exact current scanner findings retained, current delegated/conditional guards verified; scanner recognition tracked under existing cross-domain access workflow.', [staticFile, checksFile, browserFile]],
  ['operating_guidance_and_regression', 'Current source-bound regression/lint/typecheck and operator/rollout guidance; no migration or external notification.', [checksFile]],
].map(([id, finding, evidence]) => ({ id, finding, evidence, disposition: 'verified' }));
const files = [oldFile, dbFile, browserFile, checksFile, staticFile, 'lanes/environment/password-current-browser-35bf3785-6fc7-44d8-a4c4-b8c3108f868e.json', ...browser.journeys.flatMap(row => row.screenshots.map(file => 'lanes/environment/' + file))];
const receipts = files.map(file => ({ file, sha256: hash(read(file)) }));
const artifacts = ['PASSWORD_CHANGE_OPERATING_GUIDE.md', 'PASSWORD_CHANGE_FINAL_AUDIT_2026-09-27.md'].map(file => ({ file, sha256: hash(read(file)) }));
const report = { at: new Date().toISOString(), workflow: 'ID-05', status: 'Complete—verified', completeWorkflowVerified: true, criteria, sourceHashes, translations, sourceComparison, independentLocaleChanges, receipts, artifacts,
  presentationImpact: { file: formFile, before: old.sources[formFile], reconstructedBefore: hash(restored), after: hash(form), description: 'Only alert text/link color and icon-specific danger color change. Historical form structure, no-JavaScript disabled fields, POST, reveal controls and submit logic remain byte-reconstructable; current browser verifies the changed presentation and full self-service lifecycle.' },
  verificationLimits: ['Native screen-reader speech and browser-chrome zoom remain unverified; semantic/keyboard, measured text contrast, responsive reflow and controlled enlargement are verified.', 'Owned local databases and development application only; no production credential change, live notification, deployment, full-build/release or professional certification.', 'The existing administrative service/action has no dedicated target-password screen; no such screen is claimed.', 'Static scanner findings remain retained and assigned to MC-11; runtime password authority controls are independently verified. Settings module access remains observe mode.'] };
const output = 'evidence/password-closure-2026-09-27.json'; fs.writeFileSync(path.join(root, output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, criteria: criteria.length, sources: Object.keys(sourceHashes).length, scannerFindings: findings.length, passed: true }));
