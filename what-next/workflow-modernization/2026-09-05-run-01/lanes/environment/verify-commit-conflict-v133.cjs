const f = require('./statement-recipient-fixtures.cjs');
const { db, fs, path, crypto, assert } = f;
const { fixture, restrict, snapshot } = require('./verify-tender-access-v131.cjs');
const pos = require(path.join(f.root, 'services/pos/pos.service.ts'));
const stamp = crypto.randomUUID();
const hash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, 'services/pos/pos.service.ts'))).digest('hex');
const report = { at: new Date().toISOString(), sourceBefore: hash(), checks: [], scope: 'Owned local PostgreSQL, synthetic cash sale and accounting setup; no external payment or live approval.' };
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const x = await fixture('conflict-' + stamp);
  await pos.commitPOSSale(x.commit);
  await restrict(x);
  const original = await db.pOSCommitResult.findFirstOrThrow({ where: { organizationId: x.ctx.organizationId } });
  const before = await snapshot(x);
  await assert.rejects(() => pos.getPOSSaleCommitStatus({ ...x.commit, tenders: [{ method: 'CASH', amount: 200 }] }), error => {
    assert.equal(error.code, 'DUPLICATE_KEY_CONFLICT');
    assert.equal(error.status, 409);
    for (const key of ['existing', 'attemptedRequestHash', 'cause', 'resultEnvelope']) assert.equal(key in error, false);
    for (const value of [original.requestHash, original.resultHash]) assert.equal(JSON.stringify(error).includes(value), false);
    return true;
  });
  assert.equal(await snapshot(x), before);
  report.checks.push('Changed request produces bounded 409 with no stored result/hash/cause and no financial or registry effects');
  for (const scope of [{ userId: 'different-actor' }, { organizationId: 'different-tenant' }]) {
    assert.equal((await pos.getPOSSaleCommitStatus({ ...x.commit, ...scope })).kind, 'NOT_FOUND');
  }
  assert.equal(await snapshot(x), before);
  report.checks.push('Foreign scope remains not-found without effects');
  const recovered = await pos.getPOSSaleCommitStatus(x.commit);
  assert.equal(recovered.kind, 'RECORDED');
  assert.equal(recovered.currentStatus, 'COMPLETED');
  assert.equal(await snapshot(x), before);
  report.checks.push('Original unchanged request remains recoverable under read-only grant after conflict');
  report.passed = true;
}
main().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hash(); report.sourceStable = report.sourceBefore === report.sourceAfter;
  const file = path.join(__dirname, 'commit-conflict-v133-' + stamp + '.json');
  console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await db.$disconnect(); }
});
