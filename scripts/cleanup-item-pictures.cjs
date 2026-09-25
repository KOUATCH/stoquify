// Dry-run by default. Deletes only old unreferenced managed item pictures in one tenant.
const { loadEnvConfig } = require("@next/env")
const { Pool } = require("pg")
loadEnvConfig(process.cwd())
async function main() {
  const organizationId = process.argv.find(arg=>arg.startsWith("--org="))?.slice(6)
  if (!organizationId) throw Error("Supply --org=<organization-id>. Add --apply only after reviewing the dry run.")
  const apply = process.argv.includes("--apply")
  const pool = new Pool({connectionString:process.env.DATABASE_URL})
  const client = await pool.connect()
  const { UTApi } = await import("uploadthing/server")
  const provider = apply ? new UTApi({ logLevel: "None" }) : null
  try {
    const candidates = await client.query('SELECT id FROM picture_assets WHERE "organizationId"=$1 AND "entityType"=\'item\' AND status<>\'deleted\' AND "updatedAt" < now() - interval \'48 hours\' ORDER BY "createdAt" LIMIT 100', [organizationId])
    const result={mode:apply?"apply":"dry-run",organizationId,eligible:[],deleted:[],failed:[]}
    for (const {id} of candidates.rows) {
      await client.query("BEGIN")
      try {
        const locked=await client.query('SELECT id FROM picture_assets WHERE id=$1 AND "organizationId"=$2 AND status<>\'deleted\' AND "updatedAt" < now() - interval \'48 hours\' FOR UPDATE SKIP LOCKED',[id,organizationId])
        if (!locked.rowCount) {await client.query("ROLLBACK"); continue}
        const reference="/api/media/"+id
        // Retain even archived items' pictures. Every attachment acquires this asset lock.
        const used=await client.query('SELECT 1 FROM items WHERE "organizationId"=$1 AND ("thumbnail"=$2 OR $2=ANY("imageUrls")) LIMIT 1',[organizationId,reference])
        if (used.rowCount) {await client.query("ROLLBACK");continue}
        result.eligible.push(id)
        if (!apply) {await client.query("ROLLBACK");continue}
        await client.query('UPDATE picture_assets SET status=\'deleting\', "updatedAt"=now() WHERE id=$1',[id])
        await client.query("COMMIT")
        const deleted=await provider.deleteFiles(id,{keyType:"customId"})
        if (!deleted.success) throw Error("Provider deletion not confirmed")
        await client.query('UPDATE picture_assets SET status=\'deleted\', "updatedAt"=now() WHERE id=$1',[id])
        result.deleted.push(id)
      } catch {
        await client.query("ROLLBACK")
        result.failed.push(id) // deleting tombstones remain retryable
      }
    }
    console.log(JSON.stringify(result,null,2))
    if(result.failed.length) process.exitCode=1
  } finally {client.release();await pool.end()}
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
