// Reviewed isolated qualification only. New private source/client + absent DBs;
// no root generation, production providers, old DB reset/drop or ambient dotenv.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), prior = path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09'), bin = 'C:/Program Files/PostgreSQL/17/bin';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file)), read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv); require('node:dns').setDefaultResultOrder('ipv4first');
const { Client } = require(path.join(root, 'node_modules/pg'));
const scrub = value => String(value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_RETENTION_DATABASE]').replace(/rt_session_[a-f0-9]{64}/g, '[SYNTHETIC_SESSION_TOKEN]');
let attempt;
function noLinks(file) { let cursor = path.parse(path.resolve(file)).root; for (const part of path.resolve(file).slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); assert(!fs.lstatSync(cursor).isSymbolicLink(), 'Linked owned input refused'); } }
function closure(destination, entries) {
  const ts = require(path.join(root, 'node_modules/typescript')), pending = [...entries], seen = new Set(), files = [];
  while (pending.length) {
    const input = path.resolve(pending.pop()); if (seen.has(input)) continue; seen.add(input); assert(input.startsWith(root + path.sep)); noLinks(input);
    const relative = path.relative(root, input).replaceAll('\\', '/'); assert(!relative.split('/').some(part => part.startsWith('.env')));
    const bytes = fs.readFileSync(input), output = path.join(destination, relative); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes, { flag: 'wx' }); files.push({ path: relative, sha256: hash(bytes) });
    if (!/\.(?:ts|tsx|js|cjs|mjs)$/.test(input)) continue;
    const text = bytes.toString('utf8'), imports = ts.preProcessFile(text, true, true).importedFiles.map(item => item.fileName);
    for (const match of text.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)) imports.push(match[1]);
    for (const specifier of imports) {
      if (specifier === '@/prisma/db' || (!specifier.startsWith('@/') && !specifier.startsWith('.'))) continue;
      const base = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(input), specifier);
      const candidates = [base, ...['.ts', '.tsx', '.js', '.cjs', '.mjs', '.json'].map(suffix => base + suffix), ...['index.ts', 'index.tsx', 'index.js', 'index.cjs'].map(name => path.join(base, name))];
      if (base.endsWith('.js')) candidates.push(base.slice(0, -3) + '.ts');
      const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()); assert(resolved, `Unresolved frozen dependency: ${specifier}`); pending.push(resolved);
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
function load() {
  const target = read(path.join(prior, 'DATABASE_TARGET.json')), previous = read(path.join(prior, 'MIGRATION_SOURCE_PROVENANCE.json')), oldOrm = read(path.join(prior, 'ORM_PROVENANCE.json'));
  assert.equal(path.dirname(target.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(target.directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/); noLinks(target.directory);
  assert.equal(target.directory, target.clusterDirectory); assert.equal(target.host, 'localhost'); assert.equal(target.port, 58033); assert.equal(target.user, 'sales_release_fixture');
  assert.equal(previous.migrationCount, 121); assert.equal(target.migrationSource, previous.sourceRoot);
  for (const entry of previous.files) assert.equal(digest(path.join(previous.sourceRoot, entry.path)), entry.sha256, 'Historical migration context changed');
  for (const entry of previous.migrations) assert.equal(digest(path.join(root, entry.path)), entry.rawSha256, 'Historical SQL changed');
  const catalog = read(path.join(root, 'prisma/migration-catalog-manifest.json')); assert.equal(catalog.migrationCount, 122); assert.equal(catalog.migrations.length, 122);
  const migrationNames = fs.readdirSync(path.join(root, 'prisma/migrations')).filter(name => fs.existsSync(path.join(root, 'prisma/migrations', name, 'migration.sql'))).sort();
  assert.deepEqual(catalog.migrations.map(entry => entry.name), migrationNames); catalog.migrations.forEach(entry => assert.equal(digest(path.join(root, entry.path)), entry.rawSha256));
  assert.equal(catalog.migrations.at(-1).name, '20261109190000_close_pack_canonical_retention'); assert.equal(catalog.migrations.at(-1).rawSha256, '61e5ff2bfd3209906d92ca36b923d5125242db76c8cae5d4bc1269897f76e6d8');
  assert.equal(oldOrm.client, path.join(target.directory, 'orm/client')); assert.equal(read(path.join(oldOrm.client, 'package.json')).version, '6.19.3');
  return { target, previous, oldOrm, catalog };
}
async function identity(client, target, name) {
  const row = (await client.query("SELECT current_database() AS name,current_user AS actor,host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('data_directory') AS directory,current_setting('server_version_num') AS version")).rows[0];
  assert.equal(row.name, name); assert.equal(row.actor, target.user); assert.equal(row.host, '127.0.0.1'); assert.equal(row.port, target.port); assert(Number(row.version) >= 170000 && Number(row.version) < 180000);
  assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(target.directory, 'data')).toLowerCase()); return row;
}
async function main() {
  const record = load(), id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', 'close-retention-20261109-' + id), evidence = path.join(__dirname, 'pg-retention-' + id);
  fs.mkdirSync(directory); fs.mkdirSync(evidence); attempt = evidence;
  const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const source = path.join(directory, 'source'), migrations = path.join(directory, 'migration-source122'); for (const item of [source, migrations]) fs.mkdirSync(item);
  const freshDatabase = 'stoquify_replay_retention_fresh_20261109_' + id, upgradeDatabase = 'stoquify_replay_retention_upgrade_20261109_' + id;
  const report = { began: new Date().toISOString(), passed: false, directory, evidenceDirectory: evidence, freshDatabase, upgradeDatabase, source, migrations, privateClient: null, runnerSha256: digest(__filename), checks: [], limitation: 'Real isolated retention migration/service proof; synthetic DRAFT/BLOCKED receipts only, no earned certificate, live provider, browser, production or clean-install claim.' };
  const execute = (label, executable, args, cwd, env, extra = {}) => {
    console.log(label + ': starting'); const began = Date.now(), result = spawnSync(executable, args, { cwd, env, windowsHide: true, encoding: 'utf8', maxBuffer: 40e6, timeout: 600000, ...extra });
    fs.writeFileSync(path.join(evidence, label + '.log'), scrub(result.stdout) + scrub(result.stderr), { flag: 'wx' }); write(label + '.execution.json', { executable, args, cwd, began: new Date(began).toISOString(), ended: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null });
    console.log(label + ': exit ' + result.status); assert(!result.error && result.status === 0, label + ' failed; retained evidence available');
  };
  let started = false, failure;
  try {
    const migrationPaths = [...new Set([...record.previous.files.map(entry => entry.path), record.catalog.migrations.at(-1).path])].sort(), migrationFiles = [];
    for (const relative of migrationPaths) { const input = path.join(root, relative), output = path.join(migrations, relative); noLinks(input); const bytes = fs.readFileSync(input); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes, { flag: 'wx' }); migrationFiles.push({ path: relative, sha256: hash(bytes) }); }
    fs.mkdirSync(path.join(migrations, 'node_modules')); for (const name of ['prisma', 'pg', 'dotenv', '@prisma']) fs.symlinkSync(path.join(root, 'node_modules', name), path.join(migrations, 'node_modules', name), 'junction');
    assert(!fs.readdirSync(migrations).some(name => name.startsWith('.env')));
    const test = path.join(__dirname, 'close-pack-retention.postgres.test.ts'), relativeTest = path.relative(root, test), files = closure(source, [test, path.join(root, 'scripts/server-only-node-shim.js'), path.join(root, 'scripts/local-gates-network.cjs')]);
    write('pg-SOURCE_MANIFEST.json', { createdAt: new Date().toISOString(), root, source, sourceSha256: hash(JSON.stringify(files)), files, migrationFiles, catalogSha256: record.catalog.catalogSha256, migrationCount: 122, catalogFileSha256: digest(path.join(migrations, 'prisma/migration-catalog-manifest.json')), schemaSha256: digest(path.join(migrations, 'prisma/schema.prisma')), harnessSha256: digest(__filename), testSha256: digest(test) });
    write('pg-TARGET.json', { ...record.target, privateDirectory: directory, source, migrations, freshDatabase, upgradeDatabase, purpose: 'new-owned-close-canonical-retention-122' });
    const url = name => `postgresql://${record.target.user}@localhost:${record.target.port}/${name}?schema=public`;
    const envFor = name => ({ ...osEnv, NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first --require ' + JSON.stringify(path.join(source, 'scripts/local-gates-network.cjs')), DATABASE_URL: url(name), DIRECT_URL: url(name), SHADOW_DATABASE_URL: url(name), CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' });
    const selectionFile = path.join(__dirname, 'pg-PRIVATE_CLIENT.json'), selection = read(selectionFile), clientPath = selection.client, selectionSha256 = digest(selectionFile);
    assert(selection.passed && selection.sharedClientUnchanged && selection.rootGeneration === false && selection.databaseOrApplicationStarted === false);
    assert.equal(path.dirname(selection.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(selection.directory), /^close-retention-client-20261109-[a-f0-9]{10}$/); assert.equal(clientPath, path.join(selection.directory, 'orm/client')); noLinks(clientPath);
    const original = fs.readFileSync(path.join(migrations, 'prisma/schema.prisma'), 'utf8'), generator = original.match(/generator client\s*\{[^}]*\}/); assert(generator && !/\boutput\s*=/.test(generator[0]));
    const privateSchema = original.replace(generator[0], generator[0].replace('{', '{\n  output = "./client"'));
    assert.equal(hash(original), selection.sourceSchemaSha256); assert.equal(hash(privateSchema), selection.privateSchemaSha256); assert.equal(digest(path.join(selection.directory, 'orm/schema.prisma')), selection.privateSchemaSha256);
    assert.equal(digest(path.join(clientPath, 'schema.prisma')), selection.clientSchemaSha256); assert.equal(digest(path.join(clientPath, 'index.js')), selection.clientIndexSha256); assert.equal(read(path.join(clientPath, 'package.json')).version, '6.19.3');
    const tokenHelper = path.join(root, 'scripts/ensure-prisma-client.js'), tokens = require(tokenHelper).schemaTokens; assert.equal(digest(tokenHelper), selection.schemaTokenHelperSha256); assert.equal(tokens(privateSchema), tokens(fs.readFileSync(path.join(clientPath, 'schema.prisma'), 'utf8'))); assert.equal(hash(tokens(privateSchema)), selection.schemaTokensSha256);
    const nativeProof = read(path.join(prior, 'CANDIDATE_NATIVE_READINESS.json')); assert(nativeProof.passed); assert.equal(digest(path.join(clientPath, 'query_engine-windows.dll.node')), nativeProof.cachedEngineInputs.find(item => item.destination.endsWith('query_engine-windows.dll.node')).sha256);
    const clientFiles = []; function clientInventory(relative = '') { for (const entry of fs.readdirSync(path.join(clientPath, relative), { withFileTypes: true })) { assert(!entry.isSymbolicLink()); const name = relative ? relative + '/' + entry.name : entry.name; if (entry.isDirectory()) clientInventory(name); else { assert(entry.isFile()); clientFiles.push({ path: name, sha256: digest(path.join(clientPath, name)) }); } } } clientInventory();
    write('pg-ORM_PROVENANCE.json', { sourceSchemaSha256: hash(original), privateSchemaSha256: hash(privateSchema), clientSchemaSha256: selection.clientSchemaSha256, schemaTokensSha256: selection.schemaTokensSha256, schemaTokenHelperSha256: selection.schemaTokenHelperSha256, client: clientPath, clientFiles, selectionFile, selectionSha256, normalization: selection.normalization, reusedPrivateGeneration: true, rootGeneration: false }); report.privateClient = clientPath;
    const adapter = path.join(directory, 'pg-db.cjs'); fs.writeFileSync(adapter, `const {PrismaClient}=require(${JSON.stringify(clientPath)});const u=new URL(process.env.RETENTION_POSTGRES_URL||'');if(u.hostname!=='localhost'||u.port!==${JSON.stringify(String(record.target.port))}||u.pathname!==${JSON.stringify('/' + upgradeDatabase)}||u.searchParams.get('schema')!=='public')throw Error('Exact owned retention target required');module.exports={db:new PrismaClient({datasources:{db:{url:u.toString()}},transactionOptions:{maxWait:10000,timeout:60000}})};\n`, { flag: 'wx' });
    const configPath = path.join(directory, 'pg-jest.config.cjs'), config = { rootDir: source, roots: [path.dirname(path.join(source, relativeTest))], testEnvironment: 'node', testMatch: ['**/close-pack-retention.postgres.test.ts'], testTimeout: 120000, cache: false, moduleNameMapper: { '^@/prisma/db$': adapter, '^@prisma/client$': clientPath, '^@/(.*)$': source.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(source, 'scripts/server-only-node-shim.js') }, moduleDirectories: [path.join(root, 'node_modules')], transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') } };
    fs.writeFileSync(configPath, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' }); write('pg-RUNTIME_BINDING.json', { configPath, configSha256: digest(configPath), adapter, adapterSha256: digest(adapter), testSha256: digest(test) });
    assert.equal(spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.target.directory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' }).status, 3, 'Shared owned cluster already in use'); started = true;
    execute('pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.target.directory, 'data'), '-l', path.join(record.target.directory, 'postgres.log'), '-o', `-p ${record.target.port} -h 127.0.0.1`, '-w', 'start'], directory, osEnv, { stdio: 'ignore' });
    const admin = new Client({ connectionString: url('postgres'), connectionTimeoutMillis: 5000 }); await admin.connect();
    try { write('pg-IDENTITY.json', await identity(admin, record.target, 'postgres')); for (const name of [freshDatabase, upgradeDatabase]) assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount, 0, 'Refusing an existing target'); } finally { await admin.end(); }
    for (const [label, context, name] of [['pg-fresh122', migrations, freshDatabase], ['pg-upgrade121', record.previous.sourceRoot, upgradeDatabase]]) execute(label, process.execPath, [path.join(context, 'scripts/prisma-fresh-replay-runner.js'), '--root', context, '--database', name, '--out', path.join(evidence, label + '.md'), '--json-out', path.join(evidence, label + '.json')], context, envFor(name));
    const freshProof = read(path.join(evidence, 'pg-fresh122.json')); assert(freshProof.ready && freshProof.history.ready && freshProof.history.appliedCount === 122);
    const fresh = new Client({ connectionString: url(freshDatabase), connectionTimeoutMillis: 5000 }); await fresh.connect();
    try { write('pg-FRESH_IDENTITY.json', await identity(fresh, record.target, freshDatabase)); const rows = (await fresh.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows; assert.equal(rows.length, 122); rows.forEach((row, index) => { assert.equal(row.migration_name, record.catalog.migrations[index].name); assert.equal(row.checksum, record.catalog.migrations[index].rawSha256); assert(row.finished_at && !row.rolled_back_at); }); write('pg-FRESH_HISTORY.json', { database: freshDatabase, rows }); } finally { await fresh.end(); }
    const oldClient = new (require(record.oldOrm.client).PrismaClient)({ datasources: { db: { url: url(upgradeDatabase) } } });
    let legacy;
    try {
      const organizationId = 'rt-legacy-' + id, year = await oldClient.organization.create({ data: { id: organizationId, name: 'Synthetic pre122 historical receipt', slug: organizationId, countryCode: 'CM', currency: 'XAF' } });
      const fiscal = await oldClient.fiscalYear.create({ data: { organizationId: year.id, name: 'Synthetic FY2026', startDate: new Date('2026-01-01Z'), endDate: new Date('2026-12-31T23:59:59.999Z') } });
      const period = await oldClient.accountingPeriod.create({ data: { organizationId, fiscalYearId: fiscal.id, name: 'Synthetic October', periodNumber: 10, startDate: new Date('2026-10-01Z'), endDate: new Date('2026-10-31T23:59:59.999Z') } });
      const run = await oldClient.closeRun.create({ data: { organizationId, periodId: period.id, status: 'DRAFT', summary: { syntheticLegacyUnassessed: true } } });
      const receipt = await oldClient.closePackExport.create({ data: { organizationId, periodId: period.id, closeRunId: run.id, watermarkId: 'legacy-' + id, contentHash: 'sha256:' + hash('legacy-' + id), isCertified: false, correlationId: 'legacy-' + id, metadata: { syntheticHistoricalReceipt: true } } });
      legacy = { organizationId, periodId: period.id, closeRunId: run.id, exportId: receipt.id }; write('pg-LEGACY_FIXTURE.json', legacy);
    } finally { await oldClient.$disconnect(); }
    const sql = new Client({ connectionString: url(upgradeDatabase), connectionTimeoutMillis: 5000 }); await sql.connect();
    try {
      await identity(sql, record.target, upgradeDatabase);
      const before = (await sql.query('SELECT row_to_json(t) AS row FROM close_pack_exports t WHERE id=$1', [legacy.exportId])).rows[0].row, beforeHistory = (await sql.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows; assert.equal(beforeHistory.length, 121);
      write('pg-UPGRADE_BEFORE.json', { legacyReceipt: before, history: beforeHistory });
      for (let n = 1; n <= 2; n++) execute('pg-upgrade122-deploy-' + n, process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], migrations, envFor(upgradeDatabase));
      const after = (await sql.query('SELECT row_to_json(t) AS row FROM close_pack_exports t WHERE id=$1', [legacy.exportId])).rows[0].row;
      for (const key of ['canonicalContent', 'canonicalContentSha256', 'exportRequestHash']) { assert.equal(after[key], null); delete after[key]; } assert.deepEqual(after, before, 'Legacy receipt changed during upgrade');
      const afterHistory = (await sql.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows; assert.equal(afterHistory.length, 122); assert.deepEqual(afterHistory.slice(0, 121), beforeHistory);
      afterHistory.forEach((row, index) => { assert.equal(row.migration_name, record.catalog.migrations[index].name); assert.equal(row.checksum, record.catalog.migrations[index].rawSha256); assert(row.finished_at && !row.rolled_back_at); });
      write('pg-UPGRADE_AFTER.json', { originalReceiptUnchanged: true, newColumnsNull: true, original121HistoryRowsUnchanged: true, history: afterHistory });
      const inventory = async () => (await sql.query("SELECT (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal) AS triggers,(SELECT count(*)::int FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace) AS checks,(SELECT count(*)::int FROM pg_proc WHERE pronamespace='public'::regnamespace) AS functions")).rows[0], beforeInventory = await inventory();
      assert.deepEqual(beforeInventory, { triggers: 142, checks: 231, functions: 76 });
      const columns = (await sql.query("SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='close_pack_exports' AND column_name IN ('canonicalContent','canonicalContentSha256','exportRequestHash') ORDER BY column_name")).rows;
      assert.deepEqual(columns, ['canonicalContent', 'canonicalContentSha256', 'exportRequestHash'].map(column_name => ({ column_name, data_type: 'text', is_nullable: 'YES' })));
      const trigger = (await sql.query("SELECT tgname,tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgname='close_pack_exports_retain_canonical_trigger'")).rows;
      assert.equal(trigger.length, 1); assert.equal(trigger[0].tgenabled, 'O'); assert.match(trigger[0].definition, /ON public.close_pack_exports/); assert.match(trigger[0].definition, /close_pack_exports_retain_canonical\(\)/);
      const constraint = (await sql.query("SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='close_pack_exports_canonical_retention_shape'")).rows; assert.equal(constraint.length, 1); assert.match(constraint[0].definition, /sha256/);
      write('pg-RETENTION_SQL.json', { columns, trigger, constraint, beforeInventory });
      execute('pg-retention-services', process.execPath, [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', configPath, '--runInBand', '--no-cache', '--runTestsByPath', path.join(source, relativeTest), '--json', '--outputFile', path.join(evidence, 'pg-retention-tests.results.json')], source,
        { ...envFor(upgradeDatabase), RETENTION_POSTGRES_URL: url(upgradeDatabase), RETENTION_DATABASE_NAME: upgradeDatabase, RETENTION_LEGACY_FIXTURE: path.join(evidence, 'pg-LEGACY_FIXTURE.json'), RETENTION_SERVICE_EVIDENCE: path.join(evidence, 'pg-retention-service-evidence.json') });
      const tests = read(path.join(evidence, 'pg-retention-tests.results.json')); assert(tests.success && tests.numPassedTests === 23 && tests.numFailedTests === 0 && tests.numPendingTests === 0); assert.deepEqual(await inventory(), beforeInventory);
      const service = read(path.join(evidence, 'pg-retention-service-evidence.json')); assert(Object.values(service.finance).every(value => value === 0));
      report.checks.push({ name: 'fresh122ReplayTwice', certification: read(path.join(evidence, 'pg-fresh122.json')).status }, { name: 'populated121to122', legacyReceiptAndHistoryPreserved: true, deploymentReplayed: true }, { name: 'realRetentionServicesAndSql', tests: tests.numPassedTests, skipped: 0, sqlInventoryUnchanged: true, noFinanceOrCertifiedExports: service.finance });
    } finally { await sql.end(); }
    for (const entry of files) { assert.equal(digest(path.join(source, entry.path)), entry.sha256); assert.equal(digest(path.join(root, entry.path)), entry.sha256, 'Tested source changed'); }
    for (const entry of migrationFiles) { assert.equal(digest(path.join(migrations, entry.path)), entry.sha256); assert.equal(digest(path.join(root, entry.path)), entry.sha256, 'Migration input changed'); }
    for (const entry of clientFiles) assert.equal(digest(path.join(clientPath, entry.path)), entry.sha256, 'Private client changed during tests'); assert.equal(digest(selectionFile), selectionSha256, 'Selected client receipt changed');
    assert.equal(digest(__filename), report.runnerSha256); report.passed = true;
  } catch (error) { failure = error; report.failure = scrub(error.message); }
  finally {
    if (started) { try { execute('pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.target.directory, 'data'), '-m', 'fast', '-w', 'stop'], directory, osEnv, { stdio: 'ignore' }); report.ownedClusterStopped = true; } catch (error) { report.passed = false; report.cleanupFailure = scrub(error.message); failure ||= error; } }
    report.ended = new Date().toISOString(); write('pg-RESULT.json', report); fs.writeFileSync(path.join(__dirname, 'pg-RETENTION_LATEST.json'), JSON.stringify(report, null, 2) + '\n');
  }
  if (failure) throw failure;
}
if (require.main === module) { if (process.argv.length !== 3 || process.argv[2] !== 'run') throw Error('Expected reviewed run; no target overrides'); main().catch(error => { if (attempt && !fs.existsSync(path.join(attempt, 'pg-RESULT.json'))) fs.writeFileSync(path.join(attempt, 'pg-PREPARATION_FAILURE.json'), JSON.stringify({ passed: false, failure: scrub(error.message), runnerSha256: digest(__filename) }, null, 2) + '\n', { flag: 'wx' }); console.error(scrub(error.message)); process.exitCode = 1; }); }
