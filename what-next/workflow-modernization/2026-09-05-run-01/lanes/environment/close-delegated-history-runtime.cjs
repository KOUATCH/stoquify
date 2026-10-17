"use strict";
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = name => require(path.join(root, name)), desk = load('services/accounting/accountant-work-desk.service.ts'), history = load('services/accounting/accountant-notification-history.service.ts'), service = load('services/accounting/close-assurance.service.ts');
  const { runCloseEvidenceNotificationWorker } = load('services/accounting/close-evidence-notification.worker.ts'), { hashPassword } = load('lib/password.ts'), { stepUpSessionWithPassword } = load('services/security/step-up-auth.service.ts');
  const run = crypto.randomUUID(), secrets = [], sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), checks: [], limitations: ['Owned synthetic client and mandate; actual independent acceptance and in-app publication, no real professional approval or external dispatch.', 'No scheduler, historical SENT backfill or operator repair implemented by this check.'] };
  const check = async (name, fn) => { const row = { name }; report.checks.push(row); row.result = await fn(); row.passed = true; console.log(JSON.stringify({ name, passed: true })); };
  const outside = async () => f.hash({ base: await h.outside(), comments: await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }), inbox: await db.closeEvidenceNotification.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }), grants: await db.accountantAccessGrant.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }) });
  try {
    const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), 'stoquify_local_registration_20260906_01'); assert.ok(['localhost', '127.0.0.1'].includes(target.hostname)); await helper.withClient(target, helper.assertOwned);
    const predecessor = process.env.STOQUIFY_CLOSE_HISTORY_PREDECESSOR, predecessorHash = process.env.STOQUIFY_CLOSE_HISTORY_SHA; assert.ok(/^close-delegated-notification-[a-f0-9-]{36}\.json$/.test(predecessor || '')); assert.ok(/^[a-f0-9]{64}$/.test(predecessorHash || ''));
    const bytes = fs.readFileSync(path.join(__dirname, predecessor)); assert.equal(sha(bytes), predecessorHash); const previous = JSON.parse(bytes);
    for (const flag of ['passed', 'sourceStable', 'outsideUnchanged', 'financialUnchanged']) assert.equal(previous[flag], true);
    for (const file of ['services/accounting/accountant-work-desk.service.ts', 'services/accounting/close-evidence-notification.worker.ts', 'services/accounting/close-assurance.service.ts']) assert.equal(previous.sourceAfter[file], sha(fs.readFileSync(path.join(root, file))));
    const w = previous.workDesk; assert.ok(w.clientOrganizationId.startsWith('workflow_close_write_') && w.homeOrganizationId.startsWith('workflow_close_write_')); h.organizations.push(w.clientOrganizationId, w.homeOrganizationId); report.workDesk = w; report.fixture = previous.fixture; report.predecessor = { name: predecessor, sha256: sha(bytes) };
    report.sourceBefore = sources(); report.outsideBefore = await outside(); report.financialBefore = await h.financial();
    const permissions = ['dashboard.read', 'accounting.audit.read', 'accounting.close.accountant.review'], actor = { homeOrganizationId: w.homeOrganizationId, actorId: w.actorId, actorPermissions: permissions };
    const read = () => history.getAccountantNotificationHistory(actor, { clientOrganizationId: w.clientOrganizationId });
    await check('Current delegated history reads published request and response with source scope', async () => {
      const result = await read(); assert.equal(result.incomplete, false); assert.ok(result.items.some(item => item.requestId === w.requestId && item.eventName.endsWith('response_submitted'))); assert.ok(result.items.some(item => item.requestId === w.recoveredRequestId)); return { publications: result.items.length };
    });
    const sessionFor = async userId => { const token = crypto.randomBytes(32).toString('hex'); secrets.push(token); const session = await db.session.create({ data: { userId, token, expiresAt: new Date(Date.now() + 3600000) } }); return { id: session.id, token }; };
    const session = await sessionFor(w.actorId), password = 'Owned-history-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password, hashed);
    await db.user.update({ where: { id: w.actorId, organizationId: w.homeOrganizationId }, data: { password: hashed, emailVerified: true } });
    const credential = await db.account.findFirst({ where: { userId: w.actorId, accountId: w.actorId, providerId: 'credential' }, select: { id: true } });
    if (credential) await db.account.update({ where: { id: credential.id }, data: { password: hashed } }); else await db.account.create({ data: { userId: w.actorId, accountId: w.actorId, providerId: 'credential', password: hashed } });
    const step = await stepUpSessionWithPassword({ sessionId: session.id, sessionToken: session.token, userId: w.actorId, organizationId: w.homeOrganizationId, password }); assert.equal(step.status, 'verified');
    await check('Independent real acceptance removes open work and retains its publication history', async () => {
      const checker = previous.fixture.actorIds.checker, checkerSession = await sessionFor(checker);
      await service.respondToMissingCloseEvidence(w.clientOrganizationId, { requestId: w.recoveredRequestId, responseText: 'Recovered source and retained history are ready for the independent reviewer.', correlationId: 'history-response-' + run }, { actorId: checker, session: checkerSession });
      for (const requestId of [w.requestId, w.recoveredRequestId]) {
        const detail = await desk.getAccountantWorkDetail(actor, w.clientOrganizationId, requestId); assert.equal(detail.replacement.status, 'AVAILABLE');
        await service.acceptMissingCloseEvidenceResponse(w.homeOrganizationId, { clientOrganizationId: w.clientOrganizationId, requestId, responseId: detail.item.response.responseId, resolutionNotes: 'Independent synthetic review of restored source and retained request history.', replacement: detail.replacement.selection, correlationId: 'history-accept-' + requestId }, { actorId: w.actorId, actorPermissions: permissions, session, requireWorkDeskAccess: true, freshAuth: { actorId: w.actorId, organizationId: w.homeOrganizationId, lastAuthAt: step.verifiedAt } });
      }
      assert.ok((await runCloseEvidenceNotificationWorker({ organizationId: w.clientOrganizationId, workerId: 'history-' + run, limit: 100 })).every(row => row.status === 'SENT'));
      const queue = await desk.getAccountantWorkDesk(actor); assert.equal(queue.items.length, 0); assert.ok(queue.clientContinuations.some(row => row.clientOrganizationId === w.clientOrganizationId));
      const started = Date.now(), result = await read(); report.historyReadMs = Date.now() - started; assert.equal(result.incomplete, false);
      for (const requestId of [w.requestId, w.recoveredRequestId]) assert.ok(result.items.some(row => row.requestId === requestId && row.eventName.endsWith('response_accepted')));
      return { openItems: queue.items.length, retainedPublications: result.items.length, clientEntryRetained: true };
    });
    await check('Revoked mandate refuses retained history, then current restored authority recovers it', async () => {
      const grant = await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: w.grantId } }); await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: grant.grantedById } });
      try { await assert.rejects(read, error => error.code === 'FORBIDDEN'); } finally { await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: grant.status, revokedAt: grant.revokedAt, revokedById: grant.revokedById } }); }
      assert.ok((await read()).items.length > 0); return { authorityRechecked: true };
    });
    await check('Another client and another actor cursor cannot expose retained records', async () => {
      await assert.rejects(() => history.getAccountantNotificationHistory(actor, { clientOrganizationId: 'inaccessible-client-' + run }), error => error.code === 'FORBIDDEN');
      const cursor = Buffer.from(JSON.stringify({ version: 1, homeOrganizationId: w.homeOrganizationId, actorId: 'other', clientOrganizationId: w.clientOrganizationId, id: 'last', publishedAt: new Date().toISOString() })).toString('base64url');
      await assert.rejects(() => history.getAccountantNotificationHistory(actor, { clientOrganizationId: w.clientOrganizationId, cursor }), error => error.code === 'BUSINESS_RULE_VIOLATION'); return { isolated: true };
    });
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    try { report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore === report.outsideAfter; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.checks.length === 4 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-delegated-history-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
