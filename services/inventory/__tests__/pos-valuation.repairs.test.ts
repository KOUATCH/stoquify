import { Prisma } from '@prisma/client'
import { postPOSStockIssue, postPOSStockReturn } from '../inventory-stock-event.service'
import { recordBusinessEventInTx } from '@/services/events/business-event.service'
jest.mock('@/services/accounting/periods.service', () => ({ getOpenPeriodForDate: jest.fn(async () => ({ id: 'period' })) }))
jest.mock('@/services/accounting/posting.service', () => ({ createLedgerPostingBatch: jest.fn() }))
jest.mock('../inventory-close-invalidation.service', () => ({ recordInventoryValuationCloseInvalidationInTx: jest.fn() }))
jest.mock('@/services/purchase-order/receipt-recognition-source', () => ({ readReceiptRecognitionSource: jest.fn() }))
jest.mock('@/services/purchasing/receipt-return-recognition', () => ({ validateReceiptReturnStockAllocationInTx: jest.fn() }))
jest.mock('@/services/events/business-event.service', () => ({
  hashBusinessPayload: jest.fn(() => 'hash'), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn(),
}))
const d = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v)
let level: any, tx: any, movements: any[]
const issue = (quantity: Prisma.Decimal.Value, saleId = 'sale') => ({ organizationId: 'org', saleId, orderNumber: saleId, locationId: 'location', actorId: 'cashier', lines: [{ itemId: 'item', quantity, unitCost: '100.01' }] })
beforeEach(() => {
  jest.clearAllMocks()
  movements = []
  level = { id: 'level', version: 1, quantityOnHand: d(3), quantityAvailable: d(3), quantityReserved: d(0), totalValue: d('300.02'), averageCost: d('100.01') }
  tx = {
    item: { findFirst: jest.fn(async () => ({ id: 'item', sku: 'item', trackInventory: true, costPrice: d('100.01') })) },
    location: { findFirst: jest.fn(async () => ({ id: 'location', allowNegativeStock: false })) },
    inventoryLevel: { findUnique: jest.fn(async () => level), updateMany: jest.fn(async ({ data }) => { level = { ...level, ...data, version: level.version + 1 }; return { count: 1 } }) },
    inventoryTransaction: { create: jest.fn(async ({ data }) => { const movement = { id: `movement-${movements.length}`, ...data }; movements.push(movement); return movement }), findMany: jest.fn(async () => movements.filter(m => m.type === 'SALE')) },
    auditLog: { create: jest.fn() },
  }
  ;(recordBusinessEventInTx as jest.Mock).mockResolvedValue({ created: true, event: { id: 'event' } })
})
it('consumes 300.02 rather than 300.03 at final depletion', async () => {
  const result = await postPOSStockIssue(issue(3), tx)
  expect(result.totalCost.toFixed(2)).toBe('300.02')
  expect(movements[0].totalCost.toFixed(2)).toBe('300.02')
  expect(level.totalValue.toFixed(2)).toBe('0.00')
})
it('conserves the retained pool across partial and final sales despite a stale nominal cost', async () => {
  const costs = []
  for (const [index, qty] of ['0.300', '0.700', '2.000'].entries()) costs.push((await postPOSStockIssue(issue(qty, `sale-${index}`), tx)).totalCost)
  expect(costs.reduce((sum, cost) => sum.plus(cost), d(0)).toFixed(2)).toBe('300.02')
  expect(level.quantityOnHand.toFixed(3)).toBe('0.000')
  expect(level.totalValue.toFixed(2)).toBe('0.00')
})
it.each(['REFUND', 'VOID'] as const)('restores the exact original allocation for %s', async correctionType => {
  movements.push({ id: 'original', type: 'SALE', itemId: 'item', locationId: 'location', organizationId: 'org', quantity: d(-3), totalCost: d('300.02') })
  level = { ...level, quantityOnHand: d(0), quantityAvailable: d(0), totalValue: d(0), averageCost: d(0) }
  const result = await postPOSStockReturn({ ...issue(3), correctionType, reason: 'Full reversal' }, tx)
  expect(result.totalCost.toFixed(2)).toBe('300.02')
  expect(level.totalValue.toFixed(2)).toBe('300.02')
  expect(movements[1].reversalOfTransactionId).toBe('original')
  expect(tx.inventoryTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org', referenceId: 'sale', locationId: 'location', type: 'SALE' }) }))
})
it('does not synthesize a return value when original quantity evidence disagrees', async () => {
  movements.push({ id: 'original', type: 'SALE', itemId: 'item', quantity: d(-2), totalCost: d(200) })
  await expect(postPOSStockReturn({ ...issue(3), correctionType: 'REFUND', reason: 'Mismatch' }, tx)).rejects.toMatchObject({ code: 'REVIEW_REQUIRED' })
  expect(tx.inventoryLevel.updateMany).not.toHaveBeenCalled()
})
it('retains stock concurrency denial without recording a movement', async () => {
  tx.inventoryLevel.updateMany.mockResolvedValue({ count: 0 })
  await expect(postPOSStockIssue(issue(3), tx)).rejects.toThrow('changed')
  expect(tx.inventoryTransaction.create).not.toHaveBeenCalled()
})
it('does not apply stock again for an already applied event', async () => {
  ;(recordBusinessEventInTx as jest.Mock).mockResolvedValue({ created: false, event: { id: 'existing', status: 'APPLIED' } })
  expect((await postPOSStockIssue(issue(3), tx)).replayed).toBe(true)
  expect(tx.inventoryLevel.updateMany).not.toHaveBeenCalled()
})
it('does not change the existing negative-stock valuation policy', async () => {
  tx.location.findFirst.mockResolvedValue({ id: 'location', allowNegativeStock: true })
  const result = await postPOSStockIssue(issue(4), tx)
  expect(result.totalCost.toFixed(2)).toBe('400.04')
  expect(level.totalValue.toFixed(2)).toBe('0.00')
})
