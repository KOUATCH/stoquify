import { createHash, randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { assertSensitiveActionAllowed, auditSensitiveActionDecision, evaluateSensitiveAction, type SensitiveActionDecision } from "@/services/controls/sensitive-action.service"
import { suspenseCorrectionExportSchema, type SuspenseCorrectionExportInput } from "./payment-suspense-correction.contracts"
import type { SuspenseCorrectionControl } from "./payment-suspense-correction.service"
import { loadSuspenseResolutionArchiveInTx } from "./payment-suspense-resolution-archive.service"
import { suspenseResolutionRecordRevision } from "./payment-suspense-resolution-record"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"

export const suspenseResolutionExportSchema = suspenseCorrectionExportSchema
export type SuspenseResolutionExportInput = SuspenseCorrectionExportInput
type File = { receiptId: string; fileName: string; mimeType: "application/json"; content: string; sha256: string; replayed: boolean }
type Outcome = { value: File; denied?: never } | { denied: SensitiveActionDecision; value?: never }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const byteHash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex")

export async function exportSuspenseResolution(input: SuspenseResolutionExportInput, control: SuspenseCorrectionControl): Promise<File> {
  const command = suspenseResolutionExportSchema.parse(input), now = control.now ?? new Date()
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read") || !hasRbacPermission(control.actorPermissions, "accounting.journal.read")) throw new ForbiddenError("Reconciliation and accounting journal read permissions are required.")
  try {
    const result = await db.$transaction(async (tx): Promise<Outcome> => {
      if (!await tx.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } })) throw new ForbiddenError("An active workspace actor is required.")
      const authorization = { action: "payment.export" as const, actorId: control.actorId, organizationId: control.organizationId, actorPermissions: control.actorPermissions,
        lastAuthAt: control.lastAuthAt, now, resourceType: "SuspenseResolutionRecord", resourceId: command.recordId }
      const allowed = evaluateSensitiveAction(authorization)
      if (!allowed.allowed) { await auditSensitiveActionDecision(tx, allowed); return { denied: allowed } }
      const item = await tx.suspenseItem.findFirst({ where: { id: command.suspenseItemId, organizationId: control.organizationId }, select: { id: true, status: true, updatedAt: true } })
      const row = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: command.recordId, organizationId: control.organizationId, externalId: command.suspenseItemId, source: "SUSPENSE_POST", status: "PROCESSED" } })
      if (!item || !row) throw new NotFoundError("Resolution evidence is unavailable in this workspace.")
      if (suspenseResolutionRecordRevision(row) !== command.expectedRevision) throw new ConflictError("The selected record changed. Reload its history.")
      const evidence = await loadSuspenseResolutionArchiveInTx(tx, control.organizationId, item.id, row)
      const requestHash = suspenseEvidenceHash({ command, actorId: control.actorId }), key = `suspense-resolution-export:${command.idempotencyKey}`
      const previous = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, source: "CERTIFICATE_EXPORT", idempotencyKey: key } })
      if (previous) {
        const saved = suspenseMetadata(previous.payloadSummary)
        if (previous.externalId !== row.id || saved.kind !== "SUSPENSE_RESOLUTION_EXPORT_V1" || saved.requestHash !== requestHash) throw new IdempotencyConflictError("This export key belongs to a different request.")
        if (previous.status !== "PROCESSED" || previous.payloadHash !== suspenseEvidenceHash(previous.payloadSummary).slice(7)
          || typeof saved.content !== "string" || typeof saved.sha256 !== "string" || typeof saved.fileName !== "string" || byteHash(saved.content) !== saved.sha256) throw new ConflictError("Retained export bytes require review.")
        return { value: { receiptId: previous.id, fileName: saved.fileName, mimeType: "application/json", content: saved.content, sha256: saved.sha256, replayed: true } }
      }
      const receiptId = randomUUID(), watermarkId = `stoquify-resolution-${receiptId}`, fileName = `stoquify-suspense-resolution-${receiptId}.json`
      const content = JSON.stringify({ schema: "stoquify.suspense-resolution-evidence.v1", purpose: "Historical proposal, decision and financial evidence; not a new approval, statutory certificate or current settlement confirmation",
        organizationId: control.organizationId, ...evidence, sourceObservedAtExport: { suspenseItemId: item.id, status: item.status, updatedAt: item.updatedAt.toISOString() },
        export: { receiptId, exportedAt: now.toISOString(), exportedById: control.actorId, watermarkId,
          redactions: ["Raw provider payloads", "Unrelated item metadata", "Prior certificate payloads", "Journal descriptions", "Raw dimensions (hash retained)"],
          verification: "File SHA-256 detects changed bytes; application audit references are not an independent signer certificate" } }, null, 2)
      const sha256 = byteHash(content), payload = json({ kind: "SUSPENSE_RESOLUTION_EXPORT_V1", requestHash, content, sha256, fileName, recordId: row.id, exportedById: control.actorId })
      const decision = evaluateSensitiveAction({ ...authorization, exportContext: { scope: "suspense-resolution-record", filtersHash: command.expectedRevision,
        rowCount: evidence.originalJournal.lines.length + evidence.clearingJournal.lines.length + (evidence.clearingReversal?.lines.length ?? 0) + (evidence.originalReversal?.lines.length ?? 0), fileType: "json", sensitivity: "financial", watermarkId } })
      await auditSensitiveActionDecision(tx, decision)
      if (!decision.allowed) return { denied: decision }
      await tx.paymentReconciliationInboxItem.create({ data: { id: receiptId, organizationId: control.organizationId, source: "CERTIFICATE_EXPORT", status: "PROCESSED", externalId: row.id,
        idempotencyKey: key, payloadSummary: payload, payloadHash: suspenseEvidenceHash(payload).slice(7), processedAt: now, correlationId: receiptId } })
      await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "PAYMENT_SUSPENSE_RESOLUTION_EXPORT", resourceType: "SuspenseResolutionRecord", resourceId: row.id,
        message: "Historical resolution evidence file prepared; client download not attested", metadata: json({ receiptId, sha256, watermarkId, fileName, requestHash }) } })
      return { value: { receiptId, fileName, mimeType: "application/json", content, sha256, replayed: false } }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    if (result.denied) { if (result.denied.reasonCode === "MISSING_PERMISSION") throw new ForbiddenError(result.denied.safeMessage); assertSensitiveActionAllowed(result.denied); throw new ForbiddenError("Export unavailable.") }
    return result.value
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) throw new ConflictError("An export was issued concurrently. Retry the same request.")
    throw error
  }
}
