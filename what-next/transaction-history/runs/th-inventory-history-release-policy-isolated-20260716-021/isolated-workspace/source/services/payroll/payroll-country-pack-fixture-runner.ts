import { Prisma } from "@prisma/client";

import {
  getParameterEnvelopeArray,
  selectEffectiveEnvelope,
} from "../regulatory/country-packs/validation";
import {
  isRecord,
  type CountryPack,
  type GoldenFixture,
} from "../regulatory/country-packs/schemas";
import {
  evaluatePayrollTaxRule,
  type PayrollTaxRule,
  type PayrollTaxRuleEvaluationInput,
} from "./payroll-tax-rule-evaluator";

export type PayrollCalculationFixtureIssueCode =
  | "SCENARIO_PARAMETER_UNSUPPORTED"
  | "SCENARIO_PARAMETER_UNRESOLVED"
  | "SCENARIO_CAPABILITY_MISSING"
  | "SCENARIO_INPUT_INVALID"
  | "SCENARIO_EXPECTED_OUTPUT_MISSING"
  | "SCENARIO_EXPECTED_OUTPUT_UNSUPPORTED"
  | "SCENARIO_EXECUTION_FAILED"
  | "SCENARIO_OUTPUT_MISMATCH";

export type PayrollCalculationFixtureIssue = {
  code: PayrollCalculationFixtureIssueCode;
  fixtureId: string;
  parameterPath: string;
  path: string;
  message: string;
};

export type PayrollCalculationFixtureReviewEvidence = {
  reviewedBy: string;
  reviewedOn: string;
  legalRef: string;
  sourceEvidenceHash: string;
} | null;

export type PayrollCalculationFixtureRun = {
  fixtureId: string;
  parameterPath: string;
  purpose: string | null;
  status: "PASSED" | "FAILED";
  reviewStatus: string;
  reviewEvidence: PayrollCalculationFixtureReviewEvidence;
  expectedOutput: Record<string, unknown>;
  actualOutput: Record<string, string | boolean> | null;
};

export type PayrollCalculationFixtureValidationResult = {
  valid: boolean;
  runs: PayrollCalculationFixtureRun[];
  issues: PayrollCalculationFixtureIssue[];
};

const IRPP_INCOME_TAX_PARAMETER_PATH = "payroll.irpp.incomeTaxRules";
const CNPS_PENSION_PARAMETER_PATH = "payroll.cnps.pensionRatesBps";
const CNPS_FAMILY_ALLOWANCE_PARAMETER_PATH =
  "payroll.cnps.familyAllowanceRatesBps";
const CNPS_OCCUPATIONAL_RISK_PARAMETER_PATH =
  "payroll.cnps.occupationalRiskRatesBps";
const COMPENSATION_ALLOWANCES_PARAMETER_PATH =
  "payroll.compensation.allowances";
const COMPENSATION_BENEFITS_PARAMETER_PATH =
  "payroll.compensation.benefits";
const ATTENDANCE_LEAVE_PARAMETER_PATH = "payroll.attendance.leave";
const ATTENDANCE_OVERTIME_PARAMETER_PATH = "payroll.attendance.overtime";
const SUPPORTED_PARAMETER_PATHS = new Set([
  IRPP_INCOME_TAX_PARAMETER_PATH,
  CNPS_PENSION_PARAMETER_PATH,
  CNPS_FAMILY_ALLOWANCE_PARAMETER_PATH,
  CNPS_OCCUPATIONAL_RISK_PARAMETER_PATH,
  COMPENSATION_ALLOWANCES_PARAMETER_PATH,
  COMPENSATION_BENEFITS_PARAMETER_PATH,
  ATTENDANCE_LEAVE_PARAMETER_PATH,
  ATTENDANCE_OVERTIME_PARAMETER_PATH,
]);

const SUPPORTED_OUTPUT_FIELDS = new Set([
  "status",
  "applied",
  "currency",
  "componentCode",
  "calculationMode",
  "payrollEffect",
  "componentAmount",
  "baseAmount",
  "rateBps",
  "unitAmount",
  "quantity",
  "grossAmount",
  "incomeTaxWithholdingAmount",
  "taxAmount",
  "taxableBaseAmount",
  "adjustedTaxableBaseAmount",
  "cumulativeTaxableBaseAmount",
  "taxableBaseAdjustmentAmount",
  "taxAmountBeforeAdjustments",
  "taxAmountAdjustmentAmount",
  "socialBaseAmount",
  "contributionBaseAmount",
  "employeePensionRateBps",
  "employerPensionRateBps",
  "employeePensionContributionAmount",
  "employerPensionContributionAmount",
  "totalPensionContributionAmount",
  "familyAllowanceSector",
  "familyAllowanceRateBps",
  "familyAllowanceContributionAmount",
  "occupationalRiskGroup",
  "occupationalRiskRateBps",
  "occupationalRiskContributionAmount",
  "leaveMinutes",
  "overtimeMinutes",
  "scheduledMinutes",
  "workedMinutes",
  "paidMinutes",
  "attendanceRatio",
  "leavePaidAmount",
  "leaveDeductionAmount",
  "overtimeBaseAmount",
  "overtimePremiumAmount",
  "employeeDeductionAmount",
  "employerChargeAmount",
  "netPayableAmount",
  "payslipLineAmount",
  "registerGrossAmount",
  "registerTaxableBaseAmount",
  "registerSocialBaseAmount",
  "registerEmployeeDeductionAmount",
  "registerEmployerChargeAmount",
  "registerNetPayableAmount",
  "registerLeavePaidAmount",
  "registerLeaveDeductionAmount",
  "registerOvertimeBaseAmount",
  "registerOvertimePremiumAmount",
]);

const REQUIRED_COMPONENT_OUTPUT_REQUIREMENTS = [
  {
    parameterPath: COMPENSATION_ALLOWANCES_PARAMETER_PATH,
    purposeMatcher: "PAYROLL_ALLOWANCE_TAXABLE",
    label: "taxable allowance",
    fields: [
      "componentAmount",
      "taxableBaseAmount",
      "payslipLineAmount",
      "registerGrossAmount",
      "registerTaxableBaseAmount",
      "registerNetPayableAmount",
    ],
  },
  {
    parameterPath: COMPENSATION_BENEFITS_PARAMETER_PATH,
    purposeMatcher: "PAYROLL_BENEFIT_IN_KIND",
    label: "benefit in kind",
    fields: [
      "componentAmount",
      "payslipLineAmount",
      "registerEmployerChargeAmount",
      "registerNetPayableAmount",
    ],
  },
  {
    parameterPath: ATTENDANCE_LEAVE_PARAMETER_PATH,
    purposeMatcher: "PAYROLL_LEAVE_PAID",
    label: "paid leave effect",
    fields: [
      "payslipLineAmount",
      "registerGrossAmount",
      "registerLeavePaidAmount",
      "registerNetPayableAmount",
    ],
  },
  {
    parameterPath: ATTENDANCE_LEAVE_PARAMETER_PATH,
    purposeMatcher: "PAYROLL_LEAVE_UNPAID",
    label: "unpaid leave effect",
    fields: [
      "payslipLineAmount",
      "registerGrossAmount",
      "registerLeaveDeductionAmount",
      "registerNetPayableAmount",
    ],
  },
  {
    parameterPath: ATTENDANCE_OVERTIME_PARAMETER_PATH,
    purposeMatcher: "PAYROLL_OVERTIME",
    label: "overtime premium base",
    fields: [
      "payslipLineAmount",
      "registerGrossAmount",
      "registerTaxableBaseAmount",
      "registerSocialBaseAmount",
      "registerOvertimeBaseAmount",
      "registerOvertimePremiumAmount",
      "registerNetPayableAmount",
    ],
  },
] as const;

function capabilityStatusForPath(pack: CountryPack, parameterPath: string) {
  const matchingKey = Object.keys(pack.header.capabilityMatrix)
    .sort((left, right) => right.length - left.length)
    .find(
      (key) => parameterPath === key || parameterPath.startsWith(`${key}.`),
    );

  return matchingKey ? pack.header.capabilityMatrix[matchingKey] : null;
}

function issue(
  fixture: GoldenFixture,
  code: PayrollCalculationFixtureIssueCode,
  path: string,
  message: string,
): PayrollCalculationFixtureIssue {
  return {
    code,
    fixtureId: fixture.id,
    parameterPath: fixture.parameterPath,
    path,
    message,
  };
}

function decimalInput(
  value: unknown,
  fallback: Prisma.Decimal.Value | null = null,
): Prisma.Decimal.Value | null {
  if (value instanceof Prisma.Decimal) return value;
  if (typeof value === "string" || typeof value === "number") return value;
  return fallback;
}

function decimalOutput(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2);
}

function requiredDecimalInput(
  fixture: GoldenFixture,
  input: Record<string, unknown>,
  key: string,
  issues: PayrollCalculationFixtureIssue[],
): Prisma.Decimal | null {
  const value = decimalInput(input[key]);
  if (value == null) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.input.${key}`,
        `Payroll calculation scenarios require ${key}.`,
      ),
    );
    return null;
  }

  const decimal = new Prisma.Decimal(value);
  if (!decimal.isFinite() || decimal.lt(0)) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.input.${key}`,
        `${key} must be a non-negative decimal amount.`,
      ),
    );
    return null;
  }

  return decimal;
}

function requiredBps(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  key: string,
  issues: PayrollCalculationFixtureIssue[],
) {
  const raw = rule[key];
  const value = typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value < 0) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.expectedValue.${key}`,
        `${key} must resolve to a non-negative basis-point rate from the country pack.`,
      ),
    );
    return null;
  }
  return value;
}

function optionalPositiveDecimal(
  value: unknown,
): Prisma.Decimal | null {
  const decimalValue = decimalInput(value);
  if (decimalValue == null) return null;
  const decimal = new Prisma.Decimal(decimalValue);
  return decimal.isFinite() && decimal.gt(0) ? decimal : null;
}

function normalizeFamilyAllowanceSector(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "GENERAL") return "GENERAL";
  if (normalized === "AGRICULTURE") return "AGRICULTURE";
  if (normalized === "PRIVATE_EDUCATION") return "PRIVATE_EDUCATION";
  return null;
}

function familyAllowanceRateKey(sector: string) {
  if (sector === "GENERAL") return "general";
  if (sector === "AGRICULTURE") return "agriculture";
  if (sector === "PRIVATE_EDUCATION") return "privateEducation";
  return null;
}

function normalizeOccupationalRiskGroup(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized === "A" || normalized === "B" || normalized === "C"
    ? normalized
    : null;
}

function occupationalRiskRateKey(group: string) {
  if (group === "A") return "groupA";
  if (group === "B") return "groupB";
  if (group === "C") return "groupC";
  return null;
}

function contributionAmount(base: Prisma.Decimal, rateBps: number) {
  return base.times(rateBps).div(10000).toDecimalPlaces(2);
}

function optionalRuleDecimal(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  key: string,
  issues: PayrollCalculationFixtureIssue[],
): Prisma.Decimal | null {
  const value = decimalInput(rule[key]);
  if (value == null) return null;

  const decimal = new Prisma.Decimal(value);
  if (!decimal.isFinite() || decimal.lt(0)) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.expectedValue.${key}`,
        `${key} must resolve to a non-negative decimal amount from the country pack.`,
      ),
    );
    return null;
  }
  return decimal;
}

function requiredRuleDecimal(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  key: string,
  issues: PayrollCalculationFixtureIssue[],
): Prisma.Decimal | null {
  const decimal = optionalRuleDecimal(fixture, rule, key, issues);
  if (decimal) return decimal;

  issues.push(
    issue(
      fixture,
      "SCENARIO_INPUT_INVALID",
      `goldenFixtures.${fixture.id}.expectedValue.${key}`,
      `${key} is required for this payroll calculation scenario.`,
    ),
  );
  return null;
}

function requiredPositiveDecimalInput(
  fixture: GoldenFixture,
  input: Record<string, unknown>,
  key: string,
  issues: PayrollCalculationFixtureIssue[],
): Prisma.Decimal | null {
  const decimal = requiredDecimalInput(fixture, input, key, issues);
  if (!decimal) return null;
  if (decimal.lte(0)) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.input.${key}`,
        `${key} must be greater than zero.`,
      ),
    );
    return null;
  }
  return decimal;
}

function stringRule(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().toUpperCase()
    : null;
}

function requiredRuleMode(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  allowedModes: readonly string[],
  issues: PayrollCalculationFixtureIssue[],
) {
  const mode = stringRule(rule.calculationMode);
  if (mode && allowedModes.includes(mode)) return mode;

  issues.push(
    issue(
      fixture,
      "SCENARIO_INPUT_INVALID",
      `goldenFixtures.${fixture.id}.expectedValue.calculationMode`,
      `Unsupported payroll calculation mode. Expected one of ${allowedModes.join(", ")}.`,
    ),
  );
  return null;
}

function requiredPayrollEffect(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  issues: PayrollCalculationFixtureIssue[],
) {
  const effect = stringRule(rule.payrollEffect);
  if (
    effect === "EARNING" ||
    effect === "DEDUCTION" ||
    effect === "EMPLOYER_CHARGE" ||
    effect === "INFORMATION"
  ) {
    return effect;
  }

  issues.push(
    issue(
      fixture,
      "SCENARIO_INPUT_INVALID",
      `goldenFixtures.${fixture.id}.expectedValue.payrollEffect`,
      "Compensation scenarios require payrollEffect EARNING, DEDUCTION, EMPLOYER_CHARGE, or INFORMATION.",
    ),
  );
  return null;
}

function decimalZero() {
  return new Prisma.Decimal(0);
}

function applyAmountBounds(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  amount: Prisma.Decimal,
  issues: PayrollCalculationFixtureIssue[],
) {
  const floorAmount = optionalRuleDecimal(fixture, rule, "floorAmount", issues);
  const capAmount = optionalRuleDecimal(fixture, rule, "capAmount", issues);
  let bounded = amount;
  if (floorAmount && bounded.lt(floorAmount)) bounded = floorAmount;
  if (capAmount && bounded.gt(capAmount)) bounded = capAmount;
  return bounded.toDecimalPlaces(2);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function requiresPayrollPeriodScope(parameterPath: string) {
  return (
    parameterPath === COMPENSATION_ALLOWANCES_PARAMETER_PATH ||
    parameterPath === COMPENSATION_BENEFITS_PARAMETER_PATH ||
    parameterPath === ATTENDANCE_LEAVE_PARAMETER_PATH ||
    parameterPath === ATTENDANCE_OVERTIME_PARAMETER_PATH
  );
}

function validatePayrollPeriodScope(
  fixture: GoldenFixture,
  issues: PayrollCalculationFixtureIssue[],
) {
  if (!requiresPayrollPeriodScope(fixture.parameterPath)) return true;
  const input = scenarioInput(fixture, issues);
  if (!input) return false;
  const beforeIssueCount = issues.length;
  const periodStart = input.periodStart;
  const periodEnd = input.periodEnd;

  if (!isIsoDate(periodStart)) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.input.periodStart`,
        "Compensation and attendance scenarios require ISO periodStart for effective-dated payroll validation.",
      ),
    );
  }
  if (!isIsoDate(periodEnd)) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.input.periodEnd`,
        "Compensation and attendance scenarios require ISO periodEnd for effective-dated payroll validation.",
      ),
    );
  }
  if (isIsoDate(periodStart) && isIsoDate(periodEnd)) {
    if (periodStart > periodEnd) {
      issues.push(
        issue(
          fixture,
          "SCENARIO_INPUT_INVALID",
          `goldenFixtures.${fixture.id}.calculationScenario.input.periodEnd`,
          "Payroll calculation scenario periodEnd cannot be before periodStart.",
        ),
      );
    }
    if (fixture.date < periodStart || fixture.date > periodEnd) {
      issues.push(
        issue(
          fixture,
          "SCENARIO_INPUT_INVALID",
          `goldenFixtures.${fixture.id}.date`,
          "Compensation and attendance fixture date must fall inside the payroll period it validates.",
        ),
      );
    }
  }

  return issues.length === beforeIssueCount;
}

function purposeMatches(purpose: string | undefined, matcher: string) {
  return purpose === matcher || Boolean(purpose?.startsWith(`${matcher}_`));
}

function validateRequiredExpectedOutputFields(
  fixture: GoldenFixture,
  expectedOutput: Record<string, unknown>,
  issues: PayrollCalculationFixtureIssue[],
) {
  REQUIRED_COMPONENT_OUTPUT_REQUIREMENTS.filter(
    (requirement) =>
      requirement.parameterPath === fixture.parameterPath &&
      purposeMatches(fixture.purpose, requirement.purposeMatcher),
  ).forEach((requirement) => {
    requirement.fields.forEach((field) => {
      if (expectedOutput[field] !== undefined) return;
      issues.push(
        issue(
          fixture,
          "SCENARIO_EXPECTED_OUTPUT_MISSING",
          `goldenFixtures.${fixture.id}.calculationScenario.expectedOutput.${field}`,
          `Payroll ${requirement.label} scenario must pin payslip/register tie-out output ${field}.`,
        ),
      );
    });
  });
}

function scenarioInput(
  fixture: GoldenFixture,
  issues: PayrollCalculationFixtureIssue[],
) {
  const input = fixture.calculationScenario?.input;
  if (!input || !isRecord(input)) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.input`,
        "Payroll calculation scenario input must be an object.",
      ),
    );
    return null;
  }
  return input;
}

function toTaxEvaluationInput(
  fixture: GoldenFixture,
  issues: PayrollCalculationFixtureIssue[],
): PayrollTaxRuleEvaluationInput | null {
  const input = scenarioInput(fixture, issues);
  if (!input) return null;

  const taxableBaseAmount = decimalInput(input.taxableBaseAmount);
  if (taxableBaseAmount == null) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.input.taxableBaseAmount`,
        "Payroll tax calculation scenarios require taxableBaseAmount.",
      ),
    );
    return null;
  }

  return {
    taxableBaseAmount,
    ytdTaxableBaseAmount: decimalInput(input.ytdTaxableBaseAmount, 0),
    ytdTaxWithheldAmount: decimalInput(input.ytdTaxWithheldAmount, 0),
    adjustmentValues: isRecord(input.adjustmentValues)
      ? (input.adjustmentValues as Record<string, Prisma.Decimal.Value>)
      : undefined,
    capabilityStatus: "REQUIRES_CONFIGURATION",
    currency: typeof input.currency === "string" ? input.currency : undefined,
  };
}

function actualTaxOutputFor(
  result: ReturnType<typeof evaluatePayrollTaxRule>,
) {
  const taxAmount = result.taxAmount.toFixed(2);
  return {
    status: result.status,
    applied: result.applied,
    calculationMode: result.trace.calculationMode ?? "",
    incomeTaxWithholdingAmount: taxAmount,
    taxAmount,
    taxableBaseAmount: result.taxableBaseAmount.toFixed(2),
    adjustedTaxableBaseAmount: result.adjustedTaxableBaseAmount.toFixed(2),
    cumulativeTaxableBaseAmount: result.cumulativeTaxableBaseAmount.toFixed(2),
    taxableBaseAdjustmentAmount: result.trace.taxableBaseAdjustmentAmount,
    taxAmountBeforeAdjustments: result.trace.taxAmountBeforeAdjustments,
    taxAmountAdjustmentAmount: result.trace.taxAmountAdjustmentAmount,
    currency: result.currency,
  };
}

function actualCnpsPensionOutputFor(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  issues: PayrollCalculationFixtureIssue[],
  currency: string,
) {
  const input = scenarioInput(fixture, issues);
  if (!input) return null;

  const grossAmount = requiredDecimalInput(fixture, input, "grossAmount", issues);
  const employeeRateBps = requiredBps(fixture, rule, "employee", issues);
  const employerRateBps = requiredBps(fixture, rule, "employer", issues);
  if (!grossAmount || employeeRateBps == null || employerRateBps == null) {
    return null;
  }

  const monthlyCeiling = optionalPositiveDecimal(rule.monthlyCeilingMinorUnits);
  const socialBaseAmount = monthlyCeiling && grossAmount.gt(monthlyCeiling)
    ? monthlyCeiling
    : grossAmount;
  const employeeContribution = contributionAmount(
    socialBaseAmount,
    employeeRateBps,
  );
  const employerContribution = contributionAmount(
    socialBaseAmount,
    employerRateBps,
  );

  return {
    status: "CALCULATED",
    applied: true,
    grossAmount: decimalOutput(grossAmount),
    socialBaseAmount: decimalOutput(socialBaseAmount),
    employeePensionRateBps: String(employeeRateBps),
    employerPensionRateBps: String(employerRateBps),
    employeePensionContributionAmount: decimalOutput(employeeContribution),
    employerPensionContributionAmount: decimalOutput(employerContribution),
    totalPensionContributionAmount: decimalOutput(
      employeeContribution.plus(employerContribution),
    ),
    currency,
  };
}

function actualFamilyAllowanceOutputFor(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  issues: PayrollCalculationFixtureIssue[],
  currency: string,
) {
  const input = scenarioInput(fixture, issues);
  if (!input) return null;

  const contributionBaseAmount = requiredDecimalInput(
    fixture,
    input,
    "contributionBaseAmount",
    issues,
  );
  const sector = normalizeFamilyAllowanceSector(input.sector);
  const rateKey = sector ? familyAllowanceRateKey(sector) : null;
  if (!contributionBaseAmount || !sector || !rateKey) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.input.sector`,
        "CNPS family allowance scenarios require sector GENERAL, AGRICULTURE, or PRIVATE_EDUCATION.",
      ),
    );
    return null;
  }

  const rateBps = requiredBps(fixture, rule, rateKey, issues);
  if (rateBps == null) return null;
  const contribution = contributionAmount(contributionBaseAmount, rateBps);

  return {
    status: "CALCULATED",
    applied: true,
    contributionBaseAmount: decimalOutput(contributionBaseAmount),
    familyAllowanceSector: sector,
    familyAllowanceRateBps: String(rateBps),
    familyAllowanceContributionAmount: decimalOutput(contribution),
    currency,
  };
}

function actualOccupationalRiskOutputFor(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  issues: PayrollCalculationFixtureIssue[],
  currency: string,
) {
  const input = scenarioInput(fixture, issues);
  if (!input) return null;

  const contributionBaseAmount = requiredDecimalInput(
    fixture,
    input,
    "contributionBaseAmount",
    issues,
  );
  const group = normalizeOccupationalRiskGroup(input.group);
  const rateKey = group ? occupationalRiskRateKey(group) : null;
  if (!contributionBaseAmount || !group || !rateKey) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.input.group`,
        "CNPS occupational risk scenarios require group A, B, or C.",
      ),
    );
    return null;
  }

  const rateBps = requiredBps(fixture, rule, rateKey, issues);
  if (rateBps == null) return null;
  const contribution = contributionAmount(contributionBaseAmount, rateBps);

  return {
    status: "CALCULATED",
    applied: true,
    contributionBaseAmount: decimalOutput(contributionBaseAmount),
    occupationalRiskGroup: group,
    occupationalRiskRateBps: String(rateBps),
    occupationalRiskContributionAmount: decimalOutput(contribution),
    currency,
  };
}

function actualCompensationComponentOutputFor(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  issues: PayrollCalculationFixtureIssue[],
  currency: string,
) {
  const input = scenarioInput(fixture, issues);
  if (!input) return null;

  const mode = requiredRuleMode(
    fixture,
    rule,
    ["FIXED_AMOUNT", "INPUT_AMOUNT", "RATE_BPS", "QUANTITY_RATE"],
    issues,
  );
  const payrollEffect = requiredPayrollEffect(fixture, rule, issues);
  if (!mode || !payrollEffect) return null;

  let componentAmount: Prisma.Decimal | null = null;
  let baseAmount: Prisma.Decimal | null = null;
  let quantity: Prisma.Decimal | null = null;
  let unitAmount: Prisma.Decimal | null = null;
  let rateBps: number | null = null;

  if (mode === "FIXED_AMOUNT") {
    componentAmount = requiredRuleDecimal(fixture, rule, "amount", issues);
  } else if (mode === "INPUT_AMOUNT") {
    componentAmount = requiredDecimalInput(fixture, input, "amount", issues);
  } else if (mode === "RATE_BPS") {
    baseAmount = requiredDecimalInput(fixture, input, "baseAmount", issues);
    rateBps = requiredBps(fixture, rule, "rateBps", issues);
    if (baseAmount && rateBps != null) {
      componentAmount = contributionAmount(baseAmount, rateBps);
    }
  } else if (mode === "QUANTITY_RATE") {
    quantity = requiredDecimalInput(fixture, input, "quantity", issues);
    unitAmount = requiredRuleDecimal(fixture, rule, "unitAmount", issues);
    if (quantity && unitAmount) {
      componentAmount = quantity.times(unitAmount).toDecimalPlaces(2);
    }
  }

  if (!componentAmount) return null;
  componentAmount = applyAmountBounds(fixture, rule, componentAmount, issues);

  const zero = decimalZero();
  const grossAmount = payrollEffect === "EARNING" ? componentAmount : zero;
  const employeeDeductionAmount =
    payrollEffect === "DEDUCTION" ? componentAmount : zero;
  const employerChargeAmount =
    payrollEffect === "EMPLOYER_CHARGE" || rule.employerCharge === true
      ? componentAmount
      : zero;
  const taxableBaseAmount = rule.taxableBase === true ? componentAmount : zero;
  const socialBaseAmount = rule.socialBase === true ? componentAmount : zero;
  const netPayableAmount = grossAmount.minus(employeeDeductionAmount);
  const componentCode =
    typeof rule.componentCode === "string" && rule.componentCode.trim()
      ? rule.componentCode.trim().toUpperCase()
      : fixture.id;

  return {
    status: "CALCULATED",
    applied: true,
    componentCode,
    calculationMode: mode,
    payrollEffect,
    componentAmount: decimalOutput(componentAmount),
    baseAmount: baseAmount ? decimalOutput(baseAmount) : "0.00",
    rateBps: rateBps == null ? "0" : String(rateBps),
    unitAmount: unitAmount ? decimalOutput(unitAmount) : "0.00",
    quantity: quantity ? quantity.toDecimalPlaces(3).toFixed(3) : "0.000",
    grossAmount: decimalOutput(grossAmount),
    taxableBaseAmount: decimalOutput(taxableBaseAmount),
    socialBaseAmount: decimalOutput(socialBaseAmount),
    employeeDeductionAmount: decimalOutput(employeeDeductionAmount),
    employerChargeAmount: decimalOutput(employerChargeAmount),
    netPayableAmount: decimalOutput(netPayableAmount),
    payslipLineAmount: decimalOutput(componentAmount),
    registerGrossAmount: decimalOutput(grossAmount),
    registerTaxableBaseAmount: decimalOutput(taxableBaseAmount),
    registerSocialBaseAmount: decimalOutput(socialBaseAmount),
    registerEmployeeDeductionAmount: decimalOutput(employeeDeductionAmount),
    registerEmployerChargeAmount: decimalOutput(employerChargeAmount),
    registerNetPayableAmount: decimalOutput(netPayableAmount),
    currency,
  };
}

function actualLeaveOutputFor(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  issues: PayrollCalculationFixtureIssue[],
  currency: string,
) {
  const input = scenarioInput(fixture, issues);
  if (!input) return null;

  const mode = requiredRuleMode(
    fixture,
    rule,
    ["PAID_TIME_RATIO", "UNPAID_TIME_RATIO"],
    issues,
  );
  if (!mode) return null;

  const baseAmount = requiredDecimalInput(fixture, input, "baseAmount", issues);
  const scheduledMinutes = requiredPositiveDecimalInput(
    fixture,
    input,
    "scheduledMinutes",
    issues,
  );
  const workedMinutes = requiredDecimalInput(
    fixture,
    input,
    "workedMinutes",
    issues,
  );
  const leaveMinutes = requiredDecimalInput(fixture, input, "leaveMinutes", issues);
  if (!baseAmount || !scheduledMinutes || !workedMinutes || !leaveMinutes) {
    return null;
  }

  const paidLeaveMinutes = mode === "PAID_TIME_RATIO" ? leaveMinutes : decimalZero();
  const paidMinutes = workedMinutes.plus(paidLeaveMinutes);
  const cappedPaidMinutes = paidMinutes.gt(scheduledMinutes)
    ? scheduledMinutes
    : paidMinutes;
  const attendanceRatio = cappedPaidMinutes.div(scheduledMinutes);
  const grossAmount = baseAmount.times(attendanceRatio).toDecimalPlaces(2);
  const leavePaidAmount = baseAmount
    .times(paidLeaveMinutes)
    .div(scheduledMinutes)
    .toDecimalPlaces(2);
  const leaveDeductionAmount = baseAmount
    .times(mode === "UNPAID_TIME_RATIO" ? leaveMinutes : decimalZero())
    .div(scheduledMinutes)
    .toDecimalPlaces(2);

  return {
    status: "CALCULATED",
    applied: true,
    calculationMode: mode,
    baseAmount: decimalOutput(baseAmount),
    scheduledMinutes: scheduledMinutes.toDecimalPlaces(0).toFixed(0),
    workedMinutes: workedMinutes.toDecimalPlaces(0).toFixed(0),
    leaveMinutes: leaveMinutes.toDecimalPlaces(0).toFixed(0),
    paidMinutes: cappedPaidMinutes.toDecimalPlaces(0).toFixed(0),
    attendanceRatio: attendanceRatio.toDecimalPlaces(6).toFixed(6),
    grossAmount: decimalOutput(grossAmount),
    leavePaidAmount: decimalOutput(leavePaidAmount),
    leaveDeductionAmount: decimalOutput(leaveDeductionAmount),
    payslipLineAmount: decimalOutput(
      mode === "PAID_TIME_RATIO" ? leavePaidAmount : leaveDeductionAmount,
    ),
    registerGrossAmount: decimalOutput(grossAmount),
    registerLeavePaidAmount: decimalOutput(leavePaidAmount),
    registerLeaveDeductionAmount: decimalOutput(leaveDeductionAmount),
    registerNetPayableAmount: decimalOutput(grossAmount),
    currency,
  };
}

function actualOvertimeOutputFor(
  fixture: GoldenFixture,
  rule: Record<string, unknown>,
  issues: PayrollCalculationFixtureIssue[],
  currency: string,
) {
  const input = scenarioInput(fixture, issues);
  if (!input) return null;

  const mode = requiredRuleMode(
    fixture,
    rule,
    ["OVERTIME_RATE_BPS"],
    issues,
  );
  if (!mode) return null;

  const baseAmount = requiredDecimalInput(fixture, input, "baseAmount", issues);
  const scheduledMinutes = requiredPositiveDecimalInput(
    fixture,
    input,
    "scheduledMinutes",
    issues,
  );
  const overtimeMinutes = requiredDecimalInput(
    fixture,
    input,
    "overtimeMinutes",
    issues,
  );
  const rateBps = requiredBps(fixture, rule, "rateBps", issues);
  if (!baseAmount || !scheduledMinutes || !overtimeMinutes || rateBps == null) {
    return null;
  }

  const overtimeBaseAmount = baseAmount
    .times(overtimeMinutes)
    .div(scheduledMinutes)
    .toDecimalPlaces(2);
  const overtimePremiumAmount = overtimeBaseAmount
    .times(rateBps)
    .div(10000)
    .toDecimalPlaces(2);

  return {
    status: "CALCULATED",
    applied: true,
    calculationMode: mode,
    baseAmount: decimalOutput(baseAmount),
    scheduledMinutes: scheduledMinutes.toDecimalPlaces(0).toFixed(0),
    overtimeMinutes: overtimeMinutes.toDecimalPlaces(0).toFixed(0),
    rateBps: String(rateBps),
    overtimeBaseAmount: decimalOutput(overtimeBaseAmount),
    overtimePremiumAmount: decimalOutput(overtimePremiumAmount),
    grossAmount: decimalOutput(overtimePremiumAmount),
    taxableBaseAmount: rule.taxableBase === true ? decimalOutput(overtimePremiumAmount) : "0.00",
    socialBaseAmount: rule.socialBase === true ? decimalOutput(overtimePremiumAmount) : "0.00",
    payslipLineAmount: decimalOutput(overtimePremiumAmount),
    registerGrossAmount: decimalOutput(overtimePremiumAmount),
    registerTaxableBaseAmount: rule.taxableBase === true ? decimalOutput(overtimePremiumAmount) : "0.00",
    registerSocialBaseAmount: rule.socialBase === true ? decimalOutput(overtimePremiumAmount) : "0.00",
    registerNetPayableAmount: decimalOutput(overtimePremiumAmount),
    registerOvertimeBaseAmount: decimalOutput(overtimeBaseAmount),
    registerOvertimePremiumAmount: decimalOutput(overtimePremiumAmount),
    currency,
  };
}
function compareOutputs(
  fixture: GoldenFixture,
  actualOutput: Record<string, string | boolean>,
  issues: PayrollCalculationFixtureIssue[],
) {
  const expectedOutput = fixture.calculationScenario?.expectedOutput;
  if (!expectedOutput || !isRecord(expectedOutput)) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_INPUT_INVALID",
        `goldenFixtures.${fixture.id}.calculationScenario.expectedOutput`,
        "Payroll calculation scenario expectedOutput must be an object.",
      ),
    );
    return;
  }

  validateRequiredExpectedOutputFields(fixture, expectedOutput, issues);

  Object.entries(expectedOutput).forEach(([key, expected]) => {
    if (!SUPPORTED_OUTPUT_FIELDS.has(key)) {
      issues.push(
        issue(
          fixture,
          "SCENARIO_EXPECTED_OUTPUT_UNSUPPORTED",
          `goldenFixtures.${fixture.id}.calculationScenario.expectedOutput.${key}`,
          `Payroll calculation scenario expected output field "${key}" is not supported by the runner.`,
        ),
      );
      return;
    }

    const actual = actualOutput[key];
    if (String(actual) === String(expected)) return;

    issues.push(
      issue(
        fixture,
        "SCENARIO_OUTPUT_MISMATCH",
        `goldenFixtures.${fixture.id}.calculationScenario.expectedOutput.${key}`,
        `Expected ${key} to be ${String(expected)}, but evaluator returned ${String(actual)}.`,
      ),
    );
  });
}

function actualOutputFor(
  pack: CountryPack,
  fixture: GoldenFixture,
  selectedValue: Record<string, unknown>,
  capabilityStatus: string,
  issues: PayrollCalculationFixtureIssue[],
) {
  if (fixture.parameterPath === IRPP_INCOME_TAX_PARAMETER_PATH) {
    const evaluationInput = toTaxEvaluationInput(fixture, issues);
    if (!evaluationInput) return null;
    const result = evaluatePayrollTaxRule(selectedValue as PayrollTaxRule, {
      ...evaluationInput,
      capabilityStatus,
      currency: evaluationInput.currency ?? pack.header.currencyCode,
    });
    return actualTaxOutputFor(result);
  }

  if (fixture.parameterPath === CNPS_PENSION_PARAMETER_PATH) {
    return actualCnpsPensionOutputFor(
      fixture,
      selectedValue,
      issues,
      pack.header.currencyCode,
    );
  }

  if (fixture.parameterPath === CNPS_FAMILY_ALLOWANCE_PARAMETER_PATH) {
    return actualFamilyAllowanceOutputFor(
      fixture,
      selectedValue,
      issues,
      pack.header.currencyCode,
    );
  }

  if (fixture.parameterPath === CNPS_OCCUPATIONAL_RISK_PARAMETER_PATH) {
    return actualOccupationalRiskOutputFor(
      fixture,
      selectedValue,
      issues,
      pack.header.currencyCode,
    );
  }

  if (
    fixture.parameterPath === COMPENSATION_ALLOWANCES_PARAMETER_PATH ||
    fixture.parameterPath === COMPENSATION_BENEFITS_PARAMETER_PATH
  ) {
    return actualCompensationComponentOutputFor(
      fixture,
      selectedValue,
      issues,
      pack.header.currencyCode,
    );
  }

  if (fixture.parameterPath === ATTENDANCE_LEAVE_PARAMETER_PATH) {
    return actualLeaveOutputFor(
      fixture,
      selectedValue,
      issues,
      pack.header.currencyCode,
    );
  }

  if (fixture.parameterPath === ATTENDANCE_OVERTIME_PARAMETER_PATH) {
    return actualOvertimeOutputFor(
      fixture,
      selectedValue,
      issues,
      pack.header.currencyCode,
    );
  }

  return null;
}

function runFixture(
  pack: CountryPack,
  fixture: GoldenFixture,
  issues: PayrollCalculationFixtureIssue[],
): PayrollCalculationFixtureRun {
  const expectedOutput = isRecord(fixture.calculationScenario?.expectedOutput)
    ? fixture.calculationScenario.expectedOutput
    : {};
  const evidence = fixture.calculationScenario?.reviewEvidence;
  const reviewEvidence = isRecord(evidence)
    ? {
        reviewedBy: String(evidence.reviewedBy ?? ""),
        reviewedOn: String(evidence.reviewedOn ?? ""),
        legalRef: String(evidence.legalRef ?? ""),
        sourceEvidenceHash: String(evidence.sourceEvidenceHash ?? ""),
      }
    : null;
  const runBase = {
    fixtureId: fixture.id,
    parameterPath: fixture.parameterPath,
    purpose: fixture.purpose ?? null,
    reviewStatus: fixture.calculationScenario?.reviewStatus ?? "UNKNOWN",
    reviewEvidence,
    expectedOutput,
  };

  if (!SUPPORTED_PARAMETER_PATHS.has(fixture.parameterPath)) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_PARAMETER_UNSUPPORTED",
        `goldenFixtures.${fixture.id}.parameterPath`,
        `Payroll calculation fixture runner does not support ${fixture.parameterPath}.`,
      ),
    );
    return { ...runBase, status: "FAILED", actualOutput: null };
  }

  const envelopes = getParameterEnvelopeArray(pack, fixture.parameterPath);
  const selected = envelopes
    ? selectEffectiveEnvelope(envelopes, fixture.date)
    : null;
  if (!selected || !isRecord(selected.value)) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_PARAMETER_UNRESOLVED",
        `goldenFixtures.${fixture.id}.parameterPath`,
        "Payroll calculation scenario did not resolve an effective country-pack rule.",
      ),
    );
    return { ...runBase, status: "FAILED", actualOutput: null };
  }

  const capabilityStatus = capabilityStatusForPath(pack, fixture.parameterPath);
  if (!capabilityStatus) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_CAPABILITY_MISSING",
        `header.capabilityMatrix.${fixture.parameterPath}`,
        "Payroll calculation scenario requires a country-pack capability status.",
      ),
    );
    return { ...runBase, status: "FAILED", actualOutput: null };
  }

  try {
    const beforeIssueCount = issues.length;
    if (!validatePayrollPeriodScope(fixture, issues)) {
      return { ...runBase, status: "FAILED", actualOutput: null };
    }
    const actualOutput = actualOutputFor(
      pack,
      fixture,
      selected.value,
      capabilityStatus,
      issues,
    );
    if (!actualOutput) {
      return { ...runBase, status: "FAILED", actualOutput: null };
    }

    compareOutputs(fixture, actualOutput, issues);
    return {
      ...runBase,
      status: issues.length === beforeIssueCount ? "PASSED" : "FAILED",
      actualOutput,
    };
  } catch (error) {
    issues.push(
      issue(
        fixture,
        "SCENARIO_EXECUTION_FAILED",
        `goldenFixtures.${fixture.id}.calculationScenario`,
        error instanceof Error
          ? error.message
          : "Payroll calculation scenario execution failed.",
      ),
    );
    return { ...runBase, status: "FAILED", actualOutput: null };
  }
}

export function validatePayrollCountryPackCalculationFixtures(
  pack: CountryPack,
): PayrollCalculationFixtureValidationResult {
  const issues: PayrollCalculationFixtureIssue[] = [];
  const fixtures = pack.goldenFixtures.filter(
    (fixture) => fixture.calculationScenario,
  );
  const runs = fixtures.map((fixture) => runFixture(pack, fixture, issues));

  return {
    valid: issues.length === 0,
    runs,
    issues,
  };
}