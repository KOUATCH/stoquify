jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    workflowAssuranceCheckRun: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: (value: unknown) => {
    const { createHash } = jest.requireActual("node:crypto")
    return createHash("sha256").update(JSON.stringify(value)).digest("hex")
  },
}))

jest.mock("../assurance-incident.service", () => ({
  upsertWorkflowAssuranceIncidentFromResultInTx: jest.fn(),
}))

import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"

import { upsertWorkflowAssuranceIncidentFromResultInTx } from "../assurance-incident.service"
import {
  normalizeWorkflowAssuranceRunnerOutput,
  type WorkflowAssuranceCheckDefinitionContract,
} from "../assurance-registry-contracts"
import {
  createWorkflowAssuranceExecutionDigest,
  normalizeWorkflowAssuranceExecutionKey,
  persistWorkflowAssuranceDefinitionExecution,
  type WorkflowAssuranceDefinitionPersistenceInput,
} from "../assurance-registry-persistence.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  workflowAssuranceCheckRun: { findUnique: jest.Mock }
}
const mockIncidentUpsert = upsertWorkflowAssuranceIncidentFromResultInTx as jest.Mock

const tx = {
  workflowAssuranceCheckRun: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  workflowAssuranceCheckFinding: {
    create: jest.fn(),
  },
}

describe("workflow assurance multi-finding persistence", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockDb.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
    tx.workflowAssuranceCheckRun.findUnique.mockResolvedValue(null)
    tx.workflowAssuranceCheckRun.create.mockResolvedValue({ id: "run-1" })
    tx.workflowAssuranceCheckFinding.create
      .mockResolvedValueOnce({ id: "finding-1" })
      .mockResolvedValueOnce({ id: "finding-2" })
    mockIncidentUpsert
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "incident-2" })
  })

  it("writes one aggregate, ordered findings, and incident evidence in one Serializable transaction", async () => {
    const input = persistenceInput()

    const receipt = await persistWorkflowAssuranceDefinitionExecution(input)

    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
    expect(tx.workflowAssuranceCheckRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          executionKey: "execution-1",
          executionDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
          scannedCount: 2,
          failedCount: 1,
        }),
      }),
    )
    expect(mockIncidentUpsert).toHaveBeenCalledTimes(2)
    expect(mockIncidentUpsert).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        checkRunId: "run-1",
        result: expect.objectContaining({ ordinal: 1, sourceId: "source-2" }),
      }),
    )
    expect(tx.workflowAssuranceCheckFinding.create.mock.calls.map(([call]) => call.data.ordinal)).toEqual([0, 1])
    expect(receipt).toMatchObject({
      checkRunId: "run-1",
      executionKey: "execution-1",
      replayed: false,
      incidentId: "incident-2",
      findings: [
        { id: "finding-1", ordinal: 0, incidentId: undefined },
        { id: "finding-2", ordinal: 1, incidentId: "incident-2" },
      ],
    })
  })

  it("persists a valid aggregate-only execution without an incident or finding", async () => {
    const input = persistenceInput({ findings: [] })

    const receipt = await persistWorkflowAssuranceDefinitionExecution(input)

    expect(mockIncidentUpsert).not.toHaveBeenCalled()
    expect(tx.workflowAssuranceCheckFinding.create).not.toHaveBeenCalled()
    expect(receipt.findings).toEqual([])
    expect(receipt.incidentId).toBeUndefined()
  })

  it("returns the original receipt for an identical replay without any writes", async () => {
    const input = persistenceInput()
    const executionDigest = createWorkflowAssuranceExecutionDigest(input)
    tx.workflowAssuranceCheckRun.findUnique.mockResolvedValue(storedExecution(input, executionDigest))

    const receipt = await persistWorkflowAssuranceDefinitionExecution(input)

    expect(receipt).toMatchObject({ checkRunId: "run-existing", replayed: true })
    expect(tx.workflowAssuranceCheckRun.create).not.toHaveBeenCalled()
    expect(mockIncidentUpsert).not.toHaveBeenCalled()
    expect(tx.workflowAssuranceCheckFinding.create).not.toHaveBeenCalled()
  })

  it("rejects one execution key reused for different evidence", async () => {
    const input = persistenceInput()
    tx.workflowAssuranceCheckRun.findUnique.mockResolvedValue(
      storedExecution(input, `sha256:${"0".repeat(64)}`),
    )

    await expect(persistWorkflowAssuranceDefinitionExecution(input)).rejects.toThrow(
      /already used for different evidence/i,
    )
    expect(tx.workflowAssuranceCheckRun.create).not.toHaveBeenCalled()
  })

  it("recovers a concurrent identical insert after a unique-key race", async () => {
    const input = persistenceInput()
    const digest = createWorkflowAssuranceExecutionDigest(input)
    const uniqueRace = Object.assign(new Error("unique"), { code: "P2002" })
    mockDb.$transaction.mockRejectedValueOnce(uniqueRace)
    mockDb.workflowAssuranceCheckRun.findUnique.mockResolvedValue(storedExecution(input, digest))

    const receipt = await persistWorkflowAssuranceDefinitionExecution(input)

    expect(receipt).toMatchObject({ checkRunId: "run-existing", replayed: true })
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
  })

  it("fails the complete definition execution when a finding write fails", async () => {
    tx.workflowAssuranceCheckFinding.create
      .mockReset()
      .mockResolvedValueOnce({ id: "finding-1" })
      .mockRejectedValueOnce(new Error("finding write failed"))

    await expect(persistWorkflowAssuranceDefinitionExecution(persistenceInput())).rejects.toThrow(
      /could not be recorded safely/i,
    )
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
  })

  it("normalizes bounded keys and rejects blank or overlong keys", () => {
    expect(normalizeWorkflowAssuranceExecutionKey("  execution-1  ")).toBe("execution-1")
    expect(() => normalizeWorkflowAssuranceExecutionKey(" ")).toThrow(/execution key is required/i)
    expect(() => normalizeWorkflowAssuranceExecutionKey("x".repeat(201))).toThrow(/cannot exceed 200/i)
  })
})

const DEFINITION: WorkflowAssuranceCheckDefinitionContract = {
  checkKey: "cert.multi-finding.persistence",
  version: 1,
  workflow: "cash_command",
  moduleSlug: "pos",
  invariantName: "Certification findings are persisted atomically.",
  executionMode: "scheduled_scan",
  defaultSeverity: "blocking",
  requiredPermission: "controls.audit.read",
  ownerRole: "operations_lead",
  enabled: true,
  enforceMode: false,
  sourceTables: ["certification_sources"],
  actionRoute: "/dashboard/manager-action-center",
  metadata: { assuranceDomain: "persistence_certification" },
}

function persistenceInput(overrides: { findings?: [] } = {}): WorkflowAssuranceDefinitionPersistenceInput {
  const execution = normalizeWorkflowAssuranceRunnerOutput({
    organizationId: "org-1",
    checkKey: DEFINITION.checkKey,
    definitionVersion: DEFINITION.version,
    output:
      overrides.findings?.length === 0
        ? {
            aggregate: {
              status: "passed",
              severity: "info",
              counts: { scanned: 0, passed: 0 },
            },
            findings: [],
          }
        : {
            aggregate: {
              status: "failed",
              severity: "blocking",
              counts: { scanned: 2, passed: 1, failed: 1 },
            },
            findings: [
              {
                ordinal: 0,
                status: "passed",
                severity: "info",
                sourceType: "certification_source",
                sourceId: "source-1",
                counts: { scanned: 1, passed: 1 },
              },
              {
                ordinal: 1,
                status: "failed",
                severity: "blocking",
                sourceType: "certification_source",
                sourceId: "source-2",
                counts: { scanned: 1, failed: 1 },
              },
            ],
          },
  })

  return {
    organizationId: "org-1",
    definitionId: "definition-1",
    definition: DEFINITION,
    execution,
    executionKey: "execution-1",
    actorId: "actor-1",
    actorPermissionCount: 1,
    runType: "manual",
    runStatus: "failed",
    startedAt: new Date("2026-07-20T20:00:00.000Z"),
    completedAt: new Date("2026-07-20T20:00:01.000Z"),
    durationMs: 1000,
  }
}

function storedExecution(input: WorkflowAssuranceDefinitionPersistenceInput, executionDigest: string) {
  return {
    id: "run-existing",
    executionKey: input.executionKey,
    executionDigest,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationMs: input.durationMs,
    findings: input.execution.findings.map((finding) => ({
      id: `stored-finding-${finding.ordinal}`,
      ordinal: finding.ordinal,
      status: finding.status.toUpperCase(),
      severity: finding.severity.toUpperCase(),
      sourceType: finding.sourceType,
      sourceId: finding.sourceId,
      sourceHash: finding.sourceHash,
      fingerprint: finding.fingerprint,
      incidentId: finding.status === "failed" ? "incident-2" : null,
    })),
  }
}
