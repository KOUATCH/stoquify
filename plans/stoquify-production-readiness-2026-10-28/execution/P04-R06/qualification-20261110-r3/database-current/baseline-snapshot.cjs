// Read-only preservation proof for the two old r2 databases. Never starts a cluster or changes database data.
const { fs, path, assert, root, storage, databaseStorage, ownerPath, target, baseline, hash, quote, receipt, connectBaseline, checkMigrations, requireEmpty } = require('./database-common.cjs');
const packet = path.resolve(__dirname, '..');
const priorPath = path.resolve(packet, '../qualification-20261110-r2/database/capacity-suspension.json');
const priorSha256 = '7aed928e69514da4b8f905ecf7d0e67638871ccdc6e3c81330b11532e4827ff4';

function priorState() {
  const bytes = fs.readFileSync(priorPath);
  assert.equal(hash(bytes), priorSha256);
  const value = JSON.parse(bytes);
  assert(value.passed && value.clusterStopped && value.portsReleased);
  assert.equal(value.confirmed.candidateId, baseline.candidateId);
  return value.confirmed;
}

function legacyTuple(value) {
  return {
    candidateId: value.candidateId,
    fixtureSha256: value.fixtureSha256,
    migrations: value.migrations,
    emptyBuildTables: value.emptyBuildTables,
    businessSha256: value.state.businessSha256,
    sessionSha256: value.state.sessionSha256,
    auditSha256: value.state.auditSha256,
  };
}

async function catalogDigest(client) {
  // New before/after DDL proof; the old E30 receipt did not record this fingerprint.
  const queries = [
    ['columns', `SELECT n.nspname,r.relname,a.attname,a.attnum,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) AS default_expression FROM pg_attribute a JOIN pg_class r ON r.oid=a.attrelid JOIN pg_namespace n ON n.oid=r.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND r.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped`],
    ['constraints', `SELECT n.nspname,r.relname,c.conname,pg_get_constraintdef(c.oid,true) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public'`],
    ['indexes', `SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'`],
    ['triggers', `SELECT n.nspname,r.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal`],
    ['functions', `SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')`],
    ['enums', `SELECT n.nspname,t.typname,e.enumsortorder,e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'`],
  ];
  const parts = [];
  for (const [kind, sql] of queries) {
    const rows = (await client.query('SELECT to_jsonb(c)::text AS row FROM (' + sql + ') c ORDER BY to_jsonb(c)::text COLLATE "C"')).rows;
    parts.push({ kind, count: rows.length, sha256: hash(rows.map(row => row.row).join('\n')) });
  }
  return { sha256: hash(JSON.stringify(parts)), parts };
}

async function inspectDatabase(database, isBuild) {
  const client = await connectBaseline(database);
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    assert.equal((await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only, 'on');
    const migrations = await checkMigrations(client, baseline.source);
    const empty = isBuild ? await requireEmpty(client) : null;
    const names = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row => row.tablename);
    const tables = [];
    for (const name of names.filter(name => !['sessions', 'audit_logs'].includes(name))) {
      const rows = (await client.query('SELECT to_jsonb(t)::text AS row FROM ' + quote(name) + ' t ORDER BY to_jsonb(t)::text COLLATE "C"')).rows;
      tables.push({ table: name, count: rows.length, sha256: hash(rows.map(row => row.row).join('\n')) });
    }
    const counts = {};
    for (const [table, expected] of [['users', isBuild ? 0 : 16], ['accounts', isBuild ? 0 : 32], ['sessions', 0], ['audit_logs', 0]]) {
      counts[table] = (await client.query('SELECT count(*)::int count FROM ' + quote(table))).rows[0].count;
      assert.equal(counts[table], expected, 'Old baseline changed: ' + database + '.' + table);
    }
    const catalog = await catalogDigest(client);
    await client.query('COMMIT');
    return {
      database, migrations, emptyBuildTables: empty ? Object.keys(empty).length : null,
      state: { businessSha256: hash(JSON.stringify(tables)), tables, excludedTables: ['sessions', 'audit_logs'],
        // Both native tables were explicitly proved empty, as in the bound historical snapshot.
        sessionSha256: hash(JSON.stringify([])), auditSha256: hash(JSON.stringify([])), counts },
      catalog,
    };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* Preserve the original read failure. */ }
    throw error;
  } finally { await client.end(); }
}

function assertBaselineUnchanged(expected, current) {
  assert.deepEqual(legacyTuple(current), legacyTuple(expected), 'Old baseline differs from recorded logical state');
  if (expected.databaseStates) {
    assert.deepEqual(current.databaseStates, expected.databaseStates, 'Old data or schema changed during successor work');
  } else {
    assert.deepEqual(legacyTuple(expected), legacyTuple(priorState()), 'Only the exact historical baseline may omit new catalog fingerprints');
  }
}

async function inspectBaseline(label) {
  assert(typeof label === 'string' && /^[a-z0-9_-]{1,100}$/.test(label));
  const evidenceName = 'baseline-' + label;
  assert(!fs.existsSync(path.join(__dirname, evidenceName + '.json')), 'Baseline receipt already exists');
  const context = JSON.parse(fs.readFileSync(path.join(packet, 'candidate-context.json')));
  assert.equal(context.root, root);
  assert.equal(context.storage, storage);
  assert.equal(context.databasePort, target.port);
  const owner = JSON.parse(fs.readFileSync(ownerPath));
  assert.equal(owner.root, root);
  assert.equal(owner.storage, databaseStorage);
  assert.equal(owner.cluster, target.cluster);
  assert.equal(owner.port, target.port);
  assert.equal(fs.realpathSync(databaseStorage), path.resolve('D:/p04-r06-fullapp-20261110-r2'));
  const pidRows = fs.readFileSync(path.join(target.cluster, 'postmaster.pid'), 'utf8').split(/\r?\n/);
  const pid = Number(pidRows[0]);
  assert(Number.isInteger(pid) && pid > 0);
  assert.equal(fs.realpathSync(pidRows[1]).toLowerCase(), fs.realpathSync(target.cluster).toLowerCase());
  assert.equal(Number(pidRows[3]), target.port);
  const build = await inspectDatabase(baseline.build, true);
  const full = await inspectDatabase(baseline.full, false);
  assert.deepEqual(build.migrations, full.migrations);
  assert.equal(Number(fs.readFileSync(path.join(target.cluster, 'postmaster.pid'), 'utf8').split(/\r?\n/)[0]), pid);
  const result = {
    at: new Date().toISOString(), label, candidateId: baseline.candidateId, activeCandidateId: context.candidateId,
    readOnly: true, databaseTargets: [baseline.build, baseline.full], pid,
    fixtureSha256: hash(fs.readFileSync(baseline.fixturePath)), migrations: build.migrations,
    emptyBuildTables: build.emptyBuildTables, state: full.state,
    databaseStates: [build, full], historicalSuspensionSha256: priorSha256,
    evidence: path.relative(packet, path.join(__dirname, evidenceName + '.json')).replaceAll('\\', '/'),
    limits: ['Old E30 logical-state tuple is compared exactly; catalog fingerprints add before/after schema evidence for this continuation only.', 'Database contents are read only; receipts retain counts and hashes, not row values.'],
  };
  assertBaselineUnchanged(priorState(), result);
  receipt(evidenceName, result);
  return result;
}

module.exports = { inspectBaseline, assertBaselineUnchanged };
