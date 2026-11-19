// Reviewed local dev-runtime qualification controller. Actual authentication is
// performed by the separate browser; this owns only its pinned app/DB lifecycle
// and four scoped test revocations. It never loads an environment file or sends.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process'), { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..'), digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8')), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv); require('node:dns').setDefaultResultOrder('ipv4first');
const { Client } = require(path.join(root, 'node_modules/pg'));
const transport = require('../close-release-candidate-2026-11-09/runtime-http.cjs');
const bin = 'C:/Program Files/PostgreSQL/17/bin';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
function noLinks(file) { let current = path.parse(path.resolve(file)).root; for (const part of path.resolve(file).slice(current.length).split(path.sep).filter(Boolean)) { current = path.join(current, part); assert(!fs.lstatSync(current).isSymbolicLink()); } }
async function financialSnapshot(db, organizationId) {
  const where = { organizationId }, orderBy = { id: 'asc' };
  return hash(JSON.stringify({ journals: await db.journalEntry.findMany({ where, orderBy, select: { id: true, status: true, periodId: true, postedAt: true, sourceId: true } }),
    lines: await db.journalEntryLine.findMany({ where, orderBy, select: { id: true, journalEntryId: true, debit: true, credit: true, accountId: true } }),
    periods: await db.accountingPeriod.findMany({ where, orderBy, select: { id: true, status: true, controlVersion: true, lastControlEventId: true } }),
    exports: await db.closePackExport.findMany({ where, orderBy, select: { id: true, closeRunId: true, contentHash: true, canonicalContentSha256: true, exportRequestHash: true } }) }));
}
function warmSession(target) {
  assert.equal(target.origin, 'https://127.0.0.1:43872');
  return new Promise((resolve, reject) => {
    const request = require('node:https').get(new URL('/api/auth/get-session?disableCookieCache=true', target.origin), {
      agent: false, ca: fs.readFileSync(target.cert), rejectUnauthorized: true, timeout: 60000,
      headers: { origin: target.origin, referer: target.origin + '/en/login-v2', connection: 'close' },
    }, response => {
      const chunks = []; let bytes = 0;
      response.on('data', chunk => { bytes += chunk.length; if (bytes > 1048576) request.destroy(new Error('Bounded session response exceeded')); else chunks.push(chunk); });
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') })); response.on('error', reject);
    });
    request.on('error', reject); request.on('timeout', () => request.destroy(new Error('Owned session warmup timed out')));
  });
}
async function main() {
  assert.equal(process.argv.length, 3); assert.equal(process.argv[2], 'run');
  const target = read(path.join(__dirname, 'AUTHENTICATED_RUNTIME_TARGET.json')), earned = read(path.join(__dirname, 'earned-close/pg-LATEST.json'));
  const admissionFile = path.join(__dirname, 'earned-close/QUALIFICATION_ADMISSION.json'), admission = read(admissionFile);
  assert.equal(digest(admissionFile), '2d100d72980336bb62141af2411586208544f17b42f74b9fd15fa20cf83524ae');
  assert(admission.passed && admission.ownedClusterStopped && admission.sourceAndPrivateClientRechecked);
  assert.equal(admission.status, 'PASS_SERVICE_QUALIFICATION_WITH_CLEANUP_SUPPLEMENT');
  assert.equal(admission.originalLatestPreserved.path, path.join(__dirname, 'earned-close/pg-LATEST.json'));
  for (const binding of [admission.originalReceipt, admission.originalLatestPreserved, admission.cleanupSupplement, admission.runner, ...admission.evidence]) assert.equal(digest(binding.path), binding.sha256);
  assert.equal(earned.passed, false); assert.equal(earned.cleanupFailure, 'pg-stop failed; retained evidence available'); assert(!earned.failure);
  assert.equal(admission.database, earned.database); assert.equal(admission.directory, earned.directory); assert.equal(admission.evidenceDirectory, earned.evidenceDirectory);
  const cleanup = read(admission.cleanupSupplement.path); assert(cleanup.passed && cleanup.pgCtlStatusExitCode === 3 && cleanup.postmasterPidAbsent && cleanup.portReleased);
  assert.match(earned.database, /^stoquify_replay_close_earned_20261109_[a-f0-9]{10}$/);
  assert.equal(path.dirname(earned.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(earned.directory), /^close-earned-20261109-[a-f0-9]{10}$/); noLinks(earned.directory);
  assert.equal(path.dirname(target.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(target.directory), /^close-app-[a-f0-9]{10}$/); noLinks(target.directory);
  assert.equal(target.origin, 'https://127.0.0.1:43872'); assert.equal(target.httpPort, 43871); assert.equal(target.tlsPort, 43872);
  assert.equal(digest(target.preload), target.preloadSha256); assert.equal(digest(target.networkPreload), target.networkPreloadSha256); assert.equal(digest(target.cert), target.certificateSha256);
  assert.equal(digest(path.join(target.privateClient, 'index.js')), target.privateClientIndexSha256); assert.equal(digest(path.join(target.privateClient, 'schema.prisma')), target.privateClientSchemaSha256);
  assert.equal(fs.realpathSync(path.join(target.candidate, 'node_modules')), fs.realpathSync(target.dependencies));
  const manifest = read(target.sourceManifest); assert.equal(hash(JSON.stringify(manifest.files)), target.sourceManifestSha256);
  for (const entry of manifest.files) { assert.equal(digest(path.join(target.candidate, entry.path)), entry.sha256); assert.equal(digest(path.join(root, entry.path)), entry.sha256, 'Current source changed since runtime preparation'); }
  const previousTarget = read(path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09/DATABASE_TARGET.json'));
  assert.equal(previousTarget.port, 58033); assert.equal(previousTarget.user, 'sales_release_fixture'); assert.equal(previousTarget.host, 'localhost'); assert.equal(path.dirname(previousTarget.directory), path.join(root, '.codex-tmp'));
  noLinks(previousTarget.directory); assert.match(path.basename(previousTarget.directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/);
  const catalog = read(path.join(target.candidate, 'prisma/migration-catalog-manifest.json')); assert.equal(catalog.migrationCount, 122);
  await transport.freePort(target.httpPort); await transport.freePort(target.tlsPort);
  const id = crypto.randomBytes(5).toString('hex'), evidence = path.join(__dirname, 'authenticated-app', 'runtime-' + id); fs.mkdirSync(evidence, { recursive: true });
  const privateRun = path.join(target.directory, 'run-' + id), handshakes = path.join(privateRun, 'handshakes'); fs.mkdirSync(privateRun); fs.mkdirSync(handshakes);
  const report = { passed: false, began: new Date().toISOString(), evidenceDirectory: evidence, sourceManifestSha256: target.sourceManifestSha256, candidate: target.candidate,
    database: earned.database, parentServiceReceiptSha256: digest(path.join(__dirname, 'earned-close/pg-LATEST.json')), parentServiceAdmissionSha256: digest(admissionFile), runnerSha256: digest(__filename), checks: [],
    classification: 'Actual password/session/Next development application, isolated local DB, source-bound private Prisma override and reused dependencies; not production build/artifact or live delivery qualification' };
  const retryFile = path.join(__dirname, 'AUTHENTICATED_RUNTIME_RETRY.json'), retry = fs.existsSync(retryFile) ? read(retryFile) : null;
  let priorControl;
  if (retry) {
    assert.equal(retry.parentReport, path.join(__dirname, 'authenticated-app/runtime-262ac949ca/RESULT.json'));
    assert.equal(digest(retry.parentReport), retry.parentReportSha256);
    const prior = read(retry.parentReport);
    assert(!prior.passed && prior.ownedClusterStopped && prior.applicationStopped && prior.portsReleased);
    assert.equal(prior.database, earned.database); assert.equal(prior.sourceManifestSha256, target.sourceManifestSha256);
    assert.equal(retry.privateControlFile, path.join(target.directory, 'run-262ac949ca/browser-control.private.json')); noLinks(retry.privateControlFile);
    priorControl = read(retry.privateControlFile); assert.equal(priorControl.origin, target.origin);
    report.retryParent = { path: retry.parentReport, sha256: retry.parentReportSha256, reason: retry.reason, existingOwnedCredentialReused: true };
  }
  let started = false, proxy, child, db, appStdout, appStderr, financialBefore, grant, failure, stopped = false, postmasterId;
  process.stdin.on('data', bytes => { if (String(bytes).trim() === 'stop') stopped = true; }); process.on('SIGINT', () => { stopped = true; });
  const pgControl = args => { const r = spawnSync(path.join(bin, 'pg_ctl.exe'), args, { env: osEnv, windowsHide: true, stdio: 'ignore', timeout: args.includes('stop') ? 310000 : 60000 }); assert.equal(r.status, 0); };
  try {
    assert.equal(spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(previousTarget.directory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' }).status, 3, 'Owned cluster in use');
    started = true; pgControl(['-D', path.join(previousTarget.directory, 'data'), '-l', path.join(previousTarget.directory, 'postgres.log'), '-o', '-p 58033 -h 127.0.0.1', '-w', 'start']);
    postmasterId = fs.readFileSync(path.join(previousTarget.directory, 'data/postmaster.pid'), 'utf8').split(/\r?\n/)[0];
    const url = `postgresql://sales_release_fixture@localhost:58033/${earned.database}?schema=public`, sql = new Client({ connectionString: url, connectionTimeoutMillis: 5000 }); await sql.connect();
    try {
      const identity = (await sql.query("SELECT current_database() AS name,current_user AS actor,host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('data_directory') AS directory")).rows[0];
      assert.equal(identity.name, earned.database); assert.equal(identity.actor, previousTarget.user); assert.equal(identity.host, '127.0.0.1'); assert.equal(identity.port, previousTarget.port);
      assert.equal(fs.realpathSync(identity.directory).toLowerCase(), fs.realpathSync(path.join(previousTarget.directory, 'data')).toLowerCase());
      const history = (await sql.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows; assert.equal(history.length, 122);
      history.forEach((row, index) => { assert.equal(row.migration_name, catalog.migrations[index].name); assert.equal(row.checksum, catalog.migrations[index].rawSha256); assert(row.finished_at && !row.rolled_back_at); });
      write(path.join(evidence, 'DATABASE_IDENTITY.json'), identity);
    } finally { await sql.end(); }
    const client = require(target.privateClient); db = new client.PrismaClient({ datasources: { db: { url } } });
    const fixtureFile = path.join(earned.directory, 'private-documents/FIXTURE.json'), fixtureReceipt = read(path.join(earned.evidenceDirectory, 'pg-PRIVATE_FIXTURE.json'));
    assert.equal(fixtureReceipt.path, fixtureFile); noLinks(fixtureFile); assert.equal(digest(fixtureFile), fixtureReceipt.sha256);
    const fixture = read(fixtureFile);
    assert.match(fixture.organizationId, /^earned-close-[a-f0-9]{12}$/);
    const users = await db.user.findMany({ where: { organizationId: fixture.organizationId, roles: { some: { permissions: { has: 'accounting.close.accountant.review' } } } }, select: { id: true, email: true, isActive: true, isVerified: true, emailVerified: true } });
    assert.equal(users.length, 1); const user = users[0]; assert.equal(user.id, fixture.reviewerUserId); assert(user.isActive && user.isVerified && user.emailVerified);
    const baseline = await db.closePackExport.findFirstOrThrow({ where: { organizationId: fixture.organizationId, id: fixture.finalExportId, periodId: fixture.periodId, isCertified: true } });
    assert.equal(baseline.canonicalContentSha256, fixture.finalDocumentDigest); assert.equal(baseline.contentHash, fixture.finalContentHash);
    assert(baseline.canonicalContent && baseline.canonicalContentSha256); assert.equal('sha256:' + hash(baseline.canonicalContent), baseline.canonicalContentSha256);
    const latest = await db.closeRun.findFirstOrThrow({ where: { organizationId: fixture.organizationId, periodId: fixture.periodId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }); assert.equal(latest.id, baseline.closeRunId);
    financialBefore = await financialSnapshot(db, fixture.organizationId);
    grant = await db.tenantModuleGrant.findUniqueOrThrow({ where: { organizationId_moduleSlug: { organizationId: fixture.organizationId, moduleSlug: 'close_assurance' } } }); assert.equal(grant.status, 'active');
    const appRequire = createRequire(path.join(target.candidate, 'package.json')), argon = appRequire('argon2');
    const password = priorControl ? priorControl.password : 'Synthetic-' + crypto.randomBytes(24).toString('base64url') + '!';
    if (priorControl) {
      assert.equal(priorControl.organizationId, fixture.organizationId); assert.equal(priorControl.actorId, user.id); assert.equal(priorControl.email, user.email);
      const accounts = await db.account.findMany({ where: { userId: user.id, providerId: 'credential' } }); assert.equal(accounts.length, 1);
      assert(await argon.verify(accounts[0].password, password), 'Owned retry credential binding changed');
      assert.equal(await db.session.count({ where: { userId: user.id, createdAt: { gte: new Date(read(retry.parentReport).began) } } }), 0, 'Startup-only retry must have no actual login session');
    } else {
      const passwordHash = await argon.hash(password, { type: argon.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
      assert.equal(await db.account.count({ where: { userId: user.id, providerId: 'credential' } }), 0);
      await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
    }
    const originalDocumentPath = path.join(privateRun, 'original-certified.json'); fs.writeFileSync(originalDocumentPath, baseline.canonicalContent, { flag: 'wx', mode: 0o600 });
    const controlFile = path.join(privateRun, 'browser-control.private.json');
    write(controlFile, { version: 1, origin: target.origin, locale: 'en', organizationId: fixture.organizationId, actorId: user.id, email: user.email, password, periodId: fixture.periodId,
      originalExportId: baseline.id, originalRunId: baseline.closeRunId, originalDocumentDigest: baseline.canonicalContentSha256, originalDocumentPath, handshakeDirectory: handshakes });
    const runtimeConfig = JSON.stringify({ extends: './tsconfig.json', compilerOptions: { paths: { '@/*': ['./*'], '@prisma/client': [path.join(target.privateClient, 'index.d.ts').replaceAll('\\', '/')] } } }, null, 2) + '\n';
    if (priorControl) assert.equal(fs.readFileSync(path.join(target.candidate, 'tsconfig.runtime.json'), 'utf8'), runtimeConfig);
    else fs.writeFileSync(path.join(target.candidate, 'tsconfig.runtime.json'), runtimeConfig, { flag: 'wx' });
    // One bootstrap keeps Next's child-process option forwarding from combining
    // two --require values into one filename. Both reviewed controls still load.
    const bootstrap = path.join(privateRun, 'runtime-preload.cjs');
    fs.writeFileSync(bootstrap, 'require(' + JSON.stringify(target.networkPreload) + ');\nrequire(' + JSON.stringify(target.preload) + ');\n', { flag: 'wx' }); report.bootstrapSha256 = digest(bootstrap);
    const env = { ...osEnv, NODE_ENV: 'development', HOSTNAME: '127.0.0.1', PORT: String(target.httpPort), DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url,
      NEXTAUTH_URL: target.origin, NEXT_PUBLIC_APP_URL: target.origin, NEXT_PUBLIC_BASE_URL: target.origin, APP_URL: target.origin, AUTH_SECRET: crypto.randomBytes(32).toString('hex'),
      PUBLIC_IDENTITY_ABUSE_HASH_SECRET: crypto.randomBytes(32).toString('hex'), AQSTOQFLOW_RECEIPT_TOKEN_SECRET: crypto.randomBytes(32).toString('hex'), AQSTOQFLOW_HISTORY_CURSOR_SECRET: crypto.randomBytes(32).toString('hex'),
      AQSTOQFLOW_STATEMENT_TOKEN_SECRET: crypto.randomBytes(32).toString('hex'), AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'), AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0', NEXT_TELEMETRY_DISABLED: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1',
      NEXT_DIST_DIR: '.next-auth-runtime', STOQUIFY_DEV_TSCONFIG: 'tsconfig.runtime.json', TEMP: path.join(target.directory, 'temp'), TMP: path.join(target.directory, 'temp'),
      NODE_OPTIONS: '--dns-result-order=ipv4first --require ' + JSON.stringify(bootstrap.replaceAll('\\', '/')), NODE_EXTRA_CA_CERTS: target.cert };
    appStdout = fs.openSync(path.join(privateRun, 'application.stdout.private.log'), 'wx'); appStderr = fs.openSync(path.join(privateRun, 'application.stderr.private.log'), 'wx');
    child = spawn(process.execPath, [path.join(target.candidate, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(target.httpPort)], { cwd: target.candidate, env, windowsHide: true, stdio: ['ignore', appStdout, appStderr] });
    report.applicationPid = child.pid;
    proxy = transport.createTlsProxy(target); const sockets = new Set(); proxy.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); }); proxy.ownedSockets = sockets;
    proxy.on('upgrade', (request, socket, head) => {
      const upstream = require('node:net').connect({ host: '127.0.0.1', port: target.httpPort }, () => {
        upstream.write(request.method + ' ' + request.url + ' HTTP/' + request.httpVersion + '\r\n' + Object.entries({ ...request.headers, host: '127.0.0.1:' + target.tlsPort, 'x-forwarded-host': '127.0.0.1:' + target.tlsPort, 'x-forwarded-proto': 'https' }).map(([key, value]) => key + ': ' + value).join('\r\n') + '\r\n\r\n');
        if (head.length) upstream.write(head); upstream.pipe(socket); socket.pipe(upstream);
      }); socket.on('error', () => upstream.destroy()); upstream.on('error', () => socket.destroy()); socket.on('close', () => upstream.destroy());
    });
    await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(target.tlsPort, '127.0.0.1', resolve); });
    const deadline = Date.now() + 300000; let ready = false;
    while (!stopped && Date.now() < deadline) {
      assert.equal(child.exitCode, null, 'Owned Next CLI exited');
      try { const answer = await warmSession(target); if (answer.status === 200 && !JSON.parse(answer.body)?.user) { ready = true; break; } } catch {}
      await delay(1000);
    }
    assert(ready && !stopped, 'Development authentication route did not become ready');
    const readyRecord = { ready: true, origin: target.origin, privateControlFile: controlFile, handshakeDirectory: handshakes, runtimeEvidenceDirectory: evidence, applicationPid: child.pid, database: earned.database,
      sourceManifestSha256: target.sourceManifestSha256, classification: report.classification };
    write(path.join(__dirname, 'authenticated-app/APP_READY.json'), readyRecord); console.log('Actual local authentication runtime ready; credential values remain private.');
    const allowed = ['stale-proof', 'suspend-close-module', 'restore-close-module', 'revoke-current-session']; let operationIndex = 0;
    const runtimeStart = new Date(report.began), seen = new Set(), browserDeadline = Date.now() + 1200000;
    while (!stopped && Date.now() < browserDeadline) {
      const finished = path.join(handshakes, 'FINISHED.json');
      if (fs.existsSync(finished)) { const result = read(finished); assert.equal(result.passed, true, 'Browser qualification failed; inspect its sanitized evidence'); assert.equal(operationIndex, allowed.length); report.browserCompleted = true; break; }
      for (const name of fs.readdirSync(handshakes).filter(name => /^[a-f0-9]{32}\.request\.json$/.test(name)).sort()) {
        if (seen.has(name)) continue; noLinks(path.join(handshakes, name)); const request = read(path.join(handshakes, name));
        assert.deepEqual(Object.keys(request).sort(), ['id', 'operation']); assert.equal(name, request.id + '.request.json'); assert.equal(request.operation, allowed[operationIndex]); seen.add(name);
        const sessions = await db.session.findMany({ where: { userId: user.id, createdAt: { gte: runtimeStart } }, select: { id: true } }); assert.equal(sessions.length, 1, 'Exactly one actual runtime login session required');
        if (request.operation === 'stale-proof') await db.session.update({ where: { id: sessions[0].id }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } });
        if (request.operation === 'suspend-close-module') await db.tenantModuleGrant.update({ where: { id: grant.id }, data: { status: 'suspended', revision: { increment: 1 } } });
        if (request.operation === 'restore-close-module') await db.tenantModuleGrant.update({ where: { id: grant.id }, data: { status: 'active', revision: { increment: 1 } } });
        if (request.operation === 'revoke-current-session') await db.session.delete({ where: { id: sessions[0].id } });
        const applied = { id: request.id, operation: request.operation, applied: true, checkedAt: new Date().toISOString() }; write(path.join(handshakes, request.id + '.response.json'), applied); report.checks.push(applied); operationIndex++;
      }
      await delay(200);
    }
    assert(report.browserCompleted && !stopped, 'Authenticated browser did not complete the bounded qualification');
    assert.equal(await financialSnapshot(db, fixture.organizationId), financialBefore, 'Authentication/retrieval qualification changed financial facts'); report.financialFactsUnchanged = true;
    for (const entry of manifest.files.filter(entry => entry.path !== 'next-env.d.ts')) assert.equal(digest(path.join(target.candidate, entry.path)), entry.sha256, 'Application source changed while running');
    report.generatedDeclarationSha256 = digest(path.join(target.candidate, 'next-env.d.ts')); report.passed = true;
  } catch (error) {
    failure = error; fs.writeFileSync(path.join(privateRun, 'failure.private.txt'), String(error.stack || error), { flag: 'wx', mode: 0o600 }); report.failure = 'Qualification failed; private diagnostic retained without credential/body disclosure';
  } finally {
    if (db && grant) { try { const current = await db.tenantModuleGrant.findUnique({ where: { id: grant.id } }); if (current.status !== grant.status) await db.tenantModuleGrant.update({ where: { id: grant.id }, data: { status: grant.status, revision: { increment: 1 } } }); } catch { report.grantCleanupFailed = true; report.passed = false; } }
    if (proxy) { try { for (const socket of proxy.ownedSockets) socket.destroy(); await new Promise(resolve => proxy.close(resolve)); report.proxyStopped = true; } catch { report.proxyStopped = false; report.passed = false; } }
    if (child && child.exitCode === null) { try {
      // Verify this controller's exact child before using Windows tree cleanup.
      const powershell = path.join(osEnv.SYSTEMROOT || osEnv.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
      const probe = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', `Get-CimInstance Win32_Process -Filter 'ProcessId = ${child.pid}' | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress`], { env: osEnv, windowsHide: true, encoding: 'utf8', timeout: 30000 });
      if (probe.status === 0 && probe.stdout.trim()) {
        const actual = JSON.parse(probe.stdout.trim());
        assert.equal(actual.ProcessId, child.pid); assert.equal(actual.ParentProcessId, process.pid);
        assert.equal(fs.realpathSync(actual.ExecutablePath).toLowerCase(), fs.realpathSync(process.execPath).toLowerCase());
        assert(actual.CommandLine.toLowerCase().replaceAll('\\', '/').includes(path.join(target.candidate, 'node_modules/next/dist/bin/next').toLowerCase().replaceAll('\\', '/')));
        const result = spawnSync('C:/Windows/System32/taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { env: osEnv, windowsHide: true, encoding: 'utf8', timeout: 30000 }); report.applicationTreeStopExitCode = result.status;
      } else { report.processIdentityProbeFailed = true; report.passed = false; }
    } catch { report.processIdentityProbeFailed = true; report.passed = false; }
    }
    if (child) { await Promise.race([new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve)), delay(5000)]); report.applicationStopped = child.exitCode !== null; if (!report.applicationStopped) report.passed = false; }
    for (const descriptor of [appStdout, appStderr]) if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch { report.logCleanupFailed = true; report.passed = false; } }
    if (db) { try { await db.$disconnect(); } catch { report.databaseDisconnectFailed = true; report.passed = false; } }
    if (started) { try { assert.equal(fs.readFileSync(path.join(previousTarget.directory, 'data/postmaster.pid'), 'utf8').split(/\r?\n/)[0], postmasterId); pgControl(['-D', path.join(previousTarget.directory, 'data'), '-m', 'fast', '-t', '300', '-w', 'stop']); report.ownedClusterStopped = true; } catch { report.ownedClusterStopped = false; report.passed = false; } }
    try { await transport.freePort(target.httpPort); await transport.freePort(target.tlsPort); report.portsReleased = true; } catch { report.portsReleased = false; report.passed = false; }
    report.finishedAt = new Date().toISOString(); write(path.join(evidence, 'RESULT.json'), report); fs.writeFileSync(path.join(__dirname, 'authenticated-app/LATEST.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdin.pause();
  }
  console.log(JSON.stringify({ passed: report.passed, evidenceDirectory: evidence, ownedClusterStopped: report.ownedClusterStopped, applicationStopped: report.applicationStopped, portsReleased: report.portsReleased }));
  if (failure || !report.passed) process.exitCode = 1;
}
main().catch(() => { console.error('Runtime preparation refused before execution; inspect pinned target and successful earned-close receipt.'); process.exitCode = 1; });
