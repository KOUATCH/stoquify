// Current frozen-source financial kernels on the fully migrated owned database.
// Does not load application environment files or change a shared generated client.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), bin = 'C:/Program Files/PostgreSQL/17/bin';
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const osEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
function load() {
  const target = read('DATABASE_TARGET.json'), source = read('CANDIDATE_TARGET.json');
  const prefix = fs.realpathSync(path.join(root, '.codex-tmp')) + path.sep;
  assert(fs.realpathSync(target.directory).startsWith(prefix));
  assert(/^sales-release-migrations-20261109-[a-f0-9]{10}$/.test(path.basename(target.directory)));
  assert.equal(target.clusterDirectory, target.directory); assert.equal(target.host, 'localhost'); assert.equal(target.user, 'sales_release_fixture');
  assert(Number.isSafeInteger(target.port) && target.port > 1024 && target.port < 65536);
  assert(/^stoquify_pos_audit_20261109_[a-f0-9]{10}$/.test(target.posDatabase));
  assert(fs.realpathSync(source.directory).startsWith(prefix));
  assert.equal(source.candidate, path.join(source.directory, 'candidate'));
  const { manifest } = require('./candidate-validation.cjs').verifyCandidate();
  assert.equal(manifest.candidate, source.candidate);
  const migration = read('MIGRATION_SOURCE_PROVENANCE.json');
  for (const entry of migration.files.filter(item => item.path.startsWith('prisma/'))) {
    assert.equal(sha(fs.readFileSync(path.join(source.candidate, entry.path))), entry.sha256, `Candidate migration/schema drift: ${entry.path}`);
  }
  return { ...target, candidate: source.candidate, orm: path.join(target.directory, 'orm'), migration };
}
const url = record => `postgresql://${record.user}@localhost:${record.port}/${record.posDatabase}?schema=public`;
const envFor = record => ({ ...osEnv(), NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first', DATABASE_URL: url(record), DIRECT_URL: url(record), SHADOW_DATABASE_URL: url(record), PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1', AUTH_SECRET: crypto.randomBytes(32).toString('hex') });
function run(label, executable, args, options = {}) {
  const began = new Date().toISOString();
  const result = spawnSync(executable, args, { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024, timeout: 600000, env: osEnv(), ...options });
  fs.writeFileSync(path.join(__dirname, label + '.log'), ((result.stdout || '') + (result.stderr || '')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_MIGRATED_DATABASE]'));
  fs.writeFileSync(path.join(__dirname, label + '.execution.json'), JSON.stringify({ executable, args, cwd: options.cwd || root, began, ended: new Date().toISOString(), exitCode: result.status, error: result.error?.code }, null, 2));
  console.log(`${label}: exit ${result.status}`);
  if (result.status !== 0 || result.error) throw Error(`${label} failed; inspect its retained log`);
  return result.stdout;
}
function prepareClient(record) {
  assert(!fs.existsSync(record.orm), 'Refusing to overwrite an owned ORM/client');
  const original = fs.readFileSync(path.join(record.candidate, 'prisma/schema.prisma'), 'utf8');
  const generator = original.match(/generator client\s*\{[^}]*\}/);
  assert(generator && !/\boutput\s*=/.test(generator[0]), 'Review changed generator before private generation');
  fs.mkdirSync(record.orm);
  const schema = original.replace(generator[0], generator[0].replace('{', '{\n  output = "./client"'));
  fs.writeFileSync(path.join(record.orm, 'schema.prisma'), schema, { flag: 'wx' });
  run('private-orm-generation', process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'generate', '--schema', path.join(record.orm, 'schema.prisma')], { cwd: record.migrationSource, env: { ...envFor(record), PRISMA_GENERATE_SKIP_AUTOINSTALL: '1' } });
  const config = {
    rootDir: record.candidate, roots: [path.join(record.candidate, 'services/pos/__tests__')], testEnvironment: 'node',
    moduleNameMapper: { '^@prisma/client$': path.join(record.orm, 'client'), '^@/(.*)$': record.candidate.replaceAll('\\', '/') + '/$1', '^server-only$': path.join(record.candidate, 'scripts/server-only-node-shim.js') },
    moduleDirectories: [path.join(root, 'node_modules')],
    transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(root, 'node_modules/next/dist/build/swc/jest-transformer.js') },
    testMatch: ['**/pos-full-commit.postgres.test.ts'], testTimeout: 120000,
  };
  fs.writeFileSync(path.join(record.orm, 'jest.migrated.json'), JSON.stringify(config, null, 2));
  fs.writeFileSync(path.join(__dirname, 'ORM_PROVENANCE.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceSchemaSha256: sha(original), privateSchemaSha256: sha(schema), client: path.join(record.orm, 'client'), source: record.candidate,
    runtime: 'Current frozen application source; reviewed installed test/CLI dependencies. Clean artifact dependencies qualified separately.' }, null, 2));
}
async function guard(record) {
  const { Client } = require(path.join(root, 'node_modules/pg'));
  const client = new Client({ connectionString: url(record), connectionTimeoutMillis: 5000 }); await client.connect();
  try {
    const { rows: [identity] } = await client.query("SELECT current_database() AS name,current_user AS actor,current_setting('data_directory') AS directory");
    assert.equal(identity.name, record.posDatabase); assert.equal(identity.actor, record.user);
    assert.equal(fs.realpathSync(identity.directory).toLowerCase(), fs.realpathSync(path.join(record.directory, 'data')).toLowerCase());
    const history = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    assert.equal(history.length, 121);
    for (const entry of record.migration.migrations) { const row = history.find(item => item.migration_name === entry.name); assert(row?.finished_at && !row.rolled_back_at); assert.equal(row.checksum, entry.rawSha256); }
  } finally { await client.end(); }
}
async function test(record) {
  assert.equal(read('MIGRATION_REHEARSAL_RESULT.json').passed, true, 'Full migration replay must pass first');
  const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.directory, 'data'), 'status'], { env: osEnv(), stdio: 'ignore', windowsHide: true });
  assert.equal(status.status, 3, 'Owned cluster is already in use; wait for the other stage');
  run('financial-pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.directory, 'data'), '-l', path.join(record.directory, 'postgres.log'), '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' });
  try {
    await guard(record);
    const env = { ...envFor(record), RUN_POS_FULL_COMMIT_POSTGRES: '1', POS_DISPOSABLE_DATABASE_NAME: record.posDatabase, RETENTION_VERIFICATION_EVIDENCE_DIR: __dirname };
    run('migrated-financial-kernels', process.execPath, [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', path.join(record.orm, 'jest.migrated.json'), '--runInBand', '--no-cache', '--runTestsByPath', 'services/pos/__tests__/pos-full-commit.postgres.test.ts', '--json', '--outputFile', path.join(__dirname, 'migrated-financial-kernels.results.json')], { cwd: record.candidate, env });
    const result = read('migrated-financial-kernels.results.json'); assert.equal(result.numFailedTests, 0); assert(result.numPassedTests >= 16);
  } finally {
    run('financial-pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.directory, 'data'), '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' });
  }
}
async function main() {
  const record = load();
  if (process.argv[2] === 'prepare-client') return prepareClient(record);
  if (process.argv[2] === 'test') return test(record);
  throw Error('Expected prepare-client or test');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { load, url, envFor, guard };
