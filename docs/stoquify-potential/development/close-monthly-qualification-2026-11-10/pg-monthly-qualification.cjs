// New owned DB + frozen October opening-collection/monthly-close cases. No production/provider calls,
// root generation, old target reset/drop, app server or ambient application env.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), baseEvidence = path.join(root, 'docs/stoquify-potential/development/close-production-prep-2026-11-09'), prior = path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09'), bin = 'C:/Program Files/PostgreSQL/17/bin';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file)), read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv); require('node:dns').setDefaultResultOrder('ipv4first');
const { Client } = require(path.join(root, 'node_modules/pg'));
const scrub = value => String(value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_MONTHLY_CLOSE_DATABASE]').replace(/(?:(?:rt|ca03|earned|monthly)_session_|earned_stale_)[a-f0-9]{64}/g, '[SYNTHETIC_SESSION_TOKEN]');
const expectedPhases = ['actual-approved-opening-and-replay', 'actual-collections-and-provider-links', 'electronic-claim-denials-no-effects', 'actual-concurrent-claim-exclusion', 'assessment-before-provider-and-schedule-evidence', 'actual-monthly-import-independent-signatures', 'actual-bank-bs-approval-certification-and-seal', 'actual-closed-period-denial-and-retained-recovery'];
const expectedCounts = { journals: 4, customerSettlements: 3, claimedProviderTransactions: 2, signedReconciliationRuns: 2, approvedBankBalanceEvidence: 1, certifiedExports: 1, periodCloseEvents: 1, periodReopenEvents: 0, providerAccounts: 2, activeOpeningExecutions: 1, openingReceivables: 1, sales: 0, payrollRuns: 0, statutoryCertifiedDocuments: 0 };
function noLinks(file) { let cursor = path.parse(path.resolve(file)).root; for (const part of path.resolve(file).slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); assert(!fs.lstatSync(cursor).isSymbolicLink()); } }
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
      const candidate = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(input), specifier);
      const candidates = [candidate, ...['.ts', '.tsx', '.js', '.cjs', '.mjs', '.json'].map(suffix => candidate + suffix), ...['index.ts', 'index.tsx', 'index.js', 'index.cjs'].map(name => path.join(candidate, name))];
      if (candidate.endsWith('.js')) candidates.push(candidate.slice(0, -3) + '.ts');
      const resolved = candidates.find(file => fs.existsSync(file) && fs.statSync(file).isFile()); assert(resolved, 'Unresolved frozen source: ' + specifier); pending.push(resolved);
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
async function identity(client, target, name) {
  const row = (await client.query("SELECT current_database() AS name,current_user AS actor,host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('data_directory') AS directory,current_setting('server_version_num') AS version")).rows[0];
  assert.equal(row.name, name); assert.equal(row.actor, target.user); assert.equal(row.host, '127.0.0.1'); assert.equal(row.port, target.port); assert(Number(row.version) >= 170000 && Number(row.version) < 180000);
  assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(target.directory, 'data')).toLowerCase()); return row;
}
async function main() {
  const target = read(path.join(prior, 'DATABASE_TARGET.json')); assert.equal(path.dirname(target.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(target.directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/); noLinks(target.directory);
  assert.equal(target.clusterDirectory, target.directory); assert.equal(target.host, 'localhost'); assert.equal(target.port, 58033); assert.equal(target.user, 'sales_release_fixture');
  const retentionFile = path.join(baseEvidence, 'pg-RETENTION_LATEST.json'), retention = read(retentionFile); assert(retention.passed && retention.ownedClusterStopped);
  const retainedSource = read(path.join(retention.evidenceDirectory, 'pg-SOURCE_MANIFEST.json')), migrationSource = retention.migrations;
  for (const entry of retainedSource.migrationFiles) assert.equal(digest(path.join(migrationSource, entry.path)), entry.sha256, 'Qualified122 migration context changed');
  const catalog = read(path.join(migrationSource, 'prisma/migration-catalog-manifest.json')); assert.equal(catalog.migrationCount, 122);
  assert.equal(digest(path.join(root, 'prisma/migration-catalog-manifest.json')), retainedSource.catalogFileSha256); assert.equal(digest(path.join(root, 'prisma/schema.prisma')), retainedSource.schemaSha256);
  for (const entry of catalog.migrations) assert.equal(digest(path.join(root, entry.path)), entry.rawSha256, 'Current SQL differs from qualified catalog');
  const clientReceiptFile = path.join(baseEvidence, 'pg-PRIVATE_CLIENT.json'), clientReceipt = read(clientReceiptFile), clientPath = clientReceipt.client;
  assert(clientReceipt.passed && clientReceipt.rootGeneration === false); assert.equal(clientReceipt.sourceSchemaSha256, retainedSource.schemaSha256);
  assert.equal(path.dirname(clientReceipt.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(clientReceipt.directory), /^close-retention-client-20261109-[a-f0-9]{10}$/); assert.equal(clientPath, path.join(clientReceipt.directory, 'orm/client')); noLinks(clientPath);
  assert.equal(digest(path.join(clientPath, 'schema.prisma')), clientReceipt.clientSchemaSha256); assert.equal(digest(path.join(clientPath, 'index.js')), clientReceipt.clientIndexSha256);
  const retainedOrm = read(path.join(retention.evidenceDirectory, 'pg-ORM_PROVENANCE.json')); assert.equal(retainedOrm.client, clientPath);
  for (const entry of retainedOrm.clientFiles) assert.equal(digest(path.join(clientPath, entry.path)), entry.sha256, 'Qualified private client changed');
  const tokenHelper = path.join(root, 'scripts/ensure-prisma-client.js'), tokens = require(tokenHelper).schemaTokens; assert.equal(digest(tokenHelper), clientReceipt.schemaTokenHelperSha256); assert.equal(hash(tokens(fs.readFileSync(path.join(clientPath, 'schema.prisma'), 'utf8'))), clientReceipt.schemaTokensSha256);
  const id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', 'close-monthly-20261110-' + id), evidence = path.join(__dirname, 'pg-attempt-' + id), source = path.join(directory, 'source'), database = 'stoquify_replay_close_monthly_20261110_' + id;
  fs.mkdirSync(directory); fs.mkdirSync(evidence); fs.mkdirSync(source); const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const report = { began: new Date().toISOString(), passed: false, database, directory, source, evidenceDirectory: evidence, privateClient: clientPath, catalogSha256: catalog.catalogSha256, runnerSha256: digest(__filename), checks: [], limitation: 'Real isolated October opening-receivable collection/monthly-close with synthetic opening documents and raw provider confirmation observations. No October new sale, live provider authenticity/processing, statutory approval, hosted delivery or browser qualification is claimed.' };
  const execute = (label, executable, args, cwd, env, extra = {}) => {
    console.log(label + ': starting'); const began = Date.now(), result = spawnSync(executable, args, { cwd, env, windowsHide: true, encoding: 'utf8', maxBuffer: 40e6, timeout: 600000, ...extra });
    const execution = { executable, args, cwd, began: new Date(began).toISOString(), ended: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null };
    if (label === 'pg-monthly-close-lifecycle') {
      execution.privateOutputs = [];
      for (const stream of ['stdout', 'stderr']) {
        const file = path.join(directory, label + '.' + stream + '.private.log'); fs.writeFileSync(file, result[stream] || '', { flag: 'wx' });
        execution.privateOutputs.push({ stream, path: file, sha256: digest(file), bytes: fs.statSync(file).size });
      }
      for (const [kind, file] of [['jestResults', args[args.indexOf('--outputFile') + 1]], ['serviceEvidence', env.MONTHLY_CLOSE_PROBE_EVIDENCE]]) {
        assert(file.startsWith(directory + path.sep));
        if (fs.existsSync(file)) execution.privateOutputs.push({ kind, path: file, sha256: digest(file), bytes: fs.statSync(file).size });
      }
      const resultsFile = args[args.indexOf('--outputFile') + 1];
      if (fs.existsSync(resultsFile)) {
        try {
          const tests = read(resultsFile);
          write('pg-monthly-close-tests.summary.json', { success: tests.success, passed: tests.numPassedTests, failed: tests.numFailedTests, pending: tests.numPendingTests, todo: tests.numTodoTests, total: tests.numTotalTests, outcomes: (tests.testResults || []).flatMap(suite => (suite.assertionResults || []).map(test => ({ name: scrub(test.fullName || test.title), status: test.status }))), privateResults: { path: resultsFile, sha256: digest(resultsFile), bytes: fs.statSync(resultsFile).size } });
        } catch { execution.privateResultsSummaryUnavailable = true; }
      }
    } else fs.writeFileSync(path.join(evidence, label + '.log'), scrub(result.stdout) + scrub(result.stderr), { flag: 'wx' });
    write(label + '.execution.json', execution);
    console.log(label + ': exit ' + result.status); assert(!result.error && result.status === 0, label + ' failed; retained evidence available');
  };
  let started = false, failure, postmasterId;
  try {
    const caseFile = path.join(__dirname, 'mixed-month.postgres.test.ts'), relativeTest = path.relative(root, caseFile), files = closure(source, [caseFile, path.join(root, 'scripts/server-only-node-shim.js'), path.join(root, 'scripts/local-gates-network.cjs')]);
    write('pg-SOURCE_MANIFEST.json', { root, source, files, sourceSha256: hash(JSON.stringify(files)), schemaSha256: retainedSource.schemaSha256, catalogSha256: catalog.catalogSha256, catalogFileSha256: retainedSource.catalogFileSha256, testSha256: digest(caseFile), runnerSha256: report.runnerSha256, migrationSource, migrationBinding: { path: path.join(retention.evidenceDirectory, 'pg-SOURCE_MANIFEST.json'), sha256: digest(path.join(retention.evidenceDirectory, 'pg-SOURCE_MANIFEST.json')) }, retentionReceipt: { path: retentionFile, sha256: digest(retentionFile) }, privateClientReceipt: { path: clientReceiptFile, sha256: digest(clientReceiptFile) }, privateClient: clientPath, privateClientFiles: retainedOrm.clientFiles });
    write('pg-TARGET.json', { ...target, database, privateDirectory: directory, source, migrationSource, purpose: 'new-owned-october-opening-collection-provider-month-close-122' });
    const url = `postgresql://${target.user}@localhost:${target.port}/${database}?schema=public`, adapter = path.join(directory, 'pg-db.cjs');
    fs.writeFileSync(adapter, `const {PrismaClient}=require(${JSON.stringify(clientPath)});const u=new URL(process.env.MONTHLY_CLOSE_POSTGRES_URL||'');if(u.hostname!=='localhost'||u.port!==${JSON.stringify(String(target.port))}||u.pathname!==${JSON.stringify('/' + database)}||u.searchParams.get('schema')!=='public')throw Error('Exact owned monthly target required');module.exports={db:new PrismaClient({datasources:{db:{url:u.toString()}},transactionOptions:{maxWait:15000,timeout:90000}})};\n`, { flag: 'wx' });
    const config = { rootDir: source, roots: [path.dirname(path.join(source, relativeTest))], testEnvironment: 'node', testMatch: ['**/mixed-month.postgres.test.ts'], testTimeout: 180000, cache: false, moduleNameMapper: { '^@/prisma/db$': adapter, '^@prisma/client$': clientPath, '^@/(.*)$': source.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(source, 'scripts/server-only-node-shim.js') }, moduleDirectories: [path.join(root, 'node_modules')], transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') } };
    const configPath = path.join(directory, 'pg-jest.config.cjs'); fs.writeFileSync(configPath, 'module.exports=' + JSON.stringify(config, null, 2) + ';\n', { flag: 'wx' }); write('pg-RUNTIME_BINDING.json', { configPath, configSha256: digest(configPath), adapter, adapterSha256: digest(adapter) });
    const privateEvidence = path.join(directory, 'private-documents'); fs.mkdirSync(privateEvidence);
    const privateServiceEvidence = path.join(directory, 'monthly-close-service-evidence.private.json');
    const env = { ...osEnv, NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first --require ' + JSON.stringify(path.join(source, 'scripts/local-gates-network.cjs')), DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url, MONTHLY_CLOSE_POSTGRES_URL: url, MONTHLY_CLOSE_DATABASE_NAME: database, MONTHLY_CLOSE_PROBE_EVIDENCE: privateServiceEvidence, MONTHLY_CLOSE_PRIVATE_DIRECTORY: privateEvidence, STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0', CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' };
    assert.equal(spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(target.directory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' }).status, 3, 'Shared cluster already in use'); started = true;
    execute('pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(target.directory, 'data'), '-l', path.join(target.directory, 'postgres.log'), '-o', `-p ${target.port} -h 127.0.0.1`, '-w', 'start'], directory, osEnv, { stdio: 'ignore' });
    const postmaster = fs.readFileSync(path.join(target.directory, 'data/postmaster.pid'), 'utf8').split(/\r?\n/); postmasterId = postmaster[0];
    assert.match(postmasterId, /^[1-9][0-9]*$/); assert.equal(fs.realpathSync(postmaster[1]).toLowerCase(), fs.realpathSync(path.join(target.directory, 'data')).toLowerCase());
    assert(Number(postmaster[2]) >= Math.floor(new Date(report.began).getTime() / 1000) - 1); assert.equal(Number(postmaster[3]), target.port);
    const admin = new Client({ connectionString: `postgresql://${target.user}@localhost:${target.port}/postgres`, connectionTimeoutMillis: 5000 }); await admin.connect();
    try { write('pg-IDENTITY.json', await identity(admin, target, 'postgres')); assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).rowCount, 0, 'Refusing an existing target'); } finally { await admin.end(); }
    execute('pg-fresh122', process.execPath, [path.join(migrationSource, 'scripts/prisma-fresh-replay-runner.js'), '--root', migrationSource, '--database', database, '--out', path.join(evidence, 'pg-fresh122.md'), '--json-out', path.join(evidence, 'pg-fresh122.json')], migrationSource, env);
    const replay = read(path.join(evidence, 'pg-fresh122.json')); assert(replay.ready && replay.history.ready && replay.history.appliedCount === 122);
    const sql = new Client({ connectionString: url, connectionTimeoutMillis: 5000 }); await sql.connect();
    try {
      await identity(sql, target, database); const rows = (await sql.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows; assert.equal(rows.length, 122);
      rows.forEach((row, index) => { assert.equal(row.migration_name, catalog.migrations[index].name); assert.equal(row.checksum, catalog.migrations[index].rawSha256); assert(row.finished_at && !row.rolled_back_at); }); write('pg-HISTORY.json', { database, rows });
      const inventory = async () => (await sql.query("SELECT (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal) AS triggers,(SELECT count(*)::int FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace) AS checks,(SELECT count(*)::int FROM pg_proc WHERE pronamespace='public'::regnamespace) AS functions")).rows[0], before = await inventory();
      assert.deepEqual(before, { triggers: 142, checks: 231, functions: 76 });
      const privateResults = path.join(directory, 'monthly-close-tests.private.json'); execute('pg-monthly-close-lifecycle', process.execPath, [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', configPath, '--runInBand', '--no-cache', '--runTestsByPath', path.join(source, relativeTest), '--json', '--outputFile', privateResults], source, env);
      const tests = read(privateResults); assert.equal(tests.success, true); assert.equal(tests.numPassedTests, 8); assert.equal(tests.numTotalTests, 8); assert.equal(tests.numFailedTests, 0); assert.equal(tests.numPendingTests, 0); assert.equal(tests.numTodoTests, 0); assert.deepEqual(await inventory(), before);
      const serviceEvidence = read(privateServiceEvidence); assert(Array.isArray(serviceEvidence.checks)); assert.deepEqual(serviceEvidence.checks.map(check => check.name), expectedPhases); assert.equal(serviceEvidence.earnedInternalTerminalStates, true); assert.equal(serviceEvidence.seededInternalFinancialTerminalStates, false); assert.equal(serviceEvidence.syntheticProviderConfirmationFacts, true); assert.deepEqual(serviceEvidence.counts, expectedCounts);
      write('pg-monthly-close-service.summary.json', { passed: true, checks: expectedPhases.map(name => ({ name, passed: true })), counts: serviceEvidence.counts, auxiliary: serviceEvidence.auxiliary, earnedInternalTerminalStates: true, seededInternalFinancialTerminalStates: false, syntheticProviderConfirmationFacts: true, privateEvidence: { path: privateServiceEvidence, sha256: digest(privateServiceEvidence), bytes: fs.statSync(privateServiceEvidence).size } });
      const fixtureFile = path.join(privateEvidence, 'FIXTURE.json'), fixture = read(fixtureFile);
      assert.deepEqual(Object.keys(fixture).sort(), ['organizationId', 'reviewerUserId', 'periodId', 'closeRunId', 'exportId', 'documentDigest', 'contentHash', 'packPath', 'ui'].sort());
      for (const key of ['organizationId', 'reviewerUserId', 'periodId', 'closeRunId', 'exportId', 'contentHash']) assert(typeof fixture[key] === 'string' && fixture[key].length > 0, 'Missing private fixture field: ' + key);
      for (const key of ['organizationId', 'collectorUserId', 'reviewerUserId', 'customerId', 'documentId', 'paymentTransactionId', 'settlementDate']) assert(typeof fixture.ui[key] === 'string' && fixture.ui[key].length > 0, 'Missing UI fixture field: ' + key);
      assert.notEqual(fixture.ui.organizationId, fixture.organizationId); assert.equal(fixture.ui.amount, '100.00'); assert.equal(fixture.ui.method, 'MOBILE_MONEY');
      const packFile = path.join(privateEvidence, 'pack-' + fixture.exportId + '.json'); assert.equal(fixture.packPath, packFile); noLinks(packFile); assert.equal(fixture.documentDigest, 'sha256:' + digest(packFile));
      write('pg-PRIVATE_FIXTURE.json', { path: fixtureFile, sha256: digest(fixtureFile), bytes: fs.statSync(fixtureFile).size, packs: [{ path: packFile, sha256: digest(packFile), bytes: fs.statSync(packFile).size }] });
      report.checks.push({ name: 'fresh122ReplayTwice', certification: read(path.join(evidence, 'pg-fresh122.json')).status }, { name: 'earnedMonthlyCloseServiceCases', passedTests: tests.numPassedTests, skipped: 0, namedPhaseChecks: expectedPhases, earnedInternalTerminalStates: true, seededInternalFinancialTerminalStates: false, syntheticProviderConfirmationFacts: true, sqlInventoryUnchanged: true, scope: 'Opening-receivable collection/monthly internal system certification only; no October new sale, live provider or statutory approval', observedCounts: serviceEvidence.counts }); write('pg-SQL_INVENTORY.json', { before, after: await inventory(), unchanged: true });
    } finally { await sql.end(); }
    for (const entry of files) { assert.equal(digest(path.join(source, entry.path)), entry.sha256); assert.equal(digest(path.join(root, entry.path)), entry.sha256, 'Tested producer source changed'); }
    assert.equal(digest(__filename), report.runnerSha256); for (const entry of retainedOrm.clientFiles) assert.equal(digest(path.join(clientPath, entry.path)), entry.sha256, 'Private client changed during tests'); report.passed = true;
  } catch (error) {
    failure = error;
    const diagnostic = path.join(directory, 'failure.private.txt');
    fs.writeFileSync(diagnostic, require('node:util').inspect(error, { depth: 6 }) + '\n' + String(error.stack || ''), { flag: 'wx' });
    report.failure = scrub(error.message) || 'Qualification failed before a detailed public message; private diagnostic retained';
    report.privateFailure = { path: diagnostic, sha256: digest(diagnostic), bytes: fs.statSync(diagnostic).size };
  }
  finally {
    if (started) { try { assert.equal(fs.readFileSync(path.join(target.directory, 'data/postmaster.pid'), 'utf8').split(/\r?\n/)[0], postmasterId, 'Owned postmaster changed; refusing stop'); execute('pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(target.directory, 'data'), '-m', 'fast', '-t', '300', '-w', 'stop'], directory, osEnv, { stdio: 'ignore' }); report.ownedClusterStopped = true; } catch (error) { report.passed = false; report.cleanupFailure = scrub(error.message); failure ||= error; } }
    report.ended = new Date().toISOString(); write('pg-RESULT.json', report); fs.writeFileSync(path.join(__dirname, 'pg-LATEST.json'), JSON.stringify(report, null, 2) + '\n');
  }
  if (failure) throw failure;
}
if (require.main === module) { if (process.argv.length !== 3 || process.argv[2] !== 'run') throw Error('Expected reviewed run; no overrides'); main().catch(error => { console.error(scrub(error.message)); process.exitCode = 1; }); }

