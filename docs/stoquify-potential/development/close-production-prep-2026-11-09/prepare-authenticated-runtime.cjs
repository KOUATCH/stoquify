// Local-only source/runtime preparation. No server, database, migration, install,
// provider or delivery is started. Dependencies are explicitly reused read-only.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const digest = file => hash(fs.readFileSync(file)), read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, env);
function noLinks(file) { let cursor = path.parse(path.resolve(file)).root; for (const part of path.resolve(file).slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); assert(!fs.lstatSync(cursor).isSymbolicLink(), 'Unexpected linked input'); } }
assert.equal(process.argv.length, 2);
assert(!fs.existsSync(path.join(__dirname, 'AUTHENTICATED_RUNTIME_TARGET.json')), 'Existing target is preserved; review a distinct preparation before replacing it');
const oldCandidate = path.join(root, '.codex-tmp/close-release-20261109-9cf90a4714/candidate');
const client = read(path.join(__dirname, 'pg-PRIVATE_CLIENT.json')); assert(client.passed && client.rootGeneration === false);
assert.equal(digest(path.join(root, 'prisma/schema.prisma')), client.sourceSchemaSha256);
assert.equal(digest(path.join(client.client, 'index.js')), client.clientIndexSha256);
assert.equal(digest(path.join(client.client, 'schema.prisma')), client.clientSchemaSha256);
assert.equal(digest(path.join(root, 'package-lock.json')), digest(path.join(oldCandidate, 'package-lock.json')));
noLinks(oldCandidate); noLinks(client.client);
const id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', 'close-app-' + id), candidate = path.join(directory, 'source'); fs.mkdirSync(directory);
const capture = require(path.join(root, 'scripts/candidate-snapshot.cjs'));
const snapshot = capture.capture(root);
snapshot.files = snapshot.files.filter(entry => !/^(docs|design-system|tests|__tests__|\.github)\//.test(entry.path));
snapshot.scope = 'Current application source; no environment files. Explicit read-only reuse of previously qualified Windows dependencies and separately generated schema-bound Prisma client. Development runtime, not a production artifact.';
capture.restore(snapshot, candidate);
const files = snapshot.files.map(({ content, ...entry }) => entry);
fs.writeFileSync(path.join(directory, 'SOURCE_MANIFEST.json'), JSON.stringify({ ...snapshot, files }, null, 2) + '\n', { flag: 'wx' });
assert(!fs.readdirSync(candidate).some(name => name.startsWith('.env')));
fs.symlinkSync(path.join(oldCandidate, 'node_modules'), path.join(candidate, 'node_modules'), 'junction');
const preload = path.join(directory, 'private-prisma.cjs');
fs.writeFileSync(preload, `const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),Module=require('node:module');const client=${JSON.stringify(client.client)};assert.equal(crypto.createHash('sha256').update(fs.readFileSync(client+'/index.js')).digest('hex'),${JSON.stringify(client.clientIndexSha256)});const original=Module._resolveFilename;Module._resolveFilename=function(request,parent,isMain,options){return original.call(this,request==='@prisma/client'?client+'/index.js':request,parent,isMain,options)};\n`, { flag: 'wx' });
const openssl = 'C:/Program Files/Git/mingw64/bin/openssl.exe', tlsConfig = path.join(directory, 'openssl.cnf'), key = path.join(directory, 'localhost.key'), cert = path.join(directory, 'localhost.crt');
fs.writeFileSync(tlsConfig, '[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ext\n[dn]\nCN=127.0.0.1\n[ext]\nsubjectAltName=IP:127.0.0.1\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n', { flag: 'wx' });
const result = spawnSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '1', '-config', tlsConfig, '-keyout', key, '-out', cert], { cwd: directory, env, windowsHide: true, encoding: 'utf8', timeout: 30000 });
fs.writeFileSync(path.join(directory, 'tls-generation.log'), (result.stdout || '') + (result.stderr || ''), { flag: 'wx' }); assert.equal(result.status, 0);
fs.mkdirSync(path.join(directory, 'temp'));
const record = { createdAt: new Date().toISOString(), directory, candidate, sourceManifest: path.join(directory, 'SOURCE_MANIFEST.json'), sourceManifestSha256: hash(JSON.stringify(files)), sourceFiles: files.length,
  dependencies: path.join(oldCandidate, 'node_modules'), dependencyReuse: true, cleanInstall: false, lockSha256: digest(path.join(candidate, 'package-lock.json')),
  privateClient: client.client, privateClientSchemaSha256: client.clientSchemaSha256, privateClientIndexSha256: client.clientIndexSha256,
  preload, preloadSha256: digest(preload), networkPreload: path.join(candidate, 'scripts/local-gates-network.cjs'), networkPreloadSha256: digest(path.join(candidate, 'scripts/local-gates-network.cjs')),
  origin: 'https://127.0.0.1:43872', httpPort: 43871, tlsPort: 43872, key, cert, certificateSha256: digest(cert),
  runnerSha256: digest(__filename), evidenceClass: 'Application source/TLS preparation only; no DB or server started; developer runtime with explicit schema-only module-resolution override, not sealed artifact qualification.' };
fs.writeFileSync(path.join(__dirname, 'AUTHENTICATED_RUNTIME_TARGET.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ prepared: true, sourceFiles: record.sourceFiles, sourceManifestSha256: record.sourceManifestSha256, candidate, applicationStarted: false, databaseStarted: false }));
