import { Prisma } from "@prisma/client";

import { hashBusinessPayload } from "@/services/events/business-event.service";

import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
  POS_SHIFT_CASH_SHORTAGE_EVIDENCE_KIND,
  cashShortagePolicyV1Schema,
  posShiftClosedEventV1Schema,
  type CashShortageBlockCode,
  type CashShortageBlockedEvaluation,
  type CashShortageEvaluation,
  type CashShortageEvidenceV1,
  type CashShortagePolicyV1,
  type EvaluatePosShiftCashShortageInput,
  type PosShiftClosedEventV1,
} from "./pos-shift-cash-shortage-contracts";

const ROUNDING_MODES = {
  HALF_UP: Prisma.Decimal.ROUND_HALF_UP,
  HALF_EVEN: Prisma.Decimal.ROUND_HALF_EVEN,
} as const satisfies Record<
  CashShortagePolicyV1["roundingMode"],
  Prisma.Decimal.Rounding
>;

const BLOCK_MESSAGES: Record<CashShortageBlockCode, string> = {
  SOURCE_SCHEMA_INVALID:
    "Shift-close evidence does not match the accepted source schema.",
  SOURCE_EVENT_STATUS_INVALID:
    "Shift-close evidence is not in an eligible event status.",
  SOURCE_HASH_MISMATCH:
    "Shift-close evidence does not match its recorded hash.",
  SOURCE_IDENTITY_MISMATCH:
    "Shift-close envelope and payload identities do not agree.",
  SOURCE_ARITHMETIC_MISMATCH:
    "Shift-close amounts do not support the recorded variance.",
  SOURCE_DIRECTION_MISMATCH:
    "Shift-close variance direction does not match its signed amount.",
  SOURCE_EXPLANATION_REQUIRED:
    "A nonzero shift-close variance requires an explanation.",
  POLICY_MISSING:
    "An approved cash-shortage policy is required for evaluation.",
  POLICY_SCHEMA_INVALID:
    "Cash-shortage policy does not match the accepted policy schema.",
  POLICY_NOT_APPROVED: "Cash-shortage policy is not approved.",
  POLICY_APPROVAL_EVIDENCE_MISSING:
    "Cash-shortage policy approval evidence is incomplete or too late.",
  POLICY_MODE_UNSUPPORTED:
    "Cash-shortage policy must be in observe mode for this evaluator.",
  POLICY_CURRENCY_MISMATCH:
    "Cash-shortage policy currency does not match the shift currency.",
  POLICY_NOT_EFFECTIVE:
    "Cash-shortage policy was not effective when the shift closed.",
  POLICY_EXPIRED: "Cash-shortage policy had expired when the shift closed.",
  POLICY_THRESHOLD_INVALID:
    "Cash-shortage policy thresholds are invalid at the configured scale.",
};

function blocked(code: CashShortageBlockCode): CashShortageBlockedEvaluation {
  return {
    outcome: "blocked",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    code,
    message: BLOCK_MESSAGES[code],
  };
}

function sourceDirection(
  variance: Prisma.Decimal,
): PosShiftClosedEventV1["payload"]["varianceDirection"] {
  if (variance.eq(0)) return "BALANCED";
  return variance.lt(0) ? "SHORTAGE" : "OVERAGE";
}

function dateValue(value: string) {
  return new Date(value).getTime();
}

function validateSource(
  event: PosShiftClosedEventV1,
): CashShortageBlockedEvaluation | null {
  if (event.status !== "RECORDED" && event.status !== "APPLIED") {
    return blocked("SOURCE_EVENT_STATUS_INVALID");
  }

  const payloadHash = hashBusinessPayload(event.payload);
  const documentHash = hashBusinessPayload({
    evidenceVersion: event.payload.evidenceVersion,
    organizationId: event.payload.organizationId,
    sessionId: event.payload.sessionId,
    actorId: event.payload.actorId,
    countedBalance: event.payload.countedBalance,
    explanation: event.payload.explanation,
  });
  if (
    event.payloadHash !== payloadHash ||
    event.documentHash !== documentHash
  ) {
    return blocked("SOURCE_HASH_MISMATCH");
  }

  if (
    event.organizationId !== event.payload.organizationId ||
    event.actorId !== event.payload.actorId ||
    event.locationId !== event.payload.locationId ||
    event.registerId !== event.payload.terminalId ||
    event.sourceId !== event.payload.sessionId ||
    event.occurredAt !== event.payload.closedAt
  ) {
    return blocked("SOURCE_IDENTITY_MISMATCH");
  }

  const expectedBalance = new Prisma.Decimal(event.payload.expectedBalance);
  const countedBalance = new Prisma.Decimal(event.payload.countedBalance);
  const recordedVariance = new Prisma.Decimal(event.payload.variance);
  const calculatedVariance = countedBalance.minus(expectedBalance);

  if (!recordedVariance.eq(calculatedVariance)) {
    return blocked("SOURCE_ARITHMETIC_MISMATCH");
  }
  if (event.payload.varianceDirection !== sourceDirection(recordedVariance)) {
    return blocked("SOURCE_DIRECTION_MISMATCH");
  }
  if (!recordedVariance.eq(0) && event.payload.explanation === null) {
    return blocked("SOURCE_EXPLANATION_REQUIRED");
  }

  return null;
}

function validatePolicy(
  policy: CashShortagePolicyV1,
  event: PosShiftClosedEventV1,
): CashShortageBlockedEvaluation | null {
  const closedAt = dateValue(event.payload.closedAt);
  const effectiveFrom = dateValue(policy.effectiveFrom);
  const effectiveTo =
    policy.effectiveTo === null ? null : dateValue(policy.effectiveTo);

  if (policy.approvalStatus !== "approved")
    return blocked("POLICY_NOT_APPROVED");
  if (
    policy.approvedAt === null ||
    policy.approvedById === null ||
    dateValue(policy.approvedAt) > closedAt
  ) {
    return blocked("POLICY_APPROVAL_EVIDENCE_MISSING");
  }
  if (policy.mode !== "observe") return blocked("POLICY_MODE_UNSUPPORTED");
  if (policy.currency !== event.payload.currency)
    return blocked("POLICY_CURRENCY_MISMATCH");
  if (effectiveTo !== null && effectiveTo <= effectiveFrom)
    return blocked("POLICY_SCHEMA_INVALID");
  if (closedAt < effectiveFrom) return blocked("POLICY_NOT_EFFECTIVE");
  if (effectiveTo !== null && closedAt >= effectiveTo)
    return blocked("POLICY_EXPIRED");

  const rounding = ROUNDING_MODES[policy.roundingMode];
  const reviewThreshold = new Prisma.Decimal(
    policy.reviewThreshold,
  ).toDecimalPlaces(policy.minorUnitScale, rounding);
  const highThreshold = new Prisma.Decimal(
    policy.highThreshold,
  ).toDecimalPlaces(policy.minorUnitScale, rounding);
  if (reviewThreshold.lte(0) || highThreshold.lt(reviewThreshold)) {
    return blocked("POLICY_THRESHOLD_INVALID");
  }

  return null;
}

function buildEvidence(
  event: PosShiftClosedEventV1,
  policy: CashShortagePolicyV1,
): CashShortageEvidenceV1 {
  const rounding = ROUNDING_MODES[policy.roundingMode];
  const expectedBalance = new Prisma.Decimal(
    event.payload.expectedBalance,
  ).toDecimalPlaces(policy.minorUnitScale, rounding);
  const countedBalance = new Prisma.Decimal(
    event.payload.countedBalance,
  ).toDecimalPlaces(policy.minorUnitScale, rounding);
  const signedVariance = countedBalance.minus(expectedBalance);
  const amountAtRisk = signedVariance.lt(0)
    ? signedVariance.abs()
    : new Prisma.Decimal(0);

  return {
    kind: POS_SHIFT_CASH_SHORTAGE_EVIDENCE_KIND,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    eventId: event.id,
    organizationId: event.organizationId,
    sourceType: "POSSession",
    sourceId: event.sourceId,
    sourceHash: event.payloadHash,
    locationId: event.locationId,
    terminalId: event.registerId,
    cashDrawerId: event.payload.cashDrawerId,
    closingTransactionId: event.payload.closingTransactionId,
    cashierId: event.payload.actorId,
    closerId: event.actorId,
    authorityMode: event.payload.authorityMode,
    currency: event.payload.currency,
    openedAt: event.payload.openedAt,
    closedAt: event.payload.closedAt,
    explanation: event.payload.explanation,
    original: {
      expectedBalance: event.payload.expectedBalance,
      countedBalance: event.payload.countedBalance,
      signedVariance: event.payload.variance,
    },
    normalized: {
      expectedBalance: expectedBalance.toFixed(policy.minorUnitScale),
      countedBalance: countedBalance.toFixed(policy.minorUnitScale),
      signedVariance: signedVariance.toFixed(policy.minorUnitScale),
      amountAtRisk: amountAtRisk.toFixed(policy.minorUnitScale),
    },
    policy: {
      policyId: policy.policyId,
      version: policy.version,
      policyHash: hashBusinessPayload(policy),
      currency: policy.currency,
      mode: "observe",
      reviewThreshold: new Prisma.Decimal(policy.reviewThreshold)
        .toDecimalPlaces(policy.minorUnitScale, rounding)
        .toFixed(policy.minorUnitScale),
      highThreshold: new Prisma.Decimal(policy.highThreshold)
        .toDecimalPlaces(policy.minorUnitScale, rounding)
        .toFixed(policy.minorUnitScale),
      minorUnitScale: policy.minorUnitScale,
      roundingMode: policy.roundingMode,
      effectiveFrom: policy.effectiveFrom,
      effectiveTo: policy.effectiveTo,
    },
  };
}

export function evaluatePosShiftCashShortage(
  input: EvaluatePosShiftCashShortageInput,
): CashShortageEvaluation {
  const parsedEvent = posShiftClosedEventV1Schema.safeParse(input.event);
  if (!parsedEvent.success) return blocked("SOURCE_SCHEMA_INVALID");

  const sourceFailure = validateSource(parsedEvent.data);
  if (sourceFailure) return sourceFailure;

  if (input.policy === undefined || input.policy === null)
    return blocked("POLICY_MISSING");
  const parsedPolicy = cashShortagePolicyV1Schema.safeParse(input.policy);
  if (!parsedPolicy.success) return blocked("POLICY_SCHEMA_INVALID");

  const policyFailure = validatePolicy(parsedPolicy.data, parsedEvent.data);
  if (policyFailure) return policyFailure;

  const evidence = buildEvidence(parsedEvent.data, parsedPolicy.data);
  if (parsedEvent.data.payload.varianceDirection === "BALANCED") {
    return {
      outcome: "not_triggered",
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
      reason: "balanced",
      message: "Closed shift is balanced.",
      evidence,
    };
  }
  if (parsedEvent.data.payload.varianceDirection === "OVERAGE") {
    return {
      outcome: "not_triggered",
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
      reason: "overage",
      message: "Closed shift has no cash shortage.",
      evidence,
    };
  }

  const amountAtRisk = new Prisma.Decimal(evidence.normalized.amountAtRisk);
  const reviewThreshold = new Prisma.Decimal(evidence.policy.reviewThreshold);
  const highThreshold = new Prisma.Decimal(evidence.policy.highThreshold);
  if (amountAtRisk.lt(reviewThreshold)) {
    return {
      outcome: "not_triggered",
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
      reason: "below_review_threshold",
      message: "Cash shortage is below the approved review threshold.",
      evidence,
    };
  }

  const highSeverity = amountAtRisk.gte(highThreshold);
  return {
    outcome: "triggered",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    severity: highSeverity ? "high" : "warning",
    title: "Cash shortage requiring review",
    message: highSeverity
      ? "Cash shortage meets the approved high-severity threshold."
      : "Cash shortage meets the approved review threshold.",
    recommendedAction:
      "Review the shift-close evidence and reconcile the counted cash before resolving.",
    evidence,
  };
}
