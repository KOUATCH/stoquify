import type { Prisma } from '@prisma/client'
import {
  postGoodsReceiptStock,
} from '@/services/inventory/inventory-stock-event.service'
import { BusinessRuleError } from '@/services/_shared/action-errors'

export type UpdateInventoryParams = {
  itemId: string
  locationId: string
  deltaQty: number // positive for inbound
  unitCost: number
  organizationId: string
  meta?: {
    notes?: string
    createdById?: string
    referenceType?: 'GOODS_RECEIPT'
    referenceId?: string
    referenceNumber?: string
    serialNumbers?: string[]
    batchNumber?: string
    expiryDate?: Date
  }
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

  if (meta.referenceType === 'GOODS_RECEIPT') {
    if (!meta.referenceId) {
      throw new BusinessRuleError('Goods receipt inventory updates require an explicit receipt source.')
    }

    await postGoodsReceiptStock(
      {
        organizationId,
        receiptId: meta.referenceId,
        receiptNumber: meta.referenceNumber ?? meta.referenceId,
        receivedById: meta.createdById,
        lines: [
          {
            itemId,
            locationId,
            quantity: deltaQty,
            unitCost,
            notes: meta.notes,
            batchNumber: meta.batchNumber,
            serialNumbers: meta.serialNumbers,
            expiryDate: meta.expiryDate,
          },
        ],
      },
      tx,
    )
    return
  }

  throw new BusinessRuleError(
    'Legacy generic inventory level updates are disabled. Use opening stock, goods receipt, or stock adjustment services.',
  )
}
