"use strict";
// Actual in-app publication on the owned fixture; no external dispatch.
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = file => require(path.join(root, file)), service = load('services/accounting/close-assurance.service.ts'), workflow = load('services/accounting/close-evidence-workflow.service.ts');
  const worker = load('services/accounting/close-evidence-notification.worker.ts'), inbox = load('services/accounting/close-evidence-notifications.service.ts');
  const payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts'), { getModuleCatalog } = load('services/modules/module-catalog.service.ts');
  const { hashPassword } = load('lib/password.ts'), { stepUpSessionWithPassword } = load('services/security/step-up-auth.service.ts');
  const run = crypto.randomUUID(), secrets = [], files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])) });
  const report = { run, at: new Date().toISOString(), checks: [], limitations: ['Owned synthetic tenant only. Actual database inbox publication; no email, personal read acknowledgement or live approval.', 'Acknowledgement loss, storage outage and payload corruption are explicit isolated fault injections.'] };
  const outside = async () => f.hash({ base: await h.outside(), inbox: await db.closeEvidenceNotification.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }) });
  const check = async (name, fn) => { const row = { name }; report.checks.push(row); row.result = await fn(); row.passed = true; console.log(JSON.stringify({ name, passed: true })); };
  try {
    const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), 'stoquify_local_registration_20260906_01'); assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
    await helper.withClient(target, helper.assertOwned); report.sourceBefore = sources(); report.outsideBefore = await outside();
    const x = await h.fixture('notification-delivery-' + run.slice(0, 8)); report.fixture = x.info;
    const scope = { organizationId: x.organizationId }, ids = x.info.actorIds, modules = getModuleCatalog().map(row => row.slug), controls = {}, roles = {};
    await db.tenantModuleConfiguration.create({ data: { ...scope, manifestHash: 'synthetic-' + run, selectedModules: modules, activeModules: modules } });
    await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ ...scope, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticFixture: true } })) });
    for (const who of ['maker', 'checker', 'certifier']) {
      const permissions = ['accounting.close.finding.comment', ...(who === 'maker' ? ['accounting.close.evidence.request', 'accounting.close.finding.assign', 'accounting.close.accountant.review'] : [])];
      roles[who] = await db.role.create({ data: { ...scope, code: 'notification-' + who, nameEn: 'Synthetic ' + who, permissions, users: { connect: { id: ids[who] } } } });
      const token = crypto.randomBytes(32).toString('hex'); secrets.push(token); const session = await db.session.create({ data: { userId: ids[who], token, expiresAt: new Date(Date.now() + 3600000) } }); controls[who] = { actorId: ids[who], session: { id: session.id, token } };
    }
    report.financialBefore = await h.financial();
    const actor = who => ({ ...scope, actorId: ids[who] }), view = who => inbox.getCloseEvidenceNotifications(actor(who), { periodId: x.periodId });
    const deliver = () => worker.runCloseEvidenceNotificationWorker({ ...scope, workerId: 'owned-close-notification-' + run, limit: 100 });
    const newRequest = async label => {
      const original = payment.getPaymentReconciliationDashboardData; let adverse;
      try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Explicit synthetic collector failure'); }; adverse = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + run }, controls.maker); }
      finally { payment.getPaymentReconciliationDashboardData = original; }
      const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { ...scope, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
      await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + '-restored-' + run }, controls.maker);
      const request = await service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: ids.checker, requestText: 'Review retained missing reconciliation evidence.', dueAt: new Date(Date.now() + 86400000), correlationId: 'request-' + finding.id }, controls.maker);
      const outbox = await db.businessEventOutbox.findFirstOrThrow({ where: { ...scope, idempotencyKey: `close-assurance-finding:${finding.id}:missing-evidence-requested:${request.correlationId}:notification` } });
      return { finding, request, outbox };
    };
    const a = await newRequest('first'), originalRequest = await db.accountantComment.findUniqueOrThrow({ where: { id: a.request.id } });
    await check('Actual request publication and tenant-bound durable destination', async () => {
      const other = f.hash(await db.businessEventOutbox.findMany({ where: { ...scope, eventName: { notIn: [...worker.CLOSE_EVIDENCE_NOTIFICATION_EVENTS] } }, orderBy: { id: 'asc' } }));
      const results = await deliver(); assert.equal(results.length, 1); assert.equal(results[0].status, 'SENT');
      assert.ok((await view('checker')).items.some(row => row.requestId === a.request.id));
      assert.equal(other, f.hash(await db.businessEventOutbox.findMany({ where: { ...scope, eventName: { notIn: [...worker.CLOSE_EVIDENCE_NOTIFICATION_EVENTS] } }, orderBy: { id: 'asc' } })));
      const published = await db.closeEvidenceNotification.findFirstOrThrow({ where: { ...scope, outboxId: a.outbox.id } });
      await assert.rejects(db.closeEvidenceNotification.create({ data: { ...published, id: 'foreign-' + run, organizationId: 'foreign-unowned' } }), error => error.code === 'P2003');
      return { publishedId: published.id, unrelatedEventsUntouched: true, foreignCompositeReferenceDenied: true };
    });
    await check('Reassignment publication removes the former recipient on the next read', async () => {
      await service.replaceMissingCloseEvidenceRecipient(x.organizationId, { requestId: a.request.id, expectedRevision: a.request.id, requestedFromId: ids.certifier, reason: 'Assign to the available colleague; preserve the original request.', correlationId: 'replace-' + run }, controls.maker);
      assert.ok((await deliver()).every(row => row.status === 'SENT'));
      assert.equal((await view('checker')).items.length, 0); assert.equal((await view('certifier')).items.length, 2);
      return { currentRecipientOnly: true };
    });
    const response = await service.respondToMissingCloseEvidence(x.organizationId, { requestId: a.request.id, responseText: 'Collector restored; inspect retained evidence.', correlationId: 'response-' + run }, controls.certifier);
    await check('Response reaches current reviewers despite a departed original requester', async () => {
      await db.role.update({ where: { id: roles.checker.id }, data: { permissions: [...roles.checker.permissions, 'accounting.close.accountant.review'] } });
      await db.user.update({ where: { id: ids.maker }, data: { isActive: false } });
      try {
        assert.ok((await deliver()).every(row => row.status === 'SENT'));
        assert.ok((await view('checker')).items.some(row => row.eventName.endsWith('response_submitted')));
        assert.ok(!(await view('certifier')).items.some(row => row.eventName.endsWith('response_submitted')));
        await assert.rejects(view('maker'), error => error.code === 'FORBIDDEN');
        await assert.rejects(inbox.getCloseEvidenceNotifications({ ...actor('checker'), organizationId: 'foreign-unowned' }, { periodId: x.periodId }), error => error.code === 'FORBIDDEN');
      } finally { await db.user.update({ where: { id: ids.maker }, data: { isActive: true } }); }
      return { currentReviewerAudience: true, inactiveAndForeignDenied: true };
    });
    await check('Independent acceptance publishes a historical observation', async () => {
      const preview = await workflow.getCloseEvidenceReview(actor('checker'), a.request.id); assert.equal(preview.replacement.status, 'AVAILABLE');
      const password = 'Owned-notification-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password); secrets.push(hashed);
      await db.user.update({ where: { id: ids.checker }, data: { password: hashed, emailVerified: true } }); await db.account.create({ data: { userId: ids.checker, accountId: ids.checker, providerId: 'credential', password: hashed } });
      const step = await stepUpSessionWithPassword({ sessionId: controls.checker.session.id, sessionToken: controls.checker.session.token, userId: ids.checker, organizationId: x.organizationId, password }); assert.equal(step.status, 'verified');
      await service.acceptMissingCloseEvidenceResponse(x.organizationId, { requestId: a.request.id, responseId: response.id, resolutionNotes: 'Independent review of retained recovered evidence for local verification.', replacement: preview.replacement.selection, correlationId: 'accept-' + run }, { ...controls.checker, actorPermissions: [...roles.checker.permissions, 'accounting.close.accountant.review'], freshAuth: { actorId: ids.checker, organizationId: x.organizationId, lastAuthAt: step.verifiedAt } });
      assert.ok((await deliver()).every(row => row.status === 'SENT')); assert.ok((await view('certifier')).items.some(row => row.eventName.endsWith('response_accepted')));
      assert.deepEqual(await db.accountantComment.findUniqueOrThrow({ where: { id: a.request.id } }), originalRequest);
      return { actualAcceptancePublished: true, originalRequestPreserved: true };
    });
    await check('Lost acknowledgement retry preserves one publication and its original timestamp', async () => {
      const before = await db.closeEvidenceNotification.findMany({ where: scope, orderBy: { id: 'asc' } });
      await db.businessEventOutbox.update({ where: { id: a.outbox.id }, data: { status: 'FAILED', availableAt: new Date(), lockedAt: null, lockedBy: null } });
      assert.ok((await deliver()).every(row => row.status === 'SENT')); assert.deepEqual(await db.closeEvidenceNotification.findMany({ where: scope, orderBy: { id: 'asc' } }), before);
      return { noDuplicate: true };
    });
    const b = await newRequest('retry');
    await check('Storage outage follows actual backoff and publishes after retry', async () => {
      // A Prisma interactive transaction has its own delegates. Inject at the
      // owned database boundary, scoped to this exact new synthetic outbox row.
      const constraint = 'owned_notification_fault_' + run.replaceAll('-', '');
      assert.ok(/^[a-z0-9_]+$/.test(constraint)); assert.ok(/^[a-z0-9]+$/.test(b.outbox.id));
      await db.$executeRawUnsafe(`ALTER TABLE close_evidence_notifications ADD CONSTRAINT "${constraint}" CHECK ("outboxId" <> '${b.outbox.id}')`);
      try { const result = await deliver(); assert.equal(result[0].status, 'FAILED'); }
      finally { await db.$executeRawUnsafe(`ALTER TABLE close_evidence_notifications DROP CONSTRAINT "${constraint}"`); }
      assert.equal(await db.closeEvidenceNotification.count({ where: { ...scope, outboxId: b.outbox.id } }), 0);
      const failed = await db.businessEventOutbox.findUniqueOrThrow({ where: { id: b.outbox.id } }); assert.ok(failed.availableAt > new Date()); assert.deepEqual(await deliver(), []);
      const waitedMs = Math.max(0, failed.availableAt.getTime() - Date.now()) + 50; assert.ok(waitedMs < 60000); await new Promise(resolve => setTimeout(resolve, waitedMs));
      assert.ok((await deliver()).every(row => row.status === 'SENT')); assert.equal(await db.closeEvidenceNotification.count({ where: { ...scope, outboxId: b.outbox.id } }), 1);
      return { waitedMs, actualBackoff: true };
    });
    const c = await newRequest('corrupt');
    await check('Corrupted source dead-letters without publication; reviewed fixture repair retries through the worker', async () => {
      await db.businessEventOutbox.update({ where: { id: c.outbox.id }, data: { payload: {}, maxAttempts: 1 } });
      const result = await deliver(); assert.equal(result[0].status, 'DEAD_LETTER'); assert.equal(await db.closeEvidenceNotification.count({ where: { ...scope, outboxId: c.outbox.id } }), 0);
      await db.businessEventOutbox.update({ where: { id: c.outbox.id }, data: { payload: c.outbox.payload, maxAttempts: 5, status: 'FAILED', availableAt: new Date() } });
      assert.ok((await deliver()).every(row => row.status === 'SENT'));
      return { deadLetterPreventedPublication: true, fixtureRepairOnly: true };
    });
    await check('Revoked reviewer permission immediately removes team response notifications', async () => {
      await db.role.update({ where: { id: roles.checker.id }, data: { permissions: roles.checker.permissions } });
      assert.ok(!(await view('checker')).items.some(row => row.eventName.endsWith('response_submitted')));
      return { reviewerRevocationRespected: true };
    });
    report.browser = { organizationId: x.organizationId, actorId: ids.certifier, periodId: x.periodId, requestId: a.request.id };
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    try { report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore === report.outsideAfter; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.checks.length === 8 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-notification-delivery-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
