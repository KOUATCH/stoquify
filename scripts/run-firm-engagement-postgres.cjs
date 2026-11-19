// AF03 only. New databases on a verified owned loopback cluster; never reset/reuse.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { Client } = require('pg')
const migration = '20261019120000_firm_engagement_foundation'
async function main() {
  const cluster = process.env.AF03_CLUSTER_DIR
  const run = process.argv[2]
  if (!cluster || !path.isAbsolute(cluster) || path.basename(cluster) !== 'af01-postgres' ||
      !/^2026-10-19-run-\d{2}$/.test(run || '') || process.env.NODE_ENV === 'production') throw Error('Explicit owned cluster and dated run required')
  const clientPath = process.env.AF03_PRISMA_CLIENT
  if (!clientPath || !path.isAbsolute(clientPath) || path.basename(path.dirname(clientPath)) !== 'af03-prisma') throw Error('Isolated generated AF03 client required')
  const { PrismaClient } = require(clientPath)
  const output = path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF03', run)
  fs.mkdirSync(output, { recursive: true })
  const marker = path.join(output, 'database-attempt.json')
  fs.writeFileSync(marker, JSON.stringify({ run, startedAt: new Date().toISOString() }), { flag: 'wx' })
  const admin = new Client({ connectionString: 'postgresql://af01@127.0.0.1:55441/postgres', connectionTimeoutMillis: 5000 })
  await admin.connect()
  try {
    const actual = (await admin.query('SHOW data_directory')).rows[0].data_directory
    if (fs.realpathSync(actual).toLowerCase() !== fs.realpathSync(cluster).toLowerCase()) throw Error('Wrong cluster identity')
    const catalog = fs.readdirSync('prisma/migrations').filter(n => fs.existsSync(path.join('prisma/migrations', n, 'migration.sql'))).sort()
    if (catalog.at(-1) !== migration) throw Error('Migration catalog changed; review before execution')
    const report = { host: '127.0.0.1', port: 55441, synthetic: true, applicationDatabaseChanged: false,
      catalog: catalog.map(name => ({ name, sha256: createHash('sha256').update(fs.readFileSync(path.join('prisma/migrations', name, 'migration.sql'))).digest('hex') })), lanes: [] }
    for (const lane of ['clean', 'upgrade']) {
      const name = `stoquify_local_af03_${run.replaceAll('-', '_')}_${lane}`
      if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) throw Error('Refusing existing database')
      await admin.query(`CREATE DATABASE "${name}"`)
      const url = `postgresql://af01@127.0.0.1:55441/${name}?schema=public&connection_limit=5&connect_timeout=5`
      const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url, AF03_POSTGRES_URL: url }
      function execute(entry, args, label) {
        const result = spawnSync(process.execPath, [entry, ...args], { env, windowsHide: true, encoding: 'utf8', timeout: 300000, maxBuffer: 20e6 })
        const log = ((result.stdout || '') + (result.stderr || '')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[DISPOSABLE_DATABASE]')
        fs.writeFileSync(path.join(output, `${lane}-${label}.log`), log, { flag: 'wx' })
        console.log(`${lane} ${label}: exit ${result.status}`)
        if (result.status !== 0) throw Error(`${lane} ${label} failed; retained evidence. ${log.slice(-1200)}`)
      }
      if (lane === 'upgrade') {
        const predecessor = fs.mkdtempSync(path.join(os.tmpdir(), 'stoquify-af03-predecessor-'))
        fs.copyFileSync('prisma/schema.prisma', path.join(predecessor, 'schema.prisma'))
        fs.mkdirSync(path.join(predecessor, 'migrations'))
        fs.copyFileSync('prisma/migrations/migration_lock.toml', path.join(predecessor, 'migrations/migration_lock.toml'))
        for (const item of catalog.filter(n => n !== migration)) fs.cpSync(path.join('prisma/migrations', item), path.join(predecessor, 'migrations', item), { recursive: true })
        execute('node_modules/prisma/build/index.js', ['migrate', 'deploy', '--schema', path.join(predecessor, 'schema.prisma')], 'predecessor')
      } else execute('node_modules/prisma/build/index.js', ['migrate', 'deploy'], 'clean-apply')
      const db = new PrismaClient({ datasources: { db: { url } } })
      try {
        await db.organization.createMany({ data: ['firm', 'client'].map(k => ({ id: `af03-legacy-${k}`, name: `Synthetic ${k}`, slug: `af03-legacy-${k}` })) })
        await db.user.create({ data: { id: 'af03-legacy-user', email: 'af03-legacy@example.invalid', organizationId: 'af03-legacy-firm', emailVerified: true } })
        await db.accountantAccessGrant.create({ data: { id: 'af03-legacy-grant', organizationId: 'af03-legacy-client', accountantUserId: 'af03-legacy-user', accountantFirmName: 'Descriptive only', role: 'READ_ONLY', activeScopeKey: 'af03-legacy-client:af03-legacy-user', consentGrantedById: 'synthetic-owner', consentEvidenceHash: 'sha256:' + 'a'.repeat(64), effectiveFrom: new Date('2020-01-01'), expiresAt: new Date('2099-01-01') } })
        const before = await db.accountantAccessGrant.findUnique({ where: { id: 'af03-legacy-grant' } })
        if (lane === 'upgrade') execute('node_modules/prisma/build/index.js', ['migrate', 'deploy'], 'upgrade')
        execute('node_modules/prisma/build/index.js', ['migrate', 'deploy'], 'replay')
        const after = await db.accountantAccessGrant.findUnique({ where: { id: 'af03-legacy-grant' } })
        if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Legacy grant changed during migration')
        const count = await db.firmEngagement.count()
        if (count !== 0 || await db.firmEngagementGrantLink.count() !== 0) throw Error('Unexpected backfill')
        execute('node_modules/jest/bin/jest.js', ['--config', 'jest.firm-engagement-postgres.config.cjs', '--runInBand', '--no-cache', '--json', '--outputFile', path.join(output, `${lane}-tests.json`)], 'tests')
        const migrations = await db.$queryRawUnsafe('SELECT migration_name, checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name')
        report.lanes.push({ lane, database: name, legacyGrantUnchanged: true, automaticEnrollmentCount: count, appliedMigrations: migrations })
      } finally { await db.$disconnect() }
    }
    fs.writeFileSync(path.join(output, 'database-results.json'), JSON.stringify({ ...report, passed: true }, null, 2), { flag: 'wx' })
  } finally { await admin.end() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
