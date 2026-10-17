"use strict";
// Inert without --run. Notification status fixtures are explicit test state,
// never evidence that a notification was delivered.
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = file => require(path.join(root, file)), service = load('services/accounting/close-assurance.service.ts'), desk = load('services/accounting/accountant-work-desk.service.ts');
  const payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts'), { grantAccountantAccess } = load('services/accounting/accountant-access.service.ts');
  const { getModuleCatalog } = load('services/modules/module-catalog.service.ts'), { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const run = crypto.randomUUID(), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), secrets = [];
  const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), checks: [], limitations: ['Owned synthetic fixture only; outbox status changes simulate contrasting delivery states, not actual delivery.', 'No migration, reset, real approval, payment, external transmission or deployment.'] };
  const outside = async () => ({ hash: f.hash({ base: await h.outside(), comments: await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }), grants: await db.accountantAccessGrant.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }) }) });
  const check = async (name, work) => { const row = { name }; report.checks.push(row); row.result = await work(); row.passed = true; console.log(JSON.stringify({ name, passed: true })); };
  try {
    await helper.withClient(helper.targetUrl(), helper.assertOwned); await assertDisposableDatabaseIdentity(db, helper.database);
    report.sourceBefore = sources(); report.outsideBefore = await outside();
    const x = await h.fixture('notification-provenance-' + run.slice(0, 8)); report.fixture = x.info;
    const client = x.organizationId, home = 'workflow_close_write_firm_' + run, ids = x.info.actorIds, modules = getModuleCatalog().map(row => row.slug);
    h.organizations.push(home); await db.organization.create({ data: { id: home, name: helper.prefix + 'Synthetic notification review firm', slug: 'notification-firm-' + run, currency: 'XAF' } });
    const reviewer = await db.user.create({ data: { organizationId: home, name: 'Synthetic notification reviewer', email: 'notification-reviewer-' + run + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
    const permissions = ['dashboard.read', 'accounting.audit.read', 'accounting.close.accountant.review'];
    await db.role.create({ data: { organizationId: home, code: 'owned-notification-reviewer', nameEn: 'Synthetic notification reviewer', permissions, users: { connect: { id: reviewer.id } } } });
    for (const organizationId of [client, home]) {
      await db.tenantModuleConfiguration.create({ data: { organizationId, manifestHash: 'synthetic-' + run, selectedModules: modules, activeModules: modules } });
      await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticFixture: true } })) });
    }
    const controls = {};
    for (const [who, permission] of [['maker', 'accounting.close.evidence.request'], ['checker', 'accounting.close.finding.comment']]) {
      await db.role.create({ data: { organizationId: client, code: 'notification-' + who, nameEn: 'Synthetic notification ' + who, permissions: [permission], users: { connect: { id: ids[who] } } } });
      const token = crypto.randomBytes(32).toString('hex'); secrets.push(token); const session = await db.session.create({ data: { userId: ids[who], token, expiresAt: new Date(Date.now() + 3600000) } }); controls[who] = { actorId: ids[who], session: { id: session.id, token } };
    }
    const scope = { kind: 'OWNED_LOCAL_DELEGATED_REVIEW_TEST_SCOPE', syntheticOnly: true, realCustomerApproval: false, organizationId: client, homeOrganizationId: home, accountantUserId: reviewer.id, purpose: 'Notification provenance verification only; no professional mandate.' };
    const bytes = JSON.stringify(scope, null, 2) + '\n', scopeFile = 'close-notification-scope-' + run + '.json'; fs.writeFileSync(path.join(__dirname, scopeFile), bytes, { flag: 'wx' });
    const grant = await grantAccountantAccess(client, ids.maker, { accountantEmail: reviewer.email, accountantFirmName: 'Synthetic reviewer', role: 'REVIEWER', consentEvidenceHash: 'sha256:' + sha(bytes), effectiveFrom: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 86400000), correlationId: 'notification-grant-' + run });
    const original = payment.getPaymentReconciliationDashboardData; let adverse;
    try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Explicit synthetic collector failure'); }; adverse = await service.runCloseAssurance(client, { periodId: x.periodId, correlationId: 'notification-missing-' + run }, controls.maker); }
    finally { payment.getPaymentReconciliationDashboardData = original; }
    const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { organizationId: client, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
    await service.runCloseAssurance(client, { periodId: x.periodId, correlationId: 'notification-restored-' + run }, controls.maker);
    const request = await service.requestMissingCloseEvidence(client, { findingId: finding.id, requestedFromId: ids.checker, requestText: 'Review the retained source after collection recovery.', dueAt: new Date(Date.now() + 86400000), correlationId: 'notification-request-' + run }, controls.maker);
    const actor = { homeOrganizationId: home, actorId: reviewer.id, actorPermissions: permissions };
    const requestOutbox = await db.businessEventOutbox.findFirstOrThrow({ where: { organizationId: client, eventName: 'close.assurance.missing_evidence.requested', idempotencyKey: `close-assurance-finding:${finding.id}:missing-evidence-requested:${request.correlationId}:notification` } });
    await check('Unanswered work shows its original request notification', async () => {
      await db.businessEventOutbox.update({ where: { id: requestOutbox.id, organizationId: client }, data: { status: 'FAILED' } });
      assert.equal((await desk.getAccountantWorkDesk(actor)).items.find(row => row.requestId === request.id).delivery, 'FAILED'); return { requestFailed: true };
    });
    const response = await service.respondToMissingCloseEvidence(client, { requestId: request.id, responseText: 'The collector is restored; review retained evidence.', correlationId: 'notification-response-' + run }, controls.checker);
    const responseOutbox = await db.businessEventOutbox.findFirstOrThrow({ where: { organizationId: client, eventName: 'close.assurance.missing_evidence.response_submitted', idempotencyKey: `close-assurance-missing-evidence-request:${request.id}:response-submitted:${response.correlationId}:notification` } });
    report.financialBefore = await h.financial();
    const retained = f.hash(await db.accountantComment.findMany({ where: { organizationId: client }, orderBy: { id: 'asc' } }));
    for (const status of ['PENDING', 'FAILED', 'DEAD_LETTER', 'SENT']) await check('Response notification ' + status + ' is independent of sent request', async () => {
      await db.businessEventOutbox.update({ where: { id: requestOutbox.id, organizationId: client }, data: { status: 'SENT' } });
      await db.businessEventOutbox.update({ where: { id: responseOutbox.id, organizationId: client }, data: { status } });
      const view = await desk.getAccountantWorkDesk(actor), row = view.items.find(item => item.requestId === request.id);
      assert.equal(row.delivery, status); assert.equal(row.evidenceState, 'RESPONSE_SUBMITTED'); assert.ok(!JSON.stringify(view).includes(response.responseText)); return { status, correctEvent: true, redacted: true };
    });
    await check('A missing response-event match remains unknown and never borrows request success', async () => {
      await db.businessEventOutbox.update({ where: { id: responseOutbox.id, organizationId: client }, data: { eventName: 'synthetic.unmatched.notification' } });
      try { assert.equal((await desk.getAccountantWorkDesk(actor)).items.find(row => row.requestId === request.id).delivery, 'UNKNOWN'); }
      finally { await db.businessEventOutbox.update({ where: { id: responseOutbox.id, organizationId: client }, data: { eventName: responseOutbox.eventName, status: 'FAILED' } }); }
      return { missingIsUnknown: true };
    });
    await check('Revoked client mandate hides notification and work metadata', async () => {
      await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: ids.maker } });
      try { assert.equal((await desk.getAccountantWorkDesk(actor)).items.length, 0); }
      finally { await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: 'ACTIVE', revokedAt: null, revokedById: null } }); }
      return { denied: true };
    });
    report.commentsUnchanged = retained === f.hash(await db.accountantComment.findMany({ where: { organizationId: client }, orderBy: { id: 'asc' } }));
    report.workDesk = { homeOrganizationId: home, actorId: reviewer.id, clientOrganizationId: client, grantId: grant.id, requestId: request.id, responseId: response.id, requestOutboxId: requestOutbox.id, responseOutboxId: responseOutbox.id, scopeFile };
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    try { report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.checks.length === 7 && report.checks.every(row => row.passed) && report.commentsUnchanged && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-notification-provenance-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
