import "server-only"
import {Prisma} from "@prisma/client"
import {z} from "zod"
import {db} from "@/prisma/db"
import {hasAnyRbacPermission} from "@/lib/security/rbac-permissions"
import {ConflictError,ForbiddenError,NotFoundError,BusinessRuleError} from "@/services/_shared/action-errors"
import {hashBusinessPayload} from "@/services/events/business-event.service"
import {assertSetupAccount,assertSetupReviewInTx} from "./setup-reviewer.service"
import {resolveHrisPeopleAccessScope} from "./org.service"
import {lockHrisReviewEmployeeInTx} from "./review-lock.service"
import {attendanceMetadata} from "./attendance-correction"
import {approveTimeFoundation,decideOperationalTimeRequest} from "./operational-time.service"
import {approveHrisWorkSchedule} from "./schedule-revision.service"
import type {HrisApprovalReview,HrisDecisionReceipt} from "./approval-review.service"

const target=z.object({organizationId:z.string().min(1),actorId:z.string().min(1),actorPermissions:z.array(z.string()),domain:z.enum(["TIME_POLICY","WORK_SCHEDULE","TIME_REQUEST"]),decision:z.enum(["APPROVE","REJECT"]),sourceId:z.string().min(1),employeeId:z.string().optional(),leavePolicyId:z.string().optional()})
const submission=target.extend({reviewVersion:z.string().length(64),acknowledged:z.literal(true),decisionReason:z.string().trim().min(8).max(500),evidenceReferences:z.array(z.literal("REQUEST")).length(1)})
type Target=z.infer<typeof target>;type Client=typeof db|Prisma.TransactionClient
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue
const transaction=<T>(c:Client,fn:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>=>"$transaction" in c?c.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted}):fn(c)
export type TimeApprovalReview=Omit<HrisApprovalReview,"domain"|"scope">&{domain:Target["domain"];scope:{organizationId:string;employeeId:string;authority:string}}
export type TimeDecisionReceipt=Omit<HrisDecisionReceipt,"domain">&{domain:Target["domain"]}
async function authorize(tx:Prisma.TransactionClient,input:Target){
 if(input.domain==="TIME_POLICY")await tx.$queryRaw`SELECT id FROM organizations WHERE id=${input.organizationId} FOR UPDATE`
 await assertSetupAccount(tx,input.organizationId,input.actorId)
 const roles=await tx.$queryRaw<Array<{permissions:string[]}>>`SELECT r.permissions FROM roles r JOIN "_UserRoles" m ON m."A"=r.id WHERE m."B"=${input.actorId} AND r."organizationId"=${input.organizationId} FOR SHARE OF r,m`
 const live=roles.flatMap(r=>r.permissions),permissions=input.actorPermissions.filter(p=>live.includes(p));const actor={...input,actorPermissions:permissions}
 if(input.domain!=="TIME_POLICY"){if(!input.employeeId)throw new BusinessRuleError("Employee selection is required.");await lockHrisReviewEmployeeInTx(tx,input.organizationId,input.employeeId)}
 if(!hasAnyRbacPermission(permissions,["hris.people.manage"]))await assertSetupReviewInTx(tx,actor,input.domain,input.domain==="TIME_POLICY"?undefined:input.employeeId)
 else if(input.employeeId)await resolveHrisPeopleAccessScope({...actor,employeeId:input.employeeId,limit:1,asOf:new Date(),delegationAuthority:"APPROVAL_DECISION"},tx)
 return actor
}
async function project(tx:Prisma.TransactionClient,input:Target):Promise<TimeApprovalReview>{
 const fields:HrisApprovalReview["fields"]=[];let source:unknown,requestedById:string|null=null,requestedAt:Date,effectiveAt:Date,requestId=input.sourceId
 const add=(key:string,en:string,fr:string,after:unknown,before:unknown="—")=>fields.push({key,label:{en,fr},before:String(before??"—"),after:typeof after==="object"?JSON.stringify(after):String(after??"—")})
 if(input.domain==="TIME_POLICY"){
   if(input.decision!=="APPROVE"||!input.leavePolicyId)throw new BusinessRuleError("Select both draft policy records.")
   await tx.$queryRaw`SELECT id FROM hris_work_calendars WHERE id=${input.sourceId} AND "organizationId"=${input.organizationId} FOR UPDATE`
   await tx.$queryRaw`SELECT id FROM hris_leave_policies WHERE id=${input.leavePolicyId} AND "organizationId"=${input.organizationId} FOR UPDATE`
   const c=await tx.hrisWorkCalendar.findFirst({where:{id:input.sourceId,organizationId:input.organizationId,status:"DRAFT"},include:{holidays:{orderBy:{id:"asc"}}}}),p=await tx.hrisLeavePolicy.findFirst({where:{id:input.leavePolicyId,organizationId:input.organizationId,status:"DRAFT"}})
   if(!c||!p)throw new NotFoundError("Draft policy is unavailable.")
   const maker=attendanceMetadata(c.metadata).preparedById;if(maker===input.actorId||p.preparedById===input.actorId)throw new ForbiddenError("Independent policy review is required.")
   requestedById=p.preparedById;requestedAt=p.createdAt;effectiveAt=p.effectiveFrom;source={calendar:c,policy:p}
   add("calendar","Calendar / timezone","Calendrier / fuseau",c.name+" · "+c.timezone);add("country","Country","Pays",c.countryCode);add("until","Effective until","Applicable jusqu’au",p.effectiveTo);add("holidays","Excluded holidays","Jours fériés exclus",c.holidays.map(h=>({name:h.name,date:h.holidayDate,paid:h.paid})));add("policy","Leave policy","Politique de congés",p.name);add("annual","Annual entitlement (minutes)","Droit annuel (minutes)",p.annualEntitlementMinutes);add("carry","Carryover limit (minutes)","Plafond de report (minutes)",p.carryOverLimitMinutes);add("rules","Configured accrual and eligibility rules","Règles configurées d’acquisition et d’éligibilité",p.accrualRule)
 }else if(input.domain==="WORK_SCHEDULE"){
   if(input.decision!=="APPROVE")throw new BusinessRuleError("Schedule review supports approval.")
   const s=await tx.hrisWorkSchedule.findFirst({where:{id:input.sourceId,employeeId:input.employeeId,organizationId:input.organizationId,status:"DRAFT"},include:{calendar:true}});if(!s)throw new NotFoundError("Draft schedule is unavailable.")
   const prior=s.supersedesScheduleId?await tx.hrisWorkSchedule.findFirst({where:{id:s.supersedesScheduleId,organizationId:input.organizationId,employeeId:input.employeeId}}):null
   requestedById=s.preparedById;requestedAt=s.createdAt;effectiveAt=s.effectiveFrom;source={schedule:s,prior}
   add("name","Schedule name","Nom de l’horaire",s.name,prior?.name);add("timezone","Timezone","Fuseau horaire",s.timezone,prior?.timezone);add("weekly","Daily minutes (0 = Sunday)","Minutes quotidiennes (0 = dimanche)",s.weeklyPattern,prior?JSON.stringify(prior.weeklyPattern):"—");add("plan","Dated shifts and unpaid breaks","Postes datés et pauses non rémunérées",s.shiftPlan,prior?JSON.stringify(prior.shiftPlan):"—");add("until","Effective until","Applicable jusqu’au",s.effectiveTo);add("revision","Revision","Révision",s.revision,prior?.revision);add("calendar","Reviewed calendar","Calendrier vérifié",s.calendar.name)
 }else{
   const r=await tx.hrisTimeRequest.findFirst({where:{id:input.sourceId,employeeId:input.employeeId,organizationId:input.organizationId,status:"REQUESTED"},include:{leavePolicy:true}});if(!r)throw new NotFoundError("Pending request is unavailable.")
   requestedById=r.requestedById;requestedAt=r.requestedAt;effectiveAt=r.periodStart;source=r
   add("type","Request type","Type de demande",r.type);add("end","Through","Jusqu’au",r.periodEnd);add("minutes","Requested minutes","Minutes demandées",r.requestedMinutes);add("reason","Request reason","Motif de la demande",r.reason);add("policy","Leave policy","Politique de congés",r.leavePolicy?.name);const meta=attendanceMetadata(r.metadata);if(meta.correction)add("correction","Correction before and after","Correction avant et après",meta.correction);if(meta.allocations)add("allocations","Work-date allocation","Répartition par date de travail",meta.allocations)
 }
 if(requestedById===input.actorId)throw new ForbiddenError("The preparer cannot decide their own request.")
 const employee=input.employeeId?await tx.payrollEmployee.findFirst({where:{id:input.employeeId,organizationId:input.organizationId,deletedAt:null},select:{id:true,displayName:true}}):{id:"organization",displayName:"Time policy / Politique de temps"};if(!employee)throw new NotFoundError("Employee unavailable.")
 const user=requestedById?await tx.user.findFirst({where:{id:requestedById,organizationId:input.organizationId},select:{name:true}}):null
 const scope={organizationId:input.organizationId,employeeId:employee.id,authority:hasAnyRbacPermission(input.actorPermissions,["hris.people.manage"])?"TENANT_HRIS_ADMIN":"EXPLICIT_DOMAIN_REVIEW_GRANT"}
 return {version:hashBusinessPayload(json({version:1,source,scope,actorId:input.actorId,decision:input.decision})),domain:input.domain,decision:input.decision,stage:"REVIEW",sourceId:input.sourceId,requestId,employee,requester:{id:requestedById??"",name:user?.name??requestedById??"—"},requestedAt:requestedAt.toISOString(),effectiveAt:effectiveAt.toISOString(),fields,evidence:[{id:"REQUEST",label:{en:"Retained source request and policy evidence",fr:"Preuves conservées de la demande et de la politique"}}],scope,reviewHref:"/dashboard/people/setup"}
}
export async function getTimeApprovalReview(raw:z.input<typeof target>,client:Client=db){const input=target.parse(raw);return transaction(client,async tx=>project(tx,await authorize(tx,input)))}
export async function decideReviewedTimeApproval(raw:z.input<typeof submission>,client:Client=db):Promise<TimeDecisionReceipt>{
 const input=submission.parse(raw)
 return transaction(client,async tx=>{
   const actor=await authorize(tx,input),id="hris-time-reviewed:"+hashBusinessPayload({...input,actorPermissions:undefined,decisionReason:undefined,evidenceReferences:undefined}),envelopeHash=hashBusinessPayload({...input,actorPermissions:undefined})
   const saved=await tx.auditLog.findFirst({where:{organizationId:input.organizationId,userId:input.actorId,entityType:"HrisReviewedDecision",entityId:id,action:"HRIS_REVIEW_DECISION_RECORDED"}})
   if(saved){const data=attendanceMetadata(saved.changes);if(data.envelopeHash!==envelopeHash)throw new ConflictError("HRIS_REVIEW_REPLAY_CONFLICT");return {...attendanceMetadata(data.receipt),replayed:true} as TimeDecisionReceipt}
   const review=await project(tx,actor);if(review.version!==input.reviewVersion)throw new ConflictError("HRIS_REVIEW_STALE: Reload the facts and acknowledge them again.")
   const proof="sha256:"+hashBusinessPayload({version:"HRIS_TIME_REVIEW_V1",envelopeHash,reviewedVersion:review.version})
   if(input.domain==="TIME_POLICY")await approveTimeFoundation({...actor,calendarId:input.sourceId,leavePolicyId:input.leavePolicyId!,approvalEvidenceHash:proof},tx)
   else if(input.domain==="WORK_SCHEDULE")await approveHrisWorkSchedule({...actor,employeeId:input.employeeId!,scheduleId:input.sourceId,approvalEvidenceHash:proof},tx)
   else await decideOperationalTimeRequest({...actor,employeeId:input.employeeId!,requestId:input.sourceId,decision:input.decision,decisionReason:input.decisionReason,approvalEvidenceHash:proof},tx)
   const user=await tx.user.findFirst({where:{id:input.actorId,organizationId:input.organizationId},select:{name:true}})
   const receipt:TimeDecisionReceipt={id,version:1,domain:input.domain,decision:input.decision,requestId:review.requestId,sourceId:input.sourceId,employee:review.employee,actor:{id:input.actorId,name:user?.name??input.actorId},scope:review.scope,decidedAt:new Date().toISOString(),reviewedVersion:review.version,status:input.decision==="APPROVE"?"APPROVED":"REJECTED",scheduledFor:null,businessEventId:null,replayed:false}
   await tx.auditLog.create({data:{organizationId:input.organizationId,userId:input.actorId,entityType:"HrisReviewedDecision",entityId:id,action:"HRIS_REVIEW_DECISION_RECORDED",changes:json({envelopeHash,proof,receipt})}});return receipt
 })
}
