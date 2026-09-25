import "server-only"


import { hasAnyRbacPermission, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { organizationProfileSelect, updateOrganizationSettingsForOrg, type OrganizationProfileChangeContext } from "./organization-profile-update.service"
export { updateOrganizationSettingsForOrg } from "./organization-profile-update.service"
import { PaymentStatus, Prisma } from "@prisma/client"

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
  paidPaymentsAmount: string
  canExport: boolean
}

export function canReadOrganizations(actor: OrganizationSettingsActor) {
  const permissions = actor.permissions || []

  return (
    hasAnyRbacPermission(permissions, ["system.organization.read", "system.organization.update"]) ||
    permissions.includes("organizations.read") ||
    permissions.includes("organizations.create") ||
    permissions.includes("organizations.manage") ||
    permissions.includes("settings.organization.manage")
  )
}

export function canCreateOrganizations(_actor: OrganizationSettingsActor) {
  // A settings update permission does not create a usable owner account.
  return false
}

const organizationSettingsSelect = organizationProfileSelect

export async function getOrganizationSettingsForOrg(
  organizationId: string,
): Promise<OrganizationSettingsRecord | null> {
  return db.organization.findFirst({
    where: { id: organizationId, isActive: true, deletedAt: null },
    select: organizationSettingsSelect,
  })
}

export async function getOrganizationManagementRowsForActor(input: {
  organizationId: string
  actor: OrganizationSettingsActor
}, client: Pick<Prisma.TransactionClient, "organization" | "payment"> = db): Promise<OrganizationManagementRow[]> {
  const organizations = await client.organization.findMany({
    where: { id: input.organizationId, deletedAt: null },
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
    ? await client.payment.groupBy({
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
  const paidAmountByOrganizationId = new Map(
    paymentSummaries.map((summary) => [summary.organizationId, new Prisma.Decimal(summary._sum.amount ?? 0).toFixed(2)]),
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
    paidPaymentsAmount: paidAmountByOrganizationId.get(organization.id) ?? "0.00",
    canExport: hasRbacPermission(input.actor.permissions ?? [], "reports.export"),
  }))
}

export async function createOrganizationForSettings(
  _data: CreateOrganizationSettingsInput,
): Promise<OrganizationManagementRow> {
  // Retain the legacy boundary for old callers, without creating ownerless tenants.
  throw new BusinessRuleError("Create the owner account and organization together through owner registration.", "INVALID_TRANSITION")
}

export async function updateOrganizationCurrencyForOrg(organizationId: string, currency: string, context?: OrganizationProfileChangeContext) {
  return updateOrganizationSettingsForOrg(organizationId, { currency }, context)
}

export async function updateOrganizationTimezoneForOrg(organizationId: string, timezone: string, context?: OrganizationProfileChangeContext) {
  return updateOrganizationSettingsForOrg(organizationId, { timezone }, context)
}

export async function updateInventoryStartDateForOrg(organizationId: string, inventoryStartDate: Date, context?: OrganizationProfileChangeContext) {
  return updateOrganizationSettingsForOrg(organizationId, { inventoryStartDate }, context)
}

export async function updateFiscalYearStartForOrg(organizationId: string, fiscalYearStart: string, context?: OrganizationProfileChangeContext) {
  return updateOrganizationSettingsForOrg(organizationId, { fiscalYearStart }, context)
}
