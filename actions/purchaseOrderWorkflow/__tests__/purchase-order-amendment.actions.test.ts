import { previewPurchaseOrderAmendment, confirmPurchaseOrderAmendment } from '../purchase-order-amendment.actions'
import { requirePermission } from '@/lib/security/rbac'
import { requireSession } from '@/lib/security/auth-session'
import { getPurchaseOrderAmendmentPreview, applyPurchaseOrderAmendment } from '@/services/purchase-order/purchase-order-amendment.service'
import { BusinessRuleError } from '@/services/_shared/action-errors'
import { revalidateTag } from 'next/cache'
jest.mock('@/lib/security/rbac',()=>({requirePermission:jest.fn()}))
jest.mock('@/lib/security/auth-session',()=>({requireSession:jest.fn()}))
jest.mock('@/services/purchase-order/purchase-order-amendment.service',()=>({getPurchaseOrderAmendmentPreview:jest.fn(),applyPurchaseOrderAmendment:jest.fn()}))
jest.mock('next/cache',()=>({revalidateTag:jest.fn(),revalidatePath:jest.fn()}))
const command={orderId:'po',proposalId:'proposal',expectedRevision:'a'.repeat(64),idempotencyKey:'request-001'},scope={organizationId:'org',actorId:'approver',sessionId:'session',sessionToken:'private-token'}
beforeEach(()=>{jest.clearAllMocks();(requirePermission as jest.Mock).mockResolvedValue({orgId:'org',userId:'approver'});(requireSession as jest.Mock).mockResolvedValue({claims:{tenantId:'org',userId:'approver',sessionId:'session',sessionToken:'private-token'}});(applyPurchaseOrderAmendment as jest.Mock).mockResolvedValue({orderId:'po',requestReference:'request-001'});(getPurchaseOrderAmendmentPreview as jest.Mock).mockResolvedValue({orderId:'po'})})
it('uses only the server identity for preview and application',async()=>{expect((await previewPurchaseOrderAmendment({orderId:'po',proposalId:'proposal'})).success).toBe(true);expect(getPurchaseOrderAmendmentPreview).toHaveBeenCalledWith({orderId:'po',proposalId:'proposal'},scope);expect((await confirmPurchaseOrderAmendment(command)).success).toBe(true);expect(applyPurchaseOrderAmendment).toHaveBeenCalledWith(command,scope)})
it('rejects mismatched session identity before the service call',async()=>{(requireSession as jest.Mock).mockResolvedValue({claims:{tenantId:'other',userId:'approver'}});expect((await confirmPurchaseOrderAmendment(command)).success).toBe(false);expect(applyPurchaseOrderAmendment).not.toHaveBeenCalled()})
it('rejects attempted caller authority fields',async()=>{expect((await confirmPurchaseOrderAmendment({...command,organizationId:'foreign'} as typeof command)).success).toBe(false);expect(applyPurchaseOrderAmendment).not.toHaveBeenCalled()})
it('retains the domain obligation explanation',async()=>{(applyPurchaseOrderAmendment as jest.Mock).mockRejectedValue(new BusinessRuleError('Keep received obligations.','RETAINED_OBLIGATIONS'));expect(await confirmPurchaseOrderAmendment(command)).toMatchObject({success:false,code:'RETAINED_OBLIGATIONS'})})
it('returns committed evidence despite cache invalidation failure',async()=>{(revalidateTag as jest.Mock).mockImplementationOnce(()=>{throw Error('Cache unavailable')});expect(await confirmPurchaseOrderAmendment(command)).toMatchObject({success:true,data:{requestReference:'request-001'}})})
