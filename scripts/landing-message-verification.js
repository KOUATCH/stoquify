#!/usr/bin/env node
// Scoped, non-migrating verification. Writes reproducible evidence without touching business data.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const out = path.resolve('docs/landing-message/verification-2026-09-19');
fs.mkdirSync(out, { recursive: true });
const tests = [
  'scripts/__tests__/landing-public-content.test.js',
  'scripts/__tests__/landing-navigation-localization.test.js',
  'scripts/__tests__/landing-refinement-content.test.js',
  'scripts/__tests__/landing-packages-content.test.js',
  'scripts/__tests__/public-color-contract.test.js',
  'components/auth/__tests__/LoginSubmissionSafety.test.tsx',
  'components/auth/v2/__tests__/BeautifulRegisterForm.workflow.test.tsx',
  'components/auth/v2/__tests__/VerifyV2Form.recovery.test.tsx',
  'components/auth/v2/__tests__/PasswordRecoveryForms.test.tsx',
  'hooks/__tests__/useRegisterWorkflow.test.tsx',
  'actions/users/__tests__/public-identity-actions.test.ts',
];
const jobs = {
  authLint: ['node_modules/eslint/bin/eslint.js', 'components/auth/AuthLayout.tsx', 'components/auth/BeautifulRegisterForm.tsx'],
  unit: ['node_modules/jest/bin/jest.js', '--runInBand', '--testTimeout=30000', '--roots', 'scripts/__tests__', 'components/auth', 'hooks/__tests__', 'actions/users/__tests__', '--runTestsByPath', ...tests, '--json', '--outputFile', path.join(out, 'unit-tests.json')],
  lint: ['node_modules/eslint/bin/eslint.js', 'app', 'actions', 'components', 'config', 'hooks', 'lib', 'services', '--ext', '.js,.jsx,.ts,.tsx'],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'],
};
async function run(name) {
  if (!jobs[name]) throw new Error(`Unknown check: ${name}`);
  const started = new Date().toISOString();
  const stream = fs.createWriteStream(path.join(out, `${name}.log`));
  const child = spawn(process.execPath, jobs[name], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.pipe(stream, { end: false });
  child.stderr.pipe(stream, { end: false });
  const exitCode = await new Promise((resolve, reject) => { child.on('exit', resolve); child.on('error', reject); });
  await new Promise(resolve => stream.end(resolve));
  const result = { check: name, started, finished: new Date().toISOString(), command: ['node', ...jobs[name]], exitCode };
  fs.writeFileSync(path.join(out, `${name}-result.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (exitCode !== 0) process.exitCode = 1;
}
(async () => { for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ['unit', 'lint', 'typecheck']) await run(name); })().catch(error => { console.error(error); process.exitCode = 1; });
