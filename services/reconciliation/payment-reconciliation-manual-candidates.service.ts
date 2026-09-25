import "server-only"
import { PaymentExceptionStatus, Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { ApplicationError, BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { evaluateModuleEntitlement, getManagedModuleState } from "@/services/modules/module-entitlement.service"
import { MANUAL_ALLOCATION_STATUSES, ManualEvidenceError, getManualRemainingAmounts, validateManualMatchEvidence, type ManualEvidenceReason } from "./manual-match-evidence"

export type ManualMatchCandidate = {
  exceptionId: string; providerAccountId: string; providerAccountName: string; paymentTransactionId: string
  providerEventId: string | null; statementLineId: string | null; exceptionType: string; severity: string
  internalReference: string | null; externalReference: string | null
  internalAmount: string | null; externalAmount: string | null; currencyCode: string; externalCurrencyCode: string | null
  internalRemaining: string | null; externalRemaining: string | null; availableAmount: string | null
  eligibility: ManualEvidenceReason; occurredAt: string | null
}
export type ManualCandidateReadModel = {
  candidates: ManualMatchCandidate[]; hasMore: boolean; limit: number; checkedAt: string; writeAllowed: boolean
}
const PAGE_SIZE = 12
const openStatuses = [PaymentExceptionStatus.OPEN, PaymentExceptionStatus.ASSIGNED, PaymentExceptionStatus.ACKNOWLEDGED, PaymentExceptionStatus.ESCALATED, PaymentExceptionStatus.RESOLUTION_PROPOSED, PaymentExceptionStatus.REOPENED]
const ids = (values: Array<string | null>) => [...new Set(values.filter((value): value is string => Boolean(value)))]
const index = <T extends { id: string }>(rows: T[]) => new Map(rows.map(row => [row.id, row]))
function mask(value: string | null | undefined) {
  const text = value?.trim()
  return !text ? null : text.length <= 4 ? "****" : `${text.slice(0, 2)}****${text.slice(-2)}`
}
function observedAmount(value: Prisma.Decimal | null | undefined) {
  return value?.isFinite() && value.decimalPlaces() <= 2 ? value.toFixed(2) : null
}

/** A consistent preparation snapshot, not permission to commit. Bounded batch
 * queries avoid a per-candidate query loop; each evidence table is tenant-scoped
 * independently so a malformed foreign reference cannot expose its payload. */
export async function getManualMatchCandidates(organizationId: string): Promise<ManualCandidateReadModel> {
  return db.$transaction(async tx => {
    const checkedAt = new Date()
    const organization = await tx.organization.findFirst({ where: { id: organizationId, isActive: true, deletedAt: null }, select: { id: true, requestedModules: true } })
    if (!organization) throw new NotFoundError("Organization not found")
    const managed = await getManagedModuleState(organizationId, tx)
    const access = { organizationId, moduleSlug: "payment_reconciliation" as const, surfaceType: "action" as const, surface: "services/reconciliation/payment-reconciliation-manual-candidates.service.ts", requestedModules: organization.requestedModules, explicitEntitlements: managed.explicitEntitlements, mode: "enforce" as const, now: checkedAt }
    if (!evaluateModuleEntitlement({ ...access, accessIntent: "read" }).allowed) throw new ApplicationError("FORBIDDEN", "Reconciliation evidence is unavailable for this organization.", 403)
    const writeAllowed = evaluateModuleEntitlement({ ...access, accessIntent: "write" }).allowed
    const found = await tx.paymentException.findMany({ where: {
      organizationId, status: { in: openStatuses }, providerAccountId: { not: null }, paymentTransactionId: { not: null },
      OR: [{ providerEventId: { not: null } }, { statementLineId: { not: null } }],
    }, orderBy: [{ severity: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: PAGE_SIZE + 1,
    select: { id: true, type: true, severity: true, providerAccountId: true, paymentTransactionId: true, providerEventId: true, statementLineId: true } })
    const candidates = found.slice(0, PAGE_SIZE), hasMore = found.length > PAGE_SIZE
    if (!candidates.length) return { candidates: [], hasMore, limit: PAGE_SIZE, checkedAt: checkedAt.toISOString(), writeAllowed }
    const providerIds = ids(candidates.map(row => row.providerAccountId)), paymentIds = ids(candidates.map(row => row.paymentTransactionId))
    const eventIds = ids(candidates.map(row => row.providerEventId)), lineIds = ids(candidates.map(row => row.statementLineId))
    const [providerRows, paymentRows, eventRows, lineRows, allocations] = await Promise.all([
      tx.providerAccount.findMany({ where: { organizationId, id: { in: providerIds } }, select: { id: true, displayName: true, status: true, archivedAt: true, currencyCode: true } }),
      tx.paymentTransaction.findMany({ where: { organizationId, id: { in: paymentIds } }, select: { id: true, providerAccountId: true, state: true, direction: true, amount: true, currencyCode: true, providerReference: true, providerTransactionId: true, occurredAt: true } }),
      tx.providerEvent.findMany({ where: { organizationId, id: { in: eventIds } }, select: { id: true, providerAccountId: true, status: true, signatureValid: true, archivedAt: true, direction: true, amount: true, currencyCode: true, providerReference: true, providerTransactionId: true, occurredAt: true } }),
      tx.statementLine.findMany({ where: { organizationId, id: { in: lineIds } }, select: { id: true, providerAccountId: true, status: true, archivedAt: true, direction: true, amount: true, currencyCode: true, providerReference: true, providerTransactionId: true, occurredAt: true } }),
      tx.matchRecord.findMany({ where: { organizationId, providerAccountId: { in: providerIds }, status: { in: MANUAL_ALLOCATION_STATUSES }, OR: [{ paymentTransactionId: { in: paymentIds } }, { providerEventId: { in: eventIds } }, { statementLineId: { in: lineIds } }] }, select: { providerAccountId: true, paymentTransactionId: true, providerEventId: true, statementLineId: true, amountMatched: true, currencyCode: true } }),
    ])
    const providers = index(providerRows), payments = index(paymentRows), events = index(eventRows), lines = index(lineRows)
    const result = candidates.map((candidate): ManualMatchCandidate => {
      const provider = providers.get(candidate.providerAccountId!)
      const scoped = <T extends { providerAccountId: string | null }>(value: T | undefined) => value?.providerAccountId === candidate.providerAccountId ? value : null
      const payment = scoped(payments.get(candidate.paymentTransactionId!)), event = scoped(events.get(candidate.providerEventId ?? "")), line = scoped(lines.get(candidate.statementLineId ?? ""))
      const external = Boolean(candidate.providerEventId) !== Boolean(candidate.statementLineId) ? event ?? line : null
      const row: ManualMatchCandidate = {
        exceptionId: candidate.id, providerAccountId: candidate.providerAccountId!, providerAccountName: provider?.displayName ?? "", paymentTransactionId: candidate.paymentTransactionId!,
        providerEventId: candidate.providerEventId, statementLineId: candidate.statementLineId, exceptionType: candidate.type, severity: candidate.severity,
        internalReference: mask(payment?.providerReference ?? payment?.providerTransactionId), externalReference: mask(external?.providerReference ?? external?.providerTransactionId),
        internalAmount: observedAmount(payment?.amount), externalAmount: observedAmount(external?.amount), currencyCode: payment?.currencyCode ?? "", externalCurrencyCode: external?.currencyCode ?? null,
        internalRemaining: null, externalRemaining: null, availableAmount: null, eligibility: "EVIDENCE_UNAVAILABLE", occurredAt: (external?.occurredAt ?? payment?.occurredAt)?.toISOString() ?? null,
      }
      if (Boolean(candidate.providerEventId) === Boolean(candidate.statementLineId)) { row.eligibility = "EVIDENCE_SELECTION_REQUIRED"; return row }
      if (!provider || !payment || !external) return row
      try {
        const evidence = validateManualMatchEvidence({ provider, payment, event, line })
        const remaining = getManualRemainingAmounts(row, evidence, allocations.filter(allocation => allocation.providerAccountId === candidate.providerAccountId))
        row.internalRemaining = remaining.internalRemaining.toFixed(2); row.externalRemaining = remaining.externalRemaining.toFixed(2); row.availableAmount = remaining.availableAmount.toFixed(2)
        row.eligibility = remaining.availableAmount.gt(0) ? "READY" : "FULLY_ALLOCATED"
      } catch (error) {
        if (error instanceof ManualEvidenceError) row.eligibility = error.reason
        else if (error instanceof ConflictError || error instanceof BusinessRuleError) row.eligibility = "ALLOCATION_INVALID"
        else throw error
      }
      return row
    })
    return { candidates: result, hasMore, limit: PAGE_SIZE, checkedAt: checkedAt.toISOString(), writeAllowed }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
