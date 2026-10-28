import {
  ChartAccountNormalBalance,
  ChartAccountType,
  PayrollContractStatus,
  PayrollEmployeeStatus,
} from "@prisma/client";

jest.mock("../../../prisma/db", () => ({
  db: {},
}));

jest.mock("../declaration-lifecycle.service", () => ({
  recordPayrollDeclarationEvidence: jest.fn(),
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
import { recordPayrollDeclarationEvidence } from "../declaration-lifecycle.service";
import { getCountryPack } from "../../regulatory/country-packs/registry";
import { resolveRegulatoryParameter } from "../../regulatory/country-packs/resolve";
import { validatePayrollCountryPackCalculationFixtures } from "../payroll-country-pack-fixture-runner";
import {
  formatPayrollProofBackfillExecutionCertificate,
  preparePayrollProofBackfillExecution,
} from "../payroll-proof-backfill-executor.service";

const mockedRecordPayrollDeclarationEvidence =
  recordPayrollDeclarationEvidence as jest.Mock;
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
      passedRun("cm-cnps-pension-reviewed", "payroll.cnps.pensionRatesBps", "PAYROLL"),
      passedRun("cm-cnps-family-reviewed", "payroll.cnps.familyAllowanceRatesBps", "PAYROLL_CNPS_FAMILY_ALLOWANCE"),
      passedRun("cm-cnps-risk-reviewed", "payroll.cnps.occupationalRiskRatesBps", "PAYROLL_CNPS_OCCUPATIONAL_RISK"),
      passedRun("cm-irpp-period-reviewed", "payroll.irpp.incomeTaxRules", "PAYROLL_IRPP_PERIOD_CALCULATION"),
      passedRun("cm-irpp-ytd-reviewed", "payroll.irpp.incomeTaxRules", "PAYROLL_IRPP_YTD_REGULARIZATION"),
      passedRun("cm-irpp-adjustments-reviewed", "payroll.irpp.incomeTaxRules", "PAYROLL_IRPP_PERIOD_ADJUSTMENTS"),
      passedRun("cm-irpp-corrections-reviewed", "payroll.irpp.incomeTaxRules", "PAYROLL_IRPP_YTD_CORRECTION_REPLAY"),
      passedRun("cm-allowances-reviewed", "payroll.compensation.allowances", "PAYROLL_ALLOWANCE_TAXABLE"),
      passedRun("cm-benefits-reviewed", "payroll.compensation.benefits", "PAYROLL_BENEFIT_IN_KIND"),
      passedRun("cm-leave-paid-reviewed", "payroll.attendance.leave", "PAYROLL_LEAVE_PAID"),
      passedRun("cm-leave-unpaid-reviewed", "payroll.attendance.leave", "PAYROLL_LEAVE_UNPAID"),
      passedRun("cm-overtime-reviewed", "payroll.attendance.overtime", "PAYROLL_OVERTIME_PREMIUM"),
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
    verifiedBy: "Codex regulatory source pass",
    verificationStatus: "SOURCE_CHECKED",
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
    payrollPeriod: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    payrollRun: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    payrollDeclarationEvidence: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    payrollPaymentBatch: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-proof-backfill-1" }),
    },
  };
}

describe("payroll proof backfill executor service", () => {
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
    mockedRecordPayrollDeclarationEvidence.mockResolvedValue({
      evidence: { evidenceHash: "sha256:declaration-register-backfill" },
    });
  });

  it("rejects execute mode before tenant scans or mutation can occur", async () => {
    const client = buildClient();

    await expect(
      preparePayrollProofBackfillExecution(
        {
          organizationId: "org-1",
          actorId: "payroll-admin-1",
          actorPermissions: ["PAYROLL_PROCESS"],
          countryCode: "CM",
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
          payDate: "2026-06-30",
          executionMode: "execute",
        },
        client as any,
      ),
    ).rejects.toThrow("disabled by default");

    expect(client.organization.findFirst).not.toHaveBeenCalled();
    expect(client.payrollRun.count).not.toHaveBeenCalled();
    expect(client.payrollDeclarationEvidence.count).not.toHaveBeenCalled();
    expect(client.payrollPaymentBatch.count).not.toHaveBeenCalled();
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });

  it("produces a redacted signoff-required certificate with correction event intents", async () => {
    const client = buildClient();
    client.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);
    client.payrollPaymentBatch.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(3);

    const certificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        now: "2026-06-30T10:00:00.000Z",
      },
      client as any,
    );
    const report = formatPayrollProofBackfillExecutionCertificate(certificate);
    const serialized = JSON.stringify(certificate) + report;

    expect(certificate.status).toBe("SIGNOFF_REQUIRED");
    expect(certificate.executionEnabled).toBe(false);
    expect(certificate.mutationAttempted).toBe(false);
    expect(certificate.dryRunEvidenceHash).toMatch(/^sha256:/);
    expect(certificate.dryRunEvidenceMatches).toBe(false);
    expect(certificate.missingSignoffs).toEqual(
      expect.arrayContaining([
        "dry-run-evidence-hash",
        "approval-token-hash",
        "payroll-admin-signoff",
        "accounting-controller-signoff",
        "security-privacy-signoff",
        "operations-owner-signoff",
        "approved-at",
        "adapter-chaos-release-gate-hash",
      ]),
    );
    expect(certificate.correctionIntents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill",
          count: 2,
          mutationAllowed: false,
        }),
        expect.objectContaining({
          target: "PayrollPaymentSettlementLifecycleProofBackfill",
          count: 3,
          mutationAllowed: false,
        }),
      ]),
    );
    expect(certificate.idempotencyLedger.status).toBe("planned-not-written");
    expect(certificate.adapterChaosReleaseGateHash).toBeNull();
    expect(report).toContain("Execution enabled: no");
    expect(report).toContain("Correction Event Intents");
    expect(serialized).not.toContain("org-1");
    expect(serialized).not.toContain("payroll-admin-1");
    expect(serialized).not.toContain("one@example.test");
    expect(serialized).not.toContain("One User");
    expect(serialized).not.toContain("sha256:payment-destination");
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });

  it("accepts a matching signoff bundle but keeps mutation execution disabled", async () => {
    const firstClient = buildClient();
    firstClient.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    firstClient.payrollPaymentBatch.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const unsignedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        now: "2026-06-30T10:00:00.000Z",
      },
      firstClient as any,
    );

    const secondClient = buildClient();
    secondClient.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    secondClient.payrollPaymentBatch.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const signedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        expectedDryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        idempotencyKey: "tenant-proof-backfill-2026-06",
        now: "2026-06-30T10:00:00.000Z",
        signoffBundle: {
          dryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
          approvalTokenHash: "sha256:approval-token",
          payrollAdminApprovedById: "payroll-admin-1",
          accountingControllerApprovedById: "accounting-controller-1",
          securityPrivacyApprovedById: "security-reviewer-1",
          operationsOwnerApprovedById: "ops-owner-1",
          approvedAt: "2026-06-30T09:59:00.000Z",
          approvalNotes: "Reviewed dry-run evidence.",
        },
      },
      secondClient as any,
    );

    expect(signedCertificate.status).toBe("EXECUTION_DISABLED");
    expect(signedCertificate.dryRunEvidenceMatches).toBe(true);
    expect(signedCertificate.missingSignoffs).toEqual([]);
    expect(signedCertificate.adapterChaosReleaseGateHash).toBe(
      "sha256:adapter-chaos-gate",
    );
    expect(signedCertificate.approvalBundleHash).toMatch(/^sha256:/);
    expect(signedCertificate.idempotencyLedger).toEqual(
      expect.objectContaining({
        status: "planned-not-written",
        idempotencyKey: "tenant-proof-backfill-2026-06",
        replayProtection: "dry-run-hash-and-signoff-bundle",
      }),
    );
    expect(signedCertificate.mutationAttempted).toBe(false);
    expect(
      signedCertificate.postRunReconciliationCertificate
        .expectedGapCountsAfterRun,
    ).toEqual({
      payrollRunMissingStatutoryScenarioCoverage: 0,
      declarationEvidenceMissingSourceRegisterHash: 0,
      declarationEvidenceMissingAuthorityAdapterProof: 0,
      declarationEvidenceMissingAuthorityLifecycleProof: 0,
      paymentBatchMissingProviderAdapterProof: 0,
      paymentBatchMissingSettlementRegisterProof: 0,
      paymentBatchMissingSettlementLifecycleProof: 0,
    });
    expect(firstClient.auditLog.create).not.toHaveBeenCalled();
    expect(secondClient.auditLog.create).not.toHaveBeenCalled();
  });

  it("executes signed statutory coverage proof backfill as metadata-only run updates", async () => {
    const firstClient = buildClient();
    firstClient.payrollRun.count.mockResolvedValueOnce(2);

    const unsignedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        now: "2026-06-30T10:00:00.000Z",
      },
      firstClient as any,
    );

    const secondClient = buildClient();
    secondClient.payrollRun.count.mockResolvedValueOnce(2);
    secondClient.payrollRun.findMany.mockResolvedValueOnce([
      {
        id: "run-1",
        runNumber: "PR-2026-0001",
        countryCode: "CM",
        countryPackVersion: "CM-2026.1",
        metadata: { existing: "value" },
        createdAt: new Date("2026-06-30T08:00:00.000Z"),
      },
      {
        id: "run-2",
        runNumber: "PR-2026-0002",
        countryCode: "CM",
        countryPackVersion: "CM-2026.1",
        metadata: null,
        createdAt: new Date("2026-06-30T08:05:00.000Z"),
      },
    ]);

    const signedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        executionMode: "execute",
        executionMutationApproved: true,
        expectedDryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        idempotencyKey: "tenant-proof-backfill-2026-06-execute",
        now: "2026-06-30T10:00:00.000Z",
        persistCertificate: true,
        signoffBundle: {
          dryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
          approvalTokenHash: "sha256:approval-token",
          payrollAdminApprovedById: "payroll-admin-1",
          accountingControllerApprovedById: "accounting-controller-1",
          securityPrivacyApprovedById: "security-reviewer-1",
          operationsOwnerApprovedById: "ops-owner-1",
          approvedAt: "2026-06-30T09:59:00.000Z",
          approvalNotes: "Reviewed statutory coverage backfill evidence.",
        },
      },
      secondClient as any,
    );
    const report = formatPayrollProofBackfillExecutionCertificate(
      signedCertificate,
    );

    expect(signedCertificate.status).toBe("EXECUTION_COMPLETED");
    expect(signedCertificate.executionEnabled).toBe(true);
    expect(signedCertificate.mutationAttempted).toBe(true);
    expect(signedCertificate.missingSignoffs).toEqual([]);
    expect(signedCertificate.blockers).toEqual([]);
    expect(signedCertificate.idempotencyLedger).toEqual(
      expect.objectContaining({
        status: "written",
        idempotencyKey: "tenant-proof-backfill-2026-06-execute",
        replayProtection: "dry-run-hash-and-signoff-bundle",
      }),
    );
    expect(signedCertificate.executedBackfills).toEqual([
      expect.objectContaining({
        target: "PayrollRunStatutoryScenarioCoverageBackfill",
        attemptedCount: 2,
        updatedCount: 2,
        skippedCount: 0,
        metadataOnly: true,
        coverageHashes: expect.arrayContaining([expect.stringMatching(/^sha256:/)]),
        blockerCodes: [],
      }),
    ]);
    expect(secondClient.payrollRun.update).toHaveBeenCalledTimes(2);

    const firstUpdate = secondClient.payrollRun.update.mock.calls[0][0];
    expect(firstUpdate.where).toEqual({ id: "run-1" });
    expect(firstUpdate.data.metadata).toEqual(
      expect.objectContaining({
        existing: "value",
        statutoryScenarioCoverageHash: expect.stringMatching(/^sha256:/),
        statutoryScenarioCoverage: expect.objectContaining({
          status: "READY",
          countryCode: "CM",
          packVersion: "CM-2026.1",
          reviewEvidence: expect.objectContaining({
            sourceEvidenceHashes: expect.arrayContaining([
              expect.stringMatching(/^sha256:/),
            ]),
          }),
        }),
        statutoryScenarioCoverageBackfill: expect.objectContaining({
          kind: "PAYROLL_RUN_STATUTORY_SCENARIO_COVERAGE_BACKFILL",
          metadataOnly: true,
          source: "payroll-proof-backfill-executor",
          ledgerKey: signedCertificate.idempotencyLedger.ledgerKey,
          dryRunEvidenceHash: signedCertificate.dryRunEvidenceHash,
          approvalBundleHash: signedCertificate.approvalBundleHash,
          adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        }),
      }),
    );
    expect(secondClient.auditLog.create).toHaveBeenCalledTimes(1);

    const auditCall = secondClient.auditLog.create.mock.calls[0][0];
    const changes = auditCall.data.changes as any;
    expect(changes.after).toEqual(
      expect.objectContaining({
        status: "EXECUTION_COMPLETED",
        executionEnabled: true,
        mutationAttempted: true,
        executedBackfillCount: 1,
        executedBackfills: signedCertificate.executedBackfills,
      }),
    );
    expect(report).toContain("Execution enabled: yes");
    expect(report).toContain("Mutation attempted: yes");
    expect(report).toContain("Executed Metadata Backfills");

    const serialized = JSON.stringify(changes) + report;
    expect(serialized).not.toContain("one@example.test");
    expect(serialized).not.toContain("One User");
    expect(serialized).not.toContain("sha256:payment-destination");
  });

  it("executes signed declaration register proof backfill by appending AMEND evidence", async () => {
    const firstClient = buildClient();
    firstClient.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const unsignedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS", "payroll.declarations.manage"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        now: "2026-06-30T10:00:00.000Z",
      },
      firstClient as any,
    );

    const secondClient = buildClient();
    secondClient.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    secondClient.payrollDeclarationEvidence.findMany.mockResolvedValueOnce([
      {
        id: "evidence-1",
        declarationId: "declaration-1",
        declaration: {
          id: "declaration-1",
          payrollRun: {
            id: "run-1",
            runNumber: "PR-2026-0001",
            documentHash: "sha256:payroll-register-document",
            evidenceHash: "sha256:payroll-register-evidence",
          },
        },
        createdAt: new Date("2026-06-30T08:00:00.000Z"),
      },
      {
        id: "evidence-2",
        declarationId: "declaration-1",
        declaration: {
          id: "declaration-1",
          payrollRun: {
            id: "run-1",
            runNumber: "PR-2026-0001",
            documentHash: "sha256:payroll-register-document",
            evidenceHash: "sha256:payroll-register-evidence",
          },
        },
        createdAt: new Date("2026-06-30T08:05:00.000Z"),
      },
    ]);

    const signedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS", "payroll.declarations.manage"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        executionMode: "execute",
        executionMutationApproved: true,
        lastAuthAt: "2026-06-30T09:59:30.000Z",
        expectedDryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        idempotencyKey: "tenant-proof-backfill-2026-06-declaration-register",
        now: "2026-06-30T10:00:00.000Z",
        persistCertificate: true,
        signoffBundle: {
          dryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
          approvalTokenHash: "sha256:approval-token",
          payrollAdminApprovedById: "payroll-admin-1",
          accountingControllerApprovedById: "accounting-controller-1",
          securityPrivacyApprovedById: "security-reviewer-1",
          operationsOwnerApprovedById: "ops-owner-1",
          approvedAt: "2026-06-30T09:59:00.000Z",
          approvalNotes: "Reviewed declaration register proof backfill evidence.",
        },
      },
      secondClient as any,
    );

    expect(signedCertificate.status).toBe("EXECUTION_COMPLETED");
    expect(signedCertificate.executionEnabled).toBe(true);
    expect(signedCertificate.mutationAttempted).toBe(true);
    expect(signedCertificate.blockers).toEqual([]);
    expect(signedCertificate.executedBackfills).toEqual([
      expect.objectContaining({
        target: "PayrollDeclarationEvidenceRegisterProofBackfill",
        attemptedCount: 2,
        updatedCount: 1,
        skippedCount: 1,
        coverageHashes: ["sha256:declaration-register-backfill"],
        blockerCodes: [],
      }),
    ]);
    expect(mockedRecordPayrollDeclarationEvidence).toHaveBeenCalledTimes(1);
    expect(mockedRecordPayrollDeclarationEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        declarationId: "declaration-1",
        transition: "amend",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS", "payroll.declarations.manage"],
        lastAuthAt: "2026-06-30T09:59:30.000Z",
        authorityChannel: "PAYROLL_PROOF_BACKFILL",
        authorityEnvironment: "INTERNAL_CONTROL",
        authorityStatus: "REGISTER_PROOF_BACKFILLED",
        supportingFileHash: unsignedCertificate.dryRunEvidenceHash,
        sourceRegisterHash: "sha256:payroll-register-document",
        approvedById: "accounting-controller-1",
        metadata: expect.objectContaining({
          proofBackfill: expect.objectContaining({
            kind: "PAYROLL_DECLARATION_REGISTER_PROOF_BACKFILL",
            appendOnlyEvidence: true,
            coversDeclarationRegisterProof: true,
            coveredEvidenceCount: 2,
            sourceRegisterHash: "sha256:payroll-register-document",
            ledgerKey: signedCertificate.idempotencyLedger.ledgerKey,
            dryRunEvidenceHash: signedCertificate.dryRunEvidenceHash,
            approvalBundleHash: signedCertificate.approvalBundleHash,
            adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
          }),
        }),
      }),
      secondClient as any,
    );
    expect(secondClient.payrollDeclarationEvidence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          declaration: expect.objectContaining({
            evidenceItems: expect.objectContaining({ none: expect.any(Object) }),
          }),
        }),
      }),
    );
    expect(secondClient.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("executes signed declaration authority proof backfill by appending AMEND evidence", async () => {
    const firstClient = buildClient();
    firstClient.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const unsignedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS", "payroll.declarations.manage"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        now: "2026-06-30T10:00:00.000Z",
      },
      firstClient as any,
    );

    const secondClient = buildClient();
    secondClient.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    const authorityRows = [
      {
        id: "evidence-10",
        declarationId: "declaration-10",
        sourceRegisterHash: "sha256:source-register-existing",
        authorityChannel: "CNPS_MANUAL_PORTAL",
        authorityEnvironment: "MANUAL_PORTAL",
        authorityStatus: "SUBMITTED",
        authorityResponseHash: null,
        portalReceiptHash: "sha256:portal-receipt",
        supportingFileHash: null,
        metadata: {
          authorityAdapterKey: "CNPS_MANUAL_PORTAL:MANUAL_CAPTURE",
        },
        declaration: {
          id: "declaration-10",
          status: "SUBMITTED",
          payrollRun: {
            id: "run-10",
            runNumber: "PR-2026-0010",
            documentHash: "sha256:payroll-register-document-10",
            evidenceHash: "sha256:payroll-register-evidence-10",
          },
        },
        createdAt: new Date("2026-06-30T08:00:00.000Z"),
      },
      {
        id: "evidence-11",
        declarationId: "declaration-10",
        sourceRegisterHash: "sha256:source-register-existing",
        authorityChannel: "CNPS_MANUAL_PORTAL",
        authorityEnvironment: "MANUAL_PORTAL",
        authorityStatus: "ACCEPTED",
        authorityResponseHash: "sha256:authority-response",
        portalReceiptHash: null,
        supportingFileHash: null,
        metadata: null,
        declaration: {
          id: "declaration-10",
          status: "SUBMITTED",
          payrollRun: {
            id: "run-10",
            runNumber: "PR-2026-0010",
            documentHash: "sha256:payroll-register-document-10",
            evidenceHash: "sha256:payroll-register-evidence-10",
          },
        },
        createdAt: new Date("2026-06-30T08:05:00.000Z"),
      },
    ];
    secondClient.payrollDeclarationEvidence.findMany
      .mockResolvedValueOnce(authorityRows)
      .mockResolvedValueOnce([authorityRows[0]]);
    mockedRecordPayrollDeclarationEvidence.mockResolvedValueOnce({
      evidence: { evidenceHash: "sha256:declaration-authority-backfill" },
    });

    const signedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS", "payroll.declarations.manage"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        executionMode: "execute",
        executionMutationApproved: true,
        lastAuthAt: "2026-06-30T09:59:30.000Z",
        expectedDryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        idempotencyKey: "tenant-proof-backfill-2026-06-declaration-authority",
        now: "2026-06-30T10:00:00.000Z",
        persistCertificate: true,
        signoffBundle: {
          dryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
          approvalTokenHash: "sha256:approval-token",
          payrollAdminApprovedById: "payroll-admin-1",
          accountingControllerApprovedById: "accounting-controller-1",
          securityPrivacyApprovedById: "security-reviewer-1",
          operationsOwnerApprovedById: "ops-owner-1",
          approvedAt: "2026-06-30T09:59:00.000Z",
          approvalNotes: "Reviewed declaration authority proof backfill evidence.",
        },
      },
      secondClient as any,
    );

    expect(signedCertificate.status).toBe("EXECUTION_COMPLETED");
    expect(signedCertificate.blockers).toEqual([]);
    expect(signedCertificate.executedBackfills).toEqual([
      expect.objectContaining({
        target: "PayrollDeclarationEvidenceAuthorityAdapterProofBackfill",
        attemptedCount: 2,
        updatedCount: 1,
        skippedCount: 1,
        coverageHashes: ["sha256:declaration-authority-backfill"],
        blockerCodes: [],
      }),
      expect.objectContaining({
        target: "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill",
        attemptedCount: 1,
        updatedCount: 1,
        skippedCount: 0,
        coverageHashes: ["sha256:declaration-authority-backfill"],
        blockerCodes: [],
      }),
    ]);
    expect(mockedRecordPayrollDeclarationEvidence).toHaveBeenCalledTimes(1);
    expect(mockedRecordPayrollDeclarationEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        declarationId: "declaration-10",
        transition: "amend",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS", "payroll.declarations.manage"],
        lastAuthAt: "2026-06-30T09:59:30.000Z",
        authorityChannel: "CNPS_MANUAL_PORTAL",
        authorityEnvironment: "MANUAL_PORTAL",
        authorityStatus: "SUBMITTED",
        authorityAdapterKey: "CNPS_MANUAL_PORTAL:MANUAL_CAPTURE",
        portalReceiptHash: "sha256:portal-receipt",
        sourceRegisterHash: "sha256:source-register-existing",
        approvedById: "accounting-controller-1",
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        metadata: expect.objectContaining({
          proofBackfill: expect.objectContaining({
            kind: "PAYROLL_DECLARATION_AUTHORITY_PROOF_BACKFILL",
            appendOnlyEvidence: true,
            coversDeclarationAuthorityAdapterProof: true,
            coversDeclarationAuthorityLifecycleProof: true,
            coveredAdapterEvidenceCount: 2,
            coveredLifecycleEvidenceCount: 1,
            coveredEvidenceCount: 2,
            sourceRegisterHash: "sha256:source-register-existing",
            ledgerKey: signedCertificate.idempotencyLedger.ledgerKey,
            dryRunEvidenceHash: signedCertificate.dryRunEvidenceHash,
            approvalBundleHash: signedCertificate.approvalBundleHash,
            adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
          }),
        }),
      }),
      secondClient as any,
    );
    expect(secondClient.payrollDeclarationEvidence.findMany).toHaveBeenCalledTimes(2);
    expect(secondClient.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it("executes signed payment proof backfill as metadata-only batch correction", async () => {
    const firstClient = buildClient();
    firstClient.payrollPaymentBatch.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const unsignedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS", "payroll.payments.reconcile"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        now: "2026-06-30T10:00:00.000Z",
      },
      firstClient as any,
    );

    const secondClient = buildClient();
    secondClient.payrollPaymentBatch.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    const paymentBatch = {
      id: "payment-batch-1",
      batchNumber: "PAY-2026-0001",
      status: "SETTLED",
      method: "CASH",
      bankFileHash: null,
      documentHash: "sha256:payment-batch-document",
      evidenceHash: "sha256:payment-batch-evidence",
      metadata: {
        providerEventId: "provider-event-1",
        latestSettlementEvidenceHash: "sha256:settlement-evidence",
      },
      payrollRun: {
        id: "run-1",
        runNumber: "PR-2026-0001",
        documentHash: "sha256:payroll-register-document",
        evidenceHash: "sha256:payroll-register-evidence",
      },
      createdAt: new Date("2026-06-30T08:00:00.000Z"),
    };
    secondClient.payrollPaymentBatch.findMany
      .mockResolvedValueOnce([paymentBatch])
      .mockResolvedValueOnce([paymentBatch])
      .mockResolvedValueOnce([paymentBatch]);

    const signedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS", "payroll.payments.reconcile"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        executionMode: "execute",
        executionMutationApproved: true,
        lastAuthAt: "2026-06-30T09:59:30.000Z",
        expectedDryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        idempotencyKey: "tenant-proof-backfill-2026-06-payment",
        now: "2026-06-30T10:00:00.000Z",
        persistCertificate: true,
        signoffBundle: {
          dryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
          approvalTokenHash: "sha256:approval-token",
          payrollAdminApprovedById: "payroll-admin-1",
          accountingControllerApprovedById: "accounting-controller-1",
          securityPrivacyApprovedById: "security-reviewer-1",
          operationsOwnerApprovedById: "ops-owner-1",
          approvedAt: "2026-06-30T09:59:00.000Z",
          approvalNotes: "Reviewed payment proof backfill evidence.",
        },
      },
      secondClient as any,
    );

    expect(signedCertificate.status).toBe("EXECUTION_COMPLETED");
    expect(signedCertificate.blockers).toEqual([]);
    expect(signedCertificate.executedBackfills).toEqual([
      expect.objectContaining({
        target: "PayrollPaymentBatchProviderAdapterProofBackfill",
        attemptedCount: 1,
        updatedCount: 1,
        skippedCount: 0,
        blockerCodes: [],
      }),
      expect.objectContaining({
        target: "PayrollPaymentSettlementRegisterProofBackfill",
        attemptedCount: 1,
        updatedCount: 1,
        skippedCount: 0,
        blockerCodes: [],
      }),
      expect.objectContaining({
        target: "PayrollPaymentSettlementLifecycleProofBackfill",
        attemptedCount: 1,
        updatedCount: 1,
        skippedCount: 0,
        blockerCodes: [],
      }),
    ]);
    expect(secondClient.payrollPaymentBatch.update).toHaveBeenCalledTimes(1);
    expect(secondClient.payrollPaymentBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payment-batch-1" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            paymentAdapterProofHash: expect.stringMatching(/^sha256:/),
            paymentProviderAdapterContractHash: expect.stringMatching(/^sha256:/),
            latestSettlementSourceRegisterHash:
              "sha256:payment-batch-document",
            latestSettlementLifecycleContractHash:
              expect.stringMatching(/^sha256:/),
            latestSettlementLifecycleStatus:
              "SETTLED_WITH_PROVIDER_EVIDENCE",
            proofBackfill: expect.objectContaining({
              kind: "PAYROLL_PAYMENT_BATCH_PROOF_BACKFILL",
              metadataOnly: true,
              coversPaymentProviderAdapterProof: true,
              coversPaymentSettlementRegisterProof: true,
              coversPaymentSettlementLifecycleProof: true,
              ledgerKey: signedCertificate.idempotencyLedger.ledgerKey,
              dryRunEvidenceHash: signedCertificate.dryRunEvidenceHash,
              approvalBundleHash: signedCertificate.approvalBundleHash,
              adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
            }),
          }),
        }),
      }),
    );
    expect(secondClient.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it("persists a redacted certificate audit row when requested and signed", async () => {
    const firstClient = buildClient();
    firstClient.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    firstClient.payrollPaymentBatch.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);

    const unsignedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        now: "2026-06-30T10:00:00.000Z",
      },
      firstClient as any,
    );

    const secondClient = buildClient();
    secondClient.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    secondClient.payrollPaymentBatch.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);

    const signedCertificate = await preparePayrollProofBackfillExecution(
      {
        organizationId: "org-1",
        actorId: "payroll-admin-1",
        actorPermissions: ["PAYROLL_PROCESS"],
        countryCode: "CM",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        employeeSourceMode: "users",
        expectedDryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        idempotencyKey: "tenant-proof-backfill-2026-06-audit",
        now: "2026-06-30T10:00:00.000Z",
        persistCertificate: true,
        signoffBundle: {
          dryRunEvidenceHash: unsignedCertificate.dryRunEvidenceHash,
          approvalTokenHash: "sha256:approval-token",
          payrollAdminApprovedById: "payroll-admin-1",
          accountingControllerApprovedById: "accounting-controller-1",
          securityPrivacyApprovedById: "security-reviewer-1",
          operationsOwnerApprovedById: "ops-owner-1",
          approvedAt: "2026-06-30T09:59:00.000Z",
          approvalNotes: "Reviewed dry-run evidence.",
        },
      },
      secondClient as any,
    );

    expect(signedCertificate.status).toBe("EXECUTION_DISABLED");
    expect(signedCertificate.executionEnabled).toBe(false);
    expect(signedCertificate.mutationAttempted).toBe(false);
    expect(signedCertificate.persistence).toEqual({
      requested: true,
      persisted: true,
      auditLogId: "audit-proof-backfill-1",
      entityType: "PayrollProofBackfillExecutionCertificate",
      auditAction: "PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE_RECORDED",
    });
    expect(firstClient.auditLog.create).not.toHaveBeenCalled();
    expect(secondClient.auditLog.create).toHaveBeenCalledTimes(1);

    const auditCall = secondClient.auditLog.create.mock.calls[0][0];
    expect(auditCall).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "PayrollProofBackfillExecutionCertificate",
          entityId: signedCertificate.idempotencyLedger.ledgerKey,
          action: "PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE_RECORDED",
          userId: "payroll-admin-1",
          organizationId: "org-1",
        }),
      }),
    );

    const changes = auditCall.data.changes as any;
    expect(changes.after).toEqual(
      expect.objectContaining({
        certificateHash: signedCertificate.certificateHash,
        dryRunEvidenceHash: signedCertificate.dryRunEvidenceHash,
        status: "EXECUTION_DISABLED",
        executionEnabled: false,
        mutationAttempted: false,
        approvalBundleHash: signedCertificate.approvalBundleHash,
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        correctionIntentCount: 2,
        redaction: expect.objectContaining({
          rawPersonDataIncluded: false,
          rawPaymentDestinationIncluded: false,
          rawSalaryIncluded: false,
          rawProviderPayloadIncluded: false,
        }),
      }),
    );
    expect(changes.after.proofBackfill).toEqual(
      expect.objectContaining({
        totalBlockingGaps: 3,
        plannedJobCount: 7,
        gapCounts: expect.objectContaining({
          declarationEvidenceMissingAuthorityLifecycleProof: 1,
          paymentBatchMissingSettlementLifecycleProof: 2,
        }),
      }),
    );
    expect(changes.after.idempotencyLedger).toEqual(
      signedCertificate.idempotencyLedger,
    );

    const serializedChanges = JSON.stringify(changes);
    expect(serializedChanges).not.toContain("org-1");
    expect(serializedChanges).not.toContain("payroll-admin-1");
    expect(serializedChanges).not.toContain("accounting-controller-1");
    expect(serializedChanges).not.toContain("security-reviewer-1");
    expect(serializedChanges).not.toContain("ops-owner-1");
    expect(serializedChanges).not.toContain("one@example.test");
    expect(serializedChanges).not.toContain("One User");
    expect(serializedChanges).not.toContain("sha256:payment-destination");
  });
});
