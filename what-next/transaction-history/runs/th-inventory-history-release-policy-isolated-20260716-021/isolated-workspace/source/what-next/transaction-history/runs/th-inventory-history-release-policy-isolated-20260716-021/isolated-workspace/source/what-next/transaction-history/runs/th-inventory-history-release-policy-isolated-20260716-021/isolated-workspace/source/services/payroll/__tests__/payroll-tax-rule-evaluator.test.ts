import { Prisma } from "@prisma/client";

import { evaluatePayrollTaxRule } from "../payroll-tax-rule-evaluator";

describe("payroll tax rule evaluator", () => {
  it("returns a blocked result when the country-pack rule still requires expert review", () => {
    const result = evaluatePayrollTaxRule(
      {
        productionCalculationSupported: false,
        calculationMode: "OFFICIAL_FORMULA_REVIEW_REQUIRED",
      },
      {
        taxableBaseAmount: new Prisma.Decimal("150000"),
        capabilityStatus: "REQUIRES_EXPERT_REVIEW",
        currency: "XAF",
      },
    );

    expect(result).toMatchObject({
      status: "BLOCKED_REQUIRES_EXPERT_REVIEW",
      applied: false,
      currency: "XAF",
      trace: expect.objectContaining({
        calculationMode: "OFFICIAL_FORMULA_REVIEW_REQUIRED",
        capabilityStatus: "REQUIRES_EXPERT_REVIEW",
        productionCalculationSupported: false,
      }),
    });
    expect(result.taxAmount.toFixed(2)).toBe("0.00");
  });

  it("blocks calculation when a supported-looking rule lacks an explicit production flag", () => {
    const result = evaluatePayrollTaxRule(
      {
        calculationMode: "PROGRESSIVE_PERIOD",
        brackets: [
          { upToAmount: "100000", rateBps: 0 },
          { upToAmount: null, rateBps: 1000 },
        ],
      },
      {
        taxableBaseAmount: "150000",
        capabilityStatus: "SUPPORTED",
        currency: "XAF",
      },
    );

    expect(result).toMatchObject({
      status: "BLOCKED_REQUIRES_EXPERT_REVIEW",
      applied: false,
      trace: expect.objectContaining({
        capabilityStatus: "SUPPORTED",
        productionCalculationSupported: false,
      }),
    });
    expect(result.taxAmount.toFixed(2)).toBe("0.00");
  });

  it("blocks non-production capability statuses even when the rule has brackets", () => {
    const result = evaluatePayrollTaxRule(
      {
        productionCalculationSupported: true,
        calculationMode: "PROGRESSIVE_PERIOD",
        brackets: [
          { upToAmount: "100000", rateBps: 0 },
          { upToAmount: null, rateBps: 1000 },
        ],
      },
      {
        taxableBaseAmount: "150000",
        capabilityStatus: "PARTIALLY_SUPPORTED",
        currency: "XAF",
      },
    );

    expect(result).toMatchObject({
      status: "BLOCKED_REQUIRES_EXPERT_REVIEW",
      applied: false,
      trace: expect.objectContaining({
        capabilityStatus: "PARTIALLY_SUPPORTED",
        productionCalculationSupported: true,
      }),
    });
    expect(result.taxAmount.toFixed(2)).toBe("0.00");
  });
  it("calculates a supported synthetic progressive period rule from country-pack inputs", () => {
    const result = evaluatePayrollTaxRule(
      {
        productionCalculationSupported: true,
        calculationMode: "PROGRESSIVE_PERIOD",
        brackets: [
          { upToAmount: "100000", rateBps: 0 },
          { upToAmount: null, rateBps: 1000 },
        ],
      },
      {
        taxableBaseAmount: "150000",
        capabilityStatus: "SUPPORTED",
        currency: "XAF",
      },
    );

    expect(result).toMatchObject({
      status: "CALCULATED",
      applied: true,
      trace: expect.objectContaining({
        calculationMode: "PROGRESSIVE_PERIOD",
        bracketCount: 2,
      }),
    });
    expect(result.taxAmount.toFixed(2)).toBe("5000.00");
  });

  it("supports a synthetic YTD replay by subtracting tax already withheld", () => {
    const result = evaluatePayrollTaxRule(
      {
        productionCalculationSupported: true,
        calculationMode: "PROGRESSIVE_YTD",
        brackets: [
          { upToAmount: "100000", rateBps: 0 },
          { upToAmount: null, rateBps: 1000 },
        ],
      },
      {
        taxableBaseAmount: "50000",
        ytdTaxableBaseAmount: "100000",
        ytdTaxWithheldAmount: "1000",
        capabilityStatus: "SUPPORTED_CERTIFIED",
        currency: "XAF",
      },
    );

    expect(result.status).toBe("CALCULATED");
    expect(result.cumulativeTaxableBaseAmount.toFixed(2)).toBe("150000.00");
    expect(result.taxAmount.toFixed(2)).toBe("4000.00");
  });
  it("applies reviewed taxable-base deduction caps and tax relief caps from country-pack rules", () => {
    const result = evaluatePayrollTaxRule(
      {
        productionCalculationSupported: true,
        calculationMode: "PROGRESSIVE_PERIOD",
        brackets: [
          { upToAmount: "100000", rateBps: 0 },
          { upToAmount: null, rateBps: 1000 },
        ],
        taxableBaseAdjustments: [
          {
            code: "reviewed-social-deduction-cap",
            operation: "SUBTRACT",
            inputKey: "socialDeduction",
            capAmount: "25000",
          },
        ],
        taxAmountAdjustments: [
          {
            code: "reviewed-family-relief-cap",
            operation: "SUBTRACT",
            inputKey: "familyRelief",
            capAmount: "1000",
          },
        ],
      },
      {
        taxableBaseAmount: "200000",
        adjustmentValues: {
          socialDeduction: "40000",
          familyRelief: "2000",
        },
        capabilityStatus: "SUPPORTED",
        currency: "XAF",
      },
    );

    expect(result.status).toBe("CALCULATED");
    expect(result.adjustedTaxableBaseAmount.toFixed(2)).toBe("175000.00");
    expect(result.taxAmount.toFixed(2)).toBe("6500.00");
    expect(result.trace).toMatchObject({
      taxableBaseAdjustmentAmount: "-25000.00",
      taxAmountBeforeAdjustments: "7500.00",
      taxAmountAdjustmentAmount: "-1000.00",
      adjustmentCodes: [
        "reviewed-social-deduction-cap",
        "reviewed-family-relief-cap",
      ],
    });
  });

  it("applies YTD replay and reviewed correction adjustments without going negative", () => {
    const result = evaluatePayrollTaxRule(
      {
        productionCalculationSupported: true,
        calculationMode: "PROGRESSIVE_YTD",
        brackets: [
          { upToAmount: "100000", rateBps: 0 },
          { upToAmount: null, rateBps: 1000 },
        ],
        taxAmountAdjustments: [
          {
            code: "reviewed-current-period-correction",
            operation: "ADD",
            inputKey: "currentPeriodCorrection",
          },
        ],
      },
      {
        taxableBaseAmount: "50000",
        ytdTaxableBaseAmount: "100000",
        ytdTaxWithheldAmount: "1000",
        adjustmentValues: {
          currentPeriodCorrection: "250",
        },
        capabilityStatus: "SUPPORTED_CERTIFIED",
        currency: "XAF",
      },
    );

    expect(result.status).toBe("CALCULATED");
    expect(result.cumulativeTaxableBaseAmount.toFixed(2)).toBe("150000.00");
    expect(result.taxAmount.toFixed(2)).toBe("4250.00");
    expect(result.trace).toMatchObject({
      taxAmountBeforeAdjustments: "4000.00",
      taxAmountAdjustmentAmount: "250.00",
      adjustmentCodes: ["reviewed-current-period-correction"],
    });
  });

  it("rejects duplicate progressive bracket ceilings instead of silently ignoring a bracket", () => {
    expect(() =>
      evaluatePayrollTaxRule(
        {
          productionCalculationSupported: true,
          calculationMode: "PROGRESSIVE_PERIOD",
          brackets: [
            { upToAmount: "100000", rateBps: 0 },
            { upToAmount: "100000", rateBps: 1000 },
            { upToAmount: null, rateBps: 2000 },
          ],
        },
        {
          taxableBaseAmount: "150000",
          capabilityStatus: "SUPPORTED_CERTIFIED",
          currency: "XAF",
        },
      ),
    ).toThrow("strictly increasing non-overlapping ceilings");
  });

  it("rejects multiple open-ended progressive brackets", () => {
    expect(() =>
      evaluatePayrollTaxRule(
        {
          productionCalculationSupported: true,
          calculationMode: "PROGRESSIVE_PERIOD",
          brackets: [
            { upToAmount: "100000", rateBps: 0 },
            { upToAmount: null, rateBps: 1000 },
            { upToAmount: null, rateBps: 2000 },
          ],
        },
        {
          taxableBaseAmount: "150000",
          capabilityStatus: "SUPPORTED_CERTIFIED",
          currency: "XAF",
        },
      ),
    ).toThrow("cannot contain more than one open-ended progressive bracket");
  });
});
