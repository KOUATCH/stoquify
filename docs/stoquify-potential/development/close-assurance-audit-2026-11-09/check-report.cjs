// File-only report validation; never loads application, database or environment.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report = path.join(root, 'what-next/AQSTOQFLOW_CLOSE_ASSURANCE_READINESS_AUDIT_2026-11-09.md');
const summary = path.join(__dirname, 'RESULT.md');
const tests = JSON.parse(fs.readFileSync(path.join(__dirname, 'focused-checks.results.json')));
const binding = JSON.parse(fs.readFileSync(path.join(__dirname, 'SOURCE_BINDING.json')));
assert.equal(tests.numPassedTests, 26); assert.equal(tests.numFailedTests, 0); assert.equal(tests.numPendingTests, 0);
assert.equal(binding.sourceFiles, 508); assert.deepEqual(binding.changedOrAdded, []); assert.deepEqual(binding.removed, []);
const references = [];
for (const file of [report, summary]) {
  const text = fs.readFileSync(file, 'utf8'); assert(text.includes('GO_WITH_GATES'));
  for (const match of text.matchAll(/\]\((?:<([^>]+)>|([^\s)]+))\)/g)) {
    const target = match[1] || match[2];
    if (/^https:\/\//.test(target)) { new URL(target); references.push({ target, class: 'External reference; previously reviewed, format checked here' }); continue; }
    const lineMatch = target.match(/:(\d+)$/), filename = lineMatch ? target.slice(0, lineMatch.index) : target;
    assert(path.isAbsolute(filename), `Use absolute local reference: ${target}`); assert(fs.statSync(filename).isFile(), `Missing reference: ${target}`);
    if (lineMatch) assert(Number(lineMatch[1]) <= fs.readFileSync(filename, 'utf8').split('\n').length, `Invalid line: ${target}`);
    references.push({ target, class: 'Local existing file/line' });
  }
}
const syntax = [];
for (const name of ['run-audit-checks.cjs', 'jest.audit.config.cjs', 'server-only.cjs', 'check-report.cjs']) {
  const filename = path.join(__dirname, name), result = spawnSync(process.execPath, ['--check', filename], { windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); syntax.push({ path: name, sha256: digest(filename), exitCode: result.status });
}
const result = { checkedAt: new Date().toISOString(), verdict: 'GO_WITH_GATES', status: 'AUDIT_REPORT_CONSISTENT',
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  report: { path: report, sha256: digest(report) }, summary: { path: summary, sha256: digest(summary) },
  verification: { pureAndMockedTestsPassed: tests.numPassedTests, failed: 0, skipped: 0, scopedSourcesBound: binding.sourceFiles,
    databaseTestsRun: false, appStarted: false, browserRun: false, productImplementationStarted: false },
  receipts: ['focused-checks.results.json', 'VERIFICATION.json', 'SOURCE_BINDING.json'].map(name => ({ path: name, sha256: digest(path.join(__dirname, name)) })),
  references, syntax,
};
fs.writeFileSync(path.join(__dirname, 'AUDIT_SUMMARY.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, localAndExternalReferences: references.length, syntax: syntax.length }));
