/** @jest-environment node */
const mockDb = { user: { findFirst: jest.fn() } };
const mockVerify = jest.fn();
const mockFs = {
  readFile: jest.fn(), mkdir: jest.fn(), writeFile: jest.fn(), chmod: jest.fn(), rename: jest.fn(),
};
jest.mock('node:fs/promises', () => mockFs);
jest.mock('../systematic-reseed-local.cjs', () => ({ ROOT: '/workspace', PRIVATE: '/private/reseed', OUT: '/reports/reseed' }));
jest.mock('../../prisma/db.ts', () => ({ db: mockDb }));
jest.mock('../../lib/security/auth-credentials.ts', () => ({ verifyUserCredentialPassword: mockVerify }));
const { buildVerifiedCredentialHandoff } = require('../systematic-reseed-credentials.cjs');

const user = (id, organizationId, code, nameEn) => ({ id, organizationId, email: `${id}@example.test`, name: `Person ${id}`, firstName: 'Person', lastName: id, isActive: true, isLocked: false, isVerified: true, emailVerified: true, roles: [{ organizationId, code, nameEn, nameFr: null }] });
const credential = (person, password, additions = {}) => ({ userId: person.id, organizationId: person.organizationId, email: person.email, password, ...additions });

beforeEach(() => {
  jest.clearAllMocks();
  for (const method of ['mkdir', 'writeFile', 'chmod', 'rename']) mockFs[method].mockResolvedValue(undefined);
});

test('filters stale and unusable secrets, derives actual roles, and keeps secrets out of returned public data', async () => {
  const cashier = user('cashier', 'rds_org_001', 'cashier', 'Cashier');
  const thirdTenant = user('third', 'another-org', 'manager', 'Manager');
  const inactive = { ...user('inactive', 'rds_org_001', 'cashier', 'Cashier'), isActive: false };
  const crossTenant = { ...user('cross', 'rds_org_001', 'owner', 'Owner'), roles: [{ organizationId: 'wrong-org', code: 'owner', nameEn: 'Owner' }] };
  const users = [cashier, thirdTenant, inactive, crossTenant];
  const oldArtifact = { credentials: [credential(cashier, 'stale-secret'), credential(inactive, 'inactive-secret'), credential(crossTenant, 'cross-secret')] };
  const newArtifact = [credential(thirdTenant, 'third-valid-secret'), credential(cashier, 'fresh-secret', { roleCodes: ['owner'], role: 'Owner' }), credential(cashier, 'fresh-secret'), credential(cashier, 'fresh-secret', { userId: 'wrong-id' }), null];
  mockFs.readFile.mockImplementation(async (file) => JSON.stringify(file.endsWith('seed-login-credentials.json') ? oldArtifact : newArtifact));
  mockDb.user.findFirst.mockImplementation(async ({ where }) => users.find((entry) => entry.organizationId === where.organizationId && entry.email === where.email && entry.isActive && !entry.isLocked && entry.isVerified && entry.emailVerified) ?? null);
  mockVerify.mockImplementation(async (id, password) => (id === 'cashier' && password === 'fresh-secret') || (id === 'third' && password === 'third-valid-secret'));

  const result = await buildVerifiedCredentialHandoff(mockDb, 'candidate');
  expect(result.knownCredentialUserIds).toEqual(['cashier', 'third']);
  expect(result.summary.skipped).toMatchObject({ stalePassword: 1, unavailableAccount: 1, crossTenantRole: 1, identityMismatch: 1, duplicate: 1, malformed: 1 });
  expect(result.summary.verifiedUsers).toBe(2);
  const privateWrite = mockFs.writeFile.mock.calls.find(([file]) => file.includes('verified-credentials.json'));
  const handoff = JSON.parse(privateWrite[1]);
  expect(handoff.credentials[0]).toMatchObject({ userId: 'cashier', role: 'Cashier', roleCodes: ['cashier'], password: 'fresh-secret' });
  expect(privateWrite[2].mode).toBe(0o600);
  const publicWrite = mockFs.writeFile.mock.calls.find(([file]) => file.includes('credential-verification.json'));
  for (const secret of ['fresh-secret', 'third-valid-secret', 'stale-secret']) {
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(publicWrite[1]).not.toContain(secret);
  }
  expect(mockVerify).toHaveBeenCalledWith('cashier', 'stale-secret');
  expect(mockVerify).toHaveBeenCalledWith('cashier', 'fresh-secret');
  expect(mockVerify).not.toHaveBeenCalledWith('inactive', expect.anything());
  expect(mockVerify).not.toHaveBeenCalledWith('cross', expect.anything());
});

test('write false only verifies and returns IDs, preserving every artifact', async () => {
  const person = user('owner', 'rds_org_001', 'owner', 'Owner');
  mockFs.readFile.mockImplementation(async (file) => {
    if (file.endsWith('seed-login-credentials.json')) return JSON.stringify({ credentials: [credential(person, 'verified-secret')] });
    throw Object.assign(new Error('not found'), { code: 'ENOENT' });
  });
  mockDb.user.findFirst.mockResolvedValue(person);
  mockVerify.mockResolvedValue(true);
  const result = await buildVerifiedCredentialHandoff(mockDb, 'source', { write: false });
  expect(result.knownCredentialUserIds).toEqual(['owner']);
  expect(result.summary.sourceArtifactsPresent).toEqual({ established: true, newlyCreated: false });
  expect(mockFs.writeFile).not.toHaveBeenCalled();
  expect(mockFs.mkdir).not.toHaveBeenCalled();
  expect(mockFs.rename).not.toHaveBeenCalled();
});

test('refuses unrelated database clients and unsafe target path components', async () => {
  await expect(buildVerifiedCredentialHandoff({}, 'candidate')).rejects.toThrow('selected application database client');
  await expect(buildVerifiedCredentialHandoff(mockDb, '../elsewhere')).rejects.toThrow('target must be candidate or source');
  expect(mockDb.user.findFirst).not.toHaveBeenCalled();
  expect(mockVerify).not.toHaveBeenCalled();
});
