// Reviewed local HTTP smoke preparation only until build + lock/restore pass.
// Uses the actual sealed standalone server and Better Auth endpoints. No browser,
// fabricated session, financial transaction seed, artifact edit or deployment.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), dns = require('node:dns'), net = require('node:net');
const http = require('node:http'), https = require('node:https');
const { spawn, spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { Client } = require('pg');
const { loadTarget } = require('./trigger-probes.cjs');
const root = path.resolve(__dirname, '../../../..');
const bin = 'C:/Program Files/PostgreSQL/17/bin';
const seedSource = path.join(root, 'docs/stoquify-potential/development/authenticated-sales-accounting-2026-11-08/fixture.cjs');
const seedSha256 = 'cb500d14a692e5491115c8aa7724e95854eaec087c423e0ce63398e0163536b4';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const file = name => path.join(__dirname, name);
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const write = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const osEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));

function inputs() {
  const { target: candidate, manifest } = require('./candidate-validation.cjs').verifyCandidate();
  const database = loadTarget(file('DATABASE_TARGET.json'));
  const planned = read(file('ARTIFACT_BUILD_TARGET.json'));
  assert.equal(planned.candidate, candidate.candidate);
  const privateFile = path.join(candidate.directory, 'build-private/environment.private.json');
  assert.equal(planned.privateConfiguration, privateFile);
  const config = read(privateFile);
  assert.equal(config.candidate, candidate.candidate); assert.equal(config.artifact, planned.artifact);
  assert.equal(config.origin, 'https://127.0.0.1:3443'); assert.equal(config.httpPort, 3296); assert.equal(config.tlsPort, 3443);
  for (const name of ['STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS', 'STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS', 'STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS']) assert.equal(config.environment[name], '0', 'Live delivery must remain disabled');
  for (const name of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) assert.ok(!config.environment[name], 'Live provider credential refused');
  assert.equal(sha(fs.readFileSync(seedSource)), seedSha256, 'Reviewed fixture source changed');
  return { candidate, manifest, database, config, privateFile };
}

function prepare() {
  assert.ok(!fs.existsSync(file('ARTIFACT_HTTP_SMOKE_TARGET.json')), 'Refusing to replace a smoke target');
  const input = inputs(), id = crypto.randomBytes(5).toString('hex');
  const directory = path.join(input.database.directory, `artifact-http-${id}`); fs.mkdirSync(directory);
  // Use Git's native Windows binary; its usr/bin peer requires an MSYS runtime.
  const openssl = 'C:/Program Files/Git/mingw64/bin/openssl.exe'; assert.ok(fs.existsSync(openssl), 'Reviewed local native OpenSSL executable absent');
  const tlsConfig = path.join(directory, 'openssl.cnf'), key = path.join(directory, 'localhost.key'), cert = path.join(directory, 'localhost.crt');
  fs.writeFileSync(tlsConfig, '[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ext\n[dn]\nCN=127.0.0.1\n[ext]\nsubjectAltName=IP:127.0.0.1\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n', { flag: 'wx' });
  const generated = spawnSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '1', '-config', tlsConfig, '-keyout', key, '-out', cert],
    { cwd: directory, env: osEnv(), windowsHide: true, encoding: 'utf8', timeout: 30000 });
  fs.writeFileSync(path.join(directory, 'tls-generation.log'), (generated.stdout || '') + (generated.stderr || ''), { flag: 'wx' });
  assert.equal(generated.status, 0, 'Private self-signed certificate generation failed');
  fs.copyFileSync(seedSource, path.join(directory, 'seed-fixture.cjs'), fs.constants.COPYFILE_EXCL);
  fs.mkdirSync(path.join(directory, 'temp'));
  const record = { directory, clusterDirectory: input.database.directory, host: input.database.host, port: input.database.port, user: input.database.user,
    database: `stoquify_local_artifact_http_20261109_${id}`, candidate: input.candidate.candidate,
    artifact: input.config.artifact, privateConfiguration: input.privateFile, origin: input.config.origin, httpPort: 3296, tlsPort: 3443,
    privateSeed: path.join(directory, 'seed-fixture.cjs'), fixtureCredentials: path.join(directory, 'fixture.private.json'), key, cert,
    certificateSha256: sha(fs.readFileSync(cert)), seedSha256, runnerSha256: sha(fs.readFileSync(__filename)),
    networkPreloadSha256: sha(fs.readFileSync(path.join(input.candidate.candidate, 'scripts/local-gates-network.cjs'))),
    tlsGenerator: { executable: openssl, sha256: sha(fs.readFileSync(openssl)), privateSelfSignedOnly: true },
    sourceManifestSha256: input.manifest.manifestSha256, createdAt: new Date().toISOString(),
    classification: 'Prepared new synthetic runtime database identity and private TLS files; no database or application operation' };
  write(file('ARTIFACT_HTTP_SMOKE_TARGET.json'), record);
  console.log('Prepared private HTTP smoke target/TLS; no database, server, session or financial operation.');
}

function load() {
  const input = inputs(), record = read(file('ARTIFACT_HTTP_SMOKE_TARGET.json'));
  assert.equal(path.dirname(fs.realpathSync(record.directory)), fs.realpathSync(input.database.directory));
  assert.match(path.basename(record.directory), /^artifact-http-[a-f0-9]{10}$/);
  assert.equal(record.clusterDirectory, input.database.directory); assert.equal(record.host, input.database.host); assert.equal(record.port, input.database.port); assert.equal(record.user, input.database.user);
  assert.equal(record.database, `stoquify_local_artifact_http_20261109_${path.basename(record.directory).slice(-10)}`);
  assert.equal(record.candidate, input.candidate.candidate); assert.equal(record.artifact, input.config.artifact); assert.equal(record.privateConfiguration, input.privateFile);
  assert.equal(record.origin, input.config.origin); assert.equal(record.httpPort, 3296); assert.equal(record.tlsPort, 3443);
  for (const [key, name] of [['privateSeed', 'seed-fixture.cjs'], ['fixtureCredentials', 'fixture.private.json'], ['key', 'localhost.key'], ['cert', 'localhost.crt']]) assert.equal(record[key], path.join(record.directory, name));
  assert.equal(sha(fs.readFileSync(record.privateSeed)), seedSha256); assert.equal(sha(fs.readFileSync(record.cert)), record.certificateSha256);
  assert.equal(record.runnerSha256, sha(fs.readFileSync(__filename)), 'Smoke harness changed after preparation');
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
  fs.writeFileSync(path.join(record.directory, label + '.log'), ((result.stdout || '') + (result.stderr || '')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_RUNTIME_DATABASE]'), { flag: 'wx' });
  write(file(`artifact-http-${label}.execution.json`), { executable, args, cwd, utc: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null, ...(pgControl ? { stdio: 'ignore' } : {}) });
  assert.equal(result.status, 0, `${label} failed; inspect private retained log`);
}
function request(record, route, { method = 'GET', body, cookie } = {}) {
  const url = new URL(route, record.origin);
  assert.equal(url.origin, 'https://127.0.0.1:3443', 'TLS exception is restricted to the owned self-signed origin');
  return new Promise((resolve, reject) => {
    const bytes = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = https.request(url, { method, agent: false, rejectUnauthorized: false, timeout: 20000,
      headers: { origin: record.origin, referer: record.origin + '/en/login', connection: 'close',
        ...(bytes ? { 'content-type': 'application/json', 'content-length': bytes.length } : {}), ...(cookie ? { cookie } : {}) } }, res => {
      const chunks = []; let length = 0;
      res.on('data', chunk => { length += chunk.length; if (length > 8 * 1024 * 1024) { req.destroy(new Error('HTTP response exceeds bounded smoke limit')); return; } chunks.push(chunk); });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('Owned HTTP request timed out')));
    if (bytes) req.write(bytes); req.end();
  });
}
async function terminateOwned(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') spawnSync(path.join(process.env.SYSTEMROOT || 'C:/Windows', 'System32/taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { env: osEnv(), windowsHide: true, stdio: 'ignore' });
  else child.kill('SIGTERM');
  if (child.exitCode === null && child.signalCode === null) await new Promise(resolve => { child.once('exit', resolve); const timer = setTimeout(resolve, 10000); child.once('exit', () => clearTimeout(timer)); });
  assert.ok(child.exitCode !== null || child.signalCode !== null, 'Owned application child did not stop');
}

async function execute() {
  const { record, database, config, manifest } = load();
  assert.equal(read(file('MIGRATION_REHEARSAL_RESULT.json')).passed, true);
  assert.equal(read(file('CANDIDATE_NATIVE_READINESS.json')).passed, true);
  const artifact = read(file('ARTIFACT_QUALIFICATION.json')), emitted = read(file('ARTIFACT_EMITTED_DIGEST.json'));
  assert.equal(artifact.fullBuildAndTrustedDigestVerificationPassed, true); assert.equal(artifact.syntheticPrivateConfigExclusionPassed, true);
  assert.equal(artifact.artifact, record.artifact); assert.equal(artifact.artifactSha256, emitted.sha256); assert.equal(emitted.destination, record.artifact);
  assert.equal(artifact.sourceManifestSha256, manifest.manifestSha256);
  assert.ok(!fs.existsSync(file('ARTIFACT_HTTP_SMOKE_RESULT.json')), 'Refusing to overwrite smoke evidence');
  assert.ok(!fs.existsSync(record.fixtureCredentials), 'Refusing to reuse a seeded runtime fixture');
  const requireCandidate = createRequire(path.join(record.candidate, 'package.json'));
  const release = requireCandidate(path.join(record.candidate, 'scripts/release-artifact.cjs'));
  const verify = () => { const sealed = release.verify(record.candidate, record.artifact, emitted.sha256); return { sha256: emitted.sha256, buildId: sealed.buildId, files: sealed.files.length }; };
  const report = { passed: false, startedAt: new Date().toISOString(), origin: record.origin, database: record.database,
    artifact: record.artifact, certificateSha256: record.certificateSha256, seedSha256, routes: [],
    evidenceClass: 'Real HTTPS client requests through private loopback TLS proxy to actual sealed standalone application and Better Auth endpoints; no browser',
    limitations: ['Synthetic configuration and roles; no provider operations, financial sale workflow, statutory certification or deployment.',
      'Private self-signed TLS is accepted only for https://127.0.0.1:3443 by this Node client; no global TLS validation override.',
      'Read-only protected-route SSR and actual credential/session/revocation checks; no rendered accessibility or full browser claim.'] };
  report.artifactBefore = verify();
  const secretNames = Object.keys(config.environment).filter(name => /^(AUTH_SECRET|NEXTAUTH_SECRET|BETTER_AUTH_SECRET|PUBLIC_IDENTITY_ABUSE_HASH_SECRET|DATABASE_URL|DIRECT_URL|SHADOW_DATABASE_URL)$/.test(name) || name.startsWith('AQSTOQFLOW_'));
  const needles = secretNames.map(name => { assert.ok(typeof config.environment[name] === 'string' && config.environment[name].length > 20, 'Expected private synthetic value'); return { name, bytes: Buffer.from(config.environment[name]) }; });
  const sealedFiles = [...read(path.join(record.artifact, 'artifact.json')).files.map(item => item.path), 'artifact.json'];
  const matchedNames = new Set();
  for (const relative of sealedFiles) {
    const bytes = fs.readFileSync(path.join(record.artifact, relative));
    for (const needle of needles) if (bytes.includes(needle.bytes)) matchedNames.add(needle.name);
  }
  assert.equal(matchedNames.size, 0, 'Private synthetic configuration found in sealed artifact');
  report.privateConfigScan = { passed: true, filesScanned: sealedFiles.length, variableNames: secretNames.sort(), privateValuesRecorded: false };
  const pgData = path.join(record.clusterDirectory, 'data');
  assert.equal(spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', pgData, 'status'], { env: osEnv(), windowsHide: true, stdio: 'ignore' }).status, 3, 'Wait for stopped cluster handoff');
  await freePort(record.httpPort); await freePort(record.tlsPort);
  let started = false, db, child, proxy, stdout, stderr, cookie;
  try {
    started = true;
    command(record, 'pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', pgData, '-l', path.join(record.clusterDirectory, 'postgres.log'), '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start'], record.directory, osEnv(), true);
    const admin = pgClient(record, 'postgres'); await admin.connect();
    try { await identity(admin, record, 'postgres'); assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [record.database])).rowCount, 0, 'Refusing existing runtime database'); await admin.query(`CREATE DATABASE "${record.database}"`); }
    finally { await admin.end(); }
    const databaseUrl = `postgresql://${record.user}@localhost:${record.port}/${record.database}?schema=public`;
    const nodeOptions = [config.environment.NODE_OPTIONS || '', '--dns-result-order=ipv4first', '--require ' + JSON.stringify(path.join(record.candidate, 'scripts/local-gates-network.cjs'))].filter(Boolean).join(' ');
    const env = { ...osEnv(), ...config.environment, NODE_ENV: 'production', NODE_OPTIONS: nodeOptions, HOSTNAME: '127.0.0.1', PORT: String(record.httpPort),
      DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl, SHADOW_DATABASE_URL: databaseUrl, TMP: path.join(record.directory, 'temp'), TEMP: path.join(record.directory, 'temp') };
    command(record, 'full-121-migrations', process.execPath, [path.join(record.candidate, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], database.migrationSource, { ...env, NODE_ENV: 'test' });
    const sql = pgClient(record, record.database); await sql.connect();
    try {
      await identity(sql, record, record.database);
      const history = (await sql.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
      const expected = read(file('MIGRATION_SOURCE_PROVENANCE.json')).migrations;
      assert.equal(history.length, 121); assert.equal(expected.length, 121);
      history.forEach((row, i) => { assert.equal(row.migration_name, expected[i].name); assert.equal(row.checksum, expected[i].rawSha256); assert.ok(row.finished_at && !row.rolled_back_at); });
      report.migrationCount = history.length; report.historySha256 = sha(JSON.stringify(history.map(({ migration_name, checksum }) => ({ migration_name, checksum }))));
    } finally { await sql.end(); }
    const { PrismaClient } = requireCandidate('@prisma/client');
    report.seedClient = requireCandidate.resolve('@prisma/client');
    assert.ok(fs.realpathSync(report.seedClient).startsWith(fs.realpathSync(path.join(record.candidate, 'node_modules')) + path.sep), 'Seed client must resolve from clean candidate installation');
    db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const fixture = await require(record.privateSeed).seedFixture({ root: record.candidate, db, id: path.basename(record.directory).slice(-10) });
    write(record.fixtureCredentials, fixture);
    report.fixture = { organizationId: fixture.organizationId, initialCounts: fixture.initialCounts,
      initialStock: fixture.initialStock, role: 'cashier', userId: fixture.users.cashier.userId };
    stdout = fs.openSync(path.join(record.directory, 'application.stdout.log'), 'wx'); stderr = fs.openSync(path.join(record.directory, 'application.stderr.log'), 'wx');
    child = spawn(process.execPath, [path.join(record.artifact, 'runtime/server.js')], { cwd: record.directory, env, windowsHide: true, stdio: ['ignore', stdout, stderr] });
    let childError = null; child.on('error', error => { childError = error; }); report.applicationPid = child.pid;
    proxy = https.createServer({ key: fs.readFileSync(record.key), cert: fs.readFileSync(record.cert) }, (req, res) => {
      const upstream = http.request({ hostname: '127.0.0.1', port: record.httpPort, path: req.url, method: req.method, agent: false,
        headers: { ...req.headers, host: `127.0.0.1:${record.tlsPort}`, 'x-forwarded-host': `127.0.0.1:${record.tlsPort}`, 'x-forwarded-proto': 'https', connection: 'close' } }, answer => {
        res.writeHead(answer.statusCode, answer.headers); answer.pipe(res);
      });
      upstream.on('error', () => { res.statusCode = 502; res.end('Owned runtime not ready'); }); req.pipe(upstream);
    });
    await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(record.tlsPort, '127.0.0.1', resolve); });
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      assert.ok(!childError && child.exitCode === null, 'Standalone runtime exited before readiness');
      try { const answer = await request(record, '/favicon.ico'); if (answer.status === 200) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.ok(ready, 'Actual sealed application readiness failed; inspect private logs');
    const anonymous = await request(record, '/en/dashboard/pos');
    assert.ok([301, 302, 303, 307, 308].includes(anonymous.status), 'Anonymous protected route must redirect');
    const location = new URL(anonymous.headers.location, record.origin); assert.match(location.pathname, /login/);
    report.anonymous = { status: anonymous.status, locationPath: location.pathname };
    const user = fixture.users.cashier;
    const denied = await request(record, '/api/auth/sign-in/email', { method: 'POST', body: { email: user.email, password: 'Synthetic-deliberately-wrong-password!' } });
    assert.equal(denied.status, 401); assert.equal(await db.session.count({ where: { userId: user.userId } }), 0);
    report.wrongPassword = { status: denied.status, sessionCreated: false };
    const signed = await request(record, '/api/auth/sign-in/email', { method: 'POST', body: { email: user.email, password: user.password } });
    assert.equal(signed.status, 200); assert.equal(JSON.parse(signed.body).user.id, user.userId);
    const cookies = signed.headers['set-cookie'] || [];
    const sessionCookies = cookies.filter(value => value.split(';')[0].split('=')[0].includes('session'));
    assert.ok(sessionCookies.length > 0 && sessionCookies.every(value => /;\s*Secure(?:;|$)/i.test(value)), 'Production session cookie must be Secure');
    cookie = cookies.map(value => value.split(';')[0]).join('; ');
    assert.ok(cookie.length > 0);
    report.signIn = { status: signed.status, secureSessionCookie: true, cookieNames: cookies.map(value => value.split('=')[0]), sessionCreated: await db.session.count({ where: { userId: user.userId } }) };
    assert.equal(report.signIn.sessionCreated, 1);
    const session = await request(record, '/api/auth/get-session', { cookie }); assert.equal(session.status, 200); assert.equal(JSON.parse(session.body).user.id, user.userId);
    const persistedActor = await db.user.findFirstOrThrow({ where: { id: user.userId, organizationId: fixture.organizationId } });
    assert.equal(JSON.parse(session.body).user.id, persistedActor.id);
    report.sessionRead = { status: session.status, userId: persistedActor.id, organizationId: persistedActor.organizationId };
    for (const route of ['/en/dashboard/pos', '/en/dashboard/finance/receivables', '/en/dashboard/accounting/reports/trial-balance']) {
      const answer = await request(record, route, { cookie });
      assert.equal(answer.status, 200, `Protected SSR failed: ${route}`); assert.match(answer.headers['content-type'] || '', /text\/html/);
      report.routes.push({ route, status: answer.status, contentType: answer.headers['content-type'], bytes: Buffer.byteLength(answer.body), bodySha256: sha(answer.body) });
    }
    const signedOut = await request(record, '/api/auth/sign-out', { method: 'POST', body: {}, cookie }); assert.equal(signedOut.status, 200);
    assert.equal(await db.session.count({ where: { userId: user.userId } }), 0);
    // The application deliberately disables Better Auth's five-minute identity
    // cookie cache for authorization; probe that persisted-session boundary.
    const revoked = await request(record, '/api/auth/get-session?disableCookieCache=true', { cookie }); assert.equal(revoked.status, 200); assert.ok(!JSON.parse(revoked.body)?.user);
    const revokedRoute = await request(record, '/en/dashboard/pos', { cookie });
    assert.ok([301, 302, 303, 307, 308].includes(revokedRoute.status), 'Revoked cookie must not authorize protected SSR');
    assert.match(new URL(revokedRoute.headers.location, record.origin).pathname, /login/);
    report.signOut = { status: signedOut.status, sessionRevoked: true, uncachedOldCookieSessionAbsent: true, oldCookieProtectedRouteStatus: revokedRoute.status }; cookie = null;
    report.finalTransactionCounts = { sales: await db.salesOrder.count(), settlements: await db.customerSettlement.count(), sessions: await db.session.count(), posSessions: await db.pOSSession.count(), journals: await db.journalEntry.count() };
    assert.ok(Object.values(report.finalTransactionCounts).every(count => count === 0), 'HTTP smoke must not create financial/shift/session residue');
    report.passed = true;
  } catch (error) {
    report.failure = { name: error.name, code: error.code || null, message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_RUNTIME_DATABASE]') }; process.exitCode = 1;
  } finally {
    if (cookie) await request(record, '/api/auth/sign-out', { method: 'POST', body: {}, cookie }).catch(() => undefined);
    if (proxy) await new Promise(resolve => proxy.close(resolve));
    try { await terminateOwned(child); report.applicationStopped = true; } catch (error) { report.applicationStopped = false; report.passed = false; process.exitCode = 1; }
    if (stdout !== undefined) fs.closeSync(stdout); if (stderr !== undefined) fs.closeSync(stderr);
    if (db) await db.$disconnect().catch(() => undefined);
    if (started) {
      try { command(record, 'pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', pgData, '-m', 'fast', '-w', 'stop'], record.directory, osEnv(), true); report.clusterStopped = true; }
      catch (error) { report.clusterStopped = false; report.passed = false; process.exitCode = 1; }
    }
    try { report.artifactAfter = verify(); assert.deepEqual(report.artifactAfter, report.artifactBefore); report.artifactUnchanged = true; }
    catch (error) { report.artifactUnchanged = false; report.passed = false; report.artifactFailure = error.message; process.exitCode = 1; }
    report.finishedAt = new Date().toISOString(); write(file('ARTIFACT_HTTP_SMOKE_RESULT.json'), report);
  }
  console.log(`Sealed artifact HTTPS smoke ${report.passed ? 'passed' : 'failed'}; evidence contains no passwords or cookie values.`);
}

if (require.main === module) {
  dns.setDefaultResultOrder('ipv4first');
  Promise.resolve().then(() => {
    assert.equal(process.argv.length, 3);
    if (process.argv[2] === 'prepare') return prepare();
    if (process.argv[2] === 'run') return execute();
    throw Error('Expected prepare or run');
  }).catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_RUNTIME_DATABASE]')); process.exitCode = 1; });
}
