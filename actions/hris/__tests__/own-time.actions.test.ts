const context={orgId:'tenant',userId:'actor',permissions:['hris.self_service.request','hris.people.manage'],freshAuth:{claims:{userId:'actor',tenantId:'tenant'}}},options:any[]=[]
jest.mock('next/cache',()=>({revalidatePath:jest.fn()}))
jest.mock('@/services/_shared/protect',()=>({protect:(config:any,fn:any)=>async(input:any)=>{options.push(config);return fn(input,context)}}))
jest.mock('@/services/hris/self-service-boundary.service',()=>({requestOwnOperationalTime:jest.fn().mockResolvedValue({id:'own'}),cancelOwnLeaveRequest:jest.fn().mockResolvedValue({id:'own'})}))
import {requestOwnOperationalTimeAction,cancelOwnLeaveRequestAction} from '../own-time.actions'
import {requestOwnOperationalTime,cancelOwnLeaveRequest} from '@/services/hris/self-service-boundary.service'
import {revalidatePath} from 'next/cache'
beforeEach(()=>{jest.clearAllMocks();options.length=0;context.freshAuth.claims={userId:'actor',tenantId:'tenant'}})
test.each([[requestOwnOperationalTimeAction,requestOwnOperationalTime],[cancelOwnLeaveRequestAction,cancelOwnLeaveRequest]] as const)('own action supplies separate server identity and enforces current module/freshness',async(action,owner)=>{const payload={employeeId:'foreign',actorId:'forged',actorPermissions:['*']};await action(payload);expect(owner).toHaveBeenCalledWith({organizationId:'tenant',actorId:'actor',actorPermissions:context.permissions},payload);expect(options[0]).toMatchObject({permission:'hris.self_service.request',freshAuth:true,module:{mode:'enforce'}})})
test('mismatched fresh claims fail before own source writes',async()=>{context.freshAuth.claims.tenantId='other';await expect(requestOwnOperationalTimeAction({})).rejects.toThrow(/Refresh/);expect(requestOwnOperationalTime).not.toHaveBeenCalled()})
test('revalidation failure cannot hide a recorded request',async()=>{(revalidatePath as jest.Mock).mockImplementationOnce(()=>{throw Error('revalidation failed')});expect(await requestOwnOperationalTimeAction({})).toEqual({id:'own'})})
