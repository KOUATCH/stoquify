import { z } from "zod";

export const POS_SHIFT_CASH_SHORTAGE_CHECK_KEY =
  "pos.closed_shift_cash_shortage.review" as const;
export const POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION = 1 as const;
export const POS_SHIFT_CASH_SHORTAGE_EVIDENCE_KIND =
  "cash_shortage/v1" as const;
export const POS_SHIFT_CASH_SHORTAGE_POLICY_KIND =
  "cash_shortage_policy/v1" as const;

const identifierSchema = z.string().trim().min(1);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const isoDateTimeSchema = z.string().datetime({ offset: true });
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const nonNegativeDecimalStringSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
const signedDecimalStringSchema = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/);

export const posShiftClosedPayloadV1Schema = z
  .object({
    evidenceVersion: z.literal(1),
    organizationId: identifierSchema,
    sessionId: identifierSchema,
    sessionNumber: identifierSchema,
    terminalId: identifierSchema,
    locationId: identifierSchema,
    cashDrawerId: identifierSchema,
    closingTransactionId: identifierSchema,
    actorId: identifierSchema,
    authorityMode: z.literal("SELF"),
    openedAt: isoDateTimeSchema,
    closedAt: isoDateTimeSchema,
    currency: currencySchema,
    openingBalance: nonNegativeDecimalStringSchema,
    expectedBalance: nonNegativeDecimalStringSchema,
    countedBalance: nonNegativeDecimalStringSchema,
    variance: signedDecimalStringSchema,
    varianceDirection: z.enum(["BALANCED", "SHORTAGE", "OVERAGE"]),
    explanation: z.string().trim().min(1).max(500).nullable(),
    totals: z
      .object({
        sales: nonNegativeDecimalStringSchema,
        tax: nonNegativeDecimalStringSchema,
        discount: nonNegativeDecimalStringSchema,
        transactionCount: z.number().int().nonnegative(),
        cash: nonNegativeDecimalStringSchema,
        card: nonNegativeDecimalStringSchema,
        mobileMoney: nonNegativeDecimalStringSchema,
        bankTransfer: nonNegativeDecimalStringSchema,
        credit: nonNegativeDecimalStringSchema,
      })
      .strict(),
  })
  .strict();

export const posShiftClosedEventV1Schema = z
  .object({
    id: identifierSchema,
    organizationId: identifierSchema,
    eventType: z.literal("pos.shift.closed"),
    eventSource: z.literal("POS"),
    schemaVersion: z.literal(1),
    status: z.enum([
      "RECORDED",
      "APPLIED",
      "REJECTED",
      "COMPENSATED",
      "FAILED",
    ]),
    idempotencyKey: identifierSchema,
    payloadHash: sha256Schema,
    payload: posShiftClosedPayloadV1Schema,
    occurredAt: isoDateTimeSchema,
    actorId: identifierSchema,
    locationId: identifierSchema,
    registerId: identifierSchema,
    sourceType: z.literal("CASH_DRAWER_CLOSE"),
    sourceId: identifierSchema,
    documentHash: sha256Schema,
  })
  .strict();

export const cashShortagePolicyV1Schema = z
  .object({
    kind: z.literal(POS_SHIFT_CASH_SHORTAGE_POLICY_KIND),
    policyId: identifierSchema,
    version: z.number().int().positive(),
    currency: currencySchema,
    reviewThreshold: nonNegativeDecimalStringSchema,
    highThreshold: nonNegativeDecimalStringSchema,
    minorUnitScale: z.number().int().min(0).max(4),
    roundingMode: z.enum(["HALF_UP", "HALF_EVEN"]),
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.nullable().default(null),
    approvalStatus: z.enum(["draft", "approved", "retired"]),
    approvedAt: isoDateTimeSchema.nullable().default(null),
    approvedById: identifierSchema.nullable().default(null),
    mode: z.enum(["observe", "enforce"]),
  })
  .strict();

export const CASH_SHORTAGE_BLOCK_CODES = [
  "SOURCE_SCHEMA_INVALID",
  "SOURCE_EVENT_STATUS_INVALID",
  "SOURCE_HASH_MISMATCH",
  "SOURCE_IDENTITY_MISMATCH",
  "SOURCE_ARITHMETIC_MISMATCH",
  "SOURCE_DIRECTION_MISMATCH",
  "SOURCE_EXPLANATION_REQUIRED",
  "POLICY_MISSING",
  "POLICY_SCHEMA_INVALID",
  "POLICY_NOT_APPROVED",
  "POLICY_APPROVAL_EVIDENCE_MISSING",
  "POLICY_MODE_UNSUPPORTED",
  "POLICY_CURRENCY_MISMATCH",
  "POLICY_NOT_EFFECTIVE",
  "POLICY_EXPIRED",
  "POLICY_THRESHOLD_INVALID",
] as const;

export type PosShiftClosedPayloadV1 = z.output<
  typeof posShiftClosedPayloadV1Schema
>;
export type PosShiftClosedEventV1 = z.output<
  typeof posShiftClosedEventV1Schema
>;
export type CashShortagePolicyV1 = z.output<typeof cashShortagePolicyV1Schema>;
export type CashShortageBlockCode = (typeof CASH_SHORTAGE_BLOCK_CODES)[number];
export type CashShortageNotTriggeredReason =
  | "balanced"
  | "overage"
  | "below_review_threshold";
export type CashShortageSeverity = "warning" | "high";

export type CashShortagePolicyReference = {
  policyId: string;
  version: number;
  policyHash: string;
  currency: string;
  mode: "observe";
  reviewThreshold: string;
  highThreshold: string;
  minorUnitScale: number;
  roundingMode: CashShortagePolicyV1["roundingMode"];
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type CashShortageEvidenceV1 = {
  kind: typeof POS_SHIFT_CASH_SHORTAGE_EVIDENCE_KIND;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  definitionVersion: typeof POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION;
  eventId: string;
  organizationId: string;
  sourceType: "POSSession";
  sourceId: string;
  sourceHash: string;
  locationId: string;
  terminalId: string;
  cashDrawerId: string;
  closingTransactionId: string;
  cashierId: string;
  closerId: string;
  authorityMode: "SELF";
  currency: string;
  openedAt: string;
  closedAt: string;
  explanation: string | null;
  original: {
    expectedBalance: string;
    countedBalance: string;
    signedVariance: string;
  };
  normalized: {
    expectedBalance: string;
    countedBalance: string;
    signedVariance: string;
    amountAtRisk: string;
  };
  policy: CashShortagePolicyReference;
};

export type CashShortageBlockedEvaluation = {
  outcome: "blocked";
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  definitionVersion: typeof POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION;
  code: CashShortageBlockCode;
  message: string;
};

export type CashShortageNotTriggeredEvaluation = {
  outcome: "not_triggered";
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  definitionVersion: typeof POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION;
  reason: CashShortageNotTriggeredReason;
  message: string;
  evidence: CashShortageEvidenceV1;
};

export type CashShortageTriggeredEvaluation = {
  outcome: "triggered";
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  definitionVersion: typeof POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION;
  severity: CashShortageSeverity;
  title: "Cash shortage requiring review";
  message: string;
  recommendedAction: string;
  evidence: CashShortageEvidenceV1;
};

export type CashShortageEvaluation =
  | CashShortageBlockedEvaluation
  | CashShortageNotTriggeredEvaluation
  | CashShortageTriggeredEvaluation;

export type EvaluatePosShiftCashShortageInput = {
  event: unknown;
  policy?: unknown | null;
};
