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
  SupplierPaymentStatus,
} from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";

import { db } from "@/prisma/db";
import { readBankBalanceClose } from "@/services/reconciliation/bank-balance-close.service";
import { readBalanceSheetClose } from "./balance-sheet-close.service";
import { readClosePayableBalances, closePayableReasonLabel, type ClosePayableBalances } from "./close-payable-balances.service";
import { readAccountCloseCoverage } from "@/services/reconciliation/account-close-coverage.service";
import { createCloseControlScope, closeEconomicDates, closeRecordedDates, type CloseControlScope } from "./close-control-scope";
import { closePayrollRunWhere, closeDeclarationWhere } from "./close-data-trust-scope";
import { closeStatementFileWhere, closeStatementLineWhere, closeRunWhere, closeExceptionWhere } from "@/services/reconciliation/payment-close-scope";
import { recordBusinessEventInTx } from "@/services/events/business-event.service";
import { summarizePayrollTransitionEvidence } from "@/services/payroll/payroll-transition-evidence";
import { BusinessRuleError } from "@/services/_shared/action-errors";
import { readSupplierPaymentReconciliationProofsInTx, type SupplierPaymentReconciliationProof } from "@/services/purchasing/payment-reconciliation-proof-summary";
import {
  assertSensitiveActionAllowed,
  evaluateAndAuditSensitiveAction,
} from "@/services/controls/sensitive-action.service";

type DbClient = typeof db | Prisma.TransactionClient;
type TrustLevel = "T0" | "T1" | "T2" | "T3" | "T4";
type TrustVerdict = "CERTIFIED" | "PARTIAL" | "NON_COMPLIANT";
type BlockerSeverity = "critical" | "high" | "medium" | "low";
type ModuleStatus = "ready" | "needs_review" | "blocked";
type PeriodStatus = AccountingPeriodStatus | "UNAVAILABLE";

export type AccountantFinancialFigure =
  | {
      available: true;
      amount: string;
      currency: string;
      provenance: "POSTED";
      asOf: string;
      periodStatus: PeriodStatus;
      sourceTables: string[];
      sourceQueryId: string;
    }
  | {
      available: false;
      amount: null;
      currency: string;
      provenance: "UNAVAILABLE";
      reason: string;
      asOf: string;
      periodStatus: PeriodStatus;
      sourceTables: string[];
      sourceQueryId: string;
    };

export type DataTrustBlocker = {
  scope?: "PERIOD" | "ORGANIZATION" | "PERIOD_AND_UNASSIGNED";
  id: string;
  severity: BlockerSeverity;
  gate: string;
  title: string;
  detail: string;
  sourceTables: string[];
};

type PayrollAuditProofGateStatus = "PASS" | "REVIEW" | "BLOCKED";

export type PayrollAuditProofPack = {
  kind: "AQSTOQFLOW_PAYROLL_AUDITOR_PROOF_PACK_READ_MODEL";
  version: 1;
  generatedAt: string;
  scopeHash: string;
  organizationScoped: true;
  redaction: {
    mode: "HASHES_AND_AGGREGATES_ONLY";
    excluded: string[];
  };
  certification: {
    trustLevel: TrustLevel;
    verdict: TrustVerdict;
    exportable: boolean;
    blockerCount: number;
    criticalBlockerCount: number;
    highBlockerCount: number;
  };
  sourceTables: string[];
  aggregateEvidence: Record<string, number>;
  proofGates: Array<{
    gate: string;
    status: PayrollAuditProofGateStatus;
    blockerCount: number;
    blockerIds: string[];
    evidence: string[];
  }>;
  blockers: Array<{
    id: string;
    severity: BlockerSeverity;
    gate: string;
    title: string;
  }>;
  latestSourceLinks: Array<{
    sourceLinkHash: string;
    sourceType: string;
    sourceNumber: string | null;
    sourceRefHash: string;
    journalEntryNumber: string | null;
    postingBatchId: string;
    postingStatus: string;
    createdAt: string;
  }>;
};

export type AccountantPortalData = {
  balanceSheetReconciliation?: Awaited<ReturnType<typeof readBalanceSheetClose>>;
  bankBalanceReconciliation?: Awaited<ReturnType<typeof readBankBalanceClose>>;
  payableBalances?: ClosePayableBalances;
  accountReconciliationCoverage?: Awaited<ReturnType<typeof readAccountCloseCoverage>>;
  supplierPaymentReconciliationProofs?: SupplierPaymentReconciliationProof[];
  source: {
    mode: "LEDGER_BACKED_DATA_TRUST";
    asOf: string;
    organizationScoped: true;
    trustLevel: TrustLevel;
    certificationStatus: TrustVerdict;
    scopeHash: string;
    closeScope?: CloseControlScope;
    sourceTables: string[];
  };
  scope: {
    organizationId: string;
    periodId: string | null;
    periodName: string | null;
    periodStatus: PeriodStatus;
    startDate: string | null;
    endDate: string | null;
  };
  certificate: {
    surface: "dashboard/accounting/accountant-portal";
    level: TrustLevel;
    verdict: TrustVerdict;
    generatedAt: string;
    evidence: string[];
    requiredForNextLevel: string[];
  };
  summary: {
    postedJournalEntries: number;
    journalLines: number;
    sourceLinks: number;
    linkedPostedEntries: number;
    sourceLinkCoveragePct: number | null;
    ledgerBalanced: boolean;
    blockerCount: number;
    criticalBlockers: number;
    highBlockers: number;
  };
  figures: {
    activityDebit: AccountantFinancialFigure;
    activityCredit: AccountantFinancialFigure;
  };
  moduleEvidence: Array<{
    module:
      | "ledger"
      | "events"
      | "payments"
      | "purchasing"
      | "payroll"
      | "compliance"
      | "offline_pos"
      | "audit";
    status: ModuleStatus;
    label: string;
    detail: string;
    facts: Array<{ label: string; value: string | number }>;
  }>;
  payrollAuditProofPack: PayrollAuditProofPack;
  blockers: DataTrustBlocker[];
  latestSourceLinks: Array<{
    id: string;
    sourceType: string;
    sourceId: string;
    sourceNumber: string | null;
    journalEntryNumber: string | null;
    postingBatchId: string;
    postingStatus: string;
    createdAt: string;
  }>;
  latestAuditEvents: Array<{
    id: string;
    source: "ledger" | "control";
    action: string;
    resourceType: string;
    resourceId: string | null;
    actorId: string | null;
    createdAt: string;
    status: string;
  }>;
  exportReadiness: {
    canExportCertifiedPack: boolean;
    disabledReason: string | null;
    requiredPermission: "accounting.exports.create";
    sensitivity: "statutory";
  };
};

export type GetAccountantPortalDataInput = {
  organizationId: string;
  periodId?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  limit?: number;
};

export type ExportAccountantTrustPackServiceInput =
  GetAccountantPortalDataInput & {
    exportedById: string;
    actorPermissions: readonly string[];
    lastAuthAt?: Date | number | string | null;
    now?: Date | number | string | null;
    fileType?: "json";
    includeLedgerRows?: boolean;
  };

export type AccountantTrustPackExport = {
  exportId: string;
  fileName: string;
  mimeType: "application/json";
  content: string;
  contentHash: string;
  watermarkId: string;
  rowCount: number;
  trustLevel: TrustLevel;
  verdict: TrustVerdict;
  generatedAt: string;
};

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
  "reconciliation_no_activity_evidence",
  "bank_balance_evidence",
  "balance_sheet_evidence",
  "close_source_changes",
  "payment_exceptions",
  "payment_transactions",
  "supplier_invoices",
  "supplier_ledger_entries",
  "supplier_invoice_match_exceptions",
  "supplier_payment_allocations",
  "supplier_credit_notes",
  "supplier_payments",
  "payroll_runs",
  "payroll_run_transitions",
  "payroll_run_lines",
  "payroll_payslips",
  "payroll_declarations",
  "payroll_declaration_evidence",
  "payroll_payment_batches",
  "payroll_payment_allocations",
  "fiscal_documents",
] as const;

function parseOptionalDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
    )
    .join(",")}}`;
}

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function decimal(value: Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

function money(value: Prisma.Decimal.Value | null | undefined) {
  return decimal(value).toDecimalPlaces(2).toFixed(2);
}

function normalizedScope(input: GetAccountantPortalDataInput, now: Date, closeScope?: CloseControlScope) {
  const startDate = parseOptionalDate(closeScope?.startDate ?? input.startDate);
  const endDate = parseOptionalDate(closeScope?.endDate ?? input.endDate);

  return {
    organizationId: input.organizationId,
    periodId: input.periodId || null,
    startDate,
    endDate,
    limit: Math.min(Math.max(input.limit ?? 12, 1), 50),
    asOf: now.toISOString(),
    closeScope,
  };
}

function entryDateFilter(scope: ReturnType<typeof normalizedScope>) {
  if (!scope.startDate && !scope.endDate) return {};

  return {
    entryDate: {
      ...(scope.startDate ? { gte: scope.startDate } : {}),
      ...(scope.endDate ? { lte: scope.endDate } : {}),
    },
  } satisfies Prisma.JournalEntryWhereInput;
}

function createdAtFilter(scope: ReturnType<typeof normalizedScope>) {
  // Record arrival is independent of the economic period. Model-specific filters
  // below provide economic membership; unassigned controls are explicitly global.
  if (scope.closeScope) return { createdAt: closeRecordedDates(scope.closeScope) };
  if (!scope.startDate && !scope.endDate) return {};

  return {
    createdAt: {
      ...(scope.startDate ? { gte: scope.startDate } : {}),
      ...(scope.endDate ? { lte: scope.endDate } : {}),
    },
  };
}

function journalEntryScope(scope: ReturnType<typeof normalizedScope>) {
  return {
    organizationId: scope.organizationId,
    status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
    ...(scope.periodId ? { periodId: scope.periodId } : {}),
    ...entryDateFilter(scope),
    ...(scope.closeScope ? { createdAt: closeRecordedDates(scope.closeScope), postedAt: closeRecordedDates(scope.closeScope) } : {}),
  } satisfies Prisma.JournalEntryWhereInput;
}

function postingBatchScope(scope: ReturnType<typeof normalizedScope>) {
  return {
    organizationId: scope.organizationId,
    ...(scope.periodId ? { periodId: scope.periodId } : {}),
    ...createdAtFilter(scope),
  } satisfies Prisma.LedgerPostingBatchWhereInput;
}

function businessEventScope(scope: ReturnType<typeof normalizedScope>) {
  return {
    organizationId: scope.organizationId,
    ...createdAtFilter(scope),
    ...(scope.closeScope ? { occurredAt: closeEconomicDates(scope.closeScope), recordedAt: closeRecordedDates(scope.closeScope) } : {}),
  } satisfies Prisma.BusinessEventWhereInput;
}

function statementFileScope(scope: ReturnType<typeof normalizedScope>) {
  if (scope.closeScope) return closeStatementFileWhere(scope.closeScope);
  const periodOverlap: Prisma.StatementFileWhereInput = {};
  if (scope.startDate) periodOverlap.periodEnd = { gte: scope.startDate };
  if (scope.endDate) periodOverlap.periodStart = { lte: scope.endDate };

  return {
    organizationId: scope.organizationId,
    providerAccount: { status: ProviderAccountStatus.ACTIVE },
    status: {
      in: [StatementFileStatus.IMPORTED, StatementFileStatus.PROCESSED],
    },
    ...periodOverlap,
  } satisfies Prisma.StatementFileWhereInput;
}

function statementLineScope(scope: ReturnType<typeof normalizedScope>) {
  if (scope.closeScope) return closeStatementLineWhere(scope.closeScope);
  const occurredAt: Prisma.StatementLineWhereInput = {};
  if (scope.startDate || scope.endDate) {
    occurredAt.occurredAt = {
      ...(scope.startDate ? { gte: scope.startDate } : {}),
      ...(scope.endDate ? { lte: scope.endDate } : {}),
    };
  }

  return {
    organizationId: scope.organizationId,
    providerAccount: { status: ProviderAccountStatus.ACTIVE },
    ...occurredAt,
  } satisfies Prisma.StatementLineWhereInput;
}

function signedReconciliationRunScope(
  scope: ReturnType<typeof normalizedScope>,
) {
  if (scope.closeScope) return { ...closeRunWhere(scope.closeScope), businessDate: closeEconomicDates(scope.closeScope), status: ReconciliationRunStatus.SIGNED, signedAt: closeRecordedDates(scope.closeScope) } satisfies Prisma.ReconciliationRunWhereInput;
  const businessDate: Prisma.ReconciliationRunWhereInput = {};
  if (scope.startDate || scope.endDate) {
    businessDate.businessDate = {
      ...(scope.startDate ? { gte: scope.startDate } : {}),
      ...(scope.endDate ? { lte: scope.endDate } : {}),
    };
  }

  return {
    organizationId: scope.organizationId,
    providerAccount: { status: ProviderAccountStatus.ACTIVE },
    status: ReconciliationRunStatus.SIGNED,
    ...(scope.periodId ? { accountingPeriodId: scope.periodId } : {}),
    ...businessDate,
  } satisfies Prisma.ReconciliationRunWhereInput;
}

type ActiveProviderStatementFreshnessRow = {
  id: string;
  displayName: string;
  providerCode: string;
  settlementLagDays: number;
  metadata: Prisma.JsonValue | null;
  statementFiles: Array<{ id: string; periodEnd: Date }>;
};

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function jsonRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function numericSnapshotValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasNumericSnapshotField(
  snapshot: Record<string, unknown>,
  key: string,
) {
  return numericSnapshotValue(snapshot[key]) !== null;
}

function hasNonZeroSnapshotAmount(
  snapshot: Record<string, unknown>,
  key: string,
) {
  const value = numericSnapshotValue(snapshot[key]);
  return value !== null && Math.abs(value) > 0.000001;
}

function payrollRubriqueComponents(snapshot: Record<string, unknown>) {
  const components = snapshot.payrollRubriqueComponents;
  return Array.isArray(components)
    ? components.filter(
        (component) =>
          component &&
          typeof component === "object" &&
          !Array.isArray(component),
      )
    : [];
}

function hasEffectiveComponentProofGap(
  calculationSnapshot: Prisma.JsonValue | null,
) {
  const snapshot = jsonRecord(calculationSnapshot);
  if (!snapshot) return true;

  const hasRubriqueAmount = [
    "payrollRubriqueGrossAmount",
    "payrollRubriqueTaxableBaseAmount",
    "payrollRubriqueSocialBaseAmount",
    "payrollRubriqueEmployeeDeductionAmount",
    "payrollRubriqueEmployerChargeAmount",
  ].some((key) => hasNonZeroSnapshotAmount(snapshot, key));
  if (hasRubriqueAmount && payrollRubriqueComponents(snapshot).length === 0) {
    return true;
  }

  const overtimeMinutes = numericSnapshotValue(snapshot.overtimeMinutes) ?? 0;
  if (
    overtimeMinutes > 0 &&
    !hasNumericSnapshotField(snapshot, "overtimePremiumAmount")
  ) {
    return true;
  }

  const leaveMinutes = numericSnapshotValue(snapshot.leaveMinutes) ?? 0;
  if (leaveMinutes > 0) {
    return (
      !hasNumericSnapshotField(snapshot, "scheduledMinutes") ||
      !hasNumericSnapshotField(snapshot, "workedMinutes") ||
      !hasNumericSnapshotField(snapshot, "paidMinutes") ||
      !hasNumericSnapshotField(snapshot, "baseSalary")
    );
  }

  return false;
}

function countEffectiveComponentProofGaps(
  lines: Array<{ calculationSnapshot: Prisma.JsonValue | null }>,
) {
  return lines.filter((line) =>
    hasEffectiveComponentProofGap(line.calculationSnapshot),
  ).length;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

type PayrollRunLineDeductionRecoveryLedgerMappingRow = {
  payrollRunId: string;
  calculationSnapshot: Prisma.JsonValue | null;
  payrollRun?: { metadata: Prisma.JsonValue | null } | null;
};

function hasDeductionRecoveryProofEvidence(
  snapshot: Record<string, unknown> | null,
) {
  if (!snapshot) return false;
  if (hasNonZeroSnapshotAmount(snapshot, "deductionRecoveryAmount"))
    return true;
  if (hasText(snapshot.deductionRecoveryProofHash)) return true;
  const proofHashes = snapshot.deductionRecoveryProofHashes;
  return Array.isArray(proofHashes) && proofHashes.some(hasText);
}

function hasMatchedDeductionRecoveryLedgerMapping(
  metadata: Prisma.JsonValue | null | undefined,
) {
  const record = jsonRecord(metadata);
  if (!record) return false;

  return (
    hasText(record.deductionRecoveryLedgerMappingHash) &&
    record.deductionRecoveryLedgerMappingStatus === "MATCHED"
  );
}

function countDeductionRecoveryLedgerMappingGaps(
  lines: PayrollRunLineDeductionRecoveryLedgerMappingRow[],
) {
  const impactedRuns = new Map<string, Prisma.JsonValue | null>();

  for (const line of lines) {
    if (
      !hasDeductionRecoveryProofEvidence(jsonRecord(line.calculationSnapshot))
    ) {
      continue;
    }
    impactedRuns.set(line.payrollRunId, line.payrollRun?.metadata ?? null);
  }

  return Array.from(impactedRuns.values()).filter(
    (metadata) => !hasMatchedDeductionRecoveryLedgerMapping(metadata),
  ).length;
}

function positiveInteger(value: unknown, fallback: number) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
}

function statementCadenceDays(account: ActiveProviderStatementFreshnessRow) {
  const metadata = jsonObject(account.metadata);
  return positiveInteger(
    metadata.statementCadenceDays ??
      metadata.statement_cadence_days ??
      metadata.cadenceDays,
    1,
  );
}

function startOfUtcDay(date: Date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function statementFreshnessAnchor(
  scope: ReturnType<typeof normalizedScope>,
  period: Awaited<ReturnType<typeof resolveScopePeriod>>,
  now: Date,
) {
  const candidate = scope.endDate ?? period?.endDate ?? now;
  return candidate > now ? now : candidate;
}

function staleProviderStatementAccounts(
  accounts: ActiveProviderStatementFreshnessRow[],
  anchor: Date,
) {
  return accounts.filter((account) => {
    const latestStatement = account.statementFiles[0];
    if (!latestStatement) return false;

    const freshnessWindowDays =
      statementCadenceDays(account) + Math.max(account.settlementLagDays, 0);
    const cutoff = addUtcDays(startOfUtcDay(anchor), -freshnessWindowDays);
    return latestStatement.periodEnd < cutoff;
  });
}

function openPaymentExceptionStatuses() {
  return [
    PaymentExceptionStatus.OPEN,
    PaymentExceptionStatus.ASSIGNED,
    PaymentExceptionStatus.ACKNOWLEDGED,
    PaymentExceptionStatus.ESCALATED,
    PaymentExceptionStatus.RESOLUTION_PROPOSED,
    PaymentExceptionStatus.REOPENED,
  ];
}

function addBlocker(
  blockers: DataTrustBlocker[],
  blocker: Omit<DataTrustBlocker, "sourceTables"> & { sourceTables?: string[] },
) {
  blockers.push({
    ...blocker,
    sourceTables: blocker.sourceTables ?? [],
  });
}

function statusFor(
  hasCritical: boolean,
  hasHigh: boolean,
  hasMedium: boolean,
): ModuleStatus {
  if (hasCritical || hasHigh) return "blocked";
  if (hasMedium) return "needs_review";
  return "ready";
}

function levelFromBlockers(
  blockers: DataTrustBlocker[],
  sourceLinkCoveragePct: number | null,
  ledgerBalanced: boolean,
): TrustLevel {
  if (blockers.some((blocker) => blocker.severity === "critical")) return "T0";
  if (!ledgerBalanced) return "T0";
  if (blockers.some((blocker) => blocker.severity === "high")) return "T2";
  if (blockers.some((blocker) => blocker.severity === "medium")) return "T3";
  if (sourceLinkCoveragePct !== null && sourceLinkCoveragePct < 100)
    return "T3";
  return "T4";
}

function verdictFor(level: TrustLevel): TrustVerdict {
  if (level === "T4") return "CERTIFIED";
  if (level === "T0") return "NON_COMPLIANT";
  return "PARTIAL";
}

const PAYROLL_AUDITOR_PROOF_SOURCE_TABLES = [
  "payroll_runs",
  "payroll_run_lines",
  "payroll_payslips",
  "payroll_declarations",
  "payroll_declaration_evidence",
  "payroll_payment_batches",
  "payroll_payment_allocations",
  "payment_transactions",
  "match_records",
  "provider_events",
  "statement_lines",
  "statement_files",
  "ledger_posting_batches",
  "journal_entries",
  "journal_entry_lines",
  "accounting_source_links",
  "business_events",
  "ledger_audit_events",
] as const;

function proofGateStatus(
  blockerCount: number,
  reviewCount = 0,
): PayrollAuditProofGateStatus {
  if (blockerCount > 0) return "BLOCKED";
  if (reviewCount > 0) return "REVIEW";
  return "PASS";
}

function payrollBlockerIdsFor(
  blockers: DataTrustBlocker[],
  gatePrefixes: string[],
) {
  return blockers
    .filter((blocker) =>
      gatePrefixes.some((prefix) => blocker.gate.startsWith(prefix)),
    )
    .map((blocker) => blocker.id)
    .sort();
}

function figure(
  amount: Prisma.Decimal,
  params: {
    currency: string;
    asOf: string;
    periodStatus: PeriodStatus;
    sourceQueryId: string;
    criticalBlockers: number;
  },
): AccountantFinancialFigure {
  const sourceTables = ["journal_entries", "journal_entry_lines"];

  if (params.criticalBlockers > 0) {
    return {
      available: false,
      amount: null,
      currency: params.currency,
      provenance: "UNAVAILABLE",
      reason:
        "Critical data-trust blockers must be resolved before this financial figure is rendered.",
      asOf: params.asOf,
      periodStatus: params.periodStatus,
      sourceTables,
      sourceQueryId: params.sourceQueryId,
    };
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
  };
}

async function resolveScopePeriod(
  client: DbClient,
  scope: ReturnType<typeof normalizedScope>,
  now: Date,
) {
  const anchor = scope.startDate ?? scope.endDate ?? now;

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
  });
}

async function loadOptionalLedgerRows(
  client: DbClient,
  scope: ReturnType<typeof normalizedScope>,
) {
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
  });

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
  }));
}

export async function getAccountantPortalData(
  input: GetAccountantPortalDataInput,
  client: DbClient = db,
  now = new Date(),
): Promise<AccountantPortalData> {
  const initialScope = normalizedScope(input, now);
  const resolvedPeriod = await resolveScopePeriod(client, initialScope, now);
  if (input.periodId && !resolvedPeriod) throw new BusinessRuleError("Accounting period not found for this organization.");
  const closeScope = input.periodId && resolvedPeriod
    ? createCloseControlScope(input.organizationId, resolvedPeriod, now, input) : undefined;
  const scope = normalizedScope(closeScope ? { ...input, startDate: closeScope.startDate, endDate: closeScope.endDate } : input, now, closeScope);
  const supplierPaymentReconciliationProofs = await readSupplierPaymentReconciliationProofsInTx(client, scope.organizationId, closeScope);
  const accountCoverage = closeScope ? await readAccountCloseCoverage(client, closeScope) : null;
  const bankBalanceReconciliation = closeScope ? await readBankBalanceClose(client, closeScope) : undefined;
  const balanceSheetReconciliation = closeScope ? await readBalanceSheetClose(client, closeScope) : undefined;
  const entryWhere = journalEntryScope(scope);
  const batchWhere = postingBatchScope(scope);
  const eventWhere = businessEventScope(scope);
  const statementFileWhere = statementFileScope(scope);
  const statementLineWhere = statementLineScope(scope);
  const signedReconciliationRunWhere = signedReconciliationRunScope(scope);
  const scopeHash = closeScope?.scopeHash ?? sha256(
    stableStringify({
      organizationId: scope.organizationId,
      periodId: scope.periodId,
      startDate: scope.startDate?.toISOString() ?? null,
      endDate: scope.endDate?.toISOString() ?? null,
    }),
  );
  const sourceQueryId = sha256(
    stableStringify({
      scopeHash,
      sourceTables: ["journal_entries", "journal_entry_lines"],
    }),
  );

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
    payrollDeclarationRegisterProofMissingCount,
    payrollDeclarationCountryPackRegisterProofMissingCount,
    payrollDeclarationCompositeRegisterProofMissingCount,
    payrollDeclarationAuthorityAdapterProofMissingCount,
    payrollDeclarationAuthorityLifecycleProofMissingCount,
    payrollDeclarationAmendmentEvidenceCount,
    payrollPaymentSettlementRegisterProofMissingCount,
    payrollPaymentSettlementComponentProofMissingCount,
    payrollPaymentSettlementCompositeProofMissingCount,
    payrollPaymentProviderAdapterProofMissingCount,
    payrollPaymentProviderReceiptProofMissingCount,
    payrollPaymentUnsettledCount,
    payrollPaymentReconciliationEvidenceMissingCount,
    payrollPaymentAllocationMissingCount,
    payrollTransitionEvidenceRuns,
    payrollPostedRunMissingLedgerCount,
    payrollPostedRunComponentProofMissingCount,
    payrollPostedRunCompositeProofMissingCount,
    payrollDeductionRecoveryLedgerMappingMissingCount,
    payrollPostedRunCertifiedInputProofMissingCount,
    payrollEffectiveComponentProofMissingCount,
    payrollPostedRunLineMissingPayslipCount,
    payrollEmittedPayslipMissingProofCount,
    payrollPaidRunMissingSettledPaymentCount,
    payrollPaymentMissingLedgerCount,
    payrollPostedLedgerMissingSourceLinkCount,
    payableBalances,
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
    Promise.resolve(resolvedPeriod),
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
        ...(scope.closeScope ? { AND: [closeExceptionWhere(scope.closeScope)] } : createdAtFilter(scope)),
      },
    }),
    client.paymentException.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: openPaymentExceptionStatuses() },
        severity: { in: ["HIGH", "CRITICAL"] },
        ...(scope.closeScope ? { AND: [closeExceptionWhere(scope.closeScope)] } : createdAtFilter(scope)),
      },
    }),
    client.providerAccount.count({
      where: {
        organizationId: scope.organizationId,
        ...(scope.closeScope ? { createdAt: { lte: new Date(scope.closeScope.endDate < scope.closeScope.recordedThrough ? scope.closeScope.endDate : scope.closeScope.recordedThrough) } } : { status: ProviderAccountStatus.ACTIVE }),
      },
    }),
    client.providerAccount.findMany({
      where: {
        organizationId: scope.organizationId,
        ...(scope.closeScope ? { createdAt: { lte: new Date(scope.closeScope.endDate < scope.closeScope.recordedThrough ? scope.closeScope.endDate : scope.closeScope.recordedThrough) } } : { status: ProviderAccountStatus.ACTIVE }),
      },
      select: {
        id: true,
        displayName: true,
        providerCode: true,
        settlementLagDays: true,
        metadata: true,
        statementFiles: {
          where: {
            ...(scope.closeScope ? closeStatementFileWhere(scope.closeScope) : {}),
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
        ...(scope.closeScope ? { AND: [closeDeclarationWhere(scope.closeScope)] } : createdAtFilter(scope)),
      },
    }),
    client.payrollDeclaration.count({
      where: {
        organizationId: scope.organizationId,
        status: PayrollDeclarationStatus.REJECTED,
        ...(scope.closeScope ? { AND: [closeDeclarationWhere(scope.closeScope)] } : createdAtFilter(scope)),
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
        ...(scope.closeScope ? { AND: [closeDeclarationWhere(scope.closeScope)] } : createdAtFilter(scope)),
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
        ...(scope.closeScope ? { AND: [closeDeclarationWhere(scope.closeScope)] } : createdAtFilter(scope)),
      },
    }),
    client.payrollDeclarationEvidence.count({
      where: {
        organizationId: scope.organizationId,
        transition: {
          in: [
            PayrollDeclarationEvidenceTransition.SUBMIT,
            PayrollDeclarationEvidenceTransition.ACCEPT,
            PayrollDeclarationEvidenceTransition.REJECT,
            PayrollDeclarationEvidenceTransition.MARK_PAYMENT_DUE,
            PayrollDeclarationEvidenceTransition.MARK_PAID,
            PayrollDeclarationEvidenceTransition.RECONCILE,
            PayrollDeclarationEvidenceTransition.AMEND,
          ],
        },
        OR: [{ sourceRegisterHash: null }, { sourceRegisterHash: "" }],
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), declaration: closeDeclarationWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollDeclarationEvidence.count({
      where: {
        organizationId: scope.organizationId,
        transition: {
          in: [
            PayrollDeclarationEvidenceTransition.SUBMIT,
            PayrollDeclarationEvidenceTransition.ACCEPT,
            PayrollDeclarationEvidenceTransition.REJECT,
            PayrollDeclarationEvidenceTransition.MARK_PAYMENT_DUE,
            PayrollDeclarationEvidenceTransition.MARK_PAID,
            PayrollDeclarationEvidenceTransition.RECONCILE,
            PayrollDeclarationEvidenceTransition.AMEND,
          ],
        },
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["countryPackRegisterProofHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["countryPackRegisterProofHash"],
              equals: "",
            },
          },
          {
            metadata: {
              path: ["countryPackRegisterProofStatus"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["countryPackRegisterProofStatus"],
              equals: "",
            },
          },
          {
            NOT: {
              metadata: {
                path: ["countryPackRegisterProofStatus"],
                equals: "MATCHED",
              },
            },
          },
        ],
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), declaration: closeDeclarationWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollDeclarationEvidence.count({
      where: {
        organizationId: scope.organizationId,
        transition: {
          in: [
            PayrollDeclarationEvidenceTransition.SUBMIT,
            PayrollDeclarationEvidenceTransition.ACCEPT,
            PayrollDeclarationEvidenceTransition.REJECT,
            PayrollDeclarationEvidenceTransition.MARK_PAYMENT_DUE,
            PayrollDeclarationEvidenceTransition.MARK_PAID,
            PayrollDeclarationEvidenceTransition.RECONCILE,
            PayrollDeclarationEvidenceTransition.AMEND,
          ],
        },
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["compositeRegisterProofHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["compositeRegisterProofHash"],
              equals: "",
            },
          },
          {
            metadata: {
              path: ["compositeRegisterProofStatus"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["compositeRegisterProofStatus"],
              equals: "",
            },
          },
          {
            NOT: {
              metadata: {
                path: ["compositeRegisterProofStatus"],
                equals: "MATCHED",
              },
            },
          },
        ],
        ...createdAtFilter(scope),
      },
    }),
    client.payrollDeclarationEvidence.count({
      where: {
        organizationId: scope.organizationId,
        transition: {
          in: [
            PayrollDeclarationEvidenceTransition.SUBMIT,
            PayrollDeclarationEvidenceTransition.ACCEPT,
            PayrollDeclarationEvidenceTransition.REJECT,
            PayrollDeclarationEvidenceTransition.MARK_PAYMENT_DUE,
            PayrollDeclarationEvidenceTransition.MARK_PAID,
            PayrollDeclarationEvidenceTransition.RECONCILE,
            PayrollDeclarationEvidenceTransition.AMEND,
          ],
        },
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["authorityAdapterProofHash"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["authorityAdapterProofHash"], equals: "" } },
          {
            metadata: {
              path: ["authorityAdapterContractHash"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["authorityAdapterContractHash"], equals: "" } },
        ],
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), declaration: closeDeclarationWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollDeclarationEvidence.count({
      where: {
        organizationId: scope.organizationId,
        transition: {
          in: [
            PayrollDeclarationEvidenceTransition.SUBMIT,
            PayrollDeclarationEvidenceTransition.ACCEPT,
            PayrollDeclarationEvidenceTransition.REJECT,
            PayrollDeclarationEvidenceTransition.MARK_PAYMENT_DUE,
            PayrollDeclarationEvidenceTransition.MARK_PAID,
            PayrollDeclarationEvidenceTransition.RECONCILE,
            PayrollDeclarationEvidenceTransition.AMEND,
          ],
        },
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["authorityLifecycleContractHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["authorityLifecycleContractHash"],
              equals: "",
            },
          },
          {
            metadata: {
              path: ["authorityLifecycleStatus"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["authorityLifecycleStatus"], equals: "" } },
          {
            metadata: {
              path: ["authorityLifecycleCloseImpact"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["authorityLifecycleCloseImpact"],
              equals: "",
            },
          },
        ],
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), declaration: closeDeclarationWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollDeclarationEvidence.count({
      where: {
        organizationId: scope.organizationId,
        transition: PayrollDeclarationEvidenceTransition.AMEND,
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), declaration: closeDeclarationWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
            PayrollPaymentBatchStatus.SETTLED,
          ],
        },
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["latestSettlementSourceRegisterHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["latestSettlementSourceRegisterHash"],
              equals: "",
            },
          },
        ],
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), payrollRun: closePayrollRunWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
            PayrollPaymentBatchStatus.SETTLED,
          ],
        },
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["latestSettlementComponentRegisterProofHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["latestSettlementComponentRegisterProofHash"],
              equals: "",
            },
          },
          {
            metadata: {
              path: ["latestSettlementPayrollComponentMappingHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["latestSettlementPayrollComponentMappingHash"],
              equals: "",
            },
          },
        ],
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), payrollRun: closePayrollRunWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
            PayrollPaymentBatchStatus.SETTLED,
          ],
        },
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["latestSettlementCompositeRegisterProofHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["latestSettlementCompositeRegisterProofHash"],
              equals: "",
            },
          },
          {
            metadata: {
              path: ["compositeRegisterProofStatus"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["compositeRegisterProofStatus"], equals: "" } },
          {
            NOT: {
              metadata: {
                path: ["compositeRegisterProofStatus"],
                equals: "MATCHED",
              },
            },
          },
        ],
        ...createdAtFilter(scope),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollPaymentBatchStatus.RELEASED,
            PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
            PayrollPaymentBatchStatus.SETTLED,
          ],
        },
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["paymentAdapterProofHash"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["paymentAdapterProofHash"], equals: "" } },
          {
            metadata: {
              path: ["paymentProviderAdapterContractHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["paymentProviderAdapterContractHash"],
              equals: "",
            },
          },
        ],
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), payrollRun: closePayrollRunWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
            PayrollPaymentBatchStatus.SETTLED,
          ],
        },
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["latestSettlementProviderReceiptProofHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["latestSettlementProviderReceiptProofHash"],
              equals: "",
            },
          },
          {
            metadata: {
              path: ["latestSettlementProviderReceiptProofSource"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["latestSettlementProviderReceiptProofSource"],
              equals: "",
            },
          },
        ],
        ...createdAtFilter(scope),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollPaymentBatchStatus.RELEASED,
            PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
          ],
        },
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), payrollRun: closePayrollRunWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollPaymentBatchStatus.RELEASED,
            PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
            PayrollPaymentBatchStatus.SETTLED,
          ],
        },
        OR: [
          { evidenceHash: null },
          { paymentTransactionId: null },
          { reconciliationStatus: null },
        ],
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), payrollRun: closePayrollRunWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollPaymentBatchStatus.RELEASED,
            PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
            PayrollPaymentBatchStatus.SETTLED,
          ],
        },
        allocations: { none: {} },
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), payrollRun: closePayrollRunWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollRun.findMany({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollRunStatus.REVIEWED,
            PayrollRunStatus.APPROVED,
            PayrollRunStatus.EMITTED,
            PayrollRunStatus.POSTED,
            PayrollRunStatus.PAID,
            PayrollRunStatus.ARCHIVED,
          ],
        },
        deletedAt: null,
        ...(scope.closeScope ? { AND: [closePayrollRunWhere(scope.closeScope)] } : createdAtFilter(scope)),
      },
      select: {
        status: true,
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
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
        ledgerPostingBatchId: null,
        deletedAt: null,
        ...(scope.closeScope ? { AND: [closePayrollRunWhere(scope.closeScope)] } : createdAtFilter(scope)),
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
        deletedAt: null,
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["componentRegisterProofHash"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["componentRegisterProofHash"], equals: "" } },
          {
            metadata: {
              path: ["componentRegisterProofStatus"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["componentRegisterProofStatus"], equals: "" } },
        ],
        ...(scope.closeScope ? { AND: [closePayrollRunWhere(scope.closeScope)] } : createdAtFilter(scope)),
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
        deletedAt: null,
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["compositeRegisterProofHash"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["compositeRegisterProofHash"], equals: "" } },
          {
            metadata: {
              path: ["compositeRegisterProofStatus"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["compositeRegisterProofStatus"], equals: "" } },
          {
            NOT: {
              metadata: {
                path: ["compositeRegisterProofStatus"],
                equals: "MATCHED",
              },
            },
          },
        ],
        ...createdAtFilter(scope),
      },
    }),
    client.payrollRunLine
      .findMany({
        where: {
          organizationId: scope.organizationId,
          payrollRun: {
            status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
            deletedAt: null,
            ...createdAtFilter(scope),
          },
        },
        select: {
          payrollRunId: true,
          calculationSnapshot: true,
          payrollRun: { select: { metadata: true } },
        },
      })
      .then(countDeductionRecoveryLedgerMappingGaps),
    client.payrollRun.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
        deletedAt: null,
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["hrisPayrollReadinessHash"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["hrisPayrollReadinessHash"], equals: "" } },
          {
            metadata: {
              path: ["payrollInputReadinessHash"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["payrollInputReadinessHash"], equals: "" } },
          {
            metadata: {
              path: ["payrollEngineInputSnapshotHash"],
              equals: Prisma.AnyNull,
            },
          },
          {
            metadata: {
              path: ["payrollEngineInputSnapshotHash"],
              equals: "",
            },
          },
          {
            metadata: {
              path: ["payrollEngineInputHashes"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["payrollEngineInputHashes"], equals: [] } },
        ],
        ...(scope.closeScope ? { AND: [closePayrollRunWhere(scope.closeScope)] } : createdAtFilter(scope)),
      },
    }),
    client.payrollRunLine
      .findMany({
        where: {
          organizationId: scope.organizationId,
          payrollRun: {
            status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
            deletedAt: null,
            ...(scope.closeScope ? { AND: [closePayrollRunWhere(scope.closeScope)] } : createdAtFilter(scope)),
          },
        },
        select: { calculationSnapshot: true },
      })
      .then(countEffectiveComponentProofGaps),
    client.payrollRunLine.count({
      where: {
        organizationId: scope.organizationId,
        payrollRun: {
          status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
          deletedAt: null,
          ...(scope.closeScope ? { AND: [closePayrollRunWhere(scope.closeScope)] } : createdAtFilter(scope)),
        },
        payslip: { is: null },
      },
    }),
    client.payrollPayslip.count({
      where: {
        organizationId: scope.organizationId,
        status: PayrollPayslipStatus.EMITTED,
        documentHash: "",
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), payrollRun: closePayrollRunWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: scope.organizationId,
        status: PayrollRunStatus.PAID,
        paymentBatches: { none: { status: PayrollPaymentBatchStatus.SETTLED } },
        deletedAt: null,
        ...(scope.closeScope ? { AND: [closePayrollRunWhere(scope.closeScope)] } : createdAtFilter(scope)),
      },
    }),

    client.payrollPaymentBatch.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            PayrollPaymentBatchStatus.RELEASED,
            PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
          ],
        },
        ledgerPostingBatchId: null,
        ...(scope.closeScope ? { AND: [{ organizationId: scope.organizationId, createdAt: closeRecordedDates(scope.closeScope), payrollRun: closePayrollRunWhere(scope.closeScope) }] } : createdAtFilter(scope)),
      },
    }),
    client.ledgerPostingBatch.count({
      where: {
        ...batchWhere,
        status: LedgerPostingBatchStatus.POSTED,
        sourceType: {
          in: [
            AccountingSourceType.PAYROLL_RUN,
            AccountingSourceType.PAYROLL_PAYMENT,
          ],
        },
        sourceLinks: { none: {} },
      },
    }),
    readClosePayableBalances(client, {
      organizationId: scope.organizationId,
      economicThrough: new Date(closeScope?.endDate ?? scope.endDate ?? scope.asOf),
      recordedThrough: new Date(scope.asOf),
      ...(!closeScope && scope.startDate ? { createdFrom: scope.startDate } : {}),
    }),
    client.supplierPayment.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [
            SupplierPaymentStatus.APPROVED,
            SupplierPaymentStatus.RELEASED,
            SupplierPaymentStatus.POSTED,
          ],
        },
        ledgerPostingBatchId: null,
        ...(scope.closeScope ? { AND: [{ createdAt: closeRecordedDates(scope.closeScope), paymentDate: { lte: new Date(scope.closeScope.endDate) } }] } : createdAtFilter(scope)),
      },
    }),
    client.fiscalDocument.count({
      where: {
        organizationId: scope.organizationId,
        status: {
          in: [FiscalDocumentStatus.QUEUED, FiscalDocumentStatus.SUBMITTED],
        },
        ...(scope.closeScope ? { AND: [{ createdAt: closeRecordedDates(scope.closeScope), postingBatch: { organizationId: scope.organizationId, periodId: scope.closeScope.periodId } }] } : createdAtFilter(scope)),
      },
    }),
    client.fiscalDocument.count({
      where: {
        organizationId: scope.organizationId,
        status: FiscalDocumentStatus.REJECTED,
        ...(scope.closeScope ? { AND: [{ createdAt: closeRecordedDates(scope.closeScope), postingBatch: { organizationId: scope.organizationId, periodId: scope.closeScope.periodId } }] } : createdAtFilter(scope)),
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
  ]);

  const payrollTransitionEvidence = summarizePayrollTransitionEvidence(
    payrollTransitionEvidenceRuns,
  );
  const blockers: DataTrustBlocker[] = [];
  const currency = settings?.baseCurrency || "XAF";
  const periodStatus: PeriodStatus = period?.status ?? "UNAVAILABLE";
  const debitTotal = decimal(ledgerAggregate._sum.debit);
  const creditTotal = decimal(ledgerAggregate._sum.credit);
  const ledgerBalanced = debitTotal.eq(creditTotal);
  const linkedPostedEntryCount = Math.max(
    postedEntryCount - orphanPostedEntryCount,
    0,
  );
  const sourceLinkCoveragePct =
    postedEntryCount === 0
      ? null
      : Number(((linkedPostedEntryCount / postedEntryCount) * 100).toFixed(2));
  const providerStatementEvidenceMissing =
    accountCoverage ? accountCoverage.accounts.some(row => row.reasons.some(reason => reason === "MISSING_STATEMENT" || reason === "PARTIAL_STATEMENT")) :
      activeProviderAccountCount > 0 && (providerStatementFileCount === 0 || providerStatementLineCount === 0);
  const staleStatementAccounts = providerStatementEvidenceMissing
    ? []
    : staleProviderStatementAccounts(
        activeProviderStatementFreshnessRows,
        statementFreshnessAnchor(scope, period, now),
      );
  const providerStatementCadenceStale =
    !accountCoverage && activeProviderAccountCount > 0 && staleStatementAccounts.length > 0;
  const providerReconciliationSignoffMissing =
    accountCoverage ? accountCoverage.accounts.some(row => row.reasons.some(reason => reason === "MISSING_SIGNOFF" || reason === "PARTIAL_SIGNOFF")) : activeProviderAccountCount > 0 &&
    !providerStatementEvidenceMissing &&
    !providerStatementCadenceStale &&
    signedReconciliationRunCount === 0;

  const accountingSetupReady = settings?.accountingEnabled === true &&
    (settings.setupStatus === "READY" || settings.setupStatus === "LOCKED");
  if (!accountingSetupReady) {
    addBlocker(blockers, {
      id: "accounting-setup-not-locked",
      severity: "high",
      gate: "accounting.setup.ready",
      title: "Accounting setup is not locked",
      detail:
        "Accountant trust packs require the accounting setup to be marked ready before certification.",
      sourceTables: ["organization_accounting_settings"],
    });
  }

  if (!period) {
    addBlocker(blockers, {
      id: "period-unavailable",
      severity: "high",
      gate: "accounting.period.scope",
      title: "No accounting period resolved",
      detail:
        "The portal could not resolve an accounting period for the selected scope.",
      sourceTables: ["accounting_periods"],
    });
  }

  if (period?.status === AccountingPeriodStatus.LOCKED) {
    addBlocker(blockers, {
      id: "period-locked",
      severity: "medium",
      gate: "accounting.period.scope",
      title: "Period is locked",
      detail:
        "Figures are readable but changes and recertification require a new approved close workflow.",
      sourceTables: ["accounting_periods"],
    });
  }

  if (!ledgerBalanced) {
    addBlocker(blockers, {
      id: "ledger-unbalanced",
      severity: "critical",
      gate: "ledger.balance",
      title: "Posted ledger activity is not balanced",
      detail:
        "Debit and credit totals from posted/reversed journal lines diverge for this scope.",
      sourceTables: ["journal_entry_lines"],
    });
  }

  if (orphanPostedEntryCount > 0) {
    addBlocker(blockers, {
      id: "posted-journals-without-source-link",
      severity: "critical",
      gate: "ledger.source-link",
      title: "Posted journals lack source links",
      detail: `${orphanPostedEntryCount} posted journal entry or reversal has no accounting source link.`,
      sourceTables: ["journal_entries", "accounting_source_links"],
    });
  }

  if (postedWithoutBatchCount > 0) {
    addBlocker(blockers, {
      id: "posted-journals-without-posting-batch",
      severity: "critical",
      gate: "ledger.posting-batch",
      title: "Posted journals lack posting batches",
      detail: `${postedWithoutBatchCount} posted journal entry or reversal is not tied to a posting batch.`,
      sourceTables: ["journal_entries", "ledger_posting_batches"],
    });
  }

  if (postedBatchWithoutJournalCount > 0) {
    addBlocker(blockers, {
      id: "posted-batches-without-journals",
      severity: "critical",
      gate: "ledger.batch-journal-link",
      title: "Posted posting batches lack journals",
      detail: `${postedBatchWithoutJournalCount} posted posting batch has no journal entry.`,
      sourceTables: ["ledger_posting_batches", "journal_entries"],
    });
  }

  if (failedBatchCount > 0) {
    addBlocker(blockers, {
      id: "failed-posting-batches",
      severity: "high",
      gate: "ledger.failed-posting",
      title: "Failed posting batches remain open",
      detail: `${failedBatchCount} posting batch failed and must be corrected before certification.`,
      sourceTables: ["ledger_posting_batches"],
    });
  }

  if (failedBusinessEventCount > 0) {
    addBlocker(blockers, {
      id: "failed-business-events",
      severity: "high",
      gate: "event-gateway.failed-events",
      title: "Business events failed or were rejected",
      detail: `${failedBusinessEventCount} business event is failed or rejected in the selected scope.`,
      sourceTables: ["business_events"],
    });
  }

  if (criticalPaymentExceptionCount > 0) {
    addBlocker(blockers, {
      id: "critical-payment-exceptions",
      severity: "critical",
      gate: "payments.reconciliation.exceptions",
      title: "Critical payment exceptions are open",
      detail: `${criticalPaymentExceptionCount} high or critical payment reconciliation exception remains open.`,
      sourceTables: ["payment_exceptions"],
    });
  } else if (openPaymentExceptionCount > 0) {
    addBlocker(blockers, {
      id: "open-payment-exceptions",
      severity: "high",
      gate: "payments.reconciliation.exceptions",
      title: "Payment reconciliation exceptions are open",
      detail: `${openPaymentExceptionCount} payment reconciliation exception remains open.`,
      sourceTables: ["payment_exceptions"],
    });
  }

  for (const account of balanceSheetReconciliation?.accounts ?? []) {
    if (account.status !== "BLOCKED") continue;
    addBlocker(blockers, { id: `balance-sheet:${account.ledgerAccountId}:${account.currency}`, severity: "high", gate: "ledger.balance-sheet",
      title: "Balance-sheet reconciliation is incomplete", detail: `${account.accountCode} ${account.accountName} (${account.currency}): ${account.reason}`,
      sourceTables: ["balance_sheet_evidence", "chart_of_accounts", "journal_entries", "journal_entry_lines", "close_source_changes"],
    });
  }

  for (const account of bankBalanceReconciliation?.accounts ?? []) {
    if (account.status !== "BLOCKED") continue;
    addBlocker(blockers, { id: `bank-balance:${account.providerAccountId}`, severity: "high", gate: "payments.bank-balance",
      title: "Bank balance reconciliation is incomplete", detail: `${account.accountName} (${account.currency}): ${account.reason}`,
      sourceTables: ["bank_balance_evidence", "provider_accounts", "statement_files", "statement_lines", "journal_entry_lines"],
    });
  }

  for (const account of accountCoverage?.accounts ?? []) {
    if (account.status !== "BLOCKED") continue;
    addBlocker(blockers, {
      id: `provider-account-coverage:${account.providerAccountId}`,
      severity: "high", gate: "payments.account-close-coverage", title: "Provider account close coverage is incomplete",
      detail: `${account.accountName} (${account.providerAccountId}, ${account.currencyCode}): ${account.reasons.join(", ")}. Required period ${account.startDate} through ${account.endDate}.`,
      sourceTables: ["provider_accounts", "statement_files", "reconciliation_runs", "reconciliation_no_activity_evidence"],
    });
  }
  if (!accountCoverage && providerStatementEvidenceMissing) {
    addBlocker(blockers, {
      id: "provider-statement-evidence-missing",
      severity: "high",
      gate: "payments.provider-statement-evidence",
      title: "Provider statement evidence is missing",
      detail: `${activeProviderAccountCount} active provider account is configured, but processed/imported statement file and line evidence is missing for the selected scope.`,
      sourceTables: ["provider_accounts", "statement_files", "statement_lines"],
    });
  } else if (!accountCoverage && providerStatementCadenceStale) {
    addBlocker(blockers, {
      id: "provider-statement-cadence-stale",
      severity: "high",
      gate: "payments.provider-statement-cadence",
      title: "Provider statement cadence is stale",
      detail: `${staleStatementAccounts.length} active provider account has statement evidence, but its latest statement is older than the configured cadence for the selected scope.`,
      sourceTables: ["provider_accounts", "statement_files", "statement_lines"],
    });
  } else if (!accountCoverage && providerReconciliationSignoffMissing) {
    addBlocker(blockers, {
      id: "provider-reconciliation-signoff-missing",
      severity: "high",
      gate: "payments.reconciliation.signoff",
      title: "Provider reconciliation signoff is missing",
      detail: `${activeProviderAccountCount} active provider account has statement evidence, but no signed reconciliation run is available for the selected scope.`,
      sourceTables: [
        "provider_accounts",
        "statement_files",
        "statement_lines",
        "reconciliation_runs",
      ],
    });
  }

  if (supplierPaymentMissingLedgerCount > 0) {
    addBlocker(blockers, {
      id: "supplier-payments-without-ledger",
      severity: "critical",
      gate: "purchasing.payment.ledger",
      title: "Supplier payments lack ledger posting",
      detail: `${supplierPaymentMissingLedgerCount} approved, released, or posted supplier payment is missing a ledger posting batch.`,
      sourceTables: ["supplier_payments", "ledger_posting_batches"],
    });
  }

  for (const balance of payableBalances.balances) {
    if (balance.classification !== "EXCEPTION") continue;
    addBlocker(blockers, {
      id: `supplier-invoice-exception:${balance.invoiceId}`,
      severity: "high",
      gate: "purchasing.ap.reconciliation",
      title: "Supplier invoice has an unresolved control exception",
      detail: `${balance.invoiceId} (${balance.currency}): ${balance.reasons.map(closePayableReasonLabel).join("; ")}. An unpaid balance alone does not block close.`,
      sourceTables: ["supplier_invoices", "supplier_ledger_entries", "supplier_payment_allocations", "supplier_credit_notes", "supplier_invoice_match_exceptions", "ledger_posting_batches"],
    });
  }

  if (payrollDeclarationRejectedCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declarations-rejected",
      severity: "high",
      gate: "payroll.declarations",
      title: "Payroll declarations were rejected",
      detail: `${payrollDeclarationRejectedCount} payroll declaration requires correction evidence.`,
      sourceTables: ["payroll_declarations"],
    });
  } else if (payrollDeclarationPreparedCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declarations-prepared",
      severity: "medium",
      gate: "payroll.declarations",
      title: "Payroll declarations await authority evidence",
      detail: `${payrollDeclarationPreparedCount} payroll declaration is prepared but not yet accepted, paid, or reconciled.`,
      sourceTables: ["payroll_declarations"],
    });
  }

  if (payrollDeclarationLifecycleEvidenceMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declaration-lifecycle-evidence-missing",
      severity: "high",
      gate: "payroll.declarations.evidence",
      title: "Payroll declaration lifecycle evidence is incomplete",
      detail: `${payrollDeclarationLifecycleEvidenceMissingCount} advanced payroll declaration lacks append-only authority evidence.`,
      sourceTables: ["payroll_declarations", "payroll_declaration_evidence"],
    });
  }

  if (payrollDeclarationRegisterProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declaration-register-proof-missing",
      severity: "high",
      gate: "payroll.declarations.register-proof",
      title: "Payroll declaration evidence lacks register proof",
      detail: `${payrollDeclarationRegisterProofMissingCount} close-impacting payroll declaration evidence record is missing source payroll register proof.`,
      sourceTables: ["payroll_declaration_evidence", "payroll_runs"],
    });
  }

  if (payrollDeclarationCountryPackRegisterProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declaration-country-pack-register-proof-missing",
      severity: "high",
      gate: "payroll.declarations.country-pack-register-proof",
      title: "Payroll declaration evidence lacks country-pack register proof",
      detail: `${payrollDeclarationCountryPackRegisterProofMissingCount} close-impacting payroll declaration evidence record is missing matched country-pack register proof.`,
      sourceTables: [
        "payroll_declaration_evidence",
        "payroll_runs",
        "payroll_run_lines",
      ],
    });
  }

  if (payrollDeclarationCompositeRegisterProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declaration-composite-register-proof-missing",
      severity: "high",
      gate: "payroll.declarations.composite-register-proof",
      title: "Payroll declaration evidence lacks composite register proof",
      detail: `${payrollDeclarationCompositeRegisterProofMissingCount} close-impacting payroll declaration evidence record is missing matched composite register proof.`,
      sourceTables: [
        "payroll_declaration_evidence",
        "payroll_runs",
        "payroll_run_lines",
      ],
    });
  }

  if (payrollDeclarationAuthorityAdapterProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declaration-authority-adapter-proof-missing",
      severity: "high",
      gate: "payroll.declarations.adapter-proof",
      title: "Payroll declaration evidence lacks authority adapter proof",
      detail: `${payrollDeclarationAuthorityAdapterProofMissingCount} close-impacting payroll declaration evidence record is missing authority adapter proof or adapter contract hash.`,
      sourceTables: ["payroll_declaration_evidence", "payroll_declarations"],
    });
  }

  if (payrollDeclarationAuthorityLifecycleProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declaration-authority-lifecycle-proof-missing",
      severity: "high",
      gate: "payroll.declarations.lifecycle-proof",
      title: "Payroll declaration evidence lacks authority lifecycle proof",
      detail: `${payrollDeclarationAuthorityLifecycleProofMissingCount} close-impacting payroll declaration evidence record is missing authority lifecycle contract hash, status, or close-impact proof.`,
      sourceTables: ["payroll_declaration_evidence", "payroll_declarations"],
    });
  }

  if (payrollDeclarationInProgressCount > 0) {
    addBlocker(blockers, {
      id: "payroll-declarations-in-progress",
      severity: "medium",
      gate: "payroll.declarations.lifecycle",
      title: "Payroll declarations are still in lifecycle processing",
      detail: `${payrollDeclarationInProgressCount} payroll declaration is submitted, accepted, payment-due, or paid but not yet reconciled or archived.`,
      sourceTables: ["payroll_declarations", "payroll_declaration_evidence"],
    });
  }

  if (payrollPaymentUnsettledCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payments-unsettled",
      severity: "high",
      gate: "payroll.payment.reconciliation",
      title: "Payroll payments are not settled",
      detail: `${payrollPaymentUnsettledCount} released or partially settled payroll payment batch still needs reconciliation evidence.`,
      sourceTables: ["payroll_payment_batches"],
    });
  }

  if (payrollPaymentReconciliationEvidenceMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payments-without-reconciliation-evidence",
      severity: "high",
      gate: "payroll.payment.reconciliation.evidence",
      title: "Payroll payments lack reconciliation evidence",
      detail: `${payrollPaymentReconciliationEvidenceMissingCount} released, partially settled, or settled payroll payment batch is missing batch evidence, a linked payment transaction, or reconciliation status.`,
      sourceTables: ["payroll_payment_batches", "payment_transactions"],
    });
  }

  if (payrollPaymentSettlementRegisterProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payment-settlement-register-proof-missing",
      severity: "high",
      gate: "payroll.payment.register-proof",
      title: "Payroll settlement evidence lacks register proof",
      detail: `${payrollPaymentSettlementRegisterProofMissingCount} settled or partially settled payroll payment batch is missing source payroll register proof.`,
      sourceTables: ["payroll_payment_batches", "payroll_runs"],
    });
  }

  if (payrollPaymentSettlementComponentProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payment-settlement-component-proof-missing",
      severity: "high",
      gate: "payroll.payment.component-proof",
      title: "Payroll settlement evidence lacks component proof",
      detail: `${payrollPaymentSettlementComponentProofMissingCount} settled or partially settled payroll payment batch is missing statutory component register proof or payroll component mapping proof.`,
      sourceTables: [
        "payroll_payment_batches",
        "payroll_runs",
        "payroll_run_lines",
      ],
    });
  }

  if (payrollPaymentSettlementCompositeProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payment-settlement-composite-proof-missing",
      severity: "high",
      gate: "payroll.payment.composite-proof",
      title: "Payroll settlement evidence lacks composite proof",
      detail: `${payrollPaymentSettlementCompositeProofMissingCount} settled or partially settled payroll payment batch is missing matched composite register proof.`,
      sourceTables: [
        "payroll_payment_batches",
        "payroll_runs",
        "payroll_run_lines",
      ],
    });
  }

  if (payrollPaymentProviderAdapterProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payment-provider-adapter-proof-missing",
      severity: "high",
      gate: "payroll.payment.adapter-proof",
      title: "Payroll payment evidence lacks provider adapter proof",
      detail: `${payrollPaymentProviderAdapterProofMissingCount} released, partially settled, or settled payroll payment batch is missing provider adapter proof or adapter contract hash.`,
      sourceTables: ["payroll_payment_batches", "payment_transactions"],
    });
  }

  if (payrollPaymentProviderReceiptProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payment-provider-receipt-proof-missing",
      severity: "high",
      gate: "payroll.payment.provider-receipt-proof",
      title: "Payroll settlement evidence lacks provider receipt proof",
      detail: `${payrollPaymentProviderReceiptProofMissingCount} settled or partially settled payroll payment batch is missing provider receipt or statement proof from the reconciliation match.`,
      sourceTables: [
        "payroll_payment_batches",
        "payment_transactions",
        "match_records",
        "provider_events",
        "statement_lines",
        "statement_files",
      ],
    });
  }

  if (payrollPaymentAllocationMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payment-allocations-missing",
      severity: "high",
      gate: "payroll.register.payment-allocations",
      title: "Payroll payment allocations are missing",
      detail: `${payrollPaymentAllocationMissingCount} released, partially settled, or settled payroll payment batch has no payslip allocations for register tie-out.`,
      sourceTables: [
        "payroll_payment_batches",
        "payroll_payment_allocations",
        "payroll_payslips",
      ],
    });
  }

  if (payrollTransitionEvidence.emittedUnpostedCount > 0) {
    addBlocker(blockers, {
      id: "payroll-emitted-runs-unposted",
      severity: "critical",
      gate: "payroll.lifecycle.posting",
      title: "Emitted payroll runs are not posted",
      detail: String(payrollTransitionEvidence.emittedUnpostedCount) + " emitted payroll run has payslip evidence but no completed ledger posting transition.",
      sourceTables: [
        "payroll_runs",
        "payroll_run_transitions",
        "payroll_payslips",
      ],
    });
  }

  if (payrollTransitionEvidence.missingPostCutoverProofCount > 0) {
    addBlocker(blockers, {
      id: "payroll-transition-proof-missing",
      severity: "critical",
      gate: "payroll.lifecycle.transition-proof",
      title: "Payroll lifecycle transition proof is missing",
      detail: String(payrollTransitionEvidence.missingPostCutoverProofCount) + " post-cutover payroll run lacks a complete verified review, approval, emission, or posting transition ledger.",
      sourceTables: ["payroll_runs", "payroll_run_transitions"],
    });
  }

  if (payrollTransitionEvidence.legacyPartialEvidenceCount > 0) {
    addBlocker(blockers, {
      id: "payroll-transition-proof-legacy-partial",
      severity: "medium",
      gate: "payroll.lifecycle.legacy-disclosure",
      title: "Historical payroll transition proof is partial",
      detail: String(payrollTransitionEvidence.legacyPartialEvidenceCount) + " historical payroll run is explicitly disclosed as legacy partial evidence and cannot be represented as verified runtime proof.",
      sourceTables: ["payroll_runs", "payroll_run_transitions"],
    });
  }

  if (payrollPostedRunMissingLedgerCount > 0) {
    addBlocker(blockers, {
      id: "payroll-runs-without-ledger",
      severity: "critical",
      gate: "payroll.accounting.posting",
      title: "Posted payroll runs lack ledger posting",
      detail: `${payrollPostedRunMissingLedgerCount} posted or paid payroll run is missing a ledger posting batch.`,
      sourceTables: ["payroll_runs", "ledger_posting_batches"],
    });
  }

  if (payrollPostedRunComponentProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-posted-runs-component-proof-missing",
      severity: "critical",
      gate: "payroll.accounting.component-proof",
      title: "Posted payroll runs lack component register proof",
      detail: `${payrollPostedRunComponentProofMissingCount} posted or paid payroll run is missing statutory component register proof in accounting evidence.`,
      sourceTables: [
        "payroll_runs",
        "payroll_run_lines",
        "ledger_posting_batches",
      ],
    });
  }

  if (payrollPostedRunCompositeProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-posted-runs-composite-proof-missing",
      severity: "critical",
      gate: "payroll.accounting.composite-proof",
      title: "Posted payroll runs lack composite register proof",
      detail: `${payrollPostedRunCompositeProofMissingCount} posted or paid payroll run is missing matched composite register proof in accounting evidence.`,
      sourceTables: [
        "payroll_runs",
        "payroll_run_lines",
        "ledger_posting_batches",
      ],
    });
  }

  if (payrollDeductionRecoveryLedgerMappingMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-deduction-recovery-ledger-mapping-missing",
      severity: "critical",
      gate: "payroll.accounting.deduction-recovery-ledger-mapping",
      title: "Posted payroll runs lack deduction/recovery ledger mapping",
      detail: `${payrollDeductionRecoveryLedgerMappingMissingCount} posted or paid payroll run has deduction/recovery evidence but is missing matched deduction/recovery ledger mapping proof.`,
      sourceTables: [
        "payroll_runs",
        "payroll_run_lines",
        "ledger_posting_batches",
        "accounting_source_links",
      ],
    });
  }

  if (payrollPostedRunCertifiedInputProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-posted-runs-certified-input-proof-missing",
      severity: "critical",
      gate: "payroll.accounting.certified-input-proof",
      title: "Posted payroll runs lack certified HRIS input proof",
      detail: `${payrollPostedRunCertifiedInputProofMissingCount} posted or paid payroll run is missing explicit certified HRIS readiness, payroll readiness, or engine input proof required for close evidence.`,
      sourceTables: ["payroll_runs"],
    });
  }

  if (payrollEffectiveComponentProofMissingCount > 0) {
    addBlocker(blockers, {
      id: "payroll-effective-component-proof-missing",
      severity: "critical",
      gate: "payroll.accounting.effective-component-proof",
      title: "Payroll run lines lack effective component proof",
      detail: `${payrollEffectiveComponentProofMissingCount} posted or paid payroll run line lacks effective-dated allowance, benefit, leave, or overtime proof needed for certified close evidence.`,
      sourceTables: ["payroll_runs", "payroll_run_lines"],
    });
  }

  if (payrollPostedRunLineMissingPayslipCount > 0) {
    addBlocker(blockers, {
      id: "payroll-run-lines-without-payslips",
      severity: "critical",
      gate: "payroll.register.payslip-tieout",
      title: "Payroll run lines lack emitted payslips",
      detail: `${payrollPostedRunLineMissingPayslipCount} posted or paid payroll run line has no emitted payslip evidence for register tie-out.`,
      sourceTables: ["payroll_runs", "payroll_run_lines", "payroll_payslips"],
    });
  }

  if (payrollEmittedPayslipMissingProofCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payslips-without-proof-hash",
      severity: "high",
      gate: "payroll.payslip.proof",
      title: "Emitted payroll payslips lack proof hashes",
      detail: `${payrollEmittedPayslipMissingProofCount} emitted payroll payslip has an empty document hash and cannot support certified close evidence.`,
      sourceTables: ["payroll_payslips"],
    });
  }

  if (payrollPaidRunMissingSettledPaymentCount > 0) {
    addBlocker(blockers, {
      id: "payroll-paid-runs-without-settled-payments",
      severity: "high",
      gate: "payroll.register.payment-tieout",
      title: "Paid payroll runs lack settled payment evidence",
      detail: `${payrollPaidRunMissingSettledPaymentCount} paid payroll run has no settled payment batch for register tie-out.`,
      sourceTables: [
        "payroll_runs",
        "payroll_payment_batches",
        "payroll_payment_allocations",
      ],
    });
  }

  if (payrollPaymentMissingLedgerCount > 0) {
    addBlocker(blockers, {
      id: "payroll-payments-without-ledger",
      severity: "critical",
      gate: "payroll.payment.posting",
      title: "Released payroll payments lack ledger posting",
      detail: `${payrollPaymentMissingLedgerCount} released or partially settled payroll payment batch is missing a ledger posting batch.`,
      sourceTables: ["payroll_payment_batches", "ledger_posting_batches"],
    });
  }

  if (payrollPostedLedgerMissingSourceLinkCount > 0) {
    addBlocker(blockers, {
      id: "payroll-ledger-source-link-missing",
      severity: "critical",
      gate: "payroll.accounting.source-link",
      title: "Payroll ledger postings lack source links",
      detail: `${payrollPostedLedgerMissingSourceLinkCount} posted payroll ledger batch is missing accounting source-link evidence.`,
      sourceTables: ["ledger_posting_batches", "accounting_source_links"],
    });
  }

  if (fiscalRejectedCount > 0) {
    addBlocker(blockers, {
      id: "fiscal-documents-rejected",
      severity: "high",
      gate: "compliance.fiscal-documents",
      title: "Fiscal documents were rejected",
      detail: `${fiscalRejectedCount} fiscal document rejection needs correction or authority follow-up evidence.`,
      sourceTables: ["fiscal_documents"],
    });
  } else if (fiscalQueuedCount > 0) {
    addBlocker(blockers, {
      id: "fiscal-documents-pending",
      severity: "medium",
      gate: "compliance.fiscal-documents",
      title: "Fiscal documents await certification evidence",
      detail: `${fiscalQueuedCount} fiscal document is queued or submitted but not certified yet.`,
      sourceTables: ["fiscal_documents"],
    });
  }

  if (offlineOpenConflictCount > 0) {
    addBlocker(blockers, {
      id: "offline-pos-sync-conflicts",
      severity: "high",
      gate: "pos.offline-sync.conflicts",
      title: "Offline POS sync conflicts remain open",
      detail: `${offlineOpenConflictCount} offline POS conflict requires manager review before certification or close.`,
      sourceTables: ["pos_offline_sync_conflicts", "pos_offline_events"],
    });
  }

  if (offlineCloseBlockerCount > 0) {
    addBlocker(blockers, {
      id: "offline-pos-close-blockers",
      severity: "high",
      gate: "pos.offline-sync.certification",
      title: "Offline POS certification blockers are open",
      detail: `${offlineCloseBlockerCount} offline POS sync certificate is blocking close readiness.`,
      sourceTables: ["pos_offline_sync_certificates"],
    });
  }

  if (offlinePendingEventCount > 0) {
    addBlocker(blockers, {
      id: "offline-pos-events-pending-replay",
      severity: "medium",
      gate: "pos.offline-sync.replay",
      title: "Offline POS events await server replay",
      detail: `${offlinePendingEventCount} accepted offline POS event is still provisional and pending replay/certification.`,
      sourceTables: ["pos_offline_events", "business_events"],
    });
  }

  if (postedEntryCount === 0) {
    addBlocker(blockers, {
      id: "ledger-empty",
      severity: "medium",
      gate: "ledger.activity",
      title: "No posted ledger activity in scope",
      detail:
        "The portal can open, but certified accountant export requires posted ledger evidence.",
      sourceTables: ["journal_entries", "journal_entry_lines"],
    });
  }

  const criticalBlockers = blockers.filter(
    (blocker) => blocker.severity === "critical",
  ).length;
  const highBlockers = blockers.filter(
    (blocker) => blocker.severity === "high",
  ).length;
  const mediumBlockers = blockers.filter(
    (blocker) => blocker.severity === "medium",
  ).length;
  const trustLevel = levelFromBlockers(
    blockers,
    sourceLinkCoveragePct,
    ledgerBalanced,
  );
  const verdict = verdictFor(trustLevel);
  const canExportCertifiedPack = trustLevel === "T4" && verdict === "CERTIFIED";
  const disabledReason = canExportCertifiedPack
    ? null
    : "Certified accountant trust-pack export requires T4: balanced ledger, source-link coverage, no failed events, no open high-risk exceptions, and no unresolved statutory blockers.";

  const moduleEvidence: AccountantPortalData["moduleEvidence"] = [
    {
      module: "ledger",
      status: statusFor(
        !ledgerBalanced ||
          orphanPostedEntryCount > 0 ||
          postedWithoutBatchCount > 0 ||
          postedBatchWithoutJournalCount > 0,
        failedBatchCount > 0 || !accountingSetupReady || !period || (balanceSheetReconciliation?.blockedAccountCount ?? 0) > 0,
        postedEntryCount === 0 ||
          period?.status === AccountingPeriodStatus.LOCKED,
      ),
      label: "Ledger source of truth",
      detail:
        "Posted journal entries, journal lines, posting batches, and source links.",
      facts: [
        { label: "Posted entries", value: postedEntryCount },
        { label: "Balance-sheet exceptions", value: balanceSheetReconciliation?.blockedAccountCount ?? 0 },
        { label: "Journal lines", value: ledgerAggregate._count._all },
        {
          label: "Source-link coverage",
          value:
            sourceLinkCoveragePct === null
              ? "n/a"
              : `${sourceLinkCoveragePct}%`,
        },
      ],
    },
    {
      module: "events",
      status: statusFor(false, failedBusinessEventCount > 0, false),
      label: "Business event gateway",
      detail: "Failed/rejected business events block accountant certification.",
      facts: [
        { label: "Failed/rejected events", value: failedBusinessEventCount },
      ],
    },
    {
      module: "payments",
      status: statusFor(
        criticalPaymentExceptionCount > 0,
        openPaymentExceptionCount > 0 ||
          (accountCoverage?.blockedAccountCount ?? 0) > 0 ||
          (bankBalanceReconciliation?.blockedAccountCount ?? 0) > 0 ||
          providerStatementEvidenceMissing ||
          providerStatementCadenceStale ||
          providerReconciliationSignoffMissing,
        false,
      ),
      label: "Payment reconciliation",
      detail:
        "Open payment exceptions, statement coverage, signed runs and independently approved bank balances gate certification.",
      facts: [
        {
          label: "Active provider accounts",
          value: activeProviderAccountCount,
        },
        { label: "Bank balance exceptions", value: bankBalanceReconciliation?.blockedAccountCount ?? 0 },
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
      status: statusFor(
        supplierPaymentMissingLedgerCount > 0,
        payableBalances.exceptionCount > 0,
        false,
      ),
      label: "Purchasing and AP",
      detail:
        "Normal unpaid balances remain visible without blocking close. Disputes, inconsistent balances and missing posting evidence require resolution.",
      facts: [
        { label: "Normal unpaid invoices", value: payableBalances.normalUnpaidCount },
        { label: "Settled invoices", value: payableBalances.settledCount },
        { label: "AP control exceptions", value: payableBalances.exceptionCount },
        {
          label: "Payments without ledger",
          value: supplierPaymentMissingLedgerCount,
        },
      ],
    },
    {
      module: "payroll",
      status: statusFor(
        payrollTransitionEvidence.emittedUnpostedCount > 0 ||
          payrollTransitionEvidence.missingPostCutoverProofCount > 0 ||
          payrollPostedRunMissingLedgerCount > 0 ||
          payrollPostedRunComponentProofMissingCount > 0 ||
          payrollPostedRunCompositeProofMissingCount > 0 ||
          payrollDeductionRecoveryLedgerMappingMissingCount > 0 ||
          payrollPostedRunCertifiedInputProofMissingCount > 0 ||
          payrollEffectiveComponentProofMissingCount > 0 ||
          payrollPostedRunLineMissingPayslipCount > 0 ||
          payrollPaymentMissingLedgerCount > 0 ||
          payrollPostedLedgerMissingSourceLinkCount > 0,
        payrollTransitionEvidence.legacyPartialEvidenceCount > 0 ||
          payrollDeclarationRejectedCount > 0 ||
          payrollDeclarationLifecycleEvidenceMissingCount > 0 ||
          payrollDeclarationRegisterProofMissingCount > 0 ||
          payrollDeclarationCountryPackRegisterProofMissingCount > 0 ||
          payrollDeclarationCompositeRegisterProofMissingCount > 0 ||
          payrollDeclarationAuthorityAdapterProofMissingCount > 0 ||
          payrollDeclarationAuthorityLifecycleProofMissingCount > 0 ||
          payrollPaymentUnsettledCount > 0 ||
          payrollPaymentReconciliationEvidenceMissingCount > 0 ||
          payrollPaymentSettlementRegisterProofMissingCount > 0 ||
          payrollPaymentSettlementComponentProofMissingCount > 0 ||
          payrollPaymentSettlementCompositeProofMissingCount > 0 ||
          payrollPaymentProviderAdapterProofMissingCount > 0 ||
          payrollPaymentProviderReceiptProofMissingCount > 0 ||
          payrollPaymentAllocationMissingCount > 0 ||
          payrollEmittedPayslipMissingProofCount > 0 ||
          payrollPaidRunMissingSettledPaymentCount > 0,
        payrollDeclarationPreparedCount > 0 ||
          payrollDeclarationInProgressCount > 0,
      ),
      label: "Payroll and declarations",
      detail:
        "Payroll lifecycle transition proof, certified HRIS input proof, register tie-out, payslip proof, payment reconciliation/component proof, ledger source-link, and declaration lifecycle evidence is consumed from payroll services.",
      facts: [
        {
          label: "Emitted runs awaiting posting",
          value: payrollTransitionEvidence.emittedUnpostedCount,
        },
        {
          label: "Post-cutover transition proof gaps",
          value: payrollTransitionEvidence.missingPostCutoverProofCount,
        },
        {
          label: "Legacy partial transition disclosures",
          value: payrollTransitionEvidence.legacyPartialEvidenceCount,
        },
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
          label: "Declaration register proof gaps",
          value: payrollDeclarationRegisterProofMissingCount,
        },
        {
          label: "Declaration country-pack register proof gaps",
          value: payrollDeclarationCountryPackRegisterProofMissingCount,
        },
        {
          label: "Declaration composite register proof gaps",
          value: payrollDeclarationCompositeRegisterProofMissingCount,
        },
        {
          label: "Declaration adapter proof gaps",
          value: payrollDeclarationAuthorityAdapterProofMissingCount,
        },
        {
          label: "Declaration lifecycle proof gaps",
          value: payrollDeclarationAuthorityLifecycleProofMissingCount,
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
          label: "Payment register proof gaps",
          value: payrollPaymentSettlementRegisterProofMissingCount,
        },
        {
          label: "Payment component proof gaps",
          value: payrollPaymentSettlementComponentProofMissingCount,
        },
        {
          label: "Payment composite proof gaps",
          value: payrollPaymentSettlementCompositeProofMissingCount,
        },
        {
          label: "Payment adapter proof gaps",
          value: payrollPaymentProviderAdapterProofMissingCount,
        },
        {
          label: "Payment provider receipt proof gaps",
          value: payrollPaymentProviderReceiptProofMissingCount,
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
          label: "Posted run component proof gaps",
          value: payrollPostedRunComponentProofMissingCount,
        },
        {
          label: "Posted run composite proof gaps",
          value: payrollPostedRunCompositeProofMissingCount,
        },
        {
          label: "Deduction/recovery ledger mapping gaps",
          value: payrollDeductionRecoveryLedgerMappingMissingCount,
        },
        {
          label: "Posted run certified input proof gaps",
          value: payrollPostedRunCertifiedInputProofMissingCount,
        },
        {
          label: "Effective component proof gaps",
          value: payrollEffectiveComponentProofMissingCount,
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
      detail:
        "Fiscal document certification/rejection evidence is included in trust gates.",
      facts: [
        { label: "Pending fiscal docs", value: fiscalQueuedCount },
        { label: "Rejected fiscal docs", value: fiscalRejectedCount },
      ],
    },
    {
      module: "offline_pos",
      status: statusFor(
        offlineOpenConflictCount > 0,
        offlineCloseBlockerCount > 0,
        offlinePendingEventCount > 0,
      ),
      label: "Offline POS sync",
      detail:
        "Device sync evidence, conflicts, provisional receipts, and close blockers from the 014 offline POS kernel.",
      facts: [
        { label: "Pending replay", value: offlinePendingEventCount },
        { label: "Open conflicts", value: offlineOpenConflictCount },
        { label: "Close blockers", value: offlineCloseBlockerCount },
      ],
    },
    {
      module: "audit",
      status: statusFor(
        false,
        false,
        ledgerAuditEventCount + controlAuditEventCount === 0,
      ),
      label: "Audit and controls",
      detail:
        "Ledger audit events and sensitive-action control decisions are exposed to accountants.",
      facts: [
        { label: "Ledger audit events", value: ledgerAuditEventCount },
        { label: "Control audit events", value: controlAuditEventCount },
      ],
    },
  ];

  const requiredForNextLevel =
    trustLevel === "T4"
      ? []
      : blockers
          .filter(
            (blocker) =>
              blocker.severity === "critical" || blocker.severity === "high",
          )
          .map((blocker) => `${blocker.gate}: ${blocker.title}`);

  const payrollBlockers = blockers.filter((blocker) =>
    blocker.gate.startsWith("payroll."),
  );
  const payrollAuditProofPack: PayrollAuditProofPack = {
    kind: "AQSTOQFLOW_PAYROLL_AUDITOR_PROOF_PACK_READ_MODEL",
    version: 1,
    generatedAt: scope.asOf,
    scopeHash,
    organizationScoped: true,
    redaction: {
      mode: "HASHES_AND_AGGREGATES_ONLY",
      excluded: [
        "employee names",
        "employee identifiers",
        "bank and mobile-money details",
        "raw salary rows",
        "raw authority/provider payloads",
      ],
    },
    certification: {
      trustLevel,
      verdict,
      exportable: canExportCertifiedPack,
      blockerCount: payrollBlockers.length,
      criticalBlockerCount: payrollBlockers.filter(
        (blocker) => blocker.severity === "critical",
      ).length,
      highBlockerCount: payrollBlockers.filter(
        (blocker) => blocker.severity === "high",
      ).length,
    },
    sourceTables: [...PAYROLL_AUDITOR_PROOF_SOURCE_TABLES],
    aggregateEvidence: {
      runsMissingLedger: payrollPostedRunMissingLedgerCount,
      postedRunComponentProofGaps: payrollPostedRunComponentProofMissingCount,
      postedRunCompositeProofGaps: payrollPostedRunCompositeProofMissingCount,
      deductionRecoveryLedgerMappingGaps:
        payrollDeductionRecoveryLedgerMappingMissingCount,
      effectiveComponentProofGaps: payrollEffectiveComponentProofMissingCount,
      runLinesMissingPayslips: payrollPostedRunLineMissingPayslipCount,
      payslipsMissingProofHashes: payrollEmittedPayslipMissingProofCount,
      paidRunsMissingSettledPayments: payrollPaidRunMissingSettledPaymentCount,
      paymentsMissingLedger: payrollPaymentMissingLedgerCount,
      payrollBatchesMissingSourceLinks:
        payrollPostedLedgerMissingSourceLinkCount,
      paymentReconciliationEvidenceGaps:
        payrollPaymentReconciliationEvidenceMissingCount,
      paymentRegisterProofGaps:
        payrollPaymentSettlementRegisterProofMissingCount,
      paymentComponentProofGaps:
        payrollPaymentSettlementComponentProofMissingCount,
      paymentCompositeProofGaps:
        payrollPaymentSettlementCompositeProofMissingCount,
      paymentAdapterProofGaps: payrollPaymentProviderAdapterProofMissingCount,
      paymentProviderReceiptProofGaps:
        payrollPaymentProviderReceiptProofMissingCount,
      paymentAllocationGaps: payrollPaymentAllocationMissingCount,
      unsettledPaymentBatches: payrollPaymentUnsettledCount,
      preparedDeclarations: payrollDeclarationPreparedCount,
      rejectedDeclarations: payrollDeclarationRejectedCount,
      inProgressDeclarations: payrollDeclarationInProgressCount,
      declarationLifecycleEvidenceGaps:
        payrollDeclarationLifecycleEvidenceMissingCount,
      declarationRegisterProofGaps: payrollDeclarationRegisterProofMissingCount,
      declarationCountryPackRegisterProofGaps:
        payrollDeclarationCountryPackRegisterProofMissingCount,
      declarationCompositeRegisterProofGaps:
        payrollDeclarationCompositeRegisterProofMissingCount,
      declarationAdapterProofGaps:
        payrollDeclarationAuthorityAdapterProofMissingCount,
      declarationLifecycleProofGaps:
        payrollDeclarationAuthorityLifecycleProofMissingCount,
    },
    proofGates: [
      {
        gate: "payroll.accounting.certified-input-proof",
        status: proofGateStatus(payrollPostedRunCertifiedInputProofMissingCount),
        blockerCount: payrollPostedRunCertifiedInputProofMissingCount,
        blockerIds: payrollBlockerIdsFor(blockers, [
          "payroll.accounting.certified-input-proof",
        ]),
        evidence: ["certified HRIS readiness and payroll engine input proof"],
      },
      {
        gate: "payroll.accounting.posting",
        status: proofGateStatus(
          payrollPostedRunMissingLedgerCount + payrollPaymentMissingLedgerCount,
        ),
        blockerCount:
          payrollPostedRunMissingLedgerCount + payrollPaymentMissingLedgerCount,
        blockerIds: payrollBlockerIdsFor(blockers, [
          "payroll.accounting.posting",
          "payroll.payment.posting",
        ]),
        evidence: ["payroll run/payment ledger posting batch links"],
      },
      {
        gate: "payroll.accounting.source-link",
        status: proofGateStatus(payrollPostedLedgerMissingSourceLinkCount),
        blockerCount: payrollPostedLedgerMissingSourceLinkCount,
        blockerIds: payrollBlockerIdsFor(blockers, [
          "payroll.accounting.source-link",
        ]),
        evidence: ["accounting source links for payroll ledger batches"],
      },
      {
        gate: "payroll.accounting.component-proof",
        status: proofGateStatus(
          payrollPostedRunComponentProofMissingCount +
            payrollPostedRunCompositeProofMissingCount +
            payrollDeductionRecoveryLedgerMappingMissingCount +
            payrollEffectiveComponentProofMissingCount,
        ),
        blockerCount:
          payrollPostedRunComponentProofMissingCount +
          payrollPostedRunCompositeProofMissingCount +
          payrollDeductionRecoveryLedgerMappingMissingCount +
          payrollEffectiveComponentProofMissingCount,
        blockerIds: payrollBlockerIdsFor(blockers, [
          "payroll.accounting.component-proof",
          "payroll.accounting.composite-proof",
          "payroll.accounting.deduction-recovery-ledger-mapping",
          "payroll.accounting.effective-component-proof",
        ]),
        evidence: [
          "component register proof",
          "composite register proof",
          "deduction/recovery ledger mapping proof",
          "effective component proof",
        ],
      },
      {
        gate: "payroll.register.payslip-tieout",
        status: proofGateStatus(
          payrollPostedRunLineMissingPayslipCount +
            payrollEmittedPayslipMissingProofCount,
        ),
        blockerCount:
          payrollPostedRunLineMissingPayslipCount +
          payrollEmittedPayslipMissingProofCount,
        blockerIds: payrollBlockerIdsFor(blockers, [
          "payroll.register.payslip-tieout",
          "payroll.payslip.proof",
        ]),
        evidence: ["emitted payslip proof hashes and run-line tie-out"],
      },
      {
        gate: "payroll.payment.proof",
        status: proofGateStatus(
          payrollPaymentUnsettledCount +
            payrollPaymentReconciliationEvidenceMissingCount +
            payrollPaymentSettlementRegisterProofMissingCount +
            payrollPaymentSettlementComponentProofMissingCount +
            payrollPaymentSettlementCompositeProofMissingCount +
            payrollPaymentProviderAdapterProofMissingCount +
            payrollPaymentProviderReceiptProofMissingCount +
            payrollPaymentAllocationMissingCount +
            payrollPaidRunMissingSettledPaymentCount,
        ),
        blockerCount:
          payrollPaymentUnsettledCount +
          payrollPaymentReconciliationEvidenceMissingCount +
          payrollPaymentSettlementRegisterProofMissingCount +
          payrollPaymentSettlementComponentProofMissingCount +
          payrollPaymentSettlementCompositeProofMissingCount +
          payrollPaymentProviderAdapterProofMissingCount +
          payrollPaymentProviderReceiptProofMissingCount +
          payrollPaymentAllocationMissingCount +
          payrollPaidRunMissingSettledPaymentCount,
        blockerIds: payrollBlockerIdsFor(blockers, [
          "payroll.payment.",
          "payroll.register.payment-allocations",
        ]),
        evidence: [
          "payment reconciliation evidence",
          "settlement register/component/composite proof",
          "provider adapter proof",
          "provider receipt and statement proof",
          "payment allocations",
        ],
      },
      {
        gate: "payroll.declarations.proof",
        status: proofGateStatus(
          payrollDeclarationRejectedCount +
            payrollDeclarationLifecycleEvidenceMissingCount +
            payrollDeclarationRegisterProofMissingCount +
            payrollDeclarationCountryPackRegisterProofMissingCount +
            payrollDeclarationCompositeRegisterProofMissingCount +
            payrollDeclarationAuthorityAdapterProofMissingCount +
            payrollDeclarationAuthorityLifecycleProofMissingCount,
          payrollDeclarationPreparedCount + payrollDeclarationInProgressCount,
        ),
        blockerCount:
          payrollDeclarationRejectedCount +
          payrollDeclarationLifecycleEvidenceMissingCount +
          payrollDeclarationRegisterProofMissingCount +
          payrollDeclarationCountryPackRegisterProofMissingCount +
          payrollDeclarationCompositeRegisterProofMissingCount +
          payrollDeclarationAuthorityAdapterProofMissingCount +
          payrollDeclarationAuthorityLifecycleProofMissingCount,
        blockerIds: payrollBlockerIdsFor(blockers, ["payroll.declarations"]),
        evidence: [
          "declaration lifecycle evidence",
          "register/country-pack/composite proof",
          "authority adapter and lifecycle proof",
        ],
      },
    ],
    blockers: payrollBlockers.map((blocker) => ({
      id: blocker.id,
      severity: blocker.severity,
      gate: blocker.gate,
      title: blocker.title,
    })),
    latestSourceLinks: latestSourceLinks
      .filter(
        (link) =>
          link.sourceType === AccountingSourceType.PAYROLL_RUN ||
          link.sourceType === AccountingSourceType.PAYROLL_PAYMENT,
      )
      .map((link) => ({
        sourceLinkHash: sha256(link.id),
        sourceType: link.sourceType,
        sourceNumber: link.sourceNumber,
        sourceRefHash: sha256(
          `${scope.organizationId}:${link.sourceType}:${link.sourceId}`,
        ),
        journalEntryNumber: link.journalEntry?.entryNumber ?? null,
        postingBatchId: link.postingBatchId,
        postingStatus: link.postingBatch.status,
        createdAt: link.createdAt.toISOString(),
      })),
  };

  return {
    source: {
      mode: "LEDGER_BACKED_DATA_TRUST",
      asOf: scope.asOf,
      organizationScoped: true,
      trustLevel,
      certificationStatus: verdict,
      scopeHash,
      ...(closeScope ? { closeScope } : {}),
      sourceTables: [...DATA_TRUST_SOURCE_TABLES],
    },
    supplierPaymentReconciliationProofs,
    bankBalanceReconciliation,
    balanceSheetReconciliation,
    payableBalances,
    ...(accountCoverage ? { accountReconciliationCoverage: accountCoverage } : {}),
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
        "payroll register tie-out, payslip proof, payment settlement register/component/composite/provider-adapter/provider-receipt proof, declaration lifecycle register/country-pack/composite/lifecycle-contract proof, and authority-adapter proof scan",
        "payroll effective-dated allowance, benefit, leave, and overtime proof gap scan",
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
    payrollAuditProofPack,
    blockers: blockers.map(blocker => ({ ...blocker,
      scope: !closeScope || ["accounting-setup-not-locked", "offline-pos-sync-conflicts", "offline-pos-close-blockers", "offline-pos-events-pending-replay"].includes(blocker.id)
        ? "ORGANIZATION" as const : ["critical-payment-exceptions", "open-payment-exceptions"].includes(blocker.id)
          ? "PERIOD_AND_UNASSIGNED" as const : "PERIOD" as const,
    })),
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
          event.changes &&
          typeof event.changes === "object" &&
          !Array.isArray(event.changes)
            ? (event.changes as Record<string, unknown>)
            : {};

        return {
          id: event.id,
          source: "control" as const,
          action: event.action,
          resourceType: event.entityType,
          resourceId: event.entityId,
          actorId: event.userId,
          createdAt: event.createdAt.toISOString(),
          status:
            changes.allowed === false
              ? "denied"
              : changes.allowed === true
                ? "allowed"
                : "recorded",
        };
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
  };
}

export async function exportAccountantTrustPack(
  input: ExportAccountantTrustPackServiceInput,
): Promise<AccountantTrustPackExport> {
  const now = input.now ? new Date(input.now) : new Date();
  const exportId = randomUUID();
  const fileType = input.fileType ?? "json";

  if (fileType !== "json") {
    throw new BusinessRuleError(
      "Only JSON accountant trust-pack exports are enabled.",
    );
  }

  return db.$transaction(async (tx) => {
    const portal = await getAccountantPortalData(input, tx, now);
    const rowCount =
      portal.summary.journalLines +
      portal.summary.sourceLinks +
      portal.latestAuditEvents.length +
      portal.payrollAuditProofPack.proofGates.length +
      portal.payrollAuditProofPack.blockers.length +
      portal.payrollAuditProofPack.latestSourceLinks.length;
    const watermarkId = `acct-trust-${portal.scope.organizationId}-${exportId}`;

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
    });
    assertSensitiveActionAllowed(decision);

    if (!portal.exportReadiness.canExportCertifiedPack) {
      throw new BusinessRuleError(
        portal.exportReadiness.disabledReason ??
          "Accountant trust pack is not certified for export.",
      );
    }

    const ledgerRows = input.includeLedgerRows
      ? await loadOptionalLedgerRows(tx, normalizedScope(input, now, portal.source.closeScope))
      : [];
    const payload = {
      kind: "AQSTOQFLOW_ACCOUNTANT_TRUST_PACK",
      version: 1,
      packVersion: "accountant-trust-pack.v1",
      export: {
        exportId,
        generatedAt: now.toISOString(),
        generatedById: input.exportedById,
        watermarkId,
        fileType,
        redaction:
          "Secrets, raw provider payloads, and tenant internals excluded.",
      },
      certificate: portal.certificate,
      source: portal.source,
      scope: portal.scope,
      summary: portal.summary,
      figures: portal.figures,
      blockers: portal.blockers,
      moduleEvidence: portal.moduleEvidence,
      payableBalances: portal.payableBalances ?? null,
      bankBalanceReconciliation: portal.bankBalanceReconciliation ?? null,
      balanceSheetReconciliation: portal.balanceSheetReconciliation ?? null,
      accountReconciliationCoverage: portal.accountReconciliationCoverage ?? null,
      payrollAuditProofPack: portal.payrollAuditProofPack,
      latestSourceLinks: portal.latestSourceLinks,
      latestAuditEvents: portal.latestAuditEvents,
      ledgerRows,
    };
    const contentHash = sha256(stableStringify(payload));
    const content = JSON.stringify(
      { ...payload, export: { ...payload.export, contentHash } },
      null,
      2,
    );
    const fileName = `${watermarkId}.json`;

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
    });

    await recordBusinessEventInTx(tx, {
      organizationId: input.organizationId,
      eventType: "REPORT_EXPORT_CREATED",
      eventSource: "INTERNAL",
      idempotencyKey: `accountant-trust-pack-export:${exportId}`,
      actorId: input.exportedById,
      sourceEntityType: "AccountantTrustPack",
      sourceId: exportId,
      documentHash: contentHash,
      payload: {
        exportId,
        packVersion: "accountant-trust-pack.v1",
        filtersHash: portal.source.scopeHash,
        sourceTables: portal.source.sourceTables,
        periodId: portal.scope.periodId,
        contentHash,
        rowCount,
      },
      outboxMessages: [
        {
          channel: "REPORT_EXPORT",
          eventName: "REPORT_EXPORT_CREATED",
          payload: {
            exportId,
            organizationId: input.organizationId,
            contentHash,
          },
        },
      ],
    });

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
    };
  });
}
