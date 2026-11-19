// Root-reviewed local development runtime owner. No migration, data reset,
// production/provider delivery or financial fixture mutation is performed.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process'), { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..'), read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), digest = file => hash(fs.readFileSync(file));
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv); require(path.join(root, 'scripts/local-gates-network.cjs')); require('node:dns').setDefaultResultOrder('ipv4first');
const { Client } = require(path.join(root, 'node_modules/pg')), transport = require('../close-release-candidate-2026-11-09/runtime-http.cjs');
const bin = 'C:/Program Files/PostgreSQL/17/bin', delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
function noLinks(file) { let current = path.parse(path.resolve(file)).root; for (const part of path.resolve(file).slice(current.length).split(path.sep).filter(Boolean)) { current = path.join(current, part); assert(!fs.lstatSync(current).isSymbolicLink()); } }
async function financialFingerprint(db, organizationId) {
  const where = { organizationId }, orderBy = { id: 'asc' };
  const queries = {
    journals: db.journalEntry.findMany({ where, orderBy, include: { lines: { orderBy } } }),
    batches: db.ledgerPostingBatch.findMany({ where, orderBy }), links: db.accountingSourceLink.findMany({ where, orderBy }),
    periods: db.accountingPeriod.findMany({ where, orderBy }), closeRuns: db.closeRun.findMany({ where, orderBy }), packs: db.closePackExport.findMany({ where, orderBy }),
    settlements: db.customerSettlement.findMany({ where, orderBy }), allocations: db.customerSettlementAllocation.findMany({ where, orderBy }),
    customerLedger: db.customerLedgerEntry.findMany({ where, orderBy }), receivableStates: db.customerReceivableDocumentState.findMany({ where, orderBy }),
    payments: db.paymentTransaction.findMany({ where, orderBy }), customers: db.customer.findMany({ where, orderBy, select: { id: true, currentBalance: true } }),
  };
  const names = Object.keys(queries), rows = await Promise.all(Object.values(queries)); return hash(JSON.stringify(Object.fromEntries(names.map((name, index) => [name, rows[index]]))));
}
async function auxState(db, ui) {
  const where = { organizationId: ui.organizationId };
  const [settlements, journals, customer, state] = await Promise.all([
    db.customerSettlement.findMany({ where, select: { id: true } }), db.journalEntry.findMany({ where, select: { id: true } }),
    db.customer.findFirstOrThrow({ where: { ...where, id: ui.customerId }, select: { currentBalance: true } }),
    db.customerReceivableDocumentState.findFirstOrThrow({ where: { ...where, documentId: ui.documentId }, orderBy: [{ version: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] }),
  ]);
  return { settlementIds: settlements.map(row => row.id).sort(), journalIds: journals.map(row => row.id).sort(), balance: customer.currentBalance.toFixed(2), stateVersion: state.version, paid: state.paidAmount.toFixed(2), unpaid: state.unpaidAmount.toFixed(2) };
}
function warmSession(target) {
  assert.equal(target.origin, 'https://127.0.0.1:43882');
  return new Promise((resolve, reject) => {
    const request = require('node:https').get(new URL('/api/auth/get-session?disableCookieCache=true', target.origin), { agent: false, ca: fs.readFileSync(target.cert), rejectUnauthorized: true, timeout: 60000, headers: { origin: target.origin, connection: 'close' } }, response => {
      const chunks = []; let size = 0; response.on('data', chunk => { size += chunk.length; if (size > 1048576) request.destroy(new Error('Session response exceeds bound')); else chunks.push(chunk); });
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') })); response.on('error', reject);
    }); request.on('error', reject); request.on('timeout', () => request.destroy(new Error('Session warmup deadline exceeded')));
  });
}
async function main() {
  assert.deepEqual(process.argv.slice(2), ['run']);
  const targetFile = path.join(__dirname, 'COLLECTION_RUNTIME_TARGET.json'), target = read(targetFile);
  assert.equal(target.origin, 'https://127.0.0.1:43882'); assert.equal(target.httpPort, 43881); assert.equal(target.tlsPort, 43882);
  assert.equal(path.dirname(target.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(target.directory), /^collection-app-20261110-[a-f0-9]{10}$/); noLinks(target.directory);
  const pg = read(target.pgReceipt.path); assert.equal(digest(target.pgReceipt.path), target.pgReceipt.sha256); assert(pg.passed && pg.ownedClusterStopped);
  assert.match(pg.database, /^stoquify_replay_close_monthly_20261110_[a-f0-9]{10}$/);
  assert.equal(path.dirname(pg.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(pg.directory), /^close-monthly-20261110-[a-f0-9]{10}$/); noLinks(pg.directory);
  const fixtureReceipt = read(target.fixtureReceipt.path); assert.equal(digest(target.fixtureReceipt.path), target.fixtureReceipt.sha256);
  assert.equal(fixtureReceipt.path, path.join(pg.directory, 'private-documents/FIXTURE.json')); noLinks(fixtureReceipt.path); assert.equal(digest(fixtureReceipt.path), fixtureReceipt.sha256);
  assert.equal(fixtureReceipt.packs.length, 1); for (const pack of fixtureReceipt.packs) { assert.equal(path.dirname(pack.path), path.join(pg.directory, 'private-documents')); noLinks(pack.path); assert.equal(digest(pack.path), pack.sha256); assert.equal(fs.statSync(pack.path).size, pack.bytes); }
  const fixture = read(fixtureReceipt.path), ui = fixture.ui; assert(ui.organizationId !== fixture.organizationId && ui.method === 'MOBILE_MONEY' && ui.amount === '100.00');
  const manifest = read(target.sourceManifest); assert.equal(hash(JSON.stringify(manifest.files)), target.sourceManifestSha256);
  for (const file of manifest.files) { assert.equal(digest(path.join(root, file.path)), file.sha256); assert.equal(digest(path.join(target.candidate, file.path)), file.sha256); }
  assert.equal(fs.realpathSync(path.join(target.candidate, 'node_modules')), fs.realpathSync(target.dependencies));
  for (const [file, sha] of [[target.preload, target.preloadSha256], [target.networkPreload, target.networkPreloadSha256], [target.cert, target.certificateSha256], [path.join(target.privateClient, 'index.js'), target.privateClientIndexSha256], [path.join(target.privateClient, 'schema.prisma'), target.privateClientSchemaSha256]]) assert.equal(digest(file), sha);
  const dbTarget = read(path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09/DATABASE_TARGET.json'));
  assert.equal(dbTarget.port, 58033); assert.equal(dbTarget.host, 'localhost'); assert.equal(dbTarget.user, 'sales_release_fixture');
  assert.equal(path.dirname(dbTarget.directory), path.join(root, '.codex-tmp')); assert.match(path.basename(dbTarget.directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/); noLinks(dbTarget.directory);
  await transport.freePort(target.httpPort); await transport.freePort(target.tlsPort);
  const id = crypto.randomBytes(5).toString('hex'), evidence = path.join(__dirname, 'authenticated-app', 'runtime-' + id), privateRun = path.join(target.directory, 'run-' + id), handshakes = path.join(privateRun, 'handshakes');
  fs.mkdirSync(evidence, { recursive: true }); fs.mkdirSync(privateRun); fs.mkdirSync(handshakes);
  const report = { passed: false, began: new Date().toISOString(), evidenceDirectory: evidence, sourceManifestSha256: target.sourceManifestSha256, parentPgReceiptSha256: target.pgReceipt.sha256, runnerSha256: digest(__filename), operations: [],
    classification: 'Actual password/session/Next development application and synthetic collection; reused dependencies/private Prisma override. No production artifact, provider authenticity or delivery qualification.' };
  let db, proxy, child, stdout, stderr, started = false, postmasterId, role, originalPermissions, primaryBefore, auxBefore, afterCollectionFingerprint, stopped = false, failure;
  process.stdin.on('data', bytes => { if (String(bytes).trim() === 'stop') stopped = true; }); process.on('SIGINT', () => { stopped = true; });
  const pgControl = args => { const result = spawnSync(path.join(bin, 'pg_ctl.exe'), args, { env: osEnv, windowsHide: true, stdio: 'ignore', timeout: args.includes('stop') ? 310000 : 60000 }); assert.equal(result.status, 0); };
  try {
    assert.equal(spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(dbTarget.directory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' }).status, 3, 'Owned cluster is already in use');
    started = true; pgControl(['-D', path.join(dbTarget.directory, 'data'), '-l', path.join(dbTarget.directory, 'postgres.log'), '-o', '-p 58033 -h 127.0.0.1', '-w', 'start']);
    const postmaster = fs.readFileSync(path.join(dbTarget.directory, 'data/postmaster.pid'), 'utf8').split(/\r?\n/); postmasterId = postmaster[0]; assert.match(postmasterId, /^[1-9][0-9]*$/); assert(Number(postmaster[2]) >= Math.floor(new Date(report.began).getTime() / 1000) - 1);
    const url = `postgresql://sales_release_fixture@localhost:58033/${pg.database}?schema=public`, sql = new Client({ connectionString: url, connectionTimeoutMillis: 5000 }); await sql.connect();
    try {
      const row = (await sql.query("SELECT current_database() AS name,current_user AS actor,host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('data_directory') AS directory")).rows[0];
      assert.equal(row.name, pg.database); assert.equal(row.actor, dbTarget.user); assert.equal(row.host, '127.0.0.1'); assert.equal(row.port, dbTarget.port); assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(dbTarget.directory, 'data')).toLowerCase());
      const history = (await sql.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows, catalog = read(path.join(target.candidate, 'prisma/migration-catalog-manifest.json')); assert.equal(history.length, 122);
      history.forEach((entry, index) => { assert.equal(entry.migration_name, catalog.migrations[index].name); assert.equal(entry.checksum, catalog.migrations[index].rawSha256); assert(entry.finished_at && !entry.rolled_back_at); }); write(path.join(evidence, 'DATABASE_IDENTITY.json'), row);
    } finally { await sql.end(); }
    const client = require(target.privateClient); db = new client.PrismaClient({ datasources: { db: { url } } });
    const user = await db.user.findFirstOrThrow({ where: { id: ui.collectorUserId, organizationId: ui.organizationId, isActive: true, isVerified: true, emailVerified: true }, include: { roles: true } });
    assert.equal(user.roles.length, 1); role = user.roles[0]; assert.equal(role.organizationId, ui.organizationId); originalPermissions = [...role.permissions];
    assert(originalPermissions.includes('finance.receivables.read') && originalPermissions.includes('finance.receivables.collect') && originalPermissions.includes('dashboard.read') && !originalPermissions.includes('*'));
    const native = await db.paymentTransaction.findFirstOrThrow({ where: { id: ui.paymentTransactionId, organizationId: ui.organizationId, legacyPaymentId: null, ledgerPostingBatchId: null }, select: { id: true, providerAuthorityEventId: true, providerAccountId: true, providerTransactionId: true, providerReference: true, occurredAt: true, amount: true, currencyCode: true, providerAuthorityEvent: { select: { providerReference: true } } } });
    assert(native.amount.eq(ui.amount) && native.occurredAt); assert.equal(native.occurredAt.toISOString(), ui.settlementDate);
    primaryBefore = await financialFingerprint(db, fixture.organizationId); auxBefore = await auxState(db, ui); assert(new client.Prisma.Decimal(auxBefore.unpaid).gte(ui.amount));
    const pack = await db.closePackExport.findFirstOrThrow({ where: { id: fixture.exportId, organizationId: fixture.organizationId, closeRunId: fixture.closeRunId, isCertified: true } });
    assert(pack.canonicalContent); assert.equal(pack.canonicalContentSha256, fixture.documentDigest); assert.equal('sha256:' + hash(pack.canonicalContent), fixture.documentDigest);
    assert.equal(await db.account.count({ where: { userId: user.id, providerId: 'credential' } }), 0, 'Credential already initialized; any repeat requires a separately reviewed target/fixture policy');
    const password = 'Synthetic-' + crypto.randomBytes(24).toString('base64url') + '!', appRequire = createRequire(path.join(target.candidate, 'package.json')), argon = appRequire('argon2');
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: await argon.hash(password, { type: argon.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }) } });
    const supportPath = path.join(privateRun, 'synthetic-support.json'), support = JSON.stringify({ kind: 'synthetic-owned-ui-support', nativePaymentTransactionId: native.id, amount: ui.amount, currency: native.currencyCode, note: 'Fixture source facts only; no live provider authenticity or original-document custody is attested.' }, null, 2) + '\n'; fs.writeFileSync(supportPath, support, { flag: 'wx', mode: 0o600 });
    const controlFile = path.join(privateRun, 'browser-control.private.json');
    write(controlFile, { version: 1, origin: target.origin, locale: 'en', organizationId: ui.organizationId, actorId: user.id, email: user.email, password, customerId: ui.customerId, documentId: ui.documentId, paymentTransactionId: native.id,
      amount: ui.amount, method: ui.method, paymentDate: native.occurredAt.toISOString().slice(0, 10), providerReference: native.providerReference?.trim() || native.providerAuthorityEvent?.providerReference?.trim() || native.providerTransactionId, supportPath, supportSha256: hash(support), handshakeDirectory: handshakes });
    fs.writeFileSync(path.join(target.candidate, 'tsconfig.collection-runtime.json'), JSON.stringify({ extends: './tsconfig.json', compilerOptions: { paths: { '@/*': ['./*'], '@prisma/client': [path.join(target.privateClient, 'index.d.ts').replaceAll('\\', '/')] } } }, null, 2) + '\n', { flag: 'wx' });
    const env = { ...osEnv, NODE_ENV: 'development', HOSTNAME: '127.0.0.1', PORT: String(target.httpPort), DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url,
      NEXTAUTH_URL: target.origin, NEXT_PUBLIC_APP_URL: target.origin, NEXT_PUBLIC_BASE_URL: target.origin, APP_URL: target.origin, AUTH_SECRET: crypto.randomBytes(32).toString('hex'),
      PUBLIC_IDENTITY_ABUSE_HASH_SECRET: crypto.randomBytes(32).toString('hex'), AQSTOQFLOW_RECEIPT_TOKEN_SECRET: crypto.randomBytes(32).toString('hex'), AQSTOQFLOW_HISTORY_CURSOR_SECRET: crypto.randomBytes(32).toString('hex'), AQSTOQFLOW_STATEMENT_TOKEN_SECRET: crypto.randomBytes(32).toString('hex'), AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'), AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0', NEXT_TELEMETRY_DISABLED: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1', NEXT_DIST_DIR: '.next-collection-runtime', STOQUIFY_DEV_TSCONFIG: 'tsconfig.collection-runtime.json', TEMP: path.join(target.directory, 'temp'), TMP: path.join(target.directory, 'temp'),
      NODE_OPTIONS: '--dns-result-order=ipv4first --require ' + JSON.stringify(target.preload.replaceAll('\\', '/')), NODE_EXTRA_CA_CERTS: target.cert };
    stdout = fs.openSync(path.join(privateRun, 'application.stdout.private.log'), 'wx'); stderr = fs.openSync(path.join(privateRun, 'application.stderr.private.log'), 'wx');
    child = spawn(process.execPath, [path.join(target.candidate, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(target.httpPort)], { cwd: target.candidate, env, windowsHide: true, stdio: ['ignore', stdout, stderr] }); report.applicationPid = child.pid;
    proxy = transport.createTlsProxy(target); const sockets = new Set(); proxy.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); }); proxy.ownedSockets = sockets;
    proxy.on('upgrade', (request, socket, head) => { const upstream = require('node:net').connect({ host: '127.0.0.1', port: target.httpPort }, () => {
      upstream.write(request.method + ' ' + request.url + ' HTTP/' + request.httpVersion + '\r\n' + Object.entries({ ...request.headers, host: '127.0.0.1:' + target.tlsPort, 'x-forwarded-host': '127.0.0.1:' + target.tlsPort, 'x-forwarded-proto': 'https' }).map(([key, value]) => key + ': ' + value).join('\r\n') + '\r\n\r\n'); if (head.length) upstream.write(head); upstream.pipe(socket); socket.pipe(upstream);
    }); socket.on('error', () => upstream.destroy()); upstream.on('error', () => socket.destroy()); socket.on('close', () => upstream.destroy()); });
    await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(target.tlsPort, '127.0.0.1', resolve); });
    let ready = false; const readyDeadline = Date.now() + 300000;
    while (!stopped && Date.now() < readyDeadline) { assert.equal(child.exitCode, null, 'Owned Next CLI exited'); try { const response = await warmSession(target); if (response.status === 200 && !JSON.parse(response.body)?.user) { ready = true; break; } } catch {} await delay(1000); }
    assert(ready && !stopped, 'Owned authentication route did not become ready');
    write(path.join(__dirname, 'authenticated-app/APP_READY.json'), { ready: true, origin: target.origin, privateControlFile: controlFile, handshakeDirectory: handshakes, evidenceDirectory: evidence, sourceManifestSha256: target.sourceManifestSha256 }); console.log('Actual local collection runtime ready; credentials remain private.');
    const operations = ['stale-assurance', 'verify-no-collection-before-manual-retry', 'verify-one-collection', 'revoke-collect-permission', 'restore-collect-permission', 'revoke-current-session']; let index = 0, finished = false; const seen = new Set(), deadline = Date.now() + 1200000;
    while (!stopped && Date.now() < deadline) {
      const done = path.join(handshakes, 'FINISHED.json'); if (fs.existsSync(done)) { assert.equal(read(done).passed, true, 'Authenticated browser failed; safe evidence retained'); assert.equal(index, operations.length); finished = true; break; }
      for (const name of fs.readdirSync(handshakes).filter(name => /^[a-f0-9]{32}\.request\.json$/.test(name)).sort()) {
        if (seen.has(name)) continue; noLinks(path.join(handshakes, name)); const request = read(path.join(handshakes, name)); assert.deepEqual(Object.keys(request).sort(), ['id', 'operation']); assert.equal(name, request.id + '.request.json'); assert.equal(request.operation, operations[index]); seen.add(name);
        const sessions = await db.session.findMany({ where: { userId: user.id, createdAt: { gte: new Date(report.began) } }, select: { id: true } }); assert.equal(sessions.length, 1, 'Exactly one actual runtime session required');
        if (request.operation === 'stale-assurance') await db.session.update({ where: { id: sessions[0].id }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } });
        if (request.operation === 'verify-no-collection-before-manual-retry') { assert.deepEqual(await auxState(db, ui), auxBefore, 'Password verification executed a collection before manual retry'); report.noFinancialEffectFromIdentityVerification = true; }
        if (request.operation === 'verify-one-collection') {
          const after = await auxState(db, ui); assert.equal(after.settlementIds.length, auxBefore.settlementIds.length + 1); assert.equal(after.journalIds.length, auxBefore.journalIds.length + 1);
          assert(new client.Prisma.Decimal(auxBefore.balance).minus(ui.amount).eq(after.balance)); assert(new client.Prisma.Decimal(auxBefore.unpaid).minus(ui.amount).eq(after.unpaid)); assert(new client.Prisma.Decimal(auxBefore.paid).plus(ui.amount).eq(after.paid)); assert.equal(after.stateVersion, auxBefore.stateVersion + 1);
          const ids = after.settlementIds.filter(value => !auxBefore.settlementIds.includes(value)); assert.equal(ids.length, 1);
          const settlement = await db.customerSettlement.findFirstOrThrow({ where: { id: ids[0], organizationId: ui.organizationId, customerId: ui.customerId }, include: { allocations: true } });
          assert.equal(settlement.status, 'POSTED'); assert.equal(settlement.method, ui.method); assert(settlement.amount.eq(ui.amount)); assert.equal(settlement.documentHash, hash(support)); assert.equal(settlement.allocations.length, 1); assert.equal(settlement.allocations[0].customerReceivableDocumentId, ui.documentId);
          const claimed = await db.paymentTransaction.findFirstOrThrow({ where: { id: native.id, organizationId: ui.organizationId, sourceType: 'CUSTOMER_SETTLEMENT', sourceId: settlement.id, legacyPaymentId: null, ledgerPostingBatchId: settlement.ledgerPostingBatchId } });
          assert.equal(claimed.providerAuthorityEventId, native.providerAuthorityEventId); assert.equal(claimed.providerAccountId, native.providerAccountId);
          const authority = settlement.metadata.providerAuthority; assert.equal(authority.version, 1); assert.equal(authority.paymentTransactionId, native.id); assert.equal(authority.providerEventId, native.providerAuthorityEventId); assert.equal(authority.providerAccountId, native.providerAccountId); assert.equal(authority.providerTransactionId, native.providerTransactionId); assert.equal(authority.paymentMethod, ui.method); assert.equal(authority.amount, ui.amount); assert.equal(authority.currencyCode, native.currencyCode); assert.equal(typeof authority.ledgerAccountId, 'string');
          const journal = await db.journalEntry.findFirstOrThrow({ where: { id: settlement.journalEntryId, organizationId: ui.organizationId, status: 'POSTED', postingBatchId: settlement.ledgerPostingBatchId, sourceType: 'CUSTOMER_SETTLEMENT', sourceId: settlement.id }, include: { lines: true } });
          assert(journal.lines.reduce((sum, line) => sum.plus(line.debit), new client.Prisma.Decimal(0)).eq(ui.amount)); assert(journal.lines.reduce((sum, line) => sum.plus(line.credit), new client.Prisma.Decimal(0)).eq(ui.amount));
          const providerLines = journal.lines.filter(line => line.accountId === authority.ledgerAccountId); assert(providerLines.length && providerLines.every(line => line.currency === native.currencyCode)); assert(providerLines.reduce((sum, line) => sum.plus(line.debit).minus(line.credit), new client.Prisma.Decimal(0)).eq(ui.amount));
          assert.equal(await db.accountingSourceLink.count({ where: { organizationId: ui.organizationId, sourceType: 'CUSTOMER_SETTLEMENT', sourceId: settlement.id, postingBatchId: settlement.ledgerPostingBatchId, journalEntryId: journal.id } }), 1);
          const event = await db.businessEvent.findFirstOrThrow({ where: { id: settlement.postedBusinessEventId, organizationId: ui.organizationId, eventType: 'customer.settlement.posted', status: 'APPLIED', sourceType: 'CUSTOMER_SETTLEMENT', sourceId: settlement.id, postingBatchId: settlement.ledgerPostingBatchId, actorId: user.id } }); assert.deepEqual(event.payload.providerAuthority, authority);
          report.collectionVerified = { exactlyOneSettlementAndJournal: true, nativeReceiptLinkedToSamePosting: true, originalDocumentAllocation: true, customerAndReceivableReducedExactly100: true, sourceAndBusinessEventBound: true, supportFingerprintOnly: true };
          afterCollectionFingerprint = await financialFingerprint(db, ui.organizationId);
        }
        if (request.operation === 'revoke-collect-permission') { assert(afterCollectionFingerprint); const current = await db.role.findUniqueOrThrow({ where: { id: role.id } }); assert.deepEqual(current.permissions, originalPermissions); await db.role.update({ where: { id: role.id }, data: { permissions: originalPermissions.filter(value => value !== 'finance.receivables.collect') } }); }
        if (request.operation === 'restore-collect-permission') { const current = await db.role.findUniqueOrThrow({ where: { id: role.id } }); assert.deepEqual(current.permissions, originalPermissions.filter(value => value !== 'finance.receivables.collect')); await db.role.update({ where: { id: role.id }, data: { permissions: originalPermissions } }); }
        if (request.operation === 'revoke-current-session') await db.session.delete({ where: { id: sessions[0].id } });
        const applied = { id: request.id, operation: request.operation, applied: true, checkedAt: new Date().toISOString() }; write(path.join(handshakes, request.id + '.response.json'), applied); report.operations.push(applied); index++;
      }
      await delay(200);
    }
    assert(finished && !stopped && afterCollectionFingerprint, 'Bounded authenticated journey did not finish');
    assert.equal(await financialFingerprint(db, fixture.organizationId), primaryBefore, 'Primary closed October financial facts changed'); report.primaryOctoberAndRetainedPackUnchanged = true;
    for (const pack of fixtureReceipt.packs) { assert.equal(digest(pack.path), pack.sha256); assert.equal(fs.statSync(pack.path).size, pack.bytes); } report.privateOctoberPackFilesUnchanged = true;
    assert.equal(await financialFingerprint(db, ui.organizationId), afterCollectionFingerprint, 'Authority denial stages changed financial facts'); report.noFinancialWritesAfterVerifiedCollection = true;
    for (const file of manifest.files.filter(file => file.path !== 'next-env.d.ts')) assert.equal(digest(path.join(target.candidate, file.path)), file.sha256); report.generatedDeclarationSha256 = digest(path.join(target.candidate, 'next-env.d.ts')); report.passed = true;
  } catch (error) { failure = error; fs.writeFileSync(path.join(privateRun, 'failure.private.txt'), String(error.stack || error), { flag: 'wx', mode: 0o600 }); report.failure = 'Qualification failed; private diagnostic retained without credentials or bodies'; }
  finally {
    if (db && role && originalPermissions) { try { const current = await db.role.findUniqueOrThrow({ where: { id: role.id } }); if (JSON.stringify(current.permissions) !== JSON.stringify(originalPermissions)) await db.role.update({ where: { id: role.id }, data: { permissions: originalPermissions } }); report.collectPermissionRestored = true; } catch { report.collectPermissionRestored = false; report.passed = false; } }
    if (proxy) { try { for (const socket of proxy.ownedSockets) socket.destroy(); if (proxy.listening) await new Promise(resolve => proxy.close(resolve)); report.proxyStopped = true; } catch { report.passed = false; report.proxyStopped = false; } }
    if (child && child.exitCode === null) { try {
      const powershell = path.join(osEnv.SYSTEMROOT || osEnv.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
      const probe = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', `Get-CimInstance Win32_Process -Filter 'ProcessId = ${child.pid}' | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress`], { env: osEnv, windowsHide: true, encoding: 'utf8', timeout: 30000 }); assert.equal(probe.status, 0); const actual = JSON.parse(probe.stdout.trim()); assert.equal(actual.ProcessId, child.pid); assert.equal(actual.ParentProcessId, process.pid); assert.equal(fs.realpathSync(actual.ExecutablePath).toLowerCase(), fs.realpathSync(process.execPath).toLowerCase()); assert(actual.CommandLine.toLowerCase().replaceAll('\\', '/').includes(path.join(target.candidate, 'node_modules/next/dist/bin/next').toLowerCase().replaceAll('\\', '/')));
      const stoppedTree = spawnSync('C:/Windows/System32/taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { env: osEnv, windowsHide: true, encoding: 'utf8', timeout: 30000 }); assert.equal(stoppedTree.status, 0);
    } catch { report.processIdentityCleanupFailed = true; report.passed = false; } }
    if (child) { await Promise.race([new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve)), delay(5000)]); report.applicationStopped = child.exitCode !== null; if (!report.applicationStopped) report.passed = false; }
    for (const fd of [stdout, stderr]) if (fd !== undefined) { try { fs.closeSync(fd); } catch { report.passed = false; } }
    if (db) { try { await db.$disconnect(); } catch { report.passed = false; } }
    if (started) { try { assert.equal(fs.readFileSync(path.join(dbTarget.directory, 'data/postmaster.pid'), 'utf8').split(/\r?\n/)[0], postmasterId); pgControl(['-D', path.join(dbTarget.directory, 'data'), '-m', 'fast', '-t', '300', '-w', 'stop']); report.ownedClusterStopped = true; } catch { report.ownedClusterStopped = false; report.passed = false; } }
    try { await transport.freePort(target.httpPort); await transport.freePort(target.tlsPort); report.portsReleased = true; } catch { report.portsReleased = false; report.passed = false; }
    report.finishedAt = new Date().toISOString(); write(path.join(evidence, 'RESULT.json'), report); fs.writeFileSync(path.join(__dirname, 'authenticated-app/LATEST.json'), JSON.stringify(report, null, 2) + '\n'); process.stdin.pause();
  }
  console.log(JSON.stringify({ passed: report.passed, evidenceDirectory: evidence, applicationStopped: report.applicationStopped, ownedClusterStopped: report.ownedClusterStopped, portsReleased: report.portsReleased })); if (failure || !report.passed) process.exitCode = 1;
}
if (require.main === module) main().catch(() => { console.error('Collection runtime preflight refused; inspect reviewed local target and successful monthly PG receipt.'); process.exitCode = 1; });
