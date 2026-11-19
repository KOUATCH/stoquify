// Byte-identical generated-client execution copies and owned canary proof.
// Originals/shared client are never edited. No DB connect/query or app import.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file)), read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv);
function noLinks(file) { let cursor = path.parse(path.resolve(file)).root; for (const part of path.resolve(file).slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); assert(!fs.lstatSync(cursor).isSymbolicLink()); } }
function files(directory) { const result = []; for (const item of fs.readdirSync(directory, { withFileTypes: true })) { assert(!item.isSymbolicLink()); const file = path.join(directory, item.name); if (item.isDirectory()) result.push(...files(file)); else { assert(item.isFile()); result.push(file); } } return result.sort(); }
function envPaths(client, owned) {
  const source = fs.readFileSync(path.join(client, 'index.js'), 'utf8'), match = source.match(/"relativeEnvPaths"\s*:\s*(\{[^}]*\})/); assert(match, 'Generated environment metadata unavailable');
  const metadata = JSON.parse(match[1]), result = [];
  for (const [name, value] of Object.entries(metadata)) if (value) { assert(typeof value === 'string'); const resolved = path.resolve(client, value); assert(resolved.startsWith(owned + path.sep), 'Generated environment path escaped owned context'); assert(!fs.existsSync(resolved), 'Owned environment path unexpectedly exists'); result.push({ name, relativePath: value, resolvedPath: resolved, existedBeforeImport: false }); }
  assert(result.length > 0); return result;
}
function main() {
  assert.deepEqual(process.argv.slice(2), ['prepare']); const output = path.join(__dirname, 'pg-EXECUTION_CLIENTS.json'); assert(!fs.existsSync(output), 'Existing execution-client receipt is preserved');
  const currentFile = path.join(__dirname, 'pg-PRIVATE_CLIENT.json'), oldFile = path.join(root, 'docs/stoquify-potential/development/close-production-prep-2026-11-09/pg-PRIVATE_CLIENT.json');
  const current = read(currentFile), old = read(oldFile); assert(current.passed && old.passed && current.rootGeneration === false && old.rootGeneration === false);
  const retentionFile = path.join(root, 'docs/stoquify-potential/development/close-production-prep-2026-11-09/pg-RETENTION_LATEST.json'), retention = read(retentionFile); assert(retention.passed && retention.ownedClusterStopped);
  const oldManifestFile = path.join(retention.evidenceDirectory, 'pg-ORM_PROVENANCE.json'), oldManifest = read(oldManifestFile); assert.equal(oldManifest.client, old.client); assert.equal(retention.privateClient, old.client);
  assert.equal(digest(path.join(old.client, 'index.js')), old.clientIndexSha256); assert.equal(digest(path.join(old.client, 'schema.prisma')), old.clientSchemaSha256);
  const runtimeFile = path.join(current.client, 'runtime/library.js'), runtime = fs.readFileSync(runtimeFile, 'utf8');
  assert(runtime.includes('e=n?.__internal?.configOverride?.(e)??e,sl(e)')); assert(runtime.includes('function hu(e){st(e,{conflictCheck:"warn"})}'));
  const id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', 'close-integrity-execution-clients-20261110-' + id), evidence = path.join(__dirname, 'pg-execution-clients-' + id); fs.mkdirSync(directory); fs.mkdirSync(evidence); noLinks(directory);
  const sources = { current: { receipt: currentFile, client: current.client, trustedManifest: currentFile, trustedFiles: current.clientFiles }, old: { receipt: oldFile, client: old.client, trustedManifest: oldManifestFile, trustedFiles: oldManifest.clientFiles } }, clients = {};
  for (const [name, source] of Object.entries(sources)) {
    const actualRuntime = fs.readFileSync(path.join(source.client, 'runtime/library.js'), 'utf8'); assert(actualRuntime.includes('e=n?.__internal?.configOverride?.(e)??e,sl(e)')); assert(actualRuntime.includes('function hu(e){st(e,{conflictCheck:"warn"})}'));
    noLinks(source.client); const originalFiles = files(source.client).map(file => ({ path: path.relative(source.client, file).replaceAll('\\', '/'), sha256: digest(file), bytes: fs.statSync(file).size }));
    assert.deepEqual(originalFiles.map(file => file.path).sort(), source.trustedFiles.map(file => file.path).sort(), 'Qualified generated-client file membership changed');
    for (const file of originalFiles) { const trusted = source.trustedFiles.find(item => item.path === file.path); assert.equal(file.sha256, trusted.sha256, 'Qualified generated-client bytes changed'); if (trusted.bytes !== undefined) assert.equal(file.bytes, trusted.bytes); }
    const client = path.join(directory, 'clients', name, 'orm', 'client'); fs.mkdirSync(client, { recursive: true });
    for (const item of originalFiles) { const destination = path.join(client, item.path); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, fs.readFileSync(path.join(source.client, item.path)), { flag: 'wx' }); assert.equal(digest(destination), item.sha256); }
    clients[name] = { originalClient: source.client, client, receipt: { path: source.receipt, sha256: digest(source.receipt) }, qualifiedInputManifest: { path: source.trustedManifest, sha256: digest(source.trustedManifest) }, files: originalFiles, environmentPaths: envPaths(client, directory), byteIdentical: true };
  }
  assert.equal(clients.current.environmentPaths[0].resolvedPath, path.join(directory, '.env')); assert.equal(clients.old.environmentPaths[0].resolvedPath, path.join(directory, '.env'));
  const canaryFile = path.join(directory, '.env'), canaryKey = 'STOQUIFY_PRIVATE_ENV_CANARY_' + id.toUpperCase(), canaryValue = 'synthetic-owned-canary-' + crypto.randomBytes(12).toString('hex');
  const probe = path.join(directory, 'canary-probe.cjs');
  fs.writeFileSync(probe, `const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),net=require('node:net');
const [clientPath,owned,envFile,key,value,mode]=process.argv.slice(2);assert(path.resolve(envFile)===path.join(path.resolve(owned),'.env'));let sockets=0;net.Socket.prototype.connect=function(){sockets++;throw Error('Canary probe refuses every network connection')};
assert(!(key in process.env));const {PrismaClient}=require(clientPath);const moduleLoadedCanary=process.env[key]===value;
(async()=>{let client;try{if(mode==='module-positive'){assert(moduleLoadedCanary)}else{assert.equal(moduleLoadedCanary,false);assert(!fs.existsSync(envFile));fs.writeFileSync(envFile,key+'='+value+'\\n',{flag:'wx'})}
client=new PrismaClient({datasources:{db:{url:'postgresql://canary_disabled@127.0.0.1:1/no_canary_database?schema=public'}},__internal:{configOverride:config=>({...config,relativeEnvPaths:{rootEnvPath:null,schemaEnvPath:null}})}});
if(mode==='constructor-negative')assert(!(key in process.env));assert.equal(sockets,0);await client.$disconnect();assert.equal(sockets,0);console.log(JSON.stringify({passed:true,mode,moduleLoadedOwnedCanary:moduleLoadedCanary,constructorCanaryAbsent:mode==='constructor-negative',databaseConnections:0}));}
finally{if(client)await client.$disconnect();if(mode==='constructor-negative'&&fs.existsSync(envFile))fs.unlinkSync(envFile)}})().catch(()=>{console.error('Owned canary proof failed');process.exitCode=1});
`, { flag: 'wx' });
  const results = [];
  try {
    for (const name of ['current', 'old']) for (const mode of ['module-positive', 'constructor-negative']) {
      assert(!fs.existsSync(canaryFile)); if (mode === 'module-positive') fs.writeFileSync(canaryFile, canaryKey + '=' + canaryValue + '\n', { flag: 'wx' });
      const run = spawnSync(process.execPath, [probe, clients[name].client, directory, canaryFile, canaryKey, canaryValue, mode], { cwd: directory, env: { ...osEnv, NODE_ENV: 'test', PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1' }, windowsHide: true, encoding: 'utf8', timeout: 30000 });
      fs.writeFileSync(path.join(evidence, name + '-' + mode + '.log'), (run.stdout || '') + (run.stderr || ''), { flag: 'wx' }); assert(!run.error && run.status === 0, 'Owned canary probe failed');
      const parsed = JSON.parse(run.stdout.trim()); assert(parsed.passed && parsed.databaseConnections === 0); results.push({ client: name, ...parsed });
      if (fs.existsSync(canaryFile)) fs.unlinkSync(canaryFile); assert(!fs.existsSync(canaryFile));
    }
  } finally { if (fs.existsSync(canaryFile)) fs.unlinkSync(canaryFile); }
  for (const client of Object.values(clients)) { envPaths(client.client, directory); for (const file of client.files) { assert.equal(digest(path.join(client.originalClient, file.path)), file.sha256); assert.equal(digest(path.join(client.client, file.path)), file.sha256); } }
  const report = { passed: true, checkedAt: new Date().toISOString(), directory, evidenceDirectory: evidence, clients, proofs: results, originalsUnchanged: true, generatedClientsEdited: false, databaseOrApplicationStarted: false,
    moduleImportIsolation: 'Byte-identical copies are nested so generated environment paths resolve inside the owned context, where environment files are absent at actual import.',
    constructorIsolation: 'Every actual verification constructor must set __internal.configOverride to null rootEnvPath/schemaEnvPath before Prisma constructor environment loading.',
    canaryRemoved: !fs.existsSync(canaryFile), runtimeSource: { path: runtimeFile, sha256: digest(runtimeFile) }, probe: { path: probe, sha256: digest(probe) }, runnerSha256: digest(__filename) };
  fs.writeFileSync(path.join(evidence, 'RESULT.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: true, executionClientReceipt: output, current: clients.current.client, old: clients.old.client, canaryRemoved: report.canaryRemoved, databaseOrApplicationStarted: false }));
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
