// Read-only inspection of the explicitly authorized local tenant.
const { Client } = require('pg')
const { loadDatabaseUrl } = require('./prisma-local-fresh-bootstrap.js')
async function main() {
  const url = new URL(loadDatabaseUrl())
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/stoquify_replay_next_20260830') throw new Error('Wrong local target')
  const db = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 })
  await db.connect()
  try {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const org = ['rds_org_001']
    for (const [name, sql] of [
      ['organization', 'SELECT id,name,"requestedModules","isActive" FROM organizations WHERE id=$1'],
      ['configuration', 'SELECT to_jsonb(t) AS row FROM tenant_module_configurations t WHERE "organizationId"=$1'],
      ['grants', 'SELECT to_jsonb(t) AS row FROM tenant_module_grants t WHERE "organizationId"=$1 ORDER BY "moduleSlug"'],
      ['operations', 'SELECT id,state,"desiredRevision","errorCode" FROM tenant_module_lifecycle_operations WHERE "organizationId"=$1 ORDER BY "createdAt" DESC LIMIT 3'],
    ]) console.log(JSON.stringify({ name, rows: (await db.query(sql, org)).rows }))
    await db.query('ROLLBACK')
  } finally { await db.end() }
}
main().catch(e => { console.error(e.code || e.message); process.exitCode = 1 })
