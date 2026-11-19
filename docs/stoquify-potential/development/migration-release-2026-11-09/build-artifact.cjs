// Candidate-local native readiness and the unchanged full npm release pipeline.
// No deployment, migration, seed, application server, or live provider operation.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '../../../..');
const visualRoot = 'C:/Users/J COMPUTER/.codex/visualizations/2026/11/02/01a19e00-6435-7443-92d6-f2cf160728a8';
const bin = 'C:/Program Files/PostgreSQL/17/bin';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const osEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
function load() {
  const { target, manifest } = require('./candidate-validation.cjs').verifyCandidate();
  const selection = read('CLEAN_INSTALL_SELECTED.json');
  if (!/^CLEAN_INSTALL_RESULT(?:_ATTEMPT_2)?\.json$/.test(selection.result) || sha(fs.readFileSync(path.join(__dirname, selection.result))) !== selection.sha256) throw Error('Selected clean install receipt mismatch');
  const install = read(selection.result);
  if (!install.passed || !install.inputsUnchanged || !install.frozenSourceUnchanged || install.candidate !== target.candidate || install.versions.prisma !== '6.19.3' || install.versions['@prisma/client'] !== '6.19.3') throw Error('Qualified clean candidate installation required');
  const database = read('DATABASE_TARGET.json');
  if (path.dirname(database.directory) !== path.join(root, '.codex-tmp') || !/^sales-release-migrations-20261109-[a-f0-9]{10}$/.test(path.basename(database.directory))
    || database.clusterDirectory !== database.directory || database.host !== 'localhost' || database.user !== 'sales_release_fixture'
    || !/^stoquify_replay_20261109_[a-f0-9]{10}$/.test(database.freshDatabase) || !Number.isSafeInteger(database.port) || database.port < 1024 || database.port > 65535) throw Error('Unexpected owned fresh build database');
  const pkg = JSON.parse(fs.readFileSync(path.join(target.candidate, 'package.json'), 'utf8'));
  const scripts = { 'release:artifact': 'node scripts/release-artifact.cjs prepare', 'release:artifact:verify': 'node scripts/release-artifact.cjs verify',
    build: 'npm run release:secrets:preflight && npm run build:linted', 'build:linted': 'npm run lint && npm run build:app',
    lint: 'eslint app actions components config hooks lib services --ext .js,.jsx,.ts,.tsx', 'build:app': 'node scripts/build-app-safe.js',
    'release:secrets:preflight': 'node scripts/release-secret-preflight.js --mode fail --release auto --out what-next/release-secret-preflight.md --json-out what-next/release-secret-preflight.json' };
  for (const [name, expected] of Object.entries(scripts)) if (pkg.scripts[name] !== expected || pkg.scripts['pre' + name] || pkg.scripts['post' + name]) throw Error(`Review changed script or lifecycle hook: ${name}`);
  if (fs.readdirSync(target.candidate).some(name => name.startsWith('.env'))) throw Error('Environment file in isolated candidate');
  return { ...target, manifest, database, require: createRequire(path.join(target.candidate, 'package.json')) };
}
function privateConfig(record) {
  const file = path.join(record.directory, 'build-private/environment.private.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  const url = `postgresql://${record.database.user}@localhost:${record.database.port}/${record.database.freshDatabase}?schema=public`;
  for (const name of ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL']) if (config.environment[name] !== url) throw Error('Private build target differs from owned fresh database');
  if (config.candidate !== record.candidate || config.origin !== 'https://127.0.0.1:3443' || config.httpPort !== 3296 || config.cdpPort !== 9317) throw Error('Unexpected private runtime configuration');
  for (const name of ['NODE_ENV', 'CI_RELEASE', 'AQSTOQFLOW_RELEASE_MODE', 'VERCEL_ENV', 'NEXT_DIST_DIR']) if (name in config.environment) throw Error('Local compiler must retain existing non-release auto mode and default output');
  for (const name of ['STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS', 'STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS', 'STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS']) if (config.environment[name] !== '0') throw Error('Local qualification must keep live delivery disabled');
  for (const name of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) if (config.environment[name]) throw Error('Provider credentials forbidden in local build configuration');
  const expectedArtifact = path.join(fs.realpathSync(visualRoot), path.basename(record.directory) + '-artifact');
  if (config.artifact !== expectedArtifact) throw Error('Unexpected owned artifact destination');
  return { file, config };
}
function environment(record) {
  return { ...osEnv(), ...privateConfig(record).config.environment, NEXT_TELEMETRY_DISABLED: '1', CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1',
    NODE_OPTIONS: '--max-old-space-size=8192 --dns-result-order=ipv4first --require ' + JSON.stringify(path.join(record.candidate, 'scripts/local-gates-network.cjs')),
    BUILD_APP_TIMEOUT_MS: String(60 * 60 * 1000) };
}
function run(record, label, args, env, allowed = [0]) {
  const fd = fs.openSync(path.join(__dirname, label + '.log'), 'wx'), began = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: record.candidate, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 300000 }); fs.closeSync(fd);
  write(label + '.execution.json', { args, cwd: record.candidate, utc: new Date().toISOString(), elapsedMs: Date.now() - began, exitCode: result.status, signal: result.signal, error: result.error?.code || null });
  if (!allowed.includes(result.status)) throw Error(`${label} failed; inspect retained log`);
  return result;
}
async function freePort(port) {
  const server = net.createServer(); await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  await new Promise(resolve => server.close(resolve));
}
async function prepare() {
  const record = load(), privateDirectory = path.join(record.directory, 'build-private');
  if (fs.existsSync(privateDirectory)) throw Error('Private compiler configuration already exists; refusing replacement');
  for (const port of [3296, 3443, 9317]) await freePort(port);
  if (fs.realpathSync(visualRoot).toLowerCase() !== path.resolve(visualRoot).toLowerCase()) throw Error('Unexpected artifact workspace root');
  const artifact = path.join(fs.realpathSync(visualRoot), path.basename(record.directory) + '-artifact');
  if (fs.existsSync(artifact)) throw Error('Artifact destination must be new');
  const e = fs.statfsSync(record.directory), c = fs.statfsSync(visualRoot);
  if (e.bavail * e.bsize < 5 * 1024 ** 3 || c.bavail * c.bsize < 4 * 1024 ** 3) throw Error('Insufficient candidate/compiler or artifact storage');
  const url = `postgresql://${record.database.user}@localhost:${record.database.port}/${record.database.freshDatabase}?schema=public`;
  const auth = crypto.randomBytes(32).toString('hex');
  const env = { DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url, NEXTAUTH_URL: 'https://127.0.0.1:3443', NEXT_PUBLIC_BASE_URL: 'https://127.0.0.1:3443', NEXT_PUBLIC_APP_URL: 'https://127.0.0.1:3443',
    AUTH_SECRET: auth, NEXTAUTH_SECRET: auth, BETTER_AUTH_SECRET: auth, HOSTNAME: '127.0.0.1', PORT: '3296',
    STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0' };
  for (const name of ['PUBLIC_IDENTITY_ABUSE_HASH_SECRET', 'AQSTOQFLOW_RECEIPT_TOKEN_SECRET', 'AQSTOQFLOW_HISTORY_CURSOR_SECRET', 'AQSTOQFLOW_STATEMENT_TOKEN_SECRET', 'AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY', 'AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY']) env[name] = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(privateDirectory);
  const file = path.join(privateDirectory, 'environment.private.json');
  fs.writeFileSync(file, JSON.stringify({ candidate: record.candidate, artifact, origin: 'https://127.0.0.1:3443', httpPort: 3296, tlsPort: 3443, cdpPort: 9317, environment: env }, null, 2), { flag: 'wx', mode: 0o600 });
  write('ARTIFACT_BUILD_TARGET.json', { candidate: record.candidate, artifact, privateConfiguration: file, origin: 'https://127.0.0.1:3443', httpPort: 3296, tlsPort: 3443, cdpPort: 9317,
    initialPortAvailabilityVerified: true, sourceManifestSha256: record.manifest.manifestSha256, freshDatabase: record.database.freshDatabase,
    eFreeBytes: e.bavail * e.bsize, cFreeBytes: c.bavail * c.bsize, environmentVariableNames: Object.keys(env).sort(), classification: 'Synthetic local production-format artifact qualification; not production delivery configuration' });
  const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  run(record, 'production-secrets-preflight', [npm, 'run', 'release:secrets:preflight'], { ...environment(record), NODE_ENV: 'production' }, [1]);
  const production = JSON.parse(fs.readFileSync(path.join(record.candidate, 'what-next/release-secret-preflight.json'), 'utf8'));
  const expected = ['statement_live_delivery_channel_enabled', 'accountant_invite_live_delivery_enabled'];
  if (production.summary.status !== 'blocked' || JSON.stringify(production.blockers) !== JSON.stringify(expected)) throw Error('Production preflight did not retain expected live-delivery refusal');
  fs.copyFileSync(path.join(record.candidate, 'what-next/release-secret-preflight.json'), path.join(__dirname, 'PRODUCTION_SECRET_PREFLIGHT.json'), fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(path.join(record.candidate, 'what-next/release-secret-preflight.md'), path.join(__dirname, 'PRODUCTION_SECRET_PREFLIGHT.md'), fs.constants.COPYFILE_EXCL);
  console.log(JSON.stringify({ prepared: true, privateConfiguration: file, artifact, productionDeliveryGate: 'blocked as expected; live sends disabled', noDatabaseOrBuildStarted: true }));
}
async function native(retry = false) {
  const record = load(), env = environment(record), commit = record.require('@prisma/engines-version').enginesVersion;
  if (commit !== 'c2990dca591cba766e3b7ef5d9e8a84796e47ab7') throw Error('Unexpected locked Prisma engine revision');
  const cache = path.join(root, 'node_modules/.cache/prisma/master', commit, 'windows'), copies = [];
  for (const [name, output] of [['libquery-engine', 'query_engine-windows.dll.node'], ['schema-engine', 'schema-engine-windows.exe']]) {
    const source = path.join(cache, name), expected = fs.readFileSync(source + '.sha256', 'utf8').trim(), bytes = fs.readFileSync(source);
    if (!/^[a-f0-9]{64}$/.test(expected) || sha(bytes) !== expected) throw Error('Reviewed local Prisma cache engine checksum mismatch');
    const destination = path.join(record.candidate, 'node_modules/@prisma/engines', output);
    if (fs.existsSync(destination)) { if (!retry || sha(fs.readFileSync(destination)) !== expected) throw Error('Refusing to overwrite a changed native engine'); }
    else fs.writeFileSync(destination, bytes, { flag: 'wx' });
    copies.push({ source, destination, sha256: expected, bytes: bytes.length });
  }
  if (!fs.existsSync(path.join(__dirname, 'CACHED_ENGINE_INPUTS.json'))) write('CACHED_ENGINE_INPUTS.json', { utc: new Date().toISOString(), engineRevision: commit, copies,
    initialBlockedGenerationRetained: fs.existsSync(path.join(__dirname, 'candidate-prisma-generate.execution.json')), binding: 'Existing local checksum sidecars, copied bytes and candidate package engine revision; no checksum-ignore flag or network download' });
  const overrides = retry ? { PRISMA_QUERY_ENGINE_LIBRARY: copies[0].destination, PRISMA_SCHEMA_ENGINE_BINARY: copies[1].destination } : {};
  if (retry) write('CANDIDATE_PRISMA_OFFLINE_ENGINE_OVERRIDES.json', { utc: new Date().toISOString(), generationOnly: true, variables: overrides,
    support: 'Reviewed getBinaryEnvVarPath/allEngineEnvVarsSet in locked @prisma/fetch-engine; explicit local paths skip download jobs', checksumValidationRetained: true,
    originalFailureRetained: 'candidate-prisma-generate.log', runtimeRequiresOverrides: false });
  run(record, retry ? 'candidate-prisma-generate-retry' : 'candidate-prisma-generate', [path.join(record.candidate, 'node_modules/prisma/build/index.js'), 'generate'], { ...env, PRISMA_GENERATE_SKIP_AUTOINSTALL: '1', ...overrides });
  const argon2 = record.require('argon2'), probe = crypto.randomBytes(24).toString('hex');
  const encoded = await argon2.hash(probe, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  if (!await argon2.verify(encoded, probe) || await argon2.verify(encoded, probe + 'x')) throw Error('Candidate native Argon2 verification failed');
  const swc = record.require('@swc/core'); if (!swc.transformSync('const value: number = 1', { jsc: { parser: { syntax: 'typescript' }, target: 'es2020' } }).code.includes('const value')) throw Error('Native SWC compilation failed');
  const nextSwc = record.require('@next/swc-win32-x64-msvc'); if (typeof nextSwc.transformSync !== 'function') throw Error('Native Next SWC unavailable');
  const engine = record.require(path.join(record.candidate, 'node_modules/@prisma/engines/query_engine-windows.dll.node'));
  if (engine.version().commit !== commit) throw Error('Loaded Prisma native engine revision differs');
  const client = record.require('@prisma/client'); if (client.Prisma.prismaVersion.client !== '6.19.3' || client.Prisma.prismaVersion.engine !== commit || typeof client.PrismaClient !== 'function') throw Error('Generated default client/engine version mismatch');
  const defaultRuntimeEngine = path.join(record.candidate, 'node_modules/.prisma/client/query_engine-windows.dll.node');
  if (sha(fs.readFileSync(defaultRuntimeEngine)) !== copies[0].sha256) throw Error('Generated default runtime engine bytes differ from verified Windows engine');
  const tokens = require(path.join(record.candidate, 'scripts/ensure-prisma-client.js')).schemaTokens;
  if (tokens(fs.readFileSync(path.join(record.candidate, 'prisma/schema.prisma'), 'utf8')) !== tokens(fs.readFileSync(path.join(record.candidate, 'node_modules/.prisma/client/schema.prisma'), 'utf8'))) throw Error('Generated default client schema differs');
  require('./candidate-validation.cjs').verifyCandidate();
  write('CANDIDATE_NATIVE_READINESS.json', { utc: new Date().toISOString(), passed: true, engineRevision: commit, clientVersion: client.Prisma.prismaVersion.client,
    candidateDefaultClientGenerated: true, candidateSchemaMatches: true, argon2HashAndCorrectWrongPasswordVerified: true, nativeSwcCompiledTypescript: true, nextSwcNativeLoaded: true,
    cachedEngineInputs: copies, generationOnlyEngineOverridesUsed: retry, defaultRuntimeEngine, runtimeOverridesRequired: false, noDatabaseConnection: true, networkBlockedExceptLoopback: true,
    limitation: 'Clean package installation plus explicitly checksum-bound previously cached native engine inputs; not a fresh engine download or general lifecycle certification' });
  console.log('Candidate default Prisma and native readiness passed; no database/build/application operation.');
}
function supplementPrivateAssets() {
  const record = load(), policyPath = 'config/private-upload-aliases.json';
  const policyBytes = fs.readFileSync(path.join(record.candidate, policyPath)), policySha256 = sha(policyBytes);
  if (sha(fs.readFileSync(path.join(root, policyPath))) !== policySha256) throw Error('Root policy changed before reviewed asset supplement');
  const aliases = JSON.parse(policyBytes), expected = new Set(['public/uploads/cmp_org_005/a032d164-c607-4d66-9050-367cf45f0008.jpg', 'public/uploads/cmp_org_005/f2f43248-c73b-4104-a865-e0f02c2b0ace.jpg', 'public/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg']);
  if (aliases.length !== 3 || aliases.some(alias => !expected.delete(alias.uploadSource)) || expected.size) throw Error('Only the exact three reviewed ignored private assets are authorized');
  const files = aliases.map(alias => {
    const bytes = fs.readFileSync(path.join(root, alias.uploadSource));
    if (sha(bytes) !== alias.sha256 || sha(fs.readFileSync(path.join(root, alias.source))) !== alias.sha256 || sha(fs.readFileSync(path.join(record.candidate, alias.source))) !== alias.sha256) throw Error('Policy-pinned root upload/alias or candidate alias differs');
    if (fs.existsSync(path.join(record.candidate, alias.uploadSource))) throw Error('Refusing to overwrite a private asset input');
    return { path: alias.uploadSource, alias: alias.source, sha256: alias.sha256, bytes: bytes.length, content: bytes.toString('base64') };
  });
  const archivePath = path.join(record.directory, 'private-assets-supplement.json.gz');
  const archive = zlib.gzipSync(JSON.stringify({ version: 1, policySha256, classification: 'Explicit ignored private repository assets; not production database data', files }));
  fs.writeFileSync(archivePath, archive, { flag: 'wx', mode: 0o600 });
  for (const file of files) { const target = path.join(record.candidate, file.path); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, Buffer.from(file.content, 'base64'), { flag: 'wx' }); }
  const manifest = { utc: new Date().toISOString(), policyPath, policySha256, privateArchive: archivePath, privateArchiveSha256: sha(archive),
    sourceManifestSha256: record.manifest.manifestSha256, capturedSourceFilesUnchanged: true, sourceArchiveUnchanged: true,
    authorization: 'Root reviewed exact three Git-ignored policy-pinned originals; candidate-only supplement, unchanged generic capture privacy semantics',
    files: files.map(({ content, ...file }) => ({ ...file, rootSha256: sha(fs.readFileSync(path.join(root, file.path))), candidateSha256: sha(fs.readFileSync(path.join(record.candidate, file.path))) })),
    packagerGuardUnchanged: true, policyDisclosure: 'Three retained private repository images must be remapped to runtime/.private/uploads; no production database data used' };
  require('./candidate-validation.cjs').verifyCandidate();
  write('PRIVATE_ASSET_INPUT_SUPPLEMENT.json', manifest);
  console.log(JSON.stringify({ reviewedIgnoredAssetSupplementPrepared: true, files: files.length, policySha256, sourceManifestUnchanged: true }));
}
function verifyPrivateAssetSupplement(record) {
  const proof = read('PRIVATE_ASSET_INPUT_SUPPLEMENT.json');
  if (proof.sourceManifestSha256 !== record.manifest.manifestSha256 || proof.files.length !== 3 || sha(fs.readFileSync(proof.privateArchive)) !== proof.privateArchiveSha256
    || sha(fs.readFileSync(path.join(record.candidate, proof.policyPath))) !== proof.policySha256) throw Error('Ignored private asset supplement binding changed');
  for (const file of proof.files) if (sha(fs.readFileSync(path.join(record.candidate, file.path))) !== file.sha256 || sha(fs.readFileSync(path.join(record.candidate, file.alias))) !== file.sha256 || sha(fs.readFileSync(path.join(root, file.path))) !== file.sha256) throw Error('Reviewed private asset bytes changed');
  return proof;
}
async function guardDatabase(record, attempt = 1) {
  const { Client } = record.require('pg'), env = environment(record), client = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    const identity = (await client.query("SELECT current_database() AS name,current_user AS actor,current_setting('data_directory') AS directory")).rows[0];
    if (identity.name !== record.database.freshDatabase || identity.actor !== record.database.user || fs.realpathSync(identity.directory).toLowerCase() !== fs.realpathSync(path.join(record.database.directory, 'data')).toLowerCase()) throw Error('Build database ownership differs');
    const rows = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    const names = fs.readdirSync(path.join(record.candidate, 'prisma/migrations')).filter(name => fs.existsSync(path.join(record.candidate, 'prisma/migrations', name, 'migration.sql'))).sort();
    if (JSON.stringify(names) !== JSON.stringify(rows.map(row => row.migration_name))) throw Error('Build database migration catalog differs');
    for (const row of rows) if (!row.finished_at || row.rolled_back_at || row.checksum !== sha(fs.readFileSync(path.join(record.candidate, 'prisma/migrations', row.migration_name, 'migration.sql')))) throw Error('Build database migration state/checksum differs');
    write(attempt === 1 ? 'BUILD_DATABASE_GUARD.json' : 'BUILD_DATABASE_GUARD_ATTEMPT_2.json', { utc: new Date().toISOString(), passed: true, database: identity.name, user: identity.actor,
      dataDirectory: identity.directory, appliedMigrations: rows.length, candidateMigrations: names.length, exactChecksumsMatch: true, noMigrationsExecuted: true });
  } finally { await client.end(); }
}
function scanArtifactConfiguration(record, config, manifest) {
  const names = Object.keys(config.environment).filter(name => /^(AUTH_SECRET|NEXTAUTH_SECRET|BETTER_AUTH_SECRET|PUBLIC_IDENTITY_ABUSE_HASH_SECRET|DATABASE_URL|DIRECT_URL|SHADOW_DATABASE_URL)$/.test(name) || name.startsWith('AQSTOQFLOW_'));
  const unique = new Map(), failed = new Set();
  for (const name of names) { const value = config.environment[name]; if (typeof value !== 'string' || !value) throw Error('Required private scan value absent'); if (!unique.has(value)) unique.set(value, []); unique.get(value).push(name); }
  const probes = [...unique].map(([value, variables]) => ({ bytes: Buffer.from(value), variables }));
  for (const file of [...manifest.files, { path: 'artifact.json' }]) {
    const bytes = fs.readFileSync(path.join(config.artifact, file.path));
    for (const probe of probes) if (bytes.includes(probe.bytes)) for (const name of probe.variables) failed.add(name);
  }
  const results = names.sort().map(variable => ({ variable, passed: !failed.has(variable) }));
  write('ARTIFACT_SYNTHETIC_CONFIG_EXCLUSION.json', { utc: new Date().toISOString(), filesScanned: manifest.files.length, artifactManifestAlsoScanned: true,
    exactPrivateValuesDeduplicated: true, results, passed: failed.size === 0, secretValuesPrintedOrHashed: false });
  if (failed.size) throw Error('Artifact contains a private synthetic configuration value; variable-only exclusion receipt retained');
}
async function build(attempt = 1) {
  const record = load(), { config } = privateConfig(record), env = environment(record), nativeProof = read('CANDIDATE_NATIVE_READINESS.json');
  if (!nativeProof.passed || fs.existsSync(config.artifact)) throw Error('Native readiness and a new artifact destination required');
  const suffix = attempt === 1 ? '' : '-attempt-2';
  if (attempt === 2) { const failed = read('FULL_ARTIFACT_BUILD_RESULT.json'); if (failed.passed || failed.emitted || failed.artifact !== config.artifact) throw Error('Retained failed prebuild without an artifact required'); verifyPrivateAssetSupplement(record); }
  const data = path.join(record.database.directory, 'data');
  if (spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', data, 'status'], { env: osEnv(), windowsHide: true, stdio: 'ignore' }).status !== 3) throw Error('Wait for exclusive shared-cluster handoff; refusing an already running cluster');
  const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const control = action => { const args = action === 'start' ? ['-D', data, '-l', path.join(record.database.directory, 'postgres.log'), '-o', `-p ${record.database.port} -h 127.0.0.1`, '-w', 'start'] : ['-D', data, '-m', 'fast', '-w', 'stop'];
    const result = spawnSync(path.join(bin, 'pg_ctl.exe'), args, { env: osEnv(), windowsHide: true, stdio: 'ignore' });
    write(`build-pg-${action}${suffix}.execution.json`, { utc: new Date().toISOString(), args, exitCode: result.status, error: result.error?.code || null, ownedCluster: record.database.directory });
    if (result.status !== 0) throw Error(`Owned build PG ${action} failed`); };
  control('start');
  try {
    await guardDatabase(record, attempt);
    const result = await new Promise((resolve, reject) => {
      const fd = fs.openSync(path.join(__dirname, `full-artifact-build${suffix}.log`), 'wx'), began = Date.now(); let pending = '', emitted = null;
      const child = spawn(process.execPath, [npm, 'run', 'release:artifact', '--', config.artifact], { cwd: record.candidate, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const timer = setTimeout(() => { spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { env: osEnv(), windowsHide: true, stdio: 'ignore' }); }, 90 * 60 * 1000);
      child.stdout.on('data', bytes => { fs.writeSync(fd, bytes); pending += bytes.toString(); const lines = pending.split(/\r?\n/); pending = lines.pop(); for (const line of lines) { try { const item = JSON.parse(line); if (item.destination === config.artifact && /^[a-f0-9]{64}$/.test(item.sha256) && item.buildId) { emitted = item; write('ARTIFACT_EMITTED_DIGEST.json', { ...item, capturedAt: new Date().toISOString(), origin: 'Captured immediately from first successful unmodified release:artifact output' }); } } catch (error) { if (error.code) reject(error); } } });
      child.stderr.on('data', bytes => fs.writeSync(fd, bytes));
      child.once('error', error => { clearTimeout(timer); fs.closeSync(fd); reject(error); });
      child.once('close', code => { clearTimeout(timer); fs.closeSync(fd); resolve({ exitCode: code, elapsedMs: Date.now() - began, emitted }); });
    });
    write(attempt === 1 ? 'FULL_ARTIFACT_BUILD_RESULT.json' : 'FULL_ARTIFACT_BUILD_RESULT_ATTEMPT_2.json', { ...result, attempt, utc: new Date().toISOString(), candidate: record.candidate, artifact: config.artifact,
      productionDeliveryGate: 'blocked as expected; independent from local compilation', classification: 'Unmodified full production-format local artifact build', passed: result.exitCode === 0 && Boolean(result.emitted) });
    if (result.exitCode !== 0 || !result.emitted) throw Error('Full unmodified artifact build failed; inspect retained compile/lint/type output');
    run(record, 'full-artifact-verify' + suffix, [npm, 'run', 'release:artifact:verify', '--', config.artifact, result.emitted.sha256], env);
    const sealed = record.require(path.join(record.candidate, 'scripts/release-artifact.cjs')).verify(record.candidate, config.artifact, result.emitted.sha256);
    const runtimeEngine = sealed.files.find(file => file.path === 'runtime/node_modules/.prisma/client/query_engine-windows.dll.node');
    const engineInput = nativeProof.cachedEngineInputs.find(file => file.destination.endsWith('query_engine-windows.dll.node'));
    if (!runtimeEngine || runtimeEngine.sha256 !== engineInput?.sha256) throw Error('Sealed artifact default Windows Prisma runtime engine missing or changed');
    scanArtifactConfiguration(record, config, sealed);
    const assets = verifyPrivateAssetSupplement(record);
    require('./candidate-validation.cjs').verifyCandidate();
    write('ARTIFACT_QUALIFICATION.json', { utc: new Date().toISOString(), artifact: config.artifact, artifactSha256: result.emitted.sha256, buildId: result.emitted.buildId,
      fullBuildAndTrustedDigestVerificationPassed: true, sourceManifestSha256: record.manifest.manifestSha256, productionDeliveryGate: 'BLOCKED',
      localArtifactClass: 'Production-format full current frozen application; conditional local configuration only', localPublicOriginBinding: config.origin,
      productionHostPromotionWithoutCorrectOriginBuildQualified: false, syntheticPrivateConfigExclusionPassed: true,
      runtimeEngineAtDefaultPath: runtimeEngine.path, runtimeEngineSha256: runtimeEngine.sha256, nativePlatform: 'win32-x64',
      ignoredPrivateAssetSupplementSha256: sha(fs.readFileSync(path.join(__dirname, 'PRIVATE_ASSET_INPUT_SUPPLEMENT.json'))), privateAssetInputCount: assets.files.length,
      retainedLegacyUploadMappingCount: sealed.legacyUploads.length, retainedPrivateUploadAliasCount: sealed.privateUploadAliases?.length || 0,
      privateAssetPolicy: 'Policy-managed legacy upload bytes remain in runtime/.private/uploads; public duplicates excluded', applicationDeployed: false, databasePromoted: false, browserProof: false });
    console.log(JSON.stringify({ artifactVerified: true, sha256: result.emitted.sha256, buildId: result.emitted.buildId, artifact: config.artifact, productionReady: false }));
  } finally { control('stop'); }
}
const mode = process.argv[2];
Promise.resolve().then(() => { if (process.argv.length !== 3) throw Error('Expected one reviewed artifact mode'); if (mode === 'prepare') return prepare(); if (mode === 'native') return native(); if (mode === 'native-retry') return native(true); if (mode === 'supplement-private-assets') return supplementPrivateAssets(); if (mode === 'build') return build(); if (mode === 'build-retry') return build(2); throw Error('Unknown artifact mode'); })
  .catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_FRESH_BUILD_DATABASE]')); process.exitCode = 1; });
