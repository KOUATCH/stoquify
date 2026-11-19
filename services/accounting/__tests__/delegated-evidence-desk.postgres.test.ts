jest.mock("server-only",()=>({}))
jest.mock("@/prisma/db",()=>{
 const path=require("node:path"),{PrismaClient}=require("@prisma/client")
 const target=process.env.AF06_POSTGRES_URL,cluster=process.env.AF06_CLUSTER_DIR
 if(process.env.NODE_ENV==="production"||!target||!cluster||!path.isAbsolute(cluster))throw Error("Explicit disposable AF06 target and owned cluster directory required")
 const u=new URL(target)
 if(u.hostname!=="127.0.0.1"||!u.port||!/^\/stoquify_local_af06_[a-z0-9_]+$/.test(u.pathname))throw Error("Explicit loopback AF06 database required")
 return {db:new PrismaClient({datasources:{db:{url:target}},transactionOptions:{maxWait:10000,timeout:15000}})}
})
import {db} from "@/prisma/db"
import {executeFirmEngagementCommand} from "../firm-engagement.service"
import {getDelegatedEvidenceDesk} from "../delegated-evidence-desk.service"
import {getAccountantWorkDesk,getAccountantWorkDetail} from "../accountant-work-desk.service"
import {requestMissingCloseEvidence,respondToMissingCloseEvidence,replaceMissingCloseEvidenceRecipient,acceptMissingCloseEvidenceResponse} from "../close-assurance.service"
import {getCloseEvidenceWorkflow} from "../close-evidence-workflow.service"
import {buildCloseEvidenceCollectionReceipt} from "../close-evidence-collection"
import {getPaymentCloseEvidence} from "@/services/reconciliation/payment-close-evidence.service"
import {createCloseControlScope} from "../close-control-scope"
import {readCloseEvidenceRecipient} from "../close-evidence-recipient.service"
import {resolveAccountantClientAccess} from "../accountant-access.service"
const client="af06-client",firm="af06-firm",roles=["manager","preparer","reviewer","owner","recipient"] as const
const permissions=["accounting.audit.read","accounting.close.read","accounting.close.accountant.invite","accounting.close.accountant.review","accounting.close.evidence.request","accounting.close.finding.comment","accounting.close.finding.assign"]
const start=new Date("2020-01-01"),end=new Date("2099-01-01"),prefix=`af06-sql-${Date.now()}`
const actors:Record<string,any>={}
let engagementId:string,assignmentId:string,assignmentVersion:number
const command=(value:Record<string,unknown>)=>executeFirmEngagementCommand(actors.manager,{...value,idempotencyKey:prefix+"-"+Math.random()})
beforeAll(async()=>{
 const fs=require("node:fs")
 const actual=await db.$queryRawUnsafe<Array<{data_directory:string}>>("SHOW data_directory")
 if(fs.realpathSync(actual[0].data_directory).toLowerCase()!==fs.realpathSync(process.env.AF06_CLUSTER_DIR!).toLowerCase())throw Error("Wrong owned AF06 cluster")
 for(const role of roles){
  const userId="af06-"+role,home=["owner","recipient"].includes(role)?client:firm
  const s=await db.session.create({data:{userId,token:prefix+"-"+role,expiresAt:end,assuranceVerifiedAt:new Date(),assuranceMethod:"password",assuranceOrganizationId:home,assuranceLevel:1}})
  actors[role]={homeOrganizationId:home,actorId:userId,actorPermissions:permissions,session:{id:s.id,token:s.token}}
  if(["preparer","reviewer"].includes(role))await db.accountantAccessGrant.upsert({where:{id:userId+"-grant"},update:{revokedAt:null,revokedById:null},create:{id:userId+"-grant",organizationId:client,accountantUserId:userId,accountantFirmName:"Synthetic",role:"REVIEWER",activeScopeKey:client+":"+userId,consentGrantedById:"af06-owner",consentEvidenceHash:"sha256:"+"a".repeat(64),effectiveFrom:start,expiresAt:end}})
 }
 const previous=await db.firmEngagement.findFirst({where:{firmOrganizationId:firm,clientOrganizationId:client,status:"ACTIVE"}})
 if(previous){
  engagementId=previous.id
  let assignment=await db.firmEngagementAssignment.findFirstOrThrow({where:{engagementId,accountantUserId:"af06-preparer"},orderBy:{version:"desc"}})
  if(assignment.endedAt){
   await command({command:"ASSIGN",engagementId,expectedVersion:previous.version,accountantUserId:"af06-preparer",expectedAssignmentVersion:assignment.version,scope:"REVIEWER",effectiveFrom:new Date(),expiresAt:end})
   assignment=await db.firmEngagementAssignment.findFirstOrThrow({where:{engagementId,accountantUserId:"af06-preparer",endedAt:null}})
  }
  assignmentId=assignment.id;assignmentVersion=assignment.version
  return
 }
 const e=await command({command:"CREATE",clientOrganizationId:client,ownerUserId:"af06-manager",scope:"REVIEWER",effectiveFrom:start,expiresAt:end});engagementId=e.engagementId
 for(const role of ["manager","preparer","reviewer"]){
  const a=await command({command:"ASSIGN",engagementId,expectedVersion:0,accountantUserId:"af06-"+role,expectedAssignmentVersion:0,scope:"REVIEWER",effectiveFrom:start,expiresAt:end})
  if(role==="preparer"){assignmentId=a.assignmentId!;assignmentVersion=1}
  await command({command:"ENROLL",engagementId,expectedVersion:0,grantId:"af06-"+role+"-grant"})
 }
 await command({command:"TRANSITION",engagementId,expectedVersion:0,status:"ACTIVE",reason:"Synthetic AF06 activation"})
})
afterAll(async()=>{await db.$disconnect()})
async function fixture(name:string,rows=1){
 const id=prefix+"-"+name
 const year=await db.fiscalYear.create({data:{organizationId:client,name:id,startDate:new Date("2026-01-01"),endDate:new Date("2026-12-31")}})
 const period=await db.accountingPeriod.create({data:{id:id+"-period",organizationId:client,fiscalYearId:year.id,name:name==="browser"?"AF06 browser October":name,periodNumber:10,startDate:new Date("2026-10-01"),endDate:new Date("2026-10-31")}})
 const oldTime=new Date(Date.now()-120000),newTime=new Date(Date.now()-60000)
 const old=await db.closeRun.create({data:{organizationId:client,periodId:period.id,status:"BLOCKED",createdAt:oldTime,completedAt:oldTime}})
 const check=await db.closeChecklistItem.create({data:{organizationId:client,periodId:period.id,closeRunId:old.id,key:"payment-reconciliation",domain:"PAYMENT_RECONCILIATION",
   sourceService:"services/reconciliation/payment-close-evidence.service.ts",status:"UNAVAILABLE",severity:"HIGH",label:"Settlement proof",detail:"Synthetic unavailable collection",evidenceCount:0,blockerReason:"Missing source",createdAt:oldTime}})
 for(let n=0;n<rows;n++)await db.closeAssuranceFinding.create({data:{id:id+"-finding-"+n,organizationId:client,periodId:period.id,closeRunId:old.id,checklistItemId:check.id,
  domain:"PAYMENT_RECONCILIATION",severity:"HIGH",title:name==="browser"?"AF06 browser settlement proof":`Settlement proof ${n}`,detail:"Synthetic missing settlement proof",sourceService:check.sourceService,createdAt:oldTime}})
 // Real read-only typed collector; this test publishes its returned snapshot as a fixture.
 // No operational reconciliation/signature or full assessment execution is simulated.
 const collection=await getPaymentCloseEvidence(createCloseControlScope(client,period,newTime))
 const latest=await db.closeRun.create({data:{organizationId:client,periodId:period.id,status:"BLOCKED",createdAt:newTime,completedAt:newTime}})
 const replacement=await db.closeChecklistItem.create({data:{organizationId:client,periodId:period.id,closeRunId:latest.id,key:check.key,domain:check.domain,sourceService:check.sourceService,status:"FAILED",
  severity:"HIGH",label:"Settlement proof",detail:JSON.stringify(collection.summary),evidenceCount:0,blockerReason:"Reconciliation remains unsigned",createdAt:newTime}})
 await db.closeChecklistItem.update({where:{id:replacement.id},data:{metadata:{collectionReceipt:buildCloseEvidenceCollectionReceipt(replacement,[],true)}}})
 return {period,findingId:id+"-finding-0",replacement,latest}
}
const requestInput=(f:Awaited<ReturnType<typeof fixture>>,key:string)=>({clientOrganizationId:client,findingId:f.findingId,requestedFromId:"af06-owner",requestText:"Please explain the missing settlement proof and reference its source",dueAt:new Date(Date.now()+86400000),correlationId:key})
const control=(role:string)=>({actorId:actors[role].actorId,actorPermissions:permissions,session:actors[role].session})
const acceptControl=(role="reviewer")=>({...control(role),requireWorkDeskAccess:true,freshAuth:{actorId:actors[role].actorId,organizationId:actors[role].homeOrganizationId,lastAuthAt:new Date()}})
async function loop(f:Awaited<ReturnType<typeof fixture>>,suffix:string){
 const input=requestInput(f,prefix+suffix)
 const request=await requestMissingCloseEvidence(firm,input,control("preparer"))
 const response=await respondToMissingCloseEvidence(client,{requestId:request.id,responseText:"The current collector has the source; reconciliation still needs independent sign-off",correlationId:prefix+suffix+"response"},control("owner"))
 const detail=await getAccountantWorkDetail(actors.reviewer,client,request.id)
 if(detail.replacement.status!=="AVAILABLE")throw Error("Fixture replacement unavailable: "+detail.replacement.reason)
 return {request,response,input,detail,accept:{clientOrganizationId:client,requestId:request.id,responseId:response.id,resolutionNotes:"Checked current collection; unsigned reconciliation remains a failed control",replacement:detail.replacement.selection,correlationId:prefix+suffix+"accept"}}
}
it("completes a real delegated request/client-response/independent acceptance loop without certifying reconciliation",async()=>{
 const f=await fixture("loop"), flow=await loop(f,"loop")
 expect(flow.detail.replacement).toMatchObject({status:"AVAILABLE",controlStatus:"FAILED",checklistKey:"payment-reconciliation"})
 expect((await getCloseEvidenceWorkflow({organizationId:client,actorId:"af06-owner"},f.period.id)).tracking).toEqual([])
 const accepted=await acceptMissingCloseEvidenceResponse(firm,flow.accept,acceptControl())
 expect(accepted.decision).toBe("ACCEPTED")
 expect(await acceptMissingCloseEvidenceResponse(firm,flow.accept,acceptControl())).toEqual(accepted)
 await expect(acceptMissingCloseEvidenceResponse(firm,{...flow.accept,resolutionNotes:"Changed acceptance notes should conflict"},acceptControl())).rejects.toThrow()
 expect((await db.closeChecklistItem.findUniqueOrThrow({where:{id:f.replacement.id}})).status).toBe("FAILED")
 expect((await getDelegatedEvidenceDesk(actors.preparer,{clientOrganizationId:client,periodId:f.period.id})).tracking[0].state).toBe("ACCEPTED")
})
it("keeps exact request/response replays, rejects changed submissions and preserves client recipient history",async()=>{
 const f=await fixture("recipient"), input=requestInput(f,prefix+"recipient")
 const request=await requestMissingCloseEvidence(firm,input,control("preparer"))
 expect(await requestMissingCloseEvidence(firm,input,control("preparer"))).toEqual(request)
 await expect(requestMissingCloseEvidence(firm,{...input,requestText:"Changed original request"},control("preparer"))).rejects.toThrow()
 const stored=await db.accountantComment.findUniqueOrThrow({where:{id:request.id}})
 const before=await readCloseEvidenceRecipient(db as any,stored)
 const change={requestId:request.id,expectedRevision:before.revision,requestedFromId:"af06-recipient",reason:"Synthetic response owner replacement",correlationId:prefix+"replace"}
 await replaceMissingCloseEvidenceRecipient(client,change,control("owner"))
 await expect(respondToMissingCloseEvidence(client,{requestId:request.id,responseText:"Old recipient response",correlationId:prefix+"wrong"},control("owner"))).rejects.toThrow()
 const responseInput={requestId:request.id,responseText:"New client recipient response",correlationId:prefix+"right"}
 const response=await respondToMissingCloseEvidence(client,responseInput,control("recipient"))
 expect(await respondToMissingCloseEvidence(client,responseInput,control("recipient"))).toEqual(response)
 await expect(respondToMissingCloseEvidence(client,{...responseInput,responseText:"Changed response"},control("recipient"))).rejects.toThrow()
 const tracking=(await getDelegatedEvidenceDesk(actors.preparer,{clientOrganizationId:client,periodId:f.period.id})).tracking[0]
 expect(tracking).toMatchObject({state:"AWAITING_REVIEW",assignment:{recipientId:"af06-recipient",reason:change.reason}})
 expect((await db.accountantComment.findUniqueOrThrow({where:{id:request.id}})).body).toBe(stored.body)
})
it("rejects stale proof and respondent self-acceptance",async()=>{
 const f=await fixture("stale"),flow=await loop(f,"stale")
 await expect(acceptMissingCloseEvidenceResponse(client,{...flow.accept,clientOrganizationId:undefined},acceptControl("owner"))).rejects.toThrow()
 await db.closeChecklistItem.update({where:{id:f.replacement.id},data:{detail:"Changed collection after preview"}})
 await expect(acceptMissingCloseEvidenceResponse(firm,flow.accept,acceptControl())).rejects.toMatchObject({code:"CONFLICT"})
 expect((await db.closeAssuranceFinding.findUniqueOrThrow({where:{id:f.findingId}})).status).toBe("IN_REVIEW")
})
it("removes list/detail access and pending acceptance after session expiry or mandate revocation",async()=>{
 const f=await fixture("denial"),flow=await loop(f,"denial"),s=actors.reviewer.session
 await db.session.update({where:{id:s.id},data:{expiresAt:new Date("2021-01-01")}})
 await expect(getAccountantWorkDesk(actors.reviewer)).rejects.toThrow()
 await expect(getAccountantWorkDetail(actors.reviewer,client,flow.request.id)).rejects.toThrow()
 await expect(acceptMissingCloseEvidenceResponse(firm,flow.accept,acceptControl())).rejects.toThrow()
 await db.session.update({where:{id:s.id},data:{expiresAt:end}})
 await db.accountantAccessGrant.update({where:{id:"af06-reviewer-grant"},data:{revokedAt:new Date(),revokedById:"af06-owner"}})
 expect((await getAccountantWorkDesk(actors.reviewer)).items).toEqual([])
 await expect(getAccountantWorkDetail(actors.reviewer,client,flow.request.id)).rejects.toThrow()
 await expect(acceptMissingCloseEvidenceResponse(firm,flow.accept,acceptControl())).rejects.toThrow()
 await db.accountantAccessGrant.update({where:{id:"af06-reviewer-grant"},data:{revokedAt:null,revokedById:null}})
})
it("keeps the 101st historical case discoverable and delivery failure separate from work status",async()=>{
 const f=await fixture("paging",101)
 const first=await getDelegatedEvidenceDesk(actors.preparer,{clientOrganizationId:client,periodId:f.period.id})
 expect(first.findings).toHaveLength(100)
 const next=await getDelegatedEvidenceDesk(actors.preparer,{clientOrganizationId:client,periodId:f.period.id,page:{kind:"findings",cursor:first.cursors.findings!}})
 expect(next.findings).toHaveLength(1)
 const request=await requestMissingCloseEvidence(firm,requestInput(f,prefix+"paging"),control("preparer"))
 await db.businessEventOutbox.updateMany({where:{organizationId:client,channel:"NOTIFICATION",idempotencyKey:{contains:prefix+"paging"}},data:{status:"FAILED"}})
 expect((await getAccountantWorkDesk(actors.reviewer)).items.find(r=>r.requestId===request.id)).toMatchObject({delivery:"FAILED",evidenceState:"AWAITING_RESPONSE"})
})
it("ending a firm assignment removes obsolete access while another authorized reviewer retains the work",async()=>{
 const flow=await loop(await fixture("assignment-denial"),"assignment-denial")
 const before=(await getAccountantWorkDesk(actors.reviewer)).items.map(i=>i.requestId)
 await command({command:"REMOVE_ASSIGNMENT",engagementId,expectedVersion:1,assignmentId,expectedAssignmentVersion:assignmentVersion,reason:"Synthetic AF06 assignment removal"})
 expect((await getAccountantWorkDesk(actors.preparer)).items).toEqual([])
 await expect(getDelegatedEvidenceDesk(actors.preparer,{clientOrganizationId:client})).rejects.toThrow()
 await expect(getAccountantWorkDetail(actors.preparer,client,flow.request.id)).rejects.toThrow()
 await expect(acceptMissingCloseEvidenceResponse(firm,flow.accept,acceptControl("preparer"))).rejects.toThrow()
 expect((await getAccountantWorkDesk(actors.reviewer)).items.map(i=>i.requestId)).toEqual(before)
 // Restore by a new AF04 assignment revision for the later browser fixture.
 await command({command:"ASSIGN",engagementId,expectedVersion:1,accountantUserId:"af06-preparer",expectedAssignmentVersion:assignmentVersion,scope:"REVIEWER",effectiveFrom:new Date(),expiresAt:end})
})
it("does not infer financial permissions from a managed reviewer mandate and prepares the browser source fixture",async()=>{
 for(const permission of ["accounting.journal.post","payments.reconciliation.sign","purchasing.ap.payment.release","payroll.payments.release","accounting.close.certify"]){
  await expect(resolveAccountantClientAccess({homeOrganizationId:firm,clientOrganizationId:client,accountantUserId:"af06-preparer",capability:"REVIEW",permission})).rejects.toMatchObject({code:"FORBIDDEN"})
 }
 const browser=await fixture("browser")
 const fs=require("node:fs")
 if(process.env.AF06_EVIDENCE_DIR){
  const path=require("node:path"),output=process.env.AF06_EVIDENCE_DIR
  if(!path.isAbsolute(output))throw Error("Absolute AF06 evidence directory required")
  fs.writeFileSync(path.join(output,"browser-fixture.json"),JSON.stringify({periodId:browser.period.id,findingId:browser.findingId,replacementId:browser.replacement.id,engagementId,synthetic:true},null,2),{flag:"wx"})
 }
})
