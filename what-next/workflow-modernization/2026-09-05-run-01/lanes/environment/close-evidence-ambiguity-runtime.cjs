"use strict";
// Inert without --run. Writes only new synthetic fixtures in the guarded owned loopback database.
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = file => require(path.join(root, file)), service = load('services/accounting/close-assurance.service.ts');
  const workflow = load('services/accounting/close-evidence-workflow.service.ts'), payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
  const recovery = load('services/accounting/close-evidence-resolution.service.ts');
  const { hashPassword } = load('lib/password.ts'), { stepUpSessionWithPassword } = load('services/security/step-up-auth.service.ts');
  const dbModule = load('prisma/db.ts'), { getModuleCatalog } = load('services/modules/module-catalog.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const run = crypto.randomUUID(), secrets = [], sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), checks: [], limitations: ['Owned synthetic fixture only; no migration, reset, live activation, real payment or external delivery.', 'Runtime checks do not certify statutory compliance, entire audit-history integrity or asynchronous notification delivery.'] };
  const outside = async () => ({ hash: f.hash({ base: await h.outside(), comments: await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }), sessions: await db.session.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }) }) });
  const check = async (name, work) => { const row = { name }; report.checks.push(row); try { row.result = await work(); row.passed = true; } catch (error) { row.error = f.safe(error, secrets); row.passed = false; throw error; } console.log(JSON.stringify({ name, passed: row.passed })); };
  try {
    const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), 'stoquify_local_registration_20260906_01'); assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
    await helper.withClient(target, helper.assertOwned); await assertDisposableDatabaseIdentity(db, helper.database);
    report.sourceBefore = sources(); report.outsideBefore = await outside();
    const x = await h.fixture('evidence-ambiguity-' + run.slice(0, 8)); report.fixture = x.info;
    const scope = { organizationId: x.organizationId }, ids = x.info.actorIds, modules = getModuleCatalog().map(row => row.slug), controls = {}, roles = {};
    await db.tenantModuleConfiguration.create({ data: { ...scope, manifestHash: 'synthetic-' + run, selectedModules: modules, activeModules: modules } });
    await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ ...scope, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticFixture: true } })) });
    for (const who of ['maker', 'checker', 'certifier']) {
      const permissions = ['accounting.close.finding.comment', ...(who === 'maker' ? ['accounting.close.evidence.request', 'accounting.close.finding.assign', 'accounting.close.accountant.review'] : [])];
      roles[who] = await db.role.create({ data: { ...scope, code: 'replacement-' + who, nameEn: 'Synthetic ' + who, permissions, users: { connect: { id: ids[who] } } } });
      const token = crypto.randomBytes(32).toString('hex'); secrets.push(token); const session = await db.session.create({ data: { userId: ids[who], token, expiresAt: new Date(Date.now() + 3600000) } }); controls[who] = { actorId: ids[who], session: { id: session.id, token } };
    }
    report.financialBefore = await h.financial();
    const actor = who => ({ ...scope, actorId: ids[who] });
    const newRequest = async label => {
      const original = payment.getPaymentReconciliationDashboardData; let adverse;
      try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Explicit synthetic collector failure'); }; adverse = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + run }, controls.maker); }
      finally { payment.getPaymentReconciliationDashboardData = original; }
      const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { ...scope, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
      await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + '-restored-' + run }, controls.maker);
      const request = await service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: ids.checker, requestText: 'Review retained missing reconciliation evidence.', dueAt: new Date(Date.now() + 86400000), correlationId: 'request-' + finding.id }, controls.maker);
      return { finding, request };
    };
    const response = (request, who) => service.respondToMissingCloseEvidence(x.organizationId, { requestId: request.id, responseText: 'Collector restored; inspect the retained observation.', correlationId: 'response-' + request.id + who }, controls[who]);
    const state = async () => { const value = {}; for (const model of ['closeAssuranceFinding', 'accountantComment', 'ledgerAuditEvent', 'businessEvent', 'businessEventOutbox', 'businessEventAudit']) value[model] = f.hash(await db[model].findMany({ where: scope, orderBy: { id: 'asc' } })); return value; };

    const password = 'Owned-ambiguity-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password); secrets.push(hashed);
    await db.user.update({ where: { id: ids.maker, ...scope }, data: { password: hashed, emailVerified: true } });
    await db.account.create({ data: { userId: ids.maker, accountId: ids.maker, providerId: 'credential', password: hashed } });
    const acceptanceControl = async () => {
      const result = await stepUpSessionWithPassword({ sessionId: controls.maker.session.id, sessionToken: controls.maker.session.token, userId: ids.maker, organizationId: x.organizationId, password });
      assert.equal(result.status, 'verified'); return { ...controls.maker, actorPermissions: ['accounting.close.accountant.review'], freshAuth: { actorId: ids.maker, organizationId: x.organizationId, lastAuthAt: result.verifiedAt } };
    };
    const addConflict = async (request, kind) => db.accountantComment.create({ data: {
      ...scope, periodId: request.periodId, closeRunId: request.closeRunId, findingId: request.findingId, authorId: ids.maker,
      body: 'Explicit synthetic retained conflict for investigation.', visibility: kind, correlationId: 'conflict-' + crypto.randomUUID(), metadata: { syntheticLegacyConflict: true },
    } });
    const assignedQueue = load('services/accounting/missing-close-evidence-request-queue.service.ts').getClientMissingCloseEvidenceRequestQueue;
    const reviewQueue = load('services/accounting/missing-close-evidence-accountant-review-queue.service.ts').getAccountantMissingCloseEvidenceReviewQueue;
    await check('Malformed legacy duplicate requests remain visible to both queues and stop direct response', async () => {
      const { request } = await newRequest('request-conflict'); await addConflict(request, 'CLIENT_ACTION_REQUIRED'); const prior = await state();
      for (const page of [undefined, { periodId: x.periodId }]) {
        const queue = await assignedQueue({ ...actor('checker'), actorPermissions: ['accounting.close.read'], page });
        assert.equal(queue.requests.some(row => row.requestId === request.id), false); assert.ok(queue.blockers.length);
      }
      await assert.rejects(response(request, 'checker'), error => error.code === 'REVIEW_REQUIRED'); assert.deepEqual(await state(), prior);
      const inspected = await workflow.getCloseEvidenceInvestigation(actor('maker'), x.periodId, request.id);
      assert.equal(inspected.records.length, 2); assert.ok(inspected.issues.includes('MULTIPLE_REQUESTS')); assert.ok(inspected.issues.includes('MALFORMED_RECORD'));
      assert.equal(inspected.revision, (await workflow.getCloseEvidenceInvestigation(actor('maker'), x.periodId, request.id)).revision);
      assert.equal(inspected.truncated, false); assert.equal(JSON.stringify(inspected).includes('syntheticLegacyConflict'), false);
      await assert.rejects(workflow.getCloseEvidenceInvestigation(actor('maker'), 'wrong-period', request.id), error => error.code === 'NOT_FOUND');
      assert.deepEqual(await state(), prior);
      return { legacyAndPagedQueueRefused: true, directResponseRefused: true, noMutation: true, investigation: { records: inspected.records.length, issues: inspected.issues, repeatableRevision: true, wrongPeriodDenied: true, metadataRedacted: true } };
    });
    for (const kind of ['CLIENT_ACTION_REQUIRED', 'CLIENT_RESPONSE_SUBMITTED', 'ACCOUNTANT_RESPONSE_ACCEPTED']) await check('Retained ' + kind + ' conflict stops independent acceptance without effects', async () => {
      const { request } = await newRequest('accept-conflict-' + kind); const answered = await response(request, 'checker');
      const preview = await workflow.getCloseEvidenceReview(actor('maker'), request.id); assert.equal(preview.replacement.status, 'AVAILABLE');
      await addConflict(request, kind); const prior = await state(), control = await acceptanceControl();
      for (const page of [undefined, { periodId: x.periodId }]) {
        const queue = await reviewQueue({ homeOrganizationId: x.organizationId, actorId: ids.maker, actorPermissions: ['accounting.close.read', 'accounting.close.accountant.review'], requestId: request.id, page });
        assert.equal(queue.items.some(row => row.request.requestId === request.id), false); assert.ok(queue.blockers.length);
      }
      const beforeAcceptance = await state();
      await assert.rejects(service.acceptMissingCloseEvidenceResponse(x.organizationId, { requestId: request.id, responseId: answered.id, resolutionNotes: 'Independent inspection of source evidence before resolving.', replacement: preview.replacement.selection, correlationId: 'accept-' + request.id }, control), error => error.code === 'REVIEW_REQUIRED');
      assert.deepEqual(await state(), beforeAcceptance);
      assert.equal(await db.accountantComment.count({ where: { ...scope, findingId: request.findingId } }), 3);
      return { legacyAndPagedReviewRefused: true, directAcceptanceRefused: true, recordsRetained: 3, noAcceptanceEffects: true, beforeStepUp: prior };
    });
    await check('Conflict committed after preview is detected by the final locked evidence read', async () => {
      const { request } = await newRequest('late-conflict'), answered = await response(request, 'checker'), preview = await workflow.getCloseEvidenceReview(actor('maker'), request.id), control = await acceptanceControl();
      let enter, release, timer, paused = false;
      const entered = new Promise(resolve => { enter = resolve; }), gate = new Promise((resolve, reject) => { release = resolve; timer = setTimeout(() => reject(Error('Acceptance barrier timed out')), 15000); }); gate.catch(() => {});
      const originalDb = dbModule.db;
      dbModule.db = new Proxy(db, { get(target, property) { if (property !== '$transaction') return Reflect.get(target, property); return (work, options) => target.$transaction(tx => work(new Proxy(tx, { get(client, method) { if (method !== '$queryRaw') return Reflect.get(client, method); return async sql => { if (!paused && sql.text?.includes('FROM "close_assurance_findings"') && sql.text.includes('FOR UPDATE')) { paused = true; enter(); await gate; } return client.$queryRaw(sql); }; } })), options); } });
      const pending = service.acceptMissingCloseEvidenceResponse(x.organizationId, { requestId: request.id, responseId: answered.id, resolutionNotes: 'Independent retained source review during concurrent change.', replacement: preview.replacement.selection, correlationId: 'late-accept-' + request.id }, control).then(value => ({ value }), error => ({ error })); let result, prior;
      try { await Promise.race([entered, gate]); await addConflict(request, 'CLIENT_RESPONSE_SUBMITTED'); prior = await state(); release(); result = await pending; }
      finally { release(); clearTimeout(timer); dbModule.db = originalDb; }
      assert.equal(result.error?.code, 'REVIEW_REQUIRED'); assert.deepEqual(await state(), prior);
      return { postPreviewConflictRefused: true, noAcceptanceEffects: true };
    });
    await check('Unambiguous work still completes and committed retries remain exact after later investigation evidence', async () => {
      const { request } = await newRequest('ordinary'), answered = await response(request, 'checker'), preview = await workflow.getCloseEvidenceReview(actor('maker'), request.id), control = await acceptanceControl();
      const input = { requestId: request.id, responseId: answered.id, resolutionNotes: 'Independent retained source review completed without conflicts.', replacement: preview.replacement.selection, correlationId: 'valid-accept-' + request.id };
      const accepted = await service.acceptMissingCloseEvidenceResponse(x.organizationId, input, control); assert.equal(accepted.decision, 'ACCEPTED');
      await addConflict(request, 'CLIENT_RESPONSE_SUBMITTED'); const prior = await state();
      assert.deepEqual(await service.acceptMissingCloseEvidenceResponse(x.organizationId, input, control), accepted);
      assert.deepEqual(await response(request, 'checker'), answered); assert.deepEqual(await state(), prior);
      return { ordinaryAcceptanceCompleted: true, responseAndAcceptanceReplayExact: true, laterHistoryPreserved: true };
    });
    await check('Two review commands using the same pre-completion state produce one acceptance and a stale-state refusal', async () => {
      const { request } = await newRequest('acceptance-race'), answered = await response(request, 'checker'), preview = await workflow.getCloseEvidenceReview(actor('maker'), request.id), control = await acceptanceControl();
      let release, timer, reads = 0;
      const gate = new Promise((resolve, reject) => { release = resolve; timer = setTimeout(() => reject(Error('Concurrent acceptance barrier timed out')), 15000); }); gate.catch(() => {});
      const originalDb = dbModule.db;
      dbModule.db = new Proxy(db, { get(target, property) { if (property !== '$transaction') return Reflect.get(target, property); return (work, options) => target.$transaction(tx => work(new Proxy(tx, { get(client, model) { if (model !== 'closeAssuranceFinding') return Reflect.get(client, model); return new Proxy(client.closeAssuranceFinding, { get(delegate, method) { if (method !== 'findFirst') return Reflect.get(delegate, method); return async args => { const value = await delegate.findFirst(args); if (args.where.id === request.findingId && args.select?.severity && reads < 2) { reads++; if (reads === 2) release(); await gate; } return value; }; } }); } })), options); } });
      let results;
      try { results = await Promise.allSettled(['one', 'two'].map(suffix => service.acceptMissingCloseEvidenceResponse(x.organizationId, { requestId: request.id, responseId: answered.id, resolutionNotes: 'Independent source review from the same pre-completion state.', replacement: preview.replacement.selection, correlationId: 'race-' + request.id + suffix }, control))); }
      finally { release(); clearTimeout(timer); dbModule.db = originalDb; }
      assert.equal(reads, 2); assert.equal(results.filter(row => row.status === 'fulfilled').length, 1); assert.equal(results.find(row => row.status === 'rejected').reason.code, 'CONFLICT');
      assert.equal(await db.accountantComment.count({ where: { ...scope, findingId: request.findingId, visibility: 'ACCOUNTANT_RESPONSE_ACCEPTED' } }), 1);
      return { concurrentPreviews: 2, acceptances: 1, staleStateRefused: true, noFalseInvestigation: true };
    });
    await db.role.create({ data: { ...scope, code: 'recovery-reviewer-' + run, nameEn: 'Synthetic independent recovery reviewer', permissions: ['accounting.close.read', 'accounting.close.accountant.review'], users: { connect: { id: ids.certifier } } } });
    await db.user.update({ where: { id: ids.certifier, ...scope }, data: { password: hashed, emailVerified: true } });
    await db.account.create({ data: { userId: ids.certifier, accountId: ids.certifier, providerId: 'credential', password: hashed } });
    const independentControl = async () => {
      const result = await stepUpSessionWithPassword({ sessionId: controls.certifier.session.id, sessionToken: controls.certifier.session.token, userId: ids.certifier, organizationId: x.organizationId, password });
      assert.equal(result.status, 'verified'); return controls.certifier;
    };
    const propose = async (request, selectedResponseId, selectedAcceptanceId = null) => {
      const snapshot = await workflow.getCloseEvidenceInvestigation(actor('maker'), x.periodId, request.id);
      const keep = [request.id, selectedResponseId, selectedAcceptanceId].filter(Boolean);
      const command = { periodId: x.periodId, requestId: request.id, expectedRevision: snapshot.revision, correlationId: 'recovery-' + request.id,
        selectedRequestId: request.id, selectedResponseId, selectedAcceptanceId, reason: 'Retain the service-issued chain; preserve explicitly injected legacy conflict for audit.',
        exclusions: snapshot.records.filter(row => !keep.includes(row.id)).map(row => ({ id: row.id, reason: 'Synthetic malformed duplicate; retain original without using it for processing.' })) };
      await acceptanceControl(); const result = await recovery.proposeCloseEvidenceResolution(x.organizationId, command, controls.maker);
      assert.deepEqual(await recovery.proposeCloseEvidenceResolution(x.organizationId, command, controls.maker), result);
      return { command, result };
    };
    const authorize = async proposalId => recovery.approveCloseEvidenceResolution(x.organizationId, { proposalId, correlationId: 'authorize-' + proposalId, notes: 'Independent review of retained chain and every excluded original record.' }, await independentControl());
    await check('Recovery proposal needs independent authorization and resumes response review without deleting records', async () => {
      const { request } = await newRequest('recover-response'), answered = await response(request, 'checker'); await addConflict(request, 'CLIENT_RESPONSE_SUBMITTED');
      const beforeRows = await db.accountantComment.findMany({ where: { ...scope, findingId: request.findingId }, orderBy: { id: 'asc' } });
      const { result } = await propose(request, answered.id);
      await assert.rejects(recovery.approveCloseEvidenceResolution(x.organizationId, { proposalId: result.proposalId, correlationId: 'self-' + request.id, notes: 'Cannot authorize my own recovery proposal.' }, controls.maker), error => error.code === 'FORBIDDEN');
      const pending = await workflow.getCloseEvidenceInvestigation(actor('certifier'), x.periodId, request.id); assert.equal(pending.proposals.find(row => row.id === result.proposalId).canApprove, true);
      const approved = await authorize(result.proposalId); assert.deepEqual(await authorize(result.proposalId), approved);
      assert.deepEqual(await db.accountantComment.findMany({ where: { ...scope, findingId: request.findingId }, orderBy: { id: 'asc' } }), beforeRows);
      for (const page of [undefined, { periodId: x.periodId }]) { const queue = await reviewQueue({ homeOrganizationId: x.organizationId, actorId: ids.maker, actorPermissions: ['accounting.close.read', 'accounting.close.accountant.review'], page }); assert.ok(queue.items.some(row => row.request.requestId === request.id)); }
      const preview = await workflow.getCloseEvidenceReview(actor('maker'), request.id); assert.equal(preview.replacement.status, 'AVAILABLE');
      await service.acceptMissingCloseEvidenceResponse(x.organizationId, { requestId: request.id, responseId: answered.id, replacement: preview.replacement.selection, resolutionNotes: 'Source evidence reviewed separately after recovery authorization.', correlationId: 'recovered-accept-' + request.id }, await acceptanceControl());
      const tracking = await workflow.getCloseEvidenceWorkflow(actor('maker'), x.periodId, { kind: 'tracking' }); assert.equal(tracking.tracking.find(row => row.requestId === request.id).state, 'ACCEPTED');
      assert.equal(await db.accountantComment.count({ where: { ...scope, findingId: request.findingId } }), 4);
      return { independentAuthorization: true, proposalsReplayExact: true, approvalsReplayExact: true, bothReviewQueuesRestored: true, actualAcceptance: true, allOriginalRecordsRetained: true };
    });
    await check('Duplicate request recovery restores assigned work and labels excluded history without erasing it', async () => {
      const { request } = await newRequest('recover-request'), duplicate = await addConflict(request, 'CLIENT_ACTION_REQUIRED');
      const { result } = await propose(request, null); await authorize(result.proposalId);
      for (const page of [undefined, { periodId: x.periodId }]) { const queue = await assignedQueue({ ...actor('checker'), actorPermissions: ['accounting.close.read'], page }); assert.ok(queue.requests.some(row => row.requestId === request.id)); }
      const tracking = await workflow.getCloseEvidenceWorkflow(actor('maker'), x.periodId, { kind: 'tracking' }); assert.equal(tracking.tracking.find(row => row.requestId === duplicate.id).state, 'SUPERSEDED');
      await response(request, 'checker'); assert.equal(await db.accountantComment.count({ where: { ...scope, findingId: request.findingId } }), 3);
      return { bothAssignedQueuesRestored: true, excludedRequestLabelled: true, actualResponse: true, originalsRetained: true };
    });
    await check('Post-proposal source changes refuse authorization without effects', async () => {
      const { request } = await newRequest('recovery-stale'); await addConflict(request, 'CLIENT_ACTION_REQUIRED'); const { result } = await propose(request, null);
      await addConflict(request, 'CLIENT_ACTION_REQUIRED'); await independentControl(); const before = await state();
      await assert.rejects(recovery.approveCloseEvidenceResolution(x.organizationId, { proposalId: result.proposalId, correlationId: 'stale-' + request.id, notes: 'This proposal must be refused after new evidence.' }, controls.certifier), error => error.code === 'CONFLICT');
      assert.deepEqual(await state(), before); return { staleAuthorizationRefused: true, noMutation: true };
    });
    await check('Concurrent recovery authorizations retain exactly one decision', async () => {
      const { request } = await newRequest('recovery-race'); await addConflict(request, 'CLIENT_ACTION_REQUIRED'); const { result } = await propose(request, null), control = await independentControl();
      const results = await Promise.allSettled(['one', 'two'].map(suffix => recovery.approveCloseEvidenceResolution(x.organizationId, { proposalId: result.proposalId, correlationId: 'recovery-race-' + request.id + suffix, notes: 'Independent recovery review from the same proposal.' }, control)));
      assert.equal(results.filter(row => row.status === 'fulfilled').length, 1); assert.equal(results.find(row => row.status === 'rejected').reason.code, 'CONFLICT');
      assert.equal(await db.ledgerAuditEvent.count({ where: { ...scope, action: 'CLOSE_EVIDENCE_HISTORY_APPROVED', resourceId: request.findingId } }), 1);
      return { retainedAuthorizations: 1, concurrentDecisionRefused: true };
    });
    await check('Malformed legacy acceptance can be explicitly excluded without treating it as accepted evidence', async () => {
      const { request } = await newRequest('recover-malformed-acceptance'), answered = await response(request, 'checker'); await addConflict(request, 'ACCOUNTANT_RESPONSE_ACCEPTED');
      const { result } = await propose(request, answered.id); await authorize(result.proposalId);
      const preview = await workflow.getCloseEvidenceReview(actor('maker'), request.id); assert.equal(preview.replacement.status, 'AVAILABLE');
      await service.acceptMissingCloseEvidenceResponse(x.organizationId, { requestId: request.id, responseId: answered.id, replacement: preview.replacement.selection, resolutionNotes: 'Actual source acceptance after explicit malformed-history recovery.', correlationId: 'accept-after-malformed-' + request.id }, await acceptanceControl());
      assert.equal(await db.accountantComment.count({ where: { ...scope, findingId: request.findingId, visibility: 'ACCOUNTANT_RESPONSE_ACCEPTED' } }), 2);
      return { malformedRecordRetained: true, actualAcceptanceSeparatelyVerified: true };
    });
    await check('Recovery of already accepted evidence preserves its outcome and requires a valid retained acceptance', async () => {
      const { request } = await newRequest('recovery-accepted'), answered = await response(request, 'checker'), preview = await workflow.getCloseEvidenceReview(actor('maker'), request.id);
      const accepted = await service.acceptMissingCloseEvidenceResponse(x.organizationId, { requestId: request.id, responseId: answered.id, replacement: preview.replacement.selection, resolutionNotes: 'Independent source review before recording accepted evidence.', correlationId: 'accept-before-recovery-' + request.id }, await acceptanceControl());
      await addConflict(request, 'ACCOUNTANT_RESPONSE_ACCEPTED');
      const beforeFinding = await db.closeAssuranceFinding.findUnique({ where: { id: request.findingId } }), { result } = await propose(request, answered.id, accepted.id); await authorize(result.proposalId);
      assert.deepEqual(await db.closeAssuranceFinding.findUnique({ where: { id: request.findingId } }), beforeFinding);
      const tracked = await workflow.getCloseEvidenceWorkflow(actor('maker'), x.periodId, { kind: 'tracking' }); assert.equal(tracked.tracking.find(row => row.requestId === request.id).state, 'ACCEPTED');
      assert.equal(await db.accountantComment.count({ where: { ...scope, findingId: request.findingId } }), 4);
      return { originalAcceptancePreserved: true, findingUnchanged: true, allRecordsRetained: true };
    });
    for (const decision of ['WITHDRAWN', 'REJECTED']) await check(decision + ' proposal retains its reason, exact retries and excludes later authorization', async () => {
      const { request } = await newRequest('close-' + decision); await addConflict(request, 'CLIENT_ACTION_REQUIRED'); const { result } = await propose(request, null);
      await independentControl(); const who = decision === 'WITHDRAWN' ? 'maker' : 'certifier', wrong = decision === 'WITHDRAWN' ? 'certifier' : 'maker';
      const command = { proposalId: result.proposalId, correlationId: 'close-' + request.id, decision, reason: 'The proposed selection needs a separately reviewed correction.' };
      const prior = await state();
      await assert.rejects(recovery.closeEvidenceResolutionProposal(x.organizationId, command, controls[wrong]), error => error.code === 'FORBIDDEN');
      await assert.rejects(recovery.closeEvidenceResolutionProposal('foreign-organization', command, controls[who]), error => ['FORBIDDEN', 'NOT_FOUND'].includes(error.code));
      await assert.rejects(recovery.closeEvidenceResolutionProposal(x.organizationId, command, controls.checker), error => error.code === 'FORBIDDEN');
      assert.deepEqual(await state(), prior);
      if (decision === 'WITHDRAWN') await addConflict(request, 'CLIENT_ACTION_REQUIRED'); // stale proposals remain withdrawable
      const beforeRows = await db.accountantComment.findMany({ where: { ...scope, findingId: request.findingId }, orderBy: { id: 'asc' } });
      const beforeFinding = await db.closeAssuranceFinding.findUnique({ where: { id: request.findingId } });
      const closed = await recovery.closeEvidenceResolutionProposal(x.organizationId, command, controls[who]);
      assert.equal(closed.state, decision); assert.deepEqual(await recovery.closeEvidenceResolutionProposal(x.organizationId, command, controls[who]), closed);
      const after = await state();
      await assert.rejects(recovery.closeEvidenceResolutionProposal(x.organizationId, { ...command, reason: 'Different intent cannot reuse this submission key.' }, controls[who]), error => error.code === 'CONFLICT');
      await assert.rejects(authorize(result.proposalId), error => error.code === 'CONFLICT');
      assert.deepEqual(await state(), after);
      const view = await workflow.getCloseEvidenceInvestigation(actor(who), x.periodId, request.id), item = view.proposals.find(row => row.id === result.proposalId);
      assert.equal(item.outcome.state, decision); assert.equal(item.outcome.reason, command.reason); assert.equal(item.canApprove, false); assert.equal(item.canWithdraw, false); assert.equal(item.canReject, false);
      assert.deepEqual(await db.accountantComment.findMany({ where: { ...scope, findingId: request.findingId }, orderBy: { id: 'asc' } }), beforeRows);
      assert.deepEqual(await db.closeAssuranceFinding.findUnique({ where: { id: request.findingId } }), beforeFinding);
      return { decision, exactRetry: true, changedRetryRefused: true, wrongActorAndTenantDenied: true, insufficientRoleDenied: true, authorizationRefused: true, originalsAndFindingRetained: true, staleWithdrawal: decision === 'WITHDRAWN' };
    });
    for (const decision of ['WITHDRAWN', 'REJECTED']) await check('Authorization races ' + decision + ' with exactly one terminal outcome', async () => {
      const { request } = await newRequest('close-race-' + decision); await addConflict(request, 'CLIENT_ACTION_REQUIRED'); const { result } = await propose(request, null); await independentControl();
      const outcomes = await Promise.allSettled([
        authorize(result.proposalId),
        recovery.closeEvidenceResolutionProposal(x.organizationId, { proposalId: result.proposalId, correlationId: 'close-race-' + request.id, decision, reason: 'Close pending selection while another reviewer authorizes it.' }, controls[decision === 'WITHDRAWN' ? 'maker' : 'certifier']),
      ]);
      assert.equal(outcomes.filter(row => row.status === 'fulfilled').length, 1); assert.equal(outcomes.find(row => row.status === 'rejected').reason.code, 'CONFLICT');
      assert.equal(await db.ledgerAuditEvent.count({ where: { ...scope, resourceId: request.findingId, action: { in: ['CLOSE_EVIDENCE_HISTORY_APPROVED', 'CLOSE_EVIDENCE_HISTORY_CLOSED'] } } }), 1);
      const view = await workflow.getCloseEvidenceInvestigation(actor('maker'), x.periodId, request.id), item = view.proposals.find(row => row.id === result.proposalId);
      assert.ok(item.outcome); assert.equal(item.canApprove, false); assert.equal(item.canWithdraw, false); assert.equal(item.canReject, false);
      return { decision, terminalOutcomes: 1, conflictingTransitionRefused: true, finalState: item.outcome.state };
    });
    await check('Completed authorization cannot be withdrawn or rejected', async () => {
      const { request } = await newRequest('close-approved'); await addConflict(request, 'CLIENT_ACTION_REQUIRED'); const { result } = await propose(request, null); await authorize(result.proposalId); const prior = await state();
      for (const decision of ['WITHDRAWN', 'REJECTED']) await assert.rejects(recovery.closeEvidenceResolutionProposal(x.organizationId, { proposalId: result.proposalId, correlationId: 'close-approved-' + decision + request.id, decision, reason: 'An approved selection cannot be closed as pending.' }, controls[decision === 'WITHDRAWN' ? 'maker' : 'certifier']), error => error.code === 'CONFLICT');
      assert.deepEqual(await state(), prior); return { approvedOutcomePreserved: true, bothTransitionsRefused: true };
    });
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    try { report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.checks.length === 18 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-evidence-ambiguity-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
