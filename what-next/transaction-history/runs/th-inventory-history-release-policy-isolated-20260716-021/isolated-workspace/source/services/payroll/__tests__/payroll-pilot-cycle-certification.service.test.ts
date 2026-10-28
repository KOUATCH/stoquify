import {
  CloseRunStatus,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollRunStatus,
} from "@prisma/client";

jest.mock("../../../prisma/db", () => ({
  db: {},
}));

import {
  certifyPayrollPilotCycle,
  formatPayrollPilotCycleCertificationCertificate,
} from "../payroll-pilot-cycle-certification.service";

const ORGANIZATION_ID = "org-1";
const PAYROLL_RUN_ID = "run-1";
const SOURCE_REGISTER_HASH = "sha256:register-proof";
const ADAPTER_CHAOS_HASH = "sha256:adapter-chaos-gate";
const BACKFILL_CERTIFICATE_HASH = "sha256:backfill-certificate";

function proofBackfillCertificate(overrides: Record<string, unknown> = {}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE",
    version: 1,
    status: "READY_FOR_CLOSE_RECHECK",
    certificateHash: BACKFILL_CERTIFICATE_HASH,
    sourceCertificate: {
      adapterChaosReleaseGateHash: ADAPTER_CHAOS_HASH,
      adapterChaosReleaseGateHashMatches: true,
    },
    dataTrustProofGate: {
      status: "READY",
      blockerIds: [],
    },
    ...overrides,
  } as never;
}

function completeSignoffs() {
  return {
    payrollAdmin: {
      approvedById: "payroll-admin-1",
      approvedAt: "2026-06-30T08:00:00.000Z",
      evidenceHash: "sha256:payroll-admin-signoff",
    },
    accountingController: {
      approvedById: "accounting-controller-1",
      approvedAt: "2026-06-30T08:05:00.000Z",
      evidenceHash: "sha256:accounting-signoff",
    },
    securityPrivacy: {
      approvedById: "security-owner-1",
      approvedAt: "2026-06-30T08:10:00.000Z",
      evidenceHash: "sha256:security-signoff",
    },
    operationsOwner: {
      approvedById: "operations-owner-1",
      approvedAt: "2026-06-30T08:15:00.000Z",
      evidenceHash: "sha256:operations-signoff",
    },
  };
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: ORGANIZATION_ID,
    payrollRunId: PAYROLL_RUN_ID,
    actorId: "controller-1",
    actorPermissions: ["payroll.command.read"],
    expectedSourceRegisterHash: SOURCE_REGISTER_HASH,
    expectedAdapterChaosReleaseGateHash: ADAPTER_CHAOS_HASH,
    expectedProofBackfillCertificateHash: BACKFILL_CERTIFICATE_HASH,
    proofBackfillReconciliationCertificate: proofBackfillCertificate(),
    signoffBundle: completeSignoffs(),
    now: "2026-06-30T09:00:00.000Z",
    persistCertificate: false,
    ...overrides,
  };
}

function cleanRun() {
  return {
    id: PAYROLL_RUN_ID,
    organizationId: ORGANIZATION_ID,
    payrollPeriodId: "period-1",
    runNumber: "PAY-2026-06",
    status: PayrollRunStatus.PAID,
    countryCode: "CM",
    countryPackVersion: "cm-payroll-2026.06",
    countryPackSchemaVersion: "1",
    countryPackResolutionHash: "sha256:country-pack",
    calculationHash: "sha256:calculation",
    attendanceSnapshotHash: "sha256:attendance",
    documentHash: "sha256:run-document",
    evidenceHash: SOURCE_REGISTER_HASH,
    ledgerPostingBatchId: "ledger-run-1",
    postedBusinessEventId: "event-run-posted",
    journalEntryId: "journal-run-1",
    accountingSourceLinkId: "source-link-run-1",
    metadata: {
      componentRegisterProofHash: "sha256:component-register",
      componentRegisterProofStatus: "MATCHED",
      payrollComponentMappingHash: "sha256:component-mapping",
      payrollComponentMappingStatus: "REVIEWED",
    },
    payrollPeriod: {
      id: "period-1",
      name: "June 2026",
      accountingPeriodId: "accounting-period-1",
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      periodEnd: new Date("2026-06-30T00:00:00.000Z"),
      payDate: new Date("2026-06-30T00:00:00.000Z"),
    },
    lines: [
      {
        id: "line-1",
        documentHash: "sha256:line-1",
        metadata: {},
        payslip: {
          id: "payslip-1",
          status: PayrollPayslipStatus.EMITTED,
          documentHash: "sha256:payslip-1",
          issuedAt: new Date("2026-06-30T07:00:00.000Z"),
        },
      },
    ],
    declarations: [
      {
        id: "declaration-1",
        status: PayrollDeclarationStatus.RECONCILED,
        authority: "CNPS",
        declarationType: "SOCIAL_CONTRIBUTIONS",
        payloadHash: "sha256:declaration-payload",
        metadata: {},
        evidenceItems: [
          {
            id: "declaration-evidence-1",
            evidenceHash: "sha256:declaration-evidence",
            sourceRegisterHash: SOURCE_REGISTER_HASH,
            authorityResponseHash: "sha256:authority-response",
            portalReceiptHash: "sha256:authority-receipt",
            productionSubmissionSupported: true,
            automationCapabilityStatus: "PRODUCTION_SUPPORTED",
            metadata: {
              authorityAdapterProofHash: "sha256:authority-adapter-proof",
              authorityAdapterContractHash: "sha256:authority-contract",
              authorityLifecycleContractHash: "sha256:authority-lifecycle",
              authorityLifecycleStatus: "CLOSE_IMPACT_RECONCILED",
              adapterChaosReleaseGateHash: ADAPTER_CHAOS_HASH,
              authorityCertificationHarnessHash: "sha256:authority-harness",
            },
            createdAt: new Date("2026-06-30T07:30:00.000Z"),
          },
        ],
      },
    ],
    paymentBatches: [
      {
        id: "payment-batch-1",
        status: PayrollPaymentBatchStatus.SETTLED,
        evidenceHash: "sha256:payment-evidence",
        bankFileHash: "sha256:bank-file",
        ledgerPostingBatchId: "ledger-payment-1",
        paymentTransactionId: "payment-transaction-1",
        reconciliationStatus: "SETTLED",
        metadata: {
          latestSettlementSourceRegisterHash: SOURCE_REGISTER_HASH,
          componentRegisterProofHash: "sha256:component-register",
          componentRegisterProofStatus: "MATCHED",
          payrollComponentMappingHash: "sha256:component-mapping",
          payrollComponentMappingStatus: "REVIEWED",
          paymentAdapterProofHash: "sha256:payment-adapter-proof",
          paymentProviderAdapterContractHash: "sha256:provider-contract",
          paymentAdapterStatus: "CERTIFIED",
          paymentProviderAdapterKey: "sandbox-provider",
          adapterChaosReleaseGateHash: ADAPTER_CHAOS_HASH,
          latestSettlementLifecycleContractHash: "sha256:settlement-lifecycle",
          latestSettlementLifecycleStatus: "CLOSE_IMPACT_RECONCILED",
        },
        allocations: [{ id: "allocation-1", payslipId: "payslip-1" }],
      },
    ],
    employeeBalanceCases: [],
  };
}

function clientFor(run = cleanRun()) {
  return {
    payrollRun: {
      findFirst: jest.fn().mockResolvedValue(run),
    },
    closeRun: {
      findFirst: jest.fn().mockResolvedValue({
        id: "close-run-1",
        status: CloseRunStatus.READY,
      }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  } as never;
}

describe("certifyPayrollPilotCycle", () => {
  it("certifies a clean controlled pilot payroll cycle with proof continuity and signoffs", async () => {
    const client = clientFor();

    const result = await certifyPayrollPilotCycle(
      baseInput({ persistCertificate: true }),
      client,
    );

    expect(result.status).toBe("CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW");
    expect(result.blockers).toEqual([]);
    expect(result.certificateHash).toMatch(/^sha256:/);
    expect(result.signoff.bundleHash).toMatch(/^sha256:/);
    expect(result.proofContinuity).toEqual(
      expect.objectContaining({
        expectedSourceRegisterHash: SOURCE_REGISTER_HASH,
        expectedAdapterChaosReleaseGateHash: ADAPTER_CHAOS_HASH,
        declarationSourceRegisterHashes: [SOURCE_REGISTER_HASH],
        paymentSourceRegisterHashes: [SOURCE_REGISTER_HASH],
        declarationAdapterChaosReleaseGateHashes: [ADAPTER_CHAOS_HASH],
        paymentAdapterChaosReleaseGateHashes: [ADAPTER_CHAOS_HASH],
        proofBackfillAdapterChaosMatchesExpected: true,
      }),
    );
    expect(result.persistence).toEqual(
      expect.objectContaining({
        persisted: true,
        auditLogId: "audit-1",
      }),
    );
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "PayrollPilotCycleCertification",
          entityId: PAYROLL_RUN_ID,
          action: "PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED",
          organizationId: ORGANIZATION_ID,
        }),
      }),
    );
  });

  it("loads the latest persisted proof-backfill reconciliation certificate when omitted", async () => {
    const client = clientFor() as any;
    client.auditLog.findFirst.mockResolvedValue({
      id: "reconciliation-audit-1",
      changes: {
        after: proofBackfillCertificate(),
      },
    });

    const result = await certifyPayrollPilotCycle(
      baseInput({ proofBackfillReconciliationCertificate: null }),
      client,
    );

    expect(result.status).toBe("CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW");
    expect(result.proofContinuity.proofBackfillAdapterChaosMatchesExpected).toBe(true);
    expect(client.auditLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORGANIZATION_ID,
          entityType: "PayrollProofBackfillReconciliationCertificate",
          action: "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED",
        }),
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("blocks certification when declaration and payment adapter chaos proof is missing", async () => {
    const run = cleanRun();
    run.declarations[0].evidenceItems[0].metadata = {
      ...run.declarations[0].evidenceItems[0].metadata,
      adapterChaosReleaseGateHash: undefined,
    };
    run.paymentBatches[0].metadata = {
      ...run.paymentBatches[0].metadata,
      adapterChaosReleaseGateHash: undefined,
    };
    const client = clientFor(run);

    const result = await certifyPayrollPilotCycle(baseInput(), client);
    const blockerCodes = result.blockers.map((blocker) => blocker.code);

    expect(result.status).toBe("BLOCKED");
    expect(blockerCodes).toEqual(
      expect.arrayContaining([
        "PILOT_DECLARATION_ADAPTER_CHAOS_HASH_MISSING",
        "PILOT_PAYMENT_ADAPTER_CHAOS_HASH_MISSING",
      ]),
    );
  });

  it("blocks certification when component mapping still requires expert review", async () => {
    const run = cleanRun();
    run.metadata = {
      ...(run.metadata as Record<string, unknown>),
      payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
    };
    const client = clientFor(run);

    const result = await certifyPayrollPilotCycle(baseInput(), client);
    const blockerCodes = result.blockers.map((blocker) => blocker.code);

    expect(result.status).toBe("BLOCKED");
    expect(result.payrollRun.payrollComponentMappingStatus).toBe("BLOCKED_REQUIRES_EXPERT_REVIEW");
    expect(blockerCodes).toContain("PILOT_COMPONENT_MAPPING_NOT_REVIEWED");
  });

  it("returns ready for signoff when evidence is clean but required signoffs are missing", async () => {
    const client = clientFor();

    const result = await certifyPayrollPilotCycle(
      baseInput({ signoffBundle: null }),
      client,
    );

    expect(result.status).toBe("READY_FOR_SIGNOFF");
    expect(result.blockers).toEqual([]);
    expect(result.signoff.missingRoles).toEqual([
      "payroll-admin",
      "accounting-controller",
      "security-privacy",
      "operations-owner",
    ]);
    expect(result.signoff.bundleHash).toBeNull();
  });

  it("keeps employee, salary, payment destination, and provider payload details out of the certificate", async () => {
    const run = cleanRun();
    (run.lines[0] as Record<string, unknown>).employee = {
      displayName: "Jane Secret",
      employeeNumber: "EMP-0001",
    };
    run.paymentBatches[0].metadata = {
      ...run.paymentBatches[0].metadata,
      rawProviderPayload: "provider-sensitive-payload",
      paymentDestination: "bank-account-000123",
      grossAmount: "999999",
    };
    const client = clientFor(run);

    const result = await certifyPayrollPilotCycle(baseInput(), client);
    const formatted = formatPayrollPilotCycleCertificationCertificate(result);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW");
    expect(serialized).not.toContain("Jane Secret");
    expect(serialized).not.toContain("EMP-0001");
    expect(serialized).not.toContain("provider-sensitive-payload");
    expect(serialized).not.toContain("bank-account-000123");
    expect(serialized).not.toContain("999999");
    expect(formatted).toContain("Payroll Controlled Pilot Cycle Certificate");
    expect(result.redaction).toEqual(
      expect.objectContaining({
        rawPersonDataIncluded: false,
        rawSalaryIncluded: false,
        rawPaymentDestinationIncluded: false,
        rawProviderPayloadIncluded: false,
        rawAuthorityPayloadIncluded: false,
      }),
    );
  });
});
