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
  }
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
      findUnique: jest
        .fn()
        .mockResolvedValue({ accountingEnabled: true, setupStatus: "READY" }),
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
    payrollPeriod: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    payrollRun: {
      count: jest.fn().mockResolvedValue(0),
    },
    payrollDeclarationEvidence: {
      count: jest.fn().mockResolvedValue(0),
    },
    payrollPaymentBatch: {
      count: jest.fn().mockResolvedValue(0),
    },
  }
}

describe("payroll seed/backfill dry-run plan service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedResolveRegulatoryParameter.mockImplementation((path: string) =>
      supportedCountryPack(path),
    )
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
    expect(client.payrollRun.count).not.toHaveBeenCalled()
    expect(client.payrollDeclarationEvidence.count).not.toHaveBeenCalled()
    expect(client.payrollPaymentBatch.count).not.toHaveBeenCalled()
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
    expect(plan.proofBackfill).toMatchObject({
      dryRunOnly: true,
      mutationModeAvailable: false,
      status: "READY",
      scanScope: "tenant-history",
      totalBlockingGaps: 0,
      gapCounts: {
        payrollRunMissingStatutoryScenarioCoverage: 0,
        declarationEvidenceMissingSourceRegisterHash: 0,
        declarationEvidenceMissingAuthorityAdapterProof: 0,
        declarationEvidenceMissingAuthorityLifecycleProof: 0,
        paymentBatchMissingProviderAdapterProof: 0,
        paymentBatchMissingSettlementRegisterProof: 0,
        paymentBatchMissingSettlementLifecycleProof: 0,
      },
    })
    expect(plan.plannedWrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: "PayrollPeriod",
          operation: "create",
          count: 1,
        }),
        expect.objectContaining({
          target: "PayrollEmployee",
          operation: "upsert",
          count: 1,
        }),
        expect.objectContaining({
          target: "PayrollContract",
          operation: "blocked",
          count: 0,
        }),
      ]),
    )
    expect(report).toContain("Mutation mode available: no")
    expect(report).toContain("Historical Proof Backfill Dry Run")
    expect(report).toContain("Total blocking proof gaps: 0")
    expect(report).toContain("PayrollEmployee")
    expect(report).not.toContain("org-1")
    expect(report).not.toContain("payroll-admin-1")
    expect(report).not.toContain("one@example.test")
    expect(report).not.toContain("One User")
    expect(report).not.toContain("sha256:payment-destination")
  })

  it("blocks production certification when historical proof-contract gaps need backfill", async () => {
    const client = buildClient()
    client.payrollRun.count.mockResolvedValueOnce(7)
    client.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
    client.payrollPaymentBatch.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6)

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

    expect(plan.status).toBe("BLOCKED")
    expect(plan.proofBackfill.status).toBe("BLOCKED")
    expect(plan.proofBackfill.totalBlockingGaps).toBe(28)
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYROLL_PROOF_BACKFILL_REQUIRED",
          evidence: expect.objectContaining({
            totalBlockingGaps: 28,
            payrollRunStatutoryCoverageGaps: 7,
            declarationLifecycleProofGaps: 3,
            paymentSettlementLifecycleProofGaps: 6,
          }),
        }),
      ]),
    )
    expect(plan.plannedWrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: "PayrollRunStatutoryScenarioCoverageBackfill",
          operation: "blocked",
          count: 7,
        }),
        expect.objectContaining({
          target: "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill",
          operation: "blocked",
          count: 3,
        }),
        expect.objectContaining({
          target: "PayrollPaymentSettlementLifecycleProofBackfill",
          operation: "blocked",
          count: 6,
        }),
      ]),
    )
    expect(client.payrollRun.count).toHaveBeenCalledTimes(1)
    expect(client.payrollDeclarationEvidence.count).toHaveBeenCalledTimes(3)
    expect(client.payrollPaymentBatch.count).toHaveBeenCalledTimes(3)
    const declarationRegisterProofGapQuery =
      client.payrollDeclarationEvidence.count.mock.calls[0][0]
    expect(declarationRegisterProofGapQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          declaration: expect.objectContaining({
            evidenceItems: expect.objectContaining({
              none: expect.objectContaining({
                transition: "AMEND",
                metadata: expect.objectContaining({
                  path: ["proofBackfill", "coversDeclarationRegisterProof"],
                  equals: true,
                }),
              }),
            }),
          }),
        }),
      }),
    )
    const declarationAuthorityAdapterProofGapQuery =
      client.payrollDeclarationEvidence.count.mock.calls[1][0]
    expect(declarationAuthorityAdapterProofGapQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          declaration: expect.objectContaining({
            evidenceItems: expect.objectContaining({
              none: expect.objectContaining({
                transition: "AMEND",
                metadata: expect.objectContaining({
                  path: [
                    "proofBackfill",
                    "coversDeclarationAuthorityAdapterProof",
                  ],
                  equals: true,
                }),
              }),
            }),
          }),
        }),
      }),
    )
    const declarationAuthorityLifecycleProofGapQuery =
      client.payrollDeclarationEvidence.count.mock.calls[2][0]
    expect(declarationAuthorityLifecycleProofGapQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          declaration: expect.objectContaining({
            evidenceItems: expect.objectContaining({
              none: expect.objectContaining({
                transition: "AMEND",
                metadata: expect.objectContaining({
                  path: [
                    "proofBackfill",
                    "coversDeclarationAuthorityLifecycleProof",
                  ],
                  equals: true,
                }),
              }),
            }),
          }),
        }),
      }),
    )
    const paymentProviderProofGapQuery =
      client.payrollPaymentBatch.count.mock.calls[0][0]
    expect(paymentProviderProofGapQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          NOT: expect.objectContaining({
            metadata: expect.objectContaining({
              path: ["proofBackfill", "coversPaymentProviderAdapterProof"],
              equals: true,
            }),
          }),
        }),
      }),
    )
    const paymentSettlementRegisterProofGapQuery =
      client.payrollPaymentBatch.count.mock.calls[1][0]
    expect(paymentSettlementRegisterProofGapQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          NOT: expect.objectContaining({
            metadata: expect.objectContaining({
              path: [
                "proofBackfill",
                "coversPaymentSettlementRegisterProof",
              ],
              equals: true,
            }),
          }),
        }),
      }),
    )
    const paymentSettlementLifecycleProofGapQuery =
      client.payrollPaymentBatch.count.mock.calls[2][0]
    expect(paymentSettlementLifecycleProofGapQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          NOT: expect.objectContaining({
            metadata: expect.objectContaining({
              path: [
                "proofBackfill",
                "coversPaymentSettlementLifecycleProof",
              ],
              equals: true,
            }),
          }),
        }),
      }),
    )
    expect(report).toContain("PAYROLL_PROOF_BACKFILL_REQUIRED")
    expect(report).toContain("Post-Migration Reconciliation")
    expect(report).toContain("payrollRunMissingStatutoryScenarioCoverage | 7")
    expect(report).toContain("paymentBatchMissingSettlementLifecycleProof | 6")
    expect(report).not.toContain("org-1")
    expect(report).not.toContain("payroll-admin-1")
    expect(report).not.toContain("one@example.test")
    expect(report).not.toContain("sha256:payment-destination")
  })
})
