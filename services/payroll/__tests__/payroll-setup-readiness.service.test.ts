import {
  ChartAccountNormalBalance,
  ChartAccountType,
  PayrollContractStatus,
  PayrollEmployeeStatus,
} from "@prisma/client";

jest.mock("../../../prisma/db", () => ({
  db: {},
}));

jest.mock("../../regulatory/country-packs/resolve", () => ({
  resolveRegulatoryParameter: jest.fn(),
}));

jest.mock("../../regulatory/country-packs/registry", () => ({
  getCountryPack: jest.fn(),
}));

jest.mock("../payroll-country-pack-fixture-runner", () => ({
  validatePayrollCountryPackCalculationFixtures: jest.fn(),
}));

import { DEFAULT_PAYROLL_POSTING_RULES } from "../../accounting/default-posting-rules";
import { getCountryPack } from "../../regulatory/country-packs/registry";
import { resolveRegulatoryParameter } from "../../regulatory/country-packs/resolve";
import { validatePayrollCountryPackCalculationFixtures } from "../payroll-country-pack-fixture-runner";
import {
  getPayrollSetupReadiness,
  REQUIRED_PAYROLL_ACCOUNT_MAPPING_KEYS,
  REQUIRED_PAYROLL_COUNTRY_PACK_PARAMETER_PATHS,
} from "../payroll-setup-readiness.service";

const mockedResolveRegulatoryParameter =
  resolveRegulatoryParameter as jest.Mock;
const mockedGetCountryPack = getCountryPack as jest.Mock;
const mockedValidatePayrollCountryPackCalculationFixtures =
  validatePayrollCountryPackCalculationFixtures as jest.Mock;

function passedCalculationFixtures() {
  const passedRun = (
    fixtureId: string,
    parameterPath: string,
    purpose: string,
  ) => ({
    fixtureId,
    parameterPath,
    purpose,
    status: "PASSED",
    reviewStatus: "EXPERT_REVIEWED",
    reviewEvidence: {
      reviewedBy: "Qualified Cameroon payroll tax reviewer",
      reviewedOn: "2026-06-28",
      legalRef: "CM_DGI_CGI_2025",
      sourceEvidenceHash: `sha256:${fixtureId}-review-evidence`,
    },
    expectedOutput: { status: "CALCULATED" },
    actualOutput: { status: "CALCULATED" },
  });

  return {
    valid: true,
    runs: [
      passedRun(
        "cm-cnps-pension-reviewed",
        "payroll.cnps.pensionRatesBps",
        "PAYROLL",
      ),
      passedRun(
        "cm-cnps-family-reviewed",
        "payroll.cnps.familyAllowanceRatesBps",
        "PAYROLL_CNPS_FAMILY_ALLOWANCE",
      ),
      passedRun(
        "cm-cnps-risk-reviewed",
        "payroll.cnps.occupationalRiskRatesBps",
        "PAYROLL_CNPS_OCCUPATIONAL_RISK",
      ),
      passedRun(
        "cm-irpp-period-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_PERIOD_CALCULATION",
      ),
      passedRun(
        "cm-irpp-ytd-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_YTD_REGULARIZATION",
      ),
      passedRun(
        "cm-irpp-adjustments-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_PERIOD_ADJUSTMENTS",
      ),
      passedRun(
        "cm-irpp-corrections-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_YTD_CORRECTION_REPLAY",
      ),
      passedRun(
        "cm-allowances-reviewed",
        "payroll.compensation.allowances",
        "PAYROLL_ALLOWANCE_TAXABLE",
      ),
      passedRun(
        "cm-benefits-reviewed",
        "payroll.compensation.benefits",
        "PAYROLL_BENEFIT_IN_KIND",
      ),
      passedRun(
        "cm-leave-paid-reviewed",
        "payroll.attendance.leave",
        "PAYROLL_LEAVE_PAID",
      ),
      passedRun(
        "cm-leave-unpaid-reviewed",
        "payroll.attendance.leave",
        "PAYROLL_LEAVE_UNPAID",
      ),
      passedRun(
        "cm-overtime-reviewed",
        "payroll.attendance.overtime",
        "PAYROLL_OVERTIME_PREMIUM",
      ),
    ],
    issues: [],
  };
}
function supportedCountryPack(path: string) {
  return {
    countryCode: "CM",
    parameterPath: path,
    value: {},
    packVersion: "CM-2026.1",
    schemaVersion: "country-pack.v1",
    legalRef: "CM_PAYROLL_REVIEWED_SOURCE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    verifiedOn: "2026-06-11",
    verifiedBy: "Official CNPS regulator source",
    verificationStatus: "REGULATOR_CONFIRMED",
    layer: "country",
    capabilityStatus: "SUPPORTED",
    resolutionHash: `hash-${path}`,
  };
}

function account(
  mappingKey: string,
  type = ChartAccountType.ASSET,
  normalBalance = ChartAccountNormalBalance.DEBIT,
) {
  return {
    id: `account-${mappingKey}`,
    code: `SYS-${mappingKey}`,
    mappingKey,
    isActive: true,
    type,
    normalBalance,
    _count: { children: 0 },
  };
}

function payrollMappingAccounts() {
  return [
    account(
      "PAYROLL_GROSS_EXPENSE",
      ChartAccountType.EXPENSE,
      ChartAccountNormalBalance.DEBIT,
    ),
    account(
      "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
      ChartAccountType.EXPENSE,
      ChartAccountNormalBalance.DEBIT,
    ),
    account(
      "EMPLOYEE_PAYABLES",
      ChartAccountType.LIABILITY,
      ChartAccountNormalBalance.CREDIT,
    ),
    account(
      "EMPLOYEE_RECEIVABLES",
      ChartAccountType.ASSET,
      ChartAccountNormalBalance.DEBIT,
    ),
    account(
      "PAYROLL_WITHHOLDING_PAYABLE",
      ChartAccountType.LIABILITY,
      ChartAccountNormalBalance.CREDIT,
    ),
    account(
      "SOCIAL_CONTRIBUTIONS_PAYABLE",
      ChartAccountType.LIABILITY,
      ChartAccountNormalBalance.CREDIT,
    ),
    account("BANK"),
    account("CASH_ON_HAND"),
    account("MOBILE_MONEY_CLEARING"),
    account("CHEQUE_CLEARING"),
  ];
}

function payrollPostingRules() {
  return DEFAULT_PAYROLL_POSTING_RULES.map((template) => ({
    id: `rule-${template.code}`,
    code: template.code,
    sourceType: template.sourceType,
    postingPurpose: template.postingPurpose,
    isActive: true,
    effectiveFrom: null,
    effectiveTo: null,
    lines: template.lines.map((line) => ({
      id: `line-${template.code}-${line.lineNumber}`,
      lineNumber: line.lineNumber,
      side: line.side,
      mappingKey: line.mappingKey,
      amountSource: line.amountSource,
      accountId: null,
      account: null,
    })),
  }));
}

function buildClient(overrides: Record<string, unknown> = {}) {
  return {
    organization: {
      findFirst: jest.fn().mockResolvedValue({
        id: "org-1",
        countryCode: "CM",
        country: "CM",
        requestedModules: ["payroll", "accounting"],
      }),
    },
    organizationAccountingSettings: {
      findUnique: jest.fn().mockResolvedValue({
        accountingEnabled: true,
        setupStatus: "READY",
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      }),
    },
    chartOfAccount: {
      findMany: jest.fn().mockResolvedValue(payrollMappingAccounts()),
    },
    journal: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "journal-payroll",
          code: "PAY",
          isActive: true,
          isDefault: true,
        },
      ]),
    },
    postingRule: {
      findMany: jest.fn().mockResolvedValue(payrollPostingRules()),
    },
    accountingPeriod: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: "period-accounting-1", name: "June 2026" }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "user-1",
          email: "one@example.test",
          firstName: "One",
          lastName: "User",
          name: "One User",
          isActive: true,
        },
        {
          id: "user-2",
          email: "two@example.test",
          firstName: "Two",
          lastName: "User",
          name: "Two User",
          isActive: true,
        },
      ]),
    },
    payrollEmployee: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "employee-1",
          userId: "user-1",
          status: PayrollEmployeeStatus.ACTIVE,
          paymentDestinationHash: "sha256:payment-destination",
          bankAccountHash: null,
          mobileMoneyPhoneHash: null,
          contracts: [
            {
              id: "contract-1",
              status: PayrollContractStatus.ACTIVE,
              signedDocumentHash: "sha256:contract",
            },
          ],
        },
      ]),
    },
    ...overrides,
  };
}

describe("payroll setup readiness service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveRegulatoryParameter.mockImplementation((path: string) =>
      supportedCountryPack(path),
    );
    mockedGetCountryPack.mockReturnValue({
      header: {
        countryCode: "CM",
        packVersion: "CM-2026.1",
        capabilityMatrix: {
          "payroll.cnps": "SUPPORTED",
          "payroll.irpp": "SUPPORTED",
          "payroll.compensation": "SUPPORTED",
          "payroll.attendance": "SUPPORTED",
        },
      },
    });
    mockedValidatePayrollCountryPackCalculationFixtures.mockReturnValue(
      passedCalculationFixtures(),
    );
  });

  it("returns ready when payroll entitlement, accounting, posting, period, country pack, and user mapping are ready", async () => {
    const client = buildClient();

    const result = await getPayrollSetupReadiness(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
      },
      client as any,
    );

    expect(result.status).toBe("READY");
    expect(result.blockers).toEqual([]);
    expect(result.checks.accounting.requiredPayrollMappingKeys).toEqual(
      REQUIRED_PAYROLL_ACCOUNT_MAPPING_KEYS,
    );
    expect(result.checks.accounting.payrollMappingCount).toBe(6);
    expect(result.checks.accounting.payrollJournalReady).toBe(true);
    expect(result.checks.accounting.payrollPostingRuleCodes).toEqual([
      "PAYROLL-RUN",
      "PAYROLL-PAYMENT",
      "PAYROLL-EMPLOYEE-RECEIVABLE",
      "PAYROLL-EMPLOYEE-BALANCE-SETTLEMENT",
    ]);
    expect(result.checks.accounting.openAccountingPeriodId).toBe(
      "period-accounting-1",
    );
    expect(result.checks.countryPack.requiredParameterPaths).toEqual([
      ...REQUIRED_PAYROLL_COUNTRY_PACK_PARAMETER_PATHS,
    ]);
    expect(result.checks.countryPack.calculationFixtures).toEqual(
      expect.objectContaining({
        status: "READY",
        packVersion: "CM-2026.1",
        executableScenarioCount: 12,
        passedScenarioCount: 12,
        failedScenarioCount: 0,
        issueCount: 0,
        reviewEvidence: expect.objectContaining({
          presentCount: 12,
          missingCount: 0,
          sourceEvidenceHashes: expect.arrayContaining([
            "sha256:cm-irpp-period-reviewed-review-evidence",
          ]),
        }),
        scenarioCoverage: expect.objectContaining({
          status: "READY",
          readyFamilyCount: 9,
          requiredFamilyCount: 9,
          reviewEvidence: expect.objectContaining({
            presentCount: 12,
            missingCount: 0,
          }),
        }),
        reviewedProofChain: expect.objectContaining({
          status: "READY",
          coverageHash: expect.stringMatching(/^sha256:/),
          reviewEvidenceSourceHashes: expect.arrayContaining([
            "sha256:cm-irpp-period-reviewed-review-evidence",
          ]),
          registerProofGapCount: null,
          correctionIntentCount: null,
          blockerCodes: [],
        }),
      }),
    );
    expect(mockedResolveRegulatoryParameter).toHaveBeenCalledWith(
      "payroll.irpp.incomeTaxRules",
      expect.objectContaining({
        countryCode: "CM",
        purpose: "PAYROLL_SETUP_READINESS",
      }),
    );
    expect(mockedResolveRegulatoryParameter).toHaveBeenCalledWith(
      "payroll.compensation.allowances",
      expect.objectContaining({ countryCode: "CM" }),
    );
    expect(mockedResolveRegulatoryParameter).toHaveBeenCalledWith(
      "payroll.compensation.benefits",
      expect.objectContaining({ countryCode: "CM" }),
    );
    expect(mockedResolveRegulatoryParameter).toHaveBeenCalledWith(
      "payroll.attendance.leave",
      expect.objectContaining({ countryCode: "CM" }),
    );
    expect(mockedResolveRegulatoryParameter).toHaveBeenCalledWith(
      "payroll.attendance.overtime",
      expect.objectContaining({ countryCode: "CM" }),
    );
    expect(result.checks.employeeUserMapping.plannedEmployeeCreateCount).toBe(
      1,
    );
    expect(mockedGetCountryPack).toHaveBeenCalledWith("CM", "CM-2026.1");
    expect(
      mockedValidatePayrollCountryPackCalculationFixtures,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          countryCode: "CM",
          packVersion: "CM-2026.1",
        }),
      }),
    );
  });

  it("blocks production-supported country packs when executable calculation scenarios are missing", async () => {
    mockedValidatePayrollCountryPackCalculationFixtures.mockReturnValue({
      valid: true,
      runs: [],
      issues: [],
    });
    const client = buildClient();

    const result = await getPayrollSetupReadiness(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
      },
      client as any,
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.checks.countryPack.calculationFixtures).toEqual(
      expect.objectContaining({
        status: "NO_EXECUTABLE_SCENARIOS",
        packVersion: "CM-2026.1",
        executableScenarioCount: 0,
      }),
    );
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYROLL_COUNTRY_PACK_CALCULATION_FIXTURES_MISSING",
          evidence: expect.objectContaining({
            packVersion: "CM-2026.1",
          }),
        }),
      ]),
    );
  });

  it("blocks setup readiness when executable country-pack calculation fixtures fail", async () => {
    mockedValidatePayrollCountryPackCalculationFixtures.mockReturnValue({
      valid: false,
      runs: [
        {
          fixtureId: "cm-irpp-period-reviewed",
          parameterPath: "payroll.irpp.incomeTaxRules",
          purpose: "PAYROLL_IRPP_PERIOD_CALCULATION",
          status: "FAILED",
          reviewStatus: "EXPERT_REVIEWED",
          expectedOutput: { taxAmount: "1000.00" },
          actualOutput: { taxAmount: "900.00" },
        },
      ],
      issues: [
        {
          code: "SCENARIO_OUTPUT_MISMATCH",
          fixtureId: "cm-irpp-period-reviewed",
          parameterPath: "payroll.irpp.incomeTaxRules",
          path: "goldenFixtures.cm-irpp-period-reviewed.calculationScenario.expectedOutput.taxAmount",
          message:
            "Expected taxAmount to be 1000.00, but evaluator returned 900.00.",
        },
      ],
    });
    const client = buildClient();

    const result = await getPayrollSetupReadiness(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
      },
      client as any,
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.checks.countryPack.calculationFixtures).toEqual(
      expect.objectContaining({
        status: "FAILED",
        executableScenarioCount: 1,
        passedScenarioCount: 0,
        failedScenarioCount: 1,
        issueCount: 1,
        issueCodes: ["SCENARIO_OUTPUT_MISMATCH"],
        fixtureIds: ["cm-irpp-period-reviewed"],
      }),
    );
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYROLL_COUNTRY_PACK_CALCULATION_FIXTURES_FAILED",
          evidence: expect.objectContaining({
            issueCodes: "SCENARIO_OUTPUT_MISMATCH",
          }),
        }),
      ]),
    );
  });
  it("blocks Cameroon setup readiness when CNPS classification settings are missing", async () => {
    const client = buildClient({
      organizationAccountingSettings: {
        findUnique: jest.fn().mockResolvedValue({
          accountingEnabled: true,
          setupStatus: "READY",
          payrollCnpsFamilyAllowanceSector: null,
          payrollCnpsOccupationalRiskGroup: null,
        }),
      },
    } as any);

    const result = await getPayrollSetupReadiness(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
      },
      client as any,
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "PAYROLL_CNPS_FAMILY_ALLOWANCE_SECTOR_MISSING",
        "PAYROLL_CNPS_OCCUPATIONAL_RISK_GROUP_MISSING",
      ]),
    );
  });

  it("blocks full payroll readiness when IRPP rules still require expert review", async () => {
    mockedResolveRegulatoryParameter.mockImplementation((path: string) => {
      const resolution = supportedCountryPack(path);
      if (path !== "payroll.irpp.incomeTaxRules") return resolution;
      return {
        ...resolution,
        legalRef: "CM_DGI_CGI_2025",
        verificationStatus: "REQUIRES_EXPERT_REVIEW",
        capabilityStatus: "REQUIRES_EXPERT_REVIEW",
      };
    });
    const client = buildClient();

    const result = await getPayrollSetupReadiness(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
      },
      client as any,
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYROLL_COUNTRY_PACK_REQUIRES_REVIEW",
          evidence: expect.objectContaining({
            parameterPath: "payroll.irpp.incomeTaxRules",
            capabilityStatus: "REQUIRES_EXPERT_REVIEW",
          }),
        }),
      ]),
    );
  });

  it("blocks setup readiness when country-pack resolution is unavailable", async () => {
    mockedResolveRegulatoryParameter.mockImplementation(() => {
      throw new Error("country pack missing");
    });
    const client = buildClient();

    const result = await getPayrollSetupReadiness(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
      },
      client as any,
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.map((issue) => issue.code)).toContain(
      "PAYROLL_COUNTRY_PACK_UNAVAILABLE",
    );
  });
  it("reports setup blockers without attempting writes when payroll setup prerequisites are missing", async () => {
    const client = buildClient({
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: "org-1",
          countryCode: "CM",
          country: "CM",
          requestedModules: ["inventory"],
        }),
      },
      organizationAccountingSettings: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      chartOfAccount: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      journal: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      postingRule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      accountingPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any);

    const result = await getPayrollSetupReadiness(
      {
        organizationId: "org-1",
        actorId: "reader-1",
        actorPermissions: ["PAYROLL_READ"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
      },
      client as any,
    );

    const codes = result.blockers.map((issue) => issue.code);
    expect(result.status).toBe("BLOCKED");
    expect(codes).toEqual(
      expect.arrayContaining([
        "PAYROLL_MODULE_NOT_READY",
        "PAYROLL_ACCOUNTING_DEPENDENCY_MISSING",
        "PAYROLL_SETUP_PERMISSION_MISSING",
        "ACCOUNTING_SETTINGS_MISSING",
        "PAYROLL_ACCOUNT_MAPPING_MISSING",
        "PAYROLL_PAYMENT_RAIL_MAPPING_MISSING",
        "PAYROLL_JOURNAL_MISSING",
        "PAYROLL_POSTING_RULE_MISSING",
        "PAYROLL_PAY_DATE_PERIOD_CLOSED_OR_MISSING",
        "PAYROLL_EMPLOYEE_SOURCE_EMPTY",
      ]),
    );
  });

  it("blocks ambiguous employee-to-user readiness when payroll employees point at missing tenant users", async () => {
    const client = buildClient({
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "employee-1",
            userId: "missing-user",
            status: PayrollEmployeeStatus.ACTIVE,
            paymentDestinationHash: "sha256:payment-destination",
            bankAccountHash: null,
            mobileMoneyPhoneHash: null,
            contracts: [
              { id: "contract-1", signedDocumentHash: "sha256:contract" },
            ],
          },
        ]),
      },
    } as any);

    const result = await getPayrollSetupReadiness(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
      },
      client as any,
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.map((issue) => issue.code)).toContain(
      "PAYROLL_EMPLOYEE_USER_REFERENCE_MISSING",
    );
  });
});
