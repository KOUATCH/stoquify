import {
  PayrollAttendanceSnapshotStatus,
  PayrollContractStatus,
  PayrollEmployeeStatus,
} from "@prisma/client"

import { ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"

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
  attachPayrollEmployeeEvidenceReferences,
  getPayrollEmployeeSourceData,
  upsertPayrollEmployeeSourceProfile,
} from "../employee.service"

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockedMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock

function buildTx() {
  return {
    organization: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    payrollEmployee: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
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

function employeeSourceRow(overrides: Record<string, unknown> = {}) {
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
    taxIdentifierHash: "tax-hash",
    socialIdentifierHash: "social-hash",
    paymentDestinationHash: "payment-hash",
    metadata: {
      hrEvidenceReferences: [
        {
          type: "IDENTITY",
          documentHash: "sha256:identity-hash",
          attachedAt: "2026-06-25T00:00:00.000Z",
          attachedById: "hr-1",
        },
      ],
    },
    contracts: [
      {
        id: "contract-1",
        status: PayrollContractStatus.ACTIVE,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: null,
        signedDocumentHash: "sha256:contract-hash",
        activatedBusinessEventId: "evt-contract",
      },
    ],
    attendanceSnapshots: [
      {
        id: "att-1",
        status: PayrollAttendanceSnapshotStatus.FROZEN,
        periodStart: new Date("2026-06-01T00:00:00.000Z"),
        periodEnd: new Date("2026-06-30T00:00:00.000Z"),
        sourceHash: "sha256:attendance-hash",
        frozenAt: new Date("2026-06-20T00:00:00.000Z"),
      },
    ],
    ...overrides,
  }
}

describe("payroll employee source-data service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedRecordBusinessEventInTx.mockResolvedValue({ event: { id: "event-1" }, created: true })
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1", status: "APPLIED" })
  })

  it("returns a tenant-scoped source-data read model without salary or raw payment details", async () => {
    const client = {
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([employeeSourceRow()]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "user-1",
            name: null,
            email: "alice@example.com",
            firstName: "Alice",
            lastName: "Ngono",
            isActive: true,
          },
        ]),
      },
      auditLog: {
        create: jest.fn(),
      },
    }

    const result = await getPayrollEmployeeSourceData(
      {
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["PAYROLL_READ"],
        asOf: new Date("2026-06-26T00:00:00.000Z"),
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
      linkedUsers: 1,
      activeContractReady: 1,
      frozenAttendanceReady: 1,
      payrollReadyCandidates: 1,
    })
    expect(result.employees[0].userMapping.userEmailMasked).toBe("a***@example.com")
    expect(JSON.stringify(result.employees[0])).not.toContain("baseSalary")
    expect(JSON.stringify(result.employees[0])).not.toContain("bankAccount")
    expect(JSON.stringify(result.employees[0])).not.toContain("mobileMoneyPhone")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_EMPLOYEE_SOURCE_DATA_READ",
          userId: "hr-1",
          organizationId: "org-1",
        }),
      }),
    )
  })

  it("blocks source-data reads when payroll employee permission is missing", async () => {
    const client = {
      payrollEmployee: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      auditLog: { create: jest.fn() },
    }

    await expect(
      getPayrollEmployeeSourceData(
        {
          organizationId: "org-1",
          actorPermissions: [],
        },
        client as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(client.payrollEmployee.findMany).not.toHaveBeenCalled()
  })

  it("creates a payroll employee profile with tenant-bound user mapping, audit, and business event evidence", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.organization.findFirst.mockResolvedValue({ id: "org-1" })
    tx.user.findFirst.mockResolvedValue({ id: "user-1" })
    tx.payrollEmployee.findMany.mockResolvedValue([])
    tx.payrollEmployee.create.mockImplementation(async ({ data }: { data: any }) => ({
      id: "emp-1",
      ...data,
      createdAt: new Date("2026-06-26T00:00:00.000Z"),
      updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    }))

    const result = await upsertPayrollEmployeeSourceProfile({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.employees.manage"],
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      legalName: "Alice Ngono",
      userId: "user-1",
      status: PayrollEmployeeStatus.ACTIVE,
      hireDate: "2026-01-01",
      countryCode: "cm",
      department: "Operations",
      jobTitle: "Store Manager",
      sourceReference: {
        sourceSystem: "manual-plan",
        sourceRecordId: "EMP-001",
        sourceHash: "sha256:source-record-hash",
      },
      evidenceReferences: [
        {
          type: "IDENTITY",
          documentHash: "sha256:identity-hash",
        },
      ],
    })

    expect(result).toMatchObject({
      created: true,
      businessEventId: "event-1",
      evidenceReferenceCount: 1,
    })
    expect(tx.payrollEmployee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          userId: "user-1",
          employeeNumber: "EMP-001",
          countryCode: "CM",
        }),
      }),
    )
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.employee.source_data.upserted",
        sourceId: "emp-1",
        payload: expect.objectContaining({
          employeeId: "emp-1",
          employeeNumber: "EMP-001",
          userLinked: true,
        }),
      }),
    )
    expect(mockedMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(tx, "org-1", "event-1")
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_EMPLOYEE_SOURCE_DATA_CREATED",
          entityId: "emp-1",
          organizationId: "org-1",
          userId: "hr-1",
        }),
      }),
    )
  })

  it("rejects an employee-user mapping when the user is not in the same tenant", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.organization.findFirst.mockResolvedValue({ id: "org-1" })
    tx.user.findFirst.mockResolvedValue(null)

    await expect(
      upsertPayrollEmployeeSourceProfile({
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["payroll.employees.manage"],
        employeeNumber: "EMP-001",
        displayName: "Alice Ngono",
        userId: "other-tenant-user",
        hireDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(tx.payrollEmployee.create).not.toHaveBeenCalled()
  })

  it("rejects duplicate employee-number and user mappings that point to different records", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.organization.findFirst.mockResolvedValue({ id: "org-1" })
    tx.user.findFirst.mockResolvedValue({ id: "user-1" })
    tx.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "emp-by-number",
        employeeNumber: "EMP-001",
        userId: null,
        displayName: "Alice One",
        status: PayrollEmployeeStatus.DRAFT,
        hireDate: new Date("2026-01-01T00:00:00.000Z"),
        metadata: null,
      },
      {
        id: "emp-by-user",
        employeeNumber: "EMP-999",
        userId: "user-1",
        displayName: "Alice Two",
        status: PayrollEmployeeStatus.DRAFT,
        hireDate: new Date("2026-01-01T00:00:00.000Z"),
        metadata: null,
      },
    ])

    await expect(
      upsertPayrollEmployeeSourceProfile({
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["payroll.employees.manage"],
        employeeNumber: "EMP-001",
        displayName: "Alice Ngono",
        userId: "user-1",
        hireDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.payrollEmployee.create).not.toHaveBeenCalled()
    expect(tx.payrollEmployee.update).not.toHaveBeenCalled()
  })

  it("attaches HR evidence references without storing document payloads", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollEmployee.findFirst.mockResolvedValue({
      id: "emp-1",
      organizationId: "org-1",
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      status: PayrollEmployeeStatus.ACTIVE,
      hireDate: new Date("2026-01-01T00:00:00.000Z"),
      metadata: {
        hrEvidenceReferences: [
          {
            type: "IDENTITY",
            documentHash: "sha256:identity-hash",
          },
        ],
      },
    })
    tx.payrollEmployee.update.mockImplementation(async ({ data }: { data: any }) => ({
      id: "emp-1",
      employeeNumber: "EMP-001",
      ...data,
    }))

    const result = await attachPayrollEmployeeEvidenceReferences({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.employees.manage"],
      employeeId: "emp-1",
      evidenceReferences: [
        {
          type: "CONTRACT",
          documentHash: "sha256:contract-hash",
          label: "Signed contract",
        },
      ],
    })

    const metadata = tx.payrollEmployee.update.mock.calls[0][0].data.metadata
    expect(metadata.hrEvidenceReferences).toHaveLength(2)
    expect(JSON.stringify(metadata)).not.toContain("documentPayload")
    expect(result).toMatchObject({
      businessEventId: "event-1",
      evidenceReferenceCount: 2,
    })
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_EMPLOYEE_EVIDENCE_ATTACHED",
          entityId: "emp-1",
          organizationId: "org-1",
        }),
      }),
    )
  })
})
