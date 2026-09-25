/* Owned synthetic history verification. No fabricated approvals, sessions or ACTIVE records. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const helper = require(path.join(root, 'scripts/modern-modules-local-verification.js'));
const command = process.argv[2];
assert.ok(['inspect', 'prepare', 'verify', 'ties'].includes(command));
const fixture = helper.FIXTURES.find(item => item.key === 'service_en_desktop');
assert.equal(fixture.organizationId, 'org_modules_service_en_desktop');
const target = helper.targetUrl();
assert.equal(decodeURIComponent(target.pathname.slice(1)), 'stoquify_local_modern_modules_20260905_01');
assert.ok(['localhost', '127.0.0.1', '::1', '[::1]'].includes(target.hostname));
process.env.DATABASE_URL = target.toString();
process.env.DIRECT_URL = target.toString();
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', moduleResolution: 'node' });
const { PrismaClient } = require(path.join(root, 'node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] });
let pinnedTransaction = null;
// This test-only adapter forwards the real service into one real PostgreSQL
// transaction so DEFAULT CURRENT_TIMESTAMP ties naturally. It does not model
// independent transactions or establish a concurrency/serialization claim.
globalThis.prisma = new Proxy(prisma, { get(targetClient, property) {
  if (property === '$transaction' && pinnedTransaction) return operation => operation(pinnedTransaction);
  const owner = pinnedTransaction ?? targetClient;
  const value = owner[property];
  return typeof value === 'function' ? value.bind(owner) : value;
} });
require(path.join(root, 'scripts/server-only-node-shim'));
require(path.join(root, 'node_modules/ts-node/register/transpile-only'));
require(path.join(root, 'node_modules/tsconfig-paths/register'));
const service = require(path.join(root, 'services/modules/module-composition.service.ts'));
const sourcePaths = ['services/modules/module-composition.service.ts', 'services/modules/module-composition-contracts.ts', 'actions/modules/module-composition.actions.ts'];
const sources = () => sourcePaths.map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') }));
const receipt = { command, startedAt: new Date().toISOString(), database: helper.DATABASE_NAME, fixture: fixture.key, productionApproval: false, checks: [], beforeSources: sources() };
async function main() {
  const identity = await prisma.$queryRawUnsafe('SELECT current_database() AS name');
  assert.equal(identity[0].name, helper.DATABASE_NAME);
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: fixture.organizationId }, select: { onboardingSource: true, isActive: true, deletedAt: true } });
  assert.equal(organization.onboardingSource, helper.FIXTURE_SOURCE);
  assert.equal(organization.isActive, true); assert.equal(organization.deletedAt, null);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: fixture.userId }, select: { id: true, organizationId: true, isActive: true, isLocked: true, roles: { select: { permissions: true, organizationId: true } } } });
  assert.equal(user.organizationId, fixture.organizationId); assert.equal(user.isActive, true); assert.equal(user.isLocked, false);
  assert.ok(user.roles.every(role => role.organizationId === fixture.organizationId));
  const actor = { organizationId: fixture.organizationId, actorId: user.id, actorPermissions: [...new Set(user.roles.flatMap(role => role.permissions))] };
  assert.ok(actor.actorPermissions.includes('MANAGE_SYSTEM_SETTINGS'));
  const where = { organizationId: fixture.organizationId };
  const configurationBefore = await prisma.tenantModuleConfiguration.findUniqueOrThrow({ where });
  const historyBefore = await prisma.tenantModuleConfigurationCommand.count({ where });
  const existingActive = await prisma.tenantModuleLifecycleOperation.findMany({ where: { ...where, state: 'ACTIVE' }, orderBy: { createdAt: 'asc' }, select: { commandId: true, desiredRevision: true } });
  receipt.historyBefore = historyBefore;
  receipt.existingActiveCount = existingActive.length;
  receipt.activeCommandIds = existingActive.map(item => item.commandId);
  if (command === 'prepare' && historyBefore <= 100) {
    const created = [];
    for (let index = 0; index < 105; index += 1) {
      const draft = await service.saveModuleCompositionDraft(actor, { selectedModules: configurationBefore.selectedModules, stopNewWorkModules: configurationBefore.newWorkStoppedModules, expectedRevision: configurationBefore.revision, setupInputs: {}, idempotencyKey: `run02-history-pagination-${String(index).padStart(3, '0')}` });
      assert.equal(draft.state, 'DRAFT'); created.push(draft.id);
    }
    assert.equal(new Set(created).size, 105);
    receipt.preparedDraftCount = created.length;
  }
  if (command === 'verify') {
    const expected = await prisma.tenantModuleConfigurationCommand.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, createdAt: true } });
    assert.ok(expected.length > 100);
    const data = await service.getModuleCompositionData(actor);
    const entries = [...data.history, ...data.drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const sizes = [entries.length]; let cursor = data.historyNextCursor;
    while (cursor) { const page = await service.getModuleCompositionHistory(actor, { beforeId: cursor }); sizes.push(page.entries.length); entries.push(...page.entries); cursor = page.nextCursor; assert.ok(sizes.length < 30); }
    assert.deepEqual(entries.map(item => item.id), expected.map(item => item.id));
    assert.equal(new Set(entries.map(item => item.id)).size, expected.length);
    receipt.checks.push({ name: 'full_history_no_gaps_or_duplicates', passed: true, records: entries.length, pageSizes: sizes });
    const oldActive = entries.find((item, index) => index >= 100 && item.state === 'ACTIVE');
    assert.ok(oldActive, 'An actual older applied configuration must be reachable beyond100 entries');
    receipt.oldActive = { id: oldActive.id, ordinal: entries.indexOf(oldActive) + 1, state: oldActive.state, selectedModules: oldActive.selectedModules };
    receipt.checks.push({ name: 'actual_active_configuration_beyond100', passed: true });
    const foreign = await prisma.tenantModuleConfigurationCommand.findFirstOrThrow({ where: { organizationId: { not: fixture.organizationId } }, select: { id: true } });
    await assert.rejects(service.getModuleCompositionHistory(actor, { beforeId: foreign.id }), error => error.constructor.name === 'NotFoundError');
    receipt.checks.push({ name: 'foreign_tenant_cursor_denied', passed: true });
    const limited = { ...actor, actorPermissions: ['MANAGE_SYSTEM_SETTINGS'] };
    const limitedPage = await service.getModuleCompositionHistory(limited, { beforeId: expected[0].id });
    assert.ok(limitedPage.entries.every(item => Object.keys(item.setupInputs).length === 0));
    receipt.checks.push({ name: 'limited_setup_scope_absent', passed: true, note: 'This check alone does not prove redaction of nonempty scope; scoped fixtures are reported separately.' });
    const timestampCounts = new Map(); expected.forEach(item => timestampCounts.set(item.createdAt.toISOString(), (timestampCounts.get(item.createdAt.toISOString()) ?? 0) + 1));
    receipt.equalTimestampGroups = [...timestampCounts.values()].filter(count => count > 1);
  }
  if (command === 'ties') {
    const rollback = new Error('ROLLBACK_SYNTHETIC_TIED_HISTORY');
    try {
      await prisma.$transaction(async tx => {
        pinnedTransaction = tx;
        try {
          const ids = [];
          for (let index = 0; index < 31; index += 1) {
            const draft = await service.saveModuleCompositionDraft(actor, { selectedModules: configurationBefore.selectedModules, stopNewWorkModules: configurationBefore.newWorkStoppedModules, expectedRevision: configurationBefore.revision, setupInputs: {}, idempotencyKey: `run02-history-tied-${String(index).padStart(3, '0')}` });
            assert.equal(draft.state, 'DRAFT'); ids.push(draft.id);
          }
          const actual = await tx.tenantModuleConfigurationCommand.findMany({ where: { ...where, id: { in: ids } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, createdAt: true } });
          assert.equal(new Set(actual.map(item => item.createdAt.toISOString())).size, 1, 'Real transaction-time defaults must naturally tie');
          const first = await service.getModuleCompositionData(actor);
          const entries = [...first.history, ...first.drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
          assert.equal(entries.length, 25); assert.ok(first.historyNextCursor);
          const second = await service.getModuleCompositionHistory(actor, { beforeId: first.historyNextCursor });
          entries.push(...second.entries);
          const tiedRead = entries.filter(item => ids.includes(item.id));
          assert.deepEqual(tiedRead.map(item => item.id), actual.map(item => item.id));
          assert.equal(new Set(tiedRead.map(item => item.id)).size, 31);
          receipt.checks.push({ name: 'equal_server_timestamps_across_page_boundary', passed: true, serviceCreatedDrafts: 31, distinctServerTimestamps: 1, transactionAdapter: 'Real pinned Prisma transaction; actual service saves and history queries; no concurrency claim' });
          throw rollback;
        } finally { pinnedTransaction = null; }
      }, { timeout: 60000 });
    } catch (error) { if (error !== rollback) throw error; }
    assert.equal(await prisma.tenantModuleConfigurationCommand.count({ where }), historyBefore);
    receipt.allTiedFixtureWritesRolledBack = true;
  }
  const configurationAfter = await prisma.tenantModuleConfiguration.findUniqueOrThrow({ where });
  assert.deepEqual(configurationAfter, configurationBefore);
  receipt.activeAndDesiredConfigurationUnchanged = true;
  receipt.historyAfter = await prisma.tenantModuleConfigurationCommand.count({ where });
  receipt.afterSources = sources(); receipt.sourceStable = JSON.stringify(receipt.beforeSources) === JSON.stringify(receipt.afterSources);
  assert.equal(receipt.sourceStable, true); receipt.completedAt = new Date().toISOString();
}
main().catch(error => { receipt.failure = String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, '[database URL redacted]'); process.exitCode = 1; }).finally(async () => {
  await prisma.$disconnect();
  fs.writeFileSync(path.join(__dirname, `history-pagination-${command}.json`), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ command, historyBefore: receipt.historyBefore, historyAfter: receipt.historyAfter, existingActiveCount: receipt.existingActiveCount, preparedDraftCount: receipt.preparedDraftCount ?? 0, passed: receipt.checks.filter(item => item.passed).length, failure: receipt.failure ?? null }));
});
