// Reviewed schema-only validation/private generation. No DB lifecycle or app
// imports. Run only after root review; the existing shared client is preserved.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file)), read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv);
function noLinks(absolute) { let cursor = path.parse(path.resolve(absolute)).root; for (const part of path.resolve(absolute).slice(cursor.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); assert(!fs.lstatSync(cursor).isSymbolicLink(), 'Linked private input refused'); } }
function filesUnder(directory) { const files = []; for (const item of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.join(directory, item.name); assert(!item.isSymbolicLink()); if (item.isDirectory()) files.push(...filesUnder(file)); else { assert(item.isFile()); files.push(file); } } return files.sort(); }
function main() {
  assert.deepEqual(process.argv.slice(2), ['prepare']);
  const output = path.join(__dirname, 'pg-PRIVATE_CLIENT.json'); assert(!fs.existsSync(output), 'Existing private client receipt is preserved');
  const id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', 'close-integrity-client-20261110-' + id), evidence = path.join(__dirname, 'pg-client-' + id);
  fs.mkdirSync(directory); fs.mkdirSync(evidence); const context = path.join(directory, 'context'), orm = path.join(directory, 'orm'); fs.mkdirSync(context); fs.mkdirSync(orm); noLinks(directory);
  const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const inputs = ['prisma.config.ts', 'prisma/schema.prisma', 'package.json', 'package-lock.json', 'scripts/local-gates-network.cjs'].map(relative => {
    const input = path.join(root, relative), destination = path.join(context, relative); noLinks(input); const bytes = fs.readFileSync(input); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, bytes, { flag: 'wx' }); return { path: relative, sha256: hash(bytes) };
  });
  fs.mkdirSync(path.join(context, 'node_modules')); for (const name of ['prisma', 'pg', 'dotenv', '@prisma']) fs.symlinkSync(path.join(root, 'node_modules', name), path.join(context, 'node_modules', name), 'junction');
  assert(!fs.readdirSync(context).some(name => /^\.env(?:\.|$)/i.test(name))); assert(!fs.readdirSync(path.join(context, 'prisma')).some(name => /^\.env(?:\.|$)/i.test(name)));
  const original = fs.readFileSync(path.join(context, 'prisma/schema.prisma'), 'utf8'), generator = original.match(/generator client\s*\{[^}]*\}/); assert(generator && !/\boutput\s*=/.test(generator[0]));
  const privateSchema = original.replace(generator[0], generator[0].replace('{', '{\n  output = "./client"')); const privateSchemaFile = path.join(orm, 'schema.prisma'); fs.writeFileSync(privateSchemaFile, privateSchema, { flag: 'wx' });
  const nativeFile = path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09/CANDIDATE_NATIVE_READINESS.json'), native = read(nativeFile); assert(native.passed);
  assert.equal(read(path.join(root, 'node_modules/@prisma/engines/package.json')).version, '6.19.3');
  const engines = ['query_engine-windows.dll.node', 'schema-engine-windows.exe'].map(name => path.join(root, 'node_modules/@prisma/engines', name));
  for (const file of engines) { noLinks(file); assert.equal(digest(file), native.cachedEngineInputs.find(item => path.basename(item.destination) === path.basename(file))?.sha256); }
  const sharedDirectory = path.join(root, 'node_modules/.prisma/client'); noLinks(sharedDirectory);
  const sharedBefore = filesUnder(sharedDirectory).map(file => ({ path: file, sha256: digest(file), bytes: fs.statSync(file).size }));
  const disabled = 'postgresql://disabled_integrity_client@127.0.0.1:1/integrity_client_no_database?schema=public';
  const env = { ...osEnv, NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first --require ' + JSON.stringify(path.join(context, 'scripts/local-gates-network.cjs')), DATABASE_URL: disabled, DIRECT_URL: disabled, SHADOW_DATABASE_URL: disabled,
    PRISMA_GENERATE_SKIP_AUTOINSTALL: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1', PRISMA_QUERY_ENGINE_LIBRARY: engines[0], PRISMA_SCHEMA_ENGINE_BINARY: engines[1] };
  const cli = path.join(root, 'node_modules/prisma/build/index.js');
  write('pg-CLIENT_CONTEXT.json', { directory, context, orm, inputs, runnerSha256: digest(__filename), sourceSchemaSha256: hash(original), privateSchemaSha256: hash(privateSchema), sharedClientBefore: sharedBefore,
    nativeBinding: { path: nativeFile, sha256: digest(nativeFile) }, engines: engines.map(file => ({ path: file, sha256: digest(file) })), environmentVariableNames: Object.keys(env).sort(), target: 'Disabled loopback port1; no database may be contacted', commands: ['validate', 'generate'].map(command => ({ executable: process.execPath, args: [cli, command, '--schema', privateSchemaFile], cwd: context })) });
  let failure; const executions = [];
  try {
    for (const command of ['validate', 'generate']) {
      const args = [cli, command, '--schema', privateSchemaFile], began = new Date().toISOString();
      const result = spawnSync(process.execPath, args, { cwd: context, env, windowsHide: true, encoding: 'utf8', timeout: 300000, maxBuffer: 20e6 });
      fs.writeFileSync(path.join(evidence, 'pg-' + command + '.log'), String(result.stdout || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[DISABLED_DATABASE]') + String(result.stderr || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[DISABLED_DATABASE]'), { flag: 'wx' });
      const execution = { command, began, ended: new Date().toISOString(), exitCode: result.status, error: result.error?.code || null }; executions.push(execution); write('pg-' + command + '.execution.json', execution);
      assert(!result.error && result.status === 0, 'Private ' + command + ' failed; retained evidence available');
    }
    const client = path.join(orm, 'client'); assert.equal(read(path.join(client, 'package.json')).version, '6.19.3');
    const helper = path.join(root, 'scripts/ensure-prisma-client.js'), tokens = require(helper).schemaTokens, generated = fs.readFileSync(path.join(client, 'schema.prisma'), 'utf8'); assert.equal(tokens(privateSchema), tokens(generated), 'Generated schema-token identity changed');
    for (const item of inputs) assert.equal(digest(path.join(root, item.path)), item.sha256, 'Private client input changed');
    const sharedAfterFiles = filesUnder(sharedDirectory); assert.deepEqual(sharedAfterFiles, sharedBefore.map(item => item.path)); for (const item of sharedBefore) { assert.equal(digest(item.path), item.sha256, 'Shared client changed'); assert.equal(fs.statSync(item.path).size, item.bytes); }
    const clientFiles = filesUnder(client).map(file => ({ path: path.relative(client, file).replaceAll('\\', '/'), sha256: digest(file), bytes: fs.statSync(file).size }));
    const receipt = { passed: true, generatedAt: new Date().toISOString(), directory, evidenceDirectory: evidence, client, sourceSchemaSha256: hash(original), privateSchemaSha256: hash(privateSchema), clientIndexSha256: digest(path.join(client, 'index.js')), clientSchemaSha256: digest(path.join(client, 'schema.prisma')), clientTypesSha256: digest(path.join(client, 'index.d.ts')),
      schemaTokensSha256: hash(tokens(privateSchema)), schemaTokenHelperSha256: digest(helper), sharedClientUnchanged: true, sharedClientBefore: sharedBefore, clientFiles, inputs, runnerSha256: digest(__filename), databaseOrApplicationStarted: false, rootGeneration: false, validations: executions,
      normalization: 'Private generator output only; raw hashes retained separately, generated Prisma formatting checked with existing schemaTokens.' };
    write('pg-CLIENT_RESULT.json', receipt); fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ passed: true, client, sourceSchemaSha256: receipt.sourceSchemaSha256, rootGeneration: false, databaseOrApplicationStarted: false }));
  } catch (error) { failure = error; write('pg-CLIENT_RESULT.json', { passed: false, checkedAt: new Date().toISOString(), directory, evidenceDirectory: evidence, executions, failure: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[DISABLED_DATABASE]'), rootGeneration: false }); }
  if (failure) throw failure;
}
if (require.main === module) { try { main(); } catch (error) { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[DISABLED_DATABASE]')); process.exitCode = 1; } }
