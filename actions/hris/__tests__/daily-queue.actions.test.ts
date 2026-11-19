const ctx={orgId:'org',userId:'actor',permissions:['hris.people.read'],freshAuth:{claims:{userId:'actor',tenantId:'org'}}},options:any[]=[]
jest.mock('@/services/_shared/protect',()=>({protect:(config:any,fn:any)=>async(input:any)=>{options.push(config);return fn(input,ctx)}}))
jest.mock('@/services/hris/daily-queue.service',()=>({getDailyHrisQueue:jest.fn().mockResolvedValue({items:[]})}))
jest.mock('@/services/hris/daily-source.service',()=>({getDailyHrisSource:jest.fn().mockResolvedValue({kind:'TIME',requests:[]})}))
import {getDailyHrisQueueAction,getDailyHrisSourceAction} from '../daily-queue.actions'
import {getDailyHrisQueue} from '@/services/hris/daily-queue.service'
beforeEach(()=>{jest.clearAllMocks();options.length=0;ctx.freshAuth.claims.tenantId='org'})
test('ignores supplied identity and enforces fresh module read',async()=>{await getDailyHrisQueueAction({actorId:'foreign',organizationId:'foreign'});expect(getDailyHrisQueue).toHaveBeenCalledWith({organizationId:'org',actorId:'actor',actorPermissions:ctx.permissions});expect(options[0]).toMatchObject({freshAuth:true,tenantGuard:'handler-derived',module:{mode:'enforce',accessIntent:'read'}})})
test.each([getDailyHrisQueueAction,getDailyHrisSourceAction])('mismatched current tenant fails before source access',async action=>{ctx.freshAuth.claims.tenantId='foreign';await expect(action({})).rejects.toThrow(/Refresh/)})
