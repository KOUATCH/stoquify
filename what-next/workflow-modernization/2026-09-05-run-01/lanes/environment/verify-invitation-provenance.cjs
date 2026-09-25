"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),crypto=require("node:crypto"),{AsyncLocalStorage}=require("node:async_hooks");
const root=path.resolve(__dirname,"../../../../..");process.chdir(root);
const guard=require(path.join(root,"scripts/run-modern-modules-postgres-smoke.js")),{REQUIRED_MIGRATIONS}=require(path.join(root,"scripts/modern-modules-local-verification.js"));
const target=guard.targetUrl();assert.equal(target.pathname.slice(1),guard.DATABASE_NAME);assert.ok(["localhost","127.0.0.1","::1","[::1]"].includes(target.hostname));assert.notEqual(process.env.NODE_ENV,"production");
process.env.DATABASE_URL=target.toString();process.env.DIRECT_URL=target.toString();process.env.NODE_ENV="test";process.env.NEXTAUTH_URL="http://127.0.0.1:3107";process.env.NEXT_PUBLIC_BASE_URL="http://127.0.0.1:3107";process.env.STOQUIFY_USER_INVITE_FROM_EMAIL="invites@example.invalid";
const secrets=[target.toString()];for(const key of ["AUTH_SECRET","NEXTAUTH_SECRET","BETTER_AUTH_SECRET","PUBLIC_IDENTITY_ABUSE_HASH_SECRET"]){process.env[key]=crypto.randomBytes(32).toString("hex");secrets.push(process.env[key]);}for(const key of ["RESEND_API_KEY","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"])delete process.env[key];
const blocked=[];globalThis.fetch=async input=>{let origin="unknown";try{origin=new URL(typeof input==="string"?input:input.url).origin;}catch{}blocked.push(origin);throw new Error("Local verification blocks external fetch");};
const {PrismaClient}=require("@prisma/client"),real=new PrismaClient({datasources:{db:{url:target.toString()}},log:[],transactionOptions:{maxWait:10000,timeout:30000}}),scopeStore=new AsyncLocalStorage();
const bind=(object,key)=>typeof object[key]==="function"?object[key].bind(object):object[key];
const proxy=new Proxy(real,{get(object,key){
  if(key!=="$transaction")return bind(object,key);
  return(work,options)=>typeof work!=="function"?object.$transaction(work,options):object.$transaction(tx=>{
    const scope=scopeStore.getStore();if(!scope)return work(tx);
    return work(new Proxy(tx,{get(transaction,property){
      if(property==="$queryRaw")return async(strings,...values)=>{if(strings.join("?").includes("FROM business_events e")&&scope.afterHash&&!scope.afterHashDone){scope.afterHashDone=true;await scope.afterHash();}return transaction.$queryRaw(strings,...values);};
      if(property==="invite")return new Proxy(transaction.invite,{get(delegate,method){
        if(method==="findUnique")return async args=>{const row=await delegate.findUnique(args);if(row&&args.where.token===scope.token&&scope.barrier)await scope.barrier();return row;};
        if(method==="updateMany")return async args=>{if(args.data.status==="ACCEPTED"){assert.equal(args.where.id,scope.inviteId);}const result=await delegate.updateMany(args);if(args.data.status==="ACCEPTED"&&result.count===1&&scope.afterClaim)await scope.afterClaim();return result;};
        return bind(delegate,method);
      }});
      if(property==="auditLog"&&scope.failAudit)return new Proxy(transaction.auditLog,{get(delegate,method){if(method==="create")return async args=>{assert.equal(args.data.changes.inviteId,scope.inviteId);throw new Error("OWNED_INVITATION_AUDIT_FAILURE");};return bind(delegate,method);}});
      if(property==="account"&&scope.failCredential)return new Proxy(transaction.account,{get(delegate,method){if(method==="upsert")return async args=>{assert.ok(await transaction.user.findFirst({where:{id:args.create.userId,organizationId:scope.organizationId}}));throw new Error("OWNED_INVITATION_CREDENTIAL_FAILURE");};return bind(delegate,method);}});
      return bind(transaction,property);
    }}));
  },options);
}});globalThis.prisma=proxy;
process.env.TS_NODE_COMPILER_OPTIONS=JSON.stringify({module:"commonjs",moduleResolution:"node",jsx:"react-jsx"});require(path.join(root,"scripts/server-only-node-shim.js"));require("ts-node/register/transpile-only");require("tsconfig-paths/register");
const {acceptInvitationWorkflow,getInviteRegistrationContext}=require(path.join(root,"services/users/user-identity.service.ts")),{verifyPassword}=require(path.join(root,"lib/password.ts"));
const {issueUserInvitation}=require(path.join(root,"services/users/user-invitation-issuance.service.ts"));
const {hashBusinessPayload}=require(path.join(root,"services/events/business-event.service.ts"));
const run=crypto.randomUUID().slice(0,12),prefix="org_modules_service_smoke_provenance_"+run,files=["services/users/user-invitation-redemption-authority.service.ts","services/users/user-invitation-authority.service.ts","services/users/user-invitation-issuance.service.ts","services/users/user-invitation-delivery-contract.ts","services/users/user-identity.service.ts","lib/security/auth-credentials.ts","services/security/role-grant-policy.service.ts","services/security/public-identity-abuse.service.ts","services/auth/password-policy.ts","lib/security/hibp.ts","lib/password.ts","actions/users/createInvitedUser.ts","prisma/schema.prisma"];
const sha=value=>crypto.createHash("sha256").update(Buffer.isBuffer(value)?value:JSON.stringify(value)).digest("hex"),sources=()=>Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));
const receipt={run,database:guard.DATABASE_NAME,startedAt:new Date().toISOString(),sourcesBefore:sources(),checks:[],limitations:["Owned synthetic issuers and roles are test preconditions; current invitation approval/outbox are created through the real issuance service. Legacy fixtures deliberately omit issuance evidence. No real email or external delivery.","Actual password hashing/credential writes and public abuse controls are used; HIBP network is blocked so its existing unavailable-network behavior is exercised.","Fault injection only affects an owned transaction's credential or audit write; it does not disable database constraints. Browser/onboarding proof is separate."]};
let fixtureIndex=0;
async function fixture(name,options={}){
 const organizationId=prefix+"_"+name,password="Local!"+crypto.randomBytes(16).toString("hex").match(/.{2}/g).join("-")+"9Q",email=run+"."+name+"@example.invalid";secrets.push(password);fixtureIndex++;
 const f=await real.$transaction(async tx=>{
  await tx.organization.create({data:{id:organizationId,name:"Synthetic provenance "+name,slug:"provenance-"+run+"-"+name,onboardingSource:guard.SOURCE}});
  const role=await tx.role.create({data:{organizationId,code:"reader",nameEn:"Synthetic reader",nameFr:"Lecteur synthétique",permissions:["dashboard.read"]}});
  const issuerRole=await tx.role.create({data:{organizationId,code:"issuer",nameEn:"Synthetic issuer",permissions:["users.invite","users.roles.assign","dashboard.read","users.read"]}});
  const issuer=await tx.user.create({data:{organizationId,email:run+"."+name+".issuer@example.invalid",isActive:true,isVerified:true,emailVerified:true,roles:{connect:{id:issuerRole.id}}}});
  return{organizationId,roleId:role.id,issuerId:issuer.id,issuerRoleId:issuerRole.id,password,email,ipAddress:"198.51.100."+fixtureIndex};
 });
 if(options.legacy){
  const token=crypto.randomBytes(32).toString("hex");secrets.push(token);
  const invite=await real.invite.create({data:{organizationId,email,roleId:f.roleId,token,expiresAt:new Date(Date.now()+600000)}});return{...f,inviteId:invite.id,token};
 }
 const result=await issueUserInvitation({actor:{id:f.issuerId,organizationId},actorPermissions:["users.invite","users.roles.assign","dashboard.read","users.read"],email,roleId:f.roleId,requestId:crypto.randomUUID()});
 assert.equal(result.status,200);const invite=await real.invite.findUnique({where:{id:result.data.inviteId}});secrets.push(invite.token);
 return{...f,inviteId:invite.id,token:invite.token,issueId:result.data.issueId};
}
const redeem=(fixture,overrides={})=>scopeStore.run({...fixture,...overrides},()=>acceptInvitationWorkflow({token:fixture.token,password:fixture.password,firstName:"Synthetic",lastName:"Invite"},{ipAddress:fixture.ipAddress}));
async function counts(f){const user=await real.user.findUnique({where:{email:f.email}});return{invite:(await real.invite.findUnique({where:{id:f.inviteId}})).status,userId:user?.id??null,users:await real.user.count({where:{organizationId:f.organizationId,id:{not:f.issuerId}}}),accounts:user?await real.account.count({where:{userId:user.id}}):0,passwords:user?await real.passwordHistory.count({where:{userId:user.id}}):0,audits:await real.auditLog.count({where:{organizationId:f.organizationId,action:"INVITE_REDEEMED"}})};}
async function assertCreated(f){const state=await counts(f);assert.equal(state.invite,"ACCEPTED");assert.equal(state.users,1);assert.equal(state.accounts,1);assert.equal(state.passwords,1);assert.equal(state.audits,1);const user=await real.user.findUnique({where:{id:state.userId},include:{roles:true}}),account=await real.account.findFirst({where:{userId:user.id,providerId:"credential"}});assert.ok(await verifyPassword(f.password,user.password));assert.ok(await verifyPassword(f.password,account.password));assert.deepEqual(user.roles.map(row=>row.id),[f.roleId]);const audit=await real.auditLog.findFirst({where:{organizationId:f.organizationId,action:"INVITE_REDEEMED"}});assert.equal(audit.changes.issueId,f.issueId);assert.equal(audit.changes.issuerId,f.issuerId);assert.deepEqual(audit.changes.rolePermissions,["dashboard.read"]);return state;}
async function assertNoUser(f,status){const state=await counts(f);assert.equal(state.users,0);assert.equal(state.audits,0);if(status)assert.equal(state.invite,status);return state;}
const check=async(name,work)=>{const at=Date.now(),detail=await work();receipt.checks.push({name,passed:true,durationMs:Date.now()-at,detail});};
const authority=async()=>sha({organizations:await real.organization.findMany({where:{id:{not:{startsWith:prefix}}},orderBy:{id:"asc"}}),users:await real.user.findMany({where:{organizationId:{not:{startsWith:prefix}}},orderBy:{id:"asc"},include:{roles:{orderBy:{id:"asc"}}}}),grants:await real.tenantModuleGrant.findMany({orderBy:{id:"asc"}})});
async function main(){
 assert.equal((await real.$queryRaw`SELECT current_database() AS name`)[0].name,guard.DATABASE_NAME);const orgs=await real.organization.findMany({select:{id:true,onboardingSource:true}});assert.ok(orgs.every(row=>row.id.startsWith("org_modules_service_smoke_")&&row.onboardingSource===guard.SOURCE));const migrations=await real.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;assert.ok(REQUIRED_MIGRATIONS.every(name=>migrations.some(row=>row.migration_name===name)));receipt.originalAuthorityBefore=await authority();
 await check("two concurrent redemptions create exactly one complete identity and audit",async()=>{const f=await fixture("race");let arrived=0,release;const ready=new Promise(resolve=>{release=resolve;});const barrier=async()=>{if(++arrived===2)release();await Promise.race([ready,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error("Invitation barrier timed out")),12000);timer.unref();})]);};const results=await Promise.all([redeem(f,{barrier}),redeem(f,{barrier})]);assert.equal(results.filter(result=>result.status===200).length,1);assert.equal(results.filter(result=>result.status===409).length,1);const state=await assertCreated(f);assert.notEqual((await redeem(f)).status,200);return{statuses:results.map(row=>row.status),...state};});
 for(const fault of ["Credential","Audit"])await check(fault+" failure rolls back claim and credentials; retry completes once",async()=>{const f=await fixture(fault.toLowerCase());await assert.rejects(redeem(f,{["fail"+fault]:true}),new RegExp("OWNED_INVITATION_"+fault.toUpperCase()+"_FAILURE"));const rollback=await assertNoUser(f,"PENDING");assert.equal((await redeem(f)).status,200);return{rollback,retry:await assertCreated(f)};});

 for(const change of ["cancel","reissue","disable","wildcard","role-expanded","issuer-disabled","issuer-permission-removed","issuer-membership-removed"]){
  await check(change+" during password preparation prevents account creation",async()=>{
   const f=await fixture(change);
   const afterHash=async()=>{
    if(change==="cancel")await real.invite.update({where:{id:f.inviteId},data:{status:"CANCELLED"}});
    if(change==="reissue"){const token=crypto.randomBytes(32).toString("hex");secrets.push(token);await real.invite.update({where:{id:f.inviteId},data:{token}});}
    if(change==="disable")await real.organization.update({where:{id:f.organizationId},data:{isActive:false}});
    if(change==="wildcard")await real.role.update({where:{id:f.roleId},data:{permissions:["*"]}});
    if(change==="role-expanded")await real.role.update({where:{id:f.roleId},data:{permissions:["dashboard.read","users.read"]}});
    if(change==="issuer-disabled")await real.user.update({where:{id:f.issuerId},data:{isActive:false}});
    if(change==="issuer-permission-removed")await real.role.update({where:{id:f.issuerRoleId},data:{permissions:["dashboard.read"]}});
    if(change==="issuer-membership-removed")await real.user.update({where:{id:f.issuerId},data:{roles:{disconnect:{id:f.issuerRoleId}}}});
   };
   const result=await redeem(f,{afterHash});assert.equal(result.status,["cancel","reissue"].includes(change)?409:403,change+": "+result.code);
   return{code:result.code,...await assertNoUser(f,change==="cancel"?"CANCELLED":"PENDING")};
  });
 }
 for(const change of ["role","issuer","membership","organization"]){
  await check(change+" revocation cannot overtake the final credential commit",async()=>{
   const f=await fixture("lock-"+change);let blocked=false;
   const afterClaim=async()=>{
    await assert.rejects(real.$transaction(async tx=>{
     await tx.$executeRaw`SET LOCAL lock_timeout = '150ms'`;
     if(change==="role")await tx.$executeRaw`UPDATE roles SET permissions = ARRAY['dashboard.read','users.read'] WHERE id = ${f.roleId} AND "organizationId" = ${f.organizationId}`;
     if(change==="issuer")await tx.$executeRaw`UPDATE users SET "isActive" = false WHERE id = ${f.issuerId} AND "organizationId" = ${f.organizationId}`;
     if(change==="membership")await tx.$executeRaw`DELETE FROM "_UserRoles" WHERE "A" = ${f.issuerRoleId} AND "B" = ${f.issuerId}`;
     if(change==="organization")await tx.$executeRaw`UPDATE organizations SET "isActive" = false WHERE id = ${f.organizationId}`;
    }),error=>{blocked=error.code==="P2010"&&error.meta?.code==="55P03";return blocked;});
   };
   assert.equal((await redeem(f,{afterClaim})).status,200);assert.equal(blocked,true);return{writerBlockedUntilCommit:true,...await assertCreated(f)};
  });
 }
 for(const kind of ["legacy","corrupt","foreign-event","permission-snapshot","duplicate-event"]){
  await check(kind+" cannot supply invitation approval or expose public account metadata",async()=>{
   const f=await fixture(kind,{legacy:kind==="legacy"});
   if(kind!=="legacy"){
    const event=await real.businessEvent.findUnique({where:{id:f.issueId}});
    if(kind==="corrupt")await real.businessEvent.update({where:{id:f.issueId},data:{payloadHash:"invalid"}});
    if(kind==="foreign-event"){const foreign=await fixture("foreign-holder");await real.businessEvent.update({where:{id:f.issueId},data:{organizationId:foreign.organizationId}});}
    if(kind==="permission-snapshot"){const payload={...event.payload,actorPermissions:["dashboard.read"]};await real.businessEvent.update({where:{id:f.issueId},data:{payload,payloadHash:hashBusinessPayload(payload)}});}
    if(kind==="duplicate-event")await real.businessEvent.create({data:{organizationId:f.organizationId,eventType:event.eventType,eventSource:event.eventSource,idempotencyKey:"synthetic-duplicate/"+crypto.randomUUID(),schemaVersion:1,status:"APPLIED",sourceId:f.inviteId,actorId:f.issuerId,payload:event.payload,payloadHash:event.payloadHash,occurredAt:new Date()}});
   }
   for(const locale of ["en","fr"]){const preview=await getInviteRegistrationContext(f.token,locale);assert.equal(preview.isValidInvite,false);assert.equal(preview.email,"");assert.equal(preview.roleName,"");}
   const result=await redeem(f);assert.equal(result.code,"INVITATION_REISSUE_REQUIRED");return assertNoUser(f,"PENDING");
  });
 }
 await check("current recorded approval previews in EN/FR and redeems once",async()=>{const f=await fixture("preview");const en=await getInviteRegistrationContext(f.token,"en"),fr=await getInviteRegistrationContext(f.token,"fr");assert.equal(en.isValidInvite,true);assert.equal(fr.isValidInvite,true);assert.equal(en.roleName,"Synthetic reader");assert.equal(fr.roleName,"Lecteur synthétique");await assertNoUser(f,"PENDING");assert.equal((await redeem(f)).status,200);return assertCreated(f);});
 await check("expired invitation remains unavailable before account creation",async()=>{const f=await fixture("expired");await real.invite.update({where:{id:f.inviteId},data:{expiresAt:new Date(Date.now()-60000)}});assert.equal((await redeem(f)).status,410);assert.equal((await getInviteRegistrationContext(f.token)).isValidInvite,false);return assertNoUser(f,"EXPIRED");});
 receipt.originalAuthorityAfter=await authority();assert.equal(receipt.originalAuthorityAfter,receipt.originalAuthorityBefore);receipt.originalAuthorityUnchanged=true;
}
main().catch(error=>{let message=String(error.message);for(const secret of secrets)message=message.split(secret).join("[redacted]");receipt.error=message.split("Failing row contains")[0].slice(0,1500);process.exitCode=1;}).finally(async()=>{receipt.completedAt=new Date().toISOString();receipt.sourcesAfter=sources();receipt.sourceStable=sha(receipt.sourcesBefore)===sha(receipt.sourcesAfter);receipt.network={actualFetchRequests:0,blockedOrigins:[...new Set(blocked)]};receipt.passed=receipt.checks.length;receipt.failed=receipt.error?1:0;receipt.driverSha256=sha(fs.readFileSync(__filename));await real.$disconnect();const output="invitation-provenance-"+run+".json";fs.writeFileSync(path.join(__dirname,output),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify({output,passed:receipt.passed,failed:receipt.failed,sourceStable:receipt.sourceStable,originalAuthorityUnchanged:receipt.originalAuthorityUnchanged}));});
