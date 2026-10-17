// Read-only final evidence, including no payment and an open shift.
const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')
const { loadDatabaseUrl } = require('./prisma-local-fresh-bootstrap.js')
async function main() {
  const url = new URL(loadDatabaseUrl())
  if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.pathname !== '/stoquify_replay_next_20260830') throw new Error('Wrong target')
  const client = new Client({connectionString:url.toString()})
  await client.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const result = (await client.query(`SELECT s.id,s."orderNumber",s.status,s."paymentStatus",s."posCartState",s.total,
      (SELECT count(*)::int FROM sales_order_lines l WHERE l."salesOrderId"=s.id) AS lines,
      (SELECT count(*)::int FROM payments p WHERE p."salesOrderId"=s.id) AS payments,
      (SELECT count(*)::int FROM pos_commit_results c WHERE c."salesOrderId"=s.id) AS commits,
      ps.status AS "shiftStatus",ps."endTime",
      (SELECT count(*)::int FROM pos_offline_sync_certificates c WHERE c."organizationId"=s."organizationId" AND c."terminalId"=s."terminalId" AND c."closeBlocker") AS blockers
      FROM sales_orders s JOIN pos_sessions ps ON ps.id=s."sessionId"
      WHERE s."organizationId"=$1 AND s."orderNumber"=$2`,['rds_org_001','POS-RDS001-TERM-011-20261012-IXVT3'])).rows
    await client.query('ROLLBACK')
    if(result.length!==1) throw new Error('Cart unavailable')
    const evidence={checkedAt:new Date().toISOString(),...result[0]}
    fs.writeFileSync(path.resolve('docs/UI/UX/evidence/pos-finance-sales-2026-10-12/terminal-011-repair/checkout-verification.json'),JSON.stringify(evidence,null,2))
    console.log(JSON.stringify(evidence,null,2))
    if(evidence.status!=='DRAFT'||evidence.lines!==4||evidence.payments!==0||evidence.commits!==0||evidence.shiftStatus!=='ACTIVE'||evidence.endTime!==null||evidence.blockers!==0) throw new Error('Unexpected checkout state')
  } finally {await client.end()}
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1})
