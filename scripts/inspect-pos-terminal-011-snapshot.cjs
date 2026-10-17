const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')
const { loadDatabaseUrl } = require('./prisma-local-fresh-bootstrap.js')
async function main() {
  const url = new URL(loadDatabaseUrl())
  if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.pathname !== '/stoquify_replay_next_20260830') throw new Error('Wrong target')
  const dir = path.resolve('docs/UI/UX/evidence/pos-finance-sales-2026-10-12/terminal-011-repair')
  const snapshot = JSON.parse(fs.readFileSync(path.join(dir,'snapshot-1791802660153.json')))
  const client = new Client({connectionString:url.toString()})
  await client.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    for (const [key, table] of [['events','pos_offline_events'],['conflicts','pos_offline_sync_conflicts'],['certificates','pos_offline_sync_certificates']]) {
      const row = snapshot[key][0]
      const result = await client.query(`SELECT to_jsonb(t) AS actual, to_jsonb(jsonb_populate_record(NULL::${table},$1::jsonb)) AS expected FROM ${table} t WHERE id=$2 AND "organizationId"=$3`, [JSON.stringify(row),row.id,snapshot.organizationId])
      if(result.rows.length!==1) throw new Error('Expected row unavailable')
      const {actual,expected}=result.rows[0]
      console.log(key, JSON.stringify(Object.keys(actual).filter(k=>JSON.stringify(actual[k])!==JSON.stringify(expected[k])).map(k=>({field:k,actual:actual[k],expected:expected[k]}))))
      snapshot[key]=[actual]
    }
    await client.query('ROLLBACK')
    fs.writeFileSync(path.join(dir,'snapshot-native-timestamps.json'),JSON.stringify(snapshot,null,2),{flag:'wx'})
  } finally {await client.end()}
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1})
