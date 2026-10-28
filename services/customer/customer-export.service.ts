import "server-only"

import { createHash } from "node:crypto"

import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import {
  auditExportSafetyDecision,
  buildExportWatermark,
  evaluateExportSafety,
} from "@/services/security/export-safety.service"
import {
  CustomerExportCommandSchema,
  type CustomerExportCommand,
  type CustomerExportFilters,
  type CustomerExportRequest,
} from "./customer.schemas"
import {
  getCustomerManagementExportRowsForOrg,
  getCustomerOrderExportRowsForOrg,
  type CustomerManagementRow,
  type CustomerOrderExportRow,
} from "./customer.service"

export type CustomerExportResult = {
  scope: "customers" | "customer" | "customer-orders"
  customerId: string | null
  fileName: string
  mimeType: "text/csv;charset=utf-8"
  content: string
  contentHash: string
  filtersHash: string
  watermarkId: string
  rowCount: number
  generatedAt: string
}

type CsvValue = string | number | boolean | Date | null | undefined

const CUSTOMER_SELECTED_FIELDS = [
  "customer_id",
  "name",
  "code",
  "preferred_locale",
  "active",
  "payment_terms_days",
  "sales_orders",
  "open_sales_orders",
  "unpaid_sales_orders",
  "total_sales_value",
  "average_order_value",
  "last_sales_order_at",
  "last_ledger_entry_at",
  "created_at",
  "updated_at",
] as const

const CUSTOMER_REDACTED_FIELDS = [
  "email",
  "phone",
  "address",
  "tax_id",
  "credit_limit",
  "current_balance",
  "notes",
] as const

const ORDER_SELECTED_FIELDS = [
  "order_id",
  "order_number",
  "status",
  "payment_status",
  "subtotal",
  "tax_amount",
  "discount_amount",
  "total_amount",
  "item_count",
  "order_date",
  "due_date",
  "created_at",
  "updated_at",
] as const

function normalizeDate(value: Date | string | number | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function csvValue(value: CsvValue) {
  if (value instanceof Date) return value.toISOString()
  return String(value ?? "")
}

export function escapeCustomerCsvCell(value: CsvValue) {
  const raw = csvValue(value)
  const formulaCandidate = raw.replace(/^ +/, "")
  const spreadsheetSafe = /^[=+\-@\t\r]/.test(formulaCandidate) ? `'${raw}` : raw
  return `"${spreadsheetSafe.replace(/"/g, '""')}"`
}

export function buildCustomerExportCsv(input: {
  watermarkId: string
  generatedAt: string
  purpose: string
  scope: CustomerExportResult["scope"]
  filtersHash: string
  headers: string[]
  rows: CsvValue[][]
}) {
  const manifest: CsvValue[][] = [
    ["AQSTOQFLOW_CUSTOMER_EXPORT", "1"],
    ["watermark_id", input.watermarkId],
    ["generated_at", input.generatedAt],
    ["purpose", input.purpose],
    ["scope", input.scope],
    ["filters_hash", input.filtersHash],
    [],
  ]
  return (
    "\uFEFF" +
    [...manifest, input.headers, ...input.rows]
      .map((row) => row.map(escapeCustomerCsvCell).join(","))
      .join("\r\n")
  )
}

function customerHeaders() {
  return [...CUSTOMER_SELECTED_FIELDS]
}

function customerRow(customer: CustomerManagementRow): CsvValue[] {
  return [
    customer.id,
    customer.name,
    customer.code,
    customer.preferredLocale,
    customer.isActive,
    customer.paymentTerms,
    customer.salesOrdersCount,
    customer.openSalesOrdersCount,
    customer.unpaidSalesOrdersCount,
    customer.totalSalesValue,
    customer.averageOrderValue,
    customer.lastSalesOrderAt,
    customer.lastLedgerEntryAt,
    customer.createdAt,
    customer.updatedAt,
  ]
}

function orderHeaders() {
  return [...ORDER_SELECTED_FIELDS]
}

function orderRow(order: CustomerOrderExportRow): CsvValue[] {
  return [
    order.id,
    order.orderNumber,
    order.status,
    order.paymentStatus,
    order.subtotal,
    order.taxAmount,
    order.discountAmount,
    order.totalAmount,
    order.itemCount,
    order.orderDate,
    order.dueDate,
    order.createdAt,
    order.updatedAt,
  ]
}

async function loadExportRows(
  tx: Prisma.TransactionClient,
  input: {
    scope: CustomerExportResult["scope"]
    organizationId: string
    customerId?: string
    customerIds?: string[]
    filters: CustomerExportFilters
  },
) {
  if (input.scope === "customer-orders") {
    const orders = await getCustomerOrderExportRowsForOrg(
      input.organizationId,
      input.customerId as string,
      input.filters,
      tx,
    )
    return { headers: orderHeaders(), rows: orders.map(orderRow) }
  }

  const customers = await getCustomerManagementExportRowsForOrg(
    input.organizationId,
    input.filters,
    input.scope === "customer" ? input.customerId : undefined,
    input.scope === "customers" ? input.customerIds : undefined,
    tx,
  )
  return { headers: customerHeaders(), rows: customers.map(customerRow) }
}

export async function prepareCustomerExport(
  input: CustomerExportCommand,
): Promise<CustomerExportResult> {
  const parsed = CustomerExportCommandSchema.parse(input)
  const now = normalizeDate(parsed.now)

  return db.$transaction(async (tx) => {
    const exportRows = await loadExportRows(tx, parsed)
    const rowCount = exportRows.rows.length
    const filtersHash = `sha256:${hashBusinessPayload({
      scope: parsed.scope,
      customerId: parsed.customerId ?? null,
      customerIds: parsed.customerIds ? [...parsed.customerIds].sort() : null,
      filters: parsed.filters,
    })}`
    const watermarkId = buildExportWatermark({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      scope: parsed.scope,
      filtersHash,
      rowCount,
      fileType: parsed.fileType,
      sensitivity: "personal",
      issuedAt: now,
    })
    const decision = evaluateExportSafety({
      action: "customers.export",
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      resourceType: "CustomerExport",
      resourceId: parsed.customerId ?? filtersHash,
      lastAuthAt: parsed.lastAuthAt,
      now,
      exportContext: {
        scope: parsed.scope,
        filtersHash,
        rowCount,
        fileType: parsed.fileType,
        sensitivity: "personal",
        watermarkId,
      },
      metadata: {
        purpose: parsed.purpose,
        customerId: parsed.customerId ?? null,
        selectedFields:
          parsed.scope === "customer-orders"
            ? [...ORDER_SELECTED_FIELDS]
            : [...CUSTOMER_SELECTED_FIELDS],
        redactedFields:
          parsed.scope === "customer-orders" ? [] : [...CUSTOMER_REDACTED_FIELDS],
      },
    })

    await auditExportSafetyDecision(tx, decision)
    if (!decision.allowed) {
      throw new BusinessRuleError(
        decision.safeMessage,
        decision.reasonCode === "FRESH_AUTH_REQUIRED"
          ? "FRESH_AUTH_REQUIRED"
          : "BUSINESS_RULE_VIOLATION",
      )
    }

    const generatedAt = now.toISOString()
    const content = buildCustomerExportCsv({
      watermarkId,
      generatedAt,
      purpose: parsed.purpose,
      scope: parsed.scope,
      filtersHash,
      headers: exportRows.headers,
      rows: exportRows.rows,
    })
    const contentHash = `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`

    return {
      scope: parsed.scope,
      customerId: parsed.customerId ?? null,
      fileName: `${parsed.scope}-${watermarkId}.csv`,
      mimeType: "text/csv;charset=utf-8",
      content,
      contentHash,
      filtersHash,
      watermarkId,
      rowCount,
      generatedAt,
    }
  })
}

export type { CustomerExportRequest }
