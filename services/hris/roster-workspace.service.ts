import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { resolveHrisPeopleAccessScope } from "./org.service"
import { attendanceMetadata, correctedAttendanceEntry, lockOperationalEmployeeInTx } from "./attendance-correction"
import { buildOperationalAttendanceCertification } from "./operational-time.service"
import { certifyOperationalAttendance } from "./operational-attendance.service"
type Client=typeof db|Prisma.TransactionClient
const actor=z.object({organizationId:z.string().min(1),actorId:z.string().min(1),actorPermissions:z.array(z.string()).default([])})
const read=actor.extend({employeeId:z.string().min(1).optional(),startDate:z.coerce.date(),days:z.number().int().min(1).max(31).default(7),own:z.boolean().default(false),payrollPeriodId:z.string().optional()})
const day=(value:Date)=>value.toISOString().slice(0,10)
export async function getRosterWorkspace(input:z.input<typeof read>,client:Client=db){
  const parsed=read.parse(input),manage=hasAnyRbacPermission(parsed.actorPermissions,["hris.people.manage"])
  if(!parsed.startDate.toISOString().endsWith("T00:00:00.000Z"))throw new BusinessRuleError("HRIS_ROSTER_WORK_DATE_REQUIRED")
  let employeeIds:string[]|null
  if(parsed.own){
    if(!hasAnyRbacPermission(parsed.actorPermissions,["hris.self_service.read","hris.self_service.request"]))throw new ForbiddenError("Own schedule access is required.")
    const own=await client.payrollEmployee.findMany({where:{organizationId:parsed.organizationId,userId:parsed.actorId,deletedAt:null},select:{id:true},take:2})
    if(own.length!==1||parsed.employeeId&&parsed.employeeId!==own[0].id)throw new ForbiddenError("Only your own published schedule is available.")
    employeeIds=[own[0].id]
  }else employeeIds=(await resolveHrisPeopleAccessScope({...parsed,limit:250},client)).employeeIds
  const employees=await client.payrollEmployee.findMany({where:{organizationId:parsed.organizationId,deletedAt:null,...(parsed.employeeId?{id:parsed.employeeId}:employeeIds?{id:{in:employeeIds}}:{})},select:{id:true,displayName:true},orderBy:{displayName:"asc"},take:200})
  const end=new Date(parsed.startDate.getTime()+(parsed.days-1)*86400000),ids=employees.map(e=>e.id)
  const schedules=await client.hrisWorkSchedule.findMany({where:{organizationId:parsed.organizationId,employeeId:{in:ids},...(parsed.own?{status:"ACTIVE" as const}:{}),effectiveFrom:{lte:end},OR:[{effectiveTo:null},{effectiveTo:{gte:parsed.startDate}}]},include:{calendar:{include:{holidays:true}}},orderBy:[{effectiveFrom:"desc"},{revision:"desc"}],take:5001})
  if(schedules.length>5000)throw new BusinessRuleError("HRIS_ROSTER_SCOPE_TOO_LARGE: Select one employee or a shorter date range to review complete schedule history.")
  const roster=employees.map(employee=>({employeeId:employee.id,displayName:employee.displayName,days:Array.from({length:parsed.days},(_,index)=>{
    const date=new Date(parsed.startDate.getTime()+index*86400000),schedule=schedules.find(s=>s.employeeId===employee.id&&s.status==="ACTIVE"&&day(s.effectiveFrom)<=day(date)&&(!s.effectiveTo||day(s.effectiveTo)>=day(date)))
    if(!schedule||!schedule.approvedById||!schedule.approvalEvidenceHash||schedule.calendar.status!=="ACTIVE")return {workDate:day(date),state:"MISSING" as const,minutes:null,scheduleId:null,revision:null,timezone:null,shiftPlan:null}
    const pattern=attendanceMetadata(schedule.weeklyPattern),minutes=pattern[["sun","mon","tue","wed","thu","fri","sat"][date.getUTCDay()]]??pattern[String(date.getUTCDay())],holiday=schedule.calendar.holidays.some(h=>day(h.holidayDate)===day(date))
    return {workDate:day(date),state:"PUBLISHED" as const,minutes:holiday?0:typeof minutes==="number"?minutes:null,scheduleId:schedule.id,revision:schedule.revision,timezone:schedule.timezone,shiftPlan:schedule.shiftPlan}
  })}))
  let closure:Awaited<ReturnType<typeof closureWorkspace>>|null=null
  if(!parsed.own&&parsed.employeeId&&parsed.payrollPeriodId)closure=await closureWorkspace({...parsed,employeeId:parsed.employeeId,payrollPeriodId:parsed.payrollPeriodId},client)
  return {startDate:day(parsed.startDate),days:parsed.days,own:parsed.own,canManage:manage&&!parsed.own,employees,roster,closure,
    calendars:manage&&!parsed.own?await client.hrisWorkCalendar.findMany({where:{organizationId:parsed.organizationId,status:"ACTIVE"},select:{id:true,name:true,timezone:true,effectiveFrom:true,effectiveTo:true},take:100}):[],
    periods:!parsed.own?await client.payrollPeriod.findMany({where:{organizationId:parsed.organizationId},select:{id:true,name:true,periodStart:true,periodEnd:true},orderBy:{periodStart:"desc"},take:24}):[],
    versions:parsed.own?[]:schedules.map(s=>({id:s.id,employeeId:s.employeeId,name:s.name,status:s.status,revision:s.revision,supersedesScheduleId:s.supersedesScheduleId,sourceHash:s.sourceHash,calendarId:s.calendarId,timezone:s.timezone,effectiveFrom:day(s.effectiveFrom),effectiveTo:s.effectiveTo?day(s.effectiveTo):null,weeklyPattern:s.weeklyPattern,standardWeeklyMinutes:s.standardWeeklyMinutes,shiftPlan:s.shiftPlan,canApprove:manage&&s.preparedById!==parsed.actorId&&s.status==="DRAFT"}))}
}
async function closureWorkspace(input:z.infer<typeof actor>&{employeeId:string;payrollPeriodId:string},client:Client){
  const period=await client.payrollPeriod.findFirst({where:{id:input.payrollPeriodId,organizationId:input.organizationId}});if(!period)throw new NotFoundError("Payroll period was not found.")
  const where={organizationId:input.organizationId,employeeId:input.employeeId}
  const [entries,requests,anomalies,snapshots]=await Promise.all([
    client.hrisTimeEntry.findMany({where:{...where,workDate:{gte:period.periodStart,lte:period.periodEnd}},orderBy:[{workDate:"asc"},{id:"asc"}],include:{importBatch:{select:{sourceSystem:true,importedById:true}}}}),
    client.hrisTimeRequest.findMany({where:{...where,periodStart:{lte:period.periodEnd},periodEnd:{gte:period.periodStart}},orderBy:{requestedAt:"desc"}}),
    client.hrisAttendanceAnomaly.findMany({where,orderBy:{createdAt:"desc"},take:200}),
    client.payrollAttendanceSnapshot.findMany({where:{...where,payrollPeriodId:period.id},orderBy:{createdAt:"desc"},take:20}),
  ])
  const preparedById=entries.find(e=>e.status==="VALIDATED")?.importBatch.importedById
  let readiness:{ready:boolean;message:string;totals:unknown}={ready:false,message:"Import observed attendance before certification.",totals:null}
  try{
    if(!preparedById)throw new BusinessRuleError("HRIS_TIME_OBSERVATIONS_REQUIRED")
    if(entries.some(e=>e.importBatch.importedById===input.actorId))throw new BusinessRuleError("SOD_VIOLATION: An independent reviewer must certify imported observations.")
    const draft=await buildOperationalAttendanceCertification({...input,preparedById,approvalEvidenceHash:"sha256:readiness-preview-only"},client)
    readiness={ready:true,message:"Ready for independent certification.",totals:draft.sourcePayload.totals}
  }catch(error){if(!(error instanceof BusinessRuleError))throw error;readiness={ready:false,message:error.message,totals:null}}
  return {period:{id:period.id,name:period.name,start:day(period.periodStart),end:day(period.periodEnd)},readiness,
    entries:entries.map(e=>{const corrected=correctedAttendanceEntry(e,requests);return {id:e.id,workDate:day(e.workDate),status:e.status,sourceSystem:e.importBatch.sourceSystem,sourceRecordId:e.sourceRecordId,scheduledMinutes:e.scheduledMinutes,workedMinutes:e.workedMinutes,absenceMinutes:e.absenceMinutes,overtimeMinutes:e.overtimeMinutes,correctedWorkedMinutes:corrected.entry.workedMinutes,correctedAbsenceMinutes:corrected.entry.absenceMinutes,correctionHash:corrected.sourceHash}}),
    requests:requests.map(r=>({id:r.id,type:r.type,status:r.status,minutes:r.requestedMinutes,canDecide:r.status==="REQUESTED"&&r.requestedById!==input.actorId&&hasAnyRbacPermission(input.actorPermissions,["hris.people.manage"])})),
    anomalies:anomalies.map(a=>({id:a.id,code:a.code,status:a.status,timeEntryId:a.timeEntryId,replacementEntryId:attendanceMetadata(a.detail).replacementEntryId??null})),
    snapshots:snapshots.map(s=>({id:s.id,status:s.status,correctedFromId:s.correctedFromId,workedMinutes:s.workedMinutes,sourceHash:s.sourceHash}))}
}
export async function certifyRosterAttendance(input:z.input<typeof actor>&{employeeId:string;payrollPeriodId:string;approvalEvidenceHash:string},client:Client=db){
  const parsed=actor.extend({employeeId:z.string().min(1),payrollPeriodId:z.string().min(1),approvalEvidenceHash:z.string().min(8).max(256)}).parse(input)
  if(!hasAnyRbacPermission(parsed.actorPermissions,["hris.people.manage"]))throw new ForbiddenError("Missing attendance certification permission.")
  const run=async(tx:Prisma.TransactionClient)=>{
    await resolveHrisPeopleAccessScope(parsed,tx);await lockOperationalEmployeeInTx(tx,parsed.organizationId,parsed.employeeId)
    const period=await tx.payrollPeriod.findFirst({where:{organizationId:parsed.organizationId,id:parsed.payrollPeriodId}});if(!period)throw new NotFoundError("Payroll period was not found.")
    const entries=await tx.hrisTimeEntry.findMany({where:{organizationId:parsed.organizationId,employeeId:parsed.employeeId,workDate:{gte:period.periodStart,lte:period.periodEnd}},include:{importBatch:{select:{importedById:true}}}})
    const preparedById=entries.find(e=>e.status==="VALIDATED")?.importBatch.importedById
    if(!preparedById)throw new BusinessRuleError("HRIS_TIME_OBSERVATIONS_REQUIRED")
    if(entries.some(e=>e.importBatch.importedById===parsed.actorId))throw new BusinessRuleError("SOD_VIOLATION: Importers cannot certify their own attendance observations.")
    return certifyOperationalAttendance({...parsed,preparedById},tx)
  }
  return "$transaction" in client?client.$transaction(run,{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted}):run(client)
}
