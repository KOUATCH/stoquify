import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalType,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PayrollEmployeeBalanceCaseStatus,
  PayrollEmployeeBalanceCaseType,
  PayrollEmployeeBalanceEventType,
  PayrollPayslipStatus,
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

jest.mock("@/services/accounting/periods.service", () => ({
  getOpenPeriodForDate: jest.fn(),
}));

jest.mock("@/services/accounting/posting-rules.service", () => ({
  getActivePostingRule: jest.fn(),
}));

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
}));

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service");
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  };
});

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

import {
  getPayrollEmployeeBalanceWorkbenchData,
  openPayrollEmployeeBalanceCaseFromCorrection,
  openPayrollEmployeeBalanceCasesForCorrectionRun,
  planPayrollEmployeeBalanceCasesForCorrectionRun,
  settlePayrollEmployeeBalanceCase,
} from "../payroll-employee-balance.service";

const mockDb = db as unknown as { $transaction: jest.Mock };
const mockedCreateLedgerPostingBatch = createLedgerPostingBatch as jest.Mock;
const mockedLinkAccountingSource = linkAccountingSource as jest.Mock;
const mockedGetOpenPeriodForDate = getOpenPeriodForDate as jest.Mock;
const mockedGetActivePostingRule = getActivePostingRule as jest.Mock;
const mockedRecordCloseCertificationInvalidationsForSourceInTx =
  recordCloseCertificationInvalidationsForSourceInTx as jest.Mock;
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock;
const mockedMarkBusinessEventAppliedInTx =
  markBusinessEventAppliedInTx as jest.Mock;

function buildTx() {
  return {
    payrollRun: {
      findFirst: jest.fn(),
    },
    payrollEmployeeBalanceCase: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollEmployeeBalanceEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    journal: {
      findFirst: jest.fn(),
    },
    chartOfAccount: {
      findMany: jest.fn(),
    },
    ledgerPostingBatch: {
      update: jest.fn(),
    },
    journalEntry: {
      count: jest.fn(),
      create: jest.fn(),
    },
    ledgerAuditEvent: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
}

const RUN_PROOF_METADATA = {
  componentRegisterProofHash: "sha256:component-proof",
  componentRegisterProofStatus: "MATCHED",
  payrollComponentMappingHash: "sha256:component-mapping",
  payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
  correction: {
    originalRunId: "original-run-1",
    originalRunNumber: "PAY-20260531-0001",
    originalRunStatus: PayrollRunStatus.POSTED,
    originalRunDocumentHash: "sha256:original-run",
    originalRunEvidenceHash: "sha256:original-evidence",
    originalCalculationHash: "sha256:original-calc",
  },
};

function postedNegativeCorrectionRun() {
  return {
    id: "correction-run-1",
    organizationId: "org-1",
    payrollPeriodId: "period-1",
    payrollPeriod: {
      id: "period-1",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T23:59:59.999Z"),
      payDate: new Date("2026-07-31T00:00:00.000Z"),
    },
    runNumber: "PAY-20260731-0001",
    runType: PayrollRunType.CORRECTION,
    originalRunId: "original-run-1",
    status: PayrollRunStatus.POSTED,
    netPayableAmount: new Prisma.Decimal("-9580.00"),
    currency: "XAF",
    documentHash: "sha256:correction-run",
    metadata: RUN_PROOF_METADATA,
    payslips: [
      {
        id: "payslip-correction-1",
        employeeId: "employee-1",
        payslipNumber: "PAY-20260731-0001-0001",
        status: PayrollPayslipStatus.EMITTED,
        netPayableAmount: new Prisma.Decimal("-9580.00"),
        currency: "XAF",
        employee: {
          id: "employee-1",
          displayName: "Ada Payroll",
        },
      },
    ],
  };
}

function postedMixedCorrectionRun() {
  return {
    ...postedNegativeCorrectionRun(),
    netPayableAmount: new Prisma.Decimal("4420.00"),
    payslips: [
      {
        id: "payslip-correction-negative-1",
        employeeId: "employee-1",
        payslipNumber: "PAY-20260731-0001-0001",
        status: PayrollPayslipStatus.EMITTED,
        netPayableAmount: new Prisma.Decimal("-9580.00"),
        currency: "XAF",
        employee: {
          id: "employee-1",
          displayName: "Ada Payroll",
        },
      },
      {
        id: "payslip-correction-positive-1",
        employeeId: "employee-2",
        payslipNumber: "PAY-20260731-0001-0002",
        status: PayrollPayslipStatus.EMITTED,
        netPayableAmount: new Prisma.Decimal("14000.00"),
        currency: "XAF",
        employee: {
          id: "employee-2",
          displayName: "Ben Payroll",
        },
      },
      {
        id: "payslip-correction-zero-1",
        employeeId: "employee-3",
        payslipNumber: "PAY-20260731-0001-0003",
        status: PayrollPayslipStatus.EMITTED,
        netPayableAmount: new Prisma.Decimal("0.00"),
        currency: "XAF",
        employee: {
          id: "employee-3",
          displayName: "Cy Payroll",
        },
      },
    ],
  };
}
function receivablePostingRule() {
  return {
    code: "PAYROLL-EMPLOYEE-RECEIVABLE",
    sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE,
    postingPurpose: AccountingPostingPurpose.PAYROLL_EMPLOYEE_RECEIVABLE,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "EMPLOYEE_RECEIVABLES",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Recognize employee receivable",
        account: null,
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "EMPLOYEE_PAYABLES",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Clear employee payable",
        account: null,
      },
    ],
  };
}

function settlementPostingRule() {
  return {
    code: "PAYROLL-EMPLOYEE-BALANCE-SETTLEMENT",
    sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT,
    postingPurpose:
      AccountingPostingPurpose.PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "BANK",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: { settlementMethod: "BANK_TRANSFER" },
        description: "Receive bank repayment",
        account: null,
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "EMPLOYEE_RECEIVABLES",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Clear employee receivable",
        account: null,
      },
    ],
  };
}

function mappedAccounts(keys: string[]) {
  return keys.map((mappingKey, index) => ({
    id: `account-${index + 1}`,
    code: `4${index + 1}`,
    mappingKey,
    isActive: true,
    deletedAt: null,
    _count: { children: 0 },
  }));
}

describe("payroll employee balance service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (handler) =>
      handler(buildTx()),
    );
    mockedCreateLedgerPostingBatch.mockResolvedValue({
      id: "ledger-batch-1",
    });
    mockedLinkAccountingSource.mockResolvedValue({
      id: "source-link-1",
    });
    mockedGetOpenPeriodForDate.mockResolvedValue({
      id: "acct-period-1",
      status: "OPEN",
    });
    mockedRecordBusinessEventInTx.mockResolvedValue({
      event: { id: "business-event-1" },
      created: true,
    });
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({
      id: "business-event-1",
      status: "APPLIED",
    });
    mockedRecordCloseCertificationInvalidationsForSourceInTx.mockResolvedValue({
      invalidatedCount: 0,
      results: [],
    });
  });

  it("opens a receivable case from a negative correction payslip with ledger and evidence", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollEmployeeBalanceCase.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.payrollRun.findFirst.mockResolvedValue(postedNegativeCorrectionRun());
    tx.payrollEmployeeBalanceCase.count.mockResolvedValue(0);
    mockedGetActivePostingRule.mockResolvedValue(receivablePostingRule());
    tx.journal.findFirst.mockResolvedValue({
      id: "payroll-journal-1",
      type: JournalType.PAYROLL,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(
      mappedAccounts(["EMPLOYEE_RECEIVABLES", "EMPLOYEE_PAYABLES"]),
    );
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "ledger-batch-1",
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
    tx.payrollEmployeeBalanceCase.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "balance-case-1",
        ...data,
      }),
    );
    tx.payrollEmployeeBalanceEvent.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "balance-event-open-1",
        ...data,
      }),
    );
    tx.payrollEmployeeBalanceCase.update.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "balance-case-1",
        caseNumber: "PAYBAL-20260731-0001",
        status: PayrollEmployeeBalanceCaseStatus.OPEN,
        ...data,
      }),
    );

    const result = await openPayrollEmployeeBalanceCaseFromCorrection({
      organizationId: "org-1",
      payrollRunId: "correction-run-1",
      employeeId: "employee-1",
      payslipId: "payslip-correction-1",
      openedById: "payroll-controller-1",
      approvedById: "payroll-approver-1",
      actorPermissions: ["payroll.payments.release"],
      lastAuthAt: "2026-07-31T00:00:00.000Z",
      now: "2026-07-31T00:01:00.000Z",
      reason: "Correction overpayment recovery",
      supportingEvidenceHash: "sha256:recovery-evidence",
      idempotencyKey: "balance-open-key-1",
    });

    expect(result.idempotent).toBe(false);
    expect(tx.payrollEmployeeBalanceCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          caseNumber: "PAYBAL-20260731-0001",
          caseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
          status: PayrollEmployeeBalanceCaseStatus.OPEN,
          amount: new Prisma.Decimal("9580.00"),
          outstandingAmount: new Prisma.Decimal("9580.00"),
          sourceNetPayableAmount: new Prisma.Decimal("-9580.00"),
          evidenceHash: expect.stringMatching(/^sha256:/),
          metadata: expect.objectContaining({
            payload: expect.objectContaining({
              correctionRun: true,
              originalRunId: "original-run-1",
              componentRegisterProofHash: "sha256:component-proof",
            }),
          }),
        }),
      }),
    );
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE,
          postingPurpose: AccountingPostingPurpose.PAYROLL_EMPLOYEE_RECEIVABLE,
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                debit: new Prisma.Decimal("9580.00"),
                credit: new Prisma.Decimal(0),
                metadata: expect.objectContaining({
                  mappingKey: "EMPLOYEE_RECEIVABLES",
                  balanceCaseId: "balance-case-1",
                }),
              }),
              expect.objectContaining({
                debit: new Prisma.Decimal(0),
                credit: new Prisma.Decimal("9580.00"),
                metadata: expect.objectContaining({
                  mappingKey: "EMPLOYEE_PAYABLES",
                }),
              }),
            ]),
          }),
        }),
      }),
    );
    expect(tx.payrollEmployeeBalanceEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: PayrollEmployeeBalanceEventType.OPEN,
          amount: new Prisma.Decimal("9580.00"),
          ledgerPostingBatchId: "ledger-batch-1",
          businessEventId: "business-event-1",
        }),
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.employee_balance.opened",
        sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE,
        payload: expect.objectContaining({
          balanceCaseId: "balance-case-1",
          amount: "9580.00",
          correctionRun: true,
          originalRunId: "original-run-1",
        }),
      }),
    );
    expect(
      mockedRecordCloseCertificationInvalidationsForSourceInTx,
    ).toHaveBeenCalledWith(
      tx,
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_EMPLOYEE_BALANCE_OPENED",
        sourceId: "balance-case-1",
        newEvidenceHash: expect.stringMatching(/^sha256:/),
      }),
      expect.objectContaining({ actorId: "payroll-approver-1" }),
    );
  });

  it("settles an employee receivable case with repayment ledger evidence", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollEmployeeBalanceEvent.findFirst.mockResolvedValue(null);
    tx.payrollEmployeeBalanceCase.findFirst.mockResolvedValue({
      id: "balance-case-1",
      organizationId: "org-1",
      employeeId: "employee-1",
      payrollRunId: "correction-run-1",
      caseNumber: "PAYBAL-20260731-0001",
      caseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
      status: PayrollEmployeeBalanceCaseStatus.OPEN,
      amount: new Prisma.Decimal("9580.00"),
      settledAmount: new Prisma.Decimal("0.00"),
      outstandingAmount: new Prisma.Decimal("9580.00"),
      currency: "XAF",
      metadata: {},
      payrollRun: {
        payrollPeriod: {
          periodStart: new Date("2026-07-01T00:00:00.000Z"),
          periodEnd: new Date("2026-07-31T23:59:59.999Z"),
        },
      },
    });
    mockedGetActivePostingRule.mockResolvedValue(settlementPostingRule());
    tx.journal.findFirst.mockResolvedValue({
      id: "bank-journal-1",
      type: JournalType.BANK,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(
      mappedAccounts(["BANK", "EMPLOYEE_RECEIVABLES"]),
    );
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "ledger-batch-1",
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
    tx.payrollEmployeeBalanceEvent.create.mockImplementation(
      async ({ data }: { data: any }) => data,
    );
    tx.payrollEmployeeBalanceCase.update.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "balance-case-1",
        status: data.status,
        settledAmount: data.settledAmount,
        outstandingAmount: data.outstandingAmount,
      }),
    );

    const result = await settlePayrollEmployeeBalanceCase({
      organizationId: "org-1",
      balanceCaseId: "balance-case-1",
      settledById: "cashier-1",
      approvedById: "payroll-approver-1",
      actorPermissions: ["payroll.payments.reconcile"],
      lastAuthAt: "2026-08-05T00:00:00.000Z",
      now: "2026-08-05T00:01:00.000Z",
      settlementDate: "2026-08-05",
      settlementMethod: "BANK_TRANSFER",
      amount: "9580.00",
      settlementEvidenceHash: "sha256:bank-repayment-evidence",
      reference: "BANK-REP-1",
      idempotencyKey: "balance-settle-key-1",
    });

    expect(result.balanceCase?.status).toBe(
      PayrollEmployeeBalanceCaseStatus.SETTLED,
    );
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT,
          postingPurpose:
            AccountingPostingPurpose.PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT,
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                debit: new Prisma.Decimal("9580.00"),
                credit: new Prisma.Decimal(0),
                metadata: expect.objectContaining({
                  mappingKey: "BANK",
                  settlementMethod: "BANK_TRANSFER",
                }),
              }),
              expect.objectContaining({
                debit: new Prisma.Decimal(0),
                credit: new Prisma.Decimal("9580.00"),
                metadata: expect.objectContaining({
                  mappingKey: "EMPLOYEE_RECEIVABLES",
                }),
              }),
            ]),
          }),
        }),
      }),
    );
    expect(tx.payrollEmployeeBalanceEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: PayrollEmployeeBalanceEventType.SETTLE_BANK,
          amount: new Prisma.Decimal("9580.00"),
          method: PaymentMethod.BANK_TRANSFER,
          ledgerPostingBatchId: "ledger-batch-1",
          businessEventId: "business-event-1",
        }),
      }),
    );
    expect(tx.payrollEmployeeBalanceCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PayrollEmployeeBalanceCaseStatus.SETTLED,
          settledAmount: new Prisma.Decimal("9580.00"),
          outstandingAmount: new Prisma.Decimal("0.00"),
        }),
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.employee_balance.settled",
        sourceType: AccountingSourceType.PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT,
        payload: expect.objectContaining({
          balanceCaseId: "balance-case-1",
          settlementMethod: "BANK_TRANSFER",
          amount: "9580.00",
          ledgerPostingBatchId: "ledger-batch-1",
        }),
      }),
    );
    expect(
      mockedRecordCloseCertificationInvalidationsForSourceInTx,
    ).toHaveBeenCalledWith(
      tx,
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_EMPLOYEE_BALANCE_SETTLED",
        newEvidenceHash: expect.stringMatching(/^sha256:/),
      }),
      expect.objectContaining({ actorId: "payroll-approver-1" }),
    );
  });

  it("plans a mixed correction run without requiring the whole run to be negative", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(postedMixedCorrectionRun());
    tx.payrollEmployeeBalanceCase.findMany.mockResolvedValue([]);

    const plan = await planPayrollEmployeeBalanceCasesForCorrectionRun(
      {
        organizationId: "org-1",
        payrollRunId: "correction-run-1",
        asOf: "2026-07-31T00:01:00.000Z",
      },
      tx as any,
    );

    expect(plan.summary).toEqual(
      expect.objectContaining({
        receivableCount: 1,
        receivableAmount: "9580.00",
        additionalPaymentCount: 1,
        additionalPaymentAmount: "14000.00",
        readyToOpenCount: 1,
        blockedCount: 0,
        canBulkOpenReceivables: true,
      }),
    );
    expect(plan.planHash).toMatch(/^sha256:/);
    expect(plan.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: "employee-1",
          direction: "RECEIVABLE",
          status: "READY_TO_OPEN",
          caseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
          amount: "9580.00",
        }),
        expect.objectContaining({
          employeeId: "employee-2",
          direction: "ADDITIONAL_PAYMENT",
          status: "STANDARD_PAYMENT_RELEASE",
          caseType: PayrollEmployeeBalanceCaseType.REFUND,
          amount: "14000.00",
        }),
        expect.objectContaining({
          employeeId: "employee-3",
          direction: "NO_BALANCE",
          status: "NO_ACTION",
          amount: "0.00",
        }),
      ]),
    );
  });

  it("bulk-opens receivable cases from a mixed correction plan and skips standard payment candidates", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(postedMixedCorrectionRun());
    tx.payrollEmployeeBalanceCase.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "balance-case-1",
          employeeId: "employee-1",
          payslipId: "payslip-correction-negative-1",
          status: PayrollEmployeeBalanceCaseStatus.OPEN,
          caseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
          outstandingAmount: new Prisma.Decimal("9580.00"),
        },
      ]);
    tx.payrollEmployeeBalanceCase.findFirst.mockResolvedValue(null);
    tx.payrollEmployeeBalanceCase.count.mockResolvedValue(0);
    mockedGetActivePostingRule.mockResolvedValue(receivablePostingRule());
    tx.journal.findFirst.mockResolvedValue({
      id: "payroll-journal-1",
      type: JournalType.PAYROLL,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(
      mappedAccounts(["EMPLOYEE_RECEIVABLES", "EMPLOYEE_PAYABLES"]),
    );
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "ledger-batch-1",
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
    tx.payrollEmployeeBalanceCase.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "balance-case-1",
        ...data,
      }),
    );
    tx.payrollEmployeeBalanceEvent.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "balance-event-open-1",
        ...data,
      }),
    );
    tx.payrollEmployeeBalanceCase.update.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "balance-case-1",
        caseNumber: "PAYBAL-20260731-0001",
        status: PayrollEmployeeBalanceCaseStatus.OPEN,
        ...data,
      }),
    );

    const result = await openPayrollEmployeeBalanceCasesForCorrectionRun({
      organizationId: "org-1",
      payrollRunId: "correction-run-1",
      openedById: "payroll-controller-1",
      approvedById: "payroll-approver-1",
      actorPermissions: ["payroll.payments.release"],
      lastAuthAt: "2026-07-31T00:00:00.000Z",
      now: "2026-07-31T00:01:00.000Z",
      reason: "Correction overpayment recovery",
      supportingEvidenceHash: "sha256:bulk-recovery-evidence",
      idempotencyKey: "balance-bulk-open-key-1",
    });

    expect(result.opened).toHaveLength(1);
    expect(result.opened[0]).toEqual(
      expect.objectContaining({
        employeeId: "employee-1",
        payslipId: "payslip-correction-negative-1",
        balanceCase: expect.objectContaining({ id: "balance-case-1" }),
      }),
    );
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: "employee-2",
          status: "STANDARD_PAYMENT_RELEASE",
        }),
        expect.objectContaining({
          employeeId: "employee-3",
          status: "NO_ACTION",
        }),
      ]),
    );
    expect(tx.payrollEmployeeBalanceCase.create).toHaveBeenCalledTimes(1);
    expect(tx.payrollEmployeeBalanceCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: "employee-1",
          payslipId: "payslip-correction-negative-1",
          idempotencyKey:
            "balance-bulk-open-key-1:payslip-correction-negative-1",
          metadata: expect.objectContaining({
            requestedMetadata: expect.objectContaining({
              balancePlanHash: result.plan.planHash,
              bulkIdempotencyKey: "balance-bulk-open-key-1",
            }),
          }),
        }),
      }),
    );
    expect(result.refreshedPlan.summary.existingCaseCount).toBe(1);
  });

  it("returns a redacted proof-backed employee balance workbench", async () => {
    const tx = buildTx();
    tx.payrollEmployeeBalanceCase.findMany.mockResolvedValue([
      {
        id: "balance-case-1",
        organizationId: "org-1",
        employeeId: "employee-1",
        payrollRunId: "correction-run-1",
        payslipId: "payslip-correction-1",
        caseNumber: "PAYBAL-20260731-0001",
        caseType: PayrollEmployeeBalanceCaseType.RECEIVABLE,
        status: PayrollEmployeeBalanceCaseStatus.OPEN,
        amount: new Prisma.Decimal("9580.00"),
        settledAmount: new Prisma.Decimal("0.00"),
        outstandingAmount: new Prisma.Decimal("9580.00"),
        sourceNetPayableAmount: new Prisma.Decimal("-9580.00"),
        currency: "XAF",
        reason: "Correction overpayment recovery",
        openedAt: new Date("2026-07-31T00:00:00.000Z"),
        openedById: "payroll-controller-1",
        settledAt: null,
        settledById: null,
        documentHash: "sha256:balance-doc",
        evidenceHash: "sha256:balance-evidence",
        ledgerPostingBatchId: "ledger-batch-1",
        journalEntryId: "journal-entry-1",
        accountingSourceLinkId: "source-link-1",
        openedBusinessEventId: "business-event-1",
        idempotencyKey: "balance-key-1",
        metadata: {},
        createdAt: new Date("2026-07-31T00:00:00.000Z"),
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
        employee: {
          id: "employee-1",
          employeeNumber: "EMP-001",
          displayName: "Ada Payroll",
        },
        payrollRun: {
          id: "correction-run-1",
          runNumber: "PAY-20260731-0001",
          status: PayrollRunStatus.POSTED,
          payrollPeriod: {
            id: "period-1",
            name: "July 2026",
            periodStart: new Date("2026-07-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-31T23:59:59.999Z"),
          },
        },
        payslip: {
          id: "payslip-correction-1",
          payslipNumber: "PAY-20260731-0001-0001",
          status: PayrollPayslipStatus.EMITTED,
        },
        events: [
          {
            id: "balance-event-open-1",
            eventType: PayrollEmployeeBalanceEventType.OPEN,
            eventDate: new Date("2026-07-31T00:00:00.000Z"),
            evidenceHash: "sha256:event-evidence",
            documentHash: "sha256:event-doc",
            ledgerPostingBatchId: "ledger-batch-1",
            journalEntryId: "journal-entry-1",
            accountingSourceLinkId: "source-link-1",
            businessEventId: "business-event-1",
          },
        ],
      },
    ]);
    tx.payrollEmployeeBalanceCase.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);
    tx.payrollEmployeeBalanceCase.aggregate.mockResolvedValue({
      _sum: {
        amount: new Prisma.Decimal("9580.00"),
        settledAmount: new Prisma.Decimal("0.00"),
        outstandingAmount: new Prisma.Decimal("9580.00"),
      },
    });

    const result = await getPayrollEmployeeBalanceWorkbenchData(
      {
        organizationId: "org-1",
        actorId: "payroll-reader-1",
        actorPermissions: ["payroll.command.read"],
        asOf: "2026-08-02T00:00:00.000Z",
        limit: 10,
      },
      tx as any,
    );

    expect(result.summary).toEqual(
      expect.objectContaining({
        totalCases: 3,
        filteredCases: 1,
        returnedCases: 1,
        openCases: 1,
        activeCases: 1,
        activeOutstandingAmount: "[REDACTED:PAYROLL]",
        coverageComplete: true,
      }),
    );
    expect(result.redaction.payrollAmounts.allowed).toBe(false);
    expect(result.cases[0]).toEqual(
      expect.objectContaining({
        caseNumber: "PAYBAL-20260731-0001",
        employee: expect.objectContaining({ employeeNumber: "EMP-001" }),
        amounts: expect.objectContaining({
          amount: "[REDACTED:PAYROLL]",
          outstandingAmount: "[REDACTED:PAYROLL]",
          currency: "XAF",
        }),
        proof: expect.objectContaining({
          documentHash: "sha256:balance-doc",
          latestEvent: expect.objectContaining({
            id: "balance-event-open-1",
            evidenceHash: "sha256:event-evidence",
          }),
        }),
        nextAction: expect.objectContaining({
          id: "settle",
          requiredPermission: "payroll.payments.reconcile",
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "PayrollEmployeeBalanceWorkbench",
          action: "PAYROLL_EMPLOYEE_BALANCE_WORKBENCH_READ",
          userId: "payroll-reader-1",
          changes: expect.objectContaining({
            amountAccess: expect.objectContaining({ allowed: false }),
            totalCases: 3,
            returnedCases: 1,
            activeCases: 1,
          }),
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("bankAccountNumber");
  });
});
