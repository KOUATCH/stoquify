// Synthetic sales-to-accounting proof on a new owned loopback cluster only.
// No application environment, existing database, migration promotion or data clone.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomBytes, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../../..');
const bin = 'C:/Program Files/PostgreSQL/17/bin';
const recordPath = path.join(__dirname, 'DATABASE_TARGET.json');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
Object.assign(env, { NODE_ENV: 'test', NODE_OPTIONS: '--dns-result-order=ipv4first',
  PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1', AUTH_SECRET: randomBytes(32).toString('hex') });

function write(name, value) {
  fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
}
function run(label, executable, args, options = {}) {
  const result = spawnSync(executable, args, { cwd: root, env, windowsHide: true,
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 300000, ...options });
  const log = ((result.stdout || '') + (result.stderr || '')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[OWNED_LOCAL_DATABASE]');
  fs.writeFileSync(path.join(__dirname, label + '.log'), log);
  write(label + '.execution.json', { executable, args, exit: result.status,
    error: result.error?.code, utc: new Date().toISOString() });
  console.log(`${label}: exit ${result.status}`);
  if (result.status !== 0) throw new Error(`${label} failed; inspect retained sanitized log`);
  return result.stdout;
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
function load() {
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  const parent = fs.realpathSync(path.join(root, '.codex-tmp')) + path.sep;
  if (!fs.realpathSync(record.directory).startsWith(parent)
      || !/^sales-accounting-20261108-[a-f0-9]{10}$/.test(path.basename(record.directory))
      || !/^stoquify_pos_audit_20261108_[a-f0-9]{10}$/.test(record.database)
      || record.host !== 'localhost' || record.user !== 'sales_accounting_fixture'
      || !Number.isSafeInteger(record.port) || record.port < 1024 || record.port > 65535) {
    throw new Error('Unexpected owned target');
  }
  env.DATABASE_URL = `postgresql://${record.user}@localhost:${record.port}/${record.database}?schema=public`;
  env.DIRECT_URL = env.DATABASE_URL;
  env.SHADOW_DATABASE_URL = env.DATABASE_URL;
  env.POS_DISPOSABLE_DATABASE_NAME = record.database;
  return record;
}
async function assertIdentity(record) {
  const { Client } = require(path.join(root, 'node_modules/pg'));
  const client = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const row = (await client.query("SELECT current_database() AS name, current_user AS actor, current_setting('data_directory') AS directory")).rows[0];
    if (row.name !== record.database || row.actor !== record.user
        || fs.realpathSync(row.directory).toLowerCase() !== fs.realpathSync(path.join(record.directory, 'data')).toLowerCase()) {
      throw new Error('Owned cluster identity mismatch');
    }
  } finally { await client.end(); }
}
async function create() {
  if (fs.existsSync(recordPath)) throw new Error('Target already recorded; refusing replacement');
  const id = randomBytes(5).toString('hex');
  const directory = path.join(root, '.codex-tmp', `sales-accounting-20261108-${id}`);
  fs.mkdirSync(directory, { recursive: true });
  const record = { directory, database: `stoquify_pos_audit_20261108_${id}`,
    host: 'localhost', port: await freePort(), user: 'sales_accounting_fixture',
    createdAt: new Date().toISOString(), method: 'New private cluster; current datamodel bootstrap; no existing data' };
  write('DATABASE_TARGET.json', record);
  load();
  run('initdb', path.join(bin, 'initdb.exe'), ['-D', path.join(directory, 'data'), '-U', record.user, '-A', 'trust', '-E', 'UTF8', '--locale=C']);
  run('pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(directory, 'data'), '-l', path.join(directory, 'postgres.log'),
    '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' });
  return prepare(record);
}
async function prepare(record) {
  const directory = record.directory;
  run('createdb', path.join(bin, 'createdb.exe'), ['-h', '127.0.0.1', '-p', String(record.port), '-U', record.user, '-T', 'template0', record.database]);
  await assertIdentity(record);
  const original = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
  const generator = original.match(/generator client\s*\{[^}]*\}/);
  if (!generator || /\boutput\s*=/.test(generator[0])) throw new Error('Review changed Prisma generator before isolated generation');
  const schema = original.replace(generator[0], generator[0].replace('{', '{\n  output = "./client"'));
  const schemaPath = path.join(directory, 'schema.prisma');
  fs.writeFileSync(schemaPath, schema);
  const prisma = path.join(root, 'node_modules/prisma/build/index.js');
  const sql = run('schema-diff', process.execPath, [prisma, 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', schemaPath, '--script'], { cwd: directory });
  if (/^\s*(DROP|TRUNCATE|DELETE|UPDATE)\b/im.test(sql)) throw new Error('Unexpected destructive bootstrap SQL');
  fs.writeFileSync(path.join(directory, 'schema.sql'), sql);
  write('SCHEMA_PROVENANCE.json', { source: 'prisma/schema.prisma', sourceSha256: createHash('sha256').update(original).digest('hex'),
    sqlSha256: createHash('sha256').update(sql).digest('hex'),
    limitation: 'Datamodel transaction proof only; migration history, custom triggers and statutory treatment are not certified' });
  run('schema-apply', path.join(bin, 'psql.exe'), ['-X', '-h', '127.0.0.1', '-p', String(record.port), '-U', record.user,
    '-d', record.database, '-v', 'ON_ERROR_STOP=1', '-f', path.join(directory, 'schema.sql')]);
  run('generate-isolated-client', process.execPath, [prisma, 'generate', '--schema', schemaPath], { cwd: directory });
  const config = `const base = require(${JSON.stringify(path.join(root, 'jest.cross-workflow-phase3.config.cjs'))});\nmodule.exports = { ...base, rootDir: ${JSON.stringify(root)}, moduleNameMapper: { '^@prisma/client$': ${JSON.stringify(path.join(directory, 'client'))}, ...base.moduleNameMapper } };\n`;
  fs.writeFileSync(path.join(directory, 'jest.workflow.cjs'), config);
  console.log(`Prepared owned target ${record.database}; application data untouched`);
}
async function main() {
  const mode = process.argv[2];
  if (mode === 'create') return create();
  const record = load();
  if (mode === 'prepare') return prepare(record);
  if (mode === 'verify' || mode === 'verify-existing') {
    run('pg-start-verification', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.directory, 'data'), '-l', path.join(record.directory, 'postgres.log'),
      '-o', `-p ${record.port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' });
    try {
      if (mode === 'verify') await prepare(record);
      return await test(record);
    } finally {
      run('pg-stop-verification', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.directory, 'data'), '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' });
    }
  }
  if (mode === 'stop') {
    return run('pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(record.directory, 'data'), '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' });
  }
  if (mode !== 'test') throw new Error('Expected create, prepare, verify, verify-existing, test or stop');
  return test(record);
}
async function test(record) {
  await assertIdentity(record);
  const provenance = JSON.parse(fs.readFileSync(path.join(__dirname, 'SCHEMA_PROVENANCE.json'), 'utf8'));
  if (createHash('sha256').update(fs.readFileSync(path.join(root, 'prisma/schema.prisma'))).digest('hex') !== provenance.sourceSha256) {
    throw new Error('Source schema changed after isolated client/bootstrap; review before another proof run');
  }
  env.RUN_POS_FULL_COMMIT_POSTGRES = '1';
  env.RETENTION_VERIFICATION_EVIDENCE_DIR = __dirname;
  const pattern = process.argv[3] || 'ties a POS credit sale';
  const label = pattern === 'ties a POS credit sale' ? 'workflow-tests' : 'pos-financial-regressions';
  run(label, process.execPath, [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', path.join(record.directory, 'jest.workflow.cjs'),
    '--runInBand', '--no-cache', '--runTestsByPath', 'services/pos/__tests__/pos-full-commit.postgres.test.ts', '--testNamePattern', pattern,
    '--json', '--outputFile', path.join(__dirname, label + '.results.json')]);
  const results = JSON.parse(fs.readFileSync(path.join(__dirname, label + '.results.json'), 'utf8'));
  if (results.numPassedTests < 1 || results.numFailedTests) throw new Error('No passing workflow proof');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
