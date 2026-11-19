// Stop after an isolated pre-runtime failure; retain all rows and private files, including incomplete seed state.
const { fs, path, assert, target, quote, receipt, connect, checkMigrations } = require('./database-common.cjs');
const { packet, assertReviewed, guardCurrentCluster, stopOwnedCluster } = require('./lifecycle-guards.cjs');
const { inspectBaseline, assertBaselineUnchanged } = require('./baseline-snapshot.cjs');
const report = { startedAt: new Date().toISOString(), passed: false, qualificationPassed: false, baselineUnchanged: false, databaseRowsChanged: false, privateFilesRemoved: false };
(async () => {
  assert.equal(process.argv.length, 2); assertReviewed();
  for (const file of ['runtime-current/execution-started.json', 'runtime-result.json']) assert(!fs.existsSync(path.join(packet, file)), 'Runtime has started; use runtime cleanup: ' + file);
  const guard = await guardCurrentCluster(); report.candidateId = guard.context.candidateId; report.baselinePreparationReceiptSha256 = guard.preparationSha256;
  report.databases = [];
  report.databaseInspectionErrors = [];
  for (const database of [target.build, target.full]) {
    let client;
    try {
      client = await connect(database);
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const migrations = await checkMigrations(client), counts = {};
      for (const { tablename } of (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows) counts[tablename] = (await client.query('SELECT count(*)::int n FROM ' + quote(tablename))).rows[0].n;
      report.databases.push({ database, migrations, counts, allRowsRetained: true }); await client.query('COMMIT');
    } catch (error) {
      report.databaseInspectionErrors.push({ database, error: String(error.message) });
      if (client) { try { await client.query('ROLLBACK'); } catch {} }
    } finally {
      if (client) { try { await client.end(); } catch (error) { report.databaseInspectionErrors.push({ database, error: String(error.message) }); } }
    }
  }
  report.zeroSessionsObserved = report.databases.length === 2 && report.databaseInspectionErrors.length === 0 && report.databases.every(row => row.counts.sessions === 0);
  try { report.baselineFinal = await inspectBaseline('before-qualification-stop'); assertBaselineUnchanged(guard.preparation.baselineAfter, report.baselineFinal); report.baselineUnchanged = true; }
  catch (error) { report.baselineCheckError = String(error.message); }
  // Unexpected new rows are retained. Exact ownership and no remaining clients still permit safe shutdown.
  await stopOwnedCluster(guard, 'before-qualification', report);
  report.passed = report.zeroSessionsObserved && report.baselineUnchanged && report.clusterStopped && report.launcherCompletedCleanly;
  if (!report.passed) { report.error = 'Owned cluster stopped; unexpected sessions or preservation evidence requires reconciliation'; process.exitCode = 1; }
})().catch(error => { report.error = String(error.message); process.exitCode = 1; }).finally(() => { report.finishedAt = new Date().toISOString(); receipt('cleanup-before-qualification', report); console.log(JSON.stringify(report)); });
