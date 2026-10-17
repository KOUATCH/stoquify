"use strict";
// Explicit owned synthetic database only; --before observes the current defect.
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = file => require(path.join(root, file)), service = load('services/accounting/close-assurance.service.ts');
  const workflow = load('services/accounting/close-evidence-workflow.service.ts'), payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
  const dbModule = load('prisma/db.ts'), { getModuleCatalog } = load('services/modules/module-catalog.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const before = process.argv.includes('--before'), run = crypto.randomUUID(), secrets = [], sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), mode: before ? 'before-defect-reproduction' : 'after-verification', checks: [], limitations: ['Owned synthetic account/role/session/module and balanced setup journal only; no customer approval, real payment, migration, seed command, reset, external message or activation.', 'The race barrier pauses after actual correlation reads and records distinct PostgreSQL backend IDs. No database result or authorization decision is mocked.'] };
  const outside = async () => {
    const base = await h.outside(), comments = await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } });
    const sessions = await db.session.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } });
    return { hash: f.hash({ base, comments, sessions }) };
  };
  const check = async (name, work) => { const row = { name }; report.checks.push(row); try { row.result = await work(); row.passed = true; } catch (error) { row.error = f.safe(error, secrets); row.passed = false; throw error; } console.log(JSON.stringify({ name, passed: row.passed })); };
  try {
    const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), 'stoquify_local_registration_20260906_01'); assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
    await helper.withClient(target, helper.assertOwned); await assertDisposableDatabaseIdentity(db, helper.database);
    report.sourceBefore = sources(); report.outsideBefore = await outside();
    const x = await h.fixture('request-unique-' + run.slice(0, 8)); x.checkerId = x.info.actorIds.checker; report.fixture = x.info;
    const scope = { organizationId: x.organizationId }, modules = getModuleCatalog().map(row => row.slug);
    await db.tenantModuleConfiguration.create({ data: { ...scope, manifestHash: 'synthetic-' + run, selectedModules: modules, activeModules: modules } });
    await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ ...scope, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticFixture: true } })) });
    const controls = {};
    for (const [purpose, id, permission] of [['requester', x.makerId, 'accounting.close.evidence.request'], ['respondent', x.checkerId, 'accounting.close.finding.comment'], ['reviewer', x.certifierId, 'accounting.close.accountant.review']]) {
      await db.role.create({ data: { ...scope, code: 'unique-' + purpose, nameEn: 'Synthetic ' + purpose, permissions: [permission], users: { connect: { id } } } });
      const token = crypto.randomBytes(32).toString('hex'); secrets.push(token);
      const session = await db.session.create({ data: { userId: id, token, expiresAt: new Date(Date.now() + 3600000) } }); controls[id] = { actorId: id, session: { id: session.id, token } };
    }
    report.financialBefore = await h.financial();
    const actor = actorId => ({ ...scope, actorId });
    const newFinding = async label => {
      const original = payment.getPaymentReconciliationDashboardData; let adverse;
      try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Explicit synthetic collector failure'); }; adverse = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + run }, { actorId: x.makerId }); }
      finally { payment.getPaymentReconciliationDashboardData = original; }
      const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { ...scope, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
      await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + '-restored-' + run }, { actorId: x.makerId });
      return finding;
    };
    const command = (finding, key) => ({ findingId: finding.id, requestedFromId: x.checkerId, requestText: 'Review the retained missing payment-reconciliation evidence.', dueAt: new Date(Date.now() + 86400000), correlationId: key + run });
    const request = input => service.requestMissingCloseEvidence(x.organizationId, input, controls[x.makerId]);
    const state = async () => {
      const result = {};
      for (const model of ['closeAssuranceFinding', 'accountantComment', 'ledgerAuditEvent', 'businessEvent', 'businessEventOutbox', 'businessEventAudit']) result[model] = f.hash(await db[model].findMany({ where: scope, orderBy: { id: 'asc' } }));
      return result;
    };
    const firstFinding = await newFinding('serial'), originalInput = command(firstFinding, 'first'), originalRequest = await request(originalInput);
    await check(before ? 'Second request reproduces ambiguous downstream review' : 'Second distinct request is refused without mutation and exact replay remains available', async () => {
      const input = { ...originalInput, correlationId: 'second-' + run }, prior = await state();
      if (before) {
        const second = await request(input); assert.notEqual(second.id, originalRequest.id);
        await service.respondToMissingCloseEvidence(x.organizationId, { requestId: originalRequest.id, responseText: 'The collector is restored; review the replacement.', correlationId: 'response-' + run }, controls[x.checkerId]);
        const view = await workflow.getCloseEvidenceWorkflow(actor(x.certifierId), x.periodId);
        assert.equal(view.reviews.some(row => row.findingId === firstFinding.id), false); assert.equal(view.evidenceIssue, true);
        assert.equal(await db.accountantComment.count({ where: { ...scope, findingId: firstFinding.id, visibility: 'CLIENT_ACTION_REQUIRED' } }), 2);
        report.defectReproduced = true; return { requests: 2, responseSaved: true, findingAbsentFromReview: true, evidenceIssue: true };
      }
      await assert.rejects(request(input), error => error.code === 'CONFLICT'); assert.deepEqual(await state(), prior);
      const replay = await request(originalInput); assert.equal(replay.id, originalRequest.id); assert.deepEqual(await state(), prior);
      return { denied: true, exactReplay: true, noAdditionalEffects: true };
    });
    if (!before) {
      await check('New request cannot reset a submitted response; authorized review remains reachable', async () => {
        await service.respondToMissingCloseEvidence(x.organizationId, { requestId: originalRequest.id, responseText: 'The collector is restored; review the replacement.', correlationId: 'response-' + run }, controls[x.checkerId]);
        const prior = await state(); await assert.rejects(request({ ...originalInput, correlationId: 'after-response-' + run }), error => error.code === 'CONFLICT'); assert.deepEqual(await state(), prior);
        const detail = await workflow.getCloseEvidenceReview(actor(x.certifierId), originalRequest.id); assert.equal(detail.item.findingId, firstFinding.id); assert.equal(detail.replacement.status, 'AVAILABLE');
        return { reviewAvailable: true, replacementAvailable: true, responsePreserved: true };
      });
      const race = async same => {
        const finding = await newFinding(same ? 'same-key' : 'different-key'), input = command(finding, 'race-' + same), inputs = [input, { ...input, correlationId: same ? input.correlationId : input.correlationId + '-other' }];
        let entered = 0, release, timer; const backendIds = [], attempts = [];
        const gate = new Promise((resolve, reject) => { release = resolve; timer = setTimeout(() => reject(Error('Actual concurrent read barrier timed out')), 8000); });
        // Attach a rejection observer immediately; every contender still awaits the gate.
        gate.catch(() => {});
        const originalDb = dbModule.db;
        dbModule.db = new Proxy(db, { get(target, property) {
          if (property !== '$transaction') return Reflect.get(target, property);
          return (work, options) => target.$transaction(tx => work(new Proxy(tx, { get(client, model) {
            if (model !== 'accountantComment') return Reflect.get(client, model);
            return new Proxy(client.accountantComment, { get(delegate, method) {
              if (method !== 'findFirst') return Reflect.get(delegate, method);
              return async args => {
                const result = await delegate.findFirst(args);
                if (args.where.findingId === finding.id && args.where.correlationId && args.where.visibility === 'CLIENT_ACTION_REQUIRED') {
                  attempts.push({ returnedExisting: !!result });
                  if (!result && entered < 2) { entered++; backendIds.push((await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid'))[0].pid); if (entered === 2) release(); await gate; }
                }
                return result;
              };
            } });
          } })), options);
        } });
        let results;
        try { results = await Promise.allSettled(inputs.map(request)); }
        finally { clearTimeout(timer); dbModule.db = originalDb; }
        assert.equal(new Set(backendIds).size, 2); const success = results.filter(row => row.status === 'fulfilled'), failure = results.filter(row => row.status === 'rejected');
        assert.equal(success.length, same ? 2 : 1); assert.equal(failure.length, same ? 0 : 1); if (!same) assert.equal(failure[0].reason.code, 'CONFLICT');
        assert.equal(new Set(success.map(row => row.value.id)).size, 1);
        const stored = await db.accountantComment.findMany({ where: { ...scope, findingId: finding.id, visibility: 'CLIENT_ACTION_REQUIRED' } }); assert.equal(stored.length, 1);
        assert.equal(await db.ledgerAuditEvent.count({ where: { ...scope, action: 'CLOSE_MISSING_EVIDENCE_REQUESTED', resourceId: stored[0].id } }), 1);
        assert.equal(await db.businessEvent.count({ where: { ...scope, eventType: 'close.assurance.missing_evidence.requested', sourceId: finding.id } }), 1);
        return { distinctDatabaseBackends: backendIds, attempts, fulfilled: success.length, refused: failure.length, requests: 1, auditEvents: 1, businessEvents: 1 };
      };
      await check('Concurrent different keys commit one request and refuse the other', () => race(false));
      await check('Concurrent exact retries return one retained request without duplicate effects', () => race(true));
      await check('Requester sees pending and submitted work without private response or review bodies', async () => {
        const view = await workflow.getCloseEvidenceWorkflow(actor(x.makerId), x.periodId);
        assert.equal(view.canTrack, true); assert.equal(view.tracking.length, 3);
        assert.equal(view.tracking.find(row => row.requestId === originalRequest.id).state, 'AWAITING_REVIEW');
        assert.equal(view.tracking.filter(row => row.state === 'AWAITING_RESPONSE').length, 2);
        assert.ok(!JSON.stringify(view.tracking).includes('The collector is restored; review the replacement.'));
        const reviewer = await workflow.getCloseEvidenceWorkflow(actor(x.certifierId), x.periodId); assert.equal(reviewer.canTrack, false); assert.deepEqual(reviewer.tracking, []);
        return { tracked: 3, awaitingResponse: 2, awaitingReview: 1, privateBodiesRedacted: true, otherActorWithheld: true };
      });
      await check('A departed recipient remains an outstanding obligation with current unavailability', async () => {
        try {
          await db.user.update({ where: { id: x.checkerId }, data: { isActive: false } });
          const view = await workflow.getCloseEvidenceWorkflow(actor(x.makerId), x.periodId), pending = view.tracking.filter(row => row.state === 'AWAITING_RESPONSE');
          assert.equal(pending.length, 2); assert.ok(pending.every(row => row.recipientAvailable === false)); return { obligationsRetained: 2, recipientUnavailable: true };
        } finally { await db.user.update({ where: { id: x.checkerId }, data: { isActive: true } }); }
      });
      await check('Historical ambiguous requests stay visible and continue beyond 100', async () => {
        // Explicit legacy/capacity fixture: no claimed real requests or approvals.
        const stored = await db.accountantComment.findUniqueOrThrow({ where: { id: originalRequest.id } });
        await db.accountantComment.createMany({ data: Array.from({ length: 101 }, (_, i) => ({ organizationId: x.organizationId, periodId: x.periodId, closeRunId: stored.closeRunId, findingId: firstFinding.id, authorId: x.makerId,
          visibility: 'CLIENT_ACTION_REQUIRED', body: 'Synthetic legacy ambiguity capacity fixture', correlationId: 'tracking-' + run + '-' + i, createdAt: new Date(Date.UTC(2020, 0, 1, 0, 0, i)),
          metadata: { ...stored.metadata, correlationId: 'tracking-' + run + '-' + i, syntheticFixture: true } })) });
        let view = await workflow.getCloseEvidenceWorkflow(actor(x.makerId), x.periodId), items = [...view.tracking], pages = 1;
        while (view.cursors.tracking) { assert.ok(pages < 5); view = await workflow.getCloseEvidenceWorkflow(actor(x.makerId), x.periodId, { kind: 'tracking', cursor: view.cursors.tracking }); items.push(...view.tracking); pages++; }
        assert.equal(items.length, 104); assert.equal(new Set(items.map(row => row.requestId)).size, 104); assert.equal(items.filter(row => row.state === 'REVIEW_REQUIRED').length, 102);
        return { tracked: 104, investigationRequired: 102, pages, syntheticCapacityRecords: 101 };
      });
    }
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    try { report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.checks.length === (before ? 1 : 7) && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-request-uniqueness-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, defectReproduced: report.defectReproduced, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
