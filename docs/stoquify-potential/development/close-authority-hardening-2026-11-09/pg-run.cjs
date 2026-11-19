// Reviewed isolated real PostgreSQL authority qualification. No app, provider,
// schema generation, existing DB reset/drop, ambient environment or old proof writes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), pgBin = 'C:/Program Files/PostgreSQL/17/bin';
const prior = path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv);
require('node:dns').setDefaultResultOrder('ipv4first');
const { Client } = require(path.join(root, 'node_modules/pg'));
const scrub = value => String(value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_AUTHORITY_DATABASE]').replace(/cw_session_[a-f0-9]{64}/g, '[SYNTHETIC_SESSION_TOKEN]');
let preparationEvidence;
function load() {
  const target = read(path.join(prior, 'DATABASE_TARGET.json')), provenance = read(path.join(prior, 'MIGRATION_SOURCE_PROVENANCE.json'));
  const owned = fs.realpathSync(path.join(root, '.codex-tmp')) + path.sep;
  assert(fs.realpathSync(target.directory).startsWith(owned)); assert.match(path.basename(target.directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/);
  assert.equal(target.clusterDirectory, target.directory); assert.equal(target.host, 'localhost'); assert.equal(target.user, 'sales_release_fixture');
  assert(Number.isSafeInteger(target.port) && target.port > 1024 && target.port < 65536);
  assert.equal(target.migrationSource, provenance.sourceRoot); assert.equal(provenance.migrationCount, 121);
  for (const file of provenance.files) assert.equal(digest(path.join(provenance.sourceRoot, file.path)), file.sha256, `Frozen migration context changed: ${file.path}`);
  for (const file of provenance.migrations) assert.equal(digest(path.join(root, file.path)), file.rawSha256, `Current migration SQL changed: ${file.path}`);
  const schema = provenance.files.find(file => file.path === 'prisma/schema.prisma'); assert(schema);
  assert.equal(digest(path.join(root, 'prisma/schema.prisma')), schema.sha256);
  const orm = read(path.join(prior, 'ORM_PROVENANCE.json')); assert.equal(orm.sourceSchemaSha256, schema.sha256); assert.equal(orm.client, path.join(target.directory, 'orm/client'));
  assert.equal(require(path.join(orm.client, 'package.json')).version, '6.19.3');
  return { target, provenance, orm, schema };
}
function sourceClosure(destination, entries) {
  const ts = require(path.join(root, 'node_modules/typescript')), pending = [...entries], seen = new Set(), files = [];
  function resolve(specifier, from) {
    if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return null;
    const base = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(from), specifier);
    const candidates = [base, ...['.ts', '.tsx', '.js', '.cjs', '.mjs', '.json'].map(suffix => base + suffix), ...['index.ts', 'index.tsx', 'index.js', 'index.cjs'].map(name => path.join(base, name))];
    if (base.endsWith('.js')) candidates.push(base.slice(0, -3) + '.ts');
    const file = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    assert(file, `Unresolved local source dependency: ${specifier} from ${path.relative(root, from)}`); return file;
  }
  while (pending.length) {
    const file = path.resolve(pending.pop()); if (seen.has(file)) continue; seen.add(file);
    assert(file.startsWith(root + path.sep)); assert(!fs.lstatSync(file).isSymbolicLink());
    const relative = path.relative(root, file).replaceAll('\\', '/'); assert(!relative.split('/').some(part => part.startsWith('.env')));
    const bytes = fs.readFileSync(file), output = path.join(destination, relative); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes, { flag: 'wx' });
    files.push({ path: relative, sha256: hash(bytes), bytes: bytes.length });
    if (/\.(?:ts|tsx|js|cjs|mjs)$/.test(file)) {
      const text = bytes.toString('utf8'), imports = ts.preProcessFile(text, true, true).importedFiles.map(imported => imported.fileName);
      for (const match of text.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)) imports.push(match[1]);
      for (const specifier of imports) { const resolved = resolve(specifier, file); if (resolved) pending.push(resolved); }
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
async function identity(client, record, database) {
  const row = (await client.query("SELECT current_database() AS name,current_user AS actor,host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('data_directory') AS directory,current_setting('server_version_num') AS version")).rows[0];
  assert.equal(row.name, database); assert.equal(row.actor, record.target.user); assert.equal(row.host, '127.0.0.1'); assert.equal(row.port, record.target.port); assert(Number(row.version) >= 170000 && Number(row.version) < 180000);
  assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(record.target.directory, 'data')).toLowerCase()); return row;
}
async function run() {
  const record = load(), id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', `close-write-authority-20261109-${id}`);
  const evidence = path.join(__dirname, `pg-attempt-${id}`), source = path.join(directory, 'source'), database = `stoquify_replay_close_authority_20261109_${id}`;
  fs.mkdirSync(directory); fs.mkdirSync(evidence); fs.mkdirSync(source);
  preparationEvidence = evidence;
  const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const url = `postgresql://${record.target.user}@localhost:${record.target.port}/${database}?schema=public`;
  const report = { began: new Date().toISOString(), passed: false, database, directory, source, sourceClass: 'Frozen current authority helper and dependencies, existing private schema-bound Prisma6.19.3 client, real isolated PostgreSQL17',
    migrationCatalogSha256: record.provenance.catalogSha256, runnerSha256: digest(__filename), checks: [], limitation: 'Helper authority/SQL locking only; audit probe markers, no application session journey, finance, close certificate, production/provider or clean install claim.' };
  const execute = (label, executable, args, cwd = root, env = osEnv, extra = {}) => {
    console.log(`${label}: starting`); const began = Date.now();
    const result = spawnSync(executable, args, { cwd, env, windowsHide: true, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024, timeout: 300000, ...extra });
    fs.writeFileSync(path.join(evidence, label + '.log'), scrub(result.stdout) + scrub(result.stderr), { flag: 'wx' });
    write(label + '.execution.json', { executable, args, cwd, began: new Date(began).toISOString(), ended: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null });
    console.log(`${label}: exit ${result.status}`); assert(!result.error && result.status === 0, `${label} failed; retained log available`); return result;
  };
  const target = { ...record.target, database, directory, evidence, source, parentTarget: path.join(prior, 'DATABASE_TARGET.json'), privateOrm: record.orm.client };
  write('pg-DATABASE_TARGET.json', target);
  const testRelative = path.relative(root, path.join(__dirname, 'close-write-authority.postgres.test.ts'));
  const files = sourceClosure(source, [path.join(root, 'services/accounting/close-evidence-acceptance-authority.service.ts'), path.join(root, 'services/accounting/close-assessment-order.service.ts'), path.join(__dirname, 'close-write-authority.postgres.test.ts'), path.join(root, 'scripts/server-only-node-shim.js'), path.join(root, 'scripts/local-gates-network.cjs')]);
  write('pg-SOURCE_MANIFEST.json', { createdAt: new Date().toISOString(), root, source, files, sourceSha256: hash(JSON.stringify(files)), schemaSha256: record.schema.sha256,
    privateClientSchemaSha256: digest(path.join(record.orm.client, 'schema.prisma')), privateClientIndexSha256: digest(path.join(record.orm.client, 'index.js')), migrationProvenanceSha256: digest(path.join(prior, 'MIGRATION_SOURCE_PROVENANCE.json')),
    dependencies: ['pg', 'prisma', 'typescript', 'jest', 'next'].map(name => ({ name, version: read(path.join(root, 'node_modules', name, 'package.json')).version, packageSha256: digest(path.join(root, 'node_modules', name, 'package.json')) })) });
  const adapter = path.join(directory, 'pg-db.cjs');
  fs.writeFileSync(adapter, `const {PrismaClient}=require(${JSON.stringify(record.orm.client)});const u=new URL(process.env.CLOSE_WRITE_POSTGRES_URL||'');if(u.hostname!=='localhost'||u.port!==${JSON.stringify(String(record.target.port))}||u.pathname!==${JSON.stringify('/' + database)}||u.searchParams.get('schema')!=='public')throw Error('Explicit owned authority DB required');module.exports={db:new PrismaClient({datasources:{db:{url:u.toString()}},transactionOptions:{maxWait:5000,timeout:25000}})};\n`, { flag: 'wx' });
  const config = { rootDir: source, roots: [path.dirname(path.join(source, testRelative))], testEnvironment: 'node', testMatch: ['**/close-write-authority.postgres.test.ts'], testTimeout: 40000, cache: false,
    moduleNameMapper: { '^@/prisma/db$': adapter, '^@prisma/client$': record.orm.client, '^@/(.*)$': source.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(source, 'scripts/server-only-node-shim.js') },
    moduleDirectories: [path.join(root, 'node_modules')], transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') } };
  const configPath = path.join(directory, 'pg-jest.config.cjs'); fs.writeFileSync(configPath, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' });
  write('pg-RUNTIME_BINDING.json', { configPath, configSha256: digest(configPath), adapterPath: adapter, adapterSha256: digest(adapter), testSource: testRelative.replaceAll('\\', '/'), testSha256: digest(path.join(source, testRelative)), sourceManifest: 'pg-SOURCE_MANIFEST.json' });
  let started = false, failure;
  try {
    const status = spawnSync(path.join(pgBin, 'pg_ctl.exe'), ['-D', path.join(record.target.directory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' }); assert.equal(status.status, 3, 'Owned cluster already in use');
    started = true; execute('pg-start', path.join(pgBin, 'pg_ctl.exe'), ['-D', path.join(record.target.directory, 'data'), '-l', path.join(record.target.directory, 'postgres.log'), '-o', `-p ${record.target.port} -h 127.0.0.1`, '-w', 'start'], root, osEnv, { stdio: 'ignore' });
    const admin = new Client({ connectionString: `postgresql://${record.target.user}@localhost:${record.target.port}/postgres`, connectionTimeoutMillis: 5000 }); await admin.connect();
    try { write('pg-IDENTITY.json', await identity(admin, record, 'postgres')); assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).rowCount, 0, 'Refuse existing new authority target'); } finally { await admin.end(); }
    assert(!fs.existsSync(path.join(record.target.migrationSource, '.env')));
    const network = path.join(source, 'scripts/local-gates-network.cjs');
    const env = { ...osEnv, NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first --require ' + JSON.stringify(network), DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url, CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' };
    execute('pg-full-121-replay', process.execPath, [path.join(record.target.migrationSource, 'scripts/prisma-fresh-replay-runner.js'), '--root', record.target.migrationSource, '--database', database, '--out', path.join(evidence, 'pg-fresh-certification.md'), '--json-out', path.join(evidence, 'pg-fresh-certification.json')], record.target.migrationSource, env);
    const check = new Client({ connectionString: url, connectionTimeoutMillis: 5000 }); await check.connect();
    try {
      await identity(check, record, database); const rows = (await check.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(rows.length, 121); rows.forEach((row, index) => { assert.equal(row.migration_name, record.provenance.migrations[index].name); assert.equal(row.checksum, record.provenance.migrations[index].rawSha256); assert(row.finished_at && !row.rolled_back_at); });
      write('pg-MIGRATION_HISTORY.json', { database, rows, sha256: hash(JSON.stringify(rows)) });
    } finally { await check.end(); }
    execute('pg-authority-tests', process.execPath, [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', configPath, '--runInBand', '--no-cache', '--runTestsByPath', path.join(source, testRelative), '--json', '--outputFile', path.join(evidence, 'pg-authority-tests.results.json')], source,
      { ...env, CLOSE_WRITE_POSTGRES_URL: url, CLOSE_WRITE_DATABASE_NAME: database, CLOSE_WRITE_CLUSTER_DIRECTORY: record.target.directory, CLOSE_WRITE_PROBE_EVIDENCE: path.join(evidence, 'pg-probes.json') });
    const tests = read(path.join(evidence, 'pg-authority-tests.results.json')), probes = read(path.join(evidence, 'pg-probes.json'));
    assert(tests.success && tests.numFailedTests === 0 && tests.numPendingTests === 0 && tests.numPassedTests === 40); assert(Object.values(probes.noFinancialOrCertificationRecords).every(value => value === 0));
    for (const file of files) { assert.equal(digest(path.join(source, file.path)), file.sha256); assert.equal(digest(path.join(root, file.path)), file.sha256, `Current tested source changed: ${file.path}`); }
    report.checks.push({ stage: 'fullFreshReplay', migrations: 121, certification: read(path.join(evidence, 'pg-fresh-certification.json')).status });
    report.checks.push({ stage: 'realAuthorityHelper', passedTests: tests.numPassedTests, skipped: tests.numPendingTests, retainedProbeChecks: probes.checks.length, noFinancialOrCertificationRecords: probes.noFinancialOrCertificationRecords }); report.passed = true;
  } catch (error) { failure = error; report.failure = scrub(error.message); }
  finally {
    if (started) { try { execute('pg-stop', path.join(pgBin, 'pg_ctl.exe'), ['-D', path.join(record.target.directory, 'data'), '-m', 'fast', '-w', 'stop'], root, osEnv, { stdio: 'ignore' }); report.ownedClusterStopped = true; } catch (error) { report.passed = false; report.cleanupFailure = scrub(error.message); failure ||= error; } }
    report.ended = new Date().toISOString(); write('pg-RESULT.json', report);
    fs.writeFileSync(path.join(__dirname, 'pg-LATEST.json'), JSON.stringify({ evidenceDirectory: evidence, ...report }, null, 2) + '\n');
  }
  if (failure) throw failure;
}
if (process.argv.length !== 3 || process.argv[2] !== 'run') throw Error('Expected reviewed run');
run().catch(error => {
  if (preparationEvidence && !fs.existsSync(path.join(preparationEvidence, 'pg-RESULT.json'))) fs.writeFileSync(path.join(preparationEvidence, 'pg-RESULT.json'), JSON.stringify({ passed: false, phase: 'preparation-before-cluster-start', failure: scrub(error.message), runnerSha256: digest(__filename), clusterStarted: false, utc: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' });
  console.error(scrub(error.message)); process.exitCode = 1;
});
