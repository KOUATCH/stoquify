// Read-only inventory. No file upload, reference rewrite, or deletion.
require("@next/env").loadEnvConfig(process.cwd())
const { Pool } = require("pg")
async function main() {
  const pool=new Pool({connectionString:process.env.DATABASE_URL})
  try {
    const queries={
      items:`SELECT id, "organizationId", reference FROM items CROSS JOIN LATERAL unnest("imageUrls" || ARRAY[thumbnail]) reference WHERE reference LIKE '/uploads/%'`,
      categories:`SELECT id, "organizationId", "imageUrl" AS reference FROM categories WHERE "imageUrl" LIKE '/uploads/%'`,
      brands:`SELECT id, "organizationId", "logoUrl" AS reference FROM brands WHERE "logoUrl" LIKE '/uploads/%'`,
      users:`SELECT id, "organizationId", image AS reference FROM users WHERE image LIKE '/uploads/%'`,
    }
    const entities={}
    for(const [entity,query] of Object.entries(queries)) {
      const result=await pool.query(query)
      entities[entity]={localReferences:result.rowCount,references:result.rows}
    }
    console.log(JSON.stringify({checkedAt:new Date().toISOString(),mode:"read-only",entities},null,2))
  } finally {await pool.end()}
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
