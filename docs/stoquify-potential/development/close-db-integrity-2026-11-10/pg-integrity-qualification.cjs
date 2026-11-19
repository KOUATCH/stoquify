// Reviewed isolated structural-integrity qualification. No root generation,
// application/provider access, reset/drop, production target or ambient .env.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), base = path.join(root, 'docs/stoquify-potential/development/close-production-prep-2026-11-09');
const bin = 'C:/Program Files/PostgreSQL/17/bin', migrationName = '20261110190000_close_scope_integrity';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file)), read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv); require('node:dns').setDefaultResultOrder('ipv4first');
const { Client } = require(path.join(root, 'node_modules/pg'));
const scrub = value => String(value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_INTEGRITY_DATABASE]').replace(/(?:(?:rt|ca03|earned|monthly|ownership|integrity)_session_|earned_stale_)[a-f0-9]{64}/g, '[SYNTHETIC_SESSION_TOKEN]');
const monthlyPhases = ['actual-approved-opening-and-replay', 'actual-collections-and-provider-links', 'electronic-claim-denials-no-effects', 'actual-concurrent-claim-exclusion', 'assessment-before-provider-and-schedule-evidence', 'actual-monthly-import-independent-signatures', 'actual-bank-bs-approval-certification-and-seal', 'actual-closed-period-denial-and-retained-recovery'];
const integrityPhases = ['metadata-contract-preserved', 'nullable-and-aligned-links', 'cross-scope-inserts-rejected', 'optional-link-updates-rejected', 'core-identities-immutable', 'parent-scope-drift-rejected', 'ordinary-workflow-updates-allowed', 'checklist-and-finding-delete-null-links', 'evidence-and-review-delete-null-links', 'nonretained-cascades-preserved', 'retained-custody-preserved', 'concurrent-parent-delete-reference-rejected'];
const monthlyCounts = { journals: 4, customerSettlements: 3, claimedProviderTransactions: 2, signedReconciliationRuns: 2, approvedBankBalanceEvidence: 1, certifiedExports: 1, periodCloseEvents: 1, periodReopenEvents: 0, providerAccounts: 2, activeOpeningExecutions: 1, openingReceivables: 1, sales: 0, payrollRuns: 0, statutoryCertifiedDocuments: 0 };
const beforeInventory = { triggers: 142, checks: 231, functions: 76 }, afterInventory = { triggers: 149, checks: 231, functions: 77 };
function noLinks(file) { let cursor = path.parse(path.resolve(file)).root; for (const part of path.resolve(file).slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); assert(!fs.lstatSync(cursor).isSymbolicLink(), 'Linked owned path refused'); } }
function copy(file, destination) { noLinks(file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, fs.readFileSync(file), { flag: 'wx' }); }
function closure(destination, entries) {
  const ts = require(path.join(root, 'node_modules/typescript')), pending = [...entries], seen = new Set(), files = [];
  while (pending.length) {
    const file = path.resolve(pending.pop()); if (seen.has(file)) continue; seen.add(file); assert(file.startsWith(root + path.sep)); noLinks(file);
    const relative = path.relative(root, file).replaceAll('\\', '/'); assert(!relative.split('/').some(part => /^\.env(?:\.|$)/i.test(part)));
    const bytes = fs.readFileSync(file); copy(file, path.join(destination, relative)); files.push({ path: relative, sha256: hash(bytes), bytes: bytes.length });
    if (!/\.(?:ts|tsx|js|cjs|mjs)$/.test(file)) continue;
    const source = bytes.toString('utf8'), imports = ts.preProcessFile(source, true, true).importedFiles.map(item => item.fileName);
    for (const match of source.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)) imports.push(match[1]);
    for (const specifier of imports) {
      if (specifier === '@/prisma/db' || (!specifier.startsWith('@/') && !specifier.startsWith('.'))) continue;
      const candidate = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
      const choices = [candidate, ...['.ts', '.tsx', '.js', '.cjs', '.mjs', '.json'].map(suffix => candidate + suffix), ...['index.ts', 'index.tsx', 'index.js', 'index.cjs'].map(name => path.join(candidate, name))];
      if (candidate.endsWith('.js')) choices.push(candidate.slice(0, -3) + '.ts');
      const resolved = choices.find(item => fs.existsSync(item) && fs.statSync(item).isFile()); assert(resolved, 'Unresolved frozen import: ' + specifier); pending.push(resolved);
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
function freezeMigrationContext(directory, catalog) {
  const relatives = ['prisma.config.ts', 'package.json', 'package-lock.json', 'prisma/schema.prisma', 'prisma/migration-catalog-manifest.json', 'prisma/migration-catalog-exceptions.json', 'prisma/migrations/migration_lock.toml', 'scripts/prisma-fresh-replay-runner.js', 'scripts/prisma-local-fresh-bootstrap.js', 'scripts/prisma-fresh-replay-certification.js', 'scripts/local-gates-network.cjs', ...catalog.migrations.map(item => item.path)];
  const files = relatives.map(relative => { copy(path.join(root, relative), path.join(directory, relative)); return { path: relative, sha256: digest(path.join(root, relative)) }; });
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'junction'); assert.equal(fs.realpathSync(path.join(directory, 'node_modules')), fs.realpathSync(path.join(root, 'node_modules')));
  assert(!fs.existsSync(path.join(directory, '.env')) && !fs.existsSync(path.join(directory, 'prisma/.env'))); return files;
}
async function identity(client, target, name) {
  const row = (await client.query("SELECT current_database() AS name,current_user AS actor,host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('data_directory') AS directory,current_setting('server_version_num') AS version")).rows[0];
  assert.equal(row.name, name); assert.equal(row.actor, target.user); assert.equal(row.host, '127.0.0.1'); assert.equal(row.port, target.port); assert(Number(row.version) >= 170000 && Number(row.version) < 180000);
  assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(target.directory, 'data')).toLowerCase()); return row;
}
const inventory = async client => (await client.query("SELECT (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal) AS triggers,(SELECT count(*)::int FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace) AS checks,(SELECT count(*)::int FROM pg_proc WHERE pronamespace='public'::regnamespace) AS functions")).rows[0];
const history = async client => (await client.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
function assertHistory(rows, catalog) { assert.equal(rows.length, catalog.migrationCount); rows.forEach((row, index) => { assert.equal(row.migration_name, catalog.migrations[index].name); assert.equal(row.checksum, catalog.migrations[index].rawSha256); assert(row.finished_at && !row.rolled_back_at); }); }
async function ddlFingerprint(client) {
  const queries = [
    ['tables', "SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','S') ORDER BY c.relname"],
    ['columns', "SELECT table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position"],
    ['constraints', "SELECT c.conname,t.relname,c.contype,c.convalidated,pg_get_constraintdef(c.oid,true) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE c.connamespace='public'::regnamespace ORDER BY t.relname,c.conname"],
    ['indexes', "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname"],
    ['triggers', "SELECT t.tgname,c.relname,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname='public' ORDER BY c.relname,t.tgname"],
    ['functions', "SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition FROM pg_proc p WHERE p.pronamespace='public'::regnamespace ORDER BY p.proname,arguments"],
  ]; const rows = {}; for (const [name, sql] of queries) rows[name] = (await client.query(sql)).rows; return { sha256: hash(JSON.stringify(rows)), rows };
}
async function main() {
  assert.deepEqual(process.argv.slice(2), ['run']);
  const target = read(path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09/DATABASE_TARGET.json'));
  assert.equal(path.dirname(target.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(target.directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/); noLinks(target.directory);
  assert.equal(target.clusterDirectory, target.directory); assert.equal(target.host, 'localhost'); assert.equal(target.port, 58033); assert.equal(target.user, 'sales_release_fixture');
  const id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', 'close-db-integrity-20261110-' + id), evidence = path.join(__dirname, 'pg-attempt-' + id), source = path.join(directory, 'source'), migrationContext = path.join(directory, 'migration-source123');
  fs.mkdirSync(directory); fs.mkdirSync(evidence); fs.mkdirSync(source); fs.mkdirSync(migrationContext);
  const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const privateWrite = (name, value) => { const file = path.join(directory, name); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); return { path: file, sha256: digest(file), bytes: fs.statSync(file).size }; };
  const names = { fresh: 'stoquify_replay_close_monthly_20261110_' + id, clean: 'stoquify_replay_close_integrity_upgrade_20261110_' + id, dirty: 'stoquify_replay_close_integrity_corrupt_20261110_' + id };
  const report = { began: new Date().toISOString(), passed: false, directory, evidenceDirectory: evidence, source, migrations: migrationContext, databases: names, runnerSha256: digest(__filename), checks: [],
    limitation: 'Local PostgreSQL migration/scope qualification with synthetic DRAFT/authority/provider inputs and earned internal monthly regression. No production-size locking benchmark, provider authenticity, statutory, hosted recovery, delivery, browser or deployment claim.' };
  let started = false, postmasterId, failure;
  const execute = (label, executable, args, cwd, env, expectFailure = false, extra = {}) => {
    console.log(label + ': starting'); const began = new Date().toISOString();
    const result = spawnSync(executable, args, { cwd, env, windowsHide: true, encoding: 'utf8', maxBuffer: 50e6, timeout: 600000, ...extra });
    const outputs = [];
    for (const stream of ['stdout', 'stderr']) { const file = path.join(directory, label + '.' + stream + '.private.log'); fs.writeFileSync(file, result[stream] || '', { flag: 'wx' }); outputs.push({ stream, path: file, sha256: digest(file), bytes: fs.statSync(file).size }); }
    const execution = { executable, args, cwd, began, ended: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null, expectedFailure: expectFailure, privateOutputs: outputs };
    write(label + '.execution.json', execution); console.log(label + ': exit ' + result.status);
    assert(!result.error && (expectFailure ? typeof result.status === 'number' && result.status !== 0 : result.status === 0), label + ' did not meet its reviewed exit contract'); return result;
  };
  try {
    const retentionFile = path.join(base, 'pg-RETENTION_LATEST.json'), retention = read(retentionFile); assert(retention.passed && retention.ownedClusterStopped);
    const retainedManifestFile = path.join(retention.evidenceDirectory, 'pg-SOURCE_MANIFEST.json'), retainedManifest = read(retainedManifestFile), oldContext = retention.migrations, oldCatalog = read(path.join(oldContext, 'prisma/migration-catalog-manifest.json'));
    assert.equal(oldCatalog.migrationCount, 122); for (const file of retainedManifest.migrationFiles) assert.equal(digest(path.join(oldContext, file.path)), file.sha256, 'Qualified122 migration context changed');
    const oldClientReceiptFile = path.join(base, 'pg-PRIVATE_CLIENT.json'), oldClientReceipt = read(oldClientReceiptFile), oldOrm = read(path.join(retention.evidenceDirectory, 'pg-ORM_PROVENANCE.json'));
    assert(oldClientReceipt.passed && oldClientReceipt.rootGeneration === false); assert.equal(oldClientReceipt.client, retention.privateClient); assert.equal(oldOrm.client, oldClientReceipt.client); noLinks(oldClientReceipt.client);
    for (const file of oldOrm.clientFiles) assert.equal(digest(path.join(oldClientReceipt.client, file.path)), file.sha256, 'Qualified122 writer client changed');
    assert(!fs.existsSync(path.join(oldContext, '.env')) && !fs.existsSync(path.join(oldContext, 'prisma/.env')));
    const catalog = read(path.join(root, 'prisma/migration-catalog-manifest.json')); assert.equal(catalog.migrationCount, 123); assert.equal(catalog.migrations[122].name, migrationName); assert.deepEqual(catalog.migrations.slice(0, 122), oldCatalog.migrations);
    for (const entry of catalog.migrations) assert.equal(digest(path.join(root, entry.path)), entry.rawSha256, 'Current SQL/catalog mismatch');
    const clientReceiptFile = path.join(__dirname, 'pg-PRIVATE_CLIENT.json'), clientReceipt = read(clientReceiptFile); assert(clientReceipt.passed && clientReceipt.rootGeneration === false && clientReceipt.sharedClientUnchanged);
    assert.equal(path.dirname(clientReceipt.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(clientReceipt.directory), /^close-integrity-client-20261110-[a-f0-9]{10}$/); assert.equal(clientReceipt.client, path.join(clientReceipt.directory, 'orm/client')); noLinks(clientReceipt.client);
    assert.equal(digest(path.join(root, 'prisma/schema.prisma')), clientReceipt.sourceSchemaSha256); for (const file of clientReceipt.clientFiles) { assert.equal(digest(path.join(clientReceipt.client, file.path)), file.sha256); assert.equal(fs.statSync(path.join(clientReceipt.client, file.path)).size, file.bytes); }
    const executionReceiptFile = path.join(__dirname, 'pg-EXECUTION_CLIENTS.json'), executionClients = read(executionReceiptFile);
    assert(executionClients.passed && executionClients.originalsUnchanged && executionClients.canaryRemoved); assert.equal(path.dirname(executionClients.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(executionClients.directory), /^close-integrity-execution-clients-20261110-[a-f0-9]{10}$/); noLinks(executionClients.directory);
    assert.equal(executionClients.clients.current.originalClient, clientReceipt.client); assert.equal(executionClients.clients.old.originalClient, oldClientReceipt.client);
    const verifyExecutionClients = () => {
      for (const entry of Object.values(executionClients.clients)) {
        noLinks(entry.client); for (const file of entry.files) { assert.equal(digest(path.join(entry.client, file.path)), file.sha256); assert.equal(digest(path.join(entry.originalClient, file.path)), file.sha256); }
        const sourceText = fs.readFileSync(path.join(entry.client, 'index.js'), 'utf8'), match = sourceText.match(/"relativeEnvPaths"\s*:\s*(\{[^}]*\})/); assert(match);
        for (const value of Object.values(JSON.parse(match[1]))) if (value) { const resolved = path.resolve(entry.client, value); assert(resolved.startsWith(executionClients.directory + path.sep)); assert(!fs.existsSync(resolved), 'Owned execution environment file unexpectedly exists'); }
      }
    }; verifyExecutionClients();
    const runtimeClient = executionClients.clients.current.client, oldRuntimeClient = executionClients.clients.old.client;
    const migrationFiles = freezeMigrationContext(migrationContext, catalog);
    const caseFiles = [path.join(root, 'docs/stoquify-potential/development/close-monthly-qualification-2026-11-10/mixed-month.postgres.test.ts'), path.join(__dirname, 'scope-integrity.postgres.test.ts')], helperFile = path.join(__dirname, 'scope-fixtures.cjs');
    const relatives = caseFiles.map(file => path.relative(root, file)), files = closure(source, [...caseFiles, helperFile, path.join(root, 'scripts/server-only-node-shim.js'), path.join(root, 'scripts/local-gates-network.cjs')]);
    write('pg-SOURCE_MANIFEST.json', { root, source, files, sourceSha256: hash(JSON.stringify(files)), migrationFiles, schemaSha256: clientReceipt.sourceSchemaSha256, catalogSha256: catalog.catalogSha256, catalogFileSha256: digest(path.join(root, 'prisma/migration-catalog-manifest.json')), runnerSha256: report.runnerSha256,
      retentionBinding: { path: retentionFile, sha256: digest(retentionFile), sourceManifest: retainedManifestFile, sourceManifestSha256: digest(retainedManifestFile), oldContext }, privateClientReceipt: { path: clientReceiptFile, sha256: digest(clientReceiptFile) }, privateClient: runtimeClient, originalGeneratedClient: clientReceipt.client, privateClientFiles: clientReceipt.clientFiles, executionClientReceipt: { path: executionReceiptFile, sha256: digest(executionReceiptFile) } });
    write('pg-OLD_WRITER_BINDING.json', { receipt: { path: oldClientReceiptFile, sha256: digest(oldClientReceiptFile) }, client: oldRuntimeClient, originalGeneratedClient: oldClientReceipt.client, clientFiles: oldOrm.clientFiles, generationRepeated: false, executionClientReceipt: { path: executionReceiptFile, sha256: digest(executionReceiptFile) }, constructorEnvironmentPathsDisabled: true, scope: 'Old122 generated client writes valid scalar DRAFT rows and legacyNULL export against clean upgraded123 database; cross-period write must fail.' });
    write('pg-TARGETS.json', { ...target, databases: names, privateDirectory: directory, source, migrationContext, purpose: 'new-owned-123-fresh-clean-upgrade-and-dirty-rejection' });
    report.catalogSha256 = catalog.catalogSha256; report.privateClient = runtimeClient; report.executionClientReceiptSha256 = digest(executionReceiptFile);
    const url = name => `postgresql://${target.user}@localhost:${target.port}/${name}?schema=public`;
    const baseEnv = { ...osEnv, NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first --require ' + JSON.stringify(path.join(source, 'scripts/local-gates-network.cjs')), STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0', CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', PRISMA_GENERATE_SKIP_AUTOINSTALL: '1',
      PRISMA_SCHEMA_ENGINE_BINARY: path.join(root, 'node_modules/@prisma/engines/schema-engine-windows.exe'), PRISMA_QUERY_ENGINE_LIBRARY: path.join(root, 'node_modules/@prisma/engines/query_engine-windows.dll.node') };
    const envFor = name => ({ ...baseEnv, DATABASE_URL: url(name), DIRECT_URL: url(name), SHADOW_DATABASE_URL: url(name) });
    assert.equal(spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(target.directory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' }).status, 3, 'Owned cluster already in use'); started = true;
    execute('pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(target.directory, 'data'), '-l', path.join(target.directory, 'postgres.log'), '-o', '-p 58033 -h 127.0.0.1', '-w', 'start'], directory, osEnv, false, { stdio: 'ignore' });
    const postmaster = fs.readFileSync(path.join(target.directory, 'data/postmaster.pid'), 'utf8').split(/\r?\n/); postmasterId = postmaster[0]; assert.match(postmasterId, /^[1-9][0-9]*$/); assert.equal(Number(postmaster[3]), target.port); assert(Number(postmaster[2]) >= Math.floor(new Date(report.began).getTime() / 1000) - 1); assert.equal(fs.realpathSync(postmaster[1]).toLowerCase(), fs.realpathSync(path.join(target.directory, 'data')).toLowerCase());
    const admin = new Client({ connectionString: url('postgres'), connectionTimeoutMillis: 5000 }); await admin.connect();
    try { write('pg-IDENTITY.json', await identity(admin, target, 'postgres')); for (const name of Object.values(names)) assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount, 0, 'Refusing existing database'); } finally { await admin.end(); }
    const fresh = (label, context, name) => execute(label, process.execPath, [path.join(context, 'scripts/prisma-fresh-replay-runner.js'), '--root', context, '--database', name, '--out', path.join(evidence, label + '.md'), '--json-out', path.join(evidence, label + '.json')], context, envFor(name));
    const connect = async name => { const client = new Client({ connectionString: url(name), connectionTimeoutMillis: 5000 }); await client.connect(); await identity(client, target, name); return client; };
    fresh('pg-fresh123', migrationContext, names.fresh);
    const freshReplay = read(path.join(evidence, 'pg-fresh123.json')); assert(freshReplay.ready && freshReplay.history.appliedCount === 123);
    const freshSql = await connect(names.fresh);
    try { assertHistory(await history(freshSql), catalog); assert.deepEqual(await inventory(freshSql), afterInventory); write('pg-HISTORY_FRESH.json', { database: names.fresh, rows: await history(freshSql) }); } finally { await freshSql.end(); }
    const adapter = path.join(directory, 'pg-db.cjs');
    fs.writeFileSync(adapter, `const {PrismaClient}=require(${JSON.stringify(runtimeClient)});const u=new URL(process.env.INTEGRITY_CLOSE_POSTGRES_URL||'');if(u.hostname!=='localhost'||u.port!=='58033'||u.pathname!==${JSON.stringify('/' + names.fresh)}||u.searchParams.get('schema')!=='public')throw Error('Exact owned fresh integrity target required');module.exports={db:new PrismaClient({datasources:{db:{url:u.toString()}},transactionOptions:{maxWait:15000,timeout:90000},__internal:{configOverride:config=>({...config,relativeEnvPaths:{rootEnvPath:null,schemaEnvPath:null}})}})};\n`, { flag: 'wx' });
    const config = { rootDir: source, roots: [...new Set(relatives.map(file => path.dirname(path.join(source, file))))], testEnvironment: 'node', testMatch: ['**/scope-integrity.postgres.test.ts', '**/mixed-month.postgres.test.ts'], testTimeout: 180000, cache: false,
      moduleNameMapper: { '^@/prisma/db$': adapter, '^@prisma/client$': runtimeClient, '^@/(.*)$': source.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(source, 'scripts/server-only-node-shim.js') }, moduleDirectories: [path.join(root, 'node_modules')], transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') } };
    const configPath = path.join(directory, 'pg-jest.config.cjs'); fs.writeFileSync(configPath, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' }); write('pg-RUNTIME_BINDING.json', { configPath, configSha256: digest(configPath), adapter, adapterSha256: digest(adapter) });
    const privateDocuments = path.join(directory, 'private-documents'); fs.mkdirSync(privateDocuments);
    const monthlyEvidence = path.join(directory, 'monthly-close-service-evidence.private.json'), integrityEvidence = path.join(directory, 'scope-integrity-service-evidence.private.json'), resultsFile = path.join(directory, 'fresh-integrity-and-monthly-tests.private.json');
    const testEnv = { ...envFor(names.fresh), MONTHLY_CLOSE_POSTGRES_URL: url(names.fresh), MONTHLY_CLOSE_DATABASE_NAME: names.fresh, MONTHLY_CLOSE_PROBE_EVIDENCE: monthlyEvidence, MONTHLY_CLOSE_PRIVATE_DIRECTORY: privateDocuments,
      INTEGRITY_CLOSE_POSTGRES_URL: url(names.fresh), INTEGRITY_CLOSE_DATABASE_NAME: names.fresh, INTEGRITY_CLOSE_PROBE_EVIDENCE: integrityEvidence };
    let testFailure;
    try { execute('pg-fresh-service-cases', process.execPath, [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', configPath, '--runInBand', '--no-cache', '--runTestsByPath', ...relatives.map(file => path.join(source, file)), '--json', '--outputFile', resultsFile], source, testEnv); } catch (error) { testFailure = error; }
    if (fs.existsSync(resultsFile)) {
      const tests = read(resultsFile); write('pg-tests.summary.json', { success: tests.success, passed: tests.numPassedTests, failed: tests.numFailedTests, pending: tests.numPendingTests, todo: tests.numTodoTests, total: tests.numTotalTests,
        outcomes: (tests.testResults || []).flatMap(suite => (suite.assertionResults || []).map(test => ({ name: scrub(test.fullName || test.title), status: test.status }))), privateResults: { path: resultsFile, sha256: digest(resultsFile), bytes: fs.statSync(resultsFile).size } });
    }
    if (testFailure) throw testFailure;
    const tests = read(resultsFile); assert(tests.success); assert.equal(tests.numPassedTests, 20); assert.equal(tests.numTotalTests, 20); assert.equal(tests.numFailedTests, 0); assert.equal(tests.numPendingTests, 0); assert.equal(tests.numTodoTests, 0);
    const integrity = read(integrityEvidence); assert.deepEqual(integrity.checks.map(check => check.name), integrityPhases); assert(integrity.checks.every(check => check.passed === true));
    assert.equal(integrity.syntheticScopeInputs, true); assert.equal(integrity.syntheticDraftCustodySentinel, true); assert.equal(integrity.financialTerminalStatesSeeded, false); assert.equal(integrity.noProviderOrBrowserCalls, true);
    write('pg-integrity.summary.json', { passed: true, checks: integrityPhases.map(name => ({ name, passed: true })), syntheticScopeInputs: true, syntheticDraftCustodySentinel: true, financialTerminalStatesSeeded: false, noProviderOrBrowserCalls: true, privateEvidence: { path: integrityEvidence, sha256: digest(integrityEvidence), bytes: fs.statSync(integrityEvidence).size } });
    const monthly = read(monthlyEvidence); assert.deepEqual(monthly.checks.map(check => check.name), monthlyPhases); assert(monthly.earnedInternalTerminalStates && monthly.syntheticProviderConfirmationFacts); assert.equal(monthly.seededInternalFinancialTerminalStates, false); assert.deepEqual(monthly.counts, monthlyCounts);
    write('pg-monthly.summary.json', { passed: true, checks: monthlyPhases.map(name => ({ name, passed: true })), counts: monthly.counts, earnedInternalTerminalStates: true, seededInternalFinancialTerminalStates: false, syntheticProviderConfirmationFacts: true, privateEvidence: { path: monthlyEvidence, sha256: digest(monthlyEvidence), bytes: fs.statSync(monthlyEvidence).size } });
    const fixtureFile = path.join(privateDocuments, 'FIXTURE.json'), monthlyFixture = read(fixtureFile); assert.equal(monthlyFixture.documentDigest, 'sha256:' + digest(monthlyFixture.packPath)); assert.equal(path.dirname(monthlyFixture.packPath), privateDocuments);
    write('pg-PRIVATE_MONTHLY_FIXTURE.json', { path: fixtureFile, sha256: digest(fixtureFile), bytes: fs.statSync(fixtureFile).size, packs: [{ path: monthlyFixture.packPath, sha256: digest(monthlyFixture.packPath), bytes: fs.statSync(monthlyFixture.packPath).size }] });
    const afterFresh = await connect(names.fresh); try { assert.deepEqual(await inventory(afterFresh), afterInventory); assertHistory(await history(afterFresh), catalog); write('pg-SQL_INVENTORY_FRESH.json', { expected: afterInventory, after: await inventory(afterFresh), unchangedDuringCases: true }); } finally { await afterFresh.end(); }
    report.checks.push({ name: 'fresh123ReplayTwice', certification: freshReplay.status }, { name: 'structuralIntegrityAndMonthlyServices', passedTests: 20, integrityCases: 12, earnedMonthlyCases: 8, skipped: 0 });
    const helpers = require(path.join(source, path.relative(root, helperFile))); assert.equal(typeof helpers.makeFixture, 'function'); assert.equal(typeof helpers.snapshotFixture, 'function'); assert.equal(typeof helpers.countScopeViolations, 'function');
    fresh('pg-clean122', oldContext, names.clean);
    const clean = await connect(names.clean);
    try {
      assertHistory(await history(clean), oldCatalog); assert.deepEqual(await inventory(clean), beforeInventory);
      const fixture = await helpers.makeFixture(clean, { dirty: false }), before = await helpers.snapshotFixture(clean, fixture), beforeText = JSON.stringify(before), oldHistory = await history(clean);
      assert((await helpers.countScopeViolations(clean)).every(item => Number(item.violations) === 0));
      const beforePin = privateWrite('clean-upgrade-before.private.json', { fixture, snapshot: before, history: oldHistory });
      for (let iteration = 1; iteration <= 2; iteration++) execute('pg-clean-deploy123-' + iteration, process.execPath, [path.join(migrationContext, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], migrationContext, envFor(names.clean));
      const after = await helpers.snapshotFixture(clean, fixture), newHistory = await history(clean); assert.equal(JSON.stringify(after), beforeText); assertHistory(newHistory, catalog); assert.deepEqual(newHistory.slice(0, 122), oldHistory); assert.deepEqual(await inventory(clean), afterInventory);
      const afterPin = privateWrite('clean-upgrade-after.private.json', { fixture, snapshot: after, history: newHistory });
      execute('pg-clean-certify123', process.execPath, [path.join(migrationContext, 'scripts/prisma-fresh-replay-runner.js'), '--root', migrationContext, '--mode', 'certify-existing', '--database', names.clean, '--out', path.join(evidence, 'pg-clean123.md'), '--json-out', path.join(evidence, 'pg-clean123.json')], migrationContext, envFor(names.clean));
      assert(read(path.join(evidence, 'pg-clean123.json')).ready); write('pg-CLEAN_UPGRADE.json', { passed: true, database: names.clean, beforeMigrationCount: 122, afterMigrationCount: 123, deployments: 2, exactFixtureSnapshotUnchanged: true, existing122HistoryUnchanged: true, before: beforePin, after: afterPin, snapshotSha256: hash(beforeText), inventory: await inventory(clean) });
      verifyExecutionClients();
      const { PrismaClient: OldPrismaClient } = require(oldRuntimeClient), oldWriter = new OldPrismaClient({ datasources: { db: { url: url(names.clean) } }, __internal: { configOverride: config => ({ ...config, relativeEnvPaths: { rootEnvPath: null, schemaEnvPath: null } }) } });
      try {
        const ownedScope = { organizationId: fixture.a.run.organizationId, periodId: fixture.a.period.id };
        const draft = await oldWriter.closeRun.create({ data: ownedScope });
        const legacy = await oldWriter.closePackExport.create({ data: { ...ownedScope, closeRunId: draft.id, watermarkId: 'old122-' + id, contentHash: 'sha256:' + hash('old122-null-export-' + id), isCertified: false } });
        assert.equal(draft.status, 'DRAFT'); assert.equal(legacy.canonicalContent, null); assert.equal(legacy.canonicalContentSha256, null); assert.equal(legacy.exportRequestHash, null);
        const countBefore = await oldWriter.closeChecklistItem.count({ where: { organizationId: ownedScope.organizationId } }); let rejected;
        try { await oldWriter.closeChecklistItem.create({ data: { ...ownedScope, periodId: fixture.b.period.id, closeRunId: draft.id, key: 'old122-wrong-period-' + id, domain: 'AUDIT', status: 'FAILED', severity: 'HIGH', label: 'Synthetic incompatible scope probe', detail: 'This old-client cross-period write must be rejected', sourceService: 'close-integrity-old-writer-probe' } }); } catch (error) { rejected = error; }
        assert.equal(rejected?.code, 'P2003'); assert.equal(await oldWriter.closeChecklistItem.count({ where: { organizationId: ownedScope.organizationId } }), countBefore);
        privateWrite('old122-writer-probe.private.json', { draft, legacy, rejectedCode: rejected.code, fixtureSnapshotComparisonCompletedBeforeProbe: true });
        write('pg-OLD_WRITER_COMPATIBILITY.json', { passed: true, clientVersion: 122, databaseVersion: 123, validDraftRunWritten: true, legacyNullExportWritten: true, wrongParentRejected: true, rejectedCode: 'P2003', negativeRowCountUnchanged: true, knownAdditionalRowsAfterPreservationComparison: { closeRuns: 1, closePackExports: 1 }, financialTerminalStatesSeeded: false, rootOrOldClientGenerationRepeated: false });
      } finally { await oldWriter.$disconnect(); }
    } finally { await clean.end(); }
    report.checks.push({ name: 'populated122to123', exactFixtureAndRetainedBytesPreserved: true, existing122HistoryPreserved: true, deployments: 2, currentSchemaCertification: true });
    fresh('pg-dirty122', oldContext, names.dirty);
    const dirty = await connect(names.dirty);
    try {
      assertHistory(await history(dirty), oldCatalog); assert.deepEqual(await inventory(dirty), beforeInventory);
      const fixture = await helpers.makeFixture(dirty, { dirty: true }), before = await helpers.snapshotFixture(dirty, fixture), oldHistory = await history(dirty), ddlBefore = await ddlFingerprint(dirty), violations = await helpers.countScopeViolations(dirty);
      assert.equal(violations.length, 14); assert(violations.every(item => Number(item.violations) > 0));
      const beforePin = privateWrite('dirty-upgrade-before.private.json', { fixture, snapshot: before, history: oldHistory, ddl: ddlBefore.rows, violations });
      // Prisma can mask the original error after an explicit transaction aborts.
      // Diagnose the exact catalog-bound migration directly, then roll it back;
      // this is separate evidence from the subsequent Prisma deploy rejection.
      const directSql = fs.readFileSync(path.join(migrationContext, catalog.migrations[122].path));
      assert.equal(hash(directSql), catalog.migrations[122].rawSha256);
      let directError;
      try { await dirty.query(directSql.toString('utf8')); }
      catch (error) { directError = error; }
      finally { await dirty.query('ROLLBACK'); }
      assert.equal(directError?.code, '23514');
      assert.equal(directError.message, 'Close scope integrity preflight failed.');
      const reportedCounts = JSON.parse(directError.detail);
      assert.deepEqual(reportedCounts, Object.fromEntries(violations.map(item => [item.name, Number(item.violations)])), 'Direct migration preflight counts do not match all14 independent edge counts');
      assert.deepEqual(await helpers.snapshotFixture(dirty, fixture), before);
      assert.deepEqual(await history(dirty), oldHistory);
      assert.equal((await ddlFingerprint(dirty)).sha256, ddlBefore.sha256);
      assert.deepEqual(await inventory(dirty), beforeInventory);
      execute('pg-dirty-deploy123-rejected', process.execPath, [path.join(migrationContext, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], migrationContext, envFor(names.dirty), true);
      const after = await helpers.snapshotFixture(dirty, fixture), newHistory = await history(dirty), ddlAfter = await ddlFingerprint(dirty);
      assert.deepEqual(after, before); assert.deepEqual(newHistory.filter(row => row.migration_name !== migrationName), oldHistory); assert.equal(ddlAfter.sha256, ddlBefore.sha256); assert.deepEqual(await inventory(dirty), beforeInventory);
      const failedRows = newHistory.filter(row => row.migration_name === migrationName); assert.equal(failedRows.length, 1); assert.equal(failedRows[0].checksum, catalog.migrations[122].rawSha256); assert.equal(failedRows[0].finished_at, null); assert.equal(failedRows[0].rolled_back_at, null);
      assert(failedRows[0].logs === null || typeof failedRows[0].logs === 'string');
      const afterPin = privateWrite('dirty-upgrade-after.private.json', { fixture, snapshot: after, history: newHistory, ddl: ddlAfter.rows });
      write('pg-DIRTY_UPGRADE_REJECTION.json', { passed: true, database: names.dirty, expectedRejection: true, preflightReasonVerified: true, all14Reported: true,
        diagnosticSource: 'direct-postgresql-exact-migration', directMigrationRawSha256: hash(directSql), directSqlstate: directError.code, directMessage: directError.message, directReportedCounts: reportedCounts,
        directRollbackVerified: true, directBeforeHistoryUnchanged: true, prismaFailureCauseUnavailable: true,
        invalidEdgeCategories: violations.map(item => ({ name: item.name, violations: Number(item.violations) })), exactFixtureSnapshotUnchanged: true, existing122HistoryUnchanged: true, noPartialDDL: true, ddlSha256Before: ddlBefore.sha256, ddlSha256After: ddlAfter.sha256, expectedUnfinishedMigration: migrationName, intentionallyBlockedHistoryPreserved: true, before: beforePin, after: afterPin });
    } finally { await dirty.end(); }
    report.checks.push({ name: 'corrupt122UpgradeRejected', invalidCategories: 14, fixtureAndExistingHistoryUnchanged: true, noPartialDDL: true, intentionallyUnfinishedHistoryPreserved: true });
    for (const file of files) { assert.equal(digest(path.join(source, file.path)), file.sha256); assert.equal(digest(path.join(root, file.path)), file.sha256, 'Tested source changed'); }
    for (const file of migrationFiles) { assert.equal(digest(path.join(migrationContext, file.path)), file.sha256); assert.equal(digest(path.join(root, file.path)), file.sha256, 'Migration input changed'); }
    for (const file of clientReceipt.clientFiles) assert.equal(digest(path.join(clientReceipt.client, file.path)), file.sha256, 'Private client changed'); for (const file of clientReceipt.sharedClientBefore) assert.equal(digest(file.path), file.sha256, 'Shared client changed');
    for (const file of oldOrm.clientFiles) assert.equal(digest(path.join(oldClientReceipt.client, file.path)), file.sha256, 'Qualified122 writer client changed');
    for (const file of retainedManifest.migrationFiles) assert.equal(digest(path.join(oldContext, file.path)), file.sha256); verifyExecutionClients(); assert.equal(digest(executionReceiptFile), report.executionClientReceiptSha256); assert.equal(digest(__filename), report.runnerSha256); report.passed = true;
  } catch (error) { failure = error; const file = path.join(directory, 'failure.private.txt'); fs.writeFileSync(file, require('node:util').inspect(error, { depth: 6 }) + '\n' + String(error.stack || ''), { flag: 'wx' }); report.failure = scrub(error.message); report.privateFailure = { path: file, sha256: digest(file), bytes: fs.statSync(file).size }; }
  finally {
    if (started) { try { assert.equal(fs.readFileSync(path.join(target.directory, 'data/postmaster.pid'), 'utf8').split(/\r?\n/)[0], postmasterId, 'Owned postmaster changed; refusing stop'); execute('pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(target.directory, 'data'), '-m', 'fast', '-t', '300', '-w', 'stop'], directory, osEnv, false, { stdio: 'ignore', timeout: 310000 }); report.ownedClusterStopped = true; } catch (error) { report.passed = false; report.cleanupFailure = scrub(error.message); failure ||= error; } }
    report.ended = new Date().toISOString(); write('pg-RESULT.json', report); fs.writeFileSync(path.join(__dirname, 'pg-LATEST.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ passed: report.passed, evidenceDirectory: evidence, ownedClusterStopped: report.ownedClusterStopped, checks: report.checks.length })); if (failure) throw failure;
}
if (require.main === module) main().catch(error => { console.error(scrub(error.message)); process.exitCode = 1; });
