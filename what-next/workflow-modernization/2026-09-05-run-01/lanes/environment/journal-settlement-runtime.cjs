// New owned-local verifier. Historical drivers and receipts are not modified.
// Direct-service synthetic claims are not proof of authenticated transport or
// professional approval. Actual services must produce every business status.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. --run requires coordinator source freeze and DB lane release.');
} else {
  const h = require('./close-pack-write-race-runtime.cjs');
  const { f, db, root, helper, organizations } = h;
  const { fs, path, crypto, assert } = f;
  const { PrismaClient, Prisma } = require('@prisma/client');
  const load = file => require(path.join(root, file));
  const pos = load('services/pos/pos.service.ts');
  const { collectCustomerSettlementWithControls: collect } = load('services/accounting/customer-settlement.service.ts');
  const { reverseCustomerSettlementWithControls: reverse } = load('services/accounting/customer-settlement-reversal.service.ts');
  const { runCloseAssurance, getCloseAssuranceDashboard } = load('services/accounting/close-assurance.service.ts');
  const { exportClosePack } = load('services/accounting/close-assurance-pack.service.ts');
  const { createFiscalYearWithPeriods } = load('services/accounting/periods.service.ts');
  const { getCloseReadinessSnapshot } = load('services/snapshots/close-readiness-snapshot.service.ts');
  const { getCashCommandData } = load('services/cash-command/cash-command.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const stamp = crypto.randomUUID();
  const report = {
    run: stamp, at: new Date().toISOString(), checks: [], fixtures: [],
    scope: 'Exact owned loopback disposable database. Synthetic master data plus actual POS ON_ACCOUNT sale, closed shift, customer settlement collection, independent compensating reversal, Close assessment and system certification. Expected financial effects are measured, not suppressed. No migrations, seeds, provider calls, delivery worker, live customer activation or external effects.',
    limitations: ['Direct-service synthetic authority does not prove authenticated action/session handling.', 'The receivable recipe uses a nonstock item and non-class-3 settlement accounts. Separate journal-class3-runtime.cjs verification owns cumulative class-3 scope.', 'No financial, statutory, security or overall release certification is claimed.'],
  };
  const evidenceDirectory = path.join(__dirname, 'journal-settlement-inputs-' + stamp);
  const loadedFiles = [...new Set([__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(loadedFiles.map(file => [path.relative(root, file).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])) });
  const extraModels = ['customer', 'customerLedgerEntry', 'customerSettlement', 'customerSettlementAllocation', 'customerReceivableDocument', 'customerReceivableDocumentState', 'salesOrder', 'pOSSession', 'pOSCommitResult', 'location', 'pOSStation', 'item'];
  const financialModels = ['customer', 'customerLedgerEntry', 'customerSettlement', 'customerSettlementAllocation', 'customerReceivableDocument', 'customerReceivableDocumentState', 'salesOrder', 'payment', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'inventoryTransaction', 'pOSSession', 'pOSCommitResult'];
  const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; };
  async function bounded(promise, label, ms = 25000) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out; scenario unverified')), ms); })]); } finally { clearTimeout(timer); } }
  function prerequisite(message, details) { const error = new Error(message); error.prerequisite = details; return error; }
  async function guard() { await assertDisposableDatabaseIdentity(db, helper.database); await helper.withClient(f.target, helper.assertOwned); }
  async function outside() {
    const inherited = await h.outside(), models = {}, where = { organizationId: { notIn: organizations } };
    for (const model of extraModels) { const rows = await db[model].findMany({ where, orderBy: { id: 'asc' } }); models[model] = { count: rows.length, hash: f.hash(rows) }; }
    const children = {
      salesOrderLine: { salesOrder: where }, cashDrawer: { terminal: where }, cashDrawerTransaction: { cashDrawer: { terminal: where } }, inventoryLevel: { item: where },
    };
    for (const [model, childWhere] of Object.entries(children)) { const rows = await db[model].findMany({ where: childWhere, orderBy: { id: 'asc' } }); models[model] = { count: rows.length, hash: f.hash(rows) }; }
    return { hash: f.hash({ inherited: inherited.hash, models }), inherited, models };
  }
  async function financial(x) {
    const rows = {}, scope = { organizationId: x.organizationId };
    for (const model of financialModels) rows[model] = await db[model].findMany({ where: scope, orderBy: { id: 'asc' } });
    for (const [model, where] of Object.entries({ salesOrderLine: { salesOrder: scope }, cashDrawer: { terminal: scope }, cashDrawerTransaction: { cashDrawer: { terminal: scope } }, inventoryLevel: { item: scope } })) rows[model] = await db[model].findMany({ where, orderBy: { id: 'asc' } });
    return { hash: f.hash(rows), rows, models: Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, { count: value.length, hash: f.hash(value) }])) };
  }
  async function retained(x) {
    const scope = { organizationId: x.organizationId, closeRunId: x.closeRunId }, rows = {};
    for (const model of ['closeEvidenceItem', 'closeChecklistItem', 'closeAssuranceFinding']) rows[model] = await db[model].findMany({ where: scope, orderBy: { id: 'asc' } });
    const artifact = await db.closePackExport.findFirstOrThrow({ where: { ...scope, id: x.exportId } });
    const { metadata, updatedAt, ...immutableArtifact } = artifact;
    return { historyHash: f.hash(rows), artifactHash: f.hash(immutableArtifact), metadata };
  }
  async function assessment(x, label) {
    const value = await runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'owned-settlement-' + label + '-' + crypto.randomUUID() }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'], now: new Date() });
    const run = await db.closeRun.findFirstOrThrow({ where: { organizationId: x.organizationId, id: value.run.id } });
    if (run.status !== 'READY' || run.metadata?.trustLevel !== 'T4') throw prerequisite('Actual assessment did not reach READY/T4', { organizationId: x.organizationId, closeRunId: run.id, status: run.status, trustLevel: run.metadata?.trustLevel, blockers: value.currentProof?.blockers });
    return { ...x, closeRunId: run.id };
  }
  async function certify(x) {
    const at = new Date();
    const result = await exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED', correlationId: 'owned-settlement-pack-' + crypto.randomUUID() }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at });
    assert.equal(result.isCertified, true); return { ...x, exportId: result.exportId };
  }
  async function observe(x) {
    const period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, id: x.periodId } });
    const input = { organizationId: x.organizationId, periodStart: period.startDate, periodEnd: period.endDate, now: new Date() };
    const before = await financial(x);
    const snapshot = await getCloseReadinessSnapshot(input);
    const cash = await getCashCommandData({ ...input, actorId: x.certifierId, actorPermissions: ['dashboard.read', 'accounting.close.read'], actorRoleCodes: ['administrator'] });
    const selected = await getCloseAssuranceDashboard(x.organizationId, x.periodId, x.closeRunId);
    const trust = cash.trustSignals.find(row => row.id === 'close_readiness'); assert.ok(trust);
    assert.equal(trust.evidenceGrade, snapshot.evidenceGrade);
    assert.equal((await financial(x)).hash, before.hash, 'Cash/Close reads must not mutate financial records');
    return { aggregateGrade: snapshot.evidenceGrade, cashGrade: trust.evidenceGrade, selectedGrade: selected.currentProof.grade, blockers: snapshot.blockers.map(row => ({ id: row.id, severity: row.severity })), selectedBlockers: selected.currentProof.blockers.map(row => ({ id: row.id, severity: row.severity })) };
  }
  function saveEvidence(label, value) {
    fs.mkdirSync(evidenceDirectory, { recursive: true }); const filename = label + '-' + crypto.randomUUID() + '.json';
    const bytes = JSON.stringify(value, null, 2) + '\n', file = path.join(evidenceDirectory, filename); fs.writeFileSync(file, bytes, { flag: 'wx' });
    return { file: path.relative(root, file).replaceAll('\\', '/'), hash: crypto.createHash('sha256').update(bytes).digest('hex') };
  }
  async function fixture(label) {
    await guard();
    let x = await h.fixture('settlement-' + label);
    const scope = { organizationId: x.organizationId }, checkerId = x.info.actorIds.checker;
    await db.role.create({ data: { ...scope, code: 'owned-settlement-operator', nameEn: 'Synthetic local settlement operator', permissions: ['pos.use', 'finance.receivables.collect', 'finance.receivables.reverse'], users: { connect: [{ id: x.makerId }, { id: checkerId }] } } });
    await db.role.create({ data: { ...scope, code: 'administrator', nameEn: 'Synthetic local Cash observer', permissions: ['dashboard.read', 'accounting.close.read'], users: { connect: { id: x.certifierId } } } });
    const location = await db.location.create({ data: { ...scope, code: 'OWNED', name: 'Synthetic local store' } });
    const terminal = await db.pOSStation.create({ data: { ...scope, locationId: location.id, terminalNumber: 'OWNED', name: 'Synthetic local till' } });
    const customer = await db.customer.create({ data: { ...scope, name: 'Synthetic receivable customer', code: 'OWNED-CUSTOMER', creditLimit: '1000.00', paymentTerms: 30, isActive: true } });
    const item = await db.item.create({ data: { ...scope, slug: 'owned-service', sku: 'OWNED-SERVICE', nameEn: 'Synthetic service', nameFr: 'Service de verification', sellingPrice: '100.00', costPrice: '0.00', trackInventory: false, imageUrls: [] } });
    const ctx = { ...scope, userId: x.makerId, locationId: location.id, terminalId: terminal.id };
    const shift = await pos.openPOSShift({ ...ctx, openingBalance: 0 }); ctx.sessionId = shift.id;
    const cart = await pos.addPOSCartLine({ ...ctx, itemId: item.id, quantity: 1 });
    const sale = await pos.commitPOSSale({ ...ctx, salesOrderId: cart.id, expectedCartRevision: cart.revision, clientCommitId: 'owned-on-account-' + crypto.randomUUID(), customerId: customer.id, tenders: [{ method: 'ON_ACCOUNT', amount: 100 }], receipt: { channel: 'NONE' } });
    assert.equal(sale.status, 'COMPLETED');
    await pos.closePOSShift({ ...ctx, actualBalance: '0' });
    assert.equal((await db.pOSSession.findUniqueOrThrow({ where: { id: shift.id } })).status, 'CLOSED');
    const document = await db.customerReceivableDocument.findFirstOrThrow({ where: { ...scope, sourceSalesOrderId: cart.id } });
    const unpaid = await db.customerReceivableDocumentState.findFirstOrThrow({ where: { ...scope, documentId: document.id }, orderBy: { version: 'desc' } });
    assert.equal(unpaid.unpaidAmount.toFixed(2), '100.00');
    const collectionDocument = saveEvidence(label + '-collection-document', { synthetic: true, organizationId: x.organizationId, salesOrderId: cart.id, customerId: customer.id, amount: '100.00', currency: 'XAF', method: 'CASH' });
    const collectionEvidence = saveEvidence(label + '-collection-evidence', { synthetic: true, documentHash: collectionDocument.hash, actorId: x.makerId, observedAt: new Date().toISOString() });
    const at = new Date();
    const collected = await collect({ customerId: customer.id, method: 'CASH', amount: '100.00', settlementDate: at, idempotencyKey: 'owned-collection-' + crypto.randomUUID(), correlationId: 'owned-collection-correlation-' + crypto.randomUUID(), documentHash: collectionDocument.hash, evidenceHash: collectionEvidence.hash, allocations: [{ salesOrderId: cart.id, amount: '100.00' }] }, { ...scope, actorId: x.makerId, actorPermissions: ['finance.receivables.collect'], lastAuthAt: at, now: at }, db);
    assert.equal(collected.settlement.status, 'POSTED'); assert.equal(collected.settlement.receivedById, x.makerId);
    x = { ...x, label, checkerId, customerId: customer.id, documentId: document.id, salesOrderId: cart.id, settlementId: collected.settlementId, originalJournalEntryId: collected.journalEntryId };
    x = await certify(await assessment(x, label + '-collected'));
    const reversalDocument = saveEvidence(label + '-reversal-document', { synthetic: true, organizationId: x.organizationId, settlementId: x.settlementId, reason: 'Synthetic local duplicate collection correction', amount: '100.00', currency: 'XAF' });
    const reversalEvidence = saveEvidence(label + '-reversal-evidence', { synthetic: true, documentHash: reversalDocument.hash, independentActorId: checkerId, createdAt: new Date().toISOString() });
    x.command = { customerSettlementId: x.settlementId, reversalDate: new Date(), reason: 'Synthetic local duplicate collection correction', idempotencyKey: 'owned-reversal-' + crypto.randomUUID(), correlationId: 'owned-reversal-correlation-' + crypto.randomUUID(), documentHash: reversalDocument.hash, evidenceHash: reversalEvidence.hash };
    report.fixtures.push({ organizationId: x.organizationId, label, customerId: x.customerId, salesOrderId: x.salesOrderId, documentId: x.documentId, settlementId: x.settlementId, periodId: x.periodId, closeRunId: x.closeRunId, exportId: x.exportId, actorIds: x.info.actorIds, evidence: [collectionDocument, collectionEvidence, reversalDocument, reversalEvidence], sourceRecipe: 'Actual POS ON_ACCOUNT -> closed shift -> collection -> READY/T4 -> certified pack' });
    return x;
  }
  function control(x) { const at = new Date(); return { organizationId: x.organizationId, actorId: x.checkerId, actorPermissions: ['finance.receivables.reverse'], freshAuth: { lastAuthAt: at, claims: { userId: x.checkerId, tenantId: x.organizationId, assuranceOrganizationId: x.organizationId, assuranceLevel: 1, lastAuthAt: at.getTime() } } }; }
  async function writerClient() { const client = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 45000, maxWait: 10000 } }); await assertDisposableDatabaseIdentity(client, helper.database); return client; }
  function observedClient(x, writer, mode) {
    const state = { attempts: [], held: deferred(), release: deferred(), firstPaused: false, faultInjected: false };
    const client = new Proxy({}, { get(_target, property) {
      // Fresh-reader queries use an independent root client, never the held tx.
      if (property !== '$transaction') { const value = Reflect.get(db, property); return typeof value === 'function' ? value.bind(db) : value; }
      return async (work, options) => {
        assert.equal(options?.isolationLevel, 'Serializable');
        const attempt = { number: state.attempts.length + 1, status: 'started', financialWrites: [], locks: [] }; state.attempts.push(attempt);
        try {
          const result = await writer.$transaction(async tx => {
            const identity = (await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database, txid_current_snapshot()::text AS snapshot'))[0];
            assert.equal(identity.database, helper.database); Object.assign(attempt, { pid: identity.pid, snapshot: identity.snapshot });
            const observed = new Proxy(tx, { get(target, key) {
              if (key === '$queryRaw') return async (...args) => { const sql = args.map(arg => typeof arg === 'string' ? arg : arg?.sql || arg?.text || arg?.strings?.join('?') || '').join(' '); if (sql.includes('pg_advisory_xact_lock') || sql.includes('pg_advisory_xact_lock_shared')) attempt.locks.push(sql.includes('_shared') ? 'catalog-shared' : 'assessment-period'); return target.$queryRaw(...args); };
              if (['customerSettlement', 'customerLedgerEntry', 'journalEntry'].includes(key)) return new Proxy(target[key], { get(model, method) {
                if (key === 'customerSettlement' && method === 'findFirst') return async args => { const value = await model.findFirst(args); if (!state.firstPaused && attempt.number === 1 && ['catalog', 'publication'].includes(mode) && args.where?.organizationId === x.organizationId && args.where?.id === x.settlementId && args.include?.allocations) { state.firstPaused = true; state.held.resolve(attempt); await bounded(state.release.promise, 'old Serializable source snapshot release', 35000); } return value; };
                if (method === 'create') return async args => { const value = await model.create(args); attempt.financialWrites.push({ model: key, id: value.id }); if (mode === 'rollback' && key === 'journalEntry' && !state.faultInjected) { state.faultInjected = true; throw new Error('Owned injected fault after actual reversal journal creation'); } return value; };
                return Reflect.get(model, method);
              } });
              return Reflect.get(target, key);
            } });
            return work(observed);
          }, { ...options, timeout: 45000 });
          attempt.status = 'committed'; return result;
        } catch (error) { attempt.status = 'rolled-back'; attempt.errorName = error.name; attempt.errorCode = error.code || null; throw error; }
      };
    } });
    return { client, state };
  }
  async function assertReversal(x, result, before, oldHistory) {
    assert.equal(result.replayed, false);
    const after = await financial(x), settlement = after.rows.customerSettlement.find(row => row.id === x.settlementId);
    const without = (row, fields) => Object.fromEntries(Object.entries(row).filter(([key]) => !fields.includes(key)));
    const settlementChanges = ['status', 'reversedAt', 'reversalDate', 'reversedById', 'reversalReason', 'reversalIdempotencyKey', 'reversalIdempotencyPayloadHash', 'reversalCorrelationId', 'reversalDocumentHash', 'reversalEvidenceHash', 'reversalLedgerPostingBatchId', 'reversalJournalEntryId', 'reversalAccountingSourceLinkId', 'reversalBusinessEventId', 'updatedAt'];
    for (const [model, savedRows] of Object.entries(before.rows)) {
      const currentById = new Map(after.rows[model].map(row => [row.id, row]));
      for (const saved of savedRows) {
        const current = currentById.get(saved.id); assert.ok(current, model + ' existing row must be retained');
        const allowed = model === 'customer' && saved.id === x.customerId ? ['currentBalance', 'updatedAt']
          : model === 'customerSettlement' && saved.id === x.settlementId ? settlementChanges
            : model === 'customerSettlementAllocation' && saved.customerSettlementId === x.settlementId ? ['reversalCustomerLedgerEntryId']
              : model === 'journalEntry' && saved.id === x.originalJournalEntryId ? ['status', 'reversedAt', 'reversedById', 'updatedAt'] : [];
        assert.deepEqual(without(current, allowed), without(saved, allowed), model + ' existing evidence changed outside the explicit reversal fields');
      }
    }
    for (const model of ['customer', 'customerSettlement', 'customerSettlementAllocation', 'customerReceivableDocument']) assert.equal(after.rows[model].length, before.rows[model].length, model + ' identities must not be added or removed');
    assert.equal(settlement.status, 'REVERSED'); assert.equal(settlement.reversedById, x.checkerId); assert.equal(settlement.reversalJournalEntryId, result.reversalJournalEntryId);
    assert.equal(settlement.reversalDate.toISOString(), x.command.reversalDate.toISOString()); assert.equal(settlement.reversalReason, x.command.reason);
    assert.equal(settlement.reversalIdempotencyKey, x.command.idempotencyKey); assert.equal(settlement.reversalCorrelationId, x.command.correlationId);
    assert.equal(settlement.reversalDocumentHash, x.command.documentHash); assert.equal(settlement.reversalEvidenceHash, x.command.evidenceHash);
    assert.equal(settlement.reversalLedgerPostingBatchId, result.reversalPostingBatchId); assert.equal(settlement.reversalAccountingSourceLinkId, result.reversalSourceLinkId); assert.equal(settlement.reversalBusinessEventId, result.reversalBusinessEventId);
    assert.ok(settlement.reversedAt instanceof Date); assert.match(settlement.reversalIdempotencyPayloadHash, /^[a-f0-9]{64}$/);
    const customerBefore = before.rows.customer.find(row => row.id === x.customerId), customerAfter = after.rows.customer.find(row => row.id === x.customerId);
    assert.equal(customerAfter.currentBalance.minus(customerBefore.currentBalance).toFixed(2), '100.00');
    const states = after.rows.customerReceivableDocumentState.filter(row => row.documentId === x.documentId).sort((a, b) => b.version - a.version);
    assert.equal(states[0].paidAmount.toFixed(2), '0.00'); assert.equal(states[0].unpaidAmount.toFixed(2), '100.00');
    const original = await db.journalEntry.findFirstOrThrow({ where: { organizationId: x.organizationId, id: x.originalJournalEntryId }, include: { lines: { orderBy: { lineNumber: 'asc' } } } });
    const mirrored = await db.journalEntry.findFirstOrThrow({ where: { organizationId: x.organizationId, id: result.reversalJournalEntryId }, include: { lines: { orderBy: { lineNumber: 'asc' } } } });
    assert.equal(original.status, 'REVERSED'); assert.equal(original.reversedById, x.checkerId); assert.equal(original.reversedAt.toISOString(), settlement.reversedAt.toISOString());
    assert.equal(mirrored.status, 'POSTED'); assert.equal(mirrored.reversalOfEntryId, original.id); assert.equal(mirrored.lines.length, original.lines.length);
    for (let i = 0; i < original.lines.length; i++) { const left = original.lines[i], right = mirrored.lines[i]; for (const key of ['accountId', 'lineNumber', 'currency', 'locationId', 'customerId', 'supplierId', 'itemId']) assert.equal(right[key], left[key]); assert.ok(right.debit.eq(left.credit)); assert.ok(right.credit.eq(left.debit)); assert.ok(right.baseDebit.eq(left.baseCredit ?? left.credit)); assert.ok(right.baseCredit.eq(left.baseDebit ?? left.debit)); }
    assert.equal(mirrored.lines.reduce((total, row) => total.plus(row.debit).minus(row.credit), new Prisma.Decimal(0)).toFixed(2), '0.00');
    for (const model of ['journalEntry', 'ledgerPostingBatch', 'accountingSourceLink', 'customerLedgerEntry', 'customerReceivableDocumentState']) assert.equal(after.rows[model].length - before.rows[model].length, 1, model + ' must have exactly one compensating addition');
    assert.equal(after.rows.journalEntryLine.length - before.rows.journalEntryLine.length, original.lines.length);
    const allocations = after.rows.customerSettlementAllocation.filter(row => row.customerSettlementId === x.settlementId);
    assert.equal(allocations.length, 1); assert.ok(allocations[0].amount.eq('100.00'));
    assert.deepEqual(allocations.map(row => row.reversalCustomerLedgerEntryId), result.reversalCustomerLedgerEntryIds);
    const compensation = after.rows.customerLedgerEntry.find(row => row.id === allocations[0].reversalCustomerLedgerEntryId); assert.ok(compensation);
    assert.equal(compensation.type, 'PAYMENT_REVERSAL'); assert.equal(compensation.customerId, x.customerId); assert.equal(compensation.referenceType, 'CUSTOMER_RECEIVABLE_DOCUMENT'); assert.equal(compensation.referenceId, x.documentId);
    assert.ok(compensation.debit.eq('100.00')); assert.ok(compensation.credit.eq(0));
    for (const model of ['payment', 'inventoryTransaction', 'inventoryLevel', 'salesOrder', 'salesOrderLine', 'pOSSession', 'pOSCommitResult', 'cashDrawer', 'cashDrawerTransaction']) assert.equal(after.models[model].hash, before.models[model].hash, model + ' must remain unchanged by settlement reversal');
    const event = await db.businessEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, id: settlement.reversalBusinessEventId }, include: { outboxMessages: true } }); assert.equal(event.status, 'APPLIED'); assert.equal(event.eventType, 'customer.settlement.reversed'); assert.equal(event.outboxMessages.length, 1);
    const old = await db.closeRun.findFirstOrThrow({ where: { organizationId: x.organizationId, id: x.closeRunId } }); assert.equal(old.status, 'BLOCKED'); assert.equal(old.metadata.staleState.status, 'EVIDENCE_STALE');
    const history = await retained(x); assert.equal(history.historyHash, oldHistory.historyHash); assert.equal(history.artifactHash, oldHistory.artifactHash); assert.equal(history.metadata.staleState.status, 'EVIDENCE_STALE');
    return { before: { hash: before.hash, models: before.models }, after: { hash: after.hash, models: after.models }, existingFinancialEvidencePreserved: true, customerBalanceDelta: '100.00', receivable: { paid: '0.00', unpaid: '100.00' }, originalJournalEntryId: original.id, reversalJournalEntryId: mirrored.id, reversalEventId: event.id, retainedHistoryHash: history.historyHash, retainedArtifactHash: history.artifactHash };
  }
  async function exactReplay(x, result) {
    const before = await financial(x), eventCount = await db.businessEvent.count({ where: { organizationId: x.organizationId } }), outboxCount = await db.businessEventOutbox.count({ where: { organizationId: x.organizationId } });
    const replay = await reverse(x.command, control(x), db); assert.equal(replay.replayed, true);
    assert.deepEqual({ ...replay, replayed: false }, result); assert.equal((await financial(x)).hash, before.hash);
    assert.equal(await db.businessEvent.count({ where: { organizationId: x.organizationId } }), eventCount); assert.equal(await db.businessEventOutbox.count({ where: { organizationId: x.organizationId } }), outboxCount);
    return { financialHash: before.hash, noDuplicateBusinessEventOrOutbox: true, reversalJournalEntryId: replay.reversalJournalEntryId };
  }
  async function recover(x) {
    const before = await financial(x), stale = await observe(x); assert.equal(stale.selectedGrade, 'blocked');
    const fresh = await certify(await assessment(x, x.label + '-recovered'));
    const current = await observe(fresh); assert.equal(current.selectedGrade, 'certified');
    assert.equal((await financial(x)).hash, before.hash);
    return { stale, current, recoveredCloseRunId: fresh.closeRunId, recoveredExportId: fresh.exportId, recoveryHadNoFinancialEffects: true };
  }
  async function ordinary() {
    const x = await fixture('normal'), before = await financial(x), history = await retained(x);
    const result = await reverse(x.command, control(x), db);
    return { organizationId: x.organizationId, ...await assertReversal(x, result, before, history), replay: await exactReplay(x, result), recovery: await recover(x) };
  }
  async function visibility(mode) {
    const x = await fixture(mode), before = await financial(x), history = await retained(x), writer = await writerClient();
    const observed = observedClient(x, writer, mode); let pending;
    try {
      pending = reverse(x.command, control(x), observed.client); pending.catch(() => {});
      const first = await bounded(observed.state.held.promise, 'first attempt source snapshot');
      let concurrent;
      if (mode === 'catalog') {
        const year = new Date().getUTCFullYear() + 3;
        const fiscal = await createFiscalYearWithPeriods(x.organizationId, { name: 'Synthetic future catalog visibility ' + stamp, startDate: new Date(Date.UTC(year, 0, 1)), endDate: new Date(Date.UTC(year, 0, 31, 23, 59, 59, 999)) }, x.makerId);
        concurrent = { fiscalYearId: fiscal.id, periodIds: fiscal.periods.map(row => row.id) }; assert.ok(concurrent.periodIds.length);
      } else {
        const newer = await assessment(x, 'concurrent-publication'); concurrent = { closeRunId: newer.closeRunId }; assert.notEqual(newer.closeRunId, x.closeRunId);
      }
      const observerPid = (await db.$queryRawUnsafe('SELECT pg_backend_pid() AS pid'))[0].pid; assert.notEqual(observerPid, first.pid);
      observed.state.release.resolve();
      const result = await bounded(pending, 'Serializable visibility retry and reversal');
      assert.ok(observed.state.attempts.length >= 2); assert.ok(observed.state.attempts.length <= 3);
      assert.equal(observed.state.attempts[0].status, 'rolled-back'); assert.equal(observed.state.attempts[0].errorName, 'JournalReversalSnapshotChangedError'); assert.equal(observed.state.attempts[0].financialWrites.length, 0);
      assert.equal(observed.state.attempts.at(-1).status, 'committed');
      if (mode === 'publication') { const invalidated = await db.closeRun.findUniqueOrThrow({ where: { id: concurrent.closeRunId } }); assert.equal(invalidated.status, 'BLOCKED'); assert.equal(invalidated.metadata.staleState.status, 'EVIDENCE_STALE'); }
      return { organizationId: x.organizationId, concurrent, observerPid, attempts: observed.state.attempts, ...await assertReversal(x, result, before, history), replay: await exactReplay(x, result), recovery: await recover(x) };
    } finally { observed.state.release.resolve(); if (pending) await pending.catch(() => {}); await writer.$disconnect(); }
  }
  async function rollbackRetry() {
    const x = await fixture('rollback'), before = await financial(x), history = await retained(x), writer = await writerClient(), observed = observedClient(x, writer, 'rollback');
    const evidenceState = async () => {
      const records = {};
      for (const model of ['businessEvent', 'businessEventOutbox', 'businessEventAudit', 'ledgerAuditEvent', 'auditLog', 'closeRun', 'closePackExport']) records[model] = await db[model].findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } });
      return f.hash(records);
    };
    const evidenceBefore = await evidenceState();
    try {
      let failure; try { await reverse(x.command, control(x), observed.client); } catch (error) { failure = error; }
      assert.ok(failure); assert.equal(failure.code, 'INTERNAL_ERROR'); assert.equal(observed.state.faultInjected, true); assert.equal(observed.state.attempts.length, 1); assert.equal(observed.state.attempts[0].status, 'rolled-back');
      assert.ok(observed.state.attempts[0].financialWrites.some(row => row.model === 'journalEntry'));
      assert.equal((await financial(x)).hash, before.hash); assert.deepEqual(await retained(x), history);
      assert.equal(await evidenceState(), evidenceBefore);
      const result = await reverse(x.command, control(x), db);
      return { organizationId: x.organizationId, injectedFailure: { code: failure.code, attempts: observed.state.attempts, rolledBackFinancialHash: before.hash, rolledBackEvidenceHash: evidenceBefore }, ...await assertReversal(x, result, before, history), replay: await exactReplay(x, result) };
    } finally { await writer.$disconnect(); }
  }
  async function runMain() {
    try {
      await guard(); report.sourcesBefore = sources(); report.outsideBefore = await outside();
      for (const [id, work] of [['ordinary-replay-recovery', ordinary], ['serializable-catalog-visibility', () => visibility('catalog')], ['serializable-publication-visibility', () => visibility('publication')], ['atomic-rollback-independent-retry', rollbackRetry]]) {
        const started = Date.now(); try { report.checks.push({ id, status: 'passed', ...await work(), elapsedMs: Date.now() - started }); }
        catch (error) { report.checks.push({ id, status: error.prerequisite ? 'blocked' : 'failed', error: f.safe(error), prerequisite: error.prerequisite, stack: f.safe(error.stack || error), elapsedMs: Date.now() - started }); }
        console.log(JSON.stringify({ id, status: report.checks.at(-1).status, error: report.checks.at(-1).error }));
      }
    } catch (error) { report.error = f.safe(error); }
    finally {
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.sourceStable && report.outsideUnchanged && report.checks.length === 4 && report.checks.every(row => row.status === 'passed');
      const file = path.join(__dirname, 'journal-settlement-runtime-' + stamp + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { fixture, financial, sources, outside, ordinary, visibility, rollbackRetry, runMain };
  if (require.main === module) runMain();
}
