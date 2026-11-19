import {executeWorkspaceSetupAction, getWorkspaceSetupAction} from '../workspace-setup.actions'
import {executeWorkspaceSetup, getWorkspaceSetup} from '@/services/hris/workspace-setup.service'
const context = {orgId: 'trusted-org', userId: 'trusted-user', permissions: ['hris.people.read'], freshAuth: {claims: {userId: 'trusted-user', tenantId: 'trusted-org'}}}
const options: any[] = []
jest.mock('@/services/_shared/protect',()=>({protect:(settings: any,handler: any)=>{return async(input: unknown)=>{options.push(settings);return handler(input,context)}}}))
jest.mock('@/services/hris/workspace-setup.service',()=>({executeWorkspaceSetup:jest.fn().mockResolvedValue({saved:true}),getWorkspaceSetup:jest.fn().mockResolvedValue({canManage:false})}))
jest.mock('next/cache',()=>({revalidatePath:jest.fn()}))
beforeEach(()=>{jest.clearAllMocks();options.length=0;context.freshAuth.claims.tenantId='trusted-org'})
test('action derives identity from fresh server context and requires explicit module enforcement',async()=>{
  const input={operation:'TIME_DECISION',data:{organizationId:'forged-org',actorId:'forged-user'}}
  await executeWorkspaceSetupAction(input)
  expect(executeWorkspaceSetup).toHaveBeenCalledWith({organizationId:'trusted-org',actorId:'trusted-user',actorPermissions:['hris.people.read']},input)
  expect(options[0]).toMatchObject({permission:'hris.people.read',freshAuth:true,tenantGuard:'handler-derived',module:{mode:'enforce',accessIntent:'write'}})
})
test('changed authentication tenant fails before service',async()=>{context.freshAuth.claims.tenantId='other';await expect(executeWorkspaceSetupAction({})).rejects.toThrow('session changed');expect(executeWorkspaceSetup).not.toHaveBeenCalled()})
test('read does not accept client actor input',async()=>{await getWorkspaceSetupAction();expect(getWorkspaceSetup).toHaveBeenCalledWith({organizationId:'trusted-org',actorId:'trusted-user',actorPermissions:['hris.people.read']})})
