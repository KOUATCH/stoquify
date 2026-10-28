import "server-only"

import { createHash } from "node:crypto"

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import {
  getCustomerAROpenItems,
  type AROpenItem,
  type AROpenItemCurrencySummary,
} from "@/services/accounting/ar-open-item.service"
import { hashNormalizedHistoryFilters } from "@/services/history/transaction-history-cursor"
import {
  auditExportSafetyDecision,
  buildExportWatermark,
  evaluateExportSafety,
} from "@/services/security/export-safety.service"

export type AROpenItemsExportCommand = {
  organizationId: string
  actorId: string
  actorPermissions: string[]
  lastAuthAt: number
  filters?: {
    customerId?: string
    asOf?: Date
    recordedThrough?: Date
  }
  now?: Date
}

export type AROpenItemsExportResult = {
  fileName: string
  mimeType: "text/csv;charset=utf-8"
  content: string
  contentHash: string
  filtersHash: string
  watermarkId: string
  rowCount: number
  generatedAt: string
  asOf: string
  recordedThrough: string
  summariesByCurrency: AROpenItemCurrencySummary[]
}

const CSV_HEADERS = [
  "document_number",
  "document_version",
  "customer_id",
  "customer_name",
  "order_number",
  "currency",
  "invoice_date",
  "due_date",
  "opening_amount",
  "allocated_amount",
  "open_amount",
  "status",
  "days_past_due",
  "aging_bucket",
  "evidence_grade",
  "document_hash",
  "state_hash",
] as const

function normalizeNow(value: Date | undefined) {
  const now = value ?? new Date()
  if (Number.isNaN(now.getTime())) throw new BusinessRuleError("AR export generation time is invalid")
  return now
}

function safeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value)
  const formulaSafe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${formulaSafe.replace(/"/g, '""')}"`
}

function csvRow(values: readonly unknown[]) {
  return values.map(safeCsvValue).join(",")
}

function itemRow(item: AROpenItem) {
  return csvRow([
    item.documentNumber,
    item.documentVersion,
    item.customerId,
    item.customerName,
    item.orderNumber,
    item.currency,
    item.invoiceDate,
    item.dueDate,
    item.openingAmount,
    item.allocatedAmount,
    item.openAmount,
    item.status,
    item.daysPastDue,
    item.agingBucket,
    item.evidenceGrade,
    item.documentHash,
    item.stateHash,
  ])
}

export function buildAROpenItemsExportCsv(input: {
  watermarkId: string
  generatedAt: string
  filtersHash: string
  asOf: string
  recordedThrough: string
  summariesByCurrency: AROpenItemCurrencySummary[]
  items: AROpenItem[]
}) {
  const manifest = [
    csvRow(["manifest", "stoquify_customer_ar_open_items"]),
    csvRow(["watermark_id", input.watermarkId]),
    csvRow(["generated_at", input.generatedAt]),
    csvRow(["as_of", input.asOf]),
    csvRow(["recorded_through", input.recordedThrough]),
    csvRow(["filters_hash", input.filtersHash]),
    ...input.summariesByCurrency.map((summary) =>
      csvRow([
        "currency_summary",
        summary.currency,
        summary.itemCount,
        summary.openItemCount,
        summary.settledItemCount,
        summary.totalOpened,
        summary.totalAllocated,
        summary.totalOpen,
        summary.overdueAmount,
      ]),
    ),
  ]

  return [
    ...manifest,
    "",
    csvRow(CSV_HEADERS),
    ...input.items.map(itemRow),
  ].join("\r\n")
}

export async function prepareAROpenItemsExport(
  input: AROpenItemsExportCommand,
): Promise<AROpenItemsExportResult> {
  const now = normalizeNow(input.now)

  return db.$transaction(async (tx) => {
    const result = await getCustomerAROpenItems({
      organizationId: input.organizationId,
      customerId: input.filters?.customerId,
      asOf: input.filters?.asOf,
      recordedThrough: input.filters?.recordedThrough,
      client: tx,
    })
    const filtersHash = hashNormalizedHistoryFilters({
      customerId: input.filters?.customerId ?? null,
      asOf: result.asOf,
      recordedThrough: result.recordedThrough,
    })
    const rowCount = result.items.length
    const watermarkId = buildExportWatermark({
      organizationId: input.organizationId,
      actorId: input.actorId,
      scope: "customer-ar-open-items-history",
      filtersHash,
      rowCount,
      fileType: "csv",
      sensitivity: "financial",
      issuedAt: now,
    })
    const decision = evaluateExportSafety({
      action: "report.export",
      organizationId: input.organizationId,
      actorId: input.actorId,
      actorPermissions: input.actorPermissions,
      lastAuthAt: input.lastAuthAt,
      now,
      resourceType: "AROpenItemsHistoryExport",
      resourceId: filtersHash,
      exportContext: {
        scope: "customer-ar-open-items-history",
        filtersHash,
        rowCount,
        fileType: "csv",
        sensitivity: "financial",
        watermarkId,
      },
      metadata: {
        customerId: input.filters?.customerId ?? null,
        asOf: result.asOf,
        recordedThrough: result.recordedThrough,
        currencies: result.summariesByCurrency.map((summary) => summary.currency),
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
    const content = buildAROpenItemsExportCsv({
      watermarkId,
      generatedAt,
      filtersHash,
      asOf: result.asOf,
      recordedThrough: result.recordedThrough,
      summariesByCurrency: result.summariesByCurrency,
      items: result.items,
    })
    const contentHash = `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`

    return {
      fileName: `customer-ar-open-items-${watermarkId}.csv`,
      mimeType: "text/csv;charset=utf-8",
      content,
      contentHash,
      filtersHash,
      watermarkId,
      rowCount,
      generatedAt,
      asOf: result.asOf,
      recordedThrough: result.recordedThrough,
      summariesByCurrency: result.summariesByCurrency,
    }
  })
}
