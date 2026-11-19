import "server-only"
import {randomUUID} from "node:crypto"
import {Prisma} from "@prisma/client"
import {db} from "@/prisma/db"
import {BusinessRuleError,ConflictError,ForbiddenError,NotFoundError} from "@/services/_shared/action-errors"
import {hasAnyRbacPermission} from "@/lib/security/rbac-permissions"
import {upsertHrisEmployeeProfile} from "./employee.service"
import {resolveHrisPeopleAccessScope} from "./org.service"
import {lockHrisReviewEmployeeInTx} from "./review-lock.service"
import {assertSetupAccount} from "./setup-reviewer.service"
import {currentHrisActor,lockedOwnEmployee,selfServiceTransaction,type SelfServiceActor,type SelfServiceClient} from "./self-service-boundary.service"
import {correctionPolicy,correctionHash,correctionSubmitSchema,correctionAmendSchema,correctionDecisionSchema,type CorrectionPolicy} from "./personal-correction.contract"
type Tx=Prisma.TransactionClient
type Proposal={displayName?:string;legalName?:string}
type CaseOutcome={id:string;status:string;revision:number;appliedBusinessEventId?:string|null;appliedEmployeeVersion?:string|null}
type History={operation:string;actorId:string;at:string;revision:number;key:string;hash:string;reason:string;proposal?:Proposal;baseline?:{displayName:string;legalName:string|null};documentId?:string|null;documentHash?:string|null;policy?:CorrectionPolicy;outcome?:CaseOutcome}
type Case={id:string;organizationId:string;employeeId:string;requestedById:string;assignedOwnerId:string;idempotencyKey:string;requestHash:string;status:string;revision:number;proposal:Proposal;baseline:{displayName:string;legalName:string|null};policy:CorrectionPolicy;reason:string;documentId:string|null;history:History[];appliedBusinessEventId:string|null;appliedEmployeeVersion:string|null;createdAt:Date;updatedAt:Date}
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue
const missing=()=>new NotFoundError("HRIS_CORRECTION_CASE_UNAVAILABLE")
async function profileLock(tx:Tx,org:string){await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"hris-profile:"+org},0))::text`}
async function reviewer(tx:Tx,policy:CorrectionPolicy,requester:string,legal=false){
 if(policy.reviewerId===requester)throw new BusinessRuleError("HRIS_CORRECTION_INDEPENDENT_REVIEWER_UNAVAILABLE")
 await assertSetupAccount(tx,policy.organizationId,policy.reviewerId)
 const rows=await tx.$queryRaw<Array<{permissions:string[]}>>`SELECT r.permissions FROM roles r JOIN "_UserRoles" m ON m."A"=r.id WHERE m."B"=${policy.reviewerId} AND r."organizationId"=${policy.organizationId} FOR SHARE OF r,m`
 const permissions=rows.flatMap(r=>r.permissions)
 if(!hasAnyRbacPermission(permissions,["hris.people.manage"])||legal&&!hasAnyRbacPermission(permissions,["hris.documents.read"]))throw new BusinessRuleError("HRIS_CORRECTION_REVIEWER_UNAVAILABLE")
}
function allowed(policy:CorrectionPolicy|null,proposal:Proposal){if(!policy||Object.keys(proposal).some(k=>!policy.allowedFields.includes(k as keyof Proposal)))throw new BusinessRuleError("HRIS_CORRECTION_FIELD_UNAVAILABLE")}
async function document(tx:Tx,a:SelfServiceActor,employeeId:string,id:string|null|undefined,required:boolean){
 if(!id){if(required)throw new BusinessRuleError("HRIS_CORRECTION_REVIEWED_IDENTITY_DOCUMENT_REQUIRED");return null}
 const docs=await tx.$queryRaw<Array<{id:string;sha256:string;policy:{documentKind:string}}>>`SELECT id,sha256,policy FROM hris_employee_documents WHERE id=${id} AND "organizationId"=${a.organizationId} AND "employeeId"=${employeeId} AND "employeeVisible"=true AND status IN ('AVAILABLE','SUPERSEDED') AND (${!required} OR "expiresAt" IS NULL OR "expiresAt">CURRENT_TIMESTAMP) FOR UPDATE`
 const doc=docs[0];if(!doc||required&&doc.policy.documentKind!=="IDENTITY")throw new BusinessRuleError("HRIS_CORRECTION_REVIEWED_IDENTITY_DOCUMENT_REQUIRED")
 return doc
}
const summary=(c:Case)=>({id:c.id,employeeId:c.employeeId,status:c.status,revision:c.revision,proposal:c.proposal,baseline:c.baseline,reason:c.reason,documentId:c.documentId,createdAt:c.createdAt.toISOString(),updatedAt:c.updatedAt.toISOString(),history:c.history.map(({key,hash,documentHash,...v})=>v),appliedBusinessEventId:c.appliedBusinessEventId,appliedEmployeeVersion:c.appliedEmployeeVersion})
async function audit(tx:Tx,a:SelfServiceActor,c:Case,operation:string){await tx.auditLog.create({data:{organizationId:a.organizationId,userId:a.actorId,entityType:"HrisPersonalCorrectionCase",entityId:c.id,action:"HRIS_PERSONAL_CORRECTION_"+operation,changes:json({employeeId:c.employeeId,revision:c.revision,status:c.status,assignedOwnerId:c.assignedOwnerId,appliedBusinessEventId:c.appliedBusinessEventId})}})}
async function caseRow(tx:Tx,a:SelfServiceActor,id:string,own=false){
 const identity=await tx.$queryRaw<Array<{employeeId:string}>>`SELECT "employeeId" FROM hris_personal_correction_cases WHERE id=${id} AND "organizationId"=${a.organizationId}`
 if(!identity[0])throw missing()
 if(own){const employee=await lockedOwnEmployee(tx,a,false);if(employee.id!==identity[0].employeeId)throw missing()}
 else{if(!hasAnyRbacPermission(a.actorPermissions,["hris.people.manage"]))throw new ForbiddenError();await resolveHrisPeopleAccessScope({...a,employeeId:identity[0].employeeId,limit:1},tx);await lockHrisReviewEmployeeInTx(tx,a.organizationId,identity[0].employeeId)}
 const rows=await tx.$queryRaw<Case[]>`SELECT * FROM hris_personal_correction_cases WHERE id=${id} AND "organizationId"=${a.organizationId} FOR UPDATE`;if(!rows[0])throw missing();return rows[0]
}
async function employee(tx:Tx,c:Case){const e=await tx.payrollEmployee.findFirst({where:{id:c.employeeId,organizationId:c.organizationId,deletedAt:null}});if(!e)throw missing();return e}
function version(c:Case,e:Awaited<ReturnType<typeof employee>>,actorId:string){return correctionHash({caseId:c.id,revision:c.revision,status:c.status,proposal:c.proposal,baseline:c.baseline,owner:c.assignedOwnerId,documentId:c.documentId,employeeUpdatedAt:e.updatedAt.toISOString(),actorId,policy:correctionPolicy(c.organizationId)})}
function replay(c:Case,key:string,hash:string){const found=c.history.find(h=>h.key===key);if(!found)return null;if(found.hash!==hash)throw new ConflictError("HRIS_CORRECTION_REPLAY_CONFLICT");return found.outcome}

export async function getOwnCorrectionWorkspace(actor:SelfServiceActor,client:SelfServiceClient=db){return selfServiceTransaction(client,async tx=>{
 const a=await currentHrisActor(tx,actor),e=await lockedOwnEmployee(tx,a,false),policy=correctionPolicy(a.organizationId)
 const rows=await tx.$queryRaw<Case[]>`SELECT * FROM hris_personal_correction_cases WHERE "organizationId"=${a.organizationId} AND "employeeId"=${e.id} ORDER BY "createdAt" DESC,id LIMIT 101`
 let available=!!policy,reason:string|null=null,ownerName:string|null=null
 if(policy){try{await reviewer(tx,policy,a.actorId,policy.allowedFields.includes("legalName"));ownerName=(await tx.user.findUnique({where:{id:policy.reviewerId},select:{name:true}}))?.name??"HR"}catch{available=false;reason="REVIEWER_UNAVAILABLE"}}else reason="POLICY_UNAVAILABLE"
 const documents=await tx.$queryRaw<Array<{id:string;title:string}>>`SELECT id,title FROM hris_employee_documents WHERE "organizationId"=${a.organizationId} AND "employeeId"=${e.id} AND "employeeVisible"=true AND status='AVAILABLE' AND policy->>'documentKind'='IDENTITY' AND ("expiresAt" IS NULL OR "expiresAt">CURRENT_TIMESTAMP) ORDER BY "createdAt" DESC LIMIT 100`
 return {scopeKey:a.organizationId+":"+a.actorId,profile:{displayName:e.displayName,legalName:e.legalName},canSubmit:available&&hasAnyRbacPermission(a.actorPermissions,["hris.self_service.request"]),unavailableReason:reason,allowedFields:available?policy!.allowedFields:[],ownerName,documents,support:policy?{en:policy.supportLabelEn,fr:policy.supportLabelFr}:{en:"Contact your HR administrator to configure correction review.",fr:"Contactez votre administrateur RH pour configurer la vérification des corrections."},cases:rows.slice(0,100).map(summary),historyTruncated:rows.length>100}
})}
export async function submitOwnCorrection(actor:SelfServiceActor,raw:unknown,client:SelfServiceClient=db){const input=correctionSubmitSchema.parse(raw),hash=correctionHash(input);return selfServiceTransaction(client,async tx=>{
 await profileLock(tx,actor.organizationId);const a=await currentHrisActor(tx,actor),e=await lockedOwnEmployee(tx,a,true)
 const prior=await tx.$queryRaw<Case[]>`SELECT * FROM hris_personal_correction_cases WHERE "organizationId"=${a.organizationId} AND "requestedById"=${a.actorId} AND "idempotencyKey"=${input.idempotencyKey} FOR UPDATE`
 if(prior[0]){if(prior[0].employeeId!==e.id||prior[0].requestHash!==hash)throw new ConflictError("HRIS_CORRECTION_REPLAY_CONFLICT");return summary(prior[0])}
 const policy=correctionPolicy(a.organizationId);allowed(policy,input.proposal);await reviewer(tx,policy!,a.actorId,!!input.proposal.legalName);const doc=await document(tx,a,e.id,input.documentId,!!input.proposal.legalName)
 if(doc)await tx.$executeRaw`UPDATE hris_employee_documents SET "evidenceBoundAt"=COALESCE("evidenceBoundAt",CURRENT_TIMESTAMP),revision=revision+1 WHERE id=${doc.id} AND "evidenceBoundAt" IS NULL`
 if(Object.entries(input.proposal).every(([k,v])=>e[k as keyof Proposal]===v))throw new BusinessRuleError("HRIS_CORRECTION_NO_CHANGE")
 const id=randomUUID(),history:History[]=[{operation:"SUBMITTED",actorId:a.actorId,at:new Date().toISOString(),revision:1,key:input.idempotencyKey,hash,reason:input.reason,proposal:input.proposal,baseline:{displayName:e.displayName,legalName:e.legalName},documentId:doc?.id??null,documentHash:doc?.sha256??null,policy:policy!}]
 const rows=await tx.$queryRaw<Case[]>`INSERT INTO hris_personal_correction_cases (id,"organizationId","employeeId","requestedById","assignedOwnerId","idempotencyKey","requestHash",proposal,baseline,policy,reason,"documentId",history) VALUES (${id},${a.organizationId},${e.id},${a.actorId},${policy!.reviewerId},${input.idempotencyKey},${hash},${JSON.stringify(input.proposal)}::jsonb,${JSON.stringify({displayName:e.displayName,legalName:e.legalName})}::jsonb,${JSON.stringify(policy)}::jsonb,${input.reason},${input.documentId??null},${JSON.stringify(history)}::jsonb) RETURNING *`
 await audit(tx,a,rows[0],"SUBMITTED");return summary(rows[0])
})}
export async function amendOwnCorrection(actor:SelfServiceActor,raw:unknown,client:SelfServiceClient=db){const input=correctionAmendSchema.parse(raw),hash=correctionHash(input);return selfServiceTransaction(client,async tx=>{
 await profileLock(tx,actor.organizationId);const a=await currentHrisActor(tx,actor);await lockedOwnEmployee(tx,a,true);const c=await caseRow(tx,a,input.caseId,true)
 if(c.requestedById!==a.actorId)throw new ForbiddenError();const previous=replay(c,input.idempotencyKey,hash);if(previous)return previous
 if(c.status!=="RETURNED"||c.revision!==input.revision||c.history.length>=50)throw new ConflictError("HRIS_CORRECTION_STALE")
 const policy=correctionPolicy(a.organizationId);allowed(policy,input.proposal);await reviewer(tx,policy!,a.actorId,!!input.proposal.legalName);const e=await employee(tx,c),doc=await document(tx,a,e.id,input.documentId,!!input.proposal.legalName)
 if(doc)await tx.$executeRaw`UPDATE hris_employee_documents SET "evidenceBoundAt"=COALESCE("evidenceBoundAt",CURRENT_TIMESTAMP),revision=revision+1 WHERE id=${doc.id} AND "evidenceBoundAt" IS NULL`
 const outcome={id:c.id,status:"REQUESTED",revision:c.revision+1},history=[...c.history,{operation:"AMENDED",actorId:a.actorId,at:new Date().toISOString(),revision:c.revision+1,key:input.idempotencyKey,hash,reason:input.reason,proposal:input.proposal,baseline:{displayName:e.displayName,legalName:e.legalName},documentId:doc?.id??null,documentHash:doc?.sha256??null,policy:policy!,outcome}]
 const rows=await tx.$queryRaw<Case[]>`UPDATE hris_personal_correction_cases SET status='REQUESTED',revision=revision+1,proposal=${JSON.stringify(input.proposal)}::jsonb,baseline=${JSON.stringify({displayName:e.displayName,legalName:e.legalName})}::jsonb,policy=${JSON.stringify(policy)}::jsonb,"assignedOwnerId"=${policy!.reviewerId},reason=${input.reason},"documentId"=${input.documentId??null},history=${JSON.stringify(history)}::jsonb,"updatedAt"=CURRENT_TIMESTAMP WHERE id=${c.id} RETURNING *`
 await audit(tx,a,rows[0],"AMENDED");return outcome
})}
export async function getCorrectionReview(actor:SelfServiceActor,id:string,client:SelfServiceClient=db){return selfServiceTransaction(client,async tx=>{
 await profileLock(tx,actor.organizationId);const a=await currentHrisActor(tx,actor),c=await caseRow(tx,a,id),e=await employee(tx,c)
 return {...summary(c),employee:{id:e.id,displayName:e.displayName},current:{displayName:e.displayName,legalName:e.legalName},reviewVersion:version(c,e,a.actorId),assignedToActor:c.assignedOwnerId===a.actorId,independent:c.requestedById!==a.actorId&&e.userId!==a.actorId,ownerName:(await tx.user.findUnique({where:{id:c.assignedOwnerId},select:{name:true}}))?.name??"Unavailable"}
})}
export async function getCorrectionQueue(actor:SelfServiceActor,client:SelfServiceClient=db,caseId?:string){return selfServiceTransaction(client,async tx=>{
 const a=await currentHrisActor(tx,actor);if(!hasAnyRbacPermission(a.actorPermissions,["hris.people.manage"]))throw new ForbiddenError();const scope=await resolveHrisPeopleAccessScope({...a,limit:200},tx)
 const rows=await tx.$queryRaw<Array<Case&{employeeName:string}>>`SELECT c.*,e."displayName" AS "employeeName" FROM hris_personal_correction_cases c JOIN payroll_employees e ON e.id=c."employeeId" AND e."organizationId"=c."organizationId" WHERE c."organizationId"=${a.organizationId} AND e."deletedAt" IS NULL AND (${caseId??null}::text IS NULL OR c.id=${caseId??null}) AND (${scope.employeeIds===null} OR c."employeeId"=ANY(${scope.employeeIds??[]}::text[])) ORDER BY c."createdAt" DESC,c.id LIMIT 201`
 return {scopeKey:a.organizationId+":"+a.actorId,cases:rows.slice(0,200).map(c=>({...summary(c),employeeName:c.employeeName,assignedToActor:c.assignedOwnerId===a.actorId})),historyTruncated:rows.length>200}
})}
export async function decideCorrection(actor:SelfServiceActor,raw:unknown,client:SelfServiceClient=db){const input=correctionDecisionSchema.parse(raw),hash=correctionHash({...input,actorId:actor.actorId});return selfServiceTransaction(client,async tx=>{
 await profileLock(tx,actor.organizationId);const a=await currentHrisActor(tx,actor),c=await caseRow(tx,a,input.caseId),e=await employee(tx,c)
 if(c.requestedById===a.actorId||e.userId===a.actorId)throw new ForbiddenError("Independent correction review is required.")
 if(input.decision!=="REASSIGN"&&c.assignedOwnerId!==a.actorId)throw new ForbiddenError("This correction is assigned to another reviewer.")
 const previous=replay(c,input.idempotencyKey,hash);if(previous)return previous
 if(!["REQUESTED","RETURNED"].includes(c.status)||c.revision!==input.revision||version(c,e,a.actorId)!==input.reviewVersion||c.history.length>=50)throw new ConflictError("HRIS_CORRECTION_STALE")
 if(c.status==="RETURNED"&&input.decision!=="REASSIGN"&&input.decision!=="REJECT")throw new ConflictError("Wait for the employee's amended request.")
 const policy=correctionPolicy(a.organizationId);let owner=c.assignedOwnerId,appliedBusinessEventId=c.appliedBusinessEventId,appliedEmployeeVersion=c.appliedEmployeeVersion
 if(input.decision==="REASSIGN"){if(!policy||policy.reviewerId===e.userId)throw new BusinessRuleError("HRIS_CORRECTION_POLICY_UNAVAILABLE");await reviewer(tx,policy,c.requestedById,!!c.proposal.legalName);owner=policy.reviewerId;if(owner===c.assignedOwnerId)throw new BusinessRuleError("HRIS_CORRECTION_OWNER_UNCHANGED")}
 if(input.decision==="APPROVE"){
  allowed(policy,c.proposal);if(policy!.reviewerId!==a.actorId)throw new BusinessRuleError("HRIS_CORRECTION_REASSIGNMENT_REQUIRED");await reviewer(tx,policy!,c.requestedById,!!c.proposal.legalName)
  if(Object.keys(c.proposal).some(k=>e[k as keyof Proposal]!==c.baseline[k as keyof Proposal]))throw new ConflictError("HRIS_CORRECTION_SOURCE_CHANGED: Return this case for renewed information.")
  const doc=await document(tx,a,e.id,c.documentId,!!c.proposal.legalName)
  const applied=await upsertHrisEmployeeProfile({...a,employeeId:e.id,employeeNumber:e.employeeNumber,expectedUpdatedAt:e.updatedAt.toISOString(),displayName:c.proposal.displayName??e.displayName,...(c.proposal.legalName?{legalName:c.proposal.legalName}:{}),hireDate:e.hireDate,countryCode:e.countryCode,idempotencyKey:`hris-personal-correction:${c.id}:${c.revision}`,...(doc?{evidenceReferences:[{type:"IDENTITY" as const,documentHash:"sha256:"+doc.sha256,label:"Reviewed personal-data correction evidence"}]}:{})},tx)
  appliedBusinessEventId=applied.businessEventId;appliedEmployeeVersion=applied.payrollEmployee.updatedAt.toISOString()
 }
 const status=input.decision==="APPROVE"?"APPLIED":input.decision==="RETURN"?"RETURNED":input.decision==="REJECT"?"REJECTED":c.status
 const outcome={id:c.id,status,revision:c.revision+1,appliedBusinessEventId,appliedEmployeeVersion},history=[...c.history,{operation:input.decision,actorId:a.actorId,at:new Date().toISOString(),revision:c.revision+1,key:input.idempotencyKey,hash,reason:input.reason,outcome}]
 const rows=await tx.$queryRaw<Case[]>`UPDATE hris_personal_correction_cases SET status=${status},revision=revision+1,"assignedOwnerId"=${owner},"appliedBusinessEventId"=${appliedBusinessEventId},"appliedEmployeeVersion"=${appliedEmployeeVersion},history=${JSON.stringify(history)}::jsonb,"updatedAt"=CURRENT_TIMESTAMP WHERE id=${c.id} RETURNING *`
 await audit(tx,a,rows[0],input.decision);return outcome
})}
