// Applies only the reviewed, user-approved local fixture repair SQL.
const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')
const { loadDatabaseUrl } = require('./prisma-local-fresh-bootstrap.js')
const dir = path.resolve('docs/UI/UX/evidence/pos-finance-sales-2026-10-12/terminal-011-repair')
const org = 'rds_org_001'
async function main() {
  if (process.argv.slice(2).join(' ') !== '--apply-approved-repair') throw new Error('Explicit approved repair flag required')
  const url = new URL(loadDatabaseUrl())
  if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || decodeURIComponent(url.pathname.slice(1)) !== 'stoquify_replay_next_20260830') throw new Error('Refusing unreviewed target')
  const client = new Client({ connectionString: url.toString() })
  await client.connect()
  async function cart() {
    const rows = (await client.query('SELECT id, "orderNumber", status, "posCartState", total, "sessionId" FROM sales_orders WHERE "organizationId"=$1 AND "orderNumber"=$2', [org, 'POS-RDS001-TERM-011-20261012-IXVT3'])).rows
    if (rows.length !== 1) throw new Error('Expected preserved cart unavailable')
    const lines = (await client.query('SELECT id, "itemId", quantity, "unitPrice" FROM sales_order_lines WHERE "salesOrderId"=$1 ORDER BY id', [rows[0].id])).rows
    const shift = (await client.query('SELECT id, status, "endTime" FROM pos_sessions WHERE id=$1 AND "organizationId"=$2', [rows[0].sessionId, org])).rows
    return { cart: rows[0], lines, shift }
  }
  try {
    const before = await cart()
    if (before.cart.status !== 'DRAFT' || before.lines.length !== 4 || before.shift[0]?.status !== 'ACTIVE') throw new Error('Checkout state changed; inspect before applying')
    const auditId = 'pos-terminal-011-fixture-repair-20261012-apply'
    if ((await client.query('SELECT id FROM audit_logs WHERE id=$1', [auditId])).rowCount) throw new Error('Repair already recorded; inspect instead of reapplying')
    await client.query(fs.readFileSync(path.join(dir, 'apply-native.sql'), 'utf8'))
    const after = await cart()
    const evidence = {
      appliedAt: new Date().toISOString(),
      event: (await client.query('SELECT id,status FROM pos_offline_events WHERE id=$1 AND "organizationId"=$2', ['rds_org_001_pos_offline_event_011', org])).rows,
      conflict: (await client.query('SELECT id,status FROM pos_offline_sync_conflicts WHERE id=$1 AND "organizationId"=$2', ['rds_org_001_pos_offline_sync_conflict_011', org])).rows,
      certificate: (await client.query('SELECT id,status,"closeBlocker" FROM pos_offline_sync_certificates WHERE id=$1 AND "organizationId"=$2', ['rds_org_001_pos_offline_sync_certificate_011', org])).rows,
      audit: (await client.query('SELECT id,action,"createdAt" FROM audit_logs WHERE id=$1', [auditId])).rows,
      cartUnchanged: JSON.stringify(before) === JSON.stringify(after), before, after,
    }
    fs.writeFileSync(path.join(dir, 'applied-evidence.json'), JSON.stringify(evidence, null, 2), { flag: 'wx' })
    console.log(JSON.stringify(evidence, null, 2))
    if (!evidence.cartUnchanged) throw new Error('Concurrent cart change detected after committed repair; inspect evidence')
  } catch (error) { await client.query('ROLLBACK'); throw error }
  finally { await client.end() }
}
main().catch(error => { console.error(error.code === 'P0001' ? error.message : error.code || error.message); process.exitCode = 1 })
