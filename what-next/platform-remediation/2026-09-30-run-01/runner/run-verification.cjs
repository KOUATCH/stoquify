const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const outputDir = __dirname;
const [name, timeoutText, ...args] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(name || '') || !Number(timeoutText) || !args.length) {
  throw new Error('Usage: node run-verification.cjs name timeoutMs nodeArguments...');
}
if (['.result.json', '.stdout.log', '.stderr.log'].some(suffix => fs.existsSync(path.join(outputDir, name + suffix)))) {
  throw new Error('Evidence name already exists; choose a new name to preserve the previous run');
}
const startedAt = new Date().toISOString();
const fingerprints = Object.fromEntries(['jest.config.ts', 'tsconfig.json', 'next.config.mjs'].map(file => [file,
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const environment = { ...process.env, NODE_ENV: 'test', NEXT_TELEMETRY_DISABLED: '1',
  DATABASE_URL: 'postgresql://unreachable:unreachable@127.0.0.1:1/verification_no_database',
  DIRECT_URL: 'postgresql://unreachable:unreachable@127.0.0.1:1/verification_no_database',
  SHADOW_DATABASE_URL: 'postgresql://unreachable:unreachable@127.0.0.1:1/verification_no_database' };
for (const key of ['DATABASE_URL_UNPOOLED', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NON_POOLING']) environment[key] = environment.DATABASE_URL;
const stdout = fs.openSync(path.join(outputDir, `${name}.stdout.log`), 'w');
const stderr = fs.openSync(path.join(outputDir, `${name}.stderr.log`), 'w');
const child = spawn(process.execPath, args, { cwd: process.cwd(), env: environment, windowsHide: true,
  stdio: ['ignore', stdout, stderr] });
let timedOut = false;
const timer = setTimeout(() => { timedOut = true; child.kill(); }, Number(timeoutText));
child.on('error', error => { fs.writeSync(stderr, String(error)); });
child.on('close', (code, signal) => {
  clearTimeout(timer);
  fs.closeSync(stdout);
  fs.closeSync(stderr);
  const result = { name, command: [process.execPath, ...args], startedAt, endedAt: new Date().toISOString(),
    code, signal, timedOut, fingerprints, databaseTarget: 'disabled localhost:1; no live data target' };
  fs.writeFileSync(path.join(outputDir, `${name}.result.json`), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
  process.exitCode = timedOut ? 124 : code || 0;
});
