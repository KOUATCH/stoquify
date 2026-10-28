import { randomUUID } from "node:crypto"
import { setImmediate as nodeSetImmediate } from "node:timers"

jest.unmock("@/prisma/db")
jest.unmock("@/services/inventory/inventory-stock-event.service")

import { db } from "@/prisma/db"
import {
  createPurchaseOrder,
  receiveItems,
  resolveGoodsReceiptInspection,
} from "../purchase-order.service"

const CERTIFICATION_SCHEMA = "codex_purchase_receiving_cert_20260818"
const runCertification = process.env.RUN_PURCHASE_RECEIVING_POSTGRES_CERTIFICATION === "1"
const describeCertification = runCertification ? describe : describe.skip

type Fixture = {
  organizationId: string
  userId: string
  receiverId: string
  locationId: string
  supplierId: string
  itemId: string
}

function assertIsolatedCertificationDatabase() {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "")
  const hostname = databaseUrl.hostname.toLowerCase()
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(hostname)
  if (!isLocalHost || databaseUrl.searchParams.get("schema") !== CERTIFICATION_SCHEMA) {
    throw new Error(`Refusing purchase receiving certification outside local schema ${CERTIFICATION_SCHEMA}`)
  }
}

async function createFixture(
  label: string,
  options: { withOpenPeriod?: boolean } = {},
): Promise<Fixture> {
  assertIsolatedCertificationDatabase()
  const suffix = `${label}-${randomUUID()}`
  const organizationId = `org-p2p-${suffix}`
  const userId = `buyer-p2p-${suffix}`
  const receiverId = `receiver-p2p-${suffix}`
  const locationId = `location-p2p-${suffix}`
  const supplierId = `supplier-p2p-${suffix}`
  const itemId = `item-p2p-${suffix}`

  await db.organization.create({
    data: {
      id: organizationId,
      name: `Purchase receiving certification ${label}`,
      slug: `purchase-receiving-cert-${suffix}`,
      currency: "XAF",
    },
  })
  await db.user.createMany({
    data: [
      {
        id: userId,
        email: `${userId}@certification.invalid`,
        organizationId,
        firstName: "Certification",
        lastName: "Buyer",
        mfaBackupCodes: [],
      },
      {
        id: receiverId,
        email: `${receiverId}@certification.invalid`,
        organizationId,
        firstName: "Certification",
        lastName: "Receiver",
        mfaBackupCodes: [],
      },
    ],
  })
  await db.location.create({
    data: {
      id: locationId,
      organizationId,
      name: `Receiving warehouse ${label}`,
      code: `P2P-${suffix}`,
      type: "WAREHOUSE",
    },
  })
  await db.supplier.create({
    data: {
      id: supplierId,
      organizationId,
      name: `Certification supplier ${label}`,
      code: `SUP-${suffix}`,
    },
  })
  await db.item.create({
    data: {
      id: itemId,
      organizationId,
      slug: `purchase-receiving-item-${suffix}`,
      sku: `P2P-${suffix}`,
      nameEn: `Certification item ${label}`,
      imageUrls: [],
      costPrice: 100,
      sellingPrice: 150,
    },
  })

  if (options.withOpenPeriod !== false) {
    const year = new Date().getUTCFullYear()
    const fiscalYear = await db.fiscalYear.create({
      data: {
        organizationId,
        name: `FY-${year}`,
        startDate: new Date(Date.UTC(year, 0, 1)),
        endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
      },
    })
    await db.accountingPeriod.create({
      data: {
        organizationId,
        fiscalYearId: fiscalYear.id,
        periodNumber: 1,
        name: `FY-${year}`,
        startDate: fiscalYear.startDate,
        endDate: fiscalYear.endDate,
      },
    })
  }

  return { organizationId, userId, receiverId, locationId, supplierId, itemId }
}

async function createReceivableOrder(fixture: Fixture, quantity: number) {
  return db.purchaseOrder.create({
    data: {
      orderNumber: `LEGACY-RACE-${randomUUID()}`,
      organizationId: fixture.organizationId,
      supplierId: fixture.supplierId,
      locationId: fixture.locationId,
      createdById: fixture.userId,
      approvedById: fixture.receiverId,
      approvedAt: new Date(),
      status: "APPROVED",
      subtotal: quantity * 100,
      total: quantity * 100,
      lines: {
        create: {
          itemId: fixture.itemId,
          orderedQuantity: quantity,
          receivedQuantity: 0,
          unitCost: 100,
          lineTotal: quantity * 100,
        },
      },
    },
    include: { lines: true },
  })
}

function receiptInput(fixture: Fixture, purchaseOrderId: string, lineId: string, idempotencyKey: string) {
  return {
    purchaseOrderId,
    organizationId: fixture.organizationId,
    receivedById: fixture.receiverId,
    idempotencyKey,
    inspectionOutcome: "PASSED" as const,
    items: [{ lineId, receivedQuantity: 1 }],
  }
}

describeCertification("purchase receiving PostgreSQL races", () => {
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

  it("allocates unique gap-tolerant PO numbers atomically per tenant", async () => {
    const fixture = await createFixture("po-sequence")
    const otherTenant = await createFixture("po-sequence-other")
    const createInput = (target: Fixture) => ({
      organizationId: target.organizationId,
      createdById: target.userId,
      supplierId: target.supplierId,
      locationId: target.locationId,
      date: "2026-08-18",
      expectedDeliveryDate: "2026-08-25",
      orderLines: [{ itemId: target.itemId, quantity: 1, unitPrice: 100 }],
    })

    const created = await Promise.all(
      Array.from({ length: 8 }, () => createPurchaseOrder(createInput(fixture))),
    )
    const otherCreated = await createPurchaseOrder(createInput(otherTenant))

    expect(created.map((order) => order.orderNumber).sort()).toEqual(
      Array.from({ length: 8 }, (_, index) => `PO-${String(index + 1).padStart(6, "0")}`),
    )
    expect(otherCreated.orderNumber).toBe("PO-000001")
    expect(new Set(created.map((order) => order.orderNumber)).size).toBe(8)
  })

  it("commits receipt evidence, ordered quantity, and stock posting as one unit", async () => {
    const fixture = await createFixture("same-command")
    const order = await createReceivableOrder(fixture, 1)
    const input = receiptInput(
      fixture,
      order.id,
      order.lines[0].id,
      `receipt:${randomUUID()}`,
    )

    const results = await Promise.all([receiveItems(input), receiveItems(input)])

    expect(results.map((result) => result.replayed).sort()).toEqual([false, true])
    expect(new Set(results.map((result) => result.receiptNumber)).size).toBe(1)
    expect(await db.goodsReceipt.count({
      where: { organizationId: fixture.organizationId, purchaseOrderId: order.id },
    })).toBe(1)
    const receipt = await db.goodsReceipt.findFirstOrThrow({
      where: { organizationId: fixture.organizationId, purchaseOrderId: order.id },
    })
    expect(receipt.inventoryPostedAt).toBeInstanceOf(Date)
    expect(await db.goodsReceiptLine.count({
      where: { goodsReceiptId: receipt.id },
    })).toBe(1)
    expect(String((await db.purchaseOrderLine.findUniqueOrThrow({
      where: { id: order.lines[0].id },
    })).receivedQuantity)).toBe("1")
    expect(String((await db.inventoryLevel.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: fixture.itemId, locationId: fixture.locationId } },
    })).quantityOnHand)).toBe("1")
    expect(await db.inventoryTransaction.count({
      where: {
        organizationId: fixture.organizationId,
        referenceType: "GOODS_RECEIPT",
        referenceId: receipt.id,
      },
    })).toBe(1)
    expect(await db.businessEvent.count({
      where: {
        organizationId: fixture.organizationId,
        eventType: "purchase.goods_receipt.stock_posted",
        sourceId: receipt.id,
      },
    })).toBe(1)
  })

  it("serializes competing receivers without overreceipt and allocates unique GRNs", async () => {
    const fixture = await createFixture("receiver-race")
    const order = await createReceivableOrder(fixture, 4)
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => receiveItems(receiptInput(
        fixture,
        order.id,
        order.lines[0].id,
        `receipt:${randomUUID()}`,
      ))),
    )
    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof receiveItems>>> => result.status === "fulfilled",
    )

    expect(fulfilled).toHaveLength(4)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(2)
    expect(new Set(fulfilled.map((result) => result.value.receiptNumber)).size).toBe(4)
    expect(await db.goodsReceipt.count({
      where: { organizationId: fixture.organizationId, purchaseOrderId: order.id },
    })).toBe(4)
    const line = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: order.lines[0].id } })
    const persistedOrder = await db.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(String(line.receivedQuantity)).toBe("4")
    expect(persistedOrder.status).toBe("RECEIVED")
    expect(String((await db.inventoryLevel.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: fixture.itemId, locationId: fixture.locationId } },
    })).quantityOnHand)).toBe("4")
    expect(await db.inventoryTransaction.count({
      where: {
        organizationId: fixture.organizationId,
        referenceType: "GOODS_RECEIPT",
      },
    })).toBe(4)
  })

  it("rolls back receipt evidence and ordered quantity when stock posting fails", async () => {
    const fixture = await createFixture("stock-posting-rollback", { withOpenPeriod: false })
    const order = await createReceivableOrder(fixture, 1)

    await expect(receiveItems(receiptInput(
      fixture,
      order.id,
      order.lines[0].id,
      `receipt:${randomUUID()}`,
    ))).rejects.toThrow("An open accounting period is required before posting this stock event.")

    expect(await db.goodsReceipt.count({
      where: { organizationId: fixture.organizationId, purchaseOrderId: order.id },
    })).toBe(0)
    expect(await db.goodsReceiptLine.count({
      where: { goodsReceipt: { organizationId: fixture.organizationId, purchaseOrderId: order.id } },
    })).toBe(0)
    expect(String((await db.purchaseOrderLine.findUniqueOrThrow({
      where: { id: order.lines[0].id },
    })).receivedQuantity)).toBe("0")
    expect((await db.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("APPROVED")
    expect(await db.inventoryLevel.count({
      where: { itemId: fixture.itemId, locationId: fixture.locationId },
    })).toBe(0)
    expect(await db.inventoryTransaction.count({
      where: { organizationId: fixture.organizationId, referenceType: "GOODS_RECEIPT" },
    })).toBe(0)
    expect(await db.businessEvent.count({
      where: { organizationId: fixture.organizationId, eventType: "purchase.goods_receipt.stock_posted" },
    })).toBe(0)
    expect(await db.ledgerPostingBatch.count({
      where: { organizationId: fixture.organizationId, sourceType: "GOODS_RECEIPT" },
    })).toBe(0)
  })

  it("holds failed inspection stock and releases it exactly once through authorized resolution", async () => {
    const fixture = await createFixture("inspection-hold")
    const order = await createReceivableOrder(fixture, 1)
    const held = await receiveItems({
      ...receiptInput(fixture, order.id, order.lines[0].id, `receipt:${randomUUID()}`),
      inspectionOutcome: "FAILED",
      inspectionReason: "Packaging requires supervisor review",
    })

    expect(held).toMatchObject({ receiptStatus: "HELD", inspectionOutcome: "FAILED" })
    expect(String((await db.purchaseOrderLine.findUniqueOrThrow({
      where: { id: order.lines[0].id },
    })).receivedQuantity)).toBe("0")
    expect(await db.inventoryLevel.count({
      where: { itemId: fixture.itemId, locationId: fixture.locationId },
    })).toBe(0)
    expect(await db.inventoryTransaction.count({
      where: { organizationId: fixture.organizationId, referenceType: "GOODS_RECEIPT" },
    })).toBe(0)

    await expect(receiveItems(receiptInput(
      fixture,
      order.id,
      order.lines[0].id,
      `receipt:${randomUUID()}`,
    ))).rejects.toThrow("Only 0 remaining")

    const receipt = await db.goodsReceipt.findFirstOrThrow({
      where: {
        organizationId: fixture.organizationId,
        purchaseOrderId: order.id,
        receiptNumber: held.receiptNumber,
      },
      include: { inspection: true },
    })
    expect(receipt.inspection).toMatchObject({ outcome: "FAILED", inspectedById: fixture.receiverId })

    const resolutionInput = {
      goodsReceiptId: receipt.id,
      organizationId: fixture.organizationId,
      resolvedById: fixture.receiverId,
      decision: "ACCEPT" as const,
      reason: "Contents inspected and accepted",
      idempotencyKey: `inspection-resolution:${randomUUID()}`,
    }
    const [resolved, replayed] = [
      await resolveGoodsReceiptInspection(resolutionInput),
      await resolveGoodsReceiptInspection(resolutionInput),
    ]

    expect(resolved).toMatchObject({ receiptStatus: "RECEIVED", replayed: false })
    expect(replayed).toMatchObject({ receiptStatus: "RECEIVED", replayed: true })
    expect(await db.goodsReceiptInspectionResolution.count({
      where: { organizationId: fixture.organizationId, goodsReceiptId: receipt.id },
    })).toBe(1)
    expect(String((await db.purchaseOrderLine.findUniqueOrThrow({
      where: { id: order.lines[0].id },
    })).receivedQuantity)).toBe("1")
    expect(String((await db.inventoryLevel.findUniqueOrThrow({
      where: { itemId_locationId: { itemId: fixture.itemId, locationId: fixture.locationId } },
    })).quantityOnHand)).toBe("1")
    expect(await db.inventoryTransaction.count({
      where: {
        organizationId: fixture.organizationId,
        referenceType: "GOODS_RECEIPT",
        referenceId: receipt.id,
      },
    })).toBe(1)
    expect(await db.businessEvent.count({
      where: {
        organizationId: fixture.organizationId,
        eventType: "purchase.goods_receipt.stock_posted",
        sourceId: receipt.id,
      },
    })).toBe(1)
    expect((await db.goodsReceipt.findUniqueOrThrow({ where: { id: receipt.id } })).inventoryPostedAt)
      .toBeInstanceOf(Date)
  })

  it("rejects a cross-tenant receipt before persistence or stock posting", async () => {
    const fixture = await createFixture("tenant-owner")
    const otherTenant = await createFixture("tenant-attacker")
    const order = await createReceivableOrder(fixture, 1)

    await expect(receiveItems({
      ...receiptInput(otherTenant, order.id, order.lines[0].id, `receipt:${randomUUID()}`),
      receivedById: otherTenant.receiverId,
    })).rejects.toThrow("Purchase order not found")

    expect(await db.goodsReceipt.count({
      where: { purchaseOrderId: order.id },
    })).toBe(0)
    expect(String((await db.purchaseOrderLine.findUniqueOrThrow({
      where: { id: order.lines[0].id },
    })).receivedQuantity)).toBe("0")
    expect(await db.inventoryLevel.count({
      where: { itemId: fixture.itemId, locationId: fixture.locationId },
    })).toBe(0)
    expect(await db.inventoryTransaction.count({
      where: {
        organizationId: { in: [fixture.organizationId, otherTenant.organizationId] },
        referenceType: "GOODS_RECEIPT",
      },
    })).toBe(0)
  })
})
