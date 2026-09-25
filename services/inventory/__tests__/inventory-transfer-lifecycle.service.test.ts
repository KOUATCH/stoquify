/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { recordBusinessEventInTx, markBusinessEventAppliedInTx, hashBusinessPayload } from "@/services/events/business-event.service"
import { transitionStockTransfer, transferWorkflowAvailability } from "../inventory-transfer-lifecycle.service"
import type { TransferCommand } from "@/types/transferLifecycle"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/accounting/periods.service", () => ({ getOpenPeriodForDate: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: (payload: unknown) => JSON.stringify(payload),
  recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn(),
}))
jest.mock("../inventory-close-invalidation.service", () => ({ recordInventoryValuationCloseInvalidationInTx: jest.fn() }))

const decimal = (value: number | string) => new Prisma.Decimal(value)
const initialDate = new Date("2026-09-12T10:00:00.000Z")
function clone<T>(value: T): T {
  if (value instanceof Prisma.Decimal) return new Prisma.Decimal(value) as T
  if (value instanceof Date) return new Date(value) as T
  if (Array.isArray(value)) return value.map(clone) as T
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)])) as T
  return value
}
function fixture() {
  return {
    transfer: { id: "transfer", organizationId: "org", status: "DRAFT", updatedAt: initialDate, createdById: "maker",
      fromLocationId: "source", toLocationId: "destination", transferNumber: "TR-1", approvedById: null as string | null, actualDate: null,
      fromLocation: { id: "source", name: "Warehouse", organizationId: "org", isActive: true },
      toLocation: { id: "destination", name: "Shop", organizationId: "org", isActive: true },
      lines: [{ id: "line", itemId: "item", requestedQuantity: decimal(5), shippedQuantity: decimal(0), receivedQuantity: decimal(0), unitCost: decimal(100),
        item: { id: "item", sku: "SKU", organizationId: "org", isActive: true, trackInventory: true } }],
    },
    levels: [
      { id: "source-level", itemId: "item", locationId: "source", quantityOnHand: decimal(10), quantityAvailable: decimal(9), quantityReserved: decimal(1), quantityInTransit: decimal(0), totalValue: decimal(1000), averageCost: decimal(100), version: 1 },
      { id: "dest-level", itemId: "item", locationId: "destination", quantityOnHand: decimal(2), quantityAvailable: decimal(1), quantityReserved: decimal(1), quantityInTransit: decimal(0), totalValue: decimal(240), averageCost: decimal(120), version: 1 },
    ],
    events: [] as any[], movements: [] as any[], audits: [] as any[],
  }
}
let state: ReturnType<typeof fixture>
let tx: any
let commandNumber: number
function apply(target: any, changes: any) {
  for (const [key, value] of Object.entries(changes) as [string, any][]) {
    if (value && typeof value === "object" && "increment" in value) target[key] = target[key] instanceof Prisma.Decimal ? target[key].plus(value.increment) : target[key] + value.increment
    else if (value && typeof value === "object" && "decrement" in value) target[key] = target[key].minus(value.decrement)
    else target[key] = value
  }
}
function command(operation: TransferCommand["operation"], overrides: Partial<TransferCommand & { actorId: string }> = {}) {
  return { organizationId: "org", transferId: "transfer", actorId: "checker", operation, requestId: String(++commandNumber),
    expectedUpdatedAt: state.transfer.updatedAt.toISOString(),
    ...(operation === "DISPATCH" ? { locationId: "source" } : {}),
    ...(operation === "RECEIVE" ? { locationId: "destination", lines: [{ lineId: "line", quantity: 5 }] } : {}),
    ...overrides,
  }
}
beforeEach(() => {
  jest.clearAllMocks(); commandNumber = 0; state = fixture()
  ;(getOpenPeriodForDate as jest.Mock).mockResolvedValue({ id: "period" })
  tx = {
    $queryRaw: jest.fn(async (sql: { values: unknown[] }) => sql.values.includes("org") && sql.values.includes("transfer") ? [{ id: "transfer" }] : []),
    stockTransfer: {
      findFirst: jest.fn(async ({ where }: any) => where.organizationId === state.transfer.organizationId && where.id === state.transfer.id ? clone(state.transfer) : null),
      update: jest.fn(async ({ data }: any) => { apply(state.transfer, data); state.transfer.updatedAt = new Date(state.transfer.updatedAt.getTime() + 1); return clone(state.transfer) }),
    },
    stockTransferLine: { update: jest.fn(async ({ where, data }: any) => { const line = state.transfer.lines.find(line => line.id === where.id)!; apply(line, data); return clone(line) }) },
    businessEvent: {
      findUnique: jest.fn(async ({ where }: any) => state.events.find(event => event.idempotencyKey === where.organizationId_eventSource_idempotencyKey.idempotencyKey)),
      findFirst: jest.fn(async ({ where }: any) => state.events.find(event => (typeof where.eventType === "string" ? event.eventType === where.eventType : !where.eventType.notIn.includes(event.eventType)) && (!where.status || event.status === where.status))),
    },
    inventoryLevel: {
      upsert: jest.fn(async ({ where }: any) => clone(state.levels.find(level => level.locationId === where.itemId_locationId.locationId)!)),
      findUnique: jest.fn(async ({ where }: any) => clone(state.levels.find(level => level.locationId === where.itemId_locationId.locationId)!)),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const level = state.levels.find(level => level.id === where.id)
        if (!level || level.version !== where.version || ["quantityOnHand", "quantityAvailable", "quantityInTransit"].some(key => where[key]?.gte && (level as any)[key].lt(where[key].gte))) return { count: 0 }
        apply(level, data); return { count: 1 }
      }),
    },
    inventoryTransaction: {
      findFirst: jest.fn(async () => state.movements[0] ?? null),
      create: jest.fn(async ({ data }: any) => { const movement = { ...clone(data), id: String(state.movements.length + 1) }; state.movements.push(movement); return movement }),
      findMany: jest.fn(async ({ where }: any) => state.movements.filter(movement => movement.type === where.type && movement.notes.includes(where.notes.contains))),
    },
    auditLog: { findFirst: jest.fn(async ({ where }: any) => state.audits.find(audit => where.action.in.includes(audit.action))), create: jest.fn(async ({ data }: any) => { state.audits.push(data); return data }) },
  }
  ;(recordBusinessEventInTx as jest.Mock).mockImplementation(async (_tx, input) => {
    const event = { ...clone(input), id: String(state.events.length + 1), payloadHash: hashBusinessPayload(input.payload), status: "RECORDED" }
    state.events.push(event); return { event, created: true }
  })
  ;(markBusinessEventAppliedInTx as jest.Mock).mockImplementation(async (_tx, _org, id) => { state.events.find(event => event.id === id).status = "APPLIED" })
  ;(db.$transaction as jest.Mock).mockImplementation(async (run) => {
    const before = clone(state)
    try { return await run(tx) } catch (error) { state = before; throw error }
  })
})
async function dispatch() {
  await transitionStockTransfer(command("SUBMIT", { actorId: "maker" }))
  await transitionStockTransfer(command("APPROVE"))
  await transitionStockTransfer(command("DISPATCH"))
}

it("runs draft, independent approval, dispatch, partial receipt and final reception with exact stock and value", async () => {
  await transitionStockTransfer(command("SUBMIT", { actorId: "maker" }))
  expect(state.transfer.status).toBe("SUBMITTED")
  await expect(transitionStockTransfer(command("APPROVE", { actorId: "maker" }))).rejects.toThrow("Another authorized")
  await transitionStockTransfer(command("APPROVE"))
  expect(state.transfer.status).toBe("APPROVED")
  expect(state.movements).toHaveLength(0)
  expect(state.levels[0].quantityOnHand.toNumber()).toBe(10)
  await transitionStockTransfer(command("DISPATCH"))
  expect(state.transfer.status).toBe("IN_TRANSIT")
  expect(state.transfer.actualDate).toBeNull()
  expect(state.levels[0].quantityOnHand.toNumber()).toBe(5)
  expect(state.levels[1].quantityOnHand.toNumber()).toBe(2)
  expect(state.levels[1].quantityInTransit.toNumber()).toBe(5)
  expect(state.movements.map(m => m.type)).toEqual(["TRANSFER_OUT"])
  await transitionStockTransfer(command("RECEIVE", { actorId: "receiver", lines: [{ lineId: "line", quantity: 2 }], notes: "First delivery" }))
  expect(state.transfer.status).toBe("PARTIALLY_RECEIVED")
  expect(state.transfer.actualDate).toBeNull()
  expect(state.levels[1].quantityOnHand.toNumber()).toBe(4)
  expect(state.levels[1].quantityInTransit.toNumber()).toBe(3)
  await transitionStockTransfer(command("RECEIVE", { actorId: "receiver", lines: [{ lineId: "line", quantity: 3 }] }))
  expect(state.transfer.status).toBe("COMPLETED")
  expect(state.transfer.actualDate).toBeInstanceOf(Date)
  expect(state.transfer.lines[0].receivedQuantity.toNumber()).toBe(5)
  expect(state.levels[1].quantityOnHand.toNumber()).toBe(7)
  expect(state.levels[1].quantityAvailable.toNumber()).toBe(6)
  expect(state.levels[1].quantityInTransit.toNumber()).toBe(0)
  expect(state.levels[0].totalValue.plus(state.levels[1].totalValue).toNumber()).toBe(1240)
  expect(state.events.every(event => event.status === "APPLIED")).toBe(true)
  expect(state.audits).toHaveLength(5)
})

it("replays the same partial receipt without duplicating stock and rejects changed payload reuse", async () => {
  await dispatch()
  const receipt = command("RECEIVE", { lines: [{ lineId: "line", quantity: 2 }] })
  await transitionStockTransfer(receipt)
  expect((await transitionStockTransfer(receipt)).replayed).toBe(true)
  expect(state.movements).toHaveLength(2)
  await expect(transitionStockTransfer({ ...receipt, lines: [{ lineId: "line", quantity: 1 }] })).rejects.toThrow("already used")
  await expect(transitionStockTransfer({ ...receipt, actorId: "someone-else" })).rejects.toThrow("already used")
})

it("rejects two receipt commands based on the same displayed revision", async () => {
  await dispatch()
  const first = command("RECEIVE", { lines: [{ lineId: "line", quantity: 2 }] })
  const second = { ...first, requestId: "second" }
  await transitionStockTransfer(first)
  await expect(transitionStockTransfer(second)).rejects.toThrow("has changed")
  expect(state.transfer.lines[0].receivedQuantity.toNumber()).toBe(2)
})

it.each([0, -1, NaN, Infinity, 0.0001])("rejects invalid receipt quantity %s before opening a transaction", async quantity => {
  await expect(transitionStockTransfer(command("RECEIVE", { lines: [{ lineId: "line", quantity }] }))).rejects.toThrow()
  expect(db.$transaction).not.toHaveBeenCalled()
})

it.each([
  { lines: [{ lineId: "line", quantity: 6 }] },
  { lines: [{ lineId: "foreign-line", quantity: 1 }] },
  { lines: [] },
  { lines: [{ lineId: "line", quantity: 1 }, { lineId: "line", quantity: 1 }] },
  { locationId: "source" },
])("rejects invalid receiving payload %# without stock changes", async overrides => {
  await dispatch()
  await expect(transitionStockTransfer(command("RECEIVE", overrides))).rejects.toThrow()
  expect(state.movements).toHaveLength(1)
  expect(state.transfer.status).toBe("IN_TRANSIT")
})

it("does not allow stages to be skipped or cancelled after dispatch", async () => {
  await expect(transitionStockTransfer(command("APPROVE"))).rejects.toThrow("DRAFT")
  await expect(transitionStockTransfer(command("DISPATCH"))).rejects.toThrow("DRAFT")
  await expect(transitionStockTransfer(command("RECEIVE"))).rejects.toThrow("DRAFT")
  await dispatch()
  await expect(transitionStockTransfer(command("CANCEL", { notes: "stop" }))).rejects.toThrow("IN_TRANSIT")
})

it("rejects cross-tenant commands before loading or changing stock", async () => {
  await expect(transitionStockTransfer(command("SUBMIT", { organizationId: "foreign" }))).rejects.toThrow("not found")
  expect(tx.stockTransfer.findFirst).not.toHaveBeenCalled()
  expect(state.events).toHaveLength(0)
})

it("rolls back dispatch when stock is insufficient or a stock version changed", async () => {
  state.transfer.status = "APPROVED"; state.transfer.approvedById = "checker"
  state.levels[0].quantityAvailable = decimal(1)
  await expect(transitionStockTransfer(command("DISPATCH"))).rejects.toThrow("Insufficient")
  expect(state.events).toHaveLength(0)
  state.levels[0].quantityAvailable = decimal(9)
  tx.inventoryLevel.updateMany.mockResolvedValueOnce({ count: 0 })
  await expect(transitionStockTransfer(command("DISPATCH"))).rejects.toThrow("Source stock changed")
  expect(state.events).toHaveLength(0)
  expect(state.levels[0].quantityOnHand.toNumber()).toBe(10)
})

it("rolls back source and event when the destination write fails", async () => {
  state.transfer.status = "APPROVED"; state.transfer.approvedById = "checker"
  tx.inventoryLevel.updateMany.mockImplementationOnce(async ({ data }: any) => { apply(state.levels[0], data); return { count: 1 } })
    .mockResolvedValueOnce({ count: 0 })
  await expect(transitionStockTransfer(command("DISPATCH"))).rejects.toThrow("Receiving stock changed")
  expect(state.levels[0].quantityOnHand.toNumber()).toBe(10)
  expect(state.events).toHaveLength(0)
})

it("requires an open period for both physical stages, but allows draft submission", async () => {
  ;(getOpenPeriodForDate as jest.Mock).mockResolvedValue(null)
  await transitionStockTransfer(command("SUBMIT"))
  await transitionStockTransfer(command("APPROVE"))
  await expect(transitionStockTransfer(command("DISPATCH"))).rejects.toThrow("open accounting period")
})

it("records rejection reason and closes the request without movements", async () => {
  await transitionStockTransfer(command("SUBMIT"))
  await expect(transitionStockTransfer(command("REJECT"))).rejects.toThrow("reason")
  await transitionStockTransfer(command("REJECT", { notes: "Wrong destination" }))
  expect(state.transfer.status).toBe("CANCELLED")
  expect(state.events.at(-1).payload.notes).toBe("Wrong destination")
  expect(state.movements).toHaveLength(0)
})

it("requires evidence for legacy in-transit records", async () => {
  state.transfer.status = "IN_TRANSIT"; state.transfer.lines[0].shippedQuantity = decimal(5)
  await expect(transitionStockTransfer(command("RECEIVE"))).rejects.toThrow("Dispatch evidence")
})

it("preserves the complete dispatched carrying value across fractional partial receipts", async () => {
  state.transfer.status = "APPROVED"; state.transfer.approvedById = "checker"
  state.transfer.lines[0].requestedQuantity = decimal(10)
  state.levels[0].quantityAvailable = decimal(10)
  state.levels[0].totalValue = decimal("1000.03")
  await transitionStockTransfer(command("DISPATCH"))
  await transitionStockTransfer(command("RECEIVE", { lines: [{ lineId: "line", quantity: 3.333 }] }))
  await transitionStockTransfer(command("RECEIVE", { lines: [{ lineId: "line", quantity: 6.667 }] }))
  expect(state.levels[1].totalValue.toFixed(2)).toBe("1240.03")
  expect(state.levels[0].totalValue.toNumber()).toBe(0)
  expect(state.transfer.status).toBe("COMPLETED")
})

it("does not redispatch or cancel legacy stock quantities hidden behind an approved status", async () => {
  state.transfer.status = "APPROVED"; state.transfer.approvedById = "checker"
  state.transfer.lines[0].shippedQuantity = decimal(5)
  await expect(transitionStockTransfer(command("DISPATCH"))).rejects.toThrow("requires reconciliation")
  await expect(transitionStockTransfer(command("CANCEL", { notes: "cancel" }))).rejects.toThrow("requires reconciliation")
  expect(state.movements).toHaveLength(0)
})
it("requires an independent approver on imported approved records before dispatch", async () => {
  state.transfer.status = "APPROVED"
  await expect(transitionStockTransfer(command("DISPATCH"))).rejects.toThrow("Independent approval evidence")
})

it("offers draft correction for an unposted legacy record and completes a fresh dispatch afterwards", async () => {
  state.transfer.status = "APPROVED"; state.transfer.approvedById = "checker"
  state.transfer.lines[0].shippedQuantity = decimal(4)
  const availability = await transferWorkflowAvailability(state.transfer as any, "checker", tx)
  expect(availability).toEqual({ blockingIssue: "RECORDED_QUANTITIES", allowedOperations: ["RETURN_TO_DRAFT"] })
  const before = clone(state.levels)
  const correction = command("RETURN_TO_DRAFT", { confirmNoMovement: true, notes: "Incorrect imported shipped quantity; nothing left source." })
  await transitionStockTransfer(correction)
  expect(state.transfer.status).toBe("DRAFT")
  expect(state.transfer.approvedById).toBeNull()
  expect(state.transfer.lines[0].shippedQuantity.toNumber()).toBe(0)
  expect(state.transfer.lines[0].unitCost).toBeNull()
  expect(state.levels).toEqual(before)
  expect(state.movements).toHaveLength(0)
  expect(state.audits[0].changes.before.lines[0].shippedQuantity).toBe("4")
  expect((await transitionStockTransfer(correction)).replayed).toBe(true)
  expect(state.audits).toHaveLength(1)
  await expect(transitionStockTransfer(command("DISPATCH"))).rejects.toThrow("DRAFT")
  await dispatch()
  expect(state.transfer.status).toBe("IN_TRANSIT")
  expect(state.levels[0].quantityOnHand.toNumber()).toBe(5)
  expect(state.movements).toHaveLength(1)
  await transitionStockTransfer(command("RECEIVE"))
  expect(state.transfer.status).toBe("COMPLETED")
})
it.each(["movement", "event", "audit", "received", "in_transit"])("refuses draft correction when %s evidence exists", async kind => {
  state.transfer.status = "APPROVED"; state.transfer.approvedById = "checker"
  state.transfer.lines[0].shippedQuantity = decimal(4)
  if (kind === "movement") state.movements.push({ id: "old-stock-move" })
  if (kind === "event") state.events.push({ id: "old-event", eventType: "stock.transfer.posted", status: "RECORDED" })
  if (kind === "audit") state.audits.push({ action: "DISPATCH_STOCK_TRANSFER" })
  if (kind === "received") state.transfer.lines[0].receivedQuantity = decimal(1)
  if (kind === "in_transit") state.transfer.status = "IN_TRANSIT"
  const before = clone(state)
  await expect(transitionStockTransfer(command("RETURN_TO_DRAFT", { confirmNoMovement: true, notes: "correction" }))).rejects.toThrow("not eligible")
  expect(state).toEqual(before)
  if (kind !== "in_transit") expect((await transferWorkflowAvailability(state.transfer as any, "checker", tx)).allowedOperations).toEqual([])
})
it.each([{ notes: "reason" }, { confirmNoMovement: true }])("requires correction confirmation and reason %#", async overrides => {
  state.transfer.lines[0].shippedQuantity = decimal(4)
  await expect(transitionStockTransfer(command("RETURN_TO_DRAFT", overrides))).rejects.toThrow("Confirm")
  expect(state.transfer.lines[0].shippedQuantity.toNumber()).toBe(4)
})
it("rechecks movement evidence at correction time after the page was loaded", async () => {
  state.transfer.lines[0].shippedQuantity = decimal(4)
  expect((await transferWorkflowAvailability(state.transfer as any, "checker", tx)).allowedOperations).toContain("RETURN_TO_DRAFT")
  state.movements.push({ id: "late-evidence" })
  await expect(transitionStockTransfer(command("RETURN_TO_DRAFT", { confirmNoMovement: true, notes: "correction" }))).rejects.toThrow("movement evidence")
  expect(state.transfer.lines[0].shippedQuantity.toNumber()).toBe(4)
})
it("rolls back correction if recording its audit fails", async () => {
  state.transfer.lines[0].shippedQuantity = decimal(4)
  tx.auditLog.create.mockRejectedValueOnce(new Error("audit unavailable"))
  await expect(transitionStockTransfer(command("RETURN_TO_DRAFT", { confirmNoMovement: true, notes: "correction" }))).rejects.toThrow("audit unavailable")
  expect(state.transfer.lines[0].shippedQuantity.toNumber()).toBe(4)
  expect(state.events).toHaveLength(0)
})
it("replays dispatch without a second debit and rejects another stale dispatch request", async () => {
  state.transfer.status = "APPROVED"; state.transfer.approvedById = "checker"
  const input = command("DISPATCH")
  await transitionStockTransfer(input)
  expect((await transitionStockTransfer(input)).replayed).toBe(true)
  await expect(transitionStockTransfer({ ...input, requestId: "other-request" })).rejects.toThrow("has changed")
  expect(state.levels[0].quantityOnHand.toNumber()).toBe(5)
  expect(state.levels[1].quantityInTransit.toNumber()).toBe(5)
  expect(state.movements).toHaveLength(1)
})
