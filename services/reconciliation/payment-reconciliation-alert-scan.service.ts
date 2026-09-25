import "server-only"
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { unresolvedSuspenseStatuses } from "./payment-reconciliation-summary.service"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"

const kind = "RECONCILIATION_ALERT_SCAN_V1"
const pageSize = 100
const scanSchema = z.object({
  kind: z.literal(kind), scanId: z.string().uuid(), workerId: z.string().min(1).max(128),
  startedAt: z.string().datetime(), updatedAt: z.string().datetime(), completedAt: z.string().datetime().nullable(),
  state: z.enum(["REQUESTED", "RUNNING", "FAILED", "COMPLETE"]),
  phase: z.enum(["SUSPENSE", "READY_RUNS", "REVIEW", "COMPLETE"]),
  cursor: z.string().nullable(), version: z.number().int().nonnegative(),
  examined: z.number().int().nonnegative(), created: z.number().int().nonnegative(),
  errorCode: z.literal("ALERT_SCAN_PAGE_FAILED").nullable(),
}).strict()
export type ReconciliationAlertScan = z.infer<typeof scanSchema>
export const alertScanInputSchema = z.object({
  organizationId: z.string().trim().min(1).max(128), scanId: z.string().uuid(),
  workerId: z.string().trim().min(1).max(128), maxPages: z.number().int().min(1).max(100).default(10),
}).strict()
type Input = z.input<typeof alertScanInputSchema>

function payload(scan: ReconciliationAlertScan) { return { worker: scan } as Prisma.InputJsonObject }
function hash(scan: ReconciliationAlertScan) { return createHash("sha256").update(JSON.stringify(payload(scan))).digest("hex") }
function parse(value: unknown) { return scanSchema.parse((value as { worker?: unknown } | null)?.worker) }
const key = (scanId: string) => `operational-alert-scan:${scanId}`

export async function readLatestReconciliationAlertScan(organizationId: string): Promise<ReconciliationAlertScan | null> {
  if (!organizationId.trim()) throw new BusinessRuleError("Organization is required.", "TENANT_SCOPE_VIOLATION")
  const record = await db.paymentReconciliationInboxItem.findFirst({
    where: { organizationId, source: "RECONCILIATION_RUN", payloadSummary: { path: ["worker", "kind"], equals: kind } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { payloadSummary: true },
  })
  return record ? parse(record.payloadSummary) : null
}

// Internal worker boundary: the host supplies an explicit tenant. No user-facing
// action accepts this command. Each page and its progress commit together.
export async function runReconciliationAlertScan(input: Input): Promise<ReconciliationAlertScan> {
  const args = alertScanInputSchema.parse(input), now = new Date().toISOString()
  const initial: ReconciliationAlertScan = { kind, scanId: args.scanId, workerId: args.workerId, startedAt: now, updatedAt: now, completedAt: null, state: "REQUESTED", phase: "SUSPENSE", cursor: null, version: 0, examined: 0, created: 0, errorCode: null }
  // This is a control receipt, not a queued financial/provider message. Transport
  // PROCESSED keeps generic inbox leasing away; worker.state owns scan progress.
  await db.paymentReconciliationInboxItem.createMany({ skipDuplicates: true, data: {
    organizationId: args.organizationId, source: "RECONCILIATION_RUN", status: "PROCESSED",
    idempotencyKey: key(args.scanId), payloadSummary: payload(initial), payloadHash: hash(initial), correlationId: args.scanId,
  } })
  let last: ReconciliationAlertScan = initial
  for (let page = 0; page < args.maxPages; page++) {
    let version: number | undefined
    try {
      last = await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM payment_reconciliation_inbox_items WHERE "organizationId" = ${args.organizationId} AND source = 'RECONCILIATION_RUN' AND "idempotencyKey" = ${key(args.scanId)} FOR UPDATE`
        const record = await tx.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { organizationId_source_idempotencyKey: { organizationId: args.organizationId, source: "RECONCILIATION_RUN", idempotencyKey: key(args.scanId) } } })
        const scan = parse(record.payloadSummary)
        if (scan.state === "COMPLETE") return scan
        version = scan.version
        scan.workerId = args.workerId; scan.state = "RUNNING"; scan.errorCode = null
        const observedAt = new Date(), startedAt = new Date(scan.startedAt), cutoff = new Date(startedAt.getTime() + 86_400_000)
        const dayKey = observedAt.toISOString().slice(0, 10)
        if (scan.phase === "SUSPENSE") {
          const items = await tx.suspenseItem.findMany({
            where: { organizationId: args.organizationId, createdAt: { lte: startedAt }, status: { in: unresolvedSuspenseStatuses }, slaDeadline: { lte: cutoff }, ...(scan.cursor ? { id: { gt: scan.cursor } } : {}) },
            orderBy: { id: "asc" }, take: pageSize,
            select: { id: true, providerAccountId: true, reconciliationRunId: true, severity: true, amount: true, currencyCode: true, ownerId: true, slaDeadline: true, correlationId: true },
          })
          for (const item of items) {
            const breached = item.slaDeadline! <= observedAt, event = breached ? "sla-breached" : "sla-warning"
            const result = await publishPaymentReconciliationNotification({ type: `payment-reconciliation.suspense.${event}`, organizationId: args.organizationId, providerAccountId: item.providerAccountId, severity: item.severity, amount: item.amount.toFixed(2), currency: item.currencyCode, ownerId: item.ownerId, dueAt: item.slaDeadline, evidenceRef: { reconciliationRunId: item.reconciliationRunId, suspenseItemId: item.id }, correlationId: item.correlationId ?? args.scanId, dedupeKey: `${item.id}:${event}:${dayKey}` }, tx)
            scan.created += Number(result.created)
          }
          scan.examined += items.length
          scan.cursor = items.at(-1)?.id ?? scan.cursor
          if (items.length < pageSize) { scan.phase = "READY_RUNS"; scan.cursor = null }
        } else if (scan.phase === "READY_RUNS") {
          const runs = await tx.reconciliationRun.findMany({ where: { organizationId: args.organizationId, createdAt: { lte: startedAt }, status: "READY_FOR_SIGNOFF", ...(scan.cursor ? { id: { gt: scan.cursor } } : {}) }, orderBy: { id: "asc" }, take: pageSize, select: { id: true, providerAccountId: true, paymentRailId: true, correlationId: true } })
          for (const run of runs) {
            const result = await publishPaymentReconciliationNotification({ type: "payment-reconciliation.run.ready-for-signoff", organizationId: args.organizationId, providerAccountId: run.providerAccountId, paymentRailId: run.paymentRailId, evidenceRef: { reconciliationRunId: run.id }, correlationId: run.correlationId ?? args.scanId, dedupeKey: run.id }, tx)
            scan.created += Number(result.created)
          }
          scan.examined += runs.length; scan.cursor = runs.at(-1)?.id ?? scan.cursor
          if (runs.length < pageSize) { scan.phase = "REVIEW"; scan.cursor = null }
        } else if (scan.phase === "REVIEW") {
          const [exceptions, suspense, runs] = await Promise.all([
            tx.paymentException.count({ where: { organizationId: args.organizationId, status: { in: ["OPEN", "ASSIGNED", "ACKNOWLEDGED", "ESCALATED", "RESOLUTION_PROPOSED", "REOPENED"] } } }),
            tx.suspenseItem.count({ where: { organizationId: args.organizationId, status: { in: unresolvedSuspenseStatuses } } }),
            tx.reconciliationRun.count({ where: { organizationId: args.organizationId, status: { notIn: ["SIGNED", "VOIDED"] } } }),
          ])
          if (exceptions + suspense + runs > 0) {
            const result = await publishPaymentReconciliationNotification({ type: "payment-reconciliation.period-close.blocked", organizationId: args.organizationId, severity: exceptions + suspense > 0 ? "HIGH" : "MEDIUM", correlationId: args.scanId, dedupeKey: `period-close-blocker:${dayKey}` }, tx)
            scan.created += Number(result.created)
          }
          scan.phase = "COMPLETE"; scan.state = "COMPLETE"; scan.completedAt = observedAt.toISOString()
        }
        scan.version++; scan.updatedAt = observedAt.toISOString()
        await tx.paymentReconciliationInboxItem.update({ where: { id: record.id }, data: { payloadSummary: payload(scan), payloadHash: hash(scan), lastError: null, attempts: { increment: 1 }, processedAt: scan.state === "COMPLETE" ? observedAt : null } })
        return scan
      }, { timeout: 30_000 })
      if (last.state === "COMPLETE") break
    } catch (error) {
      // Do not overwrite a checkpoint advanced by another worker after our failed
      // transaction. Only a matching version may be marked failed.
      if (version !== undefined) await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM payment_reconciliation_inbox_items WHERE "organizationId" = ${args.organizationId} AND source = 'RECONCILIATION_RUN' AND "idempotencyKey" = ${key(args.scanId)} FOR UPDATE`
        const record = await tx.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { organizationId_source_idempotencyKey: { organizationId: args.organizationId, source: "RECONCILIATION_RUN", idempotencyKey: key(args.scanId) } } })
        const scan = parse(record.payloadSummary)
        if (scan.version !== version || scan.state === "COMPLETE") return
        scan.state = "FAILED"; scan.errorCode = "ALERT_SCAN_PAGE_FAILED"; scan.updatedAt = new Date().toISOString()
        await tx.paymentReconciliationInboxItem.update({ where: { id: record.id }, data: { payloadSummary: payload(scan), payloadHash: hash(scan), lastError: scan.errorCode } })
      })
      throw error
    }
  }
  return last
}
