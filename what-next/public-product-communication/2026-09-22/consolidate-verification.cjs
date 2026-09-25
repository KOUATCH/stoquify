const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const read = relative => JSON.parse(fs.readFileSync(path.join(__dirname, relative), 'utf8').replace(/^\uFEFF/, ''));
const runs = [
  { file: 'after/browser-results.json', include: route => /^\/(en|fr)$/.test(route) },
  ...['workflows', 'login', 'register'].map(surface => ({ file: `after-${surface}/browser-results.json`, include: () => true })),
];
const summary = {
  capturedAt: new Date().toISOString(),
  scope: 'Local development preview; final successful runs selected by surface. Earlier runs are retained as diagnostic evidence.',
  routes: [], pages: [], checks: [], accessibility: [], errors: [],
};
for (const run of runs) {
  const result = read(run.file);
  for (const key of ['pages', 'checks', 'accessibility', 'errors']) {
    summary[key].push(...result[key].filter(record => run.include(record.route)).map(record => ({ ...record, evidence: run.file })));
  }
}
summary.routes = [...new Set(summary.pages.map(page => page.route))];
assert.equal(summary.routes.length, 8);
assert.equal(summary.pages.length, 32);
assert.equal(summary.checks.length, 32);
assert.equal(summary.accessibility.length, 8);
assert.deepEqual(summary.errors, []);
for (const page of summary.pages) {
  assert.equal(page.status, 200);
  assert.ok(page.scrollWidth <= page.width + 1);
  assert.deepEqual(page.pageErrors, []);
}
for (const result of summary.accessibility) assert.deepEqual(result.violations, []);
const focused = read('final-focused-tests.json');
summary.focusedTests = {
  passedSuites: focused.numPassedTestSuites,
  passedTests: focused.numPassedTests,
  failedTests: focused.numFailedTests,
  evidence: 'final-focused-tests.json',
};
const hashes = read('changed-source-hashes.json');
summary.sourceIntegrity = {
  checkedFiles: hashes.length,
  changedSinceVerification: hashes.filter(({ file, sha256 }) =>
    !fs.existsSync(file) || crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== sha256
  ).map(({ file }) => file),
};
assert.deepEqual(summary.sourceIntegrity.changedSinceVerification, []);
if (fs.existsSync(path.join(__dirname, 'build-result.json'))) summary.build = read('build-result.json');
if (fs.existsSync(path.join(__dirname, 'configuration-cleanup.json'))) summary.configurationCleanup = read('configuration-cleanup.json');
summary.limits = [
  'Automated accessibility results contain incomplete checks requiring manual review; they are not an accessibility certification.',
  'Native browser zoom and screen-reader behavior have not been verified. Browser-control connections timed out; viewport reflow was verified at 320, 390, 768 and 1440 pixels.',
  'No live account creation, email delivery or successful credential sign-in was performed. Existing mocked auth regressions were executed separately.',
  'The existing English/French Terms and Privacy destinations return HTTP 404; approved policy content is absent.',
];
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ routes: summary.routes.length, viewportChecks: summary.pages.length, accessibilityScans: summary.accessibility.length, errors: summary.errors.length, focusedTests: summary.focusedTests }));
