const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const {state,redact}=require('./environment.cjs');
async function main(){const s=state(),f=JSON.parse(fs.readFileSync(path.join(s.work,'fixture-private.json'))),db=new PrismaClient({datasources:{db:{url:s.url}}});try{
 const [identity]=await db.$queryRaw`SELECT current_database() AS name,current_setting('data_directory') AS directory`;
 assert.equal(identity.name,s.database);assert.equal(path.resolve(identity.directory).toLowerCase(),s.cluster.toLowerCase());
 const role=await db.role.findUniqueOrThrow({where:{id:f.roleId}});assert.equal(role.organizationId,f.organizationId);
 assert.equal((await db.purchaseOrder.findUniqueOrThrow({where:{id:f.purchaseOrderId}})).status,'APPROVED');
 await db.role.update({where:{id:f.roleId},data:{permissions:[...new Set([...role.permissions,'purchases.orders.receive'])]}});
 console.log('Added explicit receiving permission to the synthetic role; source remains uncompleted.');
 }finally{await db.$disconnect()}}
main().catch(e=>{console.error(redact(e.message));process.exitCode=1});
