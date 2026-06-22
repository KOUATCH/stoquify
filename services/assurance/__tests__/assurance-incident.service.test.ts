jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: mockPrismaClient(),
}))

function mockPrismaClient() {
  const client = {
    $transaction: jest.fn((handler) => handler(client)),
    workflowAssuranceIncident: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    workflowAssuranceIncidentEvent: {
      create: jest.fn(),
    },
    workflowAssuranceAlertDelivery: {
      upsert: jest.fn(),
    },
    workflowAssuranceWaiver: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }

  return client
}

import { db } from "@/prisma/db"

import {
  INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS,
  normalizeAssuranceResult,
} from "../assurance-registry-contracts"
import {
  approveWorkflowAssuranceWaiver,
  requestWorkflowAssuranceWaiver,
  resolveWorkflowAssuranceIncident,
  upsertWorkflowAssuranceIncidentFromResult,
} from "../assurance-incident.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  workflowAssuranceIncident: {
    findUnique: jest.Mock
    findFirst: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }
  workflowAssuranceIncidentEvent: {
    create: jest.Mock
  }
  workflowAssuranceAlertDelivery: {
    upsert: jest.Mock
  }
  workflowAssuranceWaiver: {
    create: jest.Mock
    findFirst: jest.Mock
    update: jest.Mock
  }
  auditLog: {
    create: jest.Mock
  }
}

const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS[0]

describe("workflow assurance incident service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation((handler) => handler(mockDb))
  })

  it("creates a durable incident with event, alert delivery, and audit history", async () => {
    const result = failedResult("hash-1")
    mockDb.workflowAssuranceIncident.findUnique.mockResolvedValue(null)
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue(null)
    mockDb.workflowAssuranceIncident.create.mockImplementation(async ({ data }) =>
      incidentRecord({
        ...data,
        id: "incident-1",
      }),
    )
    mockDb.workflowAssuranceAlertDelivery.upsert.mockResolvedValue({ id: "delivery-1" })
    mockDb.workflowAssuranceIncidentEvent.create.mockResolvedValue({ id: "event-1" })
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" })

    const incident = await upsertWorkflowAssuranceIncidentFromResult({
      organizationId: "org-1",
      definitionId: "definition-1",
      checkRunId: "run-1",
      definition,
      result,
      actorId: "user-1",
    })

    expect(incident?.id).toBe("incident-1")
    expect(incident?.evidenceGrade).toBe("blocked")
    expect(incident?.proofSummary.freshness).toBe("blocked")
    expect(incident?.redactions).toEqual([])
    expect(mockDb.workflowAssuranceIncident.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          definitionId: "definition-1",
          checkRunId: "run-1",
          checkKey: definition.checkKey,
          status: "OPEN",
          severity: "BLOCKING",
          sourceType: "journal_entries",
          sourceId: "aggregate",
          sourceHash: "hash-1",
          evidenceGrade: "blocked",
        }),
      }),
    )
    expect(mockDb.workflowAssuranceIncidentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: "CREATED", toStatus: "OPEN" }),
      }),
    )
    expect(mockDb.workflowAssuranceAlertDelivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          channel: "IN_APP",
          status: "PENDING",
          dedupeKey: `created:${result.fingerprint}:hash-1`,
        }),
      }),
    )
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "WORKFLOW_ASSURANCE_INCIDENT_CREATED" }),
      }),
    )
  })

  it("dedupes unchanged source failures and increments occurrence history", async () => {
    const existing = incidentRecord({
      id: "incident-1",
      sourceHash: "hash-1",
      fingerprint: "fingerprint-1",
      occurrenceCount: 2,
    })
    mockDb.workflowAssuranceIncident.findUnique.mockResolvedValue(existing)
    mockDb.workflowAssuranceIncident.update.mockResolvedValue({
      ...existing,
      occurrenceCount: 3,
      lastDetectedAt: new Date("2026-06-21T09:00:00.000Z"),
    })

    const incident = await upsertWorkflowAssuranceIncidentFromResult({
      organizationId: "org-1",
      definitionId: "definition-1",
      definition,
      result: failedResult("hash-1", "fingerprint-1"),
    })

    expect(incident?.occurrenceCount).toBe(3)
    expect(mockDb.workflowAssuranceIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          occurrenceCount: { increment: 1 },
        }),
      }),
    )
    expect(mockDb.workflowAssuranceAlertDelivery.upsert).not.toHaveBeenCalled()
    expect(mockDb.workflowAssuranceIncidentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: "DUPLICATE_DETECTED" }),
      }),
    )
  })

  it("reopens a resolved incident when the same fingerprint has a newer source hash", async () => {
    const resolved = incidentRecord({
      id: "incident-1",
      status: "RESOLVED",
      sourceHash: "old-hash",
      fingerprint: "fingerprint-1",
      resolvedAt: new Date("2026-06-20T08:00:00.000Z"),
      resolvedById: "user-2",
    })
    mockDb.workflowAssuranceIncident.findUnique.mockResolvedValue(null)
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue(resolved)
    mockDb.workflowAssuranceIncident.update.mockResolvedValue({
      ...resolved,
      status: "REOPENED",
      sourceHash: "new-hash",
      reopenedAt: new Date("2026-06-21T09:00:00.000Z"),
      resolvedAt: null,
      resolvedById: null,
    })

    const incident = await upsertWorkflowAssuranceIncidentFromResult({
      organizationId: "org-1",
      definitionId: "definition-1",
      definition,
      result: failedResult("new-hash", "fingerprint-1"),
    })

    expect(incident?.status).toBe("reopened")
    expect(incident?.sourceHash).toBe("new-hash")
    expect(incident?.evidenceGrade).toBe("blocked")
    expect(incident?.proofSummary.freshness).toBe("stale")
    expect(mockDb.workflowAssuranceAlertDelivery.upsert).toHaveBeenCalled()
    expect(mockDb.workflowAssuranceIncidentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: "REOPENED", fromStatus: "RESOLVED", toStatus: "REOPENED" }),
      }),
    )
  })

  it("keeps evidence grade server-owned when result metadata claims a stronger grade", async () => {
    const result = normalizeAssuranceResult({
      organizationId: "org-1",
      checkKey: definition.checkKey,
      status: "failed",
      severity: "blocking",
      sourceType: "journal_entries",
      sourceId: "aggregate",
      sourceHash: "hash-client-grade",
      metadata: { evidenceGrade: "certified" },
    })
    mockDb.workflowAssuranceIncident.findUnique.mockResolvedValue(null)
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue(null)
    mockDb.workflowAssuranceIncident.create.mockImplementation(async ({ data }) =>
      incidentRecord({
        ...data,
        id: "incident-client-grade",
      }),
    )
    mockDb.workflowAssuranceAlertDelivery.upsert.mockResolvedValue({ id: "delivery-1" })
    mockDb.workflowAssuranceIncidentEvent.create.mockResolvedValue({ id: "event-1" })
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" })

    const incident = await upsertWorkflowAssuranceIncidentFromResult({
      organizationId: "org-1",
      definitionId: "definition-1",
      definition,
      result,
    })

    expect(mockDb.workflowAssuranceIncident.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidenceGrade: "blocked",
          metadata: expect.objectContaining({
            resultMetadata: expect.objectContaining({ evidenceGrade: "certified" }),
          }),
        }),
      }),
    )
    expect(incident?.evidenceGrade).toBe("blocked")
    expect(incident?.metadata).toEqual(
      expect.objectContaining({
        resultMetadata: expect.objectContaining({ evidenceGrade: "certified" }),
      }),
    )
  })

  it("projects supported proof subjects from incident evidence links", async () => {
    const result = normalizeAssuranceResult({
      organizationId: "org-1",
      checkKey: definition.checkKey,
      status: "failed",
      severity: "blocking",
      sourceType: "workflow_assurance_check",
      sourceId: definition.checkKey,
      sourceHash: "hash-proof",
      evidenceLinks: [
        {
          sourceTable: "journal_entries",
          sourceId: "journal-entry-1",
          sourceHash: "journal-hash-1",
          label: "Journal entry JE-1",
          route: "/dashboard/accounting/journals/journal-entry-1",
        },
      ],
    })
    mockDb.workflowAssuranceIncident.findUnique.mockResolvedValue(null)
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue(null)
    mockDb.workflowAssuranceIncident.create.mockImplementation(async ({ data }) =>
      incidentRecord({
        ...data,
        id: "incident-proof",
      }),
    )
    mockDb.workflowAssuranceAlertDelivery.upsert.mockResolvedValue({ id: "delivery-1" })
    mockDb.workflowAssuranceIncidentEvent.create.mockResolvedValue({ id: "event-1" })
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" })

    const incident = await upsertWorkflowAssuranceIncidentFromResult({
      organizationId: "org-1",
      definitionId: "definition-1",
      definition,
      result,
    })

    expect(incident?.sourceLabel).toBe("Journal entry JE-1")
    expect(incident?.sourceLinks[0]).toEqual(
      expect.objectContaining({
        sourceTable: "journal_entries",
        sourceId: "journal-entry-1",
      }),
    )
    expect(incident?.proofSubject).toEqual({
      subjectType: "journal.entry",
      subjectId: "journal-entry-1",
      available: true,
    })
    expect(incident?.proofSummary.proofSubject).toEqual(incident?.proofSubject)
  })

  it("redacts sensitive incident evidence and notification details by default", async () => {
    const payrollDefinition = {
      ...definition,
      checkKey: "payroll.destination.evidence.required",
      workflow: "payroll" as const,
      moduleSlug: "payroll",
      invariantName: "Payroll payment destinations must keep source evidence.",
      actionRoute: "/dashboard/payroll/runs",
      ownerRole: "payroll_manager",
      sourceTables: ["payroll_runs", "payroll_payment_batches"],
    }
    const result = normalizeAssuranceResult({
      organizationId: "org-1",
      checkKey: payrollDefinition.checkKey,
      status: "failed",
      severity: "blocking",
      sourceType: "payroll_payment_batches",
      sourceId: "payroll-batch-123",
      sourceHash: "hash-payroll",
      message: "Payroll destination MTN-ACCOUNT-555-0100 failed evidence verification.",
      metadata: { payrollDestination: "MTN-ACCOUNT-555-0100" },
      evidenceLinks: [
        {
          sourceTable: "payroll_runs",
          sourceId: "payroll-run-1",
          label: "Payroll run June",
          route: "/dashboard/payroll/runs/payroll-run-1",
        },
      ],
    })
    mockDb.workflowAssuranceIncident.findUnique.mockResolvedValue(null)
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue(null)
    mockDb.workflowAssuranceIncident.create.mockImplementation(async ({ data }) =>
      incidentRecord({
        ...data,
        id: "incident-payroll",
      }),
    )
    mockDb.workflowAssuranceAlertDelivery.upsert.mockResolvedValue({ id: "delivery-1" })
    mockDb.workflowAssuranceIncidentEvent.create.mockResolvedValue({ id: "event-1" })
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" })

    const incident = await upsertWorkflowAssuranceIncidentFromResult({
      organizationId: "org-1",
      definitionId: "definition-payroll",
      definition: payrollDefinition,
      result,
    })

    expect(incident?.sourceId).toBe("[REDACTED:PAYROLL]")
    expect(incident?.sourceLabel).toBe("Redacted evidence")
    expect(incident?.metadata).toEqual(
      expect.objectContaining({
        redacted: true,
        policy: "kontava-payroll-person-redaction-policy",
      }),
    )
    expect(incident?.sourceLinks[0]).toEqual(
      expect.objectContaining({
        label: "Redacted evidence",
        sourceId: "[REDACTED:PAYROLL]",
      }),
    )
    expect(incident?.redactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "sourceId",
          policy: "kontava-payroll-person-redaction-policy",
        }),
        expect.objectContaining({
          field: "metadata",
          policy: "kontava-payroll-person-redaction-policy",
        }),
      ]),
    )
    expect(mockDb.workflowAssuranceAlertDelivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          message: "Workflow assurance incident requires review. Sensitive evidence details are protected.",
        }),
      }),
    )
  })

  it("requires a resolution note and records resolved state transitions", async () => {
    const open = incidentRecord({ id: "incident-1", status: "OPEN" })
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue(open)
    mockDb.workflowAssuranceIncident.update.mockResolvedValue({
      ...open,
      status: "RESOLVED",
      resolvedAt: new Date("2026-06-21T09:00:00.000Z"),
      resolvedById: "user-1",
      resolutionNote: "Source links repaired.",
    })

    const incident = await resolveWorkflowAssuranceIncident({
      organizationId: "org-1",
      incidentId: "incident-1",
      actorId: "user-1",
      note: "Source links repaired.",
    })

    expect(incident.status).toBe("resolved")
    expect(mockDb.workflowAssuranceIncidentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: "RESOLVED", fromStatus: "OPEN", toStatus: "RESOLVED" }),
      }),
    )
  })

  it("enforces maker-checker on waiver approval", async () => {
    const open = incidentRecord({ id: "incident-1", status: "OPEN" })
    mockDb.workflowAssuranceIncident.findFirst.mockResolvedValue(open)
    mockDb.workflowAssuranceWaiver.create.mockImplementation(async ({ data }) => waiverRecord(data))

    const waiver = await requestWorkflowAssuranceWaiver({
      organizationId: "org-1",
      incidentId: "incident-1",
      actorId: "user-1",
      reason: "Supplier evidence is delayed but accountant has external proof.",
      evidenceHash: "sha256-waiver-proof",
      expiresAt: new Date("2026-07-01T00:00:00.000Z"),
    })

    mockDb.workflowAssuranceWaiver.findFirst.mockResolvedValue({
      ...waiverRecord({
        id: waiver.id,
        incidentId: "incident-1",
        requesterId: "user-1",
        expiresAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
      incident: open,
    })

    await expect(
      approveWorkflowAssuranceWaiver({
        organizationId: "org-1",
        waiverId: waiver.id,
        actorId: "user-1",
      }),
    ).rejects.toThrow(/requester cannot approve/i)
  })
})

function failedResult(sourceHash: string, fingerprint = "fingerprint-1") {
  return normalizeAssuranceResult({
    organizationId: "org-1",
    checkKey: definition.checkKey,
    status: "failed",
    severity: "blocking",
    sourceType: "journal_entries",
    sourceId: "aggregate",
    sourceHash,
    metadata: { missingSourceLinkCount: 1, rawPayload: { secret: "hidden" } },
  }) satisfies ReturnType<typeof normalizeAssuranceResult> & { fingerprint: string }
}

function incidentRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-06-21T08:00:00.000Z")
  return {
    id: "incident-1",
    organizationId: "org-1",
    definitionId: "definition-1",
    checkRunId: "run-1",
    checkKey: definition.checkKey,
    definitionVersion: 1,
    workflow: "LEDGER",
    moduleSlug: "accounting",
    sourceType: "journal_entries",
    sourceId: "aggregate",
    sourceHash: "hash-1",
    fingerprint: "fingerprint-1",
    title: definition.invariantName,
    detail: "Posted source-backed journal entries are missing accounting source links.",
    severity: "BLOCKING",
    status: "OPEN",
    evidenceGrade: "blocked",
    sourceLinks: [],
    assignedRole: "accountant",
    ownerId: null,
    dueAt: null,
    actionRoute: definition.actionRoute,
    firstDetectedAt: now,
    lastDetectedAt: now,
    resolvedAt: null,
    resolvedById: null,
    reopenedAt: null,
    suppressedAt: null,
    suppressedById: null,
    closedAt: null,
    occurrenceCount: 1,
    resolutionNote: null,
    suppressionReason: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function waiverRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-06-21T08:00:00.000Z")
  return {
    id: "waiver-1",
    organizationId: "org-1",
    incidentId: "incident-1",
    status: "REQUESTED",
    requesterId: "user-1",
    approverId: null,
    reason: "Supplier evidence is delayed but accountant has external proof.",
    evidenceHash: "sha256-waiver-proof",
    expiresAt: new Date("2026-07-01T00:00:00.000Z"),
    requestedAt: now,
    approvedAt: null,
    rejectedAt: null,
    revokedAt: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}
