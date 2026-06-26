import {
  AccountingSourceType,
  AccountingPeriodStatus,
  BusinessEventStatus,
  FiscalDocumentStatus,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PaymentExceptionStatus,
  PayrollDeclarationEvidenceTransition,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollRunStatus,
  Prisma,
  ProviderAccountStatus,
  ReconciliationRunStatus,
  StatementFileStatus,
  SupplierInvoiceStatus,
  SupplierPaymentStatus,
} from "@prisma/client"
import { createHash, randomUUID } from "node:crypto"

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { assertSensitiveActionAllowed, evaluateAndAuditSensitiveAction } from "@/services/controls/sensitive-action.service"

type DbClient = typeof db | Prisma.TransactionClient
type TrustLevel = "T0" | "T1" | "T2" | "T3" | "T4"
type TrustVerdict = "CERTIFIED" | "PARTIAL" | "NON_COMPLIANT"
type BlockerSeverity = "critical" | "high" | "medium" | "low"
type ModuleStatus = "ready" | "needs_review" | "blocked"
type PeriodStatus = AccountingPeriodStatus | "UNAVAILABLE"

export type AccountantFinancialFigure =
  | {
      available: true
      amount: string
      currency: string
      provenance: "POSTED"
      asOf: string
      periodStatus: PeriodStatus
      sourceTables: string[]
      sourceQueryId: string
    }
  | {
      available: false
      amount: null
      currency: string
      provenance: "UNAVAILABLE"
      reason: string
      asOf: string
      periodStatus: PeriodStatus
      sourceTables: string[]
      sourceQueryId: string
    }

export type DataTrustBlocker = {
  id: string
  severity: BlockerSeverity
  gate: string
  title: string
  detail: string
  sourceTables: string[]
}

export type AccountantPortalData = {
  source: {
    mode: "LEDGER_BACKED_DATA_TRUST"
    asOf: string
    organizationScoped: true
    trustLevel: TrustLevel
    certificationStatus: TrustVerdict
    scopeHash: string
    sourceTables: string[]
  }
  scope: {
    organizationId: string
    periodId: string | null
    periodName: string | null
    periodStatus: PeriodStatus
    startDate: string | null
    endDate: string | null
  }
  certificate: {
    surface: "dashboard/accounting/accountant-portal"
    level: TrustLevel
    verdict: TrustVerdict
    generatedAt: string
    evidence: string[]
    requiredForNextLevel: string[]
  }
  summary: {
    postedJournalEntries: number
    journalLines: number
    sourceLinks: number
    linkedPostedEntries: number
    sourceLinkCoveragePct: number | null
    ledgerBalanced: boolean
    blockerCount: number
    criticalBlockers: number
    highBlockers: number
  }
  figures: {
    activityDebit: AccountantFinancialFigure
    activityCredit: AccountantFinancialFigure
  }
  moduleEvidence: Array<{
    module: "ledger" | "events" | "payments" | "purchasing" | "payroll" | "compliance" | "offline_pos" | "audit"
    status: ModuleStatus
    label: string
    detail: string
    facts: Array<{ label: string; value: string | number }>
  }>
  blockers: DataTrustBlocker[]
  latestSourceLinks: Array<{
    id: string
    sourceType: string
    sourceId: string
    sourceNumber: string | null
    journalEntryNumber: string | null
    postingBatchId: string
    postingStatus: string
    createdAt: string
  }>
  latestAuditEvents: Array<{
    id: string
    source: "ledger" | "control"
    action: string
    resourceType: string
    resourceId: string | null
    actorId: string | null
    createdAt: string
    status: string
  }>
  exportReadiness: {
    canExportCertifiedPack: boolean
    disabledReason: string | null
    requiredPermission: "accounting.exports.create"
    sensitivity: "statutory"
  }
}

export type GetAccountantPortalDataInput = {
  organizationId: string
  periodId?: string | null
  startDate?: Date | string | null
  endDate?: Date | string | null
  limit?: number
}

export type ExportAccountantTrustPackServiceInput = GetAccountantPortalDataInput & {
  exportedById: string
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
  fileType?: "json"
  includeLedgerRows?: boolean
}

export type AccountantTrustPackExport = {
  exportId: string
  fileName: string
  mimeType: "application/json"
  content: string
  contentHash: string
  watermarkId: string
  rowCount: number
  trustLevel: TrustLevel
  verdict: TrustVerdict
  generatedAt: string
}

const DATA_TRUST_SOURCE_TABLES = [
  "journal_entries",
  "journal_entry_lines",
  "ledger_posting_batches",
  "accounting_source_links",
  "business_events",
  "ledger_audit_events",
  "audit_logs",
  "provider_accounts",
  "statement_files",
  "statement_lines",
  "reconciliation_runs",
  "payment_exceptions",
  "payment_transactions",
  "supplier_invoices",
  "supplier_payments",
  "payroll_runs",
  "payroll_run_lines",
  "payroll_payslips",
  "payroll_declarations",
  "payroll_declaration_evidence",
  "payroll_payment_batches",
  "payroll_payment_allocations",
  "fiscal_documents",
] as const

function parseOptionalDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`
}

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`
}

function decimal(value: Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined) return new Prisma.Decimal(0)
  return new Prisma.Decimal(value)
}

function money(value: Prisma.Decimal.Value | null | undefined) {
  return decimal(value).toDecimalPlaces(2).toFixed(2)
}

function normalizedScope(input: GetAccountantPortalDataInput, now: Date) {
  const startDate = parseOptionalDate(input.startDate)
  const endDate = parseOptionalDate(input.endDate)

  return {
    organizationId: input.organizationId,
    periodId: input.periodId || null,
    startDate,
    endDate,
    limit: Math.min(Math.max(input.limit ?? 12, 1), 50),
    asOf: now.toISOString(),
  }
}

function entryDateFilter(scope: ReturnType<typeof normalizedScope>) {
  if (!scope.startDate && !scope.endDate) return {}

  return {
    entryDate: {
      ...(scope.startDate ? { gte: scope.startDate } : {}),
      ...(scope.endDate ? { lte: scope.endDate } : {}),
    },
  } satisfies Prisma.JournalEntryWhereInput
}

function createdAtFilter(scope: ReturnType<typeof normalizedScope>) {
  if (!scope.startDate && !scope.endDate) return {}

  return {
    createdAt: {
      ...(scope.startDate ? { gte: scope.startDate } : {}),
      ...(scope.endDate ? { lte: scope.endDate } : {}),
    },
  }
}

function journalEntryScope(scope: ReturnType<typeof normalizedScope>) {
  return {
    organizationId: scope.organizationId,
    status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
    ...(scope.periodId ? { periodId: scope.periodId } : {}),
    ...entryDateFilter(scope),
  } satisfies Prisma.JournalEntryWhereInput
}

function postingBatchScope(scope: ReturnType<typeof normalizedScope>) {
  return {
    organizationId: scope.organizationId,
    ...(scope.periodId ? { periodId: scope.periodId } : {}),
    ...createdAtFilter(scope),
  } satisfies Prisma.LedgerPostingBatchWhereInput
}

function businessEventScope(scope: ReturnType<typeof normalizedScope>) {
  return {
    organizationId: scope.organizationId,
    ...createdAtFilter(scope),
  } satisfies Prisma.BusinessEventWhereInput
}

function statementFileScope(scope: ReturnType<typeof normalizedScope>) {
  const periodOverlap: Prisma.StatementFileWhereInput = {}
  if (scope.startDate) periodOverlap.periodEnd = { gte: scope.startDate }
  if (scope.endDate) periodOverlap.periodStart = { lte: scope.endDate }

  return {
    organizationId: scope.organizationId,
    providerAccount: { status: ProviderAccountStatus.ACTIVE },
    status: {
      in: [StatementFileStatus.IMPORTED, StatementFileStatus.PROCESSED],
    },
    ...periodOverlap,
  } satisfies Prisma.StatementFileWhereInput
}

function statementLineScope(scope: ReturnType<typeof normalizedScope>) {
  const occurredAt: Prisma.StatementLineWhereInput = {}
  if (scope.startDate || scope.endDate) {
    occurredAt.occurredAt = {
      ...(scope.startDate ? { gte: scope.startDate } : {}),
      ...(scope.endDate ? { lte: scope.endDate } : {}),
    }
  }

  return {
    organizationId: scope.organizationId,
    providerAccount: { status: ProviderAccountStatus.ACTIVE },
    ...occurredAt,
  } satisfies Prisma.StatementLineWhereInput
}

function signedReconciliationRunScope(scope: ReturnType<typeof normalizedScope>) {
  const businessDate: Prisma.ReconciliationRunWhereInput = {}
  if (scope.startDate || scope.endDate) {
    businessDate.businessDate = {
      ...(scope.startDate ? { gte: scope.startDate } : {}),
      ...(scope.endDate ? { lte: scope.endDate } : {}),
    }
  }

  return {
    organizationId: scope.organizationId,
    providerAccount: { status: ProviderAccountStatus.ACTIVE },
    status: ReconciliationRunStatus.SIGNED,
    ...(scope.periodId ? { accountingPeriodId: scope.periodId } : {}),
    ...businessDate,
  } satisfies Prisma.ReconciliationRunWhereInput
}

type ActiveProviderStatementFreshnessRow = {
  id: string
  displayName: string
  providerCode: string
  settlementLagDays: number
  metadata: Prisma.JsonValue | null
  statementFiles: Array<{ id: string; periodEnd: Date }>
}

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function positiveInteger(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback
}

function statementCadenceDays(account: ActiveProviderStatementFreshnessRow) {
  const metadata = jsonObject(account.metadata)
  return positiveInteger(metadata.statementCadenceDays ?? metadata.statement_cadence_days ?? metadata.cadenceDays, 1)
}

function startOfUtcDay(date: Date) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function statementFreshnessAnchor(
  scope: ReturnType<typeof normalizedScope>,
  period: Awaited<ReturnType<typeof resolveScopePeriod>>,
  now: Date,
) {
  const candidate = scope.endDate ?? period?.endDate ?? now
  return candidate > now ? now : candidate
}

function staleProviderStatementAccounts(accounts: ActiveProviderStatementFreshnessRow[], anchor: Date) {
  return accounts.filter((account) => {
    const latestStatement = account.statementFiles[0]
    if (!latestStatement) return false

    const freshnessWindowDays = statementCadenceDays(account) + Math.max(account.settlementLagDays, 0)
    const cutoff = addUtcDays(startOfUtcDay(anchor), -freshnessWindowDays)
    return latestStatement.periodEnd < cutoff
  })
}

function openPaymentExceptionStatuses() {
  return [
    PaymentExceptionStatus.OPEN,
    PaymentExceptionStatus.ASSIGNED,
    PaymentExceptionStatus.ACKNOWLEDGED,
    PaymentExceptionStatus.ESCALATED,
    PaymentExceptionStatus.RESOLUTION_PROPOSED,
    PaymentExceptionStatus.REOPENED,
  ]
}

function addBlocker(blockers: DataTrustBlocker[], blocker: Omit<DataTrustBlocker, "sourceTables"> & { sourceTables?: string[] }) {
  blockers.push({
    ...blocker,
    sourceTables: blocker.sourceTables ?? [],
  })
}

function statusFor(hasCritical: boolean, hasHigh: boolean, hasMedium: boolean): ModuleStatus {
  if (hasCritical || hasHigh) return "blocked"
  if (hasMedium) return "needs_review"
  return "ready"
}

function levelFromBlockers(blockers: DataTrustBlocker[], sourceLinkCoveragePct: number | null, ledgerBalanced: boolean): TrustLevel {
  if (blockers.some((blocker) => blocker.severity === "critical")) return "T0"
  if (!ledgerBalanced) return "T0"
  if (blockers.some((blocker) => blocker.severity === "high")) return "T2"
  if (blockers.some((blocker) => blocker.severity === "medium")) return "T3"
  if (sourceLinkCoveragePct !== null && sourceLinkCoveragePct < 100) return "T3"
  return "T4"
}

function verdictFor(level: TrustLevel): TrustVerdict {
  if (level === "T4") return "CERTIFIED"
  if (level === "T0") return "NON_COMPLIANT"
  return "PARTIAL"
}

function figure(
  amount: Prisma.Decimal,
  params: {
    currency: string
    asOf: string
    periodStatus: PeriodStatus
    sourceQueryId: string
    criticalBlockers: number
  },
): AccountantFinancialFigure {
  const sourceTables = ["journal_entries", "journal_entry_lines"]

  if (params.criticalBlockers > 0) {
    return {
      available: false,
      amount: null,
      currency: params.currency,
      provenance: "UNAVAILABLE",
      reason: "Critical data-trust blockers must be resolved before this financial figure is rendered.",
      asOf: params.asOf,
      periodStatus: params.periodStatus,
      sourceTables,
      sourceQueryId: params.sourceQueryId,
    }
  }

  return {
    available: true,
    amount: money(amount),
    currency: params.currency,
    provenance: "POSTED",
    asOf: params.asOf,
    periodStatus: params.periodStatus,
    sourceTables,
    sourceQueryId: params.sourceQueryId,
  }
}

async function resolveScopePeriod(client: DbClient, scope: ReturnType<typeof normalizedScope>, now: Date) {
  const anchor = scope.startDate ?? scope.endDate ?? now

  return client.accountingPeriod.findFirst({
    where: scope.periodId
      ? { organizationId: scope.organizationId, id: scope.periodId }
      : {
          organizationId: scope.organizationId,
          startDate: { lte: anchor },
          endDate: { gte: anchor },
        },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  })
}

async function loadOptionalLedgerRows(client: DbClient, scope: ReturnType<typeof normalizedScope>) {
  const rows = await client.journalEntryLine.findMany({
    where: {
      organizationId: scope.organizationId,
      journalEntry: journalEntryScope(scope),
    },
    orderBy: [{ journalEntry: { entryDate: "asc" } }, { lineNumber: "asc" }],
    take: 500,
    select: {
      id: true,
      lineNumber: true,
      description: true,
      debit: true,
      credit: true,
      currency: true,
      account: { select: { code: true, nameEn: true, nameFr: true } },
      journalEntry: {
        select: {
          id: true,
          entryNumber: true,
          entryDate: true,
          status: true,
          sourceType: true,
          sourceId: true,
        },
      },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    entryId: row.journalEntry.id,
    entryNumber: row.journalEntry.entryNumber,
    entryDate: row.journalEntry.entryDate.toISOString(),
    status: row.journalEntry.status,
    sourceType: row.journalEntry.sourceType,
    sourceId: row.journalEntry.sourceId,
    lineNumber: row.lineNumber,
    accountCode: row.account.code,
    accountName: row.account.nameEn || row.account.nameFr,
    description: row.description,
    debit: money(row.debit),
    credit: money(row.credit),
    currency: row.currency,
  }))
}

export async function getAccountantPortalData(
  input: GetAccountantPortalDataInput,
  client: DbClient = db,
  now = new Date(),
): Promise<AccountantPortalData> {
  const scope = normalizedScope(input, now)
  const entryWhere = journalEntryScope(scope)
  const batchWhere = postingBatchScope(scope)
  const eventWhere = businessEventScope(scope)
  const statementFileWhere = statementFileScope(scope)
  const statementLineWhere = statementLineScope(scope)
  const signedReconciliationRunWhere = signedReconciliationRunScope(scope)
  const scopeHash = sha256(
    stableStringify({
      organizationId: scope.organizationId,
      periodId: scope.periodId,
      startDate: scope.startDate?.toISOString() ?? null,
      endDate: scope.endDate?.toISOString() ?? null,
    }),
  )
  const sourceQueryId = sha256(
    stableStringify({
      scopeHash,
      sourceTables: ["journal_entries", "journal_entry_lines"],
    }),
  )

  const [
    settings,
    period,
    ledgerAggregate,
    postedEntryCount,
    orphanPostedEntryCount,
    postedWithoutBatchCount,
    sourceLinkCount,
    failedBatchCount,
    postedBatchWithoutJournalCount,
    failedBusinessEventCount,
    openPaymentExceptionCount,
    criticalPaymentExceptionCount,
    activeProviderAccountCount,
    activeProviderStatementFreshnessRows,
    providerStatementFileCount,
    providerStatementLineCount,
    signedReconciliationRunCount,
    payrollDeclarationPreparedCount,
    payrollDeclarationRejectedCount,
    payrollDeclarationInProgressCount,
    payrollDeclarationLifecycleEvidenceMissingCount,
    payrollDeclarationAmendmentEvidenceCount,
    payrollPaymentUnsettledCount,
    payrollPaymentReconciliationEvidenceMissingCount,
    payrollPaymentAllocationMissingCount,
    payrollPostedRunMissingLedgerCount,
    payrollPostedRunLineMissingPayslipCount,
    payrollEmittedPayslipMissingProofCount,
    payrollPaidRunMissingSettledPaymentCount,
    payrollPaymentMissingLedgerCount,
    payrollPostedLedgerMissingSourceLinkCount,
    supplierInvoiceOpenCount,
    supplierPaymentMissingLedgerCount,
    fiscalQueuedCount,
    fiscalRejectedCount,
    offlinePendingEventCount,
    offlineOpenConflictCount,
    offlineCloseBlockerCount,
    ledgerAuditEventCount,
    controlAuditEventCount,
    latestSourceLinks,
    latestLedgerAuditEvents,
    latestControlAuditEvents,
  ] = await Promise.all([
    client.organizationAccountingSettings.findUnique({
      where: { organizationId: scope.organizationId },
      select: {
        accountingEnabled: true,
        setupStatus: true,
        baseCurrency: true,
      },
    }),
    resolveScopePeriod(client, scope, now),
    client.journalEntryLine.aggregate({
      where: {
        organizationId: scope.organizationId,
        journalEntry: entryWhere,
      },
      _sum: { debit: true, credit: true },
      _count: { _all: true },
    }),
    client.journalEntry.count({ where: entryWhere }),
    client.journalEntry.count({
      where: { ...entryWhere, sourceLinks: { none: {} } },
    }),
    client.journalEntry.count({
      where: { ...entryWhere, postingBatchId: null },
    }),
    client.accountingSourceLink.count({
      where: {
        organizationId: scope.organizationId,
        journalEntry: entryWhere,
      },
    }),
    client.ledgerPostingBatch.count({
      where: { ...batchWhere, status: LedgerPostingBatchStatus.FAILED },
    }),
    client.ledgerPostingBatch.count({
      where: {
        ...batchWhere,
        status: LedgerPostingBatchStatus.POSTED,
        journalEntries: { none: {} },
      },
    }),
    client.businessEvent.count({
      where: {
        ...eventWhere,
        status: {
          in: [BusinessEventStatus.FAILED, BusinessEventStatus.REJECTED],
        },
      },
    }),
    client.paymentException.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: openPaymentExceptionStatuses() },
        ...createdAtFilter(scope),
      },
    }),
    client.paymentException.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: openPaymentExceptionStatuses() },
        severity: { in: ["HIGH", "CRITICAL"] },
        ...createdAtFilter(scope),
      },
    }),
    client.providerAccount.count({
      where: {
        organizationId: scope.organizationId,
        status: ProviderAccountStatus.ACTIVE,
      },
    }),
    client.providerAccount.findMany({
      where: {
        organizationId: scope.organizationId,
        status: ProviderAccountStatus.ACTIVE,
      },
      select: {
        id: true,
        displayName: true,
        providerCode: true,
        settlementLagDays: true,
        metadata: true,
        statementFiles: {
          where: {
            status: {
              in: [StatementFileStatus.IMPORTED, StatementFileStatus.PROCESSED],
            },
          },
          orderBy: { periodEnd: "desc" },
          take: 1,
          select: {
            id: true,
            periodEnd: true,
          },
        },
      },
    }),
    client.statementFile.count({ where: statementFileWhere }),
    client.statementLine.count({ where: statementLineWhere }),
    client.reconciliationRun.count({ where: signedReconciliationRunWhere }),
    client.payrollDeclaration.count({
      where: {
        organizationId: scope.organizationId,
        status: PayrollDeclarationStatus.PREPARED,
        ...createdAtFilter(scope),
      },
    }),
    client.payrollDeclaration.count({
      where: {
        organizationId: scope.organizationId,
        status: PayrollDeclarationStatus.REJECTED,
        ...createdAtFilter(scope),
      },
    }),
    client.payrollDeclaration.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollDeclarationStatus.SUBMITTED,
            PayrollDeclarationStatus.ACCEPTED,
            PayrollDeclarationStatus.PAYMENT_DUE,
            PayrollDeclarationStatus.PAID,
          ],
        },
        ...createdAtFilter(scope),
      },
    }),
    client.payrollDeclaration.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollDeclarationStatus.SUBMITTED,
            PayrollDeclarationStatus.ACCEPTED,
            PayrollDeclarationStatus.REJECTED,
            PayrollDeclarationStatus.PAYMENT_DUE,
            PayrollDeclarationStatus.PAID,
            PayrollDeclarationStatus.RECONCILED,
            PayrollDeclarationStatus.ARCHIVED,
          ],
        },
        evidenceItems: { none: {} },
        ...createdAtFilter(scope),
      },
    }),
    client.payrollDeclarationEvidence.count({
      where: {
        organizationId: scope.organizationId,
        transition: PayrollDeclarationEvidenceTransition.AMEND,
        ...createdAtFilter(scope),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [PayrollPaymentBatchStatus.RELEASED, PayrollPaymentBatchStatus.PARTIALLY_SETTLED],
        },
        ...createdAtFilter(scope),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [PayrollPaymentBatchStatus.RELEASED, PayrollPaymentBatchStatus.PARTIALLY_SETTLED, PayrollPaymentBatchStatus.SETTLED],
        },
        OR: [{ evidenceHash: null }, { paymentTransactionId: null }, { reconciliationStatus: null }],
        ...createdAtFilter(scope),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [PayrollPaymentBatchStatus.RELEASED, PayrollPaymentBatchStatus.PARTIALLY_SETTLED, PayrollPaymentBatchStatus.SETTLED],
        },
        allocations: { none: {} },
        ...createdAtFilter(scope),
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
        ledgerPostingBatchId: null,
        deletedAt: null,
        ...createdAtFilter(scope),
      },
    }),
    client.payrollRunLine.count({
      where: {
        organizationId: scope.organizationId,
        payrollRun: {
          status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
          deletedAt: null,
          ...createdAtFilter(scope),
        },
        payslip: { is: null },
      },
    }),
    client.payrollPayslip.count({
      where: {
        organizationId: scope.organizationId,
        status: PayrollPayslipStatus.EMITTED,
        documentHash: "",
        ...createdAtFilter(scope),
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: scope.organizationId,
        status: PayrollRunStatus.PAID,
        paymentBatches: { none: { status: PayrollPaymentBatchStatus.SETTLED } },
        deletedAt: null,
        ...createdAtFilter(scope),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [PayrollPaymentBatchStatus.RELEASED, PayrollPaymentBatchStatus.PARTIALLY_SETTLED],
        },
        ledgerPostingBatchId: null,
        ...createdAtFilter(scope),
      },
    }),
    client.ledgerPostingBatch.count({
      where: {
        ...batchWhere,
        status: LedgerPostingBatchStatus.POSTED,
        sourceType: {
          in: [AccountingSourceType.PAYROLL_RUN, AccountingSourceType.PAYROLL_PAYMENT],
        },
        sourceLinks: { none: {} },
      },
    }),
    client.supplierInvoice.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [SupplierInvoiceStatus.POSTED, SupplierInvoiceStatus.PAYMENT_PENDING, SupplierInvoiceStatus.DISPUTED],
        },
        ...createdAtFilter(scope),
      },
    }),
    client.supplierPayment.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [SupplierPaymentStatus.APPROVED, SupplierPaymentStatus.RELEASED, SupplierPaymentStatus.POSTED],
        },
        ledgerPostingBatchId: null,
        ...createdAtFilter(scope),
      },
    }),
    client.fiscalDocument.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [FiscalDocumentStatus.QUEUED, FiscalDocumentStatus.SUBMITTED],
        },
        ...createdAtFilter(scope),
      },
    }),
    client.fiscalDocument.count({
      where: {
        organizationId: scope.organizationId,
        status: FiscalDocumentStatus.REJECTED,
        ...createdAtFilter(scope),
      },
    }),
    client.pOSOfflineEvent.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: ["PENDING_REPLAY", "RECORDED", "BLOCKED"] },
        ...createdAtFilter(scope),
      },
    }),
    client.pOSOfflineSyncConflict.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
        ...createdAtFilter(scope),
      },
    }),
    client.pOSOfflineSyncCertificate.count({
      where: {
        organizationId: scope.organizationId,
        closeBlocker: true,
        ...createdAtFilter(scope),
      },
    }),
    client.ledgerAuditEvent.count({
      where: {
        organizationId: scope.organizationId,
        ...createdAtFilter(scope),
      },
    }),
    client.auditLog.count({
      where: {
        organizationId: scope.organizationId,
        ...createdAtFilter(scope),
      },
    }),
    client.accountingSourceLink.findMany({
      where: {
        organizationId: scope.organizationId,
        journalEntry: entryWhere,
      },
      orderBy: { createdAt: "desc" },
      take: scope.limit,
      include: {
        postingBatch: { select: { id: true, status: true } },
        journalEntry: { select: { entryNumber: true } },
      },
    }),
    client.ledgerAuditEvent.findMany({
      where: {
        organizationId: scope.organizationId,
        ...createdAtFilter(scope),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(scope.limit, 20),
      select: {
        id: true,
        action: true,
        actorId: true,
        resourceType: true,
        resourceId: true,
        createdAt: true,
      },
    }),
    client.auditLog.findMany({
      where: {
        organizationId: scope.organizationId,
        ...createdAtFilter(scope),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(scope.limit, 20),
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        createdAt: true,
        changes: true,
      },
    }),
  ])

  const blockers: DataTrustBlocker[] = []
  const currency = settings?.baseCurrency || "XAF"
  const periodStatus: PeriodStatus = period?.status ?? "UNAVAILABLE"
  const debitTotal = decimal(ledgerAggregate._sum.debit)
  const creditTotal = decimal(ledgerAggregate._sum.credit)
  const ledgerBalanced = debitTotal.eq(creditTotal)
  const linkedPostedEntryCount = Math.max(postedEntryCount - orphanPostedEntryCount, 0)
  const sourceLinkCoveragePct = postedEntryCount === 0 ? null : Number(((linkedPostedEntryCount / postedEntryCount) * 100).toFixed(2))
  const providerStatementEvidenceMissing =
    activeProviderAccountCount > 0 && (providerStatementFileCount === 0 || providerStatementLineCount === 0)
  const staleStatementAccounts = providerStatementEvidenceMissing
    ? []
    : staleProviderStatementAccounts(activeProviderStatementFreshnessRows, statementFreshnessAnchor(scope, period, now))
  const providerStatementCadenceStale = activeProviderAccountCount > 0 && staleStatementAccounts.length > 0
  const providerReconciliationSignoffMissing =
    activeProviderAccountCount > 0 &&
    !providerStatementEvidenceMissing &&
    !providerStatementCadenceStale &&
    signedReconciliationRunCount === 0

  if (!settings?.accountingEnabled) {
    addBlocker(blockers, {
      id: "accounting-setup-not-locked",
      severity: "high",
      gate: "accounting.setup.ready",
      title: "Accounting setup is not locked",
      detail: "Accountant trust packs require the accounting setup to be marked ready before certification.",
      sourceTables: ["organization_accounting_settings"],
    })
  }

  if (!period) {
    addBlocker(blockers, {
      id: "period-unavailable",
      severity: "high",
      gate: "accounting.period.scope",
      title: "No accounting period resolved",
      detail: "The portal could not resolve an accounting period for the selected scope.",
      sourceTables: ["accounting_periods"],
    })
  }

  if (period?.status === AccountingPeriodStatus.LOCKED) {
    addBlocker(blockers, {
      id: "period-locked",
      severity: "medium",
      gate: "accounting.period.scope",
      title: "Period is locked",
      detail: "Figures are readable but changes and recertification require a new approved close workflow.",
      sourceTables: ["accounting_periods"],
    })
  }

  if (!ledgerBalanced) {
    addBlocker(blockers, {
      id: "ledger-unbalanced",
      severity: "critical",
      gate: "ledger.balance",
      title: "Posted ledger activity is not balanced",
      detail: "Debit and credit totals from posted/reversed journal lines diverge for this scope.",
      sourceTables: ["journal_entry_lines"],
    })
  }

  if (orphanPostedEntryCount > 0) {
    addBlocker(blockers, {
      id: "posted-journals-without-source-link",
      severity: "critical",
      gate: "ledger.source-link",
      title: "Posted journals lack source links",
      detail: `${orphanPostedEntryCount} posted journal entry or reversal has no accounting source link.`,
      sourceTables: ["journal_entries", "accounting_source_links"],
    })
  }

  if (postedWithoutBatchCount > 0) {
    addBlocker(blockers, {
      id: "posted-journals-without-posting-batch",
      severity: "critical",
      gate: "ledger.posting-batch",
      title: "Posted journals lack posting batches",
      detail: `${postedWithoutBatchCount} posted journal entry or reversal is not tied to a posting batch.`,
      sourceTables: ["journal_entries", "ledger_posting_batches"],
    })
  }

  if (postedBatchWithoutJournalCount > 0) {
    addBlocker(blockers, {
      id: "posted-batches-without-journals",
      severity: "critical",
      gate: "ledger.batch-journal-link",
      title: "Posted posting batches lack journals",
      detail: `${postedBatchWithoutJournalCount} posted posting batch has no journal entry.`,
      sourceTables: ["ledger_posting_batches", "journal_entries"],
    })
  }

  if (failedBatchCount > 0) {
    addBlocker(blockers, {
      id: "failed-posting-batches",
      severity: "high",
      gate: "ledger.failed-posting",
      title: "Failed posting batches remain open",
      detail: `${failedBatchCount} posting batch failed and must be corrected before certification.`,
      sourceTables: ["ledger_posting_batches"],
    })
  }

  if (failedBusinessEventCount > 0) {
    addBlocker(blockers, {
      id: "failed-business-events",
      severity: "high",
      gate: "event-gateway.failed-events",
      title: "Business events failed or were rejected",
      detail: `${failedBusinessEventCount} business event is failed or rejected in the selected scope.`,
      sourceTables: ["business_events"],
    })
  }

  if (criticalPaymentExceptionCount > 0) {
    addBlocker(blockers, {
      id: "critical-payment-exceptions",
      severity: "critical",
      gate: "payments.reconciliation.exceptions",
      title: "Critical payment exceptions are open",
      detail: `${criticalPaymentExceptionCount} high or critical payment reconciliation exception remains open.`,
      sourceTables: ["payment_exceptions"],
    })
  } else if (openPaymentExceptionCount > 0) {
    addBlocker(blockers, {
      id: "open-payment-exceptions",
      severity: "high",
      gate: "payments.reconciliation.exceptions",
      title: "Payment reconciliation exceptions are open",
      detail: `${openPaymentExceptionCount} payment reconciliation exception remains open.`,
      sourceTables: ["payment_exceptions"],
    })
  }

  if (providerStatementEvidenceMissing) {
    addBlocker(blockers, {
      id: "provider-statement-evidence-missing",
      severity: "high",
      gate: "payments.provider-statement-evidence",
      title: "Provider statement evidence is missing",
      detail: `${activeProviderAccountCount} active provider account is configured, but processed/imported statement file and line evidence is missing for the selected scope.`,
      sourceTables: ["provider_accounts", "statement_files", "statement_lines"],
    })
  } else if (providerStatementCadenceStale) {
    addBlocker(blockers, {
      id: "provider-statement-cadence-stale",
      severity: "high",
      gate: "payments.provider-statement-cadence",
      title: "Provider statement cadence is stale",
      detail: `${staleStatementAccounts.length} active provider account has statement evidence, but its latest statement is older than the configured cadence for the selected scope.`,
      sourceTables: ["provider_accounts", "statement_files", "statement_lines"],
    })
  } else if (providerReconciliationSignoffMissing) {
    addBlocker(blockers, {
      id: "provider-reconciliation-signoff-missing",
      severity: "high",
      gate: "payments.reconciliation.signoff",
      title: "Provider reconciliation signoff is missing",
      detail: `${activeProviderAccountCount} active provider account has statement evidence, but no signed reconciliation run is available for the selected scope.`,
      sourceTables: ["provider_accounts", "statement_files", "statement_lines", "reconciliation_runs"],
    })
  }

  if (supplierPaymentMissingLedgerCount > 0) {
    addBlocker(blockers, {
      id: "supplier-payments-without-ledger",
      severity: "critical",
      gate: "purchasing.payment.ledger",
      title: "Supplier payments lack ledger posting",
      detail: `${supplierPaymentMissingLedgerCount} approved, released, or posted supplier payment is missing a ledger posting batch.`,
      sourceTables: ["supplier_payments", "ledger_posting_batches"],
    })
  }

  if (supplierInvoiceOpenCount > 0) {
    addBlocker(blockers, {
      id: "supplier-invoices-open",
      severity: "medium",
      gate: "purchasing.ap.open-items",
      title: "Supplier invoice open items need review",
      detail: `${supplierInvoiceOpenCount} posted/payment-pending/disputed supplier invoice remains open.`,
      sourceTables: ["supplier_invoices"],
    })
  }

  if (payrollDeclarationRejectedCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declarations-rejected",
      severity: "high",
      gate: "payroll.declarations",
      title: "Payroll declarations were rejected",
      detail: `${payrollDeclarationRejectedCount} payroll declaration requires correction evidence.`,
      sourceTables: ["payroll_declarations"],
    })
  } else if (payrollDeclarationPreparedCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declarations-prepared",
      severity: "medium",
      gate: "payroll.declarations",
      title: "Payroll declarations await authority evidence",
      detail: `${payrollDeclarationPreparedCount} payroll declaration is prepared but not yet accepted, paid, or reconciled.`,
      sourceTables: ["payroll_declarations"],
    })
  }

  if (payrollDeclarationLifecycleEvidenceMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declaration-lifecycle-evidence-missing",
      severity: "high",
      gate: "payroll.declarations.evidence",
      title: "Payroll declaration lifecycle evidence is incomplete",
      detail: `${payrollDeclarationLifecycleEvidenceMissingCount} advanced payroll declaration lacks append-only authority evidence.`,
      sourceTables: ["payroll_declarations", "payroll_declaration_evidence"],
    })
  }

  if (payrollDeclarationInProgressCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declarations-in-progress",
      severity: "medium",
      gate: "payroll.declarations.lifecycle",
      title: "Payroll declarations are still in lifecycle processing",
      detail: `${payrollDeclarationInProgressCount} payroll declaration is submitted, accepted, payment-due, or paid but not yet reconciled or archived.`,
      sourceTables: ["payroll_declarations", "payroll_declaration_evidence"],
    })
  }

  if (payrollPaymentUnsettledCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payments-unsettled",
      severity: "high",
      gate: "payroll.payment.reconciliation",
      title: "Payroll payments are not settled",
      detail: `${payrollPaymentUnsettledCount} released or partially settled payroll payment batch still needs reconciliation evidence.`,
      sourceTables: ["payroll_payment_batches"],
    })
  }

  if (payrollPaymentReconciliationEvidenceMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payments-without-reconciliation-evidence",
      severity: "high",
      gate: "payroll.payment.reconciliation.evidence",
      title: "Payroll payments lack reconciliation evidence",
      detail: `${payrollPaymentReconciliationEvidenceMissingCount} released, partially settled, or settled payroll payment batch is missing batch evidence, a linked payment transaction, or reconciliation status.`,
      sourceTables: ["payroll_payment_batches", "payment_transactions"],
    })
  }

  if (payrollPaymentAllocationMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payment-allocations-missing",
      severity: "high",
      gate: "payroll.register.payment-allocations",
      title: "Payroll payment allocations are missing",
      detail: `${payrollPaymentAllocationMissingCount} released, partially settled, or settled payroll payment batch has no payslip allocations for register tie-out.`,
      sourceTables: ["payroll_payment_batches", "payroll_payment_allocations", "payroll_payslips"],
    })
  }

  if (payrollPostedRunMissingLedgerCount > 0) {
    addBlocker(blockers, {
      id: "payroll-runs-without-ledger",
      severity: "critical",
      gate: "payroll.accounting.posting",
      title: "Posted payroll runs lack ledger posting",
      detail: `${payrollPostedRunMissingLedgerCount} posted or paid payroll run is missing a ledger posting batch.`,
      sourceTables: ["payroll_runs", "ledger_posting_batches"],
    })
  }

  if (payrollPostedRunLineMissingPayslipCount > 0) {
    addBlocker(blockers, {
      id: "payroll-run-lines-without-payslips",
      severity: "critical",
      gate: "payroll.register.payslip-tieout",
      title: "Payroll run lines lack emitted payslips",
      detail: `${payrollPostedRunLineMissingPayslipCount} posted or paid payroll run line has no emitted payslip evidence for register tie-out.`,
      sourceTables: ["payroll_runs", "payroll_run_lines", "payroll_payslips"],
    })
  }

  if (payrollEmittedPayslipMissingProofCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payslips-without-proof-hash",
      severity: "high",
      gate: "payroll.payslip.proof",
      title: "Emitted payroll payslips lack proof hashes",
      detail: `${payrollEmittedPayslipMissingProofCount} emitted payroll payslip has an empty document hash and cannot support certified close evidence.`,
      sourceTables: ["payroll_payslips"],
    })
  }

  if (payrollPaidRunMissingSettledPaymentCount > 0) {
    addBlocker(blockers, {
      id: "payroll-paid-runs-without-settled-payments",
      severity: "high",
      gate: "payroll.register.payment-tieout",
      title: "Paid payroll runs lack settled payment evidence",
      detail: `${payrollPaidRunMissingSettledPaymentCount} paid payroll run has no settled payment batch for register tie-out.`,
      sourceTables: ["payroll_runs", "payroll_payment_batches", "payroll_payment_allocations"],
    })
  }

  if (payrollPaymentMissingLedgerCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payments-without-ledger",
      severity: "critical",
      gate: "payroll.payment.posting",
      title: "Released payroll payments lack ledger posting",
      detail: `${payrollPaymentMissingLedgerCount} released or partially settled payroll payment batch is missing a ledger posting batch.`,
      sourceTables: ["payroll_payment_batches", "ledger_posting_batches"],
    })
  }

  if (payrollPostedLedgerMissingSourceLinkCount > 0) {
    addBlocker(blockers, {
      id: "payroll-ledger-source-link-missing",
      severity: "critical",
      gate: "payroll.accounting.source-link",
      title: "Payroll ledger postings lack source links",
      detail: `${payrollPostedLedgerMissingSourceLinkCount} posted payroll ledger batch is missing accounting source-link evidence.`,
      sourceTables: ["ledger_posting_batches", "accounting_source_links"],
    })
  }

  if (fiscalRejectedCount > 0) {
    addBlocker(blockers, {
      id: "fiscal-documents-rejected",
      severity: "high",
      gate: "compliance.fiscal-documents",
      title: "Fiscal documents were rejected",
      detail: `${fiscalRejectedCount} fiscal document rejection needs correction or authority follow-up evidence.`,
      sourceTables: ["fiscal_documents"],
    })
  } else if (fiscalQueuedCount > 0) {
    addBlocker(blockers, {
      id: "fiscal-documents-pending",
      severity: "medium",
      gate: "compliance.fiscal-documents",
      title: "Fiscal documents await certification evidence",
      detail: `${fiscalQueuedCount} fiscal document is queued or submitted but not certified yet.`,
      sourceTables: ["fiscal_documents"],
    })
  }

  if (offlineOpenConflictCount > 0) {
    addBlocker(blockers, {
      id: "offline-pos-sync-conflicts",
      severity: "high",
      gate: "pos.offline-sync.conflicts",
      title: "Offline POS sync conflicts remain open",
      detail: `${offlineOpenConflictCount} offline POS conflict requires manager review before certification or close.`,
      sourceTables: ["pos_offline_sync_conflicts", "pos_offline_events"],
    })
  }

  if (offlineCloseBlockerCount > 0) {
    addBlocker(blockers, {
      id: "offline-pos-close-blockers",
      severity: "high",
      gate: "pos.offline-sync.certification",
      title: "Offline POS certification blockers are open",
      detail: `${offlineCloseBlockerCount} offline POS sync certificate is blocking close readiness.`,
      sourceTables: ["pos_offline_sync_certificates"],
    })
  }

  if (offlinePendingEventCount > 0) {
    addBlocker(blockers, {
      id: "offline-pos-events-pending-replay",
      severity: "medium",
      gate: "pos.offline-sync.replay",
      title: "Offline POS events await server replay",
      detail: `${offlinePendingEventCount} accepted offline POS event is still provisional and pending replay/certification.`,
      sourceTables: ["pos_offline_events", "business_events"],
    })
  }

  if (postedEntryCount === 0) {
    addBlocker(blockers, {
      id: "ledger-empty",
      severity: "medium",
      gate: "ledger.activity",
      title: "No posted ledger activity in scope",
      detail: "The portal can open, but certified accountant export requires posted ledger evidence.",
      sourceTables: ["journal_entries", "journal_entry_lines"],
    })
  }

  const criticalBlockers = blockers.filter((blocker) => blocker.severity === "critical").length
  const highBlockers = blockers.filter((blocker) => blocker.severity === "high").length
  const mediumBlockers = blockers.filter((blocker) => blocker.severity === "medium").length
  const trustLevel = levelFromBlockers(blockers, sourceLinkCoveragePct, ledgerBalanced)
  const verdict = verdictFor(trustLevel)
  const canExportCertifiedPack = trustLevel === "T4" && verdict === "CERTIFIED"
  const disabledReason = canExportCertifiedPack
    ? null
    : "Certified accountant trust-pack export requires T4: balanced ledger, source-link coverage, no failed events, no open high-risk exceptions, and no unresolved statutory blockers."

  const moduleEvidence: AccountantPortalData["moduleEvidence"] = [
    {
      module: "ledger",
      status: statusFor(
        !ledgerBalanced || orphanPostedEntryCount > 0 || postedWithoutBatchCount > 0 || postedBatchWithoutJournalCount > 0,
        failedBatchCount > 0 || !settings?.accountingEnabled || !period,
        postedEntryCount === 0 || period?.status === AccountingPeriodStatus.LOCKED,
      ),
      label: "Ledger source of truth",
      detail: "Posted journal entries, journal lines, posting batches, and source links.",
      facts: [
        { label: "Posted entries", value: postedEntryCount },
        { label: "Journal lines", value: ledgerAggregate._count._all },
        {
          label: "Source-link coverage",
          value: sourceLinkCoveragePct === null ? "n/a" : `${sourceLinkCoveragePct}%`,
        },
      ],
    },
    {
      module: "events",
      status: statusFor(false, failedBusinessEventCount > 0, false),
      label: "Business event gateway",
      detail: "Failed/rejected business events block accountant certification.",
      facts: [{ label: "Failed/rejected events", value: failedBusinessEventCount }],
    },
    {
      module: "payments",
      status: statusFor(
        criticalPaymentExceptionCount > 0,
        openPaymentExceptionCount > 0 ||
          providerStatementEvidenceMissing ||
          providerStatementCadenceStale ||
          providerReconciliationSignoffMissing,
        false,
      ),
      label: "Payment reconciliation",
      detail: "Open payment exceptions, provider statement cadence, and signed reconciliation runs gate certification.",
      facts: [
        {
          label: "Active provider accounts",
          value: activeProviderAccountCount,
        },
        { label: "Statement files", value: providerStatementFileCount },
        { label: "Statement lines", value: providerStatementLineCount },
        {
          label: "Stale statement accounts",
          value: staleStatementAccounts.length,
        },
        {
          label: "Signed reconciliation runs",
          value: signedReconciliationRunCount,
        },
        { label: "Open exceptions", value: openPaymentExceptionCount },
        { label: "High/Critical", value: criticalPaymentExceptionCount },
      ],
    },
    {
      module: "purchasing",
      status: statusFor(supplierPaymentMissingLedgerCount > 0, false, supplierInvoiceOpenCount > 0),
      label: "Purchasing and AP",
      detail: "Supplier invoices and payments must reconcile to ledger evidence.",
      facts: [
        { label: "Open AP invoices", value: supplierInvoiceOpenCount },
        {
          label: "Payments without ledger",
          value: supplierPaymentMissingLedgerCount,
        },
      ],
    },
    {
      module: "payroll",
      status: statusFor(
        payrollPostedRunMissingLedgerCount > 0 ||
          payrollPostedRunLineMissingPayslipCount > 0 ||
          payrollPaymentMissingLedgerCount > 0 ||
          payrollPostedLedgerMissingSourceLinkCount > 0,
        payrollDeclarationRejectedCount > 0 ||
          payrollDeclarationLifecycleEvidenceMissingCount > 0 ||
          payrollPaymentUnsettledCount > 0 ||
          payrollPaymentReconciliationEvidenceMissingCount > 0 ||
          payrollPaymentAllocationMissingCount > 0 ||
          payrollEmittedPayslipMissingProofCount > 0 ||
          payrollPaidRunMissingSettledPaymentCount > 0,
        payrollDeclarationPreparedCount > 0 || payrollDeclarationInProgressCount > 0,
      ),
      label: "Payroll and declarations",
      detail:
        "Payroll register tie-out, payslip proof, payment reconciliation, ledger source-link, and declaration lifecycle evidence is consumed from payroll services.",
      facts: [
        {
          label: "Prepared declarations",
          value: payrollDeclarationPreparedCount,
        },
        {
          label: "Rejected declarations",
          value: payrollDeclarationRejectedCount,
        },
        {
          label: "In-progress declarations",
          value: payrollDeclarationInProgressCount,
        },
        {
          label: "Declaration evidence gaps",
          value: payrollDeclarationLifecycleEvidenceMissingCount,
        },
        {
          label: "Declaration amendments",
          value: payrollDeclarationAmendmentEvidenceCount,
        },
        { label: "Unsettled batches", value: payrollPaymentUnsettledCount },
        {
          label: "Payment reconciliation evidence gaps",
          value: payrollPaymentReconciliationEvidenceMissingCount,
        },
        {
          label: "Payment allocation gaps",
          value: payrollPaymentAllocationMissingCount,
        },
        {
          label: "Runs missing ledger",
          value: payrollPostedRunMissingLedgerCount,
        },
        {
          label: "Run lines missing payslips",
          value: payrollPostedRunLineMissingPayslipCount,
        },
        {
          label: "Payslips missing proof hashes",
          value: payrollEmittedPayslipMissingProofCount,
        },
        {
          label: "Paid runs missing settled payments",
          value: payrollPaidRunMissingSettledPaymentCount,
        },
        {
          label: "Payments missing ledger",
          value: payrollPaymentMissingLedgerCount,
        },
        {
          label: "Payroll batches missing source links",
          value: payrollPostedLedgerMissingSourceLinkCount,
        },
      ],
    },
    {
      module: "compliance",
      status: statusFor(false, fiscalRejectedCount > 0, fiscalQueuedCount > 0),
      label: "Compliance documents",
      detail: "Fiscal document certification/rejection evidence is included in trust gates.",
      facts: [
        { label: "Pending fiscal docs", value: fiscalQueuedCount },
        { label: "Rejected fiscal docs", value: fiscalRejectedCount },
      ],
    },
    {
      module: "offline_pos",
      status: statusFor(offlineOpenConflictCount > 0, offlineCloseBlockerCount > 0, offlinePendingEventCount > 0),
      label: "Offline POS sync",
      detail: "Device sync evidence, conflicts, provisional receipts, and close blockers from the 014 offline POS kernel.",
      facts: [
        { label: "Pending replay", value: offlinePendingEventCount },
        { label: "Open conflicts", value: offlineOpenConflictCount },
        { label: "Close blockers", value: offlineCloseBlockerCount },
      ],
    },
    {
      module: "audit",
      status: statusFor(false, false, ledgerAuditEventCount + controlAuditEventCount === 0),
      label: "Audit and controls",
      detail: "Ledger audit events and sensitive-action control decisions are exposed to accountants.",
      facts: [
        { label: "Ledger audit events", value: ledgerAuditEventCount },
        { label: "Control audit events", value: controlAuditEventCount },
      ],
    },
  ]

  const requiredForNextLevel =
    trustLevel === "T4"
      ? []
      : blockers
          .filter((blocker) => blocker.severity === "critical" || blocker.severity === "high")
          .map((blocker) => `${blocker.gate}: ${blocker.title}`)

  return {
    source: {
      mode: "LEDGER_BACKED_DATA_TRUST",
      asOf: scope.asOf,
      organizationScoped: true,
      trustLevel,
      certificationStatus: verdict,
      scopeHash,
      sourceTables: [...DATA_TRUST_SOURCE_TABLES],
    },
    scope: {
      organizationId: scope.organizationId,
      periodId: period?.id ?? scope.periodId,
      periodName: period?.name ?? null,
      periodStatus,
      startDate: (scope.startDate ?? period?.startDate)?.toISOString() ?? null,
      endDate: (scope.endDate ?? period?.endDate)?.toISOString() ?? null,
    },
    certificate: {
      surface: "dashboard/accounting/accountant-portal",
      level: trustLevel,
      verdict,
      generatedAt: scope.asOf,
      evidence: [
        "tenant-scoped protected action",
        "posted journal line aggregate",
        "accounting source-link coverage",
        "business-event failure scan",
        "provider statement and reconciliation sign-off evidence scan",
        "payment/AP/payroll/compliance blocker scan",
        "payroll register tie-out, payslip proof, payment settlement, and declaration lifecycle evidence scan",
        "audit/control-event visibility",
      ],
      requiredForNextLevel,
    },
    summary: {
      postedJournalEntries: postedEntryCount,
      journalLines: ledgerAggregate._count._all,
      sourceLinks: sourceLinkCount,
      linkedPostedEntries: linkedPostedEntryCount,
      sourceLinkCoveragePct,
      ledgerBalanced,
      blockerCount: blockers.length,
      criticalBlockers,
      highBlockers,
    },
    figures: {
      activityDebit: figure(debitTotal, {
        currency,
        asOf: scope.asOf,
        periodStatus,
        sourceQueryId,
        criticalBlockers,
      }),
      activityCredit: figure(creditTotal, {
        currency,
        asOf: scope.asOf,
        periodStatus,
        sourceQueryId,
        criticalBlockers,
      }),
    },
    moduleEvidence,
    blockers,
    latestSourceLinks: latestSourceLinks.map((link) => ({
      id: link.id,
      sourceType: link.sourceType,
      sourceId: link.sourceId,
      sourceNumber: link.sourceNumber,
      journalEntryNumber: link.journalEntry?.entryNumber ?? null,
      postingBatchId: link.postingBatchId,
      postingStatus: link.postingBatch.status,
      createdAt: link.createdAt.toISOString(),
    })),
    latestAuditEvents: [
      ...latestLedgerAuditEvents.map((event) => ({
        id: event.id,
        source: "ledger" as const,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        actorId: event.actorId,
        createdAt: event.createdAt.toISOString(),
        status: "recorded",
      })),
      ...latestControlAuditEvents.map((event) => {
        const changes =
          event.changes && typeof event.changes === "object" && !Array.isArray(event.changes)
            ? (event.changes as Record<string, unknown>)
            : {}

        return {
          id: event.id,
          source: "control" as const,
          action: event.action,
          resourceType: event.entityType,
          resourceId: event.entityId,
          actorId: event.userId,
          createdAt: event.createdAt.toISOString(),
          status: changes.allowed === false ? "denied" : changes.allowed === true ? "allowed" : "recorded",
        }
      }),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Math.min(scope.limit, 20)),
    exportReadiness: {
      canExportCertifiedPack,
      disabledReason,
      requiredPermission: "accounting.exports.create",
      sensitivity: "statutory",
    },
  }
}

export async function exportAccountantTrustPack(input: ExportAccountantTrustPackServiceInput): Promise<AccountantTrustPackExport> {
  const now = input.now ? new Date(input.now) : new Date()
  const exportId = randomUUID()
  const fileType = input.fileType ?? "json"

  if (fileType !== "json") {
    throw new BusinessRuleError("Only JSON accountant trust-pack exports are enabled.")
  }

  return db.$transaction(async (tx) => {
    const portal = await getAccountantPortalData(input, tx, now)
    const rowCount = portal.summary.journalLines + portal.summary.sourceLinks + portal.latestAuditEvents.length
    const watermarkId = `acct-trust-${portal.scope.organizationId}-${exportId}`

    const decision = await evaluateAndAuditSensitiveAction(tx, {
      action: "accounting.export",
      actorId: input.exportedById,
      organizationId: input.organizationId,
      actorPermissions: input.actorPermissions,
      lastAuthAt: input.lastAuthAt,
      now,
      resourceType: "AccountantTrustPack",
      resourceId: exportId,
      exportContext: {
        scope: "accountant-trust-pack",
        filtersHash: portal.source.scopeHash,
        rowCount,
        fileType,
        sensitivity: "statutory",
        watermarkId,
      },
      metadata: {
        trustLevel: portal.certificate.level,
        verdict: portal.certificate.verdict,
        periodId: portal.scope.periodId,
      },
    })
    assertSensitiveActionAllowed(decision)

    if (!portal.exportReadiness.canExportCertifiedPack) {
      throw new BusinessRuleError(portal.exportReadiness.disabledReason ?? "Accountant trust pack is not certified for export.")
    }

    const ledgerRows = input.includeLedgerRows ? await loadOptionalLedgerRows(tx, normalizedScope(input, now)) : []
    const payload = {
      kind: "AQSTOQFLOW_ACCOUNTANT_TRUST_PACK",
      version: 1,
      export: {
        exportId,
        generatedAt: now.toISOString(),
        generatedById: input.exportedById,
        watermarkId,
        fileType,
        redaction: "Secrets, raw provider payloads, and tenant internals excluded.",
      },
      certificate: portal.certificate,
      source: portal.source,
      scope: portal.scope,
      summary: portal.summary,
      figures: portal.figures,
      blockers: portal.blockers,
      moduleEvidence: portal.moduleEvidence,
      latestSourceLinks: portal.latestSourceLinks,
      latestAuditEvents: portal.latestAuditEvents,
      ledgerRows,
    }
    const contentHash = sha256(stableStringify(payload))
    const content = JSON.stringify({ ...payload, export: { ...payload.export, contentHash } }, null, 2)
    const fileName = `${watermarkId}.json`

    await tx.ledgerAuditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.exportedById,
        action: "ACCOUNTANT_TRUST_PACK_EXPORT",
        resourceType: "AccountantTrustPack",
        resourceId: exportId,
        message: `Accountant trust pack ${watermarkId} exported`,
        metadata: {
          contentHash,
          watermarkId,
          rowCount,
          trustLevel: portal.certificate.level,
          verdict: portal.certificate.verdict,
          scopeHash: portal.source.scopeHash,
        },
      },
    })

    return {
      exportId,
      fileName,
      mimeType: "application/json",
      content,
      contentHash,
      watermarkId,
      rowCount,
      trustLevel: portal.certificate.level,
      verdict: portal.certificate.verdict,
      generatedAt: now.toISOString(),
    }
  })
}
