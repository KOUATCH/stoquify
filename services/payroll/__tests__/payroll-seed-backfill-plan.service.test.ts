import {
  ChartAccountNormalBalance,
  ChartAccountType,
  PayrollContractStatus,
  PayrollEmployeeStatus,
} from "@prisma/client"

jest.mock("../../../prisma/db", () => ({
  db: {},
}))

jest.mock("../../regulatory/country-packs/resolve", () => ({
  resolveRegulatoryParameter: jest.fn(),
}))

import { DEFAULT_PAYROLL_POSTING_RULES } from "../../accounting/default-posting-rules"
import { resolveRegulatoryParameter } from "../../regulatory/country-packs/resolve"
import {
  formatPayrollSeedBackfillDryRunReport,
  generatePayrollSeedBackfillDryRunPlan,
} from "../payroll-seed-backfill-plan.service"

const mockedResolveRegulatoryParameter = resolveRegulatoryParameter as jest.Mock

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
    verifiedBy: "Codex regulatory source pass",
    verificationStatus: "SOURCE_CHECKED",
    layer: "country",
    capabilityStatus: "SUPPORTED",
    resolutionHash: `hash-${path}`,
  }
}

function account(mappingKey: string, type = ChartAccountType.ASSET, normalBalance = ChartAccountNormalBalance.DEBIT) {
  return {
    id: `account-${mappingKey}`,
    code: `SYS-${mappingKey}`,
    mappingKey,
    isActive: true,
    type,
    normalBalance,
    _count: { children: 0 },
  }
}

function payrollMappingAccounts() {
  return [
    account("PAYROLL_GROSS_EXPENSE", ChartAccountType.EXPENSE, ChartAccountNormalBalance.DEBIT),
    account("PAYROLL_EMPLOYER_CHARGE_EXPENSE", ChartAccountType.EXPENSE, ChartAccountNormalBalance.DEBIT),
    account("EMPLOYEE_PAYABLES", ChartAccountType.LIABILITY, ChartAccountNormalBalance.CREDIT),
    account("PAYROLL_WITHHOLDING_PAYABLE", ChartAccountType.LIABILITY, ChartAccountNormalBalance.CREDIT),
    account("SOCIAL_CONTRIBUTIONS_PAYABLE", ChartAccountType.LIABILITY, ChartAccountNormalBalance.CREDIT),
    account("BANK"),
    account("CASH_ON_HAND"),
    account("MOBILE_MONEY_CLEARING"),
    account("CHEQUE_CLEARING"),
  ]
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
  }))
}

function buildClient() {
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
      findUnique: jest.fn().mockResolvedValue({ accountingEnabled: true, setupStatus: "READY" }),
    },
    chartOfAccount: {
      findMany: jest.fn().mockResolvedValue(payrollMappingAccounts()),
    },
    journal: {
      findMany: jest.fn().mockResolvedValue([{ id: "journal-payroll", code: "PAY", isActive: true, isDefault: true }]),
    },
    postingRule: {
      findMany: jest.fn().mockResolvedValue(payrollPostingRules()),
    },
    accountingPeriod: {
      findFirst: jest.fn().mockResolvedValue({ id: "period-accounting-1", name: "June 2026" }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: "user-1", email: "one@example.test", firstName: "One", lastName: "User", name: "One User", isActive: true },
        { id: "user-2", email: "two@example.test", firstName: "Two", lastName: "User", name: "Two User", isActive: true },
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
          contracts: [{ id: "contract-1", status: PayrollContractStatus.ACTIVE, signedDocumentHash: "sha256:contract" }],
        },
      ]),
    },
    payrollPeriod: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  }
}

describe("payroll seed/backfill dry-run plan service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedResolveRegulatoryParameter.mockImplementation((path: string) => supportedCountryPack(path))
  })

  it("refuses mutation mode before any database read is attempted", async () => {
    const client = buildClient()

    await expect(
      generatePayrollSeedBackfillDryRunPlan(
        {
          organizationId: "org-1",
          actorId: "payroll-admin-1",
          actorPermissions: ["PAYROLL_PROCESS"],
          countryCode: "CM",
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
          payDate: "2026-06-30",
          dryRun: false,
        },
        client as any,
      ),
    ).rejects.toThrow("mutation mode is intentionally unavailable")

    expect(client.organization.findFirst).not.toHaveBeenCalled()
    expect(client.payrollPeriod.findFirst).not.toHaveBeenCalled()
  })

  it("produces a redacted dry-run report with idempotent planned writes and no person/payment details", async () => {
    const client = buildClient()

    const plan = await generatePayrollSeedBackfillDryRunPlan(
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
    )
    const report = formatPayrollSeedBackfillDryRunReport(plan)

    expect(plan.mutationModeAvailable).toBe(false)
    expect(plan.plannedWrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: "PayrollPeriod", operation: "create", count: 1 }),
        expect.objectContaining({ target: "PayrollEmployee", operation: "upsert", count: 1 }),
        expect.objectContaining({ target: "PayrollContract", operation: "blocked", count: 0 }),
      ]),
    )
    expect(report).toContain("Mutation mode available: no")
    expect(report).toContain("PayrollEmployee")
    expect(report).not.toContain("org-1")
    expect(report).not.toContain("payroll-admin-1")
    expect(report).not.toContain("one@example.test")
    expect(report).not.toContain("One User")
    expect(report).not.toContain("sha256:payment-destination")
  })
})
