import "server-only"
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getCustomerAROpenItems } from "@/services/accounting/ar-open-item.service"
import { resolveAPHistoryFinancials } from "@/services/purchasing/ap-history-financial"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { dailySalesPeriod } from "@/services/analytics/daily-sales-period"
import { openItemsScopeSchema, type OpenItemsScope, type OpenItemsRow, type OpenItemsCurrency, type OpenItemsDashboard } from "./open-items-dashboard.contract"

const documentLimit = 1000
const evidenceLimit = 10000
const decimal = (value: string) => new Prisma.Decimal(value)

function dayKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date)
  const part = (name: string) => parts.find(p => p.type === name)!.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

export function classifyDue(dueDate: string | null, now: Date, timezone: string): { daysPastDue: number | null; bucket: OpenItemsRow["bucket"]; daysUntilDue: number | null } {
  if (!dueDate) return { daysPastDue: null, bucket: "unknown", daysUntilDue: null }
  const daysUntilDue = (Date.parse(dayKey(new Date(dueDate), timezone)) - Date.parse(dayKey(now, timezone))) / 86400000
  const days = Math.max(0, -daysUntilDue)
  return { daysPastDue: days, daysUntilDue, bucket: days === 0 ? "current" : days <= 30 ? "1-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+" }
}

export function summarizeOpenItems(rows: OpenItemsRow[], now: Date, timezone: string): OpenItemsCurrency[] {
  return [...new Set(rows.map(row => row.currency))].sort().map(currency => {
    const population = rows.filter(row => row.currency === currency)
    const unverifiedCount = population.filter(row => row.outstanding === null).length
    if (unverifiedCount) return { currency, count: population.length, unverifiedCount, outstanding: null, overdue: null, aging: null, due: null, topCounterparties: null, performance: null }
    const sum = (items: OpenItemsRow[]) => items.reduce((total, row) => total.plus(row.outstanding!), decimal("0")).toFixed(2)
    const aging = Object.fromEntries((["current", "1-30", "31-60", "61-90", "90+", "unknown"] as const).map(bucket => [bucket, sum(population.filter(row => row.bucket === bucket))])) as Record<OpenItemsRow["bucket"], string>
    const due = (min: number, max: number) => sum(population.filter(row => {
      const days = classifyDue(row.dueDate, now, timezone).daysUntilDue
      return days !== null && days >= min && days <= max
    }))
    const topCounterparties = [...new Set(population.map(row => row.counterpartyId))].map(id => {
      const items = population.filter(row => row.counterpartyId === id)
      return { id, name: items[0].counterparty, outstanding: sum(items), count: items.length }
    }).sort((a, b) => decimal(b.outstanding).comparedTo(a.outstanding) || a.id.localeCompare(b.id)).slice(0, 5)
    const outstanding = sum(population), overdue = sum(population.filter(row => (row.daysPastDue ?? 0) > 0))
    const share = (amount: string) => decimal(outstanding).gt(0) ? decimal(amount).div(outstanding).mul(100).toFixed(2) : null
    const performance = { overdueShare: share(overdue), largestCounterpartyShare: share(topCounterparties[0]?.outstanding ?? "0"), topFiveShare: share(topCounterparties.reduce((total, party) => total.plus(party.outstanding), decimal("0")).toFixed(2)) }
    return { currency, count: population.length, unverifiedCount, outstanding, overdue, aging, due: { today: due(0, 0), next7: due(1, 7), next30: due(1, 30) }, topCounterparties, performance }
  })
}

/** Current bounded population, one repeatable-read snapshot. No history certificate. */
export async function getOpenItemsDashboard(input: OpenItemsScope, organizationId: string): Promise<OpenItemsDashboard> {
  const scope = openItemsScopeSchema.parse(input)
  return db.$transaction(async tx => {
    const organization = await tx.organization.findFirst({ where: { id: organizationId, isActive: true, deletedAt: null }, select: { id: true, name: true, currency: true, timezone: true } })
    if (!organization) throw new NotFoundError("Organization not found")
    const locations = await tx.location.findMany({ where: { organizationId, deletedAt: null }, select: { id: true, name: true }, orderBy: { id: "asc" } })
    if (scope.locationId && !locations.some(location => location.id === scope.locationId)) throw new NotFoundError("Dashboard location not found")
    const now = new Date()
    dailySalesPeriod(undefined, organization.timezone, now)
    let rows: OpenItemsRow[]
    let unassignedDocumentCount = 0
    let sourceDocumentCount = 0
    if (scope.view === "receivables") {
      const ar = await getCustomerAROpenItems({ organizationId, locationId: scope.locationId, maxDocuments: documentLimit, includeAllocations: false, asOf: now, recordedThrough: now, client: tx })
      sourceDocumentCount = ar.items.length
      rows = ar.items.filter(item => ["open", "partial"].includes(item.status)).map(item => ({
        id: item.referenceId, counterpartyId: item.customerId, counterparty: item.customerName, reference: item.documentNumber,
        currency: item.currency, original: item.openingAmount, allocated: item.allocatedAmount, credits: null, outstanding: item.openAmount,
        dueDate: item.dueDate, ...classifyDue(item.dueDate, now, organization.timezone), state: item.status, evidence: "posted",
      }))
    } else {
      const base: Prisma.SupplierInvoiceWhereInput = { organizationId, invoiceDate: { lte: now }, createdAt: { lte: now } }
      // Retain soft-deleted recognized obligations: deletion is not a financial reversal.
      const invoices = await tx.supplierInvoice.findMany({
        where: { ...base, ...(scope.locationId ? { purchaseOrder: { organizationId, locationId: scope.locationId } } : {}) },
        include: { supplier: { select: { id: true, name: true, organizationId: true } }, purchaseOrder: { select: { organizationId: true, locationId: true } },
          paymentAllocations: { take: evidenceLimit + 1, include: { supplierPayment: true } }, supplierCreditNotes: { take: evidenceLimit + 1 } },
        orderBy: { id: "asc" }, take: documentLimit + 1,
      })
      if (invoices.length > documentLimit || invoices.reduce((count, invoice) => count + invoice.paymentAllocations.length + invoice.supplierCreditNotes.length, 0) > evidenceLimit) throw new BusinessRuleError("AP evidence exceeds the dashboard limit. Narrow the location scope.")
      sourceDocumentCount = invoices.length
      if (invoices.some(invoice => invoice.updatedAt > now || invoice.supplier.organizationId !== organizationId || (invoice.purchaseOrder && invoice.purchaseOrder.organizationId !== organizationId))) throw new ConflictError("AP source scope or revision is inconsistent. Refresh the dashboard.")
      unassignedDocumentCount = await tx.supplierInvoice.count({ where: { ...base, purchaseOrderId: null, status: { in: ["POSTED", "PAYMENT_PENDING", "DISPUTED"] } } })
      const financial = await resolveAPHistoryFinancials(tx, organizationId, invoices, [], now, organization.currency, evidenceLimit)
      rows = invoices.filter(invoice => financial.movements.get(`invoice:${invoice.id}`)?.state !== "not_recognized").flatMap(invoice => {
        const balance = financial.invoiceBalances.get(invoice.id)
        if (balance && decimal(balance.outstanding).lt(0)) throw new ConflictError("AP invoice has a negative remainder. Review its evidence.")
        if (balance && decimal(balance.outstanding).eq(0)) return []
        const dueDate = invoice.dueDate?.toISOString() ?? null
        return [{ id: invoice.id, counterpartyId: invoice.supplierId, counterparty: invoice.supplier.name, reference: invoice.invoiceNumber,
          currency: invoice.currency, original: invoice.total.toFixed(2), allocated: balance?.paid ?? null, credits: balance?.credits ?? null, outstanding: balance?.outstanding ?? null,
          dueDate, ...classifyDue(dueDate, now, organization.timezone), state: invoice.status, evidence: balance ? "operational" as const : "unverified" as const }]
      })
    }
    if (rows.some(row => !/^[A-Z]{3}$/.test(row.currency))) throw new BusinessRuleError("Document currency is unavailable")
    const availableCurrencies = [...new Set(rows.map(row => row.currency))].sort()
    rows = rows.filter(row => !scope.currency || row.currency === scope.currency).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.id.localeCompare(b.id))
    const currencies = summarizeOpenItems(rows, now, organization.timezone)
    const revision = createHash("sha256").update(JSON.stringify({ organizationId, view: scope.view, locationId: scope.locationId, currency: scope.currency, rows, currencies, unassignedDocumentCount, sourceDocumentCount })).digest("hex")
    if (scope.page > 1 && !scope.revision) throw new BusinessRuleError("Use the first page's revision to continue.")
    if (scope.revision && scope.revision !== revision) throw new ConflictError("Dashboard evidence changed. Refresh from the first page.")
    const search = scope.search.toLocaleLowerCase()
    const inQueue = (row: OpenItemsRow, queue: typeof scope.queue) => queue === "all" || (queue === "overdue" ? (row.daysPastDue ?? 0) > 0 : queue === "unknown" ? row.bucket === "unknown" : queue === "unverified" ? row.evidence === "unverified" : row.daysUntilDue !== null && row.daysUntilDue >= 1 && row.daysUntilDue <= (queue === "due7" ? 7 : 30))
    const queueCounts = Object.fromEntries((["all", "overdue", "due7", "due30", "unknown", "unverified"] as const).map(queue => [queue, rows.filter(row => inQueue(row, queue)).length])) as OpenItemsDashboard["queueCounts"]
    const filtered = rows.filter(row => inQueue(row, scope.queue) && (!scope.counterpartyId || row.counterpartyId === scope.counterpartyId) && (scope.bucket === "all" || row.bucket === scope.bucket) && (!search || `${row.reference} ${row.counterparty}`.toLocaleLowerCase().includes(search)))
    return { kind: "open-items-v1", view: scope.view, organization, locations, scope: { locationId: scope.locationId ?? null, currency: scope.currency ?? null }, checkedAt: now.toISOString(), revision,
      evidence: scope.view === "receivables" ? "posted-ar" : "operational-ap", coverage: rows.some(row => row.evidence === "unverified") ? "unverified" : sourceDocumentCount ? "complete-population" : "no-documents",
      locationBasis: scope.view === "receivables" ? "source-sale" : "purchase-order", unassignedDocumentCount, sourceDocumentCount, availableCurrencies, queueCounts, currencies,
      records: { rows: filtered.slice((scope.page - 1) * scope.pageSize, scope.page * scope.pageSize), total: filtered.length, page: scope.page, pageSize: scope.pageSize },
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 })
}
