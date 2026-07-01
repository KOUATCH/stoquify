jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    location: { findFirst: jest.fn() },
    salesOrder: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    payment: { aggregate: jest.fn(), findFirst: jest.fn() },
    inventoryLevel: { aggregate: jest.fn(), findFirst: jest.fn() },
    inventoryTransaction: { count: jest.fn(), findFirst: jest.fn() },
    purchaseOrder: { count: jest.fn(), findFirst: jest.fn() },
    stockTransfer: { count: jest.fn() },
    journalEntryLine: { count: jest.fn() },
    pOSSession: { count: jest.fn(), findFirst: jest.fn() },
    payrollEmployee: { count: jest.fn() },
    payrollAttendanceSnapshot: { count: jest.fn(), findFirst: jest.fn() },
    payrollRunLine: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

import { db } from "@/prisma/db";

import { getBranchOperatingSnapshot } from "../branch-operating-snapshot.service";

const mockDb = db as unknown as {
  location: { findFirst: jest.Mock };
  salesOrder: { aggregate: jest.Mock; count: jest.Mock; findFirst: jest.Mock };
  payment: { aggregate: jest.Mock; findFirst: jest.Mock };
  inventoryLevel: { aggregate: jest.Mock; findFirst: jest.Mock };
  inventoryTransaction: { count: jest.Mock; findFirst: jest.Mock };
  purchaseOrder: { count: jest.Mock; findFirst: jest.Mock };
  stockTransfer: { count: jest.Mock };
  journalEntryLine: { count: jest.Mock };
  pOSSession: { count: jest.Mock; findFirst: jest.Mock };
  payrollEmployee: { count: jest.Mock };
  payrollAttendanceSnapshot: { count: jest.Mock; findFirst: jest.Mock };
  payrollRunLine: {
    aggregate: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
  };
};

describe("branch operating snapshot payroll allocation proof", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupBranchData();
  });

  it("surfaces approved aggregate payroll cost allocation for branch profitability", async () => {
    const result = await getBranchOperatingSnapshot({
      organizationId: "org-1",
      locationId: "loc-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-30T12:00:00.000Z",
    });

    expect(mockDb.payrollRunLine.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          employee: expect.objectContaining({ locationId: "loc-1" }),
        }),
        _sum: expect.objectContaining({
          grossAmount: true,
          employerChargeAmount: true,
        }),
      }),
    );
    expect(result.metrics).toMatchObject({
      completedSalesRevenue: 500000,
      posShiftCount: 5,
      closedPosShiftCount: 4,
      payrollEmployeeAtLocationCount: 3,
      frozenAttendanceSnapshotCount: 2,
      approvedPayrollRunLineCount: 2,
      unallocatedPayrollRunLineCount: 0,
      payrollGrossAmount: 180000,
      payrollEmployerChargeAmount: 40000,
      payrollNetPayAmount: 140000,
      payrollAllocatedCostAmount: 220000,
      payrollProfitContribution: 280000,
    });
    expect(result.status).toBe("fresh");
    expect(result.uiState).toBe("redacted");
    expect(result.sourceModules).toEqual(
      expect.arrayContaining(["pos", "payroll", "sales"]),
    );
    expect(result.redactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "payroll.personLevelAmounts" }),
      ]),
    );
  });

  it("keeps branch profitability partial when POS and sales exist without frozen payroll proof", async () => {
    mockDb.payrollAttendanceSnapshot.count.mockResolvedValue(0);
    mockDb.payrollRunLine.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _sum: {
        grossAmount: null,
        employerChargeAmount: null,
        netPayableAmount: null,
      },
    });
    mockDb.payrollRunLine.count.mockReset();
    mockDb.payrollRunLine.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const result = await getBranchOperatingSnapshot({
      organizationId: "org-1",
      locationId: "loc-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-30T12:00:00.000Z",
    });

    expect(result.status).toBe("partial");
    expect(result.metrics).toMatchObject({
      completedSalesCount: 8,
      posShiftCount: 5,
      frozenAttendanceSnapshotCount: 0,
      approvedPayrollRunLineCount: 0,
      unallocatedPayrollRunLineCount: 1,
      payrollAllocatedCostAmount: 0,
      payrollProfitContribution: 500000,
    });
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gate: "branch_payroll_profitability" }),
        expect.objectContaining({ gate: "branch_payroll_inputs" }),
        expect.objectContaining({ gate: "branch_payroll_allocation" }),
      ]),
    );
  });
});

function setupBranchData() {
  mockDb.location.findFirst.mockResolvedValue({
    id: "loc-1",
    isActive: true,
    updatedAt: new Date("2026-06-29T08:00:00.000Z"),
  });
  mockDb.salesOrder.aggregate.mockResolvedValue({ _sum: { total: 500000 } });
  mockDb.salesOrder.count.mockResolvedValue(8);
  mockDb.payment.aggregate.mockResolvedValue({ _sum: { amount: 450000 } });
  mockDb.inventoryLevel.aggregate.mockResolvedValue({
    _sum: { totalValue: 750000 },
  });
  mockDb.inventoryTransaction.count.mockResolvedValue(6);
  mockDb.purchaseOrder.count.mockResolvedValue(1);
  mockDb.stockTransfer.count.mockResolvedValue(0);
  mockDb.journalEntryLine.count.mockResolvedValue(1);
  mockDb.pOSSession.count.mockResolvedValueOnce(5).mockResolvedValueOnce(4);
  mockDb.payrollEmployee.count.mockResolvedValue(3);
  mockDb.payrollAttendanceSnapshot.count.mockResolvedValue(2);
  mockDb.payrollRunLine.aggregate.mockResolvedValue({
    _count: { _all: 2 },
    _sum: {
      grossAmount: 180000,
      employerChargeAmount: 40000,
      netPayableAmount: 140000,
    },
  });
  mockDb.payrollRunLine.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
  mockDb.pOSSession.findFirst.mockResolvedValue({
    updatedAt: new Date("2026-06-29T09:00:00.000Z"),
  });
  mockDb.payrollAttendanceSnapshot.findFirst.mockResolvedValue({
    updatedAt: new Date("2026-06-29T10:00:00.000Z"),
  });
  mockDb.payrollRunLine.findFirst.mockResolvedValue({
    updatedAt: new Date("2026-06-29T11:00:00.000Z"),
  });
  mockDb.salesOrder.findFirst.mockResolvedValue({
    updatedAt: new Date("2026-06-29T12:00:00.000Z"),
  });
  mockDb.payment.findFirst.mockResolvedValue({
    updatedAt: new Date("2026-06-29T13:00:00.000Z"),
  });
  mockDb.inventoryLevel.findFirst.mockResolvedValue({
    updatedAt: new Date("2026-06-29T14:00:00.000Z"),
  });
  mockDb.inventoryTransaction.findFirst.mockResolvedValue({
    createdAt: new Date("2026-06-29T15:00:00.000Z"),
  });
  mockDb.purchaseOrder.findFirst.mockResolvedValue({
    updatedAt: new Date("2026-06-29T16:00:00.000Z"),
  });
}
