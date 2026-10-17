const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const service = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const files = ['services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/reconciliation/reconciliation-run-preparation.contracts.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'services/reconciliation/payment-reconciliation-notifications.ts', 'services/modules/module-entitlement.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [] };
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'accounting.journal.read'];
const control = (x, actorId = x.maker.id) => { const now = new Date(); return { organizationId: x.org.id, actorId, actorPermissions: permissions, now, lastAuthAt: now }; };
const history = (x, cursor) => service.readReconciliationPreparation({ kind: 'history', runId: x.run.runId, cursor }, control(x));
async function managed(label) {
  const x = await fixture('preparation-' + label + '-' + stamp), modules = getModuleCatalog().map(m => m.slug);
  await db.tenantModuleConfiguration.create({ data: { organizationId: x.org.id, manifestHash: 'owned-preparation-history', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.org.id, moduleSlug, status: 'active', source: 'requested_modules' })) });
  return x;
}
async function command(x, reason = 'Reviewed current sources and obligations') {
  const review = await service.previewReconciliationPreparation({ runId: x.run.runId }, control(x));
  assert.equal(review.canPrepare, true);
  return { runId: x.run.runId, expectedRevision: review.revision, reason, idempotencyKey: crypto.randomUUID() };
}
const counts = async x => ({
  receipts: await db.paymentReconciliationInboxItem.count({ where: { organizationId: x.org.id, idempotencyKey: { startsWith: 'reconciliation-run-preparation:' } } }),
  audits: await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }),
  observations: await db.paymentReconciliationInboxItem.count({ where: { organizationId: x.org.id, idempotencyKey: { startsWith: 'payment-reconciliation.run.ready-for-signoff:' } } }),
  journals: await db.journalEntry.count({ where: { organizationId: x.org.id } }),
});
async function race(sameRequest) {
  const x = await managed(sameRequest ? 'duplicate' : 'reviewers'), firstCommand = await command(x);
  const secondCommand = sameRequest ? firstCommand : { ...firstCommand, reason: 'Second operator reviewed the same source revision', idempotencyKey: crypto.randomUUID() };
  const actors = [x.maker.id, sameRequest ? x.maker.id : x.other.id];
  const row = { kind: sameRequest ? 'same request concurrent duplicate' : 'different reviewers same revision', organizationId: x.org.id, runId: x.run.runId, readyReads: 0 }; report.cases.push(row);
  const baseline = await counts(x), original = db.$transaction.bind(db);
  let release; const barrier = new Promise(resolve => { release = resolve; });
  db.$transaction = (callback, options) => original(async tx => {
    let initialRead = true;
    return callback(new Proxy(tx, { get(client, key) {
      if (key !== 'reconciliationRun') return Reflect.get(client, key);
      return new Proxy(tx.reconciliationRun, { get(model, method) {
        if (method !== 'findFirst') return Reflect.get(model, method);
        return async args => {
          const value = await model.findFirst(args);
          if (initialRead && args.include?.providerAccount) {
            initialRead = false; row.readyReads++;
            if (row.readyReads === 2) release();
            await barrier;
          }
          return value;
        };
      } });
    } }));
  }, options);
  const timer = setTimeout(release, 8000);
  let results;
  try { results = await Promise.allSettled([service.prepareReconciliationRun(firstCommand, control(x, actors[0])), service.prepareReconciliationRun(secondCommand, control(x, actors[1]))]); }
  finally { clearTimeout(timer); release(); db.$transaction = original; }
  row.results = results.map(result => result.status === 'fulfilled' ? { value: result.value } : { error: { code: result.reason.code, message: f.safe(result.reason) } });
  assert.equal(row.readyReads, 2, 'Both transactions must observe the original run');
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const winner = results.findIndex(result => result.status === 'fulfilled'), loser = 1 - winner;
  assert.equal(results[loser].reason.code, 'CONFLICT');
  const commands = [firstCommand, secondCommand], winningReceipt = results[winner].value.receiptId;
  const replay = await service.prepareReconciliationRun(commands[winner], control(x, actors[winner]));
  assert.equal(replay.replayed, true); assert.equal(replay.receiptId, winningReceipt);
  if (!sameRequest) {
    await assert.rejects(() => service.prepareReconciliationRun(commands[loser], control(x, actors[loser])), error => error.code === 'CONFLICT');
    await assert.rejects(() => service.prepareReconciliationRun(commands[winner], control(x, actors[loser])), error => error.code === 'IDEMPOTENCY_CONFLICT');
  }
  row.counts = await counts(x);
  assert.deepEqual(row.counts, { receipts: 1, audits: 1, observations: baseline.observations + 1, journals: 0 });
  row.winningReceipt = winningReceipt; row.passed = true;
  console.log(JSON.stringify({ kind: row.kind, passed: true }));
}
async function rollback() {
  const x = await managed('rollback'), input = await command(x), before = await counts(x), runBefore = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } });
  const original = db.$transaction.bind(db); let injected = false;
  db.$transaction = (callback, options) => original(tx => callback(new Proxy(tx, { get(client, key) {
    if (key !== 'paymentReconciliationInboxItem') return Reflect.get(client, key);
    return new Proxy(tx.paymentReconciliationInboxItem, { get(model, method) {
      if (method !== 'createMany') return Reflect.get(model, method);
      return async args => { if (args.data.idempotencyKey?.startsWith('payment-reconciliation.run.ready-for-signoff:')) { injected = true; throw new Error('Owned notification persistence failure'); } return model.createMany(args); };
    } });
  } })), options);
  try { await assert.rejects(() => service.prepareReconciliationRun(input, control(x)), /Owned notification persistence failure/); }
  finally { db.$transaction = original; }
  assert.equal(injected, true); assert.deepEqual(await counts(x), before);
  assert.deepEqual(await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } }), runBefore);
  const retry = await service.prepareReconciliationRun(input, control(x)); assert.equal(retry.replayed, false);
  report.cases.push({ kind: 'notification persistence failure rolls back transition receipt and audit', organizationId: x.org.id, runId: x.run.runId, counts: await counts(x), passed: true });
}
async function pages() {
  const x = await managed('history'), foreign = await managed('foreign-history'), baseline = await counts(x), commands = [], receipts = [];
  for (let i = 0; i < 23; i++) {
    const input = await command(x, 'Retained real preparation review ' + String(i + 1).padStart(2, '0'));
    commands.push(input); receipts.push(await service.prepareReconciliationRun(input, control(x)));
  }
  const foreignReceipt = await service.prepareReconciliationRun(await command(foreign), control(foreign));
  const first = await history(x), second = await history(x, first.nextCursor);
  assert.equal(first.total, 23); assert.equal(first.records.length, 20); assert.ok(first.nextCursor);
  assert.equal(second.total, 23); assert.equal(second.records.length, 3); assert.equal(second.nextCursor, null);
  const ids = [...first.records, ...second.records].map(row => row.id);
  assert.equal(new Set(ids).size, 23); assert.deepEqual(new Set(ids), new Set(receipts.map(row => row.receiptId)));
  const authoritative = await db.paymentReconciliationInboxItem.findMany({ where: { organizationId: x.org.id, idempotencyKey: { startsWith: 'reconciliation-run-preparation:' } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
  assert.deepEqual(ids, authoritative.map(row => row.id));
  assert.deepEqual((await history(x)).records, first.records);
  await assert.rejects(() => service.readReconciliationPreparation({ kind: 'history', runId: x.run.runId }, control(foreign)), error => ['FORBIDDEN', 'NOT_FOUND'].includes(error.code));
  const foreignRow = await db.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: foreignReceipt.receiptId } });
  const foreignCursor = await history(x, { id: foreignRow.id, createdAt: foreignRow.createdAt.toISOString() });
  assert.ok(foreignCursor.records.every(row => ids.includes(row.id)));
  assert.equal(foreignCursor.total, 23);
  // An immutable receipt failing its hash check must fail the page, never look empty.
  const retained = await db.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: first.records[0].id } });
  try {
    await db.paymentReconciliationInboxItem.update({ where: { id: retained.id }, data: { payloadSummary: { ...retained.payloadSummary, reason: 'Owned deliberately corrupted history reason' } } });
    await assert.rejects(() => history(x), error => error.code === 'CONFLICT');
  } finally { await db.paymentReconciliationInboxItem.update({ where: { id: retained.id }, data: { payloadSummary: retained.payloadSummary } }); }
  assert.deepEqual((await history(x)).records, first.records);
  const latest = receipts.at(-1), earlier = await service.prepareReconciliationRun(commands[0], control(x));
  assert.equal(earlier.receiptId, receipts[0].receiptId); assert.equal(earlier.replayed, true);
  assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).metadata.preparationReceiptId, latest.receiptId);
  const signPermissions = [...permissions, 'payments.reconciliation.sign'];
  const review = await certification.previewReconciliationSignOff({ organizationId: x.org.id, runId: x.run.runId, actorId: x.signer.id, actorPermissions: signPermissions }); assert.equal(review.canSign, true);
  const now = new Date(); await certification.signReconciliationRun({ organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: review.expectedSourceVersionHash, expectedEvidenceRevision: review.expectedEvidenceRevision, control: { actorPermissions: signPermissions, now, lastAuthAt: now } });
  assert.equal((await service.prepareReconciliationRun(commands[0], control(x))).currentStatus, 'SIGNED');
  assert.deepEqual((await history(x)).records, first.records);
  const finalCounts = await counts(x); assert.deepEqual(finalCounts, { receipts: 23, audits: 23, observations: baseline.observations + 23, journals: 0 });
  report.cases.push({ kind: '23 actual preparations retained across pages and independent signing', organizationId: x.org.id, runId: x.run.runId, pageSizes: [20, 3], receiptIds: ids, tenantAndCursorIsolation: true, corruptionRejectedAndRestored: true, earlierReplayKeepsCurrentPointer: true, signedHistoryRetained: true, counts: finalCounts, passed: true });
}
(async () => { await f.helper.withClient(f.target, f.helper.assertOwned); await race(true); await race(false); await rollback(); await pages(); report.passed = true; })()
  .catch(error => { report.passed = false; report.error = { code: error.code, message: f.safe(error) }; process.exitCode = 1; })
  .finally(async () => { report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); const output = path.join(__dirname, 'preparation-reviewers-history-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error, cases: report.cases.length, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0); });
