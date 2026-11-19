import { cameroonCountryPack } from "../../regulatory/country-packs/cameroon";
import { computeCountryPackHash } from "../../regulatory/country-packs/hash";
import { validateCountryPackForPublish } from "../../regulatory/country-packs/validation";
import {
  buildPayrollCountryPackReviewIntakeCertificate,
  type PayrollCountryPackReviewTopicEvidence,
} from "../payroll-country-pack-review-intake.service";
import { validatePayrollCountryPackCalculationFixtures } from "../payroll-country-pack-fixture-runner";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
const REQUIRED_IRPP_REVIEW_TOPICS = [
  "bracketsAndRates",
  "deductibleEmployeeContributions",
  "familyQuotientOrDependentTreatment",
  "monthlyAndAnnualRegularization",
  "taxableSalaryBase",
  "withholdingRounding",
];
const REQUIRED_ALLOWANCE_REVIEW_TOPICS = [
  "allowanceEffectiveDating",
  "allowanceTaxableBaseTreatment",
  "allowancePayslipRegisterTieOut",
];
const REQUIRED_BENEFIT_REVIEW_TOPICS = [
  "benefitRateBase",
  "benefitEmployerChargeTreatment",
  "benefitPayslipRegisterTieOut",
];
const REQUIRED_DEDUCTION_REVIEW_TOPICS = [
  "deductionRecoveryAuthorization",
  "deductionRecoveryCap",
  "deductionNetPayFloor",
  "deductionPayslipRegisterTieOut",
];
const REQUIRED_LEAVE_REVIEW_TOPICS = [
  "leaveEffectiveDating",
  "paidLeaveGrossProration",
  "unpaidLeaveDeductionProration",
  "leavePayslipRegisterTieOut",
];
const REQUIRED_OVERTIME_REVIEW_TOPICS = [
  "overtimePremiumRate",
  "overtimeTaxableSocialBaseTreatment",
  "overtimePayslipRegisterTieOut",
];
const REQUIRED_COMPOSITE_REVIEW_TOPICS = [
  "grossNetRegisterTieOut",
  "statutoryLiabilityTieOut",
  "employerChargeTieOut",
  "payslipRegisterTieOut",
];
const REQUIRED_COMPENSATION_REVIEW_TOPICS = [
  ...REQUIRED_ALLOWANCE_REVIEW_TOPICS,
  ...REQUIRED_BENEFIT_REVIEW_TOPICS,
  ...REQUIRED_DEDUCTION_REVIEW_TOPICS,
].sort();
const REQUIRED_ATTENDANCE_REVIEW_TOPICS = [
  ...REQUIRED_LEAVE_REVIEW_TOPICS,
  ...REQUIRED_OVERTIME_REVIEW_TOPICS,
].sort();
const REQUIRED_OPERATIONS_REVIEW_TOPICS = [
  ...REQUIRED_COMPENSATION_REVIEW_TOPICS,
  ...REQUIRED_ATTENDANCE_REVIEW_TOPICS,
  ...REQUIRED_COMPOSITE_REVIEW_TOPICS,
].sort();

function reviewTopicEvidence(
  topics: string[],
): PayrollCountryPackReviewTopicEvidence[] {
  return topics.map((topic) => ({
    topic,
    legalRef: "CM_DGI_CGI_2025",
    sourceEvidenceHash: `sha256:cm-${topic}-review-evidence`,
    reviewedBy: "Qualified Cameroon payroll operations reviewer",
    reviewedOn: "2026-06-28",
  }));
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
    requiredReviewedCoverage: REQUIRED_IRPP_REVIEW_TOPICS,
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
        coveredReviewTopics: REQUIRED_IRPP_REVIEW_TOPICS,
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
          yearToDatePolicyHash: "sha256:irpp-ytd-policy-fixture",
          yearToDateAccumulatorHash: "sha256:irpp-ytd-accumulator-fixture",
          registerProofHash: "sha256:irpp-ytd-register-proof",
          payslipProofHash: "sha256:irpp-ytd-payslip-proof",
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
          yearToDatePolicyHash: "sha256:irpp-ytd-policy-fixture",
          yearToDateAccumulatorHash: "sha256:irpp-ytd-accumulator-fixture",
          registerProofHash: "sha256:irpp-ytd-register-proof",
          payslipProofHash: "sha256:irpp-ytd-payslip-proof",
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
          yearToDatePolicyHash: "sha256:irpp-correction-ytd-policy-fixture",
          yearToDateAccumulatorHash: "sha256:irpp-correction-ytd-accumulator-fixture",
          originalRunDocumentHash: "sha256:irpp-original-run-document",
          originalRunEvidenceHash: "sha256:irpp-original-run-evidence",
          originalCalculationHash: "sha256:irpp-original-calculation",
          correctionBasisHash: "sha256:irpp-correction-basis",
          correctionEvidenceHash: "sha256:irpp-correction-evidence",
          registerProofHash: "sha256:irpp-correction-register-proof",
          payslipProofHash: "sha256:irpp-correction-payslip-proof",
          ledgerPostingProofHash: "sha256:irpp-correction-ledger-proof",
          declarationProofHash: "sha256:irpp-correction-declaration-proof",
          paymentProofHash: "sha256:irpp-correction-payment-proof",
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
          yearToDatePolicyHash: "sha256:irpp-correction-ytd-policy-fixture",
          yearToDateAccumulatorHash: "sha256:irpp-correction-ytd-accumulator-fixture",
          originalRunDocumentHash: "sha256:irpp-original-run-document",
          originalRunEvidenceHash: "sha256:irpp-original-run-evidence",
          originalCalculationHash: "sha256:irpp-original-calculation",
          correctionBasisHash: "sha256:irpp-correction-basis",
          correctionEvidenceHash: "sha256:irpp-correction-evidence",
          registerProofHash: "sha256:irpp-correction-register-proof",
          payslipProofHash: "sha256:irpp-correction-payslip-proof",
          ledgerPostingProofHash: "sha256:irpp-correction-ledger-proof",
          declarationProofHash: "sha256:irpp-correction-declaration-proof",
          paymentProofHash: "sha256:irpp-correction-payment-proof",
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
  supported.header.capabilityMatrix["payroll.composite.registerTieOut"] =
    "SUPPORTED";

  const allowanceRule = {
    componentCode: "TRANSPORT",
    calculationMode: "FIXED_AMOUNT",
    payrollEffect: "EARNING",
    amount: "25000.00",
    taxableBase: true,
    socialBase: false,
    employerCharge: false,
    requiredReviewedCoverage: REQUIRED_ALLOWANCE_REVIEW_TOPICS,
  };
  const benefitRule = {
    componentCode: "HEALTH",
    calculationMode: "RATE_BPS",
    payrollEffect: "EMPLOYER_CHARGE",
    rateBps: 500,
    taxableBase: false,
    socialBase: false,
    employerCharge: true,
    requiredReviewedCoverage: REQUIRED_BENEFIT_REVIEW_TOPICS,
  };
  const deductionRule = {
    componentCode: "LOAN_RECOVERY",
    calculationMode: "INPUT_AMOUNT",
    payrollEffect: "DEDUCTION",
    taxableBase: false,
    socialBase: false,
    employerCharge: false,
    capAmount: "50000.00",
    requiredReviewedCoverage: REQUIRED_DEDUCTION_REVIEW_TOPICS,
  };
  const paidLeaveRule = {
    calculationMode: "PAID_TIME_RATIO",
    requiredReviewedCoverage: REQUIRED_LEAVE_REVIEW_TOPICS,
  };
  const unpaidLeaveRule = {
    calculationMode: "UNPAID_TIME_RATIO",
    requiredReviewedCoverage: REQUIRED_LEAVE_REVIEW_TOPICS,
  };
  const overtimeRule = {
    calculationMode: "OVERTIME_RATE_BPS",
    rateBps: 15000,
    taxableBase: true,
    socialBase: true,
    requiredReviewedCoverage: REQUIRED_OVERTIME_REVIEW_TOPICS,
  };
  const compositeRule = {
    calculationMode: "COMPOSITE_REGISTER_TIE_OUT",
    requiredReviewedCoverage: REQUIRED_COMPOSITE_REVIEW_TOPICS,
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
    deductions: [
      {
        value: deductionRule,
        legalRef: "CM_DGI_CGI_2025",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        verifiedOn: "2026-06-28",
        verifiedBy: "Qualified payroll deduction reviewer",
        verificationStatus: "EXPERT_REVIEWED",
      },
    ],
  };
  payroll.composite = {
    registerTieOut: [
      {
        value: compositeRule,
        legalRef: "CM_DGI_CGI_2025",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        verifiedOn: "2026-06-28",
        verifiedBy: "Qualified payroll register reviewer",
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
          coveredReviewTopics: REQUIRED_ALLOWANCE_REVIEW_TOPICS,
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
          coveredReviewTopics: REQUIRED_BENEFIT_REVIEW_TOPICS,
        },
      },
    },
    {
      id: "cm-deduction-loan-recovery-reviewed-2026",
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.compensation.deductions",
      date: "2026-06-28",
      purpose: "PAYROLL_DEDUCTION_RECOVERY_LOAN",
      expectedValue: deductionRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input: {
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
          amount: "12000.00",
          recoveryCaseId: "loan-case-fixture-1",
          outstandingBalanceAmount: "30000.00",
          outstandingBalanceProofHash: "sha256:loan-fixture-balance-proof",
          recoveryCapAmount: "15000.00",
          recoveryCapProofHash: "sha256:loan-fixture-cap-proof",
          netPayFloorAmount: "0.00",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          componentCode: "LOAN_RECOVERY",
          calculationMode: "INPUT_AMOUNT",
          payrollEffect: "DEDUCTION",
          componentAmount: "12000.00",
          grossAmount: "0.00",
          taxableBaseAmount: "0.00",
          socialBaseAmount: "0.00",
          employeeDeductionAmount: "12000.00",
          employerChargeAmount: "0.00",
          netPayableAmount: "-12000.00",
          payslipLineAmount: "12000.00",
          registerGrossAmount: "0.00",
          registerEmployeeDeductionAmount: "12000.00",
          registerNetPayableAmount: "-12000.00",
          recoveryPolicyApplied: true,
          recoveryCaseId: "loan-case-fixture-1",
          outstandingBalanceAmount: "30000.00",
          outstandingBalanceProofHash: "sha256:loan-fixture-balance-proof",
          recoveryCapAmount: "15000.00",
          recoveryCapProofHash: "sha256:loan-fixture-cap-proof",
          netPayFloorAmount: "0.00",
          currency: "XAF",
        },
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll deduction reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
          coveredReviewTopics: [...REQUIRED_DEDUCTION_REVIEW_TOPICS].sort(),
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
          coveredReviewTopics: REQUIRED_LEAVE_REVIEW_TOPICS,
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
          coveredReviewTopics: REQUIRED_LEAVE_REVIEW_TOPICS,
        },
      },
    },
    {
      id: "cm-composite-register-tieout-reviewed-2026",
      countryCode: supported.header.countryCode,
      parameterPath: "payroll.composite.registerTieOut",
      date: "2026-06-28",
      purpose: "PAYROLL_COMPOSITE_REGISTER_TIE_OUT",
      expectedValue: compositeRule,
      expectedLegalRef: "CM_DGI_CGI_2025",
      expectedPackVersion: supported.header.packVersion,
      calculationScenario: {
        input: {
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
          baseGrossAmount: "200000.00",
          taxableAllowanceAmount: "25000.00",
          overtimePremiumAmount: "15000.00",
          leaveDeductionAmount: "40000.00",
          employeePensionContributionAmount: "8400.00",
          incomeTaxWithholdingAmount: "6500.00",
          employerPensionContributionAmount: "8400.00",
          familyAllowanceContributionAmount: "7000.00",
          occupationalRiskContributionAmount: "2000.00",
          benefitEmployerChargeAmount: "10000.00",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          calculationMode: "COMPOSITE_REGISTER_TIE_OUT",
          grossAmount: "200000.00",
          taxableBaseAmount: "200000.00",
          socialBaseAmount: "200000.00",
          employeePensionContributionAmount: "8400.00",
          incomeTaxWithholdingAmount: "6500.00",
          employeeDeductionAmount: "14900.00",
          employerPensionContributionAmount: "8400.00",
          familyAllowanceContributionAmount: "7000.00",
          occupationalRiskContributionAmount: "2000.00",
          employerChargeAmount: "27400.00",
          statutoryLiabilityAmount: "32300.00",
          netPayableAmount: "185100.00",
          registerGrossAmount: "200000.00",
          registerTaxableBaseAmount: "200000.00",
          registerSocialBaseAmount: "200000.00",
          registerEmployeeDeductionAmount: "14900.00",
          registerEmployerChargeAmount: "27400.00",
          registerNetPayableAmount: "185100.00",
          registerLeaveDeductionAmount: "40000.00",
          registerOvertimePremiumAmount: "15000.00",
          registerStatutoryLiabilityAmount: "32300.00",
          currency: "XAF",
        },
        reviewStatus: "EXPERT_REVIEWED" as const,
        reviewEvidence: {
          reviewedBy: "Qualified Cameroon payroll tax reviewer",
          reviewedOn: "2026-06-28",
          legalRef: "CM_DGI_CGI_2025",
          sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
          coveredReviewTopics: [...REQUIRED_COMPOSITE_REVIEW_TOPICS].sort(),
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
          coveredReviewTopics: REQUIRED_OVERTIME_REVIEW_TOPICS,
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


  it("executes reviewed effective-dated allowance, benefit-in-kind, paid/unpaid leave, overtime, and composite register tie-out scenarios", () => {
    const supported = supportedCompensationAttendancePack();

    expect(validateCountryPackForPublish(supported)).toMatchObject({
      valid: true,
    });

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
          fixtureId: "cm-deduction-loan-recovery-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            componentCode: "LOAN_RECOVERY",
            employeeDeductionAmount: "12000.00",
            registerEmployeeDeductionAmount: "12000.00",
            recoveryPolicyApplied: true,
            recoveryCaseId: "loan-case-fixture-1",
            outstandingBalanceAmount: "30000.00",
            outstandingBalanceProofHash: "sha256:loan-fixture-balance-proof",
            recoveryCapAmount: "15000.00",
            recoveryCapProofHash: "sha256:loan-fixture-cap-proof",
            netPayFloorAmount: "0.00",
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
        expect.objectContaining({
          fixtureId: "cm-composite-register-tieout-reviewed-2026",
          status: "PASSED",
          actualOutput: expect.objectContaining({
            grossAmount: "200000.00",
            taxableBaseAmount: "200000.00",
            employeeDeductionAmount: "14900.00",
            employerChargeAmount: "27400.00",
            statutoryLiabilityAmount: "32300.00",
            netPayableAmount: "185100.00",
            registerEmployeeDeductionAmount: "14900.00",
            registerEmployerChargeAmount: "27400.00",
            registerStatutoryLiabilityAmount: "32300.00",
          }),
        }),
      ]),
    );

    const runById = (fixtureId: string) => {
      const run = result.runs.find((entry) => entry.fixtureId === fixtureId);
      if (!run) throw new Error(`Missing fixture run ${fixtureId}`);
      return run;
    };

    expect(
      runById("cm-allowance-transport-reviewed-2026").reviewEvidence
        ?.coveredReviewTopics,
    ).toEqual(REQUIRED_ALLOWANCE_REVIEW_TOPICS);
    expect(
      runById("cm-benefit-health-reviewed-2026").reviewEvidence
        ?.coveredReviewTopics,
    ).toEqual(REQUIRED_BENEFIT_REVIEW_TOPICS);
    expect(
      runById("cm-deduction-loan-recovery-reviewed-2026").reviewEvidence
        ?.coveredReviewTopics,
    ).toEqual([...REQUIRED_DEDUCTION_REVIEW_TOPICS].sort());
    expect(
      runById("cm-leave-paid-ratio-reviewed-2026").reviewEvidence
        ?.coveredReviewTopics,
    ).toEqual(REQUIRED_LEAVE_REVIEW_TOPICS);
    expect(
      runById("cm-leave-unpaid-ratio-reviewed-2026").reviewEvidence
        ?.coveredReviewTopics,
    ).toEqual(REQUIRED_LEAVE_REVIEW_TOPICS);
    expect(
      runById("cm-overtime-premium-reviewed-2026").reviewEvidence
        ?.coveredReviewTopics,
    ).toEqual(REQUIRED_OVERTIME_REVIEW_TOPICS);
    expect(
      runById("cm-composite-register-tieout-reviewed-2026").reviewEvidence
        ?.coveredReviewTopics,
    ).toEqual([...REQUIRED_COMPOSITE_REVIEW_TOPICS].sort());
  });
  it("certifies proposed compensation, attendance, and composite review-topic coverage for legal-owner signoff", () => {
    const proposedPack = supportedCompensationAttendancePack();

    const certificate = buildPayrollCountryPackReviewIntakeCertificate({
      basePack: cameroonCountryPack,
      proposedPack,
      targetFamilies: [
        "ALLOWANCES_BENEFITS",
        "DEDUCTIONS_RECOVERIES",
        "LEAVE_OVERTIME",
        "COMPOSITE_REGISTER_TIE_OUT",
      ],
      reviewTopicEvidence: reviewTopicEvidence(REQUIRED_OPERATIONS_REVIEW_TOPICS),
      generatedAt: "2026-07-05T12:30:00.000Z",
    });

    expect(certificate.status).toBe("READY_FOR_LEGAL_OWNER_SIGNOFF");
    expect(certificate.blockers).toEqual([]);

    const familyByName = (family: string) => {
      const target = certificate.targetFamilies.find(
        (entry) => entry.family === family,
      );
      if (!target) throw new Error(`Missing review-intake family ${family}`);
      return target;
    };

    expect(familyByName("ALLOWANCES_BENEFITS")).toMatchObject({
      status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
      baseRequiredReviewTopics: [],
      proposedRequiredReviewTopics: [
        ...REQUIRED_ALLOWANCE_REVIEW_TOPICS,
        ...REQUIRED_BENEFIT_REVIEW_TOPICS,
      ].sort(),
      requiredReviewTopics: [
        ...REQUIRED_ALLOWANCE_REVIEW_TOPICS,
        ...REQUIRED_BENEFIT_REVIEW_TOPICS,
      ].sort(),
      coveredReviewTopics: [
        ...REQUIRED_ALLOWANCE_REVIEW_TOPICS,
        ...REQUIRED_BENEFIT_REVIEW_TOPICS,
      ].sort(),
      proposedCoveredReviewTopics: [
        ...REQUIRED_ALLOWANCE_REVIEW_TOPICS,
        ...REQUIRED_BENEFIT_REVIEW_TOPICS,
      ].sort(),
      proposedMissingReviewTopics: [],
      missingReviewTopics: [],
      invalidReviewTopics: [],
    });
    expect(familyByName("DEDUCTIONS_RECOVERIES")).toMatchObject({
      status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
      baseRequiredReviewTopics: [],
      proposedRequiredReviewTopics: [...REQUIRED_DEDUCTION_REVIEW_TOPICS].sort(),
      requiredReviewTopics: [...REQUIRED_DEDUCTION_REVIEW_TOPICS].sort(),
      coveredReviewTopics: [...REQUIRED_DEDUCTION_REVIEW_TOPICS].sort(),
      proposedCoveredReviewTopics: [...REQUIRED_DEDUCTION_REVIEW_TOPICS].sort(),
      proposedMissingReviewTopics: [],
      fixtureEvidence: [
        expect.objectContaining({
          fixtureId: "cm-deduction-loan-recovery-reviewed-2026",
          coveredReviewTopics: [...REQUIRED_DEDUCTION_REVIEW_TOPICS].sort(),
        }),
      ],
    });
    expect(familyByName("LEAVE_OVERTIME")).toMatchObject({
      status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
      baseRequiredReviewTopics: [],
      proposedRequiredReviewTopics: REQUIRED_ATTENDANCE_REVIEW_TOPICS,
      requiredReviewTopics: REQUIRED_ATTENDANCE_REVIEW_TOPICS,
      coveredReviewTopics: REQUIRED_ATTENDANCE_REVIEW_TOPICS,
      proposedCoveredReviewTopics: REQUIRED_ATTENDANCE_REVIEW_TOPICS,
      proposedMissingReviewTopics: [],
    });
    expect(familyByName("COMPOSITE_REGISTER_TIE_OUT")).toMatchObject({
      status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
      baseRequiredReviewTopics: [],
      proposedRequiredReviewTopics: [...REQUIRED_COMPOSITE_REVIEW_TOPICS].sort(),
      requiredReviewTopics: [...REQUIRED_COMPOSITE_REVIEW_TOPICS].sort(),
      coveredReviewTopics: [...REQUIRED_COMPOSITE_REVIEW_TOPICS].sort(),
      proposedCoveredReviewTopics: [...REQUIRED_COMPOSITE_REVIEW_TOPICS].sort(),
      proposedMissingReviewTopics: [],
      fixtureEvidence: [
        expect.objectContaining({
          fixtureId: "cm-composite-register-tieout-reviewed-2026",
          coveredReviewTopics: [...REQUIRED_COMPOSITE_REVIEW_TOPICS].sort(),
        }),
      ],
    });
  });

  it("blocks proposed operations country-pack signoff when proposed review-topic evidence is missing", () => {
    const proposedPack = supportedCompensationAttendancePack();

    const certificate = buildPayrollCountryPackReviewIntakeCertificate({
      basePack: cameroonCountryPack,
      proposedPack,
      targetFamilies: ["ALLOWANCES_BENEFITS"],
      reviewTopicEvidence: reviewTopicEvidence(
        REQUIRED_COMPENSATION_REVIEW_TOPICS.filter(
          (topic) => topic !== "benefitRateBase",
        ),
      ),
      generatedAt: "2026-07-05T12:35:00.000Z",
    });

    expect(certificate.status).toBe("BLOCKED");
    expect(certificate.targetFamilies[0]).toMatchObject({
      family: "ALLOWANCES_BENEFITS",
      status: "BLOCKED",
      proposedRequiredReviewTopics: [
        ...REQUIRED_ALLOWANCE_REVIEW_TOPICS,
        ...REQUIRED_BENEFIT_REVIEW_TOPICS,
      ].sort(),
      missingReviewTopics: ["benefitRateBase"],
      proposedMissingReviewTopics: [],
    });
    expect(certificate.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_MISSING",
          family: "ALLOWANCES_BENEFITS",
          evidence: {
            missingReviewTopics: ["benefitRateBase"],
          },
        }),
      ]),
    );
  });
  it("fails when composite register tie-out expected outputs drift from reviewed component totals", () => {
    const supported = supportedCompensationAttendancePack();
    const compositeFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-composite-register-tieout-reviewed-2026",
    );
    if (!compositeFixture?.calculationScenario) {
      throw new Error("Composite register tie-out fixture missing from test pack");
    }
    compositeFixture.calculationScenario.expectedOutput.registerStatutoryLiabilityAmount =
      "32300.01";
    supported.header.hash = computeCountryPackHash(supported);

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SCENARIO_OUTPUT_MISMATCH",
          fixtureId: "cm-composite-register-tieout-reviewed-2026",
          path: expect.stringContaining("registerStatutoryLiabilityAmount"),
          message: expect.stringContaining("32300.01"),
        }),
      ]),
    );
  });

  it("fails when composite production capability omits the reviewed register tie-out fixture", () => {
    const supported = supportedCompensationAttendancePack();
    supported.goldenFixtures = supported.goldenFixtures.filter(
      (fixture) => fixture.id !== "cm-composite-register-tieout-reviewed-2026",
    );
    supported.header.hash = computeCountryPackHash(supported);

    const result = validateCountryPackForPublish(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "GOLDEN_FIXTURE_FAILED",
          path: "goldenFixtures",
          message: expect.stringContaining("PAYROLL_COMPOSITE_REGISTER_TIE_OUT"),
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

  it("fails deduction recovery scenarios above the approved cap proof", () => {
    const supported = supportedCompensationAttendancePack();
    const deductionFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-deduction-loan-recovery-reviewed-2026",
    );
    if (!deductionFixture?.calculationScenario) {
      throw new Error("Deduction recovery fixture missing from test pack");
    }
    deductionFixture.calculationScenario.input.recoveryCapAmount = "11000.00";
    supported.header.hash = computeCountryPackHash(supported);

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SCENARIO_INPUT_INVALID",
          fixtureId: "cm-deduction-loan-recovery-reviewed-2026",
          path: "goldenFixtures.cm-deduction-loan-recovery-reviewed-2026.calculationScenario.input.amount",
          message: expect.stringContaining("approved recovery cap"),
        }),
      ]),
    );
    expect(result.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixtureId: "cm-deduction-loan-recovery-reviewed-2026",
          status: "FAILED",
          actualOutput: null,
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
            yearToDatePolicyHash: "sha256:irpp-ytd-policy-fixture",
            yearToDateAccumulatorHash: "sha256:irpp-ytd-accumulator-fixture",
            registerProofHash: "sha256:irpp-ytd-register-proof",
            payslipProofHash: "sha256:irpp-ytd-payslip-proof",
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
            yearToDatePolicyHash: "sha256:irpp-correction-ytd-policy-fixture",
            yearToDateAccumulatorHash: "sha256:irpp-correction-ytd-accumulator-fixture",
            originalRunDocumentHash: "sha256:irpp-original-run-document",
            originalRunEvidenceHash: "sha256:irpp-original-run-evidence",
            originalCalculationHash: "sha256:irpp-original-calculation",
            correctionBasisHash: "sha256:irpp-correction-basis",
            correctionEvidenceHash: "sha256:irpp-correction-evidence",
            registerProofHash: "sha256:irpp-correction-register-proof",
            payslipProofHash: "sha256:irpp-correction-payslip-proof",
            ledgerPostingProofHash: "sha256:irpp-correction-ledger-proof",
            declarationProofHash: "sha256:irpp-correction-declaration-proof",
            paymentProofHash: "sha256:irpp-correction-payment-proof",
          }),
        }),
      ]),
    );
  });

  it("fails validation when reviewed IRPP YTD correction proof pins are incomplete", () => {
    const supported = supportedIrppPack();
    const correctionFixture = supported.goldenFixtures.find(
      (fixture) => fixture.id === "cm-irpp-ytd-correction-reviewed-2026",
    );
    if (!correctionFixture?.calculationScenario) {
      throw new Error("Reviewed correction fixture missing from test pack");
    }
    delete correctionFixture.calculationScenario.expectedOutput.correctionEvidenceHash;
    supported.header.hash = computeCountryPackHash(supported);

    const result = validatePayrollCountryPackCalculationFixtures(supported);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SCENARIO_EXPECTED_OUTPUT_MISSING",
          fixtureId: "cm-irpp-ytd-correction-reviewed-2026",
          path: "goldenFixtures.cm-irpp-ytd-correction-reviewed-2026.calculationScenario.expectedOutput.correctionEvidenceHash",
          message: expect.stringContaining("IRPP YTD correction replay proof"),
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
