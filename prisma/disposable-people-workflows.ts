import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { requestHrisContractDocumentEvidence, approveHrisContractDocumentEvidence } from '../services/hris/document-evidence.service';
import { requestHrisContractActivation, approveHrisContractActivation } from '../services/hris/contract.service';
import { requestHrisEmployeeLifecycle, approveHrisEmployeeLifecycle, applyApprovedHrisEmployeeLifecycle, pendingHrisLifecycleFromMetadata } from '../services/hris/lifecycle.service';
import { requestHrisPaymentDestinationChange, approveHrisPaymentDestinationChange, applyApprovedHrisPaymentDestinationChange } from '../services/hris/payment-destination.service';
import { createTimeFoundation, approveTimeFoundation, assignWorkSchedule, approveWorkSchedule } from '../services/hris/operational-time.service';
import { previewOperationalTime, importReviewedOperationalTime } from '../services/hris/attendance-import.service';
import { certifyRosterAttendance } from '../services/hris/roster-workspace.service';

type Actor={organizationId:string;actorId:string;actorPermissions:string[]};
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const at=(value:string)=>new Date(value+'T00:00:00Z');

export async function preparePeople(org:string,actors:Record<string,Actor>,out:string) {
  const maker=actors.payroll_administrator, reviewer=actors.owner, applier=actors.payroll_approver;
  const employees=await db.payrollEmployee.findMany({where:{organizationId:org},orderBy:{employeeNumber:'asc'},include:{contracts:true}});
  const directory=path.join(out,'synthetic-documents');mkdirSync(directory,{recursive:true});
  const proof=(name:string,value:unknown)=>{const bytes=JSON.stringify(value);writeFileSync(path.join(directory,name+'.json'),bytes);return digest(bytes);};
  for(const employee of employees) {
    const contract=employee.contracts[0];if(!contract)throw new Error('Missing contract for '+employee.employeeNumber);
    const context={...maker,employeeId:employee.id,contractId:contract.id};
    const evidence=proof(`${org}-${employee.employeeNumber}-contract`,{classification:'SYNTHETIC_TEST_DOCUMENT',employeeNumber:employee.employeeNumber,name:employee.displayName,contractNumber:contract.contractNumber,effectiveFrom:contract.effectiveFrom,baseSalary:String(contract.baseSalary),currency:'XAF',realEmploymentClaimed:false});
    const scan=proof(`${org}-${employee.employeeNumber}-fixture-validation`,{classification:'SYNTHETIC_PROTOCOL_EVIDENCE',artifactHash:evidence,checks:['Generated JSON parsed successfully','No executable attachment'],malwareScannerQualification:false});
    const decisionReason='Independent review of synthetic test employee evidence';
    if(!contract.signedDocumentHash){await requestHrisContractDocumentEvidence({...context,artifactHash:evidence,malwareScanEvidenceHash:scan,malwareScanProvider:'Synthetic JSON protocol check; no malware scanner qualification',malwareScannedAt:new Date(),signedAt:at('2025-11-01'),retentionPolicyCode:'SYNTHETIC_TEST',retentionBasis:'Disposable test dataset, no real employee',retainUntil:at('2027-10-28')});await approveHrisContractDocumentEvidence({...context,...reviewer,decisionReason,approvalEvidenceHash:evidence});}
    if(contract.status!=='ACTIVE'){await requestHrisContractActivation({...context,reason:'Activate synthetic contract for workflow testing',requestEvidenceHash:evidence,idempotencyKey:`${org}:${employee.employeeNumber}:activate-request`});await approveHrisContractActivation({...context,...reviewer,decisionReason,approvalEvidenceHash:evidence,idempotencyKey:`${org}:${employee.employeeNumber}:activate-approve`});}
    if(!employee.paymentDestinationHash){
      let change=await db.payrollPaymentDestinationChangeRequest.findFirst({where:{organizationId:org,employeeId:employee.id},orderBy:{createdAt:'desc'}});
      if(!change){const created=await requestHrisPaymentDestinationChange({...maker,employeeId:employee.id,paymentMethod:'CASH',requestReason:'Synthetic cash payroll destination',evidenceDocumentHash:evidence});change=await db.payrollPaymentDestinationChangeRequest.findUniqueOrThrow({where:{id:created.paymentDestinationChange.id}});}
      const input={employeeId:employee.id,paymentDestinationChangeRequestId:change!.id};
      if(change!.status==='REQUESTED')await approveHrisPaymentDestinationChange({...reviewer,...input,decisionReason,approvalEvidenceHash:evidence});
      if(change!.status!=='APPLIED')await applyApprovedHrisPaymentDestinationChange({...applier,...input});
    }
    if(employee.status!=='ACTIVE'){
      const latest=await db.payrollEmployee.findUniqueOrThrow({where:{id:employee.id}});
      let pending=pendingHrisLifecycleFromMetadata(latest.metadata);
      if(!pending)pending=(await requestHrisEmployeeLifecycle({...maker,employeeId:employee.id,type:'ONBOARD',effectiveAt:at('2025-11-01'),reason:'Synthetic reconstructed employment history',evidenceHash:evidence})).workflow;
      const target={employeeId:employee.id,requestId:pending.requestId};
      if(pending.status!=='APPROVED')await approveHrisEmployeeLifecycle({...reviewer,...target,decisionReason,approvalEvidenceHash:evidence});
      await applyApprovedHrisEmployeeLifecycle({...applier,...target});
    }
  }
  const policyHash=proof(`${org}-calendar-policy`,{classification:'SYNTHETIC_COMPANY_POLICY',timezone:'Africa/Douala',weeklyPattern:{sun:0,mon:480,tue:480,wed:480,thu:480,fri:480,sat:0},publicHolidayCoverage:'No official holiday calendar asserted',statutoryComplianceClaimed:false});
  let calendar=await db.hrisWorkCalendar.findFirst({where:{organizationId:org,code:'SYNTHETIC-12M'}});
  let leavePolicy=await db.hrisLeavePolicy.findFirst({where:{organizationId:org,code:'SYNTHETIC-12M'}});
  if(!calendar){const foundation=await createTimeFoundation({...maker,countryCode:'CM',calendarCode:'SYNTHETIC-12M',calendarName:'Synthetic weekday work calendar',timezone:'Africa/Douala',effectiveFrom:at('2025-11-01'),effectiveTo:at('2026-10-31'),calendarSourceHash:policyHash,holidays:[],leavePolicyCode:'SYNTHETIC-12M',leavePolicyName:'Synthetic company policy — not statutory guidance',annualEntitlementMinutes:9600,carryOverLimitMinutes:0,accrualRule:{schemaVersion:1,employeeIds:employees.map(e=>e.id),negativeBalance:'FORBID',rounding:'EXACT_MINUTES',credits:[{date:'2025-11-01',minutes:9600,kind:'ACCRUAL'}],expiry:'NONE',carryover:null},leavePolicySourceHash:policyHash});calendar=foundation.calendar;leavePolicy=foundation.leavePolicy;}
  if(calendar.status!=='ACTIVE')await approveTimeFoundation({...reviewer,calendarId:calendar.id,leavePolicyId:leavePolicy!.id,approvalEvidenceHash:policyHash});
  for(const employee of employees){let schedule=await db.hrisWorkSchedule.findFirst({where:{organizationId:org,employeeId:employee.id,calendarId:calendar.id}});if(!schedule)schedule=await assignWorkSchedule({...maker,employeeId:employee.id,calendarId:calendar.id,name:'Synthetic weekday schedule',timezone:'Africa/Douala',effectiveFrom:at('2025-11-01'),effectiveTo:at('2026-10-31'),weeklyPattern:{sun:0,mon:480,tue:480,wed:480,thu:480,fri:480,sat:0},standardWeeklyMinutes:2400,sourceHash:policyHash});if(schedule.status!=='ACTIVE')await approveWorkSchedule({...reviewer,employeeId:employee.id,scheduleId:schedule.id,approvalEvidenceHash:policyHash});}
  return {employees:employees.map(e=>e.id),policyHash};
}

export async function attendanceForPeriod(org:string,periodId:string|null,actors:Record<string,Actor>,out:string,range?:{name:string;periodStart:Date;periodEnd:Date}) {
  const period=periodId ? await db.payrollPeriod.findUniqueOrThrow({where:{id:periodId}}) : range!;
  const employees=await db.payrollEmployee.findMany({where:{organizationId:org,status:'ACTIVE'},orderBy:{employeeNumber:'asc'}});
  const key=`${org}:attendance:${period.name}`;
  if(!await db.hrisTimeImportBatch.findUnique({where:{organizationId_idempotencyKey:{organizationId:org,idempotencyKey:key}}})){
    const entries=[];
    const maxDate=new Date(Math.min(period.periodEnd.getTime(),at('2026-10-28').getTime()));
    for(const employee of employees)for(let d=new Date(period.periodStart);d<=maxDate;d=new Date(d.getTime()+86400000)){
      const minutes=d.getUTCDay()===0||d.getUTCDay()===6?0:480;
      const row={employeeId:employee.id,sourceRecordId:`${employee.id}:${d.toISOString().slice(0,10)}`,workDate:d,scheduledMinutes:minutes,workedMinutes:minutes,overtimeMinutes:0,absenceMinutes:0};
      entries.push({...row,sourceHash:digest(JSON.stringify(row))});
    }
    const bytes=JSON.stringify({classification:'SYNTHETIC_TIME_OBSERVATIONS',entries});
    const file=path.join(out,'synthetic-documents',`${org}-${period.name}-attendance.json`);writeFileSync(file,bytes);
    const command={...actors.payroll_administrator,sourceSystem:'Synthetic 12-month dataset',sourceHash:digest(bytes),idempotencyKey:key,entries};
    const preview=await previewOperationalTime(command);
    if(preview.rows.some(r=>r.issues.length))throw new Error('Attendance preview rejected: '+JSON.stringify(preview.rows.filter(r=>r.issues.length).slice(0,2)));
    await importReviewedOperationalTime({...command,previewHash:preview.payloadHash});
  }
  if(!periodId)return {status:'RAW_OBSERVATIONS_ONLY_NO_SUPPORTED_PAYROLL_PERIOD',employees:employees.length};
  if(period.periodEnd>=at('2026-10-28'))return {status:'CURRENT_PERIOD_PENDING',employees:employees.length};
  for(const employee of employees)if(!await db.payrollAttendanceSnapshot.findFirst({where:{organizationId:org,payrollPeriodId:periodId,employeeId:employee.id}}))await certifyRosterAttendance({...actors.payroll_approver,employeeId:employee.id,payrollPeriodId:periodId,approvalEvidenceHash:digest(key+employee.id)});
  return {status:'CERTIFIED_BY_SERVICE',employees:employees.length};
}
