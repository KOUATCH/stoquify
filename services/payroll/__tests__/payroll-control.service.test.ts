import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalType,
  LedgerPostingBatchStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client";

import { ConflictError } from "@/services/_shared/action-errors";

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
import {
  createLedgerPostingBatch,
  linkAccountingSource,
} from "@/services/accounting/posting.service";
import { getOpenPeriodForDate } from "@/services/accounting/periods.service";
import { getActivePostingRule } from "@/services/accounting/posting-rules.service";
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";
import { resolveRegulatoryParameter } from "@/services/regulatory/country-packs/resolve";

import {
  approveAndPostPayrollRun,
  calculatePayrollRun,
} from "../payroll-control.service";

const mockDb = db as unknown as { $transaction: jest.Mock };
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
    organization: {
      findFirst: jest.fn(),
    },
    payrollPeriod: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollEmployee: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    payrollAttendanceSnapshot: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    payrollRun: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollPayslip: {
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
    auditLog: {
      create: jest.fn(),
    },
    businessEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    closeRun: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: "close-run-1" }),
    },
    closePackExport: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: "close-pack-export-1" }),
    },
  };
}

const payrollPeriod = {
  id: "period-1",
  organizationId: "org-1",
  name: "June 2026",
  periodStart: new Date("2026-06-01T00:00:00.000Z"),
  periodEnd: new Date("2026-06-30T23:59:59.999Z"),
  payDate: new Date("2026-06-30T00:00:00.000Z"),
  status: PayrollPeriodStatus.INPUTS_LOCKED,
  countryCode: "CM",
  inputLockedAt: new Date("2026-06-20T00:00:00.000Z"),
  inputLockedById: "hr-1",
};

const pensionResolution = {
  countryCode: "CM",
  parameterPath: "payroll.cnps.pensionRatesBps",
  value: {
    employee: 420,
    employer: 420,
    monthlyCeilingMinorUnits: 750000,
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-11",
  verifiedBy: "Official CNPS regulator source",
  verificationStatus: "REGULATOR_CONFIRMED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "pension-hash",
};

const familyAllowanceResolution = {
  countryCode: "CM",
  parameterPath: "payroll.cnps.familyAllowanceRatesBps",
  value: {
    general: 700,
    agriculture: 565,
    privateEducation: 370,
    paidBy: "EMPLOYER",
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-11",
  verifiedBy: "Official CNPS regulator source",
  verificationStatus: "REGULATOR_CONFIRMED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "family-allowance-hash",
};

const occupationalRiskResolution = {
  countryCode: "CM",
  parameterPath: "payroll.cnps.occupationalRiskRatesBps",
  value: {
    groupA: 175,
    groupB: 250,
    groupC: 500,
    paidBy: "EMPLOYER",
    classificationRequired: true,
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-11",
  verifiedBy: "Official CNPS regulator source",
  verificationStatus: "REGULATOR_CONFIRMED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "occupational-risk-hash",
};

const employerRulesResolution = {
  countryCode: "CM",
  parameterPath: "payroll.cnps.employerRules",
  value: {
    payrollBaseRequiresCnpsReview: true,
  },
  packVersion: "CM-2026.1",
  schemaVersion: "country-pack.v1",
  legalRef: "CM_CNPS_EMPLOYER_RULES",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  verifiedOn: "2026-06-11",
  verifiedBy: "Official CNPS regulator source",
  verificationStatus: "REGULATOR_CONFIRMED",
  layer: "country",
  capabilityStatus: "SUPPORTED",
  resolutionHash: "employer-rules-hash",
};

function mockCountryPack() {
  mockedResolveRegulatoryParameter.mockImplementation((path: string) => {
    if (path === "payroll.cnps.pensionRatesBps") return pensionResolution;
    if (path === "payroll.cnps.familyAllowanceRatesBps")
      return familyAllowanceResolution;
    if (path === "payroll.cnps.occupationalRiskRatesBps")
      return occupationalRiskResolution;
    if (path === "payroll.cnps.employerRules") return employerRulesResolution;
    throw new Error(`Unexpected regulatory path ${path}`);
  });
}

function payrollRunFixture(
  status = PayrollRunStatus.CALCULATED,
  metadata: Record<string, unknown> = {},
) {
  return {
    id: "run-1",
    organizationId: "org-1",
    payrollPeriodId: "period-1",
    payrollPeriod,
    runNumber: "PAY-20260630-0001",
    status,
    countryCode: "CM",
    countryPackVersion: "CM-2026.1",
    countryPackSchemaVersion: "country-pack.v1",
    countryPackResolutionHash: "sha256:country-pack",
    ruleSetHash: "sha256:rules",
    calculationHash: "sha256:calc",
    attendanceSnapshotHash: "sha256:attendance",
    grossAmount: new Prisma.Decimal("100000.00"),
    employeeDeductionAmount: new Prisma.Decimal("4200.00"),
    employerChargeAmount: new Prisma.Decimal("12950.00"),
    netPayableAmount: new Prisma.Decimal("95800.00"),
    currency: "XAF",
    documentHash: "sha256:run-doc",
    preparedById: "preparer-1",
    ledgerPostingBatchId: status === PayrollRunStatus.POSTED ? "batch-1" : null,
    postedBusinessEventId:
      status === PayrollRunStatus.POSTED ? "event-1" : null,
    metadata,
    lines: [
      {
        id: "run-line-1",
        employeeId: "employee-1",
        employee: {
          id: "employee-1",
          employeeNumber: "EMP-001",
          displayName: "Ada Payroll",
        },
        grossAmount: new Prisma.Decimal("100000.00"),
        employeeDeductionAmount: new Prisma.Decimal("4200.00"),
        employerChargeAmount: new Prisma.Decimal("12950.00"),
        netPayableAmount: new Prisma.Decimal("95800.00"),
        currency: "XAF",
      },
    ],
    payslips: [],
  };
}

function payrollPostingRule() {
  return {
    code: "PAYROLL-RUN",
    sourceType: AccountingSourceType.PAYROLL_RUN,
    postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "PAYROLL_GROSS_EXPENSE",
        amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Gross payroll expense",
        account: null,
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
        amountSource: PostingRuleAmountSource.EMPLOYER_CHARGE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Employer charges",
        account: null,
      },
      {
        lineNumber: 3,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "EMPLOYEE_PAYABLES",
        amountSource: PostingRuleAmountSource.NET_PAYABLE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Employee payable",
        account: null,
      },
      {
        lineNumber: 4,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "PAYROLL_WITHHOLDING_PAYABLE",
        amountSource: PostingRuleAmountSource.EMPLOYEE_DEDUCTION_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Employee deductions payable",
        account: null,
      },
      {
        lineNumber: 5,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "SOCIAL_CONTRIBUTIONS_PAYABLE",
        amountSource: PostingRuleAmountSource.EMPLOYER_CHARGE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        condition: null,
        description: "Employer charges payable",
        account: null,
      },
    ],
  };
}

function mappedPayrollAccounts() {
  return [
    "PAYROLL_GROSS_EXPENSE",
    "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
    "EMPLOYEE_PAYABLES",
    "PAYROLL_WITHHOLDING_PAYABLE",
    "SOCIAL_CONTRIBUTIONS_PAYABLE",
  ].map((mappingKey, index) => ({
    id: `account-${index + 1}`,
    code: `6${index + 1}`,
    mappingKey,
    organizationId: "org-1",
    isActive: true,
    deletedAt: null,
    _count: { children: 0 },
  }));
}

describe("payroll control service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (handler) =>
      handler(buildTx()),
    );
    mockedRecordBusinessEventInTx.mockResolvedValue({
      event: { id: "event-1" },
      created: true,
    });
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({
      id: "event-1",
      status: "APPLIED",
    });
    mockedCreateLedgerPostingBatch.mockResolvedValue({ id: "batch-1" });
    mockedLinkAccountingSource.mockResolvedValue({ id: "source-link-1" });
    mockedGetOpenPeriodForDate.mockResolvedValue({
      id: "acct-period-1",
      status: "OPEN",
    });
    mockedGetActivePostingRule.mockResolvedValue(payrollPostingRule());
    mockCountryPack();
  });

  it("calculates a payroll run from frozen attendance and pins country-pack provenance", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        payrollCnpsFamilyAllowanceSector: "GENERAL",
        payrollCnpsOccupationalRiskGroup: "A",
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);
    tx.payrollRun.count.mockResolvedValue(0);
    tx.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "employee-1",
        displayName: "Ada Payroll",
        paymentDestinationHash: "dest-hash",
        contracts: [
          {
            id: "contract-1",
            baseSalary: new Prisma.Decimal("100000.00"),
            currency: "XAF",
          },
        ],
        attendanceSnapshots: [
          {
            id: "attendance-1",
            scheduledMinutes: 9600,
            workedMinutes: 9600,
            leaveMinutes: 0,
            overtimeMinutes: 0,
          },
        ],
      },
    ]);
    tx.payrollRun.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "run-1",
        ...data,
        lines: data.lines.create.map((line: any, index: number) => ({
          id: `line-${index + 1}`,
          ...line,
        })),
      }),
    );
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-1",
      status: PayrollPeriodStatus.CALCULATED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await calculatePayrollRun({
      organizationId: "org-1",
      payrollPeriodId: "period-1",
      preparedById: "preparer-1",
      idempotencyKey: "calc-key-1",
      runDate: "2026-06-30",
    });

    expect(result.created).toBe(true);
    expect(tx.payrollRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PayrollRunStatus.CALCULATED,
          countryPackVersion: "CM-2026.1",
          countryPackSchemaVersion: "country-pack.v1",
          grossAmount: new Prisma.Decimal("100000.00"),
          employeeDeductionAmount: new Prisma.Decimal("4200.00"),
          employerChargeAmount: new Prisma.Decimal("12950.00"),
          netPayableAmount: new Prisma.Decimal("95800.00"),
          lines: expect.objectContaining({
            create: [
              expect.objectContaining({
                employeeId: "employee-1",
                contractId: "contract-1",
                attendanceSnapshotId: "attendance-1",
                ruleProvenance: expect.objectContaining({
                  packVersion: "CM-2026.1",
                }),
              }),
            ],
          }),
        }),
        include: { lines: true },
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.run.calculated",
        idempotencyKey: "payroll-run-calculated:calc-key-1",
        outboxMessages: [
          expect.objectContaining({
            channel: "NOTIFICATION",
            eventName: "payroll_run.calculated",
            destination: "payroll",
          }),
        ],
      }),
    );
  });

  it("blocks Cameroon payroll calculation when CNPS tenant classification is missing", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: {
        countryPack: null,
        taxRegime: null,
        payrollCnpsFamilyAllowanceSector: null,
        payrollCnpsOccupationalRiskGroup: null,
      },
    });
    tx.payrollRun.findFirst.mockResolvedValue(null);
    tx.payrollPeriod.findFirst.mockResolvedValue(payrollPeriod);

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-missing-classification",
        runDate: "2026-06-30",
      }),
    ).rejects.toThrow(
      "Payroll CNPS family allowance sector is required before Cameroon payroll calculation.",
    );

    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("rejects mutated payroll calculation idempotency replays before side effects", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue({
      id: "run-1",
      postedBusinessEventId: "event-1",
      metadata: { idempotencyPayloadHash: "sha256:previous-payload" },
      lines: [],
    });

    await expect(
      calculatePayrollRun({
        organizationId: "org-1",
        payrollPeriodId: "period-1",
        preparedById: "preparer-1",
        idempotencyKey: "calc-key-1",
        employeeIds: ["employee-2"],
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("approves, posts, emits payslips, and queues payroll outbox messages in one orchestration", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(payrollRunFixture());
    tx.journal.findFirst.mockResolvedValue({
      id: "journal-payroll",
      code: "PAY",
      type: JournalType.PAYROLL,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(mappedPayrollAccounts());
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
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
    tx.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" });
    tx.payrollPayslip.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "payslip-1",
        ...data,
      }),
    );
    tx.payrollRun.update.mockResolvedValue({
      ...payrollRunFixture(PayrollRunStatus.POSTED),
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      payslips: [{ id: "payslip-1" }],
    });
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-1",
      status: PayrollPeriodStatus.POSTED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const result = await approveAndPostPayrollRun({
      organizationId: "org-1",
      payrollRunId: "run-1",
      approvedById: "approver-1",
      actorPermissions: ["payroll.runs.approve"],
      lastAuthAt: "2026-06-30T00:00:00.000Z",
      now: "2026-06-30T00:01:00.000Z",
      idempotencyKey: "approve-key-1",
    });

    expect(result.ledgerStatus).toBe("POSTED");
    expect(mockedCreateLedgerPostingBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        sourceType: AccountingSourceType.PAYROLL_RUN,
        postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
      }),
      tx,
    );
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "POSTED",
          sourceType: AccountingSourceType.PAYROLL_RUN,
          postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                debit: new Prisma.Decimal("100000.00"),
              }),
              expect.objectContaining({
                credit: new Prisma.Decimal("95800.00"),
              }),
            ]),
          }),
        }),
      }),
    );
    expect(tx.payrollPayslip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "EMITTED",
          documentHash: expect.stringMatching(/^sha256:/),
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ code: "NET_PAYABLE" }),
            ]),
          }),
        }),
      }),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.run.posted",
        idempotencyKey: "approve-key-1",
        postingBatchId: "batch-1",
        outboxMessages: expect.arrayContaining([
          expect.objectContaining({
            eventName: "payroll_run.posted",
            destination: "accounting",
          }),
          expect.objectContaining({
            eventName: "payslips.emitted",
            destination: "payroll",
          }),
        ]),
      }),
    );
  });

  it("marks certified close evidence stale when a payroll run is posted", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(payrollRunFixture());
    tx.journal.findFirst.mockResolvedValue({
      id: "journal-payroll",
      code: "PAY",
      type: JournalType.PAYROLL,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(mappedPayrollAccounts());
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
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
    tx.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" });
    tx.payrollPayslip.create.mockImplementation(
      async ({ data }: { data: any }) => ({
        id: "payslip-1",
        ...data,
      }),
    );
    tx.payrollRun.update.mockResolvedValue({
      ...payrollRunFixture(PayrollRunStatus.POSTED),
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      payslips: [{ id: "payslip-1" }],
    });
    tx.payrollPeriod.update.mockResolvedValue({
      id: "period-1",
      status: PayrollPeriodStatus.POSTED,
    });
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });
    tx.closeRun.findMany.mockResolvedValue([
      { id: "close-run-1", packExports: [{ id: "close-pack-export-1" }] },
    ]);
    tx.closeRun.findFirst.mockResolvedValue({
      id: "close-run-1",
      organizationId: "org-1",
      status: "CERTIFIED",
      metadata: { certifiedContentHash: "sha256:old-close" },
    });
    tx.closePackExport.findFirst.mockResolvedValue({
      id: "close-pack-export-1",
      metadata: { mode: "CERTIFIED" },
    });

    await approveAndPostPayrollRun({
      organizationId: "org-1",
      payrollRunId: "run-1",
      approvedById: "approver-1",
      actorPermissions: ["payroll.runs.approve"],
      lastAuthAt: "2026-06-30T00:00:00.000Z",
      now: "2026-06-30T00:01:00.000Z",
      idempotencyKey: "approve-key-1",
    });

    const eventTypes = mockedRecordBusinessEventInTx.mock.calls.map(
      ([, event]) => event.eventType,
    );
    expect(eventTypes.indexOf("payroll.run.posted")).toBeLessThan(
      eventTypes.indexOf("close.certification.invalidated"),
    );
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "close.certification.invalidated",
        payload: expect.objectContaining({
          sourceCode: "PAYROLL_RUN_POSTED",
          sourceDomain: "payroll",
          sourceModel: "PayrollRun",
          sourceEventName: "payroll.run.posted",
          sourceId: "run-1",
          staleReason: "Payroll run posting changed certified close evidence.",
          newEvidenceHash: "sha256:run-doc",
        }),
        metadata: expect.objectContaining({
          sourceCode: "PAYROLL_RUN_POSTED",
          sourceDomain: "payroll",
          staleReason: "Payroll run posting changed certified close evidence.",
        }),
        outboxMessages: [
          expect.objectContaining({
            channel: "REPORT_EXPORT",
            eventName: "close.certification.invalidated",
            metadata: expect.objectContaining({
              sourceCode: "PAYROLL_RUN_POSTED",
              sourceDomain: "payroll",
              sourceModel: "PayrollRun",
              sourceEventName: "payroll.run.posted",
            }),
          }),
        ],
      }),
    );
    expect(tx.closePackExport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close-pack-export-1" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              status: "EVIDENCE_STALE",
              sourceCode: "PAYROLL_RUN_POSTED",
              sourceDomain: "payroll",
              sourceId: "run-1",
              actorId: "approver-1",
              newEvidenceHash: "sha256:run-doc",
            }),
          }),
        }),
      }),
    );
    expect(tx.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close-run-1" },
        data: expect.objectContaining({
          status: "BLOCKED",
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              sourceCode: "PAYROLL_RUN_POSTED",
              sourceEventName: "payroll.run.posted",
            }),
          }),
        }),
      }),
    );
    expect(tx.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLOSE_CERTIFICATION_EVIDENCE_STALE",
          resourceType: "ClosePackExport",
          resourceId: "close-pack-export-1",
          message: "Payroll run posting changed certified close evidence.",
        }),
      }),
    );
  });

  it("returns posted payroll runs for identical approval replays without duplicate posting", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    const approvalPayloadHash = `sha256:${hashBusinessPayload({
      operation: "approveAndPostPayrollRun",
      payrollRunId: "run-1",
      approvedById: "approver-1",
    })}`;
    tx.payrollRun.findFirst.mockResolvedValue(
      payrollRunFixture(PayrollRunStatus.POSTED, { approvalPayloadHash }),
    );

    const result = await approveAndPostPayrollRun({
      organizationId: "org-1",
      payrollRunId: "run-1",
      approvedById: "approver-1",
      actorPermissions: ["payroll.runs.approve"],
      lastAuthAt: "2026-06-30T00:00:00.000Z",
      now: "2026-06-30T00:01:00.000Z",
    });

    expect(result.ledgerStatus).toBe("IDEMPOTENT_REPLAY");
    expect(mockedGetActivePostingRule).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("does not emit payroll events or payslips when journal creation fails", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx));
    tx.payrollRun.findFirst.mockResolvedValue(payrollRunFixture());
    tx.journal.findFirst.mockResolvedValue({
      id: "journal-payroll",
      code: "PAY",
      type: JournalType.PAYROLL,
    });
    tx.chartOfAccount.findMany.mockResolvedValue(mappedPayrollAccounts());
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
      status: LedgerPostingBatchStatus.POSTED,
    });
    tx.journalEntry.count.mockResolvedValue(0);
    tx.journalEntry.create.mockRejectedValue(new Error("journal failed"));

    await expect(
      approveAndPostPayrollRun({
        organizationId: "org-1",
        payrollRunId: "run-1",
        approvedById: "approver-1",
        actorPermissions: ["payroll.runs.approve"],
        lastAuthAt: "2026-06-30T00:00:00.000Z",
        now: "2026-06-30T00:01:00.000Z",
      }),
    ).rejects.toThrow("journal failed");

    expect(tx.payrollPayslip.create).not.toHaveBeenCalled();
    expect(tx.payrollRun.update).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
    expect(mockedMarkBusinessEventAppliedInTx).not.toHaveBeenCalled();
  });
});
