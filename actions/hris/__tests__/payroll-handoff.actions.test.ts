const ctx={orgId:'org',userId:'actor',permissions:['hris.handoff.read'],freshAuth:{claims:{userId:'actor',tenantId:'org'}}},options:any[]=[]
jest.mock('@/services/_shared/protect',()=>({protect:(config:any,fn:any)=>async(input:any)=>{options.push(config);return fn(input,ctx)}}))
jest.mock('@/services/hris/payroll-handoff.service',()=>({getPayrollHandoffWorkspace:jest.fn().mockResolvedValue({}),previewPayrollHandoff:jest.fn().mockResolvedValue({}),issuePayrollHandoff:jest.fn().mockResolvedValue({}),getPayrollHandoffPackage:jest.fn().mockResolvedValue({}),acknowledgePayrollHandoff:jest.fn().mockResolvedValue({})}))
import * as actions from '../payroll-handoff.actions'
import * as service from '@/services/hris/payroll-handoff.service'
const entries=[['getPayrollHandoffWorkspaceAction','getPayrollHandoffWorkspace','hris.handoff.read','read'],['previewPayrollHandoffAction','previewPayrollHandoff','hris.handoff.read','read'],['issuePayrollHandoffAction','issuePayrollHandoff','hris.handoff.export','write'],['getPayrollHandoffPackageAction','getPayrollHandoffPackage','hris.handoff.read','read'],['acknowledgePayrollHandoffAction','acknowledgePayrollHandoff','hris.handoff.receive','write']] as const
beforeEach(()=>{jest.clearAllMocks();options.length=0;ctx.freshAuth.claims.tenantId='org';ctx.freshAuth.claims.userId='actor';(service.getPayrollHandoffPackage as jest.Mock).mockResolvedValue({csvBytes:'\uFEFFretained,csv'})})
test.each(entries)('%s derives actor and enforces current module boundary',async(name,fn,permission,intent)=>{await actions[name]({actorId:'forged',organizationId:'foreign'});expect((service[fn] as jest.Mock).mock.calls[0][0]).toEqual({organizationId:'org',actorId:'actor',actorPermissions:ctx.permissions});expect(options[0]).toMatchObject({permission,freshAuth:true,tenantGuard:'handler-derived',module:{moduleSlug:'payroll',mode:'enforce',accessIntent:intent}})})
test.each(entries)('%s rejects stale tenant before service',async(name,fn)=>{ctx.freshAuth.claims.tenantId='foreign';await expect(actions[name]({})).rejects.toThrow(/Refresh/);expect(service[fn]).not.toHaveBeenCalled()})

test.each(['\uFEFF',''])('retained CSV transport preserves exact long UTF-8 bytes with marker %j',async marker=>{
 const csv=marker+'"Employé","Référence"\r\n'+('"Éléonore","Nom, ""cité"""\r\n').repeat(100)
 ;(service.getPayrollHandoffPackage as jest.Mock).mockResolvedValueOnce({id:'retained',csvBytes:csv,csvHash:'retained-hash',manifestBytes:'{"original":true}'})
 const value=await actions.getPayrollHandoffPackageAction({packageId:'retained'}) as any
 expect(value.csvBytes).toBeUndefined();expect(Buffer.from(value.csvBase64,'base64')).toEqual(Buffer.from(csv,'utf8'));expect(value.csvHash).toBe('retained-hash');expect(value.manifestBytes).toBe('{"original":true}')
})
