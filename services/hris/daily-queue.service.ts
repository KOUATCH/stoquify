import 'server-only'
import {Prisma} from '@prisma/client'
import {db} from '@/prisma/db'
import {hasAnyRbacPermission} from '@/lib/security/rbac-permissions'
import {ForbiddenError} from '@/services/_shared/action-errors'
import {currentHrisActor,type SelfServiceActor} from './self-service-boundary.service'
import {resolveHrisPeopleAccessScope} from './org.service'
import {getHrisApprovalInbox} from './approval-inbox.service'
import {getLifecycleTaskWorkspace} from './lifecycle-task.service'
import {uniqueDailyItems,type DailyQueue,type DailyWorkItem,type QueueKind} from './daily-queue.contract'

// A bounded, current snapshot. No historical-date input, cache or second task ledger.
export async function getDailyHrisQueue(actor:SelfServiceActor,client:typeof db=db):Promise<DailyQueue>{
 return client.$transaction(async tx=>{
  const a=await currentHrisActor(tx,actor),has=(p:string)=>hasAnyRbacPermission(a.actorPermissions,[p])
  if(!has('hris.people.read')&&!has('hris.people.manage'))throw new ForbiddenError()
  const asOf=new Date(),scope=await resolveHrisPeopleAccessScope({...a,asOf,limit:200},tx),ids=scope.employeeIds
  const employeeWhere={organizationId:a.organizationId,deletedAt:null,...(ids===null?{}:{id:{in:ids}})}
  const employees=await tx.payrollEmployee.findMany({where:employeeWhere,select:{id:true,displayName:true,status:true},orderBy:{id:'asc'},take:1001})
  let limited=employees.length>1000
  const visible=employees.slice(0,1000),visibleIds=visible.map(e=>e.id),items:DailyWorkItem[]=[],categories:QueueKind[]=['TIME']
  const names=new Map(visible.map(e=>[e.id,e.displayName]))
  const add=(i:DailyWorkItem)=>{if(names.has(i.employeeId))items.push(i)}
  const time=await tx.hrisTimeRequest.findMany({where:{organizationId:a.organizationId,employeeId:{in:visibleIds},status:'REQUESTED'},select:{id:true,employeeId:true,type:true,requestedAt:true,requestedById:true},orderBy:[{requestedAt:'asc'},{id:'asc'}],take:1001})
  limited ||= time.length>1000
  for(const r of time.slice(0,1000))add({id:'time:'+r.id,kind:'TIME',employeeId:r.employeeId,employeeName:names.get(r.employeeId)!,reason:r.type,owner:'HR_REVIEWER',dueAt:null,openedAt:r.requestedAt.toISOString(),href:'/dashboard/people/work/review?kind=TIME&employeeId='+encodeURIComponent(r.employeeId)+'&itemId='+encodeURIComponent(r.id),actionable:has('hris.people.manage')&&r.requestedById!==a.actorId})
  const cancellations=await tx.hrisTimeRequest.findMany({where:{organizationId:a.organizationId,employeeId:{in:visibleIds},type:'LEAVE',status:'APPROVED',metadata:{path:['cancellation','status'],equals:'REQUESTED'}},select:{id:true,employeeId:true,requestedAt:true},orderBy:{id:'asc'},take:1001})
  limited ||= cancellations.length>1000
  for(const r of cancellations.slice(0,1000))add({id:'cancellation:'+r.id,kind:'TIME',employeeId:r.employeeId,employeeName:names.get(r.employeeId)!,reason:'LEAVE_CANCELLATION',owner:'INDEPENDENT_HR_REVIEWER',dueAt:null,openedAt:r.requestedAt.toISOString(),href:has('hris.people.manage')?'/dashboard/people/leave?employeeId='+encodeURIComponent(r.employeeId)+'&requestId='+encodeURIComponent(r.id):'/dashboard/people/'+encodeURIComponent(r.employeeId),actionable:false})
  const anomalies=await tx.hrisAttendanceAnomaly.findMany({where:{organizationId:a.organizationId,status:'OPEN',OR:[{employeeId:{in:visibleIds}},...(has('hris.people.manage')?[{employeeId:null}]:[])]},select:{id:true,employeeId:true,createdAt:true},orderBy:{id:'asc'},take:1001})
  limited ||= anomalies.length>1000
  for(const r of anomalies.slice(0,1000))items.push({id:'anomaly:'+r.id,kind:'INPUT',employeeId:r.employeeId??'',employeeName:r.employeeId?names.get(r.employeeId)!:'UNASSIGNED',reason:'ATTENDANCE_ANOMALY',owner:'TIME_DATA_OWNER',dueAt:null,openedAt:r.createdAt.toISOString(),href:'/dashboard/people/roster'+(r.employeeId?'?employeeId='+encodeURIComponent(r.employeeId):''),actionable:false})
  if(anomalies.length)categories.push('INPUT')
  if(has('hris.people.manage')){
   categories.push('INPUT','REVIEW','EXPIRY','CORRECTION')
   const approvals=await getHrisApprovalInbox({...a,limit:100},tx,{capacity:1000})
   limited ||= approvals.coverageLimited
   for(const r of approvals.items)add({id:'review:'+r.id,kind:r.readiness.impact==='PAYROLL_INPUT'?'INPUT':'REVIEW',employeeId:r.employee.id,employeeName:r.employee.displayName,reason:r.domain+'_'+r.stage,owner:'INDEPENDENT_HR_REVIEWER',dueAt:null,openedAt:r.requestedAt,href:'/dashboard/people/work/review?kind=REVIEW&employeeId='+encodeURIComponent(r.employee.id)+'&itemId='+encodeURIComponent(r.id),actionable:r.decision.eligible})
   // General source gaps are not a statement of readiness for a payroll period.
   const contracts=await tx.payrollContract.findMany({where:{organizationId:a.organizationId,employeeId:{in:visibleIds},deletedAt:null,status:'ACTIVE'},select:{id:true,employeeId:true,effectiveFrom:true,effectiveTo:true},orderBy:{id:'asc'},take:2001})
   limited ||= contracts.length>2000
   const loaded=contracts.slice(0,2000)
   if(contracts.length<=2000)for(const e of visible.filter(e=>e.status==='ACTIVE'))if(!loaded.some(c=>c.employeeId===e.id&&c.effectiveFrom<=asOf&&(!c.effectiveTo||c.effectiveTo>=asOf)))add({id:'contract-gap:'+e.id,kind:'INPUT',employeeId:e.id,employeeName:e.displayName,reason:'ACTIVE_CONTRACT_MISSING',owner:'HR_ADMINISTRATOR',dueAt:null,openedAt:null,href:'/dashboard/people/'+encodeURIComponent(e.id),actionable:true})
   for(const c of loaded)if(c.effectiveTo&&c.effectiveTo<asOf)add({id:'contract-expiry:'+c.id,kind:'EXPIRY',employeeId:c.employeeId,employeeName:names.get(c.employeeId)!,reason:'CONTRACT_EXPIRED',owner:'HR_ADMINISTRATOR',dueAt:c.effectiveTo.toISOString(),openedAt:null,href:'/dashboard/people/'+encodeURIComponent(c.employeeId),actionable:true})
   const corrections=await tx.$queryRaw<Array<{id:string;employeeId:string;status:string;assignedOwnerId:string;createdAt:Date}>>`SELECT id,"employeeId",status,"assignedOwnerId","createdAt" FROM hris_personal_correction_cases WHERE "organizationId"=${a.organizationId} AND "employeeId"=ANY(${visibleIds}::text[]) AND status IN ('REQUESTED','RETURNED') ORDER BY "createdAt",id LIMIT 1001`
   limited ||= corrections.length>1000
   for(const c of corrections.slice(0,1000))add({id:'correction:'+c.id,kind:'CORRECTION',employeeId:c.employeeId,employeeName:names.get(c.employeeId)!,reason:'CORRECTION_'+c.status,owner:c.status==='RETURNED'?'EMPLOYEE':'ASSIGNED_REVIEWER',dueAt:null,openedAt:c.createdAt.toISOString(),href:'/dashboard/people/corrections?caseId='+encodeURIComponent(c.id),actionable:c.status==='REQUESTED'&&c.assignedOwnerId===a.actorId})
  }
  if(has('hris.documents.read')){
   if(!categories.includes('EXPIRY'))categories.push('EXPIRY')
   const own=await tx.payrollEmployee.findMany({where:{organizationId:a.organizationId,userId:a.actorId,deletedAt:null},select:{id:true},take:2})
   if(own.length>1)throw new ForbiddenError('Employee mapping requires resolution.')
   const ownId=has('hris.self_service.read')?own[0]?.id??null:null
   const docs=await tx.$queryRaw<Array<{id:string;employeeId:string;expiresAt:Date}>>`SELECT id,"employeeId","expiresAt" FROM hris_employee_documents WHERE "organizationId"=${a.organizationId} AND "employeeId"=ANY(${visibleIds}::text[]) AND ("employeeId" IS DISTINCT FROM ${ownId} OR "employeeVisible"=true) AND status='AVAILABLE' AND "expiresAt"<${asOf} ORDER BY "expiresAt",id LIMIT 1001`
   limited ||= docs.length>1000
   for(const d of docs.slice(0,1000))add({id:'document-expiry:'+d.id,kind:'EXPIRY',employeeId:d.employeeId,employeeName:names.get(d.employeeId)!,reason:'DOCUMENT_EXPIRED',owner:'DOCUMENT_REVIEWER',dueAt:d.expiresAt.toISOString(),openedAt:null,href:'/dashboard/people/documents?employeeId='+encodeURIComponent(d.employeeId)+'&documentId='+encodeURIComponent(d.id),actionable:false})
  }
  if(has('hris.tasks.read')){
   categories.push('TASK');const tasks=await getLifecycleTaskWorkspace(a,tx);limited ||= tasks.truncated
   for(const t of tasks.tasks)if(t.sourceState==='ACTIVE'&&!['COMPLETED','CANCELLED'].includes(t.status))add({id:'task:'+t.id,kind:'TASK',employeeId:t.employeeId,employeeName:t.employeeName,reason:'TASK_'+t.code,owner:t.status==='AWAITING_REVIEW'?t.reviewerName:t.ownerName,dueAt:t.dueAt,openedAt:null,href:'/dashboard/people/tasks',actionable:t.canWork||t.canReview||t.canReassign})
  }
  return {scopeKey:a.organizationId+':'+a.actorId,asOf:asOf.toISOString(),items:uniqueDailyItems(items),employees:visible,coverageLimited:limited,categories:[...new Set(categories)],inputReadiness:'PERIOD_SELECTION_REQUIRED',notifications:'SOURCE_WORKSPACES_ONLY'}
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,maxWait:15000,timeout:30000})
}
