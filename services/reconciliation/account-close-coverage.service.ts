import "server-only"
import { createHash } from "node:crypto"
import { buildReconciliationEvidenceManifestInTx, reconciliationCertificateSourceEvidenceHash, stableReconciliationEvidenceStringify } from "./payment-reconciliation-evidence.service"
import { retainedReconciliationSignatureInTx } from "./reconciliation-retained-signature"
import type { Prisma } from "@prisma/client"
import { createCloseControlScope, closeEconomicDates, closeRecordedDates, type CloseControlScope } from "@/services/accounting/close-control-scope"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"
import { coverageGaps, eligibleNoActivity } from "./account-close-coverage"
import { closeStatementFileWhere, closeSuspenseWhere, closeExceptionWhere } from "./payment-close-scope"
import { hasDeclaredStatementCoverage } from "@/services/payments/statement-declared-coverage"

export async function readAccountCloseCoverage(tx: Prisma.TransactionClient, scope: CloseControlScope) {
  const period = await tx.accountingPeriod.findFirst({ where: { organizationId: scope.organizationId, id: scope.periodId }, select: { id: true, startDate: true, endDate: true } })
  if (!period || createCloseControlScope(scope.organizationId, period, new Date(scope.recordedThrough)).scopeHash !== scope.scopeHash) throw new BusinessRuleError("Close coverage scope is invalid or has changed.")
  const start = new Date(scope.startDate), end = new Date(scope.endDate), cutoff = new Date(scope.recordedThrough)
  // No reliable effective-dated lifecycle exists. Every account known by the cutoff
  // remains required, including archived and late-onboarded historical accounts.
  const accounts = await tx.providerAccount.findMany({ where: { organizationId: scope.organizationId, createdAt: closeRecordedDates(scope) }, orderBy: { id: "asc" },
    select: { id: true, displayName: true, providerCode: true, currencyCode: true, status: true, settlementLagDays: true, metadata: true } })
  const rows = []
  for (const account of accounts) {
    const base = { organizationId: scope.organizationId, providerAccountId: account.id, createdAt: closeRecordedDates(scope) }
    const activityDates = { OR: [{ occurredAt: closeEconomicDates(scope) }, { occurredAt: null }] }
    const [statements, runs, attestations, events, payments, lines, suspense, exceptions, priorPayments] = await Promise.all([
      tx.statementFile.findMany({ where: { ...closeStatementFileWhere(scope), providerAccountId: account.id }, orderBy: { id: "asc" }, select: { id: true, organizationId: true, providerAccountId: true, fileHash: true, periodStart: true, periodEnd: true, metadata: true } }),
      tx.reconciliationRun.findMany({ where: { ...base, periodStart: { lte: end }, periodEnd: { gt: start } }, orderBy: { id: "asc" },
        select: { id: true, organizationId: true, providerAccountId: true, paymentRailId: true, status: true, runById: true, signedById: true, signedAt: true, certificateHash: true, certificatePayload: true, metadata: true, voidedAt: true, periodStart: true, periodEnd: true, businessDate: true, accountingPeriodId: true } }),
      tx.reconciliationNoActivityEvidence.findMany({ where: { ...base, periodId: scope.periodId }, orderBy: { id: "asc" } }),
      tx.providerEvent.count({ where: { ...base, ...activityDates } }),
      tx.paymentTransaction.count({ where: { ...base, ...activityDates } }),
      // All in-period lines, including failed imports, contradict a no-activity claim.
      tx.statementLine.findMany({ where: { ...base, occurredAt: closeEconomicDates(scope) }, select: { currencyCode: true } }),
      tx.suspenseItem.count({ where: { AND: [closeSuspenseWhere(scope), { OR: [{ providerAccountId: account.id }, { reconciliationRun: { providerAccountId: account.id } }, { paymentTransaction: { providerAccountId: account.id } }, { providerAccountId: null, reconciliationRunId: null, paymentTransactionId: null }] }], status: { in: ["OPEN", "ASSIGNED", "IN_REVIEW", "POSTED_TO_SUSPENSE", "RESOLUTION_PROPOSED", "REOPENED"] } } }),
      tx.paymentException.count({ where: { AND: [closeExceptionWhere(scope), { OR: [{ providerAccountId: account.id }, { reconciliationRun: { providerAccountId: account.id } }, { paymentTransaction: { providerAccountId: account.id } }, { statementLine: { providerAccountId: account.id } }, { providerEvent: { providerAccountId: account.id } }, { suspenseItem: { providerAccountId: account.id } }, { providerAccountId: null, reconciliationRunId: null, paymentTransactionId: null, statementLineId: null, providerEventId: null, suspenseItemId: null }] }], status: { in: ["OPEN", "ASSIGNED", "ACKNOWLEDGED", "ESCALATED", "RESOLUTION_PROPOSED", "REOPENED"] } } }),
      tx.paymentTransaction.count({ where: { ...base, occurredAt: { lt: start }, state: { in: ["PENDING", "PROCESSING", "UNKNOWN", "CONFIRMED", "DISPUTED", "SUSPENSE"] } } }),
    ])
    const candidates = runs.filter(run => run.status === "SIGNED" && run.signedAt && run.signedAt <= cutoff && !!run.certificateHash
      && run.businessDate >= start && run.businessDate <= end && (!run.accountingPeriodId || run.accountingPeriodId === scope.periodId))
    const signed: typeof candidates = []
    for (const run of candidates) {
      // A self-consistent hash is not independent approval. Retain the existing
      // signature envelope/audit admission before checking its current sources.
      if (run.providerAccountId !== account.id) continue
      try {
        await retainedReconciliationSignatureInTx(tx, scope.organizationId, run, cutoff)
      } catch (error) {
        if (error instanceof ConflictError) continue
        throw error
      }
      const sourceHash = reconciliationCertificateSourceEvidenceHash(run.certificatePayload)
      if (!sourceHash || createHash("sha256").update(stableReconciliationEvidenceStringify(run.certificatePayload)).digest("hex") !== run.certificateHash) continue
      // Current proof is conservative even for an earlier recorded-through scope:
      // later sources must never restore a historical signature to current status.
      const current = await buildReconciliationEvidenceManifestInTx(tx, {
        organizationId: scope.organizationId, providerAccountId: account.id,
        reconciliationRunId: run.id, periodStart: run.periodStart, periodEnd: run.periodEnd,
      })
      if (current.sourceHash === sourceHash) signed.push(run)
    }
    const pendingRuns = runs.filter(run => run.status !== "VOIDED" && !signed.includes(run)).length
    const activityCount = events + payments + lines.length
    const obligationCount = suspense + exceptions + pendingRuns + priorPayments
    const noActivity = attestations.find(evidence => eligibleNoActivity(evidence, { organizationId: scope.organizationId, providerAccountId: account.id, periodId: scope.periodId, start, end, cutoff, currencyCode: account.currencyCode, activityCount, obligationCount }))
    const statementGaps = coverageGaps(+start, +end, statements.filter(statement => hasDeclaredStatementCoverage(statement, { ...account, organizationId: scope.organizationId })).map(s => ({ start: +s.periodStart, end: +s.periodEnd })))
    const signoffGaps = coverageGaps(+start, +end, signed.map(run => ({ start: +run.periodStart, end: +run.periodEnd - 1 })))
    const currencyMismatch = lines.some(line => line.currencyCode !== account.currencyCode)
    const metadata = account.metadata && typeof account.metadata === "object" && !Array.isArray(account.metadata) ? account.metadata : {}
    const cadence = Number(metadata.statementCadenceDays ?? metadata.statement_cadence_days ?? metadata.cadenceDays ?? 1)
    const cadenceDays = Number.isSafeInteger(cadence) && cadence > 0 ? cadence : 1
    const evidenceDueAt = new Date(+end + (cadenceDays + Math.max(0, account.settlementLagDays)) * 86400000).toISOString()
    const reasons = [
      ...(candidates.length > signed.length ? ["STALE_SIGNOFF"] : []),
      ...(currencyMismatch ? ["CURRENCY_MISMATCH"] : []),
      ...(obligationCount ? ["OPEN_OBLIGATIONS"] : []),
      ...(!noActivity && statementGaps.length ? [statements.length ? "PARTIAL_STATEMENT" : "MISSING_STATEMENT"] : []),
      ...(!noActivity && signoffGaps.length ? [signed.length ? "PARTIAL_SIGNOFF" : "MISSING_SIGNOFF"] : []),
      ...(!noActivity && activityCount === 0 ? ["NO_ACTIVITY_EVIDENCE_REQUIRED"] : []),
    ]
    rows.push({ providerAccountId: account.id, accountName: account.displayName, currencyCode: account.currencyCode,
      accountStatus: account.status, scopeHash: scope.scopeHash, startDate: scope.startDate, endDate: scope.endDate,
      applicability: "REQUIRED_CONSERVATIVE" as const, cadenceDays, settlementLagDays: account.settlementLagDays, evidenceDueAt,
      overdue: cutoff > new Date(evidenceDueAt), status: reasons.length ? "BLOCKED" as const : noActivity ? "NO_ACTIVITY_APPROVED" as const : "RECONCILED" as const,
      reasons, statementGaps, signoffGaps, activityCount, obligationCount,
      statements: statements.map(s => ({ id: s.id, hash: s.fileHash })), signedRuns: signed.map(run => ({ id: run.id, hash: run.certificateHash })),
      noActivityEvidence: noActivity ? { id: noActivity.id, hash: noActivity.evidenceHash, sourceDocumentHash: noActivity.sourceDocumentHash, sourceReference: noActivity.sourceReference, proposedById: noActivity.proposedById, approvedById: noActivity.approvedById, approvedAt: noActivity.approvedAt!.toISOString() } : null,
    })
  }
  return { version: 1 as const, scopeHash: scope.scopeHash, accounts: rows, requiredAccountCount: rows.length,
    coveredAccountCount: rows.filter(row => row.status !== "BLOCKED").length, blockedAccountCount: rows.filter(row => row.status === "BLOCKED").length }
}
