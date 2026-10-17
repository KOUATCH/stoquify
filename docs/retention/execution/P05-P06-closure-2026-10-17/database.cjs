// Explicit new cluster only. Never loads .env, connects to an existing cluster,
// installs tools, or deletes data. Stop retains the owned directory for review.
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const { randomBytes, createHash } = require('node:crypto')
const { spawnSync } = require('node:child_process')
const root = path.resolve(__dirname, '../../../..')
const bin = 'C:/Program Files/PostgreSQL/17/bin'
const recordPath = path.join(__dirname, 'DATABASE_TARGET.json')
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)))
env.NODE_ENV = 'test'
env.PRISMA_HIDE_UPDATE_MESSAGE = '1'
env.CHECKPOINT_DISABLE = '1'
env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/J COMPUTER/AppData/Local/ms-playwright'
function write(name, value) { fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n') }
function run(label, executable, args, options = {}) {
  for (const suffix of ['.log', '.execution.json', '.results.json']) {
    const old = path.join(__dirname, label + suffix)
    if (fs.existsSync(old)) fs.renameSync(old, path.join(__dirname, `${label}.prior-${Date.now()}${suffix}`))
  }
  const result = spawnSync(executable, args, { cwd: root, env, windowsHide: true, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options })
  fs.writeFileSync(path.join(__dirname, `${label}.log`), (result.stdout || '') + (result.stderr || ''))
  write(`${label}.execution.json`, { command: [executable, ...args], exit: result.status, error: result.error?.code, utc: new Date().toISOString() })
  console.log(`${label}: ${result.status}`)
  if (result.status !== 0) throw new Error(`${label} failed; inspect owned log`)
  return result.stdout
}
async function freePort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}
function load() {
  const r = JSON.parse(fs.readFileSync(recordPath, 'utf8'))
  const prefix = path.resolve(root, '.codex-tmp') + path.sep
  if (!path.resolve(r.directory).startsWith(prefix) || !/^retention-p05p06-[a-f0-9]+$/.test(path.basename(r.directory)) ||
      !/^stoquify_pos_audit_20261017_[a-f0-9]+$/.test(r.database) || r.host !== 'localhost' || r.user !== 'retention_fixture') throw new Error('Unexpected owned target')
  env.DATABASE_URL = `postgresql://${r.user}@localhost:${r.port}/${r.database}?schema=public`
  env.DIRECT_URL = env.DATABASE_URL
  env.POS_DISPOSABLE_DATABASE_NAME = r.database
  return r
}
async function main() {
  const mode = process.argv[2]
  if (mode === 'create') {
    if (fs.existsSync(recordPath)) throw new Error('Target already recorded; refusing replacement')
    const id = randomBytes(5).toString('hex')
    const directory = path.join(root, '.codex-tmp', `retention-p05p06-${id}`)
    fs.mkdirSync(directory, { recursive: true })
    const r = { directory, database: `stoquify_pos_audit_20261017_${id}`, host: 'localhost', port: await freePort(), user: 'retention_fixture', createdAt: new Date().toISOString(), method: 'new cluster; schema generated from current repository datamodel; no data clone' }
    write('DATABASE_TARGET.json', r)
    load()
    run('initdb', path.join(bin, 'initdb.exe'), ['-D', path.join(directory, 'data'), '-U', r.user, '-A', 'trust', '-E', 'UTF8', '--locale=C'])
    run('pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(directory, 'data'), '-l', path.join(directory, 'postgres.log'), '-o', `-p ${r.port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' })
    return prepare(r)
  } else if (mode === 'prepare') {
    return prepare(load())
  } else if (mode === 'start') {
    const r = load()
    run('pg-start', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(r.directory, 'data'), '-l', path.join(r.directory, 'postgres.log'), '-o', `-p ${r.port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' })
  } else if (mode === 'lifecycle' || mode === 'full-commit' || mode === 'browser-fixture' || mode === 'scope-isolation') {
    load()
    env.RETENTION_VERIFICATION_EVIDENCE_DIR = __dirname
    if (mode === 'lifecycle') {
      env.DATABASE_URL = env.DATABASE_URL.replace('schema=public', 'schema=codex_pos_lifecycle_20260920')
      env.DIRECT_URL = env.DATABASE_URL; env.RUN_POS_LIFECYCLE_POSTGRES = '1'
    } else if (mode === 'browser-fixture') env.RUN_RETENTION_BROWSER_FIXTURE = '1'
    else { env.RUN_POS_FULL_COMMIT_POSTGRES = '1'; env.RUN_RETENTION_OFFLINE_BROWSER = '1' }
    const file = mode === 'lifecycle' ? 'checkout-lifecycle.postgres.test.ts' : mode === 'browser-fixture' ? 'retention-recovery.browser-fixture.test.ts' : 'pos-full-commit.postgres.test.ts'
    const args = ['node_modules/jest/bin/jest.js', '--config', path.join(__dirname, 'jest.database.cjs'), '--runInBand', '--no-cache', '--runTestsByPath', `services/pos/__tests__/${file}`, '--json', '--outputFile', path.join(__dirname, `${mode}.results.json`)]
    if (mode === 'scope-isolation') args.push('--testNamePattern', 'P05 rejects foreign scope')
    run(mode, process.execPath, args)
  } else if (mode === 'schema-drift-prepare') {
    const r = load(), source = fs.readFileSync(path.join(root, 'prisma/schema.prisma'))
    const latest = path.join(r.directory, 'schema-current.prisma')
    fs.writeFileSync(latest, source)
    const sql = run('schema-drift-diff', process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-schema-datamodel', path.join(r.directory, 'schema.prisma'), '--to-schema-datamodel', latest, '--script'], { cwd: r.directory })
    fs.writeFileSync(path.join(r.directory, 'schema-drift.sql'), sql)
    write('SCHEMA_DRIFT_PROVENANCE.json', { sourceSha256: createHash('sha256').update(source).digest('hex'), sqlSha256: createHash('sha256').update(sql).digest('hex'), status: 'prepared; inspect SQL before separate apply', reason: 'Concurrent source/client change; owned disposable target only' })
  } else if (mode === 'schema-drift-apply') {
    const r = load(), file = path.join(r.directory, 'schema-drift.sql'), sql = fs.readFileSync(file)
    const record = JSON.parse(fs.readFileSync(path.join(__dirname, 'SCHEMA_DRIFT_PROVENANCE.json'), 'utf8'))
    if (createHash('sha256').update(sql).digest('hex') !== record.sqlSha256 || /^\s*(DROP|TRUNCATE|DELETE|UPDATE)\b/im.test(sql.toString())) throw new Error('Unreviewed or destructive drift SQL')
    run('schema-drift-apply', path.join(bin, 'psql.exe'), ['-X', '-h', '127.0.0.1', '-p', String(r.port), '-U', r.user, '-d', r.database, '-v', 'ON_ERROR_STOP=1', '-f', file])
  } else if (mode === 'stop') {
    const r = load()
    run('pg-stop', path.join(bin, 'pg_ctl.exe'), ['-D', path.join(r.directory, 'data'), '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' })
  } else throw new Error('Expected create, prepare, start, lifecycle, full-commit, or stop')
}
function prepare(r) {
    const directory = r.directory
    run('createdb', path.join(bin, 'createdb.exe'), ['-h', '127.0.0.1', '-p', String(r.port), '-U', r.user, '-T', 'template0', r.database])
    const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'))
    fs.writeFileSync(path.join(directory, 'schema.prisma'), schema)
    const sql = run('schema-diff', process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', path.join(directory, 'schema.prisma'), '--script'], { cwd: directory })
    fs.writeFileSync(path.join(directory, 'schema.sql'), sql)
    write('SCHEMA_PROVENANCE.json', { source: 'prisma/schema.prisma', sha256: createHash('sha256').update(schema).digest('hex'), sqlSha256: createHash('sha256').update(sql).digest('hex'), limitation: 'Datamodel bootstrap, not migration-history or custom-trigger certification' })
    run('schema-apply', path.join(bin, 'psql.exe'), ['-X', '-h', '127.0.0.1', '-p', String(r.port), '-U', r.user, '-d', r.database, '-v', 'ON_ERROR_STOP=1', '-f', path.join(directory, 'schema.sql')])
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
