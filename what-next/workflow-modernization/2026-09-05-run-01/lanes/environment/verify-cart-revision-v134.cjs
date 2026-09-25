const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { fixture, snapshot } = require('./verify-tender-access-v131.cjs');
const pos = require(path.join(f.root, 'services/pos/pos.service.ts'));
const after = process.argv.includes('--after'), stamp = crypto.randomUUID();
const report = { at: new Date().toISOString(), phase: after ? 'after' : 'before', checks: [] };
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const x = await fixture('revision-' + stamp);
  const reviewed = await pos.getActivePOSCart(x.ctx);
  const request = { ...x.commit, expectedCartRevision: reviewed.revision, tenders: [{ method: 'CASH', amount: 200 }] };
  const changed = await pos.updatePOSCartLine({ ...x.ctx, salesOrderId: x.cartId, lineId: reviewed.lines[0].id, quantity: 2 });
  const before = await snapshot(x);
  if (!after) {
    const result = await pos.commitPOSSale(request);
    assert.equal(result.total, 200); assert.equal(result.changeDue, 0);
    report.checks.push('Reproduced: cashier reviewed total 100 / cash 200 / change 100; changed cart committed total 200 / change 0');
  } else {
    await assert.rejects(() => pos.commitPOSSale(request), error => error.code === 'CONFLICT' && error.metadata?.reason === 'POS_CART_REVISION_CHANGED');
    assert.equal(await snapshot(x), before);
    assert.equal((await pos.getPOSSaleCommitStatus(request)).kind, 'CART_CHANGED');
    assert.equal(await snapshot(x), before);
    report.checks.push('Stale reviewed cart rejected without financial effects; recovery identifies changed cart');
    await assert.rejects(() => pos.commitPOSSale({ ...request, expectedCartRevision: undefined }), error => error.code === 'CONFLICT');
    assert.equal(await snapshot(x), before);
    report.checks.push('Missing revision cannot create new work');
    const amended = { ...request, expectedCartRevision: changed.revision };
    const result = await pos.commitPOSSale(amended);
    assert.equal(result.total, 200); assert.equal(result.changeDue, 0);
    const committed = await snapshot(x);
    assert.equal((await pos.commitPOSSale(amended)).replayed, true);
    assert.equal(await snapshot(x), committed);
    await assert.rejects(() => pos.commitPOSSale(request), error => error.code === 'DUPLICATE_KEY_CONFLICT');
    assert.equal(await snapshot(x), committed);
    report.checks.push('Explicit current review with same identifier commits once; replay has no effects; old intent conflicts');
  }
  report.passed = true;
}
main().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  const file = path.join(__dirname, `cart-revision-v134-${report.phase}-${stamp}.json`);
  report.sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, 'services/pos/pos.service.ts'))).digest('hex');
  console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await db.$disconnect(); }
});
