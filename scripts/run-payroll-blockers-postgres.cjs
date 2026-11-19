// Creates a fresh database only. Never resets/drops an existing target or reads its data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { createNewDatabase } = require('./prisma-local-fresh-bootstrap');
const { resolvePayrollBlockersTarget, loadDatabaseUrl } = require('./payroll-blockers-postgres-target.cjs');
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT_DIR = 'docs/payroll-blockers/evidence';
const PROVIDER_CREDENTIALS = ['RESEND_API_KEY', 'UPLOADTHING_TOKEN', 'UPLOADTHING_SECRET', 'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY', 'STRIPE_SECRET_KEY',
  'TWILIO_AUTH_TOKEN', 'SENDGRID_API_KEY', 'SMTP_PASSWORD', 'SMTP_PASS', 'HRIS_DOCUMENT_GATEWAY_TOKEN',
  'STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET'];

function parseArgs(argv = process.argv.slice(2)) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index], value = argv[index + 1];
    if (!['--database', '--out-dir'].includes(flag) || values.has(flag) || !value || value.startsWith('--')) {
      throw new Error('Use --database <unique disposable name> [--out-dir <directory inside repository docs>]');
    }
    values.set(flag, value);
  }
  if (!values.has('--database')) throw new Error('--database is required');
  return { name: values.get('--database'), outDir: values.get('--out-dir') ?? DEFAULT_OUT_DIR };
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

// Validate both the lexical path and its existing resolved ancestor before any write.
// The file form also rejects pre-existing evidence-file links that escape docs.
function resolveEvidencePath(input, root = ROOT, directory = true) {
  if (typeof input !== 'string' || !input.trim() || input.includes('\0') || input.split(/[\\/]/).includes('..')) {
    throw new Error('Evidence path traversal is forbidden');
  }
  const docs = path.join(root, 'docs'), target = path.resolve(root, input);
  if (!isInside(docs, target)) throw new Error('Evidence output must be inside repository docs');
  const realDocs = path.join(fs.realpathSync(root), 'docs');
  if (path.relative(realDocs, fs.realpathSync(docs)) !== '') throw new Error('Repository docs must not redirect outside its physical location');
  let ancestor = target, stat;
  for (;;) {
    try { stat = fs.lstatSync(ancestor); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; ancestor = path.dirname(ancestor); }
  }
  const resolved = fs.realpathSync(ancestor);
  if (resolved !== realDocs && !isInside(realDocs, resolved)) throw new Error('Evidence symlink escapes repository docs');
  if (ancestor !== target || directory) {
    if (!fs.statSync(ancestor).isDirectory()) throw new Error('Evidence output parent must be a directory');
  } else if (!fs.statSync(ancestor).isFile()) throw new Error('Evidence output must be a regular file');
  return target;
}

function childEnvironment(target, name, inherited = process.env) {
  return { ...inherited, ...Object.fromEntries(PROVIDER_CREDENTIALS.map(key => [key, ''])),
    NODE_ENV: 'test', DATABASE_URL: target.toString(), DIRECT_URL: target.toString(),
    SHADOW_DATABASE_URL: target.toString(), PAYROLL_IMMUTABILITY_DATABASE_URL: target.toString(),
    PAYROLL_BLOCKERS_DATABASE: name, RUN_PAYROLL_BLOCKERS_POSTGRES: '1' };
}

async function main() {
  const { name, outDir } = parseArgs();
  const OUT = resolveEvidencePath(outDir);
  const output = file => resolveEvidencePath(path.join(OUT, file), ROOT, false);
  // Check every destination before connecting, including links left from an earlier run.
  for (const file of ['postgres-run.json', 'migration-deploy.log', 'trust-spine.log', 'trust-spine.md',
    'trust-spine.json', 'service-transactions.log', 'service-transactions.json']) output(file);
  const target = resolvePayrollBlockersTarget(name, loadDatabaseUrl());
  const evidence = { generatedAt: new Date().toISOString(), database: name, host: target.hostname,
    applicationDatabaseChanged: false, existingDatabaseReset: false, outputDirectory: path.relative(ROOT, OUT).split(path.sep).join('/'),
    providerCredentialsBlanked: PROVIDER_CREDENTIALS, steps: [], created: false };
  fs.mkdirSync(OUT, { recursive: true });
  const save = () => fs.writeFileSync(output('postgres-run.json'), JSON.stringify(evidence, null, 2) + '\n');
  const env = childEnvironment(target, name);
  const sanitize = text => String(text || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[REDACTED_DATABASE_URL]');
  const run = (label, args) => {
    const result = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 240000 });
    fs.writeFileSync(output(label + '.log'), sanitize(result.stdout) + sanitize(result.stderr));
    evidence.steps.push({ label, command: ['node', ...args], exitCode: result.status, processError: result.error?.code || null });
    save();
    console.log(label + ': ' + (result.status === 0 ? 'PASS' : 'FAIL'));
    return !result.error && result.status === 0;
  };
  try {
    // Read-only local admin reachability probe with a bounded timeout, then the existing refuse-overwrite creator.
    const admin = new URL(target); admin.pathname = '/postgres';
    const probe = new Client({ connectionString: admin.toString(), connectionTimeoutMillis: 5000 });
    try { await probe.connect(); await probe.query('SELECT 1'); } finally { await probe.end(); }
    await createNewDatabase(target, name); evidence.created = true; save();
    if (!run('migration-deploy', ['node_modules/prisma/build/index.js', 'migrate', 'deploy'])) throw new Error('MIGRATION_DEPLOY_FAILED');
    const observer = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
    try {
      await observer.connect();
      const identity = await observer.query('SELECT current_database() AS database, version() AS version');
      if (identity.rows[0].database !== name) throw new Error('DATABASE_IDENTITY_MISMATCH');
      evidence.server = identity.rows[0];
      const migrations = await observer.query('SELECT migration_name, checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
      evidence.migrations = migrations.rows;
    } finally { await observer.end(); }
    const passed = [];
    passed.push(run('trust-spine', ['scripts/payroll-trust-spine-postgres-certification.js', '--out', output('trust-spine.md'), '--json-out', output('trust-spine.json')]));
    passed.push(run('service-transactions', ['node_modules/jest/bin/jest.js', '--config', 'scripts/jest.payroll-blockers-postgres.config.cjs', '--runInBand', '--no-cache', '--json', '--outputFile', output('service-transactions.json')]));
    evidence.passed = passed.every(Boolean);
    evidence.retention = 'Fresh synthetic database retained for inspection; no automatic drop or application reset.';
    evidence.sourceHashes = Object.fromEntries(['services/payroll/payroll-control.service.ts', 'scripts/run-payroll-blockers-postgres.cjs', 'scripts/payroll-blockers-postgres-target.cjs', 'scripts/jest.payroll-blockers-postgres.config.cjs', 'tests/postgres/payroll-blockers/transactions.test.ts', 'scripts/payroll-trust-spine-postgres-certification.js',
      'services/payroll/payroll-history-proof.ts', 'tests/fixtures/payroll-history-proof.ts', 'tests/postgres/payroll-blockers/history-proof.test.ts',
      'prisma/migrations/20261102190000_payroll_history_proof_version_binding/migration.sql',
      'services/payroll/__tests__/payroll-history-proof.test.ts', 'scripts/__tests__/payroll-blockers-runner.node.test.cjs',
    ].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex')]));
    save();
    if (!evidence.passed) process.exitCode = 1;
  } catch (error) {
    evidence.passed = false; evidence.failure = error.code || (/^[A-Z_]+$/.test(error.message) ? error.message : 'TARGET_OR_EXECUTION_FAILED');
    save(); console.error('Payroll database checks blocked: ' + evidence.failure); process.exitCode = 1;
  }
}
if (require.main === module) main().catch(() => { console.error('Payroll database runner arguments or evidence target rejected'); process.exitCode = 1; });
module.exports = { parseArgs, resolveEvidencePath, childEnvironment, DEFAULT_OUT_DIR, PROVIDER_CREDENTIALS };
