"use server"
import {revalidatePath} from 'next/cache'
import {protect} from '@/services/_shared/protect'
import {ForbiddenError} from '@/services/_shared/action-errors'
import {getLifecycleTaskWorkspace,decideLifecycleTask} from '@/services/hris/lifecycle-task.service'
import {rescheduleLifecycleTaskSource} from '@/services/hris/lifecycle-task-reschedule.service'
import type {SelfServiceActor} from '@/services/hris/self-service-boundary.service'
function boundary<T>(write:boolean,fn:(a:SelfServiceActor,input:unknown)=>Promise<T>){return protect<unknown,T>({permission:'hris.tasks.read',freshAuth:true,tenantGuard:'handler-derived',module:{moduleSlug:'payroll',surface:'hris.lifecycle.tasks',accessIntent:write?'write':'read',mode:'enforce'}},async(input,ctx)=>{if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError('Refresh your session.');const result=await fn({organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions},input);if(write)try{revalidatePath('/[locale]/dashboard/people/tasks','page')}catch{/* Preserve recorded outcome. */}return result})}
const read=boundary(false,a=>getLifecycleTaskWorkspace(a)),decide=boundary(true,decideLifecycleTask),reschedule=boundary(true,rescheduleLifecycleTaskSource)
export async function getLifecycleTaskWorkspaceAction(input:unknown={}){return read(input)}
export async function decideLifecycleTaskAction(input:unknown){return decide(input)}
export async function rescheduleLifecycleTaskSourceAction(input:unknown){return reschedule(input)}
