import {
  PayrollPayslipStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client";

jest.mock("@/prisma/db", () => ({
  db: { $transaction: jest.fn() },
}));

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service");
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  };
});

jest.mock("@/services/accounting/periods.service", () => ({
  getOpenPeriodForDate: jest.fn(),
}));

jest.mock("@/services/accounting/posting-rules.service", () => ({
  getActivePostingRule: jest.fn(),
}));

jest.mock("@/services/accounting/posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
  linkAccountingSource: jest.fn(),
}));

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
}));

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
  approveAndPostPayrollRun,
  approvePayrollRun,
  emitPayrollPayslips,
  postPayrollRun,
  reviewPayrollRun,
} from "../payroll-control.service";

const mockRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock;
const mockMarkBusinessEventAppliedInTx =
  markBusinessEventAppliedInTx as jest.Mock;

const mockGetOpenPeriodForDate = getOpenPeriodForDate as jest.Mock;
const mockGetActivePostingRule = getActivePostingRule as jest.Mock;
const mockCreateLedgerPostingBatch = createLedgerPostingBatch as jest.Mock;
const mockLinkAccountingSource = linkAccountingSource as jest.Mock;
const mockRecordCloseInvalidations =
  recordCloseCertificationInvalidationsForSourceInTx as jest.Mock;
const NOW = new Date("2026-08-22T10:00:00.000Z");
const FRESH_AUTH_AT = new Date("2026-08-22T09:57:00.000Z");
const originalWriteSwitch = process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED;

const reviewedRun = {
  id: "run-1",
  organizationId: "org-1",
  runNumber: "PAY-2026-08-001",
  payrollPeriodId: "period-1",
  payrollPeriod: {
    id: "period-1",
    accountingPeriodId: "accounting-period-1",
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-31T23:59:59.999Z"),
    payDate: new Date("2026-08-31T00:00:00.000Z"),
  },
  status: PayrollRunStatus.REVIEWED,
  version: 2,
  preparedById: "preparer-1",
  reviewedById: "reviewer-1",
  reviewedAt: new Date("2026-08-22T09:30:00.000Z"),
  reviewedBusinessEventId: "event-reviewed-1",
  approvedById: null,
  approvedAt: null,
  calculationHash: "sha256:calculation",
  evidenceHash: "sha256:review-evidence",
  documentHash: "sha256:review-document",
  netPayableAmount: new Prisma.Decimal("95800.00"),
  currency: "XAF",
  metadata: { source: "focused-approval-test" },
  deletedAt: null,
};

const approvedRun = {
  ...reviewedRun,
  status: PayrollRunStatus.APPROVED,
  version: 3,
  approvedById: "approver-1",
  approvedAt: NOW,
  approvedBusinessEventId: "event-approved-1",
};

const calculatedRun = {
  ...reviewedRun,
  status: PayrollRunStatus.CALCULATED,
  version: 1,
  reviewedById: null,
  reviewedAt: null,
  reviewedBusinessEventId: null,
};

const payrollRunLine = {
  id: "run-line-1",
  employeeId: "employee-1",
  employee: { id: "employee-1", employeeNumber: "EMP-001" },
  grossAmount: new Prisma.Decimal("100000.00"),
  taxableBaseAmount: new Prisma.Decimal("100000.00"),
  socialBaseAmount: new Prisma.Decimal("100000.00"),
  employeeDeductionAmount: new Prisma.Decimal("4200.00"),
  employerChargeAmount: new Prisma.Decimal("12950.00"),
  netPayableAmount: new Prisma.Decimal("95800.00"),
  currency: "XAF",
  calculationSnapshot: {
    grossAmount: "100000.00",
    taxableBaseAmount: "100000.00",
    socialBaseAmount: "100000.00",
    employeePensionContributionAmount: "4200.00",
    employerPensionContributionAmount: "4200.00",
    familyAllowanceContributionAmount: "7000.00",
    occupationalRiskContributionAmount: "1750.00",
    incomeTaxWithholdingAmount: "0.00",
    payrollRubriqueEmployeeDeductionAmount: "0.00",
    payrollRubriqueEmployerChargeAmount: "0.00",
    employeeDeductionAmount: "4200.00",
    employerChargeAmount: "12950.00",
    netPayableAmount: "95800.00",
    incomeTaxCalculationStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
    incomeTaxApplied: false,
    currency: "XAF",
  },
};

const approvedEmissionRun = {
  ...approvedRun,
  runType: "ORDINARY",
  originalRunId: null,
  payrollPeriod: {
    id: "period-1",
    accountingPeriodId: "accounting-period-1",
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-31T23:59:59.999Z"),
    payDate: new Date("2026-08-31T00:00:00.000Z"),
  },
  countryCode: "CM",
  countryPackVersion: "CM-2026.1",
  countryPackSchemaVersion: "country-pack.v1",
  countryPackResolutionHash: "sha256:country-pack",
  countryPackCapabilityStatus: "SUPPORTED",
  ruleSetHash: "sha256:rules",
  grossAmount: new Prisma.Decimal("100000.00"),
  employeeDeductionAmount: new Prisma.Decimal("4200.00"),
  employerChargeAmount: new Prisma.Decimal("12950.00"),
  netPayableAmount: new Prisma.Decimal("95800.00"),
  emittedById: null,
  emittedAt: null,
  emittedBusinessEventId: null,
  lines: [payrollRunLine],
  payslips: [],
};

const emittedRun = {
  ...approvedEmissionRun,
  status: PayrollRunStatus.EMITTED,
  version: 4,
  emittedById: "approver-1",
  emittedAt: NOW,
  emittedBusinessEventId: "event-emitted-1",
  payslips: [
    {
      id: "payslip-1",
      status: PayrollPayslipStatus.EMITTED,
      emittedBusinessEventId: "event-emitted-1",
    },
  ],
};

const postedRun = {
  ...emittedRun,
  status: PayrollRunStatus.POSTED,
  version: 5,
  postedById: "reviewer-1",
  postedAt: NOW,
  postedBusinessEventId: "event-posted-1",
  ledgerPostingBatchId: "ledger-batch-1",
  journalEntryId: "journal-entry-1",
  accountingSourceLinkId: "source-link-1",
};

function emissionInput(
  overrides: Partial<Parameters<typeof emitPayrollPayslips>[0]> = {},
) {
  return {
    organizationId: "org-1",
    payrollRunId: "run-1",
    expectedVersion: 3,
    idempotencyKey: "emit-run-1-v4",
    actorId: "approver-1",
    actorPermissions: ["payroll.payslips.emit"],
    lastAuthAt: FRESH_AUTH_AT,
    now: NOW,
    correlationId: "corr-emit-run-1",
    ...overrides,
  };
}

function postingInput(
  overrides: Partial<Parameters<typeof postPayrollRun>[0]> = {},
) {
  return {
    organizationId: "org-1",
    payrollRunId: "run-1",
    expectedVersion: 4,
    idempotencyKey: "post-run-1-v5",
    actorId: "reviewer-1",
    actorPermissions: ["payroll.runs.post"],
    lastAuthAt: FRESH_AUTH_AT,
    now: NOW,
    correlationId: "corr-post-run-1",
    ...overrides,
  };
}
function reviewInput(
  overrides: Partial<Parameters<typeof reviewPayrollRun>[0]> = {},
) {
  return {
    organizationId: "org-1",
    payrollRunId: "run-1",
    expectedVersion: 1,
    idempotencyKey: "review-run-1-v2",
    actorId: "reviewer-1",
    actorPermissions: ["payroll.runs.review"],
    lastAuthAt: FRESH_AUTH_AT,
    now: NOW,
    correlationId: "corr-review-run-1",
    evidenceHash: "sha256:review-evidence",
    documentHash: "sha256:review-document",
    ...overrides,
  };
}
function approvalInput(
  overrides: Partial<Parameters<typeof approvePayrollRun>[0]> = {},
) {
  return {
    organizationId: "org-1",
    payrollRunId: "run-1",
    expectedVersion: 2,
    idempotencyKey: "approve-run-1-v3",
    actorId: "approver-1",
    actorPermissions: ["payroll.runs.approve"],
    lastAuthAt: FRESH_AUTH_AT,
    now: NOW,
    correlationId: "corr-approve-run-1",
    evidenceHash: "sha256:approval-evidence",
    documentHash: "sha256:approval-document",
    ...overrides,
  };
}

function buildTx(sourceRun = reviewedRun) {
  const payrollRunFindFirst = jest
    .fn()
    .mockResolvedValueOnce(sourceRun)
    .mockResolvedValueOnce(approvedRun);

  return {
    payrollRunTransition: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue({ sequence: 1 }),
      create: jest.fn().mockResolvedValue({ id: "transition-approved-1" }),
    },
    payrollRun: {
      findFirst: payrollRunFindFirst,
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payrollPeriod: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payrollPayslip: {
      create: jest.fn().mockResolvedValue({ id: "payslip-1" }),
    },
    journal: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: "journal-payroll", code: "PAY" }),
    },
    chartOfAccount: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "account-payroll-expense",
          code: "661000",
          mappingKey: "PAYROLL_EXPENSE",
          isActive: true,
          deletedAt: null,
          _count: { children: 0 },
        },
        {
          id: "account-employee-payable",
          code: "422000",
          mappingKey: "EMPLOYEE_PAYABLES",
          isActive: true,
          deletedAt: null,
          _count: { children: 0 },
        },
      ]),
    },
    ledgerPostingBatch: {
      update: jest.fn().mockResolvedValue({
        id: "ledger-batch-1",
        status: "POSTED",
      }),
    },
    journalEntry: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: "journal-entry-1",
        ...data,
        lines: data.lines.create,
      })),
    },
    ledgerAuditEvent: {
      create: jest.fn().mockResolvedValue({ id: "ledger-audit-1" }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  };
}

function serializableClient(tx: ReturnType<typeof buildTx>) {
  return {
    $transaction: jest.fn(async (work: (value: typeof tx) => unknown) =>
      work(tx),
    ),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED = "true";
  mockRecordBusinessEventInTx.mockResolvedValue({
    event: { id: "event-approved-1" },
    created: true,
  });
  mockMarkBusinessEventAppliedInTx.mockResolvedValue({
    id: "event-approved-1",
  });
  mockGetOpenPeriodForDate.mockResolvedValue({ id: "accounting-period-1" });
  mockGetActivePostingRule.mockResolvedValue({
    code: "PAYROLL-FOCUSED-TEST",
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "PAYROLL_EXPENSE",
        amountSource: PostingRuleAmountSource.NET_PAYABLE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Payroll expense",
        account: null,
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "EMPLOYEE_PAYABLES",
        amountSource: PostingRuleAmountSource.NET_PAYABLE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Employee payable",
        account: null,
      },
    ],
  });
  mockCreateLedgerPostingBatch.mockResolvedValue({ id: "ledger-batch-1" });
  mockLinkAccountingSource.mockResolvedValue({ id: "source-link-1" });
  mockRecordCloseInvalidations.mockResolvedValue([]);
});

afterAll(() => {
  if (originalWriteSwitch === undefined) {
    delete process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED;
  } else {
    process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED = originalWriteSwitch;
  }
});

describe("reviewPayrollRun CALCULATED -> REVIEWED", () => {
  it("records the canonical review event and tenant-scoped compare-and-set transition", async () => {
    const tx = buildTx(calculatedRun);
    tx.payrollRun.findFirst = jest
      .fn()
      .mockResolvedValueOnce(calculatedRun)
      .mockResolvedValueOnce(reviewedRun);
    const client = serializableClient(tx);
    mockRecordBusinessEventInTx.mockResolvedValueOnce({
      event: { id: "event-reviewed-1" },
      created: true,
    });

    const result = await reviewPayrollRun(reviewInput(), client as never);

    expect(result).toMatchObject({
      payrollRun: { status: PayrollRunStatus.REVIEWED, version: 2 },
      businessEventId: "event-reviewed-1",
      idempotent: false,
    });
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: "org-1",
        eventType: "PAYROLL_RUN_REVIEWED",
        actorId: "reviewer-1",
        payload: expect.objectContaining({
          fromStatus: PayrollRunStatus.CALCULATED,
          toStatus: PayrollRunStatus.REVIEWED,
          expectedVersion: 1,
          resultingVersion: 2,
        }),
      }),
    );
    expect(tx.payrollRun.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "run-1",
        organizationId: "org-1",
        status: PayrollRunStatus.CALCULATED,
        version: 1,
      }),
      data: expect.objectContaining({
        status: PayrollRunStatus.REVIEWED,
        version: { increment: 1 },
        reviewedById: "reviewer-1",
        reviewedBusinessEventId: "event-reviewed-1",
      }),
    });
    expect(mockMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "event-reviewed-1",
    );
  });

  it("rejects the persisted preparer as reviewer before creating evidence", async () => {
    const tx = buildTx(calculatedRun);
    const client = serializableClient(tx);

    await expect(
      reviewPayrollRun(reviewInput({ actorId: "preparer-1" }), client as never),
    ).rejects.toMatchObject({ code: "SOD_VIOLATION" });

    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
    expect(tx.payrollRun.updateMany).not.toHaveBeenCalled();
  });

  it("rolls the review transition back when compare-and-set loses", async () => {
    const tx = buildTx(calculatedRun);
    tx.payrollRun.updateMany.mockResolvedValue({ count: 0 });
    const client = serializableClient(tx);
    mockRecordBusinessEventInTx.mockResolvedValueOnce({
      event: { id: "event-reviewed-1" },
      created: true,
    });

    await expect(
      reviewPayrollRun(reviewInput(), client as never),
    ).rejects.toMatchObject({ code: "CONCURRENCY_CONFLICT", status: 409 });

    expect(tx.payrollRunTransition.create).toHaveBeenCalledTimes(1);
    expect(mockMarkBusinessEventAppliedInTx).not.toHaveBeenCalled();
  });

  it("replays the prior review after the run has advanced to POSTED", async () => {
    const tx = buildTx(calculatedRun);
    tx.payrollRun.findFirst = jest
      .fn()
      .mockResolvedValueOnce(calculatedRun)
      .mockResolvedValueOnce(reviewedRun);
    const client = serializableClient(tx);
    mockRecordBusinessEventInTx.mockResolvedValueOnce({
      event: { id: "event-reviewed-1" },
      created: true,
    });

    await reviewPayrollRun(reviewInput(), client as never);
    const transitionPayload =
      tx.payrollRunTransition.create.mock.calls[0][0].data;
    tx.payrollRunTransition.findUnique.mockResolvedValue({
      payrollRunId: "run-1",
      toStatus: PayrollRunStatus.REVIEWED,
      payloadHash: transitionPayload.payloadHash,
      businessEventId: "event-reviewed-1",
    });
    tx.payrollRun.findFirst.mockResolvedValue({
      ...reviewedRun,
      status: PayrollRunStatus.POSTED,
      version: 5,
      ledgerPostingBatchId: "ledger-batch-1",
    });

    const replay = await reviewPayrollRun(reviewInput(), client as never);

    expect(replay).toMatchObject({
      payrollRun: { status: PayrollRunStatus.POSTED, version: 5 },
      businessEventId: "event-reviewed-1",
      idempotent: true,
    });
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1);
    expect(tx.payrollRunTransition.create).toHaveBeenCalledTimes(1);
    expect(tx.payrollRun.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe("emitPayrollPayslips APPROVED -> EMITTED", () => {
  it("creates the canonical event, emitted payslips, and CAS transition atomically", async () => {
    const tx = buildTx(approvedEmissionRun);
    tx.payrollRun.findFirst = jest
      .fn()
      .mockResolvedValueOnce(approvedEmissionRun)
      .mockResolvedValueOnce(emittedRun);
    const client = serializableClient(tx);
    mockRecordBusinessEventInTx.mockResolvedValueOnce({
      event: { id: "event-emitted-1" },
      created: true,
    });

    const result = await emitPayrollPayslips(emissionInput(), client as never);

    expect(result).toMatchObject({
      payrollRun: { status: PayrollRunStatus.EMITTED, version: 4 },
      businessEventId: "event-emitted-1",
      idempotent: false,
    });
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: "org-1",
        eventType: "PAYSLIP_EMITTED",
        actorId: "approver-1",
        payload: expect.objectContaining({
          fromStatus: PayrollRunStatus.APPROVED,
          toStatus: PayrollRunStatus.EMITTED,
          expectedVersion: 3,
          resultingVersion: 4,
          payslipCount: 1,
          approvedBusinessEventId: "event-approved-1",
        }),
      }),
    );
    expect(tx.payrollPayslip.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        payrollRunId: "run-1",
        status: PayrollPayslipStatus.EMITTED,
        emittedBusinessEventId: "event-emitted-1",
      }),
    });
    expect(tx.payrollRun.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "run-1",
        organizationId: "org-1",
        status: PayrollRunStatus.APPROVED,
        version: 3,
      }),
      data: expect.objectContaining({
        status: PayrollRunStatus.EMITTED,
        version: { increment: 1 },
        emittedById: "approver-1",
        emittedBusinessEventId: "event-emitted-1",
      }),
    });
    expect(mockRecordCloseInvalidations).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYSLIP_EMITTED",
        sourceId: "run-1",
        periodId: "accounting-period-1",
      }),
      expect.objectContaining({ actorId: "approver-1", now: NOW }),
    );
    expect(tx.payrollRun.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      mockRecordCloseInvalidations.mock.invocationCallOrder[0],
    );
    expect(
      mockRecordCloseInvalidations.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mockMarkBusinessEventAppliedInTx.mock.invocationCallOrder[0],
    );
    expect(mockMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "event-emitted-1",
    );
  });

  it("does not apply the emission event when compare-and-set loses", async () => {
    const tx = buildTx(approvedEmissionRun);
    tx.payrollRun.updateMany.mockResolvedValue({ count: 0 });
    const client = serializableClient(tx);
    mockRecordBusinessEventInTx.mockResolvedValueOnce({
      event: { id: "event-emitted-1" },
      created: true,
    });

    await expect(
      emitPayrollPayslips(emissionInput(), client as never),
    ).rejects.toMatchObject({ code: "CONCURRENCY_CONFLICT", status: 409 });

    expect(tx.payrollPayslip.create).toHaveBeenCalledTimes(1);
    expect(tx.payrollRunTransition.create).toHaveBeenCalledTimes(1);
    expect(mockRecordCloseInvalidations).not.toHaveBeenCalled();
    expect(mockMarkBusinessEventAppliedInTx).not.toHaveBeenCalled();
  });

  it("replays emission without duplicating payslips after the run reaches POSTED", async () => {
    const tx = buildTx(approvedEmissionRun);
    tx.payrollRun.findFirst = jest
      .fn()
      .mockResolvedValueOnce(approvedEmissionRun)
      .mockResolvedValueOnce(emittedRun);
    const client = serializableClient(tx);
    mockRecordBusinessEventInTx.mockResolvedValueOnce({
      event: { id: "event-emitted-1" },
      created: true,
    });

    await emitPayrollPayslips(emissionInput(), client as never);
    const transitionPayload =
      tx.payrollRunTransition.create.mock.calls[0][0].data;
    tx.payrollRunTransition.findUnique.mockResolvedValue({
      payrollRunId: "run-1",
      toStatus: PayrollRunStatus.EMITTED,
      payloadHash: transitionPayload.payloadHash,
      businessEventId: "event-emitted-1",
    });
    tx.payrollRun.findFirst.mockResolvedValue(postedRun);

    const replay = await emitPayrollPayslips(emissionInput(), client as never);

    expect(replay).toMatchObject({
      payrollRun: { status: PayrollRunStatus.POSTED, version: 5 },
      businessEventId: "event-emitted-1",
      idempotent: true,
    });
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1);
    expect(tx.payrollPayslip.create).toHaveBeenCalledTimes(1);
    expect(tx.payrollRun.updateMany).toHaveBeenCalledTimes(1);
    expect(mockRecordCloseInvalidations).toHaveBeenCalledTimes(1);
  });
});

describe("postPayrollRun EMITTED -> POSTED", () => {
  it("posts the ledger and commits CAS, invalidation, audit, and event application in order", async () => {
    const tx = buildTx(emittedRun);
    tx.payrollRun.findFirst = jest
      .fn()
      .mockResolvedValueOnce(emittedRun)
      .mockResolvedValueOnce(postedRun);
    const client = serializableClient(tx);
    mockRecordBusinessEventInTx.mockResolvedValueOnce({
      event: { id: "event-posted-1" },
      created: true,
    });

    const result = await postPayrollRun(postingInput(), client as never);

    expect(result).toMatchObject({
      payrollRun: { status: PayrollRunStatus.POSTED, version: 5 },
      ledgerPostingBatchId: "ledger-batch-1",
      businessEventId: "event-posted-1",
      ledgerStatus: "POSTED",
      idempotent: false,
    });
    expect(mockCreateLedgerPostingBatch).toHaveBeenCalledTimes(1);
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: "org-1",
        eventType: "PAYROLL_POSTED",
        actorId: "reviewer-1",
        postingBatchId: "ledger-batch-1",
        payload: expect.objectContaining({
          fromStatus: PayrollRunStatus.EMITTED,
          toStatus: PayrollRunStatus.POSTED,
          expectedVersion: 4,
          resultingVersion: 5,
          emittedBusinessEventId: "event-emitted-1",
        }),
      }),
    );
    expect(tx.payrollRun.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "run-1",
        organizationId: "org-1",
        status: PayrollRunStatus.EMITTED,
        version: 4,
      }),
      data: expect.objectContaining({
        status: PayrollRunStatus.POSTED,
        version: { increment: 1 },
        postedById: "reviewer-1",
        ledgerPostingBatchId: "ledger-batch-1",
        postedBusinessEventId: "event-posted-1",
      }),
    });
    expect(tx.payrollPeriod.updateMany).toHaveBeenCalledWith({
      where: { id: "period-1", organizationId: "org-1" },
      data: { status: PayrollPeriodStatus.POSTED },
    });
    expect(mockRecordCloseInvalidations).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_RUN_POSTED",
        sourceId: "run-1",
        periodId: "accounting-period-1",
      }),
      expect.objectContaining({ actorId: "reviewer-1", now: NOW }),
    );
    expect(tx.payrollRun.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      mockRecordCloseInvalidations.mock.invocationCallOrder[0],
    );
    expect(
      mockRecordCloseInvalidations.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mockMarkBusinessEventAppliedInTx.mock.invocationCallOrder[0],
    );
  });

  it("rejects the persisted approver as poster before ledger creation", async () => {
    const tx = buildTx(emittedRun);
    const client = serializableClient(tx);

    await expect(
      postPayrollRun(postingInput({ actorId: "approver-1" }), client as never),
    ).rejects.toMatchObject({ code: "SOD_VIOLATION" });

    expect(mockCreateLedgerPostingBatch).not.toHaveBeenCalled();
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("rejects a payslip batch not bound to the run emission event", async () => {
    const tx = buildTx({
      ...emittedRun,
      payslips: [
        {
          ...emittedRun.payslips[0],
          emittedBusinessEventId: "event-other-emission",
        },
      ],
    });
    const client = serializableClient(tx);

    await expect(
      postPayrollRun(postingInput(), client as never),
    ).rejects.toMatchObject({
      code: "PAYROLL_TRANSITION_EVIDENCE_MISSING",
    });

    expect(mockCreateLedgerPostingBatch).not.toHaveBeenCalled();
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("does not update the period, invalidate close, or apply the event when CAS loses", async () => {
    const tx = buildTx(emittedRun);
    tx.payrollRun.updateMany.mockResolvedValue({ count: 0 });
    const client = serializableClient(tx);
    mockRecordBusinessEventInTx.mockResolvedValueOnce({
      event: { id: "event-posted-1" },
      created: true,
    });

    await expect(
      postPayrollRun(postingInput(), client as never),
    ).rejects.toMatchObject({ code: "CONCURRENCY_CONFLICT", status: 409 });

    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.payrollRunTransition.create).toHaveBeenCalledTimes(1);
    expect(tx.payrollPeriod.updateMany).not.toHaveBeenCalled();
    expect(mockRecordCloseInvalidations).not.toHaveBeenCalled();
    expect(mockMarkBusinessEventAppliedInTx).not.toHaveBeenCalled();
  });
});
describe("approvePayrollRun REVIEWED -> APPROVED", () => {
  it("atomically records the distinct approval event and compare-and-set transition", async () => {
    const tx = buildTx();
    const client = serializableClient(tx);

    const result = await approvePayrollRun(approvalInput(), client as never);

    expect(result).toMatchObject({
      payrollRun: {
        id: "run-1",
        status: PayrollRunStatus.APPROVED,
        version: 3,
      },
      businessEventId: "event-approved-1",
      idempotent: false,
    });
    expect(client.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: "org-1",
        eventType: "PAYROLL_RUN_APPROVED",
        actorId: "approver-1",
        idempotencyKey: "payroll-transition:approve-run-1-v3",
        payload: expect.objectContaining({
          fromStatus: PayrollRunStatus.REVIEWED,
          toStatus: PayrollRunStatus.APPROVED,
          expectedVersion: 2,
          resultingVersion: 3,
          approvedByUserId: "approver-1",
          calculationHash: "sha256:calculation",
        }),
      }),
    );
    expect(tx.payrollRunTransition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: PayrollRunStatus.REVIEWED,
        toStatus: PayrollRunStatus.APPROVED,
        fromVersion: 2,
        toVersion: 3,
        actorId: "approver-1",
        businessEventId: "event-approved-1",
      }),
    });
    expect(tx.payrollRun.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "run-1",
        organizationId: "org-1",
        status: PayrollRunStatus.REVIEWED,
        version: 2,
      }),
      data: expect.objectContaining({
        status: PayrollRunStatus.APPROVED,
        version: { increment: 1 },
        approvedById: "approver-1",
        approvedBusinessEventId: "event-approved-1",
      }),
    });
    expect(tx.payrollPeriod.updateMany).toHaveBeenCalledWith({
      where: { id: "period-1", organizationId: "org-1" },
      data: {
        status: PayrollPeriodStatus.APPROVED,
        approvedAt: NOW,
        approvedById: "approver-1",
      },
    });
    expect(mockRecordCloseInvalidations).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_RUN_APPROVED",
        sourceId: "run-1",
        periodId: "accounting-period-1",
      }),
      expect.objectContaining({ actorId: "approver-1", now: NOW }),
    );
    expect(tx.payrollRun.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      mockRecordCloseInvalidations.mock.invocationCallOrder[0],
    );
    expect(
      mockRecordCloseInvalidations.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mockMarkBusinessEventAppliedInTx.mock.invocationCallOrder[0],
    );
    expect(mockMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "event-approved-1",
    );
  });

  it.each([
    ["preparer", "preparer-1"],
    ["reviewer", "reviewer-1"],
  ])("rejects an approver who is the persisted %s", async (_role, actorId) => {
    const tx = buildTx();
    const client = serializableClient(tx);

    await expect(
      approvePayrollRun(approvalInput({ actorId }), client as never),
    ).rejects.toMatchObject({ code: "SOD_VIOLATION" });

    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
    expect(tx.payrollRun.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["stale", new Date("2026-08-22T09:54:59.999Z")],
  ])(
    "fails closed when fresh authorization is %s",
    async (_case, lastAuthAt) => {
      const tx = buildTx();
      const client = serializableClient(tx);

      await expect(
        approvePayrollRun(approvalInput({ lastAuthAt }), client as never),
      ).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" });

      expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
      expect(tx.payrollRun.updateMany).not.toHaveBeenCalled();
    },
  );

  it("returns a concurrency conflict when the expected version is stale even after another approval wins", async () => {
    const tx = buildTx({
      ...approvedRun,
      approvedById: "other-approver",
    });
    const client = serializableClient(tx);

    await expect(
      approvePayrollRun(approvalInput(), client as never),
    ).rejects.toMatchObject({ code: "CONCURRENCY_CONFLICT", status: 409 });

    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
    expect(tx.payrollRun.updateMany).not.toHaveBeenCalled();
  });

  it("rolls back with a concurrency conflict when compare-and-set loses", async () => {
    const tx = buildTx();
    tx.payrollRun.updateMany.mockResolvedValue({ count: 0 });
    const client = serializableClient(tx);

    await expect(
      approvePayrollRun(approvalInput(), client as never),
    ).rejects.toMatchObject({ code: "CONCURRENCY_CONFLICT", status: 409 });

    expect(tx.payrollPeriod.updateMany).not.toHaveBeenCalled();
    expect(mockRecordCloseInvalidations).not.toHaveBeenCalled();
    expect(mockMarkBusinessEventAppliedInTx).not.toHaveBeenCalled();
  });

  it("retries a serializable transaction conflict and applies the transition once", async () => {
    const tx = buildTx();
    const client = {
      $transaction: jest
        .fn()
        .mockRejectedValueOnce({ code: "P2034" })
        .mockImplementationOnce(async (work: (value: typeof tx) => unknown) =>
          work(tx),
        ),
    };

    const result = await approvePayrollRun(approvalInput(), client as never);

    expect(result.idempotent).toBe(false);
    expect(client.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.payrollRunTransition.create).toHaveBeenCalledTimes(1);
    expect(tx.payrollRun.updateMany).toHaveBeenCalledTimes(1);
  });

  it("returns the prior result for a same-payload idempotent replay", async () => {
    const tx = buildTx();
    const client = serializableClient(tx);

    await approvePayrollRun(approvalInput(), client as never);
    const transitionPayload =
      tx.payrollRunTransition.create.mock.calls[0][0].data;
    tx.payrollRunTransition.findUnique.mockResolvedValue({
      payrollRunId: "run-1",
      toStatus: PayrollRunStatus.APPROVED,
      payloadHash: transitionPayload.payloadHash,
      businessEventId: "event-approved-1",
    });
    tx.payrollRun.findFirst.mockResolvedValue({
      ...approvedRun,
      status: PayrollRunStatus.POSTED,
      version: 5,
      ledgerPostingBatchId: "ledger-batch-1",
    });

    const replay = await approvePayrollRun(approvalInput(), client as never);

    expect(replay).toMatchObject({
      payrollRun: {
        status: PayrollRunStatus.POSTED,
        version: 5,
      },
      businessEventId: "event-approved-1",
      idempotent: true,
    });
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1);
    expect(tx.payrollRunTransition.create).toHaveBeenCalledTimes(1);
    expect(tx.payrollRun.updateMany).toHaveBeenCalledTimes(1);
    expect(mockRecordCloseInvalidations).toHaveBeenCalledTimes(1);
  });

  it("rejects an idempotency key reused with a different approval document", async () => {
    const tx = buildTx();
    const client = serializableClient(tx);

    await approvePayrollRun(approvalInput(), client as never);
    const transitionPayload =
      tx.payrollRunTransition.create.mock.calls[0][0].data;
    tx.payrollRunTransition.findUnique.mockResolvedValue({
      payrollRunId: "run-1",
      toStatus: PayrollRunStatus.APPROVED,
      payloadHash: transitionPayload.payloadHash,
      businessEventId: "event-approved-1",
    });

    await expect(
      approvePayrollRun(
        approvalInput({ documentHash: "sha256:different-document" }),
        client as never,
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", status: 409 });

    expect(mockRecordBusinessEventInTx).toHaveBeenCalledTimes(1);
    expect(tx.payrollRun.updateMany).toHaveBeenCalledTimes(1);
  });

  it("fails the deprecated combined command closed after Trust Spine cutover", async () => {
    await expect(
      approveAndPostPayrollRun({
        organizationId: "org-1",
        payrollRunId: "run-1",
        approvedById: "approver-1",
        actorPermissions: ["payroll.runs.approve"],
        lastAuthAt: FRESH_AUTH_AT,
        now: NOW,
        idempotencyKey: "legacy-combined-1",
      }),
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION", status: 409 });
  });
});
