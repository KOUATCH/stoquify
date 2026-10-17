const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const receipts = [
  'lanes/environment/digest-accessibility-8bbef2cb-cb76-4a0a-af74-5c7299757830.json',
  'lanes/environment/digest-session-854ba5d2-6326-45c5-b8e9-62f0777a1a2b.json',
  'lanes/environment/digest-clock-377cfb34-c7df-4dbb-abff-5453ce4a811e.json',
  'lanes/environment/digest-query-73430841-83f3-4b7e-b5ea-b8518ab3bef2.json',
  'lanes/environment/digest-handoff-0743f682-4209-46b5-b2bc-fd2a5f9c474c.json',
  'lanes/environment/digest-loss-handoff-4e4a6872-1362-45dc-80e5-b3575f01c730.json',
  'lanes/environment/digest-payroll-history-5b7cc927-be91-4d6d-8dfc-95433737952d.json',
  'lanes/environment/digest-payroll-currency-d56949df-9d23-4501-b220-68f4e5847fda.json',
  'lanes/environment/digest-forecast-currency-5d3ecb41-9807-4363-9a73-70f8dc739b7c.json',
  'evidence/digest-reflow-final.json',
];
const sourceHashes = {}, evidence = [], superseded = [];
for (const file of receipts) {
  const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  assert.equal(receipt.passed, true, file);
  const hashes = receipt.sourceAfter || receipt.sourceHashes;
  assert.ok(hashes && Object.keys(hashes).length, 'Missing source bindings: ' + file);
  const changes = [];
  for (const [source, hash] of Object.entries(hashes)) {
    const current = sha(path.join(root, source)); sourceHashes[source] = current;
    if (current !== hash) changes.push(source);
  }
  // Earlier payroll recovery/history and loss receipts precede the later forecast
  // correction. Preserve that exact mismatch for the written semantic review.
  if (changes.length) superseded.push({ file, changed: changes });
  if (/accessibility|digest-session|digest-clock|digest-query|digest-handoff-0743|forecast-currency|reflow-final/.test(file)) assert.deepEqual(changes, [], 'Current closure receipt changed: ' + file);
  evidence.push({ file, sha256: sha(path.join(__dirname, file)), sourceStableDuringRun: receipt.sourceStable ?? null });
}
const testsFile = 'evidence/digest-final-regression-2026-09-27.json';
const tests = JSON.parse(fs.readFileSync(path.join(__dirname, testsFile), 'utf8'));
assert.equal(tests.success, true); assert.equal(tests.numFailedTests, 0);
const report = { at: new Date().toISOString(), workflow: 'AN-DAILY-DIGEST', status: 'Complete—verified', scope: 'Existing role-scoped Digest read, inspection, recovery and authorized source handoff lifecycle; downstream operations retain their existing workflow ownership.', evidence, sourceHashes, earlierReceiptChanges: superseded, regression: { file: testsFile, sha256: sha(path.join(__dirname, testsFile)), suites: tests.numPassedTestSuites, tests: tests.numPassedTests }, review: 'DAILY_DIGEST_FINAL_VERIFICATION_2026-09-27.md', checklist: 'DAILY_DIGEST_CLOSURE.md', guide: 'DAILY_DIGEST_OPERATING_GUIDE.md' };
const file = path.join(__dirname, 'evidence/digest-closure-2026-09-27.json');
fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ file, boundSources: Object.keys(sourceHashes).length, earlierReceiptChanges: superseded, regression: report.regression }));
