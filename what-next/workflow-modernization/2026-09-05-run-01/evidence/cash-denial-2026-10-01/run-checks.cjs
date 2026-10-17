const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..');
const phase = process.argv[2];
if (!['baseline', 'final'].includes(phase)) throw new Error('Specify baseline or final');
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'before.json'), 'utf8'));
const files = before.files.map(file => file.path);
const tests = files.filter(file => file.endsWith('.test.tsx')).concat('components/dashboard/__tests__/dashboard-localization.test.tsx');
const bindings = [...new Set([...files, ...tests, 'jest.config.ts', 'jest.setup.ts', '.eslintrc.json'])];
const hashes = () => Object.fromEntries(bindings.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), phase, sourceBefore: hashes(), steps: [] };
const commands = [['jest', ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...tests]]];
if (phase === 'final') commands.push(['lint', ['node_modules/eslint/bin/eslint.js', ...files]]);
for (const [name, args] of commands) {
  const execution = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 5 * 1024 * 1024 });
  result.steps.push({ name, executable: process.execPath, args, status: execution.status, error: execution.error?.code ?? null, stdout: execution.stdout, stderr: execution.stderr });
  console.log(JSON.stringify({ name, status: execution.status, error: execution.error?.code ?? null }));
  if (execution.status !== 0 || execution.error) break;
}
result.sourceAfter = hashes();
result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
result.passed = result.sourceStable && result.steps.length === commands.length && result.steps.every(step => step.status === 0 && !step.error);
const output = path.join(__dirname, `${phase}-${crypto.randomUUID()}.json`);
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, passed: result.passed, sha256: crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex') }));
process.exitCode = result.passed ? 0 : 1;
