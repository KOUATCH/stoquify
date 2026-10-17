'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const runner = require('./run-linux-verification.cjs');
const fixtureRoot = fs.mkdtempSync(path.join(__dirname, '.guard-fixtures-'));
let index = 0;
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
function fixture() { const dir = path.join(fixtureRoot, String(++index)); fs.mkdirSync(dir); return dir; }
function write(dir, name, contents = '') {
  const file = path.join(dir, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, contents); return file;
}
function manifest(root, files) {
  return write(fixture(), 'manifest.json', JSON.stringify({ status: 'FROZEN_SOURCE_CANDIDATE', files,
    candidateId: hash(JSON.stringify(files)) }));
}

test('runtime guard rejects Windows, other platforms and non-20 Node before execution', () => {
  assert.throws(() => runner.guardRuntime('win32', '20.18.0'), /Linux is required/);
  assert.throws(() => runner.guardRuntime('darwin', '20.18.0'), /Linux is required/);
  assert.throws(() => runner.guardRuntime('linux', '22.0.0'), /Node.js major 20/);
  assert.doesNotThrow(() => runner.guardRuntime('linux', '20.18.0'));
});

test('real Windows entry point refuses before filesystem creation or command execution', { skip: process.platform !== 'win32' }, () => {
  const evidence = path.join(fixtureRoot, 'must-not-exist');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'run-linux-verification.cjs'),
    '--candidate', path.join(fixtureRoot, 'missing-candidate'), '--manifest', path.join(fixtureRoot, 'missing-manifest'),
    '--evidence', evidence], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Linux is required/);
  assert.equal(result.stdout, ''); assert.equal(fs.existsSync(evidence), false);
});

test('CLI requires explicit manifest and rejects ambiguous options', () => {
  assert.deepEqual(runner.parseArgs(['--candidate', '/a', '--manifest', '/m', '--evidence', '/b']), { candidate: '/a', manifest: '/m', evidence: '/b' });
  for (const args of [[], ['--candidate', '/a', '--evidence', '/b'], ['--candidate', '/a', '--candidate', '/b'],
    ['--candidate', '--evidence'], ['--allow-windows', 'true'], ['--timeout-ms', '0']]) assert.throws(() => runner.parseArgs(args));
});

test('evidence path cannot overlap candidate or overwrite existing evidence', () => {
  const candidate = fs.realpathSync(fixture());
  const sidecar = write(fixture(), 'manifest.json', '{}');
  assert.throws(() => runner.resolvePaths({ candidate, manifest: sidecar, evidence: path.join(candidate, 'evidence') }), /outside the candidate/);
  assert.throws(() => runner.resolvePaths({ candidate, manifest: sidecar, evidence: fixtureRoot }), /outside the candidate/);
  assert.throws(() => runner.resolvePaths({ candidate, manifest: sidecar, evidence: fixture() }), /must not already exist/);
  const output = path.join(fs.realpathSync(fixtureRoot), 'new-evidence');
  assert.equal(runner.resolvePaths({ candidate, manifest: sidecar, evidence: output }).evidence, output);
});

test('environment discards inherited credentials, database aliases and startup injection', () => {
  const sentinels = { GITHUB_TOKEN: 'not-a-real-secret', DATABASE_URL: 'postgresql://unsafe.example/live',
    NODE_OPTIONS: '--require /unsafe', NODE_PATH: '/unsafe', NPM_TOKEN: 'not-a-real-secret' };
  const prior = Object.fromEntries(Object.keys(sentinels).map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, sentinels);
    const env = runner.cleanEnvironment('/evidence', 'test');
    for (const key of ['GITHUB_TOKEN', 'NODE_OPTIONS', 'NODE_PATH', 'NPM_TOKEN', 'HOME', 'CODEX_HOME']) assert.equal(env[key], undefined);
    for (const [key, value] of Object.entries(env)) if (key !== 'PGDATABASE' && /DATABASE|POSTGRES|DIRECT_URL|SHADOW/.test(key)) {
      const url = new URL(value); assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '1');
    }
    assert.equal(env.PGHOST, '127.0.0.1'); assert.equal(env.PGPORT, '1');
    assert.equal(env.npm_config_userconfig, path.join('/evidence', 'empty-user.npmrc'));
  } finally {
    for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test('full candidate inventory includes assets, nested extensionless files and newly added paths', () => {
  const root = fixture(); write(root, 'public/font.woff2', 'font'); write(root, 'custom/source', 'data');
  const before = runner.sourceHashes(root);
  write(root, 'new/file.bin', 'new'); fs.unlinkSync(path.join(root, 'custom/source'));
  assert.deepEqual(runner.changedFiles(before, runner.sourceHashes(root)), ['custom/source', 'new/file.bin']);
  write(root, 'node_modules/generated.txt', 'generated'); write(root, `${runner.DIST}/BUILD_ID`, 'id'); write(root, 'tsconfig.tsbuildinfo', 'cache');
  assert.deepEqual(runner.changedFiles(before, runner.sourceHashes(root, true)), ['custom/source', 'new/file.bin']);
  write(root, '.next-unowned/file', 'unowned');
  assert.ok(runner.changedFiles(before, runner.sourceHashes(root, true)).includes('.next-unowned/file'));
});

test('manifest binding accepts exact files and rejects changes, additions, missing files and invalid identity', () => {
  const root = fixture(); write(root, 'source.ts', 'data');
  const files = [{ path: 'source.ts', bytes: 4, sha256: hash('data') }];
  const sidecar = manifest(root, files);
  assert.equal(runner.bindManifest(root, sidecar, runner.sourceHashes(root)).candidateId, hash(JSON.stringify(files)));
  write(root, 'extra', 'x'); assert.throws(() => runner.bindManifest(root, sidecar, runner.sourceHashes(root)), /missing\/extra\/changed/);
  fs.unlinkSync(path.join(root, 'extra')); write(root, 'source.ts', 'changed');
  assert.throws(() => runner.bindManifest(root, sidecar, runner.sourceHashes(root)), /differs/);
  fs.unlinkSync(path.join(root, 'source.ts')); assert.throws(() => runner.bindManifest(root, sidecar, runner.sourceHashes(root)), /differs/);
  write(root, 'source.ts', 'data');
  const invalid = JSON.parse(fs.readFileSync(sidecar)); invalid.candidateId = '0'.repeat(64); fs.writeFileSync(sidecar, JSON.stringify(invalid));
  assert.throws(() => runner.bindManifest(root, sidecar, runner.sourceHashes(root)), /candidateId/);
});

test('manifest rejects path traversal, duplicate entries, wrong byte size and generated input', () => {
  const root = fixture(); write(root, 'source', 'data');
  for (const files of [
    [{ path: '../outside', bytes: 4, sha256: hash('data') }],
    [{ path: 'source', bytes: 4, sha256: hash('data') }, { path: 'source', bytes: 4, sha256: hash('data') }],
    [{ path: 'source', bytes: 3, sha256: hash('data') }],
    [{ path: 'node_modules/source', bytes: 4, sha256: hash('data') }],
  ]) assert.throws(() => runner.bindManifest(root, manifest(root, files), runner.sourceHashes(root)));
});

test('preflight rejects dotenv, prior dependencies, npm configuration and root lifecycle hooks', () => {
  const root = fixture(); fs.mkdirSync(path.join(root, 'prisma'));
  write(root, '.env.production', 'placeholder'); assert.throws(() => runner.preflight(root), /dotenv/); fs.unlinkSync(path.join(root, '.env.production'));
  write(root, 'prisma/.env', 'placeholder'); assert.throws(() => runner.preflight(root), /dotenv/); fs.unlinkSync(path.join(root, 'prisma/.env'));
  write(root, 'node_modules/existing', 'x'); assert.throws(() => runner.preflight(root), /fresh candidate/);
  fs.unlinkSync(path.join(root, 'node_modules/existing')); fs.rmdirSync(path.join(root, 'node_modules'));
  write(root, '.npmrc', 'placeholder'); assert.throws(() => runner.preflight(root), /npmrc/); fs.unlinkSync(path.join(root, '.npmrc'));
  write(root, 'package.json', JSON.stringify({ scripts: { postinstall: 'unreviewed' } }));
  assert.throws(() => runner.preflight(root), /lifecycle/);
});

test('only the exact Next-generated config change can be restored', () => {
  const before = JSON.stringify({ compilerOptions: { strict: true }, include: ['**/*.ts'] });
  const generated = JSON.stringify({ compilerOptions: { strict: true }, include: ['**/*.ts', `${runner.DIST}/types/**/*.ts`] });
  assert.equal(runner.knownGeneratedChange('tsconfig.json', before, generated), true);
  assert.equal(runner.knownGeneratedChange('tsconfig.json', before, generated.replace('true', 'false')), false);
  assert.equal(runner.knownGeneratedChange('tsconfig.json', before, 'invalid'), false);
  assert.equal(runner.knownGeneratedChange('tsconfig.json', before, before), false);
  const reference = '/// <reference path="./.next-prior/types/routes.d.ts" />\r\n// Original\r\n';
  const next = reference.replace('.next-prior', runner.DIST).replaceAll('\r\n', '\n');
  assert.equal(runner.knownGeneratedChange('next-env.d.ts', reference, next), true);
  assert.equal(runner.knownGeneratedChange('next-env.d.ts', reference, next + '// Concurrent change\n'), false);
  const generatedStub = runner.NEXT_STUB.replace('\n\n', `\n/// <reference path="./${runner.DIST}/types/routes.d.ts" />\n\n`);
  assert.equal(runner.knownGeneratedChange('next-env.d.ts', runner.NEXT_STUB, generatedStub), true);
  assert.equal(runner.knownGeneratedChange('next-env.d.ts', runner.NEXT_STUB, generatedStub + '// Unknown\n'), false);
});

after(() => {
  // Remove only this test's unique, canonical, symlink-free directory under the owned runner directory.
  const root = fs.realpathSync(fixtureRoot), parent = fs.realpathSync(__dirname);
  assert.equal(path.dirname(root), parent); assert.match(path.basename(root), /^\.guard-fixtures-/);
  function check(directory) {
    for (const entry of fs.readdirSync(directory)) {
      const target = path.join(directory, entry), stat = fs.lstatSync(target);
      assert.equal(stat.isSymbolicLink(), false); assert.equal(runner.within(root, fs.realpathSync(target)), true);
      if (stat.isDirectory()) check(target);
    }
  }
  check(root); fs.rmSync(root, { recursive: true });
});
