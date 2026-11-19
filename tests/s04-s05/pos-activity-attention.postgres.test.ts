import { randomUUID } from "node:crypto"
import type { BusinessOutboxStatus } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  WHATSAPP_RECEIPT_EVENT_NAME,
  WHATSAPP_RECEIPT_EVENT_TYPE,
  WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
  WHATSAPP_RECEIPT_RETRYABLE_REJECTION,
} from "@/services/communication/whatsapp-receipt-outbox.service"
import { readPOSActivityAttention } from "@/services/pos/pos-activity-attention.service"

const { assertTestEnvironment } = require("../../scripts/s04-s05-target.cjs")
const date = "2026-10-25"
const sharedTime = new Date("2026-10-25T00:30:00Z")
const beforeSelectedDay = new Date("2026-10-24T21:59:59.999Z")

async function fixture() {
  assertTestEnvironment()
  const organizationId = randomUUID()
  await db.organization.create({
    data: { id: organizationId, slug: organizationId, name: "Synthetic attention fixture", timezone: "Europe/Paris" },
  })
  const cashier = await db.user.create({
    data: { organizationId, email: `${organizationId}@attention.invalid`, mfaBackupCodes: [] },
  })
  const location = await db.location.create({
    data: { organizationId, name: "Fixture location", code: "ATTN", type: "STORE" },
  })
  const terminal = await db.pOSStation.create({
    data: { organizationId, locationId: location.id, name: "Fixture register", terminalNumber: "ATTN" },
  })
  const customer = await db.customer.create({
    data: { organizationId, name: "Walk-in fixture", code: "WALK_IN" },
  })
  const register = { organizationId, locationId: location.id, terminalId: terminal.id }
  const closedShiftData = {
    ...register, userId: cashier.id, status: "CLOSED" as const, startTime: beforeSelectedDay,
    endTime: sharedTime, expectedBalance: 1200, closingBalance: 1100, variance: -100,
  }
  const shift = await db.pOSSession.create({ data: { ...closedShiftData, sessionNumber: "ATTN-1" } })

  async function saleWithOutbox(orderNumber: string, status: BusinessOutboxStatus, errorCode?: string, orderDate = sharedTime) {
    const sale = await db.salesOrder.create({
      data: {
        ...register, customerId: customer.id, sessionId: shift.id, orderNumber, orderDate, channel: "POS",
        status: "COMPLETED", subtotal: 100, total: 100, createdById: cashier.id,
      },
    })
    const event = await db.businessEvent.create({
      data: {
        organizationId, registerId: terminal.id, locationId: location.id, actorId: cashier.id,
        eventSource: "POS", sourceType: "POS_SALE", sourceId: sale.id, eventType: WHATSAPP_RECEIPT_EVENT_TYPE,
        idempotencyKey: `fixture-event-${sale.id}`, occurredAt: orderDate, payloadHash: "fixture", payload: {},
      },
    })
    await db.businessEventOutbox.create({
      data: {
        organizationId, businessEventId: event.id, channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
        eventName: WHATSAPP_RECEIPT_EVENT_NAME, status, lastErrorCode: errorCode,
        destination: "synthetic-private-destination", idempotencyKey: `fixture-outbox-${sale.id}`,
        payloadHash: "fixture", payload: {},
      },
    })
    return sale
  }

  return {
    actor: { organizationId, userId: cashier.id },
    scope: { date, locationId: location.id, terminalId: terminal.id },
    shift, closedShiftData, saleWithOutbox,
  }
}

afterAll(async () => { await db.$disconnect() })

it("reads scoped closed variances and terminal WhatsApp exceptions on the business day", async () => {
  const { actor, scope, shift, closedShiftData, saleWithOutbox } = await fixture()
  const failed = await saleWithOutbox("FAILED", "DEAD_LETTER")
  const uncertain = await saleWithOutbox("UNCERTAIN", "FAILED")
  await saleWithOutbox("RETRY", "FAILED", WHATSAPP_RECEIPT_RETRYABLE_REJECTION)
  await saleWithOutbox("ACCEPTED", "SENT")
  await saleWithOutbox("WRONG DAY", "DEAD_LETTER", undefined, beforeSelectedDay)
  await db.pOSSession.createMany({ data: [
    { ...closedShiftData, sessionNumber: "BALANCED", variance: 0 },
    { ...closedShiftData, sessionNumber: "ACTIVE", status: "ACTIVE" },
  ] })

  const { rows, nextCursor } = await readPOSActivityAttention(actor, { ...scope, sessionId: shift.id })
  expect(rows).toHaveLength(3)
  expect(rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: shift.id, kind: "cash", status: "CASH_VARIANCE", variance: "-100.00" }),
    expect.objectContaining({ id: failed.id, kind: "whatsapp", status: "FAILED" }),
    expect.objectContaining({ id: uncertain.id, kind: "whatsapp", status: "UNCERTAIN" }),
  ]))
  expect(nextCursor).toBeNull()
  expect(JSON.stringify(rows)).not.toContain("synthetic-private-destination")
  const other = await fixture()
  await expect(readPOSActivityAttention(other.actor, scope)).resolves.toEqual({ rows: [], nextCursor: null })
})

it("paginates attention items with a stable scoped cursor", async () => {
  const { actor, scope, closedShiftData } = await fixture()
  await db.pOSSession.createMany({
    data: Array.from({ length: 28 }, (_, index) => ({
      ...closedShiftData, id: `attention-cursor-${actor.organizationId}-${String(index).padStart(2, "0")}`,
      sessionNumber: `ATTN-PAGE-${index}`,
    })),
  })
  const first = await readPOSActivityAttention(actor, scope)
  expect(first.rows).toHaveLength(25)
  expect(first.nextCursor).toEqual(expect.any(String))
  const second = await readPOSActivityAttention(actor, { ...scope, cursor: first.nextCursor! })
  expect(second.rows).toHaveLength(4)
  expect(new Set([...first.rows, ...second.rows].map(row => row.id)).size).toBe(29)
  expect(second.nextCursor).toBeNull()
  await expect(readPOSActivityAttention(actor, { ...scope, terminalId: null, cursor: first.nextCursor! })).rejects.toThrow("first page")
})
