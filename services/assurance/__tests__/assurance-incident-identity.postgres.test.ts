import { randomUUID } from "node:crypto"
import { setImmediate as nodeSetImmediate } from "node:timers"
import { Prisma } from "@prisma/client"

jest.unmock("@/prisma/db")
jest.mock("server-only", () => ({}))

import { db } from "@/prisma/db"

import {
  normalizeAssuranceResult,
  type WorkflowAssuranceCheckDefinitionContract,
} from "../assurance-registry-contracts"
import { upsertWorkflowAssuranceIncidentFromResult } from "../assurance-incident.service"

const runCertification = process.env.RUN_WORKFLOW_ASSURANCE_IDENTITY_POSTGRES_CERTIFICATION === "1"
const describeCertification = runCertification ? describe : describe.skip

type Fixture = {
  organizationId: string
  definitionId: string
  definition: WorkflowAssuranceCheckDefinitionContract
}

async function createDefinition(definition: WorkflowAssuranceCheckDefinitionContract) {
  return db.workflowAssuranceCheckDefinition.create({
    data: {
      checkKey: definition.checkKey,
      version: definition.version,
      workflow: "LEDGER",
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
    checkKey: `cert.workflow-assurance-identity.${suffix}`,
    version: 1,
    workflow: "ledger",
    moduleSlug: "accounting",
    invariantName: "Certification evidence requires one stable case.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "accounting.audit.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["journal_entries"],
    actionRoute: "/dashboard/accounting/journals",
    metadata: { assuranceDomain: "identity_certification" },
  }

  await db.organization.create({
    data: {
      id: organizationId,
      name: `Assurance identity certification ${label}`,
      slug: `assurance-identity-${suffix}`,
      currency: "XAF",
    },
  })
  const savedDefinition = await createDefinition(definition)

  return {
    organizationId,
    definitionId: savedDefinition.id,
    definition,
  }
}

function failedResult(fixture: Fixture, sourceHash: string) {
  return normalizeAssuranceResult({
    organizationId: fixture.organizationId,
    checkKey: fixture.definition.checkKey,
    definitionVersion: fixture.definition.version,
    status: "failed",
    severity: "blocking",
    sourceType: "certification_source",
    sourceId: "source-1",
    sourceHash,
    metadata: { sourceHash },
  })
}

function upsertFixture(fixture: Fixture, sourceHash: string) {
  return upsertWorkflowAssuranceIncidentFromResult({
    organizationId: fixture.organizationId,
    definitionId: fixture.definitionId,
    definition: fixture.definition,
    result: failedResult(fixture, sourceHash),
  })
}

describeCertification("Workflow Assurance stable case identity PostgreSQL certification", () => {
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

  it("converges simultaneous first detection on one case and one creation alert", async () => {
    const fixture = await createFixture("concurrent-create")

    const results = await Promise.all([
      upsertFixture(fixture, "source-hash-1"),
      upsertFixture(fixture, "source-hash-1"),
    ])
    const incident = await db.workflowAssuranceIncident.findFirstOrThrow({
      where: { organizationId: fixture.organizationId },
    })

    expect(new Set(results.map((result) => result?.id)).size).toBe(1)
    expect(
      await db.workflowAssuranceIncident.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(1)
    expect(incident.occurrenceCount).toBe(2)
    expect(
      await db.workflowAssuranceIncidentEvent.count({
        where: {
          organizationId: fixture.organizationId,
          eventType: "CREATED",
        },
      }),
    ).toBe(1)
    expect(
      await db.workflowAssuranceIncidentEvent.count({
        where: {
          organizationId: fixture.organizationId,
          eventType: "DUPLICATE_DETECTED",
        },
      }),
    ).toBe(1)
    expect(
      await db.workflowAssuranceAlertDelivery.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(1)
  })

  it("updates active source drift in place without another alert", async () => {
    const fixture = await createFixture("active-drift")
    const created = await upsertFixture(fixture, "source-hash-1")
    const changed = await upsertFixture(fixture, "source-hash-2")

    expect(changed?.id).toBe(created?.id)
    expect(changed).toMatchObject({
      status: "open",
      sourceHash: "source-hash-2",
      occurrenceCount: 2,
    })
    expect(
      await db.workflowAssuranceIncident.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(1)
    expect(
      await db.workflowAssuranceIncidentEvent.count({
        where: {
          organizationId: fixture.organizationId,
          eventType: "SOURCE_CHANGED",
        },
      }),
    ).toBe(1)
    expect(
      await db.workflowAssuranceAlertDelivery.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(1)
  })

  it("reopens one finalized case for changed source evidence", async () => {
    const fixture = await createFixture("reopen")
    const created = await upsertFixture(fixture, "source-hash-1")
    await db.workflowAssuranceIncident.update({
      where: { id: created!.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedById: "certification-reviewer",
        resolutionNote: "Prior evidence was reviewed.",
      },
    })

    const reopened = await upsertFixture(fixture, "source-hash-2")

    expect(reopened?.id).toBe(created?.id)
    expect(reopened).toMatchObject({
      status: "reopened",
      sourceHash: "source-hash-2",
      resolvedAt: null,
    })
    expect(
      await db.workflowAssuranceIncident.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(1)
    expect(
      await db.workflowAssuranceIncidentEvent.count({
        where: {
          organizationId: fixture.organizationId,
          eventType: "REOPENED",
        },
      }),
    ).toBe(1)
    expect(
      await db.workflowAssuranceAlertDelivery.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(2)
  })

  it("keeps a suppressed case suppressed when evidence changes", async () => {
    const fixture = await createFixture("suppressed")
    const created = await upsertFixture(fixture, "source-hash-1")
    await db.workflowAssuranceIncident.update({
      where: { id: created!.id },
      data: {
        status: "SUPPRESSED",
        suppressedAt: new Date(),
        suppressedById: "certification-reviewer",
        suppressionReason: "Certification suppression",
      },
    })

    const changed = await upsertFixture(fixture, "source-hash-2")

    expect(changed?.id).toBe(created?.id)
    expect(changed).toMatchObject({
      status: "suppressed",
      sourceHash: "source-hash-2",
    })
    expect(
      await db.workflowAssuranceAlertDelivery.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(1)
  })

  it("keeps definition versions as distinct logical identities", async () => {
    const fixture = await createFixture("definition-version")
    const definitionV2 = { ...fixture.definition, version: 2 }
    const savedV2 = await createDefinition(definitionV2)

    const versionOne = await upsertFixture(fixture, "source-hash-1")
    const versionTwo = await upsertWorkflowAssuranceIncidentFromResult({
      organizationId: fixture.organizationId,
      definitionId: savedV2.id,
      definition: definitionV2,
      result: normalizeAssuranceResult({
        organizationId: fixture.organizationId,
        checkKey: definitionV2.checkKey,
        definitionVersion: 2,
        status: "failed",
        sourceType: "certification_source",
        sourceId: "source-1",
        sourceHash: "source-hash-1",
      }),
    })

    expect(versionTwo?.id).not.toBe(versionOne?.id)
    expect(versionTwo?.fingerprint).not.toBe(versionOne?.fingerprint)
    expect(
      await db.workflowAssuranceIncident.count({
        where: { organizationId: fixture.organizationId },
      }),
    ).toBe(2)
  })
})
