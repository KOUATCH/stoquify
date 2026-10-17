import "server-only"
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { auditExportSafetyDecision, buildExportWatermark, evaluateExportSafety } from "@/services/security/export-safety.service"
import { getSalesPerformance, type SalesPerformance } from "./sales-performance.service"
import type { PerformanceScope } from "@/lib/analytics/sales-performance-scope"

// Quote every cell, escape embedded quotes, and neutralize formulas even after whitespace/control characters.
function csvRow(values: (string | null)[]) {
  return values.map(value => { const text = value ?? "unavailable"; const safe = /^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text) ? "'" + text : text; return '"' + safe.replace(/"/g, '""') + '"' }).join(",")
}
export function buildSalesPerformanceCsv(report: SalesPerformance, watermarkId: string, generatedAt: string) {
  const sum = report.trend.reduce((total, row) => total.plus(row.value), new Prisma.Decimal(0))
  const count = report.trend.reduce((total, row) => total + BigInt(row.count), BigInt(0))
  if (!sum.eq(report.current.value) || count.toString() !== report.current.count ||
    (count > BigInt(0) ? sum.div(count.toString()).toFixed(2) : null) !== report.current.average) throw new BusinessRuleError("Sales export totals do not reconcile")
  return [
    ["report", "stoquify_sales_performance_summary_and_daily_trend"], ["source", "current_completed_delivered_order_totals_including_tax_and_charges"],
    ["organization_id", report.scope.organizationId!], ["location_id", report.scope.locationId ?? "all"],
    ["location_name", report.scope.locationId ? report.locations.find(row => row.id === report.scope.locationId)?.name ?? report.scope.locationId : "all"],
    ["status", report.scope.status ?? "COMPLETED,DELIVERED"], ["channel", report.scope.channel ?? "all"],
    ["record_search_and_pagination", "excluded_from_summary_and_trend"], ["timezone", report.timezone], ["currency", report.currency],
    ["period_start_inclusive", report.period.start], ["period_end_exclusive", report.period.endExclusive], ["partial_period", String(report.period.partial)],
    ["checked_at", report.checkedAt], ["generated_at", generatedAt], ["watermark_id", watermarkId],
    ["summary", "sales_value", "order_count", "average_order_value"], ["current", report.current.value, report.current.count, report.current.average],
    ["date", "sales_value", "order_count"], ...report.trend.map(row => [row.date, row.value, row.count]),
  ].map(csvRow).join("\r\n")
}
export async function prepareSalesPerformanceExport(input: { scope: PerformanceScope & { organizationId: string }; actorId: string; permissions: string[]; lastAuthAt: number; canReadCustomers: boolean }) {
  // Same read model and repeatable-read result supplies both the download and refreshed visible report.
  const report = await getSalesPerformance({ ...input.scope, canReadCustomers: input.canReadCustomers })
  const now = new Date(), generatedAt = now.toISOString(), rowCount = report.trend.length
  const filtersHash = createHash("sha256").update(JSON.stringify({ organizationId: report.scope.organizationId, locationId: report.scope.locationId ?? null, status: report.scope.status ?? null, channel: report.scope.channel ?? null, period: report.period })).digest("hex")
  const exportContext = { scope: "sales-performance-summary", filtersHash, rowCount, fileType: "csv", sensitivity: "financial" as const }
  const watermarkId = buildExportWatermark({ ...exportContext, organizationId: input.scope.organizationId, actorId: input.actorId, issuedAt: now })
  const decision = evaluateExportSafety({ action: "report.export", organizationId: input.scope.organizationId, actorId: input.actorId, actorPermissions: input.permissions, lastAuthAt: input.lastAuthAt, now,
    resourceType: "SalesPerformanceExport", resourceId: filtersHash, exportContext: { ...exportContext, watermarkId }, metadata: { checkedAt: report.checkedAt, currency: report.currency } })
  const content = "\uFEFF" + buildSalesPerformanceCsv(report, watermarkId, generatedAt)
  // Audit denials outside a transaction that would be rolled back by the denial error.
  await db.$transaction(tx => auditExportSafetyDecision(tx, decision))
  if (!decision.allowed) throw new BusinessRuleError(decision.safeMessage, decision.reasonCode === "FRESH_AUTH_REQUIRED" ? "FRESH_AUTH_REQUIRED" : "BUSINESS_RULE_VIOLATION")
  return { report, file: { content, fileName: `sales-performance-${watermarkId}.csv`, mimeType: "text/csv;charset=utf-8", generatedAt, watermarkId, contentHash: createHash("sha256").update(content).digest("hex") } }
}
