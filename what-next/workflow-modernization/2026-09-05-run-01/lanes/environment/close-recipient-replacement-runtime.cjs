"use strict";
// Inert without --run. Writes only new synthetic fixtures in the guarded owned loopback database.
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = file => require(path.join(root, file)), service = load('services/accounting/close-assurance.service.ts');
  const workflow = load('services/accounting/close-evidence-workflow.service.ts'), payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
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
    const x = await h.fixture('recipient-change-' + run.slice(0, 8)); report.fixture = x.info;
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
    const command = (request, recipient = 'certifier', revision = request.id, suffix = '') => ({ requestId: request.id, expectedRevision: revision, requestedFromId: ids[recipient], reason: 'Previous colleague is unavailable; retain this request and deadline.', correlationId: 'replace-' + request.id + suffix });
    const replace = input => service.replaceMissingCloseEvidenceRecipient(x.organizationId, input, controls.maker);
    const response = (request, who) => service.respondToMissingCloseEvidence(x.organizationId, { requestId: request.id, responseText: 'Collector restored; inspect the retained observation.', correlationId: 'response-' + request.id + who }, controls[who]);
    const state = async () => { const value = {}; for (const model of ['closeAssuranceFinding', 'accountantComment', 'ledgerAuditEvent', 'businessEvent', 'businessEventOutbox', 'businessEventAudit']) value[model] = f.hash(await db[model].findMany({ where: scope, orderBy: { id: 'asc' } })); return value; };
    const auditCount = request => db.ledgerAuditEvent.count({ where: { ...scope, action: 'CLOSE_MISSING_EVIDENCE_RECIPIENT_REPLACED', resourceId: request.id } });
    await check('Leaver replacement preserves the request and deadline; only the new recipient responds', async () => {
      const { finding, request } = await newRequest('leaver'), original = await db.accountantComment.findUniqueOrThrow({ where: { id: request.id } });
      await db.user.update({ where: { id: ids.checker, ...scope }, data: { isActive: false } });
      const input = command(request), changed = await replace(input);
      assert.deepEqual(await db.accountantComment.findUniqueOrThrow({ where: { id: request.id } }), original);
      const retained = await db.closeAssuranceFinding.findUniqueOrThrow({ where: { id: finding.id } }); assert.equal(retained.ownerId, ids.certifier); assert.equal(retained.dueAt.toISOString(), original.metadata.dueAt);
      await db.user.update({ where: { id: ids.checker, ...scope }, data: { isActive: true } });
      const started = Date.now(), view = await workflow.getCloseEvidenceWorkflow(actor('maker'), x.periodId), trackingMs = Date.now() - started;
      assert.equal(view.tracking.find(row => row.requestId === request.id).assignment.revision, changed.revision);
      assert.ok((await workflow.getCloseEvidenceWorkflow(actor('certifier'), x.periodId)).requests.some(row => row.requestId === request.id));
      assert.equal((await workflow.getCloseEvidenceWorkflow(actor('checker'), x.periodId)).requests.some(row => row.requestId === request.id), false);
      const deniedBefore = await state(); await assert.rejects(response(request, 'checker'), error => error.code === 'FORBIDDEN'); assert.deepEqual(await state(), deniedBefore);
      await response(request, 'certifier'); const detail = await workflow.getCloseEvidenceReview(actor('maker'), request.id); assert.equal(detail.item.response.respondedById, ids.certifier); assert.equal(detail.canAccept, true);
      const prior = await state(); assert.deepEqual(await replace(input), changed); assert.deepEqual(await state(), prior);
      await assert.rejects(replace(command(request, 'checker', changed.revision, '-after-response')), error => error.code === 'CONFLICT'); assert.deepEqual(await state(), prior);
      return { originalRequestPreserved: true, deadlinePreserved: true, oldRecipientDenied: true, newRecipientResponded: true, independentReviewAvailable: true, exactRetryAfterResponse: true, trackingMs };
    });
    await check('Successive replacements preserve revision history and reject stale or mismatched retries', async () => {
      const { request } = await newRequest('chain'), firstInput = command(request), first = await replace(firstInput);
      const second = await replace(command(request, 'checker', first.revision, '-second')); assert.notEqual(first.revision, second.revision);
      const prior = await state(); assert.deepEqual(await replace(firstInput), first);
      await assert.rejects(replace(command(request, 'certifier', first.revision, '-stale')), error => error.code === 'CONFLICT');
      await assert.rejects(replace({ ...firstInput, reason: 'A different reason using the same retry identifier.' }), error => error.code === 'CONFLICT');
      assert.deepEqual(await state(), prior); const view = await workflow.getCloseEvidenceWorkflow(actor('maker'), x.periodId); assert.equal(view.tracking.find(row => row.requestId === request.id).assignment.revision, second.revision);
      return { retainedChanges: await auditCount(request), staleRefused: true, replayDidNotUndoLaterChange: true };
    });
    await check('Current assignment authority, recipient eligibility and tenant scope are enforced', async () => {
      const { request } = await newRequest('authority'), input = command(request), prior = await state();
      await db.role.update({ where: { id: roles.maker.id, ...scope }, data: { permissions: roles.maker.permissions.filter(value => value !== 'accounting.close.finding.assign') } });
      await assert.rejects(replace(input), error => error.code === 'FORBIDDEN');
      await db.role.update({ where: { id: roles.maker.id, ...scope }, data: { permissions: roles.maker.permissions } });
      await db.user.update({ where: { id: ids.certifier, ...scope }, data: { isActive: false } });
      await assert.rejects(replace(input), error => error.code === 'FORBIDDEN');
      await db.user.update({ where: { id: ids.certifier, ...scope }, data: { isActive: true } });
      await assert.rejects(service.replaceMissingCloseEvidenceRecipient('foreign-unowned-organization', input, controls.maker), error => error.code === 'FORBIDDEN');
      assert.deepEqual(await state(), prior); return { permissionDenied: true, unavailableRecipientDenied: true, foreignScopeDenied: true, noEvidenceEffects: true };
    });
    await check('Concurrent exact submissions produce one replacement and one retained result', async () => {
      const { request } = await newRequest('exact-race'), input = command(request), values = await Promise.all([replace(input), replace(input)]);
      assert.deepEqual(values[0], values[1]); assert.equal(await auditCount(request), 1); return { submissions: 2, retainedChanges: 1, sameResult: true };
    });
    await check('Concurrent distinct submissions against one revision have only one winner', async () => {
      const { request } = await newRequest('distinct-race'), results = await Promise.allSettled([replace(command(request)), replace(command(request, 'maker', request.id, '-other'))]);
      assert.equal(results.filter(row => row.status === 'fulfilled').length, 1); assert.equal(results.find(row => row.status === 'rejected').reason.code, 'CONFLICT'); assert.equal(await auditCount(request), 1);
      return { accepted: 1, refused: 1, retainedChanges: 1 };
    });
    await check('A response overlapping committed replacement cannot use the old assignment', async () => {
      const { request } = await newRequest('response-race'); let enter, release, timer, paused = false, reads = 0;
      const entered = new Promise(resolve => { enter = resolve; }), gate = new Promise((resolve, reject) => { release = resolve; timer = setTimeout(() => reject(Error('Response overlap barrier timed out')), 15000); }); gate.catch(() => {});
      const originalDb = dbModule.db;
      dbModule.db = new Proxy(db, { get(target, property) { if (property !== '$transaction') return Reflect.get(target, property); return (work, options) => target.$transaction(tx => work(new Proxy(tx, { get(client, model) { if (model !== 'accountantComment') return Reflect.get(client, model); return new Proxy(client.accountantComment, { get(delegate, method) { if (method !== 'findFirst') return Reflect.get(delegate, method); return async args => { const value = await delegate.findFirst(args); if (args.where.id === request.id) { reads++; if (!paused) { paused = true; enter(); await gate; } } return value; }; } }); } })), options); } });
      const pending = response(request, 'checker').then(value => ({ value }), error => ({ error })); let result;
      try { await Promise.race([entered, gate]); await replace(command(request)); release(); result = await pending; }
      finally { release(); clearTimeout(timer); dbModule.db = originalDb; }
      assert.equal(result.error?.code, 'FORBIDDEN'); assert.equal(await db.accountantComment.count({ where: { ...scope, findingId: request.findingId, visibility: 'CLIENT_RESPONSE_SUBMITTED' } }), 0);
      await response(request, 'certifier'); return { oldResponseRefused: true, newRecipientResponded: true, reads };
    });
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    try { report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.checks.length === 6 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-recipient-replacement-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
