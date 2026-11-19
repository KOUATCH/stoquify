import { randomUUID } from 'node:crypto'
import { db } from '@/prisma/db'
import { postPOSStockIssue, postPOSStockReturn, postInventoryReservation, postInventoryReservationBatch } from '../inventory-stock-event.service'

function target() {
  const url = new URL(process.env.DATABASE_URL ?? '')
  if (process.env.RUN_WORKFLOW_REPAIR_POSTGRES !== '1' || process.env.REPAIR_DISPOSABLE_DATABASE !== 'stoquify_local_pos_repairs_20261026_a19f'
    || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/stoquify_local_pos_repairs_20261026_a19f' || url.searchParams.get('schema') !== 'public') throw new Error('Explicit owned disposable database required')
}
beforeAll(target)
afterAll(async () => { await db.$disconnect() })
async function fixture() {
  target()
  const suffix = randomUUID(), organizationId = `repair-${suffix}`, actorId = `actor-${suffix}`, itemId = `item-${suffix}`, locationId = `location-${suffix}`
  await db.organization.create({ data: { id: organizationId, name: 'Disposable stock repair', slug: organizationId, currency: 'XAF' } })
  await db.user.create({ data: { id: actorId, email: `${suffix}@repair.invalid`, organizationId, firstName: 'Fixture', lastName: 'Operator', mfaBackupCodes: [] } })
  await db.location.create({ data: { id: locationId, organizationId, name: 'Fixture store', code: suffix, type: 'STORE', allowNegativeStock: false } })
  await db.item.create({ data: { id: itemId, organizationId, slug: suffix, sku: suffix, nameEn: 'Fixture item', imageUrls: [], trackInventory: true, costPrice: '100.01', sellingPrice: 150 } })
  await db.inventoryLevel.create({ data: { itemId, locationId, quantityOnHand: 3, quantityAvailable: 3, averageCost: '100.01', totalValue: '300.02' } })
  const year = new Date().getUTCFullYear()
  const fy = await db.fiscalYear.create({ data: { organizationId, name: 'Fixture year', startDate: new Date(Date.UTC(year, 0, 1)), endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) } })
  const period = await db.accountingPeriod.create({ data: { organizationId, fiscalYearId: fy.id, name: 'Fixture period', periodNumber: 1, startDate: fy.startDate, endDate: fy.endDate } })
  return { organizationId, actorId, itemId, locationId, period }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
const command = (f: Fixture, quantity: string | number = 3, saleId = 'sale') => ({ organizationId: f.organizationId, actorId: f.actorId, locationId: f.locationId, saleId, orderNumber: saleId, lines: [{ itemId: f.itemId, quantity, unitCost: '100.01' }] })
async function snapshot(f: Fixture) {
  const level = await db.inventoryLevel.findUniqueOrThrow({ where: { itemId_locationId: { itemId: f.itemId, locationId: f.locationId } } })
  return { quantity: level.quantityOnHand.toFixed(3), value: level.totalValue.toFixed(2), reserved: level.quantityReserved.toFixed(3), available: level.quantityAvailable.toFixed(3), movements: await db.inventoryTransaction.count({ where: { organizationId: f.organizationId } }), events: await db.businessEvent.count({ where: { organizationId: f.organizationId } }) }
}
it.each(['REFUND', 'VOID'] as const)('conserves exact depletion and original-value %s in real transactions', async correctionType => {
  const f = await fixture(), input = command(f)
  expect((await postPOSStockIssue(input)).totalCost.toFixed(2)).toBe('300.02')
  expect(await snapshot(f)).toMatchObject({ quantity: '0.000', value: '0.00', movements: 1, events: 1 })
  expect((await postPOSStockIssue(input)).replayed).toBe(true)
  const result = await postPOSStockReturn({ ...input, correctionType, reason: 'Full source reversal' })
  expect(result.totalCost.toFixed(2)).toBe('300.02')
  expect(await snapshot(f)).toMatchObject({ quantity: '3.000', value: '300.02', movements: 2, events: 2 })
  const returned = await db.inventoryTransaction.findFirstOrThrow({ where: { organizationId: f.organizationId, type: 'SALES_RETURN' } })
  expect(returned.reversalOfTransactionId).toBeTruthy()
  expect((await postPOSStockReturn({ ...input, correctionType, reason: 'Full source reversal' })).replayed).toBe(true)
  expect((await snapshot(f)).movements).toBe(2)
})
it('conserves fractional issues through final depletion', async () => {
  const f = await fixture()
  for (const [i, q] of ['0.300', '0.700', '2.000'].entries()) await postPOSStockIssue(command(f, q, `sale-${i}`))
  const movements = await db.inventoryTransaction.findMany({ where: { organizationId: f.organizationId } })
  expect(movements.reduce((sum, m) => sum + Number(m.totalCost.toFixed(2)), 0)).toBeCloseTo(300.02, 8)
  expect(await snapshot(f)).toMatchObject({ quantity: '0.000', value: '0.00', movements: 3 })
})
it('rejects changed-payload replay and foreign-tenant stock before any additional effect', async () => {
  const f = await fixture(), input = command(f, 1)
  await postPOSStockIssue(input)
  const before = await snapshot(f)
  await expect(postPOSStockIssue({ ...input, lines: [{ ...input.lines[0], quantity: 2 }] })).rejects.toThrow()
  const other = await fixture()
  await expect(postPOSStockIssue({ ...command(other), lines: [{ ...input.lines[0], quantity: 1 }] })).rejects.toThrow()
  expect(await snapshot(f)).toEqual(before)
  expect((await snapshot(other)).movements).toBe(0)
})
it('rolls back stock, event and movement when its enclosing transaction fails', async () => {
  const f = await fixture(), before = await snapshot(f)
  await expect(db.$transaction(async tx => { await postPOSStockIssue(command(f), tx); throw new Error('injected after stock') })).rejects.toThrow('injected after stock')
  expect(await snapshot(f)).toEqual(before)
})
it('allows one concurrent last-stock issue and preserves the exact pool', async () => {
  const f = await fixture()
  const results = await Promise.allSettled([postPOSStockIssue(command(f, 3, 'first')), postPOSStockIssue(command(f, 3, 'second'))])
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  expect(await snapshot(f)).toMatchObject({ quantity: '0.000', value: '0.00', movements: 1, events: 1 })
  expect((await db.inventoryTransaction.findFirstOrThrow({ where: { organizationId: f.organizationId } })).totalCost.toFixed(2)).toBe('300.02')
})
it('blocks closed-period stock without persisted events', async () => {
  const f = await fixture(), before = await snapshot(f)
  // Synthetic closed-state fixture, not certification of the period-close approval workflow.
  await db.$transaction(async tx => {
    const closedAt = new Date()
    const event = await tx.periodControlEvent.create({ data: {
      organizationId: f.organizationId, periodId: f.period.id, version: 1,
      operation: 'CLOSE', fromStatus: 'OPEN', toStatus: 'CLOSED', actorId: f.actorId,
      reason: 'Synthetic closed-period stock denial fixture', idempotencyKey: 'fixture-close',
      sourceRevision: '0', approval: { fixture: true }, createdAt: closedAt,
    } })
    await tx.accountingPeriod.update({ where: { id: f.period.id }, data: {
      status: 'CLOSED', controlVersion: 1, lastControlEventId: event.id,
      closedAt, lockedAt: closedAt, closedById: f.actorId,
    } })
  })
  await expect(postPOSStockIssue(command(f))).rejects.toThrow()
  expect(await snapshot(f)).toEqual(before)
})

const reservation = (f: Fixture, idempotencyKey = 'reserve-one') => ({ organizationId: f.organizationId, actorId: f.actorId, itemId: f.itemId, locationId: f.locationId, quantity: 1, reason: 'Owned intent', idempotencyKey })
it('rejects a reservation without a retained identity before any write', async () => {
  const f = await fixture(), before = await snapshot(f)
  await expect(postInventoryReservation({ ...reservation(f), idempotencyKey: undefined } as any)).rejects.toThrow()
  expect(await snapshot(f)).toEqual(before)
})
it('replays the same reservation and denies changed quantity, reason and actor', async () => {
  const f = await fixture(), input = reservation(f)
  await postInventoryReservation(input)
  const before = await snapshot(f)
  expect((await postInventoryReservation(input)).replayed).toBe(true)
  for (const change of [{ quantity: 2 }, { reason: 'Changed' }, { actorId: 'different-actor' }]) await expect(postInventoryReservation({ ...input, ...change })).rejects.toThrow()
  expect(await snapshot(f)).toEqual(before)
})
it('rolls back the whole reservation batch when a later line has insufficient stock', async () => {
  const f = await fixture(), before = await snapshot(f), input = reservation(f)
  await expect(postInventoryReservationBatch({ ...input, lines: [{ itemId: f.itemId, locationId: f.locationId, quantity: 1 }, { itemId: f.itemId, locationId: f.locationId, quantity: 3 }] })).rejects.toThrow()
  expect(await snapshot(f)).toEqual(before)
})
it('retains one atomic batch identity and rejects changed line membership', async () => {
  const f = await fixture(), input = { ...reservation(f), lines: [{ itemId: f.itemId, locationId: f.locationId, quantity: 1 }, { itemId: f.itemId, locationId: f.locationId, quantity: 1 }] }
  await postInventoryReservationBatch(input)
  expect(await snapshot(f)).toMatchObject({ reserved: '2.000', available: '1.000', quantity: '3.000', value: '300.02', movements: 2, events: 1 })
  const before = await snapshot(f)
  expect((await postInventoryReservationBatch(input)).replayed).toBe(true)
  await expect(postInventoryReservationBatch({ ...input, lines: input.lines.slice(0, 1) })).rejects.toThrow()
  expect(await snapshot(f)).toEqual(before)
})
it('allows only one competing reservation of the last available stock', async () => {
  const f = await fixture()
  const results = await Promise.allSettled(['reserve-a', 'reserve-b'].map(key => postInventoryReservation({ ...reservation(f, key), quantity: 3 })))
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  expect(await snapshot(f)).toMatchObject({ reserved: '3.000', available: '0.000', quantity: '3.000', value: '300.02', movements: 1, events: 1 })
})
