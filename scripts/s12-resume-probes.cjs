// Resume independent probes only on an already recorded, owned S12 restore.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { sourceTarget, assertS12Target } = require('./s12-target.cjs');
const [record, mode, output] = process.argv.slice(2);
const report = JSON.parse(fs.readFileSync(record));
assert.equal(report.sourceClass, 'New synthetic S12 fixture only');
assert.match(report.restoreName, /^stoquify_restore_s12_\d{8}_[a-f0-9]{10}$/);
assert.ok(['operations', 'balances', 'auth'].includes(mode)); assert.equal(fs.existsSync(output), false);
const target = sourceTarget(report.sourceName); target.pathname = '/' + report.restoreName;
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|SystemDrive|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key))), NODE_ENV: 'test', DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SHADOW_DATABASE_URL: target.toString(), RUN_S12_REHEARSAL: '1', S12_DATABASE_NAME: report.restoreName, S12_FIXTURE: record.replace(/-rehearsal\.json$/, '-fixture.json'), S12_RESULT: output + '-detail.json', AUTH_SECRET: 'synthetic-s12-auth-secret-not-used-outside-local-rehearsal', NEXTAUTH_URL: 'http://localhost:3000', NEXT_PUBLIC_BASE_URL: 'http://localhost:3000', TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' }) };
assertS12Target(env);
const args = mode !== 'auth'
  ? ['node_modules/jest/bin/jest.js', '--config', 'jest.s12.config.cjs', '--runInBand', '--no-cache', '--runTestsByPath', 'tests/s12/operations.postgres.test.ts', ...(mode === 'balances' ? ['--testNamePattern=preserves stock'] : []), '--json', '--outputFile=' + output]
  : ['--conditions=react-server', '-r', 'ts-node/register/transpile-only', '-r', 'tsconfig-paths/register', 'scripts/s12-auth-probe.ts'];
const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 300000, windowsHide: true, maxBuffer: 8e6 });
fs.writeFileSync(output + '.log', ((result.stdout || '') + (result.stderr || '')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]'), { flag: 'wx' });
if (mode === 'auth') fs.writeFileSync(output, JSON.stringify({ exitCode: result.status, evidence: output + '.log', restoreQualifiedByThisProbe: false }, null, 2), { flag: 'wx' });
console.log(mode + ': exit ' + result.status); process.exitCode = result.status === 0 ? 0 : 1;
