import { cameroonCountryPack } from "../country-packs/cameroon";
import { computeCountryPackHash } from "../country-packs/hash";
import { resolveRegulatoryParameter } from "../country-packs/resolve";
import {
  RegulatoryPackError,
  validateCountryPackForPublish,
} from "../country-packs/validation";
import { detectRegulatoryHardcodesInText } from "../hardcode-detector";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withSupportedIrppProductionRules() {
  const supported = clone(cameroonCountryPack);
  const incomeTaxRule = {
    productionCalculationSupported: true,
    calculationMode: "PROGRESSIVE_YTD",
    brackets: [
      { upToAmount: "100000", rateBps: 0 },
      { upToAmount: null, rateBps: 1000 },
    ],
    roundingScale: 2,
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
      {
        code: "reviewed-current-period-correction",
        operation: "ADD",
        inputKey: "currentPeriodCorrection",
      },
    ],
  };

  supported.header.capabilityMatrix["payroll.irpp"] = "SUPPORTED";

  const payroll = supported.parameters.payroll as Record<string, unknown>;
  const irpp = payroll.irpp as Record<string, unknown>;
  const incomeTaxRules = irpp.incomeTaxRules as Array<Record<string, unknown>>;
  incomeTaxRules[0] = {
    ...incomeTaxRules[0],
    value: incomeTaxRule,
    verifiedBy: "Qualified Cameroon payroll tax reviewer",
    verificationStatus: "EXPERT_REVIEWED",
    notes:
      "Synthetic reviewed test state; production packs require real expert-reviewed formulas and outputs.",
  };

  supported.goldenFixtures = supported.goldenFixtures.map((fixture) =>
    fixture.parameterPath === "payroll.irpp.incomeTaxRules"
      ? {
          ...fixture,
          expectedValue: incomeTaxRule,
          notes:
            "Reviewed IRPP rule fixture for production readiness validation tests.",
        }
      : fixture,
  );

  return { supported, incomeTaxRule };
}

function withSupportedCompensationAttendanceRules() {
  const supported = clone(cameroonCountryPack);
  supported.header.capabilityMatrix["payroll.compensation"] = "SUPPORTED";
  supported.header.capabilityMatrix["payroll.attendance"] = "SUPPORTED";

  const allowanceRule = {
    componentCode: "TRANSPORT",
    calculationMode: "FIXED_AMOUNT",
    payrollEffect: "EARNING",
    amount: "25000.00",
    taxableBase: true,
    socialBase: false,
    employerCharge: false,
  };
  const benefitRule = {
    componentCode: "HEALTH",
    calculationMode: "RATE_BPS",
    payrollEffect: "EMPLOYER_CHARGE",
    rateBps: 500,
    taxableBase: false,
    socialBase: false,
    employerCharge: true,
  };
  const paidLeaveRule = { calculationMode: "PAID_TIME_RATIO" };
  const unpaidLeaveRule = { calculationMode: "UNPAID_TIME_RATIO" };
  const overtimeRule = {
    calculationMode: "OVERTIME_RATE_BPS",
    rateBps: 15000,
    taxableBase: true,
    socialBase: true,
  };

  const payroll = supported.parameters.payroll as Record<string, unknown>;
  payroll.compensation = {
    allowances: [
      {
        value: allowanceRule,
        legalRef: "CM_DGI_CGI_2025",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        verifiedOn: "2026-06-28",
        verifiedBy: "Qualified payroll compensation reviewer",
        verificationStatus: "EXPERT_REVIEWED",
      },
    ],
    benefits: [
      {
        value: benefitRule,
        legalRef: "CM_DGI_CGI_2025",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        verifiedOn: "2026-06-28",
        verifiedBy: "Qualified payroll benefits reviewer",
        verificationStatus: "EXPERT_REVIEWED",
      },
    ],
  };
  payroll.attendance = {
    leave: [
      {
        value: paidLeaveRule,
        legalRef: "CM_DGI_CGI_2025",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-06-30",
        verifiedOn: "2026-06-28",
        verifiedBy: "Qualified payroll attendance reviewer",
        verificationStatus: "EXPERT_REVIEWED",
      },
      {
        value: unpaidLeaveRule,
        legalRef: "CM_DGI_CGI_2025",
        effectiveFrom: "2026-07-01",
        effectiveTo: null,
        verifiedOn: "2026-06-28",
        verifiedBy: "Qualified payroll attendance reviewer",
        verificationStatus: "EXPERT_REVIEWED",
      },
    ],
    overtime: [
      {
        value: overtimeRule,
        legalRef: "CM_DGI_CGI_2025",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        verifiedOn: "2026-06-28",
        verifiedBy: "Qualified payroll attendance reviewer",
        verificationStatus: "EXPERT_REVIEWED",
      },
    ],
  };

  supported.goldenFixtures.push(
    {
      id: "cm-allowance-transport-reviewed-2026",
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.compensation.allowances",
      date: "2026-06-28",
      purpose: "PAYROLL_ALLOWANCE_TAXABLE",
      expectedValue: allowanceRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input: { periodStart: "2026-06-01", periodEnd: "2026-06-30" },
        expectedOutput: {
          componentAmount: "25000.00",
          taxableBaseAmount: "25000.00",
          payslipLineAmount: "25000.00",
          registerGrossAmount: "25000.00",
          registerTaxableBaseAmount: "25000.00",
          registerNetPayableAmount: "25000.00",
        },
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll tax reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
        },
      },
    },
    {
      id: "cm-benefit-health-reviewed-2026",
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.compensation.benefits",
      date: "2026-06-28",
      purpose: "PAYROLL_BENEFIT_IN_KIND_EMPLOYER_CHARGE",
      expectedValue: benefitRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input: {
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
          baseAmount: "200000.00",
        },
        expectedOutput: {
          componentAmount: "10000.00",
          payslipLineAmount: "10000.00",
          registerEmployerChargeAmount: "10000.00",
          registerNetPayableAmount: "0.00",
        },
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll tax reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
        },
      },
    },
    {
      id: "cm-leave-paid-ratio-reviewed-2026",
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.attendance.leave",
      date: "2026-06-28",
      purpose: "PAYROLL_LEAVE_PAID_RATIO",
      expectedValue: paidLeaveRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input: { periodStart: "2026-06-01", periodEnd: "2026-06-30" },
        expectedOutput: {
          payslipLineAmount: "20000.00",
          registerGrossAmount: "180000.00",
          registerLeavePaidAmount: "20000.00",
          registerNetPayableAmount: "180000.00",
        },
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll tax reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
        },
      },
    },
    {
      id: "cm-leave-unpaid-ratio-reviewed-2026",
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.attendance.leave",
      date: "2026-07-15",
      purpose: "PAYROLL_LEAVE_UNPAID_RATIO",
      expectedValue: unpaidLeaveRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input: { periodStart: "2026-07-01", periodEnd: "2026-07-31" },
        expectedOutput: {
          payslipLineAmount: "40000.00",
          registerGrossAmount: "160000.00",
          registerLeaveDeductionAmount: "40000.00",
          registerNetPayableAmount: "160000.00",
        },
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll tax reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
        },
      },
    },
    {
      id: "cm-overtime-premium-reviewed-2026",
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.attendance.overtime",
      date: "2026-06-28",
      purpose: "PAYROLL_OVERTIME_PREMIUM",
      expectedValue: overtimeRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input: { periodStart: "2026-06-01", periodEnd: "2026-06-30" },
        expectedOutput: {
          payslipLineAmount: "15000.00",
          registerGrossAmount: "15000.00",
          registerTaxableBaseAmount: "15000.00",
          registerSocialBaseAmount: "15000.00",
          registerOvertimeBaseAmount: "10000.00",
          registerOvertimePremiumAmount: "15000.00",
          registerNetPayableAmount: "15000.00",
        },
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll tax reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
        },
      },
    },
  );

  return supported;
}
describe("regulatory country pack foundation", () => {
  it("validates Cameroon pack provenance, hash, required paths, and golden fixtures", () => {
    const result = validateCountryPackForPublish(cameroonCountryPack);

    expect(result).toMatchObject({ valid: true, canPublish: true });
    expect(result.issues).toEqual([]);
    expect(cameroonCountryPack.header.hash).toBe(
      computeCountryPackHash(cameroonCountryPack),
    );
    expect(cameroonCountryPack.goldenFixtures.length).toBeGreaterThanOrEqual(
      10,
    );
    expect(cameroonCountryPack.header.capabilityMatrix["payroll.irpp"]).toBe(
      "REQUIRES_EXPERT_REVIEW",
    );
    expect(
      cameroonCountryPack.goldenFixtures.map(
        (fixture) => fixture.parameterPath,
      ),
    ).toEqual(
      expect.arrayContaining([
        "payroll.cnps.pensionRatesBps",
        "payroll.cnps.familyAllowanceRatesBps",
        "payroll.cnps.occupationalRiskRatesBps",
        "payroll.cnps.employerRules",
        "payroll.irpp.incomeTaxRules",
      ]),
    );
  });

  it("rejects Cameroon payroll packs missing required payroll golden fixture coverage", () => {
    const defective = clone(cameroonCountryPack);
    defective.goldenFixtures = defective.goldenFixtures.filter(
      (fixture) => fixture.parameterPath !== "payroll.cnps.employerRules",
    );
    defective.header.hash = computeCountryPackHash(defective);

    const result = validateCountryPackForPublish(defective);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path: "goldenFixtures",
          message: expect.stringContaining("payroll.cnps.employerRules"),
        }),
      ]),
    );
  });

  it("rejects stale Cameroon payroll fixtures not pinned to the active pack version", () => {
    const defective = clone(cameroonCountryPack);
    const pensionFixture = defective.goldenFixtures.find(
      (fixture) => fixture.parameterPath === "payroll.cnps.pensionRatesBps",
    );
    if (!pensionFixture)
      throw new Error("Pension fixture missing from test pack");
    pensionFixture.expectedPackVersion = "CM-2025.9";
    defective.header.hash = computeCountryPackHash(defective);

    const result = validateCountryPackForPublish(defective);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path: expect.stringContaining("expectedPackVersion"),
          message: expect.stringContaining("CM-2025.9"),
        }),
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path: "goldenFixtures",
          message: expect.stringContaining("payroll.cnps.pensionRatesBps"),
        }),
      ]),
    );
  });

  it("rejects executable payroll calculation fixtures without review evidence", () => {
    const supported = withSupportedCompensationAttendanceRules();
    const allowanceFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-allowance-transport-reviewed-2026",
    );
    if (!allowanceFixture?.calculationScenario) {
      throw new Error("Allowance fixture missing from test pack");
    }
    delete allowanceFixture.calculationScenario.reviewEvidence;
    supported.header.hash = computeCountryPackHash(supported);

    const result = validateCountryPackForPublish(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path:
            "goldenFixtures.cm-allowance-transport-reviewed-2026.calculationScenario.reviewEvidence",
          message: expect.stringContaining("source evidence hash"),
        }),
      ]),
    );
  });
  it("rejects Cameroon payroll component production support without payslip/register fixture outputs", () => {
    const supported = withSupportedCompensationAttendanceRules();
    const allowanceFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-allowance-transport-reviewed-2026",
    );
    if (!allowanceFixture?.calculationScenario) {
      throw new Error("Allowance fixture missing from test pack");
    }
    delete allowanceFixture.calculationScenario.expectedOutput.registerTaxableBaseAmount;
    supported.header.hash = computeCountryPackHash(supported);

    const result = validateCountryPackForPublish(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path: "goldenFixtures.cm-allowance-transport-reviewed-2026.calculationScenario.expectedOutput.registerTaxableBaseAmount",
          message: expect.stringContaining("payslip/register tie-out"),
        }),
      ]),
    );
  });

  it("accepts Cameroon payroll component production support only with reviewed effective-dated tie-out fixtures", () => {
    const supported = withSupportedCompensationAttendanceRules();
    supported.header.hash = computeCountryPackHash(supported);

    const result = validateCountryPackForPublish(supported);

    expect(result).toMatchObject({ valid: true, canPublish: true });
    expect(result.issues).toEqual([]);
    expect(supported.header.capabilityMatrix["payroll.irpp"]).toBe(
      "REQUIRES_EXPERT_REVIEW",
    );
  });
  it("rejects Cameroon IRPP production support without reviewed calculation scenario fixtures", () => {
    const { supported } = withSupportedIrppProductionRules();
    supported.header.hash = computeCountryPackHash(supported);

    const result = validateCountryPackForPublish(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path: "goldenFixtures",
          message: expect.stringContaining("PAYROLL_IRPP_PERIOD_CALCULATION"),
        }),
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path: "goldenFixtures",
          message: expect.stringContaining("PAYROLL_IRPP_YTD_REGULARIZATION"),
        }),
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path: "goldenFixtures",
          message: expect.stringContaining("PAYROLL_IRPP_PERIOD_ADJUSTMENTS"),
        }),
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path: "goldenFixtures",
          message: expect.stringContaining("PAYROLL_IRPP_YTD_CORRECTION_REPLAY"),
        }),
      ]),
    );
  });

  it("rejects Cameroon IRPP production support without required YTD correction output pins", () => {
    const { supported, incomeTaxRule } = withSupportedIrppProductionRules();
    const scenario = (
      id: string,
      purpose: string,
      input: Record<string, unknown>,
      expectedOutput: Record<string, unknown>,
    ) => ({
      id,
      purpose,
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.irpp.incomeTaxRules",
      date: "2026-06-11",
      expectedValue: incomeTaxRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input,
        expectedOutput,
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll tax reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
        },
      },
    });

    supported.goldenFixtures.push(
      scenario(
        "cm-irpp-period-calculation-reviewed-2026",
        "PAYROLL_IRPP_PERIOD_CALCULATION",
        { taxableBaseAmount: "150000.00", currency: "XAF" },
        {
          status: "CALCULATED",
          calculationMode: "PROGRESSIVE_YTD",
          taxableBaseAmount: "150000.00",
          adjustedTaxableBaseAmount: "150000.00",
          cumulativeTaxableBaseAmount: "150000.00",
          taxAmountBeforeAdjustments: "5000.00",
          taxAmountAdjustmentAmount: "0.00",
          incomeTaxWithholdingAmount: "5000.00",
          currency: "XAF",
        },
      ),
      scenario(
        "cm-irpp-ytd-regularization-reviewed-2026",
        "PAYROLL_IRPP_YTD_REGULARIZATION",
        {
          taxableBaseAmount: "50000.00",
          ytdTaxableBaseAmount: "100000.00",
          ytdTaxWithheldAmount: "1000.00",
          currency: "XAF",
        },
        {
          status: "CALCULATED",
          calculationMode: "PROGRESSIVE_YTD",
          taxableBaseAmount: "50000.00",
          cumulativeTaxableBaseAmount: "150000.00",
          taxAmountBeforeAdjustments: "4000.00",
          taxAmountAdjustmentAmount: "0.00",
          incomeTaxWithholdingAmount: "4000.00",
          currency: "XAF",
        },
      ),
      scenario(
        "cm-irpp-period-adjustments-reviewed-2026",
        "PAYROLL_IRPP_PERIOD_ADJUSTMENTS",
        {
          taxableBaseAmount: "200000.00",
          adjustmentValues: { socialDeduction: "40000.00", familyRelief: "2000.00" },
          currency: "XAF",
        },
        {
          status: "CALCULATED",
          calculationMode: "PROGRESSIVE_YTD",
          incomeTaxWithholdingAmount: "6500.00",
          adjustedTaxableBaseAmount: "175000.00",
          taxableBaseAdjustmentAmount: "-25000.00",
          taxAmountBeforeAdjustments: "7500.00",
          taxAmountAdjustmentAmount: "-1000.00",
          currency: "XAF",
        },
      ),
      scenario(
        "cm-irpp-ytd-correction-reviewed-2026",
        "PAYROLL_IRPP_YTD_CORRECTION_REPLAY",
        {
          taxableBaseAmount: "50000.00",
          ytdTaxableBaseAmount: "100000.00",
          ytdTaxWithheldAmount: "1000.00",
          adjustmentValues: { currentPeriodCorrection: "250.00" },
          currency: "XAF",
        },
        {
          status: "CALCULATED",
          calculationMode: "PROGRESSIVE_YTD",
          cumulativeTaxableBaseAmount: "150000.00",
          taxAmountBeforeAdjustments: "4000.00",
          incomeTaxWithholdingAmount: "4250.00",
          currency: "XAF",
        },
      ),
    );
    supported.header.hash = computeCountryPackHash(supported);

    const result = validateCountryPackForPublish(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path:
            "goldenFixtures.cm-irpp-ytd-correction-reviewed-2026.calculationScenario.expectedOutput.taxAmountAdjustmentAmount",
          message: expect.stringContaining("YTD correction replay"),
        }),
      ]),
    );
  });
  it("rejects Cameroon IRPP production fixtures without calculation mode output pins", () => {
    const { supported, incomeTaxRule } = withSupportedIrppProductionRules();
    supported.goldenFixtures.push({
      id: "cm-irpp-period-calculation-reviewed-2026",
      purpose: "PAYROLL_IRPP_PERIOD_CALCULATION",
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.irpp.incomeTaxRules",
      date: "2026-06-11",
      expectedValue: incomeTaxRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input: { taxableBaseAmount: "150000.00", currency: "XAF" },
        expectedOutput: {
          status: "CALCULATED",
          taxableBaseAmount: "150000.00",
          adjustedTaxableBaseAmount: "150000.00",
          cumulativeTaxableBaseAmount: "150000.00",
          taxAmountBeforeAdjustments: "5000.00",
          taxAmountAdjustmentAmount: "0.00",
          incomeTaxWithholdingAmount: "5000.00",
          currency: "XAF",
        },
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll tax reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
        },
      },
    });
    supported.header.hash = computeCountryPackHash(supported);

    const result = validateCountryPackForPublish(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path:
            "goldenFixtures.cm-irpp-period-calculation-reviewed-2026.calculationScenario.expectedOutput.calculationMode",
          message: expect.stringContaining("calculationMode"),
        }),
      ]),
    );
  });
  it("accepts Cameroon IRPP production support only with reviewed calculation scenario fixtures", () => {
    const { supported, incomeTaxRule } = withSupportedIrppProductionRules();
    const baseFixture = {
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.irpp.incomeTaxRules",
      date: "2026-06-11",
      expectedValue: incomeTaxRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input: {
          taxableBaseAmount: "150000.00",
          currency: "XAF",
        },
        expectedOutput: {
          status: "CALCULATED",
          calculationMode: "PROGRESSIVE_YTD",
          taxableBaseAmount: "150000.00",
          adjustedTaxableBaseAmount: "150000.00",
          cumulativeTaxableBaseAmount: "150000.00",
          taxAmountBeforeAdjustments: "5000.00",
          taxAmountAdjustmentAmount: "0.00",
          incomeTaxWithholdingAmount: "5000.00",
          currency: "XAF",
        },
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll tax reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
        },
      },
    };
    supported.goldenFixtures.push(
      {
        ...baseFixture,
        id: "cm-irpp-period-calculation-reviewed-2026",
        purpose: "PAYROLL_IRPP_PERIOD_CALCULATION",
      },
      {
        ...baseFixture,
        id: "cm-irpp-ytd-regularization-reviewed-2026",
        purpose: "PAYROLL_IRPP_YTD_REGULARIZATION",
        calculationScenario: {
          ...baseFixture.calculationScenario,
          input: {
            taxableBaseAmount: "50000.00",
            ytdTaxableBaseAmount: "100000.00",
            ytdTaxWithheldAmount: "1000.00",
            currency: "XAF",
          },
          expectedOutput: {
            status: "CALCULATED",
            calculationMode: "PROGRESSIVE_YTD",
            taxableBaseAmount: "50000.00",
            cumulativeTaxableBaseAmount: "150000.00",
            taxAmountBeforeAdjustments: "4000.00",
            taxAmountAdjustmentAmount: "0.00",
            incomeTaxWithholdingAmount: "4000.00",
            currency: "XAF",
          },
        },
      },
      {
        ...baseFixture,
        id: "cm-irpp-period-adjustments-reviewed-2026",
        purpose: "PAYROLL_IRPP_PERIOD_ADJUSTMENTS",
        calculationScenario: {
          ...baseFixture.calculationScenario,
          input: {
            taxableBaseAmount: "200000.00",
            adjustmentValues: {
              socialDeduction: "40000.00",
              familyRelief: "2000.00",
            },
            currency: "XAF",
          },
          expectedOutput: {
            status: "CALCULATED",
            calculationMode: "PROGRESSIVE_YTD",
            incomeTaxWithholdingAmount: "6500.00",
            adjustedTaxableBaseAmount: "175000.00",
            taxableBaseAdjustmentAmount: "-25000.00",
            taxAmountBeforeAdjustments: "7500.00",
            taxAmountAdjustmentAmount: "-1000.00",
            currency: "XAF",
          },
        },
      },
      {
        ...baseFixture,
        id: "cm-irpp-ytd-correction-reviewed-2026",
        purpose: "PAYROLL_IRPP_YTD_CORRECTION_REPLAY",
        calculationScenario: {
          ...baseFixture.calculationScenario,
          input: {
            taxableBaseAmount: "50000.00",
            ytdTaxableBaseAmount: "100000.00",
            ytdTaxWithheldAmount: "1000.00",
            adjustmentValues: {
              currentPeriodCorrection: "250.00",
            },
            currency: "XAF",
          },
          expectedOutput: {
            status: "CALCULATED",
            calculationMode: "PROGRESSIVE_YTD",
            cumulativeTaxableBaseAmount: "150000.00",
            taxAmountBeforeAdjustments: "4000.00",
            taxAmountAdjustmentAmount: "250.00",
            incomeTaxWithholdingAmount: "4250.00",
            currency: "XAF",
          },
        },
      },
    );
    supported.header.hash = computeCountryPackHash(supported);

    const result = validateCountryPackForPublish(supported);

    expect(result).toMatchObject({ valid: true, canPublish: true });
    expect(result.issues).toEqual([]);
  });
  it("resolves values by country, entity, date, and pack version with provenance", () => {
    const resolved = resolveRegulatoryParameter<number>(
      "taxes.vat.standardRateBps",
      {
        countryCode: "CM",
        date: "2026-06-11",
        purpose: "POS_SALE_TAX",
        pinnedPackVersion: "CM-2026.1",
        entityProfile: {
          id: "entity-profile-1",
          countryCode: "CM",
          taxRegime: "REAL",
        },
      },
    );

    expect(resolved).toMatchObject({
      value: 1925,
      countryCode: "CM",
      packVersion: "CM-2026.1",
      legalRef: "CM_DGI_CGI_2025",
      capabilityStatus: "SUPPORTED",
      layer: "country",
    });
    expect(resolved.resolutionHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("resolves Cameroon CNPS payroll parameters as regulator-confirmed fixtures", () => {
    const familyAllowance = resolveRegulatoryParameter<Record<string, unknown>>(
      "payroll.cnps.familyAllowanceRatesBps",
      {
        countryCode: "CM",
        date: "2026-06-11",
        purpose: "PAYROLL_CNPS_FAMILY_ALLOWANCE",
        pinnedPackVersion: "CM-2026.1",
      },
    );
    const occupationalRisk = resolveRegulatoryParameter<
      Record<string, unknown>
    >("payroll.cnps.occupationalRiskRatesBps", {
      countryCode: "CM",
      date: "2026-06-11",
      purpose: "PAYROLL_CNPS_OCCUPATIONAL_RISK",
      pinnedPackVersion: "CM-2026.1",
    });
    const employerRules = resolveRegulatoryParameter<Record<string, unknown>>(
      "payroll.cnps.employerRules",
      {
        countryCode: "CM",
        date: "2026-06-11",
        purpose: "PAYROLL_EMPLOYER_RULES",
        pinnedPackVersion: "CM-2026.1",
      },
    );

    expect(familyAllowance).toMatchObject({
      verificationStatus: "REGULATOR_CONFIRMED",
      legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      value: {
        general: 700,
        agriculture: 565,
        privateEducation: 370,
        paidBy: "EMPLOYER",
      },
    });
    expect(occupationalRisk).toMatchObject({
      verificationStatus: "REGULATOR_CONFIRMED",
      legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      value: {
        groupA: 175,
        groupB: 250,
        groupC: 500,
        classificationRequired: true,
      },
    });
    expect(employerRules).toMatchObject({
      verificationStatus: "REGULATOR_CONFIRMED",
      legalRef: "CM_CNPS_EMPLOYER_RULES",
      value: { registrationRequired: true, employeeDeclarationRequired: true },
    });
  });

  it("resolves Cameroon IRPP income-tax rules as an expert-review production blocker", () => {
    const resolved = resolveRegulatoryParameter<Record<string, unknown>>(
      "payroll.irpp.incomeTaxRules",
      {
        countryCode: "CM",
        date: "2026-06-11",
        purpose: "PAYROLL_IRPP_INCOME_TAX",
        pinnedPackVersion: "CM-2026.1",
      },
    );

    expect(resolved).toMatchObject({
      countryCode: "CM",
      packVersion: "CM-2026.1",
      legalRef: "CM_DGI_CGI_2025",
      verificationStatus: "REQUIRES_EXPERT_REVIEW",
      capabilityStatus: "REQUIRES_EXPERT_REVIEW",
    });
    expect(resolved.value).toMatchObject({
      productionCalculationSupported: false,
      calculationMode: "OFFICIAL_IRPP_FORMULA_REVIEW_REQUIRED",
      employeeWithholdingRequired: true,
      declarationCode: "IRPP",
    });
    expect(resolved.resolutionHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("resolves Cameroon e-invoicing readiness metadata as expert-review gated", () => {
    const resolved = resolveRegulatoryParameter<{
      status: string;
      productionAutomationAllowed: boolean;
      requiresPostedLedgerSource: boolean;
      requiresOfficialTechnicalSpec: boolean;
    }>("compliance.eInvoicing.capability", {
      countryCode: "CM",
      date: "2026-06-11",
      purpose: "COMPLIANCE_CENTER_READINESS",
      pinnedPackVersion: "CM-2026.1",
    });

    expect(resolved).toMatchObject({
      countryCode: "CM",
      packVersion: "CM-2026.1",
      legalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
      verificationStatus: "REQUIRES_EXPERT_REVIEW",
      capabilityStatus: "REQUIRES_EXPERT_REVIEW",
    });
    expect(resolved.value).toMatchObject({
      status: "REQUIRES_EXPERT_REVIEW",
      productionAutomationAllowed: false,
      requiresPostedLedgerSource: true,
      requiresOfficialTechnicalSpec: true,
    });

    const certificationPolicy = resolveRegulatoryParameter<
      Record<string, unknown>
    >("compliance.eInvoicing.certificationPolicy", {
      countryCode: "CM",
      date: "2026-06-11",
      purpose: "COMPLIANCE_CENTER_CERTIFICATION_GATE",
      pinnedPackVersion: "CM-2026.1",
    });

    expect(certificationPolicy.value).toMatchObject({
      certificationTiming: "REQUIRES_EXPERT_REVIEW",
      legalDeliveryWhenUncertified: "BLOCK",
      authorityCallInsideSaleTransactionAllowed: false,
    });
  });

  it("blocks missing parameters with typed client-safe errors", () => {
    expect(() =>
      resolveRegulatoryParameter("taxes.vat.unknownRate", {
        countryCode: "CM",
        date: "2026-06-11",
      }),
    ).toThrow(RegulatoryPackError);

    try {
      resolveRegulatoryParameter("taxes.vat.unknownRate", {
        countryCode: "CM",
        date: "2026-06-11",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(RegulatoryPackError);
      expect((error as RegulatoryPackError).regulatoryCode).toBe(
        "PARAMETER_NOT_FOUND",
      );
    }
  });

  it("rejects expert-review placeholders if the matching capability claims support", () => {
    const defective = clone(cameroonCountryPack);
    defective.header.capabilityMatrix["compliance.eInvoicing"] = "SUPPORTED";
    defective.header.hash = computeCountryPackHash(defective);

    const result = validateCountryPackForPublish(defective);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EXPERT_REVIEW_REQUIRED",
          path: "compliance.eInvoicing.capability[0].verificationStatus",
        }),
      ]),
    );
  });

  it("rejects defective packs with missing legal citations", () => {
    const defective = clone(cameroonCountryPack);
    const vatRate = (
      (
        (defective.parameters.taxes as Record<string, unknown>).vat as Record<
          string,
          unknown
        >
      ).standardRateBps as Array<Record<string, unknown>>
    )[0];
    vatRate.legalRef = "MISSING_LEGAL_REF";
    defective.header.hash = computeCountryPackHash(defective);

    const result = validateCountryPackForPublish(defective);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "LEGAL_CITATION_MISSING",
          path: "taxes.vat.standardRateBps[0].legalRef",
        }),
      ]),
    );
  });

  it("rejects defective packs with overlapping effective windows", () => {
    const defective = clone(cameroonCountryPack);
    const vatRates = (
      (defective.parameters.taxes as Record<string, unknown>).vat as Record<
        string,
        unknown
      >
    ).standardRateBps as Array<Record<string, unknown>>;
    vatRates.push({
      ...vatRates[0],
      value: 2000,
      effectiveFrom: "2026-06-01",
    });
    defective.header.hash = computeCountryPackHash(defective);

    const result = validateCountryPackForPublish(defective);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EFFECTIVE_WINDOW_OVERLAP",
          path: "taxes.vat.standardRateBps",
        }),
      ]),
    );
  });

  it("detects production regulatory hardcodes and points to pack data", () => {
    const findings = detectRegulatoryHardcodesInText(
      "services/tax-rate/example.ts",
      `
      const standardVatRate = 19.25
      const socialRate = { cnps: 4.2, monthlyCeiling: 750000 }
      const providers = ["MTN_MOMO", "ORANGE_MONEY"]
      `,
    );

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "country-vat-rate-literal",
        "social-contribution-literal",
        "mobile-money-provider-literal",
      ]),
    );
    expect(
      findings.every((finding) =>
        finding.suggestedPackPath.includes("services/regulatory"),
      ),
    ).toBe(true);
  });

  it("does not report country-pack data as hardcoded production logic", () => {
    const findings = detectRegulatoryHardcodesInText(
      "services/regulatory/country-packs/cameroon.ts",
      `const standardRateBps = 1925; const providers = ["MTN_MOMO"]`,
    );

    expect(findings).toEqual([]);
  });

  it("does not report seed and fixture data as production statutory logic", () => {
    expect(
      detectRegulatoryHardcodesInText(
        "prisma/comprehensive-seed.ts",
        "const taxIdentifier = `SEED-NIU-001-XAF`",
      ),
    ).toEqual([]);
    expect(
      detectRegulatoryHardcodesInText(
        "__fixtures__/payroll.ts",
        "const cnps = { employee: 4.2, ceiling: 750000 }",
      ),
    ).toEqual([]);
  });
});
