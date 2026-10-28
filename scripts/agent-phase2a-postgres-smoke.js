const { randomUUID } = require("node:crypto")
const { Prisma, PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function expectCode(label, expectedCode, operation, checks) {
  try {
    await operation()
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === expectedCode) {
      checks.push(`${label}:${expectedCode}`)
      return
    }
    throw error
  }
  throw new Error(`${label} unexpectedly succeeded`)
}

async function main() {
  const suffix = randomUUID()
  const organizationIds = [`phase2a-smoke-a-${suffix}`, `phase2a-smoke-b-${suffix}`]
  const agentKey = `phase2a-smoke-agent-${suffix}`
  const actorId = `phase2a-smoke-actor-${suffix}`
  const checks = []

  try {
    const [organizationA, organizationB] = await Promise.all(
      organizationIds.map((id, index) => prisma.organization.create({
        data: {
          id,
          name: `Phase 2A Smoke ${index + 1}`,
          slug: `phase2a-smoke-${index + 1}-${suffix}`,
        },
      })),
    )
    const definition = await prisma.agentDefinition.create({
      data: {
        key: agentKey,
        name: "Phase 2A provenance smoke",
        description: "Ephemeral additive migration fixture",
        ownerModuleSlug: "dashboard",
        status: "DRAFT",
        rolloutMode: "SHADOW",
        riskLevel: "READ_ONLY",
        allowedToolKeys: ["readRoleDailyDigest"],
        allowedSkillKeys: ["role-daily-brief"],
      },
    })
    const run = await prisma.agentRun.create({
      data: {
        organizationId: organizationA.id,
        actorId,
        agentDefinitionId: definition.id,
        agentKey,
        skillKey: "role-daily-brief",
        skillVersion: 1,
        promptHash: "sha256:phase2a-smoke",
        status: "COMPLETED",
        sourceRoute: "/dashboard/daily-digest",
        locale: "en",
        currency: "XAF",
        correlationId: `phase2a-smoke-request-${suffix}`,
        safeSummary: "Phase 2A smoke completed safely.",
        durationMs: 25,
        toolCount: 1,
        evidenceCount: 1,
        redactionCount: 2,
        completedAt: new Date(),
      },
    })
    await prisma.agentFeedback.create({
      data: {
        runId: run.id,
        organizationId: organizationA.id,
        actorId,
        helpful: true,
      },
    })
    await expectCode(
      "duplicate feedback",
      "P2002",
      () => prisma.agentFeedback.create({
        data: {
          runId: run.id,
          organizationId: organizationA.id,
          actorId,
          wrongAnswer: true,
        },
      }),
      checks,
    )
    await expectCode(
      "cross tenant feedback",
      "P2003",
      () => prisma.agentFeedback.create({
        data: {
          runId: run.id,
          organizationId: organizationB.id,
          actorId: `phase2a-smoke-other-${suffix}`,
          helpful: false,
        },
      }),
      checks,
    )

    const persisted = await prisma.agentRun.findUniqueOrThrow({
      where: { id: run.id },
      select: {
        skillKey: true,
        skillVersion: true,
        promptHash: true,
        durationMs: true,
        toolCount: true,
        evidenceCount: true,
        redactionCount: true,
      },
    })
    if (
      persisted.skillKey !== "role-daily-brief" ||
      persisted.skillVersion !== 1 ||
      persisted.promptHash !== "sha256:phase2a-smoke" ||
      persisted.durationMs !== 25 ||
      persisted.toolCount !== 1 ||
      persisted.evidenceCount !== 1 ||
      persisted.redactionCount !== 2
    ) {
      throw new Error("Phase 2A run provenance did not round-trip.")
    }
    checks.push("provenance roundtrip:passed")

    console.log(JSON.stringify({ status: "passed", checks }, null, 2))
  } finally {
    await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } })
    await prisma.agentDefinition.deleteMany({ where: { key: agentKey } })
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
