import { randomUUID } from "crypto"
import { db } from "@/prisma/db"
import { Prisma, TaxType } from "@prisma/client"
import type { TaxRate as TaxRateModel } from "@prisma/client"
import type { TaxRateDTO } from "@/types/taxRates"
import { MAX_PAGE_SIZES } from "../_shared/pagination"
import type {
  TaxRateCreateInput,
  TaxRateManagementInput,
  TaxRateUpdateInput,
} from "./tax-rate.schemas"

export type TaxRateManagementRow = {
  id: string
  organizationId: string
  organizationName: string
  taxRateName: string
  name: string
  nameEn: string
  nameFr: string | null
  rate: string
  rateNumber: number
  type: TaxType
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  itemsCount: number
  activeItemsCount: number
}

export type TaxRateManagementData = {
  taxRates: TaxRateManagementRow[]
}

export type TaxRateRemovalResult = {
  id: string
  mode: "deleted" | "deactivated"
}

const TAX_TYPES = new Set(Object.values(TaxType))

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toTaxType(value?: TaxType | string | null) {
  return value && TAX_TYPES.has(value as TaxType)
    ? (value as TaxType)
    : TaxType.SALES
}

function toRateNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  return value.toNumber()
}

function toDTO(row: TaxRateModel): TaxRateDTO {
  const rate = row.rate.toString()

  return {
    id: row.id,
    organizationId: row.organizationId,
    taxRateName: row.nameEn,
    name: row.nameEn,
    nameEn: row.nameEn,
    nameFr: row.nameFr,
    rate,
    type: row.type,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function assertUniqueTaxRateName(
  orgId: string,
  nameEn: string,
  ignoreTaxRateId?: string,
) {
  const conflict = await db.taxRate.findFirst({
    where: {
      organizationId: orgId,
      nameEn,
      ...(ignoreTaxRateId ? { id: { not: ignoreTaxRateId } } : {}),
    },
    select: { id: true },
  })

  if (conflict) {
    throw new Error(`Tax rate "${nameEn}" already exists for this organisation`)
  }
}

export async function listTaxRates(orgId: string): Promise<TaxRateDTO[]> {
  const rows = await db.taxRate.findMany({
    where: { organizationId: orgId },
    orderBy: { nameEn: "asc" },
    take: MAX_PAGE_SIZES.taxRates,
  })
  return rows.map(toDTO)
}

export async function getTaxRate(orgId: string, id: string): Promise<TaxRateDTO | null> {
  const row = await db.taxRate.findFirst({ where: { id, organizationId: orgId } })
  return row ? toDTO(row) : null
}

export async function createTaxRate(
  orgId: string,
  input: TaxRateCreateInput,
): Promise<TaxRateDTO> {
  const nameEn = input.nameEn.trim()
  await assertUniqueTaxRateName(orgId, nameEn)

  const row = await db.taxRate.create({
    data: {
      id: randomUUID(),
      organizationId: orgId,
      nameEn,
      nameFr: cleanText(input.nameFr),
      rate: new Prisma.Decimal(input.rate),
      type: toTaxType(input.type),
      isActive: input.isActive ?? true,
      updatedAt: new Date(),
    },
  })
  return toDTO(row)
}

export async function updateTaxRate(
  orgId: string,
  id: string,
  input: TaxRateUpdateInput,
): Promise<TaxRateDTO> {
  const existing = await db.taxRate.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, nameEn: true },
  })
  if (!existing) throw new Error("Tax rate not found")

  if (input.nameEn && input.nameEn !== existing.nameEn) {
    await assertUniqueTaxRateName(orgId, input.nameEn, id)
  }

  const updated = await db.taxRate.update({
    where: { id },
    data: {
      ...(input.nameEn !== undefined ? { nameEn: input.nameEn.trim() } : {}),
      ...(input.nameFr !== undefined ? { nameFr: cleanText(input.nameFr) } : {}),
      ...(input.rate !== undefined ? { rate: new Prisma.Decimal(input.rate) } : {}),
      ...(input.type !== undefined ? { type: toTaxType(input.type) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    },
  })
  return toDTO(updated)
}

export async function deleteTaxRate(orgId: string, id: string): Promise<TaxRateDTO> {
  const existing = await db.taxRate.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      _count: { select: { items: true } },
    },
  })
  if (!existing) throw new Error("Tax rate not found")

  if (existing._count.items > 0) {
    throw new Error("This tax rate is used by items. Deactivate it instead of deleting.")
  }

  const deleted = await db.taxRate.delete({ where: { id } })
  return toDTO(deleted)
}

export async function getTaxRateManagementDataForOrg(
  organizationId: string,
): Promise<TaxRateManagementData> {
  const taxRates = await db.taxRate.findMany({
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
      rate: true,
      type: true,
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

  const taxRateIds = taxRates.map((taxRate) => taxRate.id)
  const activeItemCounts = taxRateIds.length
    ? await db.item.groupBy({
        by: ["taxRateId"],
        where: {
          organizationId,
          taxRateId: { in: taxRateIds },
          deletedAt: null,
          isActive: true,
        },
        _count: { _all: true },
      })
    : []

  const activeItemsByTaxRateId = new Map<string, number>()
  activeItemCounts.forEach((summary) => {
    if (summary.taxRateId) {
      activeItemsByTaxRateId.set(summary.taxRateId, summary._count._all)
    }
  })

  return {
    taxRates: taxRates.map((taxRate) => {
      const rate = taxRate.rate.toString()

      return {
        id: taxRate.id,
        organizationId: taxRate.organizationId,
        organizationName: taxRate.organization.name,
        taxRateName: taxRate.nameEn,
        name: taxRate.nameEn,
        nameEn: taxRate.nameEn,
        nameFr: taxRate.nameFr,
        rate,
        rateNumber: toRateNumber(taxRate.rate),
        type: taxRate.type,
        isActive: taxRate.isActive,
        createdAt: taxRate.createdAt,
        updatedAt: taxRate.updatedAt,
        itemsCount: taxRate._count.items,
        activeItemsCount: activeItemsByTaxRateId.get(taxRate.id) ?? 0,
      }
    }),
  }
}

async function reloadTaxRateManagementRow(organizationId: string, taxRateId: string) {
  const data = await getTaxRateManagementDataForOrg(organizationId)
  return data.taxRates.find((taxRate) => taxRate.id === taxRateId) ?? null
}

export async function createTaxRateForManagement(
  organizationId: string,
  input: TaxRateManagementInput,
): Promise<TaxRateManagementRow> {
  const taxRate = await createTaxRate(organizationId, input)
  const row = await reloadTaxRateManagementRow(organizationId, taxRate.id)

  if (!row) {
    throw new Error("Tax rate was created but could not be reloaded")
  }

  return row
}

export async function updateTaxRateForManagement(
  organizationId: string,
  taxRateId: string,
  input: TaxRateManagementInput,
): Promise<TaxRateManagementRow> {
  await updateTaxRate(organizationId, taxRateId, input)
  const row = await reloadTaxRateManagementRow(organizationId, taxRateId)

  if (!row) {
    throw new Error("Tax rate was updated but could not be reloaded")
  }

  return row
}

export async function removeTaxRateForManagement(
  organizationId: string,
  taxRateId: string,
): Promise<TaxRateRemovalResult> {
  const taxRate = await db.taxRate.findFirst({
    where: { id: taxRateId, organizationId },
    select: {
      id: true,
      _count: { select: { items: true } },
    },
  })

  if (!taxRate) {
    throw new Error("Tax rate not found")
  }

  if (taxRate._count.items > 0) {
    await db.taxRate.update({
      where: { id: taxRateId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    return { id: taxRateId, mode: "deactivated" }
  }

  await db.taxRate.delete({ where: { id: taxRateId } })
  return { id: taxRateId, mode: "deleted" }
}
