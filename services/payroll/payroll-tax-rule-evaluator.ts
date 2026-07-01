import { Prisma } from "@prisma/client";

import { BusinessRuleError } from "../_shared/action-errors";

export type PayrollTaxCapabilityStatus =
  | "SUPPORTED"
  | "SUPPORTED_CERTIFIED"
  | "PARTIALLY_SUPPORTED"
  | "REQUIRES_EXPERT_REVIEW"
  | "UNSUPPORTED"
  | string;

export type PayrollTaxBracket = {
  upToAmount?: Prisma.Decimal.Value | null;
  rateBps: number;
};

export type PayrollTaxAdjustmentOperation = "ADD" | "SUBTRACT";

export type PayrollTaxAdjustmentRule = {
  code: string;
  operation: PayrollTaxAdjustmentOperation;
  amount?: Prisma.Decimal.Value | null;
  inputKey?: string | null;
  capAmount?: Prisma.Decimal.Value | null;
  rateBps?: number | null;
};

export type PayrollTaxRule = {
  productionCalculationSupported?: boolean;
  calculationMode?: string;
  brackets?: PayrollTaxBracket[];
  roundingScale?: number;
  taxableBaseAdjustments?: PayrollTaxAdjustmentRule[];
  taxAmountAdjustments?: PayrollTaxAdjustmentRule[];
  minimumTaxAmount?: Prisma.Decimal.Value | null;
  maximumTaxAmount?: Prisma.Decimal.Value | null;
};

export type PayrollTaxRuleEvaluationInput = {
  taxableBaseAmount: Prisma.Decimal.Value;
  ytdTaxableBaseAmount?: Prisma.Decimal.Value | null;
  ytdTaxWithheldAmount?: Prisma.Decimal.Value | null;
  adjustmentValues?: Record<string, Prisma.Decimal.Value | null | undefined>;
  capabilityStatus: PayrollTaxCapabilityStatus;
  currency?: string | null;
};

export type PayrollTaxRuleEvaluationResult = {
  status: "CALCULATED" | "BLOCKED_REQUIRES_EXPERT_REVIEW";
  applied: boolean;
  taxAmount: Prisma.Decimal;
  taxableBaseAmount: Prisma.Decimal;
  adjustedTaxableBaseAmount: Prisma.Decimal;
  cumulativeTaxableBaseAmount: Prisma.Decimal;
  currency: string;
  trace: {
    calculationMode: string | null;
    bracketCount: number;
    capabilityStatus: string;
    productionCalculationSupported: boolean;
    ytdTaxWithheldAmount: string;
    taxableBaseAdjustmentAmount: string;
    taxAmountBeforeAdjustments: string;
    taxAmountAdjustmentAmount: string;
    taxAmountMinimumApplied: boolean;
    taxAmountMaximumApplied: boolean;
    adjustmentCodes: string[];
  };
};

const PRODUCTION_TAX_CAPABILITY_STATUSES = new Set<string>([
  "SUPPORTED",
  "SUPPORTED_CERTIFIED",
]);

function decimal(
  value: Prisma.Decimal.Value | null | undefined,
  label: string,
) {
  try {
    return new Prisma.Decimal(value ?? 0);
  } catch {
    throw new BusinessRuleError(`${label} must be a valid decimal amount.`);
  }
}

function optionalDecimal(
  value: Prisma.Decimal.Value | null | undefined,
  label: string,
) {
  if (value === null || value === undefined || value === "") return null;
  return decimal(value, label);
}

function normalizeCurrency(value?: string | null) {
  return (value || "XAF").trim().toUpperCase();
}

function assertSupportedRule(rule: PayrollTaxRule, capabilityStatus: string) {
  return (
    PRODUCTION_TAX_CAPABILITY_STATUSES.has(capabilityStatus) &&
    rule.productionCalculationSupported === true
  );
}

function sortedBrackets(brackets: PayrollTaxBracket[]) {
  return [...brackets].sort((left, right) => {
    if (left.upToAmount == null && right.upToAmount == null) return 0;
    if (left.upToAmount == null) return 1;
    if (right.upToAmount == null) return -1;
    return new Prisma.Decimal(left.upToAmount).comparedTo(right.upToAmount);
  });
}

function validateBracket(bracket: PayrollTaxBracket, index: number) {
  if (!Number.isFinite(bracket.rateBps) || bracket.rateBps < 0) {
    throw new BusinessRuleError(
      `Payroll tax bracket ${index + 1} requires a non-negative rate in basis points.`,
    );
  }
  if (
    bracket.upToAmount != null &&
    decimal(bracket.upToAmount, "Payroll tax bracket ceiling").lt(0)
  ) {
    throw new BusinessRuleError(
      `Payroll tax bracket ${index + 1} ceiling cannot be negative.`,
    );
  }
}

function validateAdjustmentRule(
  adjustment: PayrollTaxAdjustmentRule,
  index: number,
  scope: string,
) {
  if (!adjustment.code?.trim()) {
    throw new BusinessRuleError(
      `${scope} adjustment ${index + 1} requires a reviewed code.`,
    );
  }
  if (adjustment.operation !== "ADD" && adjustment.operation !== "SUBTRACT") {
    throw new BusinessRuleError(
      `${scope} adjustment ${adjustment.code} requires operation ADD or SUBTRACT.`,
    );
  }
  if (
    adjustment.rateBps !== null &&
    adjustment.rateBps !== undefined &&
    (!Number.isFinite(adjustment.rateBps) || adjustment.rateBps < 0)
  ) {
    throw new BusinessRuleError(
      `${scope} adjustment ${adjustment.code} requires a non-negative rate in basis points.`,
    );
  }
}

function adjustmentInputAmount(
  adjustment: PayrollTaxAdjustmentRule,
  input: PayrollTaxRuleEvaluationInput,
) {
  const inputKey = adjustment.inputKey?.trim();
  if (!inputKey) return new Prisma.Decimal(0);
  return decimal(
    input.adjustmentValues?.[inputKey] ?? 0,
    `Payroll tax adjustment input ${inputKey}`,
  );
}

function adjustmentAmount(
  adjustment: PayrollTaxAdjustmentRule,
  input: PayrollTaxRuleEvaluationInput,
) {
  const fixedAmount = decimal(
    adjustment.amount ?? 0,
    `Payroll tax adjustment ${adjustment.code}`,
  );
  const inputAmount = adjustmentInputAmount(adjustment, input);
  const ratedAmount =
    adjustment.rateBps === null || adjustment.rateBps === undefined
      ? new Prisma.Decimal(0)
      : inputAmount.times(adjustment.rateBps).div(10000);
  const rawAmount = fixedAmount.plus(
    adjustment.rateBps === null || adjustment.rateBps === undefined
      ? inputAmount
      : ratedAmount,
  );
  const capAmount = optionalDecimal(
    adjustment.capAmount,
    `Payroll tax adjustment ${adjustment.code} cap`,
  );
  if (capAmount && capAmount.lt(0)) {
    throw new BusinessRuleError(
      `Payroll tax adjustment ${adjustment.code} cap cannot be negative.`,
    );
  }
  return capAmount ? Prisma.Decimal.min(rawAmount, capAmount) : rawAmount;
}

function applyAdjustments(
  baseAmount: Prisma.Decimal,
  adjustments: readonly PayrollTaxAdjustmentRule[] | undefined,
  input: PayrollTaxRuleEvaluationInput,
  scope: string,
) {
  let amount = baseAmount;
  let adjustmentTotal = new Prisma.Decimal(0);
  const adjustmentCodes: string[] = [];

  (adjustments ?? []).forEach((adjustment, index) => {
    validateAdjustmentRule(adjustment, index, scope);
    const value = adjustmentAmount(adjustment, input).toDecimalPlaces(2);
    adjustmentCodes.push(adjustment.code);
    if (adjustment.operation === "ADD") {
      amount = amount.plus(value);
      adjustmentTotal = adjustmentTotal.plus(value);
    } else {
      amount = amount.minus(value);
      adjustmentTotal = adjustmentTotal.minus(value);
    }
  });

  return {
    amount: Prisma.Decimal.max(amount, new Prisma.Decimal(0)),
    adjustmentTotal,
    adjustmentCodes,
  };
}

function computeProgressiveTax(
  brackets: PayrollTaxBracket[],
  taxableBase: Prisma.Decimal,
) {
  const ordered = sortedBrackets(brackets);
  if (ordered.length === 0) {
    throw new BusinessRuleError(
      "Payroll tax rule requires reviewed bracket fixtures before calculation.",
    );
  }

  let previousFiniteCeiling: Prisma.Decimal | null = null;
  let openEndedBracketCount = 0;
  ordered.forEach((bracket, index) => {
    validateBracket(bracket, index);
    if (bracket.upToAmount == null) {
      openEndedBracketCount += 1;
      if (openEndedBracketCount > 1) {
        throw new BusinessRuleError(
          "Payroll tax rule cannot contain more than one open-ended progressive bracket.",
        );
      }
      return;
    }

    const ceiling = decimal(bracket.upToAmount, "Payroll tax bracket ceiling");
    if (previousFiniteCeiling && ceiling.lte(previousFiniteCeiling)) {
      throw new BusinessRuleError(
        "Payroll tax brackets must have strictly increasing non-overlapping ceilings.",
      );
    }
    previousFiniteCeiling = ceiling;
  });

  let taxAmount = new Prisma.Decimal(0);
  let previousCeiling = new Prisma.Decimal(0);

  ordered.forEach((bracket, index) => {
    validateBracket(bracket, index);
    if (taxableBase.lte(previousCeiling)) return;

    const ceiling =
      bracket.upToAmount == null
        ? taxableBase
        : decimal(bracket.upToAmount, "Payroll tax bracket ceiling");
    if (ceiling.lt(previousCeiling)) {
      throw new BusinessRuleError(
        "Payroll tax brackets must be ordered by non-overlapping ceilings.",
      );
    }

    const taxableSlice = Prisma.Decimal.min(taxableBase, ceiling).minus(
      previousCeiling,
    );
    if (taxableSlice.gt(0)) {
      taxAmount = taxAmount.plus(
        taxableSlice.times(bracket.rateBps).div(10000),
      );
    }
    previousCeiling = ceiling;
  });

  return taxAmount;
}

function applyTaxAmountBounds(rule: PayrollTaxRule, amount: Prisma.Decimal) {
  const minimumTaxAmount = optionalDecimal(
    rule.minimumTaxAmount,
    "Payroll minimum tax amount",
  );
  const maximumTaxAmount = optionalDecimal(
    rule.maximumTaxAmount,
    "Payroll maximum tax amount",
  );
  let boundedAmount = amount;
  let minimumApplied = false;
  let maximumApplied = false;

  if (minimumTaxAmount && minimumTaxAmount.lt(0)) {
    throw new BusinessRuleError("Payroll minimum tax amount cannot be negative.");
  }
  if (maximumTaxAmount && maximumTaxAmount.lt(0)) {
    throw new BusinessRuleError("Payroll maximum tax amount cannot be negative.");
  }
  if (
    minimumTaxAmount &&
    maximumTaxAmount &&
    maximumTaxAmount.lt(minimumTaxAmount)
  ) {
    throw new BusinessRuleError(
      "Payroll maximum tax amount cannot be lower than the minimum tax amount.",
    );
  }

  if (minimumTaxAmount && boundedAmount.lt(minimumTaxAmount)) {
    boundedAmount = minimumTaxAmount;
    minimumApplied = true;
  }
  if (maximumTaxAmount && boundedAmount.gt(maximumTaxAmount)) {
    boundedAmount = maximumTaxAmount;
    maximumApplied = true;
  }

  return { boundedAmount, minimumApplied, maximumApplied };
}

export function evaluatePayrollTaxRule(
  rule: PayrollTaxRule,
  input: PayrollTaxRuleEvaluationInput,
): PayrollTaxRuleEvaluationResult {
  const capabilityStatus = String(input.capabilityStatus);
  const taxableBaseAmount = decimal(
    input.taxableBaseAmount,
    "Payroll taxable base",
  );
  const ytdTaxableBaseAmount = decimal(
    input.ytdTaxableBaseAmount,
    "Payroll YTD taxable base",
  );
  const ytdTaxWithheldAmount = decimal(
    input.ytdTaxWithheldAmount,
    "Payroll YTD tax withheld",
  );
  const calculationMode = rule.calculationMode ?? null;
  const traceBase = {
    calculationMode,
    bracketCount: rule.brackets?.length ?? 0,
    capabilityStatus,
    productionCalculationSupported:
      rule.productionCalculationSupported === true,
    ytdTaxWithheldAmount: ytdTaxWithheldAmount.toFixed(2),
  };

  if (!assertSupportedRule(rule, capabilityStatus)) {
    return {
      status: "BLOCKED_REQUIRES_EXPERT_REVIEW",
      applied: false,
      taxAmount: new Prisma.Decimal(0),
      taxableBaseAmount,
      adjustedTaxableBaseAmount: taxableBaseAmount,
      cumulativeTaxableBaseAmount: taxableBaseAmount.plus(ytdTaxableBaseAmount),
      currency: normalizeCurrency(input.currency),
      trace: {
        ...traceBase,
        taxableBaseAdjustmentAmount: "0.00",
        taxAmountBeforeAdjustments: "0.00",
        taxAmountAdjustmentAmount: "0.00",
        taxAmountMinimumApplied: false,
        taxAmountMaximumApplied: false,
        adjustmentCodes: [],
      },
    };
  }

  if (
    calculationMode !== "PROGRESSIVE_PERIOD" &&
    calculationMode !== "PROGRESSIVE_YTD"
  ) {
    throw new BusinessRuleError(
      "Payroll tax rule calculation mode is unsupported or missing.",
    );
  }

  const taxableBaseAdjustment = applyAdjustments(
    taxableBaseAmount,
    rule.taxableBaseAdjustments,
    input,
    "Payroll taxable-base",
  );
  const adjustedTaxableBaseAmount = taxableBaseAdjustment.amount;
  const cumulativeTaxableBaseAmount =
    calculationMode === "PROGRESSIVE_YTD"
      ? adjustedTaxableBaseAmount.plus(ytdTaxableBaseAmount)
      : adjustedTaxableBaseAmount;
  const grossTaxAmount = computeProgressiveTax(
    rule.brackets ?? [],
    cumulativeTaxableBaseAmount,
  );
  const rawTaxAmount =
    calculationMode === "PROGRESSIVE_YTD"
      ? grossTaxAmount.minus(ytdTaxWithheldAmount)
      : grossTaxAmount;
  const nonNegativeTaxAmount = Prisma.Decimal.max(
    rawTaxAmount,
    new Prisma.Decimal(0),
  );
  const taxAmountAdjustment = applyAdjustments(
    nonNegativeTaxAmount,
    rule.taxAmountAdjustments,
    input,
    "Payroll tax-amount",
  );
  const bounded = applyTaxAmountBounds(rule, taxAmountAdjustment.amount);
  const roundedTaxAmount = bounded.boundedAmount.toDecimalPlaces(
    rule.roundingScale ?? 2,
  );

  return {
    status: "CALCULATED",
    applied: true,
    taxAmount: roundedTaxAmount,
    taxableBaseAmount,
    adjustedTaxableBaseAmount,
    cumulativeTaxableBaseAmount,
    currency: normalizeCurrency(input.currency),
    trace: {
      ...traceBase,
      taxableBaseAdjustmentAmount:
        taxableBaseAdjustment.adjustmentTotal.toFixed(2),
      taxAmountBeforeAdjustments: nonNegativeTaxAmount.toFixed(2),
      taxAmountAdjustmentAmount: taxAmountAdjustment.adjustmentTotal.toFixed(2),
      taxAmountMinimumApplied: bounded.minimumApplied,
      taxAmountMaximumApplied: bounded.maximumApplied,
      adjustmentCodes: [
        ...taxableBaseAdjustment.adjustmentCodes,
        ...taxAmountAdjustment.adjustmentCodes,
      ],
    },
  };
}