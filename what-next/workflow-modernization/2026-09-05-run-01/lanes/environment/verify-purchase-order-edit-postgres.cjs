const f = require('./supplier-ack-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const service = require(path.join(f.root, 'services/purchase-order/purchase-order.service.ts'));
const baseline = process.argv.includes('--baseline'), run = crypto.randomUUID().slice(0, 12);
const files = ['services/purchase-order/purchase-order.service.ts', 'services/purchase-order/purchase-order.schemas.ts', 'services/purchase-order/purchase-order-edit-record.ts', 'services/events/business-event.service.ts', 'services/modules/module-entitlement.service.ts', 'actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts', 'prisma/schema.prisma'];
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { run, mode: baseline ? 'before' : 'after', at: new Date().toISOString(), sourcesBefore: sources(), checks: [], scope: 'Owned local synthetic draft orders and authority changes. No external messages, migrations or financial postings.' };
let fault;
async function fixture(name) { const x = await f.fixture('en', 'edit-' + run + '-' + name, { skipInvite: true }); await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { status: 'DRAFT', approvedById: null, approvedAt: null } }); return x; }
const order = x => db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId }, include: { lines: true } });
const read = x => service.getPurchaseOrderById(x.purchaseOrderId, x.organizationId);
async function command(x, viewed, patch, key = crypto.randomUUID()) { return { id: x.purchaseOrderId, organizationId: x.organizationId, updatedById: x.actorId, sessionId: x.sessionId, sessionToken: (await db.session.findUniqueOrThrow({ where: { id: x.sessionId } })).token, expectedRevision: viewed.editRevision || '0'.repeat(64), idempotencyKey: key, ...patch }; }
async function check(name, work) { try { report.checks.push({ name, status: 'passed', ...await work() }); } catch (error) { report.checks.push({ name, status: 'failed', error: f.safe(error) }); throw error; } }
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await f.stable();
  const transaction = db.$transaction.bind(db);
  db.$transaction = (callback, options) => transaction(tx => callback(new Proxy(tx, { get(target, property) {
    if (!['businessEvent', 'auditLog'].includes(property)) return target[property];
    return new Proxy(target[property], { get(model, method) {
      if (fault?.model === property && fault.method === method) return async args => fault.handle(await (fault.read ? model[method](args) : Promise.resolve(args)));
      return method !== 'create' ? model[method] : async args => { try { return await model.create(args); } catch (error) { report.databaseFailure = { name: error.name, code: error.code, message: f.safe(String(error.message).split('\n').slice(-5).join('\n')) }; throw error; } };
    } });
  } })), options);
  await check('A second stale draft cannot overwrite a first editor save', async () => {
    const x = await fixture('stale'), viewed = await read(x), first = await command(x, viewed, { notes: 'First reviewed terms' }), second = await command(x, viewed, { notes: 'Stale second terms' });
    await service.updatePurchaseOrder(first); const before = f.hash(await order(x)); let error;
    try { await service.updatePurchaseOrder(second); } catch (caught) { error = caught; }
    if (!baseline) { assert.equal(error?.code, 'CONFLICT'); assert.equal(f.hash(await order(x)), before); }
    return { rejected: !!error, code: error?.code, firstTermsPreserved: (await order(x)).notes === 'First reviewed terms' };
  });
  await check('Retrying one exact save produces one retained result without repeated line effects', async () => {
    const x = await fixture('retry'), viewed = await read(x), po = await order(x), input = await command(x, viewed, { notes: 'Save once', orderLines: [{ itemId: po.lines[0].itemId, quantity: 10, unitPrice: 2500, taxRate: 0, discount: 0, notes: '' }] });
    const first = await service.updatePurchaseOrder(input), before = f.hash(await order(x)), second = await service.updatePurchaseOrder(input);
    const lineAudits = await db.auditLog.count({ where: { organizationId: x.organizationId, entityId: x.purchaseOrderId, action: 'RECONCILE_PURCHASE_ORDER_LINES' } });
    if (!baseline) { assert.equal(second.editReceipt.replayed, true); assert.equal(second.editReceipt.revision, first.editReceipt.revision); assert.equal(f.hash(await order(x)), before); assert.equal(lineAudits, 1); }
    return { retainedReceipt: !!second.editReceipt, lineAudits, unchangedOnRetry: f.hash(await order(x)) === before };
  });
  await check('Revoked current update permission prevents a service save', async () => {
    const x = await fixture('role'), input = await command(x, await read(x), { notes: 'Denied role edit' }); await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read'] } }); const before = f.hash(await order(x)); let error;
    try { await service.updatePurchaseOrder(input); } catch (caught) { error = caught; }
    if (!baseline) { assert.equal(error?.code, 'FORBIDDEN'); assert.equal(f.hash(await order(x)), before); }
    return { rejected: !!error, unchanged: f.hash(await order(x)) === before };
  });
  await check('Revoked session prevents a service save', async () => {
    const x = await fixture('session'), input = await command(x, await read(x), { notes: 'Denied revoked session edit' }); await db.session.delete({ where: { id: x.sessionId } }); const before = f.hash(await order(x)); let error;
    try { await service.updatePurchaseOrder(input); } catch (caught) { error = caught; }
    if (!baseline) { assert.equal(error?.code, 'FORBIDDEN'); assert.equal(f.hash(await order(x)), before); }
    return { rejected: !!error, unchanged: f.hash(await order(x)) === before };
  });
  if (!baseline) {
    await check('Managed empty, read-only, expired and suspended purchasing access denies drafts and comparison reads', async () => {
      const x = await fixture('grants'), input = await command(x, await read(x), { notes: 'Managed access denied' }), before = f.hash(await order(x));
      await db.tenantModuleConfiguration.create({ data: { organizationId: x.organizationId, manifestHash: 'owned-' + run } });
      await assert.rejects(service.updatePurchaseOrder(input), error => error.code === 'FORBIDDEN');
      const grant = await db.tenantModuleGrant.create({ data: { organizationId: x.organizationId, moduleSlug: 'purchasing', status: 'active', source: 'manual_override', metadata: { verificationOnly: true }, readOnly: true } });
      for (const patch of [{ readOnly: true }, { readOnly: false, endsAt: new Date(Date.now() - 1000) }, { endsAt: null, status: 'suspended' }]) {
        await db.tenantModuleGrant.update({ where: { id: grant.id }, data: patch });
        await assert.rejects(service.updatePurchaseOrder(input), error => error.code === 'FORBIDDEN'); await assert.rejects(service.getPurchaseOrderDraftForActor(x.purchaseOrderId, input), error => error.code === 'FORBIDDEN');
      }
      assert.equal(f.hash(await order(x)), before); return { deniedAccessCases: 4, unchanged: true };
    });
    await check('Concurrent editors commit one reviewed revision; simultaneous exact requests replay one effect', async () => {
      const x = await fixture('concurrent'), viewed = await read(x), first = await command(x, viewed, { notes: 'Contender one' }), second = await command(x, viewed, { notes: 'Contender two' });
      const outcomes = await Promise.allSettled([service.updatePurchaseOrder(first), service.updatePurchaseOrder(second)]);
      assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1); assert.equal(outcomes.find(r => r.status === 'rejected').reason.code, 'CONFLICT');
      const retryInput = await command(x, await read(x), { notes: 'One concurrent exact save' }), saved = await Promise.all([service.updatePurchaseOrder(retryInput), service.updatePurchaseOrder(retryInput)]);
      assert.equal(saved.filter(r => r.editReceipt.replayed).length, 1); assert.equal(saved[0].editReceipt.revision, saved[1].editReceipt.revision);
      assert.equal(await db.auditLog.count({ where: { organizationId: x.organizationId, action: 'UPDATE_PURCHASE_ORDER_DRAFT' } }), 2);
      return { staleRejected: 1, exactReplay: 1, committedDraftAudits: 2 };
    });
    await check('Save references bind the original command, object and actor; credentials are excluded from retained evidence', async () => {
      const x = await fixture('binding'), input = await command(x, await read(x), { notes: 'Original bound request' }); await service.updatePurchaseOrder(input);
      const before = f.hash(await order(x)); await assert.rejects(service.updatePurchaseOrder({ ...input, notes: 'Different payload' }), error => error.code === 'IDEMPOTENCY_CONFLICT');
      const po = await order(x), other = await db.purchaseOrder.create({ data: { organizationId: x.organizationId, supplierId: po.supplierId, locationId: po.locationId, createdById: x.actorId, orderNumber: po.orderNumber + '-OTHER', status: 'DRAFT', orderDate: po.orderDate } });
      await assert.rejects(service.updatePurchaseOrder({ ...input, id: other.id }), error => error.code === 'IDEMPOTENCY_CONFLICT');
      const actor = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned alternate editor', email: 'alternate-edit-' + run + '@example.invalid', isActive: true, isVerified: true, roles: { connect: { id: x.roleId } } } });
      const session = await db.session.create({ data: { userId: actor.id, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 60000) } });
      await assert.rejects(service.updatePurchaseOrder({ ...input, updatedById: actor.id, sessionId: session.id, sessionToken: session.token }), error => error.code === 'IDEMPOTENCY_CONFLICT');
      assert.equal(f.hash(await order(x)), before);
      const events = await db.businessEvent.findMany({ where: { organizationId: x.organizationId } }), audits = await db.auditLog.findMany({ where: { organizationId: x.organizationId } }), serialized = JSON.stringify({ events, audits });
      for (const privateValue of [input.sessionId, input.sessionToken, session.token]) assert.ok(!serialized.includes(privateValue));
      assert.equal(events.length, 1); assert.equal(events[0].status, 'APPLIED'); assert.ok(events[0].processedAt); assert.equal(events[0].sourceType, null);
      return { changedPayloadRejected: true, otherOrderRejected: true, otherActorRejected: true, credentialsRetained: false };
    });
    await check('Revision detects a changed line even when the header timestamp is unchanged', async () => {
      const x = await fixture('line-revision'), input = await command(x, await read(x), { notes: 'Old line snapshot' }), header = await order(x);
      await db.purchaseOrderLine.update({ where: { id: x.lineId }, data: { notes: 'Competing line change' } }); assert.equal((await order(x)).updatedAt.toISOString(), header.updatedAt.toISOString());
      const state = f.hash(await order(x)); await assert.rejects(service.updatePurchaseOrder(input), error => error.code === 'CONFLICT'); assert.equal(f.hash(await order(x)), state); return { changedLineRejected: true, headerTimestampUnchanged: true };
    });
    await check('Invalid session, expired session, unusable account, inactive organization and missing read permission are denied', async () => {
      const denied = [];
      for (const reason of ['wrong-token', 'expired-session', 'inactive-account', 'locked-account', 'inactive-organization', 'missing-read']) {
        const x = await fixture(reason), input = await command(x, await read(x), { notes: reason });
        if (reason === 'wrong-token') input.sessionToken = 'not-the-issued-token';
        if (reason === 'expired-session') await db.session.update({ where: { id: x.sessionId }, data: { expiresAt: new Date(Date.now() - 1000) } });
        if (reason === 'inactive-account') await db.user.update({ where: { id: x.actorId }, data: { isActive: false } });
        if (reason === 'locked-account') await db.user.update({ where: { id: x.actorId }, data: { isLocked: true, lockedUntil: new Date(Date.now() + 60000) } });
        if (reason === 'inactive-organization') await db.organization.update({ where: { id: x.organizationId }, data: { isActive: false } });
        if (reason === 'missing-read') await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.update'] } });
        const before = f.hash(await order(x)); await assert.rejects(service.updatePurchaseOrder(input), error => error.code === (reason === 'inactive-organization' ? 'NOT_FOUND' : 'FORBIDDEN')); assert.equal(f.hash(await order(x)), before); denied.push(reason);
      }
      return { denied };
    });
    await check('Cross-tenant draft and comparison reads are rejected without exposing the foreign order', async () => {
      const x = await fixture('scope-a'), y = await fixture('scope-b'), input = await command(x, await read(x), { notes: 'Foreign edit', id: y.purchaseOrderId }), before = f.hash(await order(y));
      await assert.rejects(service.updatePurchaseOrder(input), error => error.code === 'NOT_FOUND');
      await assert.rejects(service.getPurchaseOrderDraftForActor(y.purchaseOrderId, input), error => error.code === 'NOT_FOUND'); assert.equal(f.hash(await order(y)), before); return { foreignEditRejected: true, foreignReadRejected: true };
    });
    await check('Audit or event failure rolls back header, lines and receipt; an unchanged request then safely retries', async () => {
      for (const model of ['auditLog', 'businessEvent']) {
        const x = await fixture('rollback-' + model), input = await command(x, await read(x), { notes: 'Must roll back', orderLines: [] }), state = f.hash(await order(x));
        fault = { model, method: 'create', handle: () => { throw new Error('Owned deliberate evidence-write fault'); } };
        try { await assert.rejects(service.updatePurchaseOrder(input), error => model === 'auditLog' ? error.message === 'Owned deliberate evidence-write fault' : error.message === 'Business event could not be recorded.'); } finally { fault = undefined; }
        assert.equal(f.hash(await order(x)), state); assert.equal(await db.auditLog.count({ where: { organizationId: x.organizationId } }), 0); assert.equal(await db.businessEvent.count({ where: { organizationId: x.organizationId } }), 0);
        const result = await service.updatePurchaseOrder(input); assert.equal(result.editReceipt.replayed, false); assert.equal(result.lines.length, 0);
      }
      return { rollbackCases: 2, exactRetryAfterRollback: true };
    });
    await check('Receipt recovery returns the original receipt after a later save and rechecks current authority', async () => {
      const x = await fixture('receipt-later'), input = await command(x, await read(x), { notes: 'Original saved terms' }), first = await service.updatePurchaseOrder(input);
      await service.updatePurchaseOrder(await command(x, await read(x), { notes: 'Later saved terms' })); const state = f.hash(await order(x)), replay = await service.updatePurchaseOrder(input);
      assert.equal(replay.notes, 'Later saved terms'); assert.equal(replay.editReceipt.revision, first.editReceipt.revision); assert.equal(replay.editReceipt.replayed, true); assert.equal(f.hash(await order(x)), state);
      await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read'] } }); await assert.rejects(service.updatePurchaseOrder(input), error => error.code === 'FORBIDDEN'); assert.equal(f.hash(await order(x)), state);
      return { originalReceiptRecovered: true, laterTermsPreserved: true, replayAfterRevocationDenied: true };
    });
    await check('Altered or unapplied receipts fail verification without changing durable evidence', async () => {
      const x = await fixture('receipt-integrity'), input = await command(x, await read(x), { notes: 'Verified receipt' }); await service.updatePurchaseOrder(input); const state = f.hash(await order(x));
      for (const change of [event => ({ ...event, payloadHash: '0'.repeat(64) }), event => ({ ...event, status: 'RECEIVED' }), event => ({ ...event, payload: { ...event.payload, result: { ...event.payload.result, savedAt: 'invalid' } } })]) {
        fault = { model: 'businessEvent', method: 'findUnique', read: true, handle: change };
        try { await assert.rejects(service.updatePurchaseOrder(input), error => ['CONFLICT', 'IDEMPOTENCY_CONFLICT'].includes(error.code)); } finally { fault = undefined; }
        assert.equal(f.hash(await order(x)), state);
      }
      assert.equal((await service.updatePurchaseOrder(input)).editReceipt.replayed, true); return { rejectedAlteredReadCases: 3, immutableEvidenceUntouched: true };
    });
    await check('Missing revision and request reference fail before any record or evidence change', async () => {
      const x = await fixture('missing'), input = await command(x, await read(x), { notes: 'Missing protocol fields' }), state = f.hash(await order(x));
      for (const key of ['expectedRevision', 'idempotencyKey', 'sessionId', 'sessionToken']) { const invalid = { ...input }; delete invalid[key]; await assert.rejects(service.updatePurchaseOrder(invalid), error => error.name === 'ZodError'); }
      assert.equal(f.hash(await order(x)), state); assert.equal(await db.auditLog.count({ where: { organizationId: x.organizationId } }), 0); return { missingFieldsRejected: 4 };
    });
  }
  report.originalUnchanged = report.originalBefore === await f.stable(); assert.ok(report.originalUnchanged); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); assert.ok(report.sourceStable);
})().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); const file = 'purchase-order-edit-' + report.mode + '-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ file, checks: report.checks, error: report.error, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged })); });
