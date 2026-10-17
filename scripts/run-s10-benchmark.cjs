// Creates only a uniquely named schema in the explicitly owned S04/S05 local database.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveTarget } = require('./s04-s05-target.cjs');
const [name, output, mode] = process.argv.slice(2);
if (!output || !['acquire', 'renew'].includes(mode)) throw new Error('Usage: database new-output.json acquire|renew');
const target = resolveTarget(name);
const identity = JSON.parse(fs.readFileSync(path.join(path.dirname(output), `${name}-identity.json`)));
if (identity.name !== name || identity.host !== 'localhost' || fs.existsSync(output)) throw new Error('Owned target and fresh output required');
target.searchParams.set('schema', `s10_${Date.now()}`);
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|SystemDrive|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key))), S10_EXTENDED: process.env.S10_EXTENDED === '1' ? '1' : '0', NODE_ENV: 'test', DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SHADOW_DATABASE_URL: target.toString(), S10_BENCH_OUTPUT: path.resolve(output), S10_BENCH_MODE: mode, POS_DISPOSABLE_DATABASE_NAME: name };
const result = spawnSync(process.execPath, ['node_modules/jest/bin/jest.js', '--config', 'jest.s10-s11.config.cjs', '--runInBand', '--no-cache', '--runTestsByPath', 'tests/s10-s11/lease-benchmark.postgres.test.ts'], { env, encoding: 'utf8', timeout: 300000, maxBuffer: 5e6 });
fs.writeFileSync(output + '.log', ((result.stdout || '') + (result.stderr || '')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]'), { flag: 'wx' });
console.log(`S10 ${mode}: exit ${result.status}; ${output}`);
process.exitCode = result.status === 0 ? 0 : 1;
