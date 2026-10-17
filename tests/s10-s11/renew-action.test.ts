jest.mock('@/lib/security/rbac', () => ({ requirePermission: jest.fn() }))
jest.mock('@/services/pos/checkout.service', () => ({ renewPOSCheckout: jest.fn() }))
import { requirePermission } from '@/lib/security/rbac'
import { renewPOSCheckout } from '@/services/pos/checkout.service'
import { renewPOSCheckoutAction } from '@/actions/pos/checkout.actions'
const input = { sessionId: 'session', terminalId: 'terminal', locationId: 'location', checkoutLeaseId: '00000000-0000-4000-8000-000000000001' }
beforeEach(() => { jest.resetAllMocks(); (requirePermission as jest.Mock).mockResolvedValue({ orgId: 'trusted-org', userId: 'trusted-user' }) })
it('derives identity from current permission check and strips forged client identity', async () => {
  expect((await renewPOSCheckoutAction({ ...input, organizationId: 'forged', userId: 'forged' })).success).toBe(true)
  expect(requirePermission).toHaveBeenCalledWith('pos.use', { resource: 'POSSession', resourceId: 'session' })
  expect(renewPOSCheckout).toHaveBeenCalledWith({ ...input, organizationId: 'trusted-org', userId: 'trusted-user' })
})
it('never renews when authority is denied or revoked', async () => {
  (requirePermission as jest.Mock).mockRejectedValue(new Error('denied'))
  expect((await renewPOSCheckoutAction(input)).success).toBe(false)
  expect(renewPOSCheckout).not.toHaveBeenCalled()
})
it('rejects malformed lease input before accessing the service', async () => {
  expect((await renewPOSCheckoutAction({ ...input, checkoutLeaseId: 'invalid' })).success).toBe(false)
  expect(renewPOSCheckout).not.toHaveBeenCalled()
})
