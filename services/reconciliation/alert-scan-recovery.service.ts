import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasAllRbacPermissions, expandPermissions } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, recordBusinessEventInTx, markBusinessEventAppliedInTx } from "@/services/events/business-event.service"
import { advanceReconciliationAlertScanPageInTx, reconciliationAlertScanSchema, hashReconciliationAlertScan, reconciliationAlertScanKey, type ReconciliationAlertScan } from "./payment-reconciliation-alert-scan.service"
import { alertRecoveryCommand, alertRecoveryReceipt, alertRecoveryStatusInput, type AlertRecoveryCommand, type AlertRecoveryReceipt, type AlertRecoveryView } from "./alert-scan-recovery.contracts"

type Tx = Prisma.TransactionClient
export type AlertRecoveryActor = { orgId: string; userId: string; permissions: readonly string[]; sessionId: string; sessionToken: string }
const permissions = ["payments.reconciliation.read", "payments.reconciliation.run"]
const enabled = () => process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED === "true"
const eventKey = (id: string) => `reconciliation-alert-recovery:${id}`
type Row = Prisma.PaymentReconciliationInboxItemGetPayload<Record<string, never>>
const envelope = z.object({ worker: reconciliationAlertScanSchema }).strict()

async function moduleAccess(tx: Tx, ctx: AlertRecoveryActor, intent: "read" | "write") {
  const result = await evaluateModuleAccessInTx(tx, { organizationId: ctx.orgId, userId: ctx.userId, moduleSlug: "payment_reconciliation", surfaceType: "action", surface: "reconciliation-alert-scan-recovery", accessIntent: intent, mode: "enforce" })
  if (!result.allowed) throw new ForbiddenError()
}
async function transaction<T>(ctx: AlertRecoveryActor, run: (tx: Tx) => Promise<T>) {
  if (!ctx.orgId || !ctx.userId || !ctx.sessionId || !ctx.sessionToken || !hasAllRbacPermissions(ctx.permissions, permissions)) throw new ForbiddenError()
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL statement_timeout = '5000ms'`
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${ctx.orgId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${ctx.userId} AND "organizationId" = ${ctx.orgId} FOR SHARE`
    await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" m ON m."A" = r.id WHERE m."B" = ${ctx.userId} AND r."organizationId" = ${ctx.orgId} ORDER BY r.id FOR SHARE OF r, m`
    const actor = await tx.user.findFirst({ where: { id: ctx.userId, organizationId: ctx.orgId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: ctx.orgId }, select: { permissions: true } } } })
    if (!actor || !isUsableAccount(actor, new Date()) || !hasAllRbacPermissions(expandPermissions(actor.roles.flatMap(role => role.permissions)), permissions)) throw new ForbiddenError()
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${ctx.sessionId} AND "userId" = ${ctx.userId} FOR SHARE`
    if (!await tx.session.findFirst({ where: { id: ctx.sessionId, token: ctx.sessionToken, userId: ctx.userId, expiresAt: { gt: new Date() } }, select: { id: true } })) throw new ForbiddenError()
    await moduleAccess(tx, ctx, "read")
    return run(tx)
  }, { isolationLevel: "ReadCommitted", timeout: 30000, maxWait: 1000 })
}

async function readLocked(tx: Tx, ctx: AlertRecoveryActor, scanId: string) {
  const idempotencyKey = reconciliationAlertScanKey(scanId)
  // Same lock as the host scanner. A worker's in-flight page must finish or roll
  // back before an operator can review/advance this checkpoint.
  await tx.$queryRaw`SELECT id FROM payment_reconciliation_inbox_items WHERE "organizationId" = ${ctx.orgId} AND source = 'RECONCILIATION_RUN' AND "idempotencyKey" = ${idempotencyKey} FOR UPDATE`
  const row = await tx.paymentReconciliationInboxItem.findUnique({ where: { organizationId_source_idempotencyKey: { organizationId: ctx.orgId, source: "RECONCILIATION_RUN", idempotencyKey } } })
  if (!row) throw new NotFoundError()
  return row
}
function validScan(row: Row, scanId: string): ReconciliationAlertScan | null {
  if (row.source !== "RECONCILIATION_RUN" || row.idempotencyKey !== reconciliationAlertScanKey(scanId) || row.status !== "PROCESSED" || row.providerAccountId !== null || row.leasedBy !== null || row.leaseToken !== null || row.nextAttemptAt !== null || row.attempts < 0) return null
  const parsed = envelope.safeParse(row.payloadSummary)
  if (!parsed.success) return null
  const scan = parsed.data.worker
  if (scan.scanId !== scanId || row.payloadHash !== hashReconciliationAlertScan(scan)) return null
  if ((scan.state === "COMPLETE") !== (scan.phase === "COMPLETE") || (scan.state === "COMPLETE") !== Boolean(scan.completedAt)) return null
  if ((row.processedAt?.toISOString() ?? null) !== scan.completedAt) return null
  if (scan.state === "FAILED" ? scan.errorCode !== "ALERT_SCAN_PAGE_FAILED" || row.lastError !== scan.errorCode : scan.errorCode !== null || row.lastError !== null) return null
  return scan
}
function revision(row: Row) {
  return hashBusinessPayload({ version: 1, id: row.id, organizationId: row.organizationId, source: row.source, key: row.idempotencyKey,
    status: row.status, attempts: row.attempts, payloadHash: row.payloadHash, updatedAt: row.updatedAt, processedAt: row.processedAt })
}
function view(row: Row, scanId: string, receipt: AlertRecoveryReceipt | null = null): AlertRecoveryView {
  const scan = validScan(row, scanId)
  const reason = !scan ? "ESCALATE" : scan.state === "COMPLETE" ? "COMPLETE" : !enabled() ? "DISABLED" : "READY"
  return { scanId, revision: scan ? revision(row) : null, eligible: reason === "READY", reason,
    progress: scan ? { state: scan.state, phase: scan.phase, version: scan.version, examined: scan.examined, created: scan.created, updatedAt: scan.updatedAt } : null, receipt }
}

async function replay(tx: Tx, ctx: AlertRecoveryActor, row: Row, input: AlertRecoveryCommand) {
  const event = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: ctx.orgId, eventSource: "INTERNAL", idempotencyKey: eventKey(input.commandId) } } })
  if (!event) return null
  const payload = event.payload as Record<string, unknown> | null
  if (event.eventType !== "reconciliation.alert_scan.recovered" || event.status !== "APPLIED" || event.schemaVersion !== 1 || event.sourceType !== null || event.sourceId !== row.id || event.actorId !== ctx.userId || payload?.entityType !== "ReconciliationAlertScan" || payload.commandHash !== hashBusinessPayload(input)) throw new IdempotencyConflictError()
  const receipt = alertRecoveryReceipt.safeParse(payload.result)
  if (event.payloadHash !== hashBusinessPayload(event.payload) || !receipt.success || receipt.data.scanId !== input.scanId || receipt.data.commandId !== input.commandId || receipt.data.toVersion !== receipt.data.fromVersion + 1 || receipt.data.recordedAt !== event.occurredAt.toISOString()) throw new ConflictError("Recovery evidence is unavailable.")
  return receipt.data
}

export async function readAlertScanRecovery(ctx: AlertRecoveryActor, input: unknown): Promise<AlertRecoveryView> {
  const query = alertRecoveryStatusInput.parse(input)
  return transaction(ctx, async tx => {
    const row = await readLocked(tx, ctx, query.scanId)
    return view(row, query.scanId, query.command ? await replay(tx, ctx, row, query.command) : null)
  })
}

export async function recoverAlertScanPage(ctx: AlertRecoveryActor, input: unknown): Promise<AlertRecoveryView> {
  const command = alertRecoveryCommand.parse(input)
  return transaction(ctx, async tx => {
    const row = await readLocked(tx, ctx, command.scanId)
    // Current authorization is checked first; completed command receipts survive
    // a later write kill switch, advancing worker or changed checkpoint.
    const existing = await replay(tx, ctx, row, command)
    if (existing) return view(row, command.scanId, existing)
    const scan = validScan(row, command.scanId)
    if (!scan) throw new BusinessRuleError("Escalate this scan; its recovery evidence is unavailable.")
    if (revision(row) !== command.expectedRevision || scan.state === "COMPLETE") throw new ConflictError("Refresh the scan checkpoint.")
    if (!enabled()) throw new BusinessRuleError("Alert recovery is unavailable.")
    await moduleAccess(tx, ctx, "write")
    const next = await advanceReconciliationAlertScanPageInTx(tx, { organizationId: ctx.orgId, workerId: "operator-recovery" }, row)
    const recordedAt = new Date(), result = alertRecoveryReceipt.parse({ commandId: command.commandId, scanId: command.scanId, fromVersion: scan.version, toVersion: next.version,
      state: next.state, phase: next.phase, examined: next.examined, created: next.created, recordedAt: recordedAt.toISOString() })
    const event = await recordBusinessEventInTx(tx, { organizationId: ctx.orgId, eventType: "reconciliation.alert_scan.recovered", eventSource: "INTERNAL", schemaVersion: 1,
      sourceId: row.id, actorId: ctx.userId, idempotencyKey: eventKey(command.commandId), occurredAt: recordedAt,
      payload: { entityType: "ReconciliationAlertScan", commandHash: hashBusinessPayload(command), result }, outboxMessages: [] })
    await markBusinessEventAppliedInTx(tx, ctx.orgId, event.event.id)
    await tx.auditLog.create({ data: { organizationId: ctx.orgId, userId: ctx.userId, entityType: "ReconciliationAlertScan", entityId: row.id,
      action: "ALERT_SCAN_RECOVERY_PAGE", changes: { commandId: command.commandId, scanId: command.scanId, fromVersion: scan.version, toVersion: next.version, state: next.state } } })
    const current = await readLocked(tx, ctx, command.scanId)
    return view(current, command.scanId, result)
  })
}
