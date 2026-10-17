import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { createCloseControlScope, type CloseControlScope } from "@/services/accounting/close-control-scope"
import { closeRunWhere, closeSuspenseWhere, closeExceptionWhere, closeProviderEventWhere, closeStatementLineWhere } from "./payment-close-scope"
import { readAccountCloseCoverage } from "./account-close-coverage.service"

const openSuspense = ["OPEN", "ASSIGNED", "IN_REVIEW", "POSTED_TO_SUSPENSE", "RESOLUTION_PROPOSED", "REOPENED"] as const
const openExceptions = ["OPEN", "ASSIGNED", "ACKNOWLEDGED", "ESCALATED", "RESOLUTION_PROPOSED", "REOPENED"] as const

/** Read-only close collector. Operational notification delivery is deliberately outside this path. */
export async function getPaymentCloseEvidence(scope: CloseControlScope) {
  return db.$transaction(async tx => {
    const period = await tx.accountingPeriod.findFirst({
      where: { organizationId: scope.organizationId, id: scope.periodId },
      select: { id: true, startDate: true, endDate: true },
    })
    if (!period) throw new NotFoundError("Accounting period not found")
    const canonical = createCloseControlScope(scope.organizationId, period, new Date(scope.recordedThrough), scope)
    if (canonical.scopeHash !== scope.scopeHash) throw new BusinessRuleError("Close scope has changed; rerun the assessment.")
    const runWhere = closeRunWhere(scope)
    const suspenseWhere: Prisma.SuspenseItemWhereInput = { ...closeSuspenseWhere(scope), status: { in: [...openSuspense] } }
    const exceptionWhere: Prisma.PaymentExceptionWhereInput = { ...closeExceptionWhere(scope), status: { in: [...openExceptions] } }
    const [runs, suspense, exceptions, providerEvents, statementLines, unassignedSuspense, unassignedExceptions, accountCoverage] = await Promise.all([
      tx.reconciliationRun.findMany({ where: runWhere, orderBy: [{ businessDate: "asc" }, { id: "asc" }],
        select: { id: true, businessDate: true, status: true, signedAt: true, certificateHash: true } }),
      tx.suspenseItem.findMany({ where: suspenseWhere, orderBy: { id: "asc" },
        select: { id: true, type: true, amount: true, currencyCode: true, status: true, slaDeadline: true, correlationId: true } }),
      tx.paymentException.groupBy({ by: ["severity"], where: exceptionWhere, _count: { _all: true } }),
      tx.providerEvent.count({ where: closeProviderEventWhere(scope) }),
      tx.statementLine.count({ where: closeStatementLineWhere(scope) }),
      tx.suspenseItem.count({ where: { ...suspenseWhere, reconciliationRunId: null, paymentTransactionId: null } }),
      tx.paymentException.count({ where: { ...exceptionWhere, reconciliationRunId: null, paymentTransactionId: null, statementLineId: null, providerEventId: null, suspenseItemId: null } }),
      readAccountCloseCoverage(tx, scope),
    ])
    const signed = (run: typeof runs[number]) => run.status === "SIGNED" && run.signedAt !== null && run.signedAt <= new Date(scope.recordedThrough)
      && run.businessDate >= new Date(scope.startDate) && run.businessDate <= new Date(scope.endDate)
    return {
      scope,
      accountCoverage,
      source: { providerEvidenceAvailable: providerEvents > 0, statementEvidenceAvailable: statementLines > 0 },
      summary: {
        signedRunCount: runs.filter(signed).length,
        readyForSignoffCount: runs.filter(run => run.status === "READY_FOR_SIGNOFF").length,
        pendingRunCount: runs.filter(run => run.status !== "VOIDED" && !signed(run)).length,
        openSuspenseCount: suspense.length,
        criticalExceptionCount: exceptions.filter(row => row.severity === "CRITICAL").reduce((sum, row) => sum + row._count._all, 0),
        openExceptionCount: exceptions.reduce((sum, row) => sum + row._count._all, 0),
      },
      organizationControls: { unassignedSuspense, unassignedExceptions, reason: "No reliable economic-period link; retained conservatively across periods." },
      // Complete scoped source references, not the dashboard's capped recent lists.
      recentRuns: runs.map(run => ({ ...run, businessDate: run.businessDate.toISOString(),
        signedAt: signed(run) ? run.signedAt!.toISOString() : null, certificateHash: signed(run) ? run.certificateHash : null })),
      suspenseQueue: suspense.map(item => ({ ...item, amount: item.amount.toFixed(2), slaDeadline: item.slaDeadline?.toISOString() ?? null })),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
