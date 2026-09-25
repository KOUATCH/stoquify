import "server-only"

import {
  AccountingSourceType,
  LedgerPostingBatchStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { getFinancialOrderActivity } from "./financial-order-activity.service"
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"
import { classifyPayrollTransitionEvidence } from "@/services/payroll/payroll-transition-evidence"
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
  schemaVersion: "financial-metrics.v2"
  availability: { status: "PARTIAL"; reasonCode: "FINANCIAL_SOURCES_NOT_CONNECTED" }
  orderActivity: Awaited<ReturnType<typeof getFinancialOrderActivity>>
  payrollBasis: { periodSelection: "OVERLAPPING_PAYROLL_PERIODS"; locationSelection: "CURRENT_EMPLOYEE_LOCATION"; forecastScope: "TENANT_AGGREGATE"; financialStatementsCertified: false }
  revenue: {
    total: null
    growth: null
    recurring: null
    oneTime: null
    forecast: null
    target: null
    achievement: null
  }
  profitability: {
    grossProfit: null
    grossMargin: null
    netProfit: null
    netMargin: null
    ebitda: null
    ebitdaMargin: null
    operatingProfit: null
  }
  expenses: {
    total: null
    cogs: null
    operational: null
    salaries: number | null
    rent: null
    utilities: null
    marketing: null
    other: null
  }
  cashFlow: {
    operating: null
    investing: null
    financing: null
    netCashFlow: null
    cashOnHand: null
    burnRate: null
  }
  assets: {
    total: null
    current: null
    inventory: null
    receivables: null
    cash: null
    fixedAssets: null
  }
  liabilities: {
    total: null
    current: null
    payables: null
    accrued: null
    longTerm: null
    loans: null
  }
  ratios: {
    currentRatio: null
    quickRatio: null
    debtToEquity: null
    roe: null
    roa: null
    grossMarginTrend: null
    inventoryTurnover: null
    receivablesTurnover: null
  }
  taxes: {
    salesTax: null
    incomeTax: null
    payrollTax: number | null
    totalTaxLiability: null
    taxRate: null
  }
  payrollEvidence: PayrollFinanceEvidence
  payrollForecast: PayrollForecastCashPlanningEvidence
}

type DecimalValue = Prisma.Decimal | number | string | null | undefined

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
      transitions: {
        orderBy: { sequence: "asc" },
        select: {
          toStatus: true,
          fromVersion: true,
          toVersion: true,
          actorId: true,
          transitionedAt: true,
          businessEventId: true,
          origin: true,
          evidenceStatus: true,
        },
      },
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

  for (const run of runs) {
    const transitionEvidence = classifyPayrollTransitionEvidence(run)
    if (transitionEvidence === "MISSING_POST_CUTOVER") {
      blockers.add("PAYROLL_TRANSITION_PROOF_MISSING")
    } else if (transitionEvidence === "LEGACY_PARTIAL") {
      blockers.add("PAYROLL_TRANSITION_LEGACY_PARTIAL_EVIDENCE")
    }
  }

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
          "Payroll salary and payroll-tax amounts are omitted because lifecycle transition, payroll register, effective component, ledger, or payment evidence is incomplete.",
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

export async function getFinancialMetricsReadModel(
  input: FinancialAnalyticsReadModelInput,
): Promise<FinancialMetrics> {
  const orderActivity = await getFinancialOrderActivity(input)
  const start = new Date(orderActivity.context.period.periodStart)
  const end = new Date(new Date(orderActivity.context.period.periodEndExclusive).getTime() - 1)
  const [payrollFacts, payrollForecast] = await Promise.all([
    getPayrollFinanceFacts({ ...input, start, end }),
    getPayrollForecastCashPlanningEvidence({ organizationId: input.organizationId, start, end, payrollModuleDecision: input.payrollModuleDecision }),
  ])
  // Operational order value and overlapping payroll evidence do not establish
  // posted revenue, statutory liabilities, balance-sheet or cash-flow totals.
  // Keep unsupported legacy fields explicitly unavailable; never fill them with estimates or zeros.
  return {
    schemaVersion: "financial-metrics.v2",
    availability: { status: "PARTIAL", reasonCode: "FINANCIAL_SOURCES_NOT_CONNECTED" },
    orderActivity,
    payrollBasis: { periodSelection: "OVERLAPPING_PAYROLL_PERIODS", locationSelection: "CURRENT_EMPLOYEE_LOCATION", forecastScope: "TENANT_AGGREGATE", financialStatementsCertified: false },
    revenue: { total: null, growth: null, recurring: null, oneTime: null, forecast: null, target: null, achievement: null },
    profitability: { grossProfit: null, grossMargin: null, netProfit: null, netMargin: null, ebitda: null, ebitdaMargin: null, operatingProfit: null },
    expenses: { total: null, cogs: null, operational: null, salaries: payrollFacts.evidence.authoritative ? payrollFacts.salaries : null, rent: null, utilities: null, marketing: null, other: null },
    cashFlow: { operating: null, investing: null, financing: null, netCashFlow: null, cashOnHand: null, burnRate: null },
    assets: { total: null, current: null, inventory: null, receivables: null, cash: null, fixedAssets: null },
    liabilities: { total: null, current: null, payables: null, accrued: null, longTerm: null, loans: null },
    ratios: { currentRatio: null, quickRatio: null, debtToEquity: null, roe: null, roa: null, grossMarginTrend: null, inventoryTurnover: null, receivablesTurnover: null },
    taxes: { salesTax: null, incomeTax: null, payrollTax: payrollFacts.evidence.authoritative ? payrollFacts.payrollTax : null, totalTaxLiability: null, taxRate: null },
    payrollEvidence: payrollFacts.evidence,
    payrollForecast,
  }
}

export async function getDailyReportDataReadModel(input: DailyReportReadModelInput) {
  const { getDailySalesReadModel } = await import("./daily-sales-read.service")
  return getDailySalesReadModel(input)
}
