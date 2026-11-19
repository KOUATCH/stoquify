// Local-only evidence integrity, source-drift and targeted secret checks.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8')), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const start = read(path.join(__dirname, 'start-source.json')), final = read(path.join(__dirname, 'final-source.json'));
const changed = (entries, root) => entries.filter(e => !fs.existsSync(path.join(root, e.file)) || hash(path.join(root, e.file)) !== e.sha256).map(e => e.file);
const currentDrift = changed(start.currentFiles, process.cwd()), baselineDrift = changed(start.oldFiles, start.baseline);
const unrelated = new Set(['actions/payroll/payroll-contract.actions.ts', 'actions/payroll/__tests__/payroll-contract.actions.test.ts', 'services/hris/document-evidence.service.ts', 'services/hris/lifecycle.service.ts', 'services/hris/payroll-readiness-contract.ts', 'services/hris/__tests__/document-evidence.service.test.ts', 'services/hris/__tests__/payroll-readiness-contract.test.ts']);
assert(currentDrift.every(file => unrelated.has(file)), 'Unexpected source drift requires review'); assert.equal(baselineDrift.length, 0);
const secrets = new Set();
function collect(value, key = '') {
  if (typeof value === 'string' && /password|token|secret|^url$/i.test(key) && value.length > 6) secrets.add(value);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) collect(v, k);
}
for (const file of ['.codex-tmp/workflow-closure-private.json', '.codex-tmp/close-browser-private.json']) collect(read(file));
for (const entry of fs.readdirSync('.codex-tmp/mixed-version-work')) if (entry.endsWith('.json') && !entry.endsWith('-result.json')) collect(read(path.join('.codex-tmp/mixed-version-work', entry)));
const files = fs.readdirSync(__dirname).filter(n => fs.statSync(path.join(__dirname, n)).isFile()).map(n => path.join(__dirname, n));
const owned = final.owned.map(e => e.file);
for (const file of [...files, ...owned]) {
  const body = fs.readFileSync(file, 'utf8');
  for (const value of secrets) assert(!body.includes(value), 'Private value found in evidence file: ' + path.basename(file));
}
const scenarios = read(path.join(__dirname, 'combined-reconciliation.json')), close = read(path.join(__dirname, 'close-read-results.json'));
assert.equal(scenarios.length, 13); assert.equal(close.results.length, 2); assert(close.results.every(r => r.status === 'PASS'));
const completion = { at: new Date().toISOString(), baselineDrift, currentDrift: currentDrift.map(file => ({ file, finalSha256: hash(file), disposition: 'Concurrent HRIS/payroll work preserved; outside exercised purchasing/POS/stock and retained-close read paths' })), owned: owned.map(file => ({ file, sha256: hash(file) })), evidence: files.filter(file => !/completion-source|summary/.test(file)).map(file => ({ file: path.basename(file), sha256: hash(file) })), targetedSecretScan: 'PASS' };
fs.writeFileSync(path.join(__dirname, 'completion-source.json'), JSON.stringify(completion, null, 2));
fs.writeFileSync(path.join(__dirname, 'summary.json'), JSON.stringify({ at: completion.at, status: 'SCOPED_VERIFICATION_COMPLETE_WITH_UNSUPPORTED_COMBINATIONS', compatibleScenarios: 9, failClosedReservationBoundary: 1, unsupportedScenarios: 3, retainedCloseReadComparisons: 2, applicationChanges: 0, productionRolloutCertified: false, unrelatedSourceDrift: currentDrift.length, database: 'localhost/stoquify_pos_audit_20261026_d30f/public', resultSources: ['initial-matrix-results.json', 'results.json', 'close-read-results.json'], excluded: ['MTN', 'open policy decisions', 'negative-stock certification'], notRun: ['mixed production Next artifacts/browser transport', 'mixed delivery-worker recovery', 'mixed-version close writes'] }, null, 2));
console.log('PASS: owned source checked; unrelated drift recorded; 13 scenarios and 2 retained-close comparisons; targeted private-value scan clear');
