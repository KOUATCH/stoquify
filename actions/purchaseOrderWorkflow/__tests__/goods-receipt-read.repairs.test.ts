import { getGoodsReceiptsForPurchaseOrder, getPurchaseOrdersSummary } from '../GoodsReceiptAndSummary'
import { requirePermission } from '@/lib/security/rbac'
import { observeModuleAccess } from '@/services/modules/module-entitlement.service'
import { getGoodsReceipts, getSummary } from '@/services/purchase-order/purchase-order.service'

jest.mock('@/lib/security/rbac', () => ({ requirePermission: jest.fn() }))
jest.mock('@/services/modules/module-entitlement.service', () => ({ observeModuleAccess: jest.fn() }))
jest.mock('@/services/purchase-order/purchase-order.service', () => ({ getGoodsReceipts: jest.fn(), getSummary: jest.fn() }))

beforeEach(() => {
  jest.resetAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: 'org', userId: 'reader', permissions: ['purchases.orders.read'] })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(getGoodsReceipts as jest.Mock).mockResolvedValue([])
  ;(getSummary as jest.Mock).mockResolvedValue({ totalOrders: 1, statusBreakdown: { completed: 1 }, totalValue: '12.34', overdueOrders: 0 })
})

const readers = [() => getGoodsReceiptsForPurchaseOrder('po', 'org'), () => getPurchaseOrdersSummary('org')]
it.each(readers)('denies a module read denial before any business query', async read => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  await expect(read()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  expect(getGoodsReceipts).not.toHaveBeenCalled()
  expect(getSummary).not.toHaveBeenCalled()
})
it.each(readers)('fails closed when current module authority cannot be read', async read => {
  ;(observeModuleAccess as jest.Mock).mockRejectedValue(new Error('authority unavailable'))
  await expect(read()).rejects.toThrow('authority unavailable')
  expect(getGoodsReceipts).not.toHaveBeenCalled()
  expect(getSummary).not.toHaveBeenCalled()
})
it('rejects a foreign tenant before looking up the module', async () => {
  await expect(getGoodsReceiptsForPurchaseOrder('po', 'foreign')).rejects.toThrow('organization')
  expect(observeModuleAccess).not.toHaveBeenCalled()
  expect(getGoodsReceipts).not.toHaveBeenCalled()
})
it('uses the current reader identity and preserves allowed read-only access and DTOs', async () => {
  expect(await getGoodsReceiptsForPurchaseOrder('po', 'org')).toEqual([])
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org', userId: 'reader', actorPermissions: ['purchases.orders.read'], moduleSlug: 'purchasing', accessIntent: 'read', mode: 'enforce' }))
  expect(getGoodsReceipts).toHaveBeenCalledWith('po', 'org')
  expect(await getPurchaseOrdersSummary('org')).toMatchObject({ totalValue: 12.34, statusBreakdown: { closed: 1 } })
})
it('does not query business data after permission revocation', async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new Error('revoked'))
  await expect(readers[0]()).rejects.toThrow('revoked')
  expect(observeModuleAccess).not.toHaveBeenCalled()
  expect(getGoodsReceipts).not.toHaveBeenCalled()
})
