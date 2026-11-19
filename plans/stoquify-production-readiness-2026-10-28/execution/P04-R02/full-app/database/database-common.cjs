// Disposable local DB helpers. No application/generated-client/dotenv import.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { Client } = require('pg');
const root = path.resolve(__dirname, '../../../../../..');
const prior = JSON.parse(fs.readFileSync(path.join(root, '.codex-tmp/p03-grant-20261028-r1/context.json'), 'utf8'));
const cluster = path.join(root, '.codex-tmp/p03-grant-20261028-r1/postgres');
assert.equal(path.resolve(prior.cluster), cluster); assert.equal(prior.pgPort, 53528);
assert.equal(path.resolve(prior.bin).toLowerCase(), path.resolve('C:/Program Files/PostgreSQL/17/bin').toLowerCase());
const candidate = 'D:/Codex-Stoquify-P04-R02-20261029-01a1816a/source';
const own = path.join(root, '.codex-tmp/p04r02-fullapp-database-20261029-r1');
const target = { host: '127.0.0.1', port: 53528, user: 'p03', cluster, bin: prior.bin,
  template: 'stoquify_local_p03_20261028_template_r1', build: 'stoquify_local_p04r02_20261029_build_r1', full: 'stoquify_local_p04r02_20261029_full_r1' };
assert.equal(prior.template, target.template);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const quote = name => { assert(/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(name)); return '"' + name + '"'; };
function receipt(name, data) {
  assert(/^[a-z0-9_-]+$/.test(name)); fs.mkdirSync(__dirname, { recursive: true });
  fs.writeFileSync(path.join(__dirname, name + '.json'), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
}
async function connect(database) {
  assert(['postgres', target.template, target.build, target.full].includes(database), 'Unapproved database');
  const client = new Client({ host: target.host, port: target.port, user: target.user, password: '', ssl: false, database,
    options: '-c search_path=public -c statement_timeout=120000', connectionTimeoutMillis: 5000, query_timeout: 120000, application_name: 'p04r02-fullapp-qualification' });
  await client.connect();
  try {
    const identity = (await client.query('SELECT current_database() AS database, host(inet_server_addr()) AS address, inet_server_port() AS port')).rows[0];
    assert.equal(identity.database, database); assert.equal(identity.address, target.host); assert.equal(identity.port, target.port);
    const directory = (await client.query('SHOW data_directory')).rows[0].data_directory;
    assert.equal(fs.realpathSync(directory).toLowerCase(), fs.realpathSync(cluster).toLowerCase());
    return client;
  } catch (error) { await client.end(); throw error; }
}
function candidateMigrations() {
  assert(fs.existsSync(path.join(candidate, 'prisma/schema.prisma')), 'Candidate snapshot is not ready');
  const directory = path.join(candidate, 'prisma/migrations');
  return fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => ({ name: entry.name, sha256: hash(fs.readFileSync(path.join(directory, entry.name, 'migration.sql'))) })).sort((a, b) => a.name.localeCompare(b.name));
}
async function checkMigrations(client) {
  const expected = candidateMigrations(); assert.equal(expected.length, 120, 'Unexpected candidate migration set');
  const schemaSourceSha256 = hash(fs.readFileSync(path.join(candidate, 'prisma/schema.prisma')));
  const templateSchemaSha256 = hash(fs.readFileSync(path.join(root, '.codex-tmp/p03-grant-20261028-r1/schema/schema.prisma')));
  assert.equal(schemaSourceSha256, templateSchemaSha256, 'Candidate schema differs from pinned template-source schema; reviewed diff required');
  const applied = (await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
  assert.equal(applied.length, expected.length);
  assert(applied.every(row => row.finished_at && !row.rolled_back_at), 'Incomplete migration');
  assert.deepEqual(applied.map(row => ({ name: row.migration_name, sha256: row.checksum })), expected);
  return { count: expected.length, migrationsSha256: hash(JSON.stringify(expected)), schemaSourceSha256, templateSchemaSha256 };
}
async function schemaFingerprint(client) {
  const queries = {
    columns: "SELECT table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position",
    constraints: "SELECT c.relname AS table_name,k.conname AS name,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname",
    indexes: "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname",
    enums: "SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder",
    policies: "SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname",
  };
  const state = {};
  for (const [name, sql] of Object.entries(queries)) state[name] = (await client.query(sql)).rows;
  return { sha256: hash(JSON.stringify(state)), counts: Object.fromEntries(Object.entries(state).map(([name, rows]) => [name, rows.length])) };
}
async function requireEmpty(client) {
  const tables = ['organizations', 'users', 'accounts', 'sessions', 'roles', 'items', 'tenant_module_configurations', 'tenant_module_grants'];
  const counts = {};
  for (const table of tables) { counts[table] = (await client.query('SELECT count(*)::int AS count FROM ' + quote(table))).rows[0].count; assert.equal(counts[table], 0, 'Template/clone contains ' + table); }
  return counts;
}
module.exports = { fs, path, assert, root, candidate, own, target, hash, quote, receipt, connect, checkMigrations, schemaFingerprint, requireEmpty };
