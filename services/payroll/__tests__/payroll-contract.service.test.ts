import {
  PayrollContractStatus,
  PayrollContractType,
  PayrollEmployeeStatus,
  Prisma,
} from "@prisma/client"

import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service")
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  }
})

import { db } from "@/prisma/db"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  createPayrollContract,
  getEmployeeContractWorkflow,
  resolvePayrollEmployeeForUser,
  terminatePayrollContract,
  updatePayrollContract,
} from "../contract.service"

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockedMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock

function buildTx() {
  return {
    payrollEmployee: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    payrollContract: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }
}

function useTransaction(tx: ReturnType<typeof buildTx>) {
  mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback(tx),
  )
}

function employeeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "emp-1",
    organizationId: "org-1",
    userId: "user-1",
    employeeNumber: "EMP-001",
    displayName: "Alice Ngono",
    legalName: "Alice Ngono",
    status: PayrollEmployeeStatus.ACTIVE,
    hireDate: new Date("2026-01-01T00:00:00.000Z"),
    terminationDate: null,
    countryCode: "CM",
    locationId: "loc-1",
    department: "Operations",
    jobTitle: "Store Manager",
    costCenter: "OPS",
    metadata: null,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    ...overrides,
  }
}

function contractRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    organizationId: "org-1",
    employeeId: "emp-1",
    employee: employeeRow(),
    contractNumber: "CTR-001",
    type: PayrollContractType.CDI,
    status: PayrollContractStatus.ACTIVE,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    baseSalary: new Prisma.Decimal("150000.00"),
    currency: "XAF",
    workingHoursPerMonth: new Prisma.Decimal("173.33"),
    classification: "M2",
    echelon: "E1",
    convention: "Retail",
    signedDocumentHash: "sha256:signed-contract-hash",
    activatedBusinessEventId: "event-active",
    metadata: null,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    ...overrides,
  }
}

describe("payroll employee contract workflow service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedRecordBusinessEventInTx.mockResolvedValue({ event: { id: "event-1" }, created: true })
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1", status: "APPLIED" })
  })

  it("returns tenant-scoped employee contract workflow data with salary redacted by default", async () => {
    const client = {
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([
          employeeRow({
            contracts: [contractRow()],
          }),
        ]),
      },
      auditLog: {
        create: jest.fn(),
      },
    }

    const result = await getEmployeeContractWorkflow(
      {
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["payroll.contracts.read"],
      },
      client as any,
    )

    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", deletedAt: null }),
      }),
    )
    expect(result.summary).toMatchObject({
      totalEmployees: 1,
      linkedEmployees: 1,
      activeContracts: 1,
      payrollEligible: 1,
      redactedContracts: 1,
    })
    expect(result.employees[0].contracts[0].baseSalary).toBe("[REDACTED:PAYROLL]")
    expect(JSON.stringify(result)).not.toContain("150000")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_EMPLOYEE_CONTRACT_WORKFLOW_READ",
          userId: "hr-1",
          organizationId: "org-1",
        }),
      }),
    )
  })

  it("blocks contract workflow reads when the payroll contract read permission is missing", async () => {
    const client = {
      payrollEmployee: { findMany: jest.fn() },
      auditLog: { create: jest.fn() },
    }

    await expect(
      getEmployeeContractWorkflow(
        {
          organizationId: "org-1",
          actorPermissions: [],
        },
        client as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(client.payrollEmployee.findMany).not.toHaveBeenCalled()
  })

  it("denies own-data resolution when the requested employee belongs to another user", async () => {
    const client = {
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([
          employeeRow({
            id: "emp-1",
            userId: "user-1",
          }),
        ]),
      },
    }

    await expect(
      resolvePayrollEmployeeForUser(
        {
          organizationId: "org-1",
          userId: "user-1",
          actorId: "user-1",
          requestedEmployeeId: "emp-2",
        },
        client as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it("creates an active contract only for a tenant-owned employee with signed evidence", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollEmployee.findFirst.mockResolvedValue(employeeRow())
    tx.payrollContract.findFirst.mockResolvedValue(null)
    tx.payrollContract.findMany.mockResolvedValue([])
    tx.payrollContract.create.mockImplementation(async ({ data }: { data: any }) =>
      contractRow({
        ...data,
        id: "contract-1",
        createdAt: new Date("2026-06-26T00:00:00.000Z"),
        updatedAt: new Date("2026-06-26T00:00:00.000Z"),
      }),
    )
    tx.payrollContract.update.mockImplementation(async ({ data }: { data: any }) =>
      contractRow({
        activatedBusinessEventId: data.activatedBusinessEventId ?? "event-1",
        metadata: data.metadata ?? null,
      }),
    )

    const result = await createPayrollContract({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.contracts.manage"],
      employeeId: "emp-1",
      contractNumber: "CTR-001",
      type: PayrollContractType.CDI,
      status: PayrollContractStatus.ACTIVE,
      effectiveFrom: "2026-01-01",
      baseSalary: "150000.00",
      signedDocumentHash: "sha256:signed-contract-hash",
    })

    expect(result).toMatchObject({
      businessEventId: "event-1",
      contract: {
        id: "contract-1",
        status: PayrollContractStatus.ACTIVE,
      },
    })
    expect(tx.payrollEmployee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "emp-1",
          organizationId: "org-1",
          deletedAt: null,
        }),
      }),
    )
    expect(tx.payrollContract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employeeId: "emp-1",
          status: PayrollContractStatus.ACTIVE,
        }),
      }),
    )
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.contract.lifecycle.created",
        sourceId: "contract-1",
        documentHash: "sha256:signed-contract-hash",
      }),
    )
    expect(mockedMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(tx, "org-1", "event-1")
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_CONTRACT_CREATED",
          entityId: "contract-1",
          userId: "hr-1",
          organizationId: "org-1",
        }),
      }),
    )
  })

  it("rejects contract creation when the employee is not tenant-owned", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollEmployee.findFirst.mockResolvedValue(null)

    await expect(
      createPayrollContract({
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["payroll.contracts.manage"],
        employeeId: "other-tenant-employee",
        contractNumber: "CTR-001",
        type: PayrollContractType.CDI,
        effectiveFrom: "2026-01-01",
        baseSalary: "150000.00",
      }),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(tx.payrollContract.create).not.toHaveBeenCalled()
  })

  it("rejects overlapping active contracts for the same employee", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollEmployee.findFirst.mockResolvedValue(employeeRow())
    tx.payrollContract.findFirst.mockResolvedValue(null)
    tx.payrollContract.findMany.mockResolvedValue([
      contractRow({
        id: "existing-contract",
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: null,
      }),
    ])

    await expect(
      createPayrollContract({
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["payroll.contracts.manage"],
        employeeId: "emp-1",
        contractNumber: "CTR-002",
        type: PayrollContractType.CDD,
        status: PayrollContractStatus.ACTIVE,
        effectiveFrom: "2026-06-01",
        baseSalary: "120000.00",
        signedDocumentHash: "sha256:second-contract-hash",
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.payrollContract.create).not.toHaveBeenCalled()
  })

  it("blocks active contract salary changes outside the compensation approval workflow", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollContract.findFirst.mockResolvedValue(contractRow())

    await expect(
      updatePayrollContract({
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["payroll.contracts.manage"],
        contractId: "contract-1",
        baseSalary: "180000.00",
        changeReason: "Manager request",
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.payrollContract.update).not.toHaveBeenCalled()
  })

  it("terminates a contract through lifecycle event and audit history", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollContract.findFirst.mockResolvedValue(contractRow())
    tx.payrollContract.update.mockImplementation(async ({ data }: { data: any }) =>
      contractRow({
        ...data,
        status: PayrollContractStatus.ENDED,
        effectiveTo: new Date("2026-06-30T00:00:00.000Z"),
      }),
    )

    const result = await terminatePayrollContract({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.contracts.manage"],
      contractId: "contract-1",
      effectiveTo: "2026-06-30",
      terminationReason: "End of employment",
    })

    expect(result).toMatchObject({
      businessEventId: "event-1",
      contract: {
        status: PayrollContractStatus.ENDED,
      },
    })
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.contract.lifecycle.terminated",
        sourceId: "contract-1",
      }),
    )
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_CONTRACT_TERMINATED",
          entityId: "contract-1",
        }),
      }),
    )
  })
})
