import 'server-only'
import {z} from 'zod'
import {db} from '@/prisma/db'
import {ForbiddenError,ConflictError,BusinessRuleError,NotFoundError} from '@/services/_shared/action-errors'
import {hasAnyRbacPermission} from '@/lib/security/rbac-permissions'
import {currentHrisActor,selfServiceTransaction,type SelfServiceActor,type SelfServiceClient} from './self-service-boundary.service'
import {lockHrisReviewEmployeeInTx} from './review-lock.service'
import {pendingHrisLifecycleFromMetadata,rejectHrisEmployeeLifecycle,requestHrisEmployeeLifecycle} from './lifecycle.service'
import {taskHash} from './lifecycle-task.contract'
const schema=z.object({taskId:z.string().uuid(),revision:z.number().int().positive(),effectiveAt:z.string().datetime(),reason:z.string().trim().min(8).max(500),acknowledged:z.literal(true),idempotencyKey:z.string().min(8).max(160)}).strict()
/** Reviewed replacement source request; a different actor must approve its new date. */
export async function rescheduleLifecycleTaskSource(actor:SelfServiceActor,raw:unknown,client:SelfServiceClient=db){const input=schema.parse(raw),hash=taskHash({...input,actorId:actor.actorId});return selfServiceTransaction(client,async tx=>{
 const a=await currentHrisActor(tx,actor);if(!['hris.people.manage','hris.tasks.review','hris.tasks.read'].every(p=>hasAnyRbacPermission(a.actorPermissions,[p])))throw new ForbiddenError()
 const ids=await tx.$queryRaw<Array<{employeeId:string}>>`SELECT "employeeId" FROM hris_lifecycle_tasks WHERE id=${input.taskId} AND "organizationId"=${a.organizationId} AND "reviewerId"=${a.actorId}`;if(!ids[0])throw new NotFoundError('Assigned task not found.')
 await lockHrisReviewEmployeeInTx(tx,a.organizationId,ids[0].employeeId)
 const rows=await tx.$queryRaw<Array<{id:string;employeeId:string;requestId:string;reviewerId:string;revision:number;history:any[];sourceState:string}>>`SELECT * FROM hris_lifecycle_tasks WHERE id=${input.taskId} FOR UPDATE`,row=rows[0];if(row.reviewerId!==a.actorId)throw new ForbiddenError()
 const previous=row.history.find(h=>h.key===input.idempotencyKey);if(previous){if(previous.hash!==hash)throw new ConflictError('HRIS_TASK_REPLAY_CONFLICT');return previous.outcome}
 const e=await tx.payrollEmployee.findUniqueOrThrow({where:{id:row.employeeId}}),pending=pendingHrisLifecycleFromMetadata(e.metadata),effectiveAt=new Date(input.effectiveAt)
 if(row.revision!==input.revision||row.sourceState!=='ACTIVE'||!pending||pending.requestId!==row.requestId||pending.status!=='APPROVED')throw new ConflictError('HRIS_TASK_STALE')
 if(!['TERMINATE','OFFBOARD'].includes(pending.type)||new Date(pending.effectiveAt)<=new Date()||effectiveAt<=new Date())throw new BusinessRuleError('Only a future, unapplied departure may be rescheduled.')
 await rejectHrisEmployeeLifecycle({...a,employeeId:e.id,requestId:pending.requestId,decisionReason:input.reason,idempotencyKey:'hr17-reschedule-cancel:'+input.idempotencyKey},tx)
 const next=await requestHrisEmployeeLifecycle({...a,employeeId:e.id,type:pending.type,effectiveAt,reason:input.reason,evidenceHash:'sha256:'+hash,target:pending.target,idempotencyKey:'hr17-reschedule-request:'+input.idempotencyKey},tx)
 const outcome={id:row.id,status:'REPLACEMENT_AWAITING_APPROVAL',requestId:next.workflow.requestId,businessEventId:next.businessEventId,effectiveAt:input.effectiveAt}
 // The rejection hook already retained SOURCE_CANCELLED for every old task.
 const current=await tx.$queryRaw<Array<{history:any[]}>>`SELECT history FROM hris_lifecycle_tasks WHERE id=${row.id}`
 const history=[...current[0].history,{operation:'RESCHEDULE_REQUESTED',at:new Date().toISOString(),actorId:a.actorId,reason:input.reason,key:input.idempotencyKey,hash,outcome}]
 await tx.$executeRaw`UPDATE hris_lifecycle_tasks SET history=${JSON.stringify(history)}::jsonb,revision=revision+1,"updatedAt"=CURRENT_TIMESTAMP WHERE id=${row.id}`
 return outcome
})}
