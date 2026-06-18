import { randomUUID } from "crypto"
import { db } from "@/prisma/db"
import { Prisma, UnitType } from "@prisma/client"
import type { Unit as UnitModel } from "@prisma/client"
import type { UnitDTO } from "@/types/unit"
import { BusinessRuleError, ConflictError, NotFoundError } from "../_shared/action-errors"
import { MAX_PAGE_SIZES } from "../_shared/pagination"
import type { UnitCreateInput, UnitManagementInput, UnitUpdateInput } from "./unit.schemas"

export type UnitManagementRow = {
  id: string
  organizationId: string
  organizationName: string
  name: string
  nameEn: string
  nameFr: string | null
  symbol: string
  type: UnitType
  baseUnit: string | null
  conversionRate: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  itemsCount: number
  activeItemsCount: number
}

export type UnitManagementData = {
  units: UnitManagementRow[]
}

export type UnitRemovalResult = {
  id: string
  mode: "deactivated"
}

const UNIT_TYPES = new Set(Object.values(UnitType))

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toUnitType(value?: UnitType | string | null) {
  return value && UNIT_TYPES.has(value as UnitType)
    ? (value as UnitType)
    : UnitType.QUANTITY
}

/**
 * Map a Prisma `Unit` row to the API `UnitDTO`. `conversionRate` is a
 * Prisma Decimal; serialize to string for transport to avoid precision loss at
 * server/client boundaries.
 */
function toDTO(row: UnitModel): UnitDTO {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.nameEn,
    nameEn: row.nameEn,
    nameFr: row.nameFr,
    symbol: row.symbol,
    type: row.type,
    baseUnit: row.baseUnit,
    conversionRate: row.conversionRate ? row.conversionRate.toString() : null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listUnits(orgId: string): Promise<UnitDTO[]> {
  const units = await db.unit.findMany({
    where: { organizationId: orgId },
    orderBy: { nameEn: "asc" },
    take: MAX_PAGE_SIZES.units,
  })
  return units.map(toDTO)
}

export async function getUnit(orgId: string, id: string): Promise<UnitDTO | null> {
  const unit = await db.unit.findFirst({
    where: { id, organizationId: orgId },
  })
  return unit ? toDTO(unit) : null
}

async function assertUniqueUnitIdentity(
  orgId: string,
  input: Pick<UnitCreateInput, "nameEn" | "symbol">,
  ignoreUnitId?: string,
) {
  const conflict = await db.unit.findFirst({
    where: {
      organizationId: orgId,
      ...(ignoreUnitId ? { id: { not: ignoreUnitId } } : {}),
      OR: [{ nameEn: input.nameEn }, { symbol: input.symbol }],
    },
    select: { id: true, nameEn: true, symbol: true },
  })

  if (!conflict) return

  const reason =
    conflict.nameEn === input.nameEn
      ? `Unit name "${input.nameEn}" already exists for this organisation`
      : `Unit symbol "${input.symbol}" already exists for this organisation`

  throw new ConflictError(reason)
}

export async function createUnit(orgId: string, input: UnitCreateInput): Promise<UnitDTO> {
  await assertUniqueUnitIdentity(orgId, input)

  const now = new Date()
  const unit = await db.unit.create({
    data: {
      id: randomUUID(),
      organizationId: orgId,
      nameEn: input.nameEn.trim(),
      nameFr: cleanText(input.nameFr),
      symbol: input.symbol.trim(),
      type: toUnitType(input.type),
      baseUnit: cleanText(input.baseUnit),
      conversionRate:
        input.conversionRate !== null && input.conversionRate !== undefined
          ? new Prisma.Decimal(input.conversionRate)
          : null,
      isActive: input.isActive ?? true,
      updatedAt: now,
    },
  })
  return toDTO(unit)
}

export async function updateUnit(
  orgId: string,
  id: string,
  input: UnitUpdateInput,
): Promise<UnitDTO> {
  const existing = await db.unit.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, nameEn: true, symbol: true },
  })
  if (!existing) throw new NotFoundError("Unit not found")

  const candidate = {
    nameEn: input.nameEn ?? existing.nameEn,
    symbol: input.symbol ?? existing.symbol,
  }

  if (input.nameEn || input.symbol) {
    await assertUniqueUnitIdentity(orgId, candidate, id)
  }

  const updated = await db.unit.update({
    where: { id },
    data: {
      ...(input.nameEn !== undefined ? { nameEn: input.nameEn.trim() } : {}),
      ...(input.nameFr !== undefined ? { nameFr: cleanText(input.nameFr) } : {}),
      ...(input.symbol !== undefined ? { symbol: input.symbol.trim() } : {}),
      ...(input.type !== undefined ? { type: toUnitType(input.type) } : {}),
      ...(input.baseUnit !== undefined ? { baseUnit: cleanText(input.baseUnit) } : {}),
      ...(input.conversionRate !== undefined
        ? {
            conversionRate:
              input.conversionRate !== null
                ? new Prisma.Decimal(input.conversionRate)
                : null,
          }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    },
  })
  return toDTO(updated)
}

export async function deleteUnit(orgId: string, id: string): Promise<UnitDTO> {
  const existing = await db.unit.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  })
  if (!existing) throw new NotFoundError("Unit not found")

  const deactivated = await db.unit.update({
    where: { id },
    data: { isActive: false, updatedAt: new Date() },
  })
  return toDTO(deactivated)
}

export async function getUnitManagementDataForOrg(
  organizationId: string,
): Promise<UnitManagementData> {
  const units = await db.unit.findMany({
    where: { organizationId },
    orderBy: [
      { isActive: "desc" },
      { type: "asc" },
      { nameEn: "asc" },
    ],
    select: {
      id: true,
      organizationId: true,
      nameEn: true,
      nameFr: true,
      symbol: true,
      type: true,
      baseUnit: true,
      conversionRate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: { name: true },
      },
      _count: {
        select: { items: true },
      },
    },
  })

  const unitIds = units.map((unit) => unit.id)
  const activeItemCounts = unitIds.length
    ? await db.item.groupBy({
        by: ["unitId"],
        where: {
          organizationId,
          unitId: { in: unitIds },
          deletedAt: null,
          isActive: true,
        },
        _count: { _all: true },
      })
    : []

  const activeItemsByUnitId = new Map<string, number>()
  activeItemCounts.forEach((summary) => {
    if (summary.unitId) {
      activeItemsByUnitId.set(summary.unitId, summary._count._all)
    }
  })

  return {
    units: units.map((unit) => ({
      id: unit.id,
      organizationId: unit.organizationId,
      organizationName: unit.organization.name,
      name: unit.nameEn,
      nameEn: unit.nameEn,
      nameFr: unit.nameFr,
      symbol: unit.symbol,
      type: unit.type,
      baseUnit: unit.baseUnit,
      conversionRate: unit.conversionRate ? unit.conversionRate.toString() : null,
      isActive: unit.isActive,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
      itemsCount: unit._count.items,
      activeItemsCount: activeItemsByUnitId.get(unit.id) ?? 0,
    })),
  }
}

async function reloadUnitManagementRow(organizationId: string, unitId: string) {
  const data = await getUnitManagementDataForOrg(organizationId)
  return data.units.find((unit) => unit.id === unitId) ?? null
}

export async function createUnitForManagement(
  organizationId: string,
  input: UnitManagementInput,
): Promise<UnitManagementRow> {
  const unit = await createUnit(organizationId, input)
  const row = await reloadUnitManagementRow(organizationId, unit.id)

  if (!row) {
    throw new BusinessRuleError("Unit was created but could not be reloaded")
  }

  return row
}

export async function updateUnitForManagement(
  organizationId: string,
  unitId: string,
  input: UnitManagementInput,
): Promise<UnitManagementRow> {
  await updateUnit(organizationId, unitId, input)
  const row = await reloadUnitManagementRow(organizationId, unitId)

  if (!row) {
    throw new BusinessRuleError("Unit was updated but could not be reloaded")
  }

  return row
}

export async function removeUnitForManagement(
  organizationId: string,
  unitId: string,
): Promise<UnitRemovalResult> {
  const unit = await db.unit.findFirst({
    where: { id: unitId, organizationId },
    select: { id: true },
  })

  if (!unit) {
    throw new NotFoundError("Unit not found")
  }

  await db.unit.update({
    where: { id: unitId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  })

  return { id: unitId, mode: "deactivated" }
}
