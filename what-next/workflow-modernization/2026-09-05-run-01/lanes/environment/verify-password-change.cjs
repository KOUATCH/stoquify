"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),crypto=require("node:crypto"),{AsyncLocalStorage}=require("node:async_hooks");
const root=path.resolve(__dirname,"../../../../..");process.chdir(root);
const guard=require(path.join(root,"scripts/run-modern-modules-postgres-smoke.js")),{REQUIRED_MIGRATIONS}=require(path.join(root,"scripts/modern-modules-local-verification.js")),target=guard.targetUrl();
assert.equal(target.pathname.slice(1),guard.DATABASE_NAME);assert.ok(["localhost","127.0.0.1","::1","[::1]"].includes(target.hostname));assert.notEqual(process.env.NODE_ENV,"production");
process.env.DATABASE_URL=target.toString();process.env.DIRECT_URL=target.toString();process.env.NODE_ENV="test";process.env.NEXTAUTH_URL="http://127.0.0.1:3107";process.env.NEXT_PUBLIC_BASE_URL="http://127.0.0.1:3107";
const secrets=[target.toString()];for(const key of ["AUTH_SECRET","NEXTAUTH_SECRET","BETTER_AUTH_SECRET","PUBLIC_IDENTITY_ABUSE_HASH_SECRET"]){process.env[key]=crypto.randomBytes(32).toString("hex");secrets.push(process.env[key]);}for(const key of ["RESEND_API_KEY","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"])delete process.env[key];
const blocked=[];globalThis.fetch=async input=>{try{blocked.push(new URL(typeof input==="string"?input:input.url).origin);}catch{}throw new Error("Owned local verification blocks external fetch");};
const {PrismaClient}=require("@prisma/client"),real=new PrismaClient({datasources:{db:{url:target.toString()}},log:[],transactionOptions:{maxWait:10000,timeout:30000}}),store=new AsyncLocalStorage(),bind=(object,key)=>typeof object[key]==="function"?object[key].bind(object):object[key];
const proxy=new Proxy(real,{get(object,key){if(key!=="$transaction")return bind(object,key);return(work,options)=>typeof work!=="function"?object.$transaction(work,options):object.$transaction(tx=>{
 const scope=store.getStore();if(!scope)return work(tx);
 return work(new Proxy(tx,{get(transaction,property){
  if(property==="$queryRaw")return async(strings,...values)=>{if(strings.join("?").includes("FROM organizations")&&!scope.prepared){scope.prepared=true;if(scope.afterHash)await scope.afterHash();if(scope.barrier)await scope.barrier();}return transaction.$queryRaw(strings,...values);};
  if(property==="auditLog"&&scope.failAudit)return new Proxy(transaction.auditLog,{get(delegate,method){if(method==="create")return async args=>{assert.equal(args.data.organizationId,scope.organizationId);assert.equal(args.data.action,"AUTH_PASSWORD_CHANGED");throw new Error("OWNED_PASSWORD_AUDIT_FAILURE");};return bind(delegate,method);}});
  if(property==="account"&&scope.failCredential)return new Proxy(transaction.account,{get(delegate,method){if(method==="upsert")return async args=>{assert.equal(args.create.userId,scope.targetId);throw new Error("OWNED_PASSWORD_CREDENTIAL_FAILURE");};return bind(delegate,method);}});
  if(property==="user"&&scope.afterClaim)return new Proxy(transaction.user,{get(delegate,method){if(method==="update")return async args=>{const result=await delegate.update(args);if(args.data.password&&!scope.claimed){scope.claimed=true;assert.equal(args.where.id,scope.targetId);await scope.afterClaim();}return result;};return bind(delegate,method);}});
  return bind(transaction,property);
 }}));
 },options);}});globalThis.prisma=proxy;
process.env.TS_NODE_COMPILER_OPTIONS=JSON.stringify({module:"commonjs",moduleResolution:"node",jsx:"react-jsx"});require(path.join(root,"scripts/server-only-node-shim.js"));require("ts-node/register/transpile-only");require("tsconfig-paths/register");
const {changeUserPasswordWorkflow}=require(path.join(root,"services/users/user-password-change.service.ts")),{hashPassword,verifyPassword}=require(path.join(root,"lib/password.ts")),{syncUserCredentialPassword}=require(path.join(root,"lib/security/auth-credentials.ts")),{stepUpSessionWithPassword}=require(path.join(root,"services/security/step-up-auth.service.ts"));
const run=crypto.randomUUID().slice(0,12),prefix="org_modules_service_smoke_password_"+run;
const files=["services/users/password-change-input.ts","services/users/user-password-change.service.ts","services/users/user-identity.service.ts","actions/users/updateUserPassword.ts","lib/security/auth-credentials.ts","lib/security/auth-session.ts","lib/security/rbac-permissions.ts","services/security/step-up-auth.service.ts","services/auth/password-policy.ts","lib/password.ts","lib/security/hibp.ts","prisma/schema.prisma"];
const sha=value=>crypto.createHash("sha256").update(Buffer.isBuffer(value)?value:JSON.stringify(value)).digest("hex"),sources=()=>Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));
const receipt={run,database:guard.DATABASE_NAME,startedAt:new Date().toISOString(),sourcesBefore:sources(),checks:[],limitations:["Every write targets a newly owned synthetic organization in the guarded local controls database. Original organizations/roles/grants are bound before and after.","Session assurance is obtained through the real password step-up service, not seeded. Credential hashing, policy/history, sessions and audit use real PostgreSQL.","External fetch is blocked. The existing HIBP unavailable-network behavior is observed; no live email, provider integration or policy override.","Audit/credential failure and concurrent revocation are injected only into this run's owned fixtures. Browser proof is separate."]};
function password(){const value="Local!"+crypto.randomBytes(16).toString("hex").match(/.{2}/g).join("-")+"-9Q";assert.equal(require(path.join(root,"lib/security/password-utils.ts")).passwordSchema.safeParse(value).success,true);secrets.push(value);return value;}
async function fixture(name,admin=false){
 const organizationId=prefix+"_"+name,oldPassword=password(),newPassword=password(),actorPassword=admin?password():oldPassword,oldHash=await hashPassword(oldPassword),actorHash=admin?await hashPassword(actorPassword):oldHash,resetToken=crypto.randomBytes(16).toString("hex");secrets.push(resetToken);
 const data=await real.$transaction(async tx=>{
  await tx.organization.create({data:{id:organizationId,name:"Synthetic password "+name,slug:"password-"+run+"-"+name,onboardingSource:guard.SOURCE}});
  const role=await tx.role.create({data:{organizationId,code:"credential-owner",nameEn:"Synthetic credential owner",permissions:admin?["users.password.reset"]:["profile.password.update"]}});
  const targetUser=await tx.user.create({data:{organizationId,email:run+"."+name+"@example.invalid",password:oldHash,isActive:true,isVerified:true,emailVerified:true,verificationToken:resetToken,verificationTokenExpires:new Date(Date.now()+600000),roles:admin?undefined:{connect:{id:role.id}}}});
  await tx.account.create({data:{userId:targetUser.id,accountId:targetUser.id,providerId:"credential",password:oldHash}});await tx.passwordHistory.create({data:{userId:targetUser.id,passwordHash:oldHash}});
  const actor=admin?await tx.user.create({data:{organizationId,email:run+"."+name+".admin@example.invalid",password:actorHash,isActive:true,isVerified:true,emailVerified:true,roles:{connect:{id:role.id}}}}):targetUser;
  if(admin)await tx.account.create({data:{userId:actor.id,accountId:actor.id,providerId:"credential",password:actorHash}});
  const session=await tx.session.create({data:{userId:actor.id,token:crypto.randomBytes(32).toString("hex"),expiresAt:new Date(Date.now()+3600000)}});
  await tx.session.create({data:{userId:targetUser.id,token:crypto.randomBytes(32).toString("hex"),expiresAt:new Date(Date.now()+3600000)}});
  return{organizationId,roleId:role.id,targetId:targetUser.id,actorId:actor.id,sessionId:session.id,sessionToken:session.token};
 });
 secrets.push(data.sessionToken);assert.equal((await stepUpSessionWithPassword({sessionId:data.sessionId,sessionToken:data.sessionToken,userId:data.actorId,organizationId,password:actorPassword})).status,"verified");
 return{...data,oldPassword,newPassword,oldHash,resetToken,admin,actorPermissions:admin?["users.password.reset"]:["profile.password.update"]};
}
const request=(f,options={})=>store.run({...f,...options},()=>changeUserPasswordWorkflow({actor:{id:f.actorId,organizationId:f.organizationId},actorPermissions:f.actorPermissions,targetUserId:f.targetId,oldPassword:f.oldPassword,newPassword:f.newPassword,session:{id:f.sessionId,token:f.sessionToken}}));
async function state(f){const user=await real.user.findUnique({where:{id:f.targetId}}),accounts=await real.account.findMany({where:{userId:f.targetId,providerId:"credential"},orderBy:{id:"asc"}});return{userHash:user.password,accountHashes:accounts.map(row=>row.password),resetToken:user.verificationToken,history:await real.passwordHistory.count({where:{userId:f.targetId}}),sessions:await real.session.count({where:{userId:f.targetId}}),audits:await real.auditLog.count({where:{organizationId:f.organizationId,action:"AUTH_PASSWORD_CHANGED"}})};}
async function changed(f){const value=await state(f);assert.ok(await verifyPassword(f.newPassword,value.userHash));assert.ok(await verifyPassword(f.newPassword,value.accountHashes[0]));assert.equal(value.history,2);assert.equal(value.sessions,0);assert.equal(value.audits,1);assert.equal(value.resetToken,null);if(f.admin)assert.ok(await real.session.findUnique({where:{id:f.sessionId}}));const audit=await real.auditLog.findFirst({where:{organizationId:f.organizationId,action:"AUTH_PASSWORD_CHANGED"}});assert.equal(audit.userId,f.actorId);assert.equal(audit.changes.selfService,!f.admin);return{history:2,sessions:0,audits:1,resetLinkInvalidated:true,adminSessionPreserved:f.admin};}
const check=async(name,work)=>{const started=Date.now(),detail=await work();receipt.checks.push({name,passed:true,durationMs:Date.now()-started,detail});};
const authority=async()=>sha({organizations:await real.organization.findMany({where:{id:{not:{startsWith:prefix}}},orderBy:{id:"asc"}}),users:await real.user.findMany({where:{organizationId:{not:{startsWith:prefix}}},orderBy:{id:"asc"},include:{roles:{orderBy:{id:"asc"}}}}),grants:await real.tenantModuleGrant.findMany({orderBy:{id:"asc"}})});
async function main(){
 assert.equal((await real.$queryRaw`SELECT current_database() AS name`)[0].name,guard.DATABASE_NAME);const orgs=await real.organization.findMany({select:{id:true,onboardingSource:true}});assert.ok(orgs.every(row=>row.id.startsWith("org_modules_service_smoke_")&&row.onboardingSource===guard.SOURCE));const migrations=await real.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;assert.ok(REQUIRED_MIGRATIONS.every(name=>migrations.some(row=>row.migration_name===name)));receipt.originalAuthorityBefore=await authority();
 for(const admin of [false,true])await check((admin?"admin":"self")+" changes credentials and revokes only target sessions",async()=>{const f=await fixture(admin?"admin":"self",admin);assert.equal((await request(f)).status,200);return changed(f);});
 await check("concurrent requests have one winner and one retained audit",async()=>{const f=await fixture("race");let arrived=0,release;const ready=new Promise(resolve=>{release=resolve;}),barrier=async()=>{if(++arrived===2)release();await Promise.race([ready,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error("Password preparation barrier timed out")),15000);timer.unref();})]);};const results=await Promise.all([request(f,{barrier}),request(f,{barrier})]);assert.deepEqual(results.map(row=>row.status).sort(),[200,409]);return{statuses:results.map(row=>row.status),...await changed(f)};});
 for(const fault of ["Audit","Credential"])await check(fault+" failure rolls back credentials, history, reset token and sessions; retry succeeds",async()=>{const f=await fixture(fault.toLowerCase()),before=await state(f);await assert.rejects(request(f,{["fail"+fault]:true}),new RegExp("OWNED_PASSWORD_"+fault.toUpperCase()+"_FAILURE"));assert.deepEqual(await state(f),before);assert.equal((await request(f)).status,200);return{rolledBack:true,...await changed(f)};});
 for(const kind of ["credential","session","assurance","actor","role","membership","organization"]){
  await check(kind+" changes during password preparation prevent stale commit",async()=>{
   const f=await fixture("revoke-"+kind,true),before=await state(f);let expectedState=before;
   const afterHash=async()=>{
    if(kind==="credential"){const replacement=await hashPassword(password());await real.$transaction(tx=>syncUserCredentialPassword(tx,{userId:f.targetId,passwordHash:replacement,revokeSessions:true}));expectedState=await state(f);}
    if(kind==="session")await real.session.update({where:{id:f.sessionId},data:{expiresAt:new Date(0)}});
    if(kind==="assurance")await real.session.update({where:{id:f.sessionId},data:{assuranceVerifiedAt:new Date(0)}});
    if(kind==="actor")await real.user.update({where:{id:f.actorId},data:{isActive:false}});
    if(kind==="role")await real.role.update({where:{id:f.roleId},data:{permissions:[]}});
    if(kind==="membership")await real.user.update({where:{id:f.actorId},data:{roles:{disconnect:{id:f.roleId}}}});
    if(kind==="organization")await real.organization.update({where:{id:f.organizationId},data:{isActive:false}});
   };
   const result=await request(f,{afterHash});assert.equal(result.status,kind==="credential"?409:kind==="session"?401:403);assert.deepEqual(await state(f),expectedState);return{status:result.status,noPasswordEffects:true};
  });
 }
 for(const kind of ["role","membership","actor","organization","session"]){
  await check(kind+" revocation waits for the final credential transaction",async()=>{
   const f=await fixture("lock-"+kind,true);let writerBlocked=false;
   const afterClaim=async()=>{await assert.rejects(real.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL lock_timeout = '150ms'`;
    if(kind==="role")await tx.$executeRaw`UPDATE roles SET permissions = ARRAY[]::text[] WHERE id = ${f.roleId} AND "organizationId" = ${f.organizationId}`;
    if(kind==="membership")await tx.$executeRaw`DELETE FROM "_UserRoles" WHERE "A" = ${f.roleId} AND "B" = ${f.actorId}`;
    if(kind==="actor")await tx.$executeRaw`UPDATE users SET "isActive" = false WHERE id = ${f.actorId} AND "organizationId" = ${f.organizationId}`;
    if(kind==="organization")await tx.$executeRaw`UPDATE organizations SET "isActive" = false WHERE id = ${f.organizationId}`;
    if(kind==="session")await tx.$executeRaw`UPDATE sessions SET "expiresAt" = ${new Date(0)} WHERE id = ${f.sessionId} AND "userId" = ${f.actorId}`;
   }),error=>{writerBlocked=error.code==="P2010"&&error.meta?.code==="55P03";return writerBlocked;});};
   assert.equal((await request(f,{afterClaim})).status,200);assert.equal(writerBlocked,true);return{writerBlockedUntilCommit:true,...await changed(f)};
  });
 }
 await check("wrong current password and reused password leave state unchanged",async()=>{const f=await fixture("wrong"),before=await state(f);assert.equal((await request({...f,oldPassword:password()})).code,"INVALID_CREDENTIALS");assert.equal((await request({...f,newPassword:f.oldPassword})).code,"RECENTLY_USED");assert.deepEqual(await state(f),before);return{unchanged:true};});
 await check("unknown legacy permission and foreign target never change credentials",async()=>{const f=await fixture("denied",true),foreign=await fixture("foreign"),before=await state(f),foreignBefore=await state(foreign);assert.equal((await request({...f,actorPermissions:["PASSWORD_READ"]})).status,403);assert.equal((await request({...f,targetId:foreign.targetId})).status,404);assert.deepEqual(await state(f),before);assert.deepEqual(await state(foreign),foreignBefore);return{tenantIsolation:true,knownPermissionRequired:true};});
 receipt.originalAuthorityAfter=await authority();assert.equal(receipt.originalAuthorityAfter,receipt.originalAuthorityBefore);receipt.originalAuthorityUnchanged=true;
}
main().catch(error=>{let message=String(error.message);for(const secret of secrets)message=message.split(secret).join("[redacted]");receipt.error=message.split("Failing row contains")[0].slice(0,1500);process.exitCode=1;}).finally(async()=>{receipt.completedAt=new Date().toISOString();receipt.sourcesAfter=sources();receipt.sourceStable=sha(receipt.sourcesBefore)===sha(receipt.sourcesAfter);receipt.network={actualFetchRequests:0,blockedOrigins:[...new Set(blocked)]};receipt.passed=receipt.checks.length;receipt.failed=receipt.error?1:0;receipt.driverSha256=sha(fs.readFileSync(__filename));await real.$disconnect();const output="password-change-"+run+".json";fs.writeFileSync(path.join(__dirname,output),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify({output,passed:receipt.passed,failed:receipt.failed,sourceStable:receipt.sourceStable,originalAuthorityUnchanged:receipt.originalAuthorityUnchanged}));});
