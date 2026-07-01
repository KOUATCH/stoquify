jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    payrollRun: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    ledgerPostingBatch: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
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

import {
  AccountingPostingPurpose,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PayrollDeclarationStatus,
  PayrollEmployeeBalanceCaseStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  PayrollRunType,
  Prisma,
} from "@prisma/client";

import { db } from "@/prisma/db";

import { getPayrollRunWorkbenchData } from "../payroll-control.service";

const mockDb = db as unknown as {
  payrollRun: {
    findMany: jest.Mock;
    count: jest.Mock;
    aggregate: jest.Mock;
  };
  ledgerPostingBatch: {
    findMany: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
  user: {
    findMany: jest.Mock;
  };
};

describe("payroll run workbench service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mockDb.user.findMany.mockResolvedValue([]);
  });

  it("builds a proof-backed run lifecycle read model with close blockers", async () => {
    const periodStart = new Date("2026-06-01T00:00:00.000Z");
    const periodEnd = new Date("2026-06-30T23:59:59.999Z");
    const payDate = new Date("2026-07-05T00:00:00.000Z");

    mockDb.payrollRun.findMany.mockResolvedValue([
      {
        id: "run-1",
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        originalRunId: "original-run-1",
        originalRun: { id: "original-run-1", runNumber: "RUN-2026-05" },
        runNumber: "RUN-2026-06-CORR",
        runType: PayrollRunType.CORRECTION,
        status: PayrollRunStatus.POSTED,
        version: 2,
        countryCode: "CM",
        countryPackVersion: "CM-2026.1",
        countryPackSchemaVersion: "country-pack.v1",
        countryPackResolutionHash: "sha256:country-pack",
        countryPackCapabilityStatus: "SUPPORTED",
        ruleSetHash: "sha256:rules",
        calculationHash: "sha256:calc",
        attendanceSnapshotHash: "sha256:attendance",
        grossAmount: new Prisma.Decimal("120000.00"),
        employeeDeductionAmount: new Prisma.Decimal("24200.00"),
        employerChargeAmount: new Prisma.Decimal("17150.00"),
        netPayableAmount: new Prisma.Decimal("95800.00"),
        currency: "XAF",
        documentHash: "sha256:run-doc",
        evidenceHash: "sha256:run-evidence",
        ledgerPostingBatchId: "ledger-batch-1",
        postedBusinessEventId: "event-posted-1",
        journalEntryId: "journal-1",
        accountingSourceLinkId: "source-link-1",
        preparedById: "preparer-1",
        reviewedById: "reviewer-1",
        approvedById: "approver-1",
        emittedById: "emitter-1",
        postedById: "poster-1",
        approvedAt: new Date("2026-06-30T09:00:00.000Z"),
        emittedAt: new Date("2026-06-30T09:10:00.000Z"),
        postedAt: new Date("2026-06-30T09:20:00.000Z"),
        metadata: {
          componentRegisterProofHash: "sha256:component-register",
          payrollComponentMappingHash: "sha256:component-mapping",
          correction: {
            originalRunId: "original-run-1",
            originalRunNumber: "RUN-2026-05",
            originalRunDocumentHash: "sha256:original-run-doc",
            originalRunEvidenceHash: "sha256:original-run-evidence",
            originalCalculationHash: "sha256:original-calc",
            correctionEvidenceHash: "sha256:correction-evidence",
          },
        },
        payrollPeriod: {
          id: "period-1",
          name: "June 2026",
          status: PayrollPeriodStatus.POSTED,
          periodStart,
          periodEnd,
          payDate,
        },
        _count: {
          lines: 2,
          payslips: 2,
          declarations: 1,
          paymentBatches: 1,
          employeeBalanceCases: 1,
          correctiveRuns: 0,
        },
        declarations: [
          {
            id: "declaration-1",
            authority: "CM_CNPS",
            declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
            status: PayrollDeclarationStatus.REJECTED,
            amount: new Prisma.Decimal("17150.00"),
            currency: "XAF",
            dueDate: new Date("2026-07-15T00:00:00.000Z"),
            payloadHash: "sha256:payload",
            evidenceItems: [
              {
                evidenceHash: "sha256:declaration-evidence",
                sourceRegisterHash: null,
                automationCapabilityStatus: "AUTOMATION_BLOCKED",
                productionSubmissionSupported: false,
              },
            ],
          },
        ],
        paymentBatches: [
          {
            id: "payment-batch-1",
            batchNumber: "PAY-2026-06",
            status: PayrollPaymentBatchStatus.RELEASED,
            method: PaymentMethod.BANK_TRANSFER,
            amount: new Prisma.Decimal("95800.00"),
            currency: "XAF",
            paymentDate: payDate,
            ledgerPostingBatchId: "payment-ledger-1",
            postedBusinessEventId: "payment-event-1",
            evidenceHash: "sha256:payment-evidence",
            paymentTransactionId: "payment-transaction-1",
            paymentExceptionId: null,
            reconciliationStatus: "PENDING",
            metadata: {},
          },
        ],
        payslips: [
          {
            id: "payslip-1",
            payslipNumber: "PS-2026-0001",
            employeeId: "employee-1",
            status: PayrollPayslipStatus.EMITTED,
            netPayableAmount: new Prisma.Decimal("95800.00"),
            currency: "XAF",
            employee: {
              employeeNumber: "EMP-001",
              displayName: "Ada Payroll",
              paymentDestinationHash: "sha256:destination",
            },
          },
        ],
        employeeBalanceCases: [
          {
            id: "balance-case-1",
            caseNumber: "EBC-2026-0001",
            caseType: "RECEIVABLE",
            status: PayrollEmployeeBalanceCaseStatus.OPEN,
            outstandingAmount: new Prisma.Decimal("5000.00"),
            currency: "XAF",
            evidenceHash: "sha256:balance-evidence",
            ledgerPostingBatchId: "balance-ledger-1",
          },
        ],
      },
    ]);
    mockDb.payrollRun.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mockDb.payrollRun.aggregate.mockResolvedValue({
      _sum: { netPayableAmount: new Prisma.Decimal("95800.00") },
    });
    mockDb.ledgerPostingBatch.findMany.mockResolvedValue([
      {
        id: "ledger-batch-1",
        sourceId: "run-1",
        postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
        status: LedgerPostingBatchStatus.POSTED,
        errorMessage: null,
        postedAt: new Date("2026-06-30T09:20:00.000Z"),
        createdAt: new Date("2026-06-30T09:18:00.000Z"),
      },
    ]);
    mockDb.user.findMany.mockResolvedValue([
      {
        id: "requester-1",
        email: "requester@aqstoqflow.test",
        firstName: "Ada",
        lastName: "Requester",
        name: null,
        roles: [
          {
            code: "PAYROLL_REVIEWER",
            nameEn: "Payroll reviewer",
            permissions: ["payroll.payments.request", "payroll.command.read"],
          },
        ],
      },
    ]);

    const result = await getPayrollRunWorkbenchData({
      organizationId: "org-1",
      actorId: "controller-1",
      actorPermissions: ["EMPLOYEE_SALARY_READ"],
      now: "2026-06-30T10:00:00.000Z",
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        totalRuns: 1,
        postedRuns: 1,
        correctionRuns: 1,
        returnedRuns: 1,
        blockedRuns: 1,
        declarationBlockedRuns: 1,
        paymentBlockedRuns: 1,
        netPayableInScope: "95800.00",
      }),
    );
    expect(result.redaction.correctionProofIdentifiers).toEqual(
      expect.objectContaining({
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-proof-hidden-identifier-policy",
      }),
    );
    expect(result.paymentRequesterCandidates).toEqual([
      expect.objectContaining({
        userId: "requester-1",
        displayName: "Ada Requester",
        email: "requester@aqstoqflow.test",
        roleLabels: ["Payroll reviewer"],
        matchedPermissions: ["payroll.payments.request"],
      }),
    ]);
    expect(result.runs[0]).toEqual(
      expect.objectContaining({
        runNumber: "RUN-2026-06-CORR",
        status: PayrollRunStatus.POSTED,
        correction: expect.objectContaining({
          correctionRun: true,
          originalRunNumber: "RUN-2026-05",
          originalRunDocumentHash: "sha256:original-run-doc",
          originalRunEvidenceHash: "sha256:original-run-evidence",
          originalCalculationHash: "sha256:original-calc",
          correctionEvidenceHash: "sha256:correction-evidence",
        }),
        proof: expect.objectContaining({
          registerProofPresent: true,
          componentRegisterProofHash: "sha256:component-register",
        }),
        accounting: expect.objectContaining({
          ledgerPostingBatchId: "ledger-batch-1",
          ledgerBatches: [
            expect.objectContaining({
              id: "ledger-batch-1",
              status: LedgerPostingBatchStatus.POSTED,
            }),
          ],
        }),
        paymentAllocationCandidates: [
          expect.objectContaining({
            payslipId: "payslip-1",
            employeeId: "employee-1",
            amount: "95800.00",
            paymentDestinationProofPresent: true,
          }),
        ],
      }),
    );
    expect(result.runs[0].blockers.map((blocker) => blocker.id)).toEqual(
      expect.arrayContaining([
        "PAYROLL_RUN_DECLARATION_REJECTED",
        "PAYROLL_RUN_DECLARATION_REGISTER_PROOF_MISSING",
        "PAYROLL_RUN_PAYMENT_REGISTER_PROOF_MISSING",
      ]),
    );
    expect(mockDb.payrollRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", deletedAt: null },
        include: expect.objectContaining({
          declarations: expect.any(Object),
          paymentBatches: expect.any(Object),
          payslips: expect.any(Object),
          payrollPeriod: expect.any(Object),
        }),
      }),
    );
    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          isActive: true,
          id: { not: "controller-1" },
          roles: expect.any(Object),
        }),
      }),
    );
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "PayrollRunWorkbench",
          action: "PAYROLL_RUN_WORKBENCH_READ",
          userId: "controller-1",
          changes: expect.objectContaining({
            correctionProofAccess: expect.objectContaining({
              allowed: true,
              mode: "allow",
              reasonCode: "ALLOWED",
              policy: "kontava-proof-hidden-identifier-policy",
            }),
          }),
        }),
      }),
    );
  });

  it("redacts correction proof identifiers when payroll evidence permissions are absent", async () => {
    const periodStart = new Date("2026-06-01T00:00:00.000Z");
    const periodEnd = new Date("2026-06-30T23:59:59.999Z");
    const payDate = new Date("2026-07-05T00:00:00.000Z");

    mockDb.payrollRun.findMany.mockResolvedValue([
      {
        id: "run-redacted-correction-proof",
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        originalRunId: "original-run-1",
        originalRun: {
          id: "original-run-1",
          runNumber: "RUN-2026-05",
          documentHash: "sha256:original-run-doc-rel",
          evidenceHash: "sha256:original-run-evidence-rel",
          calculationHash: "sha256:original-calc-rel",
        },
        runNumber: "RUN-2026-06-CORR-REDACTED",
        runType: PayrollRunType.CORRECTION,
        status: PayrollRunStatus.POSTED,
        version: 2,
        countryCode: "CM",
        countryPackVersion: "CM-2026.1",
        countryPackSchemaVersion: "country-pack.v1",
        countryPackResolutionHash: "sha256:country-pack",
        countryPackCapabilityStatus: "SUPPORTED",
        ruleSetHash: "sha256:rules",
        calculationHash: "sha256:calc",
        attendanceSnapshotHash: "sha256:attendance",
        grossAmount: new Prisma.Decimal("120000.00"),
        employeeDeductionAmount: new Prisma.Decimal("24200.00"),
        employerChargeAmount: new Prisma.Decimal("17150.00"),
        netPayableAmount: new Prisma.Decimal("95800.00"),
        currency: "XAF",
        documentHash: "sha256:run-doc",
        evidenceHash: "sha256:run-evidence",
        ledgerPostingBatchId: "ledger-batch-1",
        postedBusinessEventId: "event-posted-1",
        journalEntryId: "journal-1",
        accountingSourceLinkId: "source-link-1",
        preparedById: "preparer-1",
        reviewedById: "reviewer-1",
        approvedById: "approver-1",
        emittedById: "emitter-1",
        postedById: "poster-1",
        approvedAt: new Date("2026-06-30T09:00:00.000Z"),
        emittedAt: new Date("2026-06-30T09:10:00.000Z"),
        postedAt: new Date("2026-06-30T09:20:00.000Z"),
        metadata: {
          componentRegisterProofHash: "sha256:component-register",
          payrollComponentMappingHash: "sha256:component-mapping",
          correction: {
            originalRunId: "original-run-1",
            originalRunNumber: "RUN-2026-05",
            originalRunDocumentHash: "sha256:original-run-doc",
            originalRunEvidenceHash: "sha256:original-run-evidence",
            originalCalculationHash: "sha256:original-calc",
            correctionEvidenceHash: "sha256:correction-evidence",
          },
        },
        payrollPeriod: {
          id: "period-1",
          name: "June 2026",
          status: PayrollPeriodStatus.POSTED,
          periodStart,
          periodEnd,
          payDate,
        },
        _count: {
          lines: 1,
          payslips: 1,
          declarations: 1,
          paymentBatches: 0,
          employeeBalanceCases: 0,
          correctiveRuns: 0,
        },
        declarations: [
          {
            id: "declaration-1",
            authority: "CM_CNPS",
            declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
            status: PayrollDeclarationStatus.PREPARED,
            amount: new Prisma.Decimal("17150.00"),
            currency: "XAF",
            dueDate: new Date("2026-07-15T00:00:00.000Z"),
            payloadHash: "sha256:payload",
            evidenceItems: [
              {
                evidenceHash: "sha256:declaration-evidence",
                sourceRegisterHash: "sha256:run-evidence",
                automationCapabilityStatus: "MANUAL_SUPPORTED",
                productionSubmissionSupported: false,
              },
            ],
          },
        ],
        paymentBatches: [],
        payslips: [
          {
            id: "payslip-1",
            payslipNumber: "PS-2026-0001",
            employeeId: "employee-1",
            status: PayrollPayslipStatus.EMITTED,
            netPayableAmount: new Prisma.Decimal("95800.00"),
            currency: "XAF",
            employee: {
              employeeNumber: "EMP-001",
              displayName: "Ada Payroll",
              paymentDestinationHash: "sha256:destination",
            },
          },
        ],
        employeeBalanceCases: [],
      },
    ]);
    mockDb.payrollRun.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mockDb.payrollRun.aggregate.mockResolvedValue({
      _sum: { netPayableAmount: new Prisma.Decimal("95800.00") },
    });
    mockDb.ledgerPostingBatch.findMany.mockResolvedValue([
      {
        id: "ledger-batch-1",
        sourceId: "run-redacted-correction-proof",
        postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
        status: LedgerPostingBatchStatus.POSTED,
        errorMessage: null,
        postedAt: new Date("2026-06-30T09:20:00.000Z"),
        createdAt: new Date("2026-06-30T09:18:00.000Z"),
      },
    ]);

    const result = await getPayrollRunWorkbenchData({
      organizationId: "org-1",
      actorId: "limited-reader-1",
      actorPermissions: [],
      now: "2026-06-30T10:00:00.000Z",
    });

    expect(result.redaction.correctionProofIdentifiers).toEqual(
      expect.objectContaining({
        allowed: false,
        mode: "redact",
        reasonCode: "MISSING_PERMISSION",
        policy: "kontava-proof-hidden-identifier-policy",
      }),
    );
    expect(result.runs[0].correction).toEqual(
      expect.objectContaining({
        originalRunDocumentHash: "[REDACTED:IDENTIFIER]",
        originalRunEvidenceHash: "[REDACTED:IDENTIFIER]",
        originalCalculationHash: "[REDACTED:IDENTIFIER]",
        correctionEvidenceHash: "[REDACTED:IDENTIFIER]",
      }),
    );
    expect(JSON.stringify(result.runs[0].correction)).not.toContain(
      "sha256:correction-evidence",
    );
    expect(result.runs[0].blockers.map((blocker) => blocker.id)).not.toContain(
      "PAYROLL_CORRECTION_EVIDENCE_HASH_MISSING",
    );
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "limited-reader-1",
          changes: expect.objectContaining({
            correctionProofAccess: expect.objectContaining({
              allowed: false,
              reasonCode: "MISSING_PERMISSION",
              policy: "kontava-proof-hidden-identifier-policy",
            }),
          }),
        }),
      }),
    );
  });
  it("blocks locked correction runs when correction evidence hash is missing", async () => {
    const periodStart = new Date("2026-06-01T00:00:00.000Z");
    const periodEnd = new Date("2026-06-30T23:59:59.999Z");
    const payDate = new Date("2026-07-05T00:00:00.000Z");

    mockDb.payrollRun.findMany.mockResolvedValue([
      {
        id: "run-missing-correction-proof",
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        originalRunId: "original-run-1",
        originalRun: { id: "original-run-1", runNumber: "RUN-2026-05" },
        runNumber: "RUN-2026-06-CORR-MISSING-PROOF",
        runType: PayrollRunType.CORRECTION,
        status: PayrollRunStatus.POSTED,
        version: 2,
        countryCode: "CM",
        countryPackVersion: "CM-2026.1",
        countryPackSchemaVersion: "country-pack.v1",
        countryPackResolutionHash: "sha256:country-pack",
        countryPackCapabilityStatus: "SUPPORTED",
        ruleSetHash: "sha256:rules",
        calculationHash: "sha256:calc",
        attendanceSnapshotHash: "sha256:attendance",
        grossAmount: new Prisma.Decimal("120000.00"),
        employeeDeductionAmount: new Prisma.Decimal("24200.00"),
        employerChargeAmount: new Prisma.Decimal("17150.00"),
        netPayableAmount: new Prisma.Decimal("95800.00"),
        currency: "XAF",
        documentHash: "sha256:run-doc",
        evidenceHash: "sha256:run-evidence",
        ledgerPostingBatchId: "ledger-batch-1",
        postedBusinessEventId: "event-posted-1",
        journalEntryId: "journal-1",
        accountingSourceLinkId: "source-link-1",
        preparedById: "preparer-1",
        reviewedById: "reviewer-1",
        approvedById: "approver-1",
        emittedById: "emitter-1",
        postedById: "poster-1",
        approvedAt: new Date("2026-06-30T09:00:00.000Z"),
        emittedAt: new Date("2026-06-30T09:10:00.000Z"),
        postedAt: new Date("2026-06-30T09:20:00.000Z"),
        metadata: {
          componentRegisterProofHash: "sha256:component-register",
          payrollComponentMappingHash: "sha256:component-mapping",
          correction: {
            originalRunId: "original-run-1",
            originalRunNumber: "RUN-2026-05",
            originalRunDocumentHash: "sha256:original-run-doc",
            originalRunEvidenceHash: "sha256:original-run-evidence",
            originalCalculationHash: "sha256:original-calc",
          },
        },
        payrollPeriod: {
          id: "period-1",
          name: "June 2026",
          status: PayrollPeriodStatus.POSTED,
          periodStart,
          periodEnd,
          payDate,
        },
        _count: {
          lines: 1,
          payslips: 1,
          declarations: 1,
          paymentBatches: 0,
          employeeBalanceCases: 0,
          correctiveRuns: 0,
        },
        declarations: [
          {
            id: "declaration-1",
            authority: "CM_CNPS",
            declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
            status: PayrollDeclarationStatus.PREPARED,
            amount: new Prisma.Decimal("17150.00"),
            currency: "XAF",
            dueDate: new Date("2026-07-15T00:00:00.000Z"),
            payloadHash: "sha256:payload",
            evidenceItems: [
              {
                evidenceHash: "sha256:declaration-evidence",
                sourceRegisterHash: "sha256:run-evidence",
                automationCapabilityStatus: "MANUAL_SUPPORTED",
                productionSubmissionSupported: false,
              },
            ],
          },
        ],
        paymentBatches: [],
        payslips: [
          {
            id: "payslip-1",
            payslipNumber: "PS-2026-0001",
            employeeId: "employee-1",
            status: PayrollPayslipStatus.EMITTED,
            netPayableAmount: new Prisma.Decimal("95800.00"),
            currency: "XAF",
            employee: {
              employeeNumber: "EMP-001",
              displayName: "Ada Payroll",
              paymentDestinationHash: "sha256:destination",
            },
          },
        ],
        employeeBalanceCases: [],
      },
    ]);
    mockDb.payrollRun.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mockDb.payrollRun.aggregate.mockResolvedValue({
      _sum: { netPayableAmount: new Prisma.Decimal("95800.00") },
    });
    mockDb.ledgerPostingBatch.findMany.mockResolvedValue([
      {
        id: "ledger-batch-1",
        sourceId: "run-missing-correction-proof",
        postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
        status: LedgerPostingBatchStatus.POSTED,
        errorMessage: null,
        postedAt: new Date("2026-06-30T09:20:00.000Z"),
        createdAt: new Date("2026-06-30T09:18:00.000Z"),
      },
    ]);

    const result = await getPayrollRunWorkbenchData({
      organizationId: "org-1",
      actorId: "controller-1",
      actorPermissions: ["EMPLOYEE_SALARY_READ"],
      now: "2026-06-30T10:00:00.000Z",
    });

    expect(result.summary.blockedRuns).toBe(1);
    expect(result.runs[0].correction.correctionEvidenceHash).toBeNull();
    expect(result.runs[0].blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "PAYROLL_CORRECTION_EVIDENCE_HASH_MISSING",
          severity: "critical",
          title: "Correction evidence hash is missing",
        }),
      ]),
    );
  });
});