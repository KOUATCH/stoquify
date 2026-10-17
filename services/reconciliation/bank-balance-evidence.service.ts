import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { lockCloseAssessmentPeriodsInTx, readCloseAssessmentPublicationTimeInTx } from "@/services/accounting/close-assessment-order.service"
import { lockCloseSourceRevisionInTx } from "@/services/accounting/close-source-revision.service"
import { bankBalanceInputSchema, bankBalanceDecisionSchema, bankBalanceReadSchema, bankBalanceHash } from "./bank-balance-contract"
import { readBankBalanceSnapshot } from "./bank-balance-sources.service"
export { bankBalanceInputSchema as proposeBankBalanceSchema, bankBalanceDecisionSchema as decideBankBalanceSchema, bankBalanceReadSchema as readBankBalanceSchema } from "./bank-balance-contract"
type Control = { organizationId: string; actorId: string; actorPermissions: string[]; lastAuthAt: Date }
function authorize(control: Omit<Control, "lastAuthAt">, permission: string, lastAuthAt?: Date) {
  if (!control.organizationId || !control.actorId || !hasRbacPermission(control.actorPermissions, permission)) throw new ForbiddenError("Bank reconciliation permission is required.")
  if (permission !== "payments.reconciliation.read") {
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
export async function readBankBalanceEvidence(input: z.input<typeof bankBalanceReadSchema>, control: Omit<Control, "lastAuthAt">) {
  authorize(control, "payments.reconciliation.read")
  const { evidenceId } = bankBalanceReadSchema.parse(input)
  const row = await db.bankBalanceEvidence.findFirst({ where: { id: evidenceId, organizationId: control.organizationId } })
  if (!row) throw new NotFoundError("Bank balance evidence not found")
  return row
}
export async function proposeBankBalanceEvidence(input: z.input<typeof bankBalanceInputSchema>, control: Control) {
  authorize(control, "payments.reconciliation.run", control.lastAuthAt)
  const parsed = bankBalanceInputSchema.parse(input)
  return db.$transaction(async tx => {
    await lockSources(tx, control.organizationId)
    const existing = await tx.bankBalanceEvidence.findUnique({ where: { organizationId_idempotencyKey: { organizationId: control.organizationId, idempotencyKey: parsed.idempotencyKey } } })
    if (existing) {
      if (existing.proposedById !== control.actorId || bankBalanceHash(existing.input) !== bankBalanceHash(parsed)) throw new IdempotencyConflictError()
      return existing
    }
    const snapshot = await readBankBalanceSnapshot(tx, control.organizationId, parsed, await readCloseAssessmentPublicationTimeInTx(tx))
    const evidenceHash = bankBalanceHash({ organizationId: control.organizationId, proposedById: control.actorId, input: parsed, snapshot })
    authorize(control, "payments.reconciliation.run", control.lastAuthAt)
    const createdAt = await readCloseAssessmentPublicationTimeInTx(tx)
    return tx.bankBalanceEvidence.create({ data: { createdAt, organizationId: control.organizationId, providerAccountId: parsed.providerAccountId, periodId: parsed.periodId,
      statementFileId: parsed.statementFileId, idempotencyKey: parsed.idempotencyKey, proposedById: control.actorId, input: parsed, snapshot, evidenceHash } })
  }, txOptions)
}
export async function decideBankBalanceEvidence(input: z.input<typeof bankBalanceDecisionSchema>, control: Control) {
  authorize(control, "payments.reconciliation.sign", control.lastAuthAt)
  const parsed = bankBalanceDecisionSchema.parse(input)
  if (parsed.decision === "REVOKE" && !parsed.reason) throw new BusinessRuleError("A revocation reason is required.")
  return db.$transaction(async tx => {
    await lockSources(tx, control.organizationId)
    const row = await tx.bankBalanceEvidence.findFirst({ where: { id: parsed.evidenceId, organizationId: control.organizationId } })
    if (!row) throw new NotFoundError("Bank balance evidence not found")
    if (row.evidenceHash !== parsed.expectedEvidenceHash || bankBalanceHash({ organizationId: row.organizationId, proposedById: row.proposedById, input: row.input, snapshot: row.snapshot }) !== row.evidenceHash) throw new ConflictError("Bank evidence changed; refresh the review.")
    const target = parsed.decision === "APPROVE" ? "APPROVED" : "REVOKED"
    if (target === "APPROVED") {
      if (row.proposedById === control.actorId) throw new BusinessRuleError("An independent reviewer must approve bank balance evidence.", "SOD_VIOLATION")
      if (row.status === "REVOKED") throw new ConflictError("Revoked evidence cannot be approved.")
      const original = bankBalanceInputSchema.parse(row.input)
      if (original.providerAccountId !== row.providerAccountId || original.periodId !== row.periodId || original.statementFileId !== row.statementFileId) throw new ConflictError("Bank evidence source binding changed.")
      const snapshot = await readBankBalanceSnapshot(tx, control.organizationId, original, await readCloseAssessmentPublicationTimeInTx(tx))
      if (bankBalanceHash(snapshot) !== bankBalanceHash(row.snapshot)) throw new ConflictError("Bank or ledger sources changed; propose new evidence.")
      if (!snapshot.balances.balanced) throw new BusinessRuleError("Opening, closing and statement roll-forward differences must all be zero before approval.")
    }
    if (row.status === target) {
      if ((target === "APPROVED" ? row.approvedById : row.revokedById) !== control.actorId || (target === "REVOKED" && row.revocationReason !== parsed.reason)) throw new ConflictError("This evidence already has a different decision.")
      return row
    }
    if (row.status === "REVOKED" || !["PROPOSED", "APPROVED"].includes(row.status)) throw new ConflictError("Invalid bank evidence transition.")
    authorize(control, "payments.reconciliation.sign", control.lastAuthAt)
    const now = await readCloseAssessmentPublicationTimeInTx(tx)
    const result = await tx.bankBalanceEvidence.updateMany({ where: { id: row.id, organizationId: control.organizationId, status: row.status, evidenceHash: row.evidenceHash }, data: target === "APPROVED"
      ? { status: target, approvedById: control.actorId, approvedAt: now }
      : { status: target, revokedById: control.actorId, revokedAt: now, revocationReason: parsed.reason } })
    if (result.count !== 1) throw new ConflictError("Bank evidence changed concurrently.")
    return tx.bankBalanceEvidence.findUniqueOrThrow({ where: { id: row.id } })
  }, txOptions)
}
