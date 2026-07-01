import { cameroonCountryPack } from "../../regulatory/country-packs/cameroon";
import { computeCountryPackHash } from "../../regulatory/country-packs/hash";
import { validateCountryPackForPublish } from "../../regulatory/country-packs/validation";
import { validatePayrollCountryPackCalculationFixtures } from "../payroll-country-pack-fixture-runner";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function supportedIrppPack() {
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
        applied: true,
        calculationMode: "PROGRESSIVE_YTD",
        incomeTaxWithholdingAmount: "5000.00",
        taxableBaseAmount: "150000.00",
        adjustedTaxableBaseAmount: "150000.00",
        cumulativeTaxableBaseAmount: "150000.00",
        taxAmountBeforeAdjustments: "5000.00",
        taxAmountAdjustmentAmount: "0.00",
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

  supported.header.capabilityMatrix["payroll.irpp"] = "SUPPORTED";

  const payroll = supported.parameters.payroll as Record<string, unknown>;
  const irpp = payroll.irpp as Record<string, unknown>;
  const incomeTaxRules = irpp.incomeTaxRules as Array<Record<string, unknown>>;
  incomeTaxRules[0] = {
    ...incomeTaxRules[0],
    value: incomeTaxRule,
    verifiedBy: "Qualified Cameroon payroll tax reviewer",
    verificationStatus: "EXPERT_REVIEWED",
  };

  supported.goldenFixtures = supported.goldenFixtures.map((fixture) =>
    fixture.parameterPath === "payroll.irpp.incomeTaxRules"
      ? {
          ...fixture,
          expectedValue: incomeTaxRule,
        }
      : fixture,
  );
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
          applied: true,
          calculationMode: "PROGRESSIVE_YTD",
          incomeTaxWithholdingAmount: "4000.00",
          taxableBaseAmount: "50000.00",
          cumulativeTaxableBaseAmount: "150000.00",
          taxAmountBeforeAdjustments: "4000.00",
          taxAmountAdjustmentAmount: "0.00",
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
          applied: true,
          calculationMode: "PROGRESSIVE_YTD",
          incomeTaxWithholdingAmount: "6500.00",
          taxableBaseAmount: "200000.00",
          adjustedTaxableBaseAmount: "175000.00",
          cumulativeTaxableBaseAmount: "175000.00",
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
          applied: true,
          calculationMode: "PROGRESSIVE_YTD",
          incomeTaxWithholdingAmount: "4250.00",
          taxableBaseAmount: "50000.00",
          adjustedTaxableBaseAmount: "50000.00",
          cumulativeTaxableBaseAmount: "150000.00",
          taxAmountBeforeAdjustments: "4000.00",
          taxAmountAdjustmentAmount: "250.00",
          currency: "XAF",
        },
      },
    },
  );
  supported.header.hash = computeCountryPackHash(supported);

  return supported;
}

function supportedCompensationAttendancePack() {
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
  const paidLeaveRule = {
    calculationMode: "PAID_TIME_RATIO",
  };
  const unpaidLeaveRule = {
    calculationMode: "UNPAID_TIME_RATIO",
  };
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
        input: {
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          componentCode: "TRANSPORT",
          calculationMode: "FIXED_AMOUNT",
          payrollEffect: "EARNING",
          componentAmount: "25000.00",
          grossAmount: "25000.00",
          taxableBaseAmount: "25000.00",
          socialBaseAmount: "0.00",
          employeeDeductionAmount: "0.00",
          employerChargeAmount: "0.00",
          netPayableAmount: "25000.00",
          payslipLineAmount: "25000.00",
          registerGrossAmount: "25000.00",
          registerTaxableBaseAmount: "25000.00",
          registerSocialBaseAmount: "0.00",
          registerEmployeeDeductionAmount: "0.00",
          registerEmployerChargeAmount: "0.00",
          registerNetPayableAmount: "25000.00",
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
          status: "CALCULATED",
          applied: true,
          componentCode: "HEALTH",
          calculationMode: "RATE_BPS",
          payrollEffect: "EMPLOYER_CHARGE",
          componentAmount: "10000.00",
          baseAmount: "200000.00",
          rateBps: "500",
          grossAmount: "0.00",
          taxableBaseAmount: "0.00",
          socialBaseAmount: "0.00",
          employerChargeAmount: "10000.00",
          netPayableAmount: "0.00",
          payslipLineAmount: "10000.00",
          registerGrossAmount: "0.00",
          registerEmployerChargeAmount: "10000.00",
          registerNetPayableAmount: "0.00",
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
        input: {
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
          baseAmount: "200000.00",
          scheduledMinutes: "10000",
          workedMinutes: "8000",
          leaveMinutes: "1000",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          calculationMode: "PAID_TIME_RATIO",
          paidMinutes: "9000",
          attendanceRatio: "0.900000",
          grossAmount: "180000.00",
          leavePaidAmount: "20000.00",
          leaveDeductionAmount: "0.00",
          payslipLineAmount: "20000.00",
          registerGrossAmount: "180000.00",
          registerLeavePaidAmount: "20000.00",
          registerLeaveDeductionAmount: "0.00",
          registerNetPayableAmount: "180000.00",
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
        input: {
          periodStart: "2026-07-01",
          periodEnd: "2026-07-31",
          baseAmount: "200000.00",
          scheduledMinutes: "10000",
          workedMinutes: "8000",
          leaveMinutes: "2000",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          calculationMode: "UNPAID_TIME_RATIO",
          paidMinutes: "8000",
          attendanceRatio: "0.800000",
          grossAmount: "160000.00",
          leavePaidAmount: "0.00",
          leaveDeductionAmount: "40000.00",
          payslipLineAmount: "40000.00",
          registerGrossAmount: "160000.00",
          registerLeavePaidAmount: "0.00",
          registerLeaveDeductionAmount: "40000.00",
          registerNetPayableAmount: "160000.00",
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
        input: {
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
          baseAmount: "200000.00",
          scheduledMinutes: "10000",
          overtimeMinutes: "500",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          calculationMode: "OVERTIME_RATE_BPS",
          rateBps: "15000",
          overtimeBaseAmount: "10000.00",
          overtimePremiumAmount: "15000.00",
          grossAmount: "15000.00",
          taxableBaseAmount: "15000.00",
          socialBaseAmount: "15000.00",
          payslipLineAmount: "15000.00",
          registerGrossAmount: "15000.00",
          registerTaxableBaseAmount: "15000.00",
          registerSocialBaseAmount: "15000.00",
          registerNetPayableAmount: "15000.00",
          registerOvertimeBaseAmount: "10000.00",
          registerOvertimePremiumAmount: "15000.00",
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
    },
  );
  supported.header.hash = computeCountryPackHash(supported);

  return supported;
}
describe("payroll country-pack calculation fixture runner", () => {
  it("executes regulator-confirmed CNPS scenarios while IRPP remains review-blocked", () => {
    expect(validateCountryPackForPublish(cameroonCountryPack)).toMatchObject({
      valid: true,
    });

    const result =
      validatePayrollCountryPackCalculationFixtures(cameroonCountryPack);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixtureId: "cm-cnps-pension-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            socialBaseAmount: "750000.00",
            employeePensionContributionAmount: "31500.00",
            employerPensionContributionAmount: "31500.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-cnps-family-allowance-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            familyAllowanceSector: "GENERAL",
            familyAllowanceContributionAmount: "7000.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-cnps-family-allowance-agriculture-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            familyAllowanceSector: "AGRICULTURE",
            familyAllowanceContributionAmount: "5650.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-cnps-family-allowance-private-education-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            familyAllowanceSector: "PRIVATE_EDUCATION",
            familyAllowanceContributionAmount: "3700.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-cnps-occupational-risk-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            occupationalRiskGroup: "A",
            occupationalRiskContributionAmount: "1750.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-cnps-occupational-risk-group-b-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            occupationalRiskGroup: "B",
            occupationalRiskContributionAmount: "2500.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-cnps-occupational-risk-group-c-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            occupationalRiskGroup: "C",
            occupationalRiskContributionAmount: "5000.00",
          }),
        }),
      ]),
    );
    expect(
      result.runs.some(
        (run) => run.parameterPath === "payroll.irpp.incomeTaxRules",
      ),
    ).toBe(false);
  });


  it("executes reviewed effective-dated allowance, benefit-in-kind, paid/unpaid leave, and overtime scenario primitives", () => {
    const supported = supportedCompensationAttendancePack();

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixtureId: "cm-allowance-transport-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            componentCode: "TRANSPORT",
            componentAmount: "25000.00",
            grossAmount: "25000.00",
            taxableBaseAmount: "25000.00",
            payslipLineAmount: "25000.00",
            registerTaxableBaseAmount: "25000.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-benefit-health-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            componentCode: "HEALTH",
            componentAmount: "10000.00",
            employerChargeAmount: "10000.00",
            grossAmount: "0.00",
            payslipLineAmount: "10000.00",
            registerEmployerChargeAmount: "10000.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-leave-paid-ratio-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            paidMinutes: "9000",
            attendanceRatio: "0.900000",
            grossAmount: "180000.00",
            leavePaidAmount: "20000.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-leave-unpaid-ratio-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            calculationMode: "UNPAID_TIME_RATIO",
            paidMinutes: "8000",
            attendanceRatio: "0.800000",
            grossAmount: "160000.00",
            leaveDeductionAmount: "40000.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-overtime-premium-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            rateBps: "15000",
            overtimeBaseAmount: "10000.00",
            overtimePremiumAmount: "15000.00",
            grossAmount: "15000.00",
            registerOvertimeBaseAmount: "10000.00",
            registerOvertimePremiumAmount: "15000.00",
          }),
        }),
      ]),
    );
  });
  it("fails when reviewed payslip/register tie-out outputs drift from calculation output", () => {
    const supported = supportedCompensationAttendancePack();
    const allowanceFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-allowance-transport-reviewed-2026",
    );
    if (!allowanceFixture?.calculationScenario) {
      throw new Error("Allowance calculation fixture missing from test pack");
    }
    allowanceFixture.calculationScenario.expectedOutput.registerTaxableBaseAmount =
      "24999.99";
    supported.header.hash = computeCountryPackHash(supported);

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SCENARIO_OUTPUT_MISMATCH",
          fixtureId: "cm-allowance-transport-reviewed-2026",
          path: expect.stringContaining("registerTaxableBaseAmount"),
          message: expect.stringContaining("24999.99"),
        }),
      ]),
    );
  });
  it("fails when reviewed component scenarios omit required payslip/register output pins", () => {
    const supported = supportedCompensationAttendancePack();
    const benefitFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-benefit-health-reviewed-2026",
    );
    if (!benefitFixture?.calculationScenario) {
      throw new Error("Benefit calculation fixture missing from test pack");
    }
    delete benefitFixture.calculationScenario.expectedOutput.registerNetPayableAmount;
    supported.header.hash = computeCountryPackHash(supported);

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SCENARIO_EXPECTED_OUTPUT_MISSING",
          fixtureId: "cm-benefit-health-reviewed-2026",
          path: "goldenFixtures.cm-benefit-health-reviewed-2026.calculationScenario.expectedOutput.registerNetPayableAmount",
          message: expect.stringContaining("payslip/register tie-out"),
        }),
      ]),
    );
    expect(result.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixtureId: "cm-benefit-health-reviewed-2026",
          status: "FAILED",
          actualOutput: expect.objectContaining({
            registerNetPayableAmount: "0.00",
          }),
        }),
      ]),
    );
  });

  it("fails compensation and attendance scenarios that omit effective payroll period bounds", () => {
    const supported = supportedCompensationAttendancePack();
    const allowanceFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-allowance-transport-reviewed-2026",
    );
    if (!allowanceFixture?.calculationScenario) {
      throw new Error("Allowance calculation fixture missing from test pack");
    }
    delete (allowanceFixture.calculationScenario.input as Record<string, unknown>).periodStart;
    supported.header.hash = computeCountryPackHash(supported);

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SCENARIO_INPUT_INVALID",
          fixtureId: "cm-allowance-transport-reviewed-2026",
          path: "goldenFixtures.cm-allowance-transport-reviewed-2026.calculationScenario.input.periodStart",
          message: expect.stringContaining("periodStart"),
        }),
      ]),
    );
    expect(result.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixtureId: "cm-allowance-transport-reviewed-2026",
          status: "FAILED",
          actualOutput: null,
        }),
      ]),
    );
  });
  it("fails validation when a CNPS scenario output drifts from country-pack calculation", () => {
    const defective = clone(cameroonCountryPack);
    const pensionFixture = defective.goldenFixtures.find(
      (fixture) => fixture.id === "cm-cnps-pension-2026",
    );
    if (!pensionFixture?.calculationScenario) {
      throw new Error("CNPS pension calculation fixture missing from test pack");
    }
    pensionFixture.calculationScenario.expectedOutput.employeePensionContributionAmount =
      "31499.99";
    defective.header.hash = computeCountryPackHash(defective);

    expect(validateCountryPackForPublish(defective)).toMatchObject({
      valid: true,
    });

    const result = validatePayrollCountryPackCalculationFixtures(defective);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SCENARIO_OUTPUT_MISMATCH",
          fixtureId: "cm-cnps-pension-2026",
          path: expect.stringContaining(
            "employeePensionContributionAmount",
          ),
          message: expect.stringContaining("31499.99"),
        }),
      ]),
    );
    expect(result.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixtureId: "cm-cnps-pension-2026",
          status: "FAILED",
          actualOutput: expect.objectContaining({
            employeePensionContributionAmount: "31500.00",
          }),
        }),
      ]),
    );
  });
  it("executes reviewed IRPP calculation scenarios against the payroll tax evaluator", () => {
    const supported = supportedIrppPack();

    expect(validateCountryPackForPublish(supported)).toMatchObject({
      valid: true,
    });

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixtureId: "cm-irpp-period-calculation-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            incomeTaxWithholdingAmount: "5000.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-irpp-ytd-regularization-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            incomeTaxWithholdingAmount: "4000.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-irpp-period-adjustments-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            adjustedTaxableBaseAmount: "175000.00",
            taxableBaseAdjustmentAmount: "-25000.00",
            taxAmountBeforeAdjustments: "7500.00",
            taxAmountAdjustmentAmount: "-1000.00",
            incomeTaxWithholdingAmount: "6500.00",
          }),
        }),
        expect.objectContaining({
          fixtureId: "cm-irpp-ytd-correction-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            cumulativeTaxableBaseAmount: "150000.00",
            taxAmountBeforeAdjustments: "4000.00",
            taxAmountAdjustmentAmount: "250.00",
            incomeTaxWithholdingAmount: "4250.00",
          }),
        }),
      ]),
    );
  });

  it("fails validation when reviewed expected outputs drift from evaluator output", () => {
    const supported = supportedIrppPack();
    const periodFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-irpp-period-calculation-reviewed-2026",
    );
    if (!periodFixture?.calculationScenario) {
      throw new Error("Reviewed period fixture missing from test pack");
    }
    periodFixture.calculationScenario.expectedOutput.incomeTaxWithholdingAmount =
      "4999.99";
    supported.header.hash = computeCountryPackHash(supported);

    expect(validateCountryPackForPublish(supported)).toMatchObject({
      valid: true,
    });

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SCENARIO_OUTPUT_MISMATCH",
          fixtureId: "cm-irpp-period-calculation-reviewed-2026",
          path: expect.stringContaining("incomeTaxWithholdingAmount"),
          message: expect.stringContaining("4999.99"),
        }),
      ]),
    );
    expect(result.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixtureId: "cm-irpp-period-calculation-reviewed-2026",
          status: "FAILED",
          actualOutput: expect.objectContaining({
            incomeTaxWithholdingAmount: "5000.00",
          }),
        }),
      ]),
    );
  });

  it("fails validation when a scenario asks for an unsupported output field", () => {
    const supported = supportedIrppPack();
    const periodFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-irpp-period-calculation-reviewed-2026",
    );
    if (!periodFixture?.calculationScenario) {
      throw new Error("Reviewed period fixture missing from test pack");
    }
    periodFixture.calculationScenario.expectedOutput.unknownField =
      "unsupported";
    supported.header.hash = computeCountryPackHash(supported);

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SCENARIO_EXPECTED_OUTPUT_UNSUPPORTED",
          fixtureId: "cm-irpp-period-calculation-reviewed-2026",
          path: expect.stringContaining("unknownField"),
        }),
      ]),
    );
  });
});
