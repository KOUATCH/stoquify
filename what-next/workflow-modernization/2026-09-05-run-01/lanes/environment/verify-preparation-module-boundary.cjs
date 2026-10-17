const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const { observeModuleAccess } = require(path.join(f.root, 'services/modules/module-entitlement.service.ts'));
const service = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const signing = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const files = ['services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'actions/payments/reconciliation-preparation.actions.ts', 'services/modules/module-entitlement.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [] };
(async () => {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const x = await fixture('prepare-module-verify-' + stamp), modules = getModuleCatalog().map(m => m.slug);
  await db.tenantModuleConfiguration.create({ data: { organizationId: x.org.id, manifestHash: 'owned-preparation-boundary', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.org.id, moduleSlug, status: 'active', source: 'requested_modules' })) });
  const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'accounting.journal.read'];
  const control = () => { const now = new Date(); return { organizationId: x.org.id, actorId: x.maker.id, actorPermissions: permissions, now, lastAuthAt: now }; };
  const access = intent => observeModuleAccess({ organizationId: x.org.id, userId: x.maker.id, actorPermissions: permissions, moduleSlug: 'payment_reconciliation', surfaceType: 'action', surface: 'actions/payments/reconciliation-preparation.actions.ts', accessIntent: intent, mode: 'enforce', audit: false });
  report.organizationId = x.org.id; report.runId = x.run.runId;
  assert.equal((await access('write')).allowed, true);
  const preview = await service.previewReconciliationPreparation({ runId: x.run.runId }, control()); assert.equal(preview.canPrepare, true);
  const command = { runId: x.run.runId, expectedRevision: preview.revision, reason: 'Owned reviewed preparation', idempotencyKey: crypto.randomUUID() };
  const reset = () => db.tenantModuleGrant.updateMany({ where: { organizationId: x.org.id }, data: { status: 'active', readOnly: false, startsAt: null, endsAt: null } });
  const change = (moduleSlug, data) => db.tenantModuleGrant.update({ where: { organizationId_moduleSlug: { organizationId: x.org.id, moduleSlug } }, data });
  for (const [kind, slug, data] of [
    ['read-only after admitted action', 'payment_reconciliation', { status: 'read_only' }],
    ['read-only flag', 'payment_reconciliation', { readOnly: true }],
    ['suspended', 'payment_reconciliation', { status: 'suspended' }],
    ['expired status', 'payment_reconciliation', { status: 'expired' }],
    ['expired interval', 'payment_reconciliation', { endsAt: new Date(Date.now() - 1000) }],
    ['future interval', 'payment_reconciliation', { startsAt: new Date(Date.now() + 3600000) }],
    ['suspended finance', 'finance', { status: 'suspended' }],
    ['read-only accounting', 'accounting', { status: 'read_only' }],
  ]) {
    await reset(); await change(slug, data); assert.equal((await access('write')).allowed, false);
    await assert.rejects(() => service.prepareReconciliationRun(command, control()), e => e.code === 'FORBIDDEN');
    const readAllowed = (await access('read')).allowed;
    if (readAllowed) {
      const p = await service.previewReconciliationPreparation({ runId: x.run.runId }, control()); assert.equal(p.canPrepare, false); assert.equal(p.blocker, 'MODULE_WRITE_REQUIRED');
      assert.equal((await service.readReconciliationPreparation({ kind: 'history', runId: x.run.runId }, control())).total, 0);
    } else {
      await assert.rejects(() => service.previewReconciliationPreparation({ runId: x.run.runId }, control()), e => e.code === 'FORBIDDEN');
      await assert.rejects(() => service.readReconciliationPreparation({ kind: 'runs' }, control()), e => e.code === 'FORBIDDEN');
    }
    assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 0);
    report.cases.push({ kind, readAllowed, deniedBeforePreparation: true });
  }
  await db.tenantModuleGrant.deleteMany({ where: { organizationId: x.org.id } });
  await assert.rejects(() => service.prepareReconciliationRun(command, control()), e => e.code === 'FORBIDDEN');
  report.cases.push({ kind: 'explicit empty grants', deniedBeforePreparation: true });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.org.id, moduleSlug, status: 'active', source: 'requested_modules' })) });
  const prepared = await service.prepareReconciliationRun(command, control()); assert.equal(prepared.replayed, false);
  await change('payment_reconciliation', { status: 'read_only' });
  await assert.rejects(() => service.prepareReconciliationRun(command, control()), e => e.code === 'FORBIDDEN');
  assert.equal((await service.readReconciliationPreparation({ kind: 'history', runId: x.run.runId }, control())).records[0].id, prepared.receiptId);
  await reset(); assert.equal((await service.prepareReconciliationRun(command, control())).receiptId, prepared.receiptId);
  const p = await signing.previewReconciliationSignOff({ organizationId: x.org.id, runId: x.run.runId, actorId: x.signer.id, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.sign'] }); assert.equal(p.canSign, true);
  const now = new Date(); const signed = await signing.signReconciliationRun({ organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: p.expectedSourceVersionHash, expectedEvidenceRevision: p.expectedEvidenceRevision, control: { actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.sign'], now, lastAuthAt: now } });
  assert.equal((await service.prepareReconciliationRun(command, control())).currentStatus, 'SIGNED');
  assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).certificateHash, signed.certificateHash);
  assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 1);
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
  assert.equal(await db.auditLog.count({ where: { organizationId: x.org.id, entityId: 'payment_reconciliation:prepare:' + x.run.runId, action: 'MODULE_ENTITLEMENT_ENFORCED' } }), 10);
  report.cases.push({ kind: 'retained retry and independent signing after restoration', readonlyHistoryRetained: true, replayDeniedWhileReadonly: true, onePreparationReceipt: true, denialAudits: 10, retainedSignedState: true, noJournals: true });
  report.passed = true;
})().catch(error => { report.passed = false; report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'preparation-module-boundary-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, cases: report.cases.length })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
