import "server-only"

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import type { RbacContext } from "@/lib/security/rbac"
import { hasAllRbacPermissions } from "@/lib/security/rbac-permissions"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { normalizeRecordSearchQuery, type RecordSearchDomain, type RecordSearchHit, type RecordSearchResult } from "./business-record-search-contracts"

type SearchActor = Pick<RbacContext, "orgId" | "userId" | "permissions" | "roles" | "isSuperUser">
const LIMIT = 10
const DOMAIN_BUDGET_MS = 1500

async function withinBudget<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Search domain unavailable")), DOMAIN_BUDGET_MS)
    })])
  } finally {
    clearTimeout(timer)
  }
}

export async function searchBusinessRecords(ctx: SearchActor, input: unknown, locale: "en" | "fr"): Promise<RecordSearchResult> {
  if (!ctx.orgId || !ctx.userId) throw new ForbiddenError("An active organization is required.")
  const query = normalizeRecordSearchQuery(input)
  const result: RecordSearchResult = { query, hits: [], partialDomains: [] }
  if (query.length < 2) return result
  const domains = [
    { domain: "items", moduleSlug: "inventory", permissions: ["inventory.items.read"] },
    // The existing customer destination requires both permissions. Search does not grant analytics access.
    { domain: "customers", moduleSlug: "sales", permissions: ["customers.read", "customers.analytics.read"] },
    { domain: "purchaseOrders", moduleSlug: "purchasing", permissions: ["purchases.orders.read"] },
  ] as const
  const responses = await Promise.all(domains.map(async domain => {
    if (!hasAllRbacPermissions(ctx.permissions, domain.permissions)) return { hits: [] as RecordSearchHit[] }
    try {
      return await withinBudget((async () => {
        const access = await observeModuleAccess({
          organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions,
          moduleSlug: domain.moduleSlug, surfaceType: "action", surface: "business-record-search",
          accessIntent: "read", mode: "enforce", audit: false,
        })
        if (!access.allowed) return { hits: [] as RecordSearchHit[] }
        const hits = await db.$transaction(async tx => {
          // Bound the database execution itself as well as the response wait.
          await tx.$executeRaw`SET LOCAL statement_timeout = '1000ms'`
          return searchDomain(tx, ctx.orgId, domain.domain, query, locale)
        }, { timeout: 1200, maxWait: 250 })
        return { hits }
      })())
    } catch {
      // Do not reveal provider, query, permissions or record details in failure payloads.
      return { hits: [] as RecordSearchHit[], partial: domain.domain }
    }
  }))
  for (const response of responses) {
    result.hits.push(...response.hits)
    if ("partial" in response && response.partial) result.partialDomains.push(response.partial)
  }
  return result
}

async function searchDomain(tx: Prisma.TransactionClient, organizationId: string, domain: RecordSearchDomain, query: string, locale: "en" | "fr"): Promise<RecordSearchHit[]> {
  const text = { contains: query, mode: "insensitive" as const }
  const exact = { equals: query, mode: "insensitive" as const }
  if (domain === "items") {
    const base: Prisma.ItemWhereInput = { organizationId, deletedAt: null }
    const select = { id: true, nameEn: true, nameFr: true, sku: true } as const
    const first = await tx.item.findMany({ where: { ...base, sku: exact }, select, orderBy: { id: "asc" }, take: LIMIT })
    const rest = first.length < LIMIT ? await tx.item.findMany({ where: { ...base, id: { notIn: first.map(row => row.id) }, OR: [{ sku: text }, { nameEn: text }, { nameFr: text }] }, select, orderBy: [{ nameEn: "asc" }, { id: "asc" }], take: LIMIT - first.length }) : []
    return [...first, ...rest].map(row => ({ id: row.id, domain, title: locale === "fr" ? row.nameFr || row.nameEn : row.nameEn, reference: row.sku, href: `/dashboard/inventory/items/${encodeURIComponent(row.id)}` }))
  }
  if (domain === "customers") {
    // Match the existing customer destination's tenant scope. Location
    // assignment is not a prerequisite for reading a customer profile.
    const base: Prisma.CustomerWhereInput = { organizationId, deletedAt: null }
    const select = { id: true, name: true, code: true } as const
    const first = await tx.customer.findMany({ where: { ...base, code: exact }, select, orderBy: { id: "asc" }, take: LIMIT })
    const rest = first.length < LIMIT ? await tx.customer.findMany({ where: { ...base, id: { notIn: first.map(row => row.id) }, OR: [{ code: text }, { name: text }] }, select, orderBy: [{ name: "asc" }, { id: "asc" }], take: LIMIT - first.length }) : []
    return [...first, ...rest].map(row => ({ id: row.id, domain, title: row.name, reference: row.code || row.id, href: `/dashboard/customers/${encodeURIComponent(row.id)}` }))
  }
  const base: Prisma.PurchaseOrderWhereInput = { organizationId, deletedAt: null }
  const select = { id: true, orderNumber: true } as const
  const first = await tx.purchaseOrder.findMany({ where: { ...base, orderNumber: exact }, select, orderBy: { id: "asc" }, take: LIMIT })
  const rest = first.length < LIMIT ? await tx.purchaseOrder.findMany({ where: { ...base, id: { notIn: first.map(row => row.id) }, orderNumber: text }, select, orderBy: [{ orderNumber: "asc" }, { id: "asc" }], take: LIMIT - first.length }) : []
  return [...first, ...rest].map(row => ({ id: row.id, domain, title: row.orderNumber, reference: row.orderNumber, href: `/dashboard/purchase-orders/${encodeURIComponent(row.id)}` }))
}
