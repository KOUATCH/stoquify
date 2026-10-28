import "server-only";

import { randomUUID } from "node:crypto";

import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PayrollEmployeeBalanceCaseStatus,
  PayrollEmployeeBalanceCaseType,
  PayrollEmployeeBalanceEventType,
  PayrollPayslipStatus,
  PayrollRunStatus,
  PayrollRunType,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service";
import {
  createLedgerPostingBatch,
  linkAccountingSource,
} from "@/services/accounting/posting.service";
import { getOpenPeriodForDate } from "@/services/accounting/periods.service";
import { getActivePostingRule } from "@/services/accounting/posting-rules.service";
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
  evaluateRedaction,
  type RedactionDecision,
} from "@/services/security/redaction-policy.service";

type DbClient = typeof db | Prisma.TransactionClient;
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0];

const idSchema = z.string().trim().min(1);
const hashSchema = z.string().trim().min(1);
const decimalInputSchema = z.union([
  z.string().trim().min(1),
  z.number(),
  z.instanceof(Prisma.Decimal),
]);
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);
const settlementMethodSchema = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "MOBILE_MONEY",
  "PAYROLL_DEDUCTION",
]);
const SETTLEABLE_BALANCE_STATUSES = new Set<PayrollEmployeeBalanceCaseStatus>([
  PayrollEmployeeBalanceCaseStatus.OPEN,
  PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED,
]);

export const openPayrollEmployeeBalanceCaseInputSchema = z.object({
  organizationId: idSchema,
  payrollRunId: idSchema,
  employeeId: idSchema,
  payslipId: idSchema.optional(),
  openedById: idSchema,
  approvedById: idSchema,
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  reason: z.string().trim().min(1).max(2000),
  documentHash: hashSchema.optional(),
  supportingEvidenceHash: hashSchema.optional(),
  idempotencyKey: idSchema,
  metadata: z.unknown().optional(),
});

export const settlePayrollEmployeeBalanceCaseInputSchema = z.object({
  organizationId: idSchema,
  balanceCaseId: idSchema,
  settledById: idSchema,
  approvedById: idSchema,
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  settlementDate: dateInputSchema,
  settlementMethod: settlementMethodSchema,
  amount: decimalInputSchema,
  settlementEvidenceHash: hashSchema,
  documentHash: hashSchema.optional(),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  idempotencyKey: idSchema,
  metadata: z.unknown().optional(),
});

export const planPayrollEmployeeBalanceCasesInputSchema = z.object({
  organizationId: idSchema,
  payrollRunId: idSchema,
  asOf: dateInputSchema.optional(),
});

export const openPayrollEmployeeBalanceCasesForCorrectionRunInputSchema =
  z.object({
    organizationId: idSchema,
    payrollRunId: idSchema,
    openedById: idSchema,
    approvedById: idSchema,
    actorPermissions: z.array(z.string().trim().min(1)).default([]),
    lastAuthAt: dateInputSchema.optional(),
    now: dateInputSchema.optional(),
    reason: z.string().trim().min(1).max(2000),
    supportingEvidenceHash: hashSchema.optional(),
    idempotencyKey: idSchema,
    employeeIds: z.array(idSchema).optional(),
    metadata: z.unknown().optional(),
  });

export const payrollEmployeeBalanceWorkbenchInputSchema = z.object({
  organizationId: idSchema,
  actorId: idSchema.optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  limit: z.number().int().positive().max(100).default(25),
  statuses: z.array(z.nativeEnum(PayrollEmployeeBalanceCaseStatus)).optional(),
  asOf: dateInputSchema.optional(),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
});

export type OpenPayrollEmployeeBalanceCaseInput = z.input<
  typeof openPayrollEmployeeBalanceCaseInputSchema
>;
export type SettlePayrollEmployeeBalanceCaseInput = z.input<
  typeof settlePayrollEmployeeBalanceCaseInputSchema
>;
export type PlanPayrollEmployeeBalanceCasesInput = z.input<
  typeof planPayrollEmployeeBalanceCasesInputSchema
>;
export type OpenPayrollEmployeeBalanceCasesForCorrectionRunInput = z.input<
  typeof openPayrollEmployeeBalanceCasesForCorrectionRunInputSchema
>;
export type PayrollEmployeeBalanceWorkbenchInput = z.input<
  typeof payrollEmployeeBalanceWorkbenchInputSchema
>;

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function";
}

async function inTransaction<T>(
  client: DbClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (hasTransaction(client)) return client.$transaction((tx) => work(tx));
  return work(client as Prisma.TransactionClient);
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataString(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "string" && entry.trim().length > 0
    ? entry.trim()
    : null;
}

function parseDate(
  value: Date | string | number | undefined,
  fallback = new Date(),
) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function decimal(value: Prisma.Decimal.Value | null | undefined) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(2);
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function iso(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

function normalizeCurrency(value?: string | null) {
  return value?.trim().toUpperCase() || "XAF";
}

function normalizeMappingKey(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

function conditionMatches(
  condition: Prisma.JsonValue | null | undefined,
  context: Record<string, unknown>,
) {
  if (!condition) return true;
  const record = asRecord(condition);
  return Object.entries(record).every(
    ([key, expected]) => context[key] === expected,
  );
}

function amountForSource(
  amountSource: PostingRuleAmountSource,
  amount: Prisma.Decimal,
) {
  switch (amountSource) {
    case PostingRuleAmountSource.SOURCE_AMOUNT:
    case PostingRuleAmountSource.NET_AMOUNT:
    case PostingRuleAmountSource.NET_PAYABLE_AMOUNT:
    case PostingRuleAmountSource.GROSS_AMOUNT:
      return amount;
    case PostingRuleAmountSource.FIXED:
    case PostingRuleAmountSource.TAX_AMOUNT:
    case PostingRuleAmountSource.EMPLOYEE_DEDUCTION_AMOUNT:
    case PostingRuleAmountSource.EMPLOYER_CHARGE_AMOUNT:
    case PostingRuleAmountSource.COST_AMOUNT:
    case PostingRuleAmountSource.QUANTITY_COST:
    case PostingRuleAmountSource.VARIANCE_AMOUNT:
    default:
      return new Prisma.Decimal(0);
  }
}

function payrollRunCorrectionMetadata(run: {
  runType?: PayrollRunType | string | null;
  originalRunId?: string | null;
  metadata?: unknown;
}) {
  const metadata = asRecord(run.metadata);
  const correction = asRecord(metadata.correction);
  const originalRunId =
    run.originalRunId ?? metadataString(correction, "originalRunId");
  const correctionRun =
    run.runType === PayrollRunType.CORRECTION || Boolean(originalRunId);

  return {
    payrollRunType: run.runType ? String(run.runType) : null,
    correctionRun,
    originalRunId,
    originalRunNumber: metadataString(correction, "originalRunNumber"),
    originalRunStatus: metadataString(correction, "originalRunStatus"),
    originalRunDocumentHash: metadataString(
      correction,
      "originalRunDocumentHash",
    ),
    originalRunEvidenceHash: metadataString(
      correction,
      "originalRunEvidenceHash",
    ),
    originalCalculationHash: metadataString(
      correction,
      "originalCalculationHash",
    ),
  };
}

function payrollRunProofMetadata(metadata: unknown) {
  const componentRegisterProofHash = metadataString(
    metadata,
    "componentRegisterProofHash",
  );
  const componentRegisterProofStatus = metadataString(
    metadata,
    "componentRegisterProofStatus",
  );
  const payrollComponentMappingHash = metadataString(
    metadata,
    "payrollComponentMappingHash",
  );
  const payrollComponentMappingStatus = metadataString(
    metadata,
    "payrollComponentMappingStatus",
  );

  if (
    !componentRegisterProofHash ||
    componentRegisterProofStatus !== "MATCHED"
  ) {
    throw new BusinessRuleError(
      "Payroll employee balance cases require matched statutory component register proof from the posted correction run.",
    );
  }
  if (!payrollComponentMappingHash || !payrollComponentMappingStatus) {
    throw new BusinessRuleError(
      "Payroll employee balance cases require payroll component mapping proof from the posted correction run.",
    );
  }

  return {
    componentRegisterProofHash,
    componentRegisterProofStatus,
    payrollComponentMappingHash,
    payrollComponentMappingStatus,
  };
}

function paymentMethodForSettlement(
  settlementMethod: z.infer<typeof settlementMethodSchema>,
) {
  if (settlementMethod === "PAYROLL_DEDUCTION") return null;
  return settlementMethod as PaymentMethod;
}

function journalTypeForSettlement(
  settlementMethod: z.infer<typeof settlementMethodSchema>,
) {
  if (settlementMethod === "CASH") return JournalType.CASH;
  if (settlementMethod === "PAYROLL_DEDUCTION") return JournalType.PAYROLL;
  return JournalType.BANK;
}

function eventTypeForSettlement(
  settlementMethod: z.infer<typeof settlementMethodSchema>,
) {
  switch (settlementMethod) {
    case "CASH":
      return PayrollEmployeeBalanceEventType.SETTLE_CASH;
    case "BANK_TRANSFER":
      return PayrollEmployeeBalanceEventType.SETTLE_BANK;
    case "MOBILE_MONEY":
      return PayrollEmployeeBalanceEventType.SETTLE_MOBILE_MONEY;
    case "PAYROLL_DEDUCTION":
      return PayrollEmployeeBalanceEventType.SETTLE_DEDUCTION;
  }
}

async function nextPayrollBalanceCaseNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  openedAt: Date,
) {
  const prefix = `PAYBAL-${compactDate(openedAt)}`;
  const count = await tx.payrollEmployeeBalanceCase.count({
    where: { organizationId, caseNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function nextPayrollBalanceEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
) {
  const prefix = `PBAL-JE-${compactDate(entryDate)}`;
  const count = await tx.journalEntry.count({
    where: { organizationId, entryNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function createBalanceLedgerPosting(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    periodId: string;
    sourceType: AccountingSourceType;
    sourceId: string;
    postingPurpose: AccountingPostingPurpose;
    idempotencyKey: string;
    journalType: JournalType;
    entryDate: Date;
    sourceNumber: string;
    memo: string;
    actorId: string;
    amount: Prisma.Decimal;
    currency: string;
    documentHash: string;
    metadata: Record<string, unknown>;
    auditAction: string;
    resourceType: string;
    resourceId: string;
  },
) {
  const rule = await getActivePostingRule(
    input.organizationId,
    {
      sourceType: input.sourceType,
      postingPurpose: input.postingPurpose,
      effectiveAt: input.entryDate,
    },
    tx,
  );
  if (!rule) {
    throw new BusinessRuleError(
      "Payroll employee balance posting requires configured payroll employee balance posting rules.",
    );
  }

  const journal = await tx.journal.findFirst({
    where: {
      organizationId: input.organizationId,
      type: input.journalType,
      isDefault: true,
      isActive: true,
    },
    select: { id: true, code: true },
  });
  if (!journal) {
    throw new BusinessRuleError(
      `Payroll employee balance posting requires an active default ${input.journalType} journal.`,
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
          `Payroll employee balance rule ${rule.code} line ${line.lineNumber} does not resolve to an account.`,
        );
      }
      if (!account.isActive || account.deletedAt) {
        throw new BusinessRuleError(
          `Payroll employee balance rule ${rule.code} account ${account.code} is not active.`,
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
          `Payroll employee balance rule ${rule.code} account ${account.code} must be a leaf account.`,
        );
      }

      const amount = amountForSource(line.amountSource, input.amount)
        .times(new Prisma.Decimal(line.multiplier ?? 1))
        .toDecimalPlaces(2);
      if (amount.lt(0)) {
        throw new BusinessRuleError(
          `Payroll employee balance rule ${rule.code} line ${line.lineNumber} produced a negative amount.`,
        );
      }
      if (amount.eq(0)) return null;

      return {
        accountId: account.id,
        lineNumber: line.lineNumber,
        description: line.description ?? input.memo,
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
    throw new BusinessRuleError(
      `Payroll employee balance rule ${rule.code} is not balanced: debit ${debitTotal.toFixed(2)} credit ${creditTotal.toFixed(2)}.`,
    );
  }

  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      idempotencyKey: input.idempotencyKey,
      metadata: safeJson({
        sourceNumber: input.sourceNumber,
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
      entryNumber: await nextPayrollBalanceEntryNumber(
        tx,
        input.organizationId,
        input.entryDate,
      ),
      entryDate: input.entryDate,
      status: JournalEntryStatus.POSTED,
      currency: normalizeCurrency(input.currency),
      memo: input.memo,
      reference: input.sourceNumber,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
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
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            ...input.metadata,
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
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceNumber: input.sourceNumber,
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
      action: input.auditAction,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      message: input.memo,
      metadata: safeJson({
        sourceNumber: input.sourceNumber,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
        ruleCode: rule.code,
        documentHash: input.documentHash,
        ...input.metadata,
      }),
    },
  });

  return {
    ledgerBatch: postedBatch,
    journalEntry,
    accountingSourceLinkId: sourceLink.id,
    debitTotal,
    creditTotal,
  };
}

type PayrollEmployeeBalanceWorkbenchRedaction = Pick<
  RedactionDecision,
  | "allowed"
  | "mode"
  | "reasonCode"
  | "policy"
  | "replacement"
  | "requiredPermissions"
>;

type PayrollEmployeeBalanceWorkbenchCase = {
  id: string;
  caseNumber: string;
  caseType: PayrollEmployeeBalanceCaseType;
  status: PayrollEmployeeBalanceCaseStatus;
  employee: {
    id: string;
    employeeNumber: string | null;
    displayName: string | null;
  };
  payrollRun: {
    id: string;
    runNumber: string;
    status: PayrollRunStatus;
    periodId: string | null;
    periodName: string | null;
    periodStart: string | null;
    periodEnd: string | null;
  };
  payslip: {
    id: string;
    payslipNumber: string;
    status: PayrollPayslipStatus;
  } | null;
  amounts: {
    amount: string;
    settledAmount: string;
    outstandingAmount: string;
    sourceNetPayableAmount: string;
    currency: string;
  };
  timeline: {
    openedAt: string;
    settledAt: string | null;
    createdAt: string;
    updatedAt: string;
    ageDays: number;
  };
  proof: {
    documentHash: string;
    evidenceHash: string;
    ledgerPostingBatchId: string | null;
    journalEntryId: string | null;
    accountingSourceLinkId: string | null;
    openedBusinessEventId: string | null;
    latestEvent: {
      id: string;
      eventType: PayrollEmployeeBalanceEventType;
      eventDate: string;
      evidenceHash: string;
      documentHash: string | null;
      ledgerPostingBatchId: string | null;
      journalEntryId: string | null;
      accountingSourceLinkId: string | null;
      businessEventId: string | null;
    } | null;
  };
  nextAction: {
    id: "settle" | "review" | "none";
    label: string;
    requiredPermission: string | null;
  };
};

type PayrollEmployeeBalanceCaseReadRow =
  Prisma.PayrollEmployeeBalanceCaseGetPayload<{
    include: {
      employee: {
        select: { id: true; employeeNumber: true; displayName: true };
      };
      payrollRun: {
        select: {
          id: true;
          runNumber: true;
          status: true;
          payrollPeriod: {
            select: {
              id: true;
              name: true;
              periodStart: true;
              periodEnd: true;
            };
          };
        };
      };
      payslip: { select: { id: true; payslipNumber: true; status: true } };
      events: true;
    };
  }>;

type PayrollEmployeeBalanceAggregateResult = {
  _sum: {
    amount: Prisma.Decimal | null;
    settledAmount: Prisma.Decimal | null;
    outstandingAmount: Prisma.Decimal | null;
  };
};
function redactionSummary(
  decision: RedactionDecision,
): PayrollEmployeeBalanceWorkbenchRedaction {
  return {
    allowed: decision.allowed,
    mode: decision.mode,
    reasonCode: decision.reasonCode,
    policy: decision.policy,
    replacement: decision.replacement,
    requiredPermissions: decision.requiredPermissions,
  };
}

function redactedDecimal(
  decision: RedactionDecision,
  value: Prisma.Decimal.Value | null | undefined,
) {
  return decision.allowed ? decimal(value).toFixed(2) : decision.replacement;
}

function ageDaysSince(date: Date, asOf: Date) {
  return Math.max(
    0,
    Math.floor((asOf.getTime() - date.getTime()) / 86_400_000),
  );
}

function balanceNextAction(status: PayrollEmployeeBalanceCaseStatus) {
  if (SETTLEABLE_BALANCE_STATUSES.has(status)) {
    return {
      id: "settle" as const,
      label: "Record employee balance settlement evidence",
      requiredPermission: "payroll.payments.reconcile",
    };
  }
  if (
    status === PayrollEmployeeBalanceCaseStatus.CANCELLED ||
    status === PayrollEmployeeBalanceCaseStatus.WRITTEN_OFF
  ) {
    return {
      id: "review" as const,
      label: "Review employee balance closure evidence",
      requiredPermission: "payroll.payments.reconcile",
    };
  }
  return {
    id: "none" as const,
    label: "No balance action required",
    requiredPermission: null,
  };
}
type PayrollEmployeeBalancePlanCandidate = {
  employeeId: string;
  employeeDisplayName: string | null;
  payslipId: string;
  payslipNumber: string;
  payslipStatus: PayrollPayslipStatus;
  direction: "RECEIVABLE" | "ADDITIONAL_PAYMENT" | "NO_BALANCE";
  status:
    | "READY_TO_OPEN"
    | "EXISTING_CASE"
    | "STANDARD_PAYMENT_RELEASE"
    | "NO_ACTION"
    | "BLOCKED";
  caseType: PayrollEmployeeBalanceCaseType | null;
  signedNetPayableAmount: string;
  amount: string;
  currency: string;
  existingCaseId: string | null;
  blockers: string[];
};

function activeBalanceCaseWhere(organizationId: string, payrollRunId: string) {
  return {
    organizationId,
    payrollRunId,
    status: {
      notIn: [
        PayrollEmployeeBalanceCaseStatus.CANCELLED,
        PayrollEmployeeBalanceCaseStatus.WRITTEN_OFF,
      ],
    },
  };
}

function existingCaseKey(input: {
  employeeId: string;
  payslipId?: string | null;
}) {
  return `${input.employeeId}:${input.payslipId ?? "NO_PAYSLIP"}`;
}

export async function getPayrollEmployeeBalanceWorkbenchData(
  input: PayrollEmployeeBalanceWorkbenchInput,
  client: DbClient = db,
) {
  const parsed = payrollEmployeeBalanceWorkbenchInputSchema.parse(input);
  const asOf = parseDate(parsed.asOf);
  const amountDecision = evaluateRedaction({
    field: "PayrollEmployeeBalanceWorkbench.amounts",
    category: "payroll_person_amount",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision ?? null,
  });
  const statuses = parsed.statuses?.length
    ? parsed.statuses
    : [
        PayrollEmployeeBalanceCaseStatus.OPEN,
        PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED,
      ];
  const baseWhere = {
    organizationId: parsed.organizationId,
    status: { in: statuses },
  };
  const activeWhere = {
    organizationId: parsed.organizationId,
    status: {
      in: [
        PayrollEmployeeBalanceCaseStatus.OPEN,
        PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED,
      ],
    },
  };

  const [
    cases,
    totalCases,
    filteredCases,
    openCases,
    partiallySettledCases,
    settledCases,
    activeAggregate,
  ] = (await Promise.all([
    client.payrollEmployeeBalanceCase.findMany({
      where: baseWhere,
      include: {
        employee: {
          select: { id: true, employeeNumber: true, displayName: true },
        },
        payrollRun: {
          select: {
            id: true,
            runNumber: true,
            status: true,
            payrollPeriod: {
              select: {
                id: true,
                name: true,
                periodStart: true,
                periodEnd: true,
              },
            },
          },
        },
        payslip: { select: { id: true, payslipNumber: true, status: true } },
        events: { orderBy: { eventDate: "desc" }, take: 1 },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: parsed.limit,
    }),
    client.payrollEmployeeBalanceCase.count({
      where: { organizationId: parsed.organizationId },
    }),
    client.payrollEmployeeBalanceCase.count({ where: baseWhere }),
    client.payrollEmployeeBalanceCase.count({
      where: {
        organizationId: parsed.organizationId,
        status: PayrollEmployeeBalanceCaseStatus.OPEN,
      },
    }),
    client.payrollEmployeeBalanceCase.count({
      where: {
        organizationId: parsed.organizationId,
        status: PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED,
      },
    }),
    client.payrollEmployeeBalanceCase.count({
      where: {
        organizationId: parsed.organizationId,
        status: PayrollEmployeeBalanceCaseStatus.SETTLED,
      },
    }),
    client.payrollEmployeeBalanceCase.aggregate({
      where: activeWhere,
      _sum: { amount: true, settledAmount: true, outstandingAmount: true },
    }),
  ])) as [
    PayrollEmployeeBalanceCaseReadRow[],
    number,
    number,
    number,
    number,
    number,
    PayrollEmployeeBalanceAggregateResult,
  ];

  const mappedCases: PayrollEmployeeBalanceWorkbenchCase[] = cases.map(
    (balanceCase) => {
      const latestEvent = balanceCase.events[0] ?? null;
      return {
        id: balanceCase.id,
        caseNumber: balanceCase.caseNumber,
        caseType: balanceCase.caseType,
        status: balanceCase.status,
        employee: {
          id: balanceCase.employee.id,
          employeeNumber: balanceCase.employee.employeeNumber,
          displayName: balanceCase.employee.displayName,
        },
        payrollRun: {
          id: balanceCase.payrollRun.id,
          runNumber: balanceCase.payrollRun.runNumber,
          status: balanceCase.payrollRun.status,
          periodId: balanceCase.payrollRun.payrollPeriod?.id ?? null,
          periodName: balanceCase.payrollRun.payrollPeriod?.name ?? null,
          periodStart: iso(balanceCase.payrollRun.payrollPeriod?.periodStart),
          periodEnd: iso(balanceCase.payrollRun.payrollPeriod?.periodEnd),
        },
        payslip: balanceCase.payslip
          ? {
              id: balanceCase.payslip.id,
              payslipNumber: balanceCase.payslip.payslipNumber,
              status: balanceCase.payslip.status,
            }
          : null,
        amounts: {
          amount: redactedDecimal(amountDecision, balanceCase.amount),
          settledAmount: redactedDecimal(
            amountDecision,
            balanceCase.settledAmount,
          ),
          outstandingAmount: redactedDecimal(
            amountDecision,
            balanceCase.outstandingAmount,
          ),
          sourceNetPayableAmount: redactedDecimal(
            amountDecision,
            balanceCase.sourceNetPayableAmount,
          ),
          currency: normalizeCurrency(balanceCase.currency),
        },
        timeline: {
          openedAt: balanceCase.openedAt.toISOString(),
          settledAt: iso(balanceCase.settledAt),
          createdAt: balanceCase.createdAt.toISOString(),
          updatedAt: balanceCase.updatedAt.toISOString(),
          ageDays: ageDaysSince(balanceCase.openedAt, asOf),
        },
        proof: {
          documentHash: balanceCase.documentHash,
          evidenceHash: balanceCase.evidenceHash,
          ledgerPostingBatchId: balanceCase.ledgerPostingBatchId,
          journalEntryId: balanceCase.journalEntryId,
          accountingSourceLinkId: balanceCase.accountingSourceLinkId,
          openedBusinessEventId: balanceCase.openedBusinessEventId,
          latestEvent: latestEvent
            ? {
                id: latestEvent.id,
                eventType: latestEvent.eventType,
                eventDate: latestEvent.eventDate.toISOString(),
                evidenceHash: latestEvent.evidenceHash,
                documentHash: latestEvent.documentHash,
                ledgerPostingBatchId: latestEvent.ledgerPostingBatchId,
                journalEntryId: latestEvent.journalEntryId,
                accountingSourceLinkId: latestEvent.accountingSourceLinkId,
                businessEventId: latestEvent.businessEventId,
              }
            : null,
        },
        nextAction: balanceNextAction(balanceCase.status),
      };
    },
  );

  const summary = {
    totalCases,
    filteredCases,
    returnedCases: mappedCases.length,
    openCases,
    partiallySettledCases,
    settledCases,
    activeCases: openCases + partiallySettledCases,
    activeAmount: redactedDecimal(amountDecision, activeAggregate._sum.amount),
    activeSettledAmount: redactedDecimal(
      amountDecision,
      activeAggregate._sum.settledAmount,
    ),
    activeOutstandingAmount: redactedDecimal(
      amountDecision,
      activeAggregate._sum.outstandingAmount,
    ),
    coverageComplete:
      mappedCases.length >= filteredCases || mappedCases.length < parsed.limit,
  };

  await client.auditLog.create({
    data: {
      entityType: "PayrollEmployeeBalanceWorkbench",
      entityId: parsed.organizationId,
      action: "PAYROLL_EMPLOYEE_BALANCE_WORKBENCH_READ",
      userId: parsed.actorId ?? null,
      organizationId: parsed.organizationId,
      changes: safeJson({
        amountAccess: redactionSummary(amountDecision),
        statusFilter: statuses,
        totalCases: summary.totalCases,
        returnedCases: summary.returnedCases,
        activeCases: summary.activeCases,
      }),
    },
  });

  return {
    organizationId: parsed.organizationId,
    asOf: asOf.toISOString(),
    statusFilter: statuses,
    redaction: { payrollAmounts: redactionSummary(amountDecision) },
    summary,
    cases: mappedCases,
    sourceScope: {
      limit: parsed.limit,
      returned: mappedCases.length,
      coverageComplete: summary.coverageComplete,
      sourceService: "services/payroll/payroll-employee-balance.service.ts",
    },
  };
}
export async function planPayrollEmployeeBalanceCasesForCorrectionRun(
  input: PlanPayrollEmployeeBalanceCasesInput,
  client: DbClient = db,
) {
  const parsed = planPayrollEmployeeBalanceCasesInputSchema.parse(input);
  const asOf = parseDate(parsed.asOf);

  const run = await client.payrollRun.findFirst({
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
  if (!run) throw new NotFoundError("Payroll correction run not found.");
  if (run.runType !== PayrollRunType.CORRECTION || !run.originalRunId) {
    throw new BusinessRuleError(
      "Payroll employee balance planning can only run for correction payroll runs.",
    );
  }
  if (run.status !== PayrollRunStatus.POSTED) {
    throw new BusinessRuleError(
      "Payroll employee balance planning requires a posted correction payroll run.",
    );
  }

  const correctionMetadata = payrollRunCorrectionMetadata(run);
  const planBlockers: string[] = [];
  let runProofMetadata: ReturnType<typeof payrollRunProofMetadata> | null =
    null;
  try {
    runProofMetadata = payrollRunProofMetadata(run.metadata);
  } catch (error) {
    planBlockers.push(
      error instanceof Error
        ? error.message
        : "Payroll employee balance planning requires register and mapping proof.",
    );
  }

  const existingCases = await client.payrollEmployeeBalanceCase.findMany({
    where: activeBalanceCaseWhere(parsed.organizationId, run.id),
    select: {
      id: true,
      employeeId: true,
      payslipId: true,
      status: true,
      caseType: true,
      outstandingAmount: true,
    },
  });
  const existingCaseByEmployeePayslip = new Map(
    existingCases.map((balanceCase) => [
      existingCaseKey(balanceCase),
      balanceCase,
    ]),
  );

  const candidates: PayrollEmployeeBalancePlanCandidate[] = run.payslips.map(
    (payslip) => {
      const signedNetPayableAmount = decimal(payslip.netPayableAmount);
      const amount = signedNetPayableAmount.abs().toDecimalPlaces(2);
      const currency = normalizeCurrency(payslip.currency);
      const existingCase = existingCaseByEmployeePayslip.get(
        existingCaseKey({
          employeeId: payslip.employeeId,
          payslipId: payslip.id,
        }),
      );
      const blockers: string[] = [];
      let direction: PayrollEmployeeBalancePlanCandidate["direction"] =
        "NO_BALANCE";
      let status: PayrollEmployeeBalancePlanCandidate["status"] = "NO_ACTION";
      let caseType: PayrollEmployeeBalanceCaseType | null = null;

      if (signedNetPayableAmount.lt(0)) {
        direction = "RECEIVABLE";
        caseType = PayrollEmployeeBalanceCaseType.RECEIVABLE;
        if (existingCase) {
          status = "EXISTING_CASE";
        } else if (payslip.status !== PayrollPayslipStatus.EMITTED) {
          status = "BLOCKED";
          blockers.push(
            "Negative correction payslip must be emitted before an employee receivable case can be opened.",
          );
        } else if (!runProofMetadata) {
          status = "BLOCKED";
          blockers.push(...planBlockers);
        } else {
          status = "READY_TO_OPEN";
        }
      } else if (signedNetPayableAmount.gt(0)) {
        direction = "ADDITIONAL_PAYMENT";
        caseType = PayrollEmployeeBalanceCaseType.REFUND;
        status = existingCase ? "EXISTING_CASE" : "STANDARD_PAYMENT_RELEASE";
      } else {
        status = existingCase ? "EXISTING_CASE" : "NO_ACTION";
      }

      return {
        employeeId: payslip.employeeId,
        employeeDisplayName: payslip.employee?.displayName ?? null,
        payslipId: payslip.id,
        payslipNumber: payslip.payslipNumber,
        payslipStatus: payslip.status,
        direction,
        status,
        caseType,
        signedNetPayableAmount: signedNetPayableAmount.toFixed(2),
        amount: amount.toFixed(2),
        currency,
        existingCaseId: existingCase?.id ?? null,
        blockers,
      };
    },
  );

  const summary = candidates.reduce(
    (totals, candidate) => {
      const amount = new Prisma.Decimal(candidate.amount);
      if (candidate.direction === "RECEIVABLE") {
        totals.receivableCount += 1;
        totals.receivableAmount = totals.receivableAmount.plus(amount);
      }
      if (candidate.direction === "ADDITIONAL_PAYMENT") {
        totals.additionalPaymentCount += 1;
        totals.additionalPaymentAmount =
          totals.additionalPaymentAmount.plus(amount);
      }
      if (candidate.status === "READY_TO_OPEN") totals.readyToOpenCount += 1;
      if (candidate.status === "EXISTING_CASE") totals.existingCaseCount += 1;
      if (candidate.status === "BLOCKED") totals.blockedCount += 1;
      return totals;
    },
    {
      receivableCount: 0,
      receivableAmount: new Prisma.Decimal(0),
      additionalPaymentCount: 0,
      additionalPaymentAmount: new Prisma.Decimal(0),
      readyToOpenCount: 0,
      existingCaseCount: 0,
      blockedCount: 0,
    },
  );

  const planPayload = {
    kind: "AQSTOQFLOW_PAYROLL_EMPLOYEE_BALANCE_PLAN",
    version: 1,
    organizationId: parsed.organizationId,
    payrollRunId: run.id,
    runNumber: run.runNumber,
    asOf: asOf.toISOString(),
    correctionMetadata,
    runProofMetadata,
    candidates: candidates.map((candidate) => ({
      employeeId: candidate.employeeId,
      payslipId: candidate.payslipId,
      direction: candidate.direction,
      status: candidate.status,
      amount: candidate.amount,
      currency: candidate.currency,
      existingCaseId: candidate.existingCaseId,
      blockers: candidate.blockers,
    })),
  };
  const planHash = prefixedHash(planPayload);

  return {
    organizationId: parsed.organizationId,
    payrollRunId: run.id,
    runNumber: run.runNumber,
    payrollPeriodId: run.payrollPeriodId,
    periodStart: run.payrollPeriod.periodStart,
    periodEnd: run.payrollPeriod.periodEnd,
    asOf,
    correctionMetadata,
    runProofMetadata,
    planHash,
    summary: {
      receivableCount: summary.receivableCount,
      receivableAmount: summary.receivableAmount.toFixed(2),
      additionalPaymentCount: summary.additionalPaymentCount,
      additionalPaymentAmount: summary.additionalPaymentAmount.toFixed(2),
      readyToOpenCount: summary.readyToOpenCount,
      existingCaseCount: summary.existingCaseCount,
      blockedCount: summary.blockedCount,
      canBulkOpenReceivables:
        summary.readyToOpenCount > 0 && summary.blockedCount === 0,
    },
    blockers: Array.from(
      new Set([
        ...planBlockers,
        ...candidates.flatMap((candidate) => candidate.blockers),
      ]),
    ),
    candidates,
  };
}

export async function openPayrollEmployeeBalanceCasesForCorrectionRun(
  input: OpenPayrollEmployeeBalanceCasesForCorrectionRunInput,
  client: DbClient = db,
) {
  const parsed =
    openPayrollEmployeeBalanceCasesForCorrectionRunInputSchema.parse(input);
  const openedAt = parseDate(parsed.now);
  const selectedEmployeeIds = new Set(parsed.employeeIds ?? []);

  return inTransaction(client, async (tx) => {
    const plan = await planPayrollEmployeeBalanceCasesForCorrectionRun(
      {
        organizationId: parsed.organizationId,
        payrollRunId: parsed.payrollRunId,
        asOf: openedAt,
      },
      tx,
    );
    const selectedCandidates = selectedEmployeeIds.size
      ? plan.candidates.filter((candidate) =>
          selectedEmployeeIds.has(candidate.employeeId),
        )
      : plan.candidates;
    const missingEmployeeIds = [...selectedEmployeeIds].filter(
      (employeeId) =>
        !selectedCandidates.some(
          (candidate) => candidate.employeeId === employeeId,
        ),
    );
    if (missingEmployeeIds.length > 0) {
      throw new NotFoundError(
        `Correction payslips not found for employees: ${missingEmployeeIds.join(", ")}.`,
      );
    }

    const blockingCandidates = selectedCandidates.filter(
      (candidate) => candidate.status === "BLOCKED",
    );
    if (blockingCandidates.length > 0) {
      throw new BusinessRuleError(
        `Payroll employee balance bulk open is blocked: ${blockingCandidates
          .map(
            (candidate) =>
              `${candidate.payslipNumber}: ${candidate.blockers.join(" ")}`,
          )
          .join("; ")}`,
      );
    }

    const readyCandidates = selectedCandidates.filter(
      (candidate) => candidate.status === "READY_TO_OPEN",
    );
    const opened = [];
    for (const candidate of readyCandidates) {
      const result = await openPayrollEmployeeBalanceCaseFromCorrection(
        {
          organizationId: parsed.organizationId,
          payrollRunId: parsed.payrollRunId,
          employeeId: candidate.employeeId,
          payslipId: candidate.payslipId,
          openedById: parsed.openedById,
          approvedById: parsed.approvedById,
          actorPermissions: parsed.actorPermissions,
          lastAuthAt: parsed.lastAuthAt,
          now: openedAt,
          reason: parsed.reason,
          supportingEvidenceHash: parsed.supportingEvidenceHash,
          idempotencyKey: `${parsed.idempotencyKey}:${candidate.payslipId}`,
          metadata: {
            bulkIdempotencyKey: parsed.idempotencyKey,
            balancePlanHash: plan.planHash,
            requestedMetadata: parsed.metadata ?? null,
          },
        },
        tx,
      );
      opened.push({
        employeeId: candidate.employeeId,
        payslipId: candidate.payslipId,
        balanceCase: result.balanceCase,
        openedEvent: result.openedEvent,
        idempotent: result.idempotent,
      });
    }

    const skipped = selectedCandidates.filter(
      (candidate) => candidate.status !== "READY_TO_OPEN",
    );
    const refreshedPlan = await planPayrollEmployeeBalanceCasesForCorrectionRun(
      {
        organizationId: parsed.organizationId,
        payrollRunId: parsed.payrollRunId,
        asOf: openedAt,
      },
      tx,
    );

    return {
      plan,
      refreshedPlan,
      opened,
      skipped,
      idempotent: opened.every((entry) => entry.idempotent),
    };
  });
}
export async function openPayrollEmployeeBalanceCaseFromCorrection(
  input: OpenPayrollEmployeeBalanceCaseInput,
  client: DbClient = db,
) {
  const parsed = openPayrollEmployeeBalanceCaseInputSchema.parse(input);
  const openedAt = parseDate(parsed.now);

  return inTransaction(client, async (tx) => {
    const existing = await tx.payrollEmployeeBalanceCase.findFirst({
      where: {
        organizationId: parsed.organizationId,
        idempotencyKey: parsed.idempotencyKey,
      },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });
    if (existing) {
      return {
        balanceCase: existing,
        openedEvent: existing.events[0] ?? null,
        idempotent: true,
      };
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
    if (!run) throw new NotFoundError("Payroll correction run not found.");
    if (run.runType !== PayrollRunType.CORRECTION || !run.originalRunId) {
      throw new BusinessRuleError(
        "Payroll employee balance cases can only be opened from correction payroll runs.",
      );
    }
    if (run.status !== PayrollRunStatus.POSTED) {
      throw new BusinessRuleError(
        "Payroll employee balance cases require a posted correction payroll run.",
      );
    }

    const runProofMetadata = payrollRunProofMetadata(run.metadata);
    const correctionMetadata = payrollRunCorrectionMetadata(run);
    if (correctionMetadata.correctionRun !== true) {
      throw new BusinessRuleError(
        "Payroll employee balance cases require correction run proof metadata.",
      );
    }

    const payslip = run.payslips.find(
      (candidate) =>
        candidate.employeeId === parsed.employeeId &&
        (!parsed.payslipId || candidate.id === parsed.payslipId),
    );
    if (!payslip) {
      throw new NotFoundError(
        "Negative correction payslip for employee not found.",
      );
    }
    if (payslip.status !== PayrollPayslipStatus.EMITTED) {
      throw new BusinessRuleError(
        "Payroll employee balance cases require an emitted correction payslip.",
      );
    }
    if (decimal(payslip.netPayableAmount).gte(0)) {
      throw new BusinessRuleError(
        "Payroll employee balance case amount must come from a negative correction payslip.",
      );
    }

    const duplicate = await tx.payrollEmployeeBalanceCase.findFirst({
      where: {
        organizationId: parsed.organizationId,
        payrollRunId: run.id,
        employeeId: parsed.employeeId,
        payslipId: payslip.id,
        status: {
          notIn: [
            PayrollEmployeeBalanceCaseStatus.CANCELLED,
            PayrollEmployeeBalanceCaseStatus.WRITTEN_OFF,
          ],
        },
      },
    });
    if (duplicate) {
      throw new ConflictError(
        "An active payroll employee balance case already exists for this correction payslip.",
      );
    }

    const amount = decimal(payslip.netPayableAmount).abs();
    const controlDecision = evaluateSensitiveAction({
      action: "payroll.payment.release",
      actorId: parsed.approvedById,
      organizationId: parsed.organizationId,
      actorPermissions: parsed.actorPermissions,
      lastAuthAt: parsed.lastAuthAt,
      now: openedAt,
      resourceType: "PayrollEmployeeBalanceCase",
      resourceId: run.id,
      subjectActorId: parsed.openedById,
      amount,
      currency: payslip.currency,
      metadata: {
        payrollRunId: run.id,
        runNumber: run.runNumber,
        employeeId: parsed.employeeId,
        balanceCaseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
        ...correctionMetadata,
        ...runProofMetadata,
      },
    });
    await auditSensitiveActionDecision(tx, controlDecision);
    assertSensitiveActionAllowed(controlDecision);

    const period = await getOpenPeriodForDate(
      parsed.organizationId,
      openedAt,
      tx,
    );
    const caseNumber = await nextPayrollBalanceCaseNumber(
      tx,
      parsed.organizationId,
      openedAt,
    );
    const evidencePayload = {
      kind: "AQSTOQFLOW_PAYROLL_EMPLOYEE_BALANCE_CASE",
      version: 1,
      caseNumber,
      caseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
      payrollRunId: run.id,
      runNumber: run.runNumber,
      employeeId: parsed.employeeId,
      payslipId: payslip.id,
      payslipNumber: payslip.payslipNumber,
      sourceNetPayableAmount: decimal(payslip.netPayableAmount).toFixed(2),
      amount: amount.toFixed(2),
      currency: normalizeCurrency(payslip.currency),
      reason: parsed.reason,
      openedAt: openedAt.toISOString(),
      openedById: parsed.openedById,
      approvedById: parsed.approvedById,
      supportingEvidenceHash: parsed.supportingEvidenceHash ?? null,
      payrollRunDocumentHash: run.documentHash,
      ...correctionMetadata,
      ...runProofMetadata,
    };
    const documentHash = parsed.documentHash ?? prefixedHash(evidencePayload);
    const evidenceHash = prefixedHash({
      ...evidencePayload,
      documentHash,
      requestedMetadata: parsed.metadata ?? null,
    });

    const balanceCase = await tx.payrollEmployeeBalanceCase.create({
      data: {
        organizationId: parsed.organizationId,
        employeeId: parsed.employeeId,
        payrollRunId: run.id,
        payslipId: payslip.id,
        caseNumber,
        caseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
        status: PayrollEmployeeBalanceCaseStatus.OPEN,
        amount,
        settledAmount: new Prisma.Decimal(0),
        outstandingAmount: amount,
        sourceNetPayableAmount: decimal(payslip.netPayableAmount),
        currency: normalizeCurrency(payslip.currency),
        reason: parsed.reason,
        openedAt,
        openedById: parsed.openedById,
        documentHash,
        evidenceHash,
        idempotencyKey: parsed.idempotencyKey,
        metadata: safeJson({
          gate: "payroll-employee-balance-lifecycle",
          payload: evidencePayload,
          idempotencyPayloadHash: prefixedHash(evidencePayload),
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
    });

    const postingResult = await createBalanceLedgerPosting(tx, {
      organizationId: parsed.organizationId,
      periodId: period.id,
      sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE,
      sourceId: balanceCase.id,
      postingPurpose: AccountingPostingPurpose.PAYROLL_EMPLOYEE_RECEIVABLE,
      idempotencyKey: `payroll-balance:${balanceCase.id}:open-posting`,
      journalType: JournalType.PAYROLL,
      entryDate: openedAt,
      sourceNumber: balanceCase.caseNumber,
      memo: `Payroll employee receivable ${balanceCase.caseNumber}`,
      actorId: parsed.approvedById,
      amount,
      currency: balanceCase.currency,
      documentHash,
      metadata: {
        balanceCaseId: balanceCase.id,
        balanceCaseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
        payrollRunId: run.id,
        runNumber: run.runNumber,
        employeeId: parsed.employeeId,
        payslipId: payslip.id,
        settlementMethod: null,
        ...correctionMetadata,
        ...runProofMetadata,
      },
      auditAction: "PAYROLL_EMPLOYEE_RECEIVABLE_POSTED",
      resourceType: "PayrollEmployeeBalanceCase",
      resourceId: balanceCase.id,
    });

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.employee_balance.opened",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey: `payroll-balance-opened:${balanceCase.id}`,
        payload: {
          balanceCaseId: balanceCase.id,
          caseNumber: balanceCase.caseNumber,
          caseType: balanceCase.caseType,
          status: balanceCase.status,
          payrollRunId: run.id,
          runNumber: run.runNumber,
          employeeId: parsed.employeeId,
          payslipId: payslip.id,
          amount: amount.toFixed(2),
          currency: balanceCase.currency,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntry.id,
          accountingSourceLinkId: postingResult.accountingSourceLinkId,
          documentHash,
          evidenceHash,
          ...correctionMetadata,
          ...runProofMetadata,
        },
        occurredAt: openedAt,
        actorId: parsed.approvedById,
        sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE,
        sourceId: balanceCase.id,
        documentHash: evidenceHash,
        metadata: {
          gate: "payroll-employee-balance-lifecycle",
          documentHash,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_employee_balance.opened",
            destination: "payroll",
            payload: {
              severity: "warning",
              balanceCaseId: balanceCase.id,
              caseNumber: balanceCase.caseNumber,
              amount: amount.toFixed(2),
              currency: balanceCase.currency,
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

    const openedEvent = await tx.payrollEmployeeBalanceEvent.create({
      data: {
        organizationId: parsed.organizationId,
        balanceCaseId: balanceCase.id,
        eventType: PayrollEmployeeBalanceEventType.OPEN,
        amount,
        currency: balanceCase.currency,
        eventDate: openedAt,
        actorId: parsed.approvedById,
        method: null,
        documentHash,
        evidenceHash,
        ledgerPostingBatchId: postingResult.ledgerBatch.id,
        journalEntryId: postingResult.journalEntry.id,
        accountingSourceLinkId: postingResult.accountingSourceLinkId,
        businessEventId: eventResult.event.id,
        idempotencyKey: `${parsed.idempotencyKey}:open`,
        metadata: safeJson({
          payload: evidencePayload,
          businessEventId: eventResult.event.id,
          ...correctionMetadata,
          ...runProofMetadata,
        }),
      },
    });

    const updatedCase = await tx.payrollEmployeeBalanceCase.update({
      where: { id: balanceCase.id },
      data: {
        ledgerPostingBatchId: postingResult.ledgerBatch.id,
        journalEntryId: postingResult.journalEntry.id,
        accountingSourceLinkId: postingResult.accountingSourceLinkId,
        openedBusinessEventId: eventResult.event.id,
        metadata: safeJson({
          ...asRecord(balanceCase.metadata),
          openedEventId: openedEvent.id,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntry.id,
          accountingSourceLinkId: postingResult.accountingSourceLinkId,
          openedBusinessEventId: eventResult.event.id,
        }),
      },
    });

    await recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      parsed.organizationId,
      {
        sourceCode: "PAYROLL_EMPLOYEE_BALANCE_OPENED",
        sourceId: balanceCase.id,
        periodStart: run.payrollPeriod.periodStart,
        periodEnd: run.payrollPeriod.periodEnd,
        periodId: period.id,
        staleReason:
          "Payroll employee balance case changed certified close evidence.",
        newEvidenceHash: evidenceHash,
        correlationId: parsed.idempotencyKey,
      },
      { actorId: parsed.approvedById, now: openedAt },
    );

    await tx.auditLog.create({
      data: {
        entityType: "PayrollEmployeeBalanceCase",
        entityId: balanceCase.id,
        action: "PAYROLL_EMPLOYEE_BALANCE_CASE_OPENED",
        userId: parsed.approvedById,
        organizationId: parsed.organizationId,
        changes: safeJson({
          after: {
            caseNumber: balanceCase.caseNumber,
            employeeId: parsed.employeeId,
            payrollRunId: run.id,
            amount: amount.toFixed(2),
            currency: balanceCase.currency,
            ledgerPostingBatchId: postingResult.ledgerBatch.id,
            businessEventId: eventResult.event.id,
            ...correctionMetadata,
          },
        }),
      },
    });

    return {
      balanceCase: updatedCase,
      openedEvent,
      idempotent: false,
    };
  });
}

export async function settlePayrollEmployeeBalanceCase(
  input: SettlePayrollEmployeeBalanceCaseInput,
  client: DbClient = db,
) {
  const parsed = settlePayrollEmployeeBalanceCaseInputSchema.parse(input);
  const settlementDate = parseDate(parsed.settlementDate);
  const settledAmount = decimal(parsed.amount);
  if (settledAmount.lte(0)) {
    throw new BusinessRuleError(
      "Payroll employee balance settlement amount must be greater than zero.",
    );
  }

  return inTransaction(client, async (tx) => {
    const existingEvent = await tx.payrollEmployeeBalanceEvent.findFirst({
      where: {
        organizationId: parsed.organizationId,
        idempotencyKey: parsed.idempotencyKey,
      },
    });
    if (existingEvent) {
      const existingCase = await tx.payrollEmployeeBalanceCase.findFirst({
        where: {
          id: existingEvent.balanceCaseId,
          organizationId: parsed.organizationId,
        },
      });
      return {
        balanceCase: existingCase,
        settlementEvent: existingEvent,
        idempotent: true,
      };
    }

    const balanceCase = await tx.payrollEmployeeBalanceCase.findFirst({
      where: {
        id: parsed.balanceCaseId,
        organizationId: parsed.organizationId,
      },
      include: {
        payrollRun: { include: { payrollPeriod: true } },
      },
    });
    if (!balanceCase)
      throw new NotFoundError("Payroll employee balance case not found.");
    if (!SETTLEABLE_BALANCE_STATUSES.has(balanceCase.status)) {
      throw new BusinessRuleError(
        "Payroll employee balance case is not open for settlement.",
      );
    }
    if (balanceCase.caseType !== PayrollEmployeeBalanceCaseType.RECEIVABLE) {
      throw new BusinessRuleError(
        "This settlement workflow currently supports employee receivable recovery cases.",
      );
    }
    if (settledAmount.gt(decimal(balanceCase.outstandingAmount))) {
      throw new BusinessRuleError(
        "Payroll employee balance settlement exceeds the outstanding amount.",
      );
    }

    const controlDecision = evaluateSensitiveAction({
      action: "payroll.payment.reconcile",
      actorId: parsed.approvedById,
      organizationId: parsed.organizationId,
      actorPermissions: parsed.actorPermissions,
      lastAuthAt: parsed.lastAuthAt,
      now: parseDate(parsed.now, settlementDate),
      resourceType: "PayrollEmployeeBalanceCase",
      resourceId: balanceCase.id,
      subjectActorId: parsed.settledById,
      amount: settledAmount,
      currency: balanceCase.currency,
      metadata: {
        balanceCaseId: balanceCase.id,
        caseNumber: balanceCase.caseNumber,
        settlementMethod: parsed.settlementMethod,
      },
    });
    await auditSensitiveActionDecision(tx, controlDecision);
    assertSensitiveActionAllowed(controlDecision);

    const eventId = randomUUID();
    const eventType = eventTypeForSettlement(parsed.settlementMethod);
    const period = await getOpenPeriodForDate(
      parsed.organizationId,
      settlementDate,
      tx,
    );
    const evidencePayload = {
      kind: "AQSTOQFLOW_PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT",
      version: 1,
      balanceCaseId: balanceCase.id,
      caseNumber: balanceCase.caseNumber,
      eventId,
      eventType,
      settlementMethod: parsed.settlementMethod,
      amount: settledAmount.toFixed(2),
      previousOutstandingAmount: decimal(balanceCase.outstandingAmount).toFixed(
        2,
      ),
      currency: balanceCase.currency,
      employeeId: balanceCase.employeeId,
      payrollRunId: balanceCase.payrollRunId,
      settlementDate: settlementDate.toISOString(),
      settledById: parsed.settledById,
      approvedById: parsed.approvedById,
      settlementEvidenceHash: parsed.settlementEvidenceHash,
      reference: parsed.reference ?? null,
      notes: parsed.notes ?? null,
    };
    const documentHash = parsed.documentHash ?? prefixedHash(evidencePayload);
    const evidenceHash = prefixedHash({
      ...evidencePayload,
      documentHash,
      requestedMetadata: parsed.metadata ?? null,
    });
    const postingResult = await createBalanceLedgerPosting(tx, {
      organizationId: parsed.organizationId,
      periodId: period.id,
      sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT,
      sourceId: eventId,
      postingPurpose:
        AccountingPostingPurpose.PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT,
      idempotencyKey: `payroll-balance:${eventId}:settlement-posting`,
      journalType: journalTypeForSettlement(parsed.settlementMethod),
      entryDate: settlementDate,
      sourceNumber: `${balanceCase.caseNumber}-${eventType}`,
      memo: `Payroll employee balance settlement ${balanceCase.caseNumber}`,
      actorId: parsed.approvedById,
      amount: settledAmount,
      currency: balanceCase.currency,
      documentHash,
      metadata: {
        balanceCaseId: balanceCase.id,
        caseNumber: balanceCase.caseNumber,
        eventId,
        eventType,
        settlementMethod: parsed.settlementMethod,
        method: paymentMethodForSettlement(parsed.settlementMethod),
        settlementEvidenceHash: parsed.settlementEvidenceHash,
      },
      auditAction: "PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT_POSTED",
      resourceType: "PayrollEmployeeBalanceEvent",
      resourceId: eventId,
    });

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.employee_balance.settled",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey: `payroll-balance-settled:${eventId}`,
        payload: {
          ...evidencePayload,
          documentHash,
          evidenceHash,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntry.id,
          accountingSourceLinkId: postingResult.accountingSourceLinkId,
        },
        occurredAt: settlementDate,
        actorId: parsed.approvedById,
        sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT,
        sourceId: eventId,
        documentHash: evidenceHash,
        metadata: {
          gate: "payroll-employee-balance-lifecycle",
          balanceCaseId: balanceCase.id,
          documentHash,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_employee_balance.settled",
            destination: "payroll",
            payload: {
              severity: "info",
              balanceCaseId: balanceCase.id,
              eventId,
              amount: settledAmount.toFixed(2),
              settlementMethod: parsed.settlementMethod,
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

    const settlementEvent = await tx.payrollEmployeeBalanceEvent.create({
      data: {
        id: eventId,
        organizationId: parsed.organizationId,
        balanceCaseId: balanceCase.id,
        eventType,
        amount: settledAmount,
        currency: balanceCase.currency,
        eventDate: settlementDate,
        actorId: parsed.approvedById,
        method: paymentMethodForSettlement(parsed.settlementMethod),
        documentHash,
        evidenceHash,
        ledgerPostingBatchId: postingResult.ledgerBatch.id,
        journalEntryId: postingResult.journalEntry.id,
        accountingSourceLinkId: postingResult.accountingSourceLinkId,
        businessEventId: eventResult.event.id,
        idempotencyKey: parsed.idempotencyKey,
        metadata: safeJson({
          payload: evidencePayload,
          businessEventId: eventResult.event.id,
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
    });

    const nextSettledAmount = decimal(balanceCase.settledAmount)
      .plus(settledAmount)
      .toDecimalPlaces(2);
    const nextOutstandingAmount = decimal(balanceCase.amount)
      .minus(nextSettledAmount)
      .toDecimalPlaces(2);
    const nextStatus = nextOutstandingAmount.eq(0)
      ? PayrollEmployeeBalanceCaseStatus.SETTLED
      : PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED;
    const updatedCase = await tx.payrollEmployeeBalanceCase.update({
      where: { id: balanceCase.id },
      data: {
        status: nextStatus,
        settledAmount: nextSettledAmount,
        outstandingAmount: nextOutstandingAmount,
        settledAt:
          nextStatus === PayrollEmployeeBalanceCaseStatus.SETTLED
            ? settlementDate
            : balanceCase.settledAt,
        settledById:
          nextStatus === PayrollEmployeeBalanceCaseStatus.SETTLED
            ? parsed.approvedById
            : balanceCase.settledById,
        metadata: safeJson({
          ...asRecord(balanceCase.metadata),
          lastSettlementEventId: settlementEvent.id,
          lastSettlementEvidenceHash: evidenceHash,
          lastSettlementMethod: parsed.settlementMethod,
        }),
      },
    });

    await recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      parsed.organizationId,
      {
        sourceCode: "PAYROLL_EMPLOYEE_BALANCE_SETTLED",
        sourceId: settlementEvent.id,
        periodStart: balanceCase.payrollRun.payrollPeriod.periodStart,
        periodEnd: balanceCase.payrollRun.payrollPeriod.periodEnd,
        periodId: period.id,
        staleReason:
          "Payroll employee balance settlement changed certified close evidence.",
        newEvidenceHash: evidenceHash,
        correlationId: parsed.idempotencyKey,
      },
      { actorId: parsed.approvedById, now: settlementDate },
    );

    await tx.auditLog.create({
      data: {
        entityType: "PayrollEmployeeBalanceCase",
        entityId: balanceCase.id,
        action: "PAYROLL_EMPLOYEE_BALANCE_CASE_SETTLED",
        userId: parsed.approvedById,
        organizationId: parsed.organizationId,
        changes: safeJson({
          after: {
            eventId: settlementEvent.id,
            amount: settledAmount.toFixed(2),
            settlementMethod: parsed.settlementMethod,
            status: updatedCase.status,
            outstandingAmount: nextOutstandingAmount.toFixed(2),
            ledgerPostingBatchId: postingResult.ledgerBatch.id,
            businessEventId: eventResult.event.id,
          },
        }),
      },
    });

    return {
      balanceCase: updatedCase,
      settlementEvent,
      idempotent: false,
    };
  });
}
