// Full unchanged release pipeline on a frozen candidate and owned local DB.
// No live configuration, schema promotion, deployment or shared client writes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '../../../..');
const visual = 'C:/Users/J COMPUTER/.codex/visualizations/2026/11/02/01a19e00-6435-7443-92d6-f2cf160728a8';
const pgBin = 'C:/Program Files/PostgreSQL/17/bin';
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const osEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
function load() {
  const { target, manifest } = require('./candidate-validation.cjs').verifyCandidate();
  const dependencies = read('CANDIDATE_DEPENDENCIES.json');
  assert(dependencies.passed && dependencies.sourceAndDestinationChecksumsEqual && dependencies.independentRegularFileCopy);
  assert.equal(dependencies.candidate, target.candidate); assert.equal(dependencies.sourceManifestSha256, manifest.manifestSha256);
  assert.equal(sha(path.join(__dirname, dependencies.fileManifest.path)), dependencies.fileManifest.sha256);
  const database = read('DATABASE_TARGET.json');
  const old = JSON.parse(fs.readFileSync(path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09/DATABASE_TARGET.json'), 'utf8'));
  for (const key of ['directory', 'clusterDirectory', 'host', 'port', 'user']) assert.equal(database[key], old[key]);
  assert.match(database.freshDatabase, /^stoquify_replay_close_authority_20261109_[a-f0-9]{10}$/);
  assert.equal(database.sourceManifestSha256, manifest.manifestSha256);
  assert.equal(database.purpose, 'hardened-close-release-candidate');
  assert.equal(fs.realpathSync(database.directory), fs.realpathSync(old.directory));
  assert(!fs.readdirSync(target.candidate).some(name => name.startsWith('.env')));
  const pkg = JSON.parse(fs.readFileSync(path.join(target.candidate, 'package.json'), 'utf8'));
  const scripts = { 'release:artifact': 'node scripts/release-artifact.cjs prepare', 'release:artifact:verify': 'node scripts/release-artifact.cjs verify',
    build: 'npm run release:secrets:preflight && npm run build:linted', 'build:linted': 'npm run lint && npm run build:app',
    lint: 'eslint app actions components config hooks lib services --ext .js,.jsx,.ts,.tsx', 'build:app': 'node scripts/build-app-safe.js',
    'release:secrets:preflight': 'node scripts/release-secret-preflight.js --mode fail --release auto --out what-next/release-secret-preflight.md --json-out what-next/release-secret-preflight.json' };
  for (const [name, expected] of Object.entries(scripts)) { assert.equal(pkg.scripts[name], expected); assert(!pkg.scripts['pre' + name] && !pkg.scripts['post' + name]); }
  return { ...target, manifest, database, require: createRequire(path.join(target.candidate, 'package.json')) };
}
function config(record) {
  const file = path.join(record.directory, 'build-private/environment.private.json');
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(value.candidate, record.candidate);
  assert.equal(value.artifact, path.join(fs.realpathSync(visual), path.basename(record.directory) + '-artifact'));
  assert.equal(value.origin, 'https://127.0.0.1:3443'); assert.equal(value.httpPort, 3296); assert.equal(value.tlsPort, 3443);
  const url = `postgresql://${record.database.user}@localhost:${record.database.port}/${record.database.freshDatabase}?schema=public`;
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL']) assert.equal(value.environment[key], url);
  for (const key of ['NODE_ENV', 'CI_RELEASE', 'AQSTOQFLOW_RELEASE_MODE', 'VERCEL_ENV', 'NEXT_DIST_DIR']) assert(!(key in value.environment));
  for (const key of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) assert(!value.environment[key]);
  for (const key of ['STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS', 'STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS', 'STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS']) assert.equal(value.environment[key], '0');
  return value;
}
function environment(record) {
  return { ...osEnv(), ...config(record).environment, NEXT_TELEMETRY_DISABLED: '1', CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1',
    NPM_CONFIG_USERCONFIG: path.join(record.directory, 'build-private/empty-user.npmrc'), NPM_CONFIG_GLOBALCONFIG: path.join(record.directory, 'build-private/empty-global.npmrc'),
    NPM_CONFIG_CACHE: path.join(record.directory, 'build-private/npm-cache'),
    NODE_OPTIONS: '--max-old-space-size=8192 --dns-result-order=ipv4first --require ' + JSON.stringify(path.join(record.candidate, 'scripts/local-gates-network.cjs')), BUILD_APP_TIMEOUT_MS: '3600000' };
}
function command(record, label, args, env, expected = 0) {
  const fd = fs.openSync(path.join(__dirname, label + '.log'), 'wx');
  const result = spawnSync(process.execPath, args, { cwd: record.candidate, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 300000 }); fs.closeSync(fd);
  write(label + '.execution.json', { utc: new Date().toISOString(), args, cwd: record.candidate, exitCode: result.status, error: result.error?.code || null });
  assert.equal(result.status, expected, `${label} failed; retained log available`);
}
async function prepare() {
  const record = load(), directory = path.join(record.directory, 'build-private'); assert(!fs.existsSync(directory));
  require('./candidate.cjs').assertCapacity('Build');
  const capacity = read('CAPACITY_REVIEW.json'); assert(capacity.approvedForBuild === true);
  assert(fs.statfsSync(record.directory).bavail * fs.statfsSync(record.directory).bsize >= capacity.minimumBuildFreeBytes);
  assert(fs.statfsSync(visual).bavail * fs.statfsSync(visual).bsize >= capacity.minimumArtifactFreeBytes);
  for (const port of [3296, 3443]) { const server = net.createServer(); await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); }); await new Promise(resolve => server.close(resolve)); }
  const artifact = path.join(fs.realpathSync(visual), path.basename(record.directory) + '-artifact'); assert(!fs.existsSync(artifact));
  const auth = crypto.randomBytes(32).toString('hex'), url = `postgresql://${record.database.user}@localhost:${record.database.port}/${record.database.freshDatabase}?schema=public`;
  const env = { DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url, AUTH_SECRET: auth, NEXTAUTH_SECRET: auth, BETTER_AUTH_SECRET: auth,
    NEXTAUTH_URL: 'https://127.0.0.1:3443', NEXT_PUBLIC_BASE_URL: 'https://127.0.0.1:3443', NEXT_PUBLIC_APP_URL: 'https://127.0.0.1:3443', HOSTNAME: '127.0.0.1', PORT: '3296',
    STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0' };
  for (const key of ['PUBLIC_IDENTITY_ABUSE_HASH_SECRET', 'AQSTOQFLOW_RECEIPT_TOKEN_SECRET', 'AQSTOQFLOW_HISTORY_CURSOR_SECRET', 'AQSTOQFLOW_STATEMENT_TOKEN_SECRET', 'AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY', 'AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY']) env[key] = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(directory); const file = path.join(directory, 'environment.private.json');
  for (const name of ['empty-user.npmrc', 'empty-global.npmrc']) fs.writeFileSync(path.join(directory, name), '', { flag: 'wx' });
  fs.writeFileSync(file, JSON.stringify({ candidate: record.candidate, artifact, origin: 'https://127.0.0.1:3443', httpPort: 3296, tlsPort: 3443, environment: env }, null, 2), { flag: 'wx', mode: 0o600 });
  write('ARTIFACT_BUILD_TARGET.json', { candidate: record.candidate, artifact, privateConfiguration: file, origin: 'https://127.0.0.1:3443', httpPort: 3296, tlsPort: 3443,
    sourceManifestSha256: record.manifest.manifestSha256, freshDatabase: record.database.freshDatabase, environmentVariableNames: Object.keys(env).sort(), classification: 'Synthetic loopback local qualification; not deployment configuration' });
  const aliases = JSON.parse(fs.readFileSync(path.join(record.candidate, 'config/private-upload-aliases.json'), 'utf8')); assert.equal(aliases.length, 3);
  const supplement = [];
  for (const alias of aliases) {
    assert.match(alias.uploadSource, /^public\/uploads\/cmp_org_005\/[a-f0-9-]+\.jpg$/); assert.match(alias.sha256, /^[a-f0-9]{64}$/);
    assert.equal(sha(path.join(root, alias.uploadSource)), alias.sha256); assert.equal(sha(path.join(record.candidate, alias.source)), alias.sha256);
    const destination = path.join(record.candidate, alias.uploadSource); assert(!fs.existsSync(destination)); fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, alias.uploadSource), destination, fs.constants.COPYFILE_EXCL); supplement.push({ ...alias, candidateSha256: sha(destination) });
  }
  const privateArchive = path.join(record.directory, 'private-assets-supplement.json.gz');
  const policySha256 = sha(path.join(record.candidate, 'config/private-upload-aliases.json'));
  fs.writeFileSync(privateArchive, zlib.gzipSync(JSON.stringify({ policySha256, files: supplement.map(item => ({ ...item, content: fs.readFileSync(path.join(record.candidate, item.uploadSource)).toString('base64') })) })), { flag: 'wx', mode: 0o600 });
  write('PRIVATE_ASSET_INPUT_SUPPLEMENT.json', { files: supplement, policySha256, privateArchive, privateArchiveSha256: sha(privateArchive), sourceManifestSha256: record.manifest.manifestSha256,
    classification: 'Three unchanged policy-pinned repository images, privately mapped by artifact packager' });
  const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  command(record, 'production-secrets-preflight', [npm, 'run', 'release:secrets:preflight'], { ...environment(record), NODE_ENV: 'production' }, 1);
  const preflight = JSON.parse(fs.readFileSync(path.join(record.candidate, 'what-next/release-secret-preflight.json'), 'utf8'));
  assert.deepEqual(preflight.blockers, ['statement_live_delivery_channel_enabled', 'accountant_invite_live_delivery_enabled']);
  write('PRODUCTION_SECRET_PREFLIGHT.json', preflight);
  const client = record.require('@prisma/client'), engines = record.require('@prisma/engines-version');
  assert.equal(engines.enginesVersion, 'c2990dca591cba766e3b7ef5d9e8a84796e47ab7');
  assert.equal(client.Prisma.prismaVersion.client, '6.19.3'); assert.equal(client.Prisma.prismaVersion.engine, engines.enginesVersion);
  const tokens = record.require(path.join(record.candidate, 'scripts/ensure-prisma-client.js')).schemaTokens;
  assert.equal(tokens(fs.readFileSync(path.join(record.candidate, 'prisma/schema.prisma'), 'utf8')), tokens(fs.readFileSync(path.join(record.candidate, 'node_modules/.prisma/client/schema.prisma'), 'utf8')));
  const argon = record.require('argon2'), probe = crypto.randomBytes(24).toString('hex'), encoded = await argon.hash(probe, { type: argon.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  assert(await argon.verify(encoded, probe)); assert(!await argon.verify(encoded, probe + 'x'));
  assert.equal(typeof record.require('@next/swc-win32-x64-msvc').transformSync, 'function');
  const engine = path.join(record.candidate, 'node_modules/.prisma/client/query_engine-windows.dll.node');
  const previousNative = JSON.parse(fs.readFileSync(path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09/CANDIDATE_NATIVE_READINESS.json'), 'utf8'));
  const previousEngine = previousNative.cachedEngineInputs.find(item => item.destination.endsWith('query_engine-windows.dll.node'));
  assert(previousNative.passed && previousEngine); assert.equal(sha(engine), previousEngine.sha256);
  const dependencyFiles = read('DEPENDENCY_COPY_MANIFEST.json').files;
  assert.equal(dependencyFiles.find(item => item.path === '.prisma/client/query_engine-windows.dll.node')?.sha256, sha(engine));
  write('CANDIDATE_NATIVE_READINESS.json', { passed: true, prismaVersion: client.Prisma.prismaVersion, schemaMatches: true, argon2CorrectWrongPasswordVerified: true, nativeNextSwcLoaded: true, defaultEngineSha256: sha(engine), reusedDependencies: true, noGeneration: true });
  console.log('Build configuration, retained production delivery denial and candidate native checks passed.');
}
async function guardDatabase(record) {
  const client = new (record.require('pg').Client)({ connectionString: config(record).environment.DATABASE_URL, connectionTimeoutMillis: 5000 }); await client.connect();
  try {
    const row = (await client.query("SELECT current_database() AS name,current_user AS actor,current_setting('data_directory') AS directory,host(inet_server_addr()) AS host,inet_server_port() AS port")).rows[0];
    assert.equal(row.name, record.database.freshDatabase); assert.equal(row.actor, record.database.user); assert.equal(row.host, '127.0.0.1'); assert.equal(row.port, record.database.port);
    assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(record.database.directory, 'data')).toLowerCase());
    const rows = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    const names = fs.readdirSync(path.join(record.candidate, 'prisma/migrations')).filter(name => fs.existsSync(path.join(record.candidate, 'prisma/migrations', name, 'migration.sql'))).sort();
    assert.deepEqual(rows.map(item => item.migration_name), names);
    for (const item of rows) { assert(item.finished_at && !item.rolled_back_at); assert.equal(item.checksum, sha(path.join(record.candidate, 'prisma/migrations', item.migration_name, 'migration.sql'))); }
    write('BUILD_DATABASE_GUARD.json', { passed: true, database: row.name, appliedMigrations: rows.length, exactChecksums: true });
  } finally { await client.end(); }
}
function pgControl(record, action, acquired = () => {}) {
  const data = path.join(record.database.directory, 'data');
  if (action === 'start') assert.equal(spawnSync(path.join(pgBin, 'pg_ctl.exe'), ['-D', data, 'status'], { env: osEnv(), windowsHide: true, stdio: 'ignore' }).status, 3, 'Cluster already in use');
  const args = action === 'start' ? ['-D', data, '-l', path.join(record.database.directory, 'postgres.log'), '-o', `-p ${record.database.port} -h 127.0.0.1`, '-w', 'start'] : ['-D', data, '-m', 'fast', '-w', 'stop'];
  const result = spawnSync(path.join(pgBin, 'pg_ctl.exe'), args, { env: osEnv(), windowsHide: true, stdio: 'ignore' });
  if (result.status === 0 && action === 'start') acquired();
  write('build-pg-' + action + '.json', { action, exitCode: result.status, cluster: record.database.directory }); assert.equal(result.status, 0);
}
async function build() {
  const record = load(), cfg = config(record), native = read('CANDIDATE_NATIVE_READINESS.json'); assert(native.passed && !fs.existsSync(cfg.artifact));
  const assets = read('PRIVATE_ASSET_INPUT_SUPPLEMENT.json');
  assert.equal(assets.sourceManifestSha256, record.manifest.manifestSha256);
  assert.equal(assets.privateArchive, path.join(record.directory, 'private-assets-supplement.json.gz'));
  assert.equal(sha(assets.privateArchive), assets.privateArchiveSha256);
  assert.equal(sha(path.join(record.candidate, 'config/private-upload-aliases.json')), assets.policySha256);
  for (const item of assets.files) assert.equal(sha(path.join(record.candidate, item.uploadSource)), item.sha256);
  require('./candidate.cjs').assertCapacity('Build');
  const env = environment(record), npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  let opened = false;
  try {
    pgControl(record, 'start', () => { opened = true; });
    await guardDatabase(record);
    const result = await new Promise((resolve, reject) => {
      const fd = fs.openSync(path.join(__dirname, 'full-artifact-build.log'), 'wx'), began = Date.now(); let pending = '', emitted = null, finished = false, failure = null, killRequested = false;
      const child = spawn(process.execPath, [npm, 'run', 'release:artifact', '--', cfg.artifact], { cwd: record.candidate, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const stopOwned = () => { if (killRequested || !child.pid || child.exitCode !== null) return; killRequested = true; spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { env: osEnv(), windowsHide: true, stdio: 'ignore' }); };
      const fail = error => { failure ||= error; stopOwned(); };
      const timer = setTimeout(() => fail(new Error('Owned artifact build exceeded its deadline')), 90 * 60 * 1000);
      const finish = code => {
        if (finished) return; finished = true; clearTimeout(timer);
        try { fs.closeSync(fd); } catch (error) { failure ||= error; }
        if (failure) reject(failure); else resolve({ exitCode: code, elapsedMs: Date.now() - began, emitted });
      };
      child.stdout.on('data', bytes => {
        if (finished) return;
        try {
          fs.writeSync(fd, bytes); pending += bytes.toString(); const lines = pending.split(/\r?\n/); pending = lines.pop();
          for (const line of lines) { let item; try { item = JSON.parse(line); } catch { continue; }
            if (item.destination === cfg.artifact && /^[a-f0-9]{64}$/.test(item.sha256) && item.buildId) {
              assert(!emitted, 'Unexpected second artifact digest emission'); emitted = item;
              write('ARTIFACT_EMITTED_DIGEST.json', { ...item, capturedAt: new Date().toISOString(), origin: 'Immediate stdout from unchanged artifact packager' });
            }
          }
        } catch (error) { fail(error); }
      });
      child.stderr.on('data', bytes => { if (!finished) { try { fs.writeSync(fd, bytes); } catch (error) { fail(error); } } });
      child.stdout.on('error', fail); child.stderr.on('error', fail);
      child.once('error', error => { failure ||= error; finish(null); });
      child.once('close', finish);
    });
    write('FULL_ARTIFACT_BUILD_RESULT.json', { ...result, candidate: record.candidate, artifact: cfg.artifact, passed: result.exitCode === 0 && !!result.emitted });
    assert(result.exitCode === 0 && result.emitted, 'Build failed; retain attempt and inspect build log');
    command(record, 'full-artifact-verify', [npm, 'run', 'release:artifact:verify', '--', cfg.artifact, result.emitted.sha256], env);
    const manifest = record.require(path.join(record.candidate, 'scripts/release-artifact.cjs')).verify(record.candidate, cfg.artifact, result.emitted.sha256);
    assert.equal(manifest.files.find(file => file.path === 'runtime/node_modules/.prisma/client/query_engine-windows.dll.node')?.sha256, native.defaultEngineSha256);
    const probes = [...new Set(Object.entries(cfg.environment).filter(([key]) => /^(AUTH_SECRET|NEXTAUTH_SECRET|BETTER_AUTH_SECRET|PUBLIC_IDENTITY_ABUSE_HASH_SECRET|DATABASE_URL|DIRECT_URL|SHADOW_DATABASE_URL)$/.test(key) || key.startsWith('AQSTOQFLOW_')).map(([, value]) => value))].map(value => Buffer.from(value));
    for (const file of [...manifest.files, { path: 'artifact.json' }]) { const bytes = fs.readFileSync(path.join(cfg.artifact, file.path)); assert(!probes.some(probe => bytes.includes(probe)), 'Private build configuration appeared in artifact'); }
    require('./candidate-validation.cjs').verifyCandidate();
    write('ARTIFACT_QUALIFICATION.json', { passed: true, artifact: cfg.artifact, artifactSha256: result.emitted.sha256, buildId: result.emitted.buildId, files: manifest.files.length,
      sourceManifestSha256: record.manifest.manifestSha256, fullBuildAndTrustedDigestVerificationPassed: true, syntheticPrivateConfigExclusionPassed: true,
      nativePlatform: 'win32-x64', localPublicOriginBinding: cfg.origin, productionDeliveryGate: 'BLOCKED with live delivery disabled',
      privateAssetMappings: manifest.legacyUploads.length, privateAssetAliases: manifest.privateUploadAliases?.length || 0,
      dependencies: 'Hash-verified copy of prior locked installed tree; no new clean-install claim', applicationDeployed: false, databasePromoted: false });
    console.log(JSON.stringify({ passed: true, buildId: result.emitted.buildId, artifactSha256: result.emitted.sha256 }));
  } finally { if (opened) pgControl(record, 'stop'); }
}
if (require.main === module) Promise.resolve().then(() => { assert.equal(process.argv.length, 3); if (process.argv[2] === 'prepare') return prepare(); if (process.argv[2] === 'build') return build(); throw Error('Expected prepare or build'); }).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { load, config, environment, guardDatabase, osEnv };
