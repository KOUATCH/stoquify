import "server-only";

import {
  ExceptionSeverity,
  MatchStatus,
  PaymentDirection,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentMethod,
  PaymentTransactionState,
  PayrollPaymentBatchStatus,
  Prisma,
  ProviderEventStatus,
  StatementLineDirection,
} from "@prisma/client";
import { z } from "zod";

import { db } from "@/prisma/db";
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors";
import {
  payrollSettlementEvidenceInputFromProviderOutcome,
  type PayrollPaymentProviderAdapter,
  type PayrollPaymentProviderAdapterOutcome,
  type PayrollPaymentProviderAdapterSubmitInput,
} from "./payroll-payment-provider-fixture-runner.service";
import {
  recordPayrollPaymentSettlementEvidence,
  type PayrollPaymentSettlementResult,
} from "./payment-reconciliation.service";

const idSchema = z.string().trim().min(1);
const hashSchema = z.string().trim().min(1);
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);

export const payrollProviderMatchedSettlementInputSchema = z.object({
  organizationId: idSchema,
  payrollPaymentBatchId: idSchema,
  matchRecordId: idSchema,
  actorId: idSchema.optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  approvedById: idSchema.optional(),
  sourceRegisterHash: hashSchema,
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
});

export type PayrollProviderMatchedSettlementInput = z.input<
  typeof payrollProviderMatchedSettlementInputSchema
>;

type DbClient = typeof db | Prisma.TransactionClient;

type RecordSettlement = typeof recordPayrollPaymentSettlementEvidence;

export type PayrollProviderSettlementBridgeDependencies = {
  adapter: PayrollPaymentProviderAdapter;
  client?: DbClient;
  recordSettlement?: RecordSettlement;
};

const batchSelect = {
  id: true,
  organizationId: true,
  payrollRunId: true,
  batchNumber: true,
  status: true,
  method: true,
  amount: true,
  currency: true,
  bankFileHash: true,
  paymentTransactionId: true,
  ledgerPostingBatchId: true,
  postedBusinessEventId: true,
  reconciliationStatus: true,
  metadata: true,
} satisfies Prisma.PayrollPaymentBatchSelect;

const transactionSelect = {
  id: true,
  organizationId: true,
  providerAccountId: true,
  ledgerPostingBatchId: true,
  direction: true,
  state: true,
  amount: true,
  currencyCode: true,
  providerTransactionId: true,
  providerReference: true,
  sourceType: true,
  sourceId: true,
  payloadHash: true,
} satisfies Prisma.PaymentTransactionSelect;

const matchSelect = {
  id: true,
  organizationId: true,
  providerAccountId: true,
  paymentTransactionId: true,
  providerEventId: true,
  statementLineId: true,
  reconciliationRunId: true,
  rule: true,
  status: true,
  confidence: true,
  amountMatched: true,
  currencyCode: true,
  matchedById: true,
  matchedAt: true,
  metadata: true,
  providerEvent: {
    select: {
      id: true,
      providerEventId: true,
      providerTransactionId: true,
      providerReference: true,
      eventType: true,
      status: true,
      direction: true,
      amount: true,
      currencyCode: true,
      rawPayloadHash: true,
      signatureHash: true,
      signatureValid: true,
    },
  },
  statementLine: {
    select: {
      id: true,
      providerTransactionId: true,
      providerReference: true,
      direction: true,
      status: true,
      amount: true,
      currencyCode: true,
      rawLineHash: true,
      statementFile: {
        select: {
          id: true,
          fileHash: true,
        },
      },
    },
  },
  reconciliationRun: {
    select: {
      id: true,
      status: true,
      certificateHash: true,
    },
  },
} satisfies Prisma.MatchRecordSelect;

type PayrollPaymentBatchForBridge = Prisma.PayrollPaymentBatchGetPayload<{
  select: typeof batchSelect;
}>;
type PaymentTransactionForBridge = Prisma.PaymentTransactionGetPayload<{
  select: typeof transactionSelect;
}>;
type MatchRecordForBridge = Prisma.MatchRecordGetPayload<{
  select: typeof matchSelect;
}>;

export type PayrollProviderSettlementBridgeResult =
  | {
      status: "SETTLED" | "PARTIALLY_SETTLED";
      payrollPaymentBatchId: string;
      matchRecordId: string;
      providerOutcome: Extract<
        PayrollPaymentProviderAdapterOutcome,
        { status: "settled" | "partially_settled" }
      >;
      settlement: PayrollPaymentSettlementResult;
    }
  | {
      status: "REVERSAL_REQUIRES_CORRECTION" | "FAILED_REQUIRES_REVIEW";
      payrollPaymentBatchId: string;
      matchRecordId: string;
      providerOutcome: PayrollPaymentProviderAdapterOutcome | null;
      exceptionId: string;
      idempotent: boolean;
    }
  | {
      status: "RETRY_SCHEDULED";
      payrollPaymentBatchId: string;
      matchRecordId: string;
      providerOutcome: Extract<
        PayrollPaymentProviderAdapterOutcome,
        { status: "retryable_error" }
      >;
    };

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

function metadataNumber(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "number" && Number.isFinite(entry) ? entry : null;
}

function requireMetadataHash(metadata: unknown, key: string) {
  const value = metadataString(metadata, key);
  if (!value) {
    throw new BusinessRuleError(
      `Payroll provider settlement bridge requires released payment proof ${key}.`,
    );
  }
  return value;
}

function providerEvidenceIndicatesReversal(match: MatchRecordForBridge) {
  const eventType = match.providerEvent?.eventType.toUpperCase() ?? "";
  return (
    eventType.includes("REVERS") ||
    eventType.includes("REFUND") ||
    match.statementLine?.direction === StatementLineDirection.REVERSAL
  );
}

type MoneyProofValue = { toFixed(decimalPlaces?: number): string } | string | number;

function moneyFingerprint(value: MoneyProofValue | null | undefined) {
  if (typeof value === "string") {
    const amount = Number.parseFloat(value.trim());
    return Number.isFinite(amount) ? amount.toFixed(2) : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toFixed(2) : null;
  }
  return value?.toFixed(2) ?? null;
}

function moneyNumber(value: MoneyProofValue) {
  const amount = moneyFingerprint(value);
  return amount ? Number.parseFloat(amount) : Number.NaN;
}

function assertMoneyEquals(input: {
  actual: MoneyProofValue | null | undefined;
  actualLabel: string;
  expected: MoneyProofValue;
  expectedLabel: string;
}) {
  if (moneyFingerprint(input.actual) !== moneyFingerprint(input.expected)) {
    throw new BusinessRuleError(
      `Payroll provider settlement bridge requires ${input.actualLabel} amount to tie out to ${input.expectedLabel}.`,
    );
  }
}

function assertCurrencyEquals(input: {
  actual: string | null | undefined;
  actualLabel: string;
  expected: string;
  expectedLabel: string;
}) {
  if (
    (input.actual ?? "").trim().toUpperCase() !==
    input.expected.trim().toUpperCase()
  ) {
    throw new BusinessRuleError(
      `Payroll provider settlement bridge requires ${input.actualLabel} currency to tie out to ${input.expectedLabel}.`,
    );
  }
}

function assertPositiveMatchAmount(match: MatchRecordForBridge) {
  if (!match.amountMatched || moneyNumber(match.amountMatched) <= 0) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge requires positive approved match amount evidence.",
    );
  }
}

function assertSettlementMoneyTieOut(input: {
  batch: PayrollPaymentBatchForBridge;
  transaction: PaymentTransactionForBridge;
  match: MatchRecordForBridge;
}) {
  assertMoneyEquals({
    actual: input.transaction.amount,
    actualLabel: "payment transaction",
    expected: input.batch.amount,
    expectedLabel: "payroll payment batch",
  });
  assertCurrencyEquals({
    actual: input.transaction.currencyCode,
    actualLabel: "payment transaction",
    expected: input.batch.currency,
    expectedLabel: "payroll payment batch",
  });
  assertPositiveMatchAmount(input.match);
  assertCurrencyEquals({
    actual: input.match.currencyCode,
    actualLabel: "approved provider match",
    expected: input.batch.currency,
    expectedLabel: "payroll payment batch",
  });
  if (
    moneyNumber(input.match.amountMatched!) > moneyNumber(input.transaction.amount)
  ) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge approved match amount cannot exceed the linked payroll payment transaction.",
    );
  }
  if (input.match.providerEvent) {
    assertMoneyEquals({
      actual: input.match.providerEvent.amount,
      actualLabel: "provider event",
      expected: input.match.amountMatched!,
      expectedLabel: "approved provider match",
    });
    assertCurrencyEquals({
      actual: input.match.providerEvent.currencyCode,
      actualLabel: "provider event",
      expected: input.batch.currency,
      expectedLabel: "payroll payment batch",
    });
  }
  if (input.match.statementLine) {
    assertMoneyEquals({
      actual: input.match.statementLine.amount,
      actualLabel: "statement line",
      expected: input.match.amountMatched!,
      expectedLabel: "approved provider match",
    });
    assertCurrencyEquals({
      actual: input.match.statementLine.currencyCode,
      actualLabel: "statement line",
      expected: input.batch.currency,
      expectedLabel: "payroll payment batch",
    });
  }
}

function assertProviderSettlementOutcomeMoneyTieOut(input: {
  outcome: Extract<
    PayrollPaymentProviderAdapterOutcome,
    { status: "settled" | "partially_settled" }
  >;
  submitInput: PayrollPaymentProviderAdapterSubmitInput;
}) {
  if (input.submitInput.amount === undefined || input.submitInput.amount === null) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge requires submitted payroll payment amount proof.",
    );
  }
  assertMoneyEquals({
    actual: input.outcome.amount,
    actualLabel: "provider settlement outcome",
    expected: input.submitInput.amount,
    expectedLabel: "submitted payroll payment",
  });
  assertCurrencyEquals({
    actual: input.outcome.currency,
    actualLabel: "provider settlement outcome",
    expected: input.submitInput.currency,
    expectedLabel: "submitted payroll payment",
  });
}

function tieOutBlocker(check: () => void) {
  try {
    check();
    return null;
  } catch (error) {
    if (error instanceof BusinessRuleError) return error.message;
    return "Payroll provider settlement bridge could not verify settlement money tie-out evidence.";
  }
}

function settlementMoneyTieOutBlocker(input: {
  batch: PayrollPaymentBatchForBridge;
  transaction: PaymentTransactionForBridge;
  match: MatchRecordForBridge;
}) {
  return tieOutBlocker(() => assertSettlementMoneyTieOut(input));
}

function providerSettlementOutcomeMoneyTieOutBlocker(input: {
  outcome: Extract<
    PayrollPaymentProviderAdapterOutcome,
    { status: "settled" | "partially_settled" }
  >;
  submitInput: PayrollPaymentProviderAdapterSubmitInput;
}) {
  return tieOutBlocker(() => assertProviderSettlementOutcomeMoneyTieOut(input));
}

function assertBridgeableEvidence(input: {
  batch: PayrollPaymentBatchForBridge;
  transaction: PaymentTransactionForBridge;
  match: MatchRecordForBridge;
}) {
  if (
    input.batch.status !== PayrollPaymentBatchStatus.RELEASED &&
    input.batch.status !== PayrollPaymentBatchStatus.PARTIALLY_SETTLED
  ) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge requires a released payment batch.",
    );
  }
  if (!input.batch.ledgerPostingBatchId || !input.batch.postedBusinessEventId) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge requires posted payroll payment ledger evidence.",
    );
  }
  if (
    input.transaction.sourceType !== "PAYROLL_PAYMENT" ||
    input.transaction.sourceId !== input.batch.id
  ) {
    throw new BusinessRuleError(
      "Provider settlement evidence is not linked to the payroll payment batch.",
    );
  }
  if (input.transaction.state === PaymentTransactionState.SUSPENSE) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge cannot settle a payment transaction in suspense.",
    );
  }
  if (input.transaction.direction !== PaymentDirection.OUTBOUND) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge requires an outbound payroll payment transaction.",
    );
  }
  if (
    input.match.status !== MatchStatus.APPROVED &&
    input.match.status !== MatchStatus.AUTO_MATCHED
  ) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge requires an approved or auto-matched provider match.",
    );
  }
  if (!input.match.providerEvent && !input.match.statementLine) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge requires provider event or statement-line evidence.",
    );
  }
  if (
    input.match.providerEvent &&
    input.match.providerEvent.status !== ProviderEventStatus.VERIFIED &&
    input.match.providerEvent.status !== ProviderEventStatus.PROCESSED
  ) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge requires verified provider event evidence.",
    );
  }
  if (
    input.match.providerEvent?.direction &&
    input.match.providerEvent.direction !== PaymentDirection.OUTBOUND
  ) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge only accepts outbound provider payment evidence.",
    );
  }
  if (
    input.match.statementLine &&
    input.match.statementLine.direction !== StatementLineDirection.DEBIT &&
    input.match.statementLine.direction !== StatementLineDirection.REVERSAL
  ) {
    throw new BusinessRuleError(
      "Payroll provider settlement bridge only accepts debit statement evidence for settlement.",
    );
  }
}

function paymentProofFromBatch(batch: PayrollPaymentBatchForBridge) {
  const metadata = asRecord(batch.metadata);
  const providerAttempt = metadataNumber(metadata, "providerAttempt") ?? 1;
  const productionPaymentAutomationSupported =
    metadata.productionPaymentAutomationSupported === true;
  const adapterChaosReleaseGateHash = productionPaymentAutomationSupported
    ? requireMetadataHash(metadata, "adapterChaosReleaseGateHash")
    : metadataString(metadata, "adapterChaosReleaseGateHash");
  return {
    paymentProviderAdapterKey: requireMetadataHash(
      metadata,
      "paymentProviderAdapterKey",
    ),
    paymentAdapterProofHash: requireMetadataHash(metadata, "paymentAdapterProofHash"),
    paymentProviderAdapterContractHash: requireMetadataHash(
      metadata,
      "paymentProviderAdapterContractHash",
    ),
    providerCertificationHarnessHash: requireMetadataHash(
      metadata,
      "providerCertificationHarnessHash",
    ),
    adapterChaosReleaseGateHash,
    providerCredentialProofHash: requireMetadataHash(
      metadata,
      "providerCredentialProofHash",
    ),
    providerPayloadMappingHash: requireMetadataHash(
      metadata,
      "providerPayloadMappingHash",
    ),
    providerResponseMappingHash: requireMetadataHash(
      metadata,
      "providerResponseMappingHash",
    ),
    providerAdapterRequestHash: requireMetadataHash(
      metadata,
      "providerAdapterRequestHash",
    ),
    providerAdapterResponseHash: requireMetadataHash(
      metadata,
      "providerAdapterResponseHash",
    ),
    providerSettlementReceiptHash: requireMetadataHash(
      metadata,
      "providerSettlementReceiptHash",
    ),
    providerIdempotencyKey: requireMetadataHash(metadata, "providerIdempotencyKey"),
    providerAttempt,
    productionPaymentAutomationSupported,
  };
}

export function buildPayrollPaymentProviderSubmitFromMatch(input: {
  batch: PayrollPaymentBatchForBridge;
  transaction: PaymentTransactionForBridge;
  match: MatchRecordForBridge;
  sourceRegisterHash: string;
  now?: Date | string | number;
}): PayrollPaymentProviderAdapterSubmitInput {
  assertBridgeableEvidence(input);
  assertSettlementMoneyTieOut(input);
  const proof = paymentProofFromBatch(input.batch);
  const providerTransactionId =
    input.match.providerEvent?.providerTransactionId ??
    input.match.statementLine?.providerTransactionId ??
    input.transaction.providerTransactionId ??
    undefined;
  const providerReference =
    input.match.providerEvent?.providerReference ??
    input.match.statementLine?.providerReference ??
    input.transaction.providerReference ??
    input.batch.batchNumber;

  return {
    organizationId: input.batch.organizationId,
    payrollPaymentBatchId: input.batch.id,
    payrollRunId: input.batch.payrollRunId,
    method: input.batch.method as PaymentMethod,
    amount: input.batch.amount.toFixed(2),
    currency: input.batch.currency,
    sourceRegisterHash: input.sourceRegisterHash,
    paymentDisbursementFileHash: input.batch.bankFileHash ?? undefined,
    ...proof,
    providerEvidence: {
      providerEventRecordId: input.match.providerEvent?.id,
      providerEventId: input.match.providerEvent?.providerEventId,
      providerTransactionId,
      providerReference,
      statementLineId: input.match.statementLine?.id,
      statementFileHash: input.match.statementLine?.statementFile?.fileHash,
      rawPayloadHash: input.match.providerEvent?.rawPayloadHash,
      rawLineHash: input.match.statementLine?.rawLineHash ?? undefined,
    },
    now: input.now,
  };
}

async function loadBridgeEvidence(
  client: DbClient,
  input: z.output<typeof payrollProviderMatchedSettlementInputSchema>,
) {
  const batch = await client.payrollPaymentBatch.findFirst({
    where: {
      id: input.payrollPaymentBatchId,
      organizationId: input.organizationId,
    },
    select: batchSelect,
  });
  if (!batch) throw new NotFoundError("Payroll payment batch not found.");

  const transaction = await client.paymentTransaction.findFirst({
    where: {
      organizationId: input.organizationId,
      OR: [
        ...(batch.paymentTransactionId ? [{ id: batch.paymentTransactionId }] : []),
        { sourceType: "PAYROLL_PAYMENT", sourceId: batch.id },
      ],
    },
    select: transactionSelect,
  });
  if (!transaction) {
    throw new BusinessRuleError(
      "Payroll payment batch has no linked payment transaction for provider settlement.",
    );
  }

  const match = await client.matchRecord.findFirst({
    where: {
      id: input.matchRecordId,
      organizationId: input.organizationId,
      paymentTransactionId: transaction.id,
    },
    select: matchSelect,
  });
  if (!match) {
    throw new NotFoundError("Payroll provider settlement match was not found.");
  }

  return { batch, transaction, match };
}

async function recordProviderOutcomeException(
  client: DbClient,
  input: {
    batch: PayrollPaymentBatchForBridge;
    transaction: PaymentTransactionForBridge;
    match: MatchRecordForBridge;
    outcome: PayrollPaymentProviderAdapterOutcome | null;
    sourceRegisterHash: string;
    actorId?: string | null;
    now?: Date | string | number;
    reason: string;
  },
) {
  const providerEventId = input.match.providerEvent?.id ?? null;
  const statementLineId = input.match.statementLine?.id ?? null;
  const existing = await client.paymentException.findFirst({
    where: {
      organizationId: input.batch.organizationId,
      sourceType: "PAYROLL_PAYMENT_PROVIDER_OUTCOME",
      sourceId: input.batch.id,
      providerEventId,
      statementLineId,
      status: {
        notIn: [
          PaymentExceptionStatus.RESOLVED,
          PaymentExceptionStatus.DISMISSED,
        ],
      },
    },
    select: { id: true },
  });
  if (existing) return { exceptionId: existing.id, idempotent: true };

  const exception = await client.paymentException.create({
    data: {
      organizationId: input.batch.organizationId,
      providerAccountId:
        input.match.providerAccountId ?? input.transaction.providerAccountId,
      paymentTransactionId: input.transaction.id,
      providerEventId,
      statementLineId,
      reconciliationRunId: input.match.reconciliationRunId,
      type: PaymentExceptionType.MANUAL_REVIEW_REQUIRED,
      severity: ExceptionSeverity.HIGH,
      status: PaymentExceptionStatus.OPEN,
      sourceType: "PAYROLL_PAYMENT_PROVIDER_OUTCOME",
      sourceId: input.batch.id,
      evidence: safeJson({
        reason: input.reason,
        sourceRegisterHash: input.sourceRegisterHash,
        matchRecordId: input.match.id,
        providerOutcomeStatus: input.outcome?.status ?? "provider_evidence_reversal",
        providerResponseHash:
          input.outcome && "providerResponseHash" in input.outcome
            ? input.outcome.providerResponseHash
            : null,
        reversalReceiptHash:
          input.outcome && "reversalReceiptHash" in input.outcome
            ? input.outcome.reversalReceiptHash
            : null,
        errorCode:
          input.outcome && "errorCode" in input.outcome
            ? input.outcome.errorCode
            : null,
        providerOutcomeAmount:
          input.outcome && "amount" in input.outcome ? input.outcome.amount : null,
        providerOutcomeCurrency:
          input.outcome && "currency" in input.outcome
            ? input.outcome.currency
            : null,
        payrollPaymentBatchAmount: input.batch.amount.toFixed(2),
        payrollPaymentBatchCurrency: input.batch.currency,
        paymentTransactionAmount: input.transaction.amount.toFixed(2),
        paymentTransactionCurrency: input.transaction.currencyCode,
        approvedMatchAmount: input.match.amountMatched?.toFixed(2) ?? null,
        approvedMatchCurrency: input.match.currencyCode,
        providerEventAmount: input.match.providerEvent?.amount?.toFixed(2) ?? null,
        providerEventCurrency: input.match.providerEvent?.currencyCode ?? null,
        statementLineAmount: input.match.statementLine?.amount?.toFixed(2) ?? null,
        statementLineCurrency: input.match.statementLine?.currencyCode ?? null,
        providerEventId: input.match.providerEvent?.providerEventId ?? null,
        providerEventRecordId: providerEventId,
        providerEventType: input.match.providerEvent?.eventType ?? null,
        statementLineId,
        statementLineDirection: input.match.statementLine?.direction ?? null,
        paymentProviderAdapterKey: metadataString(
          input.batch.metadata,
          "paymentProviderAdapterKey",
        ),
        paymentAdapterProofHash: metadataString(
          input.batch.metadata,
          "paymentAdapterProofHash",
        ),
        redacted: true,
      }),
      resolutionNotes:
        "Provider outcome requires payroll correction or reversal workflow before settlement proof.",
      correlationId:
        input.match.providerEvent?.providerEventId ??
        input.match.statementLine?.id ??
        input.match.id,
      createdAt: input.now ? new Date(input.now) : undefined,
    },
    select: { id: true },
  });

  return { exceptionId: exception.id, idempotent: false };
}

export async function recordPayrollProviderMatchedSettlement(
  input: PayrollProviderMatchedSettlementInput,
  deps: PayrollProviderSettlementBridgeDependencies,
): Promise<PayrollProviderSettlementBridgeResult> {
  const parsed = payrollProviderMatchedSettlementInputSchema.parse(input);
  const client = deps.client ?? db;
  const recordSettlement = deps.recordSettlement ?? recordPayrollPaymentSettlementEvidence;
  const evidence = await loadBridgeEvidence(client, parsed);

  assertBridgeableEvidence(evidence);

  if (providerEvidenceIndicatesReversal(evidence.match)) {
    const exception = await recordProviderOutcomeException(client, {
      ...evidence,
      outcome: null,
      sourceRegisterHash: parsed.sourceRegisterHash,
      actorId: parsed.actorId,
      now: parsed.now,
      reason: "Provider evidence indicates reversal or refund.",
    });
    return {
      status: "REVERSAL_REQUIRES_CORRECTION",
      payrollPaymentBatchId: evidence.batch.id,
      matchRecordId: evidence.match.id,
      providerOutcome: null,
      ...exception,
    };
  }

  const settlementTieOutBlocker = settlementMoneyTieOutBlocker(evidence);
  if (settlementTieOutBlocker) {
    const exception = await recordProviderOutcomeException(client, {
      ...evidence,
      outcome: null,
      sourceRegisterHash: parsed.sourceRegisterHash,
      actorId: parsed.actorId,
      now: parsed.now,
      reason: settlementTieOutBlocker,
    });
    return {
      status: "FAILED_REQUIRES_REVIEW",
      payrollPaymentBatchId: evidence.batch.id,
      matchRecordId: evidence.match.id,
      providerOutcome: null,
      ...exception,
    };
  }

  const submitInput = buildPayrollPaymentProviderSubmitFromMatch({
    ...evidence,
    sourceRegisterHash: parsed.sourceRegisterHash,
    now: parsed.now,
  });
  const providerOutcome = await deps.adapter.submit(submitInput);

  if (
    providerOutcome.status === "settled" ||
    providerOutcome.status === "partially_settled"
  ) {
    const outcomeTieOutBlocker = providerSettlementOutcomeMoneyTieOutBlocker({
      outcome: providerOutcome,
      submitInput,
    });
    if (outcomeTieOutBlocker) {
      const exception = await recordProviderOutcomeException(client, {
        ...evidence,
        outcome: providerOutcome,
        sourceRegisterHash: parsed.sourceRegisterHash,
        actorId: parsed.actorId,
        now: parsed.now,
        reason: outcomeTieOutBlocker,
      });
      return {
        status: "FAILED_REQUIRES_REVIEW",
        payrollPaymentBatchId: evidence.batch.id,
        matchRecordId: evidence.match.id,
        providerOutcome,
        ...exception,
      };
    }
    const settlementInput = payrollSettlementEvidenceInputFromProviderOutcome({
      outcome: providerOutcome,
      organizationId: parsed.organizationId,
      payrollPaymentBatchId: evidence.batch.id,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      approvedById: parsed.approvedById,
      matchRecordId: evidence.match.id,
      reconciliationRunId: evidence.match.reconciliationRunId ?? undefined,
      sourceRegisterHash: parsed.sourceRegisterHash,
      lastAuthAt: parsed.lastAuthAt,
      now: parsed.now,
    });
    const settlement = await recordSettlement(settlementInput, client);
    return {
      status:
        providerOutcome.status === "settled" ? "SETTLED" : "PARTIALLY_SETTLED",
      payrollPaymentBatchId: evidence.batch.id,
      matchRecordId: evidence.match.id,
      providerOutcome,
      settlement,
    };
  }

  if (providerOutcome.status === "retryable_error") {
    return {
      status: "RETRY_SCHEDULED",
      payrollPaymentBatchId: evidence.batch.id,
      matchRecordId: evidence.match.id,
      providerOutcome,
    };
  }

  const exception = await recordProviderOutcomeException(client, {
    ...evidence,
    outcome: providerOutcome,
    sourceRegisterHash: parsed.sourceRegisterHash,
    actorId: parsed.actorId,
    now: parsed.now,
    reason:
      providerOutcome.status === "reversed"
        ? "Provider adapter returned reversal evidence."
        : "Provider adapter returned terminal failure evidence.",
  });

  return {
    status:
      providerOutcome.status === "reversed"
        ? "REVERSAL_REQUIRES_CORRECTION"
        : "FAILED_REQUIRES_REVIEW",
    payrollPaymentBatchId: evidence.batch.id,
    matchRecordId: evidence.match.id,
    providerOutcome,
    ...exception,
  };
}
