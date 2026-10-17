import type { Prisma } from "@prisma/client"
import { closeRecordedDates, type CloseControlScope } from "./close-control-scope"

export function closePayrollRunWhere(scope: CloseControlScope): Prisma.PayrollRunWhereInput {
  return { organizationId: scope.organizationId, createdAt: closeRecordedDates(scope), payrollPeriod: {
    organizationId: scope.organizationId,
    OR: [{ accountingPeriodId: scope.periodId }, {
      periodStart: { lte: new Date(scope.endDate) }, periodEnd: { gte: new Date(scope.startDate) },
    }],
  } }
}

export function closeDeclarationWhere(scope: CloseControlScope): Prisma.PayrollDeclarationWhereInput {
  return { organizationId: scope.organizationId, createdAt: closeRecordedDates(scope),
    periodStart: { lte: new Date(scope.endDate) }, periodEnd: { gte: new Date(scope.startDate) } }
}
