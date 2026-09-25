import { Prisma, PaymentExceptionStatus, SuspenseStatus } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"

export const unresolvedSuspenseStatuses = [SuspenseStatus.OPEN, SuspenseStatus.ASSIGNED, SuspenseStatus.IN_REVIEW, SuspenseStatus.POSTED_TO_SUSPENSE, SuspenseStatus.RESOLUTION_PROPOSED, SuspenseStatus.REOPENED]
const unresolvedExceptionStatuses = [PaymentExceptionStatus.OPEN, PaymentExceptionStatus.ASSIGNED, PaymentExceptionStatus.ACKNOWLEDGED, PaymentExceptionStatus.ESCALATED, PaymentExceptionStatus.RESOLUTION_PROPOSED, PaymentExceptionStatus.REOPENED]

// Counts and currency sums describe the whole tenant, independently of display limits.
// A repeatable-read snapshot keeps these related summary measures internally consistent.
export async function getPaymentReconciliationSummary(organizationId: string) {
  if (!organizationId?.trim()) throw new BusinessRuleError("An organization is required for reconciliation summaries.", "TENANT_SCOPE_VIOLATION")
  return db.$transaction(async tx => {
    const asOf = new Date().toISOString()
    const [accounts, runs, suspense, exceptions, providerEvents, statementLines] = await Promise.all([
      tx.providerAccount.groupBy({ by: ["status"], where: { organizationId }, _count: { _all: true } }),
      tx.reconciliationRun.groupBy({ by: ["status"], where: { organizationId }, _count: { _all: true } }),
      tx.suspenseItem.groupBy({ by: ["currencyCode"], where: { organizationId, status: { in: unresolvedSuspenseStatuses } }, _count: { _all: true }, _sum: { amount: true }, orderBy: { currencyCode: "asc" } }),
      tx.paymentException.groupBy({ by: ["type", "severity"], where: { organizationId, status: { in: unresolvedExceptionStatuses } }, _count: { _all: true } }),
      tx.providerEvent.count({ where: { organizationId } }),
      tx.statementLine.count({ where: { organizationId } }),
    ])
    const countRuns = (statuses: string[]) => runs.filter(row => statuses.includes(row.status)).reduce((total, row) => total + row._count._all, 0)
    const openSuspenseCount = suspense.reduce((total, row) => total + row._count._all, 0)
    const openExceptionCount = exceptions.reduce((total, row) => total + row._count._all, 0)
    const signedRunCount = countRuns(["SIGNED"]), readyForSignoffCount = countRuns(["READY_FOR_SIGNOFF"])
    const pendingRunCount = countRuns(["DRAFT", "RUNNING", "NEEDS_REVIEW", "BLOCKED", "READY_FOR_SIGNOFF", "FAILED"])
    const needsReview = openSuspenseCount > 0 || openExceptionCount > 0 || countRuns(["NEEDS_REVIEW", "BLOCKED", "FAILED", "DRAFT", "RUNNING"]) > 0
    const certificationStatus = needsReview ? "NEEDS_REVIEW" as const : readyForSignoffCount > 0 ? "READY_FOR_SIGNOFF" as const
      : signedRunCount > 0 ? "SIGNED" as const : providerEvents > 0 || statementLines > 0 ? "READY_FOR_RUN" as const : "NO_EVIDENCE" as const
    return {
      asOf, certificationStatus, providerEvents, statementLines,
      summary: {
        providerAccountCount: accounts.reduce((total, row) => total + row._count._all, 0),
        activeProviderAccountCount: accounts.filter(row => row.status === "ACTIVE").reduce((total, row) => total + row._count._all, 0),
        readyForSignoffCount, signedRunCount, pendingRunCount, openExceptionCount,
        criticalExceptionCount: exceptions.filter(row => row.severity === "CRITICAL").reduce((total, row) => total + row._count._all, 0),
        openSuspenseCount,
        openSuspenseByCurrency: suspense.map(row => ({ currencyCode: row.currencyCode, count: row._count._all, amount: (row._sum.amount ?? new Prisma.Decimal(0)).toFixed(2) })),
        // This is a count of review signals, not distinct cases or a period-close decision.
        closeBlockerCount: openExceptionCount + openSuspenseCount + pendingRunCount,
      },
      exceptionGroups: exceptions.map(row => ({ key: `${row.type}:${row.severity}`, type: row.type, severity: row.severity, count: row._count._all })),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export type PaymentReconciliationSummary = Awaited<ReturnType<typeof getPaymentReconciliationSummary>>
