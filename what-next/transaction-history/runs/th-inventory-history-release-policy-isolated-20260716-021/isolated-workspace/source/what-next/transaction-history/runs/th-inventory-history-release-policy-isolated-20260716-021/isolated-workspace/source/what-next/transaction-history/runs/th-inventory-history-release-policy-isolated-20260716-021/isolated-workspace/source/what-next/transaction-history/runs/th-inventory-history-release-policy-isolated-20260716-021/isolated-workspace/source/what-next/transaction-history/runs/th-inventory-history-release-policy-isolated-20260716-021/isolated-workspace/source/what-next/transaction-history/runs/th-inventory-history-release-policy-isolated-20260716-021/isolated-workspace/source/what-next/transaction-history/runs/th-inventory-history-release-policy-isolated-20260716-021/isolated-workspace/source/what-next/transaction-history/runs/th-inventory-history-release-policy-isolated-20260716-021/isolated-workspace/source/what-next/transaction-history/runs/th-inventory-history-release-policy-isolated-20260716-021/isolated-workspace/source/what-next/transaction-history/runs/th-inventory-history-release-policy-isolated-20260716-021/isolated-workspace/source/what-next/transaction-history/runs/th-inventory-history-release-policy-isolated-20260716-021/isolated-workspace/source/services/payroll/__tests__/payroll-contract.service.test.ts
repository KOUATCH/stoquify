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
  approvePayrollContractActivationFromHris,
  createPayrollContract,
  getEmployeeContractWorkflow,
  requestPayrollContractActivationFromHris,
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

function approvedDocumentEvidenceMetadata() {
  return {
    hrisDocumentEvidence: {
      current: {
        status: "APPROVED",
        artifactHash: "sha256:signed-contract-hash",
        approvalBusinessEventId: "document-approval-event",
      },
    },
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

  it("rejects direct active contract creation even when a signed hash is supplied", async () => {
    const tx = buildTx()
    useTransaction(tx)

    await expect(createPayrollContract({
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
    })).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.payrollContract.create).not.toHaveBeenCalled()
  })
  it("rejects direct signed evidence on a draft contract", async () => {
    const tx = buildTx()
    useTransaction(tx)

    await expect(createPayrollContract({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.contracts.manage"],
      employeeId: "emp-1",
      contractNumber: "CTR-001",
      type: PayrollContractType.CDI,
      effectiveFrom: "2026-01-01",
      baseSalary: "150000.00",
      signedDocumentHash: "sha256:signed-contract-hash",
    })).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.payrollContract.create).not.toHaveBeenCalled()
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

  it("rejects overlapping active contracts during HRIS approval", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollContract.findFirst.mockResolvedValue(contractRow({
      status: PayrollContractStatus.DRAFT,
      activatedBusinessEventId: null,
      metadata: {
        ...approvedDocumentEvidenceMetadata(),
        hrisContractApproval: {
          pending: {
            requestId: "request-event-1",
            requestedById: "maker-1",
            requestedAt: "2026-06-25T00:00:00.000Z",
            reasonHash: "sha256:reason-hash",
            requestEvidenceHash: "sha256:request-evidence",
          },
        },
      },
    }))
    tx.payrollContract.findMany.mockResolvedValue([
      contractRow({
        id: "existing-contract",
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: null,
      }),
    ])

    await expect(
      approvePayrollContractActivationFromHris({
        organizationId: "org-1",
        actorId: "checker-1",
        actorPermissions: ["hris.people.manage"],
        employeeId: "emp-1",
        contractId: "contract-1",
        decisionReasonHash: "sha256:decision-reason",
        approvalEvidenceHash: "sha256:approval-evidence",
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.payrollContract.update).not.toHaveBeenCalled()
  })
  it("records an HRIS activation request without activating the draft contract", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollContract.findFirst.mockResolvedValue(contractRow({
      status: PayrollContractStatus.DRAFT,
      activatedBusinessEventId: null,
      metadata: approvedDocumentEvidenceMetadata(),
    }))

    const result = await requestPayrollContractActivationFromHris({
      organizationId: "org-1",
      actorId: "maker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      contractId: "contract-1",
      reasonHash: "sha256:reason-hash",
      requestEvidenceHash: "sha256:request-evidence",
    })

    expect(result).toEqual({
      contractId: "contract-1",
      employeeId: "emp-1",
      status: "REQUESTED",
      requestId: "event-1",
    })
    expect(tx.payrollContract.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ status: PayrollContractStatus.ACTIVE }),
    }))
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(tx, expect.objectContaining({
      eventType: "hris.contract.activation.requested",
      documentHash: "sha256:request-evidence",
    }))
  })

  it("prevents the activation requester from approving the contract", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollContract.findFirst.mockResolvedValue(contractRow({
      status: PayrollContractStatus.DRAFT,
      activatedBusinessEventId: null,
      metadata: {
        ...approvedDocumentEvidenceMetadata(),
        hrisContractApproval: {
          pending: {
            requestId: "request-event-1",
            requestedById: "maker-1",
            requestedAt: "2026-06-25T00:00:00.000Z",
            reasonHash: "sha256:reason-hash",
            requestEvidenceHash: "sha256:request-evidence",
          },
        },
      },
    }))

    await expect(approvePayrollContractActivationFromHris({
      organizationId: "org-1",
      actorId: "maker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      contractId: "contract-1",
      decisionReasonHash: "sha256:decision-reason",
      approvalEvidenceHash: "sha256:approval-evidence",
    })).rejects.toBeInstanceOf(ForbiddenError)

    expect(tx.payrollContract.update).not.toHaveBeenCalled()
  })

  it("blocks direct draft-to-active updates outside HRIS approval", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollContract.findFirst.mockResolvedValue(contractRow({
      status: PayrollContractStatus.DRAFT,
      activatedBusinessEventId: null,
    }))

    await expect(updatePayrollContract({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.contracts.manage"],
      contractId: "contract-1",
      status: PayrollContractStatus.ACTIVE,
    })).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.payrollContract.update).not.toHaveBeenCalled()
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
