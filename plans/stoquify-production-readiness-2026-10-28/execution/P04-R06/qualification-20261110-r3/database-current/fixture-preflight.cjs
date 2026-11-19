// Native read-only qualification entry: exact new fixture and unchanged old baseline.
const { fs, path, assert, target, hash, receipt, connect, checkMigrations, requireEmpty } = require('./database-common.cjs');
const { packet, read, assertReviewed, guardCurrentCluster } = require('./lifecycle-guards.cjs');
const { actors } = require('./fixture-definition.cjs');
const { readPrivateFixture, snapshot } = require('./fixture-control.cjs');
const { inspectBaseline, assertBaselineUnchanged } = require('./baseline-snapshot.cjs');
const report = { startedAt: new Date().toISOString(), passed: false };
(async () => {
  assert.equal(process.argv.length, 2); assertReviewed();
  const guard = await guardCurrentCluster(), built = read(path.join(packet, 'build-result.json'));
  assert(built.passed); assert.equal(built.candidateId, guard.context.candidateId); assert.match(built.artifactSha256, /^[a-f0-9]{64}$/);
  const reviewed = read(path.join(packet, 'independent-review/DATABASE-CURRENT-OUTCOME-REVIEW.json'));
  assert(reviewed.passed && reviewed.candidateId === guard.context.candidateId);
  assert(Array.isArray(reviewed.files) && reviewed.files.length > 0);
  const expectedFixture = path.resolve(guard.context.storage, 'private/browser-fixture.private.json').toLowerCase();
  assert(reviewed.files.some(file => path.resolve(packet, file.path).toLowerCase() === expectedFixture), 'Exact reviewed private fixture binding required');
  for (const file of reviewed.files) assert.equal(hash(fs.readFileSync(path.resolve(packet, file.path))), file.sha256, 'Database outcome input changed: ' + file.path);
  const fixture = readPrivateFixture(); assert.equal(Object.keys(fixture.users).length, 16);
  const expected = Object.values(actors).map(actor => ({ id: actor.id, email: actor.email, organizationId: actor.organizationId, isActive: true, isLocked: false, failedLoginAttempts: 0, emailVerified: true })).sort((a, b) => a.id.localeCompare(b.id));
  const client = await connect(target.full);
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    report.migrations = await checkMigrations(client); assert.equal(report.migrations.count, 123);
    const actual = (await client.query('SELECT id,email,"organizationId","isActive","isLocked","failedLoginAttempts","emailVerified" FROM users ORDER BY id')).rows;
    assert.deepEqual(actual, expected);
    for (const [table, count] of [['accounts', 32], ['sessions', 0], ['audit_logs', 0]]) assert.equal((await client.query('SELECT count(*)::int n FROM ' + table)).rows[0].n, count);
    await client.query('COMMIT');
  } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; } finally { await client.end(); }
  const build = await connect(target.build);
  try {
    await build.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    assert.deepEqual(await checkMigrations(build), report.migrations); report.buildEmpty = await requireEmpty(build);
    await build.query('COMMIT');
  } catch (error) { try { await build.query('ROLLBACK'); } catch {} throw error; } finally { await build.end(); }
  report.baseline = await inspectBaseline('before-runtime'); assertBaselineUnchanged(guard.preparation.baselineAfter, report.baseline);
  report.snapshot = await snapshot('fresh-runtime-preflight');
  report.privateFixtureSha256 = hash(fs.readFileSync(path.join(guard.context.storage, 'private/browser-fixture.private.json')));
  Object.assign(report, { candidateId: guard.context.candidateId, artifactSha256: built.artifactSha256, database: target.full, actors: 16, accounts: 32, sessions: 0, audits: 0, baselineUnchanged: true, baselinePreparationReceiptSha256: guard.preparationSha256, passed: true });
})().catch(error => { report.error = String(error.message); process.exitCode = 1; }).finally(() => { report.finishedAt = new Date().toISOString(); receipt('fixture-preflight', report); console.log(JSON.stringify({ passed: report.passed, error: report.error, actors: report.actors, sessions: report.sessions })); });
