// Prepare/run an independent, populated 120 -> 121 synthetic catalog rehearsal.
// Same frozen writer before/after; this is NOT predecessor-artifact compatibility.
// Root review is required before either stage. Never resets or drops a database.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), dns = require('node:dns');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { loadTarget } = require('./trigger-probes.cjs');
const root = path.resolve(__dirname, '../../../..');
const bin = 'C:/Program Files/PostgreSQL/17/bin';
const lastMigration = '20261102190000_payroll_history_proof_version_binding';
const lastSqlSha256 = '6134a60bec2f4aead9d134ac16a28c50e8b724b0c2b3ea5dcde97c79485017ce';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const evidence = name => path.join(__dirname, name);
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const osEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));

function candidateFor() {
  const { target, manifest: source } = require('./candidate-validation.cjs').verifyCandidate();
  assert.equal(target.candidate, path.join(target.directory, 'candidate'));
  assert.match(path.basename(target.directory), /^sales-accounting-release-20261109-[a-f0-9]{10}$/);
  assert.equal(path.dirname(fs.realpathSync(target.directory)), fs.realpathSync(path.join(root, '.codex-tmp')));
  assert.equal(source.candidate, target.candidate);
  return { candidate: target.candidate, sourceManifestSha256: sha(fs.readFileSync(evidence('CANDIDATE_SOURCE_MANIFEST.json'))) };
}

function checkedMigrations(candidate) {
  const directory = path.join(candidate, 'prisma/migrations');
  const migrations = fs.readdirSync(directory).filter(name => fs.existsSync(path.join(directory, name, 'migration.sql'))).sort()
    .map(name => ({ name, file: path.join(directory, name, 'migration.sql'), rawSha256: sha(fs.readFileSync(path.join(directory, name, 'migration.sql'))) }));
  assert.equal(migrations.length, 121, 'Changed catalog boundary requires review');
  assert.equal(migrations.at(-1).name, lastMigration);
  assert.equal(migrations.at(-1).rawSha256, lastSqlSha256, 'Review changed final migration SQL');
  // The pinned, inspected SQL creates one guard function and one trigger only.
  const finalSql = fs.readFileSync(migrations.at(-1).file, 'utf8');
  assert.equal((finalSql.match(/CREATE OR REPLACE FUNCTION/g) || []).length, 1);
  assert.equal((finalSql.match(/CREATE TRIGGER/g) || []).length, 1);
  assert.match(finalSql, /BEFORE UPDATE OF "metadata" ON "payroll_runs"/);
  return migrations;
}

function extractFixture(candidate, destination) {
  const ts = require(path.join(root, 'node_modules/typescript'));
  const filename = path.join(candidate, 'services/pos/__tests__/pos-full-commit.postgres.test.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = ['assertDisposableTarget', 'fixture', 'financialSnapshot'];
  const extracted = names.map(name => {
    const nodes = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.equal(nodes.length, 1, `Expected one frozen function: ${name}`);
    return { name, text: nodes[0].getText(ast) };
  });
  const imports = `import { randomUUID } from "node:crypto"\nimport { db } from "@/prisma/db"\nimport { acquirePOSCheckout, preparePOSCheckout } from "@/services/pos/checkout.service"\nimport { posCartRevision } from "@/services/pos/cart-revision"\n`;
  const generated = imports + extracted.map(item => item.text).join('\n\n') + '\ntype Fixture = Awaited<ReturnType<typeof fixture>>\nexport { fixture, financialSnapshot }\n';
  fs.writeFileSync(destination, generated, { flag: 'wx' });
  return { source: 'services/pos/__tests__/pos-full-commit.postgres.test.ts', sourceSha256: sha(source),
    extractedFunctions: extracted.map(item => ({ name: item.name, sha256: sha(item.text) })), generatedSha256: sha(generated),
    limitation: 'Exact AST-extracted frozen fixture/snapshot functions with explicit imports and an equivalent Fixture type alias; no Jest suite registration is imported.' };
}

function prepare() {
  assert.ok(!fs.existsSync(evidence('UPGRADE_TARGET.json')), 'Refusing to replace an upgrade target');
  const target = loadTarget(evidence('DATABASE_TARGET.json')), frozen = candidateFor();
  const migrations = checkedMigrations(frozen.candidate);
  const suffix = crypto.randomBytes(5).toString('hex');
  const directory = path.join(target.directory, `upgrade-${suffix}`);
  fs.mkdirSync(directory, { recursive: false });
  const fixtureModule = path.join(directory, 'frozen-pos-fixture.ts');
  const fixtureBinding = extractFixture(frozen.candidate, fixtureModule);
  for (const [label, selected] of [['baseline', migrations.slice(0, -1)], ['full', migrations]]) {
    const prisma = path.join(directory, label, 'prisma');
    fs.mkdirSync(path.join(prisma, 'migrations'), { recursive: true });
    write(path.join(directory, label, 'package.json'), { private: true, name: `owned-upgrade-${label}`, version: '0.0.0' });
    fs.copyFileSync(path.join(frozen.candidate, 'prisma/schema.prisma'), path.join(prisma, 'schema.prisma'), fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(path.join(frozen.candidate, 'prisma/migrations/migration_lock.toml'), path.join(prisma, 'migrations/migration_lock.toml'), fs.constants.COPYFILE_EXCL);
    for (const migration of selected) {
      const to = path.join(prisma, 'migrations', migration.name); fs.mkdirSync(to);
      fs.copyFileSync(migration.file, path.join(to, 'migration.sql'), fs.constants.COPYFILE_EXCL);
    }
  }
  const record = { directory, clusterDirectory: target.directory, host: target.host, port: target.port, user: target.user,
    database: `stoquify_pos_audit_20261109_${suffix}`, candidate: frozen.candidate, sourceManifestSha256: frozen.sourceManifestSha256,
    contextFile: path.join(directory, 'phase-context.json'), fixtureModule,
    preparedAt: new Date().toISOString(), baselineMigrationCount: 120, finalMigrationCount: 121,
    baselineSchema: path.join(directory, 'baseline/prisma/schema.prisma'), fullSchema: path.join(directory, 'full/prisma/schema.prisma'),
    migrations: migrations.map(({ name, rawSha256 }) => ({ name, rawSha256 })), fixtureBinding,
    runnerSha256: sha(fs.readFileSync(__filename)),
    testSha256: sha(fs.readFileSync(evidence('upgrade-financial-phase.test.ts'))),
    configSha256: sha(fs.readFileSync(evidence('jest.upgrade-financial.config.cjs'))),
    limitation: 'Narrow populated catalog 120 -> 121 rehearsal with the same frozen current writer, not an actual deployed predecessor artifact.' };
  assert.notEqual(record.database, target.posDatabase); assert.notEqual(record.database, target.freshDatabase);
  write(evidence('UPGRADE_TARGET.json'), record);
  console.log('Prepared independent upgrade source/context paths; no database, migration or generation command executed.');
}

function load() {
  const target = loadTarget(evidence('DATABASE_TARGET.json')), record = json(evidence('UPGRADE_TARGET.json'));
  assert.equal(record.clusterDirectory, target.directory);
  assert.equal(path.dirname(fs.realpathSync(record.directory)), fs.realpathSync(target.directory));
  assert.match(path.basename(record.directory), /^upgrade-[a-f0-9]{10}$/);
  assert.equal(record.database, `stoquify_pos_audit_20261109_${path.basename(record.directory).slice(-10)}`);
  assert.equal(record.host, target.host); assert.equal(record.port, target.port); assert.equal(record.user, target.user);
  assert.notEqual(record.database, target.posDatabase); assert.notEqual(record.database, target.freshDatabase);
  assert.equal(record.contextFile, path.join(record.directory, 'phase-context.json'));
  assert.equal(record.fixtureModule, path.join(record.directory, 'frozen-pos-fixture.ts'));
  const frozen = candidateFor(); assert.equal(record.candidate, frozen.candidate); assert.equal(record.sourceManifestSha256, frozen.sourceManifestSha256);
  assert.equal(record.runnerSha256, sha(fs.readFileSync(__filename)), 'Upgrade runner changed after preparation');
  assert.equal(record.testSha256, sha(fs.readFileSync(evidence('upgrade-financial-phase.test.ts'))));
  assert.equal(record.configSha256, sha(fs.readFileSync(evidence('jest.upgrade-financial.config.cjs'))));
  assert.equal(record.fixtureBinding.generatedSha256, sha(fs.readFileSync(record.fixtureModule)));
  assert.deepEqual(checkedMigrations(record.candidate).map(({ name, rawSha256 }) => ({ name, rawSha256 })), record.migrations);
  for (const [schema, count] of [[record.baselineSchema, 120], [record.fullSchema, 121]]) {
    assert.equal(sha(fs.readFileSync(schema)), sha(fs.readFileSync(path.join(record.candidate, 'prisma/schema.prisma'))));
    const folder = path.join(path.dirname(schema), 'migrations');
    const actual = fs.readdirSync(folder).filter(name => fs.existsSync(path.join(folder, name, 'migration.sql'))).sort();
    assert.deepEqual(actual, record.migrations.slice(0, count).map(item => item.name));
    for (const migration of record.migrations.slice(0, count)) assert.equal(sha(fs.readFileSync(path.join(folder, migration.name, 'migration.sql'))), migration.rawSha256);
  }
  return { ...record, parentTarget: target };
}

const url = record => `postgresql://${record.user}@localhost:${record.port}/${record.database}?schema=public`;
const envFor = record => ({ ...osEnv(), NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first',
  DATABASE_URL: url(record), DIRECT_URL: url(record), SHADOW_DATABASE_URL: url(record),
  POS_DISPOSABLE_DATABASE_NAME: record.database, UPGRADE_PHASE_CONTEXT: record.contextFile,
  PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1', NEXT_TELEMETRY_DISABLED: '1',
  AUTH_SECRET: crypto.randomBytes(32).toString('hex'), NEXT_PUBLIC_BASE_URL: 'http://localhost:3000' });
function runCommand(record, label, executable, args, cwd, env) {
  const prefix = evidence(`upgrade-${path.basename(record.directory).slice(-10)}-${label}`);
  const started = new Date().toISOString();
  const result = spawnSync(executable, args, { cwd, env, windowsHide: true, encoding: 'utf8', timeout: 900000, maxBuffer: 40 * 1024 * 1024 });
  fs.writeFileSync(prefix + '.log', ((result.stdout || '') + (result.stderr || '')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_UPGRADE_DATABASE]'), { flag: 'wx' });
  write(prefix + '.execution.json', { executable, args, cwd, started, finished: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null });
  assert.equal(result.status, 0, `${label} failed; inspect retained log`); assert.ok(!result.error, `${label} process error`);
  console.log(`${label}: passed`);
}
function clientFor(record, database = record.database) {
  return new Client({ host: record.host, port: record.port, user: record.user, password: async () => '', database, ssl: false,
    application_name: 'stoquify-owned-upgrade-proof', connectionTimeoutMillis: 5000,
    options: '-c search_path=public -c statement_timeout=30000 -c lock_timeout=5000' });
}
async function identity(client, record, database) {
  const { rows: [row] } = await client.query(`SELECT current_database() AS database,current_user AS actor,
    current_setting('data_directory') AS directory,host(inet_server_addr()) AS address,inet_server_port() AS port`);
  assert.equal(row.database, database); assert.equal(row.actor, record.user); assert.equal(row.port, record.port);
  assert.ok(['127.0.0.1', '::1'].includes(row.address));
  assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(record.clusterDirectory, 'data')).toLowerCase());
}
async function history(client, record, count) {
  const { rows } = await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name');
  assert.equal(rows.length, count);
  rows.forEach((row, i) => { assert.equal(row.migration_name, record.migrations[i].name); assert.equal(row.checksum, record.migrations[i].rawSha256); assert.ok(row.finished_at && !row.rolled_back_at); });
  return rows.map(({ migration_name, checksum }) => ({ name: migration_name, checksum }));
}
async function profile(client) {
  const { rows: names } = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`);
  const result = [];
  for (const { tablename } of names) {
    const quoted = '"' + tablename.replaceAll('"', '""') + '"';
    const { rows: [row] } = await client.query(`SELECT count(*)::text AS count,COALESCE(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') AS data FROM public.${quoted} t`);
    result.push({ table: tablename, count: row.count, rowsSha256: sha(row.data) });
  }
  return result;
}

async function execute() {
  const record = load();
  assert.equal(json(evidence('MIGRATION_REHEARSAL_RESULT.json')).passed, true, 'Full migration rehearsal must pass first');
  const orm = json(evidence('ORM_PROVENANCE.json'));
  assert.equal(orm.client, path.join(record.clusterDirectory, 'orm/client')); assert.equal(orm.source, record.candidate);
  assert.equal(orm.sourceSchemaSha256, sha(fs.readFileSync(path.join(record.candidate, 'prisma/schema.prisma'))));
  assert.ok(fs.existsSync(path.join(orm.client, 'index.js')), 'Prepared private ORM client required');
  assert.ok(!fs.existsSync(record.contextFile), 'Refusing to reuse an executed/prepared phase context');
  assert.ok(!fs.existsSync(evidence('UPGRADE_PROOF_RESULT.json')), 'Refusing to overwrite upgrade evidence');
  const context = { ...record, parentTarget: undefined, client: orm.client,
    receiptFile: path.join(record.directory, 'pre-upgrade-sale.private.json'),
    beforeProof: evidence('upgrade-financial-before.json'), afterProof: evidence('upgrade-financial-after.json') };
  const report = { passed: false, startedAt: new Date().toISOString(), database: record.database, clusterDirectory: record.clusterDirectory,
    sourceManifestSha256: record.sourceManifestSha256, fixtureBinding: record.fixtureBinding,
    boundary: { before: 120, after: 121, onlyAddedMigration: lastMigration, lastSqlSha256 },
    writer: 'Same frozen current financial kernels before and after migration',
    limitations: ['No actual deployed predecessor artifact was provided or qualified.', 'Synthetic zero-tax mappings and supplied trusted service controls; no browser/session/RBAC/provider/statutory certification.',
      'Final migration adds a payroll metadata guard only; this proves narrow additive catalog compatibility with populated financial data, not arbitrary migrations.'] };
  const env = envFor(record), pgData = path.join(record.clusterDirectory, 'data');
  const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', pgData, 'status'], { env: osEnv(), windowsHide: true, stdio: 'ignore' });
  assert.equal(status.status, 3, 'Cluster is already in use; wait for the other stage');
  write(record.contextFile, context);
  let started = false, client;
  try {
    started = true;
    runCommand(record, 'pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', pgData, '-l', path.join(record.clusterDirectory, 'postgres.log'), '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start'], record.directory, osEnv());
    const admin = clientFor(record, 'postgres'); await admin.connect();
    try {
      await identity(admin, record, 'postgres');
      assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [record.database])).rowCount, 0, 'Refusing an existing database');
      await admin.query(`CREATE DATABASE "${record.database}"`);
    } finally { await admin.end(); }
    const migrate = (schema, label) => runCommand(record, label, process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', schema], path.dirname(path.dirname(schema)), env);
    migrate(record.baselineSchema, 'baseline-120-deploy');
    client = clientFor(record); await client.connect(); await identity(client, record, record.database);
    report.beforeHistory = await history(client, record, 120);
    assert.equal((await client.query(`SELECT count(*)::integer AS n FROM pg_trigger WHERE tgname='payroll_run_history_proof_version_immutable' AND NOT tgisinternal`)).rows[0].n, 0);
    const phase = name => runCommand(record, `financial-${name}`, process.execPath,
      [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', evidence('jest.upgrade-financial.config.cjs'), '--runInBand', '--no-cache', '--runTestsByPath', evidence('upgrade-financial-phase.test.ts'), '--json', '--outputFile', evidence(`upgrade-financial-${name}.results.json`)], record.candidate, { ...env, UPGRADE_PHASE: name });
    phase('before');
    report.preUpgrade = await profile(client);
    assert.ok(Number(report.preUpgrade.find(row => row.table === 'journal_entries')?.count) >= 2, 'A populated pre-upgrade ledger is required');
    write(evidence('upgrade-preexisting-rows-before.json'), report.preUpgrade);
    migrate(record.fullSchema, 'full-121-upgrade');
    report.afterUpgradeHistory = await history(client, record, 121);
    report.afterUpgrade = await profile(client); assert.deepEqual(report.afterUpgrade, report.preUpgrade, 'Pre-existing rows changed during additive upgrade');
    migrate(record.fullSchema, 'full-121-replay');
    report.afterReplayHistory = await history(client, record, 121);
    report.afterReplay = await profile(client); assert.deepEqual(report.afterReplay, report.preUpgrade, 'Pre-existing rows changed during migration replay');
    const { rows: trigger } = await client.query(`SELECT t.tgenabled,p.proname,pg_get_triggerdef(t.oid,true) AS definition,pg_get_functiondef(p.oid) AS function_definition
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid
      WHERE n.nspname='public' AND c.relname='payroll_runs' AND t.tgname='payroll_run_history_proof_version_immutable' AND NOT t.tgisinternal`);
    assert.equal(trigger.length, 1); assert.equal(trigger[0].tgenabled, 'O'); assert.equal(trigger[0].proname, 'payroll_run_history_proof_version_immutable');
    report.newTrigger = { name: trigger[0].proname, definitionSha256: sha(trigger[0].definition), functionDefinitionSha256: sha(trigger[0].function_definition) };
    phase('after');
    report.financialBefore = json(context.beforeProof); report.financialAfter = json(context.afterProof);
    assert.equal(report.financialBefore.passed, true); assert.equal(report.financialAfter.passed, true);
    report.finalHistory = await history(client, record, 121); await identity(client, record, record.database);
    candidateFor(); report.preExistingRowsPreserved = true; report.replayPassed = true; report.passed = true;
  } catch (error) {
    report.failure = { name: error.name, code: error.code || null, message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_UPGRADE_DATABASE]') };
    process.exitCode = 1;
  } finally {
    if (client) await client.end().catch(() => undefined);
    if (started) {
      try { runCommand(record, 'pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', pgData, '-m', 'fast', '-w', 'stop'], record.directory, osEnv()); report.clusterStopped = true; }
      catch (error) { report.clusterStopped = false; report.passed = false; report.stopError = error.message; process.exitCode = 1; }
    }
    report.finishedAt = new Date().toISOString(); write(evidence('UPGRADE_PROOF_RESULT.json'), report);
  }
  console.log(`Populated 120 -> 121 upgrade ${report.passed ? 'passed' : 'failed'}; retained database ${record.database}`);
}

if (require.main === module) {
  dns.setDefaultResultOrder('ipv4first');
  Promise.resolve().then(() => {
    assert.notEqual(process.env.NODE_ENV, 'production'); assert.equal(process.argv.length, 3);
    if (process.argv[2] === 'prepare') return prepare();
    if (process.argv[2] === 'run') return execute();
    throw Error('Expected prepare or run');
  }).catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_UPGRADE_DATABASE]')); process.exitCode = 1; });
}
module.exports = { prepare, load, checkedMigrations, extractFixture };
