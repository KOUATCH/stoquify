import { randomUUID } from "node:crypto"
import path from "node:path"
import { Prisma, PrismaClient } from "@prisma/client"

jest.mock("server-only", () => ({}))
// A missing flag is an error, never a passing skipped certification.
if (process.env.RUN_COMMAND_CENTER_ASSIGNMENT_POSTGRES !== "1") throw new Error("Disposable runner is required")
const {assertDisposableDatabaseTarget}=require("../../../scripts/disposable-fixture-guard")
const database=process.env.COMMAND_CENTER_DISPOSABLE_DATABASE!
if (!/^stoquify_local_command_center_[a-f0-9]{10}$/.test(database ?? "")) throw new Error("Unexpected disposable database name")
assertDisposableDatabaseTarget(process.env.DATABASE_URL,[database])
const {db}=require("@/prisma/db") as {db: PrismaClient}
const {assignWorkflowAssuranceIncident}=require("../assurance-incident.service") as typeof import("../assurance-incident.service")
const {assuranceAssignmentRevision}=require("../assurance-assignment-revision") as typeof import("../assurance-assignment-revision")

let definitionVersion=0
const permissions=["controls.manage","controls.audit.read","payments.reconciliation.read","pos.transactions.read"]
async function fixture(pos=false){
  const id=randomUUID()
  const organization=await db.organization.create({data:{name:"Synthetic Command Center",slug:"cc-"+id,currency:"XAF"}})
  const role=await db.role.create({data:{organizationId:organization.id,code:"admin",nameEn:"Fixture admin",permissions}})
  const makeUser=(tag:string)=>db.user.create({data:{organizationId:organization.id,email:`cc-${tag}-${id}@example.invalid`,isVerified:true,roles:{connect:{id:role.id}}}})
  const actor=await makeUser("actor"),owner=await makeUser("owner"),other=await makeUser("other")
  const session=await db.session.create({data:{userId:actor.id,token:randomUUID(),expiresAt:new Date(Date.now()+3_600_000)}})
  let sourceId="aged_suspense_missing_owner",locationId:string|null=null
  if(pos){
    const location=await db.location.create({data:{organizationId:organization.id,name:"Synthetic branch",code:"A",managerId:owner.id}});locationId=location.id
    const terminal=await db.pOSStation.create({data:{organizationId:organization.id,locationId:location.id,terminalNumber:"A",name:"Synthetic terminal"}})
    const source=await db.pOSSession.create({data:{organizationId:organization.id,terminalId:terminal.id,locationId:location.id,userId:actor.id,sessionNumber:"A",status:"CLOSED"}});sourceId=source.id
  }
  const definition=await db.workflowAssuranceCheckDefinition.create({data:{checkKey:pos?"pos.closed_shift_cash_shortage.review":"payment_reconciliation.suspense_owner.required",version:++definitionVersion,workflow:pos?"POS":"PAYMENT_RECONCILIATION",moduleSlug:pos?"pos":"finance",invariantName:"Synthetic assignment control",executionMode:"SCHEDULED_SCAN",defaultSeverity:"HIGH",requiredPermission:pos?"pos.transactions.read":"payments.reconciliation.read",ownerRole:"finance",sourceTables:[],actionRoute:pos?"/dashboard/pos":"/dashboard/finance/reconciliation"}})
  const incident=await db.workflowAssuranceIncident.create({data:{organizationId:organization.id,definitionId:definition.id,checkKey:definition.checkKey,definitionVersion:definition.version,workflow:definition.workflow,moduleSlug:definition.moduleSlug,sourceType:pos?"POSSession":"suspense_items",sourceId,sourceHash:"fixture-source-revision",fingerprint:"fixture-"+id,title:"Synthetic incident",detail:"Synthetic evidence",severity:"HIGH",actionRoute:definition.actionRoute,dueAt:new Date("2026-12-01T00:00:00Z")}})
  const input={organizationId:organization.id,incidentId:incident.id,actorId:actor.id,ownerId:owner.id,session:{id:session.id,token:session.token},expectedRevision:assuranceAssignmentRevision(incident),requestId:randomUUID()}
  const events=()=>db.workflowAssuranceIncidentEvent.count({where:{organizationId:organization.id,incidentId:incident.id,eventType:"ASSIGNED"}})
  const audits=()=>db.auditLog.count({where:{organizationId:organization.id,entityId:incident.id,action:"WORKFLOW_ASSURANCE_INCIDENT_ASSIGNED"}})
  const scopeRole=async(userId:string)=>{const r=await db.role.upsert({where:{organizationId_code:{organizationId:organization.id,code:"branch_manager"}},create:{organizationId:organization.id,code:"branch_manager",nameEn:"Fixture branch manager",permissions},update:{}});await db.user.update({where:{id:userId},data:{roles:{set:[{id:r.id}]}}})}
  return {organization,role,actor,owner,other,session,definition,incident,input,locationId,events,audits,scopeRole}
}
async function row(id:string){return db.workflowAssuranceIncident.findUniqueOrThrow({where:{id}})}
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
async function waitForLock(fragment:string){
  const until=Date.now()+7000
  while(Date.now()<until){
    const rows=await db.$queryRaw<Array<{n:bigint}>>`SELECT count(*)::bigint AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE ${"%"+fragment+"%"}`
    if(Number(rows[0].n)>0)return
    await pause(20)
  }
  throw new Error("Expected competing PostgreSQL lock wait was not observed")
}

beforeAll(async()=>{
  const actual=await db.$queryRaw<Array<{name:string;directory:string;address:string}>>`SELECT current_database() AS name,current_setting('data_directory') AS directory,host(inet_server_addr()) AS address`
  expect(actual[0].name).toBe(database);expect(actual[0].address).toBe("127.0.0.1")
  expect(path.resolve(actual[0].directory).toLowerCase()).toBe(path.resolve(process.env.COMMAND_CENTER_DISPOSABLE_CLUSTER!).toLowerCase())
})
afterAll(async()=>{await db.$disconnect()})

it("persists assignment across a fresh client/session and replays without duplicate history",async()=>{
 const f=await fixture();await assignWorkflowAssuranceIncident(f.input)
 const fresh=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}})
 try{const saved=await fresh.workflowAssuranceIncident.findUniqueOrThrow({where:{id:f.incident.id}});expect(saved.ownerId).toBe(f.owner.id);expect(saved.status).toBe("ASSIGNED");expect(saved.dueAt).toEqual(f.incident.dueAt)}finally{await fresh.$disconnect()}
 const session=await db.session.create({data:{userId:f.actor.id,token:randomUUID(),expiresAt:new Date(Date.now()+60_000)}})
 await assignWorkflowAssuranceIncident({...f.input,session:{id:session.id,token:session.token}})
 expect(await f.events()).toBe(1);expect(await f.audits()).toBe(1)
 const event=await db.workflowAssuranceIncidentEvent.findFirstOrThrow({where:{incidentId:f.incident.id}})
 expect(event.metadata).toMatchObject({assignmentRequestId:f.input.requestId,assignmentScope:{kind:"TENANT"},before:{ownerId:null,status:"OPEN"},after:{ownerId:f.owner.id,status:"ASSIGNED"}})
})
it("rejects changed request intent without another write",async()=>{
 const f=await fixture();await assignWorkflowAssuranceIncident(f.input)
 await expect(assignWorkflowAssuranceIncident({...f.input,dueAt:null})).rejects.toThrow(/changed/)
 expect(await f.events()).toBe(1)
})
it("allows only one competing assignment at the same revision",async()=>{
 const f=await fixture();const result=await Promise.allSettled([assignWorkflowAssuranceIncident(f.input),assignWorkflowAssuranceIncident({...f.input,ownerId:f.other.id,requestId:randomUUID()})])
 expect(result.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(result.filter(r=>r.status==="rejected")).toHaveLength(1)
 expect(await f.events()).toBe(1);expect(await f.audits()).toBe(1)
})
it("converges simultaneous identical requests after recoverable conflict retry",async()=>{
 const f=await fixture();const result=await Promise.allSettled([assignWorkflowAssuranceIncident(f.input),assignWorkflowAssuranceIncident(f.input)])
 expect(result.some(r=>r.status==="fulfilled")).toBe(true)
 await assignWorkflowAssuranceIncident(f.input)
 expect(await f.events()).toBe(1);expect(await f.audits()).toBe(1)
})
it.each(["event","audit"])("rolls back assignment and all history when %s persistence fails",async phase=>{
 const f=await fixture();const table=phase==="event"?"workflow_assurance_incident_events":"audit_logs",column=phase==="event"?"incidentId":"entityId"
 // Controlled identifiers and fixture-generated cuid; executed only after private-cluster assertion.
 if(!/^[a-z0-9]+$/.test(f.incident.id))throw Error("Unexpected fixture ID")
 await db.$executeRawUnsafe(`CREATE FUNCTION cc_assignment_inject_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic assignment failure'; END $$`)
 await db.$executeRawUnsafe(`CREATE TRIGGER cc_assignment_failure BEFORE INSERT ON "${table}" FOR EACH ROW WHEN (NEW."${column}"='${f.incident.id}') EXECUTE FUNCTION cc_assignment_inject_failure()`)
 try{await expect(assignWorkflowAssuranceIncident(f.input)).rejects.toThrow();expect(await row(f.incident.id)).toMatchObject({status:"OPEN",ownerId:null});expect(await f.events()).toBe(0);expect(await f.audits()).toBe(0)}
 finally{await db.$executeRawUnsafe(`DROP TRIGGER cc_assignment_failure ON "${table}"`);await db.$executeRawUnsafe('DROP FUNCTION cc_assignment_inject_failure()')}
})
it("denies a different tenant's incident and assignee",async()=>{
 const a=await fixture(),b=await fixture()
 await expect(assignWorkflowAssuranceIncident({...a.input,incidentId:b.incident.id})).rejects.toThrow(/not found/)
 await expect(assignWorkflowAssuranceIncident({...a.input,ownerId:b.owner.id})).rejects.toThrow(/assignee/)
 expect(await a.events()).toBe(0);expect(await b.events()).toBe(0)
})
it.each(["account","membership","session"])("rechecks persisted %s revocation on replay",async kind=>{
 const f=await fixture();await assignWorkflowAssuranceIncident(f.input)
 if(kind==="account")await db.user.update({where:{id:f.owner.id},data:{isActive:false}})
 if(kind==="membership")await db.user.update({where:{id:f.actor.id},data:{roles:{set:[]}}})
 if(kind==="session")await db.session.delete({where:{id:f.session.id}})
 await expect(assignWorkflowAssuranceIncident(f.input)).rejects.toThrow();expect(await f.events()).toBe(1)
})
it("does not admit an assignment behind an in-flight account revocation",async()=>{
 const f=await fixture();let entered!:()=>void,release!:()=>void
 const ready=new Promise<void>(resolve=>entered=resolve),gate=new Promise<void>(resolve=>release=resolve)
 const revocation=db.$transaction(async tx=>{await tx.user.update({where:{id:f.owner.id},data:{isActive:false}});entered();await gate},{timeout:15000})
 await ready;const assignment=assignWorkflowAssuranceIncident(f.input).then(()=>"accepted",()=>"refused")
 try{await waitForLock('FROM "users"')}finally{release()}
 await revocation;expect(await assignment).toBe("refused");expect(await f.events()).toBe(0)
})
it("checks current module grants again on replay",async()=>{
 const f=await fixture();await assignWorkflowAssuranceIncident(f.input)
 await db.tenantModuleConfiguration.create({data:{organizationId:f.organization.id,manifestHash:"synthetic-empty-grants"}})
 await expect(assignWorkflowAssuranceIncident(f.input)).rejects.toThrow(/module access/);expect(await f.events()).toBe(1)
})
it("accepts the actual POS location manager and retains scope history",async()=>{
 const f=await fixture(true);await f.scopeRole(f.owner.id);await assignWorkflowAssuranceIncident(f.input)
 expect(await f.events()).toBe(1)
 const event=await db.workflowAssuranceIncidentEvent.findFirstOrThrow({where:{incidentId:f.incident.id}})
 expect(event.metadata).toMatchObject({assignmentScope:{kind:"LOCATION",fingerprint:expect.any(String)}})
})
it.each(["owner","actor","inactive","deleted","foreign","foreign-location","foreign-terminal","terminal","unknown-check"])("rejects wrong or unavailable POS location authority: %s",async kind=>{
 const f=await fixture(true);await f.scopeRole(f.owner.id)
 const foreign=kind.startsWith("foreign")?await db.organization.create({data:{name:"Synthetic other tenant",slug:"cc-other-"+randomUUID()}}):null
 if(kind==="owner")await db.location.update({where:{id:f.locationId!},data:{managerId:f.other.id}})
 if(kind==="actor")await f.scopeRole(f.actor.id)
 if(kind==="inactive")await db.location.update({where:{id:f.locationId!},data:{isActive:false}})
 if(kind==="deleted")await db.location.update({where:{id:f.locationId!},data:{deletedAt:new Date()}})
 if(kind==="foreign-location")await db.location.update({where:{id:f.locationId!},data:{organizationId:foreign!.id}})
 if(kind==="foreign-terminal"){const source=await db.pOSSession.findUniqueOrThrow({where:{id:f.incident.sourceId}});await db.pOSStation.update({where:{id:source.terminalId},data:{organizationId:foreign!.id}})}
 if(kind==="unknown-check"){await db.workflowAssuranceCheckDefinition.update({where:{id:f.definition.id},data:{checkKey:"synthetic.unsupported.pos"}});await db.workflowAssuranceIncident.update({where:{id:f.incident.id},data:{checkKey:"synthetic.unsupported.pos"}});f.input.expectedRevision=assuranceAssignmentRevision(await row(f.incident.id))}
 if(kind==="foreign")await db.pOSSession.update({where:{id:f.incident.sourceId},data:{organizationId:foreign!.id}})
 if(kind==="terminal"){
  const other=await db.location.create({data:{organizationId:f.organization.id,name:"Other branch",code:"B"}})
  const source=await db.pOSSession.findUniqueOrThrow({where:{id:f.incident.sourceId}});await db.pOSStation.update({where:{id:source.terminalId},data:{locationId:other.id}})
 }
 await expect(assignWorkflowAssuranceIncident(f.input)).rejects.toThrow(/location authority/);expect(await f.events()).toBe(0)
})
it("rechecks a manager replacement before replay",async()=>{
 const f=await fixture(true);await f.scopeRole(f.owner.id);await assignWorkflowAssuranceIncident(f.input)
 await db.location.update({where:{id:f.locationId!},data:{managerId:f.other.id}})
 await expect(assignWorkflowAssuranceIncident(f.input)).rejects.toThrow(/location authority/);expect(await f.events()).toBe(1)
})
it("rejects a concurrent manager replacement before assignment commits",async()=>{
 const f=await fixture(true);await f.scopeRole(f.owner.id);let entered!:()=>void,release!:()=>void
 const ready=new Promise<void>(resolve=>entered=resolve),gate=new Promise<void>(resolve=>release=resolve)
 const change=db.$transaction(async tx=>{await tx.location.update({where:{id:f.locationId!},data:{managerId:f.other.id}});entered();await gate},{timeout:15000})
 await ready;const assignment=assignWorkflowAssuranceIncident(f.input).then(()=>"accepted",()=>"refused")
 try{await waitForLock('FROM "locations"')}finally{release()}
 await change;expect(await assignment).toBe("refused");expect(await f.events()).toBe(0)
})
it("does not infer aggregate location authority from a branch role or caller metadata",async()=>{
 const f=await fixture();await f.scopeRole(f.owner.id)
 await db.workflowAssuranceIncident.update({where:{id:f.incident.id},data:{metadata:{locationId:"invented",assignmentScope:{kind:"TENANT"}}}})
 await expect(assignWorkflowAssuranceIncident({...f.input,expectedRevision:assuranceAssignmentRevision(await row(f.incident.id))})).rejects.toThrow(/location authority/)
 expect(await f.events()).toBe(0)
})

it("denies unsupported employee-bound source assignment even to administrators",async()=>{
 const f=await fixture();await db.workflowAssuranceIncident.update({where:{id:f.incident.id},data:{sourceType:"PayrollEmployee",sourceId:"unknown-employee"}})
 await expect(assignWorkflowAssuranceIncident({...f.input,expectedRevision:assuranceAssignmentRevision(await row(f.incident.id))})).rejects.toThrow(/location authority/)
 expect(await f.events()).toBe(0)
})
