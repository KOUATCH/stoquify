#!/usr/bin/env node
'use strict';

// Plan is file-only. Explicit execute authenticates synthetic users and calls period gates.
// No schema, original dataset runner, employee/time observations or statutory rules are changed.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const { DATABASE, buildPlan, planHash, parseArgs, assertTarget, sanitize } = require('./disposable-payroll-continuation-plan.cjs');
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'docs/engineering/database/disposable-dataset-2026-10-28');
const DEST = path.join(ROOT, 'docs/database-seed/payroll-continuation-2026-11-02');
const PRIVATE = path.join(ROOT, '.seed-artifacts/disposable-dataset-2026-10-28');
const PLAN_FILE = path.join(DEST, 'payroll-continuation-plan.json');
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const save = (file, value) => fs.writeFileSync(path.join(DEST, file), JSON.stringify(value, null, 2) + '\n');

function sourceManifest() {
  const manifest = JSON.parse(fs.readFileSync(path.join(SOURCE, 'manifest.json'), 'utf8'));
  const target = new URL(`postgresql://${manifest.target.host}:${manifest.target.port || '5432'}/${DATABASE}?schema=public`);
  assertTarget(target, manifest, digest(path.join(ROOT, 'prisma/schema.prisma')));
  return manifest;
}

async function main(args = process.argv.slice(2)) {
  const { mode, database } = parseArgs(args);
  const manifest = sourceManifest();
  const plan = buildPlan();
  const hash = planHash(plan);
  fs.mkdirSync(DEST, { recursive: true });
  if (mode === 'plan') {
    save('payroll-continuation-plan.json', { planHash: hash, plan });
    console.log(JSON.stringify({ mode, database, planHash: hash, ...plan.counts, evidenceClass: plan.evidenceClass, output: PLAN_FILE }));
    return 0;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Production environment is prohibited');
  if (!fs.existsSync(PLAN_FILE)) throw new Error('Generate and inspect the plan before explicit execute');
  const retained = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
  if (retained.planHash !== hash || planHash(retained.plan) !== hash) throw new Error('Saved plan is stale or altered; inspect a fresh plan');
  for (const file of ['credentials.json', 'runtime-secrets.json', 'empty.env']) {
    if (!fs.existsSync(path.join(PRIVATE, file))) throw new Error(`Required retained private fixture missing: ${file}`);
  }
  const { ownedTarget, childEnv } = require('./disposable-business-dataset.cjs');
  const target = ownedTarget(database);
  assertTarget(target, manifest, digest(path.join(ROOT, 'prisma/schema.prisma')));
  const { Client } = require('pg');
  const lock = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  const startedAt = new Date().toISOString();
  const runKey = startedAt.replace(/[:.]/g, '-');
  const logFile = path.join(DEST, `payroll-continuation-${runKey}.log`);
  const resultFile = path.join(DEST, `payroll-continuation-${runKey}.json`);
  let acquired = false;
  try {
    await lock.connect();
    const identity = (await lock.query('SELECT current_database() AS database, current_schema() AS schema')).rows[0];
    if (identity.database !== database || identity.schema !== 'public') throw new Error('Connected target identity mismatch');
    acquired = (await lock.query('SELECT pg_try_advisory_lock(hashtext($1)) AS acquired', [`disposable-payroll-continuation:${database}`])).rows[0].acquired;
    if (!acquired) throw new Error('Another payroll continuation is already running');
    const argv = ['-r', 'ts-node/register/transpile-only', '-r', './scripts/register-server-only-shim.js', '-r', 'tsconfig-paths/register', 'prisma/disposable-payroll-continuation.ts', '--execute', database];
    const env = { ...childEnv(target), RESEND_API_KEY: '', UPLOADTHING_TOKEN: '',
      STOQUIFY_PAYROLL_CONTINUATION_PLAN_HASH: hash, STOQUIFY_PAYROLL_CONTINUATION_RESULT: resultFile };
    fs.writeFileSync(logFile, '');
    const status = await new Promise(resolve => {
      const child = spawn(process.execPath, argv, { cwd: ROOT, env, windowsHide: true, timeout: 600000 });
      const capture = () => {
        let pending = '';
        return {
          write(bytes) {
            pending += bytes.toString();
            const lines = pending.split('\n');
            pending = lines.pop();
            for (const line of lines) fs.appendFileSync(logFile, sanitize(line) + '\n');
          },
          flush() { if (pending) fs.appendFileSync(logFile, sanitize(pending)); },
        };
      };
      const stdout = capture(), stderr = capture();
      child.stdout.on('data', bytes => stdout.write(bytes)); child.stderr.on('data', bytes => stderr.write(bytes));
      child.on('error', error => fs.appendFileSync(logFile, sanitize(error.message) + '\n'));
      child.on('close', code => { stdout.flush(); stderr.flush(); resolve(code); });
    });
    const report = fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf8')) : null;
    if (!report || !['FAILED_UNEXPECTED', 'BLOCKED_PREREQUISITES_OCTOBER_PENDING'].includes(report.status) || ![1, 2].includes(status)) {
      throw new Error('Continuation exited without a terminal result; inspect the retained attempt and sanitized log');
    }
    save('payroll-continuation-results.json', report);
    save('payroll-continuation-execution.json', {
      evidenceClass: 'REAL_SERVICE_EXECUTION_ON_OWNED_DISPOSABLE_DATABASE', database,
      startedAt, finishedAt: new Date().toISOString(), exitCode: status, planHash: hash,
      resultFile: path.relative(ROOT, resultFile).replaceAll('\\', '/'), logFile: path.relative(ROOT, logFile).replaceAll('\\', '/'),
      sourceSha256: Object.fromEntries(['scripts/run-disposable-payroll-continuation.cjs', 'scripts/disposable-payroll-continuation-plan.cjs', 'prisma/disposable-payroll-continuation.ts'].map(file => [file, digest(path.join(ROOT, file))])),
    });
    console.log(JSON.stringify({ database, status: report.status, summary: report.summary, exitCode: status,
      meaning: 'Exit 2 means retained blockers/pending scope; it does not mean payroll completed.' }));
    return status;
  } finally {
    try {
      if (acquired) await lock.query('SELECT pg_advisory_unlock(hashtext($1))', [`disposable-payroll-continuation:${database}`]);
    } finally {
      await lock.end();
    }
  }
}

if (require.main === module) main().then(code => { process.exitCode = code; }).catch(error => { console.error(sanitize(error.message)); process.exitCode = 1; });
module.exports = { main, sourceManifest };
