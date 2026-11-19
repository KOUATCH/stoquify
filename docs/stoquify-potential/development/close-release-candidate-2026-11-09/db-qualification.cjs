// Current frozen candidate: fresh121 replay, real helper races, then real close
// services on deliberately incomplete setup. No app/provider or fabricated certification.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), prior = path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09');
const hardening = path.join(root, 'docs/stoquify-potential/development/close-authority-hardening-2026-11-09'), bin = 'C:/Program Files/PostgreSQL/17/bin';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file)), read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv); require('node:dns').setDefaultResultOrder('ipv4first');
const { Client } = require(path.join(root, 'node_modules/pg'));
const clean = value => String(value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_CLOSE_RELEASE_DATABASE]').replace(/(?:cw|cr)_session_[a-f0-9]{64}/g, '[SYNTHETIC_SESSION_TOKEN]');
let currentEvidence;
function load() {
  const { target, manifest } = require('./candidate-validation.cjs').verifyCandidate(), old = read(path.join(prior, 'DATABASE_TARGET.json'));
  const provenance = read(path.join(prior, 'MIGRATION_SOURCE_PROVENANCE.json')), orm = read(path.join(prior, 'ORM_PROVENANCE.json'));
  assert.equal(path.dirname(old.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(old.directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/);
  assert.equal(old.clusterDirectory, old.directory); assert.equal(old.host, 'localhost'); assert.equal(old.user, 'sales_release_fixture'); assert(Number.isSafeInteger(old.port) && old.port > 1024 && old.port < 65536);
  assert.equal(provenance.migrationCount, 121); for (const entry of provenance.migrations) assert.equal(digest(path.join(target.candidate, entry.path)), entry.rawSha256, 'Changed candidate migration SQL');
  const schema = provenance.files.find(entry => entry.path === 'prisma/schema.prisma'); assert(schema); assert.equal(digest(path.join(target.candidate, schema.path)), schema.sha256); assert.equal(orm.sourceSchemaSha256, schema.sha256); assert.equal(orm.client, path.join(old.directory, 'orm/client'));
  assert.equal(read(path.join(orm.client, 'package.json')).version, '6.19.3');
  return { target, manifest, old, provenance, orm, schema };
}
async function identity(client, record, database) {
  const row = (await client.query("SELECT current_database() AS name,current_user AS actor,host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('data_directory') AS directory,current_setting('server_version_num') AS version")).rows[0];
  assert.equal(row.name, database); assert.equal(row.actor, record.old.user); assert.equal(row.host, '127.0.0.1'); assert.equal(row.port, record.old.port); assert(Number(row.version) >= 170000 && Number(row.version) < 180000);
  assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(record.old.directory, 'data')).toLowerCase()); return row;
}
async function run() {
  const record = load(), id = crypto.randomBytes(5).toString('hex'), evidence = path.join(__dirname, `pg-attempt-${id}`), privateDir = path.join(record.target.directory, `db-private-${id}`);
  fs.mkdirSync(evidence); currentEvidence = evidence; fs.mkdirSync(privateDir);
  const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const targetPath = path.join(__dirname, 'DATABASE_TARGET.json');
  if (!fs.existsSync(targetPath)) fs.writeFileSync(targetPath, JSON.stringify({ directory: record.old.directory, clusterDirectory: record.old.directory, host: record.old.host, port: record.old.port, user: record.old.user,
    freshDatabase: `stoquify_replay_close_authority_20261109_${id}`, sourceManifestSha256: record.manifest.manifestSha256, purpose: 'hardened-close-release-candidate' }, null, 2) + '\n', { flag: 'wx' });
  const target = read(targetPath); for (const name of ['directory', 'clusterDirectory', 'host', 'port', 'user']) assert.equal(target[name], record.old[name]);
  assert.equal(target.purpose, 'hardened-close-release-candidate'); assert.equal(target.sourceManifestSha256, record.manifest.manifestSha256); assert.match(target.freshDatabase, /^stoquify_replay_close_authority_20261109_[a-f0-9]{10}$/);
  assert.notEqual(target.freshDatabase, 'stoquify_replay_close_authority_20261109_b028dd77cb');
  const url = `postgresql://${target.user}@localhost:${target.port}/${target.freshDatabase}?schema=public`, migrationSource = path.join(privateDir, 'migration-source'); fs.mkdirSync(migrationSource);
  const sourceFiles = record.provenance.files.map(entry => {
    const input = path.join(record.target.candidate, entry.path), output = path.join(migrationSource, entry.path), bytes = fs.readFileSync(input);
    assert.equal(hash(bytes), entry.sha256, `Review changed migration-helper/reference input: ${entry.path}`); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes, { flag: 'wx' }); return { path: entry.path, sha256: hash(bytes), bytes: bytes.length };
  });
  fs.mkdirSync(path.join(migrationSource, 'node_modules')); for (const name of ['prisma', 'pg', 'dotenv']) fs.symlinkSync(path.join(root, 'node_modules', name), path.join(migrationSource, 'node_modules', name), 'junction');
  assert(!fs.readdirSync(record.target.candidate).some(name => name.startsWith('.env'))); assert(!fs.readdirSync(migrationSource).some(name => name.startsWith('.env')));
  const helperTest = path.join(hardening, 'close-write-authority.postgres.test.ts'), serviceTest = path.join(__dirname, 'close-services.postgres.test.ts');
  const inputs = [__filename, serviceTest, helperTest].map(file => ({ path: file, sha256: digest(file) }));
  const helperProof = read(path.join(hardening, 'pg-LATEST.json')), helperSources = read(path.join(helperProof.evidenceDirectory, 'pg-SOURCE_MANIFEST.json'));
  assert(helperProof.passed && helperProof.ownedClusterStopped); const externalHelper = helperSources.files.find(file => path.join(root, file.path) === helperTest); assert(externalHelper); assert.equal(digest(helperTest), externalHelper.sha256);
  const authorityBindings = helperSources.files.filter(file => !file.path.startsWith('docs/')).map(file => { assert.equal(digest(path.join(record.target.candidate, file.path)), file.sha256, `Prior helper proof no longer binds candidate: ${file.path}`); return file; });
  write('pg-SOURCE_BINDING.json', { candidate: record.target.candidate, sourceManifestSha256: record.manifest.manifestSha256, candidateManifestFileSha256: digest(path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json')), migrationSource, files: sourceFiles, inputFiles: inputs,
    unchangedAuthorityBindings: authorityBindings, catalogSha256: record.provenance.catalogSha256, schemaSha256: record.schema.sha256, privateClient: record.orm.client, privateClientSchemaSha256: digest(path.join(record.orm.client, 'schema.prisma')),
    limitation: 'New frozen candidate application source; existing schema-bound private client and installed migration/Jest dependencies. New artifact dependency/build qualification remains separate.' });
  write('pg-DATABASE_TARGET.json', { ...target, migrationSource, privateDir, candidate: record.target.candidate });
  const adapter = path.join(privateDir, 'pg-db.cjs'); fs.writeFileSync(adapter, `const {PrismaClient}=require(${JSON.stringify(record.orm.client)});const u=new URL(process.env.CLOSE_WRITE_POSTGRES_URL||'');if(u.hostname!=='localhost'||u.port!==${JSON.stringify(String(target.port))}||u.pathname!==${JSON.stringify('/' + target.freshDatabase)}||u.searchParams.get('schema')!=='public')throw Error('Exact owned close release DB required');module.exports={db:new PrismaClient({datasources:{db:{url:u.toString()}},transactionOptions:{maxWait:10000,timeout:60000}})};\n`, { flag: 'wx' });
  const config = { rootDir: record.target.candidate, roots: [__dirname, hardening], testEnvironment: 'node', testMatch: ['**/close-write-authority.postgres.test.ts', '**/close-services.postgres.test.ts'], testTimeout: 120000, cache: false,
    moduleNameMapper: { '^@/prisma/db$': adapter, '^@prisma/client$': record.orm.client, '^@/(.*)$': record.target.candidate.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(record.target.candidate, 'scripts/server-only-node-shim.js') },
    moduleDirectories: [path.join(root, 'node_modules')], transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') } };
  const configPath = path.join(privateDir, 'pg-jest.config.cjs'); fs.writeFileSync(configPath, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' });
  write('pg-RUNTIME_BINDING.json', { configPath, configSha256: digest(configPath), adapter, adapterSha256: digest(adapter), inputs });
  const report = { began: new Date().toISOString(), passed: false, target, evidenceDirectory: evidence, privateDir, candidate: record.target.candidate, sourceManifestSha256: record.manifest.manifestSha256, checks: [], runnerSha256: digest(__filename),
    limitation: 'Real candidate service/helper tests; deliberately BLOCKED synthetic assessment and draft. No earned READY/T4/certificate, actual password/login/provider or browser claim.' };
  const execute = (label, executable, args, cwd = root, env = osEnv, extra = {}) => {
    console.log(`${label}: starting`); const began = Date.now(), result = spawnSync(executable, args, { cwd, env, windowsHide: true, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024, timeout: 600000, ...extra });
    fs.writeFileSync(path.join(evidence, label + '.log'), clean(result.stdout) + clean(result.stderr), { flag: 'wx' }); write(label + '.execution.json', { executable, args, cwd, began: new Date(began).toISOString(), ended: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null });
    console.log(`${label}: exit ${result.status}`); assert(!result.error && result.status === 0, `${label} failed; inspect retained evidence`);
  };
  let opened = false, failure;
  try {
    const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(target.directory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' }); assert.equal(status.status, 3, 'Owned cluster already in use'); opened = true;
    execute('pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(target.directory, 'data'), '-l', path.join(target.directory, 'postgres.log'), '-o', `-p ${target.port} -h 127.0.0.1`, '-w', 'start'], root, osEnv, { stdio: 'ignore' });
    const admin = new Client({ connectionString: `postgresql://${target.user}@localhost:${target.port}/postgres`, connectionTimeoutMillis: 5000 }); await admin.connect();
    try { write('pg-IDENTITY.json', await identity(admin, record, 'postgres')); assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [target.freshDatabase])).rowCount, 0, 'Refusing existing fresh target; archive failed target and select a new DB'); } finally { await admin.end(); }
    const env = { ...osEnv, NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first --require ' + JSON.stringify(path.join(record.target.candidate, 'scripts/local-gates-network.cjs')), DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url, CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', CLOSE_WRITE_POSTGRES_URL: url, CLOSE_WRITE_DATABASE_NAME: target.freshDatabase, CLOSE_WRITE_CLUSTER_DIRECTORY: target.directory };
    execute('pg-full-121-replay', process.execPath, [path.join(migrationSource, 'scripts/prisma-fresh-replay-runner.js'), '--root', migrationSource, '--database', target.freshDatabase, '--out', path.join(evidence, 'pg-fresh-certification.md'), '--json-out', path.join(evidence, 'pg-fresh-certification.json')], migrationSource, env);
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 }); await client.connect();
    let originalInventory;
    const inventory = async () => (await client.query("SELECT (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal) AS triggers,(SELECT count(*)::int FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace) AS checks,(SELECT count(*)::int FROM pg_proc WHERE pronamespace='public'::regnamespace) AS functions")).rows[0];
    try {
      await identity(client, record, target.freshDatabase); const rows = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(rows.length, 121); rows.forEach((row, index) => { assert.equal(row.migration_name, record.provenance.migrations[index].name); assert.equal(row.checksum, record.provenance.migrations[index].rawSha256); assert(row.finished_at && !row.rolled_back_at); }); write('pg-MIGRATION_HISTORY.json', { database: target.freshDatabase, rows }); originalInventory = await inventory();
      execute('pg-helper-tests', process.execPath, [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', configPath, '--runInBand', '--no-cache', '--runTestsByPath', helperTest, '--json', '--outputFile', path.join(evidence, 'pg-helper-tests.results.json')], record.target.candidate, { ...env, CLOSE_WRITE_PROBE_EVIDENCE: path.join(evidence, 'pg-helper-probes.json') });
      const helper = read(path.join(evidence, 'pg-helper-tests.results.json')); assert(helper.success && helper.numPassedTests === 40 && helper.numFailedTests === 0 && helper.numPendingTests === 0);
      execute('pg-close-services', process.execPath, [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', configPath, '--runInBand', '--no-cache', '--runTestsByPath', serviceTest, '--json', '--outputFile', path.join(evidence, 'pg-close-services.results.json')], record.target.candidate,
        { ...env, CLOSE_SERVICE_EVIDENCE: path.join(evidence, 'pg-close-services.json'), CLOSE_FIXTURE_PUBLIC: path.join(evidence, 'pg-FIXTURE_PUBLIC.json'), CLOSE_DRAFT_CAPTURE: path.join(privateDir, 'blocked-draft.json') });
      const services = read(path.join(evidence, 'pg-close-services.results.json')); assert(services.success && services.numPassedTests === 5 && services.numFailedTests === 0 && services.numPendingTests === 0);
      const finalInventory = await inventory(); assert.deepEqual(finalInventory, originalInventory, 'Fault injection left custom SQL installed'); write('pg-SQL_INVENTORY.json', { originalInventory, finalInventory, unchanged: true });
      report.checks.push({ name: 'Full candidate-bound121 replay and second deploy', migrations: 121, certification: read(path.join(evidence, 'pg-fresh-certification.json')).status });
      report.checks.push({ name: 'Candidate-bound real helper and SQL race proof', passed: helper.numPassedTests, skipped: 0 }); report.checks.push({ name: 'Actual candidate close service workflow, rollback and committed revocations', passed: services.numPassedTests, skipped: 0, fixture: 'pg-FIXTURE_PUBLIC.json' });
      fs.copyFileSync(path.join(evidence, 'pg-FIXTURE_PUBLIC.json'), path.join(__dirname, 'pg-FIXTURE_PUBLIC.json'), fs.constants.COPYFILE_EXCL);
    } finally { await client.end(); }
    require('./candidate-validation.cjs').verifyCandidate(); for (const entry of inputs) assert.equal(digest(entry.path), entry.sha256, 'Qualification input changed'); report.passed = true;
  } catch (error) { failure = error; report.failure = clean(error.message); }
  finally {
    if (opened) { try { execute('pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(target.directory, 'data'), '-m', 'fast', '-w', 'stop'], root, osEnv, { stdio: 'ignore' }); report.ownedClusterStopped = true; } catch (error) { failure ||= error; report.passed = false; report.cleanupFailure = clean(error.message); } }
    report.ended = new Date().toISOString(); write('pg-RESULT.json', report); fs.writeFileSync(path.join(__dirname, 'pg-LATEST.json'), JSON.stringify({ evidenceDirectory: evidence, ...report }, null, 2) + '\n');
  }
  if (failure) throw failure;
}
if (process.argv.length !== 3 || process.argv[2] !== 'run') throw Error('Expected reviewed run after candidate is frozen');
run().catch(error => { if (currentEvidence && !fs.existsSync(path.join(currentEvidence, 'pg-RESULT.json'))) fs.writeFileSync(path.join(currentEvidence, 'pg-RESULT.json'), JSON.stringify({ passed: false, phase: 'preparation-before-cluster-start', clusterStarted: false, failure: clean(error.message), runnerSha256: digest(__filename), utc: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' }); console.error(clean(error.message)); process.exitCode = 1; });
