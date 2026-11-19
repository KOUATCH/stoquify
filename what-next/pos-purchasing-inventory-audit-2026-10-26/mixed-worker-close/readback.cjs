// Read-only durable reconciliation for this run's uniquely identified records.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { PrismaClient } = require('@prisma/client');
const f = JSON.parse(fs.readFileSync('.codex-tmp/workflow-closure-private.json', 'utf8')), u = new URL(f.url);
if (u.hostname !== 'localhost' || u.pathname !== '/stoquify_pos_audit_20261026_d30f' || u.searchParams.get('schema') !== 'public') throw Error('Wrong disposable target');
const db = new PrismaClient({ datasourceUrl: f.url }), json = value => JSON.parse(JSON.stringify(value));
const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'combined-reconciliation.json'), 'utf8'));
const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, 'combined-results.json'), 'utf8'));
assert.equal(matrix.tests.length, 18); assert(matrix.tests.every(t => t.status === 'passed'));
assert.equal(source.evidence.length, 22); assert.equal(new Set(source.evidence.map(e => e.scenario)).size, 22);
assert.equal(source.evidence.filter(e => e.final).length, 2); assert.equal(source.evidence.filter(e => e.state).length, 14);
assert(source.evidence.every(e => e.status === 'PASS'));
for (const record of source.evidence) if (!/^audit_mv_receiver_[a-f0-9]{12}$/.test(record.receiverTable)) throw Error('Wrong synthetic receiver table');
(async () => {
  const results = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const rows = [];
    for (const record of source.evidence) {
      if (record.state) {
        const delivery = record.scenario.startsWith('outbox ') ? await tx.businessEventOutbox.findUniqueOrThrow({ where: { id: record.state.id } }) : await tx.workflowAssuranceAlertDelivery.findUniqueOrThrow({ where: { id: record.state.id } });
        assert.deepEqual(json(delivery), record.state);
        const receipts = await tx.$queryRawUnsafe(`SELECT key, delivery_id, requests FROM ${record.receiverTable} WHERE delivery_id = $1 ORDER BY key`, record.state.id);
        if (record.effects) assert.deepEqual(receipts, record.effects);
        else assert.equal(receipts.length, 0);
        rows.push({ scenario: record.scenario, status: 'PASS', organizationId: record.organizationId, state: delivery, receipts });
      }
      if (record.final) {
        const organizationId = record.organizationId, where = { organizationId };
        const period = await tx.accountingPeriod.findUniqueOrThrow({ where: { id: record.periodId } });
        assert.equal(period.status, 'CLOSED'); assert.equal(period.controlVersion, 3);
        const seals = await tx.periodControlEvent.findMany({ where, orderBy: { version: 'asc' } }); assert.deepEqual(json(seals), record.seals);
        const packs = await tx.closePackExport.findMany({ where, select: { id: true, closeRunId: true, contentHash: true, isCertified: true, metadata: true }, orderBy: { id: 'asc' } });
        const certified = packs.filter(p => p.isCertified); assert.equal(certified.length, 2); assert.equal(new Set(certified.map(p => p.closeRunId)).size, 2);
        const old = packs.find(p => p.id === record.oldPack.id), current = packs.find(p => p.id === record.newPack.id);
        assert.equal(old.contentHash, record.oldPack.hash); assert.equal(old.metadata.staleState.status, 'EVIDENCE_STALE'); assert.equal(current.contentHash, record.newPack.hash);
        const stock = await tx.inventoryLevel.findMany({ where: { item: { organizationId } } });
        const journals = await tx.journalEntry.findMany({ where, include: { lines: true } });
        for (const j of journals) assert.equal(j.lines.reduce((n, l) => n + Number(l.debit) - Number(l.credit), 0), 0);
        const financial = { stock: stock.map(s => ({ quantity: s.quantityOnHand.toFixed(3), value: s.totalValue.toFixed(2) })), journals: journals.length, payments: await tx.supplierPayment.count({ where }), paymentTransactions: await tx.paymentTransaction.count({ where }), returns: await tx.purchaseReturn.count({ where }) };
        assert.deepEqual(financial, record.final);
        rows.push({ scenario: record.scenario, status: 'PASS', organizationId, period: { id: period.id, status: period.status, controlVersion: period.controlVersion }, seals, packs, financial, journalEvidence: journals.map(j => ({ id: j.id, lines: j.lines.map(l => ({ debit: l.debit.toString(), credit: l.credit.toString(), accountId: l.accountId })) })) });
      }
    }
    const faults = await tx.$queryRawUnsafe("SELECT tgname FROM pg_trigger WHERE tgname LIKE 'mixed_close_%'"); assert.equal(faults.length, 0);
    return { rows, residualFaultTriggers: faults.length };
  }, { timeout: 120000, isolationLevel: 'RepeatableRead' });
  assert.equal(results.rows.length, 16);
  fs.writeFileSync(path.join(__dirname, 'database-readback.json'), JSON.stringify({ at: new Date().toISOString(), tables: [...new Set(source.evidence.map(e => e.receiverTable))], ...results }, null, 2));
  console.log(JSON.stringify({ retainedStates: results.rows.length, residualFaultTriggers: results.residualFaultTriggers, result: 'PASS' }));
})().catch(e => { console.error(String(e.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted URL]')); process.exitCode = 1; }).finally(() => db.$disconnect());
