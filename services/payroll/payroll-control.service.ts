import { createHash } from "crypto";
import {
  AccountingPostingPurpose,
  AccountingSourceType,
  ExceptionSeverity,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
  PaymentDirection,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentMethod,
  PaymentTransactionState,
  PayrollAttendanceSnapshotStatus,
  PayrollDeclarationStatus,
  PayrollEmployeeStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipLineCategory,
  PayrollPayslipStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client";

import { db } from "@/prisma/db";
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service";
import {
  createLedgerPostingBatch,
  linkAccountingSource,
} from "@/services/accounting/posting.service";
import { getOpenPeriodForDate } from "@/services/accounting/periods.service";
import { getActivePostingRule } from "@/services/accounting/posting-rules.service";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import {
  auditSensitiveActionDecision,
  assertSensitiveActionAllowed,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service";
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";
import {
  resolveRegulatoryParameter,
  type RegulatoryResolutionResult,
} from "@/services/regulatory/country-packs/resolve";
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts";
import {
  evaluateRedaction,
  type RedactionDecision,
} from "@/services/security/redaction-policy.service";
import { assertApprovedPaymentDestinationEvidence } from "./payment-evidence.service";

import {
  approveAndPostPayrollRunInputSchema,
  calculatePayrollRunInputSchema,
  createPayrollPeriodInputSchema,
  freezeAttendanceSnapshotInputSchema,
  preparePayrollDeclarationsInputSchema,
  releasePayrollPaymentBatchInputSchema,
  type ApproveAndPostPayrollRunInput,
  type CalculatePayrollRunInput,
  type CreatePayrollPeriodInput,
  type FreezeAttendanceSnapshotInput,
  type PreparePayrollDeclarationsInput,
  type ReleasePayrollPaymentBatchInput,
} from "./payroll-control.schemas";

type DbClient = typeof db | Prisma.TransactionClient;
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0];

type PayrollPostingAmounts = {
  sourceAmount: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
  netPayableAmount: Prisma.Decimal;
  employeeDeductionAmount: Prisma.Decimal;
  employerChargeAmount: Prisma.Decimal;
};

type PayrollPaymentPostingStatus = {
  ledgerBatch: {
    id: string;
    status?: LedgerPostingBatchStatus | null;
    errorMessage?: string | null;
  };
  ledgerStatus: "POSTED" | "BLOCKED_PENDING_RULES";
  blockerCode?: string | null;
  blockerMessage?: string | null;
  journalEntryId?: string | null;
  accountingSourceLinkId?: string | null;
};

export type PayrollWorkbenchData = {
  organizationId: string;
  asOf: string;
  counts: {
    openPeriods: number;
    calculatedRuns: number;
    postedRuns: number;
    releasedPaymentBatches: number;
    openDeclarations: number;
    ledgerBlockers: number;
    reconciliationExceptions: number;
  };
  queues: {
    recentRuns: Array<{
      id: string;
      runNumber: string;
      periodName: string;
      status: PayrollRunStatus;
      netPayableAmount: string;
      currency: string;
      payDate: string;
      ledgerPostingBatchId: string | null;
      postedBusinessEventId: string | null;
      payslipCount: number;
      paymentBatchCount: number;
      declarationCount: number;
      countryPackVersion: string;
      countryPackResolutionHash: string;
    }>;
    paymentBatches: Array<{
      id: string;
      batchNumber: string;
      payrollRunId: string;
      runNumber: string;
      status: PayrollPaymentBatchStatus;
      amount: string;
      currency: string;
      method: PaymentMethod;
      paymentDate: string;
      ledgerPostingBatchId: string | null;
      postedBusinessEventId: string | null;
      paymentTransactionId: string | null;
      paymentExceptionId: string | null;
      reconciliationStatus: string | null;
      ledgerStatus: string | null;
      ledgerBlockerCode: string | null;
      ledgerBlockerMessage: string | null;
    }>;
    declarations: Array<{
      id: string;
      payrollRunId: string;
      runNumber: string;
      authority: string;
      declarationType: string;
      status: PayrollDeclarationStatus;
      amount: string;
      currency: string;
      dueDate: string | null;
      countryPackVersion: string;
      countryPackResolutionHash: string;
      expertReviewRequired: boolean;
    }>;
    ledgerBlockers: Array<{
      id: string;
      sourceType: AccountingSourceType;
      sourceId: string;
      postingPurpose: AccountingPostingPurpose;
      status: LedgerPostingBatchStatus;
      errorMessage: string | null;
      createdAt: string;
    }>;
  };
};

type PayrollWorkbenchReadInput = {
  organizationId: string;
  limit?: number;
  actorId?: string | null;
  actorPermissions?: readonly string[];
  moduleDecision?: ModuleEntitlementDecision | null;
};

type CnpsPensionRates = {
  employee?: number;
  employer?: number;
  monthlyCeilingMinorUnits?: number;
};

type CnpsFamilyAllowanceRates = {
  general?: number;
  agriculture?: number;
  privateEducation?: number;
  paidBy?: "EMPLOYER";
};

type CnpsOccupationalRiskRates = {
  groupA?: number;
  groupB?: number;
  groupC?: number;
  paidBy?: "EMPLOYER";
  classificationRequired?: boolean;
};

type CnpsFamilyAllowanceSector =
  | "GENERAL"
  | "AGRICULTURE"
  | "PRIVATE_EDUCATION";
type CnpsOccupationalRiskGroup = "A" | "B" | "C";

type PayrollCountryPackStatus = {
  countryCode: string;
  countryPackVersion: string;
  countryPackSchemaVersion: string;
  countryPackResolutionHash: string;
  countryPackCapabilityStatus: string;
  cnpsFamilyAllowanceSector: CnpsFamilyAllowanceSector;
  cnpsOccupationalRiskGroup: CnpsOccupationalRiskGroup;
  pensionRates: RegulatoryResolutionResult<CnpsPensionRates>;
  familyAllowanceRates: RegulatoryResolutionResult<CnpsFamilyAllowanceRates>;
  occupationalRiskRates: RegulatoryResolutionResult<CnpsOccupationalRiskRates>;
  employerRules: RegulatoryResolutionResult<Record<string, unknown>>;
};

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function";
}

async function inTransaction<T>(
  client: DbClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (hasTransaction(client)) {
    return client.$transaction((tx) => work(tx));
  }

  return work(client as Prisma.TransactionClient);
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataString(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "string" ? entry : null;
}

function parseDate(value: Date | string | undefined, fallback = new Date()) {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new BusinessRuleError("Invalid payroll date.");
  return parsed;
}

function decimal2(value: Prisma.Decimal.Value | bigint | null | undefined) {
  return new Prisma.Decimal(
    typeof value === "bigint" ? value.toString() : (value ?? 0),
  ).toDecimalPlaces(2);
}

function normalizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "CAMEROON") return "CM";
  return normalized.length === 2 ? normalized : null;
}

function normalizeCurrency(value?: string | null) {
  return (value || "XAF").trim().toUpperCase();
}

function normalizeMappingKey(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function assertRegulatorReviewedPayrollResolution(
  resolution: RegulatoryResolutionResult,
  label: string,
) {
  if (
    resolution.verificationStatus !== "EXPERT_REVIEWED" &&
    resolution.verificationStatus !== "REGULATOR_CONFIRMED"
  ) {
    throw new BusinessRuleError(
      `${label} requires EXPERT_REVIEWED or REGULATOR_CONFIRMED country-pack provenance.`,
    );
  }
}

function normalizeFamilyAllowanceSector(
  value?: string | null,
): CnpsFamilyAllowanceSector | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "GENERAL") return "GENERAL";
  if (normalized === "AGRICULTURE") return "AGRICULTURE";
  if (normalized === "PRIVATE_EDUCATION") return "PRIVATE_EDUCATION";
  return null;
}

function normalizeOccupationalRiskGroup(
  value?: string | null,
): CnpsOccupationalRiskGroup | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized === "A" || normalized === "B" || normalized === "C"
    ? normalized
    : null;
}

function familyAllowanceRateForSector(
  rates: CnpsFamilyAllowanceRates,
  sector: CnpsFamilyAllowanceSector,
) {
  switch (sector) {
    case "GENERAL":
      return Number(rates.general ?? 0);
    case "AGRICULTURE":
      return Number(rates.agriculture ?? 0);
    case "PRIVATE_EDUCATION":
      return Number(rates.privateEducation ?? 0);
    default:
      return 0;
  }
}

function occupationalRiskRateForGroup(
  rates: CnpsOccupationalRiskRates,
  group: CnpsOccupationalRiskGroup,
) {
  switch (group) {
    case "A":
      return Number(rates.groupA ?? 0);
    case "B":
      return Number(rates.groupB ?? 0);
    case "C":
      return Number(rates.groupC ?? 0);
    default:
      return 0;
  }
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    entityType: string;
    entityId: string;
    action: string;
    actorId?: string | null;
    changes?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: input.changes ?? undefined,
    },
  });
}

async function writePayrollWorkbenchReadAudit(
  client: DbClient,
  input: {
    organizationId: string;
    actorId?: string | null;
    amountDecision: RedactionDecision;
    returnedRunCount: number;
    returnedPaymentBatchCount: number;
    returnedDeclarationCount: number;
  },
) {
  return client.auditLog.create({
    data: {
      entityType: "PayrollWorkbench",
      entityId: input.organizationId,
      action: "PAYROLL_WORKBENCH_SALARY_READ",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({
        amountAccess: {
          allowed: input.amountDecision.allowed,
          mode: input.amountDecision.mode,
          reasonCode: input.amountDecision.reasonCode,
          policy: input.amountDecision.policy,
          requiredPermissions: input.amountDecision.requiredPermissions,
        },
        returnedRecordCounts: {
          recentRuns: input.returnedRunCount,
          paymentBatches: input.returnedPaymentBatchCount,
          declarations: input.returnedDeclarationCount,
        },
      }),
    },
  });
}

function payrollAmountForReadModel(
  amount: Prisma.Decimal.Value | bigint | null | undefined,
  decision: RedactionDecision,
) {
  if (!decision.allowed) return decision.replacement;
  return decimal2(amount).toFixed(2);
}

function assertIdempotencyPayloadMatches(
  metadata: unknown,
  requestPayloadHash: string | null,
  message: string,
) {
  if (!requestPayloadHash) return;
  const existingPayloadHash = metadataString(
    metadata,
    "idempotencyPayloadHash",
  );
  if (existingPayloadHash && existingPayloadHash !== requestPayloadHash) {
    throw new ConflictError(message);
  }
}

async function resolvePayrollCountryPackStatus(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    countryCode?: string | null;
    effectiveAt: Date;
  },
): Promise<PayrollCountryPackStatus> {
  const organization = await tx.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
    select: {
      country: true,
      countryCode: true,
      accountingSettings: {
        select: {
          countryPack: true,
          taxRegime: true,
          payrollCnpsFamilyAllowanceSector: true,
          payrollCnpsOccupationalRiskGroup: true,
        },
      },
    },
  });

  const countryCode =
    normalizeCountryCode(input.countryCode) ??
    normalizeCountryCode(organization?.countryCode) ??
    normalizeCountryCode(organization?.country);
  if (!countryCode) {
    throw new BusinessRuleError(
      "Organization country is required before payroll country-pack calculation.",
    );
  }

  const cnpsFamilyAllowanceSector = normalizeFamilyAllowanceSector(
    organization?.accountingSettings?.payrollCnpsFamilyAllowanceSector,
  );
  if (!cnpsFamilyAllowanceSector) {
    throw new BusinessRuleError(
      "Payroll CNPS family allowance sector is required before Cameroon payroll calculation.",
    );
  }

  const cnpsOccupationalRiskGroup = normalizeOccupationalRiskGroup(
    organization?.accountingSettings?.payrollCnpsOccupationalRiskGroup,
  );
  if (!cnpsOccupationalRiskGroup) {
    throw new BusinessRuleError(
      "Payroll CNPS occupational risk group is required before Cameroon payroll calculation.",
    );
  }

  const context = {
    countryCode,
    date: input.effectiveAt,
    pinnedPackVersion:
      organization?.accountingSettings?.countryPack ?? undefined,
    entityProfile: {
      countryCode,
      taxRegime: organization?.accountingSettings?.taxRegime ?? null,
      payrollRiskGroup: cnpsOccupationalRiskGroup,
    },
  };

  const pensionRates = resolveRegulatoryParameter<CnpsPensionRates>(
    "payroll.cnps.pensionRatesBps",
    {
      ...context,
      purpose: "PAYROLL_CNPS_PENSION",
    },
  );
  const familyAllowanceRates =
    resolveRegulatoryParameter<CnpsFamilyAllowanceRates>(
      "payroll.cnps.familyAllowanceRatesBps",
      {
        ...context,
        purpose: "PAYROLL_CNPS_FAMILY_ALLOWANCE",
      },
    );
  const occupationalRiskRates =
    resolveRegulatoryParameter<CnpsOccupationalRiskRates>(
      "payroll.cnps.occupationalRiskRatesBps",
      {
        ...context,
        purpose: "PAYROLL_CNPS_OCCUPATIONAL_RISK",
      },
    );
  const employerRules = resolveRegulatoryParameter<Record<string, unknown>>(
    "payroll.cnps.employerRules",
    {
      ...context,
      purpose: "PAYROLL_EMPLOYER_RULES",
    },
  );

  assertRegulatorReviewedPayrollResolution(pensionRates, "CNPS pension rates");
  assertRegulatorReviewedPayrollResolution(
    familyAllowanceRates,
    "CNPS family allowance rates",
  );
  assertRegulatorReviewedPayrollResolution(
    occupationalRiskRates,
    "CNPS occupational risk rates",
  );
  assertRegulatorReviewedPayrollResolution(
    employerRules,
    "CNPS employer rules",
  );

  return {
    countryCode,
    countryPackVersion: pensionRates.packVersion,
    countryPackSchemaVersion: pensionRates.schemaVersion,
    countryPackResolutionHash: prefixedHash({
      pensionRates: pensionRates.resolutionHash,
      familyAllowanceRates: familyAllowanceRates.resolutionHash,
      occupationalRiskRates: occupationalRiskRates.resolutionHash,
      employerRules: employerRules.resolutionHash,
      cnpsFamilyAllowanceSector,
      cnpsOccupationalRiskGroup,
    }),
    countryPackCapabilityStatus: pensionRates.capabilityStatus,
    cnpsFamilyAllowanceSector,
    cnpsOccupationalRiskGroup,
    pensionRates,
    familyAllowanceRates,
    occupationalRiskRates,
    employerRules,
  };
}

async function nextPayrollRunNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  runDate: Date,
) {
  const prefix = `PAY-${compactDate(runDate)}`;
  const count = await tx.payrollRun.count({
    where: {
      organizationId,
      runNumber: { startsWith: prefix },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function nextPayrollEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
) {
  const prefix = `PAYJ-${compactDate(entryDate)}`;
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: prefix },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

function conditionMatches(
  condition: Prisma.JsonValue | null | undefined,
  context: Record<string, unknown>,
) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition))
    return true;

  return Object.entries(condition as Record<string, unknown>).every(
    ([key, expected]) => {
      const actual = context[key];
      if (Array.isArray(expected)) return expected.includes(actual);
      return actual === expected;
    },
  );
}

function amountForSource(
  source: PostingRuleAmountSource,
  amounts: PayrollPostingAmounts,
) {
  switch (source) {
    case PostingRuleAmountSource.FIXED:
      return new Prisma.Decimal(1);
    case PostingRuleAmountSource.SOURCE_AMOUNT:
      return amounts.sourceAmount;
    case PostingRuleAmountSource.GROSS_AMOUNT:
      return amounts.grossAmount;
    case PostingRuleAmountSource.NET_PAYABLE_AMOUNT:
      return amounts.netPayableAmount;
    case PostingRuleAmountSource.EMPLOYEE_DEDUCTION_AMOUNT:
      return amounts.employeeDeductionAmount;
    case PostingRuleAmountSource.EMPLOYER_CHARGE_AMOUNT:
      return amounts.employerChargeAmount;
    default:
      return new Prisma.Decimal(0);
  }
}

async function createPayrollLedgerPosting(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    periodId: string;
    payrollRunId: string;
    runNumber: string;
    entryDate: Date;
    actorId: string;
    currency: string;
    documentHash: string;
    amounts: PayrollPostingAmounts;
    metadata: Record<string, unknown>;
  },
) {
  const rule = await getActivePostingRule(
    input.organizationId,
    {
      sourceType: AccountingSourceType.PAYROLL_RUN,
      postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
      effectiveAt: input.entryDate,
    },
    tx,
  );

  if (!rule) {
    throw new BusinessRuleError(
      "Payroll posting requires configured SYSCOHADA payroll posting rules.",
    );
  }

  const journal = await tx.journal.findFirst({
    where: {
      organizationId: input.organizationId,
      type: JournalType.PAYROLL,
      isDefault: true,
      isActive: true,
    },
    select: { id: true, code: true },
  });
  if (!journal) {
    throw new BusinessRuleError(
      "Payroll posting requires an active default payroll journal.",
    );
  }

  const mappingKeys = rule.lines
    .map((line) => normalizeMappingKey(line.mappingKey))
    .filter(Boolean) as string[];
  const mappedAccounts = mappingKeys.length
    ? await tx.chartOfAccount.findMany({
        where: {
          organizationId: input.organizationId,
          mappingKey: { in: Array.from(new Set(mappingKeys)) },
          deletedAt: null,
          isActive: true,
        },
        include: { _count: { select: { children: true } } },
      })
    : [];
  const accountByMapping = new Map(
    mappedAccounts.map((account) => [
      normalizeMappingKey(account.mappingKey),
      account,
    ]),
  );

  const postingLines = rule.lines
    .filter((line) => conditionMatches(line.condition, input.metadata))
    .map((line) => {
      const account =
        line.account ??
        accountByMapping.get(normalizeMappingKey(line.mappingKey));
      if (!account) {
        throw new BusinessRuleError(
          `Payroll posting rule ${rule.code} line ${line.lineNumber} does not resolve to an account.`,
        );
      }
      if (!account.isActive || account.deletedAt) {
        throw new BusinessRuleError(
          `Payroll posting rule ${rule.code} account ${account.code} is not active.`,
        );
      }
      const childCount =
        "_count" in account
          ? Number(
              (account as { _count?: { children?: number } })._count
                ?.children ?? 0,
            )
          : 0;
      if (childCount > 0) {
        throw new BusinessRuleError(
          `Payroll posting rule ${rule.code} account ${account.code} must be a leaf account.`,
        );
      }

      const amount = amountForSource(line.amountSource, input.amounts)
        .times(new Prisma.Decimal(line.multiplier ?? 1))
        .toDecimalPlaces(2);
      if (amount.lt(0)) {
        throw new BusinessRuleError(
          `Payroll posting rule ${rule.code} line ${line.lineNumber} produced a negative amount.`,
        );
      }
      if (amount.eq(0)) return null;

      return {
        accountId: account.id,
        lineNumber: line.lineNumber,
        description: line.description ?? `Payroll run ${input.runNumber}`,
        debit:
          line.side === PostingRuleLineSide.DEBIT
            ? amount
            : new Prisma.Decimal(0),
        credit:
          line.side === PostingRuleLineSide.CREDIT
            ? amount
            : new Prisma.Decimal(0),
        mappingKey: normalizeMappingKey(line.mappingKey),
        amountSource: line.amountSource,
      };
    })
    .filter(Boolean) as Array<{
    accountId: string;
    lineNumber: number;
    description: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    mappingKey: string | null;
    amountSource: PostingRuleAmountSource;
  }>;

  const debitTotal = postingLines
    .reduce((total, line) => total.plus(line.debit), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  const creditTotal = postingLines
    .reduce((total, line) => total.plus(line.credit), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  if (!debitTotal.eq(creditTotal)) {
    throw new BusinessRuleError(
      `Payroll posting rule ${rule.code} is not balanced: debit ${debitTotal.toFixed(2)} credit ${creditTotal.toFixed(2)}.`,
    );
  }

  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_RUN,
      sourceId: input.payrollRunId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
      idempotencyKey: `payroll-run:${input.payrollRunId}:posting`,
      metadata: safeJson({
        runNumber: input.runNumber,
        documentHash: input.documentHash,
        ...input.metadata,
      }),
    },
    tx,
  );

  const postedAt = new Date();
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      status: LedgerPostingBatchStatus.POSTED,
      postedAt,
      errorMessage: null,
    },
  });

  const journalEntry = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      journalId: journal.id,
      periodId: input.periodId,
      postingBatchId: postedBatch.id,
      entryNumber: await nextPayrollEntryNumber(
        tx,
        input.organizationId,
        input.entryDate,
      ),
      entryDate: input.entryDate,
      status: JournalEntryStatus.POSTED,
      currency: normalizeCurrency(input.currency),
      memo: `Payroll run ${input.runNumber}`,
      reference: input.runNumber,
      sourceType: AccountingSourceType.PAYROLL_RUN,
      sourceId: input.payrollRunId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
      postedAt,
      postedById: input.actorId,
      createdById: input.actorId,
      lines: {
        create: postingLines.map((line) => ({
          organizationId: input.organizationId,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: normalizeCurrency(input.currency),
          baseDebit: line.debit,
          baseCredit: line.credit,
          metadata: safeJson({
            mappingKey: line.mappingKey,
            amountSource: line.amountSource,
            payrollRunId: input.payrollRunId,
          }),
        })),
      },
    },
    include: { lines: true },
  });

  const sourceLink = await linkAccountingSource(
    {
      organizationId: input.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      sourceType: AccountingSourceType.PAYROLL_RUN,
      sourceId: input.payrollRunId,
      sourceNumber: input.runNumber,
      sourceDate: input.entryDate,
      metadata: safeJson({
        documentHash: input.documentHash,
        ...input.metadata,
      }),
    },
    tx,
  );

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "PAYROLL_RUN_POSTED",
      resourceType: "PayrollRun",
      resourceId: input.payrollRunId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      message: `Payroll run ${input.runNumber} posted`,
      metadata: safeJson({
        runNumber: input.runNumber,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
        ruleCode: rule.code,
        documentHash: input.documentHash,
      }),
    },
  });

  return {
    ledgerBatch: postedBatch,
    journalEntry,
    accountingSourceLinkId: sourceLink.id,
  };
}

async function createPayrollLedgerBlocker(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    periodId?: string | null;
    sourceType: AccountingSourceType;
    sourceId: string;
    postingPurpose: AccountingPostingPurpose;
    actorId?: string | null;
    documentHash?: string | null;
    blockerCode: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      idempotencyKey: `${input.sourceType}:${input.sourceId}:${input.postingPurpose}:blocked`,
      metadata: safeJson({
        blockerCode: input.blockerCode,
        documentHash: input.documentHash ?? null,
        details: input.metadata ?? null,
      }),
    },
    tx,
  );

  const blocked = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      status: LedgerPostingBatchStatus.FAILED,
      errorMessage: input.message,
      metadata: safeJson({
        blockerCode: input.blockerCode,
        documentHash: input.documentHash ?? null,
        details: input.metadata ?? null,
      }),
    },
  });

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: "PAYROLL_LEDGER_BLOCKED",
      resourceType: "LedgerPostingBatch",
      resourceId: blocked.id,
      postingBatchId: blocked.id,
      message: input.message,
      metadata: safeJson({
        blockerCode: input.blockerCode,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        postingPurpose: input.postingPurpose,
        documentHash: input.documentHash ?? null,
      }),
    },
  });

  return blocked;
}

async function nextPayrollPaymentBatchNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  paymentDate: Date,
) {
  const prefix = `PAYB-${compactDate(paymentDate)}`;
  const count = await tx.payrollPaymentBatch.count({
    where: {
      organizationId,
      batchNumber: { startsWith: prefix },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function createPayrollPaymentLedgerPosting(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    periodId: string;
    payrollPaymentBatchId: string;
    batchNumber: string;
    paymentDate: Date;
    actorId: string;
    currency: string;
    method: PaymentMethod;
    documentHash: string;
    amount: Prisma.Decimal;
    metadata: Record<string, unknown>;
  },
): Promise<PayrollPaymentPostingStatus> {
  const rule = await getActivePostingRule(
    input.organizationId,
    {
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      effectiveAt: input.paymentDate,
    },
    tx,
  );

  if (!rule) {
    const ledgerBatch = await createPayrollLedgerBlocker(tx, {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      actorId: input.actorId,
      documentHash: input.documentHash,
      blockerCode: "PAYROLL_PAYMENT_POSTING_RULE_MISSING",
      message:
        "Payroll payment release requires configured SYSCOHADA payroll payment posting rules.",
      metadata: safeJson(input.metadata),
    });

    return {
      ledgerBatch,
      ledgerStatus: "BLOCKED_PENDING_RULES",
      blockerCode: "PAYROLL_PAYMENT_POSTING_RULE_MISSING",
      blockerMessage: ledgerBatch.errorMessage,
    };
  }

  const journalType =
    input.method === PaymentMethod.CASH ? JournalType.CASH : JournalType.BANK;
  const journal = await tx.journal.findFirst({
    where: {
      organizationId: input.organizationId,
      type: journalType,
      isDefault: true,
      isActive: true,
    },
    select: { id: true, code: true },
  });

  if (!journal) {
    const message = `Payroll payment requires an active default ${journalType} journal.`;
    const ledgerBatch = await createPayrollLedgerBlocker(tx, {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      actorId: input.actorId,
      documentHash: input.documentHash,
      blockerCode: "PAYROLL_PAYMENT_DEFAULT_JOURNAL_MISSING",
      message,
      metadata: safeJson({ ...input.metadata, journalType }),
    });

    return {
      ledgerBatch,
      ledgerStatus: "BLOCKED_PENDING_RULES",
      blockerCode: "PAYROLL_PAYMENT_DEFAULT_JOURNAL_MISSING",
      blockerMessage: message,
    };
  }

  const mappingKeys = rule.lines
    .map((line) => normalizeMappingKey(line.mappingKey))
    .filter(Boolean) as string[];
  const mappedAccounts = mappingKeys.length
    ? await tx.chartOfAccount.findMany({
        where: {
          organizationId: input.organizationId,
          mappingKey: { in: Array.from(new Set(mappingKeys)) },
          deletedAt: null,
          isActive: true,
        },
        include: { _count: { select: { children: true } } },
      })
    : [];
  const accountByMapping = new Map(
    mappedAccounts.map((account) => [
      normalizeMappingKey(account.mappingKey),
      account,
    ]),
  );
  const amounts: PayrollPostingAmounts = {
    sourceAmount: input.amount,
    grossAmount: input.amount,
    netPayableAmount: input.amount,
    employeeDeductionAmount: new Prisma.Decimal(0),
    employerChargeAmount: new Prisma.Decimal(0),
  };

  const postingLines = rule.lines
    .filter((line) =>
      conditionMatches(line.condition, { paymentMethod: input.method }),
    )
    .map((line) => {
      const account =
        line.account ??
        accountByMapping.get(normalizeMappingKey(line.mappingKey));
      if (!account) {
        throw new BusinessRuleError(
          `Payroll payment rule ${rule.code} line ${line.lineNumber} does not resolve to an account.`,
        );
      }
      if (!account.isActive || account.deletedAt) {
        throw new BusinessRuleError(
          `Payroll payment rule ${rule.code} account ${account.code} is not active.`,
        );
      }
      const childCount =
        "_count" in account
          ? Number(
              (account as { _count?: { children?: number } })._count
                ?.children ?? 0,
            )
          : 0;
      if (childCount > 0) {
        throw new BusinessRuleError(
          `Payroll payment rule ${rule.code} account ${account.code} must be a leaf account.`,
        );
      }

      const amount = amountForSource(line.amountSource, amounts)
        .times(new Prisma.Decimal(line.multiplier ?? 1))
        .toDecimalPlaces(2);
      if (amount.lt(0)) {
        throw new BusinessRuleError(
          `Payroll payment rule ${rule.code} line ${line.lineNumber} produced a negative amount.`,
        );
      }
      if (amount.eq(0)) return null;

      return {
        accountId: account.id,
        lineNumber: line.lineNumber,
        description: line.description ?? `Payroll payment ${input.batchNumber}`,
        debit:
          line.side === PostingRuleLineSide.DEBIT
            ? amount
            : new Prisma.Decimal(0),
        credit:
          line.side === PostingRuleLineSide.CREDIT
            ? amount
            : new Prisma.Decimal(0),
        mappingKey: normalizeMappingKey(line.mappingKey),
        amountSource: line.amountSource,
      };
    })
    .filter(Boolean) as Array<{
    accountId: string;
    lineNumber: number;
    description: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    mappingKey: string | null;
    amountSource: PostingRuleAmountSource;
  }>;

  const debitTotal = postingLines
    .reduce((total, line) => total.plus(line.debit), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  const creditTotal = postingLines
    .reduce((total, line) => total.plus(line.credit), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  if (postingLines.length === 0 || !debitTotal.eq(creditTotal)) {
    const message = `Payroll payment rule ${rule.code} is not balanced for ${input.method}: debit ${debitTotal.toFixed(2)} credit ${creditTotal.toFixed(2)}.`;
    const ledgerBatch = await createPayrollLedgerBlocker(tx, {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      actorId: input.actorId,
      documentHash: input.documentHash,
      blockerCode: "PAYROLL_PAYMENT_POSTING_UNBALANCED",
      message,
      metadata: safeJson({
        ...input.metadata,
        method: input.method,
        ruleCode: rule.code,
      }),
    });

    return {
      ledgerBatch,
      ledgerStatus: "BLOCKED_PENDING_RULES",
      blockerCode: "PAYROLL_PAYMENT_POSTING_UNBALANCED",
      blockerMessage: message,
    };
  }

  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      idempotencyKey: `payroll-payment:${input.payrollPaymentBatchId}:posting`,
      metadata: safeJson({
        batchNumber: input.batchNumber,
        documentHash: input.documentHash,
        ...input.metadata,
      }),
    },
    tx,
  );

  const postedAt = new Date();
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      status: LedgerPostingBatchStatus.POSTED,
      postedAt,
      errorMessage: null,
    },
  });

  const journalEntry = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      journalId: journal.id,
      periodId: input.periodId,
      postingBatchId: postedBatch.id,
      entryNumber: await nextPayrollEntryNumber(
        tx,
        input.organizationId,
        input.paymentDate,
      ),
      entryDate: input.paymentDate,
      status: JournalEntryStatus.POSTED,
      currency: normalizeCurrency(input.currency),
      memo: `Payroll payment ${input.batchNumber}`,
      reference: input.batchNumber,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      postedAt,
      postedById: input.actorId,
      createdById: input.actorId,
      lines: {
        create: postingLines.map((line) => ({
          organizationId: input.organizationId,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: normalizeCurrency(input.currency),
          baseDebit: line.debit,
          baseCredit: line.credit,
          metadata: safeJson({
            mappingKey: line.mappingKey,
            amountSource: line.amountSource,
            payrollPaymentBatchId: input.payrollPaymentBatchId,
          }),
        })),
      },
    },
    include: { lines: true },
  });

  const sourceLink = await linkAccountingSource(
    {
      organizationId: input.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      sourceNumber: input.batchNumber,
      sourceDate: input.paymentDate,
      metadata: safeJson({
        documentHash: input.documentHash,
        method: input.method,
        ...input.metadata,
      }),
    },
    tx,
  );

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "PAYROLL_PAYMENT_POSTED",
      resourceType: "PayrollPaymentBatch",
      resourceId: input.payrollPaymentBatchId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      message: `Payroll payment ${input.batchNumber} posted`,
      metadata: safeJson({
        batchNumber: input.batchNumber,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
        ruleCode: rule.code,
        documentHash: input.documentHash,
      }),
    },
  });

  return {
    ledgerBatch: postedBatch,
    ledgerStatus: "POSTED",
    journalEntryId: journalEntry.id,
    accountingSourceLinkId: sourceLink.id,
  };
}

async function queueOutboundPayrollPaymentReconciliation(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    payrollPaymentBatchId: string;
    batchNumber: string;
    payrollRunId: string;
    amount: Prisma.Decimal;
    currency: string;
    paymentDate: Date;
    method: PaymentMethod;
    ledgerPostingBatchId: string;
    ledgerStatus: PayrollPaymentPostingStatus["ledgerStatus"];
    evidenceHash?: string | null;
    documentHash?: string | null;
  },
) {
  const idempotencyKey = `payroll-payment:${input.payrollPaymentBatchId}:outbound`;
  const payload = {
    payrollPaymentBatchId: input.payrollPaymentBatchId,
    batchNumber: input.batchNumber,
    payrollRunId: input.payrollRunId,
    amount: input.amount.toFixed(2),
    currency: input.currency,
    method: input.method,
    paymentDate: input.paymentDate.toISOString(),
    ledgerPostingBatchId: input.ledgerPostingBatchId,
    ledgerStatus: input.ledgerStatus,
  };
  const payloadHash = prefixedHash(payload);

  const paymentTransaction =
    (await tx.paymentTransaction.findFirst({
      where: {
        organizationId: input.organizationId,
        idempotencyKey,
      },
    })) ||
    (await tx.paymentTransaction.create({
      data: {
        organizationId: input.organizationId,
        ledgerPostingBatchId: input.ledgerPostingBatchId,
        direction: PaymentDirection.OUTBOUND,
        state:
          input.ledgerStatus === "POSTED"
            ? PaymentTransactionState.PENDING
            : PaymentTransactionState.SUSPENSE,
        amount: input.amount,
        currencyCode: normalizeCurrency(input.currency),
        providerReference: input.batchNumber,
        idempotencyKey,
        sourceType: "PAYROLL_PAYMENT",
        sourceId: input.payrollPaymentBatchId,
        payloadHash,
        occurredAt: input.paymentDate,
        metadata: safeJson({
          payrollRunId: input.payrollRunId,
          method: input.method,
          evidenceHash: input.evidenceHash ?? null,
          documentHash: input.documentHash ?? null,
          ledgerStatus: input.ledgerStatus,
        }),
      },
    }));

  const exceptionType =
    input.ledgerStatus === "POSTED"
      ? PaymentExceptionType.MISSING_STATEMENT_LINE
      : PaymentExceptionType.SUSPENSE_POSTING_BLOCKED;
  const reconciliationStatus =
    input.ledgerStatus === "POSTED"
      ? "AWAITING_STATEMENT_MATCH"
      : "LEDGER_BLOCKED";

  const paymentException =
    (await tx.paymentException.findFirst({
      where: {
        organizationId: input.organizationId,
        paymentTransactionId: paymentTransaction.id,
        type: exceptionType,
        status: {
          notIn: [
            PaymentExceptionStatus.RESOLVED,
            PaymentExceptionStatus.DISMISSED,
          ],
        },
      },
    })) ||
    (await tx.paymentException.create({
      data: {
        organizationId: input.organizationId,
        paymentTransactionId: paymentTransaction.id,
        type: exceptionType,
        severity:
          input.ledgerStatus === "POSTED"
            ? ExceptionSeverity.MEDIUM
            : ExceptionSeverity.HIGH,
        status: PaymentExceptionStatus.OPEN,
        sourceType: "PAYROLL_PAYMENT",
        sourceId: input.payrollPaymentBatchId,
        evidence: safeJson(payload),
        correlationId: input.payrollPaymentBatchId,
        metadata: safeJson({
          reconciliationStatus,
          payrollRunId: input.payrollRunId,
          batchNumber: input.batchNumber,
          method: input.method,
          ledgerPostingBatchId: input.ledgerPostingBatchId,
        }),
      },
    }));

  return {
    paymentTransaction,
    paymentException,
    reconciliationStatus,
    payloadHash,
  };
}

export async function createPayrollPeriod(
  input: CreatePayrollPeriodInput,
  client: DbClient = db,
) {
  const parsed = createPayrollPeriodInputSchema.parse(input);
  const periodStart = parseDate(parsed.periodStart);
  const periodEnd = parseDate(parsed.periodEnd);
  const payDate = parseDate(parsed.payDate);

  if (periodEnd < periodStart) {
    throw new BusinessRuleError(
      "Payroll period end date must be on or after the start date.",
    );
  }

  return inTransaction(client, async (tx) => {
    const existing = await tx.payrollPeriod.findFirst({
      where: {
        organizationId: parsed.organizationId,
        periodStart,
        periodEnd,
      },
    });
    if (existing) return { payrollPeriod: existing, created: false };

    const countryPack = await resolvePayrollCountryPackStatus(tx, {
      organizationId: parsed.organizationId,
      countryCode: parsed.countryCode,
      effectiveAt: payDate,
    });

    const payrollPeriod = await tx.payrollPeriod.create({
      data: {
        organizationId: parsed.organizationId,
        accountingPeriodId: parsed.accountingPeriodId ?? null,
        name: parsed.name,
        frequency: parsed.frequency,
        periodStart,
        periodEnd,
        payDate,
        status: PayrollPeriodStatus.OPEN,
        countryCode: countryPack.countryCode,
        countryPackVersion: countryPack.countryPackVersion,
        countryPackSchemaVersion: countryPack.countryPackSchemaVersion,
        countryPackResolutionHash: countryPack.countryPackResolutionHash,
        countryPackCapabilityStatus: countryPack.countryPackCapabilityStatus,
        metadata: safeJson({
          gate: "012-payroll-presence-engine",
          ruleProvenance: countryPack,
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
    });

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollPeriod",
      entityId: payrollPeriod.id,
      action: "PAYROLL_PERIOD_CREATED",
      actorId: parsed.actorId,
      changes: safeJson({
        after: {
          name: payrollPeriod.name,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          countryPackVersion: countryPack.countryPackVersion,
          countryPackResolutionHash: countryPack.countryPackResolutionHash,
        },
      }),
    });

    return { payrollPeriod, created: true };
  });
}

export async function freezeAttendanceSnapshot(
  input: FreezeAttendanceSnapshotInput,
  client: DbClient = db,
) {
  const parsed = freezeAttendanceSnapshotInputSchema.parse(input);
  const sourceHash = prefixedHash({
    employeeId: parsed.employeeId,
    scheduledMinutes: parsed.scheduledMinutes,
    workedMinutes: parsed.workedMinutes,
    overtimeMinutes: parsed.overtimeMinutes,
    absenceMinutes: parsed.absenceMinutes,
    leaveMinutes: parsed.leaveMinutes,
    sourcePayload: parsed.sourcePayload,
  });

  return inTransaction(client, async (tx) => {
    const period = await tx.payrollPeriod.findFirst({
      where: {
        id: parsed.payrollPeriodId,
        organizationId: parsed.organizationId,
      },
    });
    if (!period) throw new NotFoundError("Payroll period not found");
    if (
      period.status === PayrollPeriodStatus.CLOSED ||
      period.status === PayrollPeriodStatus.POSTED
    ) {
      throw new BusinessRuleError(
        "Payroll attendance cannot be frozen for a closed or posted payroll period.",
      );
    }

    const employee = await tx.payrollEmployee.findFirst({
      where: {
        id: parsed.employeeId,
        organizationId: parsed.organizationId,
        status: PayrollEmployeeStatus.ACTIVE,
        deletedAt: null,
      },
    });
    if (!employee)
      throw new BusinessRuleError(
        "Attendance can only be frozen for an active payroll employee.",
      );

    const existing = await tx.payrollAttendanceSnapshot.findFirst({
      where: {
        organizationId: parsed.organizationId,
        payrollPeriodId: period.id,
        employeeId: parsed.employeeId,
        status: PayrollAttendanceSnapshotStatus.FROZEN,
      },
    });
    if (existing) {
      if (existing.sourceHash !== sourceHash) {
        throw new ConflictError(
          "Attendance snapshot replay changed the source payload.",
        );
      }
      return {
        attendanceSnapshot: existing,
        created: false,
        businessEventId: null,
      };
    }

    const now = new Date();
    const attendanceSnapshot = await tx.payrollAttendanceSnapshot.create({
      data: {
        organizationId: parsed.organizationId,
        payrollPeriodId: period.id,
        employeeId: parsed.employeeId,
        status: PayrollAttendanceSnapshotStatus.FROZEN,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        scheduledMinutes: parsed.scheduledMinutes,
        workedMinutes: parsed.workedMinutes,
        overtimeMinutes: parsed.overtimeMinutes,
        absenceMinutes: parsed.absenceMinutes,
        leaveMinutes: parsed.leaveMinutes,
        sourceHash,
        frozenById: parsed.frozenById,
        frozenAt: now,
        metadata: safeJson({
          gate: "012-payroll-presence-engine",
          idempotencyKey: parsed.idempotencyKey ?? null,
          sourcePayload: parsed.sourcePayload,
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
    });

    await tx.payrollPeriod.update({
      where: { id: period.id },
      data: {
        status: PayrollPeriodStatus.INPUTS_LOCKED,
        inputLockedAt: period.inputLockedAt ?? now,
        inputLockedById: period.inputLockedById ?? parsed.frozenById,
      },
    });

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "attendance.period.frozen",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey:
          parsed.idempotencyKey ?? `attendance-freeze:${attendanceSnapshot.id}`,
        payload: {
          payrollPeriodId: period.id,
          attendanceSnapshotId: attendanceSnapshot.id,
          employeeId: employee.id,
          sourceHash,
          scheduledMinutes: parsed.scheduledMinutes,
          workedMinutes: parsed.workedMinutes,
          overtimeMinutes: parsed.overtimeMinutes,
          absenceMinutes: parsed.absenceMinutes,
          leaveMinutes: parsed.leaveMinutes,
        },
        occurredAt: now,
        actorId: parsed.frozenById,
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: attendanceSnapshot.id,
        documentHash: sourceHash,
        metadata: {
          gate: "012-payroll-presence-engine",
          payrollPeriodId: period.id,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "attendance_snapshot.frozen",
            destination: "payroll",
            payload: {
              severity: "info",
              payrollPeriodId: period.id,
              attendanceSnapshotId: attendanceSnapshot.id,
              employeeId: employee.id,
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollAttendanceSnapshot",
      entityId: attendanceSnapshot.id,
      action: "PAYROLL_ATTENDANCE_SNAPSHOT_FROZEN",
      actorId: parsed.frozenById,
      changes: safeJson({
        after: {
          payrollPeriodId: period.id,
          employeeId: employee.id,
          sourceHash,
          businessEventId: eventResult.event.id,
        },
      }),
    });

    return {
      attendanceSnapshot,
      created: true,
      businessEventId: eventResult.event.id,
    };
  });
}

export async function calculatePayrollRun(
  input: CalculatePayrollRunInput,
  client: DbClient = db,
) {
  const parsed = calculatePayrollRunInputSchema.parse(input);
  const runDate = parseDate(parsed.runDate);
  const idempotencyPayloadHash = prefixedHash({
    operation: "calculatePayrollRun",
    payrollPeriodId: parsed.payrollPeriodId,
    runType: parsed.runType,
    employeeIds: [...(parsed.employeeIds ?? [])].sort(),
  });

  return inTransaction(client, async (tx) => {
    const existing = await tx.payrollRun.findFirst({
      where: {
        organizationId: parsed.organizationId,
        idempotencyKey: parsed.idempotencyKey,
        deletedAt: null,
      },
      include: { lines: true },
    });
    if (existing) {
      assertIdempotencyPayloadMatches(
        existing.metadata,
        idempotencyPayloadHash,
        "Payroll run calculation idempotency key was reused with a different payload.",
      );
      return {
        payrollRun: existing,
        created: false,
        businessEventId: existing.postedBusinessEventId,
      };
    }

    const period = await tx.payrollPeriod.findFirst({
      where: {
        id: parsed.payrollPeriodId,
        organizationId: parsed.organizationId,
      },
    });
    if (!period) throw new NotFoundError("Payroll period not found");
    if (
      period.status !== PayrollPeriodStatus.OPEN &&
      period.status !== PayrollPeriodStatus.INPUTS_LOCKED &&
      period.status !== PayrollPeriodStatus.CALCULATED
    ) {
      throw new BusinessRuleError(
        "Payroll run can only be calculated for an open or input-locked period.",
      );
    }

    const countryPack = await resolvePayrollCountryPackStatus(tx, {
      organizationId: parsed.organizationId,
      countryCode: period.countryCode,
      effectiveAt: period.payDate,
    });

    const employees = await tx.payrollEmployee.findMany({
      where: {
        organizationId: parsed.organizationId,
        status: PayrollEmployeeStatus.ACTIVE,
        deletedAt: null,
        ...(parsed.employeeIds ? { id: { in: parsed.employeeIds } } : {}),
      },
      include: {
        contracts: {
          where: {
            organizationId: parsed.organizationId,
            status: "ACTIVE",
            deletedAt: null,
            effectiveFrom: { lte: period.periodEnd },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: period.periodStart } },
            ],
          },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
        attendanceSnapshots: {
          where: {
            organizationId: parsed.organizationId,
            payrollPeriodId: period.id,
            status: PayrollAttendanceSnapshotStatus.FROZEN,
          },
          orderBy: { frozenAt: "desc" },
          take: 1,
        },
      },
    });

    if (employees.length === 0) {
      throw new BusinessRuleError(
        "Payroll calculation requires at least one active employee.",
      );
    }

    const pensionRates = countryPack.pensionRates.value ?? {};
    const familyAllowanceRates = countryPack.familyAllowanceRates.value ?? {};
    const occupationalRiskRates = countryPack.occupationalRiskRates.value ?? {};
    const employeeRateBps = Number(pensionRates.employee ?? 0);
    const employerPensionRateBps = Number(pensionRates.employer ?? 0);
    const familyAllowanceRateBps = familyAllowanceRateForSector(
      familyAllowanceRates,
      countryPack.cnpsFamilyAllowanceSector,
    );
    const occupationalRiskRateBps = occupationalRiskRateForGroup(
      occupationalRiskRates,
      countryPack.cnpsOccupationalRiskGroup,
    );
    const monthlyCeiling = pensionRates.monthlyCeilingMinorUnits
      ? new Prisma.Decimal(pensionRates.monthlyCeilingMinorUnits)
      : null;

    let grossAmount = new Prisma.Decimal(0);
    let employeeDeductionAmount = new Prisma.Decimal(0);
    let employerChargeAmount = new Prisma.Decimal(0);
    const runLines = employees.map((employee) => {
      const contract = employee.contracts[0];
      const attendance = employee.attendanceSnapshots[0];
      if (!contract)
        throw new BusinessRuleError(
          `Employee ${employee.displayName} has no active payroll contract.`,
        );
      if (!attendance)
        throw new BusinessRuleError(
          `Employee ${employee.displayName} has no frozen attendance snapshot.`,
        );

      const baseSalary = decimal2(contract.baseSalary);
      if (baseSalary.lte(0))
        throw new BusinessRuleError(
          `Employee ${employee.displayName} has an invalid base salary.`,
        );

      const scheduledMinutes = Math.max(
        0,
        Number(attendance.scheduledMinutes ?? 0),
      );
      const paidMinutes = Math.max(
        0,
        Number(attendance.workedMinutes ?? 0) +
          Number(attendance.leaveMinutes ?? 0),
      );
      const attendanceRatio =
        scheduledMinutes > 0 ? Math.min(1, paidMinutes / scheduledMinutes) : 1;
      const lineGross = baseSalary.times(attendanceRatio).toDecimalPlaces(2);
      const socialBase =
        monthlyCeiling && lineGross.gt(monthlyCeiling)
          ? monthlyCeiling
          : lineGross;
      const employeePensionContribution = socialBase
        .times(employeeRateBps)
        .div(10000)
        .toDecimalPlaces(2);
      const employerPensionContribution = socialBase
        .times(employerPensionRateBps)
        .div(10000)
        .toDecimalPlaces(2);
      const familyAllowanceContribution = socialBase
        .times(familyAllowanceRateBps)
        .div(10000)
        .toDecimalPlaces(2);
      const occupationalRiskContribution = socialBase
        .times(occupationalRiskRateBps)
        .div(10000)
        .toDecimalPlaces(2);
      const employeeDeduction = employeePensionContribution;
      const employerCharge = employerPensionContribution
        .plus(familyAllowanceContribution)
        .plus(occupationalRiskContribution)
        .toDecimalPlaces(2);
      const netPayable = lineGross.minus(employeeDeduction).toDecimalPlaces(2);

      grossAmount = grossAmount.plus(lineGross).toDecimalPlaces(2);
      employeeDeductionAmount = employeeDeductionAmount
        .plus(employeeDeduction)
        .toDecimalPlaces(2);
      employerChargeAmount = employerChargeAmount
        .plus(employerCharge)
        .toDecimalPlaces(2);

      const anomalyFlags = [
        ...(Number(attendance.overtimeMinutes ?? 0) > 0
          ? ["OVERTIME_POLICY_REVIEW_REQUIRED"]
          : []),
        ...(employee.paymentDestinationHash
          ? []
          : ["PAYMENT_DESTINATION_MISSING"]),
        ...(asRecord(countryPack.employerRules.value)
          .payrollBaseRequiresCnpsReview
          ? ["PAYROLL_BASE_REQUIRES_CNPS_REVIEW"]
          : []),
      ];

      const ruleProvenance = {
        countryCode: countryPack.countryCode,
        pensionRates: countryPack.pensionRates,
        familyAllowanceRates: countryPack.familyAllowanceRates,
        occupationalRiskRates: countryPack.occupationalRiskRates,
        employerRules: countryPack.employerRules,
        cnpsFamilyAllowanceSector: countryPack.cnpsFamilyAllowanceSector,
        cnpsOccupationalRiskGroup: countryPack.cnpsOccupationalRiskGroup,
        packVersion: countryPack.countryPackVersion,
        schemaVersion: countryPack.countryPackSchemaVersion,
        resolutionHash: countryPack.countryPackResolutionHash,
      };
      const calculationSnapshot = {
        employeeId: employee.id,
        contractId: contract.id,
        attendanceSnapshotId: attendance.id,
        baseSalary: baseSalary.toFixed(2),
        attendanceRatio,
        scheduledMinutes,
        paidMinutes,
        grossAmount: lineGross.toFixed(2),
        socialBaseAmount: socialBase.toFixed(2),
        employeePensionContributionAmount:
          employeePensionContribution.toFixed(2),
        employerPensionContributionAmount:
          employerPensionContribution.toFixed(2),
        familyAllowanceContributionAmount:
          familyAllowanceContribution.toFixed(2),
        occupationalRiskContributionAmount:
          occupationalRiskContribution.toFixed(2),
        employeeDeductionAmount: employeeDeduction.toFixed(2),
        employerChargeAmount: employerCharge.toFixed(2),
        netPayableAmount: netPayable.toFixed(2),
        currency: normalizeCurrency(contract.currency),
        anomalyFlags,
      };

      return {
        organizationId: parsed.organizationId,
        employeeId: employee.id,
        contractId: contract.id,
        attendanceSnapshotId: attendance.id,
        grossAmount: lineGross,
        taxableBaseAmount: lineGross,
        socialBaseAmount: socialBase,
        employeeDeductionAmount: employeeDeduction,
        employerChargeAmount: employerCharge,
        netPayableAmount: netPayable,
        currency: normalizeCurrency(contract.currency),
        calculationSnapshot: safeJson(calculationSnapshot),
        ruleProvenance: safeJson(ruleProvenance),
        anomalyFlags: anomalyFlags.length ? safeJson(anomalyFlags) : undefined,
        documentHash: prefixedHash(calculationSnapshot),
        metadata: safeJson({ gate: "012-payroll-presence-engine" }),
      };
    });
    const netPayableAmount = grossAmount
      .minus(employeeDeductionAmount)
      .toDecimalPlaces(2);
    const runNumber = await nextPayrollRunNumber(
      tx,
      parsed.organizationId,
      runDate,
    );
    const attendanceSnapshotHash = prefixedHash(
      runLines.map((line) => line.attendanceSnapshotId).sort(),
    );
    const calculationHash = prefixedHash(
      runLines.map((line) => line.calculationSnapshot),
    );
    const ruleSetHash = prefixedHash(
      runLines.map((line) => line.ruleProvenance),
    );
    const documentHash = prefixedHash({
      runNumber,
      payrollPeriodId: period.id,
      grossAmount: grossAmount.toFixed(2),
      employeeDeductionAmount: employeeDeductionAmount.toFixed(2),
      employerChargeAmount: employerChargeAmount.toFixed(2),
      netPayableAmount: netPayableAmount.toFixed(2),
      calculationHash,
      ruleSetHash,
      attendanceSnapshotHash,
    });

    const payrollRun = await tx.payrollRun.create({
      data: {
        organizationId: parsed.organizationId,
        payrollPeriodId: period.id,
        runNumber,
        runType: parsed.runType,
        status: PayrollRunStatus.CALCULATED,
        countryCode: countryPack.countryCode,
        countryPackVersion: countryPack.countryPackVersion,
        countryPackSchemaVersion: countryPack.countryPackSchemaVersion,
        countryPackResolutionHash: countryPack.countryPackResolutionHash,
        countryPackCapabilityStatus: countryPack.countryPackCapabilityStatus,
        ruleSetHash,
        calculationHash,
        attendanceSnapshotHash,
        grossAmount,
        employeeDeductionAmount,
        employerChargeAmount,
        netPayableAmount,
        currency: normalizeCurrency(runLines[0]?.currency),
        idempotencyKey: parsed.idempotencyKey,
        documentHash,
        evidenceHash: documentHash,
        preparedById: parsed.preparedById,
        metadata: safeJson({
          gate: "012-payroll-presence-engine",
          idempotencyPayloadHash,
          countryPackStatus: countryPack,
          requestedMetadata: parsed.metadata ?? null,
        }),
        lines: {
          create: runLines,
        },
      },
      include: { lines: true },
    });

    await tx.payrollPeriod.update({
      where: { id: period.id },
      data: { status: PayrollPeriodStatus.CALCULATED },
    });

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.run.calculated",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey: `payroll-run-calculated:${parsed.idempotencyKey}`,
        payload: {
          payrollRunId: payrollRun.id,
          payrollPeriodId: period.id,
          runNumber: payrollRun.runNumber,
          grossAmount: grossAmount.toFixed(2),
          employeeDeductionAmount: employeeDeductionAmount.toFixed(2),
          employerChargeAmount: employerChargeAmount.toFixed(2),
          netPayableAmount: netPayableAmount.toFixed(2),
          countryPackVersion: countryPack.countryPackVersion,
          countryPackResolutionHash: countryPack.countryPackResolutionHash,
          calculationHash,
          attendanceSnapshotHash,
        },
        occurredAt: runDate,
        actorId: parsed.preparedById,
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: payrollRun.id,
        documentHash,
        metadata: {
          gate: "012-payroll-presence-engine",
          payrollPeriodId: period.id,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_run.calculated",
            destination: "payroll",
            payload: {
              severity: "warning",
              payrollRunId: payrollRun.id,
              payrollPeriodId: period.id,
              runNumber: payrollRun.runNumber,
              actionRequired: "REVIEW_AND_APPROVE",
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollRun",
      entityId: payrollRun.id,
      action: "PAYROLL_RUN_CALCULATED",
      actorId: parsed.preparedById,
      changes: safeJson({
        after: {
          runNumber: payrollRun.runNumber,
          grossAmount: grossAmount.toFixed(2),
          netPayableAmount: netPayableAmount.toFixed(2),
          businessEventId: eventResult.event.id,
        },
      }),
    });

    return { payrollRun, created: true, businessEventId: eventResult.event.id };
  });
}

export async function approveAndPostPayrollRun(
  input: ApproveAndPostPayrollRunInput,
  client: DbClient = db,
) {
  const parsed = approveAndPostPayrollRunInputSchema.parse(input);
  const approvedAt = parseDate(parsed.now);
  const approvalPayloadHash = prefixedHash({
    operation: "approveAndPostPayrollRun",
    payrollRunId: parsed.payrollRunId,
    approvedById: parsed.approvedById,
  });

  return inTransaction(client, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: {
        id: parsed.payrollRunId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      include: {
        payrollPeriod: true,
        lines: {
          include: {
            employee: true,
          },
          orderBy: { createdAt: "asc" },
        },
        payslips: true,
      },
    });
    if (!run) throw new NotFoundError("Payroll run not found");

    if (run.status === PayrollRunStatus.POSTED) {
      assertIdempotencyPayloadMatches(
        run.metadata,
        approvalPayloadHash,
        "Payroll run approval idempotency key was reused with a different payload.",
      );
      return {
        payrollRun: run,
        ledgerPostingBatchId: run.ledgerPostingBatchId,
        businessEventId: run.postedBusinessEventId,
        ledgerStatus: "IDEMPOTENT_REPLAY" as const,
      };
    }

    if (
      run.status !== PayrollRunStatus.CALCULATED &&
      run.status !== PayrollRunStatus.REVIEWED
    ) {
      throw new BusinessRuleError(
        "Only calculated or reviewed payroll runs can be approved and posted.",
      );
    }
    if (run.lines.length === 0)
      throw new BusinessRuleError(
        "Payroll run has no calculated employee lines.",
      );

    const controlDecision = evaluateSensitiveAction({
      action: "payroll.run.approve",
      actorId: parsed.approvedById,
      organizationId: parsed.organizationId,
      actorPermissions: parsed.actorPermissions,
      lastAuthAt: parsed.lastAuthAt,
      now: approvedAt,
      resourceType: "PayrollRun",
      resourceId: run.id,
      subjectActorId: run.preparedById,
      amount: run.netPayableAmount,
      currency: run.currency,
      metadata: {
        runNumber: run.runNumber,
        payrollPeriodId: run.payrollPeriodId,
      },
    });
    await auditSensitiveActionDecision(tx, controlDecision);
    assertSensitiveActionAllowed(controlDecision);

    const accountingPeriod = await getOpenPeriodForDate(
      parsed.organizationId,
      run.payrollPeriod.payDate,
      tx,
    );
    const documentHash =
      parsed.documentHash ??
      run.documentHash ??
      prefixedHash({
        payrollRunId: run.id,
        calculationHash: run.calculationHash,
      });

    const postingResult = await createPayrollLedgerPosting(tx, {
      organizationId: parsed.organizationId,
      periodId: accountingPeriod.id,
      payrollRunId: run.id,
      runNumber: run.runNumber,
      entryDate: run.payrollPeriod.payDate,
      actorId: parsed.approvedById,
      currency: run.currency,
      documentHash,
      amounts: {
        sourceAmount: decimal2(run.netPayableAmount),
        grossAmount: decimal2(run.grossAmount),
        employeeDeductionAmount: decimal2(run.employeeDeductionAmount),
        employerChargeAmount: decimal2(run.employerChargeAmount),
        netPayableAmount: decimal2(run.netPayableAmount),
      },
      metadata: {
        payrollPeriodId: run.payrollPeriodId,
        runNumber: run.runNumber,
        countryPackVersion: run.countryPackVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
      },
    });

    const payslips = [];
    for (const [index, line] of run.lines.entries()) {
      const payslipNumber = `${run.runNumber}-${String(index + 1).padStart(4, "0")}`;
      const payslipHash = prefixedHash({
        payslipNumber,
        payrollRunId: run.id,
        runLineId: line.id,
        employeeId: line.employeeId,
        grossAmount: decimal2(line.grossAmount).toFixed(2),
        employeeDeductionAmount: decimal2(line.employeeDeductionAmount).toFixed(
          2,
        ),
        employerChargeAmount: decimal2(line.employerChargeAmount).toFixed(2),
        netPayableAmount: decimal2(line.netPayableAmount).toFixed(2),
        ruleSetHash: run.ruleSetHash,
      });
      const payslip = await tx.payrollPayslip.create({
        data: {
          organizationId: parsed.organizationId,
          payrollRunId: run.id,
          runLineId: line.id,
          employeeId: line.employeeId,
          payslipNumber,
          status: PayrollPayslipStatus.EMITTED,
          issuedAt: approvedAt,
          countryCode: run.countryCode,
          countryPackVersion: run.countryPackVersion,
          countryPackSchemaVersion: run.countryPackSchemaVersion,
          countryPackResolutionHash: run.countryPackResolutionHash,
          ruleSetHash: run.ruleSetHash,
          grossAmount: line.grossAmount,
          employeeDeductionAmount: line.employeeDeductionAmount,
          employerChargeAmount: line.employerChargeAmount,
          netPayableAmount: line.netPayableAmount,
          currency: line.currency,
          documentHash: payslipHash,
          metadata: safeJson({
            gate: "012-payroll-presence-engine",
            payrollRunId: run.id,
            runLineId: line.id,
            employeeNumber: line.employee?.employeeNumber ?? null,
          }),
          lines: {
            create: [
              {
                organizationId: parsed.organizationId,
                lineNumber: 1,
                code: "GROSS",
                label: "Gross pay",
                category: PayrollPayslipLineCategory.EARNING,
                amount: line.grossAmount,
                currency: line.currency,
                sourceType: "PayrollRunLine",
                sourceId: line.id,
              },
              {
                organizationId: parsed.organizationId,
                lineNumber: 2,
                code: "EMPLOYEE_DEDUCTION",
                label: "Employee deductions",
                category: PayrollPayslipLineCategory.EMPLOYEE_DEDUCTION,
                amount: line.employeeDeductionAmount,
                currency: line.currency,
                sourceType: "PayrollRunLine",
                sourceId: line.id,
              },
              {
                organizationId: parsed.organizationId,
                lineNumber: 3,
                code: "EMPLOYER_CHARGE",
                label: "Employer charges",
                category: PayrollPayslipLineCategory.EMPLOYER_CHARGE,
                amount: line.employerChargeAmount,
                currency: line.currency,
                sourceType: "PayrollRunLine",
                sourceId: line.id,
              },
              {
                organizationId: parsed.organizationId,
                lineNumber: 4,
                code: "NET_PAYABLE",
                label: "Net payable",
                category: PayrollPayslipLineCategory.INFORMATION,
                amount: line.netPayableAmount,
                currency: line.currency,
                sourceType: "PayrollRunLine",
                sourceId: line.id,
              },
            ],
          },
        },
      });
      payslips.push(payslip);
    }

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.run.posted",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey: parsed.idempotencyKey ?? `payroll-run-posted:${run.id}`,
        payload: {
          payrollRunId: run.id,
          payrollPeriodId: run.payrollPeriodId,
          runNumber: run.runNumber,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntry.id,
          accountingSourceLinkId: postingResult.accountingSourceLinkId,
          payslipIds: payslips.map((payslip) => payslip.id),
          grossAmount: decimal2(run.grossAmount).toFixed(2),
          employeeDeductionAmount: decimal2(
            run.employeeDeductionAmount,
          ).toFixed(2),
          employerChargeAmount: decimal2(run.employerChargeAmount).toFixed(2),
          netPayableAmount: decimal2(run.netPayableAmount).toFixed(2),
          countryPackVersion: run.countryPackVersion,
          countryPackResolutionHash: run.countryPackResolutionHash,
        },
        occurredAt: approvedAt,
        actorId: parsed.approvedById,
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: run.id,
        postingBatchId: postingResult.ledgerBatch.id,
        documentHash,
        metadata: {
          gate: "012-payroll-presence-engine",
          approvalPayloadHash,
          requestedMetadata: parsed.metadata ?? null,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_run.posted",
            destination: "accounting",
            payload: {
              severity: "info",
              payrollRunId: run.id,
              runNumber: run.runNumber,
              ledgerPostingBatchId: postingResult.ledgerBatch.id,
              journalEntryId: postingResult.journalEntry.id,
            },
          },
          {
            channel: "NOTIFICATION",
            eventName: "payslips.emitted",
            destination: "payroll",
            payload: {
              severity: "info",
              payrollRunId: run.id,
              payslipCount: payslips.length,
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    const updatedRun = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: PayrollRunStatus.POSTED,
        approvedById: parsed.approvedById,
        emittedById: parsed.approvedById,
        postedById: parsed.approvedById,
        approvedAt,
        emittedAt: approvedAt,
        postedAt: approvedAt,
        ledgerPostingBatchId: postingResult.ledgerBatch.id,
        journalEntryId: postingResult.journalEntry.id,
        accountingSourceLinkId: postingResult.accountingSourceLinkId,
        postedBusinessEventId: eventResult.event.id,
        documentHash,
        metadata: safeJson({
          ...asRecord(run.metadata),
          approvalPayloadHash,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntry.id,
          businessEventId: eventResult.event.id,
          gate: "012-payroll-presence-engine",
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
      include: {
        lines: true,
        payslips: true,
      },
    });

    await tx.payrollPeriod.update({
      where: { id: run.payrollPeriodId },
      data: {
        status: PayrollPeriodStatus.POSTED,
        approvedAt,
        approvedById: parsed.approvedById,
      },
    });

    await recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      parsed.organizationId,
      {
        sourceCode: "PAYROLL_RUN_POSTED",
        sourceId: run.id,
        periodId: accountingPeriod.id,
        periodStart: run.payrollPeriod.payDate,
        periodEnd: run.payrollPeriod.payDate,
        staleReason: "Payroll run posting changed certified close evidence.",
        newEvidenceHash: documentHash,
        correlationId: parsed.idempotencyKey ?? eventResult.event.id,
      },
      {
        actorId: parsed.approvedById,
        now: approvedAt,
      },
    );

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollRun",
      entityId: run.id,
      action: "PAYROLL_RUN_APPROVED_AND_POSTED",
      actorId: parsed.approvedById,
      changes: safeJson({
        before: { status: run.status },
        after: {
          status: PayrollRunStatus.POSTED,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntry.id,
          businessEventId: eventResult.event.id,
          payslipCount: payslips.length,
        },
      }),
    });

    return {
      payrollRun: updatedRun,
      ledgerPostingBatchId: postingResult.ledgerBatch.id,
      businessEventId: eventResult.event.id,
      ledgerStatus: "POSTED" as const,
    };
  });
}

export async function releasePayrollPaymentBatch(
  input: ReleasePayrollPaymentBatchInput,
  client: DbClient = db,
) {
  const parsed = releasePayrollPaymentBatchInputSchema.parse(input);
  const paymentDate = parseDate(parsed.paymentDate);
  const releasedById = parsed.releasedById ?? parsed.approvedById;
  const method = parsed.method as PaymentMethod;
  const supportedMethods = new Set<PaymentMethod>([
    PaymentMethod.CASH,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.MOBILE_MONEY,
    PaymentMethod.CHEQUE,
  ]);
  if (!supportedMethods.has(method)) {
    throw new BusinessRuleError(
      "Payroll payment method is not configured for salary disbursement posting.",
    );
  }

  const idempotencyPayloadHash = prefixedHash({
    operation: "releasePayrollPaymentBatch",
    payrollRunId: parsed.payrollRunId,
    method,
    paymentDate: paymentDate.toISOString(),
    requestedById: parsed.requestedById,
    approvedById: parsed.approvedById,
    releasedById,
    allocations: [...parsed.allocations]
      .map((allocation) => ({
        payslipId: allocation.payslipId,
        employeeId: allocation.employeeId,
        amount: decimal2(allocation.amount).toFixed(2),
      }))
      .sort((left, right) => left.payslipId.localeCompare(right.payslipId)),
  });

  return inTransaction(client, async (tx) => {
    const existing = await tx.payrollPaymentBatch.findFirst({
      where: {
        organizationId: parsed.organizationId,
        idempotencyKey: parsed.idempotencyKey,
      },
      include: { allocations: true },
    });
    if (existing) {
      assertIdempotencyPayloadMatches(
        existing.metadata,
        idempotencyPayloadHash,
        "Payroll payment batch idempotency key was reused with a different payload.",
      );
      return {
        payrollPaymentBatch: existing,
        postingBatchId: existing.ledgerPostingBatchId,
        businessEventId: existing.postedBusinessEventId,
        ledgerStatus:
          metadataString(existing.metadata, "ledgerStatus") ??
          "IDEMPOTENT_REPLAY",
        paymentTransactionId: existing.paymentTransactionId,
        paymentExceptionId: existing.paymentExceptionId,
        reconciliationStatus: existing.reconciliationStatus,
      };
    }

    if (
      parsed.requestedById === parsed.approvedById ||
      parsed.requestedById === releasedById
    ) {
      throw new BusinessRuleError(
        "A separate approver and releaser are required before releasing payroll payments.",
      );
    }

    const run = await tx.payrollRun.findFirst({
      where: {
        id: parsed.payrollRunId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      include: {
        payrollPeriod: true,
        payslips: {
          include: { employee: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!run) throw new NotFoundError("Payroll run not found");
    if (run.status === PayrollRunStatus.PAID) {
      throw new BusinessRuleError("Payroll run has already been paid.");
    }
    if (run.status !== PayrollRunStatus.POSTED) {
      throw new BusinessRuleError(
        "Payroll payments can only be released for posted payroll runs.",
      );
    }
    if (!run.ledgerPostingBatchId || !run.postedBusinessEventId) {
      throw new BusinessRuleError(
        "Payroll payment release requires posted payroll ledger and business-event evidence.",
      );
    }
    if (run.payslips.length === 0) {
      throw new BusinessRuleError(
        "Payroll payment release requires emitted payslips.",
      );
    }

    const controlDecision = evaluateSensitiveAction({
      action: "payroll.payment.release",
      actorId: releasedById,
      organizationId: parsed.organizationId,
      actorPermissions: parsed.actorPermissions,
      lastAuthAt: parsed.lastAuthAt,
      now: parseDate(parsed.now, paymentDate),
      resourceType: "PayrollRun",
      resourceId: run.id,
      subjectActorId: parsed.requestedById,
      amount: run.netPayableAmount,
      currency: run.currency,
      metadata: {
        runNumber: run.runNumber,
        payrollPeriodId: run.payrollPeriodId,
      },
    });
    await auditSensitiveActionDecision(tx, controlDecision);
    assertSensitiveActionAllowed(controlDecision);

    const payslipIds = parsed.allocations.map(
      (allocation) => allocation.payslipId,
    );
    if (payslipIds.length !== new Set(payslipIds).size) {
      throw new BusinessRuleError(
        "Payroll payment cannot contain duplicate payslip allocations.",
      );
    }

    const payslipById = new Map(
      run.payslips.map((payslip) => [payslip.id, payslip]),
    );
    const existingAllocations = payslipIds.length
      ? await tx.payrollPaymentAllocation.findMany({
          where: {
            organizationId: parsed.organizationId,
            payslipId: { in: payslipIds },
            payrollPaymentBatch: {
              status: {
                notIn: [
                  PayrollPaymentBatchStatus.CANCELLED,
                  PayrollPaymentBatchStatus.FAILED,
                ],
              },
            },
          },
        })
      : [];
    const paidByPayslip = new Map<string, Prisma.Decimal>();
    for (const allocation of existingAllocations) {
      paidByPayslip.set(
        allocation.payslipId,
        (paidByPayslip.get(allocation.payslipId) ?? new Prisma.Decimal(0))
          .plus(allocation.amount)
          .toDecimalPlaces(2),
      );
    }

    let totalPayment = new Prisma.Decimal(0);
    const allocationPlans = parsed.allocations.map((allocation) => {
      const payslip = payslipById.get(allocation.payslipId);
      if (!payslip || payslip.employeeId !== allocation.employeeId) {
        throw new BusinessRuleError(
          "Payroll payment allocation must reference an emitted payslip from the selected run.",
        );
      }
      if (payslip.status !== PayrollPayslipStatus.EMITTED) {
        throw new BusinessRuleError(
          "Payroll payments can only be released for emitted payslips.",
        );
      }
      if (!payslip.employee.paymentDestinationHash) {
        throw new BusinessRuleError(
          `Employee ${payslip.employee.displayName} has no approved payment destination evidence.`,
        );
      }
      const amount = decimal2(allocation.amount);
      if (amount.lte(0))
        throw new BusinessRuleError(
          "Payroll payment allocation amount must be greater than zero.",
        );
      const outstanding = decimal2(payslip.netPayableAmount)
        .minus(paidByPayslip.get(payslip.id) ?? new Prisma.Decimal(0))
        .toDecimalPlaces(2);
      if (amount.gt(outstanding)) {
        throw new BusinessRuleError(
          "Payroll payment allocation exceeds unpaid payslip net payable.",
        );
      }
      totalPayment = totalPayment.plus(amount).toDecimalPlaces(2);
      return { payslip, amount, outstanding };
    });

    for (const allocation of allocationPlans) {
      await assertApprovedPaymentDestinationEvidence(tx, {
        organizationId: parsed.organizationId,
        employeeId: allocation.payslip.employeeId,
      });
    }

    if (!totalPayment.eq(decimal2(run.netPayableAmount))) {
      throw new BusinessRuleError(
        "Payroll payment batch total must equal the posted payroll net payable amount.",
      );
    }

    const period = await getOpenPeriodForDate(
      parsed.organizationId,
      paymentDate,
      tx,
    );
    const batchNumber = await nextPayrollPaymentBatchNumber(
      tx,
      parsed.organizationId,
      paymentDate,
    );
    const evidencePayload = {
      payrollRunId: run.id,
      batchNumber,
      amount: totalPayment.toFixed(2),
      method,
      paymentDate: paymentDate.toISOString(),
      allocationIds: allocationPlans
        .map((allocation) => allocation.payslip.id)
        .sort(),
      bankFileHash: parsed.bankFileHash ?? null,
    };
    const documentHash = parsed.documentHash ?? prefixedHash(evidencePayload);
    const evidenceHash = prefixedHash({
      ...evidencePayload,
      destinationHashes: allocationPlans
        .map((allocation) => allocation.payslip.employee.paymentDestinationHash)
        .sort(),
    });

    const paymentBatch = await tx.payrollPaymentBatch.create({
      data: {
        organizationId: parsed.organizationId,
        payrollRunId: run.id,
        batchNumber,
        status: PayrollPaymentBatchStatus.DRAFT,
        method,
        amount: totalPayment,
        currency: normalizeCurrency(run.currency),
        paymentDate,
        idempotencyKey: parsed.idempotencyKey,
        bankFileHash: parsed.bankFileHash ?? null,
        documentHash,
        evidenceHash,
        requestedById: parsed.requestedById,
        approvedById: parsed.approvedById,
        releasedById,
        approvedAt: paymentDate,
        releasedAt: paymentDate,
        notes: parsed.notes ?? null,
        metadata: safeJson({
          gate: "012-payroll-presence-completion-gate",
          idempotencyPayloadHash,
          payrollRunDocumentHash: run.documentHash,
          requestedMetadata: parsed.metadata ?? null,
        }),
        allocations: {
          create: allocationPlans.map((allocation) => ({
            organizationId: parsed.organizationId,
            employeeId: allocation.payslip.employeeId,
            payslipId: allocation.payslip.id,
            amount: allocation.amount,
            currency: normalizeCurrency(allocation.payslip.currency),
            metadata: safeJson({
              payrollRunId: run.id,
              payslipNumber: allocation.payslip.payslipNumber,
              paymentDestinationHash:
                allocation.payslip.employee.paymentDestinationHash,
            }),
          })),
        },
      },
      include: { allocations: true },
    });

    const postingResult = await createPayrollPaymentLedgerPosting(tx, {
      organizationId: parsed.organizationId,
      periodId: period.id,
      payrollPaymentBatchId: paymentBatch.id,
      batchNumber: paymentBatch.batchNumber,
      paymentDate,
      actorId: releasedById,
      currency: paymentBatch.currency,
      method,
      documentHash,
      amount: totalPayment,
      metadata: {
        payrollRunId: run.id,
        runNumber: run.runNumber,
        method,
        countryPackVersion: run.countryPackVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
      },
    });

    const reconciliationResult =
      await queueOutboundPayrollPaymentReconciliation(tx, {
        organizationId: parsed.organizationId,
        payrollPaymentBatchId: paymentBatch.id,
        batchNumber: paymentBatch.batchNumber,
        payrollRunId: run.id,
        amount: totalPayment,
        currency: paymentBatch.currency,
        paymentDate,
        method,
        ledgerPostingBatchId: postingResult.ledgerBatch.id,
        ledgerStatus: postingResult.ledgerStatus,
        evidenceHash,
        documentHash,
      });

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.payment_batch.released",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey: parsed.idempotencyKey,
        payload: {
          payrollPaymentBatchId: paymentBatch.id,
          payrollRunId: run.id,
          batchNumber: paymentBatch.batchNumber,
          amount: totalPayment.toFixed(2),
          method,
          allocationIds: paymentBatch.allocations.map(
            (allocation) => allocation.id,
          ),
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntryId ?? null,
          ledgerStatus: postingResult.ledgerStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
        },
        occurredAt: paymentDate,
        actorId: releasedById,
        sourceType: AccountingSourceType.PAYROLL_PAYMENT,
        sourceId: paymentBatch.id,
        postingBatchId: postingResult.ledgerBatch.id,
        documentHash,
        metadata: {
          gate: "012-payroll-presence-completion-gate",
          ledgerStatus: postingResult.ledgerStatus,
          blockerCode: postingResult.blockerCode ?? null,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_payment_batch.released",
            destination: "accounting",
            payload: {
              severity:
                postingResult.ledgerStatus === "POSTED" ? "info" : "critical",
              payrollPaymentBatchId: paymentBatch.id,
              payrollRunId: run.id,
              amount: totalPayment.toFixed(2),
              ledgerStatus: postingResult.ledgerStatus,
              blockerCode: postingResult.blockerCode ?? null,
            },
          },
          {
            channel: "NOTIFICATION",
            eventName: "payroll_payment.reconciliation_required",
            destination: "reconciliation",
            payload: {
              severity: "warning",
              payrollPaymentBatchId: paymentBatch.id,
              batchNumber: paymentBatch.batchNumber,
              amount: totalPayment.toFixed(2),
              method,
              paymentTransactionId: reconciliationResult.paymentTransaction.id,
              paymentExceptionId: reconciliationResult.paymentException.id,
              reconciliationStatus: reconciliationResult.reconciliationStatus,
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    await recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      parsed.organizationId,
      {
        sourceCode: "PAYROLL_PAYMENT_RELEASED",
        sourceId: paymentBatch.id,
        periodId: period.id,
        periodStart: paymentDate,
        periodEnd: paymentDate,
        staleReason:
          "Payroll payment release changed certified close evidence.",
        newEvidenceHash: evidenceHash,
        correlationId: parsed.idempotencyKey ?? eventResult.event.id,
      },
      {
        actorId: releasedById,
        now: paymentDate,
      },
    );
    const releasedBatch = await tx.payrollPaymentBatch.update({
      where: { id: paymentBatch.id },
      data: {
        status: PayrollPaymentBatchStatus.RELEASED,
        ledgerPostingBatchId: postingResult.ledgerBatch.id,
        postedBusinessEventId: eventResult.event.id,
        paymentTransactionId: reconciliationResult.paymentTransaction.id,
        paymentExceptionId: reconciliationResult.paymentException.id,
        reconciliationStatus: reconciliationResult.reconciliationStatus,
        metadata: safeJson({
          gate: "012-payroll-presence-completion-gate",
          idempotencyPayloadHash,
          ledgerStatus: postingResult.ledgerStatus,
          ledgerBlockerCode: postingResult.blockerCode ?? null,
          ledgerBlockerMessage: postingResult.blockerMessage ?? null,
          journalEntryId: postingResult.journalEntryId ?? null,
          accountingSourceLinkId: postingResult.accountingSourceLinkId ?? null,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
          reconciliationPayloadHash: reconciliationResult.payloadHash,
          payrollRunDocumentHash: run.documentHash,
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
      include: { allocations: true },
    });

    await tx.payrollRun.update({
      where: { id: run.id },
      data: { status: PayrollRunStatus.PAID },
    });
    await tx.payrollPeriod.update({
      where: { id: run.payrollPeriodId },
      data: { status: PayrollPeriodStatus.PAID },
    });

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollPaymentBatch",
      entityId: paymentBatch.id,
      action: "PAYROLL_PAYMENT_BATCH_RELEASED",
      actorId: releasedById,
      changes: safeJson({
        after: {
          payrollRunId: run.id,
          amount: totalPayment.toFixed(2),
          batchNumber: paymentBatch.batchNumber,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          businessEventId: eventResult.event.id,
          ledgerStatus: postingResult.ledgerStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
        },
      }),
    });

    return {
      payrollPaymentBatch: releasedBatch,
      postingBatchId: postingResult.ledgerBatch.id,
      businessEventId: eventResult.event.id,
      ledgerStatus: postingResult.ledgerStatus,
      paymentTransactionId: reconciliationResult.paymentTransaction.id,
      paymentExceptionId: reconciliationResult.paymentException.id,
      reconciliationStatus: reconciliationResult.reconciliationStatus,
    };
  });
}

export async function preparePayrollDeclarations(
  input: PreparePayrollDeclarationsInput,
  client: DbClient = db,
) {
  const parsed = preparePayrollDeclarationsInputSchema.parse(input);

  return inTransaction(client, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: {
        id: parsed.payrollRunId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      include: {
        payrollPeriod: true,
        declarations: true,
      },
    });
    if (!run) throw new NotFoundError("Payroll run not found");
    if (
      run.status !== PayrollRunStatus.POSTED &&
      run.status !== PayrollRunStatus.PAID
    ) {
      throw new BusinessRuleError(
        "Payroll declarations can only be prepared for posted payroll runs.",
      );
    }

    let declarationConfig: {
      authority: string;
      declarationType: string;
      dueDate?: string | null;
      expertReviewRequired: boolean;
      capabilityStatus: string;
      resolutionHash: string;
    }[] = [];
    let declarationResolutionError: string | null = null;
    try {
      const resolved = resolveRegulatoryParameter<{
        declarations?: Array<{
          authority?: string;
          declarationType?: string;
          dueDate?: string | null;
          capabilityStatus?: string;
        }>;
      }>("payroll.declarations.default", {
        countryCode: run.countryCode,
        date: run.payrollPeriod.payDate,
        pinnedPackVersion: run.countryPackVersion,
        purpose: "PAYROLL_DECLARATIONS",
        entityProfile: {
          countryCode: run.countryCode,
        },
      });
      declarationConfig = (resolved.value.declarations ?? [])
        .filter((entry) => entry.authority && entry.declarationType)
        .map((entry) => ({
          authority: String(entry.authority),
          declarationType: String(entry.declarationType),
          dueDate: entry.dueDate ?? null,
          expertReviewRequired: entry.capabilityStatus !== "SUPPORTED",
          capabilityStatus: entry.capabilityStatus ?? resolved.capabilityStatus,
          resolutionHash: resolved.resolutionHash,
        }));
    } catch (error) {
      declarationResolutionError =
        error instanceof Error
          ? error.message
          : "Payroll declaration country-pack resolution failed.";
    }

    if (parsed.declarationTypes?.length) {
      const requested = new Set(
        parsed.declarationTypes.map((value) => value.trim().toUpperCase()),
      );
      declarationConfig = declarationConfig.filter((entry) =>
        requested.has(entry.declarationType.toUpperCase()),
      );
    }

    if (declarationConfig.length === 0) {
      declarationConfig = [
        {
          authority: "INTERNAL_PAYROLL_CONTROL",
          declarationType: "PAYROLL_LIABILITY_REVIEW",
          dueDate: null,
          expertReviewRequired: true,
          capabilityStatus: "REQUIRES_COUNTRY_PACK_EXPANSION",
          resolutionHash: run.countryPackResolutionHash,
        },
      ];
    }

    const preparedDeclarations = [];
    for (const declaration of declarationConfig) {
      const existing = await tx.payrollDeclaration.findFirst({
        where: {
          organizationId: parsed.organizationId,
          payrollRunId: run.id,
          authority: declaration.authority,
          declarationType: declaration.declarationType,
        },
      });
      if (existing) {
        preparedDeclarations.push(existing);
        continue;
      }

      const amount = decimal2(run.employeeDeductionAmount)
        .plus(decimal2(run.employerChargeAmount))
        .toDecimalPlaces(2);
      const dueDate = declaration.dueDate
        ? parseDate(declaration.dueDate)
        : null;
      const payload = {
        payrollRunId: run.id,
        runNumber: run.runNumber,
        payrollPeriodId: run.payrollPeriodId,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        periodStart: run.payrollPeriod.periodStart.toISOString(),
        periodEnd: run.payrollPeriod.periodEnd.toISOString(),
        grossAmount: decimal2(run.grossAmount).toFixed(2),
        employeeDeductionAmount: decimal2(run.employeeDeductionAmount).toFixed(
          2,
        ),
        employerChargeAmount: decimal2(run.employerChargeAmount).toFixed(2),
        declarationAmount: amount.toFixed(2),
        currency: run.currency,
        countryPackVersion: run.countryPackVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
        expertReviewRequired: declaration.expertReviewRequired,
        declarationResolutionError,
      };

      const created = await tx.payrollDeclaration.create({
        data: {
          organizationId: parsed.organizationId,
          payrollRunId: run.id,
          authority: declaration.authority,
          declarationType: declaration.declarationType,
          status: PayrollDeclarationStatus.PREPARED,
          periodStart: run.payrollPeriod.periodStart,
          periodEnd: run.payrollPeriod.periodEnd,
          dueDate,
          countryCode: run.countryCode,
          countryPackVersion: run.countryPackVersion,
          countryPackSchemaVersion: run.countryPackSchemaVersion,
          countryPackResolutionHash: run.countryPackResolutionHash,
          amount,
          currency: normalizeCurrency(run.currency),
          payloadHash: prefixedHash(payload),
          metadata: safeJson({
            gate: "012-payroll-presence-completion-gate",
            payload,
            expertReviewRequired: declaration.expertReviewRequired,
            capabilityStatus: declaration.capabilityStatus,
            declarationResolutionHash: declaration.resolutionHash,
            declarationResolutionError,
            requestedMetadata: parsed.metadata ?? null,
          }),
        },
      });
      preparedDeclarations.push(created);
    }

    const expertReviewRequired = preparedDeclarations.some((declaration) =>
      Boolean(asRecord(declaration.metadata).expertReviewRequired),
    );

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.declaration.prepared",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey:
          parsed.idempotencyKey ?? `payroll-declaration-prepared:${run.id}`,
        payload: {
          payrollRunId: run.id,
          runNumber: run.runNumber,
          declarationIds: preparedDeclarations.map(
            (declaration) => declaration.id,
          ),
          declarationTypes: preparedDeclarations.map(
            (declaration) => declaration.declarationType,
          ),
          expertReviewRequired,
        },
        occurredAt: new Date(),
        actorId: parsed.preparedById,
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: run.id,
        documentHash: prefixedHash(
          preparedDeclarations
            .map((declaration) => declaration.payloadHash)
            .sort(),
        ),
        metadata: {
          gate: "012-payroll-presence-completion-gate",
          declarationResolutionError,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_declaration.prepared",
            destination: "payroll",
            payload: {
              severity: declarationResolutionError ? "warning" : "info",
              payrollRunId: run.id,
              declarationCount: preparedDeclarations.length,
              expertReviewRequired,
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    await recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      parsed.organizationId,
      {
        sourceCode: "PAYROLL_DECLARATION_PREPARED",
        sourceId: run.id,
        periodStart: run.payrollPeriod.periodStart,
        periodEnd: run.payrollPeriod.periodEnd,
        staleReason:
          "Payroll declaration preparation changed certified close evidence.",
        newEvidenceHash: prefixedHash(
          preparedDeclarations
            .map((declaration) => declaration.payloadHash)
            .sort(),
        ),
        correlationId: parsed.idempotencyKey ?? eventResult.event.id,
      },
      {
        actorId: parsed.preparedById,
      },
    );
    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollRun",
      entityId: run.id,
      action: "PAYROLL_DECLARATIONS_PREPARED",
      actorId: parsed.preparedById,
      changes: safeJson({
        after: {
          declarationIds: preparedDeclarations.map(
            (declaration) => declaration.id,
          ),
          businessEventId: eventResult.event.id,
          expertReviewRequired,
        },
      }),
    });

    return {
      payrollRunId: run.id,
      declarations: preparedDeclarations,
      businessEventId: eventResult.event.id,
      expertReviewRequired,
    };
  });
}

export async function getPayrollWorkbenchData(
  input: PayrollWorkbenchReadInput,
  client: DbClient = db,
): Promise<PayrollWorkbenchData> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const amountDecision = evaluateRedaction({
    field: "PayrollWorkbench.payrollAmounts",
    category: "payroll_person_amount",
    actorPermissions: input.actorPermissions ?? [],
    moduleDecision: input.moduleDecision,
  });
  const [
    openPeriods,
    calculatedRuns,
    postedRuns,
    releasedPaymentBatches,
    openDeclarations,
    ledgerBlockers,
    reconciliationExceptions,
    recentRuns,
    paymentBatches,
    declarations,
    blockerRows,
  ] = await Promise.all([
    client.payrollPeriod.count({
      where: {
        organizationId: input.organizationId,
        status: {
          in: [PayrollPeriodStatus.OPEN, PayrollPeriodStatus.INPUTS_LOCKED],
        },
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        status: {
          in: [PayrollRunStatus.CALCULATED, PayrollRunStatus.REVIEWED],
        },
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        status: PayrollRunStatus.POSTED,
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: input.organizationId,
        status: PayrollPaymentBatchStatus.RELEASED,
      },
    }),
    client.payrollDeclaration.count({
      where: {
        organizationId: input.organizationId,
        status: {
          in: [
            PayrollDeclarationStatus.PREPARED,
            PayrollDeclarationStatus.REJECTED,
            PayrollDeclarationStatus.PAYMENT_DUE,
          ],
        },
      },
    }),
    client.ledgerPostingBatch.count({
      where: {
        organizationId: input.organizationId,
        sourceType: {
          in: [
            AccountingSourceType.PAYROLL_RUN,
            AccountingSourceType.PAYROLL_PAYMENT,
          ],
        },
        status: LedgerPostingBatchStatus.FAILED,
      },
    }),
    client.paymentException.count({
      where: {
        organizationId: input.organizationId,
        sourceType: "PAYROLL_PAYMENT",
        status: {
          notIn: [
            PaymentExceptionStatus.RESOLVED,
            PaymentExceptionStatus.DISMISSED,
          ],
        },
      },
    }),
    client.payrollRun.findMany({
      where: { organizationId: input.organizationId, deletedAt: null },
      include: {
        payrollPeriod: true,
        _count: {
          select: { payslips: true, paymentBatches: true, declarations: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    client.payrollPaymentBatch.findMany({
      where: { organizationId: input.organizationId },
      include: { payrollRun: { select: { runNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    client.payrollDeclaration.findMany({
      where: { organizationId: input.organizationId },
      include: { payrollRun: { select: { runNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    client.ledgerPostingBatch.findMany({
      where: {
        organizationId: input.organizationId,
        sourceType: {
          in: [
            AccountingSourceType.PAYROLL_RUN,
            AccountingSourceType.PAYROLL_PAYMENT,
          ],
        },
        status: LedgerPostingBatchStatus.FAILED,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  await writePayrollWorkbenchReadAudit(client, {
    organizationId: input.organizationId,
    actorId: input.actorId,
    amountDecision,
    returnedRunCount: recentRuns.length,
    returnedPaymentBatchCount: paymentBatches.length,
    returnedDeclarationCount: declarations.length,
  });

  return {
    organizationId: input.organizationId,
    asOf: new Date().toISOString(),
    counts: {
      openPeriods,
      calculatedRuns,
      postedRuns,
      releasedPaymentBatches,
      openDeclarations,
      ledgerBlockers,
      reconciliationExceptions,
    },
    queues: {
      recentRuns: recentRuns.map((run) => ({
        id: run.id,
        runNumber: run.runNumber,
        periodName: run.payrollPeriod.name,
        status: run.status,
        netPayableAmount: payrollAmountForReadModel(
          run.netPayableAmount,
          amountDecision,
        ),
        currency: run.currency,
        payDate: run.payrollPeriod.payDate.toISOString(),
        ledgerPostingBatchId: run.ledgerPostingBatchId,
        postedBusinessEventId: run.postedBusinessEventId,
        payslipCount: run._count.payslips,
        paymentBatchCount: run._count.paymentBatches,
        declarationCount: run._count.declarations,
        countryPackVersion: run.countryPackVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
      })),
      paymentBatches: paymentBatches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        payrollRunId: batch.payrollRunId,
        runNumber: batch.payrollRun.runNumber,
        status: batch.status,
        amount: payrollAmountForReadModel(batch.amount, amountDecision),
        currency: batch.currency,
        method: batch.method,
        paymentDate: batch.paymentDate.toISOString(),
        ledgerPostingBatchId: batch.ledgerPostingBatchId,
        postedBusinessEventId: batch.postedBusinessEventId,
        paymentTransactionId: batch.paymentTransactionId,
        paymentExceptionId: batch.paymentExceptionId,
        reconciliationStatus: batch.reconciliationStatus,
        ledgerStatus: metadataString(batch.metadata, "ledgerStatus"),
        ledgerBlockerCode: metadataString(batch.metadata, "ledgerBlockerCode"),
        ledgerBlockerMessage: metadataString(
          batch.metadata,
          "ledgerBlockerMessage",
        ),
      })),
      declarations: declarations.map((declaration) => ({
        id: declaration.id,
        payrollRunId: declaration.payrollRunId,
        runNumber: declaration.payrollRun.runNumber,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        status: declaration.status,
        amount: payrollAmountForReadModel(declaration.amount, amountDecision),
        currency: declaration.currency,
        dueDate: declaration.dueDate?.toISOString() ?? null,
        countryPackVersion: declaration.countryPackVersion,
        countryPackResolutionHash: declaration.countryPackResolutionHash,
        expertReviewRequired: Boolean(
          asRecord(declaration.metadata).expertReviewRequired,
        ),
      })),
      ledgerBlockers: blockerRows.map((blocker) => ({
        id: blocker.id,
        sourceType: blocker.sourceType,
        sourceId: blocker.sourceId,
        postingPurpose: blocker.postingPurpose,
        status: blocker.status,
        errorMessage: blocker.errorMessage,
        createdAt: blocker.createdAt.toISOString(),
      })),
    },
  };
}
