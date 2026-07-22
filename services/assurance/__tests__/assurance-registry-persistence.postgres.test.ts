import { randomUUID } from "node:crypto"
import { setImmediate as nodeSetImmediate } from "node:timers"
import { Prisma } from "@prisma/client"

jest.unmock("@/prisma/db")
jest.mock("server-only", () => ({}))

import { db } from "@/prisma/db"

import {
  normalizeWorkflowAssuranceRunnerOutput,
  type WorkflowAssuranceCheckDefinitionContract,
} from "../assurance-registry-contracts"
import {
  persistWorkflowAssuranceDefinitionExecution,
  type WorkflowAssuranceDefinitionPersistenceInput,
} from "../assurance-registry-persistence.service"

const runCertification =
  process.env.RUN_WORKFLOW_ASSURANCE_PERSISTENCE_POSTGRES_CERTIFICATION === "1"
const describeCertification = runCertification ? describe : describe.skip

type Fixture = {
  organizationId: string
  actorId: string
  definitionId: string
  definition: WorkflowAssuranceCheckDefinitionContract
}

async function createDefinition(definition: WorkflowAssuranceCheckDefinitionContract) {
  return db.workflowAssuranceCheckDefinition.create({
    data: {
      checkKey: definition.checkKey,
      version: definition.version,
      workflow: "CASH_COMMAND",
      moduleSlug: definition.moduleSlug,
      invariantName: definition.invariantName,
      executionMode: "SCHEDULED_SCAN",
      defaultSeverity: "BLOCKING",
      requiredPermission: definition.requiredPermission,
      ownerRole: definition.ownerRole,
      enabled: true,
      enforceMode: false,
      sourceTables: definition.sourceTables as Prisma.InputJsonValue,
      actionRoute: definition.actionRoute,
      metadata: definition.metadata as Prisma.InputJsonValue,
    },
  })
}

async function createFixture(label: string): Promise<Fixture> {
  const suffix = `${label}-${randomUUID()}`
  const organizationId = `org-${suffix}`
  const definition: WorkflowAssuranceCheckDefinitionContract = {
    checkKey: `cert.workflow-assurance-persistence.${suffix}`,
    version: 1,
    workflow: "cash_command",
    moduleSlug: "pos",
    invariantName: "Certification evidence persists transactional findings.",
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

  await db.organization.create({
    data: {
      id: organizationId,
      name: `Assurance persistence certification ${label}`,
      slug: `assurance-persistence-${suffix}`,
      currency: "XAF",
    },
  })
  const actor = await db.user.create({
    data: {
      email: `assurance-persistence-${suffix}@example.test`,
      firstName: "Persistence",
      lastName: "Certification",
      organizationId,
    },
  })
  const savedDefinition = await createDefinition(definition)

  return {
    organizationId,
    actorId: actor.id,
    definitionId: savedDefinition.id,
    definition,
  }
}

function executionInput(
  fixture: Fixture,
  options: {
    executionKey: string
    sourceId?: string
    sourceHash?: string
    startedAt?: Date
  },
): WorkflowAssuranceDefinitionPersistenceInput {
  const sourceId = options.sourceId ?? "source-1"
  const sourceHash = options.sourceHash ?? "source-hash-1"
  const execution = normalizeWorkflowAssuranceRunnerOutput({
    organizationId: fixture.organizationId,
    checkKey: fixture.definition.checkKey,
    definitionVersion: fixture.definition.version,
    output: {
      aggregate: {
        status: "failed",
        severity: "blocking",
        counts: { scanned: 1, failed: 1 },
      },
      findings: [
        {
          ordinal: 0,
          status: "failed",
          severity: "blocking",
          sourceType: "certification_source",
          sourceId,
          sourceHash,
          counts: { scanned: 1, failed: 1 },
        },
      ],
    },
  })
  const startedAt = options.startedAt ?? new Date("2026-07-20T20:00:00.000Z")

  return {
    organizationId: fixture.organizationId,
    definitionId: fixture.definitionId,
    definition: fixture.definition,
    execution,
    executionKey: options.executionKey,
    actorId: fixture.actorId,
    actorPermissionCount: 1,
    runType: "manual",
    runStatus: "failed",
    startedAt,
    completedAt: new Date(startedAt.getTime() + 1000),
    durationMs: 1000,
  }
}

describeCertification("Workflow Assurance multi-finding persistence PostgreSQL certification", () => {
  jest.setTimeout(120_000)

  afterAll(async () => {
    if (typeof globalThis.setImmediate !== "function") {
      Object.defineProperty(globalThis, "setImmediate", {
        configurable: true,
        value: nodeSetImmediate,
      })
    }
    await db.$disconnect()
  })

  it("converges simultaneous identical execution keys on one run and one finding snapshot", async () => {
    const fixture = await createFixture("concurrent-replay")
    const input = executionInput(fixture, { executionKey: "execution-1" })

    const results = await Promise.all([
      persistWorkflowAssuranceDefinitionExecution(input),
      persistWorkflowAssuranceDefinitionExecution(input),
    ])

    expect(new Set(results.map((result) => result.checkRunId)).size).toBe(1)
    expect(results.some((result) => result.replayed)).toBe(true)
    expect(
      await db.workflowAssuranceCheckRun.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(1)
    expect(
      await db.workflowAssuranceCheckFinding.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(1)
    expect(
      await db.workflowAssuranceIncident.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(1)
  })

  it("keeps different execution keys while converging source identity to one incident", async () => {
    const fixture = await createFixture("source-repeat")

    const first = await persistWorkflowAssuranceDefinitionExecution(
      executionInput(fixture, { executionKey: "execution-1" }),
    )
    const second = await persistWorkflowAssuranceDefinitionExecution(
      executionInput(fixture, {
        executionKey: "execution-2",
        startedAt: new Date("2026-07-20T20:01:00.000Z"),
      }),
    )
    const incident = await db.workflowAssuranceIncident.findFirstOrThrow({
      where: { organizationId: fixture.organizationId },
    })

    expect(second.checkRunId).not.toBe(first.checkRunId)
    expect(second.incidentId).toBe(first.incidentId)
    expect(incident.occurrenceCount).toBe(2)
    expect(
      await db.workflowAssuranceCheckRun.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(2)
    expect(
      await db.workflowAssuranceCheckFinding.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(2)
  })

  it("rejects updates and deletes of persisted finding snapshots", async () => {
    const fixture = await createFixture("finding-immutable")
    const receipt = await persistWorkflowAssuranceDefinitionExecution(
      executionInput(fixture, { executionKey: "execution-1" }),
    )
    const findingId = receipt.findings[0]!.id

    await expect(
      db.workflowAssuranceCheckFinding.update({
        where: { id: findingId },
        data: { message: "tampered" },
      }),
    ).rejects.toThrow(/immutable|update/i)
    await expect(
      db.workflowAssuranceCheckFinding.delete({ where: { id: findingId } }),
    ).rejects.toThrow(/immutable|delete/i)
  })
})
