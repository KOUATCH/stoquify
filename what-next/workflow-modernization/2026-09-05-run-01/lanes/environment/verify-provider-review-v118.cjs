const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const operations = require(path.join(f.root, 'services/payments/provider-operations.service.ts'));
const runs = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-run.service.ts'));
const imports = require(path.join(f.root, 'services/payments/statement-import.service.ts'));
const { MobileMoneyHmacAdapter } = require(path.join(f.root, 'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const adapter = new MobileMoneyHmacAdapter('mtn-momo'), stamp = crypto.randomUUID(), organizations = [];
const files = ['services/payments/provider-operations.service.ts', 'services/payments/provider-operation-evidence.ts', 'services/payments/statement-import.service.ts', 'services/reconciliation/payment-reconciliation-run.service.ts', 'services/modules/module-admission.service.ts', 'services/modules/module-entitlement.service.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const report = { at: new Date().toISOString(), scope: 'Owned PostgreSQL; synthetic provider statements and setup only, no provider authentication or professional approval evidence. Service-only import/review helper; no browser claim.', sourcesBefore: sources(), checks: [] };
async function fixture(suffix) {
  const organizationId = 'workflow_provider_review_' + stamp + '_' + suffix;
  await db.organization.create({ data: { id: organizationId, name: f.helper.prefix + 'provider review ' + suffix, slug: organizationId, currency: 'XAF', country: 'CM', requestedModules: ['finance', 'accounting', 'payment_reconciliation'] } }); organizations.push(organizationId);
  const actor = await db.user.create({ data: { organizationId, name: 'Owned importer', email: crypto.randomUUID() + '@example.invalid', isActive: true } });
  const bank = await db.chartOfAccount.create({ data: { organizationId, code: 'OWNED512', nameEn: 'Owned bank', type: 'ASSET', normalBalance: 'DEBIT' } });
  const suspense = await db.chartOfAccount.create({ data: { organizationId, code: 'OWNED471', nameEn: 'Owned suspense', type: 'ASSET', normalBalance: 'DEBIT' } });
  const rail = await db.paymentRail.create({ data: { organizationId, code: 'OWNED', name: 'Owned synthetic rail', type: 'MOBILE_MONEY' } });
  const provider = await db.providerAccount.create({ data: { organizationId, paymentRailId: rail.id, providerCode: adapter.providerCode, displayName: 'Owned synthetic provider', status: 'ACTIVE', externalAccountHash: crypto.randomUUID(), currencyCode: 'XAF', settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: suspense.id } });
  await db.settlementAccount.create({ data: { organizationId, providerAccountId: provider.id, ledgerAccountId: bank.id, approvalStatus: 'APPROVED', effectiveFrom: new Date(0), metadata: { synthetic: true, notAnApproval: true } } });
  const now = new Date(), reference = crypto.randomUUID();
  await db.paymentTransaction.create({ data: { organizationId, providerAccountId: provider.id, amount: '100.25', currencyCode: 'XAF', direction: 'INBOUND', state: 'CONFIRMED', occurredAt: now, confirmedAt: now, providerReference: reference, sourceType: 'OWNED_SYNTHETIC_PRECONDITION', metadata: { synthetic: true } } });
  const line = { providerTransactionId: reference, providerReference: reference, direction: 'CREDIT', amount: '100.25', currencyCode: 'XAF', occurredAt: now.toISOString() };
  const command = { providerAccountId: provider.id, businessDate: now, rawContent: JSON.stringify([line]), fileName: 'owned.json', idempotencyKey: crypto.randomUUID(), adapter };
  const control = { organizationId, actorId: actor.id, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.import', 'payments.reconciliation.run'] };
  return { organizationId, actorId: actor.id, provider, command, control, line };
}
async function state(x) { return { files: await db.statementFile.count({ where: { organizationId: x.organizationId } }), runs: await db.reconciliationRun.count({ where: { organizationId: x.organizationId } }), signed: await db.reconciliationRun.count({ where: { organizationId: x.organizationId, status: 'SIGNED' } }), journals: await db.journalEntry.count({ where: { organizationId: x.organizationId } }) }; }
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const x = await fixture('normal'), started = Date.now();
  const pair = await Promise.all([operations.importProviderStatementForReview(x.command, x.control), operations.importProviderStatementForReview(x.command, x.control)]);
  assert.ok(pair.every(r => ['REVIEW_REQUIRED', 'IMPORTED_RECONCILIATION_UNCONFIRMED'].includes(r.stage)));
  const result = await operations.importProviderStatementForReview(x.command, x.control);
  assert.equal(result.stage, 'REVIEW_REQUIRED'); assert.equal(result.currentStatus, 'READY_FOR_SIGNOFF'); assert.equal(result.signingPerformed, false);
  assert.deepEqual(await state(x), { files: 1, runs: 1, signed: 0, journals: 0 });
  assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: x.organizationId, idempotencyKey: 'provider-statement-review:' + x.command.idempotencyKey } }), 1);
  await assert.rejects(() => operations.importProviderStatementForReview({ ...x.command, rawContent: x.command.rawContent + ' ' }, x.control), e => e.code === 'IDEMPOTENCY_CONFLICT');
  await assert.rejects(() => operations.importProviderStatementForReview(x.command, { ...x.control, actorPermissions: [] }), e => e.code === 'FORBIDDEN');
  const other = await fixture('foreign');
  await assert.rejects(() => operations.importProviderStatementForReview(x.command, other.control), e => e.code === 'FORBIDDEN');
  await assert.rejects(() => operations.ingestAndSignProviderStatement({ signedById: other.actorId }));
  report.checks.push({ name: 'concurrent import, unsigned handoff, exact replay and denied authority/tenant/changed content', passed: true, elapsedMs: Date.now() - started, result, state: await state(x) });

  const partial = await fixture('partial'), actualRun = runs.runPaymentReconciliation;
  try { runs.runPaymentReconciliation = async () => { throw new Error('Owned injected failure before run'); };
    const first = await operations.importProviderStatementForReview(partial.command, partial.control);
    assert.equal(first.stage, 'IMPORTED_RECONCILIATION_UNCONFIRMED'); assert.ok(first.statementFileId); assert.deepEqual(await state(partial), { files: 1, runs: 0, signed: 0, journals: 0 });
  } finally { runs.runPaymentReconciliation = actualRun; }
  const resumed = await operations.importProviderStatementForReview(partial.command, partial.control);
  assert.equal(resumed.stage, 'REVIEW_REQUIRED'); assert.deepEqual(await state(partial), { files: 1, runs: 1, signed: 0, journals: 0 });
  report.checks.push({ name: 'actual retained import after injected run failure and safe retry', passed: true });

  const lost = await fixture('lost');
  try { runs.runPaymentReconciliation = async input => { await actualRun(input); throw new Error('Owned lost response after actual commit'); };
    const recovered = await operations.importProviderStatementForReview(lost.command, lost.control); assert.equal(recovered.stage, 'REVIEW_REQUIRED');
  } finally { runs.runPaymentReconciliation = actualRun; }
  assert.deepEqual(await state(lost), { files: 1, runs: 1, signed: 0, journals: 0 });
  report.checks.push({ name: 'recovered committed reconciliation after injected response loss', passed: true });

  const duplicate = await fixture('duplicate'), rawContent = JSON.stringify([duplicate.line, duplicate.line]);
  const duplicateInput = { organizationId: duplicate.organizationId, providerAccountId: duplicate.provider.id, adapter, rawContent, importedById: duplicate.actorId };
  const duplicates = await Promise.all([imports.importProviderStatement(duplicateInput), imports.importProviderStatement(duplicateInput)]);
  assert.ok(duplicates.every(r => r.status === 'DUPLICATE_LINE')); assert.equal(duplicates[0].exceptionId, duplicates[1].exceptionId);
  assert.equal(await db.paymentException.count({ where: { organizationId: duplicate.organizationId } }), 1);
  assert.deepEqual(await state(duplicate), { files: 0, runs: 0, signed: 0, journals: 0 });
  report.checks.push({ name: 'concurrent duplicate rejection retains exactly one exception without import', passed: true });

  // A new owned configuration is a test precondition, not a customer deactivation or approval.
  await db.tenantModuleConfiguration.create({ data: { organizationId: duplicate.organizationId, manifestHash: 'owned-synthetic-policy', newWorkStoppedModules: ['payment_reconciliation'] } });
  assert.equal((await imports.importProviderStatement(duplicateInput)).exceptionId, duplicates[0].exceptionId);
  await assert.rejects(() => imports.importProviderStatement({ ...duplicateInput, rawContent: duplicate.command.rawContent }), e => e.code === 'FORBIDDEN');
  assert.deepEqual(await state(duplicate), { files: 0, runs: 0, signed: 0, journals: 0 });
  report.checks.push({ name: 'new-work stop denies new import while retained duplicate evidence remains readable', passed: true });
  report.passed = true;
}
main().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.organizations = organizations;
  const file = path.join(__dirname, 'provider-review-v118-' + stamp + '.json');
  console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks, sourceStable: report.sourceStable, error: report.error }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await db.$disconnect(); }
});
