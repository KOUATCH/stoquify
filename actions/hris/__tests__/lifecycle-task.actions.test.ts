const context={orgId:'org',userId:'actor',permissions:['hris.tasks.read'],freshAuth:{claims:{userId:'actor',tenantId:'org'}}},options:any[]=[]
jest.mock('next/cache',()=>({revalidatePath:jest.fn()}))
jest.mock('@/services/_shared/protect',()=>({protect:(config:any,fn:any)=>async(input:any)=>{options.push(config);return fn(input,context)}}))
jest.mock('@/services/hris/lifecycle-task.service',()=>({getLifecycleTaskWorkspace:jest.fn().mockResolvedValue({tasks:[]}),decideLifecycleTask:jest.fn().mockResolvedValue({status:'AWAITING_REVIEW'})}))
jest.mock('@/services/hris/lifecycle-task-reschedule.service',()=>({rescheduleLifecycleTaskSource:jest.fn().mockResolvedValue({status:'REPLACEMENT_AWAITING_APPROVAL'})}))
import {getLifecycleTaskWorkspaceAction,decideLifecycleTaskAction,rescheduleLifecycleTaskSourceAction} from '../lifecycle-task.actions'
import {getLifecycleTaskWorkspace,decideLifecycleTask} from '@/services/hris/lifecycle-task.service'
import {rescheduleLifecycleTaskSource} from '@/services/hris/lifecycle-task-reschedule.service'
import {revalidatePath} from 'next/cache'
beforeEach(()=>{jest.clearAllMocks();options.length=0;context.freshAuth.claims={userId:'actor',tenantId:'org'}})
test.each([[decideLifecycleTaskAction,decideLifecycleTask],[rescheduleLifecycleTaskSourceAction,rescheduleLifecycleTaskSource]] as const)('mutations separate authenticated identity and enforce fresh module access',async(action,owner)=>{const input={organizationId:'forged',actorId:'forged'};await action(input);expect(owner).toHaveBeenCalledWith({organizationId:'org',actorId:'actor',actorPermissions:context.permissions},input);expect(options[0]).toMatchObject({permission:'hris.tasks.read',freshAuth:true,module:{mode:'enforce',accessIntent:'write'}})})
test('read ignores supplied identity; mismatched current claims fail before access',async()=>{await getLifecycleTaskWorkspaceAction({actorId:'other'});expect(getLifecycleTaskWorkspace).toHaveBeenCalledWith({organizationId:'org',actorId:'actor',actorPermissions:context.permissions});context.freshAuth.claims.tenantId='foreign';await expect(decideLifecycleTaskAction({})).rejects.toThrow(/Refresh/);expect(decideLifecycleTask).not.toHaveBeenCalled()})
test('postcommit route invalidation cannot hide a recorded task outcome',async()=>{(revalidatePath as jest.Mock).mockImplementationOnce(()=>{throw Error('refresh failed')});expect(await decideLifecycleTaskAction({})).toEqual({status:'AWAITING_REVIEW'})})
