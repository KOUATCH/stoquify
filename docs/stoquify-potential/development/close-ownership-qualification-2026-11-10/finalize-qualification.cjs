// Pure evidence admission: existing files only, one new JSON output. No app,
// database, environment-file loading, network, build or generation command.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const local = file => path.join(__dirname, file);
const pin = file => ({ path: file.replaceAll('\\', '/'), sha256: digest(local(file)), bytes: fs.statSync(local(file)).size });
const verifyMap = map => { for (const [file, sha] of Object.entries(map)) assert.equal(digest(path.join(root, file)), sha, 'Changed input: ' + file); };
function main() {
  assert.equal(process.argv[2], 'admit'); const [staticName, pgName] = process.argv.slice(3); assert.equal(process.argv.length, 5);
  assert.match(staticName, /^static-[a-f0-9]{10}$/); assert.match(pgName, /^pg-attempt-[a-f0-9]{10}$/);
  const output = local('FINAL_QUALIFICATION.json'); assert(!fs.existsSync(output), 'Existing admission is preserved');
  const unitPath = 'unit-666e261b93/verification.json', unit = read(local(unitPath));
  assert(unit.passed && unit.unchangedInputs); assert.equal(unit.passedTests, 472); assert.equal(unit.failedTests, 0); assert.equal(unit.skipped, 0); assert.equal(unit.todo, 0);
  verifyMap(unit.sourceHashesBefore); assert.deepEqual(unit.sourceHashesBefore, unit.sourceHashesAfter);
  const unitResults = read(local('unit-666e261b93/results.json')); assert(unitResults.success); assert.equal(unitResults.numPassedTests, 472); assert.equal(unitResults.numPassedTestSuites, 5);
  const staticPath = staticName + '/verification.json', compiler = read(local(staticPath));
  assert(compiler.passed && compiler.unchangedInputs); assert.equal(compiler.lintErrors, 0); assert.equal(compiler.lintWarnings, 0); verifyMap(compiler.sourceHashes);
  assert.equal(compiler.runnerSha256, digest(local('source-qualification.cjs')));
  assert.equal(compiler.configSha256, digest(local(staticName + '/tsconfig.json')));
  const pgPath = pgName + '/pg-RESULT.json', pg = read(local(pgPath)), index = read(local('pg-LATEST.json'));
  assert.deepEqual(index, pg); assert(pg.passed && pg.ownedClusterStopped); assert.equal(path.resolve(pg.evidenceDirectory), local(pgName));
  assert.match(pg.database, /^stoquify_replay_close_monthly_20261110_[a-f0-9]{10}$/);
  assert.equal(pg.database.slice(-10), pgName.slice(-10)); assert.equal(path.resolve(pg.directory), path.join(root, '.codex-tmp', 'close-ownership-20261110-' + pgName.slice(-10)));
  assert.equal(pg.runnerSha256, digest(local('pg-ownership-qualification.cjs')));
  const manifest = read(local(pgName + '/pg-SOURCE_MANIFEST.json'));
  assert.equal(digest(path.join(root, 'prisma/schema.prisma')), manifest.schemaSha256);
  assert.equal(digest(path.join(root, 'prisma/migration-catalog-manifest.json')), manifest.catalogFileSha256);
  for (const file of manifest.files) { assert.equal(digest(path.join(root, file.path)), file.sha256, 'Current source drift'); assert.equal(digest(path.join(pg.source, file.path)), file.sha256, 'Frozen source drift'); }
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(manifest.files)).digest('hex'), manifest.sourceSha256);
  for (const file of manifest.privateClientFiles) assert.equal(digest(path.join(manifest.privateClient, file.path)), file.sha256);
  const testsPath = pgName + '/pg-monthly-close-tests.summary.json', tests = read(local(testsPath));
  assert(tests.success); assert.equal(tests.passed, 21); assert.equal(tests.failed, 0); assert.equal(tests.pending, 0); assert.equal(tests.todo, 0); assert.equal(tests.total, 21);
  function verifyPrivate(file) { assert(path.resolve(file.path).startsWith(path.resolve(pg.directory) + path.sep)); assert.equal(digest(file.path), file.sha256); assert.equal(fs.statSync(file.path).size, file.bytes); }
  verifyPrivate(tests.privateResults);
  const rawTests = read(tests.privateResults.path); assert(rawTests.success); assert.equal(rawTests.numPassedTests, 21); assert.equal(rawTests.numPassedTestSuites, 2); assert.equal(rawTests.numPendingTests, 0); assert.equal(rawTests.numTodoTests, 0);
  const runtimeBinding = read(local(pgName + '/pg-RUNTIME_BINDING.json'));
  for (const [file, sha] of [[runtimeBinding.configPath, runtimeBinding.configSha256], [runtimeBinding.adapter, runtimeBinding.adapterSha256]]) { assert(path.resolve(file).startsWith(path.resolve(pg.directory) + path.sep)); assert.equal(digest(file), sha); }
  const ownershipPath = pgName + '/pg-ownership-service.summary.json', ownership = read(local(ownershipPath));
  assert(ownership.passed && ownership.syntheticInitialAuthorityConfiguration && ownership.noProviderOrBrowserCalls); assert.equal(ownership.financialTerminalStatesSeeded, false); assert.equal(ownership.checks.length, 13); assert(ownership.checks.every(check => check.passed));
  const monthlyPath = pgName + '/pg-monthly-close-service.summary.json', monthly = read(local(monthlyPath));
  assert(monthly.passed && monthly.earnedInternalTerminalStates && monthly.syntheticProviderConfirmationFacts); assert.equal(monthly.seededInternalFinancialTerminalStates, false); assert.equal(monthly.checks.length, 8); assert(monthly.checks.every(check => check.passed));
  for (const summary of [ownership, monthly]) verifyPrivate(summary.privateEvidence);
  const history = read(local(pgName + '/pg-HISTORY.json')), sql = read(local(pgName + '/pg-SQL_INVENTORY.json'));
  assert.equal(history.database, pg.database); assert.equal(history.rows.length, 122); assert(sql.unchanged); assert.deepEqual(sql.before, { triggers: 142, checks: 231, functions: 76 }); assert.deepEqual(sql.before, sql.after);
  const catalog = read(path.join(root, 'prisma/migration-catalog-manifest.json')); assert.equal(catalog.catalogSha256, pg.catalogSha256);
  history.rows.forEach((row, index) => { assert.equal(row.migration_name, catalog.migrations[index].name); assert.equal(row.checksum, catalog.migrations[index].rawSha256); assert(row.finished_at && !row.rolled_back_at); });
  for (const migration of catalog.migrations) assert.equal(digest(path.join(root, migration.path)), migration.rawSha256);
  const retainedFixture = read(local(pgName + '/pg-PRIVATE_FIXTURE.json'));
  for (const file of [retainedFixture, ...retainedFixture.packs]) verifyPrivate(file);
  const previous = path.join(root, 'docs/stoquify-potential/development/close-monthly-qualification-2026-11-10/FINAL_QUALIFICATION.json');
  assert.equal(digest(previous), 'f638845a7fca3dc463e639317186307427419d7b0790e90f558714e9ee32ef99', 'Historical monthly admission changed');
  const report = { admittedAt: new Date().toISOString(), status: 'LOCAL_CLOSE_OWNERSHIP_AND_SCOPE_QUALIFIED_PRODUCTION_BLOCKED',
    scope: 'Service-level finding assignee authority and linked comment/finding/review scope, with current earned mixed-payment monthly-close regression.',
    sourceHashes: compiler.sourceHashes,
    evidence: { mockedServiceActionUnits: { ...pin(unitPath), passed: 472, suites: 5, skipped: 0, rawResults: pin('unit-666e261b93/results.json') }, compilerAndLint: pin(staticPath),
      isolatedPostgres: { ...pin(pgPath), passed: 21, ownershipCases: 13, earnedMonthlyRegressionCases: 8, skipped: 0, sourceBinding: pin(pgName + '/pg-SOURCE_MANIFEST.json'), tests: pin(testsPath), runtimeBinding: pin(pgName + '/pg-RUNTIME_BINDING.json') },
      ownership: pin(ownershipPath), monthly: pin(monthlyPath), migrationHistory: pin(pgName + '/pg-HISTORY.json'), sqlInventory: pin(pgName + '/pg-SQL_INVENTORY.json'), retainedPrivateFixtureBinding: pin(pgName + '/pg-PRIVATE_FIXTURE.json'),
      historicalMonthlyAdmission: { path: path.relative(root, previous).replaceAll('\\', '/'), sha256: digest(previous), classification: 'Unchanged historical application/rendering evidence; not rerun in this packet' } },
    isolation: { newAbsentDatabase: pg.database, existingDatabasesResetOrDropped: false, currentMigrationCount: 122, schemaChanged: false, rootPrismaGeneration: false,
      applicationStarted: false, browserStarted: false, productionBuildRun: false, providerCalls: false, deliveryWorkersRun: false, ownedClusterStopped: true, stagedOrCommitted: false },
    limits: ['Initial authority/module/consent and OPEN/DRAFT graph facts are synthetic configuration; no provider or statutory authenticity claim.',
      'The case observes persisted-role revocation first and actual grant expiry across a public assignment UPDATE wait; it does not prove every possible interleaving.',
      'Independent SQL foreign keys remain. Direct-SQL parent reparenting/composite structural integrity requires separate legacy-data review and is not qualified here.',
      'Generic assigner commands remain client-local. External owner eligibility does not grant external generic command authority or client response ownership.',
      'No new authenticated HTTP/browser, UI, sealed artifact or hosted qualification was run. Current service authority is tested against persisted synthetic sessions and roles.',
      'Monthly regression earns the existing opening-AR cash/mobile/bank internal close; no October sale/stock, live provider or statutory approval is inferred.'],
    remainingProductionGates: ['Actual hosting/runtime/public HTTPS domain and current target-platform artifact/protected promotion', 'Hosted database adoption/history and measured accepted backup/PITR recovery',
      'Verified live customer-statement and accountant invitation delivery plus qualified private workers/scheduling', 'Original source custody, provider onboarding and independent Cameroon/domain acceptance',
      'Wider platform release gates and structural legacy close relation review'],
    runnerSha256: digest(__filename), productionDeployed: false, realMessagesSent: false,
  };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ admitted: true, status: report.status, evidenceFile: output, sha256: digest(output) }));
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
