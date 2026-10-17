const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), files = {};
const receipts = [
  process.argv[2],
  'lanes/environment/sign-authority-78678de1-9ace-42fb-815d-44be9bf40acb.json',
  'lanes/environment/sign-authority-browser-09653c21-2aab-4356-bfc5-57d461f5908c.json',
];
assert.ok(receipts[0], 'Supply the final focused-check receipt relative to this run directory');
function sourceBinding(report) {
  assert.equal(report.sourceStable, true);
  for (const [file, expected] of Object.entries(report.sourceAfter)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    assert.equal(actual, expected, file); if (files[file]) assert.equal(files[file], actual); files[file] = actual;
  }
}
const passed = receipts.map(file => { const bytes = fs.readFileSync(path.join(__dirname, file)), report = JSON.parse(bytes); assert.equal(report.passed, true, file); sourceBinding(report); return { file, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }; });
const reused = [
  { file: 'lanes/environment/sign-authority-browser-518f0abb-c9f7-46f6-b3e4-6d8c4c5f85c8.json', state: 'ready' },
  { file: 'lanes/environment/sign-authority-browser-52ea9907-6b7f-4215-97b6-1e16101926aa.json', state: 'signed' },
].map(item => {
  const bytes = fs.readFileSync(path.join(__dirname, item.file)), report = JSON.parse(bytes); sourceBinding(report);
  const scan = report.journeys.find(j => j.locale === 'en').scans.find(s => s.state === item.state);
  assert.deepEqual(scan.scan.violations, []); assert.ok(scan.rendered.every(r => r.measured && r.passes));
  return { ...item, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), scope: 'Only this English accessibility scan passed. The full historical browser attempt failed; it is not relabelled as passed.' };
});
const output = path.join(__dirname, 'evidence/sign-authority-current-bindings.json');
fs.writeFileSync(output, JSON.stringify({ at: new Date().toISOString(), workflow: 'PR-10', completeWorkflowVerified: false, sourceHashes: files, passed, reused }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, sourceFiles: Object.keys(files).length, passedReceipts: passed.length, reusedPartialScans: reused.length }));
