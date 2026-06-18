import { randomUUID } from "crypto"
import { db } from "@/prisma/db"
import type { LocationDTO } from "@/types/location"
import { LocationType, POSSessionStatus } from "@prisma/client"
import { BusinessRuleError, NotFoundError } from "../_shared/action-errors"
import { MAX_PAGE_SIZES } from "../_shared/pagination"
import type { LocationManagementInput } from "./location.schemas"

export type LocationManagerOption = {
  id: string
  label: string
  email: string
}

export type LocationManagementRow = {
  id: string
  name: string
  code: string
  type: LocationType
  address: string | null
  phone: string | null
  email: string | null
  isActive: boolean
  isDefault: boolean
  allowNegativeStock: boolean
  requiresApproval: boolean
  organizationId: string
  organizationName: string
  managerId: string | null
  managerName: string | null
  managerEmail: string | null
  createdAt: Date
  updatedAt: Date
  inventoryItemsCount: number
  inventoryTransactionsCount: number
  posTerminalsCount: number
  cashDrawersCount: number
  posSessionsCount: number
  activeSessionsCount: number
  salesOrdersCount: number
  purchaseOrdersCount: number
  stockAdjustmentsCount: number
  stockTransfersInCount: number
  stockTransfersOutCount: number
  goodsReceiptsCount: number
  productionBatchesCount: number
  serialNumbersCount: number
  totalStockOnHand: number
  totalStockAvailable: number
  totalStockReserved: number
  totalStockValue: number
  activeSessionSales: number
  activeSessionTransactions: number
}

export type LocationManagementData = {
  locations: LocationManagementRow[]
  managers: LocationManagerOption[]
}

const LOCATION_TYPES = new Set(Object.values(LocationType))

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeCode(value: string) {
  const code = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28)

  return code || `LOC-${randomUUID().slice(0, 8).toUpperCase()}`
}

function toLocationType(value?: LocationType | string | null) {
  return value && LOCATION_TYPES.has(value as LocationType)
    ? (value as LocationType)
    : LocationType.WAREHOUSE
}

function getUserDisplayName(user: { firstName: string | null; lastName: string | null; email: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
}

export async function listLocations(orgId: string): Promise<LocationDTO[]> {
  const locations = await db.location.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { name: "asc" },
    take: MAX_PAGE_SIZES.locations,
  })
  return locations as unknown as LocationDTO[]
}

async function resolveUniqueLocationCode(organizationId: string, proposedCode: string, ignoreLocationId?: string) {
  const baseCode = normalizeCode(proposedCode)
  let code = baseCode
  let index = 1

  while (
    await db.location.findFirst({
      where: {
        organizationId,
        code,
        ...(ignoreLocationId ? { id: { not: ignoreLocationId } } : {}),
      },
      select: { id: true },
    })
  ) {
    code = `${baseCode}-${index}`
    index += 1
  }

  return code
}

export async function getLocationManagementDataForOrg(
  organizationId: string,
): Promise<LocationManagementData> {
  const [locations, managers] = await Promise.all([
    db.location.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      orderBy: [
        { isDefault: "desc" },
        { isActive: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        address: true,
        phone: true,
        email: true,
        isActive: true,
        isDefault: true,
        allowNegativeStock: true,
        requiresApproval: true,
        organizationId: true,
        managerId: true,
        createdAt: true,
        updatedAt: true,
        manager: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            inventoryLevels: true,
            inventoryTransactions: true,
            posStations: true,
            cashDrawers: true,
            posSessions: true,
            salesOrders: true,
            purchaseOrders: true,
            stockAdjustments: true,
            transfersFrom: true,
            transfersTo: true,
            goodsReceipts: true,
            productionBatches: true,
            serialNumbers: true,
          },
        },
      },
    }),
    db.user.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" },
        { email: "asc" },
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
  ])

  const locationIds = locations.map((location) => location.id)

  const [inventorySummaries, activeSessionSummaries] = locationIds.length
    ? await Promise.all([
        db.inventoryLevel.groupBy({
          by: ["locationId"],
          where: { locationId: { in: locationIds } },
          _sum: {
            quantityOnHand: true,
            quantityAvailable: true,
            quantityReserved: true,
            totalValue: true,
          },
        }),
        db.pOSSession.groupBy({
          by: ["locationId"],
          where: {
            locationId: { in: locationIds },
            status: POSSessionStatus.ACTIVE,
          },
          _count: { _all: true },
          _sum: {
            totalSales: true,
            transactionCount: true,
          },
        }),
      ])
    : [[], []]

  const inventoryByLocationId = new Map(
    inventorySummaries.map((summary) => [summary.locationId, summary]),
  )
  const sessionsByLocationId = new Map(
    activeSessionSummaries.map((summary) => [summary.locationId, summary]),
  )

  return {
    managers: managers.map((manager) => ({
      id: manager.id,
      label: getUserDisplayName(manager),
      email: manager.email,
    })),
    locations: locations.map((location) => {
      const inventory = inventoryByLocationId.get(location.id)
      const activeSessions = sessionsByLocationId.get(location.id)

      return {
        id: location.id,
        name: location.name,
        code: location.code,
        type: location.type,
        address: location.address,
        phone: location.phone,
        email: location.email,
        isActive: location.isActive,
        isDefault: location.isDefault,
        allowNegativeStock: location.allowNegativeStock,
        requiresApproval: location.requiresApproval,
        organizationId: location.organizationId,
        organizationName: location.organization.name,
        managerId: location.managerId,
        managerName: location.manager ? getUserDisplayName(location.manager) : null,
        managerEmail: location.manager?.email ?? null,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        inventoryItemsCount: location._count.inventoryLevels,
        inventoryTransactionsCount: location._count.inventoryTransactions,
        posTerminalsCount: location._count.posStations,
        cashDrawersCount: location._count.cashDrawers,
        posSessionsCount: location._count.posSessions,
        activeSessionsCount: activeSessions?._count._all ?? 0,
        salesOrdersCount: location._count.salesOrders,
        purchaseOrdersCount: location._count.purchaseOrders,
        stockAdjustmentsCount: location._count.stockAdjustments,
        stockTransfersInCount: location._count.transfersTo,
        stockTransfersOutCount: location._count.transfersFrom,
        goodsReceiptsCount: location._count.goodsReceipts,
        productionBatchesCount: location._count.productionBatches,
        serialNumbersCount: location._count.serialNumbers,
        totalStockOnHand: Number(inventory?._sum.quantityOnHand ?? 0),
        totalStockAvailable: Number(inventory?._sum.quantityAvailable ?? 0),
        totalStockReserved: Number(inventory?._sum.quantityReserved ?? 0),
        totalStockValue: Number(inventory?._sum.totalValue ?? 0),
        activeSessionSales: Number(activeSessions?._sum.totalSales ?? 0),
        activeSessionTransactions: Number(activeSessions?._sum.transactionCount ?? 0),
      }
    }),
  }
}

async function assertManagerBelongsToOrg(organizationId: string, managerId?: string | null) {
  const cleanedManagerId = cleanText(managerId)

  if (!cleanedManagerId) return null

  const manager = await db.user.findFirst({
    where: {
      id: cleanedManagerId,
      organizationId,
      isActive: true,
    },
    select: { id: true },
  })

  if (!manager) {
    throw new BusinessRuleError("Selected manager does not belong to this organization")
  }

  return manager.id
}

export async function createLocationForManagement(
  organizationId: string,
  input: LocationManagementInput,
): Promise<LocationManagementRow> {
  const name = input.name.trim()
  const now = new Date()
  const managerId = await assertManagerBelongsToOrg(organizationId, input.managerId)
  const code = await resolveUniqueLocationCode(organizationId, input.code || name)

  const location = await db.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.location.updateMany({
        where: { organizationId, deletedAt: null },
        data: { isDefault: false, updatedAt: now },
      })
    }

    return tx.location.create({
      data: {
        id: randomUUID(),
        name,
        code,
        type: toLocationType(input.type),
        address: cleanText(input.address),
        phone: cleanText(input.phone),
        email: cleanText(input.email),
        managerId,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
        allowNegativeStock: input.allowNegativeStock ?? false,
        requiresApproval: input.requiresApproval ?? false,
        organizationId,
        updatedAt: now,
      },
    })
  })

  const refreshed = await getLocationManagementDataForOrg(organizationId)
  const row = refreshed.locations.find((item) => item.id === location.id)

  if (!row) {
    throw new BusinessRuleError("Location was created but could not be reloaded")
  }

  return row
}

export async function updateLocationForManagement(
  organizationId: string,
  locationId: string,
  input: LocationManagementInput,
): Promise<LocationManagementRow> {
  const existingLocation = await db.location.findFirst({
    where: { id: locationId, organizationId, deletedAt: null },
    select: { id: true, code: true },
  })

  if (!existingLocation) {
    throw new NotFoundError("Location not found")
  }

  const name = input.name.trim()
  const now = new Date()
  const managerId = await assertManagerBelongsToOrg(organizationId, input.managerId)
  const code = input.code
    ? await resolveUniqueLocationCode(organizationId, input.code, locationId)
    : existingLocation.code

  await db.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.location.updateMany({
        where: {
          organizationId,
          deletedAt: null,
          id: { not: locationId },
        },
        data: { isDefault: false, updatedAt: now },
      })
    }

    await tx.location.update({
      where: { id: locationId },
      data: {
        name,
        code,
        type: toLocationType(input.type),
        address: cleanText(input.address),
        phone: cleanText(input.phone),
        email: cleanText(input.email),
        managerId,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
        allowNegativeStock: input.allowNegativeStock ?? false,
        requiresApproval: input.requiresApproval ?? false,
        updatedAt: now,
      },
    })
  })

  const refreshed = await getLocationManagementDataForOrg(organizationId)
  const row = refreshed.locations.find((item) => item.id === locationId)

  if (!row) {
    throw new BusinessRuleError("Location was updated but could not be reloaded")
  }

  return row
}

export async function archiveLocationForManagement(
  organizationId: string,
  locationId: string,
): Promise<{ id: string }> {
  const location = await db.location.findFirst({
    where: { id: locationId, organizationId, deletedAt: null },
    select: {
      id: true,
      _count: {
        select: {
          inventoryLevels: true,
          posSessions: true,
          salesOrders: true,
          purchaseOrders: true,
        },
      },
    },
  })

  if (!location) {
    throw new NotFoundError("Location not found")
  }

  if (
    location._count.inventoryLevels > 0 ||
    location._count.posSessions > 0 ||
    location._count.salesOrders > 0 ||
    location._count.purchaseOrders > 0
  ) {
    throw new BusinessRuleError("This location has operational history. Deactivate it instead of archiving.")
  }

  await db.location.update({
    where: { id: locationId },
    data: {
      isActive: false,
      isDefault: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  return { id: locationId }
}
