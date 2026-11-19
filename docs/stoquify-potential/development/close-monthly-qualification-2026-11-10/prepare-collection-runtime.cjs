// Preparation only: copies current source, reuses qualified dependencies and
// creates private loopback TLS files. No app, DB, credential or browser starts.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
function noLinks(file) { let current = path.parse(path.resolve(file)).root; for (const part of path.resolve(file).slice(current.length).split(path.sep).filter(Boolean)) { current = path.join(current, part); assert(!fs.lstatSync(current).isSymbolicLink()); } }
function main() {
  assert.deepEqual(process.argv.slice(2), ['prepare']);
  const output = path.join(__dirname, 'COLLECTION_RUNTIME_TARGET.json'); assert(!fs.existsSync(output), 'Existing preparation is preserved');
  const pgFile = path.join(__dirname, 'pg-LATEST.json'), pg = read(pgFile); assert(pg.passed && pg.ownedClusterStopped, 'Monthly PG qualification must pass and stop first');
  assert.match(pg.database, /^stoquify_replay_close_monthly_20261110_[a-f0-9]{10}$/);
  assert.equal(path.dirname(pg.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(pg.directory), /^close-monthly-20261110-[a-f0-9]{10}$/); noLinks(pg.directory);
  const fixtureReceiptFile = path.join(pg.evidenceDirectory, 'pg-PRIVATE_FIXTURE.json'), fixtureReceipt = read(fixtureReceiptFile);
  assert.equal(fixtureReceipt.path, path.join(pg.directory, 'private-documents/FIXTURE.json')); noLinks(fixtureReceipt.path); assert.equal(digest(fixtureReceipt.path), fixtureReceipt.sha256);
  const fixture = read(fixtureReceipt.path); assert(fixture.ui && fixture.ui.organizationId !== fixture.organizationId && fixture.ui.amount === '100.00' && fixture.ui.method === 'MOBILE_MONEY');
  const tested = read(path.join(pg.evidenceDirectory, 'pg-SOURCE_MANIFEST.json')); for (const file of tested.files) assert.equal(digest(path.join(root, file.path)), file.sha256, 'Qualified financial source changed');
  const previous = path.join(root, 'docs/stoquify-potential/development/close-production-prep-2026-11-09'), client = read(path.join(previous, 'pg-PRIVATE_CLIENT.json'));
  assert(client.passed && client.rootGeneration === false); assert.equal(pg.privateClient, client.client);
  assert.equal(digest(path.join(root, 'prisma/schema.prisma')), client.sourceSchemaSha256);
  assert.equal(digest(path.join(client.client, 'index.js')), client.clientIndexSha256); assert.equal(digest(path.join(client.client, 'schema.prisma')), client.clientSchemaSha256); noLinks(client.client);
  const dependencies = path.join(root, '.codex-tmp/close-release-20261109-9cf90a4714/candidate/node_modules'); noLinks(dependencies);
  assert.equal(digest(path.join(root, 'package-lock.json')), digest(path.join(path.dirname(dependencies), 'package-lock.json')));
  const id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', 'collection-app-20261110-' + id), candidate = path.join(directory, 'source'); fs.mkdirSync(directory);
  const capture = require(path.join(root, 'scripts/candidate-snapshot.cjs')), snapshot = capture.capture(root);
  snapshot.files = snapshot.files.filter(entry => !/^(docs|design-system|tests|__tests__|\.github)\//.test(entry.path));
  snapshot.scope = 'Current development application source; no environment files; explicit dependency reuse and private schema-only Prisma resolution. No production artifact.';
  capture.restore(snapshot, candidate); const files = snapshot.files.map(({ content, ...entry }) => entry);
  assert(!files.some(file => file.path.split('/').some(part => /^\.env(?:\.|$)/i.test(part))));
  const sourceManifest = path.join(directory, 'SOURCE_MANIFEST.json'); fs.writeFileSync(sourceManifest, JSON.stringify({ ...snapshot, files }, null, 2) + '\n', { flag: 'wx' });
  fs.symlinkSync(dependencies, path.join(candidate, 'node_modules'), 'junction');
  const preload = path.join(directory, 'runtime-preload.cjs'), network = path.join(candidate, 'scripts/local-gates-network.cjs');
  fs.writeFileSync(preload, `require(${JSON.stringify(network)});\nconst fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),Module=require('node:module');const client=${JSON.stringify(client.client)};assert.equal(crypto.createHash('sha256').update(fs.readFileSync(client+'/index.js')).digest('hex'),${JSON.stringify(client.clientIndexSha256)});const original=Module._resolveFilename;Module._resolveFilename=function(request,parent,isMain,options){return original.call(this,request==='@prisma/client'?client+'/index.js':request,parent,isMain,options)};\n`, { flag: 'wx' });
  const key = path.join(directory, 'localhost.key'), cert = path.join(directory, 'localhost.crt'), config = path.join(directory, 'openssl.cnf');
  fs.writeFileSync(config, '[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ext\n[dn]\nCN=127.0.0.1\n[ext]\nsubjectAltName=IP:127.0.0.1\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n', { flag: 'wx' });
  const tls = spawnSync('C:/Program Files/Git/mingw64/bin/openssl.exe', ['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '1', '-config', config, '-keyout', key, '-out', cert], { cwd: directory, env: osEnv, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  fs.writeFileSync(path.join(directory, 'tls-generation.log'), (tls.stdout || '') + (tls.stderr || ''), { flag: 'wx' }); assert.equal(tls.status, 0); fs.mkdirSync(path.join(directory, 'temp'));
  const record = { createdAt: new Date().toISOString(), directory, candidate, sourceManifest, sourceManifestSha256: hash(JSON.stringify(files)), sourceFiles: files.length,
    pgReceipt: { path: pgFile, sha256: digest(pgFile) }, fixtureReceipt: { path: fixtureReceiptFile, sha256: digest(fixtureReceiptFile) },
    dependencies, dependencyReuse: true, cleanInstall: false, lockSha256: digest(path.join(root, 'package-lock.json')),
    privateClient: client.client, privateClientIndexSha256: client.clientIndexSha256, privateClientSchemaSha256: client.clientSchemaSha256,
    preload, preloadSha256: digest(preload), networkPreload: network, networkPreloadSha256: digest(network),
    origin: 'https://127.0.0.1:43882', httpPort: 43881, tlsPort: 43882, key, cert, certificateSha256: digest(cert), runnerSha256: digest(__filename),
    classification: 'Preparation only; no application/database/credential/browser execution. Source-bound development runtime, reused dependencies/private Prisma override, not a production artifact.' };
  fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ prepared: true, sourceManifestSha256: record.sourceManifestSha256, sourceFiles: files.length, applicationStarted: false, databaseStarted: false }));
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
