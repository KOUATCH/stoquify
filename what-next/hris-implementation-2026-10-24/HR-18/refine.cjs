const fs=require('node:fs');function edit(file,from,to){let s=fs.readFileSync(file,'utf8');if(!s.includes(from))throw Error(file+' missing anchor');fs.writeFileSync(file,s.replace(from,()=>to))}
edit('actions/hris/daily-queue.actions.ts',"permission:['hris.people.read','hris.people.manage']","permission:'hris.people.read'");
edit('actions/hris/daily-queue.actions.ts',"import {getDailyHrisQueue}","import {getDailyHrisSource} from '@/services/hris/daily-source.service'\nimport {getDailyHrisQueue}");
fs.appendFileSync('actions/hris/daily-queue.actions.ts',`\nconst source=protect<unknown,Awaited<ReturnType<typeof getDailyHrisSource>>>({permission:'hris.people.read',freshAuth:true,tenantGuard:'handler-derived',module:{moduleSlug:'payroll',surface:'hris.daily.source',accessIntent:'read',mode:'enforce'}},async(input,ctx)=>{if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError('Refresh your session.');return getDailyHrisSource({organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions},input)})\nexport async function getDailyHrisSourceAction(input:unknown){return source(input)}\n`);
edit('app/[locale]/(dashboard)/dashboard/people/work/review/page.tsx','import {HrisApprovalInbox}','import {HrisApprovalInboxView}');edit('app/[locale]/(dashboard)/dashboard/people/work/review/page.tsx','<HrisApprovalInbox locale=','<HrisApprovalInboxView locale=');
edit('services/hris/daily-queue.service.ts',"href:'/dashboard/people/team'","href:'/dashboard/people/work/review?kind=TIME&employeeId='+encodeURIComponent(r.employeeId)+'&itemId='+encodeURIComponent(r.id)");
edit('services/hris/daily-queue.service.ts','href:r.reviewHref',"href:'/dashboard/people/work/review?kind=REVIEW&employeeId='+encodeURIComponent(r.employee.id)+'&itemId='+encodeURIComponent(r.id)");
edit('services/hris/daily-queue.service.ts',"t.status==='SUBMITTED'","t.status==='AWAITING_REVIEW'");
edit('services/hris/daily-queue.service.ts',"  if(has('hris.people.manage')){",`  const cancellations=await tx.hrisTimeRequest.findMany({where:{organizationId:a.organizationId,employeeId:{in:visibleIds},type:'LEAVE',status:'APPROVED',metadata:{path:['cancellation','status'],equals:'REQUESTED'}},select:{id:true,employeeId:true,requestedAt:true},orderBy:{id:'asc'},take:1001})
  limited ||= cancellations.length>1000
  for(const r of cancellations.slice(0,1000))add({id:'cancellation:'+r.id,kind:'TIME',employeeId:r.employeeId,employeeName:names.get(r.employeeId)!,reason:'LEAVE_CANCELLATION',owner:'INDEPENDENT_HR_REVIEWER',dueAt:null,openedAt:r.requestedAt.toISOString(),href:has('hris.people.manage')?'/dashboard/people/leave?employeeId='+encodeURIComponent(r.employeeId)+'&requestId='+encodeURIComponent(r.id):'/dashboard/people/'+encodeURIComponent(r.employeeId),actionable:false})
  const anomalies=await tx.hrisAttendanceAnomaly.findMany({where:{organizationId:a.organizationId,status:'OPEN',OR:[{employeeId:{in:visibleIds}},...(has('hris.people.manage')?[{employeeId:null}]:[])]},select:{id:true,employeeId:true,createdAt:true},orderBy:{id:'asc'},take:1001})
  limited ||= anomalies.length>1000
  for(const r of anomalies.slice(0,1000))items.push({id:'anomaly:'+r.id,kind:'INPUT',employeeId:r.employeeId??'',employeeName:r.employeeId?names.get(r.employeeId)!:'UNASSIGNED',reason:'ATTENDANCE_ANOMALY',owner:'TIME_DATA_OWNER',dueAt:null,openedAt:r.createdAt.toISOString(),href:'/dashboard/people/roster'+(r.employeeId?'?employeeId='+encodeURIComponent(r.employeeId):''),actionable:false})
  if(anomalies.length)categories.push('INPUT')
  if(has('hris.people.manage')){`);
edit('services/hris/daily-queue.service.ts',"   const docs=await",`   const own=await tx.payrollEmployee.findMany({where:{organizationId:a.organizationId,userId:a.actorId,deletedAt:null},select:{id:true},take:2})
   if(own.length>1)throw new ForbiddenError('Employee mapping requires resolution.')
   const ownId=has('hris.self_service.read')?own[0]?.id??null:null
   const docs=await`);
edit('services/hris/daily-queue.service.ts',"AND status='AVAILABLE' AND",`AND (\"employeeId\" IS DISTINCT FROM ${ownId} OR \"employeeVisible\"=true) AND status='AVAILABLE' AND`);
edit('services/hris/daily-queue.service.ts','coverageLimited:limited,categories,','coverageLimited:limited,categories:[...new Set(categories)],');
