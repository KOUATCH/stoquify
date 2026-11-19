import 'server-only'
import {z} from 'zod'
import {Prisma} from '@prisma/client'
import {db} from '@/prisma/db'
import {currentHrisActor,type SelfServiceActor} from './self-service-boundary.service'
import {getHrisApprovalInbox} from './approval-inbox.service'
import {getManagedOperationalTimeInbox} from './operational-time.service'
import {hasAnyRbacPermission} from '@/lib/security/rbac-permissions'
import {ForbiddenError} from '@/services/_shared/action-errors'
const selection=z.object({kind:z.enum(['TIME','REVIEW']),employeeId:z.string().min(1).max(200),itemId:z.string().min(1).max(300)}).strict()
export async function getDailyHrisSource(actor:SelfServiceActor,raw:unknown,client:typeof db=db){const input=selection.parse(raw);return client.$transaction(async tx=>{
 const a=await currentHrisActor(tx,actor)
 if(input.kind==='TIME'){
  const result=await getManagedOperationalTimeInbox({...a,employeeId:input.employeeId,limit:1},tx,{requestId:input.itemId})
  return {kind:'TIME' as const,requests:result.requests.filter(r=>r.employeeId===input.employeeId).map(r=>({...r,periodStart:r.periodStart.toISOString(),periodEnd:r.periodEnd.toISOString(),requestedAt:r.requestedAt.toISOString()}))}
 }
 if(!hasAnyRbacPermission(a.actorPermissions,['hris.people.manage']))throw new ForbiddenError()
 const result=await getHrisApprovalInbox({...a,limit:100},tx,{capacity:1000,employeeId:input.employeeId}),items=result.items.filter(i=>i.id===input.itemId)
 const summary={...result.summary,visiblePending:items.length,returned:items.length,review:items.filter(i=>i.stage==='REVIEW').length,apply:items.filter(i=>i.stage==='APPLY').length,actionable:items.filter(i=>i.decision.eligible).length,selfApprovalBlocked:items.filter(i=>!i.decision.eligible).length,byDomain:Object.fromEntries(Object.keys(result.summary.byDomain).map(k=>[k,items.filter(i=>i.domain===k).length])) as typeof result.summary.byDomain}
 return {kind:'REVIEW' as const,inbox:{...result,items,summary,readiness:{...result.readiness,status:items.length?'BLOCKED' as const:'READY' as const,blockerCount:items.length,blockerCodes:[...new Set(items.map(i=>i.readiness.blockerCode))]}}}
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,maxWait:15000,timeout:30000})}
