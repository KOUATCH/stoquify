// Real PostgreSQL advisory-lock and synthetic local restore qualification.
// No production promotion, application build, existing DB reset/drop, or .env.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), bin = 'C:/Program Files/PostgreSQL/17/bin';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const clean = value => String(value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_LOCAL_DATABASE]');
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, osEnv);
require('node:dns').setDefaultResultOrder('ipv4first');
const { Client } = require(path.join(root, 'node_modules/pg'));
const quote = identifier => '"' + identifier.replaceAll('"', '""') + '"';
function target() {
  const value = read(path.join(__dirname, 'DATABASE_TARGET.json'));
  const owned = fs.realpathSync(path.join(root, '.codex-tmp')) + path.sep;
  const match = path.basename(value.directory).match(/^sales-release-migrations-20261109-([a-f0-9]{10})$/);
  assert(match && fs.realpathSync(value.directory).startsWith(owned));
  assert.equal(value.clusterDirectory, value.directory); assert.equal(value.host, 'localhost'); assert.equal(value.user, 'sales_release_fixture');
  assert(Number.isSafeInteger(value.port) && value.port >= 1024 && value.port <= 65535);
  assert.equal(value.freshDatabase, `stoquify_replay_20261109_${match[1]}`);
  assert.equal(value.posDatabase, `stoquify_pos_audit_20261109_${match[1]}`);
  return value;
}
const url = (record, database) => `postgresql://${record.user}@localhost:${record.port}/${database}?schema=public`;
async function verifyIdentity(client, record, database) {
  const { rows: [row] } = await client.query("SELECT current_database() AS name,current_user AS actor,current_setting('data_directory') AS directory,host(inet_server_addr()) AS host,inet_server_port() AS port,pg_backend_pid() AS pid");
  assert.equal(row.name, database); assert.equal(row.actor, record.user); assert.equal(row.host, '127.0.0.1'); assert.equal(row.port, record.port);
  assert.equal(fs.realpathSync(row.directory).toLowerCase(), fs.realpathSync(path.join(record.clusterDirectory, 'data')).toLowerCase());
  return row;
}
async function connected(record, database, name) {
  const client = new Client({ connectionString: url(record, database), connectionTimeoutMillis: 5000, application_name: name });
  await client.connect();
  try { await verifyIdentity(client, record, database); return client; } catch (error) { await client.end(); throw error; }
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function timeout(promise, label) {
  let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(`${label} timed out`)), 15000); })]).finally(() => clearTimeout(timer));
}
async function lockProbe(id, evidence) {
  const record = target(), database = record.freshDatabase, prefix = `sales-lock-${id}`;
  const apiPath = path.join(root, 'scripts/promote-release-schema.cjs'), apiHash = hash(fs.readFileSync(apiPath));
  const candidateManifestPath = path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json'), candidateManifest = read(candidateManifestPath);
  assert(fs.realpathSync(candidateManifest.candidate).startsWith(fs.realpathSync(path.join(root, '.codex-tmp')) + path.sep));
  const sourceBinding = ['scripts/promote-release-schema.cjs', 'scripts/prisma-production-migration-gate.js'].map(relative => {
    const expected = candidateManifest.files.find(file => file.path === relative); assert(expected, `Missing candidate binding for ${relative}`);
    const rootSha256 = hash(fs.readFileSync(path.join(root, relative))), candidateSha256 = hash(fs.readFileSync(path.join(candidateManifest.candidate, relative)));
    assert.equal(rootSha256, expected.sha256, `Root source differs from frozen candidate: ${relative}`);
    assert.equal(candidateSha256, expected.sha256, `Frozen candidate changed: ${relative}`);
    return { path: relative, sha256: rootSha256 };
  });
  const { withMigrationLock } = require(apiPath);
  const { buildDeploymentDecision } = require(path.join(root, 'scripts/prisma-production-migration-gate.js'));
  const decision = buildDeploymentDecision('production', { DATABASE_URL: url(record, database) });
  assert(decision.blockers.includes('database_target_is_local'), 'Local production-target refusal must remain intact');
  const make = suffix => new Client({ connectionString: url(record, database), connectionTimeoutMillis: 5000, application_name: `${prefix}-${suffix}` });
  const control = await connected(record, database, `${prefix}-control`), checks = [];
  const report = { utc: new Date().toISOString(), database, api: 'scripts/promote-release-schema.cjs:withMigrationLock', apiSha256: apiHash,
    candidateManifestSha256: hash(fs.readFileSync(candidateManifestPath)), sourceBinding, passed: false, checks };
  try {
    const release = deferred(), entered = deferred(), holder = make('holder');
    let contenderRan = false;
    const owner = withMigrationLock(holder, async signal => {
      const identity = await verifyIdentity(holder, record, database); assert.equal(signal.aborted, false);
      entered.resolve(identity.pid); await release.promise; assert.equal(signal.aborted, false); return 'owner-completed';
    });
    const ownerOutcome = owner.then(value => ({ success: true, value }), error => ({ success: false, error }));
    let ownerPid;
    try {
      ownerPid = await timeout(entered.promise, 'Owner lock acquisition');
      await assert.rejects(withMigrationLock(make('contender'), async () => { contenderRan = true; }), /already running/);
      assert.equal(contenderRan, false);
      const active = (await control.query('SELECT pid,datname,usename,application_name FROM pg_stat_activity WHERE pid=$1', [ownerPid])).rows[0];
      assert.equal(active.application_name, `${prefix}-holder`); assert.equal(active.datname, database); assert.equal(active.usename, record.user);
      const locks = (await control.query("SELECT count(*)::int AS count FROM pg_locks WHERE locktype='advisory' AND pid=$1", [ownerPid])).rows[0].count;
      assert.equal(locks, 1); assert.equal((await holder.query('SELECT 1 AS alive')).rows[0].alive, 1);
      checks.push({ name: 'Contender refused without running its operation or disturbing owner', passed: true, ownerPid, ownedAdvisoryLocksWhileHeld: locks });
    } finally { release.resolve(); }
    const completed = await timeout(ownerOutcome, 'Owner release'); assert(completed.success); assert.equal(completed.value, 'owner-completed');
    await assert.rejects(withMigrationLock(make('failure'), async signal => { assert.equal(signal.aborted, false); throw Error('injected-owned-operation-failure'); }), /injected-owned-operation-failure/);
    assert.equal(await withMigrationLock(make('reacquired'), async signal => { assert.equal(signal.aborted, false); return 'reacquired-after-failure'; }), 'reacquired-after-failure');
    checks.push({ name: 'Operation failure unlocks; subsequent owner reacquires and completes', passed: true });
    const started = deferred(); let observedAbort = false, lostSignal;
    const terminated = withMigrationLock(make('terminated'), async signal => {
      lostSignal = signal;
      const client = (await control.query('SELECT pid FROM pg_stat_activity WHERE application_name=$1 AND datname=$2 AND usename=$3', [`${prefix}-terminated`, database, record.user])).rows;
      assert.equal(client.length, 1); started.resolve(client[0].pid);
      await timeout(new Promise(resolve => { if (signal.aborted) resolve(); else signal.addEventListener('abort', resolve, { once: true }); }), 'Abort after holder termination');
      observedAbort = signal.aborted; return 'must-not-report-success';
    });
    const terminatedOutcome = terminated.then(value => ({ success: true, value }), error => ({ success: false, error }));
    const terminatedPid = await timeout(started.promise, 'Termination holder acquisition');
    const killed = await control.query('SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity WHERE pid=$1 AND datname=$2 AND usename=$3 AND application_name=$4', [terminatedPid, database, record.user, `${prefix}-terminated`]);
    assert.equal(killed.rowCount, 1); assert.equal(killed.rows[0].terminated, true);
    const lost = await timeout(terminatedOutcome, 'Terminated holder rejection'); assert.equal(lost.success, false); assert.equal(observedAbort, true); assert.equal(lostSignal.aborted, true);
    assert.equal(await withMigrationLock(make('after-termination'), async signal => { assert.equal(signal.aborted, false); return 'reacquired-after-disconnect'; }), 'reacquired-after-disconnect');
    checks.push({ name: 'Owned holder termination aborts operation, rejects success, and releases lock for reacquisition', passed: true, terminatedPid, rejection: clean(lost.error.message) });
    const remaining = (await control.query("SELECT count(*)::int AS count FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE l.locktype='advisory' AND a.application_name LIKE $1", [`${prefix}-%`])).rows[0].count;
    assert.equal(remaining, 0); assert.equal(hash(fs.readFileSync(apiPath)), apiHash, 'Lock implementation changed during qualification');
    for (const file of sourceBinding) assert.equal(hash(fs.readFileSync(path.join(root, file.path))), file.sha256, `Root implementation changed during qualification: ${file.path}`);
    report.localProductionTargetRefused = true; report.remainingOwnedLocks = remaining; report.passed = true;
  } catch (error) { report.failure = clean(error.message); throw error; }
  finally { await control.end(); fs.writeFileSync(path.join(evidence, 'lock-probes.json'), JSON.stringify(report, null, 2) + '\n'); }
}
async function profile(record, database) {
  const client = await connected(record, database, 'sales-restore-read-only');
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    const profiles = [];
    for (const { tablename } of tables) {
      const rows = (await client.query(`SELECT row_to_json(t)::text AS row FROM public.${quote(tablename)} t ORDER BY row_to_json(t)::text`)).rows;
      const digest = crypto.createHash('sha256'); for (const row of rows) digest.update(row.row).update('\n');
      profiles.push({ table: tablename, count: rows.length, sha256: digest.digest('hex') });
    }
    const sequences = [];
    for (const { sequencename } of (await client.query("SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")).rows) sequences.push({ name: sequencename, ...(await client.query(`SELECT last_value::text,is_called FROM public.${quote(sequencename)}`)).rows[0] });
    const schema = {
      columns: (await client.query("SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale,datetime_precision FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows,
      triggers: (await client.query("SELECT c.relname AS table_name,t.tgname AS name,t.tgenabled AS enabled,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname")).rows,
      constraints: (await client.query("SELECT c.relname AS table_name,k.conname AS name,k.contype AS type,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname")).rows,
      functions: (await client.query("SELECT p.proname AS name,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' ORDER BY p.proname,pg_get_functiondef(p.oid)")).rows,
      indexes: (await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows,
    };
    const history = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    const financial = {
      customers: (await client.query('SELECT id,"organizationId","currentBalance"::text FROM customers ORDER BY id')).rows,
      sales: (await client.query('SELECT id,"organizationId",status::text,"paymentStatus"::text,total::text FROM sales_orders ORDER BY id')).rows,
      settlements: (await client.query('SELECT id,"organizationId",status::text,method::text,amount::text,"receivedById","reversedById","journalEntryId","reversalJournalEntryId" FROM customer_settlements ORDER BY id')).rows,
      receivables: (await client.query('SELECT DISTINCT ON ("documentId") "documentId",version,status::text,"paidAmount"::text,"unpaidAmount"::text FROM customer_receivable_document_states ORDER BY "documentId",version DESC')).rows,
      inventory: (await client.query('SELECT "itemId","locationId","quantityOnHand"::text,"quantityAvailable"::text,"totalValue"::text FROM inventory_levels ORDER BY "itemId","locationId"')).rows,
      journals: (await client.query('SELECT j.id,j.status::text,sum(l.debit)::text AS debit,sum(l.credit)::text AS credit FROM journal_entries j LEFT JOIN journal_entry_lines l ON l."journalEntryId"=j.id GROUP BY j.id,j.status ORDER BY j.id')).rows,
    };
    await client.query('COMMIT'); return { tables: profiles, sequences, schema, history, financial };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { await client.end(); }
}
function verifyHistory(snapshot) {
  const expected = read(path.join(__dirname, 'MIGRATION_SOURCE_PROVENANCE.json')).migrations;
  assert.equal(expected.length, 121); assert.equal(snapshot.history.length, 121);
  assert.deepEqual(snapshot.history.map(row => row.migration_name), expected.map(item => item.name));
  snapshot.history.forEach((row, index) => { assert(row.finished_at && !row.rolled_back_at); assert.equal(row.checksum, expected[index].rawSha256); });
}
function pgEnv(record, database) { return { ...osEnv, PGHOST: '127.0.0.1', PGPORT: String(record.port), PGUSER: record.user, PGDATABASE: database }; }
async function run() {
  const record = target(), id = crypto.randomBytes(5).toString('hex'), evidence = path.join(__dirname, `lock-restore-${id}`), privateDir = path.join(record.directory, `lock-restore-${id}`);
  fs.mkdirSync(evidence); fs.mkdirSync(privateDir);
  const report = { began: new Date().toISOString(), passed: false, sourceClass: 'Owned synthetic migration/POS test data only', sourceDatabase: record.posDatabase, lockDatabase: record.freshDatabase,
    runnerSha256: hash(fs.readFileSync(__filename)), checks: [], limitations: ['Synthetic local restore only; no production backup, hosted recovery or SLA/RPO/RTO certification', 'No production schema promotion or application deployment invoked'] };
  const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n');
  write('DATABASE_TARGET.json', record);
  const execute = (label, executable, args, env = osEnv, extra = {}) => {
    console.log(`${label}: starting`);
    const result = spawnSync(executable, args, { cwd: root, env, windowsHide: true, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 300000, ...extra });
    fs.writeFileSync(path.join(evidence, `${label}.log`), clean(result.stdout) + clean(result.stderr));
    write(`${label}.execution.json`, { executable, args, exitCode: result.status, errorCode: result.error?.code, utc: new Date().toISOString() });
    console.log(`${label}: exit ${result.status}`); assert(!result.error && result.status === 0, `${label} failed; inspect retained log`); return result;
  };
  let opened = false, failure;
  try {
    const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.clusterDirectory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' });
    assert.equal(status.status, 3, 'Owned cluster already running; wait for previous qualifier to stop');
    opened = true;
    execute('lock-pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.clusterDirectory, 'data'), '-l', path.join(record.directory, 'postgres.log'), '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start'], osEnv, { stdio: 'ignore' });
    const admin = await connected(record, 'postgres', 'sales-lock-restore-supervisor'); await admin.end();
    execute('real-lock-probes', process.execPath, [__filename, 'probe-child', id]);
    report.checks.push({ name: 'Real exported advisory lock', passed: read(path.join(evidence, 'lock-probes.json')).passed });
    const before = await profile(record, record.posDatabase); verifyHistory(before);
    assert(before.tables.find(table => table.table === 'journal_entries').count > 0, 'Populated financial source required');
    write('source-before.json', before);
    const restoreDatabase = `stoquify_restore_sales_20261109_${id}`, dump = path.join(privateDir, 'synthetic-financial-backup.dump');
    report.restoreDatabase = restoreDatabase;
    execute('pg-dump-version', path.join(bin, 'pg_dump.exe'), ['--version']);
    execute('pg-restore-version', path.join(bin, 'pg_restore.exe'), ['--version']);
    execute('pg-dump', path.join(bin, 'pg_dump.exe'), ['--format=custom', '--no-owner', '--no-privileges', '--file', dump], pgEnv(record, record.posDatabase));
    report.dump = { privatePath: dump, sha256: hash(fs.readFileSync(dump)), bytes: fs.statSync(dump).size };
    const manager = await connected(record, 'postgres', 'sales-restore-create-new');
    try {
      assert.match(restoreDatabase, /^stoquify_restore_sales_20261109_[a-f0-9]{10}$/);
      assert.equal((await manager.query('SELECT 1 FROM pg_database WHERE datname=$1', [restoreDatabase])).rowCount, 0, 'Refusing existing restore database');
      await manager.query(`CREATE DATABASE ${quote(restoreDatabase)} TEMPLATE template0`);
    } finally { await manager.end(); }
    execute('pg-restore', path.join(bin, 'pg_restore.exe'), ['--exit-on-error', '--no-owner', '--no-privileges', '--dbname', restoreDatabase, dump], pgEnv(record, restoreDatabase));
    const restored = await profile(record, restoreDatabase), sourceAfter = await profile(record, record.posDatabase); verifyHistory(restored); verifyHistory(sourceAfter);
    write('restored-after.json', restored); write('source-after.json', sourceAfter);
    assert.deepEqual(restored, before, 'Restored contents/schema/functions/constraints/sequences differ from source');
    assert.deepEqual(sourceAfter, before, 'Read-only dump/profile changed the original source');
    report.checks.push({ name: 'Custom-format restore into new database; source unchanged', passed: true,
      allPublicTables: before.tables.length, nonemptyTables: before.tables.filter(table => table.count > 0).length,
      sequences: before.sequences.length, triggers: before.schema.triggers.length, constraints: before.schema.constraints.length,
      functions: before.schema.functions.length, financialSnapshotSha256: hash(JSON.stringify(before.financial)), tableProfilesSha256: hash(JSON.stringify(before.tables)) });
    report.passed = true;
  } catch (error) { failure = error; report.failure = clean(error.message); }
  finally {
    if (opened) {
      try { execute('lock-pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.clusterDirectory, 'data'), '-m', 'fast', '-w', 'stop'], osEnv, { stdio: 'ignore' }); report.ownedClusterStopped = true; }
      catch (error) { report.cleanupFailure = clean(error.message); report.passed = false; failure ||= error; }
    }
    report.ended = new Date().toISOString(); write('RESULT.json', report);
    fs.writeFileSync(path.join(__dirname, 'LOCK_RESTORE_LATEST.json'), JSON.stringify({ evidenceDirectory: evidence, ...report }, null, 2) + '\n');
  }
  if (failure) throw failure;
}
async function certifyRestore(id) {
  const record = target(), original = path.join(__dirname, `lock-restore-${id}`), prior = read(path.join(original, 'RESULT.json'));
  const restoredDatabase = `stoquify_restore_sales_20261109_${id}`, dump = path.join(record.directory, `lock-restore-${id}`, 'synthetic-financial-backup.dump');
  assert.equal(prior.passed, false); assert.equal(prior.ownedClusterStopped, true); assert.equal(prior.restoreDatabase, restoredDatabase);
  assert(prior.failure.startsWith('Restored contents/schema/functions/constraints/sequences differ from source'));
  assert.equal(prior.dump.privatePath, dump); assert.equal(hash(fs.readFileSync(dump)), prior.dump.sha256); assert.equal(fs.statSync(dump).size, prior.dump.bytes);
  assert.equal(read(path.join(original, 'lock-probes.json')).passed, true);
  const before = read(path.join(original, 'source-before.json')), restoredBefore = read(path.join(original, 'restored-after.json'));
  assert.deepEqual(read(path.join(original, 'source-after.json')), before); verifyHistory(before); verifyHistory(restoredBefore);
  const differences = before.schema.constraints.flatMap((entry, index) => {
    const restored = restoredBefore.schema.constraints[index];
    if (JSON.stringify(entry) === JSON.stringify(restored)) return [];
    assert.equal(entry.type, 'c'); assert.equal(restored.type, 'c');
    assert.deepEqual({ ...restored, definition: entry.definition }, entry);
    return [{ source: entry, restored }];
  });
  assert.equal(differences.length, 13);
  const differenceFile = path.join(original, 'constraint-differences.json'), retainedDifferences = read(differenceFile);
  assert.deepEqual(differences, retainedDifferences.differences);
  const adjusted = structuredClone(restoredBefore); adjusted.schema.constraints = before.schema.constraints;
  assert.deepEqual(adjusted, before, 'A difference outside the 13 reviewed CHECK definitions exists');
  const evidence = path.join(__dirname, `restore-parser-certification-${crypto.randomBytes(5).toString('hex')}`); fs.mkdirSync(evidence);
  const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n');
  const serial = value => JSON.parse(JSON.stringify(value));
  const report = { began: new Date().toISOString(), passed: false, originalEvidence: original, sourceDatabase: record.posDatabase, restoredDatabase,
    dump: prior.dump, originalResultSha256: hash(fs.readFileSync(path.join(original, 'RESULT.json'))),
    sourceBeforeSha256: hash(fs.readFileSync(path.join(original, 'source-before.json'))),
    restoredBeforeSha256: hash(fs.readFileSync(path.join(original, 'restored-after.json'))),
    differencesSha256: hash(fs.readFileSync(differenceFile)), runnerSha256: hash(fs.readFileSync(__filename)),
    limitations: prior.limitations, checks: [] };
  write('DATABASE_TARGET.json', record);
  const execute = (label, executable, args) => {
    console.log(`${label}: starting`);
    const result = spawnSync(executable, args, { cwd: root, env: osEnv, windowsHide: true, stdio: 'ignore', timeout: 60000 });
    write(`${label}.execution.json`, { executable, args, exitCode: result.status, errorCode: result.error?.code, utc: new Date().toISOString() });
    console.log(`${label}: exit ${result.status}`); assert(!result.error && result.status === 0, `${label} failed`);
  };
  let opened = false, failure;
  try {
    const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.clusterDirectory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' });
    assert.equal(status.status, 3, 'Owned cluster already running; refuse overlapping manager'); opened = true;
    execute('parser-pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.clusterDirectory, 'data'), '-l', path.join(record.directory, 'postgres.log'), '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start']);
    assert.deepEqual(serial(await profile(record, record.posDatabase)), before, 'Source changed since original restore');
    assert.deepEqual(serial(await profile(record, restoredDatabase)), restoredBefore, 'Restored DB changed since original restore');
    const parser = await connected(record, restoredDatabase, 'sales-restore-temp-parser'), canonical = [];
    try {
      await parser.query('BEGIN'); await parser.query('SET LOCAL search_path = public, pg_temp');
      const columns = async relation => (await parser.query("SELECT a.attname,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,CASE WHEN a.attcollation=0 THEN NULL ELSE n.nspname||'.'||c.collname END AS collation FROM pg_attribute a LEFT JOIN pg_collation c ON c.oid=a.attcollation LEFT JOIN pg_namespace n ON n.oid=c.collnamespace WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum", [relation])).rows;
      for (const [index, difference] of differences.entries()) {
        const types = await columns(`public.${quote(difference.source.table_name)}`), parsed = [];
        for (const [kind, entry] of Object.entries(difference)) {
          assert(entry.definition.startsWith('CHECK ('));
          const temporary = `restore_check_${id}_${index}_${kind}`, relation = `pg_temp.${quote(temporary)}`;
          await parser.query(`CREATE TEMP TABLE ${quote(temporary)} (LIKE public.${quote(entry.table_name)})`);
          assert.deepEqual(await columns(relation), types, 'TEMP scaffold must preserve exact column types, NOT NULL flags and collations');
          await parser.query(`ALTER TABLE ${relation} ADD CONSTRAINT parser_proof ${entry.definition}`);
          const check = (await parser.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=$1::regclass AND conname='parser_proof' AND contype='c'", [relation])).rows;
          assert.equal(check.length, 1); parsed.push(check[0].definition);
        }
        assert.equal(parsed[0], parsed[1], `CHECK parser results differ: ${difference.source.name}`);
        assert.equal(parsed[0], difference.restored.definition, 'Restored CHECK must equal the exact PostgreSQL parser fixed point');
        canonical.push({ ...difference, canonicalDefinition: parsed[0], columnTypesAndCollationsSha256: hash(JSON.stringify(types)), passed: true });
      }
    } finally { await parser.query('ROLLBACK').catch(() => {}); await parser.end(); }
    write('canonical-check-probes.json', canonical);
    const sourceAfter = serial(await profile(record, record.posDatabase)), restoredAfter = serial(await profile(record, restoredDatabase));
    write('source-after.json', sourceAfter); write('restored-after.json', restoredAfter);
    assert.deepEqual(sourceAfter, before, 'Source changed during parser proof'); assert.deepEqual(restoredAfter, restoredBefore, 'TEMP parser proof changed restored public data/schema');
    assert.equal(hash(fs.readFileSync(dump)), prior.dump.sha256, 'Original dump changed');
    report.checks.push({ name: 'Exact paired PostgreSQL parser proof in rolled-back TEMP scaffolds', passed: true, checks: canonical.length });
    report.checks.push({ name: 'Restored financial data and migration checksums match; source/restored public schemas and rows unchanged by proof', passed: true,
      allPublicTables: before.tables.length, nonemptyTables: before.tables.filter(table => table.count > 0).length,
      sequences: before.sequences.length, triggers: before.schema.triggers.length, constraints: before.schema.constraints.length,
      checkConstraints: before.schema.constraints.filter(constraint => constraint.type === 'c').length, functions: before.schema.functions.length,
      financialSnapshotSha256: hash(JSON.stringify(before.financial)), tableProfilesSha256: hash(JSON.stringify(before.tables)) });
    report.passed = true;
  } catch (error) { failure = error; report.failure = clean(error.message); }
  finally {
    if (opened) {
      try { execute('parser-pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.clusterDirectory, 'data'), '-m', 'fast', '-w', 'stop']); report.ownedClusterStopped = true; }
      catch (error) { report.cleanupFailure = clean(error.message); report.passed = false; failure ||= error; }
    }
    report.ended = new Date().toISOString(); write('RESULT.json', report);
    if (report.passed) fs.writeFileSync(path.join(__dirname, 'LOCK_RESTORE_SELECTED.json'), JSON.stringify({ evidenceDirectory: evidence, ...report }, null, 2) + '\n');
  }
  if (failure) throw failure;
}
async function main() {
  if (process.argv[2] === 'run' && process.argv.length === 3) return run();
  if (process.argv[2] === 'probe-child' && /^[a-f0-9]{10}$/.test(process.argv[3] || '') && process.argv.length === 4) return lockProbe(process.argv[3], path.join(__dirname, `lock-restore-${process.argv[3]}`));
  if (process.argv[2] === 'certify-existing' && /^[a-f0-9]{10}$/.test(process.argv[3] || '') && process.argv.length === 4) return certifyRestore(process.argv[3]);
  throw Error('Expected run or owned probe-child invocation');
}
main().catch(error => { console.error(clean(error.message)); process.exitCode = 1; });
