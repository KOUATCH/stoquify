"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"../../../../.."),helper=require(path.join(root,"scripts/modern-modules-local-verification.js")),target=helper.targetUrl();
assert.equal(target.pathname.slice(1),helper.DATABASE_NAME);assert.ok(["localhost","127.0.0.1","[::1]"].includes(target.hostname));
const fixture=JSON.parse(fs.readFileSync(path.join(root,"playwright/.auth/workflow-invitation-provenance-v1.json"),"utf8"));assert.equal(fixture.database,helper.DATABASE_NAME);assert.equal(fixture.organizationId,"org_modules_legacy_en_desktop");
const {PrismaClient}=require("@prisma/client"),db=new PrismaClient({datasources:{db:{url:target.toString()}},log:[]});
(async()=>{
 assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name,helper.DATABASE_NAME);
 const rows=[];
 for(const f of fixture.fixtures){assert.ok(f.email.startsWith("workflow_invitation_provenance_01baa2e0-c4d_")&&f.email.endsWith("@example.invalid"));
  const user=await db.user.findFirst({where:{email:f.email,organizationId:fixture.organizationId},select:{id:true}});assert.ok(user);
  const result=await db.$transaction(async tx=>{
   await tx.user.update({where:{id:user.id},data:{isActive:false,password:null}});
   const credentials=await tx.account.updateMany({where:{userId:user.id,providerId:"credential"},data:{password:null}});
   const sessions=await tx.session.updateMany({where:{userId:user.id},data:{expiresAt:new Date(0)}});
   return{credentials:credentials.count,sessions:sessions.count};
  });rows.push({locale:f.locale,userId:user.id,disabled:true,...result});
 }
 const receipt={recordedAt:new Date().toISOString(),database:helper.DATABASE_NAME,fixtureGeneration:"01baa2e0-c4d",reason:"Synthetic credentials were submitted by the unhydrated GET fallback; accounts disabled, credential passwords cleared, sessions expired. Invitation and audit history retained.",rows};
 fs.writeFileSync(path.join(__dirname,"invitation-provenance-v1-containment.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify({disabled:rows.length,retainedHistory:true}));
})().catch(()=>{console.error("Synthetic fixture containment failed; inspect scoped state without printing credentials.");process.exitCode=1;}).finally(()=>db.$disconnect());
