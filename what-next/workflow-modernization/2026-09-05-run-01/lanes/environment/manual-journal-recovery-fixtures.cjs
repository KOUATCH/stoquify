// Helpers only. No main, HTTP request, connection, or fixture mutation on import.
const inventory = require('./inventory-adjustment-reversal-runtime.cjs');
const manual = require('./manual-journal-posting-runtime.cjs'), journal = require('./journal-manual-runtime.cjs');
const { h, d } = journal, { f, db, root, helper, organizations } = h, { fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(root, 'lib/password.ts'));
const { stepUpSessionWithPassword } = require(path.join(root, 'services/security/step-up-auth.service.ts'));
const { getModuleCatalog } = require(path.join(root, 'services/modules/module-catalog.service.ts'));
const { assertDisposableDatabaseIdentity } = require(path.join(root, 'scripts/disposable-fixture-guard.js'));
const secrets = [], sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const files = [__filename, ...['app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx', 'actions/accounting/journals.actions.ts', 'services/accounting/posting.service.ts', 'services/accounting/journal-posting-order.service.ts', 'services/accounting/journal-reversal-order.service.ts', 'services/security/step-up-auth.service.ts', 'services/modules/module-entitlement.service.ts', 'lib/security/auth-session.ts', 'next.config.mjs', 'package.json'].map(file => path.join(root, file))];
const sources = () => ({ ...manual.sources(), ...inventory.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
async function guard() { await assertDisposableDatabaseIdentity(db, 'stoquify_local_registration_20260906_01'); await helper.withClient(f.target, helper.assertOwned); }
async function outside() { const financial = await inventory.outside(), user = { organizationId: { notIn: organizations } };
  const accounts = await db.account.findMany({ where: { user }, orderBy: { id: 'asc' } }), sessions = await db.session.findMany({ where: { user }, orderBy: { id: 'asc' } });
  return { hash: f.hash({ financial, accounts: f.hash(accounts), sessions: f.hash(sessions) }), financial };
}
async function credential(x, purpose, userId, permissions) {
  assert.ok(organizations.includes(x.organizationId)); const password = 'Owned-journal-' + purpose + '-' + crypto.randomUUID() + '!'; secrets.push(password); const passwordHash = await hashPassword(password); secrets.push(passwordHash);
  const role = await db.role.create({ data: { organizationId: x.organizationId, code: 'journal-browser-' + purpose, nameEn: 'Synthetic journal browser ' + purpose, permissions } });
  const data = { organizationId: x.organizationId, name: 'Synthetic journal ' + purpose, email: purpose + '-' + crypto.randomUUID() + '@example.invalid', isActive: true, isVerified: true, emailVerified: true, password: passwordHash, roles: { set: [{ id: role.id }] } };
  const actor = userId ? await db.user.update({ where: { id: userId }, data }) : await db.user.create({ data: { ...data, roles: { connect: [{ id: role.id }] } } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: passwordHash } });
  return { actor, password, permissions, roleId: role.id };
}
async function fixture(locale, run) {
  await guard(); const x = await inventory.fixture('journal-browser-' + locale + '-' + run.slice(0, 8));
  const draft = await manual.draft(x), untouchedDraft = await manual.draft(x), scope = { organizationId: x.organizationId }, modules = getModuleCatalog().map(value => value.slug);
  assert.equal(await db.tenantModuleConfiguration.count({ where: scope }), 0);
  await db.tenantModuleConfiguration.create({ data: { ...scope, manifestHash: 'owned-journal-browser-' + run, selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ ...scope, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticLocalFixture: true, liveActivation: false } })) });
  const read = ['dashboard.read', 'accounting.journal.read'];
  const poster = await credential(x, 'poster', x.info.actorIds.checker, [...read, 'accounting.journal.post']);
  const reverser = await credential(x, 'reverser', x.certifierId, [...read, 'accounting.journal.reverse']);
  const reader = await credential(x, 'reader', null, read);
  const original = await db.journalEntry.findUniqueOrThrow({ where: { id: draft.draftId } }), sourceOwned = await db.journalEntry.findUniqueOrThrow({ where: { id: x.originalJournalId } });
  assert.equal(original.sourceType, 'MANUAL'); assert.equal(original.status, 'DRAFT'); assert.notEqual(sourceOwned.sourceType, 'MANUAL'); assert.equal(sourceOwned.status, 'POSTED'); assert.notEqual(poster.actor.id, reverser.actor.id);
  const retainedDraft = await db.journalEntry.findUniqueOrThrow({ where: { id: untouchedDraft.draftId } });
  const retainedPosted = await db.journalEntry.findUniqueOrThrow({ where: { id: x.info.setup.journalEntryId } });
  assert.equal(retainedDraft.status, 'DRAFT'); assert.equal(retainedPosted.status, 'POSTED');
  return { x: draft, poster, reverser, reader, original: { id: original.id, entryNumber: original.entryNumber }, untouchedDraft: { id: retainedDraft.id, entryNumber: retainedDraft.entryNumber }, untouchedPosted: { id: retainedPosted.id, entryNumber: retainedPosted.entryNumber }, sourceOwned: { id: sourceOwned.id, entryNumber: sourceOwned.entryNumber, sourceType: sourceOwned.sourceType } };
}
async function signIn(context, base, credential, expire = false) {
  const { actor, password } = credential; assert.ok(organizations.includes(actor.organizationId));
  assert.equal(await db.session.count({ where: { userId: actor.id } }), 0, 'Fresh owned credential actor must have no earlier sessions');
  const response = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: actor.email, password }, headers: { Origin: base }, timeout: 180000, maxRedirects: 0 }); assert.equal(response.status(), 200);
  const sessions = await db.session.findMany({ where: { userId: actor.id, expiresAt: { gt: new Date() } } }); assert.equal(sessions.length, 1); const session = sessions[0]; secrets.push(session.token);
  if (expire) {
    const verified = await stepUpSessionWithPassword({ sessionId: session.id, sessionToken: session.token, userId: actor.id, organizationId: actor.organizationId, password }); assert.equal(verified.status, 'verified');
    const staleAt = new Date(Date.now() - 301000); const changed = await db.session.updateMany({ where: { id: session.id, userId: actor.id, assuranceMethod: 'password', assuranceOrganizationId: actor.organizationId, assuranceLevel: 1 }, data: { assuranceVerifiedAt: staleAt } }); assert.equal(changed.count, 1);
    return { sessionId: session.id, expiredAt: staleAt.toISOString(), genuinePasswordVerifiedBeforeSyntheticExpiry: true };
  }
  return { sessionId: session.id };
}
async function assertFreshSession(sessionId, actorId, organizationId, after) {
  const record = await db.session.findFirstOrThrow({ where: { id: sessionId, userId: actorId } }); assert.equal(record.assuranceMethod, 'password'); assert.equal(record.assuranceOrganizationId, organizationId); assert.equal(record.assuranceLevel, 1); assert.ok(record.assuranceVerifiedAt && record.assuranceVerifiedAt.getTime() >= after); return { sessionId, verifiedAt: record.assuranceVerifiedAt.toISOString(), method: record.assuranceMethod };
}
const protectedRows = x => inventory.rows(x);
async function postProof(x, before) { return manual.delta(x, before); }
async function reverseProof(x, before, reversalId) { return journal.exactReversals(x, before, [{ originalId: x.draftId, reversalId }]); }
module.exports = { h, d, f, db, root, helper, organizations, secrets, sha, sources, guard, outside, fixture, signIn, assertFreshSession, protectedRows, postProof, reverseProof, journal, manual };
