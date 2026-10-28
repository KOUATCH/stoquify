const { randomUUID } = require("node:crypto")
const { Prisma, PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function expectPrismaRejection(checks, label, expectedCode, operation) {
  try {
    await operation()
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === expectedCode
    ) {
      checks.push(`${label}:${expectedCode}`)
      return
    }

    throw error
  }

  throw new Error(`${label} unexpectedly succeeded`)
}

async function main() {
  const suffix = randomUUID()
  const fixture = {
    organizationIds: [
      `agent-smoke-org-a-${suffix}`,
      `agent-smoke-org-b-${suffix}`,
    ],
    agentKey: `agent-smoke-command-${suffix}`,
    skillKey: `agent-smoke-freshness-${suffix}`,
    toolKey: `agent-smoke-read-${suffix}`,
  }
  const checks = []
  let primaryError

  try {
    const [database] = await prisma.$queryRaw`
      SELECT current_database() AS "name", current_schema() AS "schema"
    `

    const [organizationA, organizationB] = await Promise.all(
      fixture.organizationIds.map((id, index) =>
        prisma.organization.create({
          data: {
            id,
            name: `Agent Runtime Smoke ${index + 1}`,
            slug: `agent-runtime-smoke-${index + 1}-${suffix}`,
          },
        })
      )
    )

    const [agentDefinition] = await Promise.all([
      prisma.agentDefinition.create({
        data: {
          key: fixture.agentKey,
          name: "PostgreSQL Smoke Command Agent",
          description: "Ephemeral persistence fixture",
          ownerModuleSlug: "command-center",
          status: "ACTIVE",
          rolloutMode: "INTERNAL",
          riskLevel: "READ_ONLY",
          allowedToolKeys: [fixture.toolKey],
          allowedSkillKeys: [fixture.skillKey],
        },
      }),
      prisma.agentSkillDefinition.create({
        data: {
          key: fixture.skillKey,
          version: 1,
          domain: "runtime-smoke",
          promptHash: "0".repeat(64),
          ownerModuleSlug: "command-center",
          requiredPermissions: ["dashboard.read"],
          redactionCategories: ["credentials"],
          status: "ACTIVE",
        },
      }),
      prisma.agentToolDefinition.create({
        data: {
          key: fixture.toolKey,
          ownerService: "agent-runtime-smoke",
          moduleSlug: "command-center",
          requiredPermission: "dashboard.read",
          riskLevel: "READ_ONLY",
          toolType: "READ_ONLY",
          inputSchemaHash: "1".repeat(64),
          outputSchemaHash: "2".repeat(64),
          approvalPolicy: "none",
          idempotencyMode: "read-only",
          status: "ACTIVE",
        },
      }),
    ])

    const correlationA = `agent-smoke-correlation-a-${suffix}`
    const [runA, runB] = await Promise.all([
      prisma.agentRun.create({
        data: {
          organizationId: organizationA.id,
          actorId: `agent-smoke-actor-a-${suffix}`,
          agentDefinitionId: agentDefinition.id,
          agentKey: fixture.agentKey,
          status: "RUNNING",
          sourceRoute: "/agent-runtime/smoke",
          locale: "en",
          currency: "XAF",
          correlationId: correlationA,
          safeSummary: "Smoke run A started",
        },
      }),
      prisma.agentRun.create({
        data: {
          organizationId: organizationB.id,
          actorId: `agent-smoke-actor-b-${suffix}`,
          agentDefinitionId: agentDefinition.id,
          agentKey: fixture.agentKey,
          status: "RUNNING",
          sourceRoute: "/agent-runtime/smoke",
          locale: "fr",
          currency: "XAF",
          correlationId: `agent-smoke-correlation-b-${suffix}`,
          safeSummary: "Smoke run B started",
        },
      }),
    ])

    const [stepA, stepB] = await Promise.all([
      prisma.agentStep.create({
        data: {
          runId: runA.id,
          stepNumber: 1,
          kind: "TOOL",
          toolKey: fixture.toolKey,
          status: "COMPLETED",
          inputHash: "3".repeat(64),
          outputHash: "4".repeat(64),
          safeSummary: "Tenant A read completed",
          completedAt: new Date(),
        },
      }),
      prisma.agentStep.create({
        data: {
          runId: runB.id,
          stepNumber: 1,
          kind: "TOOL",
          toolKey: fixture.toolKey,
          status: "COMPLETED",
          inputHash: "5".repeat(64),
          outputHash: "6".repeat(64),
          safeSummary: "Tenant B read completed",
          completedAt: new Date(),
        },
      }),
    ])

    await prisma.$transaction([
      prisma.agentEvidenceLink.create({
        data: {
          runId: runA.id,
          stepId: stepA.id,
          subjectType: "organization",
          subjectId: organizationA.id,
          sourceModule: "command-center",
          sourceTable: "organizations",
          sourceHash: "7".repeat(64),
          evidenceGrade: "authoritative",
          freshness: "FRESH",
        },
      }),
      prisma.agentFeedback.create({
        data: {
          runId: runA.id,
          organizationId: organizationA.id,
          actorId: `agent-smoke-actor-a-${suffix}`,
          helpful: true,
          accepted: true,
        },
      }),
      prisma.agentCostLedger.create({
        data: {
          runId: runA.id,
          organizationId: organizationA.id,
          modelProvider: "smoke",
          modelName: "deterministic-no-model",
          promptTokens: 0,
          completionTokens: 0,
          estimatedCost: new Prisma.Decimal(0),
          currency: "USD",
          budgetBucket: "test",
        },
      }),
      prisma.agentPolicyIncident.create({
        data: {
          runId: runA.id,
          organizationId: organizationA.id,
          actorId: `agent-smoke-actor-a-${suffix}`,
          incidentType: "smoke_control",
          severity: "LOW",
          policyKey: "agent-runtime-smoke",
          safeSummary: "Ephemeral control record",
          status: "RESOLVED",
          resolvedById: `agent-smoke-actor-a-${suffix}`,
          resolvedAt: new Date(),
        },
      }),
      prisma.agentRun.update({
        where: { id: runA.id },
        data: {
          status: "COMPLETED",
          safeSummary: "Smoke run A completed",
          completedAt: new Date(),
        },
      }),
    ])

    const tenantRuns = await prisma.agentRun.findMany({
      where: { organizationId: organizationA.id },
      include: {
        steps: true,
        evidenceLinks: true,
        feedback: true,
        costs: true,
        policyIncidents: true,
      },
    })
    assert(tenantRuns.length === 1, "tenant-scoped query leaked or lost runs")
    assert(tenantRuns[0].id === runA.id, "tenant-scoped query returned another tenant")
    assert(tenantRuns[0].steps.length === 1, "persisted step was not recovered")
    assert(tenantRuns[0].evidenceLinks.length === 1, "persisted evidence was not recovered")
    assert(tenantRuns[0].feedback.length === 1, "persisted feedback was not recovered")
    assert(tenantRuns[0].costs.length === 1, "persisted cost was not recovered")
    assert(tenantRuns[0].policyIncidents.length === 1, "persisted incident was not recovered")
    checks.push("valid_round_trip", "tenant_scoped_read")

    await expectPrismaRejection(checks, "cross_tenant_feedback", "P2003", () =>
      prisma.agentFeedback.create({
        data: {
          runId: runA.id,
          organizationId: organizationB.id,
          actorId: `agent-smoke-actor-b-${suffix}`,
        },
      })
    )
    await expectPrismaRejection(checks, "cross_tenant_cost", "P2003", () =>
      prisma.agentCostLedger.create({
        data: {
          runId: runA.id,
          organizationId: organizationB.id,
          modelProvider: "smoke",
          modelName: "invalid-cross-tenant",
          estimatedCost: new Prisma.Decimal(0),
          currency: "USD",
        },
      })
    )
    await expectPrismaRejection(checks, "cross_tenant_incident", "P2003", () =>
      prisma.agentPolicyIncident.create({
        data: {
          runId: runA.id,
          organizationId: organizationB.id,
          actorId: `agent-smoke-actor-b-${suffix}`,
          incidentType: "invalid_cross_tenant",
          severity: "HIGH",
          policyKey: "agent-runtime-smoke",
          safeSummary: "Must be rejected",
        },
      })
    )
    await expectPrismaRejection(checks, "cross_run_evidence", "P2003", () =>
      prisma.agentEvidenceLink.create({
        data: {
          runId: runA.id,
          stepId: stepB.id,
          subjectType: "organization",
          subjectId: organizationA.id,
          sourceModule: "command-center",
          evidenceGrade: "invalid",
          freshness: "BLOCKED",
        },
      })
    )
    await prisma.agentRun.create({
      data: {
        organizationId: organizationB.id,
        actorId: `agent-smoke-actor-b-${suffix}`,
        agentKey: fixture.agentKey,
        sourceRoute: "/agent-runtime/smoke",
        locale: "fr",
        currency: "XAF",
        correlationId: correlationA,
      },
    })
    checks.push("cross_tenant_correlation:allowed")

    await expectPrismaRejection(checks, "duplicate_scoped_correlation", "P2002", () =>
      prisma.agentRun.create({
        data: {
          organizationId: organizationA.id,
          actorId: `agent-smoke-actor-a-${suffix}`,
          agentKey: fixture.agentKey,
          sourceRoute: "/agent-runtime/smoke",
          locale: "en",
          currency: "XAF",
          correlationId: correlationA,
        },
      })
    )

    console.log(
      JSON.stringify(
        {
          status: "passed",
          database: database.name,
          schema: database.schema,
          checks,
          cleanup: "pending",
        },
        null,
        2
      )
    )
  } catch (error) {
    primaryError = error
  } finally {
    try {
      await prisma.organization.deleteMany({
        where: { id: { in: fixture.organizationIds } },
      })
      await prisma.agentDefinition.deleteMany({ where: { key: fixture.agentKey } })
      await prisma.agentSkillDefinition.deleteMany({ where: { key: fixture.skillKey } })
      await prisma.agentToolDefinition.deleteMany({ where: { key: fixture.toolKey } })

      const residualCounts = await Promise.all([
        prisma.organization.count({ where: { id: { in: fixture.organizationIds } } }),
        prisma.agentRun.count({ where: { agentKey: fixture.agentKey } }),
        prisma.agentPolicyIncident.count({
          where: { organizationId: { in: fixture.organizationIds } },
        }),
        prisma.agentDefinition.count({ where: { key: fixture.agentKey } }),
        prisma.agentSkillDefinition.count({ where: { key: fixture.skillKey } }),
        prisma.agentToolDefinition.count({ where: { key: fixture.toolKey } }),
      ])
      assert(
        residualCounts.every((count) => count === 0),
        `smoke cleanup left residual rows: ${residualCounts.join(",")}`
      )
      console.log(JSON.stringify({ cleanup: "verified", residualRows: 0 }))
    } catch (cleanupError) {
      if (primaryError) {
        primaryError = new AggregateError(
          [primaryError, cleanupError],
          "PostgreSQL smoke test and cleanup both failed"
        )
      } else {
        primaryError = cleanupError
      }
    }

    await prisma.$disconnect()
  }

  if (primaryError) {
    throw primaryError
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
