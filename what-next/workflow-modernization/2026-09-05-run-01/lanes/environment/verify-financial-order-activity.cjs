"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"../../../../..");process.chdir(root);
const helper=require(path.join(root,"scripts/run-modern-modules-postgres-smoke.js")),browserHelper=require(path.join(root,"scripts/modern-modules-local-verification.js"));
const target=helper.targetUrl();assert.equal(target.pathname.slice(1),helper.DATABASE_NAME);assert.ok(["localhost","127.0.0.1","::1","[::1]"].includes(target.hostname));assert.notEqual(process.env.NODE_ENV,"production");
process.env.DATABASE_URL=target.toString();process.env.DIRECT_URL=target.toString();process.env.NODE_ENV="test";
const {PrismaClient}=require("@prisma/client"),db=new PrismaClient({datasources:{db:{url:target.toString()}},log:[]});globalThis.prisma=db;
process.env.TS_NODE_COMPILER_OPTIONS=JSON.stringify({module:"commonjs",moduleResolution:"node",jsx:"react-jsx"});require(path.join(root,"scripts/server-only-node-shim.js"));require("ts-node/register/transpile-only");require("tsconfig-paths/register");
const {getFinancialOrderActivity}=require(path.join(root,"services/analytics/financial-order-activity.service.ts"));
const original=JSON.parse(fs.readFileSync(path.join(__dirname,"daily-sales-postgres-af424ca5-101.json"),"utf8"));assert.equal(original.database,helper.DATABASE_NAME);assert.equal(original.passed,5);
const prefix=original.ownedOrganizationPrefix;assert.equal(prefix,"org_modules_service_smoke_daily_af424ca5-101");
const sha=value=>crypto.createHash("sha256").update(Buffer.isBuffer(value)?value:JSON.stringify(value)).digest("hex");
const files=["services/analytics/financial-order-activity.service.ts","services/analytics/financial-analytics.service.ts","services/analytics/daily-sales-period.ts","services/analytics/analytical-context-contracts.ts","actions/analytics/financial-analytics.ts","prisma/schema.prisma"];
const sources=()=>Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));
const receipt={startedAt:new Date().toISOString(),database:helper.DATABASE_NAME,fixtureSource:"daily-sales-postgres-af424ca5-101.json",sourcesBefore:sources(),checks:[],limitations:["Read-only real PostgreSQL checks reuse explicitly synthetic local orders; no seed, reset, migration or financial writes.","No production UI caller found for the legacy financial endpoint; this is service/database proof, not browser or full payroll lifecycle verification."]};
const check=async(name,work)=>{const at=Date.now(),detail=await work();receipt.checks.push({name,passed:true,durationMs:Date.now()-at,detail});};
const snapshot=async()=>sha({organizations:await db.organization.findMany({orderBy:{id:"asc"}}),grants:await db.tenantModuleGrant.findMany({orderBy:{id:"asc"}}),orders:await db.salesOrder.findMany({where:{organizationId:{startsWith:prefix}},orderBy:{id:"asc"},include:{lines:{orderBy:{id:"asc"}}}}),reports:await db.dailySalesReport.findMany({where:{organizationId:{startsWith:prefix}},orderBy:{id:"asc"}})});
async function main(){
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name,helper.DATABASE_NAME);
  const organizations=await db.organization.findMany({select:{id:true,onboardingSource:true}});assert.ok(organizations.every(row=>row.id.startsWith("org_modules_service_smoke_")&&row.onboardingSource===helper.SOURCE));
  const migrations=await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;assert.ok(browserHelper.REQUIRED_MIGRATIONS.every(name=>migrations.some(row=>row.migration_name===name)));
  receipt.authorityAndRecordsBefore=await snapshot();
  for(const [name,date] of [["douala","2026-09-06"],["paris","2026-03-29"]]){
    const organizationId=prefix+"_"+name,location=await db.location.findFirst({where:{organizationId,isActive:true,deletedAt:null}});assert.ok(location);
    const input={organizationId,locationId:location.id,startDate:new Date(date+"T00:00:00Z"),endDate:new Date(date+"T00:00:00Z")};
    await check(name+" exact adjacent current/previous order periods",async()=>{
      const result=await getFinancialOrderActivity(input);assert.equal(result.current.value,"26.00");assert.equal(result.current.count,2);assert.equal(result.previous.value,"900.00");assert.equal(result.previous.count,1);assert.equal(result.previous.periodEndExclusive,result.current.periodStart);assert.equal(result.valueGrowthPercent,"-97.11");
      assert.equal(new Date(result.current.periodEndExclusive)-new Date(result.current.periodStart),(name==="paris"?23:24)*3600000);return result;
    });
    await check(name+" all-location, retained location and foreign object isolation",async()=>{
      const all=await getFinancialOrderActivity({...input,locationId:"all"});assert.equal(all.context.scope.kind,"ORGANIZATION");assert.equal(all.current.value,"26.00");
      const retained=await db.location.findFirst({where:{organizationId,isActive:false}});assert.ok(retained);const historical=await getFinancialOrderActivity({...input,locationId:retained.id});assert.equal(historical.current.value,"0.00");
      await assert.rejects(getFinancialOrderActivity({...input,organizationId:prefix+"_empty"}),error=>error.code==="NOT_FOUND");return {allLocations:all.current,retainedZero:historical.current,foreignLocationDenied:true};
    });
  }
  await check("missing organization and malformed interval remain failures",async()=>{
    const input={organizationId:prefix+"_missing",locationId:"all",startDate:new Date("2026-09-06T00:00:00Z"),endDate:new Date("2026-09-06T00:00:00Z")};
    await assert.rejects(getFinancialOrderActivity(input),error=>error.code==="NOT_FOUND");await assert.rejects(getFinancialOrderActivity({...input,endDate:new Date("2026-09-05T00:00:00Z")}),error=>error.code==="BUSINESS_RULE_VIOLATION");return {missingDenied:true,invalidRangeDenied:true};
  });
  receipt.authorityAndRecordsAfter=await snapshot();assert.equal(receipt.authorityAndRecordsAfter,receipt.authorityAndRecordsBefore);receipt.authorityAndRecordsUnchanged=true;
}
main().catch(error=>{receipt.error=String(error.message).split(target.toString()).join("[redacted]").slice(0,1600);process.exitCode=1;}).finally(async()=>{
  receipt.completedAt=new Date().toISOString();receipt.sourcesAfter=sources();receipt.sourceStable=sha(receipt.sourcesAfter)===sha(receipt.sourcesBefore);receipt.passed=receipt.checks.length;receipt.failed=receipt.error?1:0;receipt.driverSha256=sha(fs.readFileSync(__filename));await db.$disconnect();
  const output="financial-order-activity-"+crypto.randomUUID().slice(0,12)+".json";fs.writeFileSync(path.join(__dirname,output),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify({output,passed:receipt.passed,failed:receipt.failed,sourceStable:receipt.sourceStable,authorityAndRecordsUnchanged:receipt.authorityAndRecordsUnchanged}));
});
