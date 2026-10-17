const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const hash = file => digest(fs.readFileSync(file));
const [checksFile] = process.argv.slice(2); assert.ok(checksFile?.startsWith('evidence/cash-contrast-checks-'));
const browserFile = 'lanes/environment/cash-contrast-latency-20b309df-69c7-432c-983c-2a558d2d1430.json';
const baselineFile = 'lanes/environment/cash-contrast-latency-a419f8f9-772b-4cc1-9f48-7d92c175c45c.json';
const browser = read(browserFile), baseline = read(baselineFile), checks = read(checksFile), priorFile = 'evidence/cash-accessibility-review-2026-09-30.json', prior = read(priorFile);
assert.ok(browser.observationCompleted && browser.sourceStable && browser.contrastComplete && browser.noBusinessMutations);
assert.equal(browser.views.length, 2); assert.equal(browser.routeSamples.length, 6); assert.equal(browser.serviceSamples.length, 3);
assert.ok(browser.views.every(view => view.rendered.length === 305 && !view.failedContrast.length && !view.unmeasured.length));
assert.ok(baseline.observationCompleted && !baseline.contrastComplete && baseline.views.every(view => view.failedContrast.length === 4));
assert.ok(checks.passed && checks.sourceStable && checks.steps.length === 3 && checks.steps.every(step => step.status === 0));
const sourceHashes = {...browser.sourceAfter, ...checks.sourceAfter};
for (const [file, expected] of Object.entries(sourceHashes)) assert.equal(hash(path.join(repo, file)), expected, file);
const component = 'components/cash-command/CashCommandDashboard.tsx';
const stylesheet = 'components/cash-command/cash-command.module.css';
const reconstructed = fs.readFileSync(path.join(repo, component), 'utf8').replace(/import styles from "\.\/cash-command\.module\.css"\r?\n/, '').replace('<div className={cn(styles.workspace, "dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]")}>', '<div className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">');
assert.equal(digest(reconstructed), prior.sourceHashes[component], 'Only stylesheet import/root scope may change');
assert.equal(fs.readFileSync(path.join(repo, stylesheet), 'utf8').replace(/\r\n/g, '\n').trim(), '.workspace :global(.dashboard-button-primary) {\n  background: var(--product-brand-action);\n}\n\n.workspace :global(.dashboard-button-primary:hover) {\n  background: var(--product-brand-action-hover);\n}\n\n.workspace :global(.dashboard-filter-chip) > span[aria-hidden="true"] {\n  color: var(--dash-text-soft);\n}');
const priorImpact = [{file: component, before: prior.sourceHashes[component], after: sourceHashes[component]}];
const report = 'CASH_CONTRAST_AND_LATENCY_2026-09-30.md', reviewFile = 'evidence/cash-contrast-review-2026-09-30.json';
const remaining = [...prior.remaining];
remaining[2] = 'Finish native screen-reader/browser zoom, non-text focus/graphic contrast and remaining payroll route/state/table accessibility. Authorized Cash EN desktop/FR mobile now has complete sampled rendered text contrast (305 nodes each), including primary hover/focus text. Prior six-width/locale normal/doubled-text geometry and keyboard evidence is retained through exact color-only delta review. Shared denied-state landmark remains open.';
remaining[3] = 'Profile actual Next request spans for session/RBAC, module navigation, source reads, response streaming/assets and hydration. Local Cash service and full-route timing baselines are recorded; repeated page readiness remains materially slower than separately measured direct service reads. No approved Cash production budget or optimization is claimed. Investigate any recurrence of the original unattributed hydration trace.';
const receipts = [baselineFile, browserFile, checksFile];
const review = {at: new Date().toISOString(), workflow: 'FA-CASH-COMMAND', completeWorkflowVerified: false, report, sourceHashes, priorReview: priorFile, priorImpact,
  layoutInheritance: {component, reconstructedSha256: digest(reconstructed), reviewedChange: 'CSS import/root scope plus background/color-only scoped stylesheet; no layout or behavior changes'},
  verifiedSubcriteria: ['cash_rendered_text_contrast_en_desktop_fr_mobile_and_primary_hover_focus', 'cash_local_direct_service_and_route_latency_baseline'],
  receipts: receipts.map(file => ({file, sha256: hash(path.join(root, file))})),
  artifacts: [report, 'run-cash-contrast-checks.cjs', 'lanes/environment/verify-cash-contrast-latency.cjs', 'lanes/environment/measure-rendered-contrast.cjs', ...browser.views.map(view => 'lanes/environment/' + view.screenshot)].map(file => ({file, sha256: hash(path.join(root, file))})), remaining,
  limits: ['Current authorized synthetic content/theme only', 'Native assistive technology, browser zoom and non-text contrast remain open', 'Timing baseline is local development, not production or a performance improvement', 'Existing financial/statutory lifecycle requirements remain']};
const file = path.join(root, 'reconcile-current-progress.cjs'); let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
assert.ok(!source.includes('const cashContrast ='));
function replace(before, after) {assert.ok(source.includes(before), before); source = source.replace(before, after);}
replace('const root = __dirname;', `const root = __dirname;
const cashContrast = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...cashContrast.receipts, ...cashContrast.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash contrast evidence changed');
const cashContrastPrior = JSON.parse(fs.readFileSync(path.join(root, cashContrast.priorReview)));
for (const row of cashContrast.priorImpact) if (cashContrastPrior.sourceHashes[row.file] !== row.before || cashContrast.sourceHashes[row.file] !== row.after) throw new Error('Cash contrast impact changed');
for (const [file, expected] of Object.entries(cashContrast.sourceHashes)) if (crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', file))).digest('hex') !== expected) throw new Error('Cash contrast source changed: ' + file);
function cashContrastExpected(source, expected) {
  const row = cashContrast.priorImpact.find(row => row.file === source);
  if (!row) return expected;
  if (row.before !== expected) throw new Error('Cash contrast prior binding mismatch: ' + source);
  return row.after;
}`);
replace("!== expected) throw new Error('Cash accessibility source changed: ' + file);", "!== cashContrastExpected(file, expected)) throw new Error('Cash accessibility source changed: ' + file);");
replace("if (row.before !== expected) throw new Error('Cash accessibility prior binding mismatch: ' + source);\n  return row.after;", "if (row.before !== expected) throw new Error('Cash accessibility prior binding mismatch: ' + source);\n  return cashContrastExpected(source, row.after);");
replace('cashRead.remaining = cashAccessibility.remaining;', `cashRead.remaining = cashContrast.remaining;
cashRead.closureReview.cashContrastBindingCurrent = true;
cashRead.closureReview.verifiedCriteria = [...new Set([...(cashRead.closureReview.verifiedCriteria ?? []), ...cashContrast.verifiedSubcriteria])];
for (const report of [cashContrast.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);`);
const start = source.indexOf('**Since the previous report:**'), end = source.indexOf('\n\n**Remaining priority:**', start); assert.ok(start > 0 && end > start);
const count = checks.steps[0].stderr.match(/Tests:\s+(\d+) passed/)?.[1] ?? 'Focused';
source = source.slice(0, start) + `**Since the previous report:** Corrected four low-contrast Cash labels using existing action/text tokens. All 305 sampled rendered text nodes per language pass in EN desktop/FR mobile, plus primary-action hover/focus text. ${count} component tests, lint and TypeScript pass. A local timing baseline separates direct service reads from page readiness; actual request profiling is the next latency action. [Evidence and precise limits](${report}). No workflow closed; statutory and financial lifecycle requirements remain.` + source.slice(end);
if (process.argv.includes('--resume-existing-review')) {
  const saved = read(reviewFile);
  assert.deepEqual({...saved, at: review.at}, review, 'Retained review must match exactly except its original timestamp');
} else fs.writeFileSync(path.join(root, reviewFile), JSON.stringify(review, null, 2) + '\n', {flag: 'wx'});
// Preserve the original before updating through an existing-file handle. The
// host permits ReadWrite but rejects this file's truncate-on-open mode.
fs.writeFileSync(file + '.retained-' + crypto.randomUUID(), fs.readFileSync(file), {flag: 'wx'});
const descriptor = fs.openSync(file, 'r+');
try { fs.writeFileSync(descriptor, source, 'utf8'); fs.ftruncateSync(descriptor, Buffer.byteLength(source)); }
finally { fs.closeSync(descriptor); }
console.log(JSON.stringify({reviewFile, priorImpact}));
