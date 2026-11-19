import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { attendanceMetadata, lockOperationalEmployeeInTx } from "./attendance-correction"

type Client = typeof db | Prisma.TransactionClient
const actor=z.object({organizationId:z.string().min(1),actorId:z.string().min(1),actorPermissions:z.array(z.string()).default([])})
const proof=z.string().trim().min(8).max(256)
export const observationSchema=z.object({sourceRecordId:z.string().trim().min(1).max(160),employeeId:z.string().min(1),workDate:z.coerce.date(),scheduledMinutes:z.number().int().nonnegative().max(1440),workedMinutes:z.number().int().nonnegative().max(1440),absenceMinutes:z.number().int().nonnegative().max(1440).default(0),overtimeMinutes:z.number().int().nonnegative().max(1440).default(0),sourceHash:proof})
export const attendanceImportSchema=actor.extend({sourceSystem:z.string().trim().min(1).max(120),sourceFileName:z.string().max(255).optional(),sourceHash:proof,idempotencyKey:z.string().min(8).max(160),entries:z.array(observationSchema).min(1).max(5000)})
const transaction=<T>(client:Client,run:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>=>"$transaction" in client?client.$transaction(run,{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted}):run(client)
function permit(input:z.infer<typeof actor>){if(!hasAnyRbacPermission(input.actorPermissions,["hris.people.manage"]))throw new ForbiddenError("Missing permission for attendance import or anomaly resolution.")}
const rowHash=(row:z.infer<typeof observationSchema>)=>hashBusinessPayload(observationSchema.parse(row))
const commandHash=(input:z.infer<typeof attendanceImportSchema>)=>hashBusinessPayload({sourceSystem:input.sourceSystem,sourceHash:input.sourceHash,entries:input.entries})
export function observationIssues(row:z.infer<typeof observationSchema>){const issues:string[]=[];if(!row.workDate.toISOString().endsWith("T00:00:00.000Z"))issues.push("WORK_DATE_REQUIRED");if(row.workedMinutes+row.absenceMinutes!==row.scheduledMinutes)issues.push("SCHEDULE_RECONCILIATION_MISMATCH");if(row.overtimeMinutes>row.workedMinutes)issues.push("OVERTIME_EXCEEDS_WORKED");return issues}
async function inspect(input:z.infer<typeof attendanceImportSchema>,client:Client){
  const ids=[...new Set(input.entries.map(e=>e.employeeId))],known=new Set((await client.payrollEmployee.findMany({where:{organizationId:input.organizationId,id:{in:ids},deletedAt:null},select:{id:true}})).map(e=>e.id))
  const prior=await client.hrisTimeEntry.findMany({where:{organizationId:input.organizationId,OR:[{importBatch:{sourceSystem:input.sourceSystem},sourceRecordId:{in:input.entries.map(e=>e.sourceRecordId)}},{employeeId:{in:ids},status:"VALIDATED",workDate:{in:input.entries.map(e=>e.workDate)}}]},include:{importBatch:{select:{sourceSystem:true}}}})
  const seenRecords=new Set<string>(),seenDays=new Set<string>()
  return input.entries.map((row,index)=>{
    const issues=observationIssues(row),key=row.employeeId+":"+row.workDate.toISOString(),old=prior.find(p=>p.importBatch.sourceSystem===input.sourceSystem&&p.sourceRecordId===row.sourceRecordId)
    if(!known.has(row.employeeId))issues.push("UNKNOWN_EMPLOYEE")
    if(seenRecords.has(row.sourceRecordId))issues.push("DUPLICATE_SOURCE_RECORD_IN_FILE");seenRecords.add(row.sourceRecordId)
    if(seenDays.has(key))issues.push("DUPLICATE_EMPLOYEE_DATE_IN_FILE");seenDays.add(key)
    const duplicate=!!old&&rowHash(old)===rowHash(row)
    if(old&&!duplicate)issues.push("SOURCE_RECORD_CHANGED_USE_CORRECTION")
    if(!duplicate&&!issues.length&&prior.some(p=>p.status==="VALIDATED"&&p.employeeId===row.employeeId&&p.workDate.getTime()===row.workDate.getTime()))issues.push("WORK_DATE_EXISTS_USE_CORRECTION")
    return {index,employeeId:row.employeeId,workDate:row.workDate.toISOString().slice(0,10),sourceRecordId:row.sourceRecordId,scheduledMinutes:row.scheduledMinutes,workedMinutes:row.workedMinutes,absenceMinutes:row.absenceMinutes,overtimeMinutes:row.overtimeMinutes,issues,duplicate,existingEntryId:duplicate?old!.id:null}
  })
}
export async function previewOperationalTime(input:z.input<typeof attendanceImportSchema>,client:Client=db){const parsed=attendanceImportSchema.parse(input);permit(parsed);return {payloadHash:commandHash(parsed),rows:await inspect(parsed,client)}}
export async function importReviewedOperationalTime(input:z.input<typeof attendanceImportSchema>&{previewHash?:string},client:Client=db){
  const parsed=attendanceImportSchema.parse(input);permit(parsed);const fingerprint=commandHash(parsed)
  if(input.previewHash&&input.previewHash!==fingerprint)throw new ConflictError("HRIS_TIME_PREVIEW_CHANGED: Preview the current file again.")
  return transaction(client,async tx=>{
    // Provider record identities may move between employees in a bad file. Lock
    // the employer import namespace before sorted employee locks to serialize it.
    const key=JSON.stringify(["hris-time-import-v1",parsed.organizationId]);await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))::text`)
    const retained=await tx.hrisTimeImportBatch.findMany({where:{organizationId:parsed.organizationId,OR:[{idempotencyKey:parsed.idempotencyKey},{sourceHash:parsed.sourceHash}]},orderBy:{id:"asc"}})
    if(retained.length){if(retained.some(row=>attendanceMetadata(row.metadata).payloadHash!==fingerprint))throw new ConflictError("HRIS_TIME_IMPORT_REPLAY_CONFLICT: Retained source or key has different content; use the correction workflow.");return {...retained[0],replayed:true}}
    for(const employeeId of [...new Set(parsed.entries.map(e=>e.employeeId))].sort())await lockOperationalEmployeeInTx(tx,parsed.organizationId,employeeId)
    const rows=await inspect(parsed,tx),fatal=rows.filter(r=>r.issues.some(issue=>!["SCHEDULE_RECONCILIATION_MISMATCH","OVERTIME_EXCEEDS_WORKED"].includes(issue)))
    if(fatal.length)throw new BusinessRuleError("HRIS_TIME_IMPORT_REQUIRES_REVIEW: "+[...new Set(fatal.flatMap(r=>r.issues))].join(", "))
    const batch=await tx.hrisTimeImportBatch.create({data:{organizationId:parsed.organizationId,sourceSystem:parsed.sourceSystem,sourceFileName:parsed.sourceFileName,sourceHash:parsed.sourceHash,rowCount:rows.length,importedById:parsed.actorId,idempotencyKey:parsed.idempotencyKey,metadata:{payloadHash:fingerprint,duplicateCount:rows.filter(r=>r.duplicate).length,retainedEntryIds:rows.filter(r=>r.duplicate).map(r=>r.existingEntryId!)}}})
    let acceptedCount=0,rejectedCount=0
    for(const row of rows){if(row.duplicate)continue;const source=parsed.entries[row.index];const entry=await tx.hrisTimeEntry.create({data:{...source,organizationId:parsed.organizationId,importBatchId:batch.id,status:row.issues.length?"REJECTED":"VALIDATED"}})
      if(row.issues.length){rejectedCount++;for(const code of row.issues)await tx.hrisAttendanceAnomaly.create({data:{organizationId:parsed.organizationId,employeeId:source.employeeId,importBatchId:batch.id,timeEntryId:entry.id,code,severity:"HIGH",evidenceHash:hashBusinessPayload({source:rowHash(source),code}),detail:{sourceRecordIdHash:hashBusinessPayload(source.sourceRecordId),rawRecordIncluded:false}}})}else acceptedCount++
    }
    const result=await tx.hrisTimeImportBatch.update({where:{id:batch.id},data:{status:rejectedCount?"REJECTED":"VALIDATED",acceptedCount,rejectedCount,validatedById:parsed.actorId,validatedAt:new Date()}})
    await tx.auditLog.create({data:{organizationId:parsed.organizationId,userId:parsed.actorId,entityType:"HrisTimeImportBatch",entityId:batch.id,action:"HRIS_TIME_IMPORT_VALIDATED",changes:{payloadHash:fingerprint,acceptedCount,rejectedCount,duplicateCount:rows.filter(r=>r.duplicate).length}}});return {...result,replayed:false}
  })
}
const anomalySchema=actor.extend({anomalyId:z.string().min(1),status:z.enum(["RESOLVED","DISMISSED"]),resolutionHash:proof,replacementEntryId:z.string().min(1).optional()})
export async function resolveReviewedOperationalAnomaly(input:z.input<typeof anomalySchema>,client:Client=db){
  const parsed=anomalySchema.parse(input);permit(parsed)
  return transaction(client,async tx=>{
    let anomaly=await tx.hrisAttendanceAnomaly.findFirst({where:{id:parsed.anomalyId,organizationId:parsed.organizationId}})
    if(!anomaly)throw new NotFoundError("Attendance anomaly was not found.")
    if(!anomaly.employeeId||!anomaly.timeEntryId)throw new BusinessRuleError("HRIS_TIME_ANOMALY_SOURCE_UNRESOLVED: Reconcile the original source identity before closing this anomaly.")
    await lockOperationalEmployeeInTx(tx,parsed.organizationId,anomaly.employeeId)
    anomaly=await tx.hrisAttendanceAnomaly.findUniqueOrThrow({where:{id:anomaly.id}})
    if(anomaly.status!=="OPEN"){
      const detail=attendanceMetadata(anomaly.detail)
      if(anomaly.status===parsed.status&&anomaly.resolutionHash===parsed.resolutionHash&&anomaly.resolvedById===parsed.actorId&&detail.replacementEntryId===parsed.replacementEntryId)return anomaly
      throw new ConflictError("HRIS_TIME_ANOMALY_REPLAY_CONFLICT")
    }
    if(parsed.status!=="RESOLVED"||!parsed.replacementEntryId)throw new BusinessRuleError("HRIS_TIME_ANOMALY_REPAIR_REQUIRED: A rejected observation requires an identified validated replacement, not a status-only dismissal.")
    const original=await tx.hrisTimeEntry.findFirst({where:{id:anomaly.timeEntryId!,organizationId:parsed.organizationId,employeeId:anomaly.employeeId!}})
    const replacement=original&&await tx.hrisTimeEntry.findFirst({where:{id:parsed.replacementEntryId,organizationId:parsed.organizationId,employeeId:original.employeeId,workDate:original.workDate,status:"VALIDATED"}})
    if(!original||original.status!=="REJECTED"||!replacement||observationIssues(replacement).length||replacement.id===original.id)throw new BusinessRuleError("HRIS_TIME_ANOMALY_REPAIR_REQUIRED: Replacement must reconcile the same employee and local date.")
    if(!["SCHEDULE_RECONCILIATION_MISMATCH","OVERTIME_EXCEEDS_WORKED"].includes(anomaly.code))throw new BusinessRuleError("HRIS_TIME_ANOMALY_SOURCE_UNRESOLVED: This anomaly needs its specific source repair.")
    const result=await tx.hrisAttendanceAnomaly.update({where:{id:anomaly.id},data:{status:"RESOLVED",resolvedById:parsed.actorId,resolvedAt:new Date(),resolutionHash:parsed.resolutionHash,detail:{...attendanceMetadata(anomaly.detail),replacementEntryId:replacement.id,replacementHash:rowHash(replacement)}}})
    await tx.auditLog.create({data:{organizationId:parsed.organizationId,userId:parsed.actorId,entityType:"HrisAttendanceAnomaly",entityId:anomaly.id,action:"HRIS_TIME_ANOMALY_REPAIRED",changes:{originalEntryId:original.id,replacementEntryId:replacement.id,resolutionHash:parsed.resolutionHash}}});return result
  })
}
