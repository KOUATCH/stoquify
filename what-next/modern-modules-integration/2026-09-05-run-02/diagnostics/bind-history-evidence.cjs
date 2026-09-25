const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const browser = read('history-pagination-browser.json'), postgres = read('history-pagination-verify.json');
const names = [
  'HISTORY_VERIFICATION.md', 'history-pagination-service.cjs', 'history-pagination-browser.cjs',
  'history-pagination-inspect-initial.json', 'history-pagination-prepare.json', 'history-pagination-verify.json',
  'history-pagination-ties-fixture-failed.json', 'history-pagination-inspect.json',
  'history-pagination-browser-reopen-locator-failed.json', 'history-pagination-browser-history-reset-failed.json',
  'history-reopen-history-reset-context.png', 'history-older-applied-configuration-first.png',
  'history-pagination-browser.json', 'history-older-applied-configuration.png', 'history-reopened-draft.png',
  'isolated-dev-stop.json', 'isolated-dev-restart.json',
];
const receipt = {
  boundAt: new Date().toISOString(), productionApproval: false,
  postgres: { passedObservations: postgres.checks.filter(item => item.passed).length, sourceAsTested: postgres.afterSources, limitations: ['No equal-time PostgreSQL proof:31 service-created drafts had31 different timestamps and were rolled back.', 'Empty restricted setup scope is observed, but nonempty-scope redaction proof comes from separately owned focused unit regressions.'] },
  browser: { passedObservations: browser.checks.filter(item => item.passed).length, failed: Boolean(browser.failure), startedAt: browser.startedAt, completedAt: browser.completedAt, sourceStable: browser.sourceStable, sourceAsTested: browser.afterSources, usefulHistoryMs: browser.usefulHistoryMs, sourceDeltaSincePostgres: browser.afterSources.filter(item => postgres.afterSources.some(old => old.path === item.path && old.sha256 !== item.sha256)), effects: 'Exactly one additional DRAFT after real password step-up;113 commands now. Original command and full configuration unchanged; no activation.' },
  priorBrowserFailuresPreserved: 2,
  screenshotsVisuallyInspected: ['history-older-applied-configuration.png', 'history-reopened-draft.png'],
  artifacts: names.map(name => { const file = path.join(__dirname, name), bytes = fs.readFileSync(file), stat = fs.statSync(file); return { path: name, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, modifiedAt: stat.mtime.toISOString() }; }),
};
fs.writeFileSync(path.join(__dirname, 'HISTORY_VERIFICATION_BINDINGS.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ postgresPassed: receipt.postgres.passedObservations, browserPassed: receipt.browser.passedObservations, artifacts: receipt.artifacts.length, sourceStable: receipt.browser.sourceStable }));
