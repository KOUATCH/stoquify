const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const service = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const files = ['services/reconciliation/payment-reconciliation-certification.service.ts', 'services/controls/sensitive-action.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { startedAt: new Date().toISOString(), sourceBefore: hashes(), cases: [] };
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const x = await fixture('authority-' + stamp);
  report.organizationId = x.org.id; report.runId = x.run.runId;
  const permissions = ['payments.reconciliation.read', 'payments.reconciliation.sign'];
  const role = await db.role.create({ data: { organizationId: x.org.id, code: 'OWNED_AUTHORITY', nameEn: 'Owned authority verification', permissions, users: { connect: { id: x.signer.id } } } });
  const command = async () => { const now = new Date(), current = await db.role.findUniqueOrThrow({ where: { id: role.id } }); return { organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: { actorPermissions: current.permissions, now, lastAuthAt: now } }; };
  const effects = async () => f.hash(await Promise.all(['reconciliationRun', 'journalEntry', 'journalEntryLine', 'paymentTransaction', 'matchRecord', 'ledgerAuditEvent', 'businessEvent'].map(model => db[model].findMany({ where: { organizationId: x.org.id }, orderBy: { id: 'asc' } }))));
  async function denied(name, input) { const before = await effects(); await assert.rejects(() => service.signReconciliationRun(input), error => ['FORBIDDEN', 'FRESH_AUTH_REQUIRED', 'SOD_VIOLATION'].includes(error.code) || (error.code === 'BUSINESS_RULE_VIOLATION' && error.message === 'You are not allowed to perform this action.')); assert.equal(await effects(), before); report.cases.push({ name, deniedWithoutBusinessEffects: true }); }
  await db.role.update({ where: { id: role.id }, data: { permissions: ['payments.reconciliation.sign'] } });
  await denied('read removed after valid preview', await command());
  await db.role.update({ where: { id: role.id }, data: { permissions: ['payments.reconciliation.read'] } });
  await denied('sign removed after valid preview', await command());
  await db.role.update({ where: { id: role.id }, data: { permissions } });
  await db.user.update({ where: { id: x.signer.id }, data: { isActive: false } });
  await denied('signer deactivated after preview', await command());
  await db.user.update({ where: { id: x.signer.id }, data: { isActive: true } });
  await denied('unknown workspace actor', { ...await command(), signedById: crypto.randomUUID() });
  const foreign = await db.organization.create({ data: { name: f.helper.prefix + 'Foreign signer ' + stamp, slug: 'foreign-sign-' + stamp } });
  const foreignActor = await db.user.create({ data: { organizationId: foreign.id, email: crypto.randomUUID() + '@example.invalid', isActive: true } });
  await denied('active actor from different organization', { ...await command(), signedById: foreignActor.id });
  const expired = await command(); expired.control.lastAuthAt = new Date(Date.now() - 600000);
  await denied('expired authentication', expired);
  const signed = await service.signReconciliationRun(await command()); assert.equal(signed.status, 'SIGNED');
  report.cases.push({ name: 'restored independent authority', signed: true, certificateHash: signed.certificateHash });
  await db.role.update({ where: { id: role.id }, data: { permissions: ['payments.reconciliation.sign'] } });
  await denied('read removed before signed replay', await command());
  await db.role.update({ where: { id: role.id }, data: { permissions } });
  await db.user.update({ where: { id: x.signer.id }, data: { isActive: false } });
  await denied('inactive signed replay', await command());
  await db.user.update({ where: { id: x.signer.id }, data: { isActive: true } });
  const replay = await service.signReconciliationRun(await command()); assert.equal(replay.replayed, true); assert.equal(replay.certificateHash, signed.certificateHash);
  assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'PAYMENT_RECONCILIATION_RUN_SIGN' } }), 1);
  assert.equal(await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }), 1);
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
  report.cases.push({ name: 'restored exact replay', oneCertificateAuditAndEvent: true, noJournal: true }); report.passed = true;
}
main().catch(error => { report.passed = false; report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); report.endedAt = new Date().toISOString();
  const output = path.join(__dirname, 'sign-authority-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, cases: report.cases.length, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
