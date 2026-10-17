// Bounded local synthetic service verification. Author only until parent review.
// Test actors and count-sheet records never represent real customer approval.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after coordinated review and source freeze.');
} else {
  // Guarded helper has a require.main guard: requiring it never runs its cases.
  const h = require('./close-pack-write-race-runtime.cjs');
  const { f, db, helper, root } = h, { fs, path, crypto, assert } = f;
  const fromRoot = file => require(path.join(root, file));
  const countApi = fromRoot('services/inventory/inventory-count.service.ts');
  const { reconcileInventoryClass3 } = fromRoot('services/inventory/inventory-reconciliation.service.ts');
  const { runCloseAssurance, getCloseAssuranceDashboard } = fromRoot('services/accounting/close-assurance.service.ts');
  const { getAccountantPortalData } = fromRoot('services/accounting/data-trust.service.ts');
  const packApi = fromRoot('services/accounting/close-assurance-pack.service.ts');
  const receiptFile = path.join(root, 'what-next/workflow-modernization/2026-09-05-run-01/evidence/close-denied-invalidation-before-a6929183-07e3-465c-80b1-a29cf89d7b72.json');
  const stamp = crypto.randomUUID();
  const report = { run: stamp, at: new Date().toISOString(), checks: [], syntheticOnly: true,
    scope: 'Exact owned loopback disposable database. Actual accounting setup, separately approved synthetic journal, actual READY/T4 assessments, actual zero-variance count creation/submission/independent posting, certification denial, retry and reassessment/recovery. No fabricated READY/T4, real customer approval, statutory certification, migration, seed, delivery worker or external effects. Retained source and review records are local synthetic test evidence.' };
  const files = [...new Set([__filename, receiptFile, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])) });
  async function outside() {
    const scope = { organizationId: { notIn: h.organizations } }, extra = {};
    for (const model of ['item', 'location', 'stockCountSession', 'auditLog']) extra[model] = f.hash(await db[model].findMany({ where: scope, orderBy: { id: 'asc' } }));
    extra.stockCountLine = f.hash(await db.stockCountLine.findMany({ where: { stockCountSession: scope }, orderBy: { id: 'asc' } }));
    extra.inventoryLevel = f.hash(await db.inventoryLevel.findMany({ where: { item: scope }, orderBy: { id: 'asc' } }));
    const existing = await h.outside(); return { hash: f.hash({ existing, extra }), existing, extra };
  }
  function prerequisite(message, details) { const error = new Error(message); error.prerequisite = details; return error; }
  async function assessment(x, label) {
    const now = new Date(), portal = await getAccountantPortalData({ organizationId: x.organizationId, periodId: x.periodId }, db, now);
    await runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'owned-denial-assessment-' + label + '-' + stamp }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'], now });
    const run = await db.closeRun.findFirstOrThrow({ where: { organizationId: x.organizationId, periodId: x.periodId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    const summary = { closeRunId: run.id, status: run.status, trustLevel: run.metadata?.trustLevel, portalTrustLevel: portal.certificate.level, blockers: portal.blockers.map(row => ({ gate: row.gate, severity: row.severity })), inventoryAnnex: run.metadata?.inventoryValuationAnnex };
    report.assessments ??= []; report.assessments.push({ label, ...summary });
    if (run.status !== 'READY' || run.metadata?.trustLevel !== 'T4' || portal.certificate.level !== 'T4') throw prerequisite('Actual ' + label + ' assessment did not reach READY/T4; no readiness was fabricated', summary);
    return { ...x, closeRunId: run.id, evidenceHash: run.metadata.inventoryValuationAnnex.sourceHash };
  }
  function loadPredecessor() {
    const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
    const saved = receipt.files.find(row => row.path.replaceAll('\\', '/').endsWith('services/accounting/close-assurance-pack.service.ts')); assert.ok(saved);
    const bytes = Buffer.from(saved.bytesBase64, 'base64'), sourceHash = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(sourceHash, saved.sha256); assert.equal(sourceHash, 'c2d0a327d24dcbf571f5ed8034eafdcb36da510532659b312bf44f87aec68383');
    const ts = require('typescript'), Module = require('node:module'), filename = path.join(root, 'services/accounting/close-assurance-pack.service.ts');
    const compiled = ts.transpileModule(bytes.toString('utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    const isolated = new Module(filename, module); isolated.filename = filename; isolated.paths = Module._nodeModulePaths(path.dirname(filename));
    isolated._compile(compiled.outputText, filename); // Never replace source or require.cache.
    return { api: isolated.exports, sourceHash };
  }
  const certify = (api, x, correlation, actorId = x.certifierId) => {
    const now = new Date();
    return api.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED', correlationId: correlation }, { actorId, actorPermissions: ['accounting.close.certify'], lastAuthAt: now, now });
  };
  async function expectDenied(work) {
    let denied; try { await work(); } catch (error) { denied = error; }
    assert.ok(denied, 'Certification must be rejected'); assert.match(denied.message, /Certified close pack is blocked:.*(stale|invalidated)/i);
    return { name: denied.name, code: denied.code, message: f.safe(denied) };
  }
  async function history(x) {
    const scope = { organizationId: x.organizationId, closeRunId: x.closeRunId };
    return {
      evidence: await db.closeEvidenceItem.findMany({ where: scope, orderBy: { id: 'asc' } }),
      checklist: await db.closeChecklistItem.findMany({ where: scope, orderBy: { id: 'asc' } }),
      findings: await db.closeAssuranceFinding.findMany({ where: scope, orderBy: { id: 'asc' } }),
      exports: await db.closePackExport.findMany({ where: scope, orderBy: { id: 'asc' } }),
    };
  }
  async function denialState(x) {
    const events = (await db.businessEvent.findMany({ where: { organizationId: x.organizationId, eventType: 'close.certification.invalidated' }, orderBy: { id: 'asc' } })).filter(row => row.payload.closeRunId === x.closeRunId);
    const eventIds = events.map(row => row.id);
    return {
      run: await db.closeRun.findUniqueOrThrow({ where: { id: x.closeRunId } }), events,
      outbox: await db.businessEventOutbox.findMany({ where: { organizationId: x.organizationId, businessEventId: { in: eventIds } }, orderBy: { id: 'asc' } }),
      audit: (await db.ledgerAuditEvent.findMany({ where: { organizationId: x.organizationId, action: 'CLOSE_CERTIFICATION_EVIDENCE_STALE' }, orderBy: { id: 'asc' } })).filter(row => row.metadata?.closeRunId === x.closeRunId),
      eventAudit: await db.businessEventAudit.findMany({ where: { organizationId: x.organizationId, businessEventId: { in: eventIds } }, orderBy: { id: 'asc' } }),
    };
  }
  async function prepareFixture(name = 'denial-recovery') {
    assert.match(name, /^[a-z0-9-]+$/);
    const base = await h.fixture(name); report.fixture = base.info;
    const item = await db.item.create({ data: { organizationId: base.organizationId, sku: 'SYNTHETIC-EMPTY-COUNT', slug: 'owned-empty-count-' + stamp, nameEn: 'Synthetic empty-bin count item', imageUrls: [], costPrice: 0, sellingPrice: 0, trackInventory: true } });
    const location = await db.location.create({ data: { organizationId: base.organizationId, code: 'SYNTHETIC-COUNT', name: 'Synthetic count location' } });
    const session = await countApi.createStockCountSession({ organizationId: base.organizationId, locationId: location.id, createdById: base.makerId, countNumber: 'SYNTHETIC-COUNT-' + stamp, countDate: new Date(), itemIds: [item.id], notes: 'LOCAL SYNTHETIC TEST count only; not customer approval', metadata: { syntheticLocalTest: true, realCustomerApproval: false } });
    assert.equal(session.lines.length, 1); assert.equal(session.lines[0].systemQuantity.toString(), '0');
    const sheet = { syntheticLocalTest: true, realCustomerApproval: false, organizationId: base.organizationId, countSessionId: session.id, itemId: item.id, locationId: location.id, frozenSnapshotHash: session.snapshotHash, countedQuantity: '0.000', submittedById: base.makerId };
    const sheetBytes = JSON.stringify(sheet, null, 2) + '\n', sheetHash = 'sha256:' + crypto.createHash('sha256').update(sheetBytes).digest('hex');
    const sheetFile = path.join(__dirname, 'close-denial-recovery-count-sheet-' + name + '-' + stamp + '.json'); fs.writeFileSync(sheetFile, sheetBytes, { flag: 'wx' });
    const submitted = await countApi.submitStockCountSession({ organizationId: base.organizationId, countSessionId: session.id, submittedById: base.makerId, countSheetHash: sheetHash, lines: [{ lineId: session.lines[0].id, countedQuantity: '0', evidenceHash: sheetHash, reasonCode: 'LOCAL_SYNTHETIC_EMPTY_BIN' }] });
    assert.equal(submitted.status, 'SUBMITTED');
    report.countSetup = { itemId: item.id, locationId: location.id, countSessionId: session.id, countSheetFile: sheetFile, countSheetHash: sheetHash, countedQuantity: '0', createdById: base.makerId, approvedById: base.info.actorIds.checker, approvalScope: 'Synthetic local test actor exercising real service separation of duties; not real customer approval' };
    const x = await assessment(base, 'after-count-setup');
    return { ...x, countSetup: { ...report.countSetup }, baseSetupCloseRunId: base.closeRunId };
  }
  async function postPreparedCount(x) {
    assert.notEqual(x.makerId, x.countSetup.approvedById);
    const posted = await countApi.postStockCount({ organizationId: x.organizationId, countSessionId: x.countSetup.countSessionId, approvedById: x.countSetup.approvedById, countSheetHash: x.countSetup.countSheetHash, idempotencyKey: 'owned-zero-count-' + x.countSetup.countSessionId, correlationId: 'owned-count-completion-' + stamp });
    assert.equal(posted.countSession.status, 'POSTED'); assert.equal(posted.varianceLineCount, 0); assert.equal(posted.totalVarianceValue, '0.00'); assert.equal(posted.generatedAdjustmentId, undefined);
    return posted;
  }
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await outside(); report.financialBeforeFixtureSetup = await h.financial();
    const x = await prepareFixture();
    report.selectedCloseRunId = x.closeRunId;
    const beforeAnnex = await reconcileInventoryClass3({ organizationId: x.organizationId, periodId: x.periodId, currency: 'XAF' }, db);
    assert.equal(beforeAnnex.status, 'PASSED'); assert.equal(beforeAnnex.evidenceHash, x.evidenceHash);
    const draft = await packApi.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'DRAFT_NOT_CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.export'] });
    assert.equal(draft.isCertified, false); assert.equal(JSON.parse(draft.content).annexes.inventoryValuation.freshness.status, 'FRESH');
    const priorHistory = await history(x), priorHistoryHash = f.hash(priorHistory);
    report.financialAfterFixtureSetup = await h.financial();
    const posted = await postPreparedCount(x);
    const changed = await reconcileInventoryClass3({ organizationId: x.organizationId, periodId: x.periodId, currency: 'XAF' }, db), beforeDenial = await denialState(x);
    assert.equal(changed.status, 'PASSED'); assert.notEqual(changed.evidenceHash, beforeAnnex.evidenceHash);
    assert.equal(changed.inventoryValue, beforeAnnex.inventoryValue); assert.equal(changed.ledgerClass3Value, beforeAnnex.ledgerClass3Value);
    assert.equal(beforeDenial.run.status, 'READY'); assert.notEqual(beforeDenial.run.metadata?.staleState?.status, 'EVIDENCE_STALE'); assert.equal(beforeDenial.events.length, 0);
    assert.equal((await h.financial()).hash, report.financialAfterFixtureSetup.hash);
    report.checks.push({ id: 'real-zero-variance-source-change', status: 'passed', eventId: posted.eventId, countSessionId: x.countSetup.countSessionId, beforeHash: beforeAnnex.evidenceHash, afterHash: changed.evidenceHash, inventoryValue: changed.inventoryValue, ledgerClass3Value: changed.ledgerClass3Value, noFinancialEffects: true });
    report.separateDiscoveredGap = { producer: 'postStockCount', case: 'zero variance', observed: 'The completed count changes the inventory source fingerprint but does not invalidate existing READY close runs immediately.', action: 'Recorded for separate review; no producer edit is made by this verifier.' };
    const old = loadPredecessor(), beforeError = await expectDenied(() => certify(old.api, x, 'owned-predecessor-denial-' + stamp));
    const rolledBack = await denialState(x);
    assert.deepEqual(rolledBack, beforeDenial); assert.equal(f.hash(await history(x)), priorHistoryHash);
    assert.equal(await db.closePackExport.count({ where: { organizationId: x.organizationId, closeRunId: x.closeRunId, isCertified: true } }), 0);
    report.checks.push({ id: 'predecessor-invalidation-rolled-back', status: 'passed', sourceHash: old.sourceHash, sourceLoadedInMemoryOnly: true, denial: beforeError, retainedStateHash: f.hash(rolledBack), runStatus: rolledBack.run.status, invalidationEventCount: 0, invalidationOutboxCount: 0 });
    const firstError = await expectDenied(() => certify(packApi, x, 'owned-current-denial-' + stamp));
    const committed = await denialState(x);
    assert.equal(committed.run.status, 'BLOCKED'); assert.equal(committed.run.metadata.staleState.status, 'EVIDENCE_STALE');
    assert.equal(committed.events.length, 1); assert.equal(committed.outbox.length, 1); assert.equal(committed.audit.length, 1);
    const event = committed.events[0], outbox = committed.outbox[0];
    assert.equal(event.payload.previousEvidenceHash, beforeAnnex.evidenceHash); assert.equal(event.payload.newEvidenceHash, changed.evidenceHash); assert.equal(event.payload.closeRunId, x.closeRunId);
    assert.equal(outbox.businessEventId, event.id); assert.equal(outbox.channel, 'REPORT_EXPORT'); assert.equal(outbox.status, 'PENDING'); assert.equal(outbox.attempts, 0);
    assert.equal(f.hash(await history(x)), priorHistoryHash);
    assert.equal(await db.closePackExport.count({ where: { organizationId: x.organizationId, closeRunId: x.closeRunId, isCertified: true } }), 0);
    const blockedDashboard = await getCloseAssuranceDashboard(x.organizationId, x.periodId, x.closeRunId);
    assert.equal(blockedDashboard.currentProof.grade, 'blocked'); assert.equal(blockedDashboard.controls.certificationAvailable, false);
    report.checks.push({ id: 'denial-commits-review-evidence', status: 'passed', denial: firstError, runStatus: committed.run.status, eventId: event.id, outboxId: outbox.id, outboxStatus: outbox.status, auditId: committed.audit[0].id, previousEvidenceHash: event.payload.previousEvidenceHash, newEvidenceHash: event.payload.newEvidenceHash, originalHistoryHash: priorHistoryHash, originalHistoryUnchanged: true, noCertifiedExport: true, dashboardGrade: blockedDashboard.currentProof.grade });
    const retryError = await expectDenied(() => certify(packApi, x, 'owned-retry-new-correlation-' + crypto.randomUUID(), x.info.actorIds.checker));
    const retried = await denialState(x); assert.deepEqual(retried, committed); assert.equal(f.hash(await history(x)), priorHistoryHash);
    report.checks.push({ id: 'retry-retains-first-denial-once', status: 'passed', denial: retryError, newCorrelationAndAuthenticationTime: true, independentAuthorizedTestActor: x.info.actorIds.checker, eventId: retried.events[0].id, outboxId: retried.outbox[0].id, retainedStateHash: f.hash(retried) });
    const recovered = await assessment(x, 'after-count-completion');
    assert.notEqual(recovered.closeRunId, x.closeRunId); assert.equal(recovered.evidenceHash, changed.evidenceHash);
    const certified = await certify(packApi, recovered, 'owned-recovery-certification-' + stamp);
    assert.equal(certified.isCertified, true); assert.ok(certified.certificationLimitations.length > 0);
    const artifact = await db.closePackExport.findUniqueOrThrow({ where: { id: certified.exportId } });
    assert.equal(artifact.contentHash, certified.contentHash); assert.equal(artifact.metadata.inventoryAnnexFreshness.status, 'FRESH');
    assert.equal(artifact.metadata.pilotCycleCertification.applicability, 'NO_RECORDED_PAYROLL_PERIOD');
    const recoveredDashboard = await getCloseAssuranceDashboard(recovered.organizationId, recovered.periodId, recovered.closeRunId);
    assert.equal(recoveredDashboard.currentProof.grade, 'certified');
    assert.deepEqual(await denialState(x), committed); assert.equal(f.hash(await history(x)), priorHistoryHash);
    const financialAfter = await h.financial(); assert.equal(financialAfter.hash, report.financialAfterFixtureSetup.hash);
    report.financialAfterOperations = financialAfter;
    report.checks.push({ id: 'real-reassessment-and-certification-recovery', status: 'passed', closeRunId: recovered.closeRunId, trustLevel: 'T4', exportId: certified.exportId, contentHash: certified.contentHash, currentProofGrade: recoveredDashboard.currentProof.grade, priorBlockedRunAndDraftPreserved: true, sourceHash: recovered.evidenceHash, noFinancialEffects: true, systemEvidenceOnly: true });
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); report.failureKind = error.prerequisite ? 'blocked-prerequisite' : 'failed'; report.prerequisite = error.prerequisite; report.stack = f.safe(error.stack || error); }
    finally {
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; if (report.financialAfterFixtureSetup) { report.financialAfterOperations = await h.financial(); report.noOperationFinancialEffects = report.financialAfterOperations.hash === report.financialAfterFixtureSetup.hash; } }
      catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...h.organizations]; report.passed = !report.error && !report.finalizationError && report.checks.length === 5 && report.checks.every(row => row.status === 'passed') && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-denial-recovery-runtime-' + stamp + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, failureKind: report.failureKind, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { h, sources, outside, prepareFixture, postPreparedCount, assessment, history, denialState };
  if (require.main === module) runMain();
}
