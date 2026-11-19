// Domain-unit fixtures isolate SQL locking; HR-14 PostgreSQL tests exercise real locks and concurrent decisions.
jest.mock("@/services/hris/review-lock.service",()=>({lockHrisReviewEmployeeInTx:jest.fn(),lockHrisReviewContractInTx:jest.fn(),lockHrisReviewSalaryInTx:jest.fn(),lockHrisReviewPaymentInTx:jest.fn(),lockHrisReviewAssignmentInTx:jest.fn()}))
import {
  PayrollAttendanceSnapshotStatus,
  PayrollContractStatus,
  PayrollEmployeeStatus,
} from "@prisma/client"

import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"

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
    $queryRaw: jest.fn().mockResolvedValue([]),
    businessEvent: {findFirst: jest.fn().mockResolvedValue(null)},
    organization: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    location: {
      findFirst: jest.fn(),
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
    expect(result.employees[0].evidence.latestDocumentHash).toBe("[REDACTED:HR_DOCUMENT]")
    expect(result.redaction.documentEvidenceDecision).toMatchObject({
      allowed: false,
      mode: "redact",
      reasonCode: "MISSING_PERMISSION",
    })
    expect(JSON.stringify(result.employees[0])).not.toContain("baseSalary")
    expect(JSON.stringify(result.employees[0])).not.toContain("bankAccount")
    expect(JSON.stringify(result.employees[0])).not.toContain("mobileMoneyPhone")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_EMPLOYEE_SOURCE_DATA_READ",
          userId: "hr-1",
          organizationId: "org-1",
          changes: expect.objectContaining({
            purpose: "HRIS_PAYROLL_EMPLOYEE_SOURCE_DATA_EVIDENCE_READ",
            documentEvidenceAccess: expect.objectContaining({
              allowed: false,
              policy: "kontava-payroll-document-evidence-redaction-policy",
            }),
          }),
        }),
      }),
    )
  })

  it("accepts HRIS read permission and scopes user mapping to the active tenant", async () => {
    const client = {
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([employeeSourceRow()]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: jest.fn(),
      },
    }

    await getPayrollEmployeeSourceData(
      {
        organizationId: "org-1",
        actorId: "user-1",
        actorPermissions: ["hris.people.read"],
        userId: "user-1",
      },
      client as any,
    )

    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          userId: "user-1",
          deletedAt: null,
        }),
      }),
    )
  })
  it("applies a server-resolved employee id set to manager source-data reads", async () => {
    const client = {
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([employeeSourceRow()]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: jest.fn(),
      },
    }

    const result = await getPayrollEmployeeSourceData({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeIds: ["emp-1"],
    }, client as any)

    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          id: { in: ["emp-1"] },
          deletedAt: null,
        }),
      }),
    )
    expect(result.employees).toHaveLength(1)
    expect(JSON.stringify(result.employees[0])).not.toMatch(/baseSalary|bankAccount|mobileMoneyPhone/)
  })
  it("returns HR document evidence hashes only to document-owning payroll roles", async () => {
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
        actorId: "hr-admin-1",
        actorPermissions: ["payroll.employees.read", "payroll.employees.manage"],
        asOf: new Date("2026-06-26T00:00:00.000Z"),
      },
      client as any,
    )

    expect(result.employees[0].evidence.latestDocumentHash).toBe("sha256:identity-hash")
    expect(result.redaction.documentEvidenceDecision).toMatchObject({
      allowed: true,
      mode: "allow",
      reasonCode: "ALLOWED",
    })
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_EMPLOYEE_SOURCE_DATA_READ",
          changes: expect.objectContaining({
            purpose: "HRIS_PAYROLL_EMPLOYEE_SOURCE_DATA_EVIDENCE_READ",
            documentEvidenceAccess: expect.objectContaining({
              allowed: true,
              policy: "kontava-payroll-document-evidence-redaction-policy",
            }),
          }),
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
    expect(client.auditLog.create).not.toHaveBeenCalled()
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

  it("records native effective facts and retains imported lineage on an edit", async () => {
    const tx=buildTx();useTransaction(tx);tx.organization.findFirst.mockResolvedValue({id:"org-1"});
    const origin={sourceSystem:"CSV_IMPORT",sourceRecordId:"row-7",sourceHash:"sha256:import-original",updatedAt:"2026-01-01T00:00:00.000Z"};
    const existing={...employeeSourceRow({metadata:{hrSourceData:origin}}),updatedAt:new Date("2026-10-01T00:00:00.000Z")};
    tx.payrollEmployee.findMany.mockResolvedValue([existing]);tx.payrollEmployee.update.mockImplementation(async ({data}:any)=>({...existing,...data}));
    const command={organizationId:"org-1",actorId:"hr-1",actorPermissions:["hris.people.manage"],employeeId:existing.id,expectedUpdatedAt:existing.updatedAt.toISOString(),employeeNumber:existing.employeeNumber,displayName:"Corrected name",hireDate:existing.hireDate,countryCode:"CM",idempotencyKey:"native-edit-1"};
    const result=await upsertPayrollEmployeeSourceProfile(command);
    const source=(result.payrollEmployee.metadata as any).hrSourceData;
    expect(source).toMatchObject({sourceSystem:"HRIS_NATIVE_PROFILE",originSourceReference:origin,updatedById:"hr-1"});
    expect(source.sourceHash).toMatch(/^sha256:[a-f0-9]{64}$/);expect(source.sourceHash).not.toBe(origin.sourceHash);
    const event=mockedRecordBusinessEventInTx.mock.calls.at(-1)![1];expect(event.payload.sourceReference.sourceHash).toBe(source.sourceHash);expect(source.sourceRecordId).toBe(event.payload.requestPayloadHash);
    tx.businessEvent.findFirst.mockResolvedValue({id:"retained-event",payload:{employeeId:existing.id,requestPayloadHash:event.payload.requestPayloadHash}});tx.payrollEmployee.findFirst.mockResolvedValue(result.payrollEmployee);
    const replay=await upsertPayrollEmployeeSourceProfile(command);expect(replay.payrollEmployee.metadata).toEqual(result.payrollEmployee.metadata);expect(tx.payrollEmployee.update).toHaveBeenCalledTimes(1);expect(mockedRecordBusinessEventInTx).toHaveBeenCalledTimes(1);
  });

  it.each(["hr-1",null])("only mints native creation provenance for an identified actor: %s",async actorId=>{
    const tx=buildTx();useTransaction(tx);tx.organization.findFirst.mockResolvedValue({id:"org-1"});tx.payrollEmployee.findMany.mockResolvedValue([]);tx.payrollEmployee.create.mockImplementation(async ({data}:any)=>({id:"emp-new",...data}));
    const result=await upsertPayrollEmployeeSourceProfile({organizationId:"org-1",actorId,actorPermissions:["hris.people.manage"],createOnly:true,employeeNumber:"NEW",displayName:"Native draft",hireDate:new Date("2026-01-01"),countryCode:"CM",idempotencyKey:"native-new"});
    const source=(result.payrollEmployee.metadata as any).hrSourceData;expect(source.sourceSystem).toBe(actorId?"HRIS_NATIVE_PROFILE":null);expect(source.sourceHash).toEqual(actorId?expect.stringMatching(/^sha256:[a-f0-9]{64}$/):null);
  });

  it("rejects an employee-user mapping when the user is not in the same tenant", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.organization.findFirst.mockResolvedValue({ id: "org-1" })
    tx.user.findFirst.mockResolvedValue(null)

    await expect(
      upsertPayrollEmployeeSourceProfile({
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["hris.people.manage"],
        employeeNumber: "EMP-001",
        displayName: "Alice Ngono",
        userId: "other-tenant-user",
        hireDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(tx.payrollEmployee.create).not.toHaveBeenCalled()
  })

  it("rejects employee location when the location is outside the tenant", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.organization.findFirst.mockResolvedValue({ id: "org-1" })
    tx.location.findFirst.mockResolvedValue(null)

    await expect(
      upsertPayrollEmployeeSourceProfile({
        organizationId: "org-1",
        actorId: "hr-1",
        actorPermissions: ["payroll.employees.manage"],
        employeeNumber: "EMP-001",
        displayName: "Alice Ngono",
        locationId: "other-tenant-location",
        hireDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(tx.location.findFirst).toHaveBeenCalledWith({
      where: {
        id: "other-tenant-location",
        organizationId: "org-1",
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(tx.payrollEmployee.findMany).not.toHaveBeenCalled()
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
        actorPermissions: ["hris.people.manage"],
        employeeNumber: "EMP-001",
        displayName: "Alice Ngono",
        userId: "user-1",
        hireDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.payrollEmployee.create).not.toHaveBeenCalled()
    expect(tx.payrollEmployee.update).not.toHaveBeenCalled()
  })

  it("surfaces an open HRIS lifecycle request as a payroll-readiness blocker", async () => {
    const client = {
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([
          employeeSourceRow({
            metadata: {
              hrisLifecycle: {
                pending: {
                  requestId: "lifecycle-request-1",
                  status: "APPROVED",
                },
              },
            },
          }),
        ]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "user-1",
            name: "Alice Ngono",
            email: "alice@example.com",
            firstName: "Alice",
            lastName: "Ngono",
            isActive: true,
          },
        ]),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    }

    const result = await getPayrollEmployeeSourceData({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["hris.people.read"],
    }, client as never)

    expect(result.employees[0].blockers).toContain("LIFECYCLE_REQUEST_PENDING")
    expect(result.summary.payrollReadyCandidates).toBe(0)
  })

  it("rejects direct status changes for an existing employee", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.organization.findFirst.mockResolvedValue({ id: "org-1" })
    tx.payrollEmployee.findMany.mockResolvedValue([employeeSourceRow()])

    await expect(upsertPayrollEmployeeSourceProfile({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["hris.people.manage"],
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      status: PayrollEmployeeStatus.SUSPENDED,
      hireDate: "2025-01-01",
    })).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.payrollEmployee.update).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
  })
  it("routes active employment field changes through lifecycle instead of overwriting movement truth",async()=>{
    const tx=buildTx();useTransaction(tx)
    tx.organization.findFirst.mockResolvedValue({id:"org-1"})
    tx.payrollEmployee.findMany.mockResolvedValue([employeeSourceRow()])
    await expect(upsertPayrollEmployeeSourceProfile({organizationId:"org-1",actorId:"hr-1",actorPermissions:["hris.people.manage"],
      employeeNumber:"EMP-001",displayName:"Synthetic employee",hireDate:"2025-01-01",department:"Changed outside lifecycle"})).rejects.toThrow("lifecycle workflow")
    expect(tx.payrollEmployee.update).not.toHaveBeenCalled()
  })
  it("does not mark a future approved lifecycle change due before its effective instant",async()=>{
    const client={payrollEmployee:{findMany:jest.fn().mockResolvedValue([employeeSourceRow({userId:null,metadata:{hrisLifecycle:{pending:{status:"APPROVED",effectiveAt:"2026-10-25T00:00:00Z"}}}})])},user:{findMany:jest.fn().mockResolvedValue([])},auditLog:{create:jest.fn()}}
    const input={organizationId:"org-1",actorId:"hr-1",actorPermissions:["hris.people.read"]}
    expect((await getPayrollEmployeeSourceData({...input,asOf:new Date("2026-10-24T23:59:59Z")},client as never)).employees[0].blockers).not.toContain("LIFECYCLE_REQUEST_PENDING")
    expect((await getPayrollEmployeeSourceData({...input,asOf:new Date("2026-10-25T00:00:00Z")},client as never)).employees[0].blockers).toContain("LIFECYCLE_REQUEST_PENDING")
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
