import "server-only"

import {
  AccountingSourceType,
  LedgerPostingBatchStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollRunStatus,
  Prisma,
  type SalesOrderStatus,
} from "@prisma/client"
import { endOfDay, startOfDay } from "date-fns"

import { db } from "@/prisma/db"
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"
import { evaluateRedaction } from "@/services/security/redaction-policy.service"
import type {
  SnapshotBlocker,
  SnapshotRedaction,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"

export interface FinancialAnalyticsReadModelInput {
  organizationId: string
  locationId: string
  startDate: Date
  endDate: Date
  actorPermissions?: string[]
  payrollModuleDecision?: ModuleEntitlementDecision | null
}

export interface DailyReportReadModelInput {
  organizationId: string
  locationId: string
  date: Date
}

export interface FinancialMetrics {
  revenue: {
    total: number
    growth: number
    recurring: number
    oneTime: number
    forecast: number
    target: number
    achievement: number
  }
  profitability: {
    grossProfit: number
    grossMargin: number
    netProfit: number
    netMargin: number
    ebitda: number
    ebitdaMargin: number
    operatingProfit: number
  }
  expenses: {
    total: number
    cogs: number
    operational: number
    salaries: number
    rent: number
    utilities: number
    marketing: number
    other: number
  }
  cashFlow: {
    operating: number
    investing: number
    financing: number
    netCashFlow: number
    cashOnHand: number
    burnRate: number
  }
  assets: {
    total: number
    current: number
    inventory: number
    receivables: number
    cash: number
    fixedAssets: number
  }
  liabilities: {
    total: number
    current: number
    payables: number
    accrued: number
    longTerm: number
    loans: number
  }
  ratios: {
    currentRatio: number
    quickRatio: number
    debtToEquity: number
    roe: number
    roa: number
    grossMarginTrend: number
    inventoryTurnover: number
    receivablesTurnover: number
  }
  taxes: {
    salesTax: number
    incomeTax: number
    payrollTax: number
    totalTaxLiability: number
    taxRate: number
  }
  payrollEvidence: PayrollFinanceEvidence
  payrollForecast: PayrollForecastCashPlanningEvidence
}

type DecimalValue = Prisma.Decimal | number | string | null | undefined

const activeSalesStatuses: SalesOrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"]

const payrollFactRunStatuses = [PayrollRunStatus.POSTED, PayrollRunStatus.PAID, PayrollRunStatus.ARCHIVED]
const payrollFactPaymentStatuses = new Set<PayrollPaymentBatchStatus>([
  PayrollPaymentBatchStatus.RELEASED,
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
  PayrollPaymentBatchStatus.SETTLED,
])
const allLocationTokens = new Set(["all", "*"])

type PayrollFinanceEvidenceStatus = "AUTHORITATIVE" | "NON_AUTHORITATIVE" | "REDACTED"
type PayrollForecastCashPlanningStatus = "AUTHORITATIVE" | "NON_AUTHORITATIVE" | "REDACTED" | "UNAVAILABLE"

export type PayrollForecastCashPlanningEvidence = {
  status: PayrollForecastCashPlanningStatus
  authoritative: boolean
  redacted: boolean
  reasonCode: string
  message: string
  scope: "TENANT_AGGREGATE"
  locationAllocated: false
  horizonStart: string | null
  horizonEnd: string | null
  upcomingNetPayAmount: number
  upcomingStatutoryLiabilityAmount: number
  totalUpcomingAmount: number
  payrollPeriodCount: number
  payrollRunCount: number
  paymentBatchCount: number
  declarationCount: number
  sourceLinkCount: number
  evidenceHashCount: number
  nextPayDate: string | null
  nextDeclarationDueDate: string | null
  blockerCodes: string[]
  blockers: SnapshotBlocker[]
  redactions: SnapshotRedaction[]
  sourceHash: string | null
  generatedAt: string | null
  sourceModules: string[]
  sourceTables: string[]
  sourceServices: string[]
  actionHref: string
  personLevelAmountsRedacted: true
}

export type PayrollFinanceEvidence = {
  status: PayrollFinanceEvidenceStatus
  authoritative: boolean
  redacted: boolean
  reasonCode: string
  message: string
  sourceTables: string[]
  sourceServices: string[]
  runCount: number
  lineCount: number
  paymentBatchCount: number
  sourceLinkCount: number
  evidenceHashCount: number
  blockerCodes: string[]
}

type PayrollFinanceFacts = {
  salaries: number
  payrollTax: number
  evidence: PayrollFinanceEvidence
}

function toNumber(value: DecimalValue): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  return value.toNumber()
}

function jsonRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function numericSnapshotValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function hasNumericSnapshotField(snapshot: Record<string, unknown>, key: string) {
  return numericSnapshotValue(snapshot[key]) !== null
}

function hasNonZeroSnapshotAmount(snapshot: Record<string, unknown>, key: string) {
  const value = numericSnapshotValue(snapshot[key])
  return value !== null && Math.abs(value) > 0.000001
}

function payrollRubriqueComponents(snapshot: Record<string, unknown>) {
  const components = snapshot.payrollRubriqueComponents
  return Array.isArray(components)
    ? components.filter((component) => component && typeof component === "object" && !Array.isArray(component))
    : []
}

function hasEffectiveComponentProofGap(calculationSnapshot: Prisma.JsonValue | null) {
  const snapshot = jsonRecord(calculationSnapshot)
  if (!snapshot) return true

  const hasRubriqueAmount = [
    "payrollRubriqueGrossAmount",
    "payrollRubriqueTaxableBaseAmount",
    "payrollRubriqueSocialBaseAmount",
    "payrollRubriqueEmployeeDeductionAmount",
    "payrollRubriqueEmployerChargeAmount",
  ].some((key) => hasNonZeroSnapshotAmount(snapshot, key))
  if (hasRubriqueAmount && payrollRubriqueComponents(snapshot).length === 0) return true

  const overtimeMinutes = numericSnapshotValue(snapshot.overtimeMinutes) ?? 0
  if (overtimeMinutes > 0 && !hasNumericSnapshotField(snapshot, "overtimePremiumAmount")) return true

  const leaveMinutes = numericSnapshotValue(snapshot.leaveMinutes) ?? 0
  if (leaveMinutes > 0) {
    return (
      !hasNumericSnapshotField(snapshot, "scheduledMinutes") ||
      !hasNumericSnapshotField(snapshot, "workedMinutes") ||
      !hasNumericSnapshotField(snapshot, "paidMinutes") ||
      !hasNumericSnapshotField(snapshot, "baseSalary")
    )
  }

  return false
}

function payrollEvidence(input: {
  status: PayrollFinanceEvidenceStatus
  reasonCode: string
  message: string
  runCount?: number
  lineCount?: number
  paymentBatchCount?: number
  sourceLinkCount?: number
  evidenceHashCount?: number
  blockerCodes?: string[]
}): PayrollFinanceEvidence {
  return {
    status: input.status,
    authoritative: input.status === "AUTHORITATIVE",
    redacted: input.status === "REDACTED",
    reasonCode: input.reasonCode,
    message: input.message,
    sourceTables: [
      "payroll_runs",
      "payroll_run_lines",
      "payroll_payslips",
      "payroll_payment_batches",
      "payroll_payment_allocations",
      "accounting_source_links",
    ],
    sourceServices: [
      "services/payroll/payroll-register.service.ts",
      "services/payroll/payroll-control.service.ts",
      "services/payroll/payment-reconciliation.service.ts",
      "services/analytics/financial-analytics.service.ts",
    ],
    runCount: input.runCount ?? 0,
    lineCount: input.lineCount ?? 0,
    paymentBatchCount: input.paymentBatchCount ?? 0,
    sourceLinkCount: input.sourceLinkCount ?? 0,
    evidenceHashCount: input.evidenceHashCount ?? 0,
    blockerCodes: input.blockerCodes ?? [],
  }
}

const payrollForecastSourceTables = [
  "payroll_periods",
  "payroll_runs",
  "payroll_payment_batches",
  "payroll_declarations",
  "payroll_declaration_evidence",
  "payment_provider_accounts",
  "accounting_source_links",
  "ledger_posting_batches",
]

const payrollForecastSourceServices = [
  "services/snapshots/tenant-operating-snapshot.service.ts",
  "services/payroll/payroll-register.service.ts",
  "services/payroll/payment-reconciliation.service.ts",
  "services/payroll/declaration-lifecycle.service.ts",
  "services/analytics/financial-analytics.service.ts",
]

function payrollForecastActionHref(blockerCodes: readonly string[]) {
  if (blockerCodes.some((code) => code.includes("DECLARATION"))) return "/dashboard/payroll/declarations"
  if (blockerCodes.some((code) => code.includes("PAYMENT") || code.includes("PROVIDER"))) return "/dashboard/payroll/payments"
  return blockerCodes.length > 0 ? "/dashboard/payroll/runs" : "/dashboard/payroll/payments"
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function payrollForecastPersonRedaction(extra: SnapshotRedaction[] = []): SnapshotRedaction[] {
  return uniqueById([
    ...extra,
    {
      id: "financial-analytics-payroll-forecast-person-level-redacted",
      field: "payroll.personLevelAmounts",
      reason: "Financial analytics exposes aggregate payroll cash-planning obligations only; person-level payroll values stay inside payroll.",
      policy: "KONTAVA_SENSITIVE_PAYROLL_EVIDENCE",
    },
  ])
}

function emptyPayrollForecastEvidence(input: {
  status: PayrollForecastCashPlanningStatus
  reasonCode: string
  message: string
  redacted?: boolean
  blockerCodes?: string[]
  blockers?: SnapshotBlocker[]
}): PayrollForecastCashPlanningEvidence {
  return {
    status: input.status,
    authoritative: false,
    redacted: input.redacted ?? input.status === "REDACTED",
    reasonCode: input.reasonCode,
    message: input.message,
    scope: "TENANT_AGGREGATE",
    locationAllocated: false,
    horizonStart: null,
    horizonEnd: null,
    upcomingNetPayAmount: 0,
    upcomingStatutoryLiabilityAmount: 0,
    totalUpcomingAmount: 0,
    payrollPeriodCount: 0,
    payrollRunCount: 0,
    paymentBatchCount: 0,
    declarationCount: 0,
    sourceLinkCount: 0,
    evidenceHashCount: 0,
    nextPayDate: null,
    nextDeclarationDueDate: null,
    blockerCodes: input.blockerCodes ?? [],
    blockers: input.blockers ?? [],
    redactions: payrollForecastPersonRedaction(),
    sourceHash: null,
    generatedAt: null,
    sourceModules: ["payroll", "finance", "analytics"],
    sourceTables: payrollForecastSourceTables,
    sourceServices: payrollForecastSourceServices,
    actionHref: payrollForecastActionHref(input.blockerCodes ?? []),
    personLevelAmountsRedacted: true,
  }
}

function mapPayrollForecastEvidence(
  snapshot: Awaited<ReturnType<typeof getTenantOperatingSnapshot>>,
): PayrollForecastCashPlanningEvidence {
  const forecast: TenantOperatingMetrics["payrollFinanceForecast"] = snapshot.metrics.payrollFinanceForecast
  const blockers = snapshot.blockers.filter((blocker) => blocker.gate === "payroll_finance_forecast")
  const blocked = !forecast.authoritative || forecast.blockerCodes.length > 0 || blockers.length > 0

  return {
    status: forecast.status,
    authoritative: forecast.authoritative && !blocked,
    redacted: false,
    reasonCode: forecast.reasonCode,
    message: forecast.message,
    scope: "TENANT_AGGREGATE",
    locationAllocated: false,
    horizonStart: forecast.horizonStart,
    horizonEnd: forecast.horizonEnd,
    upcomingNetPayAmount: forecast.upcomingNetPayAmount,
    upcomingStatutoryLiabilityAmount: forecast.upcomingStatutoryLiabilityAmount,
    totalUpcomingAmount: forecast.totalUpcomingAmount,
    payrollPeriodCount: forecast.payrollPeriodCount,
    payrollRunCount: forecast.payrollRunCount,
    paymentBatchCount: forecast.paymentBatchCount,
    declarationCount: forecast.declarationCount,
    sourceLinkCount: forecast.sourceLinkCount,
    evidenceHashCount: forecast.evidenceHashCount,
    nextPayDate: forecast.nextPayDate,
    nextDeclarationDueDate: forecast.nextDeclarationDueDate,
    blockerCodes: forecast.blockerCodes,
    blockers,
    redactions: payrollForecastPersonRedaction(snapshot.redactions),
    sourceHash: snapshot.sourceHash,
    generatedAt: snapshot.generatedAt,
    sourceModules: snapshot.sourceModules,
    sourceTables: payrollForecastSourceTables,
    sourceServices: payrollForecastSourceServices,
    actionHref: payrollForecastActionHref(forecast.blockerCodes),
    personLevelAmountsRedacted: true,
  }
}

async function getPayrollForecastCashPlanningEvidence(input: {
  organizationId: string
  start: Date
  end: Date
  payrollModuleDecision?: ModuleEntitlementDecision | null
}): Promise<PayrollForecastCashPlanningEvidence> {
  if (input.payrollModuleDecision?.wouldBlock) {
    return emptyPayrollForecastEvidence({
      status: "REDACTED",
      reasonCode: "PAYROLL_MODULE_NOT_ENTITLED",
      message: "Payroll forecast cash-planning evidence is withheld because the payroll module is not entitled for this tenant.",
      redacted: true,
      blockerCodes: ["PAYROLL_FORECAST_MODULE_NOT_ENTITLED"],
    })
  }

  try {
    const snapshot = await getTenantOperatingSnapshot({
      organizationId: input.organizationId,
      periodStart: input.start,
      periodEnd: input.end,
    })
    return mapPayrollForecastEvidence(snapshot)
  } catch {
    return emptyPayrollForecastEvidence({
      status: "UNAVAILABLE",
      reasonCode: "PAYROLL_FORECAST_SNAPSHOT_UNAVAILABLE",
      message: "Payroll forecast cash-planning evidence could not be loaded, so upcoming payroll obligations are withheld from financial analytics.",
      blockerCodes: ["PAYROLL_FORECAST_SNAPSHOT_UNAVAILABLE"],
    })
  }
}

function sourceLinkKey(sourceType: AccountingSourceType, sourceId: string) {
  return `${sourceType}:${sourceId}`
}

function isAllLocationScope(locationId: string) {
  const normalized = locationId.trim().toLowerCase()
  return allLocationTokens.has(normalized)
}

async function getPayrollFinanceFacts(input: {
  organizationId: string
  locationId: string
  start: Date
  end: Date
  actorPermissions?: string[]
  payrollModuleDecision?: ModuleEntitlementDecision | null
}): Promise<PayrollFinanceFacts> {
  const redactionDecision = evaluateRedaction({
    field: "FinancialAnalytics.payrollAmounts",
    category: "payroll_person_amount",
    actorPermissions: input.actorPermissions ?? [],
    moduleDecision: input.payrollModuleDecision ?? null,
  })

  if (!redactionDecision.allowed) {
    return {
      salaries: 0,
      payrollTax: 0,
      evidence: payrollEvidence({
        status: "REDACTED",
        reasonCode: redactionDecision.reasonCode,
        message: redactionDecision.safeMessage,
        blockerCodes: ["PAYROLL_FINANCE_FACTS_REDACTED"],
      }),
    }
  }

  const runs = await db.payrollRun.findMany({
    where: {
      organizationId: input.organizationId,
      deletedAt: null,
      status: { in: payrollFactRunStatuses },
      payrollPeriod: {
        periodStart: { lte: input.end },
        periodEnd: { gte: input.start },
      },
    },
    include: {
      lines: {
        include: {
          employee: { select: { locationId: true } },
          payslip: {
            select: {
              id: true,
              status: true,
              documentHash: true,
              grossAmount: true,
              employeeDeductionAmount: true,
              employerChargeAmount: true,
              netPayableAmount: true,
              paymentAllocations: {
                select: {
                  id: true,
                  amount: true,
                  payrollPaymentBatchId: true,
                  payrollPaymentBatch: {
                    select: {
                      id: true,
                      status: true,
                      evidenceHash: true,
                      bankFileHash: true,
                      ledgerPostingBatchId: true,
                      postedBusinessEventId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      paymentBatches: {
        select: {
          id: true,
          evidenceHash: true,
          ledgerPostingBatchId: true,
          postedBusinessEventId: true,
        },
      },
    },
    orderBy: [{ payrollPeriod: { periodStart: "asc" } }, { createdAt: "asc" }],
  })

  if (runs.length === 0) {
    return {
      salaries: 0,
      payrollTax: 0,
      evidence: payrollEvidence({
        status: "NON_AUTHORITATIVE",
        reasonCode: "PAYROLL_REGISTER_FACTS_MISSING",
        message: "Payroll salary and payroll-tax amounts are omitted because no posted payroll register facts exist for this analytics period.",
        blockerCodes: ["PAYROLL_REGISTER_FACTS_MISSING"],
      }),
    }
  }

  const scopedToAllLocations = isAllLocationScope(input.locationId)
  const allLines = runs.flatMap((run) => run.lines.map((line) => ({ run, line })))
  const selectedLines = scopedToAllLocations
    ? allLines
    : allLines.filter(({ line }) => line.employee.locationId === input.locationId)
  const blockers = new Set<string>()

  if (!scopedToAllLocations && allLines.some(({ line }) => !line.employee.locationId)) {
    blockers.add("PAYROLL_LOCATION_ALLOCATION_MISSING")
  }

  if (selectedLines.length === 0) {
    blockers.add("PAYROLL_REGISTER_LOCATION_FACTS_MISSING")
  }

  const paymentBatchIds = Array.from(new Set(runs.flatMap((run) => run.paymentBatches.map((batch) => batch.id))))
  const sourceLinks = await db.accountingSourceLink.findMany({
    where: {
      organizationId: input.organizationId,
      OR: [
        { sourceType: AccountingSourceType.PAYROLL_RUN, sourceId: { in: runs.map((run) => run.id) } },
        ...(paymentBatchIds.length
          ? [{ sourceType: AccountingSourceType.PAYROLL_PAYMENT, sourceId: { in: paymentBatchIds } }]
          : []),
      ],
    },
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      postingBatch: { select: { status: true } },
    },
  })
  const postedSourceLinksByKey = new Map<string, number>()
  for (const link of sourceLinks) {
    if (link.postingBatch.status !== LedgerPostingBatchStatus.POSTED) continue
    const key = sourceLinkKey(link.sourceType, link.sourceId)
    postedSourceLinksByKey.set(key, (postedSourceLinksByKey.get(key) ?? 0) + 1)
  }

  for (const run of runs) {
    const runSourceKey = sourceLinkKey(AccountingSourceType.PAYROLL_RUN, run.id)
    if (!run.ledgerPostingBatchId || !run.postedBusinessEventId || !postedSourceLinksByKey.has(runSourceKey)) {
      blockers.add("PAYROLL_REGISTER_LEDGER_SOURCE_LINK_MISSING")
    }
  }

  const selectedPaymentBatchIds = new Set<string>()
  const evidenceHashes = new Set<string>()
  for (const { line } of selectedLines) {
    if (hasEffectiveComponentProofGap(line.calculationSnapshot as Prisma.JsonValue | null)) {
      blockers.add("PAYROLL_EFFECTIVE_COMPONENT_PROOF_MISSING")
    }

    const payslip = line.payslip
    if (!payslip || payslip.status !== PayrollPayslipStatus.EMITTED || !payslip.documentHash) {
      blockers.add("PAYROLL_REGISTER_PAYSLIP_TIEOUT_FAILED")
      continue
    }

    const allocatedAmount = payslip.paymentAllocations.reduce((sum, allocation) => sum + toNumber(allocation.amount), 0)
    if (Math.abs(allocatedAmount - toNumber(line.netPayableAmount)) > 0.01) {
      blockers.add("PAYROLL_REGISTER_PAYMENT_TIEOUT_FAILED")
    }

    for (const allocation of payslip.paymentAllocations) {
      const batch = allocation.payrollPaymentBatch
      selectedPaymentBatchIds.add(batch.id)
      if (batch.evidenceHash) evidenceHashes.add(batch.evidenceHash)
      const paymentSourceKey = sourceLinkKey(AccountingSourceType.PAYROLL_PAYMENT, batch.id)
      if (
        !payrollFactPaymentStatuses.has(batch.status) ||
        !batch.evidenceHash ||
        !batch.ledgerPostingBatchId ||
        !batch.postedBusinessEventId ||
        !postedSourceLinksByKey.has(paymentSourceKey)
      ) {
        blockers.add("PAYROLL_PAYMENT_EVIDENCE_MISSING")
      }
    }
  }

  if (blockers.size > 0) {
    const blockerCodes = Array.from(blockers).sort()
    return {
      salaries: 0,
      payrollTax: 0,
      evidence: payrollEvidence({
        status: "NON_AUTHORITATIVE",
        reasonCode: "PAYROLL_EVIDENCE_INCOMPLETE",
        message:
          "Payroll salary and payroll-tax amounts are omitted because payroll register, effective component, ledger, or payment evidence is incomplete.",
        runCount: runs.length,
        lineCount: selectedLines.length,
        paymentBatchCount: selectedPaymentBatchIds.size,
        sourceLinkCount: sourceLinks.length,
        evidenceHashCount: evidenceHashes.size,
        blockerCodes,
      }),
    }
  }

  return {
    salaries: selectedLines.reduce((sum, { line }) => sum + toNumber(line.grossAmount), 0),
    payrollTax: selectedLines.reduce((sum, { line }) => sum + toNumber(line.employerChargeAmount), 0),
    evidence: payrollEvidence({
      status: "AUTHORITATIVE",
      reasonCode: "PAYROLL_FINANCE_FACTS_SOURCE_LINKED",
      message:
        "Payroll salary and payroll-tax amounts are sourced from payroll register lines with posted ledger source links and payment evidence.",
      runCount: runs.length,
      lineCount: selectedLines.length,
      paymentBatchCount: selectedPaymentBatchIds.size,
      sourceLinkCount: sourceLinks.length,
      evidenceHashCount: evidenceHashes.size,
    }),
  }
}

async function getSalesOrders(organizationId: string, locationId: string, start: Date, end: Date) {
  return db.salesOrder.findMany({
    where: {
      organizationId,
      locationId,
      deletedAt: null,
      orderDate: { gte: start, lte: end },
      status: { in: activeSalesStatuses },
    },
    include: {
      lines: {
        include: {
          item: { select: { nameEn: true, sku: true, costPrice: true, sellingPrice: true } },
        },
      },
      payments: { where: { deletedAt: null }, select: { method: true, amount: true } },
    },
  })
}

export async function getFinancialMetricsReadModel(
  input: FinancialAnalyticsReadModelInput,
): Promise<FinancialMetrics> {
  const { organizationId, locationId, startDate, endDate } = input
  const start = startOfDay(startDate)
  const end = endOfDay(endDate)
  const periodLength = end.getTime() - start.getTime()
  const prevStart = new Date(start.getTime() - periodLength)
  const prevEnd = new Date(end.getTime() - periodLength)

  const [currentSales, previousSales, inventoryLevels, cashTransactions] = await Promise.all([
    getSalesOrders(organizationId, locationId, start, end),
    getSalesOrders(organizationId, locationId, prevStart, prevEnd),
    db.inventoryLevel.findMany({
      where: { locationId, item: { organizationId } },
      include: { item: { select: { costPrice: true } } },
    }),
    db.cashDrawerTransaction.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        cashDrawer: { locationId, location: { organizationId } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ])
  const [payrollFacts, payrollForecast] = await Promise.all([
    getPayrollFinanceFacts({
      organizationId,
      locationId,
      start,
      end,
      actorPermissions: input.actorPermissions,
      payrollModuleDecision: input.payrollModuleDecision,
    }),
    getPayrollForecastCashPlanningEvidence({
      organizationId,
      start,
      end,
      payrollModuleDecision: input.payrollModuleDecision,
    }),
  ])

  const totalRevenue = currentSales.reduce((sum, sale) => sum + toNumber(sale.total), 0)
  const previousRevenue = previousSales.reduce((sum, sale) => sum + toNumber(sale.total), 0)
  const growth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
  const totalCogs = currentSales.reduce(
    (sum, sale) =>
      sum +
      sale.lines.reduce((lineSum, line) => lineSum + toNumber(line.item.costPrice) * toNumber(line.quantity), 0),
    0,
  )
  const grossProfit = totalRevenue - totalCogs
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const inventoryValue = inventoryLevels.reduce(
    (sum, level) => sum + toNumber(level.quantityOnHand) * toNumber(level.item.costPrice),
    0,
  )

  const estimatedOperationalExpenses = totalRevenue * 0.15
  const payrollSalaries = payrollFacts.salaries
  const estimatedRent = 5000
  const estimatedUtilities = 1200
  const estimatedMarketing = totalRevenue * 0.02
  const estimatedOther = totalRevenue * 0.01
  const totalExpenses = totalCogs + estimatedOperationalExpenses + payrollSalaries + payrollFacts.payrollTax
  const netProfit = totalRevenue - totalExpenses
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  const cashIn = cashTransactions
    .filter((transaction) => transaction.type === "CASH_IN" || transaction.type === "SALE")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const cashOut = cashTransactions
    .filter((transaction) => transaction.type === "CASH_OUT" || transaction.type === "PAYOUT" || transaction.type === "REFUND")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const operatingCashFlow = cashIn - cashOut
  const investingCashFlow = -15000
  const financingCashFlow = -8000
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow
  const currentCashBalance = cashTransactions.length
    ? toNumber(cashTransactions[cashTransactions.length - 1].balanceAfter)
    : 0

  const currentAssets = inventoryValue + currentCashBalance + totalRevenue * 0.1
  const totalAssets = currentAssets + 500000
  const currentLiabilities = totalRevenue * 0.08
  const totalLiabilities = currentLiabilities + 150000
  const equity = totalAssets - totalLiabilities
  const salesTax = totalRevenue * 0.0875
  const incomeTax = netProfit > 0 ? netProfit * 0.25 : 0
  const payrollTax = payrollFacts.payrollTax
  const totalTaxLiability = salesTax + incomeTax + payrollTax

  return {
    revenue: {
      total: totalRevenue,
      growth,
      recurring: totalRevenue * 0.7,
      oneTime: totalRevenue * 0.3,
      forecast: totalRevenue * 1.1,
      target: totalRevenue * 0.95,
      achievement: totalRevenue > 0 ? (totalRevenue / (totalRevenue * 0.95)) * 100 : 0,
    },
    profitability: {
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      ebitda: netProfit + incomeTax + 5000,
      ebitdaMargin: totalRevenue > 0 ? ((netProfit + incomeTax + 5000) / totalRevenue) * 100 : 0,
      operatingProfit: grossProfit - estimatedOperationalExpenses,
    },
    expenses: {
      total: totalExpenses,
      cogs: totalCogs,
      operational: estimatedOperationalExpenses,
      salaries: payrollSalaries,
      rent: estimatedRent,
      utilities: estimatedUtilities,
      marketing: estimatedMarketing,
      other: estimatedOther,
    },
    cashFlow: {
      operating: operatingCashFlow,
      investing: investingCashFlow,
      financing: financingCashFlow,
      netCashFlow,
      cashOnHand: currentCashBalance,
      burnRate: estimatedOperationalExpenses / 30,
    },
    assets: {
      total: totalAssets,
      current: currentAssets,
      inventory: inventoryValue,
      receivables: totalRevenue * 0.1,
      cash: currentCashBalance,
      fixedAssets: 500000,
    },
    liabilities: {
      total: totalLiabilities,
      current: currentLiabilities,
      payables: currentLiabilities * 0.7,
      accrued: currentLiabilities * 0.3,
      longTerm: 150000,
      loans: 100000,
    },
    ratios: {
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
      quickRatio: currentLiabilities > 0 ? (currentAssets - inventoryValue) / currentLiabilities : 0,
      debtToEquity: equity > 0 ? totalLiabilities / equity : 0,
      roe: equity > 0 ? (netProfit / equity) * 100 : 0,
      roa: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0,
      grossMarginTrend: 0,
      inventoryTurnover: inventoryValue > 0 ? totalCogs / inventoryValue : 0,
      receivablesTurnover: totalRevenue > 0 ? totalRevenue / (totalRevenue * 0.1) : 0,
    },
    taxes: {
      salesTax,
      incomeTax,
      payrollTax,
      totalTaxLiability,
      taxRate: netProfit > 0 ? (incomeTax / netProfit) * 100 : 25,
    },
    payrollEvidence: payrollFacts.evidence,
    payrollForecast,
  }
}

export async function getDailyReportDataReadModel(input: DailyReportReadModelInput) {
  const { organizationId, locationId, date } = input
  const start = startOfDay(date)
  const end = endOfDay(date)

  const dailyReport = await db.dailySalesReport.findFirst({
    where: { organizationId, locationId, date: start },
    include: {
      itemSales: true,
    },
  })

  if (dailyReport) {
    return {
      session: {
        id: "daily-report",
        sessionNumber: `DR-${date.toISOString().split("T")[0]}`,
        startTime: start,
        endTime: end,
        status: dailyReport.isFinalized ? "closed" : "active",
        cashierName: "Multiple Users",
        terminalName: "All Terminals",
      },
      metrics: {
        totalSales: toNumber(dailyReport.totalRevenue),
        totalTransactions: dailyReport.totalTransactions,
        averageTransaction: toNumber(dailyReport.averageTransactionValue),
        totalItemsSold: toNumber(dailyReport.totalQuantitySold),
        cashTotal: toNumber(dailyReport.cashSales),
        cardTotal: toNumber(dailyReport.cardSales),
        digitalTotal:
          toNumber(dailyReport.mobileMoneySales) +
          toNumber(dailyReport.bankTransferSales) +
          toNumber(dailyReport.creditSales),
        openingBalance: toNumber(dailyReport.openingBalance),
        closingBalance: toNumber(dailyReport.closingBalance),
        expectedBalance: toNumber(dailyReport.openingBalance) + toNumber(dailyReport.cashSales),
        variance: toNumber(dailyReport.variance),
        cashIn: toNumber(dailyReport.cashIn),
        cashOut: toNumber(dailyReport.cashOut),
      },
      topItems: dailyReport.itemSales.slice(0, 5).map((item) => ({
        itemId: item.itemId,
        itemName: item.itemNameEn,
        itemSku: item.itemSku,
        quantitySold: toNumber(item.quantitySold),
        totalRevenue: toNumber(item.totalRevenue),
        sellingPrice: toNumber(item.sellingPrice),
      })),
    }
  }

  const salesOrders = await getSalesOrders(organizationId, locationId, start, end)
  const totalSales = salesOrders.reduce((sum, order) => sum + toNumber(order.total), 0)
  const totalTransactions = salesOrders.length
  const totalItemsSold = salesOrders.reduce(
    (sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + toNumber(line.quantity), 0),
    0,
  )
  const payments = salesOrders.flatMap((order) => order.payments)
  const cashSales = payments.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const cardSales = payments.filter((payment) => payment.method === "CARD").reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const digitalSales = payments
    .filter((payment) => ["MOBILE_MONEY", "BANK_TRANSFER", "STORE_CREDIT"].includes(payment.method))
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0)

  const itemSales = new Map<string, { name: string; sku: string; quantity: number; revenue: number; price: number }>()
  for (const order of salesOrders) {
    for (const line of order.lines) {
      const existing = itemSales.get(line.itemId) || {
        name: line.item.nameEn,
        sku: line.item.sku,
        quantity: 0,
        revenue: 0,
        price: toNumber(line.item.sellingPrice),
      }
      existing.quantity += toNumber(line.quantity)
      existing.revenue += toNumber(line.lineTotal)
      itemSales.set(line.itemId, existing)
    }
  }

  return {
    session: {
      id: "daily-calculation",
      sessionNumber: `DC-${date.toISOString().split("T")[0]}`,
      startTime: start,
      endTime: end,
      status: "active",
      cashierName: "Multiple Users",
      terminalName: "All Terminals",
    },
    metrics: {
      totalSales,
      totalTransactions,
      averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      totalItemsSold,
      cashTotal: cashSales,
      cardTotal: cardSales,
      digitalTotal: digitalSales,
      openingBalance: 200,
      closingBalance: null,
      expectedBalance: 200 + cashSales,
      variance: null,
      cashIn: cashSales,
      cashOut: 0,
    },
    topItems: Array.from(itemSales.entries())
      .map(([itemId, data]) => ({
        itemId,
        itemName: data.name,
        itemSku: data.sku,
        quantitySold: data.quantity,
        totalRevenue: data.revenue,
        sellingPrice: data.price,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5),
  }
}
