// Bounded read-only probe of an existing owned synthetic fixture. No exports or setup.
if (require.main === module && process.argv[2] !== '--run') console.log('Prepared only; --run requires coordinator release.');
else {
  const h = require('./close-pack-write-race-runtime.cjs');
  const { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const { getCloseAssuranceDashboard } = require(path.join(root, 'services/accounting/close-assurance.service.ts'));
  const { reconcileInventoryClass3 } = require(path.join(root, 'services/inventory/inventory-reconciliation.service.ts'));
  const run = crypto.randomUUID(), organizationId = 'workflow_close_write_browser-focus-probe_287616c4-5563-4bcf-b0de-5aaa0fc933f3';
  const expectedLatestId = 'cmuoxxj7600b9mabwu7r5ypeb', actorId = 'cmuoxxfvc0005mabwtihgggh2';
  const report = { run, at: new Date().toISOString(), readonly: true, organizationId, actorId, expectedLatestId, scope: 'Existing owned synthetic fixture; read-only dashboard and authoritative inventory reconciliation. No role changes, exported artifact, source mutation, professional approval or setup.' };
  const sources = () => ({ ...h.sources(), [path.relative(root, __filename).replaceAll('\\', '/')]: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') });
  async function fixtureHash() {
    const values = {};
    for (const model of ['closeRun', 'closeChecklistItem', 'closeAssuranceFinding', 'closeEvidenceItem', 'closePackExport', 'user', 'role', 'journalEntry', 'journalEntryLine', 'businessEvent', 'businessEventOutbox', 'ledgerAuditEvent']) {
      values[model] = f.hash(await db[model].findMany({ where: { organizationId }, orderBy: { id: 'asc' } }));
    }
    return f.hash(values);
  }
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources();
    const organization = await db.organization.findUniqueOrThrow({ where: { id: organizationId } }); assert.ok(organization.name.startsWith(helper.prefix));
    const actor = await db.user.findFirstOrThrow({ where: { id: actorId, organizationId, isActive: true }, include: { roles: { select: { code: true, permissions: true } } } });
    const permissions = [...new Set(actor.roles.flatMap(row => row.permissions))]; assert.ok(permissions.includes('accounting.close.read')); assert.ok(permissions.includes('accounting.close.certify'));
    report.authority = { existingRead: true, existingCertify: true, roleCodes: actor.roles.map(row => row.code), mutated: false };
    report.fixtureBeforeHash = await fixtureHash();
    const latest = await db.closeRun.findFirstOrThrow({ where: { organizationId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }); assert.equal(latest.id, expectedLatestId);
    const runs = await db.closeRun.findMany({ where: { organizationId, periodId: latest.periodId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    const previous = runs.find(row => row.id !== latest.id && row.status === 'READY' && row.metadata?.inventoryValuationAnnex?.sourceHash === latest.metadata?.inventoryValuationAnnex?.sourceHash); assert.ok(previous, 'Need an earlier actual READY run with the same captured annex hash'); assert.ok(previous.createdAt < latest.createdAt);
    const reconciliation = await reconcileInventoryClass3({ organizationId, periodId: latest.periodId, currency: organization.currency }, db);
    const old = await getCloseAssuranceDashboard(organizationId, latest.periodId, previous.id), current = await getCloseAssuranceDashboard(organizationId, latest.periodId);
    assert.equal(current.run.id, latest.id); assert.equal(reconciliation.status, 'PASSED'); assert.equal(previous.metadata.inventoryValuationAnnex.sourceHash, reconciliation.evidenceHash);
    report.observations = { periodId: latest.periodId, runs: runs.map(row => ({ id: row.id, status: row.status, createdAt: row.createdAt.toISOString(), sourceHash: row.metadata?.inventoryValuationAnnex?.sourceHash })), old: { id: old.run.id, status: old.run.status, controls: old.controls, proof: old.currentProof }, current: { id: current.run.id, status: current.run.status, controls: current.controls, proof: current.currentProof }, authoritativeAnnex: { status: reconciliation.status, evidenceHash: reconciliation.evidenceHash } };
    report.reproduced = old.controls.certificationAvailable === true && old.run.id !== current.run.id;
    assert.equal(report.reproduced, true, 'Earlier same-source READY assessment should reproduce pre-fix certification offer');
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); }
    finally {
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.fixtureAfterHash = await fixtureHash(); report.fixtureUnchanged = report.fixtureBeforeHash === report.fixtureAfterHash; }
      catch (error) { report.finalizationError = f.safe(error); }
      report.passed = !report.error && !report.finalizationError && report.reproduced && report.sourceStable && report.fixtureUnchanged;
      const file = path.join(__dirname, 'close-unique-current-readonly-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, reproduced: report.reproduced, sourceStable: report.sourceStable, fixtureUnchanged: report.fixtureUnchanged, error: report.error, observations: report.observations })); await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  if (require.main === module) runMain();
}
