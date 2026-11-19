// Pure mocked control-flow lane. No application environment, native database or server.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const names = ['lifecycle-guards.cjs', 'stop.cjs', 'stop-before-qualification.cjs', 'lifecycle-guards.test.cjs', 'run-lifecycle-tests.cjs'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const snapshot = () => names.map(name => ({ path: name, sha256: hash(fs.readFileSync(path.join(__dirname, name))) }));
const output = path.join(__dirname, 'unit/attempt01');
assert(!fs.existsSync(output), 'Preserve the prior test attempt');
const before = snapshot();
fs.mkdirSync(output, { recursive: true });
const env = {};
for (const name of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH', 'PATHEXT', 'ComSpec']) {
  const key = Object.keys(process.env).find(key => key.toLowerCase() === name.toLowerCase());
  if (key) env[name] = process.env[key];
}
env.NODE_ENV = 'test';
const args = ['--test', '--test-reporter=tap', path.join(__dirname, 'lifecycle-guards.test.cjs')];
const startedAt = new Date().toISOString();
const run = spawnSync(process.execPath, args, { cwd: __dirname, env, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
fs.writeFileSync(path.join(output, 'stdout.tap'), run.stdout || '', { flag: 'wx' });
fs.writeFileSync(path.join(output, 'stderr.txt'), run.stderr || '', { flag: 'wx' });
const count = label => { const match = (run.stdout || '').match(new RegExp('^# ' + label + ' (\\d+)\\r?$', 'm')); return match ? Number(match[1]) : null; };
const counts = { tests: count('tests'), passed: count('pass'), failed: count('fail'), skipped: count('skipped') };
const after = snapshot();
const sourceUnchanged = JSON.stringify(before) === JSON.stringify(after);
const passed = run.status === 0 && !run.error && sourceUnchanged && counts.tests === 11 && counts.passed === 11 && counts.failed === 0 && counts.skipped === 0;
const result = { packageId: 'P04-R06', startedAt, completedAt: new Date().toISOString(), evidenceClass: 'mocked lifecycle control flow', command: { executable: process.execPath, args }, exitCode: run.status, signal: run.signal, error: run.error?.message || null, counts, passed, sourceUnchanged, before, after, stdoutSha256: hash(run.stdout || ''), stderrSha256: hash(run.stderr || ''), applicationEnvironmentLoaded: false, nativeDatabaseExecuted: false, browserExecuted: false, processTerminationExecuted: false };
fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed, counts, exitCode: run.status, result: path.join(output, 'result.json') }));
if (!passed) process.exitCode = 1;
