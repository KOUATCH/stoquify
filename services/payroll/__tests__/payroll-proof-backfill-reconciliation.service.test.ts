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
  formatPayrollProofBackfillReconciliationCertificate,
  reconcilePayrollProofBackfillCertificate,
} from "../payroll-proof-backfill-reconciliation.service";

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

function sourceCertificate(overrides: Record<string, unknown> = {}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE",
    version: 1,
    status: "EXECUTION_DISABLED",
    executionMode: "validate",
    executionEnabled: false,
    mutationAttempted: false,
    generatedAt: "2026-06-30T10:00:00.000Z",
    organizationRef: "redacted:org",
    actorRef: "redacted:actor",
    certificateHash: "sha256:source-certificate",
    dryRunEvidenceHash: "sha256:source-dry-run",
    adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
    expectedDryRunEvidenceHash: "sha256:source-dry-run",
    dryRunEvidenceMatches: true,
    approvalBundleHash: "sha256:approval-bundle",
    missingSignoffs: [],
    idempotencyLedger: {
      status: "planned-not-written",
      idempotencyKey: "tenant-proof-backfill-2026-06",
      ledgerKey: "sha256:source-ledger",
      replayProtection: "dry-run-hash-and-signoff-bundle",
    },
    proofBackfill: {
      evidenceRef: "payroll-proof-backfill-dry-run:source",
      totalBlockingGaps: 3,
      gapCounts: {
        declarationEvidenceMissingSourceRegisterHash: 0,
        declarationEvidenceMissingAuthorityAdapterProof: 0,
        declarationEvidenceMissingAuthorityLifecycleProof: 1,
        paymentBatchMissingProviderAdapterProof: 0,
        paymentBatchMissingSettlementRegisterProof: 0,
        paymentBatchMissingSettlementLifecycleProof: 2,
      },
      plannedJobCount: 6,
      requiredSignoffs: [
        "payroll-admin",
        "accounting-controller",
        "security-privacy",
        "operations-owner",
      ],
    },
    correctionIntentCount: 2,
    blockers: [],
    redaction: {
      rawPersonDataIncluded: false,
      rawPaymentDestinationIncluded: false,
      rawSalaryIncluded: false,
      rawProviderPayloadIncluded: false,
    },
    ...overrides,
  };
}

function sourceAuditLog(after = sourceCertificate()) {
  return {
    id: "audit-source-1",
    entityId: "sha256:source-ledger",
    createdAt: new Date("2026-06-30T10:05:00.000Z"),
    changes: {
      before: null,
      after,
    },
  };
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
    auditLog: {
      findFirst: jest.fn().mockResolvedValue(sourceAuditLog()),
      create: jest.fn().mockResolvedValue({ id: "audit-reconciliation-1" }),
    },
  };
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    actorId: "payroll-admin-1",
    actorPermissions: ["PAYROLL_PROCESS"],
    countryCode: "CM",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    payDate: "2026-06-30",
    employeeSourceMode: "users" as const,
    sourceCertificateAuditLogId: "audit-source-1",
    expectedSourceCertificateHash: "sha256:source-certificate",
    expectedSourceDryRunEvidenceHash: "sha256:source-dry-run",
    expectedAdapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
    now: "2026-06-30T12:00:00.000Z",
    ...overrides,
  };
}

describe("payroll proof backfill reconciliation service", () => {
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

  it("requires a persisted source certificate selector before tenant scans", async () => {
    const client = buildClient();

    await expect(
      reconcilePayrollProofBackfillCertificate(
        baseInput({
          sourceCertificateAuditLogId: null,
          sourceCertificateLedgerKey: null,
        }),
        client as any,
      ),
    ).rejects.toThrow("requires a persisted execution certificate");

    expect(client.auditLog.findFirst).not.toHaveBeenCalled();
    expect(client.organization.findFirst).not.toHaveBeenCalled();
    expect(client.payrollRun.count).not.toHaveBeenCalled();
    expect(client.payrollDeclarationEvidence.count).not.toHaveBeenCalled();
  });

  it("rejects a missing source certificate without scanning payroll history", async () => {
    const client = buildClient();
    client.auditLog.findFirst.mockResolvedValue(null);

    await expect(
      reconcilePayrollProofBackfillCertificate(baseInput(), client as any),
    ).rejects.toThrow("was not found for this tenant");

    expect(client.auditLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "audit-source-1",
          organizationId: "org-1",
          entityType: "PayrollProofBackfillExecutionCertificate",
        }),
      }),
    );
    expect(client.organization.findFirst).not.toHaveBeenCalled();
    expect(client.payrollPaymentBatch.count).not.toHaveBeenCalled();
  });

  it("persists a ready redacted reconciliation certificate when proof gaps are cleared", async () => {
    const client = buildClient();

    const certificate = await reconcilePayrollProofBackfillCertificate(
      baseInput({ persistCertificate: true }),
      client as any,
    );
    const report =
      formatPayrollProofBackfillReconciliationCertificate(certificate);

    expect(certificate.status).toBe("READY_FOR_CLOSE_RECHECK");
    expect(certificate.sourceCertificate.validated).toBe(true);
    expect(certificate.sourceCertificate.adapterChaosReleaseGateHash).toBe(
      "sha256:adapter-chaos-gate",
    );
    expect(
      certificate.sourceCertificate.adapterChaosReleaseGateHashMatches,
    ).toBe(true);
    expect(certificate.currentProofBackfill.totalBlockingGaps).toBe(0);
    expect(certificate.currentProofBackfill.postMigrationProofGapsCleared).toBe(
      true,
    );
    expect(certificate.dataTrustProofGate).toEqual(
      expect.objectContaining({ status: "READY", blockerIds: [] }),
    );
    expect(certificate.setupGate.statutoryScenarioCoverage).toEqual(
      expect.objectContaining({
        status: "READY",
        countryCode: "CM",
        packVersion: "CM-2026.1",
        coverageHash: expect.stringMatching(/^sha256:/),
        executableScenarioCount: 12,
        readyFamilyCount: 9,
        requiredFamilyCount: 9,
        blockerCodes: [],
        requiredReviewTopics: [],
        reviewEvidence: expect.objectContaining({
          missingCount: 0,
          sourceEvidenceHashes: expect.arrayContaining([
            "sha256:cm-irpp-period-reviewed-review-evidence",
          ]),
        }),
      }),
    );
    expect(certificate.persistence).toEqual({
      requested: true,
      persisted: true,
      auditLogId: "audit-reconciliation-1",
      entityType: "PayrollProofBackfillReconciliationCertificate",
      auditAction: "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED",
    });
    expect(report).toContain("Post-migration proof gaps cleared: true");
    expect(report).toContain("Data-trust proof gate: READY");
    expect(report).toContain("## Statutory Scenario Coverage");
    expect(report).toContain("- Status: READY");
    expect(report).toContain("- Required legal review topics: None");
    expect(report).toContain(
      "Source adapter chaos gate hash: sha256:adapter-chaos-gate",
    );
    expect(client.auditLog.create).toHaveBeenCalledTimes(1);

    const auditCall = client.auditLog.create.mock.calls[0][0];
    expect(auditCall).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "PayrollProofBackfillReconciliationCertificate",
          entityId: "sha256:source-ledger",
          action: "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED",
          userId: "payroll-admin-1",
          organizationId: "org-1",
        }),
      }),
    );
    expect(auditCall.data.changes.after).toEqual(
      expect.objectContaining({
        status: "READY_FOR_CLOSE_RECHECK",
        certificateHash: certificate.certificateHash,
        currentProofBackfill: expect.objectContaining({
          totalBlockingGaps: 0,
          postMigrationProofGapsCleared: true,
        }),
        setupGate: expect.objectContaining({
          statutoryScenarioCoverage: expect.objectContaining({
            status: "READY",
            coverageHash: certificate.setupGate.statutoryScenarioCoverage.coverageHash,
            requiredReviewTopics: [],
          }),
        }),
        redaction: expect.objectContaining({
          rawPersonDataIncluded: false,
          rawPaymentDestinationIncluded: false,
          rawSalaryIncluded: false,
          rawProviderPayloadIncluded: false,
        }),
      }),
    );

    const serialized =
      JSON.stringify(certificate) + JSON.stringify(auditCall.data.changes);
    expect(serialized).not.toContain("org-1");
    expect(serialized).not.toContain("payroll-admin-1");
    expect(serialized).not.toContain("audit-source-1");
    expect(serialized).not.toContain("one@example.test");
    expect(serialized).not.toContain("One User");
    expect(serialized).not.toContain("sha256:payment-destination");
  });

  it("blocks reconciliation when source certificate hash does not match approval evidence", async () => {
    const client = buildClient();

    const certificate = await reconcilePayrollProofBackfillCertificate(
      baseInput({ expectedSourceCertificateHash: "sha256:wrong" }),
      client as any,
    );

    expect(certificate.status).toBe("BLOCKED_BY_SOURCE_CERTIFICATE");
    expect(certificate.sourceCertificate.validated).toBe(false);
    expect(certificate.sourceCertificate.validationBlockers).toEqual(
      expect.arrayContaining(["SOURCE_CERTIFICATE_HASH_MISMATCH"]),
    );
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });

  it("blocks close recheck when source certificate is missing adapter chaos gate proof", async () => {
    const client = buildClient();
    client.auditLog.findFirst.mockResolvedValue(
      sourceAuditLog(
        sourceCertificate({ adapterChaosReleaseGateHash: null }),
      ),
    );

    const certificate = await reconcilePayrollProofBackfillCertificate(
      baseInput(),
      client as any,
    );

    expect(certificate.status).toBe("BLOCKED_BY_SOURCE_CERTIFICATE");
    expect(certificate.sourceCertificate.validated).toBe(false);
    expect(certificate.sourceCertificate.validationBlockers).toEqual(
      expect.arrayContaining([
        "SOURCE_ADAPTER_CHAOS_RELEASE_GATE_HASH_MISSING",
      ]),
    );
    expect(certificate.sourceCertificate.adapterChaosReleaseGateHash).toBeNull();
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });

  it("keeps data-trust proof blockers when current proof gaps remain", async () => {
    const client = buildClient();
    client.payrollDeclarationEvidence.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    client.payrollPaymentBatch.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);

    const certificate = await reconcilePayrollProofBackfillCertificate(
      baseInput(),
      client as any,
    );

    expect(certificate.status).toBe("PROOF_GAPS_REMAIN");
    expect(certificate.currentProofBackfill.totalBlockingGaps).toBe(3);
    expect(certificate.currentProofBackfill.postMigrationProofGapsCleared).toBe(
      false,
    );
    expect(certificate.dataTrustProofGate.status).toBe("BLOCKED");
    expect(certificate.dataTrustProofGate.blockerIds).toEqual(
      expect.arrayContaining([
        "payroll-declaration-authority-lifecycle-proof-missing",
        "payroll-payment-settlement-lifecycle-proof-missing",
      ]),
    );
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });
});
