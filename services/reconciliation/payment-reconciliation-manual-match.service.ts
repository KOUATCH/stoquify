import { MatchRule, MatchStatus, Prisma, type MatchRecord } from "@prisma/client"
import { createHash, randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { ApplicationError, BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { auditSensitiveActionDecision, evaluateSensitiveAction, type SensitiveActionDecision } from "@/services/controls/sensitive-action.service"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"
import { MANUAL_ALLOCATION_STATUSES, getManualRemainingAmounts, manualMatchAmount as amount, validateManualMatchEvidence } from "./manual-match-evidence"
import { lockReconciliationPaymentSourcesInTx } from "./reconciliation-source-locks"

type ControlContext = { actorPermissions: readonly string[]; lastAuthAt?: Date | number | string | null; now?: Date | number | string | null }
export type ProposeManualMatchInput = {
  organizationId: string; providerAccountId: string; paymentTransactionId: string
  providerEventId?: string; statementLineId?: string; proposedById: string
  amountMatched: Prisma.Decimal.Value; currencyCode?: string; idempotencyKey: string
  supersedesProposalId?: string
  control: ControlContext; correlationId?: string
}
export type ApproveManualMatchInput = {
  organizationId: string; proposedMatchId: string; approvedById: string
  expectedEvidenceRevision: string; control: ControlContext; correlationId?: string
}
type Receipt = { matchId: string; status: MatchStatus; alreadyApplied: boolean; correlationId: string }
type Controlled<T> = { value: T; denied?: never; moduleDenied?: never }
  | { denied: SensitiveActionDecision; value?: never; moduleDenied?: never }
  | { moduleDenied: ModuleEntitlementDecision; denied?: never; value?: never }
const metadata = (value: Prisma.JsonValue | null) => value && typeof value === "object" && !Array.isArray(value) ? value : {}
const hash = (value: unknown) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`
const receipt = (row: Pick<MatchRecord, "id" | "status" | "correlationId">, alreadyApplied: boolean): Receipt => ({ matchId: row.id, status: row.status, correlationId: row.correlationId ?? row.id, alreadyApplied })

async function controlledTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<Controlled<T>>): Promise<T> {
  try {
    const result = await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    if (result.moduleDenied) throw new ApplicationError("FORBIDDEN", "Reconciliation write access is unavailable. Ask your module administrator to review the current grants and required dependencies.", 403)
    if (result.denied && !result.denied.allowed) {
      const code = result.denied.reasonCode === "MISSING_PERMISSION" ? "FORBIDDEN"
        : result.denied.reasonCode === "SELF_APPROVAL_BLOCKED" ? "SOD_VIOLATION" : "FRESH_AUTH_REQUIRED"
      throw new ApplicationError(code, result.denied.safeMessage, code === "FORBIDDEN" ? 403 : 422)
    }
    return result.value as T
  } catch (error) {
    const sqlState = error && typeof error === "object" && "meta" in error && error.meta && typeof error.meta === "object" && "code" in error.meta ? error.meta.code : null
    if (error && typeof error === "object" && "code" in error && (error.code === "P2034" || (error.code === "P2010" && sqlState === "40001"))) {
      throw new ApplicationError("CONCURRENCY_CONFLICT", "Reconciliation changed while saving. Retry the same request to check its recorded result.", 409)
    }
    throw error
  }
}

async function moduleWriteDecision(tx: Prisma.TransactionClient, organizationId: string, actorId: string, control: ControlContext) {
  const decision = await evaluateModuleAccessInTx(tx, {
    organizationId, userId: actorId, actorPermissions: control.actorPermissions,
    moduleSlug: "payment_reconciliation", surfaceType: "action",
    surface: "services/reconciliation/payment-reconciliation-manual-match.service.ts", accessIntent: "write", mode: "enforce",
  })
  if (!decision.allowed) await tx.auditLog.create({ data: {
    organizationId, userId: actorId, entityType: "ModuleEntitlementDecision", entityId: "payment_reconciliation:manual-match",
    action: "MODULE_ENTITLEMENT_ENFORCED", changes: {
      moduleSlug: decision.moduleSlug, surface: decision.surface, accessIntent: decision.accessIntent,
      result: decision.result, reason: decision.reason, entitlementStatus: decision.entitlement?.status ?? null,
      missingDependencies: decision.missingDependencies.map(item => item.dependsOnSlug),
      rbacWildcardPresent: decision.rbacWildcardPresent, rbacWildcardBypassedEntitlement: false,
    },
  } })
  return decision
}

async function lockProvider(tx: Prisma.TransactionClient, organizationId: string, providerAccountId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "provider_accounts" WHERE "id" = ${providerAccountId}
    AND "organizationId" = ${organizationId} FOR UPDATE`)
  if (rows.length !== 1) throw new NotFoundError("Provider account not found")
}

async function loadEvidence(tx: Prisma.TransactionClient, input: {
  organizationId: string; providerAccountId: string; paymentTransactionId: string
  providerEventId?: string | null; statementLineId?: string | null; currencyCode?: string
}) {
  if (Boolean(input.providerEventId) === Boolean(input.statementLineId)) throw new BusinessRuleError("Manual match requires exactly one provider event or statement line.")
  const scope = { organizationId: input.organizationId, providerAccountId: input.providerAccountId }
  await lockReconciliationPaymentSourcesInTx(tx, { ...scope, paymentTransactionId: input.paymentTransactionId })
  const [provider, payment, event, line] = await Promise.all([
    tx.providerAccount.findFirst({ where: { id: input.providerAccountId, organizationId: input.organizationId }, select: { id: true, currencyCode: true, status: true, archivedAt: true } }),
    tx.paymentTransaction.findFirst({ where: { ...scope, id: input.paymentTransactionId }, select: { id: true, amount: true, currencyCode: true, direction: true, state: true, providerTransactionId: true, providerReference: true } }),
    input.providerEventId ? tx.providerEvent.findFirst({ where: { ...scope, id: input.providerEventId }, select: { id: true, amount: true, currencyCode: true, direction: true, status: true, signatureValid: true, rawPayloadHash: true, archivedAt: true } }) : null,
    input.statementLineId ? tx.statementLine.findFirst({ where: { ...scope, id: input.statementLineId }, select: { id: true, amount: true, currencyCode: true, direction: true, status: true, rawLineHash: true, archivedAt: true } }) : null,
  ])
  if (!provider || provider.status !== "ACTIVE" || provider.archivedAt) throw new BusinessRuleError("An active provider account is required.")
  if (!payment) throw new NotFoundError("Payment transaction not found")
  if (input.providerEventId && !event) throw new NotFoundError("Provider event not found")
  if (input.statementLineId && !line) throw new NotFoundError("Statement line not found")
  const { currencyCode, internalAmount, externalAmount } = validateManualMatchEvidence({ provider, payment, event, line, currencyCode: input.currencyCode })
  const evidenceRevision = hash({ provider, payment: { ...payment, amount: internalAmount.toFixed(2) }, event: event ? { ...event, amount: externalAmount.toFixed(2) } : null, line: line ? { ...line, amount: externalAmount.toFixed(2) } : null })
  const evidenceSummary = {
    internalAmount: internalAmount.toFixed(2), externalAmount: externalAmount.toFixed(2),
    currencyCode, direction: payment.direction, externalSource: event ? "PROVIDER_EVENT" : "STATEMENT_LINE",
  }
  return { currencyCode, internalAmount, externalAmount, evidenceRevision, evidenceSummary }
}

async function assertRemainingAmount(tx: Prisma.TransactionClient, input: {
  organizationId: string; providerAccountId: string; paymentTransactionId: string; providerEventId?: string | null; statementLineId?: string | null
}, requested: Prisma.Decimal, evidence: Awaited<ReturnType<typeof loadEvidence>>) {
  const rows = await tx.matchRecord.findMany({ where: {
    organizationId: input.organizationId, providerAccountId: input.providerAccountId,
    status: { in: MANUAL_ALLOCATION_STATUSES }, OR: [
      { paymentTransactionId: input.paymentTransactionId },
      ...(input.providerEventId ? [{ providerEventId: input.providerEventId }] : []),
      ...(input.statementLineId ? [{ statementLineId: input.statementLineId }] : []),
    ],
  }, select: { id: true, paymentTransactionId: true, providerEventId: true, statementLineId: true, amountMatched: true, currencyCode: true } })
  const remaining = getManualRemainingAmounts(input, evidence, rows)
  if (requested.gt(remaining.availableAmount)) throw new ConflictError("Manual match amount exceeds the remaining unallocated evidence. Refresh and review existing allocations.")
}

export async function proposeManualMatch(input: ProposeManualMatchInput): Promise<Receipt> {
  const requested = amount(input.amountMatched)
  if (!input.idempotencyKey || input.idempotencyKey.length < 16 || input.idempotencyKey.length > 128) throw new BusinessRuleError("A stable manual match request key is required.")
  const requestFingerprint = hash({ paymentTransactionId: input.paymentTransactionId, providerEventId: input.providerEventId ?? null, statementLineId: input.statementLineId ?? null, amount: requested.toFixed(2), currency: input.currencyCode ?? null, supersedesProposalId: input.supersedesProposalId ?? null })
  return controlledTransaction<Receipt>(async tx => {
    const moduleDecision = await moduleWriteDecision(tx, input.organizationId, input.proposedById, input.control)
    if (!moduleDecision.allowed) return { moduleDenied: moduleDecision }
    await lockProvider(tx, input.organizationId, input.providerAccountId)
    const decision = evaluateSensitiveAction({ action: "payment.reconciliation.match", organizationId: input.organizationId, actorId: input.proposedById, actorPermissions: input.control.actorPermissions, resourceType: "PaymentReconciliationMatch", resourceId: input.paymentTransactionId, amount: requested, currency: input.currencyCode })
    await auditSensitiveActionDecision(tx, decision)
    if (!decision.allowed) return { denied: decision }
    const existing = await tx.matchRecord.findMany({ where: { organizationId: input.organizationId, providerAccountId: input.providerAccountId, matchedById: input.proposedById, rule: MatchRule.MANUAL, status: MatchStatus.PROPOSED, metadata: { path: ["requestKey"], equals: input.idempotencyKey } }, take: 2 })
    if (existing.length > 1) throw new ConflictError("Duplicate request history requires review.")
    if (existing[0]) {
      if (metadata(existing[0].metadata).requestFingerprint !== requestFingerprint) throw new IdempotencyConflictError()
      return { value: receipt(existing[0], true) }
    }
    const evidence = await loadEvidence(tx, input)
    await assertRemainingAmount(tx, input, requested, evidence)
    if (input.supersedesProposalId) {
      const prior = await tx.matchRecord.findFirst({ where: { id: input.supersedesProposalId, organizationId: input.organizationId, providerAccountId: input.providerAccountId, matchedById: input.proposedById, rule: MatchRule.MANUAL, status: MatchStatus.PROPOSED } })
      if (!prior) throw new NotFoundError("Your earlier proposal was not found")
      if (prior.paymentTransactionId !== input.paymentTransactionId || (prior.providerEventId ?? null) !== (input.providerEventId ?? null) || (prior.statementLineId ?? null) !== (input.statementLineId ?? null)) throw new ConflictError("Renewal must refer to the same evidence pair.")
      const decisions = await tx.matchRecord.findMany({ where: { organizationId: input.organizationId, providerAccountId: input.providerAccountId, correctionOfId: prior.id, status: { in: [MatchStatus.APPROVED, MatchStatus.REJECTED, MatchStatus.CORRECTED, MatchStatus.VOIDED] } }, take: 1 })
      if (decisions.length) throw new ConflictError("This proposal already has a recorded decision. Refresh its history.")
    }
    const correlationId = input.correlationId ?? randomUUID()
    const match = await tx.matchRecord.create({ data: {
      organizationId: input.organizationId, providerAccountId: input.providerAccountId, paymentTransactionId: input.paymentTransactionId,
      providerEventId: input.providerEventId, statementLineId: input.statementLineId, rule: MatchRule.MANUAL, status: MatchStatus.PROPOSED,
      confidence: new Prisma.Decimal(75), amountMatched: requested, currencyCode: evidence.currencyCode, matchedById: input.proposedById, matchedAt: new Date(), correlationId,
      metadata: { proposedById: input.proposedById, makerCheckerRequired: true, requestKey: input.idempotencyKey, requestFingerprint, evidenceRevision: evidence.evidenceRevision, evidenceSummary: evidence.evidenceSummary, supersedesProposalId: input.supersedesProposalId ?? null },
    } })
    if (input.supersedesProposalId) await tx.matchRecord.create({ data: {
      organizationId: input.organizationId, providerAccountId: input.providerAccountId,
      rule: MatchRule.MANUAL, status: MatchStatus.VOIDED, currencyCode: evidence.currencyCode,
      matchedById: input.proposedById, matchedAt: new Date(), correctionOfId: input.supersedesProposalId,
      correctionReason: "REPLACED_BY_CURRENT_EVIDENCE_PROPOSAL", correlationId,
      metadata: { replacementProposalId: match.id },
    } })
    await publishPaymentReconciliationNotification({ type: "payment-reconciliation.manual-match.proposed", organizationId: input.organizationId, providerAccountId: input.providerAccountId, amount: requested.toFixed(2), currency: evidence.currencyCode, evidenceRef: { paymentTransactionId: input.paymentTransactionId, providerEventId: input.providerEventId, statementLineId: input.statementLineId }, correlationId, dedupeKey: `manual-proposal:${match.id}` }, tx)
    return { value: receipt(match, false) }
  })
}

export async function approveManualMatch(input: ApproveManualMatchInput): Promise<Receipt> {
  return controlledTransaction<Receipt>(async tx => {
    const moduleDecision = await moduleWriteDecision(tx, input.organizationId, input.approvedById, input.control)
    if (!moduleDecision.allowed) return { moduleDenied: moduleDecision }
    const proposed = await tx.matchRecord.findFirst({ where: { id: input.proposedMatchId, organizationId: input.organizationId, status: MatchStatus.PROPOSED, rule: MatchRule.MANUAL } })
    if (!proposed || !proposed.providerAccountId || !proposed.paymentTransactionId || !proposed.matchedById) throw new NotFoundError("Proposed match not found")
    await lockProvider(tx, input.organizationId, proposed.providerAccountId)
    const decision = evaluateSensitiveAction({ action: "payment.reconciliation.override", organizationId: input.organizationId, actorId: input.approvedById, actorPermissions: input.control.actorPermissions, subjectActorId: proposed.matchedById, resourceType: "PaymentReconciliationMatch", resourceId: proposed.id, lastAuthAt: input.control.lastAuthAt, now: input.control.now, amount: proposed.amountMatched, currency: proposed.currencyCode })
    await auditSensitiveActionDecision(tx, decision)
    if (!decision.allowed) return { denied: decision }
    const revision = metadata(proposed.metadata).evidenceRevision
    if (typeof revision !== "string" || revision !== input.expectedEvidenceRevision) throw new ConflictError("The reviewed evidence changed or is missing. Refresh the proposal from current evidence.")
    const previous = await tx.matchRecord.findMany({ where: { organizationId: input.organizationId, providerAccountId: proposed.providerAccountId, correctionOfId: proposed.id, status: { in: [MatchStatus.APPROVED, MatchStatus.REJECTED, MatchStatus.CORRECTED, MatchStatus.VOIDED] } }, take: 2 })
    if (previous.length > 1) throw new ConflictError("Ambiguous approval history requires review.")
    if (previous[0]) {
      if (previous[0].status !== MatchStatus.APPROVED) throw new ConflictError("This proposal already has a recorded decision. Refresh its history.")
      return { value: receipt(previous[0], true) }
    }
    const evidenceInput = { organizationId: input.organizationId, providerAccountId: proposed.providerAccountId, paymentTransactionId: proposed.paymentTransactionId, providerEventId: proposed.providerEventId, statementLineId: proposed.statementLineId, currencyCode: proposed.currencyCode }
    const evidence = await loadEvidence(tx, evidenceInput)
    if (evidence.evidenceRevision !== revision) throw new ConflictError("Payment evidence changed after proposal. Refresh the proposal from current evidence.")
    const requested = amount(proposed.amountMatched)
    await assertRemainingAmount(tx, evidenceInput, requested, evidence)
    const correlationId = input.correlationId ?? randomUUID()
    const approved = await tx.matchRecord.create({ data: {
      ...evidenceInput, reconciliationRunId: proposed.reconciliationRunId, ledgerPostingBatchId: proposed.ledgerPostingBatchId,
      rule: MatchRule.MANUAL, status: MatchStatus.APPROVED, confidence: proposed.confidence, amountMatched: requested,
      matchedById: input.approvedById, matchedAt: new Date(), correctionOfId: proposed.id, correctionReason: "MANUAL_MATCH_APPROVED", correlationId,
      metadata: { approvedById: input.approvedById, proposedById: proposed.matchedById, evidenceRevision: revision },
    } })
    await publishPaymentReconciliationNotification({ type: "payment-reconciliation.manual-match.approved", organizationId: input.organizationId, providerAccountId: proposed.providerAccountId, amount: requested.toFixed(2), currency: proposed.currencyCode, evidenceRef: { paymentTransactionId: proposed.paymentTransactionId, providerEventId: proposed.providerEventId, statementLineId: proposed.statementLineId, reconciliationRunId: proposed.reconciliationRunId }, correlationId, dedupeKey: `manual-approval:${approved.id}` }, tx)
    return { value: receipt(approved, false) }
  })
}
