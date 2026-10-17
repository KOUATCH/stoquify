"use strict";
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = file => require(path.join(root, file)), service = load('services/accounting/close-assurance.service.ts'), operations = load('services/accounting/close-notification-operations.service.ts'), worker = load('services/accounting/close-evidence-notification.worker.ts');
  const payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts'), { getModuleCatalog } = load('services/modules/module-catalog.service.ts'), { hashPassword } = load('lib/password.ts'), { stepUpSessionWithPassword } = load('services/security/step-up-auth.service.ts');
  const run = crypto.randomUUID(), secrets = [], sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), checks: [], limitations: ['Owned synthetic tenant. Dead-letter and legacy SENT states are explicit fixture fault injections, followed by actual authorized recovery and validating worker publication.', 'No payload editing, live tenant mutation, external transport, schedule or approval clearance.'] };
  const outside = async () => f.hash({ base: await h.outside(), inbox: await db.closeEvidenceNotification.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }) });
  const check = async (name, fn) => { const row = { name }; report.checks.push(row); row.result = await fn(); row.passed = true; console.log(JSON.stringify({ name, passed: true })); };
  try {
    const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), 'stoquify_local_registration_20260906_01'); assert.ok(['localhost', '127.0.0.1'].includes(target.hostname)); await helper.withClient(target, helper.assertOwned);
    report.sourceBefore = sources(); report.outsideBefore = await outside(); const x = await h.fixture('notification-ops-' + run.slice(0, 8)); report.fixture = x.info;
    const scope = { organizationId: x.organizationId }, ids = x.info.actorIds, modules = getModuleCatalog().map(row => row.slug);
    await db.tenantModuleConfiguration.create({ data: { ...scope, manifestHash: 'synthetic-' + run, selectedModules: modules, activeModules: modules } }); await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ ...scope, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticFixture: true } })) });
    const role = await db.role.create({ data: { ...scope, code: 'owned-close-operator', nameEn: 'Synthetic Close operator', permissions: ['accounting.close.finding.comment', 'accounting.close.evidence.request', 'accounting.close.accountant.review'], users: { connect: { id: ids.maker } } } });
    await db.role.create({ data: { ...scope, code: 'owned-recipient', nameEn: 'Synthetic recipient', permissions: ['accounting.close.finding.comment'], users: { connect: { id: ids.checker } } } });
    const token = crypto.randomBytes(32).toString('hex'); secrets.push(token); const sessionRow = await db.session.create({ data: { userId: ids.maker, token, expiresAt: new Date(Date.now() + 3600000) } }); const session = { id: sessionRow.id, token }, control = { actorId: ids.maker, session }, actor = { ...scope, actorId: ids.maker };
    const password = 'Owned-notification-ops-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password, hashed); await db.user.update({ where: { id: ids.maker }, data: { password: hashed, emailVerified: true } }); await db.account.create({ data: { userId: ids.maker, accountId: ids.maker, providerId: 'credential', password: hashed } });
    report.financialBefore = await h.financial(); const read = () => operations.getCloseNotificationOperations(actor, { periodId: x.periodId }), deliver = () => worker.runCloseEvidenceNotificationWorker({ ...scope, workerId: 'ops-' + run, limit: 100 });
    const newRequest = async label => {
      const original = payment.getPaymentReconciliationDashboardData; let adverse;
      try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Synthetic collector failure'); }; adverse = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + run }, control); } finally { payment.getPaymentReconciliationDashboardData = original; }
      const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { ...scope, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } }); await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + '-restored-' + run }, control);
      const request = await service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: ids.checker, requestText: 'Review the retained restored source evidence.', dueAt: new Date(Date.now() + 86400000), correlationId: 'request-' + finding.id }, control);
      const outbox = await db.businessEventOutbox.findFirstOrThrow({ where: { ...scope, idempotencyKey: `close-assurance-finding:${finding.id}:missing-evidence-requested:${request.correlationId}:notification` } }); return { request, outbox };
    };
    const command = async id => ({ periodId: x.periodId, outboxId: id, expectedRevision: (await read()).items.find(row => row.id === id).revision, reason: 'Investigated the synthetic storage outage and restored its service.', correlationId: 'retry-' + id });
    const a = await newRequest('deadletter'); await db.businessEventOutbox.update({ where: { id: a.outbox.id }, data: { status: 'DEAD_LETTER', attempts: 5, maxAttempts: 5, failedAt: new Date(), lastErrorCode: 'SYNTHETIC_OUTAGE' } });
    const originalPayload = f.hash({ payload: a.outbox.payload, payloadHash: a.outbox.payloadHash, key: a.outbox.idempotencyKey }), input = await command(a.outbox.id);
    await check('Current reviewer, tenant and persisted fresh authentication are required', async () => {
      await assert.rejects(() => operations.retryCloseNotification(actor, input, session), error => error.code === 'FRESH_AUTH_REQUIRED');
      await assert.rejects(() => operations.getCloseNotificationOperations({ ...scope, actorId: ids.checker }, { periodId: x.periodId }), error => error.code === 'FORBIDDEN');
      const step = await stepUpSessionWithPassword({ sessionId: session.id, sessionToken: session.token, userId: ids.maker, organizationId: x.organizationId, password }); assert.equal(step.status, 'verified');
      await assert.rejects(() => operations.retryCloseNotification(actor, { ...input, outboxId: 'other-tenant-object' }, session), error => error.code === 'NOT_FOUND'); return { rejectedBeforeMutation: true };
    });
    await check('Concurrent identical retry commands create one audit and preserve attempt history', async () => {
      const results = await Promise.all([operations.retryCloseNotification(actor, input, session), operations.retryCloseNotification(actor, input, session)]); assert.equal(results[0].auditId, results[1].auditId);
      const row = await db.businessEventOutbox.findUniqueOrThrow({ where: { id: a.outbox.id } }); assert.equal(row.status, 'PENDING'); assert.equal(row.attempts, 5); assert.equal(row.maxAttempts, 6); assert.equal(row.lastErrorCode, 'SYNTHETIC_OUTAGE'); assert.equal(f.hash({ payload: row.payload, payloadHash: row.payloadHash, key: row.idempotencyKey }), originalPayload);
      assert.equal(await db.ledgerAuditEvent.count({ where: { ...scope, action: 'CLOSE_NOTIFICATION_RETRY_REQUESTED', resourceId: row.id } }), 1);
      await assert.rejects(() => operations.retryCloseNotification(actor, { ...input, reason: 'Different command under retained correlation.' }, session), error => error.code === 'CONFLICT'); return { auditId: results[0].auditId, attemptsPreserved: true };
    });
    await check('Worker validates and publishes once; lost client acknowledgement replays without requeue', async () => {
      assert.ok((await deliver()).every(row => row.status === 'SENT')); const row = await db.businessEventOutbox.findUniqueOrThrow({ where: { id: a.outbox.id } }); assert.equal(row.attempts, 6); assert.equal(await db.closeEvidenceNotification.count({ where: { ...scope, outboxId: row.id } }), 1);
      await operations.retryCloseNotification(actor, input, session); assert.equal((await db.businessEventOutbox.findUniqueOrThrow({ where: { id: row.id } })).status, 'SENT'); assert.equal((await read()).items.find(item => item.id === row.id).reason, 'PUBLISHED'); return { publicationCount: 1, exactReplay: true };
    });
    const b = await newRequest('legacy'); await db.businessEventOutbox.update({ where: { id: b.outbox.id }, data: { status: 'SENT', attempts: 1, processedAt: new Date() } });
    await check('Historical SENT without a destination can be reconciled through source-validating publication', async () => {
      assert.equal((await read()).items.find(row => row.id === b.outbox.id).publishedAt, null); await operations.retryCloseNotification(actor, await command(b.outbox.id), session); assert.ok((await deliver()).every(row => row.status === 'SENT')); assert.equal(await db.closeEvidenceNotification.count({ where: { ...scope, outboxId: b.outbox.id } }), 1); return { legacyGapReconciled: true };
    });
    const c = await newRequest('backoff');
    await check('Backoff and changed previews are not bypassed', async () => {
      await db.businessEventOutbox.update({ where: { id: c.outbox.id }, data: { status: 'FAILED', attempts: 1, availableAt: new Date(Date.now() + 600000) } }); const pending = await command(c.outbox.id);
      await assert.rejects(() => operations.retryCloseNotification(actor, pending, session), error => error.code === 'BUSINESS_RULE_VIOLATION');
      await db.businessEventOutbox.update({ where: { id: c.outbox.id }, data: { status: 'DEAD_LETTER', attempts: 5 } }); await assert.rejects(() => operations.retryCloseNotification(actor, pending, session), error => error.code === 'CONFLICT'); return { staleAndBackoffRejected: true };
    });
    await check('Current role revocation removes operator access and prohibits recovery', async () => {
      const pending = await command(c.outbox.id); await db.role.update({ where: { id: role.id }, data: { permissions: [] } });
      try { await assert.rejects(read, error => error.code === 'FORBIDDEN'); await assert.rejects(() => operations.retryCloseNotification(actor, pending, session), error => error.code === 'FORBIDDEN'); }
      finally { await db.role.update({ where: { id: role.id }, data: { permissions: role.permissions } }); } return { currentRoleRequired: true };
    });
    const d = await newRequest('browser-fr'); await db.businessEventOutbox.update({ where: { id: d.outbox.id }, data: { status: 'DEAD_LETTER', attempts: 5, maxAttempts: 5 } });
    report.browserOutboxes = { en: { id: c.outbox.id, requestId: c.request.id }, fr: { id: d.outbox.id, requestId: d.request.id } }; report.operatorRoleId = role.id;
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    try { report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore === report.outsideAfter; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.checks.length === 6 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-notification-operations-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
