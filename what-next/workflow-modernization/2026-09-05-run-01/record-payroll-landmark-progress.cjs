const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const baselineFile = 'lanes/environment/payroll-landmarks-d7897bf7-95b5-4021-9e97-f7d8a81dd396.json';
const browserFile = 'lanes/environment/payroll-landmarks-25ad8b28-d184-4ad3-99e3-13d4ddf01c1d.json';
const checksFile = 'evidence/payroll-landmark-checks-5aa99026-c845-424c-a261-7a4945731bbb.json';
const baseline = read(baselineFile), browser = read(browserFile), checks = read(checksFile), prior = read('evidence/cash-release-readiness-review-2026-09-30.json'), hris = read('evidence/cash-hris-chain-review-2026-09-30.json');
assert.ok(baseline.passed && baseline.sourceStable && baseline.checks.length === 4 && baseline.checks.every(row => row.mainCount === 2));
assert.ok(browser.passed && browser.sourceStable && browser.checks.length === 12 && browser.checks.every(row => row.mainCount === 1 && row.keyboardFocus && row.focus.outlineColor === row.focus.brandColor && row.focus.outlineWidth === '2px'));
assert.ok(checks.passed && checks.sourceStable && checks.steps.length === 3 && checks.steps.every(row => row.status === 0));
const sourceHashes = {...browser.sourceAfter, ...checks.sourceAfter};
for (const [file, expected] of Object.entries(sourceHashes)) assert.equal(hash(path.join(repo, file)), expected, file);
const priorImpact = Object.entries(baseline.sourceAfter).filter(([file, before]) => sourceHashes[file] !== before).map(([file, before]) => ({file, before, after: sourceHashes[file]}));
assert.deepEqual(priorImpact.map(row => row.file).sort(), ['components/payroll/PayrollRegisterTieOut.tsx', 'components/payroll/PayrollRunWorkbench.tsx']);
for (const row of priorImpact) assert.equal(prior.sourceHashes[row.file], row.before);
const report = 'CASH_PAYROLL_LANDMARKS_2026-09-30.md', reviewFile = 'evidence/cash-payroll-landmarks-review-2026-09-30.json';
const remaining = [...hris.remaining]; remaining[2] = 'Finish the Cash accessibility checklist: keyboard/contrast/reflow, enlarged text and remaining payroll route/state landmarks and table interaction. Populated run/register routes now have one main landmark and tested brand-token handoff focus at EN/FR 320/768/1440. Native screen-reader speech and browser zoom remain unverified limits.';
const receiptFiles = [baselineFile, browserFile, checksFile, 'lanes/environment/payroll-landmarks-4b765b5c-5bae-485d-884c-3d507463f616.json', 'lanes/environment/payroll-landmarks-a5e680e1-7f85-4760-81ce-ae72a54a72cb.json', 'evidence/payroll-landmark-checks-2070dd15-9f1f-4d99-8782-5792593c4e61.json'];
const review = {at: new Date().toISOString(), workflow: 'FA-CASH-COMMAND', completeWorkflowVerified: false, report, sourceHashes, priorImpact,
  verifiedSubcriteria: ['populated_payroll_runs_and_register_single_main_landmark_en_fr_three_viewports', 'payroll_register_keyboard_handoff_and_brand_token_focus'],
  receipts: receiptFiles.map(file => ({file, sha256: hash(path.join(root, file))})),
  artifacts: [report, 'run-payroll-landmark-checks.cjs', 'lanes/environment/verify-payroll-landmarks.cjs', ...baseline.checks.map(row => 'lanes/environment/' + row.screenshot), ...browser.checks.map(row => 'lanes/environment/' + row.screenshot)].map(file => ({file, sha256: hash(path.join(root, file))})), remaining,
  limits: ['No financial or permission service changed', 'Browser matrix covers populated run/register routes and named handoff controls, not all controls or route states', 'No native screen-reader/zoom or full contrast certification', 'Wider payroll localization remains incomplete', 'Country-pack external dependency remains']};
const file = path.join(root, 'reconcile-current-progress.cjs'); let source = fs.readFileSync(file, 'utf8');
function replace(before, after) {assert.ok(source.includes(before), before); source = source.replace(before, after);}
const current = "const cashReleaseReadinessCurrent = Object.entries(cashReleaseReadiness.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);";
replace(current, `const cashPayrollLandmarks = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...cashPayrollLandmarks.receipts, ...cashPayrollLandmarks.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Payroll landmark evidence changed');
for (const row of cashPayrollLandmarks.priorImpact) if (cashReleaseReadiness.sourceHashes[row.file] !== row.before || cashPayrollLandmarks.sourceHashes[row.file] !== row.after) throw new Error('Payroll landmark source impact changed');
const cashPayrollLandmarksCurrent = Object.entries(cashPayrollLandmarks.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashPayrollLandmarksCurrent) throw new Error('Payroll landmark source changed; review required');
${current.replace('=== expected', '=== (cashPayrollLandmarks.priorImpact.find(row => row.file === source)?.after ?? expected)')}`);
const allocation = "const cashRegisterAllocationCurrent = Object.entries(cashRegisterAllocation.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === (cashReleaseReadiness.priorImpact.find(row => row.file === source)?.after ?? expected));";
replace(allocation, allocation.replace('=== (cashReleaseReadiness', '=== (cashPayrollLandmarks.priorImpact.find(row => row.file === source)?.after ?? cashReleaseReadiness'));
replace('cashRead.remaining = cashHrisChain.remaining;', `cashRead.remaining = cashPayrollLandmarks.remaining;
cashRead.closureReview.payrollLandmarkBindingCurrent = cashPayrollLandmarksCurrent;
cashRead.closureReview.verifiedSubcriteria = [...new Set([...(cashRead.closureReview.verifiedSubcriteria ?? []), ...cashPayrollLandmarks.verifiedSubcriteria])];
for (const report of [cashPayrollLandmarks.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);`);
const start = source.indexOf('**Since the previous report:**'), end = source.indexOf('\n\n**Remaining priority:**', start); assert.ok(start > 0 && end > start);
source = source.slice(0, start) + '**Since the previous report:** Removed duplicate main landmarks from populated payroll run/register screens and applied existing brand-token focus outlines to their navigation links. Eleven component tests, lint, TypeScript and twelve EN/FR mobile/tablet/desktop browser views pass, including keyboard navigation from runs to the register. [Evidence and precise limits](CASH_PAYROLL_LANDMARKS_2026-09-30.md). No workflow added or closed. The statutory dependency remains documented; wider payroll localization, table interaction and Cash accessibility/latency work remain open.' + source.slice(end);
replace('Nested payroll main landmarks, native screen-reader/browser zoom and production latency remain unverified.', 'Other payroll route/state landmarks, native screen-reader/browser zoom and production latency remain unverified.');
fs.writeFileSync(path.join(root, reviewFile), JSON.stringify(review, null, 2) + '\n', {flag: 'wx'}); fs.writeFileSync(file, source); console.log(JSON.stringify({reviewFile, priorImpact}));
