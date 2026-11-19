const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{PrismaClient}=require('@prisma/client');
const {state,redact}=require('./environment.cjs');
const s=state(),f=JSON.parse(fs.readFileSync(path.join(s.work,'fixture-private.json'))),db=new PrismaClient({datasources:{db:{url:s.url}}}),report={readOnly:true,checks:[]};
async function main(){
 const [identity]=await db.$queryRaw`SELECT current_database() AS name,current_setting('data_directory') AS directory`;assert.equal(identity.name,s.database);assert.equal(path.resolve(identity.directory).toLowerCase(),s.cluster.toLowerCase());
 const rows=await db.$queryRaw`SELECT id,"sourceKey",condition,"ownerId","dueAt" FROM command_center_occurrences WHERE "organizationId"=${f.organizationId} AND "scopeKey"='TENANT' AND "sourceKey" IN ('stockout','receiving') ORDER BY "sourceKey"`;
 assert.equal(rows.length,2);for(const row of rows){assert.equal(row.condition,'CLEAR');assert.equal(row.ownerId,f.managerId);assert.equal(row.dueAt.toISOString(),'2026-11-01T00:00:00.000Z');
 const events=await db.$queryRaw`SELECT type,changes FROM command_center_events WHERE "organizationId"=${f.organizationId} AND "occurrenceId"=${row.id}`;
 assert.ok(events.some(e=>e.type==='OBSERVED'&&e.changes.condition==='ACTIVE'));assert.ok(events.some(e=>e.type==='SOURCE_CHANGED'&&e.changes.before.condition==='ACTIVE'&&e.changes.after.condition==='CLEAR'));
 }
 report.checks.push('Both current cleared occurrences retain their original ACTIVE observation and authoritative clearance events under the same IDs');report.checks.push('Both original owners and exact 2026-11-01 UTC deadlines remain persisted after source completion and flag rollback');
 assert.equal(await db.goodsReceipt.count({where:{purchaseOrderId:f.purchaseOrderId}}),1);assert.equal((await db.purchaseOrder.findUniqueOrThrow({where:{id:f.purchaseOrderId}})).status,'RECEIVED');assert.equal((await db.inventoryLevel.findUniqueOrThrow({where:{id:f.levelId}})).quantityAvailable.toString(),'1');report.checks.push('Exactly one receipt, RECEIVED order and one available stock unit remain after continuation and rollback');report.passed=true;
}
main().catch(e=>{report.passed=false;report.failure=redact(e.stack);process.exitCode=1}).finally(async()=>{await db.$disconnect();fs.writeFileSync(path.join(__dirname,'final-source-proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))});
