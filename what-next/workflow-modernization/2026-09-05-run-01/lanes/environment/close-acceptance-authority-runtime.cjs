// Prepared only. The coordinator must release the frozen source and owned DB lane.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only; --run requires coordinator release and the guarded owned database.');
} else {
  const previous = require('./close-replacement-browser.cjs');
  const browserFixture = require('./close-denial-recovery-browser.cjs').browserFixture;
  const d = require('./close-denial-recovery-runtime.cjs');
  const { f, db, root, helper, organizations } = d.h, { fs, path, crypto, assert } = f;
  const { PrismaClient } = require('@prisma/client');
  const { AsyncLocalStorage } = require('node:async_hooks');
  const load = file => require(path.join(root, file));
  const close = load('services/accounting/close-assurance.service.ts');
  const replacement = load('services/accounting/close-evidence-replacement.service.ts');
  const { grantAccountantAccess } = load('services/accounting/accountant-access.service.ts');
  const { grantAccountantAccessInputSchema } = load('services/accounting/accountant-access.schemas.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db;
  const run = crypto.randomUUID(), secrets = [], reviewPermission = 'accounting.close.accountant.review';
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const productFiles = ['services/accounting/close-evidence-acceptance-authority.service.ts', 'services/accounting/close-evidence-acceptance-context.ts', 'services/accounting/close-assurance.service.ts',
    'services/accounting/close-evidence-replacement.service.ts', 'actions/accounting/accountant-work-desk.actions.ts',
    'actions/accounting/accountant-access.actions.ts', 'lib/security/auth-session.ts', 'services/modules/module-entitlement.service.ts'];
  const sources = () => ({ ...previous.sources(), ...Object.fromEntries([__filename, ...productFiles.map(file => path.join(root, file))]
    .map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  async function outside() {
    const existing = await d.outside(), scope = { organizationId: { notIn: organizations } }, records = {};
    for (const model of ['accountantComment', 'accountantAccessGrant']) records[model] = f.hash(await db[model].findMany({ where: scope, orderBy: { id: 'asc' } }));
    for (const model of ['account', 'session']) records[model] = f.hash(await db[model].findMany({ where: { user: scope }, orderBy: { id: 'asc' } }));
    records.memberships = f.hash(await db.user.findMany({ where: scope, select: { id: true, roles: { select: { id: true }, orderBy: { id: 'asc' } } }, orderBy: { id: 'asc' } }));
    return { hash: f.hash({ existing: existing.hash, records }), existing, records };
  }
  async function setup(label, delegated = false) {
    await helper.withClient(f.target, helper.assertOwned);
    const fixture = await previous.setup('authority-' + label);
    secrets.push(fixture.password);
    fixture.homeOrganizationId = fixture.x.organizationId;
    if (delegated) {
      const home = await browserFixture('authority-home-' + label); secrets.push(home.password);
      const role = await db.role.findFirstOrThrow({ where: { organizationId: home.x.organizationId, code: 'owned-close-verifier' } });
      const permissions = [...new Set([...role.permissions, 'accounting.audit.read'])];
      await db.role.update({ where: { id: role.id }, data: { permissions } });
      fixture.actor = home.actor; fixture.password = home.password; fixture.permissions = permissions;
      fixture.homeOrganizationId = home.x.organizationId;
      const at = new Date(), expiresAt = new Date(at.getTime() + 86400000);
      const scope = { kind: 'OWNED_LOCAL_DELEGATED_REVIEW_TEST_SCOPE', version: 1, syntheticLocalTest: true, realCustomerApproval: false,
        homeOrganizationId: home.x.organizationId, organizationId: fixture.x.organizationId, accountantId: home.actor.id,
        setupActorId: fixture.x.makerId, role: 'REVIEWER', issuedAt: at.toISOString(), expiresAt: expiresAt.toISOString(),
        purpose: 'Isolated authorization verification only. This is not a real professional mandate.' };
      const file = 'close-acceptance-authority-' + run + '-' + label + '-grant-scope.json', bytes = JSON.stringify(scope, null, 2) + '\n';
      fs.writeFileSync(path.join(__dirname, file), bytes, { flag: 'wx' });
      fixture.grant = await grantAccountantAccess(fixture.x.organizationId, fixture.x.makerId, grantAccountantAccessInputSchema.parse({
        accountantEmail: home.actor.email, accountantFirmName: 'Synthetic delegated authority verifier', role: 'REVIEWER',
        consentEvidenceHash: 'sha256:' + sha(bytes), effectiveFrom: at, expiresAt, correlationId: 'authority-grant-' + run + '-' + label,
      }), at);
      fixture.grantEvidence = { file, fileSha256: sha(bytes), grantId: fixture.grant.id, syntheticOnly: true, sameOrganization: false };
    }
    fixture.role = await db.role.findFirstOrThrow({ where: { organizationId: fixture.homeOrganizationId, code: 'owned-close-verifier' } });
    fixture.homeGrant = await db.tenantModuleGrant.findFirstOrThrow({ where: { organizationId: fixture.homeOrganizationId, moduleSlug: 'accounting' } });
    fixture.closeGrant = await db.tenantModuleGrant.findFirstOrThrow({ where: { organizationId: fixture.x.organizationId, moduleSlug: 'close_assurance' } });
    fixture.delegated = delegated;
    return fixture;
  }
  async function session(fixture) {
    const at = new Date(), token = crypto.randomUUID() + crypto.randomUUID(); secrets.push(token);
    fixture.session = await db.session.create({ data: { token, userId: fixture.actor.id, expiresAt: new Date(at.getTime() + 3600000),
      assuranceVerifiedAt: at, assuranceMethod: 'password', assuranceOrganizationId: fixture.homeOrganizationId, assuranceLevel: 1 } });
    return fixture.session;
  }
  async function refreshSession(fixture) {
    fixture.session = await db.session.update({ where: { id: fixture.session.id }, data: { assuranceVerifiedAt: new Date(), expiresAt: new Date(Date.now() + 3600000) } });
  }
  const control = fixture => ({ actorId: fixture.actor.id, actorPermissions: fixture.permissions,
    freshAuth: { actorId: fixture.actor.id, organizationId: fixture.homeOrganizationId, lastAuthAt: new Date() },
    session: { id: fixture.session.id, token: fixture.session.token }, requireWorkDeskAccess: true });
  const input = (fixture, label) => ({ requestId: fixture.request.id, responseId: fixture.response.id,
    ...(fixture.delegated ? { clientOrganizationId: fixture.x.organizationId } : {}), replacement: fixture.initialPreview.selection,
    resolutionNotes: 'Synthetic authority review: inspected the exact recorded source recovery and client response.', correlationId: 'authority-' + run + '-' + label });
  const accept = (fixture, value, authority = control(fixture)) => close.acceptMissingCloseEvidenceResponse(fixture.homeOrganizationId, value, authority);
  async function effects(fixture) {
    const scope = { organizationId: fixture.x.organizationId }, records = {};
    for (const model of ['accountantComment', 'closeAssuranceFinding', 'ledgerAuditEvent', 'businessEvent', 'businessEventOutbox', 'businessEventAudit'])
      records[model] = f.hash(await db[model].findMany({ where: scope, orderBy: { id: 'asc' } }));
    return { hash: f.hash(records), records };
  }
  async function retained(fixture) {
    const where = { organizationId: fixture.x.organizationId, closeRunId: fixture.x.oldRunId }, records = {};
    for (const model of ['closeChecklistItem', 'closeEvidenceItem', 'closePackExport']) records[model] = f.hash(await db[model].findMany({ where, orderBy: { id: 'asc' } }));
    records.run = f.hash(await db.closeRun.findUniqueOrThrow({ where: { id: fixture.x.oldRunId } })); return f.hash(records);
  }
  const outcome = promise => promise.then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error, secrets) }));
  async function change(model, id, data) {
    const before = await db[model].findUniqueOrThrow({ where: { id } });
    await db[model].update({ where: { id }, data });
    return () => db[model].update({ where: { id }, data: Object.fromEntries(Object.keys(data).map(key => [key, before[key]])) });
  }
  async function removed(model, row) { await db[model].delete({ where: { id: row.id } }); return () => db[model].create({ data: row }); }
  async function deny(fixture, id, mutate, expected = 'FORBIDDEN', makeControl = control) {
    await refreshSession(fixture);
    const before = await effects(fixture), original = await retained(fixture), financial = await d.h.financial(); let restore;
    try {
      restore = await mutate();
      const result = await outcome(accept(fixture, input(fixture, id), makeControl(fixture)));
      assert.equal(result.success, false, id + ' must refuse acceptance'); assert.equal(result.code, expected, id);
      assert.deepEqual(await effects(fixture), before, id + ' must not create acceptance effects');
      assert.equal(await retained(fixture), original); assert.equal((await d.h.financial()).hash, financial.hash);
      return { id, status: 'passed', code: result.code, noAcceptanceEffects: true, retainedOriginalUnchanged: true, noFinancialEffects: true };
    } finally { if (restore) await restore(); }
  }
  async function accepted(fixture, value) {
    const before = await retained(fixture), result = await accept(fixture, value);
    assert.equal(result.decision, 'ACCEPTED'); assert.equal(result.acceptedById, fixture.actor.id); assert.equal(result.organizationId, fixture.x.organizationId);
    assert.deepEqual(result.replacement, fixture.initialPreview.selection);
    const stored = await db.accountantComment.findUniqueOrThrow({ where: { id: result.id } });
    const binding = replacement.parseCloseEvidenceReplacementBinding(stored.metadata.replacementBinding); assert.ok(binding);
    assert.deepEqual(replacement.closeEvidenceReplacementSelection(binding), fixture.initialPreview.selection);
    assert.equal(await retained(fixture), before);
    return { acceptanceId: result.id, findingId: fixture.finding.id, replacement: result.replacement, retainedOriginalUnchanged: true };
  }
  async function matrix(fixture) {
    const cases = [], future = () => new Date(Date.now() + 3600000), past = () => new Date(Date.now() - 3600000);
    const user = (id, data) => deny(fixture, id, () => change('user', fixture.actor.id, data));
    for (const [id, data] of [['actor-inactive', { isActive: false }], ['actor-unverified', { isVerified: false, emailVerified: false }],
      ['actor-locked', { isLocked: true }], ['actor-timed-lock', { isLocked: true, lockedUntil: future() }]]) cases.push(await user(id, data));
    for (const [name, org] of [['home', fixture.homeOrganizationId], ['target', fixture.x.organizationId]])
      for (const [state, data] of [['inactive', { isActive: false }], ['deleted', { deletedAt: new Date() }]])
        cases.push(await deny(fixture, name + '-organization-' + state, () => change('organization', org, data)));
    cases.push(await deny(fixture, 'role-review-removed', () => change('role', fixture.role.id, { permissions: fixture.permissions.filter(value => value !== reviewPermission) })));
    cases.push(await deny(fixture, 'work-desk-audit-removed', () => change('role', fixture.role.id, { permissions: fixture.permissions.filter(value => value !== 'accounting.audit.read') })));
    cases.push(await deny(fixture, 'home-role-membership-removed', async () => {
      await db.user.update({ where: { id: fixture.actor.id }, data: { roles: { disconnect: { id: fixture.role.id } } } });
      return () => db.user.update({ where: { id: fixture.actor.id }, data: { roles: { connect: { id: fixture.role.id } } } });
    }));
    const foreign = await db.role.findFirstOrThrow({ where: { organizationId: fixture.x.organizationId, code: 'owned-close-verifier' } });
    assert.notEqual(foreign.organizationId, fixture.homeOrganizationId);
    cases.push(await deny(fixture, 'foreign-role-cannot-replace-home-review', async () => {
      const restore = await change('role', fixture.role.id, { permissions: fixture.permissions.filter(value => value !== reviewPermission) });
      await db.user.update({ where: { id: fixture.actor.id }, data: { roles: { connect: { id: foreign.id } } } });
      return async () => { await db.user.update({ where: { id: fixture.actor.id }, data: { roles: { disconnect: { id: foreign.id } } } }); await restore(); };
    }));
    cases.push(await deny(fixture, 'trusted-session-not-supplied', async () => null, 'FRESH_AUTH_REQUIRED', value => ({ ...control(value), session: undefined })));
    cases.push(await deny(fixture, 'session-currently-revoked', () => removed('session', fixture.session), 'FRESH_AUTH_REQUIRED'));
    cases.push(await deny(fixture, 'session-token-mismatch', async () => null, 'FRESH_AUTH_REQUIRED', value => ({ ...control(value), session: { id: value.session.id, token: 'synthetic-wrong-token' } })));
    for (const [id, data] of [['expired', { expiresAt: past() }], ['assurance-expired', { assuranceVerifiedAt: past() }],
      ['assurance-future', { assuranceVerifiedAt: future() }], ['assurance-missing', { assuranceVerifiedAt: null }],
      ['assurance-wrong-home', { assuranceOrganizationId: fixture.x.organizationId }], ['assurance-locked', { assuranceLockedUntil: future() }],
      ['assurance-wrong-method', { assuranceMethod: 'synthetic-other-method' }], ['assurance-level-zero', { assuranceLevel: 0 }]])
      cases.push(await deny(fixture, 'session-' + id, () => change('session', fixture.session.id, data), 'FRESH_AUTH_REQUIRED'));
    for (const [id, data] of [['read-only', { role: 'READ_ONLY' }], ['revoked', { status: 'REVOKED', activeScopeKey: null }],
      ['future', { effectiveFrom: future() }], ['expired', { expiresAt: past() }]])
      cases.push(await deny(fixture, 'target-review-grant-' + id, () => change('accountantAccessGrant', fixture.grant.id, data)));
    for (const [id, data] of [['suspended', { status: 'suspended' }], ['read-only', { readOnly: true }]])
      cases.push(await deny(fixture, 'target-close-module-' + id, () => change('tenantModuleGrant', fixture.closeGrant.id, data)));
    cases.push(await deny(fixture, 'target-close-module-missing', () => removed('tenantModuleGrant', fixture.closeGrant)));
    cases.push(await deny(fixture, 'home-accounting-module-suspended', () => change('tenantModuleGrant', fixture.homeGrant.id, { status: 'suspended' })));
    cases.push(await deny(fixture, 'home-accounting-module-missing', () => removed('tenantModuleGrant', fixture.homeGrant)));
    return cases;
  }
  function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
  async function bounded(work, label, milliseconds = 20000) { let timer; try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), milliseconds); })]); } finally { clearTimeout(timer); } }
  async function pid(tx) { const rows = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database'); assert.equal(rows[0].database, helper.database); return rows[0].pid; }
  async function blocking(waiter, holder) {
    assert.notEqual(waiter, holder);
    return helper.withClient(f.target, async client => { await helper.assertOwned(client); const until = Date.now() + 4000;
      do { const rows = await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiter]);
        if (rows.rows[0].blockers.includes(holder)) return { waiterPid: waiter, holderPid: holder, blockers: rows.rows[0].blockers, observed: true };
        await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < until);
      throw new Error('Actual PostgreSQL authority lock wait was not observed'); });
  }
  async function race(fixture, acceptorFirst, resource = 'role') {
    await refreshSession(fixture);
    const writer = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 30000, maxWait: 10000 } });
    await assertDisposableDatabaseIdentity(writer, helper.database);
    const local = new AsyncLocalStorage(), release = deferred(), holderReady = deferred(), attempt = deferred(), state = { events: [] };
    const before = await effects(fixture), history = await retained(fixture), financial = await d.h.financial(); let acceptance, revocation;
    const value = input(fixture, resource + (acceptorFirst ? '-acceptor-first' : '-revoker-first'));
    const deniedCode = resource === 'session' ? 'FRESH_AUTH_REQUIRED' : 'FORBIDDEN';
    dbModule.db = new Proxy({}, { get(_facade, key) {
      if (key !== '$transaction' || !local.getStore()) { const member = Reflect.get(db, key); return typeof member === 'function' ? member.bind(db) : member; }
      return (work, options) => db.$transaction(async tx => {
        state.acceptorPid = await pid(tx); assert.equal(options?.isolationLevel, 'ReadCommitted');
        const observed = new Proxy({}, { get(_txFacade, property) {
          if (property === '$queryRaw') return async (...args) => {
            const sql = args.map(arg => typeof arg === 'string' ? arg : arg?.sql || arg?.text || '').join(' ');
            const roleLock = sql.includes('roles') && sql.includes('FOR SHARE');
            const sessionLock = sql.includes('sessions') && sql.includes('FOR SHARE');
            if (roleLock) state.events.push({ event: 'role-lock-attempt', at: Date.now() });
            if (sessionLock) state.events.push({ event: 'session-lock-attempt', at: Date.now() });
            if (!acceptorFirst && (resource === 'role' ? roleLock : sessionLock)) attempt.resolve();
            const result = await tx.$queryRaw(...args);
            if (roleLock) state.events.push({ event: 'role-lock-acquired', at: Date.now() });
            if (sessionLock && acceptorFirst) { state.events.push({ event: 'session-lock-acquired', at: Date.now() }); holderReady.resolve(); await bounded(release.promise, 'acceptor release'); }
            return result;
          };
          const member = Reflect.get(tx, property); return typeof member === 'function' ? member.bind(tx) : member;
        } }); return work(observed);
      }, { ...options, timeout: 30000 });
    } });
    const revoke = () => writer.$transaction(async tx => { state.revokerPid = await pid(tx);
      state.events.push({ event: resource + '-revocation-attempt', at: Date.now() }); if (acceptorFirst) attempt.resolve();
      if (resource === 'session') await tx.session.delete({ where: { id: fixture.session.id } });
      else await tx.role.update({ where: { id: fixture.role.id }, data: { permissions: fixture.permissions.filter(permission => permission !== reviewPermission) } });
      state.events.push({ event: resource + '-revocation-written', at: Date.now() }); if (!acceptorFirst) { holderReady.resolve(); await bounded(release.promise, 'revoker release'); }
    }, { isolationLevel: 'ReadCommitted', timeout: 30000 });
    try {
      if (acceptorFirst) acceptance = outcome(local.run(true, () => accept(fixture, value))); else revocation = outcome(revoke());
      await bounded(holderReady.promise, 'authority holder');
      if (acceptorFirst) revocation = outcome(revoke()); else acceptance = outcome(local.run(true, () => accept(fixture, value)));
      await bounded(attempt.promise, 'authority waiter');
      const observedWait = await blocking(acceptorFirst ? state.revokerPid : state.acceptorPid, acceptorFirst ? state.acceptorPid : state.revokerPid);
      release.resolve(); const result = await bounded(acceptance, 'acceptance result'), revoked = await bounded(revocation, 'revocation commit');
      assert.equal(revoked.success, true); assert.equal(result.success, acceptorFirst);
      if (acceptorFirst) {
        assert.equal(result.value.acceptedById, fixture.actor.id); assert.deepEqual(result.value.replacement, fixture.initialPreview.selection);
        const effectsAfter = await effects(fixture), replay = await outcome(accept(fixture, value));
        assert.equal(replay.success, false); assert.equal(replay.code, deniedCode); assert.deepEqual(await effects(fixture), effectsAfter);
      } else { assert.equal(result.code, deniedCode); assert.deepEqual(await effects(fixture), before); }
      assert.equal(await retained(fixture), history); assert.equal((await d.h.financial()).hash, financial.hash);
      return { id: acceptorFirst ? 'acceptor-first-' + resource + '-revocation-waits-until-commit' : 'revoker-first-' + resource + '-removal-denies-after-wait', status: 'passed',
        blocking: observedWait, events: state.events, accepted: result.success, denialCode: result.code || null,
        acceptanceId: result.success ? result.value.id : null, revokedReplayDenied: acceptorFirst, noDeniedAcceptanceEffects: !acceptorFirst, noFinancialEffects: true };
    } finally { release.resolve(); await Promise.allSettled([acceptance, revocation].filter(Boolean)); dbModule.db = originalDb; await writer.$disconnect();
      if (resource === 'session') { if (!await db.session.findUnique({ where: { id: fixture.session.id } })) await db.session.create({ data: fixture.session }); }
      else await db.role.update({ where: { id: fixture.role.id }, data: { permissions: fixture.permissions } }); }
  }
  const report = { run, at: new Date().toISOString(), checks: [],
    scope: 'Actual owned disposable PostgreSQL only. Persisted home/delegated authority and fresh password-assurance sessions; actual missing collector request/response and receipt. Temporary changes affect only owned synthetic authorities. Both role and session revocation lock orders require actual backend blocker proof.',
    limitations: ['Runtime sessions are synthetic persisted service-verifier sessions, not a claim of browser authentication; the separate browser verifier signs in normally.',
      'Collector failure is explicit fixture setup injection, restored before review; collection receipts are produced by actual services.',
      'Source, outside-fixture and financial bindings enumerate the recorded models. No real mandate, customer approval, migration, seed, delivery worker or production certification.'] };
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await outside();
    const fixtures = []; for (const [label, delegated] of [['home', false], ['delegated', true], ['role-revoker-first', false], ['role-acceptor-first', false], ['session-revoker-first', false], ['session-acceptor-first', false]]) {
      const fixture = await setup(label, delegated); await session(fixture); fixtures.push(fixture);
    }
    report.fixtures = fixtures.map(value => ({ organizationId: value.x.organizationId, homeOrganizationId: value.homeOrganizationId, actorId: value.actor.id, findingId: value.finding.id, grant: value.grantEvidence }));
    report.financialAfterSetup = await d.h.financial();
    report.checks.push(...await matrix(fixtures[1]));
    for (const fixture of fixtures.slice(0, 2)) {
      await refreshSession(fixture);
      const restore = fixture.delegated ? await change('tenantModuleGrant', fixture.homeGrant.id, { readOnly: true }) : null;
      try { report.checks.push({ id: fixture.delegated ? 'delegated-review-permits-home-accounting-read-only' : 'current-home-authority-accepts', status: 'passed',
        ...await accepted(fixture, input(fixture, fixture.delegated ? 'delegated-success' : 'home-success')) }); }
      finally { if (restore) await restore(); }
    }
    report.checks.push(await race(fixtures[2], false)); report.checks.push(await race(fixtures[3], true));
    report.checks.push(await race(fixtures[4], false, 'session')); report.checks.push(await race(fixtures[5], true, 'session'));
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error, secrets); report.stack = f.safe(error.stack || error, secrets); }
    finally {
      dbModule.db = originalDb;
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
        report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash;
        report.financialAfter = await d.h.financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash;
      } catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.checks.length === 38 && report.checks.every(value => value.status === 'passed') && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-acceptance-authority-runtime-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.length, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { f, db, root, helper, organizations, sources, outside, setup, session, control, input, accept, effects, retained, change, outcome, secrets, financial: d.h.financial };
  if (require.main === module) runMain();
}
