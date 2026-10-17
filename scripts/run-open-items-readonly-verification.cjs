// Explicit current-database read lane: no migrations, seeds, writes or cleanup.
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { loadEnvConfig } = require('@next/env')
let stage = 'arguments'

async function main() {
  const [mode, organizationName] = process.argv.slice(2)
  if (!['--inspect', '--verify'].includes(mode) || !organizationName || process.argv.length !== 4) {
    throw new Error('Use --inspect or --verify followed by the exact organization name.')
  }
  stage = 'environment'
  loadEnvConfig(path.resolve(__dirname, '..'), true, { info() {}, error() {} })
  const target = new URL(process.env.DATABASE_URL || process.env.DIRECT_URL || '')
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) throw new Error('PostgreSQL target required.')
  // Override connection startup settings for every connection, including service transactions.
  target.searchParams.set('options', '-c default_transaction_read_only=on -c statement_timeout=15000')
  target.searchParams.set('connection_limit', '2')
  target.searchParams.set('connect_timeout', '10')
  process.env.DATABASE_URL = target.toString()
  process.env.DIRECT_URL = target.toString()
  process.env.NODE_ENV = 'test'
  const { PrismaClient } = require('@prisma/client')
  const client = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] })
  try {
    stage = 'read-only connection'
    const settings = await client.$queryRaw`SELECT current_setting('default_transaction_read_only') AS readonly, current_setting('transaction_read_only') AS transaction_readonly`
    if (settings[0].readonly !== 'on' || settings[0].transaction_readonly !== 'on') throw new Error('Read-only database connection was not established.')
    stage = 'organization lookup'
    const organizations = await client.organization.findMany({ where: { name: organizationName, isActive: true, deletedAt: null }, select: { id: true }, take: 2 })
    if (organizations.length !== 1) throw new Error('Expected one active organization with that exact name.')
    const organizationId = organizations[0].id
    stage = 'source inventory'
    const configuration = await client.tenantModuleConfiguration.findUnique({ where: { organizationId }, select: { activeModules: true } })
    const counts = {
      receivableDocuments: await client.customerReceivableDocument.count({ where: { organizationId } }),
      supplierInvoices: await client.supplierInvoice.count({ where: { organizationId } }),
    }
    console.log(JSON.stringify({ connection: 'read-only', organizationName, purchasingConfiguredActive: configuration?.activeModules.includes('purchasing') ?? false, counts }))
    // An active configuration is discovery only, not entitlement/role admission proof.
    if (mode === '--inspect') {
      const candidates = await client.tenantModuleConfiguration.findMany({ where: { activeModules: { has: 'purchasing' }, organization: { isActive: true, deletedAt: null } }, select: { organization: { select: { name: true } } }, take: 5 })
      console.log(JSON.stringify({ purchasingConfigurationCandidates: candidates.map(row => row.organization.name) }))
      return
    }
    await client.$disconnect()
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/jest/bin/jest.js'), '--config', 'jest.open-items-readonly.config.cjs', '--runInBand', '--no-cache'], {
      cwd: path.resolve(__dirname, '..'), stdio: 'inherit', env: { ...process.env, OPEN_ITEMS_READONLY_VERIFICATION: '1', OPEN_ITEMS_READONLY_ORGANIZATION_ID: organizationId },
    })
    process.exitCode = result.status ?? 1
  } finally { await client.$disconnect() }
}
main().catch(error => {
  // Connection errors may contain URLs; do not print credentials or source data.
  const code = typeof error?.code === 'string' && /^[A-Z0-9]{3,10}$/.test(error.code) ? error.code : 'unavailable'
  console.error(`Read-only verification stopped at ${stage}; error code: ${code}. No database mutation was requested.`)
  process.exitCode = 1
})
