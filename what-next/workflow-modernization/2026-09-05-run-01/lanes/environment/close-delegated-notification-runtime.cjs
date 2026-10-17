"use strict";
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = file => require(path.join(root, file)), service = load('services/accounting/close-assurance.service.ts'), desk = load('services/accounting/accountant-work-desk.service.ts'), workflow = load('services/accounting/close-evidence-workflow.service.ts'), recovery = load('services/accounting/close-evidence-resolution.service.ts');
  const { runCloseEvidenceNotificationWorker } = load('services/accounting/close-evidence-notification.worker.ts'), payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
  const { grantAccountantAccess } = load('services/accounting/accountant-access.service.ts'), { getModuleCatalog } = load('services/modules/module-catalog.service.ts'), { hashPassword } = load('lib/password.ts'), { stepUpSessionWithPassword } = load('services/security/step-up-auth.service.ts');
  const run = crypto.randomUUID(), secrets = [], sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), checks: [], limitations: ['Only owned synthetic client and mandate. Actual publication and independent fixture recovery; no external dispatch or real professional approval.', 'Open work projection, not a complete delegated historical notification inbox.'] };
  const outside = async () => f.hash({ base: await h.outside(), comments: await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }), inbox: await db.closeEvidenceNotification.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }), grants: await db.accountantAccessGrant.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }) });
  const check = async (name, fn) => { const row = { name }; report.checks.push(row); row.result = await fn(); row.passed = true; console.log(JSON.stringify({ name, passed: true })); };
  try {
    const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), 'stoquify_local_registration_20260906_01'); assert.ok(['localhost', '127.0.0.1'].includes(target.hostname)); await helper.withClient(target, helper.assertOwned);
    report.sourceBefore = sources(); report.outsideBefore = await outside();
    const x = await h.fixture('delegated-publication-' + run.slice(0, 8)), client = x.organizationId, ids = x.info.actorIds, scope = { organizationId: client }, modules = getModuleCatalog().map(row => row.slug), controls = {};
    report.fixture = x.info;
    const home = 'workflow_close_write_firm_' + run; h.organizations.push(home);
    await db.organization.create({ data: { id: home, name: helper.prefix + 'Synthetic delegated inbox firm', slug: 'delegated-inbox-' + run, currency: 'XAF' } });
    const reviewer = await db.user.create({ data: { organizationId: home, name: 'Synthetic delegated reviewer', email: 'delegated-inbox-' + run + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
    const permissions = ['dashboard.read', 'accounting.audit.read', 'accounting.close.accountant.review'];
    await db.role.create({ data: { organizationId: home, code: 'owned-delegated-reviewer', nameEn: 'Synthetic delegated reviewer', permissions, users: { connect: { id: reviewer.id } } } });
    for (const organizationId of [client, home]) {
      await db.tenantModuleConfiguration.create({ data: { organizationId, manifestHash: 'synthetic-' + run, selectedModules: modules, activeModules: modules } });
      await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticFixture: true } })) });
    }
    for (const who of ['maker', 'checker', 'certifier']) {
      const extra = ['accounting.close.finding.comment', ...(who === 'maker' ? ['accounting.close.evidence.request', 'accounting.close.finding.assign', 'accounting.close.accountant.review'] : who === 'certifier' ? ['accounting.close.accountant.review'] : [])];
      await db.role.create({ data: { ...scope, code: 'delegated-' + who, nameEn: 'Synthetic ' + who, permissions: extra, users: { connect: { id: ids[who] } } } });
      const token = crypto.randomBytes(32).toString('hex'); secrets.push(token); const session = await db.session.create({ data: { userId: ids[who], token, expiresAt: new Date(Date.now() + 3600000) } }); controls[who] = { actorId: ids[who], session: { id: session.id, token } };
    }
    const mandate = { syntheticOnly: true, realCustomerApproval: false, organizationId: client, homeOrganizationId: home, accountantUserId: reviewer.id, purpose: 'Owned delegated publication verification only' }, bytes = JSON.stringify(mandate, null, 2) + '\n', scopeFile = 'close-delegated-scope-' + run + '.json'; fs.writeFileSync(path.join(__dirname, scopeFile), bytes, { flag: 'wx' });
    const grant = await grantAccountantAccess(client, ids.maker, { accountantEmail: reviewer.email, accountantFirmName: 'Synthetic verification firm', role: 'REVIEWER', consentEvidenceHash: 'sha256:' + sha(bytes), effectiveFrom: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 86400000), correlationId: 'mandate-' + run });
    const actor = { homeOrganizationId: home, actorId: reviewer.id, actorPermissions: permissions }, view = () => desk.getAccountantWorkDesk(actor), deliver = () => runCloseEvidenceNotificationWorker({ ...scope, workerId: 'delegated-' + run, limit: 100 });
    report.financialBefore = await h.financial();
    const newRequest = async label => {
      const original = payment.getPaymentReconciliationDashboardData; let adverse;
      try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Synthetic collector failure'); }; adverse = await service.runCloseAssurance(client, { periodId: x.periodId, correlationId: label + run }, controls.maker); } finally { payment.getPaymentReconciliationDashboardData = original; }
      const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { ...scope, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
      await service.runCloseAssurance(client, { periodId: x.periodId, correlationId: label + '-restored-' + run }, controls.maker);
      const request = await service.requestMissingCloseEvidence(client, { findingId: finding.id, requestedFromId: ids.checker, requestText: 'Review the recovered collection and retained original evidence.', dueAt: new Date(Date.now() + 86400000), correlationId: 'request-' + finding.id }, controls.maker);
      return { finding, request };
    };
    const a = await newRequest('assignment');
    await check('Authorized delegated desk distinguishes queued work from durable publication', async () => {
      assert.equal((await view()).items.find(row => row.requestId === a.request.id).publication, null);
      assert.ok((await deliver()).every(row => row.status === 'SENT'));
      assert.ok((await view()).items.find(row => row.requestId === a.request.id).publication.publishedAt); return { actualPublication: true };
    });
    await check('Reassignment stays visible and follows its new notification rather than original success', async () => {
      const before = await db.accountantComment.findUniqueOrThrow({ where: { id: a.request.id } });
      await service.replaceMissingCloseEvidenceRecipient(client, { requestId: a.request.id, expectedRevision: a.request.id, requestedFromId: ids.certifier, reason: 'Current colleague takes over without rewriting the original request.', correlationId: 'replace-' + run }, controls.maker);
      const row = (await view()).items.find(item => item.requestId === a.request.id); assert.equal(row.delivery, 'PENDING'); assert.equal(row.publication, null); assert.equal(row.evidenceState, 'AWAITING_RESPONSE');
      assert.ok((await deliver()).every(row => row.status === 'SENT')); assert.ok((await view()).items.find(item => item.requestId === a.request.id).publication);
      assert.deepEqual(await db.accountantComment.findUniqueOrThrow({ where: { id: a.request.id } }), before); return { currentAssignmentNotification: true, originalPreserved: true };
    });
    await service.respondToMissingCloseEvidence(client, { requestId: a.request.id, responseText: 'Restored source is ready for independent review.', correlationId: 'response-' + run }, controls.certifier);
    await check('A delegated reviewer receives the response publication after the requester leaves', async () => {
      await db.user.update({ where: { id: ids.maker }, data: { isActive: false } });
      try { assert.ok((await deliver()).every(row => row.status === 'SENT')); const row = (await view()).items.find(item => item.requestId === a.request.id); assert.equal(row.evidenceState, 'RESPONSE_SUBMITTED'); assert.ok(row.publication); }
      finally { await db.user.update({ where: { id: ids.maker }, data: { isActive: true } }); }
      return { delegatedResponsePublished: true };
    });
    const b = await newRequest('recovery'), original = await db.accountantComment.findUniqueOrThrow({ where: { id: b.request.id } });
    const duplicate = await db.accountantComment.create({ data: { ...original, id: 'synthetic-duplicate-' + run, correlationId: 'duplicate-' + run } });
    const sourceRows = f.hash(await db.accountantComment.findMany({ where: { ...scope, findingId: b.finding.id }, orderBy: { id: 'asc' } }));
    await check('Ambiguous pending history is explicitly incomplete before recovery', async () => {
      const result = await view(); assert.equal(result.incompleteClients, 1); assert.ok(!result.items.some(row => row.requestId === b.request.id)); return { noFalseEmptySuccess: true };
    });
    await check('Independent approved recovery restores pending delegated work with original records retained', async () => {
      for (const who of ['maker', 'certifier']) {
        const password = 'Owned-delegated-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password, hashed);
        await db.user.update({ where: { id: ids[who] }, data: { password: hashed, emailVerified: true } }); await db.account.create({ data: { userId: ids[who], accountId: ids[who], providerId: 'credential', password: hashed } });
        const step = await stepUpSessionWithPassword({ sessionId: controls[who].session.id, sessionToken: controls[who].session.token, userId: ids[who], organizationId: client, password }); assert.equal(step.status, 'verified');
      }
      const snapshot = await workflow.getCloseEvidenceInvestigation({ ...scope, actorId: ids.maker }, x.periodId, b.request.id);
      const proposal = await recovery.proposeCloseEvidenceResolution(client, { periodId: x.periodId, requestId: b.request.id, expectedRevision: snapshot.revision, correlationId: 'proposal-' + run, selectedRequestId: b.request.id, selectedResponseId: null, selectedAcceptanceId: null, reason: 'Preserve the original service request and retain the injected duplicate for audit.', exclusions: [{ id: duplicate.id, reason: 'Synthetic malformed duplicate; preserve the record without using it for processing.' }] }, controls.maker);
      await recovery.approveCloseEvidenceResolution(client, { proposalId: proposal.proposalId, correlationId: 'approve-' + run, notes: 'Independent inspection of retained original and synthetic duplicate.' }, controls.certifier);
      const started = Date.now(), result = await view(); report.deskReadMs = Date.now() - started;
      assert.equal(result.incompleteClients, 0); assert.ok(result.items.some(row => row.requestId === b.request.id)); assert.ok(!result.items.some(row => row.requestId === duplicate.id));
      assert.equal(f.hash(await db.accountantComment.findMany({ where: { ...scope, findingId: b.finding.id }, orderBy: { id: 'asc' } })), sourceRows);
      assert.ok((await deliver()).every(row => row.status === 'SENT')); return { originalsRetained: true, processingRestored: true };
    });
    await check('Revoked mandate removes publications and private client metadata', async () => {
      await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: ids.maker } });
      try { const result = await view(); assert.equal(result.items.length, 0); assert.equal(result.clientsRead, 0); }
      finally { await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: 'ACTIVE', revokedAt: null, revokedById: null } }); }
      return { currentMandateRequired: true };
    });
    await check('Publication survives lost acknowledgement and remains separate from failed outbox status', async () => {
      const outbox = await db.businessEventOutbox.findFirstOrThrow({ where: { ...scope, eventName: 'close.assurance.missing_evidence.response_submitted', idempotencyKey: `close-assurance-missing-evidence-request:${a.request.id}:response-submitted:response-${run}:notification` } });
      await db.businessEventOutbox.update({ where: { id: outbox.id }, data: { status: 'FAILED', availableAt: new Date(Date.now() + 60000) } });
      const row = (await view()).items.find(item => item.requestId === a.request.id); assert.equal(row.delivery, 'FAILED'); assert.ok(row.publication); return { historicalPublicationPreserved: true, faultInjection: 'lost acknowledgement state' };
    });
    report.workDesk = { homeOrganizationId: home, actorId: reviewer.id, clientOrganizationId: client, grantId: grant.id, requestId: a.request.id, recoveredRequestId: b.request.id, scopeFile };
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    try { report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore === report.outsideAfter; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.checks.length === 7 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-delegated-notification-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
