const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const { observeModuleAccess } = require(path.join(f.root, 'services/modules/module-entitlement.service.ts'));
const service = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const files = ['services/reconciliation/payment-reconciliation-certification.service.ts', 'services/modules/module-entitlement.service.ts', 'services/modules/module-catalog.service.ts', 'actions/payments/reconciliation.actions.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [], reproduction: process.argv.includes('--reproduce') };
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.sign'];
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const x = await fixture('module-boundary-' + stamp), modules = getModuleCatalog().map(m => m.slug);
  report.organizationId = x.org.id; report.runId = x.run.runId;
  await db.tenantModuleConfiguration.create({ data: { organizationId: x.org.id, manifestHash: 'owned-module-sign-boundary', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.org.id, moduleSlug, status: 'active', source: 'requested_modules' })) });
  const access = intent => observeModuleAccess({ organizationId: x.org.id, userId: x.signer.id, actorPermissions: permissions, moduleSlug: 'payment_reconciliation', surfaceType: 'action', surface: 'actions/payments/reconciliation.actions.ts', accessIntent: intent, mode: 'enforce', audit: false });
  const command = () => { const now = new Date(); return { organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: { actorPermissions: permissions, now, lastAuthAt: now } }; };
  const preview = () => service.previewReconciliationSignOff({ organizationId: x.org.id, runId: x.run.runId, actorId: x.signer.id, actorPermissions: permissions });
  const setGrant = (moduleSlug, data) => db.tenantModuleGrant.update({ where: { organizationId_moduleSlug: { organizationId: x.org.id, moduleSlug } }, data });
  assert.equal((await access('write')).allowed, true); const ready = await preview(); assert.equal(ready.canSign, true);
  // The actual outer guard has admitted this request; module authority changes before its transaction starts.
  await setGrant('payment_reconciliation', { status: 'read_only' });
  const read = await access('read'), write = await access('write'), changedPreview = await preview();
  assert.equal(read.allowed, true); assert.equal(write.allowed, false);
  let signed, error; try { signed = await service.signReconciliationRun(command()); } catch (e) { error = { code: e.code, message: f.safe(e) }; }
  report.cases.push({ name: 'write authority withdrawn after admitted action', readAllowed: read.allowed, writeAllowed: write.allowed, previewCanSign: changedPreview.canSign, previewBlocker: changedPreview.blocker, signatureCreated: signed?.status === 'SIGNED', error });
  if (report.reproduction) { assert.equal(signed?.status, 'SIGNED'); assert.equal(changedPreview.canSign, true); report.demonstratedDefect = true; report.passed = true; return; }
  assert.equal(signed, undefined); assert.equal(error?.code, 'FORBIDDEN'); assert.equal(changedPreview.canSign, false); assert.equal(changedPreview.blocker, 'MODULE_WRITE_REQUIRED');
  const cases = [
    ['read-only flag', 'payment_reconciliation', { status: 'active', readOnly: true }],
    ['suspended', 'payment_reconciliation', { status: 'suspended' }],
    ['expired status', 'payment_reconciliation', { status: 'expired' }],
    ['expired interval', 'payment_reconciliation', { status: 'active', endsAt: new Date(Date.now() - 1000) }],
    ['future interval', 'payment_reconciliation', { status: 'active', startsAt: new Date(Date.now() + 3600000) }],
    ['suspended finance dependency', 'finance', { status: 'suspended' }],
    ['read-only accounting dependency', 'accounting', { status: 'read_only' }],
  ];
  for (const [name, slug, data] of cases) {
    await db.tenantModuleGrant.updateMany({ where: { organizationId: x.org.id }, data: { status: 'active', readOnly: false, startsAt: null, endsAt: null } });
    await setGrant(slug, data); assert.equal((await access('write')).allowed, false);
    await assert.rejects(() => service.signReconciliationRun(command()), e => e.code === 'FORBIDDEN');
    assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).status, 'READY_FOR_SIGNOFF');
    report.cases.push({ name, deniedBeforeSignature: true });
  }
  await db.tenantModuleGrant.deleteMany({ where: { organizationId: x.org.id } });
  await assert.rejects(() => service.signReconciliationRun(command()), e => e.code === 'FORBIDDEN'); report.cases.push({ name: 'explicit empty grants', deniedBeforeSignature: true });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.org.id, moduleSlug, status: 'active', source: 'requested_modules' })) });
  const final = await service.signReconciliationRun(command()); assert.equal(final.status, 'SIGNED');
  await setGrant('payment_reconciliation', { status: 'read_only' });
  await assert.rejects(() => service.signReconciliationRun(command()), e => e.code === 'FORBIDDEN'); report.cases.push({ name: 'signed replay after write withdrawal', denied: true });
  await setGrant('payment_reconciliation', { status: 'active' });
  assert.equal((await service.signReconciliationRun(command())).certificateHash, final.certificateHash);
  assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'PAYMENT_RECONCILIATION_RUN_SIGN' } }), 1);
  assert.equal(await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }), 1);
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
  report.cases.push({ name: 'restored write authority and exact replay', oneSignature: true, noJournal: true }); report.passed = true;
}
main().catch(error => { report.passed = false; report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'sign-module-boundary-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, demonstratedDefect: report.demonstratedDefect, error: report.error, cases: report.cases.length })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
