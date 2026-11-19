'use strict';
// Synthetic temporary files plus hash-bound metadata JSON only. No application,
// database, generated-client import, build, or external reference-file access.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict'), test = require('node:test');
const { verifyPrivateMetadataExclusion } = require('./verify-private-metadata-exclusion-v2.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const publicCode = hash('synthetic required public Prisma code');
const inputs = ['prisma.config.ts', 'prisma/schema.prisma', 'package.json', 'package-lock.json', 'scripts/local-gates-network.cjs'].map(name => ({ path: name, sha256: publicCode }));
const codeRow = name => ({ path: name, sha256: publicCode, bytes: 10 });
function clientResult(root) {
  return { passed: true, generatedAt: '2026-11-10T19:00:00.000Z', directory: root, evidenceDirectory: 'E:/project/docs/evidence', client: root + '/client',
    sourceSchemaSha256: publicCode, privateSchemaSha256: publicCode, clientIndexSha256: publicCode, clientSchemaSha256: publicCode, clientTypesSha256: publicCode,
    schemaTokensSha256: publicCode, schemaTokenHelperSha256: publicCode, sharedClientUnchanged: true,
    sharedClientBefore: [codeRow('E:/project/node_modules/.prisma/client/index.js')], clientFiles: [codeRow('index.js')], inputs, runnerSha256: publicCode,
    databaseOrApplicationStarted: false, rootGeneration: false,
    validations: ['validate', 'generate'].map(command => ({ command, began: '2026-11-10T19:00:00.000Z', ended: '2026-11-10T19:00:01.000Z', exitCode: 0, error: null })),
    normalization: 'Source schema formatting normalization recorded as provenance.' };
}
function clientContext(root) {
  return { directory: root, context: root + '/context', orm: root + '/orm', inputs, runnerSha256: publicCode, sourceSchemaSha256: publicCode, privateSchemaSha256: publicCode,
    sharedClientBefore: [codeRow('E:/project/node_modules/.prisma/client/index.js')],
    nativeBinding: { path: 'E:/project/node_modules/@next/swc/native.node', sha256: publicCode },
    engines: ['query-engine.exe', 'schema-engine.exe'].map(name => ({ path: 'E:/project/node_modules/@prisma/engines/' + name, sha256: publicCode })),
    environmentVariableNames: ['PATH', 'CommonProgramFiles(x86)'], target: 'Disposable client generation only',
    commands: ['validate', 'generate'].map(command => ({ executable: 'C:/Program Files/nodejs/node.exe', args: ['E:/project/node_modules/prisma/build/index.js', command, '--schema', root + '/context/schema.prisma'], cwd: root + '/context' })) };
}
function fixture(fn) {
  const base = fs.realpathSync(os.tmpdir()), directory = fs.mkdtempSync(path.join(base, 'p04-r06-r3-metadata-v2-'));
  try {
    fs.mkdirSync(path.join(directory, 'docs/evidence'), { recursive: true }); fs.mkdirSync(path.join(directory, '.next/server'), { recursive: true });
    const trace = path.join(directory, '.next/server/app.nft.json'); fs.writeFileSync(trace, JSON.stringify({ version: 1, files: ['safe-module.js'] }));
    const policy = [], manifest = { files: [{ path: 'runtime/server.js', sha256: hash('safe runtime') }] };
    function add(name, metadata, kind) {
      const relative = 'docs/evidence/' + name, bytes = Buffer.from(JSON.stringify(metadata)); fs.writeFileSync(path.join(directory, relative), bytes);
      const row = { path: relative, sha256: hash(bytes), kind, referencePolicy: kind === 'fixture-data' ? 'private-fixture-and-pack-content' : 'metadata-document-only' }; policy.push(row); return row;
    }
    const privateData = { path: 'Z:/nonexistent-never-read/fixture-secret.json', sha256: hash('synthetic private fixture'), bytes: 25,
      packs: [{ path: 'Z:/nonexistent-never-read/pack-secret.bin', sha256: hash('synthetic private pack'), bytes: 22, kind: 'first' }] };
    const dataRow = add('pg-PRIVATE_FIXTURE.json', privateData, 'fixture-data');
    const root = path.join(base, 'never-read-client-root-' + path.basename(directory));
    const result = clientResult(root), resultRow = add('pg-CLIENT_RESULT.json', result, 'client-build-metadata');
    const context = clientContext(root), contextRow = add('pg-CLIENT_CONTEXT.json', context, 'client-build-metadata');
    function rewrite(row, value) { const bytes = Buffer.from(JSON.stringify(value)); fs.writeFileSync(path.join(directory, row.path), bytes); row.sha256 = hash(bytes); }
    fn({ directory, trace, policy, manifest, add, privateData, dataRow, root, result, resultRow, context, contextRow, rewrite });
  } finally {
    assert.equal(fs.realpathSync(directory), directory); assert.equal(path.dirname(directory), base); assert(path.basename(directory).startsWith('p04-r06-r3-metadata-v2-'));
    fs.rmSync(directory, { recursive: true });
  }
}
const run = f => verifyPrivateMetadataExclusion(f.directory, f.manifest, f.policy);
test('typed fixture and client documents pass with no external references opened', () => fixture(f => { const r = run(f); assert(r.passed); assert.equal(r.externalReferencedFilesRead, false); assert.equal(r.metadataFiles.length, 3); assert.equal(r.traceFilesChecked, 1); }));
test('required public code digest and generic generated basename remain eligible', () => fixture(f => { f.manifest.files.push({ path: 'runtime/node_modules/.prisma/client/index.js', sha256: publicCode }); fs.writeFileSync(f.trace, JSON.stringify({ files: ['../../node_modules/.prisma/client/index.js'] })); assert(run(f).passed); }));
test('renamed fixture content remains denied', () => fixture(f => { f.manifest.files.push({ path: 'runtime/renamed.bin', sha256: f.privateData.sha256 }); assert.throws(() => run(f), /fixture content/); }));
test('renamed pack content remains denied', () => fixture(f => { f.manifest.files.push({ path: 'runtime/renamed.bin', sha256: f.privateData.packs[0].sha256 }); assert.throws(() => run(f), /fixture content/); }));
test('private fixture filename in actual trace remains denied', () => fixture(f => { fs.writeFileSync(f.trace, JSON.stringify({ files: ['../../elsewhere/pack-secret.bin'] })); assert.throws(() => run(f), /Private fixture reference/); }));
test('renamed client metadata document bytes remain denied', () => fixture(f => { f.manifest.files.push({ path: 'runtime/public/renamed.json', sha256: f.resultRow.sha256 }); assert.throws(() => run(f), /metadata or fixture content/); }));
test('client metadata basename in output remains denied', () => fixture(f => { f.manifest.files.push({ path: 'runtime/private/pg-CLIENT_CONTEXT.json', sha256: hash('different bytes') }); assert.throws(() => run(f), /Private metadata path/); }));
test('absolute private client root in trace is denied', () => fixture(f => { fs.writeFileSync(f.trace, JSON.stringify({ files: [f.root + '/client/index.js'] })); assert.throws(() => run(f), /Private client root/); }));
test('relative trace resolving to private client root is denied', () => fixture(f => { fs.writeFileSync(f.trace, JSON.stringify({ files: [path.relative(path.dirname(f.trace), path.join(f.root, 'client/index.js'))] })); assert.throws(() => run(f), /private client root/i); }));
test('normalized dot segments cannot hide a private client trace', () => fixture(f => { fs.writeFileSync(f.trace, JSON.stringify({ files: [f.root + '/../' + path.basename(f.root) + '/client/index.js'] })); assert.throws(() => run(f), /private client root/i); }));
test('different root with a common prefix remains eligible', () => fixture(f => { fs.writeFileSync(f.trace, JSON.stringify({ files: [f.root + '-different/client/index.js'] })); assert(run(f).passed); }));
test('private provenance path in sealed manifest is denied', () => fixture(f => { f.manifest.files.push({ path: 'runtime/' + f.root.replaceAll('\\', '/') + '/client/index.js', sha256: publicCode }); assert.throws(() => run(f), /Private client root/); }));
test('unknown metadata kind is not silently allowed', () => fixture(f => { f.resultRow.kind = 'public'; assert.throws(() => run(f), /Unknown metadata policy kind/); }));
test('fixture cannot opt into document-only policy', () => fixture(f => { f.dataRow.referencePolicy = 'metadata-document-only'; assert.throws(() => run(f)); }));
test('fixture payload cannot masquerade as client metadata', () => fixture(f => { f.dataRow.kind = 'client-build-metadata'; f.dataRow.referencePolicy = 'metadata-document-only'; assert.throws(() => run(f), /Unexpected metadata fields/); }));
test('unexpected credential field in client metadata fails closed', () => fixture(f => { f.result.password = 'synthetic-denied-value'; f.rewrite(f.resultRow, f.result); assert.throws(() => run(f), /Unexpected metadata fields/); }));
test('environment values are rejected in context metadata', () => fixture(f => { f.context.environmentVariableNames.push('PASSWORD=synthetic'); f.rewrite(f.contextRow, f.context); assert.throws(() => run(f), /Environment values/); }));
test('command schema argument cannot point outside private root', () => fixture(f => { f.context.commands[0].args[3] = 'Z:/unrelated/schema.prisma'; f.rewrite(f.contextRow, f.context); assert.throws(() => run(f), /Schema argument/); }));
test('unknown generated payload is not classified as public code', () => fixture(f => { f.result.clientFiles.push(codeRow('customer-export.csv')); f.rewrite(f.resultRow, f.result); assert.throws(() => run(f), /Unexpected generated client file/); }));
test('hash drift rejects altered metadata', () => fixture(f => { fs.appendFileSync(path.join(f.directory, f.resultRow.path), ' '); assert.throws(() => run(f), /Metadata source hash changed/); }));
test('policy traversal is denied before reading outside candidate', () => fixture(f => { f.resultRow.path = 'docs/..\\..\\outside.json'; assert.throws(() => run(f), /Canonical slash-only docs/); }));
test('duplicate metadata policy is denied', () => fixture(f => { f.policy.push(f.resultRow); assert.throws(() => run(f), /Duplicate metadata policy/); }));
test('missing actual build traces cannot pass', () => fixture(f => { fs.unlinkSync(f.trace); assert.throws(() => run(f), /Actual build trace/); }));
test('the seven admitted real metadata shapes work with synthetic allowed code only', () => fixture(f => {
  const root = path.resolve(__dirname, '../../../../..');
  const dispositionPath = path.join(__dirname, 'inventory/resume-20261110-r2/PRIVATE-METADATA-DISPOSITION.json');
  const bytes = fs.readFileSync(dispositionPath); assert.equal(hash(bytes), 'fe5a21ce44f5f2910783d816824c56de3dd6ad809646e66dfef6b9ef76709abb');
  const disposition = JSON.parse(bytes); assert.equal(disposition.files.length, 7); f.policy.length = 0;
  for (const row of disposition.files) {
    const source = path.resolve(root, row.path); assert(source.startsWith(path.join(root, 'docs') + path.sep));
    const metadata = fs.readFileSync(source); assert.equal(hash(metadata), row.sha256); const destination = path.join(f.directory, row.path);
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, metadata);
    f.policy.push({ path: row.path, sha256: row.sha256, kind: row.kind, referencePolicy: row.referencePolicy });
    if (row.kind === 'client-build-metadata') { const parsed = JSON.parse(metadata); f.manifest.files.push({ path: 'runtime/code/' + f.manifest.files.length + '/schema.prisma', sha256: parsed.sourceSchemaSha256 }); }
  }
  const result = run(f); assert.equal(result.metadataFiles.length, 7); assert.equal(result.externalReferencedFilesRead, false);
}));
