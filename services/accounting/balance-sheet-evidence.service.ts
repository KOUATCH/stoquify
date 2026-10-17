import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { lockCloseAssessmentPeriodsInTx, readCloseAssessmentPublicationTimeInTx } from "@/services/accounting/close-assessment-order.service"
import { lockCloseSourceRevisionInTx } from "@/services/accounting/close-source-revision.service"
import { balanceSheetInputSchema, balanceSheetDecisionSchema, balanceSheetReadSchema, balanceSheetHash } from "./balance-sheet-contract"
import { readBalanceSheetSnapshot } from "./balance-sheet-sources.service"
export { balanceSheetInputSchema as proposeBalanceSheetSchema, balanceSheetDecisionSchema as decideBalanceSheetSchema, balanceSheetReadSchema as readBalanceSheetSchema } from "./balance-sheet-contract"
type Control = { organizationId: string; actorId: string; actorPermissions: string[]; lastAuthAt: Date }
function authorize(control: Omit<Control, "lastAuthAt">, permission: string, lastAuthAt?: Date) {
  if (!control.organizationId || !control.actorId || !hasRbacPermission(control.actorPermissions, permission)) throw new ForbiddenError("Balance-sheet reconciliation permission is required.")
  if (permission !== "accounting.close.read") {
    const age = Date.now() - (lastAuthAt?.getTime() ?? NaN)
    if (!Number.isFinite(age) || age < 0 || age > 300000) throw new ForbiddenError("Fresh authentication is required.")
  }
}
async function lockSources(tx: Prisma.TransactionClient, organizationId: string) {
  const periods = await tx.accountingPeriod.findMany({ where: { organizationId }, select: { id: true }, orderBy: { id: "asc" } })
  await lockCloseAssessmentPeriodsInTx(tx, organizationId, periods.map(row => row.id))
  await lockCloseSourceRevisionInTx(tx, organizationId)
}
const txOptions = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000 }
export async function readBalanceSheetEvidence(input: z.input<typeof balanceSheetReadSchema>, control: Omit<Control, "lastAuthAt">) {
  authorize(control, "accounting.close.read")
  const { evidenceId } = balanceSheetReadSchema.parse(input)
  const row = await db.balanceSheetEvidence.findFirst({ where: { id: evidenceId, organizationId: control.organizationId } })
  if (!row) throw new NotFoundError("Balance-sheet evidence not found")
  return row
}
export async function proposeBalanceSheetEvidence(input: z.input<typeof balanceSheetInputSchema>, control: Control) {
  authorize(control, "accounting.close.run", control.lastAuthAt)
  const parsed = balanceSheetInputSchema.parse(input)
  return db.$transaction(async tx => {
    await lockSources(tx, control.organizationId)
    const existing = await tx.balanceSheetEvidence.findUnique({ where: { organizationId_idempotencyKey: { organizationId: control.organizationId, idempotencyKey: parsed.idempotencyKey } } })
    if (existing) {
      if (existing.proposedById !== control.actorId || balanceSheetHash(existing.input) !== balanceSheetHash(parsed)) throw new IdempotencyConflictError()
      return existing
    }
    const snapshot = await readBalanceSheetSnapshot(tx, control.organizationId, parsed, await readCloseAssessmentPublicationTimeInTx(tx))
    const evidenceHash = balanceSheetHash({ organizationId: control.organizationId, proposedById: control.actorId, input: parsed, snapshot })
    authorize(control, "accounting.close.run", control.lastAuthAt)
    const createdAt = await readCloseAssessmentPublicationTimeInTx(tx)
    return tx.balanceSheetEvidence.create({ data: { createdAt, organizationId: control.organizationId, ledgerAccountId: parsed.ledgerAccountId, periodId: parsed.periodId,
      currency: parsed.currency, idempotencyKey: parsed.idempotencyKey, proposedById: control.actorId, input: parsed, snapshot, evidenceHash } })
  }, txOptions)
}
export async function decideBalanceSheetEvidence(input: z.input<typeof balanceSheetDecisionSchema>, control: Control) {
  authorize(control, "accounting.close.certify", control.lastAuthAt)
  const parsed = balanceSheetDecisionSchema.parse(input)
  if (parsed.decision === "REVOKE" && !parsed.reason) throw new BusinessRuleError("A revocation reason is required.")
  return db.$transaction(async tx => {
    await lockSources(tx, control.organizationId)
    const row = await tx.balanceSheetEvidence.findFirst({ where: { id: parsed.evidenceId, organizationId: control.organizationId } })
    if (!row) throw new NotFoundError("Balance-sheet evidence not found")
    if (row.evidenceHash !== parsed.expectedEvidenceHash || balanceSheetHash({ organizationId: row.organizationId, proposedById: row.proposedById, input: row.input, snapshot: row.snapshot }) !== row.evidenceHash) throw new ConflictError("Balance-sheet evidence changed; refresh the review.")
    const target = parsed.decision === "APPROVE" ? "APPROVED" : "REVOKED"
    if (target === "APPROVED") {
      if (row.proposedById === control.actorId) throw new BusinessRuleError("An independent reviewer must approve balance-sheet evidence.", "SOD_VIOLATION")
      if (row.status === "REVOKED") throw new ConflictError("Revoked evidence cannot be approved.")
      const original = balanceSheetInputSchema.parse(row.input)
      if (original.ledgerAccountId !== row.ledgerAccountId || original.periodId !== row.periodId || original.currency !== row.currency || original.idempotencyKey !== row.idempotencyKey) throw new ConflictError("Balance-sheet evidence source binding changed.")
      const snapshot = await readBalanceSheetSnapshot(tx, control.organizationId, original, await readCloseAssessmentPublicationTimeInTx(tx))
      if (balanceSheetHash(snapshot) !== balanceSheetHash(row.snapshot)) throw new ConflictError("Supporting or ledger sources changed; propose new evidence.")
      if (!snapshot.balances.balanced) throw new BusinessRuleError("Opening, additions, reductions, closing and every schedule item must reconcile exactly before approval.")
    }
    if (row.status === target) {
      if ((target === "APPROVED" ? row.approvedById : row.revokedById) !== control.actorId || (target === "REVOKED" && row.revocationReason !== parsed.reason)) throw new ConflictError("This evidence already has a different decision.")
      return row
    }
    if (row.status === "REVOKED" || !["PROPOSED", "APPROVED"].includes(row.status)) throw new ConflictError("Invalid balance-sheet evidence transition.")
    authorize(control, "accounting.close.certify", control.lastAuthAt)
    const now = await readCloseAssessmentPublicationTimeInTx(tx)
    const result = await tx.balanceSheetEvidence.updateMany({ where: { id: row.id, organizationId: control.organizationId, status: row.status, evidenceHash: row.evidenceHash }, data: target === "APPROVED"
      ? { status: target, approvedById: control.actorId, approvedAt: now }
      : { status: target, revokedById: control.actorId, revokedAt: now, revocationReason: parsed.reason } })
    if (result.count !== 1) throw new ConflictError("Balance-sheet evidence changed concurrently.")
    return tx.balanceSheetEvidence.findUniqueOrThrow({ where: { id: row.id } })
  }, txOptions)
}
