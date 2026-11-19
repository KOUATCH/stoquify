// Owned local migration rehearsal only. No application build, schema push,
// production target, reset/drop of an existing database, or ambient .env values.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..');
const bin = 'C:/Program Files/PostgreSQL/17/bin';
const recordPath = path.join(__dirname, 'DATABASE_TARGET.json');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const clean = text => String(text || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_LOCAL_DATABASE]');
const osEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
const inheritedOs = osEnv();
for (const key of Object.keys(process.env)) delete process.env[key];
Object.assign(process.env, inheritedOs);
require('node:dns').setDefaultResultOrder('ipv4first');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
const connection = (record, database) => `postgresql://${record.user}@localhost:${record.port}/${database}?schema=public`;
function targetEnv(record, database) {
  const target = connection(record, database);
  return { ...osEnv(), NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first',
    DATABASE_URL: target, DIRECT_URL: target, SHADOW_DATABASE_URL: target,
    AQSTOQFLOW_FRESH_REPLAY_DATABASE_URL: target,
    PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1', NEXT_TELEMETRY_DISABLED: '1' };
}
function run(label, executable, args, { cwd = root, env = osEnv(), ...extra } = {}) {
  const began = new Date().toISOString();
  write('MIGRATION_STAGE.json', { label, state: 'running', began });
  console.log(`${label}: starting`);
  const result = spawnSync(executable, args, { cwd, env, windowsHide: true,
    encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 600000, ...extra });
  fs.writeFileSync(path.join(__dirname, `${label}.log`), clean(result.stdout) + clean(result.stderr));
  write(`${label}.execution.json`, { executable, args, cwd, began, ended: new Date().toISOString(), exitCode: result.status, errorCode: result.error?.code });
  console.log(`${label}: exit ${result.status}`);
  if (result.error || result.status !== 0) throw Error(`${label} failed; inspect its retained log`);
  return result.stdout;
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const { port } = server.address(); await new Promise(resolve => server.close(resolve)); return port;
}
function load() {
  const saved = read(recordPath), record = { ...saved, sourceDirectory: saved.migrationSource, replayDatabase: saved.freshDatabase };
  const owned = fs.realpathSync(path.join(root, '.codex-tmp')) + path.sep;
  if (!fs.realpathSync(record.directory).startsWith(owned)
    || !/^sales-release-migrations-20261109-[a-f0-9]{10}$/.test(path.basename(record.directory))
    || record.clusterDirectory !== record.directory || record.sourceDirectory !== path.join(record.directory, 'migration-source')
    || record.host !== 'localhost' || record.user !== 'sales_release_fixture'
    || !Number.isSafeInteger(record.port) || record.port < 1024 || record.port > 65535
    || !/^stoquify_replay_20261109_[a-f0-9]{10}$/.test(record.replayDatabase)
    || !/^stoquify_pos_audit_20261109_[a-f0-9]{10}$/.test(record.posDatabase)) throw Error('Unexpected owned migration target');
  return record;
}
function copyFile(relative, destination, files) {
  assert(!path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'), 'Relative source required');
  const source = path.join(root, relative), stat = fs.lstatSync(source);
  assert(stat.isFile() && !stat.isSymbolicLink(), `Unreviewed source type: ${relative}`);
  const bytes = fs.readFileSync(source), target = path.join(destination, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' });
  assert.equal(hash(fs.readFileSync(source)), hash(bytes), `Source changed while copying: ${relative}`);
  files.push({ path: relative.replaceAll('\\', '/'), sha256: hash(bytes), byteLength: bytes.length });
}
function freeze(record) {
  const catalog = require(path.join(root, 'scripts/prisma-migration-catalog-gate.js'));
  const manifest = catalog.buildManifest(root), validation = catalog.validateManifest(root);
  assert.equal(validation.status, 'ready'); assert.equal(manifest.migrationCount, 121, 'Review changed migration boundary');
  const registry = read(path.join(root, 'docs/ecc/command-registry.json'));
  const selected = new Set(['package.json', 'package-lock.json', 'prisma.config.ts', 'prisma/schema.prisma',
    'prisma/migrations/migration_lock.toml', 'prisma/migration-catalog-manifest.json', 'prisma/migration-catalog-exceptions.json',
    'prisma/migration-history-checksum-approvals.json', 'prisma/migration-risk-approvals.json',
    'scripts/prisma-local-fresh-bootstrap.js', 'scripts/prisma-fresh-replay-runner.js', 'scripts/prisma-fresh-replay-certification.js',
    'scripts/prisma-migration-catalog-gate.js', 'scripts/prisma-migration-history-health-check.js',
    'scripts/prisma-production-migration-gate.js', 'scripts/verify-agent-workflow-contract.js',
    'docs/ecc/command-registry.json', ...registry.requiredReferences]);
  for (const entry of Object.values(registry.commands)) for (const relative of Object.keys(entry.files)) selected.add(relative);
  for (const migration of manifest.migrations) selected.add(migration.path);
  fs.mkdirSync(record.sourceDirectory, { recursive: false });
  const files = [];
  for (const relative of [...selected].sort()) {
    assert(!relative.split(/[\\/]/).some(part => part.startsWith('.env')), 'Environment files excluded');
    copyFile(relative, record.sourceDirectory, files);
  }
  const modules = path.join(record.sourceDirectory, 'node_modules'); fs.mkdirSync(modules);
  const dependencyInputs = [];
  for (const name of ['prisma', 'pg', 'dotenv']) {
    const installed = path.join(root, 'node_modules', name);
    fs.symlinkSync(installed, path.join(modules, name), 'junction');
    dependencyInputs.push({ package: name, version: read(path.join(installed, 'package.json')).version, installedPackageSha256: hash(fs.readFileSync(path.join(installed, 'package.json'))) });
  }
  const provenance = { utc: new Date().toISOString(), sourceRoot: record.sourceDirectory, files,
    fileManifestSha256: hash(JSON.stringify(files)), catalogSha256: manifest.catalogSha256, migrationCount: manifest.migrationCount,
    migrations: manifest.migrations, catalogValidation: validation.status,
    cliSha256: hash(fs.readFileSync(path.join(root, 'node_modules/prisma/build/index.js'))), dependencyInputs,
    limitation: 'Reviewed existing installed dependencies for migration execution; not clean locked-install or application artifact qualification' };
  write('MIGRATION_SOURCE_PROVENANCE.json', provenance);
  assertFrozen(record);
  return provenance;
}
function assertFrozen(record) {
  const provenance = read(path.join(__dirname, 'MIGRATION_SOURCE_PROVENANCE.json'));
  assert.equal(provenance.sourceRoot, record.sourceDirectory);
  for (const file of provenance.files) {
    assert.equal(hash(fs.readFileSync(path.join(record.sourceDirectory, file.path))), file.sha256, `Frozen source changed: ${file.path}`);
    assert.equal(hash(fs.readFileSync(path.join(root, file.path))), file.sha256, `Current reviewed source changed: ${file.path}`);
  }
  return provenance;
}
async function identity(record, database) {
  assert(['postgres', record.replayDatabase, record.posDatabase].includes(database));
  const { Client } = require(path.join(root, 'node_modules/pg'));
  const client = new Client({ connectionString: connection(record, database), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    const { rows: [row] } = await client.query("SELECT current_database() AS database,current_user AS actor,current_setting('data_directory') AS directory,inet_server_port() AS port,inet_server_addr()::text AS address");
    assert.equal(row.database, database); assert.equal(row.actor, record.user); assert.equal(row.port, record.port);
    assert.equal(row.address, '127.0.0.1');
    assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(record.directory, 'data')).toLowerCase());
    return client;
  } catch (error) { await client.end(); throw error; }
}
function startCluster(record) {
  const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.directory, 'data'), 'status'], { env: osEnv(), windowsHide: true, stdio: 'ignore' });
  if (status.status === 0) return false;
  assert.equal(status.status, 3, 'Cannot determine owned cluster status');
  run('migration-pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.directory, 'data'), '-l', path.join(record.directory, 'postgres.log'), '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' });
  return true;
}
function stopCluster(record) { run('migration-pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.directory, 'data'), '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' }); }
async function inspectDatabase(record, database, expected, label) {
  const client = await identity(record, database);
  try {
    const history = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    assert.deepEqual(history.map(row => row.migration_name), expected.migrations.map(item => item.name));
    for (const row of history) {
      assert(row.finished_at && !row.rolled_back_at);
      assert.equal(row.checksum, expected.migrations.find(item => item.name === row.migration_name).rawSha256);
    }
    const triggers = (await client.query("SELECT c.relname AS table_name,t.tgname AS trigger_name,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname")).rows;
    const constraints = (await client.query("SELECT c.relname AS table_name,k.conname AS constraint_name,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype='c' ORDER BY c.relname,k.conname")).rows;
    const functions = (await client.query("SELECT p.proname AS name,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' ORDER BY p.proname,p.oid")).rows.map(fn => ({ name: fn.name, sha256: hash(fn.definition), definition: fn.definition }));
    for (const name of ['customer_receivable_documents_prevent_mutation_trigger', 'customer_receivable_document_states_prevent_mutation_trigger', 'customer_settlement_allocations_prevent_receivable_relink_trigger', 'journal_entries_prevent_posted_draft', 'journal_entry_lines_guard_posted_tenant', 'close_source_revision_change']) assert(triggers.some(item => item.trigger_name === name), `Expected trigger absent: ${name}`);
    assert(constraints.some(item => item.constraint_name === 'customer_settlements_reversed_evidence_complete_check'));
    const result = { utc: new Date().toISOString(), database, migrationCount: history.length, history, triggers, constraints, functions,
      limitation: 'Installed custom SQL inventory only; runtime negative probes and financial workflow qualification remain separate' };
    write(`${label}-database-inventory.json`, result);
    return { migrationCount: history.length, userTriggerCount: triggers.length, checkConstraintCount: constraints.length, publicFunctionCount: functions.length };
  } finally { await client.end(); }
}
async function prepareReplay() {
  assert(!fs.existsSync(recordPath), 'Refusing to replace an existing owned rehearsal record');
  const id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', `sales-release-migrations-20261109-${id}`);
  fs.mkdirSync(directory, { recursive: false });
  const saved = { directory, clusterDirectory: directory, migrationSource: path.join(directory, 'migration-source'), host: 'localhost', port: await freePort(), user: 'sales_release_fixture',
    freshDatabase: `stoquify_replay_20261109_${id}`, posDatabase: `stoquify_pos_audit_20261109_${id}`, createdAt: new Date().toISOString(), method: 'New private PG17 cluster, full frozen migration catalog; no existing database reset, copy or drop' };
  fs.writeFileSync(recordPath, JSON.stringify(saved, null, 2) + '\n', { flag: 'wx' });
  const record = load();
  const provenance = freeze(record), report = { began: new Date().toISOString(), passed: false, target: saved, catalogSha256: provenance.catalogSha256, checks: [] };
  let started = false;
  try {
    run('migration-initdb', path.join(bin, 'initdb.exe'), ['-D', path.join(directory, 'data'), '-U', record.user, '-A', 'trust', '-E', 'UTF8', '--locale=C']);
    started = startCluster(record);
    const admin = await identity(record, 'postgres'); await admin.end();
    const req = createRequire(path.join(record.sourceDirectory, 'package.json'));
    const bootstrap = req('./scripts/prisma-local-fresh-bootstrap.js');
    run('full-fresh-replay', process.execPath, [path.join(record.sourceDirectory, 'scripts/prisma-fresh-replay-runner.js'), '--root', record.sourceDirectory, '--mode', 'create', '--database', record.replayDatabase,
      '--out', path.join(__dirname, 'fresh-replay-certification.md'), '--json-out', path.join(__dirname, 'fresh-replay-certification.json')], { cwd: record.sourceDirectory, env: targetEnv(record, record.replayDatabase) });
    const certification = read(path.join(__dirname, 'fresh-replay-certification.json'));
    assert.equal(certification.ready, true); assert.equal(certification.history.appliedCount, 121);
    report.checks.push({ stage: 'freshReplay', ...await inspectDatabase(record, record.replayDatabase, provenance, 'fresh-replay') });
    await bootstrap.createNewDatabase(new URL(connection(record, record.posDatabase)), record.posDatabase);
    const target = await identity(record, record.posDatabase); await target.end();
    for (const pass of [1, 2]) run(`pos-full-catalog-deploy-${pass}`, process.execPath, [path.join(record.sourceDirectory, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: record.sourceDirectory, env: targetEnv(record, record.posDatabase) });
    report.checks.push({ stage: 'posRuntimeReplay', ...await inspectDatabase(record, record.posDatabase, provenance, 'pos-runtime') });
    assertFrozen(record); report.passed = true;
  } catch (error) { report.failure = clean(error.message); throw error; }
  finally {
    if (started) { stopCluster(record); report.ownedClusterStopped = true; }
    report.ended = new Date().toISOString(); write('MIGRATION_REHEARSAL_RESULT.json', report);
  }
}
async function serveOwned() {
  const record = load(), stop = path.join(record.directory, 'MIGRATIONS.STOP');
  if (fs.existsSync(stop)) fs.unlinkSync(stop);
  const started = startCluster(record); let stopping = false;
  process.once('SIGINT', () => { stopping = true; }); process.once('SIGTERM', () => { stopping = true; });
  try {
    const client = await identity(record, 'postgres'); await client.end();
    write('MIGRATION_RUNTIME_READY.json', { utc: new Date().toISOString(), supervisorPid: process.pid, port: record.port, owned: true });
    console.log('Owned PG17 migration cluster ready; waiting for explicit stop marker.');
    while (!stopping && !fs.existsSync(stop)) await new Promise(resolve => setTimeout(resolve, 1000));
  } finally { if (started) stopCluster(record); write('MIGRATION_RUNTIME_STOPPED.json', { utc: new Date().toISOString(), ownedClusterStopped: started }); }
}
async function main() {
  if (process.argv[2] === 'prepare-replay') return prepareReplay();
  if (process.argv[2] === 'serve-owned') return serveOwned();
  if (process.argv[2] === 'stop-owned') { const record = load(); fs.writeFileSync(path.join(record.directory, 'MIGRATIONS.STOP'), 'Explicit owned stop requested\n'); return; }
  throw Error('Expected prepare-replay, serve-owned or stop-owned');
}
main().catch(error => { console.error(clean(error.message)); process.exitCode = 1; });
