// Ownership-verified shutdown after runtime; failed preservation/cleanup evidence cannot become a pass.
const { fs, path, assert, target, hash, receipt, connect } = require('./database-common.cjs');
const { assertReviewed, guardCurrentCluster, stopOwnedCluster } = require('./lifecycle-guards.cjs');
const { inspectBaseline, assertBaselineUnchanged } = require('./baseline-snapshot.cjs');
const report = { startedAt: new Date().toISOString(), passed: false, baselineUnchanged: false };
(async () => {
  assert.equal(process.argv.length, 2); assertReviewed(); const guard = await guardCurrentCluster();
  report.candidateId = guard.context.candidateId; report.baselinePreparationReceiptSha256 = guard.preparationSha256;
  let cleaned = null;
  try {
    const cleanupBytes = fs.readFileSync(path.join(__dirname, 'final-session-cleanup.json')), observed = JSON.parse(cleanupBytes);
    report.finalSessionCleanupSha256 = hash(cleanupBytes);
    assert.equal(observed.candidateId, guard.context.candidateId); assert.equal(observed.database, target.full);
    cleaned = observed;
  } catch (error) { report.cleanupReceiptError = String(error.message); }
  let client;
  try { client = await connect(target.full); report.remainingSyntheticSessions = (await client.query('SELECT count(*)::int n FROM sessions')).rows[0].n; }
  catch (error) { report.sessionInspectionError = String(error.message); }
  finally { if (client) { try { await client.end(); } catch (error) { report.sessionInspectionError = String(error.message); } } }
  report.sessionCleanupAccepted = cleaned?.passed === true && report.remainingSyntheticSessions === 0 && !report.sessionInspectionError && !report.cleanupReceiptError;
  try { report.baselineFinal = await inspectBaseline('final-stop'); assertBaselineUnchanged(guard.preparation.baselineAfter, report.baselineFinal); report.baselineUnchanged = true; }
  catch (error) { report.baselineCheckError = String(error.message); }
  await stopOwnedCluster(guard, 'final', report);
  report.passed = report.sessionCleanupAccepted && report.baselineUnchanged && report.clusterStopped && report.launcherCompletedCleanly;
  if (!report.passed) { report.error = 'Owned cluster stopped; cleanup or baseline preservation remains unqualified'; process.exitCode = 1; }
})().catch(error => { report.error = String(error.message); process.exitCode = 1; }).finally(() => { report.finishedAt = new Date().toISOString(); receipt('cleanup', report); console.log(JSON.stringify(report)); });
