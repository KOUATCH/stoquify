const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { prepare, verify } = require('../../scripts/release-artifact.cjs');
const { promote, withMigrationLock } = require('../../scripts/promote-release-schema.cjs');
let root, destination;
const sourceIdentity = () => [{ path: 'app/page.tsx', sha256: 'a'.repeat(64) }];
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 's11-artifact-'));
  destination = path.join(root, 'artifact');
});
function output() {
  for (const [file, bytes] of Object.entries({ '.next/BUILD_ID': 'test-build', '.next/standalone/server.js': 'server', '.next/static/test-build/app.js': 'client', 'public/favicon.ico': 'icon', '.next/standalone/node_modules/next/package.json': '{}', '.next/standalone/node_modules/react/package.json': '{}', '.next/standalone/node_modules/react-dom/package.json': '{}' })) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), bytes);
  }
}
afterEach(() => { if (!path.resolve(root).startsWith(path.join(os.tmpdir(), 's11-artifact-'))) throw new Error('Unexpected test root'); fs.rmSync(root, { recursive: true, force: true }); });
test('seals complete standalone assets and verifies source and output identity', async () => {
  const runScript = jest.fn(async name => { expect(name).toBe('build'); output(); });
  const result = await prepare(root, destination, { sourceIdentity, runScript });
  expect(verify(root, destination, result.sha256, { sourceIdentity }).files).toHaveLength(6);
  expect(runScript).toHaveBeenCalledTimes(1);
  await expect(prepare(root, destination, { sourceIdentity, runScript })).rejects.toThrow('must be new');
});
test('a real compilation failure cannot produce an artifact or invoke promotion', async () => {
  fs.writeFileSync(path.join(root, 'broken.js'), 'function {');
  const runScript = jest.fn(async () => { const result = spawnSync(process.execPath, ['--check', 'broken.js'], { cwd: root, encoding: 'utf8' }); expect(result.status).not.toBe(0); throw new Error('compilation failed'); });
  await expect(prepare(root, destination, { sourceIdentity, runScript })).rejects.toThrow('compilation failed');
  expect(fs.existsSync(destination)).toBe(false);
  expect(runScript.mock.calls.map(call => call[0])).toEqual(['build']);
});
test.each(['tamper', 'extra', 'removed', 'source', 'digest'])('refuses %s drift before promotion', async mode => {
  const result = await prepare(root, destination, { sourceIdentity, runScript: async () => output() });
  if (mode === 'tamper') fs.appendFileSync(path.join(destination, 'runtime/server.js'), 'changed');
  if (mode === 'extra') fs.writeFileSync(path.join(destination, 'extra.js'), 'changed');
  if (mode === 'removed') fs.unlinkSync(path.join(destination, 'runtime/server.js'));
  const identity = mode === 'source' ? () => [] : sourceIdentity;
  expect(() => verify(root, destination, mode === 'digest' ? 'b'.repeat(64) : result.sha256, { sourceIdentity: identity })).toThrow();
});
test('refuses source changes during compilation and secret-shaped runtime files', async () => {
  const identity = jest.fn().mockReturnValueOnce(sourceIdentity()).mockReturnValueOnce([]);
  await expect(prepare(root, destination, { sourceIdentity: identity, runScript: async () => output() })).rejects.toThrow('Source changed');
  await expect(prepare(root, destination, { sourceIdentity, runScript: async () => { output(); fs.writeFileSync(path.join(root, '.next/standalone/.env'), 'synthetic'); } })).rejects.toThrow('Secret-shaped');
  expect(fs.existsSync(destination)).toBe(false);
});
test('requires artifact verification before any target or migration operation', async () => {
  const runScript = jest.fn(), client = { connect: jest.fn() };
  await expect(promote(root, destination, 'a'.repeat(64), { runScript, client })).rejects.toThrow();
  expect(client.connect).not.toHaveBeenCalled(); expect(runScript).not.toHaveBeenCalled();
});

test('refuses standalone output without its runtime dependencies', async () => {
  await expect(prepare(root, destination, { sourceIdentity, runScript: async () => { output(); fs.unlinkSync(path.join(root, '.next/standalone/node_modules/next/package.json')); } })).rejects.toThrow('runtime dependency missing');
  expect(fs.existsSync(destination)).toBe(false);
});
test('preserves the existing refusal of local and unattested targets', async () => {
  const runScript = jest.fn(), client = { connect: jest.fn() };
  for (const env of [{}, { DATABASE_URL: 'postgresql://test:test@localhost/test', VERCEL_ENV: 'production' }, { DATABASE_URL: 'postgresql://test:test@invalid.example/test', AQSTOQFLOW_DEPLOY_MIGRATIONS: '1' }]) {
    await expect(promote(root, destination, 'a'.repeat(64), { verify: () => ({}), env, runScript, client })).rejects.toThrow('safe migration target');
  }
  expect(client.connect).not.toHaveBeenCalled(); expect(runScript).not.toHaveBeenCalled();
});
test.each([true, false])('holds the lock through operation and closes it on success=%s', async succeeds => {
  const client = { connect: jest.fn(), query: jest.fn().mockResolvedValue({ rows: [{ locked: true }] }), end: jest.fn() };
  const operation = jest.fn(async () => { expect(client.end).not.toHaveBeenCalled(); if (!succeeds) throw new Error('failed migration'); return 'done'; });
  if (succeeds) await expect(withMigrationLock(client, operation)).resolves.toBe('done');
  else await expect(withMigrationLock(client, operation)).rejects.toThrow('failed migration');
  expect(client.query.mock.calls[1][0]).toContain('pg_advisory_unlock'); expect(client.end).toHaveBeenCalledTimes(1);
});
test('contending promotion never invokes migration or releases the other owner lock', async () => {
  const client = { connect: jest.fn(), query: jest.fn().mockResolvedValue({ rows: [{ locked: false }] }), end: jest.fn() }, operation = jest.fn();
  await expect(withMigrationLock(client, operation)).rejects.toThrow('already running');
  expect(operation).not.toHaveBeenCalled(); expect(client.query).toHaveBeenCalledTimes(1); expect(client.end).toHaveBeenCalled();
});
test('package build has no migration step or lifecycle hook and promotion is explicit', () => {
  const { scripts } = require('../../package.json');
  expect(scripts.build).toBe('npm run release:secrets:preflight && npm run build:linted');
  expect(scripts.prebuild).toBeUndefined(); expect(scripts.postbuild).toBeUndefined();
  expect(scripts['release:artifact']).toBe('node scripts/release-artifact.cjs prepare');
  expect(scripts['release:schema:promote']).toBe('node scripts/promote-release-schema.cjs');
});

test('lock connection loss aborts the operation and cannot report successful promotion', async () => {
  const { EventEmitter } = require('node:events');
  const client = Object.assign(new EventEmitter(), { connect: jest.fn(), query: jest.fn().mockResolvedValue({ rows: [{ locked: true }] }), end: jest.fn() });
  await expect(withMigrationLock(client, async signal => { client.emit('error', new Error('connection lost')); expect(signal.aborted).toBe(true); })).rejects.toThrow('connection lost');
  expect(client.end).toHaveBeenCalled();
});

test('successful promotion retains the existing safe migration gate between artifact checks', async () => {
  const { randomBytes } = require('node:crypto');
  const env = {
    VERCEL_ENV: 'production', DATABASE_URL: 'postgresql://synthetic:synthetic@db.invalid/synthetic',
    NEXT_PUBLIC_BASE_URL: 'https://app.invalid', STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '1', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '1', RESEND_API_KEY: 'synthetic-unit-only', RESEND_FROM_EMAIL: 'test@example.invalid',
  };
  for (const name of ['AUTH_SECRET', 'PUBLIC_IDENTITY_ABUSE_HASH_SECRET', 'AQSTOQFLOW_RECEIPT_TOKEN_SECRET', 'AQSTOQFLOW_HISTORY_CURSOR_SECRET', 'AQSTOQFLOW_STATEMENT_TOKEN_SECRET', 'AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY', 'AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY']) env[name] = randomBytes(32).toString('hex');
  const check = jest.fn(), runScript = jest.fn(), client = { connect: jest.fn(), query: jest.fn().mockResolvedValue({ rows: [{ locked: true }] }), end: jest.fn() };
  await expect(promote(root, destination, 'a'.repeat(64), { verify: check, env, client, runScript })).resolves.toMatchObject({ schemaPromoted: true, applicationDeployed: false });
  expect(check).toHaveBeenCalledTimes(3);
  expect(runScript).toHaveBeenCalledWith('prisma:migrate:deploy:safe', expect.objectContaining({ root, env, signal: expect.any(AbortSignal) }));
});
