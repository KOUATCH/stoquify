const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const [browserFile, checksFile] = process.argv.slice(2);
assert.ok(browserFile?.startsWith('lanes/environment/cash-accessibility-') && checksFile?.startsWith('evidence/cash-accessibility-checks-'));
const browser = read(browserFile), checks = read(checksFile);
assert.ok(browser.passed && browser.sourceStable && browser.noBusinessMutations && browser.views.length === 6 && browser.denied.length === 2);
assert.ok(browser.views.every(view => view.mainCount === 1 && view.h1Count === 1 && view.states.length === 6 && view.sectionKeyboardLinks === 3 && !view.scan.violations.length));
assert.ok(checks.passed && checks.sourceStable && checks.steps.length === 3 && checks.steps.every(step => step.status === 0));
const priorFile = 'evidence/cash-source-copy-review-2026-09-30.json', prior = read(priorFile);
const previous = read('evidence/cash-payroll-landmarks-review-2026-09-30.json');
const sourceHashes = {...browser.sourceAfter, ...checks.sourceAfter};
for (const [file, expected] of Object.entries(sourceHashes)) assert.equal(hash(path.join(repo, file)), expected, file);
const changed = ['components/cash-command/CashCommandDashboard.tsx', 'app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx', 'app/[locale]/(dashboard)/dashboard/finance/cash-command/__tests__/page.test.tsx'];
const priorImpact = changed.map(file => ({file, before: prior.sourceHashes[file], after: sourceHashes[file]}));
for (const row of priorImpact) assert.ok(row.before && row.after && row.before !== row.after);
const report = 'CASH_ACCESSIBILITY_AND_DENIAL_2026-09-30.md', reviewFile = 'evidence/cash-accessibility-review-2026-09-30.json';
const remaining = [...previous.remaining];
remaining[2] = 'Finish contrast, native screen-reader/browser zoom and remaining payroll route/state/table accessibility. Authorized Cash EN/FR 320/768/1440 now has one main/content h1, working keyboard modes/section links, no tested text/control clipping or horizontal overflow at normal/doubled text. Localized service denial verified separately; shared denied-state landmark remains open.';
const receiptFiles = [browserFile, checksFile, 'lanes/environment/cash-accessibility-f98dbf3b-fe56-401a-875d-05cd26214205.json', 'lanes/environment/cash-accessibility-c7d1566a-11c3-433e-bef0-d96d4724811e.json', 'lanes/environment/cash-source-diagnostic-9f2a6327-21a5-4cae-a269-9b7239323bc5.json'];
receiptFiles.push('lanes/environment/cash-accessibility-8eb63c5e-c715-4c85-aa79-4ce6546cb189.json');
receiptFiles.push('evidence/cash-accessibility-checks-d4d83330-b278-43bf-aa21-c5b3bfa4a70a.json');
const screenshots = [...browser.views.flatMap(view => view.states.filter(state => state.screenshot).map(state => 'lanes/environment/' + state.screenshot)), ...browser.denied.map(row => 'lanes/environment/' + row.screenshot)];
const review = {at: new Date().toISOString(), workflow: 'FA-CASH-COMMAND', completeWorkflowVerified: false, report, sourceHashes, priorReview: priorFile, priorImpact,
  verifiedSubcriteria: ['cash_service_authority_denial_localized_without_hiding_source_errors', 'cash_authorized_landmarks_keyboard_modes_sections_and_doubled_text_en_fr_three_widths'],
  receipts: receiptFiles.map(file => ({file, sha256: hash(path.join(root, file))})),
  artifacts: [report, 'run-cash-accessibility-checks.cjs', 'lanes/environment/verify-cash-accessibility.cjs', ...screenshots].map(file => ({file, sha256: hash(path.join(root, file))})), remaining,
  limits: ['Color contrast remains incomplete in automated scan', 'No native screen-reader or browser zoom certification', 'Shared denied-state landmark structure remains open', 'Existing statutory and financial lifecycle requirements remain', 'No permission or monetary service change']};
const file = path.join(root, 'reconcile-current-progress.cjs'); let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
assert.ok(!source.includes('const cashAccessibility ='));
const marker = 'const root = __dirname;'; assert.ok(source.includes(marker));
source = source.replace(marker, `${marker}
const cashAccessibility = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...cashAccessibility.receipts, ...cashAccessibility.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash accessibility evidence changed');
const cashAccessibilityPrior = JSON.parse(fs.readFileSync(path.join(root, cashAccessibility.priorReview)));
for (const row of cashAccessibility.priorImpact) if (cashAccessibilityPrior.sourceHashes[row.file] !== row.before || cashAccessibility.sourceHashes[row.file] !== row.after) throw new Error('Cash accessibility impact changed');
for (const [file, expected] of Object.entries(cashAccessibility.sourceHashes)) if (crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', file))).digest('hex') !== expected) throw new Error('Cash accessibility source changed: ' + file);
function cashAccessibilityExpected(source, expected) {
  const row = cashAccessibility.priorImpact.find(row => row.file === source);
  if (!row) return expected;
  if (row.before !== expected) throw new Error('Cash accessibility prior binding mismatch: ' + source);
  return row.after;
}`);
let updated = 0;
source = source.split('\n').map(line => {
  if (!/^const (cash\w+|payrollExtraction)Current =/.test(line) || line.startsWith('const cashProofCurrent =')) return line;
  const matched = line.match(/Object\.entries\((\w+)\.sourceHashes\)/); if (!matched) return line;
  const declaration = source.split('\n').find(row => row.startsWith('const ' + matched[1] + ' = JSON.parse(fs.readFileSync(path.join(root, '));
  const reviewPath = declaration?.match(/path\.join\(root, '([^']+)'/)[1];
  if (!reviewPath || !changed.some(file => file in read(reviewPath).sourceHashes)) return line;
  const separator = ".digest('hex') === ", at = line.indexOf(separator); assert.ok(at > 0 && line.endsWith(');'));
  const before = line.slice(0, at + separator.length), expected = line.slice(at + separator.length, -2);
  updated++; return before + 'cashAccessibilityExpected(source, ' + expected + '));';
}).join('\n');
assert.ok(updated > 0);
const old = 'cashRead.remaining = cashPayrollLandmarks.remaining;'; assert.ok(source.includes(old));
source = source.replace(old, `cashRead.remaining = cashAccessibility.remaining;
cashRead.closureReview.cashAccessibilityBindingCurrent = true;
cashRead.closureReview.verifiedCriteria = [...new Set([...(cashRead.closureReview.verifiedCriteria ?? []), ...cashAccessibility.verifiedSubcriteria])];
for (const report of [cashAccessibility.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);`);
const start = source.indexOf('**Since the previous report:**'), end = source.indexOf('\n\n**Remaining priority:**', start); assert.ok(start > 0 && end > start);
const tests = checks.steps[0].stderr.match(/Tests:\s+(\d+) passed/)?.[1] ?? 'Focused';
source = source.slice(0, start) + `**Since the previous report:** Corrected Cash service authority denials that appeared as load failures; EN/FR now explains access review and dashboard recovery. Removed duplicate populated Cash landmarks/headings and stopped status-label truncation at enlarged text. ${tests} tests, lint and TypeScript pass; six EN/FR viewport journeys cover keyboard modes/section links and normal/doubled text, plus two actual denied views. [Evidence and limits](${report}). Contrast remains incomplete; no workflow closed. Existing statutory dependency remains.` + source.slice(end);
fs.writeFileSync(path.join(root, reviewFile), JSON.stringify(review, null, 2) + '\n', {flag: 'wx'});
fs.writeFileSync(file, source); console.log(JSON.stringify({reviewFile, updated, priorImpact}));
