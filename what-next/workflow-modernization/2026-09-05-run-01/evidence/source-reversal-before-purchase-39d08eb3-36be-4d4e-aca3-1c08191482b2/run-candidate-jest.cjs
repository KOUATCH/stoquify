// Isolated candidate overlay. Five mocked suites, no product mutation or database.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = process.cwd(), directory = __dirname, run = crypto.randomUUID();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sources = JSON.parse(fs.readFileSync(path.join(directory, 'candidate/manifest.json'), 'utf8')).files.map(row => ({ path: row.file.replaceAll('__', '/'), candidate: path.join(directory, 'candidate', row.file), sha256: row.sha256 }));
sources.push(...JSON.parse(fs.readFileSync(path.join(directory, 'candidate/test-manifest.json'), 'utf8')));
for (const row of JSON.parse(fs.readFileSync(path.join(directory, '../source-reversal-before-actions-86596587-b770-4d20-b03f-7d6f96f53984/deferred-action-candidates.json'), 'utf8'))) sources.push({ path: row.path, candidate: path.resolve(root, row.candidate), sha256: row.candidateSha256 });
const shared = ['services/accounting/journal-reversal-order.service.ts', 'services/accounting/journal-close-invalidation.service.ts', 'services/inventory/inventory-close-invalidation.service.ts'];
const snapshot = () => Object.fromEntries([...sources.map(row => row.path), ...shared].map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const candidateSnapshot = () => Object.fromEntries(sources.map(row => [row.path, sha(fs.readFileSync(row.candidate))]));
for (const row of sources) if (sha(fs.readFileSync(row.candidate)) !== row.sha256) throw Error('Candidate changed: ' + row.path);
const before = snapshot(), candidatesBefore = candidateSnapshot(), startedAt = new Date().toISOString();
const raw = path.join(directory, 'candidate-jest-raw-' + run + '.json');
const tests = sources.filter(row => row.path.endsWith('.test.ts')).map(row => row.path);
const child = spawnSync(process.execPath, ['node_modules/jest/bin/jest.js', '--config', path.join(directory, 'jest-overlay.config.cjs'), '--no-cache', '--runInBand', '--runTestsByPath', ...tests, '--json', '--outputFile', raw], { cwd: root, stdio: 'inherit', windowsHide: true });
const after = snapshot(), candidatesAfter = candidateSnapshot();
const result = fs.existsSync(raw) ? JSON.parse(fs.readFileSync(raw, 'utf8')) : null;
const unchanged = JSON.stringify(before) === JSON.stringify(after), candidateStable = JSON.stringify(candidatesBefore) === JSON.stringify(candidatesAfter);
const report = { kind: 'MOCKED_CANDIDATE_JEST_OVERLAY', startedAt, completedAt: new Date().toISOString(), files: sources, before, after, candidatesBefore, candidatesAfter, unchanged, candidateStable,
  exitCode: child.status, childError: child.error?.message ?? null, raw, rawSha256: result ? sha(fs.readFileSync(raw)) : null,
  suites: result ? { passed: result.numPassedTestSuites, failed: result.numFailedTestSuites, total: result.numTotalTestSuites } : null,
  tests: result ? { passed: result.numPassedTests, failed: result.numFailedTests, pending: result.numPendingTests, total: result.numTotalTests } : null,
  passed: child.status === 0 && result?.success === true && result.numTotalTestSuites === 5 && unchanged && candidateStable };
const output = path.join(directory, 'candidate-jest-' + run + '.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, passed: report.passed, tests: report.tests, suites: report.suites, unchanged, candidateStable }));
if (!report.passed) process.exitCode = 1;
