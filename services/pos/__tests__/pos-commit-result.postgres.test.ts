import { randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"

const CERTIFICATION_SCHEMA = "codex_pos_commit_result_cert_20260817"
const runCertification = process.env.RUN_POS_COMMIT_POSTGRES_CERTIFICATION === "1"
const describeCertification = runCertification ? describe : describe.skip

type Fixture = {
  organizationId: string
  otherOrganizationId: string
  userId: string
  locationId: string
  terminalId: string
  sessionId: string
  salesOrderId: string
}

function assertIsolatedCertificationDatabase() {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "")
  const hostname = databaseUrl.hostname.toLowerCase()
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(hostname)
  if (!isLocalHost || databaseUrl.searchParams.get("schema") !== CERTIFICATION_SCHEMA) {
    throw new Error(
      `Refusing POS commit certification outside local schema ${CERTIFICATION_SCHEMA}`,
    )
  }
}

async function createFixture(): Promise<Fixture> {
  assertIsolatedCertificationDatabase()
  const suffix = randomUUID()
  const organizationId = `org-pos-commit-${suffix}`
  const otherOrganizationId = `org-pos-commit-other-${suffix}`
  const userId = `user-pos-commit-${suffix}`
  const locationId = `location-pos-commit-${suffix}`
  const terminalId = `terminal-pos-commit-${suffix}`
  const sessionId = `session-pos-commit-${suffix}`
  const customerId = `customer-pos-commit-${suffix}`
  const salesOrderId = `sale-pos-commit-${suffix}`

  await db.organization.createMany({
    data: [
      {
        id: organizationId,
        name: "POS commit certification tenant",
        slug: `pos-commit-cert-${suffix}`,
        currency: "XAF",
      },
      {
        id: otherOrganizationId,
        name: "POS commit certification isolation tenant",
        slug: `pos-commit-cert-other-${suffix}`,
        currency: "XAF",
      },
    ],
  })
  await db.user.create({
    data: {
      id: userId,
      email: `${suffix}@pos-commit-cert.invalid`,
      organizationId,
      firstName: "Certification",
      lastName: "Cashier",
      mfaBackupCodes: [],
    },
  })
  await db.location.create({
    data: {
      id: locationId,
      organizationId,
      name: "POS commit certification store",
      code: `POS-CERT-${suffix}`,
      type: "STORE",
    },
  })
  await db.customer.create({
    data: {
      id: customerId,
      organizationId,
      name: "POS certification walk-in",
      code: `POS-CUSTOMER-${suffix}`,
    },
  })
  await db.pOSStation.create({
    data: {
      id: terminalId,
      organizationId,
      locationId,
      terminalNumber: `POS-CERT-${suffix}`,
      name: "POS commit certification terminal",
    },
  })
  await db.pOSSession.create({
    data: {
      id: sessionId,
      organizationId,
      locationId,
      terminalId,
      userId,
      sessionNumber: `POS-CERT-SHIFT-${suffix}`,
      status: "ACTIVE",
      openingBalance: new Prisma.Decimal(0),
      expectedBalance: new Prisma.Decimal(0),
    },
  })
  await db.pOSStation.update({
    where: { id: terminalId },
    data: { currentSessionId: sessionId },
  })
  await db.salesOrder.create({
    data: {
      id: salesOrderId,
      organizationId,
      locationId,
      terminalId,
      sessionId,
      customerId,
      createdById: userId,
      orderNumber: `POS-CERT-${suffix}`,
      status: "DRAFT",
    },
  })

  return {
    organizationId,
    otherOrganizationId,
    userId,
    locationId,
    terminalId,
    sessionId,
    salesOrderId,
  }
}

function registryData(fixture: Fixture, clientCommitId: string, requestHash: string) {
  return {
    organizationId: fixture.organizationId,
    locationId: fixture.locationId,
    terminalId: fixture.terminalId,
    sessionId: fixture.sessionId,
    salesOrderId: fixture.salesOrderId,
    actorId: fixture.userId,
    clientCommitId,
    requestHash,
    requestSchemaVersion: 1,
    status: "CLAIMED" as const,
  }
}

describeCertification("POS commit result PostgreSQL certification", () => {
  jest.setTimeout(120_000)
  let fixture: Fixture

  beforeAll(async () => {
    assertIsolatedCertificationDatabase()
    fixture = await createFixture()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it("allows exactly one organization-terminal claim under a real concurrent race", async () => {
    const requestHash = hashBusinessPayload({ command: "identical-race", fixture })
    const clientCommitId = `pos:${randomUUID()}`
    const results = await Promise.allSettled([
      db.pOSCommitResult.create({ data: registryData(fixture, clientCommitId, requestHash) }),
      db.pOSCommitResult.create({ data: registryData(fixture, clientCommitId, requestHash) }),
    ])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult
    expect((rejected.reason as { code?: string }).code).toBe("P2002")
    expect(await db.pOSCommitResult.count({
      where: { organizationId: fixture.organizationId, terminalId: fixture.terminalId, clientCommitId },
    })).toBe(1)
  })

  it("rejects a cross-tenant source combination even when every foreign key exists", async () => {
    await expect(db.pOSCommitResult.create({
      data: {
        ...registryData(
          fixture,
          `pos:${randomUUID()}`,
          hashBusinessPayload({ command: "cross-tenant" }),
        ),
        organizationId: fixture.otherOrganizationId,
      },
    })).rejects.toThrow(/scope does not match its tenant-owned source records/i)
  })

  it("permits only CLAIMED to COMMITTED to COMPLETED and then freezes the result", async () => {
    const clientCommitId = `pos:${randomUUID()}`
    const requestHash = hashBusinessPayload({ command: "lifecycle", fixture })
    const claimed = await db.pOSCommitResult.create({
      data: registryData(fixture, clientCommitId, requestHash),
    })
    const committedEnvelope = {
      clientCommitId,
      resultSchemaVersion: 1,
      replayed: false,
      saleId: fixture.salesOrderId,
      receipt: null,
      receiptStatus: "RETRY_REQUIRED",
      delivery: null,
    }
    const committedAt = new Date()
    await db.pOSCommitResult.update({
      where: { id: claimed.id },
      data: {
        status: "COMMITTED",
        resultEnvelope: committedEnvelope,
        resultHash: hashBusinessPayload(committedEnvelope),
        committedAt,
      },
    })
    const completedEnvelope = {
      ...committedEnvelope,
      receiptStatus: "READY",
      receipt: { receipt: { id: fixture.salesOrderId }, digitalReceiptUrl: "" },
    }
    await db.pOSCommitResult.update({
      where: { id: claimed.id },
      data: {
        status: "COMPLETED",
        resultEnvelope: completedEnvelope,
        resultHash: hashBusinessPayload(completedEnvelope),
        completedAt: new Date(committedAt.getTime() + 1),
      },
    })

    await expect(db.pOSCommitResult.update({
      where: { id: claimed.id },
      data: { resultHash: hashBusinessPayload({ tampered: true }) },
    })).rejects.toThrow(/Completed POS commit result evidence is immutable/i)
    await expect(db.pOSCommitResult.delete({ where: { id: claimed.id } }))
      .rejects.toThrow(/immutable and cannot be deleted/i)
  })
})
