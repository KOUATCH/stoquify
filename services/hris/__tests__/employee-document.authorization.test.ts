import {requireDocumentActor} from '../employee-document.authorization'
import {requireFreshAuth} from '@/lib/security/auth-session'
import {requireAnyPermission} from '@/lib/security/rbac'
import {observeModuleAccess} from '@/services/modules/module-entitlement.service'
jest.mock('@/lib/security/auth-session',()=>({requireFreshAuth:jest.fn()}))
jest.mock('@/lib/security/rbac',()=>({requireAnyPermission:jest.fn()}))
jest.mock('@/services/modules/module-entitlement.service',()=>({observeModuleAccess:jest.fn()}))
beforeEach(()=>{jest.clearAllMocks();(requireFreshAuth as jest.Mock).mockResolvedValue({claims:{userId:'u',tenantId:'o'}});(requireAnyPermission as jest.Mock).mockResolvedValue({userId:'u',orgId:'o',permissions:['hris.self_service.read']});(observeModuleAccess as jest.Mock).mockResolvedValue({allowed:true})})
test('fresh server identity and enforce entitlement gate precede document owner',async()=>{expect(await requireDocumentActor(false)).toEqual({organizationId:'o',actorId:'u',actorPermissions:['hris.self_service.read']});expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({mode:'enforce',organizationId:'o',accessIntent:'read'}))})
test.each([{userId:'other',tenantId:'o'},{userId:'u',tenantId:'other'}])('mismatched fresh claims denied: %j',async claims=>{(requireFreshAuth as jest.Mock).mockResolvedValue({claims});await expect(requireDocumentActor(true)).rejects.toThrow();expect(observeModuleAccess).not.toHaveBeenCalled()})
test('missing module access denied',async()=>{(observeModuleAccess as jest.Mock).mockResolvedValue({allowed:false});await expect(requireDocumentActor(false)).rejects.toThrow()})
test('revoked/expired session denied before permission lookup',async()=>{(requireFreshAuth as jest.Mock).mockRejectedValue(Error('revoked'));await expect(requireDocumentActor(false)).rejects.toThrow('revoked');expect(requireAnyPermission).not.toHaveBeenCalled()})
