import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"

import {
  rebuildInventoryProjectionInputSchema,
  type RebuildInventoryProjectionInput,
} from "./inventory-event.schemas"

type DbClient = Prisma.TransactionClient | typeof db

export type InventoryProjectionDriftType =
  | "MISSING_LEVEL"
  | "QUANTITY_DRIFT"
  | "VALUE_DRIFT"
  | "AVERAGE_COST_DRIFT"

export type InventoryProjectionDrift = {
  type: InventoryProjectionDriftType
  itemId: string
  locationId: string
  expected: {
    quantityOnHand: string
    totalValue: string
    averageCost: string
  }
  actual?: {
    quantityOnHand: string
    totalValue: string
    averageCost: string
  }
}

export type InventoryProjectionRebuildResult = {
  organizationId: string
  asOf: string
  projectionHash: string
  driftCount: number
  drifts: InventoryProjectionDrift[]
  projections: Array<{
    itemId: string
    locationId: string
    quantityOnHand: string
    totalValue: string
    averageCost: string
  }>
}

function decimal(value: Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined) return new Prisma.Decimal(0)
  return new Prisma.Decimal(value)
}

function key(itemId: string, locationId: string) {
  return `${itemId}:${locationId}`
}

function signedMovementValue(transaction: {
  quantity: Prisma.Decimal
  totalCost: Prisma.Decimal
  unitCost: Prisma.Decimal
}) {
  const quantity = decimal(transaction.quantity)
  const totalCost = decimal(transaction.totalCost)
  const fallbackValue = decimal(transaction.unitCost).times(quantity.abs()).toDecimalPlaces(2)
  const absoluteValue = totalCost.gt(0) ? totalCost : fallbackValue

  return quantity.lt(0) ? absoluteValue.times(-1).toDecimalPlaces(2) : absoluteValue.toDecimalPlaces(2)
}

function formatQuantity(value: Prisma.Decimal) {
  return value.toDecimalPlaces(3).toFixed(3)
}

function formatMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2)
}

export async function rebuildInventoryProjection(
  input: RebuildInventoryProjectionInput,
  client: DbClient = db,
): Promise<InventoryProjectionRebuildResult> {
  const parsed = rebuildInventoryProjectionInputSchema.parse(input)
  const asOf = parsed.asOf ?? new Date()
  const toleranceQuantity = decimal(parsed.toleranceQuantity ?? "0.000")
  const toleranceValue = decimal(parsed.toleranceValue ?? "0.00")

  const [transactions, levels] = await Promise.all([
    client.inventoryTransaction.findMany({
      where: {
        organizationId: parsed.organizationId,
        createdAt: { lte: asOf },
        ...(parsed.itemId ? { itemId: parsed.itemId } : {}),
        ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        itemId: true,
        locationId: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
      },
    }),
    client.inventoryLevel.findMany({
      where: {
        item: { organizationId: parsed.organizationId },
        location: { organizationId: parsed.organizationId },
        ...(parsed.itemId ? { itemId: parsed.itemId } : {}),
        ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
      },
      select: {
        itemId: true,
        locationId: true,
        quantityOnHand: true,
        averageCost: true,
        totalValue: true,
      },
    }),
  ])

  const projectionsByKey = new Map<
    string,
    {
      itemId: string
      locationId: string
      quantityOnHand: Prisma.Decimal
      totalValue: Prisma.Decimal
    }
  >()

  for (const transaction of transactions) {
    const current =
      projectionsByKey.get(key(transaction.itemId, transaction.locationId)) ??
      {
        itemId: transaction.itemId,
        locationId: transaction.locationId,
        quantityOnHand: new Prisma.Decimal(0),
        totalValue: new Prisma.Decimal(0),
      }

    current.quantityOnHand = current.quantityOnHand.plus(transaction.quantity).toDecimalPlaces(3)
    current.totalValue = current.totalValue.plus(signedMovementValue(transaction)).toDecimalPlaces(2)
    projectionsByKey.set(key(transaction.itemId, transaction.locationId), current)
  }

  const levelsByKey = new Map(levels.map((level) => [key(level.itemId, level.locationId), level]))
  const drifts: InventoryProjectionDrift[] = []
  const projections = Array.from(projectionsByKey.values())
    .map((projection) => {
      const averageCost = projection.quantityOnHand.gt(0)
        ? projection.totalValue.div(projection.quantityOnHand).toDecimalPlaces(2)
        : new Prisma.Decimal(0)
      const actual = levelsByKey.get(key(projection.itemId, projection.locationId))
      const expectedShape = {
        quantityOnHand: formatQuantity(projection.quantityOnHand),
        totalValue: formatMoney(projection.totalValue),
        averageCost: formatMoney(averageCost),
      }

      if (!actual) {
        drifts.push({
          type: "MISSING_LEVEL",
          itemId: projection.itemId,
          locationId: projection.locationId,
          expected: expectedShape,
        })
      } else {
        const actualQuantity = decimal(actual.quantityOnHand).toDecimalPlaces(3)
        const actualValue = decimal(actual.totalValue).toDecimalPlaces(2)
        const actualAverageCost = decimal(actual.averageCost).toDecimalPlaces(2)
        const actualShape = {
          quantityOnHand: formatQuantity(actualQuantity),
          totalValue: formatMoney(actualValue),
          averageCost: formatMoney(actualAverageCost),
        }

        if (projection.quantityOnHand.minus(actualQuantity).abs().gt(toleranceQuantity)) {
          drifts.push({
            type: "QUANTITY_DRIFT",
            itemId: projection.itemId,
            locationId: projection.locationId,
            expected: expectedShape,
            actual: actualShape,
          })
        }

        if (projection.totalValue.minus(actualValue).abs().gt(toleranceValue)) {
          drifts.push({
            type: "VALUE_DRIFT",
            itemId: projection.itemId,
            locationId: projection.locationId,
            expected: expectedShape,
            actual: actualShape,
          })
        }

        if (averageCost.minus(actualAverageCost).abs().gt(toleranceValue)) {
          drifts.push({
            type: "AVERAGE_COST_DRIFT",
            itemId: projection.itemId,
            locationId: projection.locationId,
            expected: expectedShape,
            actual: actualShape,
          })
        }
      }

      return {
        itemId: projection.itemId,
        locationId: projection.locationId,
        ...expectedShape,
      }
    })
    .sort((left, right) =>
      `${left.itemId}:${left.locationId}`.localeCompare(`${right.itemId}:${right.locationId}`),
    )

  return {
    organizationId: parsed.organizationId,
    asOf: asOf.toISOString(),
    projectionHash: `sha256:${hashBusinessPayload({ asOf, projections })}`,
    driftCount: drifts.length,
    drifts,
    projections,
  }
}
