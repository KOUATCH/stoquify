const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { fixture, snapshot } = require('./verify-tender-access-v131.cjs'), pos = require(path.join(f.root, 'services/pos/pos.service.ts'));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), checks: [] };
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const x = await fixture('revision-race-' + stamp), cart = await pos.getActivePOSCart(x.ctx);
  let enter, resume, paused = false;
  const entered = new Promise(resolve => { enter = resolve; }), released = new Promise(resolve => { resume = resolve; });
  const originalTransaction = db.$transaction, transaction = originalTransaction.bind(db);
  db.$transaction = (callback, options) => transaction(typeof callback === 'function' ? async tx => callback(new Proxy(tx, {
    get(target, key) {
      if (key !== 'salesOrder') return Reflect.get(target, key);
      return new Proxy(target.salesOrder, { get(delegate, method) {
        if (method !== 'findFirst') return Reflect.get(delegate, method);
        return async args => {
          const value = await delegate.findFirst(args);
          if (!paused && args.where?.id === x.cartId && args.include?.organization) { paused = true; enter(); await released; }
          return value;
        };
      } });
    },
  })) : callback, options);
  let timer;
  const submission = pos.commitPOSSale({ ...x.commit, tenders: [{ method: 'CASH', amount: 200 }] }).then(value => ({ value }), error => ({ error }));
  try {
    await Promise.race([entered, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Owned commit read barrier timed out')), 30000); })]);
    clearTimeout(timer);
    await pos.updatePOSCartLine({ ...x.ctx, salesOrderId: x.cartId, lineId: cart.lines[0].id, quantity: 2 });
    const changed = await snapshot(x); resume();
    const outcome = await submission;
    assert.equal(outcome.error?.code, 'CONFLICT');
    assert.equal(outcome.error?.metadata?.reason, 'POS_CART_REVISION_CHANGED');
    assert.equal(await snapshot(x), changed);
    report.checks.push('Real commit read old cart, concurrent edit committed, serializable retry rejected stale revision without financial effects');
    report.passed = true;
  } finally { clearTimeout(timer); resume(); await submission; db.$transaction = originalTransaction; }
}
main().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, 'services/pos/pos.service.ts'))).digest('hex');
  const file = path.join(__dirname, 'cart-revision-race-v134-' + stamp + '.json'); console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await db.$disconnect(); }
});
