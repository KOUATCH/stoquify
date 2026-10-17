import type { Prisma } from "@prisma/client"
import { closeEconomicDates, closeRecordedDates, type CloseControlScope } from "@/services/accounting/close-control-scope"

export function closeRunWhere(scope: CloseControlScope): Prisma.ReconciliationRunWhereInput {
  return {
    organizationId: scope.organizationId, createdAt: closeRecordedDates(scope),
    // Retain explicitly assigned runs even if their date is inconsistent; never hide a blocker.
    OR: [{ accountingPeriodId: scope.periodId }, { businessDate: closeEconomicDates(scope) }],
  }
}

export function closeStatementFileWhere(scope: CloseControlScope): Prisma.StatementFileWhereInput {
  return { organizationId: scope.organizationId, createdAt: closeRecordedDates(scope), importedAt: closeRecordedDates(scope),
    periodStart: { lte: new Date(scope.endDate) }, periodEnd: { gte: new Date(scope.startDate) },
    status: { in: ["IMPORTED", "PROCESSED"] } }
}

export function closeStatementLineWhere(scope: CloseControlScope): Prisma.StatementLineWhereInput {
  return { organizationId: scope.organizationId, occurredAt: closeEconomicDates(scope), createdAt: closeRecordedDates(scope),
    statementFile: closeStatementFileWhere(scope) }
}

export function closeProviderEventWhere(scope: CloseControlScope): Prisma.ProviderEventWhereInput {
  return { organizationId: scope.organizationId, occurredAt: closeEconomicDates(scope), createdAt: closeRecordedDates(scope) }
}

// Outstanding balances from earlier periods remain relevant. Missing economic dates
// remain conservative organization-wide controls, never positive period evidence.
export function closePaymentWhere(scope: CloseControlScope): Prisma.PaymentTransactionWhereInput {
  return { organizationId: scope.organizationId, createdAt: closeRecordedDates(scope),
    OR: [{ occurredAt: { lte: new Date(scope.endDate) } }, { occurredAt: null }] }
}

function outstandingRunWhere(scope: CloseControlScope): Prisma.ReconciliationRunWhereInput {
  return { organizationId: scope.organizationId, createdAt: closeRecordedDates(scope),
    OR: [{ accountingPeriodId: scope.periodId }, { businessDate: { lte: new Date(scope.endDate) } }] }
}

export function closeSuspenseWhere(scope: CloseControlScope): Prisma.SuspenseItemWhereInput {
  return { organizationId: scope.organizationId, createdAt: closeRecordedDates(scope), OR: [
    { reconciliationRun: outstandingRunWhere(scope) },
    { paymentTransaction: closePaymentWhere(scope) },
    { reconciliationRunId: null, paymentTransactionId: null },
  ] }
}

export function closeExceptionWhere(scope: CloseControlScope): Prisma.PaymentExceptionWhereInput {
  return { organizationId: scope.organizationId, createdAt: closeRecordedDates(scope), OR: [
    { reconciliationRun: outstandingRunWhere(scope) },
    { paymentTransaction: closePaymentWhere(scope) },
    { statementLine: { organizationId: scope.organizationId, occurredAt: { lte: new Date(scope.endDate) } } },
    { providerEvent: { organizationId: scope.organizationId, OR: [{ occurredAt: { lte: new Date(scope.endDate) } }, { occurredAt: null }] } },
    { suspenseItem: closeSuspenseWhere(scope) },
    { reconciliationRunId: null, paymentTransactionId: null, statementLineId: null, providerEventId: null, suspenseItemId: null },
  ] }
}
