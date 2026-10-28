import { randomUUID } from "node:crypto"
import { setImmediate as nodeSetImmediate } from "node:timers"
import { Prisma } from "@prisma/client"

jest.unmock("@/prisma/db")

jest.mock("@/services/accounting/postings/post-refund", () => ({ postRefund: jest.fn() }))
jest.mock("@/services/accounting/postings/post-payment", () => ({ postPayment: jest.fn() }))
jest.mock("@/services/accounting/postings/post-sale", () => ({ postSale: jest.fn() }))
jest.mock("@/services/accounting/postings/post-void", () => ({ postVoid: jest.fn() }))
jest.mock("@/services/accounting/customer-ledger.service", () => ({
  createCustomerLedgerEntry: jest.fn(),
}))
jest.mock("@/services/compliance/fiscal-document.service", () => ({
  createFiscalDocumentFromPostedSource: jest.fn(),
}))
jest.mock("@/services/compliance/country-pack-hooks", () => ({
  resolveEInvoicingMetadata: jest.fn(),
}))
jest.mock("@/services/inventory/inventory-stock-event.service", () => ({
  postPOSStockIssue: jest.fn(),
  postPOSStockReturn: jest.fn(),
}))
jest.mock("@/services/payments/payment-reconciliation.service", () => ({
  assertNoDuplicateProviderCapture: jest.fn(),
  assertUniqueProviderCaptureReferences: jest.fn(),
  resolveProviderCaptureEvidence: jest.fn(),
}))
jest.mock("@/services/pos/receipt.service", () => ({
  getSalesReceipt: jest.fn(),
  sendReceipt: jest.fn(),
}))

import { db } from "@/prisma/db"
import { closePOSShift } from "../pos.service"

const runCertification = process.env.RUN_POS_SHIFT_CLOSE_POSTGRES_CERTIFICATION === "1"
const describeCertification = runCertification ? describe : describe.skip

type Fixture = {
  organizationId: string
  userId: string
  locationId: string
  terminalId: string
  sessionId: string
  drawerId: string
}

async function createFixture(label: string): Promise<Fixture> {
  const suffix = `${label}-${randomUUID()}`
  const organizationId = `org-${suffix}`
  const userId = `user-${suffix}`
  const locationId = `location-${suffix}`
  const terminalId = `terminal-${suffix}`
  const sessionId = `session-${suffix}`
  const drawerId = `drawer-${suffix}`

  await db.organization.create({
    data: {
      id: organizationId,
      name: `POS close certification ${label}`,
      slug: `pos-close-cert-${suffix}`,
      currency: "XAF",
    },
  })
  await db.user.create({
    data: {
      id: userId,
      email: `${suffix}@certification.invalid`,
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
      name: `Certification location ${label}`,
      code: `CERT-${label}-${suffix}`,
      type: "STORE",
      isActive: true,
    },
  })
  await db.pOSStation.create({
    data: {
      id: terminalId,
      organizationId,
      locationId,
      terminalNumber: `CERT-${suffix}`,
      name: `Certification terminal ${label}`,
      isActive: true,
      hasCashDrawer: true,
    },
  })
  await db.pOSSession.create({
    data: {
      id: sessionId,
      organizationId,
      locationId,
      terminalId,
      userId,
      sessionNumber: `SHIFT-${suffix}`,
      status: "ACTIVE",
      openingBalance: new Prisma.Decimal(100),
      expectedBalance: new Prisma.Decimal(100),
    },
  })
  await db.cashDrawer.create({
    data: {
      id: drawerId,
      locationId,
      terminalId,
      name: `Certification drawer ${label}`,
      drawerNumber: `DRAWER-${suffix}`,
      currentBalance: new Prisma.Decimal(100),
      expectedBalance: new Prisma.Decimal(100),
      isOpen: true,
    },
  })
  await db.cashDrawerTransaction.create({
    data: {
      cashDrawerId: drawerId,
      sessionId,
      userId,
      type: "OPENING_BALANCE",
      amount: new Prisma.Decimal(100),
      reason: "PostgreSQL concurrency certification",
      balanceBefore: new Prisma.Decimal(0),
      balanceAfter: new Prisma.Decimal(100),
    },
  })
  await db.pOSStation.update({
    where: { id: terminalId },
    data: { currentSessionId: sessionId },
  })

  return { organizationId, userId, locationId, terminalId, sessionId, drawerId }
}

function closeInput(fixture: Fixture, actualBalance: string, notes?: string) {
  return {
    organizationId: fixture.organizationId,
    userId: fixture.userId,
    sessionId: fixture.sessionId,
    actualBalance,
    notes,
  }
}

type EvidenceFailureTarget = "event" | "event_apply" | "outbox" | "audit"

const CERTIFICATION_SCHEMA = "codex_pos_shift_close_cert_20260719"
const evidenceFailureTargets = {
  event: {
    table: "business_events",
    operation: "INSERT",
    condition: `NEW."eventType" = 'pos.shift.closed'`,
  },
  event_apply: {
    table: "business_events",
    operation: "UPDATE",
    condition: `NEW."eventType" = 'pos.shift.closed' AND NEW."status" = 'APPLIED'`,
  },
  outbox: {
    table: "business_event_outbox",
    operation: "INSERT",
    condition: `NEW."eventName" = 'pos.shift.closed'`,
  },
  audit: {
    table: "audit_logs",
    operation: "INSERT",
    condition: `NEW."action" = 'POS_SHIFT_CLOSED'`,
  },
} as const

async function withInjectedEvidenceFailure<T>(
  target: EvidenceFailureTarget,
  run: () => Promise<T>,
): Promise<T> {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "")
  if (databaseUrl.searchParams.get("schema") !== CERTIFICATION_SCHEMA) {
    throw new Error("Refusing to install a failure trigger outside the certification schema")
  }

  const config = evidenceFailureTargets[target]
  const functionName = `cert_fail_${target}`
  const triggerName = `cert_fail_${target}_trigger`

  await db.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION "${CERTIFICATION_SCHEMA}"."${functionName}"()
    RETURNS trigger AS $$
    BEGIN
      IF ${config.condition} THEN
        RAISE EXCEPTION 'injected ${target} failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `)
  await db.$executeRawUnsafe(`
    CREATE TRIGGER "${triggerName}"
    BEFORE ${config.operation} ON "${CERTIFICATION_SCHEMA}"."${config.table}"
    FOR EACH ROW EXECUTE FUNCTION "${CERTIFICATION_SCHEMA}"."${functionName}"()
  `)

  try {
    return await run()
  } finally {
    await db.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS "${triggerName}"
      ON "${CERTIFICATION_SCHEMA}"."${config.table}"
    `)
    await db.$executeRawUnsafe(`
      DROP FUNCTION IF EXISTS "${CERTIFICATION_SCHEMA}"."${functionName}"()
    `)
  }
}

describeCertification("POS shift close PostgreSQL certification", () => {
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

  it("commits one close and returns one exact replay for simultaneous identical commands", async () => {
    const fixture = await createFixture("same")

    const results = await Promise.all([
      closePOSShift(closeInput(fixture, "100.00")),
      closePOSShift(closeInput(fixture, "100.00")),
    ])

    expect(results.map((result) => result.replayed).sort()).toEqual([false, true])
    expect(new Set(results.map((result) => result.eventId)).size).toBe(1)
    expect(await db.cashDrawerTransaction.count({
      where: { sessionId: fixture.sessionId, type: "CLOSING_BALANCE" },
    })).toBe(1)
    expect(await db.businessEvent.count({
      where: { organizationId: fixture.organizationId, eventType: "pos.shift.closed" },
    })).toBe(1)
    expect(await db.businessEvent.findFirstOrThrow({
      where: { organizationId: fixture.organizationId, eventType: "pos.shift.closed" },
    })).toMatchObject({
      status: "APPLIED",
      processedAt: expect.any(Date),
    })
    expect(await db.businessEventOutbox.count({
      where: { organizationId: fixture.organizationId, eventName: "pos.shift.closed" },
    })).toBe(1)
    expect(await db.auditLog.count({
      where: { organizationId: fixture.organizationId, action: "POS_SHIFT_CLOSED" },
    })).toBe(1)
  })

  it("commits one changed close and records one durable idempotency conflict", async () => {
    const fixture = await createFixture("changed")

    const results = await Promise.allSettled([
      closePOSShift(closeInput(fixture, "100.00")),
      closePOSShift(closeInput(fixture, "99.00", "Count differs by one XAF")),
    ])
    const fulfilled = results.filter((result) => result.status === "fulfilled")
    const rejected = results.filter((result) => result.status === "rejected")

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ code: "CONFLICT", status: 409 })
    expect(await db.cashDrawerTransaction.count({
      where: { sessionId: fixture.sessionId, type: "CLOSING_BALANCE" },
    })).toBe(1)
    expect(await db.businessEvent.count({
      where: { organizationId: fixture.organizationId, eventType: "pos.shift.closed" },
    })).toBe(1)
    expect(await db.auditLog.count({
      where: { organizationId: fixture.organizationId, action: "POS_SHIFT_CLOSE_IDEMPOTENCY_CONFLICT" },
    })).toBe(1)
  })

  it("orders close against an ACTIVE cash writer without accepting a post-close write", async () => {
    const fixture = await createFixture("writer")

    const writer = db.$transaction(async (tx) => {
      const sessionClaim = await tx.pOSSession.updateMany({
        where: {
          id: fixture.sessionId,
          organizationId: fixture.organizationId,
          locationId: fixture.locationId,
          terminalId: fixture.terminalId,
          userId: fixture.userId,
          status: "ACTIVE",
        },
        data: {
          totalSales: { increment: new Prisma.Decimal(10) },
          cashTotal: { increment: new Prisma.Decimal(10) },
          transactionCount: { increment: 1 },
          expectedBalance: { increment: new Prisma.Decimal(10) },
        },
      })
      if (sessionClaim.count !== 1) throw new Error("Cash writer lost the active-session claim")

      const drawerClaim = await tx.cashDrawer.updateMany({
        where: {
          id: fixture.drawerId,
          isOpen: true,
          currentBalance: new Prisma.Decimal(100),
          expectedBalance: new Prisma.Decimal(100),
        },
        data: {
          currentBalance: { increment: new Prisma.Decimal(10) },
          expectedBalance: { increment: new Prisma.Decimal(10) },
        },
      })
      if (drawerClaim.count !== 1) throw new Error("Cash writer lost the drawer claim")

      await tx.cashDrawerTransaction.create({
        data: {
          cashDrawerId: fixture.drawerId,
          sessionId: fixture.sessionId,
          userId: fixture.userId,
          type: "SALE",
          amount: new Prisma.Decimal(10),
          reason: "Concurrent writer certification",
          balanceBefore: new Prisma.Decimal(100),
          balanceAfter: new Prisma.Decimal(110),
        },
      })
    })
    const [closeResult, writerResult] = await Promise.allSettled([
      closePOSShift(closeInput(fixture, "110.00", "Concurrent cash-writer ordering certification")),
      writer,
    ])

    expect(closeResult.status).toBe("fulfilled")
    const writerCommitted = writerResult.status === "fulfilled"
    const session = await db.pOSSession.findUniqueOrThrow({ where: { id: fixture.sessionId } })
    const event = await db.businessEvent.findFirstOrThrow({
      where: { organizationId: fixture.organizationId, eventType: "pos.shift.closed" },
    })
    const payload = event.payload as Record<string, unknown>

    expect(event.status).toBe("APPLIED")
    expect(event.processedAt).toBeInstanceOf(Date)
    expect(session.status).toBe("CLOSED")
    expect(session.transactionCount).toBe(writerCommitted ? 1 : 0)
    expect(String(session.expectedBalance)).toBe(writerCommitted ? "110" : "100")
    expect(payload.expectedBalance).toBe(writerCommitted ? "110.00" : "100.00")
    expect(await db.cashDrawerTransaction.count({
      where: { sessionId: fixture.sessionId, type: "CLOSING_BALANCE" },
    })).toBe(1)
    expect(await db.cashDrawerTransaction.count({
      where: { sessionId: fixture.sessionId, type: "SALE" },
    })).toBe(writerCommitted ? 1 : 0)
  })

  for (const target of ["event", "event_apply", "outbox", "audit"] as const) {
    it(`rolls back every close write when the ${target} evidence write fails`, async () => {
      const fixture = await createFixture(`rollback-${target}`)

      await expect(
        withInjectedEvidenceFailure(target, () =>
          closePOSShift(closeInput(fixture, "100.00")),
        ),
      ).rejects.toThrow("POS shift close could not be completed safely.")

      const [session, drawer, terminal] = await Promise.all([
        db.pOSSession.findUniqueOrThrow({ where: { id: fixture.sessionId } }),
        db.cashDrawer.findUniqueOrThrow({ where: { id: fixture.drawerId } }),
        db.pOSStation.findUniqueOrThrow({ where: { id: fixture.terminalId } }),
      ])

      expect(session).toMatchObject({
        status: "ACTIVE",
        endTime: null,
        closingBalance: null,
        variance: null,
      })
      expect(drawer.isOpen).toBe(true)
      expect(String(drawer.currentBalance)).toBe("100")
      expect(String(drawer.expectedBalance)).toBe("100")
      expect(terminal.currentSessionId).toBe(fixture.sessionId)
      expect(await db.cashDrawerTransaction.count({
        where: { sessionId: fixture.sessionId, type: "CLOSING_BALANCE" },
      })).toBe(0)
      expect(await db.businessEvent.count({
        where: { organizationId: fixture.organizationId, eventType: "pos.shift.closed" },
      })).toBe(0)
      expect(await db.businessEventOutbox.count({
        where: { organizationId: fixture.organizationId, eventName: "pos.shift.closed" },
      })).toBe(0)
      expect(await db.auditLog.count({
        where: { organizationId: fixture.organizationId, action: "POS_SHIFT_CLOSED" },
      })).toBe(0)
    })
  }
})
