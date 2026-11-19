// AF02 synthetic-only fixture. No application environment file is loaded here.
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { randomBytes } = require('node:crypto')
const { Client } = require('pg')
const { PrismaClient } = require('@prisma/client')
const argon2 = require('argon2')
const cluster = 'C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993/af01-host/af01-postgres'
const privateDir = path.dirname(path.dirname(cluster))
const name = 'stoquify_local_af02_browser_20261019_r1'
const url = `postgresql://af01@127.0.0.1:55441/${name}?schema=public&connection_limit=5`
const output = path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF02/2026-10-19-run-01')
async function main() {
  const admin = new Client({ connectionString: 'postgresql://af01@127.0.0.1:55441/postgres' })
  await admin.connect()
  try {
    const actual = (await admin.query('SHOW data_directory')).rows[0].data_directory
    if (fs.realpathSync(actual).toLowerCase() !== fs.realpathSync(cluster).toLowerCase()) throw Error('Wrong cluster')
    if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) throw Error('Refusing existing database')
    await admin.query(`CREATE DATABASE "${name}"`)
  } finally { await admin.end() }
  const migrated = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url }, windowsHide: true, encoding: 'utf8', timeout: 240000,
  })
  fs.writeFileSync(path.join(output, 'browser-fixture-migrations.log'), (migrated.stdout + migrated.stderr).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[DISPOSABLE_DATABASE]'))
  if (migrated.status !== 0) throw Error('Migration failed')
  const db = new PrismaClient({ datasources: { db: { url } } })
  const password = randomBytes(24).toString('base64url')
  try {
    const clients = Array.from({ length: 105 }, (_, i) => `af02-client-${String(i).padStart(3, '0')}`)
    await db.organization.createMany({ data: ['af02-firm', ...clients].map((id, i) => ({ id, name: i ? `Synthetic Client ${String(i).padStart(3, '0')}` : 'Synthetic AF02 Firm', slug: id, currency: 'XAF', countryCode: 'CM', requestedModules: ['accounting', 'close_assurance'] })) })
    await db.role.create({ data: { id: 'af02-role', organizationId: 'af02-firm', code: 'AF02', nameEn: 'Synthetic accountant', nameFr: 'Comptable synthétique', permissions: ['accounting.audit.read', 'accounting.close.read'] } })
    const hash = await argon2.hash(password)
    await db.user.create({ data: { id: 'af02-actor', email: 'af02@example.invalid', firstName: 'Synthetic', lastName: 'Accountant', organizationId: 'af02-firm', emailVerified: true, password: hash, roles: { connect: { id: 'af02-role' } } } })
    await db.account.create({ data: { id: 'af02-credential', accountId: 'af02-actor', userId: 'af02-actor', providerId: 'credential', password: hash } })
    await db.accountantAccessGrant.createMany({ data: clients.map((id, i) => ({ id: `af02-grant-${String(i).padStart(3, '0')}`, organizationId: id, accountantUserId: 'af02-actor', accountantFirmName: 'Synthetic AF02 Firm', role: 'READ_ONLY', activeScopeKey: `${id}:af02-actor`, consentGrantedById: 'synthetic-owner', consentEvidenceHash: 'sha256:' + 'a'.repeat(64), effectiveFrom: new Date('2020-01-01'), expiresAt: new Date('2099-01-01') })) })
    for (let i = 0; i < 7; i++) {
      const organizationId = clients[i]
      await db.fiscalYear.create({ data: { id: `af02-year-${i}`, organizationId, name: '2026', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } })
      await db.accountingPeriod.create({ data: { id: `af02-period-${i}`, organizationId, fiscalYearId: `af02-year-${i}`, periodNumber: 10, name: 'October / Octobre 2026', startDate: new Date('2026-10-01'), endDate: new Date('2026-10-31T23:59:59Z') } })
      if (i === 6) continue
      await db.closeRun.create({ data: { id: `af02-run-${i}`, organizationId, periodId: `af02-period-${i}`, status: i === 3 ? 'VOIDED' : 'CERTIFIED', readinessScore: 100, asOf: new Date('2026-10-18T12:00:00Z'), metadata: i === 1 ? { staleState: { status: 'EVIDENCE_STALE' } } : {}, ...(i === 3 ? { voidedAt: new Date() } : {}) } })
      if (i !== 2) await db.closePackExport.create({ data: { organizationId, periodId: `af02-period-${i}`, closeRunId: `af02-run-${i}`, watermarkId: `af02-watermark-${i}`, contentHash: `af02-proof-${i}`, isCertified: true } })
      if (i === 4) {
        const run = await db.closeRun.findUniqueOrThrow({ where: { id: `af02-run-${i}` } })
        await db.closeRun.create({ data: { id: 'af02-ambiguous-run', organizationId, periodId: `af02-period-${i}`, createdAt: run.createdAt, asOf: run.asOf } })
      }
    }
    fs.writeFileSync(path.join(privateDir, 'af02-browser-private.json'), JSON.stringify({ url, password, email: 'af02@example.invalid' }))
    fs.writeFileSync(path.join(output, 'browser-fixture.json'), JSON.stringify({ database: name, host: '127.0.0.1', port: 55441, clients: 105, actor: 'af02-actor', synthetic: true, applicationDatabaseChanged: false }, null, 2))
    console.log('Created fresh synthetic AF02 browser database with 105 mandates.')
  } finally { await db.$disconnect() }
}
main().catch(e => { console.error(e.message); process.exitCode = 1 })
