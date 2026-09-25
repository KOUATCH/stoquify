const f = require('./supplier-ack-fixtures.cjs');
const { db, fs, path, crypto, assert } = f;
const baseline = process.argv.includes('--baseline');
const run = crypto.randomUUID().slice(0, 12);
const report = { run, mode: baseline ? 'before' : 'after', at: new Date().toISOString(), checks: [], faultInjection: 'Altered query results inside the owned local transaction. No immutable proposal, state, or event is edited in the database; this tests integrity detection, not an externally demonstrated attack.' };
const extra = 'services/purchase-order/supplier-po-proposal-evidence.ts';
if (fs.existsSync(path.join(f.root, extra)) && !f.files.includes(extra)) f.files.push(extra);
const read = x => ({ organizationId: x.organizationId, actorId: x.actorId, purchaseOrderId: x.purchaseOrderId });
const snapshot = x => db.$transaction(async tx => ({
  order: f.hash(await tx.purchaseOrder.findUnique({ where: { id: x.purchaseOrderId }, include: { lines: true } })),
  proposals: f.hash(await tx.supplierPoProposal.findMany({ where: { organizationId: x.organizationId }, include: { lines: true, states: true } })),
  events: f.hash(await tx.businessEvent.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } })),
  audit: await tx.auditLog.count({ where: { organizationId: x.organizationId } }),
}));
function altered(kind) {
  function proposal(p) {
    if (!p) return p;
    const q = { ...p, lines: p.lines.map(line => ({ ...line })), states: p.states.map(state => ({ ...state })) };
    if (kind === 'quantity') q.lines[0].requestedQuantity = new (require('@prisma/client').Prisma.Decimal)('99.125');
    if (kind === 'date') q.requestedDeliveryDate = new Date(q.requestedDeliveryDate.getTime() + 86400000);
    if (kind === 'correlation') q.correlationId += '-changed';
    if (kind === 'line scope') q.lines[0].organizationId = 'foreign-org';
    if (kind === 'line owner') q.lines[0].proposalId = 'foreign-proposal';
    if (kind === 'duplicate line') q.lines.push(q.lines[0]);
    if (kind === 'missing line') q.lines.pop();
    if (kind === 'event link') q.businessEventId = 'missing-event';
    if (kind === 'line order') q.lines.reverse();
    return q;
  }
  function events(rows) {
    if (kind === 'missing event') return [];
    return rows.map(row => {
      if (kind === 'event tenant') return { ...row, organizationId: 'foreign-org' };
      if (kind === 'unapplied event') return { ...row, status: 'RECORDED', processedAt: null };
      if (kind === 'event digest') return { ...row, payloadHash: '0'.repeat(64) };
      if (kind === 'event source') return { ...row, sourceId: 'foreign-object' };
      if (kind === 'event content') return { ...row, payload: { ...row.payload, authoritativeMutation: true } };
      if (kind === 'event time') return { ...row, occurredAt: new Date(row.occurredAt.getTime() + 1) };
      if (kind === 'review actor' && row.eventType.includes('buyer_')) return { ...row, actorId: 'foreign-buyer' };
      return row;
    });
  }
  return { $transaction: (callback, settings) => db.$transaction(tx => callback(new Proxy(tx, { get(target, property) {
    if (!['supplierPoProposal', 'supplierPoEnvelope', 'supplierPoAccessToken', 'businessEvent'].includes(property)) return target[property];
    return new Proxy(target[property], { get(model, method) {
      if (!['findFirst', 'findMany'].includes(method)) return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
      return async args => {
        if (property === 'businessEvent' && kind === 'query failure') throw new Error('Owned evidence query unavailable');
        const result = await model[method](args);
        if (property === 'supplierPoProposal' && result?.states) return proposal(result);
        if (property === 'supplierPoAccessToken' && result?.proposal) return { ...result, proposal: proposal(result.proposal) };
        if (property === 'supplierPoEnvelope' && Array.isArray(result)) return result.map(envelope => ({ ...envelope, proposals: envelope.proposals.map(proposal) }));
        if (property === 'businessEvent' && Array.isArray(result)) return events(result);
        return result;
      };
    } });
  } })), settings) };
}
async function checked(name, work) {
  const started = Date.now();
  try { const details = await work(); report.checks.push({ name, status: 'passed', milliseconds: Date.now() - started, ...details }); }
  catch (error) { report.checks.push({ name, status: 'failed', error: f.safe(error) }); throw error; }
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.sourceBefore = f.sources(); report.originalBefore = await f.stable();
  const x = await f.fixture('en', 'evidence-' + run);
  const command = { envelopeId: x.envelopeId, token: x.token, proposalType: 'REQUEST_CHANGE', requestedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(), quantityChanges: [{ purchaseOrderLineId: x.lineId, requestedQuantity: '8.125' }], note: 'Owned proposal evidence verification', idempotencyKey: 'evidence-submit-' + run, correlationId: 'evidence-correlation-' + run };
  const submitted = await f.submitSupplierPoProposal(command, db);
  const view = await f.getSupplierPoAcknowledgementWorkbench(read(x), db);
  const review = { organizationId: x.organizationId, reviewedById: x.actorId, sessionId: x.sessionId, purchaseOrderId: x.purchaseOrderId, proposalId: submitted.proposalId, expectedStateHash: submitted.stateHash, expectedOrderHash: view.purchaseOrder.currentOrderHash, decision: 'ACCEPT', reason: 'Owned verification of supplier terms', idempotencyKey: 'evidence-review-' + run, correlationId: 'evidence-review-correlation-' + run };
  const original = await snapshot(x);
  const faults = baseline ? ['quantity', 'date', 'line scope', 'event link', 'missing event'] : ['quantity', 'date', 'line scope', 'line owner', 'duplicate line', 'missing line', 'event link', 'missing event', 'event tenant', 'unapplied event', 'event digest', 'event source', 'event content', 'event time'];
  for (const fault of faults) await checked('Integrity detection: ' + fault, async () => {
    const observations = [];
    const calls = [['public view', client => f.getPublicSupplierPoEnvelope({ envelopeId: x.envelopeId, token: x.token }, client)], ['buyer history', client => f.getSupplierPoAcknowledgementWorkbench(read(x), client)], ['exact retry', client => f.submitSupplierPoProposal(command, client)]];
    if (!baseline) calls.push(['buyer decision', client => f.reviewSupplierPoProposal(review, client)]);
    for (const [surface, call] of calls) {
      let error; try { await call(altered(fault)); } catch (caught) { error = caught; }
      observations.push({ surface, rejected: !!error, code: error?.code });
      if (!baseline) assert.equal(error?.code, 'CONFLICT', fault + ': ' + surface + ' must reject inconsistent evidence');
    }
    assert.deepEqual(await snapshot(x), original);
    return { observations };
  });
  if (!baseline) {
    await checked('Valid submission and read remain stable after rejected reads and decisions', async () => {
      assert.equal((await f.submitSupplierPoProposal(command, db)).replayed, true);
      assert.equal((await f.getPublicSupplierPoEnvelope({ envelopeId: x.envelopeId, token: x.token }, db)).proposal.quantityChanges[0].requestedQuantity, '8.125');
      assert.equal((await f.getSupplierPoAcknowledgementWorkbench(read(x), db)).envelopes[0].proposals[0].status, 'SUBMITTED');
    });
    await checked('Accepted decision has applied event evidence and exact replay; corrupted reviewer identity is rejected', async () => {
      const decision = await f.reviewSupplierPoProposal(review, db);
      assert.equal(decision.status, 'BUYER_ACCEPTED');
      assert.equal((await f.reviewSupplierPoProposal(review, db)).replayed, true);
      const saved = await snapshot(x);
      await assert.rejects(f.getSupplierPoAcknowledgementWorkbench(read(x), altered('review actor')), error => error.code === 'CONFLICT');
      await assert.rejects(f.getPublicSupplierPoEnvelope({ envelopeId: x.envelopeId, token: x.token }, altered('review actor')), error => error.code === 'CONFLICT');
      assert.deepEqual(await snapshot(x), saved);
      assert.equal(saved.order, original.order);
    });
    await checked('Event query failure never becomes empty history or successful replay', async () => {
      const saved = await snapshot(x);
      await assert.rejects(f.getSupplierPoAcknowledgementWorkbench(read(x), altered('query failure')), /Owned evidence query unavailable/);
      await assert.rejects(f.getPublicSupplierPoEnvelope({ envelopeId: x.envelopeId, token: x.token }, altered('query failure')), /Owned evidence query unavailable/);
      await assert.rejects(f.submitSupplierPoProposal(command, altered('query failure')), /Owned evidence query unavailable/);
      await assert.rejects(f.reviewSupplierPoProposal(review, altered('query failure')), /Owned evidence query unavailable/);
      assert.deepEqual(await snapshot(x), saved);
    });
    await checked('Two-line historical request verifies with database line order reversed and no evidence rewrite', async () => {
      const multi = await f.fixture('en', 'multiline-' + run, { skipInvite: true });
      const item = await db.item.create({ data: { organizationId: multi.organizationId, slug: 'evidence-second-' + run, sku: 'EVIDENCE-SECOND-' + run, nameEn: 'Second verification item', imageUrls: [], costPrice: '1000.00', sellingPrice: '1500.00' } });
      const line = await db.purchaseOrderLine.create({ data: { purchaseOrderId: multi.purchaseOrderId, itemId: item.id, orderedQuantity: '4.000', unitCost: '1000.00', discount: '0.00', taxRate: '0.00', taxAmount: '0.00', lineTotal: '4000.00' } });
      // Dedicated fixture preparation before any invitation or immutable evidence.
      await db.purchaseOrder.update({ where: { id: multi.purchaseOrderId }, data: { subtotal: '29000.00', total: '29000.00' } });
      const current = await f.getSupplierPoAcknowledgementWorkbench(read(multi), db);
      const invite = await f.issueSupplierPoInvite({ ...multi.issueCommand, expectedOrderHash: current.purchaseOrder.currentOrderHash }, db);
      const request = { ...command, envelopeId: invite.envelopeId, token: invite.token, idempotencyKey: 'multi-submit-' + run, correlationId: 'multi-correlation-' + run, quantityChanges: [{ purchaseOrderLineId: line.id, requestedQuantity: '3' }, { purchaseOrderLineId: multi.lineId, requestedQuantity: '8.125' }] };
      await f.submitSupplierPoProposal(request, db);
      const saved = await snapshot(multi);
      assert.equal((await f.submitSupplierPoProposal(request, altered('line order'))).replayed, true);
      const history = await f.getSupplierPoAcknowledgementWorkbench(read(multi), altered('line order'));
      assert.equal(history.envelopes[0].proposals[0].quantityChanges.length, 2);
      const publicView = await f.getPublicSupplierPoEnvelope({ envelopeId: invite.envelopeId, token: invite.token }, altered('line order'));
      assert.equal(publicView.proposal.quantityChanges.find(value => value.purchaseOrderLineId === multi.lineId).requestedQuantity, '8.125');
      assert.deepEqual(await snapshot(multi), saved);
    });
  }
  report.originalAfter = await f.stable(); assert.equal(report.originalAfter, report.originalBefore);
  report.sourceAfter = f.sources(); assert.deepEqual(report.sourceAfter, report.sourceBefore);
})().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  const file = path.join(__dirname, 'supplier-proposal-evidence-' + report.mode + '-' + run + '.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2)); await db.$disconnect();
  process.stdout.write(JSON.stringify({ report: file, checks: report.checks.map(({ name, status }) => ({ name, status })), error: report.error }) + '\n');
});
