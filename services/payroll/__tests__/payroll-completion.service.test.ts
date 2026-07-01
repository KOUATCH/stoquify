import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalType,
  LedgerPostingBatchStatus,
  PaymentDirection,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentMethod,
  PaymentTransactionState,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  PayrollRunType,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client";

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/accounting/posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
  linkAccountingSource: jest.fn(),
}));

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
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
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service";
import {
  createLedgerPostingBatch,
  linkAccountingSource,
} from "@/services/accounting/posting.service";
import { getOpenPeriodForDate } from "@/services/accounting/periods.service";
import { getActivePostingRule } from "@/services/accounting/posting-rules.service";
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";
import { resolveRegulatoryParameter } from "@/services/regulatory/country-packs/resolve";
import { BusinessRuleError } from "@/services/_shared/action-errors";

import {
  preparePayrollDeclarations,
  releasePayrollPaymentBatch,
} from "../payroll-control.service";

const mockDb = db as unknown as { $transaction: jest.Mock };
const mockedRecordCloseCertificationInvalidationsForSourceInTx =
  recordCloseCertificationInvalidationsForSourceInTx as jest.Mock;
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
    payrollRun: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payrollPaymentBatch: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollPaymentAllocation: {
      findMany: jest.fn(),
    },
    payrollEmployee: {
      findFirst: jest.fn(),
    },
    payrollPaymentDestinationChangeRequest: {
      findFirst: jest.fn(),
    },
    payrollPeriod: {
      update: jest.fn(),
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
    paymentTransaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    paymentException: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
}

const PAYROLL_RUN_PROOF_METADATA = {
  componentRegisterProofHash: "sha256:component-proof",
  componentRegisterProofStatus: "MATCHED",
  payrollComponentMappingHash: "sha256:component-mapping",
  payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
};

const CERTIFIED_PAYMENT_ADAPTER_REQUEST_METADATA = {
  requestedPaymentAdapterStatus: "SUPPORTED_CERTIFIED",
  paymentProviderAdapterKey: "BANK_TRANSFER_PROVIDER_API",
  providerCredentialProofHash: "sha256:provider-credential-proof",
  providerPayloadMappingHash: "sha256:provider-payload-mapping",
  providerResponseMappingHash: "sha256:provider-response-mapping",
  providerAdapterRequestHash: "sha256:provider-request",
  providerAdapterResponseHash: "sha256:provider-response",
  providerSettlementReceiptHash: "sha256:provider-settlement-receipt",
  providerCertificationHarnessHash: "sha256:provider-harness",
  providerIdempotencyKey: "provider-idempotency-key-1",
  providerAttempt: 2,
  adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
};

const PAYMENT_ADAPTER_PROOF_METADATA = {
  paymentAdapterStatus: "SUPPORTED_CERTIFIED",
  paymentProviderAdapterKey: "BANK_TRANSFER_PROVIDER_API",
  paymentDisbursementFileHash: "sha256:bank-file",
  providerCredentialProofHash: "sha256:provider-credential-proof",
  providerPayloadMappingHash: "sha256:provider-payload-mapping",
  providerResponseMappingHash: "sha256:provider-response-mapping",
  providerAdapterRequestHash: "sha256:provider-request",
  providerAdapterResponseHash: "sha256:provider-response",
  providerSettlementReceiptHash: "sha256:provider-settlement-receipt",
  providerCertificationHarnessHash: "sha256:provider-harness",
  providerIdempotencyKey: "provider-idempotency-key-1",
  providerAttempt: 2,
  adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
  providerSettlementProofRequired: true,
  productionPaymentAutomationSupported: true,
};

function postedPayrollRun(
  paymentDestinationHash = "employee-destination-hash",
  metadata: Record<string, unknown> | null = PAYROLL_RUN_PROOF_METADATA,
) {
  return {
    id: "run-1",
    organizationId: "org-1",
    payrollPeriodId: "period-1",
    payrollPeriod: {
      id: "period-1",
      name: "June 2026",
      payDate: new Date("2026-06-30T00:00:00.000Z"),
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      periodEnd: new Date("2026-06-30T23:59:59.999Z"),
      status: PayrollPeriodStatus.POSTED,
    },
    runNumber: "PAY-20260630-0001",
    status: PayrollRunStatus.POSTED,
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
    employerChargeAmount: new Prisma.Decimal("4200.00"),
    netPayableAmount: new Prisma.Decimal("95800.00"),
    currency: "XAF",
    documentHash: "sha256:run-doc",
    ledgerPostingBatchId: "run-ledger-batch",
    postedBusinessEventId: "run-event",
    metadata,
    lines: [
      {
        id: "run-line-1",
        employeeId: "employee-1",
        grossAmount: new Prisma.Decimal("100000.00"),
        taxableBaseAmount: new Prisma.Decimal("100000.00"),
        socialBaseAmount: new Prisma.Decimal("100000.00"),
        employeeDeductionAmount: new Prisma.Decimal("4200.00"),
        employerChargeAmount: new Prisma.Decimal("4200.00"),
        netPayableAmount: new Prisma.Decimal("95800.00"),
        currency: "XAF",
        calculationSnapshot: {
          grossAmount: "100000.00",
          taxableBaseAmount: "100000.00",
          socialBaseAmount: "100000.00",
          employeePensionContributionAmount: "4200.00",
          employerPensionContributionAmount: "2100.00",
          familyAllowanceContributionAmount: "1400.00",
          occupationalRiskContributionAmount: "700.00",
          incomeTaxWithholdingAmount: "0.00",
          employeeDeductionAmount: "4200.00",
          employerChargeAmount: "4200.00",
          netPayableAmount: "95800.00",
          incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          incomeTaxApplied: false,
          currency: "XAF",
        },
      },
    ],
    payslips: [
      {
        id: "payslip-1",
        employeeId: "employee-1",
        payslipNumber: "PAY-20260630-0001-0001",
        status: PayrollPayslipStatus.EMITTED,
        netPayableAmount: new Prisma.Decimal("95800.00"),
        currency: "XAF",
        employee: {
          id: "employee-1",
          displayName: "Ada Payroll",
          paymentDestinationHash,
        },
      },
    ],
    declarations: [],
  };
}

function postedNegativeCorrectionPayrollRun() {
  const postedRun = postedPayrollRun();

  return {
    ...postedRun,
    id: "correction-run-1",
    payrollPeriodId: "period-2",
    payrollPeriod: {
      ...postedRun.payrollPeriod,
      id: "period-2",
      name: "July 2026 Correction",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T23:59:59.999Z"),
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
    metadata: {
      ...PAYROLL_RUN_PROOF_METADATA,
      correction: {
        originalRunId: "original-run-1",
        originalRunNumber: "PAY-20260531-0001",
        originalRunStatus: PayrollRunStatus.POSTED,
        originalRunDocumentHash: "sha256:original-run",
        originalRunEvidenceHash: "sha256:original-evidence",
        originalCalculationHash: "sha256:original-calc",
      },
    },
    lines: [
      {
        ...postedRun.lines[0],
        id: "correction-line-1",
        grossAmount: new Prisma.Decimal("-10000.00"),
        taxableBaseAmount: new Prisma.Decimal("-10000.00"),
        socialBaseAmount: new Prisma.Decimal("-10000.00"),
        employeeDeductionAmount: new Prisma.Decimal("-420.00"),
        employerChargeAmount: new Prisma.Decimal("-1295.00"),
        netPayableAmount: new Prisma.Decimal("-9580.00"),
        calculationSnapshot: {
          ...postedRun.lines[0].calculationSnapshot,
          grossAmount: "-10000.00",
          taxableBaseAmount: "-10000.00",
          socialBaseAmount: "-10000.00",
          employeePensionContributionAmount: "-420.00",
          employerPensionContributionAmount: "-420.00",
          familyAllowanceContributionAmount: "-700.00",
          occupationalRiskContributionAmount: "-175.00",
          employeeDeductionAmount: "-420.00",
          employerChargeAmount: "-1295.00",
          netPayableAmount: "-9580.00",
          componentMapping: {
            statutoryPayableAmount: "-1715.00",
            declarationLiabilityAmount: "-1715.00",
          },
        },
      },
    ],
    payslips: [
      {
        ...postedRun.payslips[0],
        id: "payslip-correction-1",
        employeeId: "employee-1",
        payslipNumber: "PAY-20260731-0001-0001",
        netPayableAmount: new Prisma.Decimal("-9580.00"),
      },
    ],
  };
}
function payrollPaymentPostingRule() {
  return {
    code: "PAYROLL-PAYMENT",
    sourceType: AccountingSourceType.PAYROLL_PAYMENT,
    postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "EMPLOYEE_PAYABLES",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Clear employee net payable",
        account: null,
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "BANK",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: { paymentMethod: "BANK_TRANSFER" },
        description: "Release bank payroll payment",
        account: null,
      },
    ],
  };
}

function mappedAccounts() {
  return ["EMPLOYEE_PAYABLES", "BANK"].map((mappingKey, index) => ({
    id: `account-${index + 1}`,
    code: `5${index + 1}`,
    mappingKey,
    isActive: true,
    deletedAt: null,
    _count: { children: 0 },
  }));
}

describe("payroll completion service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (handler) =>
      handler(buildTx()),
    );
    mockedCreateLedgerPostingBatch.mockResolvedValue({
      id: "payment-ledger-batch",
    });
    mockedLinkAccountingSource.mockResolvedValue({ id: "payment-source-link" });
    mockedGetOpenPeriodForDate.mockResolvedValue({
      id: "acct-period-1",
      status: "OPEN",
    });
    mockedGetActivePostingRule.mockResolvedValue(payrollPaymentPostingRule());
    mockedRecordCloseCertificationInvalidationsForSourceInTx.mockResolvedValue({
      invalidatedCount: 0,
      results: [],
    });
    mockedRecordBusinessEventInTx.mockResolvedValue({
      event: { id: "payment-event" },
      created: true,
    });
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({
      id: "payment-event",
      status: "APPLIED",
    });
  });

  it("releases posted payroll payment batches with ledger and reconciliation evidence", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(null);
    tx.payrollRun.findFirst.mockResolvedValue(postedPayrollRun());
    tx.payrollPaymentAllocation.findMany.mockResolvedValue([]);
    tx.payrollEmployee.findFirst.mockResolvedValue({
      id: "employee-1",
      displayName: "Ada Payroll",
      paymentDestinationHash: "employee-destination-hash",
      metadata: {
        approvedPaymentDestinationEvidence: {
          requestId: "dest-change-1",
          paymentDestinationHash: "employee-destination-hash",
          evidenceDocumentHash: "sha256:payment-destination-evidence",
          approvalEvidenceHash: "sha256:payment-destination-approval",
        },
      },
    });
    tx.payrollPaymentDestinationChangeRequest.findFirst.mockResolvedValue({
      id: "dest-change-1",
      evidenceDocumentHash: "sha256:payment-destination-evidence",
      approvalEvidenceHash: "sha256:payment-destination-approval",
      appliedBusinessEventId: "event-destination-applied",
    });
    tx.payrollPaymentBatch.count.mockResolvedValue(0);
    tx.payrollPaymentBatch.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "batch-1",
        ...data,
        allocations: data.allocations.create.map(
          (allocation: any, index: number) => ({
            id: `allocation-${index + 1}`,
            ...allocation,
          }),
        ),
      }),
    );
    tx.journal.findFirst.mockResolvedValue({
      id: "bank-journal",
      type: JournalType.BANK,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(mappedAccounts());
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "payment-ledger-batch",
      status: LedgerPostingBatchStatus.POSTED,
    });
    tx.journalEntry.count.mockResolvedValue(0);
    tx.journalEntry.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "payment-journal-entry",
        ...data,
        lines: data.lines.create,
      }),
    );
    tx.paymentTransaction.findFirst.mockResolvedValue(null);
    tx.paymentTransaction.create.mockResolvedValue({
      id: "payment-transaction-1",
    });
    tx.paymentException.findFirst.mockResolvedValue(null);
    tx.paymentException.create.mockResolvedValue({ id: "payment-exception-1" });
    tx.payrollPaymentBatch.update.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "batch-1",
        status: PayrollPaymentBatchStatus.RELEASED,
        ...data,
        allocations: [{ id: "allocation-1" }],
      }),
    );
    tx.payrollRun.update.mockResolvedValue({
      id: "run-1",
      status: PayrollRunStatus.PAID,
    });
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-1",
      status: PayrollPeriodStatus.PAID,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await releasePayrollPaymentBatch({
      organizationId: "org-1",
      payrollRunId: "run-1",
      requestedById: "preparer-1",
      approvedById: "treasury-1",
      method: PaymentMethod.BANK_TRANSFER,
      paymentDate: "2026-06-30",
      bankFileHash: "sha256:bank-file",
      idempotencyKey: "payroll-payment-key-1",
      actorPermissions: ["payroll.payments.release"],
      lastAuthAt: "2026-06-30T00:00:00.000Z",
      now: "2026-06-30T00:01:00.000Z",
      allocations: [
        {
          payslipId: "payslip-1",
          employeeId: "employee-1",
          amount: "95800.00",
        },
      ],
      metadata: CERTIFIED_PAYMENT_ADAPTER_REQUEST_METADATA,
    });

    expect(result.ledgerStatus).toBe("POSTED");
    expect(tx.payrollPaymentBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            ...PAYROLL_RUN_PROOF_METADATA,
            ...PAYMENT_ADAPTER_PROOF_METADATA,
            paymentAdapterProofHash: expect.stringMatching(/^sha256:/),
            paymentAdapterRegistryVersion: 1,
            paymentProviderAdapterContractHash:
              expect.stringMatching(/^sha256:/),
          }),
        }),
      }),
    );
    const createdBatchData =
      tx.payrollPaymentBatch.create.mock.calls[0][0].data;
    expect(createdBatchData.allocations.create[0].metadata).toEqual(
      expect.objectContaining({
        ...PAYROLL_RUN_PROOF_METADATA,
        ...PAYMENT_ADAPTER_PROOF_METADATA,
        paymentAdapterProofHash: expect.stringMatching(/^sha256:/),
        paymentAdapterRegistryVersion: 1,
        paymentProviderAdapterContractHash: expect.stringMatching(/^sha256:/),
      }),
    );
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: AccountingSourceType.PAYROLL_PAYMENT,
          postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
        }),
      }),
    );
    const journalEntryData = tx.journalEntry.create.mock.calls[0][0].data;
    expect(journalEntryData.lines.create[0].metadata).toEqual(
      expect.objectContaining({
        ...PAYROLL_RUN_PROOF_METADATA,
        paymentAdapterStatus: "SUPPORTED_CERTIFIED",
        paymentProviderAdapterKey: "BANK_TRANSFER_PROVIDER_API",
        paymentDisbursementFileHash: "sha256:bank-file",
        providerCertificationHarnessHash: "sha256:provider-harness",
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        providerSettlementProofRequired: true,
        productionPaymentAutomationSupported: true,
        paymentAdapterProofHash: expect.stringMatching(/^sha256:/),
        paymentAdapterRegistryVersion: 1,
        paymentProviderAdapterContractHash: expect.stringMatching(/^sha256:/),
      }),
    );
    expect(tx.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: PaymentDirection.OUTBOUND,
          state: PaymentTransactionState.PENDING,
          sourceType: "PAYROLL_PAYMENT",
          sourceId: "batch-1",
          metadata: expect.objectContaining({
            ...PAYROLL_RUN_PROOF_METADATA,
            ...PAYMENT_ADAPTER_PROOF_METADATA,
            paymentAdapterProofHash: expect.stringMatching(/^sha256:/),
            paymentAdapterRegistryVersion: 1,
            paymentProviderAdapterContractHash:
              expect.stringMatching(/^sha256:/),
          }),
        }),
      }),
    );
    expect(tx.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.MISSING_STATEMENT_LINE,
          status: PaymentExceptionStatus.OPEN,
          sourceType: "PAYROLL_PAYMENT",
        }),
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.payment_batch.released",
        sourceType: AccountingSourceType.PAYROLL_PAYMENT,
        payload: expect.objectContaining({
          ...PAYROLL_RUN_PROOF_METADATA,
          ...PAYMENT_ADAPTER_PROOF_METADATA,
          paymentAdapterProofHash: expect.stringMatching(/^sha256:/),
          paymentAdapterRegistryVersion: 1,
          paymentProviderAdapterContractHash: expect.stringMatching(/^sha256:/),
        }),
        metadata: expect.objectContaining({
          ...PAYROLL_RUN_PROOF_METADATA,
          ...PAYMENT_ADAPTER_PROOF_METADATA,
          paymentAdapterProofHash: expect.stringMatching(/^sha256:/),
          paymentAdapterRegistryVersion: 1,
          paymentProviderAdapterContractHash: expect.stringMatching(/^sha256:/),
        }),
        outboxMessages: expect.arrayContaining([
          expect.objectContaining({
            eventName: "payroll_payment.reconciliation_required",
          }),
        ]),
      }),
    );
    expect(tx.payrollPaymentBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            ...PAYROLL_RUN_PROOF_METADATA,
            ...PAYMENT_ADAPTER_PROOF_METADATA,
            paymentAdapterProofHash: expect.stringMatching(/^sha256:/),
            paymentAdapterRegistryVersion: 1,
            paymentProviderAdapterContractHash:
              expect.stringMatching(/^sha256:/),
          }),
        }),
      }),
    );
    expect(
      mockedRecordCloseCertificationInvalidationsForSourceInTx,
    ).toHaveBeenCalledWith(
      tx,
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_PAYMENT_RELEASED",
        sourceId: "batch-1",
        periodId: "acct-period-1",
        staleReason:
          "Payroll payment release changed certified close evidence.",
        newEvidenceHash: expect.stringMatching(/^sha256:/),
        correlationId: "payroll-payment-key-1",
      }),
      expect.objectContaining({
        actorId: "treasury-1",
        now: expect.any(Date),
      }),
    );
  });

  it("blocks certified production payment release when adapter chaos gate proof is missing", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(null);
    tx.payrollRun.findFirst.mockResolvedValue(postedPayrollRun());

    await expect(
      releasePayrollPaymentBatch({
        organizationId: "org-1",
        payrollRunId: "run-1",
        requestedById: "preparer-1",
        approvedById: "treasury-1",
        method: PaymentMethod.BANK_TRANSFER,
        paymentDate: "2026-06-30",
        bankFileHash: "sha256:bank-file",
        idempotencyKey: "payroll-payment-key-1",
        actorPermissions: ["payroll.payments.release"],
        lastAuthAt: "2026-06-30T00:00:00.000Z",
        now: "2026-06-30T00:01:00.000Z",
        allocations: [
          {
            payslipId: "payslip-1",
            employeeId: "employee-1",
            amount: "95800.00",
          },
        ],
        metadata: {
          ...CERTIFIED_PAYMENT_ADAPTER_REQUEST_METADATA,
          adapterChaosReleaseGateHash: undefined,
        },
      }),
    ).rejects.toThrow("adapter chaos release gate proof");

    expect(tx.payrollPaymentBatch.create).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("requires disbursement file evidence for bank and mobile-money payroll release", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(null);
    tx.payrollRun.findFirst.mockResolvedValue(postedPayrollRun());

    await expect(
      releasePayrollPaymentBatch({
        organizationId: "org-1",
        payrollRunId: "run-1",
        requestedById: "preparer-1",
        approvedById: "treasury-1",
        method: PaymentMethod.BANK_TRANSFER,
        paymentDate: "2026-06-30",
        idempotencyKey: "payroll-payment-key-1",
        actorPermissions: ["payroll.payments.release"],
        lastAuthAt: "2026-06-30T00:00:00.000Z",
        now: "2026-06-30T00:01:00.000Z",
        allocations: [
          {
            payslipId: "payslip-1",
            employeeId: "employee-1",
            amount: "95800.00",
          },
        ],
      }),
    ).rejects.toThrow("disbursement file evidence");

    expect(tx.payrollPaymentBatch.create).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("blocks payroll payment release when posted run component proof is missing", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(null);
    tx.payrollRun.findFirst.mockResolvedValue(
      postedPayrollRun("employee-destination-hash", {}),
    );

    await expect(
      releasePayrollPaymentBatch({
        organizationId: "org-1",
        payrollRunId: "run-1",
        requestedById: "preparer-1",
        approvedById: "treasury-1",
        method: PaymentMethod.BANK_TRANSFER,
        paymentDate: "2026-06-30",
        bankFileHash: "sha256:bank-file",
        idempotencyKey: "payroll-payment-key-1",
        actorPermissions: ["payroll.payments.release"],
        lastAuthAt: "2026-06-30T00:00:00.000Z",
        now: "2026-06-30T00:01:00.000Z",
        allocations: [
          {
            payslipId: "payslip-1",
            employeeId: "employee-1",
            amount: "95800.00",
          },
        ],
      }),
    ).rejects.toThrow("component register proof");

    expect(tx.payrollPaymentBatch.create).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("blocks payment release for negative correction runs with receivable workflow guidance", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(null);
    tx.payrollRun.findFirst.mockResolvedValue(
      postedNegativeCorrectionPayrollRun(),
    );

    await expect(
      releasePayrollPaymentBatch({
        organizationId: "org-1",
        payrollRunId: "correction-run-1",
        requestedById: "preparer-1",
        approvedById: "treasury-1",
        method: PaymentMethod.BANK_TRANSFER,
        paymentDate: "2026-07-31",
        bankFileHash: "sha256:bank-file",
        idempotencyKey: "payroll-payment-key-correction-1",
        actorPermissions: ["payroll.payments.release"],
        lastAuthAt: "2026-07-31T00:00:00.000Z",
        now: "2026-07-31T00:01:00.000Z",
        allocations: [
          {
            payslipId: "payslip-correction-1",
            employeeId: "employee-1",
            amount: "9580.00",
          },
        ],
      }),
    ).rejects.toThrow("employee receivable or refund workflow");

    expect(tx.payrollPaymentBatch.create).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled();
  });
  it("blocks payroll payment release when employee payment destination evidence is missing", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(null);
    tx.payrollRun.findFirst.mockResolvedValue(postedPayrollRun(null));
    tx.payrollPaymentAllocation.findMany.mockResolvedValue([]);

    await expect(
      releasePayrollPaymentBatch({
        organizationId: "org-1",
        payrollRunId: "run-1",
        requestedById: "preparer-1",
        approvedById: "treasury-1",
        method: PaymentMethod.BANK_TRANSFER,
        paymentDate: "2026-06-30",
        bankFileHash: "sha256:bank-file",
        idempotencyKey: "payroll-payment-key-1",
        actorPermissions: ["payroll.payments.release"],
        lastAuthAt: "2026-06-30T00:00:00.000Z",
        now: "2026-06-30T00:01:00.000Z",
        allocations: [
          {
            payslipId: "payslip-1",
            employeeId: "employee-1",
            amount: "95800.00",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(tx.payrollPaymentBatch.create).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("prepares payroll declarations with truthful expert-review fallback when country-pack declarations are not configured", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(postedPayrollRun());
    tx.payrollDeclaration.findFirst.mockResolvedValue(null);
    tx.payrollDeclaration.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "declaration-1",
        ...data,
      }),
    );
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mockedResolveRegulatoryParameter.mockImplementation(() => {
      throw new Error("declarations not configured");
    });

    const result = await preparePayrollDeclarations({
      organizationId: "org-1",
      payrollRunId: "run-1",
      preparedById: "payroll-1",
    });

    expect(result.expertReviewRequired).toBe(true);
    expect(tx.payrollDeclaration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authority: "INTERNAL_PAYROLL_CONTROL",
          declarationType: "PAYROLL_LIABILITY_REVIEW",
          status: PayrollDeclarationStatus.PREPARED,
          payloadHash: expect.stringMatching(/^sha256:/),
          metadata: expect.objectContaining({
            expertReviewRequired: true,
            declarationResolutionError: "declarations not configured",
          }),
        }),
      }),
    );
    expect(
      mockedRecordCloseCertificationInvalidationsForSourceInTx,
    ).toHaveBeenCalledWith(
      tx,
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_DECLARATION_PREPARED",
        sourceId: "run-1",
        periodStart: postedPayrollRun().payrollPeriod.periodStart,
        periodEnd: postedPayrollRun().payrollPeriod.periodEnd,
        staleReason:
          "Payroll declaration preparation changed certified close evidence.",
        newEvidenceHash: expect.stringMatching(/^sha256:/),
      }),
      expect.objectContaining({
        actorId: "payroll-1",
      }),
    );
  });
});
