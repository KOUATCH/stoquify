// Explicitly user-authorized LOCAL fixture provisioning; never a production admin API.
// Adds only purchasing authority. Workspace activation still uses the application review.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { Client } = require('pg')
const { loadDatabaseUrl } = require('./prisma-local-fresh-bootstrap.js')
const organizationId = 'rds_org_001'
const grantId = 'rds_org_001_purchasing_local_audit_20261013'
const auditId = `${grantId}_provisioned`
const evidenceDir = path.resolve('docs/UI/UX/evidence/pos-finance-sales-2026-10-13')
async function main() {
  assert.deepEqual(process.argv.slice(2), ['--apply-approved-local-grant'])
  if (['NODE_ENV', 'AQSTOQFLOW_ENV', 'VERCEL_ENV'].some(key => process.env[key]?.toLowerCase() === 'production')) throw new Error('Production marker refused')
  const url = new URL(loadDatabaseUrl())
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/stoquify_replay_next_20260830') throw new Error('Wrong local target')
  const db = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 })
  await db.connect()
  try {
    await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    await db.query("SET LOCAL lock_timeout = '5s'")
    const org = (await db.query('SELECT id,name FROM organizations WHERE id=$1 AND "isActive" AND "deletedAt" IS NULL FOR UPDATE', [organizationId])).rows
    assert.equal(org.length, 1)
    assert.equal(org[0].name, 'Wilkinson - Feeney 001')
    const configuration = (await db.query('SELECT to_jsonb(t) AS row FROM tenant_module_configurations t WHERE "organizationId"=$1 FOR UPDATE', [organizationId])).rows[0]?.row
    assert.equal(configuration?.revision, 0)
    const before = (await db.query('SELECT to_jsonb(t) AS row FROM tenant_module_grants t WHERE "organizationId"=$1 ORDER BY "moduleSlug" FOR UPDATE', [organizationId])).rows.map(r => r.row)
    assert.equal(before.length, 11)
    assert.equal(before.some(r => r.moduleSlug === 'purchasing'), false)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM tenant_module_lifecycle_operations WHERE "organizationId"=$1', [organizationId])).rows[0].n, 0)
    fs.mkdirSync(evidenceDir, { recursive: true })
    fs.writeFileSync(path.join(evidenceDir, 'purchasing-before.json'), JSON.stringify({ database: url.pathname.slice(1), organization: org[0], configuration, grants: before }, null, 2), { flag: 'wx' })
    const metadata = { synthetic: true, source: 'pos-finance-sales-local-audit-20261013', authorization: 'User explicitly requested enabling purchasing for rds-001 locally', purpose: 'Local purchasing/payables UI verification', productionEvidence: false }
    const added = (await db.query(`INSERT INTO tenant_module_grants (id,"organizationId","moduleSlug",status,source,"readOnly",trial,revision,metadata,"createdAt","updatedAt")
      VALUES ($1,$2,'purchasing','active','manual_override',false,false,1,$3::jsonb,now(),now()) RETURNING to_jsonb(tenant_module_grants) AS row`, [grantId, organizationId, JSON.stringify(metadata)])).rows[0].row
    await db.query(`INSERT INTO audit_logs (id,"organizationId","entityType","entityId",action,changes,"createdAt") VALUES ($1,$2,'TenantModuleGrant',$3,'LOCAL_TEST_MODULE_GRANT_PROVISIONED',$4::jsonb,now())`, [auditId, organizationId, grantId, JSON.stringify({ before: null, after: added, authorization: metadata.authorization, executor: 'Codex local operator; no application user impersonation' })])
    const afterOthers = (await db.query('SELECT to_jsonb(t) AS row FROM tenant_module_grants t WHERE "organizationId"=$1 AND id<>$2 ORDER BY "moduleSlug"', [organizationId, grantId])).rows.map(r => r.row)
    assert.deepEqual(afterOthers, before)
    assert.deepEqual((await db.query('SELECT to_jsonb(t) AS row FROM tenant_module_configurations t WHERE "organizationId"=$1', [organizationId])).rows[0].row, configuration)
    await db.query('COMMIT')
    fs.writeFileSync(path.join(evidenceDir, 'purchasing-grant-applied.json'), JSON.stringify({ committed: true, auditId, grant: added, unchangedOtherGrantCount: before.length, configurationUnchanged: true }, null, 2), { flag: 'wx' })
    console.log(JSON.stringify({ committed: true, grantId, auditId, unchangedOtherGrantCount: before.length, configurationUnchanged: true }))
  } catch (error) { await db.query('ROLLBACK'); throw error }
  finally { await db.end() }
}
main().catch(e => { console.error(e.code || e.message); process.exitCode = 1 })
