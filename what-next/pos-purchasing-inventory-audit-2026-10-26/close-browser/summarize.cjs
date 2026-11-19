// Summarize retained receipts; never prints credentials.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const groups = ['journeys-results.json', 'access-results.json', 'recovery-results.json', 'read-recovery-results.json', 'setup-copy-results.json'];
const scenarios = groups.flatMap(file => read(file).map(row => ({ evidence: file, ...row })));
assert.equal(scenarios.length, 34); assert(scenarios.every(s => s.status === 'PASS'));
const unit = ['cache-after-results.json', 'ui-unit-results.json', 'setup-unit-results.json'].map(file => { const r = read(file); assert.equal(r.numFailedTests, 0); return { evidence: file, passed: r.numPassedTests }; });
const source = read('final-source.json');
for (const file of source.owned) {
  const actual = require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(actual, source.files.find(row => row.file === file).sha256, 'Owned source changed after final snapshot: ' + file);
}
const files = ['actions/accounting/close-assurance.actions.ts', 'components/accounting/CloseAssuranceCenter.tsx', 'app/[locale]/(dashboard)/dashboard/accounting/setup/page.tsx'];
for (const file of files) { const row = source.files.find(r => r.file === file); assert.equal(row.sha256, row.browserSha256); }
assert.equal(source.faultMarkerActive, false); assert.equal(read('typecheck-results.json').exitCode, 0);
const privateData = JSON.parse(fs.readFileSync('.codex-tmp/close-browser-private.json', 'utf8'));
const sensitive = [privateData.url, privateData.password, privateData.secret].filter(v => typeof v === 'string' && v.length > 8);
for (const file of fs.readdirSync(__dirname).filter(f => /\.(json|md|txt|log|cjs|patch)$/.test(f))) {
  const contents = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!sensitive.some(value => contents.includes(value)), 'Private fixture value in evidence file: ' + file);
}
const summary = {
  at: new Date().toISOString(), head: source.head, scopeStatus: 'PASS', programStatus: 'INCOMPLETE_PROVIDER_AND_POLICY_GATES',
  findings: ['F9/B8 post-commit cache result', 'F10/B9 revoked access and retry-start privacy', 'F11/B10 period-closing French copy'],
  unit, mockedPassed: unit.reduce((n, r) => n + r.passed, 0), databasePreparationPassed: read('seed-results.json').numPassedTests,
  scenarios, browserStagesPassed: scenarios.length, databaseReadback: 'database-readback.json', source: 'final-source.json',
  sourceOnlyDrift: source.changesSinceStart.filter(f => !f.owned).map(f => f.file), privateFixtureValuesAbsentFromEvidence: true,
  excluded: ['MTN MoMo sandbox not configured', 'Retention/resumption/escalation and default authoring rollout/legacy compatibility remain open', 'Negative-stock certification'],
  remainingEvidenceLimits: ['Mixed-version rollout', 'No existing period-reopen UI; previous service/database evidence only', 'Login-form design, screen readers and other browsers', 'Full accounting-setup localization outside closing slice'],
};
fs.writeFileSync(path.join(__dirname, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ mockedPassed: summary.mockedPassed, browserStagesPassed: scenarios.length, databasePreparationPassed: summary.databasePreparationPassed, sourceOnlyDrift: summary.sourceOnlyDrift, privateFixtureValuesAbsentFromEvidence: true }));
