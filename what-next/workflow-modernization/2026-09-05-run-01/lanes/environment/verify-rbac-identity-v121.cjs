// Framework/session shim isolates identity resolution after a session read. This is not a live authentication exploit test.
const Module = require('node:module'), originalLoad = Module._load;
Module._load = function(name, ...args) { if (name === 'next/headers') return { headers: async () => new Headers() }; return originalLoad.call(this, name, ...args); };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { auth } = require(path.join(f.root, 'lib/auth.ts')), rbac = require(path.join(f.root, 'lib/security/rbac.ts'));
const after = process.argv.includes('--after'), stamp = crypto.randomUUID(), organizationId = 'workflow_rbac_identity_' + stamp;
const source = 'lib/security/rbac.ts', digest = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, source))).digest('hex');
const report = { at: new Date().toISOString(), phase: after ? 'after' : 'before', organizationId, source, sourceBefore: digest(), checks: [], scope: 'Owned real PostgreSQL users/roles; synthetic session return and Next headers isolate a stale identity snapshot between authentication and RBAC loading. No live authentication or professional security certification claim.' };
let session;
auth.api.getSession = async options => { assert.equal(options.query?.disableCookieCache, true); return session; };
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  await db.organization.create({ data: { id: organizationId, name: f.helper.prefix + 'RBAC identity', slug: organizationId, currency: 'XAF', country: 'CM' } });
  const email = stamp + '@example.invalid';
  const original = await db.user.create({ data: { organizationId, email, name: 'Owned original identity', isActive: true, isVerified: true, emailVerified: true } });
  await db.role.create({ data: { organizationId, code: 'OWNED_READER', nameEn: 'Owned reader', permissions: ['dashboard.read'], users: { connect: { id: original.id } } } });
  session = { user: { id: original.id, email, organizationId } };
  assert.equal((await rbac.requireRbacContext()).userId, original.id);
  // Simulate a directory update after the session returned its original identity snapshot.
  await db.user.update({ where: { id: original.id }, data: { email: 'changed-' + email, isActive: false } });
  const reassigned = await db.user.create({ data: { organizationId, email, name: 'Owned reassigned email', isActive: true, isVerified: true, emailVerified: true } });
  await db.role.create({ data: { organizationId, code: 'OWNED_OTHER', nameEn: 'Owned different authority', permissions: ['payments.reconciliation.sign'], users: { connect: { id: reassigned.id } } } });
  if (!after) {
    const wrong = await rbac.requireRbacContext(); assert.equal(wrong.userId, reassigned.id); assert.ok(wrong.permissions.includes('payments.reconciliation.sign'));
    report.checks.push({ name: 'reproduced a different active email owner replacing an inactive session subject', reproduced: true, originalId: original.id, resolvedId: wrong.userId });
  } else {
    await assert.rejects(() => rbac.requireRbacContext(), e => e.code === 'UNAUTHENTICATED'); assert.equal(await rbac.getOptionalRbacContext(), null);
    report.checks.push({ name: 'inactive original subject cannot inherit reassigned email authority', passed: true });
    await db.user.update({ where: { id: original.id }, data: { isActive: true } });
    const current = await rbac.requireRbacContext(); assert.equal(current.userId, original.id); assert.ok(!current.permissions.includes('payments.reconciliation.sign'));
    assert.equal(current.user.email, 'changed-' + email);
    report.checks.push({ name: 'active immutable identity survives changed email and receives only current own permissions', passed: true });
    session = { user: { email, organizationId } };
    await assert.rejects(() => rbac.requireRbacContext(), e => e.code === 'UNAUTHENTICATED');
    session = { user: { id: 'absent-subject', email, organizationId } };
    await assert.rejects(() => rbac.requireRbacContext(), e => e.code === 'UNAUTHENTICATED');
    session = { user: { id: original.id, email, organizationId: 'other-org' } };
    await assert.rejects(() => rbac.requireRbacContext(), e => e.code === 'FORBIDDEN');
    report.checks.push({ name: 'missing ID, missing subject and stale tenant are denied', passed: true });
  }
  assert.equal(await db.journalEntry.count({ where: { organizationId } }), 0); report.passed = true;
}
main().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = digest(); report.sourceStable = report.sourceBefore === report.sourceAfter;
  const file = path.join(__dirname, 'rbac-identity-v121-' + (after ? 'after-' : 'before-') + stamp + '.json'); console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await db.$disconnect(); }
});
