import type { Prisma } from '@prisma/client'
import { TransactionReferenceType, TransactionType } from '@prisma/client'

export type UpdateInventoryParams = {
  itemId: string
  locationId: string
  deltaQty: number // positive for inbound
  unitCost: number
  organizationId: string
  meta?: {
    notes?: string
    createdById?: string
    referenceType?: 'GOODS_RECEIPT' // kept for future extension
    referenceId?: string
    referenceNumber?: string
    serialNumbers?: string[]
    batchNumber?: string
    expiryDate?: Date
  }
}

type DecimalValue = Prisma.Decimal | number | string | null | undefined

function toNumber(value: DecimalValue) {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return value.toNumber()
}

// Overload 1: legacy positional signature
export async function updateInventoryLevels(
  tx: Prisma.TransactionClient,
  itemId: string,
  locationId: string,
  deltaQty: number,
  unitCost: number,
  organizationId: string,
  meta?: UpdateInventoryParams['meta']
): Promise<void>

// Overload 2: object-based signature
export async function updateInventoryLevels(
  tx: Prisma.TransactionClient,
  params: UpdateInventoryParams
): Promise<void>

// Single implementation backing both overloads
export async function updateInventoryLevels(
  tx: Prisma.TransactionClient,
  a: string | UpdateInventoryParams,
  b?: string,
  c?: number,
  d?: number,
  e?: string,
  f?: UpdateInventoryParams['meta']
): Promise<void> {
  // Normalize arguments to params object
  const params: UpdateInventoryParams =
    typeof a === 'object' && a !== null
      ? a
      : {
          itemId: a as string,
          locationId: b as string,
          deltaQty: c as number,
          unitCost: d as number,
          organizationId: e as string,
          meta: f,
        }

  const {
    itemId,
    locationId,
    deltaQty,
    unitCost,
    organizationId,
    meta = {},
  } = params

  // Fetch current level
  const level = await tx.inventoryLevel.findUnique({
    where: { itemId_locationId: { itemId, locationId } },
  })

  const prevOnHand = toNumber(level?.quantityOnHand)
  const newOnHand = prevOnHand + deltaQty
  if (newOnHand < 0) {
    throw new Error('Inventory on hand would go negative')
  }

  // Weighted average cost
  const prevAvg = toNumber(level?.averageCost)
  const prevValue = prevAvg * prevOnHand
  const inboundValue = unitCost * deltaQty
  const newAvg = newOnHand > 0 ? (prevValue + inboundValue) / newOnHand : 0
  const newTotalValue = newAvg * newOnHand

  // Upsert inventory level
  await tx.inventoryLevel.upsert({
    where: { itemId_locationId: { itemId, locationId } },
    create: {
      itemId,
      locationId,
      quantityOnHand: newOnHand,
      quantityReserved: 0,
      quantityAvailable: newOnHand, // reserved 0 on create
      quantityInTransit: 0,
      quantityOnOrder: 0,
      averageCost: +newAvg.toFixed(4),
      totalValue: +newTotalValue.toFixed(2),
      lastTransactionAt: new Date(),
    },
    update: {
      quantityOnHand: newOnHand,
      quantityAvailable:
        toNumber(level?.quantityReserved) > newOnHand
          ? 0
          : newOnHand - toNumber(level?.quantityReserved),
      averageCost: +newAvg.toFixed(4),
      totalValue: +newTotalValue.toFixed(2),
      lastTransactionAt: new Date(),
    },
  })

  // Create inventory transaction
  await tx.inventoryTransaction.create({
    data: {
      type: TransactionType.PURCHASE_RECEIPT,
      quantity: deltaQty,
      unitCost: unitCost,
      totalCost: +(unitCost * deltaQty).toFixed(2),
      notes: meta.notes,
      itemId,
      locationId,
      organizationId,
      createdById: meta.createdById,
      referenceType: TransactionReferenceType.GOODS_RECEIPT,
      referenceId: meta.referenceId,
      referenceNumber: meta.referenceNumber,
      batchNumber: meta.batchNumber,
      serialNumbers: meta.serialNumbers ?? [],
      expiryDate: meta.expiryDate,
      balanceAfter: newOnHand,
    },
  })
}
