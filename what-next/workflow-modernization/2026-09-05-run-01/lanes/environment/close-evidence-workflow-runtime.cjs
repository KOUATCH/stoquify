"use strict";
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = file => require(path.join(root, file));
  const service = load('services/accounting/close-assurance.service.ts');
  const workflow = load('services/accounting/close-evidence-workflow.service.ts');
  const replacement = load('services/accounting/close-evidence-replacement.service.ts');
  const payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
  const { getModuleCatalog } = load('services/modules/module-catalog.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const stamp = crypto.randomUUID(), sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run: stamp, at: new Date().toISOString(), checks: [], limitations: ['Owned loopback database, synthetic accounts, roles, sessions, module grants and balanced setup journal only.', 'Payment collector unavailability is explicit test fault injection; actual services create missing findings and replacement collections.', 'Concurrency proof covers the recorded requester-role, respondent-session and recipient-account/membership races in their stated directions. No browser, expert approval, customer activation, migration, seed, external delivery or real payment proof.'] };
  const authorityModule = load('services/accounting/close-evidence-acceptance-authority.service.ts'), originalAuthority = authorityModule.lockCloseEvidenceWorkAuthorityInTx;
  report.authorityFailures = [];
  authorityModule.lockCloseEvidenceWorkAuthorityInTx = async (...args) => { try { return await originalAuthority(...args); } catch(error) { report.authorityFailures.push({ code: error.code || null, sqlState: error.meta?.code || null }); throw error; } };
  async function outside() {
    const base = await h.outside(), comments = await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } });
    const sessions = await db.session.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } });
    return { hash: f.hash({ base, comments, sessions }), commentCount: comments.length, sessionCount: sessions.length, base };
  }
  async function check(name, work) {
    const row = { name }; report.checks.push(row);
    try { row.result = await work(); row.passed = true; } catch (error) { row.passed = false; row.error = f.safe(error); throw error; }
    console.log(JSON.stringify({ name, passed: row.passed }));
  }
  try {
    const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), 'stoquify_local_registration_20260906_01'); assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname));
    await helper.withClient(target, helper.assertOwned); await assertDisposableDatabaseIdentity(db, helper.database);
    report.sourceBefore = sources(); report.outsideBefore = await outside();
    const x = await h.fixture('evidence-workflow-' + stamp.slice(0, 8)); x.checkerId = x.info.actorIds.checker; report.fixture = x.info;
    assert.equal(new Set([x.makerId, x.checkerId, x.certifierId]).size, 3);
    const modules = getModuleCatalog().map(row => row.slug);
    await db.tenantModuleConfiguration.create({ data: { organizationId: x.organizationId, manifestHash: 'synthetic-' + stamp, selectedModules: modules, activeModules: modules } });
    await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.organizationId, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticFixture: true, noLiveActivation: true } })) });
    for (const [name, actorId, permissions] of [['requester', x.makerId, ['accounting.close.evidence.request']], ['respondent', x.checkerId, ['accounting.close.finding.comment']], ['reviewer', x.certifierId, ['accounting.close.accountant.review']]]) {
      await db.role.create({ data: { organizationId: x.organizationId, code: 'owned-evidence-' + name, nameEn: 'Synthetic evidence ' + name, permissions, users: { connect: { id: actorId } } } });
    }
    const reviewerSession = await db.session.create({ data: { userId: x.certifierId, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now()+3600000), assuranceVerifiedAt: new Date(), assuranceOrganizationId: x.organizationId, assuranceMethod: 'password', assuranceLevel: 1 } });
    const workSessions = new Map();
    for (const actorId of [x.makerId, x.checkerId]) workSessions.set(actorId, await db.session.create({ data: { userId: actorId, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now()+3600000) } }));
    const work = actorId => ({ actorId, session: { id: workSessions.get(actorId).id, token: workSessions.get(actorId).token } });
    const financialBefore = await h.financial(); report.financialBefore = financialBefore;
    const actor = actorId => ({ organizationId: x.organizationId, actorId });
    const originalCollector = payment.getPaymentReconciliationDashboardData;
    let adverse;
    try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Owned explicit unavailable collector test'); }; adverse = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'missing-' + stamp }, { actorId: x.makerId }); }
    finally { payment.getPaymentReconciliationDashboardData = originalCollector; }
    const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
    const missing = await db.closeEvidenceItem.findMany({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, available: false }, orderBy: { id: 'asc' } }); assert.ok(missing.length);
    let request, response, requestInput;
    const evidenceState = async () => f.hash({ comments: await db.accountantComment.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }), findings: await db.closeAssuranceFinding.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }), audits: await db.ledgerAuditEvent.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }), events: await db.businessEvent.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }) });
    async function revocationWins(change, submit, expectedCode) {
      let release, announce;
      const gate = new Promise(resolve => { release = resolve; }), ready = new Promise(resolve => { announce = resolve; });
      const before = await evidenceState(); let pending, blockerPid, observed = false;
      const writer = db.$transaction(async tx => { const rows = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid'); blockerPid = rows[0].pid; await change(tx); announce(); await gate; }, { timeout: 20000 });
      writer.catch(() => announce());
      try {
        await ready; pending = submit().then(() => ({ allowed: true }), error => ({ allowed: false, code: error.code }));
        for (let i=0; i<100; i++) { const rows = await db.$queryRawUnsafe('SELECT pid FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))', blockerPid); if(rows.length) { observed = true; break; } await new Promise(resolve => setTimeout(resolve,25)); }
        assert.equal(observed,true,'Actual authority lock wait must be observed');
      } finally { release(); await writer; }
      const outcome = await pending; assert.deepEqual(outcome,{allowed:false,code:expectedCode}); assert.equal(await evidenceState(),before); await assert.deepEqual(await h.financial(),financialBefore);
      return { observedDatabaseLockWait: observed, deniedCode: outcome.code, noEvidenceOrFinancialEffects: true };
    }
    await check('Historical missing finding remains discoverable after a new assessment', async () => {
      await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'newer-' + stamp }, { actorId: x.makerId });
      const view = await workflow.getCloseEvidenceWorkflow(actor(x.makerId), x.periodId);
      assert.ok(view.findings.some(row => row.id === finding.id)); assert.ok(view.recipients.some(row => row.id === x.checkerId));
      assert.equal(view.recipients.some(row => row.id === x.certifierId), false);
      return { historicalFindingId: finding.id, historicalRunId: adverse.run.id, sourceOwnedRecipient: x.checkerId };
    });
    await check('Concurrent requester role revocation wins before request publication', async () => {
      const role = await db.role.findFirstOrThrow({ where: { organizationId: x.organizationId, code: 'owned-evidence-requester' } });
      try { return await revocationWins(tx => tx.role.update({ where: { id: role.id }, data: { permissions: [] } }), () => service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: x.checkerId, requestText: 'Request attempted during real permission revocation.', dueAt: new Date(Date.now()+86400000), correlationId: 'role-race-'+stamp }, work(x.makerId)), 'FORBIDDEN'); }
      finally { await db.role.update({ where: { id: role.id }, data: { permissions: role.permissions } }); }
    });
    await check('Concurrent recipient account lock wins before new assignment', async () => {
      const prior = await db.user.findUniqueOrThrow({ where: { id: x.checkerId } });
      try { return await revocationWins(tx => tx.user.update({ where: { id: x.checkerId }, data: { isLocked: true, lockedUntil: null } }), () => service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: x.checkerId, requestText: 'Request attempted during real recipient account locking.', dueAt: new Date(Date.now()+86400000), correlationId: 'recipient-account-race-'+stamp }, work(x.makerId)), 'FORBIDDEN'); }
      finally { await db.user.update({ where: { id: x.checkerId }, data: { isLocked: prior.isLocked, lockedUntil: prior.lockedUntil } }); }
    });
    await check('Concurrent recipient membership removal wins before new assignment', async () => {
      const role = await db.role.findFirstOrThrow({ where: { organizationId: x.organizationId, code: 'owned-evidence-respondent' } });
      try { return await revocationWins(tx => tx.$executeRawUnsafe('DELETE FROM "_UserRoles" WHERE "A" = $1 AND "B" = $2', role.id, x.checkerId), () => service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: x.checkerId, requestText: 'Request attempted during real recipient membership removal.', dueAt: new Date(Date.now()+86400000), correlationId: 'recipient-membership-race-'+stamp }, work(x.makerId)), 'FORBIDDEN'); }
      finally { await db.user.update({ where: { id: x.checkerId }, data: { roles: { connect: { id: role.id } } } }); }
    });
    await check('Assignment winning recipient locks commits once; later recipient revocation preserves exact replay', async () => {
      const prior = await db.user.findUniqueOrThrow({ where: { id: x.checkerId } }), originalRecipient = authorityModule.lockCloseEvidenceRecipientInTx;
      let release, acquired; const gate = new Promise(resolve => { release = resolve; }), ready = new Promise(resolve => { acquired = resolve; }); let publication, revocation, observed = false;
      requestInput = { findingId: finding.id, requestedFromId: x.checkerId, requestText: 'Restore the missing payment collector evidence and review the current observation.', dueAt: new Date(Date.now()+15000), correlationId: 'request-' + stamp };
      authorityModule.lockCloseEvidenceRecipientInTx = async (...args) => { const result = await originalRecipient(...args); const rows = await args[0].$queryRawUnsafe('SELECT pg_backend_pid() AS pid'); acquired(rows[0].pid); await gate; return result; };
      try {
        publication = service.requestMissingCloseEvidence(x.organizationId, requestInput, work(x.makerId)); publication.catch(() => acquired(null));
        const holder = await ready; assert.ok(holder);
        // Start the lazy Prisma operation before observing its blocked connection.
        revocation = db.user.update({ where: { id: x.checkerId }, data: { isLocked: true, lockedUntil: null } }).then(value => value);
        for(let i=0;i<100;i++){ const rows = await db.$queryRawUnsafe('SELECT pid FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))',holder); if(rows.length){observed=true;break;} await new Promise(resolve=>setTimeout(resolve,25)); }
        assert.equal(observed,true); release(); request = await publication; await revocation; authorityModule.lockCloseEvidenceRecipientInTx = originalRecipient;
        const beforeReplay = await evidenceState(); const replay = await service.requestMissingCloseEvidence(x.organizationId,requestInput,work(x.makerId)); assert.equal(replay.id,request.id);
        await assert.rejects(()=>service.requestMissingCloseEvidence(x.organizationId,{...requestInput,correlationId:'new-after-recipient-lock-'+stamp},work(x.makerId)),error=>error.code==='FORBIDDEN');
        assert.equal(await evidenceState(),beforeReplay); assert.equal(await db.accountantComment.count({where:{organizationId:x.organizationId,correlationId:requestInput.correlationId}}),1);
        return { requestId:request.id, observedRevocationWait:observed, exactReplayAfterRecipientLock:true, newAssignmentDenied:true };
      } finally { release(); authorityModule.lockCloseEvidenceRecipientInTx = originalRecipient; if(publication)await publication.catch(()=>{}); if(revocation)await revocation.catch(()=>{}); await db.user.update({where:{id:x.checkerId},data:{isLocked:prior.isLocked,lockedUntil:prior.lockedUntil}}); }
    });
    await check('Request appears only in the actual recipient queue; expired exact retry preserves one record', async () => {
      const input = requestInput;
      const before = await db.accountantComment.count({ where: { organizationId: x.organizationId } });
      const effects = async () => f.hash({ comments: await db.accountantComment.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }), finding: await db.closeAssuranceFinding.findUnique({ where: { id: finding.id } }), audits: await db.ledgerAuditEvent.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }), events: await db.businessEvent.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }) });
      const beforeEffects = await effects();
      await new Promise(resolve => setTimeout(resolve, Math.max(0, input.dueAt.getTime()-Date.now()+25)));
      assert.ok(Date.now() >= input.dueAt.getTime());
      const replay = await service.requestMissingCloseEvidence(x.organizationId, input, work(x.makerId)); assert.equal(replay.id, request.id);
      await assert.rejects(() => service.requestMissingCloseEvidence(x.organizationId, { ...input, correlationId: 'new-expired-' + stamp }, work(x.makerId)), /due date must be in the future/i);
      await assert.rejects(() => service.requestMissingCloseEvidence(x.organizationId, { ...input, requestText: 'Different content must not reuse the committed request identity.' }, work(x.makerId)), /different missing-proof request/i);
      assert.equal(await db.accountantComment.count({ where: { organizationId: x.organizationId } }), before);
      assert.equal(await effects(), beforeEffects);
      const owner = await workflow.getCloseEvidenceWorkflow(actor(x.checkerId), x.periodId), requester = await workflow.getCloseEvidenceWorkflow(actor(x.makerId), x.periodId);
      assert.ok(owner.requests.some(row => row.requestId === request.id)); assert.equal(requester.requests.length, 0); assert.equal(requester.findings.some(row => row.id === finding.id), false);
      return { requestId: request.id, exactReplay: true, replayAfterDueAt: true, newExpiredDenied: true, changedReplayDenied: true, noDuplicateEffects: true, recipientScoped: true };
    });
    await check('Concurrent recipient session revocation wins before response publication', async () => {
      const session = workSessions.get(x.checkerId);
      const result = await revocationWins(tx => tx.session.delete({ where: { id: session.id } }), () => service.respondToMissingCloseEvidence(x.organizationId, { requestId: request.id, responseText: 'Response attempted during real session revocation.', correlationId: 'session-race-'+stamp }, work(x.checkerId)), 'AUTH_REQUIRED');
      workSessions.set(x.checkerId, await db.session.create({ data: { userId: x.checkerId, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now()+3600000) } })); return result;
    });
    await check('Response requires the assigned recipient; review preview is source-bound and private', async () => {
      await assert.rejects(() => service.respondToMissingCloseEvidence(x.organizationId, { requestId: request.id, responseText: 'Unauthorized response', correlationId: 'wrong-' + stamp }, work(x.makerId)));
      response = await service.respondToMissingCloseEvidence(x.organizationId, { requestId: request.id, responseText: 'Collector restored. The newer assessment contains the actual replacement observation.', correlationId: 'response-' + stamp }, work(x.checkerId));
      const owner = await workflow.getCloseEvidenceWorkflow(actor(x.checkerId), x.periodId); assert.equal(owner.requests.find(row => row.requestId === request.id).workflowState, 'RESPONSE_SUBMITTED'); assert.equal(owner.reviews.length, 0);
      const view = await workflow.getCloseEvidenceReview(actor(x.certifierId), request.id); assert.equal(view.replacement.status, 'AVAILABLE'); assert.equal(view.canAccept, true); assert.equal('binding' in view.replacement, false);
      await assert.rejects(() => workflow.getCloseEvidenceReview(actor(x.checkerId), request.id));
      return { responseId: response.id, replacement: view.replacement, nonReviewerDenied: true };
    });
    await check('Independent acceptance removes open work while preserving original missing evidence and financial records', async () => {
      const preview = await workflow.getCloseEvidenceReview(actor(x.certifierId), request.id);
      const result = await service.acceptMissingCloseEvidenceResponse(x.organizationId, { requestId: request.id, responseId: response.id, replacement: preview.replacement.selection, resolutionNotes: 'Independent reviewer verified the exact newer source collection and response.', correlationId: 'accept-' + stamp }, { actorId: x.certifierId, actorPermissions: ['accounting.close.accountant.review'], session: { id: reviewerSession.id, token: reviewerSession.token }, freshAuth: { actorId: x.certifierId, organizationId: x.organizationId, lastAuthAt: new Date() } });
      const view = await workflow.getCloseEvidenceWorkflow(actor(x.certifierId), x.periodId); assert.equal(view.reviews.length, 0);
      assert.deepEqual(await db.closeEvidenceItem.findMany({ where: { organizationId: x.organizationId, closeRunId: adverse.run.id, available: false }, orderBy: { id: 'asc' } }), missing);
      const verified = await db.$transaction(tx => replacement.getVerifiedCloseEvidenceReplacementsInTx(tx, x.organizationId)); assert.ok(missing.some(row => verified.evidenceIds.includes(row.id)));
      assert.deepEqual(await h.financial(), financialBefore);
      return { acceptanceId: result.id, originalMissingRetained: true, financialUnchanged: true };
    });
    report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter);
  } catch (error) { report.error = f.safe(error); }
  finally {
    authorityModule.lockCloseEvidenceWorkAuthorityInTx = originalAuthority;
    try { report.sourceAfter = sources(); report.sourceStable = !!report.sourceBefore && f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = !!report.outsideBefore && report.outsideBefore.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = f.safe(error); }
    await db.$disconnect(); report.passed = report.checks.length === 9 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const file = path.join(__dirname, 'close-evidence-workflow-runtime-' + stamp + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.map(row => ({ name: row.name, passed: row.passed })), error: report.error }));
  }
  return report;
}
module.exports = { main };
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, '[database URL redacted]')); process.exit(1); });
