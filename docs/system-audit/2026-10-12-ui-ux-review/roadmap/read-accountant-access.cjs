// Scoped diagnostic only. No seed, role update, session lookup, or credential output.
// PostgreSQL READ ONLY is set before the only application query.
const path = require('node:path')
const fs = require('node:fs')
const root = path.resolve(__dirname, '../../../..')
require(path.join(root, 'node_modules/@next/env')).loadEnvConfig(root, true, { info() {}, error() {} })
const { PrismaClient } = require(path.join(root, 'node_modules/@prisma/client'))
const raw = process.env.DATABASE_URL || process.env.DIRECT_URL
if (!raw) throw new Error('Configured database URL unavailable; no query performed')
const url = raw.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => process.env[key] || '').replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim()
const prisma = new PrismaClient({ datasources: { db: { url } }, log: [] })
async function main() {
  const rows = await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    return tx.user.findMany({
      where: { email: 'accountant.rds-org001@stockflow.test', organization: { name: 'Wilkinson - Feeney 001' } },
      take: 2,
      select: {
        isActive: true, isLocked: true, lockedUntil: true, emailVerified: true, isVerified: true,
        organizationId: true,
        organization: { select: { name: true, isActive: true, deletedAt: true } },
        roles: { select: { id: true, code: true, organizationId: true, permissions: true } },
      },
    })
  }, { timeout: 10000, maxWait: 5000 })
  if (rows.length !== 1) throw new Error('Expected exactly one user in the observed organization')
  const user = rows[0]
  const report = {
    observedAt: new Date().toISOString(),
    source: 'Configured development database; exact observed user email and organization name; READ ONLY transaction',
    userActive: user.isActive,
    userLocked: Boolean(user.isLocked && (!user.lockedUntil || user.lockedUntil > new Date())),
    emailVerified: Boolean(user.emailVerified || user.isVerified),
    organizationActive: user.organization.isActive && !user.organization.deletedAt,
    roles: user.roles.map(role => ({
      code: role.code,
      sameOrganization: role.organizationId === user.organizationId,
      complianceSeedManaged: role.id.startsWith(`${user.organizationId}_compliance_role_`),
      permissionCount: role.permissions.length,
      accountReadGrants: role.permissions.filter(p => ['accounting.accounts.read', 'VIEW_CHART_OF_ACCOUNTS', 'READ_ACCOUNTS', '*'].includes(p)),
      journalReadCreateGrants: role.permissions.filter(p => ['accounting.journal.read', 'accounting.journal.create', 'VIEW_JOURNAL_ENTRIES', 'VIEW_GENERAL_LEDGER', 'CREATE_JOURNAL_ENTRIES'].includes(p)),
    })),
  }
  fs.writeFileSync(path.join(__dirname, 'evidence/delivery-22-accountant-access.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
main().catch(error => {
  const message = String(error.message || '')
  const category = /Can't reach database server|connect|timed? ?out/i.test(message) ? 'database connection unavailable'
    : /engine|DLL|binary/i.test(message) ? 'query engine initialization failure' : 'initialization/query failure'
  console.error('Read-only diagnostic failed:', error.code || error.errorCode || error.name || 'unknown', category)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
