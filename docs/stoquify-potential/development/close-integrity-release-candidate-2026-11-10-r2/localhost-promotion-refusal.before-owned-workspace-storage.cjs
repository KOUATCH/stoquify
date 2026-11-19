// Actual named npm CLI, trusted emitted artifact digest, and unchanged production gate.
// Prepare/review only until ARTIFACT_QUALIFICATION exists and the owned PG manager has stopped.
// Native V8 coverage observes executed functions without replacing verify/client/process APIs.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process'), { fileURLToPath } = require('node:url');
const root = path.resolve(__dirname, '../../../..'), bin = 'C:/Program Files/PostgreSQL/17/bin';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv);
const clean = text => String(text || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_LOCAL_DATABASE]');
function status(database) { return spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(database.clusterDirectory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' }).status; }
function load() {
  const qualification = read(path.join(__dirname, 'ARTIFACT_QUALIFICATION.json'));
  assert(qualification.fullBuildAndTrustedDigestVerificationPassed && qualification.databasePromoted === false && qualification.applicationDeployed === false);
  const { target, manifest } = require('./candidate-validation.cjs').verifyCandidate();
  const emittedPath = path.join(__dirname, 'ARTIFACT_EMITTED_DIGEST.json'), emitted = read(emittedPath), build = read(path.join(__dirname, 'ARTIFACT_BUILD_TARGET.json'));
  const database = read(path.join(__dirname, 'DATABASE_TARGET.json'));
  assert.equal(path.dirname(database.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(database.directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/);
  assert.equal(database.clusterDirectory, database.directory); assert.equal(database.host, 'localhost'); assert.equal(database.user, 'sales_release_fixture');
  assert.match(database.freshDatabase, /^stoquify_replay_close_monthly_20261110_[a-f0-9]{10}$/); assert(Number.isSafeInteger(database.port) && database.port > 1024 && database.port < 65536);
  const configPath = path.join(target.directory, 'build-private/environment.private.json'), config = read(configPath);
  assert.equal(build.privateConfiguration, configPath); assert.equal(build.candidate, target.candidate); assert.equal(config.candidate, target.candidate);
  assert.equal(build.artifact, config.artifact); assert.equal(config.artifact, qualification.artifact); assert.equal(emitted.destination, config.artifact);
  assert.equal(qualification.sourceManifestSha256, manifest.manifestSha256); assert.equal(build.sourceManifestSha256, manifest.manifestSha256);
  assert.match(emitted.sha256, /^[a-f0-9]{64}$/); assert.equal(qualification.artifactSha256, emitted.sha256); assert.equal(qualification.buildId, emitted.buildId);
  assert.equal(digest(path.join(config.artifact, 'artifact.json')), emitted.sha256, 'The first emitted trusted digest must match the retained manifest');
  assert(fs.realpathSync(config.artifact).startsWith(fs.realpathSync('C:/Users/J COMPUTER/.codex/visualizations/2026/11/02/01a19e00-6435-7443-92d6-f2cf160728a8') + path.sep));
  assert(fs.realpathSync(configPath).startsWith(fs.realpathSync(target.directory) + path.sep));
  const url = `postgresql://${database.user}@localhost:${database.port}/${database.freshDatabase}?schema=public`;
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL']) assert.equal(config.environment[key], url);
  for (const key of ['STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS', 'STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS', 'STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS']) assert.equal(config.environment[key], '0');
  for (const key of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) assert(!config.environment[key], 'Provider credentials forbidden');
  assert.deepEqual(Object.keys(config.environment).sort(), build.environmentVariableNames);
  assert(!fs.readdirSync(target.candidate).some(name => name.startsWith('.env')));
  const pkg = read(path.join(target.candidate, 'package.json')), registry = read(path.join(target.candidate, 'docs/ecc/command-registry.json'));
  const named = 'release:schema:promote'; assert.equal(pkg.scripts[named], 'node scripts/promote-release-schema.cjs');
  assert(!pkg.scripts['pre' + named] && !pkg.scripts['post' + named]);
  assert.equal(registry.commands[named].script, pkg.scripts[named]); assert.equal(registry.commands[named].auditAllowed, false);
  const sourceBinding = ['package.json', 'scripts/promote-release-schema.cjs', 'scripts/release-artifact.cjs', 'scripts/prisma-production-migration-gate.js', 'scripts/local-gates-network.cjs'].map(relative => {
    const expected = manifest.files.find(entry => entry.path === relative); assert(expected);
    assert.equal(digest(path.join(target.candidate, relative)), expected.sha256); assert.equal(digest(path.join(root, relative)), expected.sha256);
    return { path: relative, sha256: expected.sha256 };
  });
  return { target, manifest, database, config, configPath, qualification, emitted, emittedPath, sourceBinding };
}
async function run() {
  const record = load(), id = crypto.randomBytes(5).toString('hex');
  const evidence = path.join(__dirname, `localhost-promotion-refusal-${id}`), privateDir = path.join(record.target.directory, `localhost-promotion-refusal-${id}`);
  fs.mkdirSync(evidence); fs.mkdirSync(privateDir); const coverage = path.join(privateDir, 'coverage'); fs.mkdirSync(coverage);
  const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const report = { began: new Date().toISOString(), passed: false, classification: 'Actual named CLI refusal of explicitly owned localhost target; no production promotion',
    candidate: record.target.candidate, database: record.database.freshDatabase, sourceManifestSha256: record.manifest.manifestSha256,
    emittedDigestReceiptSha256: digest(record.emittedPath), artifactSha256: record.emitted.sha256, buildId: record.emitted.buildId,
    artifactQualificationSha256: digest(path.join(__dirname, 'ARTIFACT_QUALIFICATION.json')), privateConfigurationSha256: digest(record.configPath),
    sourceBinding: record.sourceBinding, runnerSha256: digest(__filename), checks: [] };
  try {
    assert.equal(status(record.database), 3, 'Owned PostgreSQL cluster must be stopped by its current manager before refusal proof');
    const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'); assert(fs.statSync(npm).isFile());
    for (const name of ['empty-user.npmrc', 'empty-global.npmrc']) fs.writeFileSync(path.join(privateDir, name), '', { flag: 'wx' });
    const env = { ...osEnv, ...record.config.environment, NODE_ENV: 'production', VERCEL_ENV: 'production',
      NODE_OPTIONS: '--dns-result-order=ipv4first --require ' + JSON.stringify(path.join(record.target.candidate, 'scripts/local-gates-network.cjs')),
      NODE_V8_COVERAGE: coverage, NEXT_TELEMETRY_DISABLED: '1', CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1',
      NPM_CONFIG_USERCONFIG: path.join(privateDir, 'empty-user.npmrc'), NPM_CONFIG_GLOBALCONFIG: path.join(privateDir, 'empty-global.npmrc'),
      NPM_CONFIG_CACHE: path.join(privateDir, 'npm-cache'), NPM_CONFIG_OFFLINE: 'true', NPM_CONFIG_UPDATE_NOTIFIER: 'false' };
    const args = [npm, 'run', 'release:schema:promote', '--', record.config.artifact, record.emitted.sha256];
    const began = Date.now(), chunks = []; let childPid, timedOut = false;
    const outcome = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { cwd: record.target.candidate, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); childPid = child.pid;
      const timer = setTimeout(() => { timedOut = true; if (child.pid) spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { env: osEnv, windowsHide: true, stdio: 'ignore' }); }, 300000);
      child.stdout.on('data', bytes => chunks.push(bytes)); child.stderr.on('data', bytes => chunks.push(bytes));
      child.once('error', error => { clearTimeout(timer); reject(error); }); child.once('close', (code, signal) => { clearTimeout(timer); resolve({ exitCode: code, signal }); });
    });
    const output = clean(Buffer.concat(chunks).toString('utf8')); fs.writeFileSync(path.join(evidence, 'actual-npm-cli.log'), output, { flag: 'wx' });
    write('actual-npm-cli.execution.json', { executable: process.execPath, args, cwd: record.target.candidate, began: new Date(began).toISOString(), ended: new Date().toISOString(), elapsedMs: Date.now() - began, pid: childPid, timedOut, ...outcome });
    assert(!timedOut); assert.equal(outcome.exitCode, 1); assert(output.includes('Explicit safe migration target required: database_target_is_local'));
    assert(!output.includes('Release secret preflight blocked'), 'Refusal must come from the reviewed localhost gate before delivery configuration');
    const coverageFiles = fs.readdirSync(coverage).filter(name => name.endsWith('.json')).map(name => path.join(coverage, name)); assert(coverageFiles.length > 0);
    const scripts = coverageFiles.flatMap(file => read(file).result).filter(script => script.url.startsWith('file:'));
    const functions = (relative, name) => scripts.filter(script => path.resolve(fileURLToPath(script.url)).toLowerCase() === path.join(record.target.candidate, relative).toLowerCase())
      .flatMap(script => script.functions).filter(fn => fn.functionName === name).map(fn => fn.ranges[0].count);
    const promoted = functions('scripts/promote-release-schema.cjs', 'promote'), locked = functions('scripts/promote-release-schema.cjs', 'withMigrationLock');
    const verified = functions('scripts/release-artifact.cjs', 'verify'), migrated = functions('scripts/release-artifact.cjs', 'runScript');
    assert(promoted.length > 0 && promoted.every(count => count === 1)); assert(verified.length > 0 && verified.every(count => count === 1));
    assert(locked.length > 0 && locked.every(count => count === 0)); assert(migrated.length > 0 && migrated.every(count => count === 0));
    write('native-v8-call-evidence.json', { observation: 'Built-in V8 function coverage; no replacement verify/client/process APIs or injected production options', promoteCalls: promoted, actualArtifactVerifyCalls: verified, withMigrationLockCalls: locked, migrationRunScriptCalls: migrated,
      privateCoverageFiles: coverageFiles.map(file => ({ path: file, sha256: digest(file), bytes: fs.statSync(file).size })) });
    assert.equal(status(record.database), 3, 'Refusal must leave the owned cluster stopped'); assert.equal(digest(path.join(record.config.artifact, 'artifact.json')), record.emitted.sha256);
    for (const file of record.sourceBinding) assert.equal(digest(path.join(record.target.candidate, file.path)), file.sha256, 'Promotion CLI changed source');
    report.checks.push({ name: 'Actual named npm command rejects localhost after trusted artifact verification', passed: true, exitCode: 1, refusal: 'database_target_is_local' });
    report.checks.push({ name: 'Native coverage proves exported lock and migration child launcher were never called', passed: true, lockCalls: 0, migrationLauncherCalls: 0, actualArtifactVerificationCalls: 1 });
    report.ownedClusterStoppedBeforeAndAfter = true; report.databasePromoted = false; report.applicationDeployed = false; report.passed = true;
  } catch (error) { report.failure = clean(error.message); throw error; }
  finally {
    report.ended = new Date().toISOString(); write('RESULT.json', report);
    if (report.passed) fs.writeFileSync(path.join(__dirname, 'LOCALHOST_PROMOTION_REFUSAL.json'), JSON.stringify({ evidenceDirectory: evidence, ...report }, null, 2) + '\n', { flag: 'wx' });
  }
}
if (process.argv.length !== 3 || process.argv[2] !== 'run') throw Error('Expected reviewed run after successful artifact and stopped-cluster handoff');
run().catch(error => { console.error(clean(error.message)); process.exitCode = 1; });
