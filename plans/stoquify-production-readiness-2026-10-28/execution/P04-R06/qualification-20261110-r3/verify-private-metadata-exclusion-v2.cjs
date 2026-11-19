'use strict';
// Read accepted metadata and actual build traces only. Never open referenced files.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normal = value => String(value).replaceAll('\\', '/').toLowerCase();
const sha = value => assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'Expected SHA256 provenance');
const object = value => assert(value && typeof value === 'object' && !Array.isArray(value), 'Expected metadata object');
const keys = (value, expected) => { object(value); assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'Unexpected metadata fields'); };
const string = value => assert(typeof value === 'string' && value.length > 0 && !/[\r\n\0]/.test(value), 'Expected bounded metadata string');
const absolute = value => typeof value === 'string' && (path.win32.isAbsolute(value) || path.posix.isAbsolute(value));
function canonical(value) { return normal(/^[a-z]:[\\/]/i.test(value) || value.startsWith('\\\\') ? path.win32.normalize(value) : path.posix.normalize(value.replaceAll('\\', '/'))).replace(/\/$/, ''); }
function within(value, root) { const v = canonical(value), r = canonical(root); return v === r || v.startsWith(r + '/'); }
function metadataFile(candidate, relative) {
  assert(typeof relative === 'string' && relative.startsWith('docs/') && !relative.includes('\\') && !relative.includes(':') && !relative.split('/').some(part => ['..', '.', ''].includes(part)), 'Canonical slash-only docs policy path required');
  const base = fs.realpathSync(candidate), docs = path.join(base, 'docs'), resolved = path.resolve(base, relative);
  assert(resolved.startsWith(docs + path.sep), 'Metadata path leaves candidate/docs');
  const real = fs.realpathSync(resolved); assert(real.startsWith(docs + path.sep), 'Metadata real path leaves candidate/docs');
  assert(fs.statSync(real).isFile(), 'Metadata must be a regular file'); return real;
}
function fixtureReferences(metadata) {
  keys(metadata, ['path', 'sha256', 'bytes', 'packs']);
  function entry(row, allowKind) {
    keys(row, allowKind && Object.hasOwn(row, 'kind') ? ['path', 'sha256', 'bytes', 'kind'] : ['path', 'sha256', 'bytes']);
    assert(absolute(row.path), 'Fixture reference must be absolute'); sha(row.sha256);
    assert(Number.isSafeInteger(row.bytes) && row.bytes >= 0);
    if (Object.hasOwn(row, 'kind')) assert(['first', 'final'].includes(row.kind), 'Unexpected fixture pack kind');
  }
  entry({ path: metadata.path, sha256: metadata.sha256, bytes: metadata.bytes }, false);
  assert(Array.isArray(metadata.packs) && metadata.packs.length > 0);
  for (const pack of metadata.packs) entry(pack, true);
  return { hashes: [metadata.sha256, ...metadata.packs.map(row => row.sha256)], paths: [metadata.path, ...metadata.packs.map(row => row.path)] };
}
const clientNames = new Set(['client.d.ts', 'client.js', 'default.d.ts', 'default.js', 'edge.d.ts', 'edge.js', 'index-browser.js', 'index.d.ts', 'index.js', 'package.json', 'query_engine-windows.dll.node', 'query_engine_bg.js', 'query_engine_bg.wasm', 'runtime/edge-esm.js', 'runtime/edge.js', 'runtime/index-browser.d.ts', 'runtime/index-browser.js', 'runtime/library.d.ts', 'runtime/library.js', 'runtime/react-native.js', 'runtime/wasm-compiler-edge.js', 'runtime/wasm-engine-edge.js', 'schema.prisma', 'wasm-edge-light-loader.mjs', 'wasm-worker-loader.mjs', 'wasm.d.ts', 'wasm.js']);
function clientInventory(rows, shared) {
  assert(Array.isArray(rows) && rows.length > 0);
  for (const row of rows) {
    keys(row, ['path', 'sha256', 'bytes']); string(row.path); sha(row.sha256); assert(Number.isSafeInteger(row.bytes) && row.bytes >= 0);
    if (shared) {
      const value = normal(row.path), marker = '/node_modules/.prisma/client/';
      assert(absolute(row.path) && value.includes(marker), 'Expected shared Prisma code provenance');
      const name = value.slice(value.indexOf(marker) + marker.length);
      assert(clientNames.has(name) || /^query_engine-windows\.dll\.node\.tmp\d+$/.test(name), 'Unexpected shared client file');
    } else assert(clientNames.has(row.path), 'Unexpected generated client file');
  }
}
function inputs(rows) {
  assert(Array.isArray(rows));
  const expected = ['prisma.config.ts', 'prisma/schema.prisma', 'package.json', 'package-lock.json', 'scripts/local-gates-network.cjs'];
  assert.deepEqual(rows.map(row => row.path).sort(), expected.sort(), 'Unexpected client source inputs');
  for (const row of rows) { keys(row, ['path', 'sha256']); sha(row.sha256); }
}
function clientRoots(metadata) {
  object(metadata); const result = Object.hasOwn(metadata, 'clientFiles');
  if (result) {
    keys(metadata, ['passed', 'generatedAt', 'directory', 'evidenceDirectory', 'client', 'sourceSchemaSha256', 'privateSchemaSha256', 'clientIndexSha256', 'clientSchemaSha256', 'clientTypesSha256', 'schemaTokensSha256', 'schemaTokenHelperSha256', 'sharedClientUnchanged', 'sharedClientBefore', 'clientFiles', 'inputs', 'runnerSha256', 'databaseOrApplicationStarted', 'rootGeneration', 'validations', 'normalization']);
    for (const key of ['passed', 'sharedClientUnchanged', 'databaseOrApplicationStarted', 'rootGeneration']) assert.equal(typeof metadata[key], 'boolean');
    for (const key of ['generatedAt', 'evidenceDirectory', 'normalization']) string(metadata[key]);
    for (const key of ['sourceSchemaSha256', 'privateSchemaSha256', 'clientIndexSha256', 'clientSchemaSha256', 'clientTypesSha256', 'schemaTokensSha256', 'schemaTokenHelperSha256', 'runnerSha256']) sha(metadata[key]);
    assert(absolute(metadata.directory) && absolute(metadata.client) && within(metadata.client, metadata.directory), 'Private client path must be under its recorded root');
    clientInventory(metadata.clientFiles, false);
    assert(Array.isArray(metadata.validations) && metadata.validations.length === 2);
    for (const row of metadata.validations) {
      keys(row, ['command', 'began', 'ended', 'exitCode', 'error']); assert(['validate', 'generate'].includes(row.command)); string(row.began); string(row.ended); assert(Number.isInteger(row.exitCode)); assert.equal(row.error, null, 'Unexpected validation error payload');
    }
  } else {
    keys(metadata, ['directory', 'context', 'orm', 'inputs', 'runnerSha256', 'sourceSchemaSha256', 'privateSchemaSha256', 'sharedClientBefore', 'nativeBinding', 'engines', 'environmentVariableNames', 'target', 'commands']);
    assert(absolute(metadata.directory));
    for (const key of ['context', 'orm']) assert(absolute(metadata[key]) && within(metadata[key], metadata.directory), 'Private context path must be under recorded root');
    for (const key of ['runnerSha256', 'sourceSchemaSha256', 'privateSchemaSha256']) sha(metadata[key]);
    function dependency(row) { keys(row, ['path', 'sha256']); assert(absolute(row.path) && normal(row.path).includes('/node_modules/'), 'Expected executable dependency provenance'); sha(row.sha256); }
    dependency(metadata.nativeBinding); assert(Array.isArray(metadata.engines) && metadata.engines.length === 2); metadata.engines.forEach(dependency);
    assert(Array.isArray(metadata.environmentVariableNames) && metadata.environmentVariableNames.length > 0);
    for (const name of metadata.environmentVariableNames) { string(name); assert(!name.includes('='), 'Environment values are not admitted metadata'); }
    string(metadata.target); assert(Array.isArray(metadata.commands) && metadata.commands.length === 2);
    for (const command of metadata.commands) {
      keys(command, ['executable', 'args', 'cwd']); assert(absolute(command.executable) && normal(command.executable).endsWith('/node.exe'));
      assert(absolute(command.cwd) && within(command.cwd, metadata.directory), 'Command cwd must stay under private root');
      assert(Array.isArray(command.args) && command.args.length === 4);
      assert(absolute(command.args[0]) && normal(command.args[0]).endsWith('/node_modules/prisma/build/index.js'));
      assert(['validate', 'generate'].includes(command.args[1]) && command.args[2] === '--schema');
      assert(absolute(command.args[3]) && within(command.args[3], metadata.directory), 'Schema argument must stay under private root');
    }
  }
  inputs(metadata.inputs); clientInventory(metadata.sharedClientBefore, true);
  // These hashes describe public code/tool provenance. Only the document and its
  // external private root are excluded; no listed code hash becomes a secret.
  return [metadata.directory];
}
function verifyPrivateMetadataExclusion(candidate, manifest, policy) {
  assert(Array.isArray(policy) && policy.length > 0); assert(manifest && Array.isArray(manifest.files));
  const forbiddenHashes = new Set(), references = [], seen = new Set();
  for (const item of policy) {
    keys(item, ['path', 'sha256', 'kind', 'referencePolicy']); sha(item.sha256); assert(!seen.has(item.path), 'Duplicate metadata policy row'); seen.add(item.path);
    const bytes = fs.readFileSync(metadataFile(candidate, item.path)); assert.equal(hash(bytes), item.sha256, 'Metadata source hash changed');
    forbiddenHashes.add(item.sha256); const metadata = JSON.parse(bytes);
    let fixture = { hashes: [], paths: [] }, roots = [];
    if (item.kind === 'fixture-data') { assert.equal(item.referencePolicy, 'private-fixture-and-pack-content'); fixture = fixtureReferences(metadata); }
    else { assert.equal(item.kind, 'client-build-metadata', 'Unknown metadata policy kind'); assert.equal(item.referencePolicy, 'metadata-document-only'); roots = clientRoots(metadata); }
    fixture.hashes.forEach(value => forbiddenHashes.add(value));
    references.push({ source: item.path, sha256: item.sha256, kind: item.kind, referencePolicy: item.referencePolicy, fixturePaths: fixture.paths, fixtureBasenames: fixture.paths.map(value => normal(value).split('/').pop()), roots });
  }
  function pathCheck(value, traceFile) {
    string(value); assert(!value.includes('://'), 'Trace/output paths must be filesystem paths'); const normalized = normal(value);
    for (const row of references) {
      assert(!normalized.includes(normal(row.source)) && normalized.split('/').pop() !== normal(row.source).split('/').pop(), 'Private metadata path entered output or trace');
      for (const name of row.fixtureBasenames) assert.notEqual(normalized.split('/').pop(), name, 'Private fixture reference entered output or trace');
      for (const root of row.roots) {
        const literal = canonical(root);
        assert(!normalized.includes(literal + '/') && normalized !== literal, 'Private client root entered output or trace');
        if (traceFile) {
          const resolved = /^[a-z]:[\\/]/i.test(root) || root.startsWith('\\\\') ? path.win32.resolve(path.dirname(traceFile), value) : path.posix.resolve(normal(path.dirname(traceFile)), normal(value));
          assert(!within(resolved, root), 'Resolved private client root entered build trace');
        }
      }
    }
  }
  for (const file of manifest.files) { sha(file.sha256); assert(!forbiddenHashes.has(file.sha256), 'Private metadata or fixture content entered sealed output'); pathCheck(file.path); }
  let traceFiles = 0;
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name); assert(!entry.isSymbolicLink(), 'Unexpected trace-tree link');
      if (entry.isDirectory()) inspect(file);
      else if (entry.isFile() && entry.name.endsWith('.nft.json')) { traceFiles++; const trace = JSON.parse(fs.readFileSync(file)); assert(Array.isArray(trace.files)); for (const traced of trace.files) pathCheck(traced, file); }
    }
  }
  inspect(path.join(candidate, '.next')); assert(traceFiles > 0, 'Actual build trace evidence is required');
  return { passed: true, metadataFiles: references.map(row => ({ path: row.source, sha256: row.sha256, kind: row.kind, referencePolicy: row.referencePolicy, privateFixtureReferenceCount: row.fixturePaths.length, privateClientRootCount: row.roots.length })),
    forbiddenContentHashesChecked: forbiddenHashes.size, sealedFilesChecked: manifest.files.length, traceFilesChecked: traceFiles,
    externalReferencedFilesRead: false, privateSourceMetadataPreserved: true, metadataDocumentsExcluded: true, privateFixtureDataExcluded: true,
    privateClientRootReferencesExcludedFromTraces: true, publicCodeProvenanceHashesNotClassifiedAsPrivate: true,
    scope: 'Exact metadata/fixture whole-file digests, metadata/fixture paths and client-root trace references; no embedded-substring content or unrelated client qualification claim' };
}
module.exports = { verifyPrivateMetadataExclusion };
