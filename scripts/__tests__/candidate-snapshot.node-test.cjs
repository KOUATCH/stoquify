const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { validate, restore, included } = require('../candidate-snapshot.cjs');
const bytes = Buffer.from('source\r\n');
const snapshot = () => ({ schemaVersion: 1, files: [{ path: 'lib/example.ts', content: bytes.toString('base64'), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }] });
test('reconstruction preserves bytes and refuses overwrite', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stoquify-candidate-test-'));
  try {
    const target = path.join(root, 'restored'); restore(snapshot(), target);
    assert.deepEqual(fs.readFileSync(path.join(target, 'lib/example.ts')), bytes);
    assert.throws(() => restore(snapshot(), target), /must not exist/);
  } finally { fs.rmSync(root, { recursive: true }); }
});
test('rejects traversal, duplicate paths and corrupt source', () => {
  for (const file of ['../escape', 'C:/escape', '/escape', 'lib\\escape', 'lib/../escape']) {
    const value = snapshot(); value.files[0].path = file; assert.throws(() => validate(value), /Unsafe/);
  }
  const duplicate = snapshot(); duplicate.files.push({ ...duplicate.files[0], path: 'LIB/example.ts' }); assert.throws(() => validate(duplicate), /duplicate/);
  const corrupt = snapshot(); corrupt.files[0].content = Buffer.from('tampered').toString('base64'); assert.throws(() => validate(corrupt), /checksum/);
});
test('candidate excludes environment, credentials, dependencies and generated evidence', () => {
  for (const file of ['.env', '.env.local', '.npmrc', 'lib/cert.key', 'node_modules/x.ts', 'what-next/report.json', 'docs/image.png', 'lib/graphify-out/graph.json']) assert.equal(included(file), false, file);
  for (const file of ['package-lock.json', 'prisma/migrations/one/migration.sql', 'lib/command.ts', 'docs/ecc/WORKFLOW.md', 'public/logo.png']) assert.equal(included(file), true, file);
});
test('candidate retains vendored install inputs without admitting arbitrary vendor files', () => {
  assert.equal(included('vendor/xlsx-0.20.3.tgz'), true);
  assert.equal(included('vendor/README.md'), true);
  for (const file of ['vendor/.env', 'vendor/token.key', 'vendor/random.json', 'vendor/nested/package.tgz']) assert.equal(included(file), false);
});

test('candidate retains validation and legacy modules still imported by active routes', () => {
  for (const file of ['validations/customer.ts', '_legacy-dashboard/dashboard/inventory/brands/enhanced-columns.tsx', '_legacy-dashboard/dashboard/inventory/categories/enhanced-columns.tsx']) assert.equal(included(file), true, file);
  for (const file of ['validations/.env', '_legacy-dashboard/private.key']) assert.equal(included(file), false, file);
});
