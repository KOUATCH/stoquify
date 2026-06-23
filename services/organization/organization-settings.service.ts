import "server-only"

import { randomUUID } from "crypto"

import { generateSlug } from "@/lib/generateSlug"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { Locale as PrismaLocale, PaymentStatus } from "@prisma/client"

export type OrganizationLocale = "EN" | "FR"

export type OrganizationSettingsInput = {
  name?: string
  industry?: string
  country?: string
  state?: string
  address?: string
  currency?: string
  timezone?: string
  defaultLocale?: "en" | "fr"
  inventoryStartDate?: Date | null
  fiscalYearStart?: string
}

export type CreateOrganizationSettingsInput = {
  name: string
  slug?: string
  industry?: string | null
  country?: string | null
  state?: string | null
  address?: string | null
  currency?: string
  timezone?: string
  defaultLocale?: "en" | "fr"
}

export type OrganizationSettingsActor = {
  permissions?: string[] | null
}

export type OrganizationSettingsRecord = {
  id: string
  name: string
  slug: string
  industry: string | null
  country: string | null
  state: string | null
  address: string | null
  currency: string
  timezone: string
  defaultLocale: OrganizationLocale
  inventoryStartDate: Date | null
  fiscalYearStart: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type OrganizationManagementRow = OrganizationSettingsRecord & {
  usersCount: number
  itemsCount: number
  locationsCount: number
  suppliersCount: number
  customersCount: number
  purchaseOrdersCount: number
  salesOrdersCount: number
  paymentsCount: number
  paidRevenue: number
}

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toPrismaLocale(value?: string | null) {
  return value === "fr" ? PrismaLocale.FR : PrismaLocale.EN
}

function normalizeSlug(value: string) {
  const slug = generateSlug(value).replace(/^-+|-+$/g, "")
  return slug || `organization-${randomUUID().slice(0, 8)}`
}

export function canReadOrganizations(actor: OrganizationSettingsActor) {
  const permissions = actor.permissions || []

  return (
    permissions.includes("*") ||
    permissions.includes("organizations.read") ||
    permissions.includes("organizations.create") ||
    permissions.includes("organizations.manage") ||
    permissions.includes("settings.organization.manage")
  )
}

export function canCreateOrganizations(actor: OrganizationSettingsActor) {
  const permissions = actor.permissions || []

  return (
    permissions.includes("*") ||
    permissions.includes("organizations.create") ||
    permissions.includes("organizations.manage") ||
    permissions.includes("settings.organization.manage")
  )
}

async function resolveUniqueOrganizationSlug(value: string) {
  const baseSlug = normalizeSlug(value)
  let slug = baseSlug
  let index = 1

  while (await db.organization.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${index}`
    index += 1
  }

  return slug
}

const organizationSettingsSelect = {
  id: true,
  name: true,
  slug: true,
  industry: true,
  country: true,
  state: true,
  address: true,
  currency: true,
  timezone: true,
  defaultLocale: true,
  inventoryStartDate: true,
  fiscalYearStart: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function getOrganizationSettingsForOrg(
  organizationId: string,
): Promise<OrganizationSettingsRecord | null> {
  return db.organization.findUnique({
    where: { id: organizationId },
    select: organizationSettingsSelect,
  })
}

export async function getOrganizationManagementRowsForActor(input: {
  organizationId: string
  actor: OrganizationSettingsActor
}): Promise<OrganizationManagementRow[]> {
  const organizations = await db.organization.findMany({
    where: canReadOrganizations(input.actor)
      ? { deletedAt: null }
      : { id: input.organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      ...organizationSettingsSelect,
      _count: {
        select: {
          users: true,
          items: true,
          locations: true,
          suppliers: true,
          customers: true,
          purchaseOrders: true,
          salesOrders: true,
          payments: true,
        },
      },
    },
  })

  const organizationIds = organizations.map((organization) => organization.id)
  const paymentSummaries = organizationIds.length
    ? await db.payment.groupBy({
        by: ["organizationId"],
        where: {
          organizationId: { in: organizationIds },
          deletedAt: null,
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      })
    : []
  const paidRevenueByOrganizationId = new Map(
    paymentSummaries.map((summary) => [summary.organizationId, Number(summary._sum.amount ?? 0)]),
  )

  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    industry: organization.industry,
    country: organization.country,
    state: organization.state,
    address: organization.address,
    currency: organization.currency,
    timezone: organization.timezone,
    defaultLocale: organization.defaultLocale,
    inventoryStartDate: organization.inventoryStartDate,
    fiscalYearStart: organization.fiscalYearStart,
    isActive: organization.isActive,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    usersCount: organization._count.users,
    itemsCount: organization._count.items,
    locationsCount: organization._count.locations,
    suppliersCount: organization._count.suppliers,
    customersCount: organization._count.customers,
    purchaseOrdersCount: organization._count.purchaseOrders,
    salesOrdersCount: organization._count.salesOrders,
    paymentsCount: organization._count.payments,
    paidRevenue: paidRevenueByOrganizationId.get(organization.id) ?? 0,
  }))
}

export async function createOrganizationForSettings(
  data: CreateOrganizationSettingsInput,
): Promise<OrganizationManagementRow> {
  const name = data.name.trim()

  if (!name) {
    throw new BusinessRuleError("Organization name is required")
  }

  const now = new Date()
  const slug = await resolveUniqueOrganizationSlug(data.slug || name)

  const organization = await db.$transaction(async (tx) => {
    const createdOrganization = await tx.organization.create({
      data: {
        id: randomUUID(),
        name,
        slug,
        industry: cleanText(data.industry),
        country: cleanText(data.country),
        state: cleanText(data.state),
        address: cleanText(data.address),
        currency: data.currency || "XAF",
        timezone: data.timezone || "Africa/Douala",
        defaultLocale: toPrismaLocale(data.defaultLocale),
        isActive: true,
        updatedAt: now,
      },
    })

    await tx.role.create({
      data: {
        id: randomUUID(),
        nameEn: "Administrator",
        nameFr: "Administrateur",
        code: "administrator",
        description: "Organization administrator with full access",
        permissions: ["*"],
        organizationId: createdOrganization.id,
        updatedAt: now,
      },
    })

    return createdOrganization
  })

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    industry: organization.industry,
    country: organization.country,
    state: organization.state,
    address: organization.address,
    currency: organization.currency,
    timezone: organization.timezone,
    defaultLocale: organization.defaultLocale,
    inventoryStartDate: organization.inventoryStartDate,
    fiscalYearStart: organization.fiscalYearStart,
    isActive: organization.isActive,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    usersCount: 0,
    itemsCount: 0,
    locationsCount: 0,
    suppliersCount: 0,
    customersCount: 0,
    purchaseOrdersCount: 0,
    salesOrdersCount: 0,
    paymentsCount: 0,
    paidRevenue: 0,
  }
}

export async function updateOrganizationSettingsForOrg(
  organizationId: string,
  data: OrganizationSettingsInput,
) {
  const cleanData = {
    ...(data.name !== undefined ? { name: data.name.trim() } : {}),
    ...(data.industry !== undefined ? { industry: cleanText(data.industry) } : {}),
    ...(data.country !== undefined ? { country: cleanText(data.country) } : {}),
    ...(data.state !== undefined ? { state: cleanText(data.state) } : {}),
    ...(data.address !== undefined ? { address: cleanText(data.address) } : {}),
    ...(data.currency !== undefined ? { currency: data.currency } : {}),
    ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
    ...(data.defaultLocale !== undefined ? { defaultLocale: toPrismaLocale(data.defaultLocale) } : {}),
    ...(data.inventoryStartDate !== undefined ? { inventoryStartDate: data.inventoryStartDate } : {}),
    ...(data.fiscalYearStart !== undefined ? { fiscalYearStart: cleanText(data.fiscalYearStart) } : {}),
  }

  if (!cleanData.name && data.name !== undefined) {
    throw new BusinessRuleError("Organization name is required")
  }

  return db.organization.update({
    where: { id: organizationId },
    data: {
      ...cleanData,
      updatedAt: new Date(),
    },
  })
}

export async function updateOrganizationCurrencyForOrg(organizationId: string, currency: string) {
  return db.organization.update({
    where: { id: organizationId },
    data: {
      currency,
      updatedAt: new Date(),
    },
  })
}

export async function updateOrganizationTimezoneForOrg(organizationId: string, timezone: string) {
  return db.organization.update({
    where: { id: organizationId },
    data: {
      timezone,
      updatedAt: new Date(),
    },
  })
}

export async function updateInventoryStartDateForOrg(organizationId: string, inventoryStartDate: Date) {
  return db.organization.update({
    where: { id: organizationId },
    data: {
      inventoryStartDate,
      updatedAt: new Date(),
    },
  })
}

export async function updateFiscalYearStartForOrg(organizationId: string, fiscalYearStart: string) {
  return db.organization.update({
    where: { id: organizationId },
    data: {
      fiscalYearStart,
      updatedAt: new Date(),
    },
  })
}
