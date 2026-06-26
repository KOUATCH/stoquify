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

import { DEFAULT_PAYROLL_POSTING_RULES } from "../../accounting/default-posting-rules";
import { resolveRegulatoryParameter } from "../../regulatory/country-packs/resolve";
import {
  getPayrollSetupReadiness,
  REQUIRED_PAYROLL_ACCOUNT_MAPPING_KEYS,
} from "../payroll-setup-readiness.service";

const mockedResolveRegulatoryParameter =
  resolveRegulatoryParameter as jest.Mock;

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
      findUnique: jest
        .fn()
        .mockResolvedValue({
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
      findMany: jest
        .fn()
        .mockResolvedValue([
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
    expect(result.checks.accounting.payrollMappingCount).toBe(5);
    expect(result.checks.accounting.payrollJournalReady).toBe(true);
    expect(result.checks.accounting.payrollPostingRuleCodes).toEqual([
      "PAYROLL-RUN",
      "PAYROLL-PAYMENT",
    ]);
    expect(result.checks.accounting.openAccountingPeriodId).toBe(
      "period-accounting-1",
    );
    expect(result.checks.employeeUserMapping.plannedEmployeeCreateCount).toBe(
      1,
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
