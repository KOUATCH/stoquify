import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalType,
  LedgerPostingBatchStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  PayrollRunType,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client";

import { ConflictError } from "@/services/_shared/action-errors";

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/accounting/posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
  linkAccountingSource: jest.fn(),
}));

jest.mock("@/services/accounting/periods.service", () => ({
  getOpenPeriodForDate: jest.fn(),
}));

jest.mock("@/services/accounting/posting-rules.service", () => ({
  getActivePostingRule: jest.fn(),
}));

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service");
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  };
});

jest.mock("@/services/regulatory/country-packs/resolve", () => ({
  resolveRegulatoryParameter: jest.fn(),
}));

import { db } from "@/prisma/db";
import {
  createLedgerPostingBatch,
  linkAccountingSource,
} from "@/services/accounting/posting.service";
import { getOpenPeriodForDate } from "@/services/accounting/periods.service";
import { getActivePostingRule } from "@/services/accounting/posting-rules.service";
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";
import { resolveRegulatoryParameter } from "@/services/regulatory/country-packs/resolve";

import {
  approveAndPostPayrollRun,
  calculatePayrollRun,
  preparePayrollDeclarations,
} from "../payroll-control.service";

const mockDb = db as unknown as { $transaction: jest.Mock };
const mockedCreateLedgerPostingBatch = createLedgerPostingBatch as jest.Mock;
const mockedLinkAccountingSource = linkAccountingSource as jest.Mock;
const mockedGetOpenPeriodForDate = getOpenPeriodForDate as jest.Mock;
const mockedGetActivePostingRule = getActivePostingRule as jest.Mock;
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock;
const mockedMarkBusinessEventAppliedInTx =
  markBusinessEventAppliedInTx as jest.Mock;
const mockedResolveRegulatoryParameter =
  resolveRegulatoryParameter as jest.Mock;

function buildTx() {
  return {
    organization: {
      findFirst: jest.fn(),
    },
    payrollPeriod: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollEmployee: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    payrollAttendanceSnapshot: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    payrollRun: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollPayslip: {
      create: jest.fn(),
    },
    payrollDeclaration: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    journal: {
      findFirst: jest.fn(),
    },
    journalEntry: {
      count: jest.fn(),
      create: jest.fn(),
    },
    chartOfAccount: {
      findMany: jest.fn(),
    },
    ledgerPostingBatch: {
      update: jest.fn(),
    },
    ledgerAuditEvent: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    businessEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    closeRun: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: "close-run-1" }),
    },
    closePackExport: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: "close-pack-export-1" }),
    },
  };
}

const payrollPeriod = {
  id: "period-1",
  organizationId: "org-1",
  name: "June 2026",
  periodStart: new Date("2026-06-01T00:00:00.000Z"),
  periodEnd: new Date("2026-06-30T23:59:59.999Z"),
  payDate: new Date("2026-06-30T00:00:00.000Z"),
  status: PayrollPeriodStatus.INPUTS_LOCKED,
  countryCode: "CM",
  inputLockedAt: new Date("2026-06-20T00:00:00.000Z"),
  inputLockedById: "hr-1",
};

const pensionResolution = {
  countryCode: "CM",
  parameterPath: "payroll.cnps.pensionRatesBps",
  value: {
    employee: 420,
    employer: 420,
    monthlyCeilingMinorUnits: 750000,
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-11",
  verifiedBy: "Official CNPS regulator source",
  verificationStatus: "REGULATOR_CONFIRMED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "pension-hash",
};

const familyAllowanceResolution = {
  countryCode: "CM",
  parameterPath: "payroll.cnps.familyAllowanceRatesBps",
  value: {
    general: 700,
    agriculture: 565,
    privateEducation: 370,
    paidBy: "EMPLOYER",
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-11",
  verifiedBy: "Official CNPS regulator source",
  verificationStatus: "REGULATOR_CONFIRMED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "family-allowance-hash",
};

const occupationalRiskResolution = {
  countryCode: "CM",
  parameterPath: "payroll.cnps.occupationalRiskRatesBps",
  value: {
    groupA: 175,
    groupB: 250,
    groupC: 500,
    paidBy: "EMPLOYER",
    classificationRequired: true,
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-11",
  verifiedBy: "Official CNPS regulator source",
  verificationStatus: "REGULATOR_CONFIRMED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "occupational-risk-hash",
};

const employerRulesResolution = {
  countryCode: "CM",
  parameterPath: "payroll.cnps.employerRules",
  value: {
    payrollBaseRequiresCnpsReview: true,
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_CNPS_EMPLOYER_RULES",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-11",
  verifiedBy: "Official CNPS regulator source",
  verificationStatus: "REGULATOR_CONFIRMED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "employer-rules-hash",
};

const incomeTaxRulesResolution = {
  countryCode: "CM",
  parameterPath: "payroll.irpp.incomeTaxRules",
  value: {
    productionCalculationSupported: false,
    calculationMode: "OFFICIAL_IRPP_FORMULA_REVIEW_REQUIRED",
    employeeWithholdingRequired: true,
    declarationCode: "IRPP",
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_DGI_CGI_2025",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-11",
  verifiedBy:
    "Codex regulatory source pass; legal-owner approval required before statutory publication",
  verificationStatus: "REQUIRES_EXPERT_REVIEW",
  layer: "country",
  capabilityStatus: "REQUIRES_EXPERT_REVIEW",
  resolutionHash: "income-tax-rules-hash",
};

const leaveResolution = {
  countryCode: "CM",
  parameterPath: "payroll.attendance.leave",
  value: {
    calculationMode: "PAID_TIME_RATIO",
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_REVIEWED_LEAVE_POLICY",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-18",
  verifiedBy: "Payroll policy reviewer",
  verificationStatus: "EXPERT_REVIEWED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "leave-policy-hash",
};

const overtimeResolution = {
  countryCode: "CM",
  parameterPath: "payroll.attendance.overtime",
  value: {
    calculationMode: "OVERTIME_RATE_BPS",
    rateBps: 15000,
    taxableBase: true,
    socialBase: true,
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_REVIEWED_OVERTIME_POLICY",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-18",
  verifiedBy: "Payroll policy reviewer",
  verificationStatus: "EXPERT_REVIEWED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "overtime-policy-hash",
};

const compensationBenefitResolution = {
  countryCode: "CM",
  parameterPath: "payroll.compensation.benefits",
  value: {
    componentCode: "HEALTH_FORMULA",
    calculationMode: "RATE_BPS",
    payrollEffect: "EMPLOYER_CHARGE",
    rateBps: 500,
    taxableBase: false,
    socialBase: false,
    employerCharge: true,
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_REVIEWED_BENEFIT_POLICY",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-18",
  verifiedBy: "Payroll compensation reviewer",
  verificationStatus: "EXPERT_REVIEWED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "benefit-formula-hash",
};

const cnpsLegalProvenance = [
  pensionResolution,
  familyAllowanceResolution,
  occupationalRiskResolution,
  employerRulesResolution,
].map((resolution) => ({
  parameterPath: resolution.parameterPath,
  legalRef: resolution.legalRef,
  effectiveFrom: resolution.effectiveFrom,
  effectiveTo: resolution.effectiveTo,
  verifiedOn: resolution.verifiedOn,
  verifiedBy: resolution.verifiedBy,
  verificationStatus: resolution.verificationStatus,
  capabilityStatus: resolution.capabilityStatus,
  resolutionHash: resolution.resolutionHash,
}));

const cnpsGoldenCalculationOutput = {
  baseSalary: "100000.00",
  grossAmount: "100000.00",
  socialBaseAmount: "100000.00",
  employeePensionContributionAmount: "4200.00",
  employerPensionContributionAmount: "4200.00",
  familyAllowanceContributionAmount: "7000.00",
  occupationalRiskContributionAmount: "1750.00",
  incomeTaxWithholdingAmount: null,
  incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
  incomeTaxApplied: false,
  employeeDeductionAmount: "4200.00",
  employerChargeAmount: "12950.00",
  netPayableAmount: "95800.00",
};

type MockCountryPackOverrides = {
  pensionValue?: Record<string, unknown>;
  familyAllowanceValue?: Record<string, unknown>;
  occupationalRiskValue?: Record<string, unknown>;
  employerRulesValue?: Record<string, unknown>;
  incomeTaxRulesValue?: Record<string, unknown>;
  leaveValue?: Record<string, unknown>;
  overtimeValue?: Record<string, unknown>;
  compensationBenefitValue?: Record<string, unknown>;
  compensationBenefitCapabilityStatus?: string;
  compensationBenefitVerificationStatus?: string;
};

function mockCountryPack(overrides: MockCountryPackOverrides = {}) {
  const pension = {
    ...pensionResolution,
    value: { ...pensionResolution.value, ...overrides.pensionValue },
  };
  const familyAllowance = {
    ...familyAllowanceResolution,
    value: {
      ...familyAllowanceResolution.value,
      ...overrides.familyAllowanceValue,
    },
  };
  const occupationalRisk = {
    ...occupationalRiskResolution,
    value: {
      ...occupationalRiskResolution.value,
      ...overrides.occupationalRiskValue,
    },
  };
  const employerRules = {
    ...employerRulesResolution,
    value: {
      ...employerRulesResolution.value,
      ...overrides.employerRulesValue,
    },
  };
  const incomeTaxRules = {
    ...incomeTaxRulesResolution,
    value: {
      ...incomeTaxRulesResolution.value,
      ...overrides.incomeTaxRulesValue,
    },
  };
  const leave = {
    ...leaveResolution,
    value: { ...leaveResolution.value, ...overrides.leaveValue },
  };
  const overtime = {
    ...overtimeResolution,
    value: { ...overtimeResolution.value, ...overrides.overtimeValue },
  };
  const compensationBenefit = {
    ...compensationBenefitResolution,
    value: {
      ...compensationBenefitResolution.value,
      ...overrides.compensationBenefitValue,
    },
    capabilityStatus:
      overrides.compensationBenefitCapabilityStatus ??
      compensationBenefitResolution.capabilityStatus,
    verificationStatus:
      overrides.compensationBenefitVerificationStatus ??
      compensationBenefitResolution.verificationStatus,
  };

  mockedResolveRegulatoryParameter.mockImplementation((path: string) => {
    if (path === "payroll.cnps.pensionRatesBps") return pension;
    if (path === "payroll.cnps.familyAllowanceRatesBps") return familyAllowance;
    if (path === "payroll.cnps.occupationalRiskRatesBps")
      return occupationalRisk;
    if (path === "payroll.cnps.employerRules") return employerRules;
    if (path === "payroll.irpp.incomeTaxRules") return incomeTaxRules;
    if (path === "payroll.attendance.leave") return leave;
    if (path === "payroll.attendance.overtime") return overtime;
    if (path === "payroll.compensation.benefits") return compensationBenefit;
    if (path === "payroll.declarations.default") {
      return {
        countryCode: "CM",
        parameterPath: "payroll.declarations.default",
        value: {
          declarations: [
            {
              authority: "CNPS",
              declarationType: "SOCIAL_CONTRIBUTION",
              dueDate: "2026-07-15T00:00:00.000Z",
              capabilityStatus: "SUPPORTED",
            },
          ],
        },
        packVersion: "CM-2026.1",
        schemaVersion: "country-pack.v1",
        legalRef: "CM_PAYROLL_DECLARATION_CONFIG",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        verifiedOn: "2026-06-11",
        verifiedBy: "Codex regulatory source pass",
        verificationStatus: "EXPERT_REVIEWED",
        layer: "country",
        capabilityStatus: "SUPPORTED",
        resolutionHash: "declaration-config-hash",
      };
    }
    throw new Error(`Unexpected regulatory path ${path}`);
  });
}

const payrollRoundingPolicy = {
  kind: "AQSTOQFLOW_PAYROLL_ROUNDING_POLICY",
  version: 1,
  mode: "HALF_UP",
  scale: 2,
  amountScale: 2,
  source: "organization_accounting_settings",
  roundingPolicyHash: "sha256:rounding-policy",
};

const payrollYearToDatePolicy = {
  kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY",
  version: 1,
  basis: "TENANT_FISCAL_YEAR",
  yearStartMonth: 1,
  yearStartDay: 1,
  periodStart: "2026-01-01T00:00:00.000Z",
  periodEnd: "2026-06-30T00:00:00.000Z",
  source: "organization_accounting_settings",
  ytdPolicyHash: "sha256:ytd-policy",
};

const payrollYearToDateMetadata = {
  yearToDatePolicy: payrollYearToDatePolicy,
  yearToDatePolicyHash: payrollYearToDatePolicy.ytdPolicyHash,
  yearToDateAccumulatorHashes: ["sha256:ytd-accumulator"],
};

function payrollRunFixture(
  status = PayrollRunStatus.CALCULATED,
  metadata: Record<string, unknown> = {
    countryPackStatus: { legalProvenance: cnpsLegalProvenance },
    roundingPolicy: payrollRoundingPolicy,
    roundingPolicyHash: payrollRoundingPolicy.roundingPolicyHash,
    ...payrollYearToDateMetadata,
  },
) {
  return {
    id: "run-1",
    organizationId: "org-1",
    payrollPeriodId: "period-1",
    payrollPeriod,
    runNumber: "PAY-20260630-0001",
    runType: PayrollRunType.ORDINARY,
    originalRunId: null,
    status,
    countryCode: "CM",
    countryPackVersion: "CM-2026.1",
    countryPackSchemaVersion: "country-pack.v1",
    countryPackResolutionHash: "sha256:country-pack",
    countryPackCapabilityStatus: "SUPPORTED",
    ruleSetHash: "sha256:rules",
    calculationHash: "sha256:calc",
    attendanceSnapshotHash: "sha256:attendance",
    grossAmount: new Prisma.Decimal("100000.00"),
    employeeDeductionAmount: new Prisma.Decimal("4200.00"),
    employerChargeAmount: new Prisma.Decimal("12950.00"),
    netPayableAmount: new Prisma.Decimal("95800.00"),
    currency: "XAF",
    documentHash: "sha256:run-doc",
    preparedById: "preparer-1",
    ledgerPostingBatchId: status === PayrollRunStatus.POSTED ? "batch-1" : null,
    postedBusinessEventId:
      status === PayrollRunStatus.POSTED ? "event-1" : null,
    metadata,
    lines: [
      {
        id: "run-line-1",
        employeeId: "employee-1",
        employee: {
          id: "employee-1",
          employeeNumber: "EMP-001",
          displayName: "Ada Payroll",
        },
        grossAmount: new Prisma.Decimal("100000.00"),
        taxableBaseAmount: new Prisma.Decimal("100000.00"),
        socialBaseAmount: new Prisma.Decimal("100000.00"),
        employeeDeductionAmount: new Prisma.Decimal("4200.00"),
        employerChargeAmount: new Prisma.Decimal("12950.00"),
        netPayableAmount: new Prisma.Decimal("95800.00"),
        currency: "XAF",
        calculationSnapshot: {
          roundingPolicy: payrollRoundingPolicy,
          roundingPolicyHash: payrollRoundingPolicy.roundingPolicyHash,
          grossAmount: "100000.00",
          taxableBaseAmount: "100000.00",
          socialBaseAmount: "100000.00",
          employeePensionContributionAmount: "4200.00",
          employerPensionContributionAmount: "4200.00",
          familyAllowanceContributionAmount: "7000.00",
          occupationalRiskContributionAmount: "1750.00",
          incomeTaxWithholdingAmount: null,
          incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          incomeTaxApplied: false,
          employeeDeductionAmount: "4200.00",
          employerChargeAmount: "12950.00",
          netPayableAmount: "95800.00",
          currency: "XAF",
        },
      },
    ],
    payslips: [],
  };
}

function payrollCorrectionRunFixture() {
  const correctionMetadata = {
    countryPackStatus: { legalProvenance: cnpsLegalProvenance },
    roundingPolicy: payrollRoundingPolicy,
    roundingPolicyHash: payrollRoundingPolicy.roundingPolicyHash,
    ...payrollYearToDateMetadata,
    correction: {
      originalRunId: "original-run-1",
      originalRunNumber: "PAY-20260531-0001",
      originalRunStatus: PayrollRunStatus.POSTED,
      originalRunDocumentHash: "sha256:original-run",
      originalRunEvidenceHash: "sha256:original-evidence",
      originalCalculationHash: "sha256:original-calc",
      correctionEvidenceHash: "sha256:correction-evidence",
    },
  };

  return {
    ...payrollRunFixture(PayrollRunStatus.CALCULATED, correctionMetadata),
    id: "correction-run-1",
    payrollPeriodId: "period-2",
    payrollPeriod: {
      ...payrollPeriod,
      id: "period-2",
      name: "July 2026 Correction",
      payDate: new Date("2026-07-31T00:00:00.000Z"),
    },
    runNumber: "PAY-20260731-0001",
    runType: PayrollRunType.CORRECTION,
    originalRunId: "original-run-1",
    grossAmount: new Prisma.Decimal("-10000.00"),
    employeeDeductionAmount: new Prisma.Decimal("-420.00"),
    employerChargeAmount: new Prisma.Decimal("-1295.00"),
    netPayableAmount: new Prisma.Decimal("-9580.00"),
    documentHash: "sha256:correction-run",
    lines: [
      {
        ...payrollRunFixture().lines[0],
        id: "correction-line-1",
        grossAmount: new Prisma.Decimal("-10000.00"),
        taxableBaseAmount: new Prisma.Decimal("-10000.00"),
        socialBaseAmount: new Prisma.Decimal("-10000.00"),
        employeeDeductionAmount: new Prisma.Decimal("-420.00"),
        employerChargeAmount: new Prisma.Decimal("-1295.00"),
        netPayableAmount: new Prisma.Decimal("-9580.00"),
        documentHash: "sha256:correction-line",
        calculationSnapshot: {
          roundingPolicy: payrollRoundingPolicy,
          roundingPolicyHash: payrollRoundingPolicy.roundingPolicyHash,
          grossAmount: "-10000.00",
          taxableBaseAmount: "-10000.00",
          socialBaseAmount: "-10000.00",
          employeePensionContributionAmount: "-420.00",
          employerPensionContributionAmount: "-420.00",
          familyAllowanceContributionAmount: "-700.00",
          occupationalRiskContributionAmount: "-175.00",
          incomeTaxWithholdingAmount: "0.00",
          overtimePremiumAmount: "0.00",
          payrollRubriqueGrossAmount: "0.00",
          payrollRubriqueTaxableBaseAmount: "0.00",
          payrollRubriqueSocialBaseAmount: "0.00",
          payrollRubriqueEmployeeDeductionAmount: "0.00",
          payrollRubriqueEmployerChargeAmount: "0.00",
          incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          incomeTaxApplied: false,
          employeeDeductionAmount: "-420.00",
          employerChargeAmount: "-1295.00",
          netPayableAmount: "-9580.00",
          currency: "XAF",
          componentMapping: {
            statutoryPayableAmount: "-1715.00",
            declarationLiabilityAmount: "-1715.00",
          },
          correctionContext: {
            originalRunId: "original-run-1",
            originalLineId: "original-line-1",
            originalRunDocumentHash: "sha256:original-run",
            originalLineDocumentHash: "sha256:original-line",
            deltaAmounts: {
              grossAmount: "-10000.00",
              employeeDeductionAmount: "-420.00",
              employerChargeAmount: "-1295.00",
              netPayableAmount: "-9580.00",
              statutoryPayableAmount: "-1715.00",
            },
            correctionBasisHash: "sha256:correction-basis",
          },
        },
      },
    ],
  };
}

function payrollPostingRule() {
  return {
    code: "PAYROLL-RUN",
    sourceType: AccountingSourceType.PAYROLL_RUN,
    postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "PAYROLL_GROSS_EXPENSE",
        amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Gross payroll expense",
        account: null,
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
        amountSource: PostingRuleAmountSource.EMPLOYER_CHARGE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Employer charges",
        account: null,
      },
      {
        lineNumber: 3,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "EMPLOYEE_PAYABLES",
        amountSource: PostingRuleAmountSource.NET_PAYABLE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Employee payable",
        account: null,
      },
      {
        lineNumber: 4,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "PAYROLL_WITHHOLDING_PAYABLE",
        amountSource: PostingRuleAmountSource.EMPLOYEE_DEDUCTION_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Employee deductions payable",
        account: null,
      },
      {
        lineNumber: 5,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "SOCIAL_CONTRIBUTIONS_PAYABLE",
        amountSource: PostingRuleAmountSource.EMPLOYER_CHARGE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Employer charges payable",
        account: null,
      },
    ],
  };
}

function mappedPayrollAccounts() {
  return [
    "PAYROLL_GROSS_EXPENSE",
    "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
    "EMPLOYEE_PAYABLES",
    "PAYROLL_WITHHOLDING_PAYABLE",
    "SOCIAL_CONTRIBUTIONS_PAYABLE",
  ].map((mappingKey, index) => ({
    id: `account-${index + 1}`,
    code: `6${index + 1}`,
    mappingKey,
    organizationId: "org-1",
    isActive: true,
    deletedAt: null,
    _count: { children: 0 },
  }));
}

describe("payroll control service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (handler) =>
      handler(buildTx()),
    );
    mockedRecordBusinessEventInTx.mockResolvedValue({
      event: { id: "event-1" },
      created: true,
    });
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({
      id: "event-1",
      status: "APPLIED",
    });
    mockedCreateLedgerPostingBatch.mockResolvedValue({ id: "batch-1" });
    mockedLinkAccountingSource.mockResolvedValue({ id: "source-link-1" });
    mockedGetOpenPeriodForDate.mockResolvedValue({
      id: "acct-period-1",
      status: "OPEN",
    });
    mockedGetActivePostingRule.mockResolvedValue(payrollPostingRule());
    mockCountryPack();
  });

  it("calculates a payroll run from frozen attendance and pins country-pack provenance", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        fiscalYearStartMonth: 1,
        fiscalYearStartDay: 1,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);
    tx.payrollRun.count.mockResolvedValue(0);
    tx.payrollRun.findMany.mockResolvedValue([
      {
        id: "prior-run-1",
        runNumber: "PAY-20260531-0001",
        status: PayrollRunStatus.POSTED,
        documentHash: "sha256:prior-run-doc",
        payrollPeriod: { payDate: new Date("2026-05-31T00:00:00.000Z") },
        lines: [
          {
            id: "prior-line-1",
            employeeId: "employee-1",
            documentHash: "sha256:prior-line-doc",
            grossAmount: new Prisma.Decimal("90000.00"),
            taxableBaseAmount: new Prisma.Decimal("90000.00"),
            socialBaseAmount: new Prisma.Decimal("90000.00"),
            employeeDeductionAmount: new Prisma.Decimal("3780.00"),
            employerChargeAmount: new Prisma.Decimal("11655.00"),
            netPayableAmount: new Prisma.Decimal("86220.00"),
            currency: "XAF",
            calculationSnapshot: {
              grossAmount: "90000.00",
              taxableBaseAmount: "90000.00",
              socialBaseAmount: "90000.00",
              employeePensionContributionAmount: "3780.00",
              employerPensionContributionAmount: "3780.00",
              familyAllowanceContributionAmount: "6300.00",
              occupationalRiskContributionAmount: "1575.00",
              incomeTaxWithholdingAmount: "0.00",
              overtimePremiumAmount: "0.00",
              payrollRubriqueGrossAmount: "0.00",
              payrollRubriqueTaxableBaseAmount: "0.00",
              payrollRubriqueSocialBaseAmount: "0.00",
              payrollRubriqueEmployeeDeductionAmount: "0.00",
              payrollRubriqueEmployerChargeAmount: "0.00",
              employeeDeductionAmount: "3780.00",
              employerChargeAmount: "11655.00",
              netPayableAmount: "86220.00",
              componentMapping: {
                statutoryPayableAmount: "15435.00",
              },
            },
          },
        ],
      },
    ]);
    tx.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "employee-1",
        displayName: "Ada Payroll",
        paymentDestinationHash: "dest-hash",
        contracts: [
          {
            id: "contract-1",
            baseSalary: new Prisma.Decimal("100000.00"),
            currency: "XAF",
          },
        ],
        attendanceSnapshots: [
          {
            id: "attendance-1",
            scheduledMinutes: 9600,
            workedMinutes: 9600,
            leaveMinutes: 0,
            overtimeMinutes: 0,
          },
        ],
      },
    ]);
    tx.payrollRun.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "run-1",
        ...data,
        lines: data.lines.create.map((line: any, index: number) => ({
          id: `line-${index + 1}`,
          ...line,
        })),
      }),
    );
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-1",
      status: PayrollPeriodStatus.CALCULATED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await calculatePayrollRun({
      organizationId: "org-1",
      payrollPeriodId: "period-1",
      preparedById: "preparer-1",
      idempotencyKey: "calc-key-1",
      runDate: "2026-06-30",
    });

    expect(result.created).toBe(true);
    expect(tx.payrollRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          deletedAt: null,
          status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
          payrollPeriod: {
            payDate: {
              gte: new Date("2026-01-01T00:00:00.000Z"),
              lt: payrollPeriod.payDate,
            },
          },
          lines: { some: { employeeId: { in: ["employee-1"] } } },
        }),
      }),
    );
    expect(tx.payrollRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PayrollRunStatus.CALCULATED,
          countryPackVersion: "CM-2026.1",
          countryPackSchemaVersion: "country-pack.v1",
          grossAmount: new Prisma.Decimal("100000.00"),
          employeeDeductionAmount: new Prisma.Decimal("4200.00"),
          employerChargeAmount: new Prisma.Decimal("12950.00"),
          netPayableAmount: new Prisma.Decimal("95800.00"),
          metadata: expect.objectContaining({
            yearToDatePolicy: expect.objectContaining({
              kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY",
              basis: "TENANT_FISCAL_YEAR",
              periodStart: "2026-01-01T00:00:00.000Z",
              periodEnd: "2026-06-30T00:00:00.000Z",
              source: "organization_accounting_settings",
            }),
            yearToDatePolicyHash: expect.stringMatching(/^sha256:/),
            yearToDateAccumulatorHashes: expect.arrayContaining([
              expect.stringMatching(/^sha256:/),
            ]),
          }),
          lines: expect.objectContaining({
            create: [
              expect.objectContaining({
                employeeId: "employee-1",
                contractId: "contract-1",
                attendanceSnapshotId: "attendance-1",
                calculationSnapshot: expect.objectContaining({
                  ...cnpsGoldenCalculationOutput,
                  countryCode: "CM",
                  countryPackVersion: "CM-2026.1",
                  countryPackSchemaVersion: "country-pack.v1",
                  countryPackProvenance: expect.objectContaining({
                    kind: "AQSTOQFLOW_PAYROLL_LINE_COUNTRY_PACK_PROVENANCE",
                    countryCode: "CM",
                    packVersion: "CM-2026.1",
                    schemaVersion: "country-pack.v1",
                    resolutionHash: expect.stringMatching(/^sha256:/),
                    statutoryScenarioCoverageHash: expect.stringMatching(/^sha256:/),
                  }),
                  countryPackProvenanceHash: expect.stringMatching(/^sha256:/),
                  roundingPolicy: expect.objectContaining({
                    kind: "AQSTOQFLOW_PAYROLL_ROUNDING_POLICY",
                    mode: "HALF_UP",
                    scale: 2,
                    amountScale: 2,
                    source: "organization_accounting_settings",
                  }),
                  roundingPolicyHash: expect.stringMatching(/^sha256:/),
                  yearToDatePolicy: expect.objectContaining({
                    kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY",
                    basis: "TENANT_FISCAL_YEAR",
                    yearStartMonth: 1,
                    yearStartDay: 1,
                    periodStart: "2026-01-01T00:00:00.000Z",
                    periodEnd: "2026-06-30T00:00:00.000Z",
                  }),
                  yearToDatePolicyHash: expect.stringMatching(/^sha256:/),
                  yearToDateAccumulatorHash: expect.stringMatching(/^sha256:/),
                  yearToDateProof: expect.objectContaining({
                    kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_ACCUMULATOR_PROOF",
                    accumulatorBasis:
                      "POSTED_PAID_PRIOR_LINES_PLUS_CURRENT_EFFECTIVE_LINE",
                    employeeId: "employee-1",
                    currency: "XAF",
                    currentPeriodId: "period-1",
                    correctionRun: false,
                    priorLineCount: 1,
                    priorRunIds: ["prior-run-1"],
                    priorRunDocumentHashes: ["sha256:prior-run-doc"],
                    priorRunLineDocumentHashes: ["sha256:prior-line-doc"],
                    missingPriorCalculationSnapshotCount: 0,
                    missingPriorLineDocumentHashCount: 0,
                    priorAmounts: expect.objectContaining({
                      grossAmount: "90000.00",
                      employeeDeductionAmount: "3780.00",
                      employerChargeAmount: "11655.00",
                      netPayableAmount: "86220.00",
                      statutoryPayableAmount: "15435.00",
                    }),
                    currentAmounts: expect.objectContaining({
                      grossAmount: "100000.00",
                      employeeDeductionAmount: "4200.00",
                      employerChargeAmount: "12950.00",
                      netPayableAmount: "95800.00",
                      statutoryPayableAmount: "17150.00",
                    }),
                    yearToDateAmounts: expect.objectContaining({
                      grossAmount: "190000.00",
                      employeeDeductionAmount: "7980.00",
                      employerChargeAmount: "24605.00",
                      netPayableAmount: "182020.00",
                      statutoryPayableAmount: "32585.00",
                    }),
                    ytdAccumulatorHash: expect.stringMatching(/^sha256:/),
                  }),
                  componentMapping: expect.objectContaining({
                    reviewDefault: "BLOCK_UNTIL_REVIEWED_FIXTURES",
                    roundingPolicyHash: expect.stringMatching(/^sha256:/),
                    yearToDateAccumulatorHash: expect.stringMatching(/^sha256:/),
                    reviewStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
                    taxableBaseAmount: "100000.00",
                    incomeTaxWithholdingAmount: "0.00",
                    incomeTaxCalculationStatus:
                      "BLOCKED_REQUIRES_EXPERT_REVIEW",
                    incomeTaxWithholdingEnabled: false,
                    statutoryPayableAmount: "17150.00",
                    declarationLiabilityAmount: "17150.00",
                    requiredLedgerMappingKeys: expect.arrayContaining([
                      "PAYROLL_WITHHOLDING_PAYABLE",
                      "SOCIAL_CONTRIBUTIONS_PAYABLE",
                    ]),
                  }),
                  legalProvenance: expect.arrayContaining([
                    expect.objectContaining({
                      parameterPath: "payroll.cnps.pensionRatesBps",
                      legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
                      verificationStatus: "REGULATOR_CONFIRMED",
                    }),
                    expect.objectContaining({
                      parameterPath: "payroll.irpp.incomeTaxRules",
                      legalRef: "CM_DGI_CGI_2025",
                      capabilityStatus: "REQUIRES_EXPERT_REVIEW",
                    }),
                  ]),
                }),
                ruleProvenance: expect.objectContaining({
                  packVersion: "CM-2026.1",
                  roundingPolicyHash: expect.stringMatching(/^sha256:/),
                  roundingPolicy: expect.objectContaining({ mode: "HALF_UP", scale: 2 }),
                  yearToDatePolicyHash: expect.stringMatching(/^sha256:/),

                  legalProvenance: expect.arrayContaining([
                    expect.objectContaining({
                      parameterPath: "payroll.cnps.familyAllowanceRatesBps",
                      legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
                      verificationStatus: "REGULATOR_CONFIRMED",
                    }),
                  ]),
                }),
              }),
            ],
          }),
        }),
        include: { lines: true },
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.run.calculated",
        idempotencyKey: "payroll-run-calculated:calc-key-1",
        payload: expect.objectContaining({
          countryPackSchemaVersion: "country-pack.v1",
          roundingPolicyHash: expect.stringMatching(/^sha256:/),
          roundingPolicy: expect.objectContaining({ mode: "HALF_UP", scale: 2 }),
          yearToDatePolicy: expect.objectContaining({
            kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY",
            periodStart: "2026-01-01T00:00:00.000Z",
            periodEnd: "2026-06-30T00:00:00.000Z",
          }),
          yearToDatePolicyHash: expect.stringMatching(/^sha256:/),
          yearToDateAccumulatorHashes: expect.arrayContaining([
            expect.stringMatching(/^sha256:/),
          ]),
          countryPackCapabilityStatus: "REQUIRES_EXPERT_REVIEW",
          legalProvenanceHash: expect.stringMatching(/^sha256:/),
          legalProvenance: expect.arrayContaining([
            expect.objectContaining({
              parameterPath: "payroll.cnps.occupationalRiskRatesBps",
              legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
              verificationStatus: "REGULATOR_CONFIRMED",
            }),
            expect.objectContaining({
              parameterPath: "payroll.irpp.incomeTaxRules",
              legalRef: "CM_DGI_CGI_2025",
              capabilityStatus: "REQUIRES_EXPERT_REVIEW",
            }),
          ]),
        }),
        outboxMessages: [
          expect.objectContaining({
            channel: "NOTIFICATION",
            eventName: "payroll_run.calculated",
            destination: "payroll",
          }),
        ],
      }),
    );
  });

  it("blocks payroll calculation when tenant rounding mode is not certified", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "BANKERS",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-unsupported-rounding",
        runDate: "2026-06-30",
      }),
    ).rejects.toThrow(
      "Payroll calculation requires HALF_UP rounding policy until additional rounding modes are explicitly certified.",
    );
    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
  });
  it("calculates correction runs as deltas against posted original register lines", async () => {
    const tx = buildTx();
    const correctionPeriod = {
      ...payrollPeriod,
      id: "period-2",
      name: "July 2026 Correction",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T23:59:59.999Z"),
      payDate: new Date("2026-07-31T00:00:00.000Z"),
    };
    const originalRun = {
      id: "original-run-1",
      organizationId: "org-1",
      payrollPeriodId: "original-period-1",
      payrollPeriod: {
        id: "original-period-1",
        periodStart: new Date("2026-05-01T00:00:00.000Z"),
        periodEnd: new Date("2026-05-31T23:59:59.999Z"),
        payDate: new Date("2026-05-31T00:00:00.000Z"),
      },
      runNumber: "PAY-20260531-0001",
      runType: PayrollRunType.ORDINARY,
      status: PayrollRunStatus.POSTED,
      countryCode: "CM",
      documentHash: "sha256:original-run",
      evidenceHash: "sha256:original-evidence",
      calculationHash: "sha256:original-calc",
      lines: [
        {
          id: "original-line-1",
          employeeId: "employee-1",
          grossAmount: new Prisma.Decimal("90000.00"),
          taxableBaseAmount: new Prisma.Decimal("90000.00"),
          socialBaseAmount: new Prisma.Decimal("90000.00"),
          employeeDeductionAmount: new Prisma.Decimal("3780.00"),
          employerChargeAmount: new Prisma.Decimal("11655.00"),
          netPayableAmount: new Prisma.Decimal("86220.00"),
          documentHash: "sha256:original-line",
          calculationSnapshot: {
            grossAmount: "90000.00",
            taxableBaseAmount: "90000.00",
            socialBaseAmount: "90000.00",
            employeePensionContributionAmount: "3780.00",
            employerPensionContributionAmount: "3780.00",
            familyAllowanceContributionAmount: "6300.00",
            occupationalRiskContributionAmount: "1575.00",
            incomeTaxWithholdingAmount: null,
            overtimePremiumAmount: "0.00",
            payrollRubriqueGrossAmount: "0.00",
            payrollRubriqueTaxableBaseAmount: "0.00",
            payrollRubriqueSocialBaseAmount: "0.00",
            payrollRubriqueEmployeeDeductionAmount: "0.00",
            payrollRubriqueEmployerChargeAmount: "0.00",
            employeeDeductionAmount: "3780.00",
            employerChargeAmount: "11655.00",
            netPayableAmount: "86220.00",
            currency: "XAF",
            componentMapping: {
              statutoryPayableAmount: "15435.00",
              declarationLiabilityAmount: "15435.00",
            },
          },
        },
      ],
    };
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(originalRun);
    tx.payrollPeriod.findFirst.mockResolvedValue(correctionPeriod);
    tx.payrollRun.count.mockResolvedValue(0);
    tx.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "employee-1",
        displayName: "Ada Payroll",
        paymentDestinationHash: "dest-hash",
        contracts: [
          {
            id: "contract-1",
            baseSalary: new Prisma.Decimal("100000.00"),
            currency: "XAF",
          },
        ],
        attendanceSnapshots: [
          {
            id: "attendance-1",
            scheduledMinutes: 9600,
            workedMinutes: 9600,
            leaveMinutes: 0,
            overtimeMinutes: 0,
          },
        ],
      },
    ]);
    tx.payrollRun.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "run-1",
        ...data,
        lines: data.lines.create.map((line: any, index: number) => ({
          id: `line-${index + 1}`,
          ...line,
        })),
      }),
    );
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-2",
      status: PayrollPeriodStatus.CALCULATED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await calculatePayrollRun({
      organizationId: "org-1",
      payrollPeriodId: "period-2",
      preparedById: "preparer-1",
      idempotencyKey: "calc-key-correction",
      runType: PayrollRunType.CORRECTION,
      originalRunId: "original-run-1",
      employeeIds: ["employee-1"],
      runDate: "2026-07-31",
    });

    expect(result.created).toBe(true);
    const createData = tx.payrollRun.create.mock.calls[0][0].data;
    expect(createData.runType).toBe(PayrollRunType.CORRECTION);
    expect(createData.originalRunId).toBe("original-run-1");
    expect(createData.grossAmount.toFixed(2)).toBe("10000.00");
    expect(createData.employeeDeductionAmount.toFixed(2)).toBe("420.00");
    expect(createData.employerChargeAmount.toFixed(2)).toBe("1295.00");
    expect(createData.netPayableAmount.toFixed(2)).toBe("9580.00");
    expect(createData.metadata).toEqual(
      expect.objectContaining({
        correction: expect.objectContaining({
          originalRunId: "original-run-1",
          originalRunNumber: "PAY-20260531-0001",
          originalRunDocumentHash: "sha256:original-run",
          originalRunEvidenceHash: "sha256:original-evidence",
          originalCalculationHash: "sha256:original-calc",
          correctionEvidenceHash: expect.stringMatching(/^sha256:/),
        }),
      }),
    );
    expect(createData.lines.create).toEqual([
      expect.objectContaining({
        employeeId: "employee-1",
        grossAmount: new Prisma.Decimal("10000.00"),
        taxableBaseAmount: new Prisma.Decimal("10000.00"),
        socialBaseAmount: new Prisma.Decimal("10000.00"),
        employeeDeductionAmount: new Prisma.Decimal("420.00"),
        employerChargeAmount: new Prisma.Decimal("1295.00"),
        netPayableAmount: new Prisma.Decimal("9580.00"),
        calculationSnapshot: expect.objectContaining({
          grossAmount: "10000.00",
          taxableBaseAmount: "10000.00",
          socialBaseAmount: "10000.00",
          employeePensionContributionAmount: "420.00",
          employerPensionContributionAmount: "420.00",
          familyAllowanceContributionAmount: "700.00",
          occupationalRiskContributionAmount: "175.00",
          employeeDeductionAmount: "420.00",
          employerChargeAmount: "1295.00",
          netPayableAmount: "9580.00",
          componentMapping: expect.objectContaining({
            taxableBaseAmount: "10000.00",
            roundingPolicyHash: expect.stringMatching(/^sha256:/),
            statutoryPayableAmount: "1715.00",
            declarationLiabilityAmount: "1715.00",
          }),
          roundingPolicyHash: expect.stringMatching(/^sha256:/),
          roundingPolicy: expect.objectContaining({ mode: "HALF_UP", scale: 2 }),
          correctionContext: expect.objectContaining({
            originalRunId: "original-run-1",
            originalLineId: "original-line-1",
            originalRunDocumentHash: "sha256:original-run",
            originalLineDocumentHash: "sha256:original-line",
            originalAmounts: expect.objectContaining({
              grossAmount: "90000.00",
              employeeDeductionAmount: "3780.00",
              employerChargeAmount: "11655.00",
              netPayableAmount: "86220.00",
            }),
            correctedAmounts: expect.objectContaining({
              grossAmount: "100000.00",
              employeeDeductionAmount: "4200.00",
              employerChargeAmount: "12950.00",
              netPayableAmount: "95800.00",
              statutoryPayableAmount: "17150.00",
            }),
            deltaAmounts: expect.objectContaining({
              grossAmount: "10000.00",
              employeeDeductionAmount: "420.00",
              employerChargeAmount: "1295.00",
              netPayableAmount: "9580.00",
              statutoryPayableAmount: "1715.00",
            }),
            correctionBasisHash: expect.stringMatching(/^sha256:/),
          }),
        }),
      }),
    ]);
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.run.calculated",
        payload: expect.objectContaining({
          runType: PayrollRunType.CORRECTION,
          originalRunId: "original-run-1",
          originalRunDocumentHash: "sha256:original-run",
          originalRunEvidenceHash: "sha256:original-evidence",
          correctionEvidenceHash: expect.stringMatching(/^sha256:/),
          grossAmount: "10000.00",
          netPayableAmount: "9580.00",
        }),
      }),
    );
  });

  it("blocks correction run calculation without an original run reference", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-missing-original",
        runType: PayrollRunType.CORRECTION,
        employeeIds: ["employee-1"],
      }),
    ).rejects.toThrow(
      "Payroll correction runs require an original payroll run.",
    );
    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
  });

  it("blocks non-correction run calculation with an original run reference", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-original-on-ordinary",
        originalRunId: "original-run-1",
      }),
    ).rejects.toThrow(
      "Only payroll correction runs may reference an original payroll run.",
    );
    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
  });

  it("blocks correction run calculation without an explicit employee scope", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-missing-scope",
        runType: PayrollRunType.CORRECTION,
        originalRunId: "original-run-1",
      }),
    ).rejects.toThrow(
      "Payroll correction runs require explicit employeeIds to limit the correction scope.",
    );
    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
  });
  it("blocks correction run calculation when original run proof hashes are missing", async () => {
    const tx = buildTx();
    const correctionPeriod = {
      ...payrollPeriod,
      id: "period-2",
      payrollPeriodId: "period-2",
      payDate: new Date("2026-07-31T00:00:00.000Z"),
    };
    const originalRun = {
      id: "original-run-1",
      organizationId: "org-1",
      payrollPeriodId: "original-period-1",
      payrollPeriod: {
        id: "original-period-1",
        periodStart: new Date("2026-05-01T00:00:00.000Z"),
        periodEnd: new Date("2026-05-31T23:59:59.999Z"),
        payDate: new Date("2026-05-31T00:00:00.000Z"),
      },
      runNumber: "PAY-20260531-0001",
      runType: PayrollRunType.ORDINARY,
      status: PayrollRunStatus.POSTED,
      countryCode: "CM",
      documentHash: null,
      evidenceHash: "sha256:original-evidence",
      calculationHash: "sha256:original-calc",
      lines: [
        {
          id: "original-line-1",
          employeeId: "employee-1",
          documentHash: "sha256:original-line",
          calculationSnapshot: { grossAmount: "90000.00" },
        },
      ],
    };
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(originalRun);
    tx.payrollPeriod.findFirst.mockResolvedValue(correctionPeriod);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-2",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-original-proof-missing",
        runType: PayrollRunType.CORRECTION,
        originalRunId: "original-run-1",
        employeeIds: ["employee-1"],
      }),
    ).rejects.toThrow(
      "Payroll correction runs require immutable original run document, evidence, and calculation hashes.",
    );
    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("blocks correction run calculation when a corrected employee lacks original line proof", async () => {
    const tx = buildTx();
    const correctionPeriod = {
      ...payrollPeriod,
      id: "period-2",
      payrollPeriodId: "period-2",
      payDate: new Date("2026-07-31T00:00:00.000Z"),
    };
    const originalRun = {
      id: "original-run-1",
      organizationId: "org-1",
      payrollPeriodId: "original-period-1",
      payrollPeriod: {
        id: "original-period-1",
        periodStart: new Date("2026-05-01T00:00:00.000Z"),
        periodEnd: new Date("2026-05-31T23:59:59.999Z"),
        payDate: new Date("2026-05-31T00:00:00.000Z"),
      },
      runNumber: "PAY-20260531-0001",
      runType: PayrollRunType.ORDINARY,
      status: PayrollRunStatus.POSTED,
      countryCode: "CM",
      documentHash: "sha256:original-run",
      evidenceHash: "sha256:original-evidence",
      calculationHash: "sha256:original-calc",
      lines: [],
    };
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(originalRun);
    tx.payrollPeriod.findFirst.mockResolvedValue(correctionPeriod);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-2",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-original-line-missing",
        runType: PayrollRunType.CORRECTION,
        originalRunId: "original-run-1",
        employeeIds: ["employee-1"],
      }),
    ).rejects.toThrow(
      "Payroll correction runs require original run line proof for every corrected employee. Missing employeeIds: employee-1.",
    );
    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });
  it("calculates approved rubriques and reviewed overtime into payroll component proof", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);
    tx.payrollRun.count.mockResolvedValue(0);
    tx.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "employee-1",
        displayName: "Ada Payroll",
        paymentDestinationHash: "dest-hash",
        contracts: [
          {
            id: "contract-1",
            baseSalary: new Prisma.Decimal("100000.00"),
            currency: "XAF",
          },
        ],
        attendanceSnapshots: [
          {
            id: "attendance-1",
            scheduledMinutes: 9600,
            workedMinutes: 9600,
            leaveMinutes: 0,
            overtimeMinutes: 480,
          },
        ],
        rubriqueAssignments: [
          {
            id: "assign-transport",
            amount: new Prisma.Decimal("10000.00"),
            rateBps: null,
            quantity: null,
            currency: "XAF",
            approvalBusinessEventId: "approval-transport",
            evidenceDocumentHash: "transport-proof-hash",
            rubrique: {
              id: "rubrique-transport",
              code: "TRANSPORT",
              label: "Transport allowance",
              payslipLabel: "Transport allowance",
              kind: "EARNING",
              valueType: "FIXED_AMOUNT",
              status: "ACTIVE",
              taxableBase: true,
              socialBase: true,
              employerCharge: false,
            },
          },
          {
            id: "assign-loan",
            amount: new Prisma.Decimal("5000.00"),
            rateBps: null,
            quantity: null,
            currency: "XAF",
            approvalBusinessEventId: "approval-loan",
            evidenceDocumentHash: "loan-proof-hash",
            rubrique: {
              id: "rubrique-loan",
              code: "LOAN",
              label: "Loan deduction",
              payslipLabel: "Loan repayment",
              kind: "DEDUCTION",
              valueType: "FIXED_AMOUNT",
              status: "ACTIVE",
              taxableBase: false,
              socialBase: false,
              employerCharge: false,
            },
          },
          {
            id: "assign-health",
            amount: null,
            rateBps: 500,
            quantity: null,
            currency: "XAF",
            approvalBusinessEventId: "approval-health",
            evidenceDocumentHash: "health-proof-hash",
            rubrique: {
              id: "rubrique-health",
              code: "HEALTH",
              label: "Health benefit",
              payslipLabel: "Health benefit",
              kind: "EMPLOYER_CHARGE",
              valueType: "RATE_BPS",
              status: "ACTIVE",
              taxableBase: false,
              socialBase: false,
              employerCharge: true,
            },
          },
        ],
      },
    ]);
    tx.payrollRun.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "run-1",
        ...data,
        lines: data.lines.create.map((line: any, index: number) => ({
          id: `line-${index + 1}`,
          ...line,
        })),
      }),
    );
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-1",
      status: PayrollPeriodStatus.CALCULATED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    await calculatePayrollRun({
      organizationId: "org-1",
      payrollPeriodId: "period-1",
      preparedById: "preparer-1",
      idempotencyKey: "calc-key-rubriques",
      runDate: "2026-06-30",
    });

    expect(tx.payrollRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          grossAmount: new Prisma.Decimal("117500.00"),
          employeeDeductionAmount: new Prisma.Decimal("9935.00"),
          employerChargeAmount: new Prisma.Decimal("20591.25"),
          netPayableAmount: new Prisma.Decimal("107565.00"),
          lines: expect.objectContaining({
            create: [
              expect.objectContaining({
                grossAmount: new Prisma.Decimal("117500.00"),
                taxableBaseAmount: new Prisma.Decimal("117500.00"),
                socialBaseAmount: new Prisma.Decimal("117500.00"),
                employeeDeductionAmount: new Prisma.Decimal("9935.00"),
                employerChargeAmount: new Prisma.Decimal("20591.25"),
                netPayableAmount: new Prisma.Decimal("107565.00"),
                calculationSnapshot: expect.objectContaining({
                  baseGrossAmount: "100000.00",
                  overtimePremiumAmount: "7500.00",
                  payrollRubriqueGrossAmount: "10000.00",
                  payrollRubriqueTaxableBaseAmount: "10000.00",
                  payrollRubriqueSocialBaseAmount: "10000.00",
                  payrollRubriqueEmployeeDeductionAmount: "5000.00",
                  payrollRubriqueEmployerChargeAmount: "5375.00",
                  grossAmount: "117500.00",
                  taxableBaseAmount: "117500.00",
                  socialBaseAmount: "117500.00",
                  employeePensionContributionAmount: "4935.00",
                  employerPensionContributionAmount: "4935.00",
                  familyAllowanceContributionAmount: "8225.00",
                  occupationalRiskContributionAmount: "2056.25",
                  employeeDeductionAmount: "9935.00",
                  employerChargeAmount: "20591.25",
                  netPayableAmount: "107565.00",
                  payrollRubriqueComponents: expect.arrayContaining([
                    expect.objectContaining({
                      code: "TRANSPORT",
                      amount: "10000.00",
                      grossAmount: "10000.00",
                    }),
                    expect.objectContaining({
                      code: "LOAN",
                      amount: "5000.00",
                      employeeDeductionAmount: "5000.00",
                    }),
                    expect.objectContaining({
                      code: "HEALTH",
                      amount: "5375.00",
                      employerChargeAmount: "5375.00",
                    }),
                  ]),
                  componentMapping: expect.objectContaining({
                    taxableBaseAmount: "117500.00",
                    payrollRubriqueGrossAmount: "10000.00",
                    payrollRubriqueEmployeeDeductionAmount: "5000.00",
                    payrollRubriqueEmployerChargeAmount: "5375.00",
                    statutoryPayableAmount: "20151.25",
                    declarationLiabilityAmount: "20151.25",
                  }),
                  legalProvenance: expect.arrayContaining([
                    expect.objectContaining({
                      parameterPath: "payroll.attendance.overtime",
                      verificationStatus: "EXPERT_REVIEWED",
                    }),
                  ]),
                }),
              }),
            ],
          }),
        }),
      }),
    );
  });

  it("calculates reviewed formula-reference rubriques with country-pack provenance", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);
    tx.payrollRun.count.mockResolvedValue(0);
    tx.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "employee-1",
        displayName: "Ada Payroll",
        paymentDestinationHash: "dest-hash",
        contracts: [
          {
            id: "contract-1",
            baseSalary: new Prisma.Decimal("100000.00"),
            currency: "XAF",
          },
        ],
        attendanceSnapshots: [
          {
            id: "attendance-1",
            scheduledMinutes: 9600,
            workedMinutes: 9600,
            leaveMinutes: 0,
            overtimeMinutes: 0,
          },
        ],
        rubriqueAssignments: [
          {
            id: "assign-health-formula",
            amount: null,
            rateBps: null,
            quantity: null,
            currency: "XAF",
            approvalBusinessEventId: "approval-health-formula",
            evidenceDocumentHash: "health-formula-proof-hash",
            rubrique: {
              id: "rubrique-health-formula",
              code: "HEALTH_FORMULA",
              label: "Formula health benefit",
              payslipLabel: "Formula health benefit",
              kind: "EMPLOYER_CHARGE",
              valueType: "FORMULA_REFERENCE",
              status: "ACTIVE",
              taxableBase: false,
              socialBase: false,
              employerCharge: true,
              countryCode: "CM",
              statutoryParameterPath: "payroll.compensation.benefits",
              countryPackVersion: "CM-2026.1",
            },
          },
        ],
      },
    ]);
    tx.payrollRun.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "run-1",
        ...data,
        lines: data.lines.create.map((line: any, index: number) => ({
          id: `line-${index + 1}`,
          ...line,
        })),
      }),
    );
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-1",
      status: PayrollPeriodStatus.CALCULATED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    await calculatePayrollRun({
      organizationId: "org-1",
      payrollPeriodId: "period-1",
      preparedById: "preparer-1",
      idempotencyKey: "calc-key-formula-rubrique",
      runDate: "2026-06-30",
    });

    expect(tx.payrollRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          grossAmount: new Prisma.Decimal("100000.00"),
          employeeDeductionAmount: new Prisma.Decimal("4200.00"),
          employerChargeAmount: new Prisma.Decimal("17950.00"),
          netPayableAmount: new Prisma.Decimal("95800.00"),
          lines: expect.objectContaining({
            create: [
              expect.objectContaining({
                calculationSnapshot: expect.objectContaining({
                  payrollRubriqueEmployerChargeAmount: "5000.00",
                  employerChargeAmount: "17950.00",
                  componentMapping: expect.objectContaining({
                    payrollRubriqueEmployerChargeAmount: "5000.00",
                    statutoryPayableAmount: "17150.00",
                    declarationLiabilityAmount: "17150.00",
                  }),
                  payrollRubriqueComponents: expect.arrayContaining([
                    expect.objectContaining({
                      code: "HEALTH_FORMULA",
                      valueType: "FORMULA_REFERENCE",
                      amount: "5000.00",
                      employerChargeAmount: "5000.00",
                      formulaTrace: expect.objectContaining({
                        parameterPath: "payroll.compensation.benefits",
                        calculationMode: "RATE_BPS",
                        payrollEffect: "EMPLOYER_CHARGE",
                        baseAmount: "100000.00",
                        rateBps: "500",
                        legalRef: "CM_REVIEWED_BENEFIT_POLICY",
                        verificationStatus: "EXPERT_REVIEWED",
                        capabilityStatus: "SUPPORTED",
                      }),
                    }),
                  ]),
                  legalProvenance: expect.arrayContaining([
                    expect.objectContaining({
                      parameterPath: "payroll.compensation.benefits",
                      legalRef: "CM_REVIEWED_BENEFIT_POLICY",
                      verificationStatus: "EXPERT_REVIEWED",
                    }),
                  ]),
                }),
              }),
            ],
          }),
        }),
      }),
    );
  });

  it("blocks formula-reference rubriques without country-pack parameter provenance", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);
    tx.payrollRun.count.mockResolvedValue(0);
    tx.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "employee-1",
        displayName: "Ada Payroll",
        paymentDestinationHash: "dest-hash",
        contracts: [
          {
            id: "contract-1",
            baseSalary: new Prisma.Decimal("100000.00"),
            currency: "XAF",
          },
        ],
        attendanceSnapshots: [
          {
            id: "attendance-1",
            scheduledMinutes: 9600,
            workedMinutes: 9600,
            leaveMinutes: 0,
            overtimeMinutes: 0,
          },
        ],
        rubriqueAssignments: [
          {
            id: "assign-formula-missing-path",
            amount: null,
            rateBps: null,
            quantity: null,
            currency: "XAF",
            approvalBusinessEventId: "approval-formula-missing-path",
            evidenceDocumentHash: "formula-proof-hash",
            rubrique: {
              id: "rubrique-formula-missing-path",
              code: "FORMULA_ALLOWANCE",
              label: "Formula allowance",
              payslipLabel: "Formula allowance",
              kind: "EARNING",
              valueType: "FORMULA_REFERENCE",
              status: "ACTIVE",
              taxableBase: true,
              socialBase: true,
              employerCharge: false,
              countryCode: "CM",
              statutoryParameterPath: null,
              countryPackVersion: "CM-2026.1",
            },
          },
        ],
      },
    ]);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-formula-missing-path",
        runDate: "2026-06-30",
      }),
    ).rejects.toThrow(
      "Payroll rubrique FORMULA_ALLOWANCE formula requires a statutory country-pack parameter path before calculation.",
    );

    expect(tx.payrollRun.create).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });
  it("blocks payroll calculation when an active rubrique has no approval history", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);
    tx.payrollRun.count.mockResolvedValue(0);
    tx.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "employee-1",
        displayName: "Ada Payroll",
        paymentDestinationHash: "dest-hash",
        contracts: [
          {
            id: "contract-1",
            baseSalary: new Prisma.Decimal("100000.00"),
            currency: "XAF",
          },
        ],
        attendanceSnapshots: [
          {
            id: "attendance-1",
            scheduledMinutes: 9600,
            workedMinutes: 9600,
            leaveMinutes: 0,
            overtimeMinutes: 0,
          },
        ],
        rubriqueAssignments: [
          {
            id: "assign-unapproved",
            amount: new Prisma.Decimal("10000.00"),
            rateBps: null,
            quantity: null,
            currency: "XAF",
            approvalBusinessEventId: null,
            evidenceDocumentHash: "allowance-proof-hash",
            rubrique: {
              id: "rubrique-unapproved",
              code: "ALLOWANCE",
              label: "Allowance",
              payslipLabel: "Allowance",
              kind: "EARNING",
              valueType: "FIXED_AMOUNT",
              status: "ACTIVE",
              taxableBase: true,
              socialBase: true,
              employerCharge: false,
            },
          },
        ],
      },
    ]);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-unapproved-rubrique",
        runDate: "2026-06-30",
      }),
    ).rejects.toThrow(
      "Payroll rubrique ALLOWANCE requires approval history before calculation.",
    );

    expect(tx.payrollRun.create).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });
  it("blocks Cameroon payroll calculation when CNPS tenant classification is missing", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: null,
        payrollCnpsOccupationalRiskGroup: null,
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-missing-classification",
        runDate: "2026-06-30",
      }),
    ).rejects.toThrow(
      "Payroll CNPS family allowance sector is required before Cameroon payroll calculation.",
    );

    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("blocks payroll calculation when reviewed CNPS fixture values are incomplete", async () => {
    mockCountryPack({ familyAllowanceValue: { general: undefined } });
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        roundingMode: "HALF_UP",
        roundingScale: 2,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);
    tx.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "employee-1",
        displayName: "Ada Payroll",
        paymentDestinationHash: "dest-hash",
        contracts: [
          {
            id: "contract-1",
            baseSalary: new Prisma.Decimal("100000.00"),
            currency: "XAF",
          },
        ],
        attendanceSnapshots: [
          {
            id: "attendance-1",
            scheduledMinutes: 9600,
            workedMinutes: 9600,
            leaveMinutes: 0,
            overtimeMinutes: 0,
          },
        ],
      },
    ]);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-incomplete-cnps-fixture",
        runDate: "2026-06-30",
      }),
    ).rejects.toThrow(
      "CNPS family allowance rate for sector GENERAL is missing or invalid in the reviewed payroll country pack.",
    );

    expect(tx.payrollRun.create).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("rejects mutated payroll calculation idempotency replays before side effects", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue({
      id: "run-1",
      postedBusinessEventId: "event-1",
      metadata: { idempotencyPayloadHash: "sha256:previous-payload" },
      lines: [],
    });

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-1",
        employeeIds: ["employee-2"],
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("approves, posts, emits payslips, and queues payroll outbox messages in one orchestration", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(payrollRunFixture());
    tx.journal.findFirst.mockResolvedValue({
      id: "journal-payroll",
      code: "PAY",
      type: JournalType.PAYROLL,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(mappedPayrollAccounts());
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
      status: LedgerPostingBatchStatus.POSTED,
    });
    tx.journalEntry.count.mockResolvedValue(0);
    tx.journalEntry.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "journal-entry-1",
        ...data,
        lines: data.lines.create,
      }),
    );
    tx.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" });
    tx.payrollPayslip.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "payslip-1",
        ...data,
      }),
    );
    tx.payrollRun.update.mockResolvedValue({
      ...payrollRunFixture(PayrollRunStatus.POSTED),
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      payslips: [{ id: "payslip-1" }],
    });
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-1",
      status: PayrollPeriodStatus.POSTED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await approveAndPostPayrollRun({
      organizationId: "org-1",
      payrollRunId: "run-1",
      approvedById: "approver-1",
      actorPermissions: ["payroll.runs.approve"],
      lastAuthAt: "2026-06-30T00:00:00.000Z",
      now: "2026-06-30T00:01:00.000Z",
      idempotencyKey: "approve-key-1",
    });

    expect(result.ledgerStatus).toBe("POSTED");
    expect(mockedCreateLedgerPostingBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        sourceType: AccountingSourceType.PAYROLL_RUN,
        postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
        metadata: expect.objectContaining({
          componentRegisterProofHash: expect.stringMatching(/^sha256:/),
          componentRegisterProofStatus: "MATCHED",
          componentRegisterProofLineCount: 1,
          blockedStatutoryComponentCount: 1,
          payrollComponentMappingHash: expect.stringMatching(/^sha256:/),
          payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          payrollComponentMapping: expect.objectContaining({
            taxableBaseAmount: "100000.00",
            incomeTaxWithholdingAmount: "0.00",
            declarationLiabilityAmount: "17150.00",
            incomeTaxWithholdingEnabled: false,
          }),
        }),
      }),
      tx,
    );
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "POSTED",
          sourceType: AccountingSourceType.PAYROLL_RUN,
          postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                debit: new Prisma.Decimal("100000.00"),
                metadata: expect.objectContaining({
                  componentRegisterProofHash: expect.stringMatching(/^sha256:/),
                  componentRegisterProofStatus: "MATCHED",
                  payrollComponentMappingHash:
                    expect.stringMatching(/^sha256:/),
                  payrollComponentMappingStatus:
                    "BLOCKED_REQUIRES_EXPERT_REVIEW",
                  payrollComponentMappingComponents: expect.arrayContaining([
                    "grossAmount",
                    "taxableBaseAmount",
                  ]),
                  incomeTaxWithholdingEnabled: false,
                }),
              }),
              expect.objectContaining({
                credit: new Prisma.Decimal("4200.00"),
                metadata: expect.objectContaining({
                  mappingKey: "PAYROLL_WITHHOLDING_PAYABLE",
                  payrollComponentMappingComponents: expect.arrayContaining([
                    "employeePensionContributionAmount",
                    "incomeTaxWithholdingAmount",
                    "taxableBaseAmount",
                  ]),
                  incomeTaxWithholdingAmount: "0.00",
                  incomeTaxWithholdingEnabled: false,
                }),
              }),
              expect.objectContaining({
                credit: new Prisma.Decimal("95800.00"),
              }),
            ]),
          }),
        }),
      }),
    );
    expect(tx.payrollPayslip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "EMITTED",
          documentHash: expect.stringMatching(/^sha256:/),
          metadata: expect.objectContaining({
            legalProvenanceHash: expect.stringMatching(/^sha256:/),
            legalProvenance: expect.arrayContaining([
              expect.objectContaining({
                parameterPath: "payroll.cnps.employerRules",
                legalRef: "CM_CNPS_EMPLOYER_RULES",
                verificationStatus: "REGULATOR_CONFIRMED",
              }),
            ]),
          }),
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ code: "NET_PAYABLE" }),
            ]),
          }),
        }),
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.run.posted",
        idempotencyKey: "approve-key-1",
        postingBatchId: "batch-1",
        payload: expect.objectContaining({
          countryPackSchemaVersion: "country-pack.v1",
          roundingPolicyHash: expect.stringMatching(/^sha256:/),
          roundingPolicy: expect.objectContaining({ mode: "HALF_UP", scale: 2 }),
          countryPackCapabilityStatus: "SUPPORTED",
          legalProvenanceHash: expect.stringMatching(/^sha256:/),
          componentRegisterProofHash: expect.stringMatching(/^sha256:/),
          componentRegisterProofStatus: "MATCHED",
          componentRegisterProofLineCount: 1,
          blockedStatutoryComponentCount: 1,
          payrollComponentMappingHash: expect.stringMatching(/^sha256:/),
          payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          payrollComponentMapping: expect.objectContaining({
            taxableBaseAmount: "100000.00",
            incomeTaxWithholdingAmount: "0.00",
            declarationLiabilityAmount: "17150.00",
            incomeTaxWithholdingEnabled: false,
          }),
        }),
        outboxMessages: expect.arrayContaining([
          expect.objectContaining({
            eventName: "payroll_run.posted",
            destination: "accounting",
          }),
          expect.objectContaining({
            eventName: "payslips.emitted",
            destination: "payroll",
          }),
        ]),
      }),
    );
  });

  it("posts correction payroll deltas with reversal ledger lines and correction proof", async () => {
    const tx = buildTx();
    const correctionRun = payrollCorrectionRunFixture();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(correctionRun);
    tx.journal.findFirst.mockResolvedValue({
      id: "journal-payroll",
      code: "PAY",
      type: JournalType.PAYROLL,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(mappedPayrollAccounts());
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-correction-1",
      status: LedgerPostingBatchStatus.POSTED,
    });
    tx.journalEntry.count.mockResolvedValue(0);
    tx.journalEntry.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "journal-entry-correction-1",
        ...data,
        lines: data.lines.create,
      }),
    );
    tx.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" });
    tx.payrollPayslip.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "payslip-correction-1",
        ...data,
      }),
    );
    tx.payrollRun.update.mockResolvedValue({
      ...correctionRun,
      status: PayrollRunStatus.POSTED,
      ledgerPostingBatchId: "batch-correction-1",
      postedBusinessEventId: "event-1",
      payslips: [{ id: "payslip-correction-1" }],
    });
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-2",
      status: PayrollPeriodStatus.POSTED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await approveAndPostPayrollRun({
      organizationId: "org-1",
      payrollRunId: "correction-run-1",
      approvedById: "approver-1",
      actorPermissions: ["payroll.runs.approve"],
      lastAuthAt: "2026-07-31T00:00:00.000Z",
      now: "2026-07-31T00:01:00.000Z",
      idempotencyKey: "approve-key-correction-1",
    });

    expect(result.ledgerStatus).toBe("POSTED");
    expect(mockedCreateLedgerPostingBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: "correction-run-1",
        metadata: expect.objectContaining({
          payrollRunType: PayrollRunType.CORRECTION,
          correctionRun: true,
          originalRunId: "original-run-1",
          originalRunDocumentHash: "sha256:original-run",
          originalRunEvidenceHash: "sha256:original-evidence",
          originalCalculationHash: "sha256:original-calc",
          correctionEvidenceHash: expect.stringMatching(/^sha256:/),
          payrollComponentMapping: expect.objectContaining({
            taxableBaseAmount: "-10000.00",
            declarationLiabilityAmount: "-1715.00",
          }),
        }),
      }),
      tx,
    );
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceId: "correction-run-1",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                debit: new Prisma.Decimal("0"),
                credit: new Prisma.Decimal("10000.00"),
                metadata: expect.objectContaining({
                  mappingKey: "PAYROLL_GROSS_EXPENSE",
                  signedAmount: "-10000.00",
                  correctionReversal: true,
                  payrollRunType: PayrollRunType.CORRECTION,
                  correctionRun: true,
                  originalRunId: "original-run-1",
                  originalRunDocumentHash: "sha256:original-run",
                }),
              }),
              expect.objectContaining({
                debit: new Prisma.Decimal("9580.00"),
                credit: new Prisma.Decimal("0"),
                metadata: expect.objectContaining({
                  mappingKey: "EMPLOYEE_PAYABLES",
                  signedAmount: "-9580.00",
                  correctionReversal: true,
                  payrollComponentMappingComponents: expect.arrayContaining([
                    "netPayableAmount",
                  ]),
                }),
              }),
              expect.objectContaining({
                debit: new Prisma.Decimal("420.00"),
                credit: new Prisma.Decimal("0"),
                metadata: expect.objectContaining({
                  mappingKey: "PAYROLL_WITHHOLDING_PAYABLE",
                  signedAmount: "-420.00",
                  correctionReversal: true,
                  incomeTaxWithholdingAmount: "0.00",
                }),
              }),
            ]),
          }),
        }),
      }),
    );
    expect(tx.payrollPayslip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payrollRunId: "correction-run-1",
          grossAmount: new Prisma.Decimal("-10000.00"),
          netPayableAmount: new Prisma.Decimal("-9580.00"),
          metadata: expect.objectContaining({
            payrollRunType: PayrollRunType.CORRECTION,
            correctionRun: true,
            originalRunId: "original-run-1",
            originalRunDocumentHash: "sha256:original-run",
          }),
        }),
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.run.posted",
        payload: expect.objectContaining({
          payrollRunId: "correction-run-1",
          payrollRunType: PayrollRunType.CORRECTION,
          correctionRun: true,
          originalRunId: "original-run-1",
          originalRunDocumentHash: "sha256:original-run",
          grossAmount: "-10000.00",
          netPayableAmount: "-9580.00",
          payrollComponentMapping: expect.objectContaining({
            declarationLiabilityAmount: "-1715.00",
          }),
        }),
      }),
    );
  });
  it("blocks correction posting when immutable correction evidence hash is missing", async () => {
    const tx = buildTx();
    const correctionRun = payrollCorrectionRunFixture();
    const metadata = correctionRun.metadata as {
      correction: Record<string, unknown>;
    };
    correctionRun.metadata = {
      ...metadata,
      correction: {
        ...metadata.correction,
        correctionEvidenceHash: null,
      },
    };
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(correctionRun);

    await expect(
      approveAndPostPayrollRun({
        organizationId: "org-1",
        payrollRunId: "correction-run-1",
        approvedById: "approver-1",
        actorPermissions: ["payroll.runs.approve"],
        lastAuthAt: "2026-07-31T00:00:00.000Z",
        now: "2026-07-31T00:01:00.000Z",
        idempotencyKey: "approve-key-correction-missing-proof",
      }),
    ).rejects.toThrow(
      "Payroll correction evidence requires immutable original run linkage and correction evidence hash. Missing: correctionEvidenceHash.",
    );

    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
    expect(tx.payrollRun.update).not.toHaveBeenCalled();
  });

  it("prepares declarations with component liability mapping while IRPP withholding stays disabled", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue({
      ...payrollRunFixture(PayrollRunStatus.POSTED),
      declarations: [],
    });
    tx.payrollDeclaration.findFirst.mockResolvedValue(null);
    tx.payrollDeclaration.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "declaration-1",
        ...data,
      }),
    );
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await preparePayrollDeclarations({
      organizationId: "org-1",
      payrollRunId: "run-1",
      preparedById: "payroll-controller-1",
      idempotencyKey: "declaration-key-1",
    });

    expect(result.expertReviewRequired).toBe(false);
    expect(tx.payrollDeclaration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: new Prisma.Decimal("17150.00"),
          payloadHash: expect.stringMatching(/^sha256:/),
          metadata: expect.objectContaining({
            componentRegisterProofHash: expect.stringMatching(/^sha256:/),
            payrollComponentMappingHash: expect.stringMatching(/^sha256:/),
            payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
            yearToDatePolicy: expect.objectContaining({
              kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY",
              periodStart: "2026-01-01T00:00:00.000Z",
              periodEnd: "2026-06-30T00:00:00.000Z",
            }),
            yearToDatePolicyHash: "sha256:ytd-policy",
            yearToDateAccumulatorHashes: ["sha256:ytd-accumulator"],
            payrollComponentMapping: expect.objectContaining({
              taxableBaseAmount: "100000.00",
              incomeTaxWithholdingAmount: "0.00",
              statutoryPayableAmount: "17150.00",
              declarationLiabilityAmount: "17150.00",
              incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
              incomeTaxWithholdingEnabled: false,
            }),
            payload: expect.objectContaining({
              taxableBaseAmount: "100000.00",
              incomeTaxWithholdingAmount: "0.00",
              incomeTaxApplied: false,
              incomeTaxWithholdingEnabled: false,
              statutoryPayableAmount: "17150.00",
              declarationLiabilityAmount: "17150.00",
              declarationAmount: "17150.00",
              payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
              yearToDatePolicyHash: "sha256:ytd-policy",
              yearToDateAccumulatorHashes: ["sha256:ytd-accumulator"],
            }),
          }),
        }),
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.prepared",
        payload: expect.objectContaining({
          payrollComponentMappingHash: expect.stringMatching(/^sha256:/),
          payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          declarationLiabilityAmount: "17150.00",
          incomeTaxWithholdingEnabled: false,
          yearToDatePolicyHash: "sha256:ytd-policy",
          yearToDateAccumulatorHashes: ["sha256:ytd-accumulator"],
        }),
      }),
    );
  });
  it("prepares correction declarations as statutory-credit amendments with signed liability proof", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue({
      ...payrollCorrectionRunFixture(),
      status: PayrollRunStatus.POSTED,
      declarations: [],
    });
    tx.payrollDeclaration.findFirst.mockResolvedValue(null);
    tx.payrollDeclaration.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "declaration-correction-1",
        ...data,
      }),
    );
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await preparePayrollDeclarations({
      organizationId: "org-1",
      payrollRunId: "correction-run-1",
      preparedById: "payroll-controller-1",
      idempotencyKey: "declaration-key-correction-1",
    });

    expect(result.expertReviewRequired).toBe(true);
    expect(tx.payrollDeclaration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: new Prisma.Decimal("1715.00"),
          payloadHash: expect.stringMatching(/^sha256:/),
          metadata: expect.objectContaining({
            expertReviewRequired: true,
            payrollRunType: PayrollRunType.CORRECTION,
            correctionRun: true,
            originalRunId: "original-run-1",
            originalRunDocumentHash: "sha256:original-run",
            declarationCorrectionMode: "CORRECTION_STATUTORY_CREDIT",
            declarationSignedAmount: "-1715.00",
            declarationAmount: "1715.00",
            declarationPayableAmount: "0.00",
            statutoryCreditAmount: "1715.00",
            additionalLiabilityAmount: "0.00",
            authorityAmendmentRequired: true,
            authorityLifecycleTransition: "AMEND",
            manualAuthorityWorkflowOnly: true,
            correctionDeclarationRequiresAuthorityEvidence: true,
            payload: expect.objectContaining({
              payrollRunType: PayrollRunType.CORRECTION,
              correctionRun: true,
              originalRunId: "original-run-1",
              declarationLiabilityAmount: "-1715.00",
              declarationSignedAmount: "-1715.00",
              declarationAmount: "1715.00",
              declarationPayableAmount: "0.00",
              statutoryCreditAmount: "1715.00",
              additionalLiabilityAmount: "0.00",
              declarationCorrectionMode: "CORRECTION_STATUTORY_CREDIT",
              authorityAmendmentRequired: true,
              authorityLifecycleTransition: "AMEND",
              manualAuthorityWorkflowOnly: true,
              correctionDeclarationRequiresAuthorityEvidence: true,
            }),
          }),
        }),
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.prepared",
        payload: expect.objectContaining({
          payrollRunType: PayrollRunType.CORRECTION,
          correctionRun: true,
          originalRunId: "original-run-1",
          originalRunDocumentHash: "sha256:original-run",
          declarationCorrectionMode: "CORRECTION_STATUTORY_CREDIT",
          declarationLiabilityAmount: "-1715.00",
          declarationSignedAmount: "-1715.00",
          declarationAmount: "1715.00",
          statutoryCreditAmount: "1715.00",
          authorityLifecycleTransition: "AMEND",
        }),
      }),
    );
  });
  it("blocks posting when statutory component register proof is missing", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    const run = payrollRunFixture() as any;
    run.lines[0].calculationSnapshot = {};
    tx.payrollRun.findFirst.mockResolvedValue(run);

    await expect(
      approveAndPostPayrollRun({
        organizationId: "org-1",
        payrollRunId: "run-1",
        approvedById: "approver-1",
        actorPermissions: ["payroll.runs.approve"],
        lastAuthAt: "2026-06-30T00:00:00.000Z",
        now: "2026-06-30T00:01:00.000Z",
        idempotencyKey: "approve-key-1",
      }),
    ).rejects.toThrow("matched statutory component register proof");

    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });
  it("marks certified close evidence stale when a payroll run is posted", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(payrollRunFixture());
    tx.journal.findFirst.mockResolvedValue({
      id: "journal-payroll",
      code: "PAY",
      type: JournalType.PAYROLL,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(mappedPayrollAccounts());
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
      status: LedgerPostingBatchStatus.POSTED,
    });
    tx.journalEntry.count.mockResolvedValue(0);
    tx.journalEntry.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "journal-entry-1",
        ...data,
        lines: data.lines.create,
      }),
    );
    tx.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" });
    tx.payrollPayslip.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "payslip-1",
        ...data,
      }),
    );
    tx.payrollRun.update.mockResolvedValue({
      ...payrollRunFixture(PayrollRunStatus.POSTED),
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      payslips: [{ id: "payslip-1" }],
    });
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-1",
      status: PayrollPeriodStatus.POSTED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });
    tx.closeRun.findMany.mockResolvedValue([
      { id: "close-run-1", packExports: [{ id: "close-pack-export-1" }] },
    ]);
    tx.closeRun.findFirst.mockResolvedValue({
      id: "close-run-1",
      organizationId: "org-1",
      status: "CERTIFIED",
      metadata: { certifiedContentHash: "sha256:old-close" },
    });
    tx.closePackExport.findFirst.mockResolvedValue({
      id: "close-pack-export-1",
      metadata: { mode: "CERTIFIED" },
    });

    await approveAndPostPayrollRun({
      organizationId: "org-1",
      payrollRunId: "run-1",
      approvedById: "approver-1",
      actorPermissions: ["payroll.runs.approve"],
      lastAuthAt: "2026-06-30T00:00:00.000Z",
      now: "2026-06-30T00:01:00.000Z",
      idempotencyKey: "approve-key-1",
    });

    const eventTypes = mockedRecordBusinessEventInTx.mock.calls.map(
      ([, event]) => event.eventType,
    );
    expect(eventTypes.indexOf("payroll.run.posted")).toBeLessThan(
      eventTypes.indexOf("close.certification.invalidated"),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "close.certification.invalidated",
        payload: expect.objectContaining({
          sourceCode: "PAYROLL_RUN_POSTED",
          sourceDomain: "payroll",
          sourceModel: "PayrollRun",
          sourceEventName: "payroll.run.posted",
          sourceId: "run-1",
          staleReason: "Payroll run posting changed certified close evidence.",
          newEvidenceHash: "sha256:run-doc",
        }),
        metadata: expect.objectContaining({
          sourceCode: "PAYROLL_RUN_POSTED",
          sourceDomain: "payroll",
          staleReason: "Payroll run posting changed certified close evidence.",
        }),
        outboxMessages: [
          expect.objectContaining({
            channel: "REPORT_EXPORT",
            eventName: "close.certification.invalidated",
            metadata: expect.objectContaining({
              sourceCode: "PAYROLL_RUN_POSTED",
              sourceDomain: "payroll",
              sourceModel: "PayrollRun",
              sourceEventName: "payroll.run.posted",
            }),
          }),
        ],
      }),
    );
    expect(tx.closePackExport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close-pack-export-1" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              status: "EVIDENCE_STALE",
              sourceCode: "PAYROLL_RUN_POSTED",
              sourceDomain: "payroll",
              sourceId: "run-1",
              actorId: "approver-1",
              newEvidenceHash: "sha256:run-doc",
            }),
          }),
        }),
      }),
    );
    expect(tx.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close-run-1" },
        data: expect.objectContaining({
          status: "BLOCKED",
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              sourceCode: "PAYROLL_RUN_POSTED",
              sourceEventName: "payroll.run.posted",
            }),
          }),
        }),
      }),
    );
    expect(tx.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_CERTIFICATION_EVIDENCE_STALE",
          resourceType: "ClosePackExport",
          resourceId: "close-pack-export-1",
          message: "Payroll run posting changed certified close evidence.",
        }),
      }),
    );
  });

  it("returns posted payroll runs for identical approval replays without duplicate posting", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    const approvalPayloadHash = `sha256:${hashBusinessPayload({
      operation: "approveAndPostPayrollRun",
      payrollRunId: "run-1",
      approvedById: "approver-1",
    })}`;
    tx.payrollRun.findFirst.mockResolvedValue(
      payrollRunFixture(PayrollRunStatus.POSTED, { approvalPayloadHash }),
    );

    const result = await approveAndPostPayrollRun({
      organizationId: "org-1",
      payrollRunId: "run-1",
      approvedById: "approver-1",
      actorPermissions: ["payroll.runs.approve"],
      lastAuthAt: "2026-06-30T00:00:00.000Z",
      now: "2026-06-30T00:01:00.000Z",
    });

    expect(result.ledgerStatus).toBe("IDEMPOTENT_REPLAY");
    expect(mockedGetActivePostingRule).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("does not emit payroll events or payslips when journal creation fails", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(payrollRunFixture());
    tx.journal.findFirst.mockResolvedValue({
      id: "journal-payroll",
      code: "PAY",
      type: JournalType.PAYROLL,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(mappedPayrollAccounts());
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
      status: LedgerPostingBatchStatus.POSTED,
    });
    tx.journalEntry.count.mockResolvedValue(0);
    tx.journalEntry.create.mockRejectedValue(new Error("journal failed"));

    await expect(
      approveAndPostPayrollRun({
        organizationId: "org-1",
        payrollRunId: "run-1",
        approvedById: "approver-1",
        actorPermissions: ["payroll.runs.approve"],
        lastAuthAt: "2026-06-30T00:00:00.000Z",
        now: "2026-06-30T00:01:00.000Z",
      }),
    ).rejects.toThrow("journal failed");

    expect(tx.payrollPayslip.create).not.toHaveBeenCalled();
    expect(tx.payrollRun.update).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
    expect(mockedMarkBusinessEventAppliedInTx).not.toHaveBeenCalled();
  });
});
