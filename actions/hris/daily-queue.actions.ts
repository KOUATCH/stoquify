'use server'
import {protect} from '@/services/_shared/protect'
import {ForbiddenError} from '@/services/_shared/action-errors'
import {getDailyHrisSource} from '@/services/hris/daily-source.service'
import {getDailyHrisQueue} from '@/services/hris/daily-queue.service'
const read=protect<unknown,Awaited<ReturnType<typeof getDailyHrisQueue>>>({permission:'hris.people.read',freshAuth:true,tenantGuard:'handler-derived',module:{moduleSlug:'payroll',surface:'hris.daily.queue',accessIntent:'read',mode:'enforce'}},async(_input,ctx)=>{
 if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError('Refresh your session.')
 return getDailyHrisQueue({organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions})
})
export async function getDailyHrisQueueAction(input:unknown={}){return read(input)}

const source=protect<unknown,Awaited<ReturnType<typeof getDailyHrisSource>>>({permission:'hris.people.read',freshAuth:true,tenantGuard:'handler-derived',module:{moduleSlug:'payroll',surface:'hris.daily.source',accessIntent:'read',mode:'enforce'}},async(input,ctx)=>{if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError('Refresh your session.');return getDailyHrisSource({organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions},input)})
export async function getDailyHrisSourceAction(input:unknown){return source(input)}
