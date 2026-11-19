// Preparation/run entry points for root-reviewed, local-only release qualification.
// Never executes when imported. Owns a fresh database, temporary TLS/server files,
// actual Better Auth sessions and a clearly unassessed synthetic DRAFT close run.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), dns = require('node:dns'), net = require('node:net');
const http = require('node:http'), https = require('node:https');
const { spawn, spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { Client } = require('pg');

const root = path.resolve(__dirname, '../../../..');
const bin = 'C:/Program Files/PostgreSQL/17/bin';
const origin = 'https://127.0.0.1:3443', actionRoute = '/en/dashboard/accounting/close';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const file = name => path.join(__dirname, name);
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const write = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const osEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
function sanitizeProcessEnvironment() {
  const allowed = osEnv();
  for (const key of Object.keys(process.env)) if (!Object.hasOwn(allowed, key)) delete process.env[key];
}

function noLinks(absolute) {
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Linked target paths are refused');
  }
}
function inputs() {
  const { target: candidate, manifest } = require('./candidate-validation.cjs').verifyCandidate();
  const database = read(file('DATABASE_TARGET.json')), planned = read(file('ARTIFACT_BUILD_TARGET.json'));
  const owned = fs.realpathSync(path.join(root, '.codex-tmp'));
  noLinks(candidate.directory); noLinks(database.directory);
  assert.equal(path.dirname(fs.realpathSync(candidate.directory)), owned);
  assert.equal(path.dirname(fs.realpathSync(database.directory)), owned);
  assert.match(path.basename(database.directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/);
  assert.equal(database.clusterDirectory, database.directory);
  assert.equal(database.host, 'localhost'); assert.equal(database.port, 58033); assert.equal(database.user, 'sales_release_fixture');
  assert.equal(database.sourceManifestSha256, manifest.manifestSha256, 'Database target belongs to another source candidate');
  assert.equal(candidate.candidate, path.join(candidate.directory, 'candidate'));
  assert.equal(planned.candidate, candidate.candidate);
  assert.equal(planned.sourceManifestSha256, manifest.manifestSha256, 'Build target belongs to another source candidate');
  for (const directory of [candidate.candidate, path.join(candidate.candidate, 'prisma')]) {
    assert.ok(fs.readdirSync(directory).every(name => !/^\.env(?:\.|$)/i.test(name)), 'Environment files are refused in the migration source');
  }
  const privateFile = path.join(candidate.directory, 'build-private/environment.private.json');
  assert.equal(planned.privateConfiguration, privateFile); noLinks(privateFile);
  const config = read(privateFile);
  for (const item of [planned, config]) {
    assert.equal(item.candidate, candidate.candidate); assert.equal(item.artifact, planned.artifact);
    assert.equal(item.origin, origin); assert.equal(item.httpPort, 3296); assert.equal(item.tlsPort, 3443);
  }
  for (const name of ['STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS', 'STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS', 'STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS']) assert.equal(config.environment[name], '0', 'Live delivery must remain disabled');
  for (const name of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) assert.ok(!config.environment[name], 'Live provider credential refused');
  return { candidate, manifest, database, config, privateFile };
}

function prepare() {
  assert.ok(!fs.existsSync(file('RUNTIME_HTTP_TARGET.json')), 'Refusing to replace runtime target');
  const input = inputs(), id = crypto.randomBytes(5).toString('hex');
  const directory = path.join(input.candidate.directory, `runtime-http-${id}`); fs.mkdirSync(directory);
  const openssl = 'C:/Program Files/Git/mingw64/bin/openssl.exe'; assert.ok(fs.existsSync(openssl), 'Reviewed native OpenSSL executable absent');
  const tlsConfig = path.join(directory, 'openssl.cnf'), key = path.join(directory, 'localhost.key'), cert = path.join(directory, 'localhost.crt');
  fs.writeFileSync(tlsConfig, '[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ext\n[dn]\nCN=127.0.0.1\n[ext]\nsubjectAltName=IP:127.0.0.1\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n', { flag: 'wx', mode: 0o600 });
  const generated = spawnSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '1', '-config', tlsConfig, '-keyout', key, '-out', cert],
    { cwd: directory, env: osEnv(), windowsHide: true, encoding: 'utf8', timeout: 30000 });
  fs.writeFileSync(path.join(directory, 'tls-generation.log'), (generated.stdout || '') + (generated.stderr || ''), { flag: 'wx', mode: 0o600 });
  assert.equal(generated.status, 0, 'Private TLS generation failed');
  fs.mkdirSync(path.join(directory, 'temp'));
  const record = { directory, clusterDirectory: input.database.directory, host: input.database.host, port: input.database.port, user: input.database.user,
    database: `stoquify_runtime_close_20261109_${id}`, candidate: input.candidate.candidate,
    artifact: input.config.artifact, privateConfiguration: input.privateFile, origin, httpPort: 3296, tlsPort: 3443, key, cert,
    fixtureCredentials: path.join(directory, 'fixture.private.json'), certificateSha256: sha(fs.readFileSync(cert)), runnerSha256: sha(fs.readFileSync(__filename)),
    networkPreloadSha256: sha(fs.readFileSync(path.join(input.candidate.candidate, 'scripts/local-gates-network.cjs'))),
    sourceManifestSha256: input.manifest.manifestSha256, createdAt: new Date().toISOString(),
    classification: 'Private runtime target and TLS preparation only; no database, application, session or financial operation' };
  write(file('RUNTIME_HTTP_TARGET.json'), record);
  console.log('Prepared private close runtime target; no database or application execution.');
}
function load() {
  const input = inputs(), record = read(file('RUNTIME_HTTP_TARGET.json'));
  noLinks(record.directory);
  assert.equal(path.dirname(fs.realpathSync(record.directory)), fs.realpathSync(input.candidate.directory));
  assert.match(path.basename(record.directory), /^runtime-http-[a-f0-9]{10}$/);
  assert.equal(record.database, `stoquify_runtime_close_20261109_${path.basename(record.directory).slice(-10)}`);
  for (const name of ['host', 'port', 'user']) assert.equal(record[name], input.database[name]);
  assert.equal(record.clusterDirectory, input.database.directory); assert.equal(record.candidate, input.candidate.candidate);
  assert.equal(record.artifact, input.config.artifact); assert.equal(record.privateConfiguration, input.privateFile);
  assert.equal(record.origin, origin); assert.equal(record.httpPort, 3296); assert.equal(record.tlsPort, 3443);
  for (const [key, name] of [['fixtureCredentials', 'fixture.private.json'], ['key', 'localhost.key'], ['cert', 'localhost.crt']]) assert.equal(record[key], path.join(record.directory, name));
  assert.equal(record.certificateSha256, sha(fs.readFileSync(record.cert)));
  assert.equal(record.runnerSha256, sha(fs.readFileSync(__filename)), 'Runtime harness changed after preparation');
  assert.equal(record.networkPreloadSha256, sha(fs.readFileSync(path.join(record.candidate, 'scripts/local-gates-network.cjs'))));
  assert.equal(record.sourceManifestSha256, input.manifest.manifestSha256);
  return { ...input, record };
}
async function freePort(port) {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  await new Promise(resolve => server.close(resolve));
}
function pgClient(record, database) {
  return new Client({ host: record.host, port: record.port, user: record.user, password: async () => '', database, ssl: false, connectionTimeoutMillis: 5000,
    options: '-c search_path=public -c statement_timeout=30000 -c lock_timeout=5000' });
}
async function identity(client, record, database) {
  const { rows: [row] } = await client.query(`SELECT current_database() AS database,current_user AS actor,current_setting('data_directory') AS directory,
    host(inet_server_addr()) AS address,inet_server_port() AS port`);
  assert.equal(row.database, database); assert.equal(row.actor, record.user); assert.equal(row.port, record.port);
  assert.ok(['127.0.0.1', '::1'].includes(row.address));
  assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(record.clusterDirectory, 'data')).toLowerCase());
}
function command(record, label, executable, args, cwd, env, pgControl = false) {
  const result = spawnSync(executable, args, { cwd, env, windowsHide: true, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024, ...(pgControl ? { stdio: 'ignore' } : {}) });
  fs.writeFileSync(path.join(record.directory, label + '.log'), ((result.stdout || '') + (result.stderr || '')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_RUNTIME_DATABASE]'), { flag: 'wx', mode: 0o600 });
  write(file(`runtime-http-${label}.execution.json`), { executable, args, cwd, utc: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null, ...(pgControl ? { stdio: 'ignore' } : {}) });
  assert.equal(result.status, 0, `${label} failed; inspect private retained log`);
}
function ownedPostmaster(record, startAttemptAt) {
  const dataDirectory = path.join(record.clusterDirectory, 'data'), pidFile = path.join(dataDirectory, 'postmaster.pid');
  noLinks(dataDirectory); noLinks(pidFile);
  const lines = fs.readFileSync(pidFile, 'utf8').split(/\r?\n/);
  const pid = Number(lines[0]), startedAtSeconds = Number(lines[2]);
  assert.ok(Number.isSafeInteger(pid) && pid > 1, 'Owned PostgreSQL PID missing');
  assert.equal(fs.realpathSync(lines[1]).toLowerCase(), fs.realpathSync(dataDirectory).toLowerCase());
  assert.equal(Number(lines[3]), record.port); assert.equal(lines[5], '127.0.0.1');
  assert.ok(Number.isSafeInteger(startedAtSeconds) && startedAtSeconds >= Math.floor(startAttemptAt / 1000) - 1 && startedAtSeconds <= Math.floor(Date.now() / 1000) + 1, 'Postmaster predates this start attempt');
  assert.equal(process.platform, 'win32', 'This reviewed native process probe is Windows-only');
  const powershell = path.join(process.env.SYSTEMROOT || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const probe = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command',
    `Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress`],
  { env: osEnv(), windowsHide: true, encoding: 'utf8', timeout: 30000 });
  assert.equal(probe.status, 0, 'Owned postmaster process inspection failed');
  const actual = JSON.parse(probe.stdout.trim());
  assert.equal(actual.ProcessId, pid);
  assert.equal(fs.realpathSync(actual.ExecutablePath).toLowerCase(), fs.realpathSync(path.join(bin, 'postgres.exe')).toLowerCase());
  const dataArg = /(?:^|\s)(?:"-D"|-D)\s+(?:"([^"]+)"|(\S+))/.exec(actual.CommandLine);
  assert.ok(dataArg, 'Postmaster data-directory argument missing');
  assert.equal(fs.realpathSync(dataArg[1] || dataArg[2]).toLowerCase(), fs.realpathSync(dataDirectory).toLowerCase());
  return { pid, startedAtSeconds };
}

function request(record, route, { method = 'GET', body, cookie, actionId, timeoutMs = 90000 } = {}) {
  const url = new URL(route, record.origin);
  assert.equal(url.origin, origin, 'TLS exception is restricted to the owned origin');
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 180000);
  if (actionId) { assert.equal(method, 'POST'); assert.equal(route, actionRoute); assert.match(actionId, /^[a-f0-9]{40,64}$/); }
  const bytes = body === undefined ? null : Buffer.from(JSON.stringify(body)), started = Date.now();
  return new Promise((resolve, reject) => {
    const fail = error => { error.runtimeRequest = { method, path: url.pathname, elapsedMs: Date.now() - started, timeoutMs }; reject(error); };
    const req = https.request(url, { method, agent: false, rejectUnauthorized: false, timeout: timeoutMs,
      headers: { origin, referer: origin + actionRoute, connection: 'close',
        ...(bytes ? { 'content-type': actionId ? 'text/plain;charset=UTF-8' : 'application/json', 'content-length': bytes.length } : {}),
        ...(actionId ? { 'next-action': actionId, accept: 'text/x-component' } : {}), ...(cookie ? { cookie } : {}) } }, res => {
      const chunks = []; let length = 0;
      res.on('data', chunk => { length += chunk.length; if (length > 8 * 1024 * 1024) { req.destroy(new Error('Runtime response exceeds bounded limit')); return; } chunks.push(chunk); });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'), elapsedMs: Date.now() - started }));
      res.on('error', fail);
    });
    req.on('error', fail); req.on('timeout', () => req.destroy(new Error('Owned runtime request timed out')));
    if (bytes) req.write(bytes); req.end();
  });
}
function createTlsProxy(record) {
  return https.createServer({ key: fs.readFileSync(record.key), cert: fs.readFileSync(record.cert) }, (req, res) => {
    const upstream = http.request({ hostname: '127.0.0.1', port: record.httpPort, path: req.url, method: req.method, agent: false,
      headers: { ...req.headers, host: `127.0.0.1:${record.tlsPort}`, 'x-forwarded-host': `127.0.0.1:${record.tlsPort}`, 'x-forwarded-proto': 'https', connection: 'close' } }, answer => {
      res.writeHead(answer.statusCode, answer.headers); answer.pipe(res);
    });
    upstream.setTimeout(180000, () => upstream.destroy(new Error('Owned proxy deadline exceeded')));
    upstream.on('error', () => { if (!res.headersSent) { res.statusCode = 502; res.end('Owned runtime not ready'); } else res.destroy(); });
    req.on('aborted', () => upstream.destroy()); res.on('close', () => { if (!res.writableEnded) upstream.destroy(); }); req.pipe(upstream);
  });
}
function actionIds(record) {
  const manifest = read(path.join(record.artifact, 'runtime/.next/server/server-reference-manifest.json'));
  const worker = 'app/[locale]/(dashboard)/dashboard/accounting/close/page';
  const names = ['runCloseAssuranceAction', 'assignCloseFindingAction', 'commentOnCloseFindingAction', 'requestCloseWaiverAction', 'approveCloseWaiverAction',
    'updateAccountantReviewAction', 'exportDraftClosePackAction', 'exportCertifiedClosePackAction', 'stepUpWithPasswordAction'];
  return Object.fromEntries(names.map(name => {
    const suffix = name === 'stepUpWithPasswordAction' ? '/actions/security/step-up-auth.actions.ts' : '/actions/accounting/close-assurance.actions.ts';
    const entries = Object.entries(manifest.node).filter(([, item]) => item.exportedName === name && item.filename.replaceAll('\\', '/').endsWith(suffix) && item.workers[worker]);
    assert.equal(entries.length, 1, `Expected one sealed close-page action mapping for ${name}`);
    assert.match(entries[0][0], /^[a-f0-9]{40,64}$/); return [name, entries[0][0]];
  }));
}
// Only decode the bounded, JSON-valued action result linked from Flight root.a.
// Never treat unrelated streamed page strings or HTTP 200 as an action result.
function actionResult(answer) {
  assert.equal(answer.status, 200, 'Expected a handled Next action response');
  assert.match(answer.headers['content-type'] || '', /^text\/x-component(?:;|$)/);
  assert.ok(!answer.headers['x-nextjs-action-not-found'], 'Built action ID was not registered');
  const rows = new Map(answer.body.split('\n').filter(Boolean).map(line => {
    const colon = line.indexOf(':'); return [line.slice(0, colon), line.slice(colon + 1)];
  }));
  const rootRow = JSON.parse(rows.get('0') || 'null');
  assert.match(rootRow?.a || '', /^\$@[a-f0-9]+$/);
  const result = JSON.parse(rows.get(rootRow.a.slice(2)) || 'null');
  assert.equal(typeof result?.success, 'boolean', 'Structured action outcome missing');
  return result;
}
async function invoke(record, ids, cookie, name, input) {
  assert.ok(ids[name], 'Unknown qualification action');
  const answer = await request(record, actionRoute, { method: 'POST', actionId: ids[name], body: [input], cookie });
  return { answer, result: actionResult(answer) };
}
async function terminateOwned(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') spawnSync(path.join(process.env.SYSTEMROOT || 'C:/Windows', 'System32/taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { env: osEnv(), windowsHide: true, stdio: 'ignore' });
  else child.kill('SIGTERM');
  if (child.exitCode === null && child.signalCode === null) await new Promise(resolve => { child.once('exit', resolve); const timer = setTimeout(resolve, 10000); child.once('exit', () => clearTimeout(timer)); });
  assert.ok(child.exitCode !== null || child.signalCode !== null, 'Owned application child did not stop');
}

async function seedFixture(record, db, requireCandidate) {
  const id = path.basename(record.directory).slice(-10), organizationId = `runtime-close-${id}`, userId = `${organizationId}-operator`;
  const modules = ['dashboard', 'accounting', 'close_assurance', 'finance', 'reports'];
  const permissions = ['dashboard.read', 'accounting.close.read', 'accounting.close.run', 'accounting.close.finding.assign', 'accounting.close.finding.comment',
    'accounting.close.waiver.request', 'accounting.close.waiver.approve', 'accounting.close.accountant.review', 'accounting.close.export', 'accounting.close.certify',
    'accounting.period.read', 'accounting.reports.read'];
  const email = `runtime-close-${id}@stoquify.invalid`, password = `Synthetic-${crypto.randomBytes(24).toString('base64url')}!`;
  const argon2 = requireCandidate('argon2'), hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await db.organization.create({ data: { id: organizationId, name: 'Synthetic close runtime qualification', slug: organizationId,
    country: 'Cameroon', countryCode: 'CM', currency: 'XAF', timezone: 'Africa/Douala', requestedModules: modules, onboardingCompletedAt: new Date() } });
  await db.tenantModuleConfiguration.create({ data: { organizationId, revision: 1, activeRevision: 1, selectedModules: modules, activeModules: modules,
    manifestHash: sha(JSON.stringify({ purpose: 'close-runtime-only', modules })) } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId, moduleSlug, status: 'active', source: 'manual_override', metadata: { syntheticFixture: true } })) });
  const role = await db.role.create({ data: { organizationId, code: 'SYNTHETIC_CLOSE_OPERATOR', nameEn: 'Synthetic close operator', nameFr: 'Test cloture', permissions } });
  await db.user.create({ data: { id: userId, organizationId, name: 'Synthetic close operator', email, emailVerified: true, isVerified: true, mfaBackupCodes: [], roles: { connect: { id: role.id } } } });
  await db.account.create({ data: { userId, accountId: userId, providerId: 'credential', password: hash } });
  const year = new Date().getUTCFullYear();
  const fiscalYear = await db.fiscalYear.create({ data: { organizationId, name: `Synthetic FY ${year}`, startDate: new Date(Date.UTC(year, 0, 1)), endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) } });
  const period = await db.accountingPeriod.create({ data: { organizationId, fiscalYearId: fiscalYear.id, periodNumber: 1, name: 'Synthetic open period', startDate: fiscalYear.startDate, endDate: fiscalYear.endDate } });
  const run = await db.closeRun.create({ data: { organizationId, periodId: period.id, status: 'DRAFT', readinessScore: 0, runById: userId,
    metadata: { syntheticFixture: true, unassessed: true, purpose: 'Comment authority HTTP fixture only; no readiness or certification claim' } } });
  assert.equal(await db.session.count(), 0, 'Fixture must not fabricate authentication sessions');
  return { organizationId, userId, email, password, periodId: period.id, closeRunId: run.id, permissions,
    classification: 'Synthetic setup only: an explicitly unassessed DRAFT run. Actual comment mutation and authentication use HTTP.' };
}
async function businessSnapshot(db, organizationId) {
  const where = { organizationId }, orderBy = { id: 'asc' };
  return JSON.stringify({
    runs: await db.closeRun.findMany({ where, orderBy }), findings: await db.closeAssuranceFinding.findMany({ where, orderBy }),
    comments: await db.accountantComment.findMany({ where, orderBy }), reviews: await db.accountantReview.findMany({ where, orderBy }),
    exports: await db.closePackExport.findMany({ where, orderBy }), events: await db.businessEvent.findMany({ where, orderBy }),
  });
}

async function execute() {
  const { record, database, config, manifest } = load();
  assert.ok(!fs.existsSync(file('RUNTIME_HTTP_RESULT.json')), 'Refusing to overwrite runtime evidence');
  assert.ok(!fs.existsSync(record.fixtureCredentials), 'Refusing to reuse a seeded runtime fixture');
  const qualified = read(file('ARTIFACT_QUALIFICATION.json')), emitted = read(file('ARTIFACT_EMITTED_DIGEST.json'));
  assert.equal(qualified.passed, true); assert.equal(qualified.fullBuildAndTrustedDigestVerificationPassed, true);
  assert.equal(qualified.artifact, record.artifact); assert.equal(qualified.artifactSha256, emitted.sha256); assert.equal(emitted.destination, record.artifact);
  assert.equal(qualified.sourceManifestSha256, manifest.manifestSha256);
  assert.equal(qualified.buildId, emitted.buildId);
  process.chdir(path.dirname(record.candidate));
  const requireCandidate = createRequire(path.join(record.candidate, 'package.json'));
  const release = requireCandidate(path.join(record.candidate, 'scripts/release-artifact.cjs'));
  const verify = () => { const sealed = release.verify(record.candidate, record.artifact, emitted.sha256); return { sha256: emitted.sha256, buildId: sealed.buildId, files: sealed.files.length }; };
  const report = { passed: false, startedAt: new Date().toISOString(), origin, database: record.database, artifact: record.artifact,
    sourceManifestSha256: manifest.manifestSha256, certificateSha256: record.certificateSha256, checks: [],
    evidenceClass: 'Real loopback HTTPS requests to the newly sealed standalone artifact, real Better Auth sessions, and fresh isolated PostgreSQL persistence; no browser',
    limitations: ['Synthetic local configuration, organization, role and unassessed DRAFT close-run fixture; no financial workflow, readiness certification, statutory certification or deployment.',
      'Session assurance expiry is injected only after actual password step-up by aging the owned persisted timestamp; no positive assurance or session is fabricated.',
      'Module suspension is an explicit synthetic persisted authority mutation for denial testing; no production module configuration is touched.',
      'Only the owned loopback self-signed origin accepts a private TLS exception. SSR source is checked without browser/rendered accessibility claims.'] };
  report.artifactBefore = verify();
  const ids = actionIds(record); report.actionIds = ids;
  const pgData = path.join(database.directory, 'data'); noLinks(pgData);
  assert.equal(spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', pgData, 'status'], { env: osEnv(), windowsHide: true, stdio: 'ignore' }).status, 3, 'Wait for exclusive stopped cluster handoff');
  assert.ok(!fs.existsSync(path.join(pgData, 'postmaster.pid')), 'A retained postmaster PID requires separate inspection before runtime start');
  await freePort(record.httpPort); await freePort(record.tlsPort);
  let started = false, startAttemptAt, postmaster, db, child, proxy, stdout, stderr, cookie;
  try {
    startAttemptAt = Date.now();
    command(record, 'pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', pgData, '-l', path.join(record.clusterDirectory, 'postgres.log'), '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start'], record.directory, osEnv(), true);
    started = true;
    postmaster = ownedPostmaster(record, startAttemptAt); report.postmaster = postmaster;
    const admin = pgClient(record, 'postgres'); await admin.connect();
    try { await identity(admin, record, 'postgres'); assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [record.database])).rowCount, 0, 'Refusing an existing runtime database'); await admin.query(`CREATE DATABASE "${record.database}"`); }
    finally { await admin.end(); }
    const databaseUrl = `postgresql://${record.user}@localhost:${record.port}/${record.database}?schema=public`;
    const nodeOptions = [config.environment.NODE_OPTIONS || '', '--dns-result-order=ipv4first', '--require ' + JSON.stringify(path.join(record.candidate, 'scripts/local-gates-network.cjs'))].filter(Boolean).join(' ');
    const env = { ...osEnv(), ...config.environment, NODE_ENV: 'production', NODE_OPTIONS: nodeOptions, HOSTNAME: '127.0.0.1', PORT: String(record.httpPort),
      DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl, SHADOW_DATABASE_URL: databaseUrl, NEXT_TELEMETRY_DISABLED: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1',
      TMP: path.join(record.directory, 'temp'), TEMP: path.join(record.directory, 'temp') };
    command(record, 'migrations', process.execPath, [path.join(record.candidate, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], record.candidate, { ...env, NODE_ENV: 'test' });
    const sql = pgClient(record, record.database); await sql.connect();
    try {
      await identity(sql, record, record.database);
      const migrations = manifest.files.filter(item => /^prisma\/migrations\/[^/]+\/migration\.sql$/.test(item.path)).sort((a, b) => a.path.localeCompare(b.path));
      const history = (await sql.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(migrations.length, 121); assert.equal(history.length, migrations.length);
      history.forEach((row, i) => { assert.equal(row.migration_name, migrations[i].path.split('/')[2]); assert.equal(row.checksum, migrations[i].sha256); assert.ok(row.finished_at && !row.rolled_back_at); });
      report.migrations = { count: history.length, historySha256: sha(JSON.stringify(history.map(({ migration_name, checksum }) => ({ migration_name, checksum })))) };
    } finally { await sql.end(); }
    const { PrismaClient } = requireCandidate('@prisma/client');
    assert.ok(fs.realpathSync(requireCandidate.resolve('@prisma/client')).startsWith(fs.realpathSync(path.join(record.candidate, 'node_modules')) + path.sep));
    db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const fixture = await seedFixture(record, db, requireCandidate); write(record.fixtureCredentials, fixture);
    report.fixture = { organizationId: fixture.organizationId, userId: fixture.userId, periodId: fixture.periodId, closeRunId: fixture.closeRunId, classification: fixture.classification };
    stdout = fs.openSync(path.join(record.directory, 'application.stdout.log'), 'wx'); stderr = fs.openSync(path.join(record.directory, 'application.stderr.log'), 'wx');
    child = spawn(process.execPath, [path.join(record.artifact, 'runtime/server.js')], { cwd: record.directory, env, windowsHide: true, stdio: ['ignore', stdout, stderr] });
    let childError = null; child.on('error', error => { childError = error; }); report.applicationPid = child.pid;
    proxy = createTlsProxy(record); await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(record.tlsPort, '127.0.0.1', resolve); });
    let ready = false; const readyDeadline = Date.now() + 120000;
    while (Date.now() < readyDeadline) {
      assert.ok(!childError && child.exitCode === null, 'Standalone runtime exited before readiness');
      try { const answer = await request(record, '/favicon.ico', { timeoutMs: 10000 }); if (answer.status === 200) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.ok(ready, 'Sealed application readiness failed; inspect private log');
    const warmup = await request(record, '/api/auth/get-session?disableCookieCache=true', { timeoutMs: 180000 });
    assert.equal(warmup.status, 200); assert.ok(!JSON.parse(warmup.body)?.user); assert.equal(await db.session.count(), 0);
    const signed = await request(record, '/api/auth/sign-in/email', { method: 'POST', body: { email: fixture.email, password: fixture.password } });
    assert.equal(signed.status, 200); assert.equal(JSON.parse(signed.body).user.id, fixture.userId);
    const cookies = signed.headers['set-cookie'] || [], sessionCookies = cookies.filter(value => value.split(';')[0].split('=')[0].includes('session'));
    assert.ok(sessionCookies.length > 0 && sessionCookies.every(value => /;\s*Secure(?:;|$)/i.test(value)));
    cookie = cookies.map(value => value.split(';')[0]).join('; '); assert.ok(cookie.length > 0);
    const sessionAnswer = await request(record, '/api/auth/get-session?disableCookieCache=true', { cookie });
    const actualSession = JSON.parse(sessionAnswer.body); assert.equal(actualSession.user.id, fixture.userId);
    const sessionId = actualSession.session.id;
    assert.equal(await db.session.count({ where: { id: sessionId, userId: fixture.userId } }), 1);
    report.checks.push({ name: 'actual-sign-in', httpStatus: signed.status, secureSessionCookie: true, persistedSession: true, cookieValuesRecorded: false });
    const page = await request(record, actionRoute, { cookie });
    assert.equal(page.status, 200); assert.match(page.body, /Close (?:&amp;|&) Assurance Center/); assert.match(page.body, /dashboard-main-content/);
    report.checks.push({ name: 'authenticated-close-SSR', httpStatus: page.status, bytes: Buffer.byteLength(page.body), sha256: sha(page.body), browserRendered: false });

    const commentInput = { closeRunId: fixture.closeRunId, body: 'Synthetic authenticated release authority comment', correlationId: `runtime-positive-${fixture.organizationId}`,
      actorId: 'untrusted-spoofed-actor', session: { id: 'untrusted-id', token: 'untrusted-token' } };
    const positive = await invoke(record, ids, cookie, 'commentOnCloseFindingAction', commentInput);
    assert.equal(positive.result.success, true); assert.equal(positive.result.status, 200);
    const savedComment = await db.accountantComment.findUnique({ where: { id: positive.result.data.id } });
    assert.equal(savedComment.authorId, fixture.userId); assert.equal(savedComment.closeRunId, fixture.closeRunId); assert.equal(savedComment.body, commentInput.body);
    report.checks.push({ name: 'positive-comment', action: 'commentOnCloseFindingAction', httpStatus: positive.answer.status, status: positive.result.status, persistedAuthorBoundToActualSession: true, clientAuthorityIgnored: true });
    const stepUp = async () => {
      const answer = await invoke(record, ids, cookie, 'stepUpWithPasswordAction', { password: fixture.password });
      assert.equal(answer.result.success, true); assert.equal(answer.result.data.method, 'password');
      const persisted = await db.session.findUnique({ where: { id: sessionId } });
      assert.equal(persisted.assuranceMethod, 'password'); assert.equal(persisted.assuranceOrganizationId, fixture.organizationId); assert.equal(persisted.assuranceLevel, 1); assert.ok(persisted.assuranceVerifiedAt);
      return persisted.assuranceVerifiedAt;
    };
    await stepUp();
    report.checks.push({ name: 'actual-password-step-up', persistedOrganizationBoundProof: true, fabricatedPositiveAssurance: false });
    const missingFinding = `missing-finding-${fixture.organizationId}`;
    const actions = [
      ['runCloseAssuranceAction', { periodId: fixture.periodId }], ['assignCloseFindingAction', { findingId: missingFinding, assignedToId: fixture.userId }],
      ['commentOnCloseFindingAction', commentInput], ['requestCloseWaiverAction', { findingId: missingFinding, reason: 'Synthetic denied waiver request' }],
      ['approveCloseWaiverAction', { findingId: missingFinding }], ['updateAccountantReviewAction', { closeRunId: fixture.closeRunId, status: 'APPROVED_FOR_CLOSE', decisionNotes: 'Synthetic denied review' }],
      ['exportDraftClosePackAction', { closeRunId: fixture.closeRunId }], ['exportCertifiedClosePackAction', { closeRunId: fixture.closeRunId }],
    ];
    const beforeDenied = await businessSnapshot(db, fixture.organizationId);
    await db.tenantModuleGrant.update({ where: { organizationId_moduleSlug: { organizationId: fixture.organizationId, moduleSlug: 'close_assurance' } }, data: { status: 'suspended', revision: { increment: 1 } } });
    for (const [name, input] of actions) {
      if (name === 'approveCloseWaiverAction' || name === 'exportCertifiedClosePackAction') await stepUp();
      const { answer, result } = await invoke(record, ids, cookie, name, input);
      assert.equal(result.success, false); assert.equal(result.code, 'FORBIDDEN'); assert.equal(result.status, 403);
      assert.equal(await businessSnapshot(db, fixture.organizationId), beforeDenied, 'Disabled module allowed a close business mutation');
      report.checks.push({ name: 'module-suspended', action: name, httpStatus: answer.status, status: result.status, code: result.code, businessRowsUnchanged: true });
    }
    await db.tenantModuleGrant.update({ where: { organizationId_moduleSlug: { organizationId: fixture.organizationId, moduleSlug: 'close_assurance' } }, data: { status: 'active', revision: { increment: 1 } } });
    await stepUp();
    await db.session.update({ where: { id: sessionId }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } });
    for (const [name, input] of actions.filter(([name]) => name === 'approveCloseWaiverAction' || name === 'exportCertifiedClosePackAction')) {
      const { answer, result } = await invoke(record, ids, cookie, name, { ...input, lastAuthAt: new Date().toISOString(), freshAuth: { assuranceLevel: 1, lastAuthAt: new Date().toISOString() } });
      assert.equal(result.success, false); assert.equal(result.code, 'FRESH_AUTH_REQUIRED'); assert.equal(result.status, 403);
      assert.equal(await businessSnapshot(db, fixture.organizationId), beforeDenied, 'Stale assurance allowed a close business mutation');
      report.checks.push({ name: 'stale-persisted-assurance', action: name, httpStatus: answer.status, status: result.status, code: result.code, businessRowsUnchanged: true, spoofedFreshnessIgnored: true });
    }
    const signedOut = await request(record, '/api/auth/sign-out', { method: 'POST', body: {}, cookie }); assert.equal(signedOut.status, 200);
    assert.equal(await db.session.count({ where: { userId: fixture.userId } }), 0);
    for (const [name, input] of actions) {
      const { answer, result } = await invoke(record, ids, cookie, name, input);
      assert.equal(result.success, false); assert.equal(result.code, 'AUTH_REQUIRED'); assert.equal(result.status, 401);
      assert.equal(await businessSnapshot(db, fixture.organizationId), beforeDenied, 'Revoked cookie allowed a close business mutation');
      report.checks.push({ name: 'revoked-old-cookie', action: name, httpStatus: answer.status, status: result.status, code: result.code, businessRowsUnchanged: true });
    }
    cookie = null;
    report.finalCounts = { comments: await db.accountantComment.count({ where: { organizationId: fixture.organizationId } }), exports: await db.closePackExport.count(),
      sessions: await db.session.count(), journals: await db.journalEntry.count(), sales: await db.salesOrder.count(), settlements: await db.customerSettlement.count() };
    assert.equal(report.finalCounts.comments, 1); assert.equal(report.finalCounts.exports, 0); assert.equal(report.finalCounts.sessions, 0);
    assert.equal(report.finalCounts.journals + report.finalCounts.sales + report.finalCounts.settlements, 0);
    report.passed = true;
  } catch (error) {
    report.failure = { name: error.name, code: error.code || null, request: error.runtimeRequest || null,
      message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_RUNTIME_DATABASE]') };
    process.exitCode = 1;
  } finally {
    if (cookie) await request(record, '/api/auth/sign-out', { method: 'POST', body: {}, cookie }).catch(() => undefined);
    if (proxy) await new Promise(resolve => proxy.close(resolve));
    try { await terminateOwned(child); report.applicationStopped = true; } catch { report.applicationStopped = false; report.passed = false; process.exitCode = 1; }
    if (stdout !== undefined) fs.closeSync(stdout); if (stderr !== undefined) fs.closeSync(stderr);
    if (db) await db.$disconnect().catch(() => undefined);
    if (startAttemptAt !== undefined) {
      try {
        const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', pgData, 'status'], { env: osEnv(), windowsHide: true, stdio: 'ignore' }).status;
        if (status !== 3 || fs.existsSync(path.join(pgData, 'postmaster.pid'))) {
          const actual = ownedPostmaster(record, startAttemptAt);
          if (postmaster) assert.deepEqual(actual, postmaster, 'Postmaster changed before cleanup');
          command(record, 'pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', pgData, '-m', 'fast', '-w', 'stop'], record.directory, osEnv(), true);
        }
        assert.equal(spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', pgData, 'status'], { env: osEnv(), windowsHide: true, stdio: 'ignore' }).status, 3);
        assert.ok(!fs.existsSync(path.join(pgData, 'postmaster.pid')));
        report.clusterStopped = true; report.partialStartCleanup = !started;
      }
      catch { report.clusterStopped = false; report.passed = false; process.exitCode = 1; }
    }
    try { report.artifactAfter = verify(); assert.deepEqual(report.artifactAfter, report.artifactBefore); report.artifactUnchanged = true; }
    catch { report.artifactUnchanged = false; report.passed = false; process.exitCode = 1; }
    report.finishedAt = new Date().toISOString(); write(file('RUNTIME_HTTP_RESULT.json'), report);
  }
  console.log(`New sealed artifact close HTTPS qualification ${report.passed ? 'passed' : 'failed'}; public evidence has no passwords or cookie values.`);
}

module.exports = { request, actionResult, actionIds, createTlsProxy, freePort };
if (require.main === module) {
  sanitizeProcessEnvironment();
  dns.setDefaultResultOrder('ipv4first');
  Promise.resolve().then(() => {
    assert.equal(process.argv.length, 3);
    if (process.argv[2] === 'prepare') return prepare();
    if (process.argv[2] === 'run') return execute();
    throw Error('Expected prepare or run');
  }).catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_RUNTIME_DATABASE]')); process.exitCode = 1; });
}
