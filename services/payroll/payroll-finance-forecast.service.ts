import "server-only"

import { AccountingSourceType, LedgerPostingBatchStatus, Prisma, PayrollDeclarationStatus, PayrollPaymentBatchStatus, PayrollRunStatus } from "@prisma/client"
import { db } from "@/prisma/db"
import { payrollCertifiedInputProofFromMetadata } from "./certified-input-proof"
import { resolveSettlementBalance } from "./payment-settlement-balance"
import type { NormalizedSnapshotScope, PaymentTruthMetrics, PayrollFinanceForecastMetrics, SnapshotBlocker, SnapshotResult } from "@/services/snapshots/snapshot-contracts"
import { blocker, createSnapshotSourceHash, maxDate, toNumber } from "@/services/snapshots/snapshot-utils"

const PAYROLL_FINANCE_FORECAST_HORIZON_DAYS = 30
const PAYROLL_FINANCE_FORECAST_RUN_STATUSES: PayrollRunStatus[] = [
  PayrollRunStatus.POSTED,
  PayrollRunStatus.PAID,
  PayrollRunStatus.ARCHIVED,
]
const PAYROLL_FINANCE_FORECAST_PAYMENT_STATUSES: PayrollPaymentBatchStatus[] = [
  PayrollPaymentBatchStatus.RELEASED,
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
  PayrollPaymentBatchStatus.SETTLED,
]
const PAYROLL_FINANCE_FORECAST_DECLARATION_STATUSES: PayrollDeclarationStatus[] =
  [
    PayrollDeclarationStatus.PREPARED,
    PayrollDeclarationStatus.SUBMITTED,
    PayrollDeclarationStatus.ACCEPTED,
    PayrollDeclarationStatus.PAYMENT_DUE,
  ]
const PAYROLL_FINANCE_FORECAST_DECLARATION_BLOCKED_STATUSES: PayrollDeclarationStatus[] =
  [PayrollDeclarationStatus.REJECTED]

export type PayrollFinanceForecastResult = {
  metrics: PayrollFinanceForecastMetrics
  sourceMaxUpdatedAt: Date | null
  sourceEvidenceHash: string | null
}

export async function getPayrollFinanceForecast(input: {
  scope: NormalizedSnapshotScope
  paymentTruth: SnapshotResult<PaymentTruthMetrics> | null
  currency: string
}): Promise<PayrollFinanceForecastResult> {
  const horizon = payrollForecastHorizon(input.scope)
  const runInclude = PAYROLL_FORECAST_RUN_INCLUDE
  const periods: PayrollForecastPeriod[] = await db.payrollPeriod.findMany({
    where: {
      organizationId: input.scope.organizationId,
      payDate: { gte: horizon.start, lte: horizon.end },
    },
    include: {
      runs: {
        where: {
          organizationId: input.scope.organizationId,
          deletedAt: null,
          status: { in: PAYROLL_FINANCE_FORECAST_RUN_STATUSES },
        },
        include: runInclude,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { payDate: "asc" },
  })
  const declarationRuns: PayrollForecastRun[] = await db.payrollRun.findMany({
    where: {
      organizationId: input.scope.organizationId,
      deletedAt: null,
      status: { in: PAYROLL_FINANCE_FORECAST_RUN_STATUSES },
      declarations: {
        some: {
          dueDate: { gte: horizon.start, lte: horizon.end },
          status: {
            in: [
              ...PAYROLL_FINANCE_FORECAST_DECLARATION_STATUSES,
              ...PAYROLL_FINANCE_FORECAST_DECLARATION_BLOCKED_STATUSES,
            ],
          },
        },
      },
    },
    include: runInclude,
    orderBy: { updatedAt: "desc" },
  })

  const runsById = new Map<string, PayrollForecastRun>()
  for (const period of periods) {
    if (period.runs.length === 0) continue
    for (const run of period.runs) runsById.set(run.id, run)
  }
  for (const run of declarationRuns) runsById.set(run.id, run)

  const runs = Array.from(runsById.values())
  const blockers = new Set<string>()

  for (const period of periods) {
    if (period.runs.length === 0)
      blockers.add("PAYROLL_FORECAST_POSTED_RUN_MISSING")
    if (period.runs.length > 1)
      blockers.add("PAYROLL_FORECAST_MULTIPLE_POSTED_RUNS")
  }

  if (periods.length === 0 && runs.length === 0) {
    return {
      metrics: payrollFinanceForecastMetrics({
        status: "AUTHORITATIVE",
        reasonCode: "PAYROLL_FORECAST_NO_UPCOMING_PERIODS",
        message:
          "No upcoming payroll periods, payment batches, or statutory declaration due dates are visible in the forecast horizon.",
        horizon,
        currencyCode: input.currency,
        sourceCurrencies: [],
      }),
      sourceMaxUpdatedAt: null,
      sourceEvidenceHash: null,
    }
  }

  const paymentBatchIds = Array.from(
    new Set(runs.flatMap((run) => run.paymentBatches.map((batch) => batch.id))),
  )
  const sourceLinks = await db.accountingSourceLink.findMany({
    where: {
      organizationId: input.scope.organizationId,
      OR: [
        ...(runs.length
          ? [
              {
                sourceType: AccountingSourceType.PAYROLL_RUN,
                sourceId: { in: runs.map((run) => run.id) },
              },
            ]
          : []),
        ...(paymentBatchIds.length
          ? [
              {
                sourceType: AccountingSourceType.PAYROLL_PAYMENT,
                sourceId: { in: paymentBatchIds },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      createdAt: true,
      postingBatch: { select: { status: true } },
    },
  })
  const postedSourceLinksByKey = new Set<string>()
  for (const link of sourceLinks) {
    if (link.postingBatch.status === LedgerPostingBatchStatus.POSTED) {
      postedSourceLinksByKey.add(
        payrollSourceLinkKey(link.sourceType, link.sourceId),
      )
    }
  }

  const paymentBatches = runs.flatMap((run) =>
    run.paymentBatches
      .filter((batch) =>
        isDateInRange(batch.paymentDate, horizon.start, horizon.end),
      )
      .map((batch) => ({ run, batch })),
  )
  // Settled batches remain evidence, but are no longer future cash obligations.
  const outstandingPaymentBatches = paymentBatches.filter(
    ({ batch }) => batch.status !== PayrollPaymentBatchStatus.SETTLED,
  )
  const partialIds = paymentBatches.filter(({batch}) => batch.status === PayrollPaymentBatchStatus.PARTIALLY_SETTLED).map(({batch}) => batch.id)
  const settlementEvents = partialIds.length ? await db.businessEvent.findMany({
    where: {organizationId: input.scope.organizationId, sourceType: AccountingSourceType.PAYROLL_PAYMENT, sourceId: {in: partialIds}, eventType: "payroll.payment_batch.reconciled"},
    select: {id:true, organizationId:true, sourceId:true, status:true, payload:true, processedAt:true},
  }) : []
  const remainingByBatch = new Map<string, Prisma.Decimal>()
  for (const {batch} of outstandingPaymentBatches) {
    if (batch.status !== PayrollPaymentBatchStatus.PARTIALLY_SETTLED) {
      remainingByBatch.set(batch.id, new Prisma.Decimal(batch.amount))
      continue
    }
    const balance = resolveSettlementBalance({...batch, organizationId:input.scope.organizationId}, settlementEvents.filter(event => event.sourceId === batch.id))
    if (balance) remainingByBatch.set(batch.id, balance.remaining)
    else blockers.add("PAYROLL_FORECAST_SETTLEMENT_BALANCE_UNVERIFIED")
  }
  const declarations = runs.flatMap((run) =>
    run.declarations
      .filter(
        (declaration) =>
          declaration.dueDate &&
          isDateInRange(declaration.dueDate, horizon.start, horizon.end),
      )
      .map((declaration) => ({ run, declaration })),
  )
  const evidenceHashes = new Set<string>()
  const certifiedInputProofHashes = new Set<string>()
  let certifiedInputRunCount = 0
  let registerToLedgerRunCount = 0

  if (paymentBatches.length > 0) {
    const providerProofReady =
      input.paymentTruth !== null &&
      input.paymentTruth.status !== "blocked" &&
      input.paymentTruth.metrics.providerAccountCount > 0 &&
      input.paymentTruth.metrics.activeProviderAccountCount > 0
    if (!providerProofReady)
      blockers.add("PAYROLL_FORECAST_PROVIDER_PROOF_MISSING")
  }

  for (const run of runs) {
    const runSourceKey = payrollSourceLinkKey(
      AccountingSourceType.PAYROLL_RUN,
      run.id,
    )
    const hasPostedRunSourceLink =
      Boolean(run.ledgerPostingBatchId) &&
      Boolean(run.postedBusinessEventId) &&
      postedSourceLinksByKey.has(runSourceKey)
    if (!hasPostedRunSourceLink) {
      blockers.add("PAYROLL_FORECAST_LEDGER_PROOF_MISSING")
    }

    const certifiedInputProof = payrollCertifiedInputProofFromMetadata(
      run.metadata,
    )
    if (!certifiedInputProof) {
      blockers.add("PAYROLL_FORECAST_CERTIFIED_HRIS_INPUT_PROOF_MISSING")
    } else {
      certifiedInputRunCount += 1
      certifiedInputProofHashes.add(
        certifiedInputProof.hrisPayrollReadinessHash,
      )
      certifiedInputProofHashes.add(
        certifiedInputProof.payrollInputReadinessHash,
      )
      certifiedInputProofHashes.add(
        certifiedInputProof.payrollEngineInputSnapshotHash,
      )
      for (const hash of certifiedInputProof.payrollEngineInputHashes) {
        certifiedInputProofHashes.add(hash)
      }
    }

    const runMetadata = payrollForecastMetadataRecord(run.metadata)
    const hasMatchedRegisterProof =
      payrollForecastMetadataString(runMetadata.componentRegisterProofHash) !==
        null &&
      payrollForecastMetadataString(
        runMetadata.componentRegisterProofStatus,
      ) === "MATCHED"
    if (!hasMatchedRegisterProof || !hasPostedRunSourceLink) {
      blockers.add("PAYROLL_FORECAST_REGISTER_LEDGER_TIEOUT_MISSING")
    } else {
      registerToLedgerRunCount += 1
    }

    const runPayDateInHorizon = isDateInRange(
      run.payrollPeriod.payDate,
      horizon.start,
      horizon.end,
    )
    const runPaymentBatches = paymentBatches.filter(
      (item) => item.run.id === run.id,
    )
    if (
      runPayDateInHorizon &&
      toNumber(run.netPayableAmount) > 0 &&
      runPaymentBatches.length === 0
    ) {
      blockers.add("PAYROLL_FORECAST_PAYMENT_BATCH_MISSING")
    }
    if (
      toNumber(run.employerChargeAmount) > 0 &&
      run.declarations.length === 0
    ) {
      blockers.add("PAYROLL_FORECAST_DECLARATION_MISSING")
    }
  }

  for (const { batch } of paymentBatches) {
    if (batch.evidenceHash) evidenceHashes.add(batch.evidenceHash)
    if (batch.bankFileHash) evidenceHashes.add(batch.bankFileHash)
    if (batch.documentHash) evidenceHashes.add(batch.documentHash)
    const paymentSourceKey = payrollSourceLinkKey(
      AccountingSourceType.PAYROLL_PAYMENT,
      batch.id,
    )
    if (
      !PAYROLL_FINANCE_FORECAST_PAYMENT_STATUSES.includes(batch.status) ||
      !batch.evidenceHash ||
      !batch.ledgerPostingBatchId ||
      !batch.postedBusinessEventId ||
      !postedSourceLinksByKey.has(paymentSourceKey)
    ) {
      blockers.add("PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING")
    }
  }

  for (const { declaration } of declarations) {
    const latestEvidence = declaration.evidenceItems[0] ?? null
    if (declaration.status === PayrollDeclarationStatus.REJECTED)
      blockers.add("PAYROLL_FORECAST_DECLARATION_REJECTED")
    if (
      !PAYROLL_FINANCE_FORECAST_DECLARATION_STATUSES.includes(
        declaration.status,
      )
    )
      continue
    if (latestEvidence?.evidenceHash)
      evidenceHashes.add(latestEvidence.evidenceHash)
    if (latestEvidence?.sourceRegisterHash)
      evidenceHashes.add(latestEvidence.sourceRegisterHash)
    if (latestEvidence?.authorityResponseHash)
      evidenceHashes.add(latestEvidence.authorityResponseHash)
    if (latestEvidence?.portalReceiptHash)
      evidenceHashes.add(latestEvidence.portalReceiptHash)
    if (latestEvidence?.supportingFileHash)
      evidenceHashes.add(latestEvidence.supportingFileHash)
    if (
      !declaration.dueDate ||
      !declaration.payloadHash ||
      !declaration.countryPackResolutionHash ||
      !latestEvidence?.evidenceHash ||
      !latestEvidence.sourceRegisterHash ||
      latestEvidence.countryPackResolutionHash !==
        declaration.countryPackResolutionHash
    ) {
      blockers.add("PAYROLL_FORECAST_DECLARATION_PROOF_MISSING")
    }
  }

  const sourceMaxUpdatedAt = maxDate([
    ...settlementEvents.map(event => event.processedAt),
    input.paymentTruth?.freshness.sourceMaxUpdatedAt ?? null,
    ...periods.map((period) => period.updatedAt),
    ...runs.map((run) => run.updatedAt),
    ...paymentBatches.map(({ batch }) => batch.updatedAt),
    ...declarations.map(({ declaration }) => declaration.updatedAt),
    ...declarations.flatMap(({ declaration }) =>
      declaration.evidenceItems.map((item) => item.createdAt),
    ),
    ...sourceLinks.map((link) => link.createdAt),
  ])
  const payableDeclarations = declarations.filter(({ declaration }) =>
    PAYROLL_FINANCE_FORECAST_DECLARATION_STATUSES.includes(declaration.status),
  )
  const sourceCurrencies = [...new Set([
    ...outstandingPaymentBatches.map(({ batch }) => batch.currency),
    ...payableDeclarations.map(({ declaration }) => declaration.currency),
  ])].sort()
  if (sourceCurrencies.some(currency => currency !== input.currency)) {
    blockers.add("PAYROLL_FORECAST_CURRENCY_MISMATCH")
  }
  const blockerCodes = Array.from(blockers).sort()
  const authoritative = blockerCodes.length === 0
  const upcomingNetPayAmount = authoritative
    ? outstandingPaymentBatches.reduce((sum, { batch }) => sum.plus(remainingByBatch.get(batch.id)!), new Prisma.Decimal(0)).toNumber()
    : null
  const upcomingStatutoryLiabilityAmount = authoritative
    ? payableDeclarations.reduce((sum, { declaration }) => sum.plus(declaration.amount), new Prisma.Decimal(0)).toNumber()
    : null

  return {
    metrics: payrollFinanceForecastMetrics({
      status: authoritative ? "AUTHORITATIVE" : "NON_AUTHORITATIVE",
      reasonCode: authoritative
        ? "PAYROLL_FORECAST_SOURCE_LINKED"
        : "PAYROLL_FORECAST_PROOF_INCOMPLETE",
      message: authoritative
        ? "Upcoming payroll net-pay and statutory-liability forecasts are sourced from payroll periods, payment batches, declarations, and posted source-link evidence."
        : "Upcoming payroll finance forecasts are withheld because currency, provider, declaration, payment, or ledger proof is incomplete.",
      horizon,
      upcomingNetPayAmount,
      upcomingStatutoryLiabilityAmount,
      currencyCode: input.currency,
      sourceCurrencies,
      payrollPeriodCount: periods.length,
      payrollRunCount: runs.length,
      paymentBatchCount: paymentBatches.length,
      declarationCount: declarations.length,
      sourceLinkCount: sourceLinks.length,
      evidenceHashCount: evidenceHashes.size,
      certifiedInputRunCount,
      certifiedInputProofHashCount: certifiedInputProofHashes.size,
      registerToLedgerRunCount,
      nextPayDate: minDateString([
        ...periods.filter((period) => period.runs.length === 0 || period.runs.some((run) =>
          toNumber(run.netPayableAmount) > 0 && !paymentBatches.some((item) => item.run.id === run.id),
        )).map((period) => period.payDate),
        ...outstandingPaymentBatches.map(({ batch }) => batch.paymentDate),
      ]),
      nextDeclarationDueDate: minDateString(
        declarations.map(({ declaration }) => declaration.dueDate),
      ),
      blockerCodes,
    }),
    sourceMaxUpdatedAt,
    sourceEvidenceHash: createSnapshotSourceHash({
      settlementEvents: settlementEvents.map(({id, status, payload}) => ({id, status, payload})).sort((a,b) => a.id.localeCompare(b.id)),
      paymentBatches: paymentBatches.map(({ batch }) => ({ id: batch.id, status: batch.status, currency: batch.currency, amount: batch.amount })).sort((a, b) => a.id.localeCompare(b.id)),
      declarations: declarations.map(({ declaration }) => ({ id: declaration.id, currency: declaration.currency, amount: declaration.amount })).sort((a, b) => a.id.localeCompare(b.id)),
    }),
  }
}

const PAYROLL_FORECAST_RUN_INCLUDE =
  Prisma.validator<Prisma.PayrollRunInclude>()({
    payrollPeriod: {
      select: {
        id: true,
        name: true,
        periodStart: true,
        periodEnd: true,
        payDate: true,
        updatedAt: true,
      },
    },
    paymentBatches: {
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        paymentDate: true,
        evidenceHash: true,
        bankFileHash: true,
        documentHash: true,
        ledgerPostingBatchId: true,
        postedBusinessEventId: true,
        updatedAt: true,
      },
    },
    declarations: {
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        dueDate: true,
        payloadHash: true,
        countryPackResolutionHash: true,
        updatedAt: true,
        evidenceItems: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            evidenceHash: true,
            sourceRegisterHash: true,
            countryPackResolutionHash: true,
            authorityResponseHash: true,
            portalReceiptHash: true,
            supportingFileHash: true,
            createdAt: true,
          },
        },
      },
    },
  })

type PayrollForecastRun = Prisma.PayrollRunGetPayload<{
  include: typeof PAYROLL_FORECAST_RUN_INCLUDE
}>
type PayrollForecastPeriod = Prisma.PayrollPeriodGetPayload<{
  include: {
    runs: {
      include: typeof PAYROLL_FORECAST_RUN_INCLUDE
    }
  }
}>
function payrollFinanceForecastMetrics(input: {
  status: PayrollFinanceForecastMetrics["status"]
  reasonCode: string
  message: string
  horizon: { start: Date; end: Date }
  upcomingNetPayAmount?: number | null
  upcomingStatutoryLiabilityAmount?: number | null
  currencyCode: string
  sourceCurrencies: string[]
  payrollPeriodCount?: number
  payrollRunCount?: number
  paymentBatchCount?: number
  declarationCount?: number
  sourceLinkCount?: number
  evidenceHashCount?: number
  certifiedInputRunCount?: number
  certifiedInputProofHashCount?: number
  registerToLedgerRunCount?: number
  nextPayDate?: string | null
  nextDeclarationDueDate?: string | null
  blockerCodes?: string[]
}): PayrollFinanceForecastMetrics {
  const upcomingNetPayAmount = input.status === "AUTHORITATIVE" ? input.upcomingNetPayAmount ?? 0 : null
  const upcomingStatutoryLiabilityAmount =
    input.status === "AUTHORITATIVE" ? input.upcomingStatutoryLiabilityAmount ?? 0 : null
  return {
    status: input.status,
    authoritative: input.status === "AUTHORITATIVE",
    reasonCode: input.reasonCode,
    message: input.message,
    horizonStart: input.horizon.start.toISOString(),
    horizonEnd: input.horizon.end.toISOString(),
    upcomingNetPayAmount,
    upcomingStatutoryLiabilityAmount,
    totalUpcomingAmount:
      upcomingNetPayAmount === null || upcomingStatutoryLiabilityAmount === null
        ? null : new Prisma.Decimal(upcomingNetPayAmount).plus(upcomingStatutoryLiabilityAmount).toNumber(),
    currencyCode: input.currencyCode,
    sourceCurrencies: input.sourceCurrencies,
    payrollPeriodCount: input.payrollPeriodCount ?? 0,
    payrollRunCount: input.payrollRunCount ?? 0,
    paymentBatchCount: input.paymentBatchCount ?? 0,
    declarationCount: input.declarationCount ?? 0,
    sourceLinkCount: input.sourceLinkCount ?? 0,
    evidenceHashCount: input.evidenceHashCount ?? 0,
    certifiedInputRunCount: input.certifiedInputRunCount ?? 0,
    certifiedInputProofHashCount: input.certifiedInputProofHashCount ?? 0,
    registerToLedgerRunCount: input.registerToLedgerRunCount ?? 0,
    nextPayDate: input.nextPayDate ?? null,
    nextDeclarationDueDate: input.nextDeclarationDueDate ?? null,
    personLevelAmountsRedacted: true,
    blockerCodes: input.blockerCodes ?? [],
  }
}

export function payrollForecastBlockers(
  metrics: PayrollFinanceForecastMetrics,
): SnapshotBlocker[] {
  return metrics.blockerCodes.map((code) => {
    const copy = payrollForecastBlockerCopy(code)
    return blocker({
      id: `tenant-payroll-finance-forecast-${code.toLowerCase().replace(/_/g, "-")}`,
      severity: copy.severity,
      gate: "payroll_finance_forecast",
      title: copy.title,
      detail: code === "PAYROLL_FORECAST_CURRENCY_MISMATCH"
        ? `Forecast source currencies: ${metrics.sourceCurrencies?.join("; ")}. No conversion evidence establishes a total in ${metrics.currencyCode}.`
        : copy.detail,
      sourceTables: [
        "payroll_periods",
        "payroll_runs",
        "payroll_run_lines",
        "payroll_payment_batches",
        "payroll_declarations",
        "payroll_declaration_evidence",
        "payment_provider_accounts",
        "accounting_source_links",
        "ledger_posting_batches",
      ],
      nextAction: copy.nextAction,
    })
  })
}

function payrollForecastBlockerCopy(code: string): {
  severity: SnapshotBlocker["severity"]
  title: string
  detail: string
  nextAction: string
} {
  switch (code) {
    case "PAYROLL_FORECAST_CURRENCY_MISMATCH":
      return {
        severity: "high",
        title: "Payroll forecast currencies cannot be combined",
        detail: "Payroll forecast sources do not share the organization's currency.",
        nextAction: "Review payment batches and declarations by currency before relying on a combined cash forecast.",
      }
    case "PAYROLL_FORECAST_PROVIDER_PROOF_MISSING":
      return {
        severity: "high",
        title: "Payroll provider proof is missing",
        detail:
          "Upcoming payroll net-pay is withheld until an active payment provider evidence path is visible.",
        nextAction:
          "Open payment provider evidence and payroll payment batches before relying on payroll cash forecasts.",
      }
    case "PAYROLL_FORECAST_DECLARATION_PROOF_MISSING":
    case "PAYROLL_FORECAST_DECLARATION_MISSING":
      return {
        severity: "high",
        title: "Payroll declaration proof is missing",
        detail:
          "Upcoming statutory liability is withheld until declaration payload, due date, country-pack, and lifecycle evidence are complete.",
        nextAction:
          "Open payroll declarations and attach source-register-backed declaration evidence.",
      }
    case "PAYROLL_FORECAST_LEDGER_PROOF_MISSING":
      return {
        severity: "high",
        title: "Payroll ledger proof is missing",
        detail:
          "Payroll forecast amounts are withheld until payroll run and payment source links point to posted ledger batches.",
        nextAction:
          "Repair payroll posting and accounting source links before using the cash forecast.",
      }
    case "PAYROLL_FORECAST_CERTIFIED_HRIS_INPUT_PROOF_MISSING":
      return {
        severity: "critical",
        title: "Certified HRIS payroll input proof is missing",
        detail:
          "Payroll forecast amounts are withheld until every included run is bound to certified HRIS readiness and payroll engine input hashes.",
        nextAction:
          "Recalculate and post payroll from a certified HRIS readiness export before relying on finance or close assurance.",
      }
    case "PAYROLL_FORECAST_REGISTER_LEDGER_TIEOUT_MISSING":
      return {
        severity: "critical",
        title: "Payroll register-to-ledger tie-out is incomplete",
        detail:
          "Payroll forecast amounts are withheld until matched component-register proof is linked to a posted payroll ledger source.",
        nextAction:
          "Repair payroll component-register proof and posted accounting source links before close.",
      }
    case "PAYROLL_FORECAST_SETTLEMENT_BALANCE_UNVERIFIED":
      return {
        severity: "high",
        title: "Remaining payroll payment balance is unverified",
        detail: "A partially settled payroll batch has no verified remaining balance. Its original amount cannot be used as upcoming cash.",
        nextAction: "Review payroll settlement evidence and establish the remaining obligation before relying on this forecast.",
      }
    case "PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING":
    case "PAYROLL_FORECAST_PAYMENT_BATCH_MISSING":
      return {
        severity: "high",
        title: "Payroll payment proof is missing",
        detail:
          "Upcoming net-pay forecast is withheld until released payment batches include immutable payment and ledger evidence.",
        nextAction:
          "Open payroll payments and complete payment release evidence.",
      }
    default:
      return {
        severity: "high",
        title: "Payroll finance forecast is blocked",
        detail: `Payroll forecast proof failed closed with blocker ${code}.`,
        nextAction:
          "Open payroll finance evidence and clear the forecast blocker.",
      }
  }
}

function payrollForecastHorizon(scope: NormalizedSnapshotScope) {
  const start = startOfUtcDay(
    scope.periodStart > scope.now ? scope.periodStart : scope.now,
  )
  const requestedEnd = scope.periodEnd > start ? scope.periodEnd : null
  const fallbackEnd = endOfUtcDay(
    addUtcDays(start, PAYROLL_FINANCE_FORECAST_HORIZON_DAYS),
  )
  return {
    start,
    end: requestedEnd && requestedEnd > start ? requestedEnd : fallbackEnd,
  }
}

function payrollSourceLinkKey(
  sourceType: AccountingSourceType,
  sourceId: string,
) {
  return `${sourceType}:${sourceId}`
}

function payrollForecastMetadataRecord(
  value: unknown,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function payrollForecastMetadataString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isDateInRange(
  value: Date | string | null | undefined,
  start: Date,
  end: Date,
) {
  if (!value) return false
  const date = value instanceof Date ? value : new Date(value)
  return !Number.isNaN(date.getTime()) && date >= start && date <= end
}

function minDateString(values: Array<Date | string | null | undefined>) {
  let earliest: Date | null = null
  for (const value of values) {
    if (!value) continue
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) continue
    if (!earliest || date < earliest) earliest = date
  }
  return earliest?.toISOString() ?? null
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfUtcDay(date: Date) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

function endOfUtcDay(date: Date) {
  const next = startOfUtcDay(date)
  next.setUTCDate(next.getUTCDate() + 1)
  next.setUTCMilliseconds(next.getUTCMilliseconds() - 1)
  return next
}
