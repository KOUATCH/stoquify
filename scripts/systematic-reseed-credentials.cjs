// Merge only credentials which still authenticate against the selected local
// database. This module never changes an account, password, or role assignment.
const fs = require('node:fs/promises');
const path = require('node:path');
const { ROOT, PRIVATE, OUT } = require('./systematic-reseed-local.cjs');

async function readCredentials(file) {
  let value;
  try {
    value = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { present: false, credentials: [] };
    throw new Error('A credential artifact could not be parsed; no credentials were changed.');
  }
  const credentials = Array.isArray(value) ? value : value?.credentials;
  if (!Array.isArray(credentials)) throw new Error('A credential artifact has no credentials array.');
  return { present: true, credentials };
}

async function atomicJson(file, value, mode) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode });
  await fs.chmod(temporary, mode);
  await fs.rename(temporary, file);
}

async function buildVerifiedCredentialHandoff(db, target, options = {}) {
  if (!['candidate', 'source'].includes(target)) throw new Error('Credential target must be candidate or source.');
  // The normal verifier uses this singleton internally. Refuse an unrelated
  // client, so data from one database cannot validate a password in another.
  const { db: applicationDb } = require('../prisma/db.ts');
  if (db !== applicationDb) throw new Error('Credential verification requires the selected application database client.');
  const { verifyUserCredentialPassword } = require('../lib/security/auth-credentials.ts');
  const oldPath = path.join(ROOT, '.seed-artifacts', 'seed-login-credentials.json');
  const newPath = path.join(PRIVATE, `${target}-new-credentials.json`);
  const credentialPath = path.join(PRIVATE, `${target}-verified-credentials.json`);
  const [oldArtifact, newArtifact] = await Promise.all([readCredentials(oldPath), readCredentials(newPath)]);
  const summary = {
    target,
    generatedAt: new Date().toISOString(),
    sourceArtifactsPresent: { established: oldArtifact.present, newlyCreated: newArtifact.present },
    candidates: oldArtifact.credentials.length + newArtifact.credentials.length,
    verifiedUsers: 0,
    skipped: { malformed: 0, unavailableAccount: 0, identityMismatch: 0, crossTenantRole: 0, noAssignedRole: 0, stalePassword: 0, duplicate: 0 },
    organizationCounts: {},
    roleCounts: {},
    method: 'verifyUserCredentialPassword',
    databaseWrites: 0,
    secretValuesPrinted: false,
  };
  const verified = new Map();
  for (const candidate of [...oldArtifact.credentials, ...newArtifact.credentials]) {
    if (!candidate || typeof candidate.organizationId !== 'string' || typeof candidate.email !== 'string' || typeof candidate.password !== 'string' || !candidate.organizationId || !candidate.email || !candidate.password || candidate.password.length > 128) {
      summary.skipped.malformed++;
      continue;
    }
    const user = await db.user.findFirst({
      where: { organizationId: candidate.organizationId, email: candidate.email, isActive: true, isLocked: false, isVerified: true, emailVerified: true, organization: { isActive: true, deletedAt: null } },
      select: { id: true, organizationId: true, email: true, name: true, firstName: true, lastName: true, roles: { select: { organizationId: true, code: true, nameEn: true, nameFr: true } } },
    });
    if (!user) { summary.skipped.unavailableAccount++; continue; }
    if (candidate.userId && candidate.userId !== user.id) { summary.skipped.identityMismatch++; continue; }
    if (user.organizationId !== candidate.organizationId || user.roles.some(role => role.organizationId !== user.organizationId)) { summary.skipped.crossTenantRole++; continue; }
    if (!user.roles.length) { summary.skipped.noAssignedRole++; continue; }
    if (verified.has(user.id)) { summary.skipped.duplicate++; continue; }
    if (!await verifyUserCredentialPassword(user.id, candidate.password)) { summary.skipped.stalePassword++; continue; }
    const roles = [...user.roles].sort((a, b) => a.code.localeCompare(b.code));
    verified.set(user.id, {
      userId: user.id,
      organizationId: user.organizationId,
      name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' '),
      email: user.email,
      password: candidate.password,
      roleCodes: roles.map(role => role.code),
      role: roles.map(role => role.nameEn || role.nameFr || role.code).join(', '),
    });
  }
  // The existing workflow smoke uses the first cashier. Keep the two known
  // business-fixture tenants first; other tenants retain their valid logins.
  const credentials = [...verified.values()].sort((a, b) => Number(!a.organizationId.startsWith('rds_org_')) - Number(!b.organizationId.startsWith('rds_org_')) || a.organizationId.localeCompare(b.organizationId) || a.email.localeCompare(b.email));
  summary.verifiedUsers = credentials.length;
  for (const credential of credentials) {
    summary.organizationCounts[credential.organizationId] = (summary.organizationCounts[credential.organizationId] || 0) + 1;
    for (const code of credential.roleCodes) summary.roleCounts[code] = (summary.roleCounts[code] || 0) + 1;
  }
  if (options.write !== false) {
    await atomicJson(credentialPath, { generatedAt: summary.generatedAt, target, verificationMethod: summary.method, credentials }, 0o600);
    await atomicJson(path.join(OUT, `${target}-credential-verification.json`), summary, 0o644);
  }
  return { knownCredentialUserIds: credentials.map(credential => credential.userId), credentialPath, summary };
}

module.exports = { buildVerifiedCredentialHandoff };
