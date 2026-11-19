// Explicit owned local runtime. prepare writes only a NEW synthetic database;
// start takes a current-source snapshot and starts the real app, never a stale artifact.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..');
const prior = path.join(root, 'docs/stoquify-potential/development/sales-accounting-2026-11-08');
const bin = 'C:/Program Files/PostgreSQL/17/bin';
const origin = 'http://127.0.0.1:3196';
const targetPath = path.join(__dirname, 'DATABASE_TARGET.json');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const osEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
const privateWrite = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
function baseTarget() {
  const record = JSON.parse(fs.readFileSync(path.join(prior, 'DATABASE_TARGET.json'), 'utf8'));
  const owned = fs.realpathSync(path.join(root, '.codex-tmp')) + path.sep;
  if (!fs.realpathSync(record.directory).startsWith(owned) || !/^sales-accounting-20261108-[a-f0-9]{10}$/.test(path.basename(record.directory))
    || record.host !== 'localhost' || record.user !== 'sales_accounting_fixture' || !Number.isSafeInteger(record.port) || record.port < 1024 || record.port > 65535) throw Error('Invalid owned cluster manifest');
  return record;
}
function load() {
  const target = JSON.parse(fs.readFileSync(targetPath, 'utf8')), base = baseTarget();
  if (target.clusterDirectory !== base.directory || target.port !== base.port || target.user !== base.user || target.host !== '127.0.0.1'
    || !/^stoquify_auth_sales_20261108_[a-f0-9]{10}$/.test(target.database)
    || path.dirname(target.directory) !== path.join(root, '.codex-tmp') || !/^auth-sales-accounting-20261108-[a-f0-9]{10}$/.test(path.basename(target.directory))) throw Error('Invalid authenticated target manifest');
  return target;
}
const url = (record, database = record.database) => `postgresql://${record.user}@127.0.0.1:${record.port}/${database}?schema=public`;
function run(label, exe, args, extra = {}) {
  const result = spawnSync(exe, args, { cwd: root, env: osEnv(), windowsHide: true, encoding: 'utf8', timeout: 300000, maxBuffer: 32 * 1024 * 1024, ...extra });
  fs.writeFileSync(path.join(__dirname, `${label}.log`), `${result.stdout || ''}${result.stderr || ''}`.replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_SYNTHETIC_DATABASE]'));
  if (result.status !== 0) throw Error(`${label} failed (exit ${result.status}); inspect the retained log`);
  return result.stdout;
}
function startCluster(record) {
  const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.clusterDirectory, 'data'), 'status'], { env: osEnv(), windowsHide: true, stdio: 'ignore' });
  if (status.status === 0) return false;
  if (status.status !== 3) throw Error('Unable to determine owned cluster status');
  run('pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.clusterDirectory, 'data'), '-l', path.join(record.clusterDirectory, 'postgres.log'), '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' });
  return true;
}
function stopCluster(record) { run('pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.clusterDirectory, 'data'), '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' }); }
async function guard(record, database = record.database) {
  const { Client } = require(path.join(root, 'node_modules/pg'));
  const client = new Client({ connectionString: url(record, database), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    const row = (await client.query("SELECT current_database() AS name,current_user AS actor,current_setting('data_directory') AS directory")).rows[0];
    if (row.name !== database || row.actor !== record.user || fs.realpathSync(row.directory).toLowerCase() !== fs.realpathSync(path.join(record.clusterDirectory, 'data')).toLowerCase()) throw Error('Owned database identity mismatch');
    return client;
  } catch (error) { await client.end(); throw error; }
}
function assertSchema(record) {
  const provenance = JSON.parse(fs.readFileSync(path.join(prior, 'SCHEMA_PROVENANCE.json'), 'utf8'));
  const sourceSha256 = hash(fs.readFileSync(path.join(root, 'prisma/schema.prisma')));
  const sql = fs.readFileSync(path.join(record.clusterDirectory, 'schema.sql'), 'utf8');
  if (sourceSha256 !== provenance.sourceSha256 || hash(sql) !== provenance.sqlSha256 || /^\s*(DROP|TRUNCATE|DELETE|UPDATE)\b/im.test(sql)) throw Error('Review changed schema/bootstrap before preparing or starting');
  return { ...provenance, client: path.join(record.clusterDirectory, 'client') };
}
async function prepare() {
  if (fs.existsSync(targetPath)) throw Error('Refusing to replace an existing authenticated fixture');
  const base = baseTarget(), id = crypto.randomBytes(5).toString('hex');
  const record = { directory: path.join(root, '.codex-tmp', `auth-sales-accounting-20261108-${id}`), clusterDirectory: base.directory,
    database: `stoquify_auth_sales_20261108_${id}`, host: '127.0.0.1', port: base.port, user: base.user, origin,
    createdAt: new Date().toISOString(), method: 'New empty owned database; reviewed current datamodel bootstrap; no data clone' };
  const schema = assertSchema(record);
  fs.mkdirSync(record.directory, { recursive: false });
  write('DATABASE_TARGET.json', record);
  const started = startCluster(record);
  try {
    const admin = await guard(record, 'postgres');
    try {
      if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [record.database])).rowCount) throw Error('Refusing existing database');
      await admin.query(`CREATE DATABASE "${record.database}" TEMPLATE template0`);
    } finally { await admin.end(); }
    const connection = await guard(record); await connection.end();
    run('schema-apply', path.join(bin, 'psql.exe'), ['-X', '-h', record.host, '-p', String(record.port), '-U', record.user, '-d', record.database, '-v', 'ON_ERROR_STOP=1', '-f', path.join(record.clusterDirectory, 'schema.sql')]);
    const { PrismaClient } = require(schema.client), db = new PrismaClient({ datasources: { db: { url: url(record) } } });
    try {
      const fixture = await require('./fixture.cjs').seedFixture({ root, db, id });
      privateWrite(path.join(record.directory, 'credentials.private.json'), { origin, database: record.database, users: fixture.users });
      const publicFixture = { ...fixture, users: Object.fromEntries(Object.entries(fixture.users).map(([role, user]) => [role, { userId: user.userId, email: user.email, permissions: user.permissions }])) };
      write('FIXTURE.json', publicFixture);
      write('SCHEMA_PROVENANCE.json', schema);
      console.log('Prepared fresh synthetic fixture; no application or authentication operations executed.');
    } finally { await db.$disconnect(); }
  } finally { if (started) stopCluster(record); }
}
function copySource(destination) {
  const files = [];
  const skip = name => name === 'node_modules' || name === '.git' || name === '.codex-tmp' || name.startsWith('.env') || name.startsWith('.next') || name === 'tsconfig.tsbuildinfo';
  function copy(from, to, relative) {
    const stat = fs.lstatSync(from);
    if (stat.isSymbolicLink()) throw Error(`Source symlink requires explicit review: ${relative}`);
    if (stat.isDirectory()) { fs.mkdirSync(to, { recursive: true }); for (const name of fs.readdirSync(from)) if (!skip(name)) copy(path.join(from, name), path.join(to, name), path.join(relative, name)); }
    else if (stat.isFile()) { fs.copyFileSync(from, to); files.push({ path: relative.replaceAll('\\', '/'), sha256: hash(fs.readFileSync(to)) }); }
  }
  fs.mkdirSync(destination);
  const directories = ['actions', 'app', 'components', 'config', 'hooks', 'i18n', 'lib', 'messages', 'prisma', 'public', 'scripts', 'services', 'src', 'types', 'validations'];
  for (const name of directories) if (fs.existsSync(path.join(root, name))) copy(path.join(root, name), path.join(destination, name), name);
  for (const name of fs.readdirSync(root)) if (!skip(name) && fs.lstatSync(path.join(root, name)).isFile() && /\.(?:cjs|mjs|js|ts|json|css)$/.test(name)) copy(path.join(root, name), path.join(destination, name), name);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
function linkDependencies(source, client) {
  const modules = path.join(source, 'node_modules'); fs.mkdirSync(modules);
  const installed = path.join(root, 'node_modules');
  for (const name of fs.readdirSync(installed)) {
    if (name === '.prisma') continue;
    if (name.startsWith('@')) {
      fs.mkdirSync(path.join(modules, name));
      for (const child of fs.readdirSync(path.join(installed, name))) fs.symlinkSync(name === '@prisma' && child === 'client' ? client : path.join(installed, name, child), path.join(modules, name, child), 'junction');
    } else if (fs.statSync(path.join(installed, name)).isDirectory()) fs.symlinkSync(path.join(installed, name), path.join(modules, name), 'junction');
  }
  const resolved = createRequire(path.join(source, 'package.json')).resolve('@prisma/client');
  if (!fs.realpathSync(resolved).startsWith(fs.realpathSync(client) + path.sep)) throw Error('Private Prisma resolution failed');
  return resolved;
}
async function assertFreePort(port) {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  await new Promise(resolve => server.close(resolve));
}
async function terminateOwned(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    // PID comes only from the child created by this supervisor, never discovery.
    spawnSync(path.join(process.env.SYSTEMROOT || 'C:/Windows', 'System32/taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { env: osEnv(), windowsHide: true, stdio: 'ignore' });
  } else child.kill();
  if (child.exitCode === null && child.signalCode === null) await new Promise(resolve => { child.once('exit', resolve); const timeout = setTimeout(resolve, 10000); child.once('exit', () => clearTimeout(timeout)); });
}
async function start() {
  const record = load(), schema = assertSchema(record);
  const history = path.join(__dirname, 'runtime-history', new Date().toISOString().replace(/[:.]/g, '-'));
  for (const name of ['SOURCE_PROVENANCE.json', 'APPLICATION_TARGET.json', 'APPLICATION_READY.json']) {
    const previous = path.join(__dirname, name);
    if (fs.existsSync(previous)) { fs.mkdirSync(history, { recursive: true }); fs.copyFileSync(previous, path.join(history, name)); }
  }
  await assertFreePort(3196);
  if (process.argv.includes('--browser')) await assertFreePort(9316);
  const filesRoot = path.join(record.directory, `source-${crypto.randomBytes(4).toString('hex')}`);
  const files = copySource(filesRoot), resolvedClient = linkDependencies(filesRoot, schema.client);
  write('SOURCE_PROVENANCE.json', { createdAt: new Date().toISOString(), sourceRoot: filesRoot, files, manifestSha256: hash(JSON.stringify(files)), resolvedClient,
    limitation: 'Current-source development runtime; not a production artifact, migration-history or country-pack certification' });
  const secret = crypto.randomBytes(32).toString('hex');
  const env = { ...osEnv(), NODE_ENV: 'development', NODE_OPTIONS: '--dns-result-order=ipv4first', DATABASE_URL: url(record), DIRECT_URL: url(record), SHADOW_DATABASE_URL: url(record),
    NEXTAUTH_URL: origin, NEXT_PUBLIC_BASE_URL: origin, NEXT_PUBLIC_APP_URL: origin, AUTH_SECRET: secret, NEXTAUTH_SECRET: secret, BETTER_AUTH_SECRET: secret,
    NEXT_TELEMETRY_DISABLED: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1', PORT: '3196', NEXT_DIST_DIR: '.next-auth-sales-accounting',
    STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0' };
  for (const key of ['PUBLIC_IDENTITY_ABUSE_HASH_SECRET', 'AQSTOQFLOW_RECEIPT_TOKEN_SECRET', 'AQSTOQFLOW_HISTORY_CURSOR_SECRET', 'AQSTOQFLOW_STATEMENT_TOKEN_SECRET', 'AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY', 'AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY']) env[key] = crypto.randomBytes(32).toString('hex');
  const session = require(path.join(filesRoot, 'scripts/dev-app-safe.js')).prepareDevelopmentSession({ root: filesRoot, env, argv: ['--hostname', '127.0.0.1'] });
  const started = startCluster(record);
  let child, browser, stdout, stderr;
  const stopFile = path.join(record.directory, 'STOP');
  if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);
  try {
    const connection = await guard(record); await connection.end();
    stdout = fs.openSync(path.join(record.directory, 'application.stdout.log'), 'a'); stderr = fs.openSync(path.join(record.directory, 'application.stderr.log'), 'a');
    const nextCli = createRequire(path.join(filesRoot, 'package.json')).resolve('next/dist/bin/next');
    child = spawn(process.execPath, [nextCli, ...session.args], { cwd: filesRoot, env: session.env, windowsHide: true, stdio: ['ignore', stdout, stderr] });
    const applicationTarget = { pid: child.pid, supervisorPid: process.pid, origin, database: record.database, sourceRoot: filesRoot,
      distDir: session.distDir, createdAt: new Date().toISOString(), ambientEnvironmentExcluded: true, privatePrisma: resolvedClient };
    write('APPLICATION_TARGET.json', applicationTarget);
    let exit = null; child.on('exit', (code, signal) => { exit = { code, signal }; });
    let stopping = false; process.once('SIGINT', () => { stopping = true; }); process.once('SIGTERM', () => { stopping = true; });
    const deadline = Date.now() + 300000; let ready = false;
    while (Date.now() < deadline && !exit && !stopping && !fs.existsSync(stopFile)) {
      try { const response = await fetch(origin + '/favicon.ico', { signal: AbortSignal.timeout(20000) }); if (response.status === 200) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw Error('Application readiness failed; inspect private logs');
    if (process.argv.includes('--browser')) {
      const executable = 'C:/Users/J COMPUTER/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
      if (!fs.existsSync(executable)) throw Error('Reviewed owned Chromium executable is absent');
      const profile = path.join(record.directory, `browser-profile-${crypto.randomBytes(4).toString('hex')}`);
      browser = spawn(executable, ['--headless', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=9316', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'],
        { cwd: record.directory, env: osEnv(), windowsHide: true, stdio: 'ignore' });
      browser.on('error', () => { stopping = true; });
      applicationTarget.browser = { pid: browser.pid, cdpOrigin: 'http://127.0.0.1:9316', profile, executable, owned: true };
      write('APPLICATION_TARGET.json', applicationTarget);
      let browserReady = false;
      for (let attempt = 0; attempt < 30 && !stopping; attempt++) {
        try { const response = await fetch('http://127.0.0.1:9316/json/version', { signal: AbortSignal.timeout(1000) }); if (response.ok) { browserReady = true; break; } } catch {}
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!browserReady) throw Error('Owned Chromium readiness failed');
    }
    write('APPLICATION_READY.json', { origin, pid: child.pid, utc: new Date().toISOString(), readiness: '/favicon.ico returned 200', authenticatedProof: false });
    console.log(`Owned current-source app ready at ${origin}; waiting for browser work or owned stop marker.`);
    while (!exit && !stopping && !fs.existsSync(stopFile)) await new Promise(resolve => setTimeout(resolve, 1000));
    if (exit) throw Error(`Owned application exited: ${JSON.stringify(exit)}`);
  } finally {
    await terminateOwned(browser);
    await terminateOwned(child);
    if (stdout !== undefined) fs.closeSync(stdout); if (stderr !== undefined) fs.closeSync(stderr);
    if (started) stopCluster(record);
    write('APPLICATION_STOPPED.json', { utc: new Date().toISOString(), origin, ownedClusterStopped: started });
  }
}
async function grantCloseAssessment() {
  const record = load(), schema = assertSchema(record), started = startCluster(record);
  try {
    const connection = await guard(record); await connection.end();
    const { PrismaClient } = require(schema.client), db = new PrismaClient({ datasources: { db: { url: url(record) } } });
    try {
      if (await db.session.count() || await db.salesOrder.count() || await db.customerSettlement.count()) throw Error('Fixture already in use; refusing setup-only role update');
      const fixturePath = path.join(__dirname, 'FIXTURE.json');
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const role = await db.role.findUniqueOrThrow({ where: { organizationId_code: { organizationId: fixture.organizationId, code: 'SYNTHETIC_ACCOUNTANT' } } });
      const permissions = [...new Set([...role.permissions, 'accounting.close.run'])];
      await db.role.update({ where: { id: role.id }, data: { permissions } });
      fixture.users.accountant.permissions = permissions;
      fixture.setupAmendments = [...(fixture.setupAmendments || []), { utc: new Date().toISOString(), permission: 'accounting.close.run', reason: 'Requested actual close assessment and stale-evidence observation; no sign/review/certify authority' }];
      fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2) + '\n');
      const privatePath = path.join(record.directory, 'credentials.private.json');
      const credentials = JSON.parse(fs.readFileSync(privatePath, 'utf8'));
      credentials.users.accountant.permissions = permissions;
      fs.writeFileSync(privatePath, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 });
      console.log('Added requested close-assessment permission to unused synthetic accountant; no application transaction or session created.');
    } finally { await db.$disconnect(); }
  } finally { if (started) stopCluster(record); }
}
async function main() {
  const mode = process.argv[2];
  if (mode === 'prepare') return prepare();
  if (mode === 'start') return start();
  if (mode === 'repair-bank-mapping') {
    const record = load(), schema = assertSchema(record);
    const connection = await guard(record); await connection.end();
    const { PrismaClient } = require(schema.client), db = new PrismaClient({ datasources: { db: { url: url(record) } } });
    try {
      const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'FIXTURE.json'), 'utf8'));
      const result = await db.$transaction(async tx => {
        if (await tx.customerSettlement.count() || await tx.journalEntry.count() !== 2) throw Error('Unexpected financial state; refusing fixture setup repair');
        const rule = await tx.postingRule.findFirstOrThrow({ where: { organizationId: fixture.organizationId, code: 'TEST_AR_SETTLEMENT', sourceType: 'CUSTOMER_SETTLEMENT', postingPurpose: 'CUSTOMER_SETTLEMENT' }, include: { lines: { include: { account: true } } } });
        if (rule.lines.length !== 2) throw Error('Unexpected fixture posting rule');
        for (const line of rule.lines) {
          const expected = line.lineNumber === 1 ? ['TEST_BANK', 'BANK', 'DEBIT'] : ['TEST_AR', 'ACCOUNTS_RECEIVABLE', 'CREDIT'];
          if (line.organizationId !== fixture.organizationId || line.account.organizationId !== fixture.organizationId || line.account.code !== expected[0] || line.side !== expected[2] || line.amountSource !== 'SOURCE_AMOUNT') throw Error('Unexpected fixture account binding');
          await tx.postingRuleLine.update({ where: { id: line.id }, data: { accountId: null, mappingKey: expected[1] } });
        }
        return { ruleId: rule.id, lines: 2, settlementsBefore: 0, postedJournalsBefore: 2 };
      });
      const previous = fs.existsSync(path.join(__dirname, 'FIXTURE_REPAIR.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'FIXTURE_REPAIR.json'), 'utf8')) : null;
      write('FIXTURE_REPAIR.json', { utc: new Date().toISOString(), ...result, previousRepair: previous, reason: 'Synthetic settlement rule must use mapping-only rail/receivable lines (accountId and mappingKey are mutually exclusive). Domain controls correctly rejected and rolled back both invalid fixture configurations. Only owned fixture configuration repaired; application controls unchanged.' });
      console.log('Repaired explicit mapping keys on the two owned synthetic settlement rule lines only.');
    } finally { await db.$disconnect(); }
    return;
  }
  if (mode === 'grant-close-assessment') return grantCloseAssessment();
  if (mode === 'stop') { const record = load(); fs.writeFileSync(path.join(record.directory, 'STOP'), 'Owned runtime stop requested\n'); return; }
  throw Error('Expected prepare, start, stop, or setup-only grant-close-assessment');
}
main().catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_SYNTHETIC_DATABASE]')); process.exitCode = 1; });
