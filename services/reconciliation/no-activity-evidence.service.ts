import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ForbiddenError, NotFoundError, ConflictError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { lockReconciliationCloseCatalogInTx, lockReconciliationClosePeriodsInTx, withReconciliationCloseRetry } from "./reconciliation-close-order.service"
import { lockReconciliationProviderInTx } from "./reconciliation-source-locks"
import { readAccountCloseCoverage } from "./account-close-coverage.service"
import { noActivityEvidenceHash } from "./account-close-coverage"

const identifier = z.string().trim().min(1).max(200)
export const readNoActivitySchema = z.object({ evidenceId: identifier }).strict()
export const proposeNoActivitySchema = z.object({ providerAccountId: identifier, periodId: identifier, idempotencyKey: identifier,
  sourceReference: z.string().trim().min(1).max(1000), sourceDocumentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), reason: z.string().trim().min(10).max(2000) }).strict()
export const decideNoActivitySchema = z.object({ evidenceId: identifier, expectedEvidenceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), decision: z.enum(["APPROVE", "REVOKE"]), reason: z.string().trim().min(10).max(2000).optional() }).strict()
type Control = { organizationId: string; actorId: string; actorPermissions: string[]; lastAuthAt: Date }

export async function readNoActivityEvidence(input: z.input<typeof readNoActivitySchema>, control: Omit<Control, "lastAuthAt">) {
  if (!control.organizationId || !control.actorId || !hasRbacPermission(control.actorPermissions, "payments.reconciliation.read")) throw new ForbiddenError("Reconciliation evidence permission is required.")
  const parsed = readNoActivitySchema.parse(input)
  const evidence = await db.reconciliationNoActivityEvidence.findFirst({ where: { id: parsed.evidenceId, organizationId: control.organizationId } })
  if (!evidence) throw new NotFoundError("No-activity evidence not found")
  return evidence
}

function authorize(control: Control, permission: string) {
  if (!control.organizationId || !control.actorId || !hasRbacPermission(control.actorPermissions, permission)) throw new ForbiddenError("Reconciliation evidence permission is required.")
  const age = Date.now() - control.lastAuthAt?.getTime()
  if (!Number.isFinite(age) || age < 0 || age > 300000) throw new ForbiddenError("Fresh authentication is required.")
}

export async function proposeNoActivityEvidence(input: z.input<typeof proposeNoActivitySchema>, control: Control) {
  authorize(control, "payments.reconciliation.run")
  const parsed = proposeNoActivitySchema.parse(input)
  return withReconciliationCloseRetry(() => db.$transaction(async tx => {
    await lockReconciliationCloseCatalogInTx(tx, control.organizationId)
    await lockReconciliationClosePeriodsInTx(tx, control.organizationId)
    await lockReconciliationProviderInTx(tx, control.organizationId, parsed.providerAccountId)
    const period = await tx.accountingPeriod.findFirst({ where: { id: parsed.periodId, organizationId: control.organizationId } })
    const account = await tx.providerAccount.findFirst({ where: { id: parsed.providerAccountId, organizationId: control.organizationId } })
    if (!period || !account) throw new NotFoundError("Period or provider account not found")
    const payload = { ...parsed, organizationId: control.organizationId, proposedById: control.actorId, periodStart: period.startDate, periodEnd: period.endDate, currencyCode: account.currencyCode }
    const evidenceHash = noActivityEvidenceHash(payload)
    const existing = await tx.reconciliationNoActivityEvidence.findUnique({ where: { organizationId_idempotencyKey: { organizationId: control.organizationId, idempotencyKey: parsed.idempotencyKey } } })
    if (existing) {
      if (existing.evidenceHash !== evidenceHash) throw new IdempotencyConflictError()
      return existing
    }
    const now = new Date()
    if (period.endDate >= now) throw new BusinessRuleError("No-activity evidence requires a completed period.")
    const coverage = await readAccountCloseCoverage(tx, createCloseControlScope(control.organizationId, period, now))
    const row = coverage.accounts.find(row => row.providerAccountId === account.id)
    if (!row || row.activityCount || row.obligationCount) throw new BusinessRuleError("Activity or unresolved obligations contradict no activity.")
    authorize(control, "payments.reconciliation.run")
    return tx.reconciliationNoActivityEvidence.create({ data: { ...payload, evidenceHash, createdAt: now } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))
}

export async function decideNoActivityEvidence(input: z.input<typeof decideNoActivitySchema>, control: Control) {
  authorize(control, "payments.reconciliation.sign")
  const parsed = decideNoActivitySchema.parse(input)
  if (parsed.decision === "REVOKE" && !parsed.reason) throw new BusinessRuleError("A revocation reason is required.")
  return withReconciliationCloseRetry(() => db.$transaction(async tx => {
    await lockReconciliationCloseCatalogInTx(tx, control.organizationId)
    const affectedPeriodIds = await lockReconciliationClosePeriodsInTx(tx, control.organizationId)
    const evidence = await tx.reconciliationNoActivityEvidence.findFirst({ where: { id: parsed.evidenceId, organizationId: control.organizationId } })
    if (!evidence) throw new NotFoundError("No-activity evidence not found")
    await lockReconciliationProviderInTx(tx, control.organizationId, evidence.providerAccountId)
    if (parsed.expectedEvidenceHash !== evidence.evidenceHash || noActivityEvidenceHash(evidence) !== evidence.evidenceHash) throw new ConflictError("Evidence changed; review the current source.")
    if (parsed.decision === "APPROVE" && evidence.proposedById === control.actorId) throw new BusinessRuleError("An independent reviewer must approve no-activity evidence.", "SOD_VIOLATION")
    const target = parsed.decision === "APPROVE" ? "APPROVED" : "REVOKED"
    if (evidence.status === target) {
      if ((target === "APPROVED" ? evidence.approvedById : evidence.revokedById) !== control.actorId || (target === "REVOKED" && evidence.revocationReason !== parsed.reason)) throw new ConflictError("This evidence already has a different decision.")
      return evidence
    }
    if (evidence.status === "REVOKED" || (target === "APPROVED" && evidence.status !== "PROPOSED")) throw new ConflictError("Evidence cannot make this transition.")
    const now = new Date()
    if (target === "APPROVED") {
      const period = await tx.accountingPeriod.findFirst({ where: { id: evidence.periodId, organizationId: control.organizationId } })
      const account = await tx.providerAccount.findFirst({ where: { id: evidence.providerAccountId, organizationId: control.organizationId } })
      if (!period || !account || +period.startDate !== +evidence.periodStart || +period.endDate !== +evidence.periodEnd || account.currencyCode !== evidence.currencyCode) throw new ConflictError("Account or period changed; propose new evidence.")
      if (period.endDate >= now) throw new BusinessRuleError("No-activity evidence requires a completed period.")
      const coverage = await readAccountCloseCoverage(tx, createCloseControlScope(control.organizationId, period, now))
      const row = coverage.accounts.find(row => row.providerAccountId === account.id)
      if (!row || row.activityCount || row.obligationCount) throw new BusinessRuleError("Activity or unresolved obligations contradict no activity.")
    }
    authorize(control, "payments.reconciliation.sign")
    const result = await tx.reconciliationNoActivityEvidence.updateMany({ where: { id: evidence.id, organizationId: control.organizationId, status: evidence.status, evidenceHash: parsed.expectedEvidenceHash }, data: target === "APPROVED"
      ? { status: target, approvedById: control.actorId, approvedAt: now }
      : { status: target, revokedById: control.actorId, revokedAt: now, revocationReason: parsed.reason } })
    if (result.count !== 1) throw new ConflictError("Evidence changed concurrently; refresh and retry.")
    await recordCloseCertificationInvalidationsForSourceInTx(tx, control.organizationId, {
      sourceCode: "PAYMENT_NO_ACTIVITY_EVIDENCE_CHANGED", sourceId: evidence.id, periodId: evidence.periodId, periodIds: affectedPeriodIds,
      periodStart: evidence.periodStart, periodEnd: evidence.periodEnd, staleReason: `No-activity evidence ${target.toLowerCase()}; reassess close coverage.`, newEvidenceHash: evidence.evidenceHash,
    }, { actorId: control.actorId, now })
    return tx.reconciliationNoActivityEvidence.findUniqueOrThrow({ where: { id: evidence.id } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))
}
