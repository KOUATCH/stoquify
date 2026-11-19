// Revoke only exact synthetic sessions in the new r3 database; preserve old databases and all business/audit rows.
const { assert, target, receipt, connect } = require('./database-common.cjs');
const { assertReviewed, guardCurrentCluster } = require('./lifecycle-guards.cjs');
const { snapshot } = require('./fixture-control.cjs');
const { actors } = require('./fixture-definition.cjs');
const { inspectBaseline, assertBaselineUnchanged } = require('./baseline-snapshot.cjs');
const report = { startedAt: new Date().toISOString(), passed: false };
(async () => {
  assert.equal(process.argv.length, 2); assertReviewed(); const guard = await guardCurrentCluster();
  Object.assign(report, { candidateId: guard.context.candidateId, database: target.full, baselinePreparationReceiptSha256: guard.preparationSha256 });
  report.baselineBefore = await inspectBaseline('before-session-cleanup'); assertBaselineUnchanged(guard.preparation.baselineAfter, report.baselineBefore);
  report.before = await snapshot('final-session-cleanup-before');
  const client = await connect(target.full);
  try {
    await client.query('BEGIN');
    const rows = (await client.query('SELECT s.id,u.id AS "userId",u.email,u."organizationId" FROM sessions s JOIN users u ON u.id=s."userId" FOR UPDATE OF s')).rows;
    assert.equal(rows.length, (await client.query('SELECT count(*)::int n FROM sessions')).rows[0].n);
    assert(rows.every(row => Object.values(actors).some(actor => actor.id === row.userId && actor.email === row.email && actor.organizationId === row.organizationId)), 'Nonfixture identity: preserve sessions');
    report.removedSessions = (await client.query('DELETE FROM sessions WHERE id=ANY($1::text[])', [rows.map(row => row.id)])).rowCount;
    assert.equal(report.removedSessions, rows.length); await client.query('COMMIT');
  } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; } finally { await client.end(); }
  report.after = await snapshot('final-session-cleanup-after');
  assert.equal(report.after.businessSha256, report.before.businessSha256); assert.equal(report.after.auditSha256, report.before.auditSha256); assert.equal(report.after.sessionRows.length, 0);
  report.baselineAfter = await inspectBaseline('after-session-cleanup'); assertBaselineUnchanged(report.baselineBefore, report.baselineAfter);
  report.baselineUnchanged = true; report.passed = true;
  report.classification = 'Exact new-database synthetic session revocation only; old baseline and new business/audit digests unchanged';
})().catch(error => { report.error = String(error.message); process.exitCode = 1; }).finally(() => { report.finishedAt = new Date().toISOString(); receipt('final-session-cleanup', report); console.log(JSON.stringify({ passed: report.passed, error: report.error, removedSessions: report.removedSessions })); });
