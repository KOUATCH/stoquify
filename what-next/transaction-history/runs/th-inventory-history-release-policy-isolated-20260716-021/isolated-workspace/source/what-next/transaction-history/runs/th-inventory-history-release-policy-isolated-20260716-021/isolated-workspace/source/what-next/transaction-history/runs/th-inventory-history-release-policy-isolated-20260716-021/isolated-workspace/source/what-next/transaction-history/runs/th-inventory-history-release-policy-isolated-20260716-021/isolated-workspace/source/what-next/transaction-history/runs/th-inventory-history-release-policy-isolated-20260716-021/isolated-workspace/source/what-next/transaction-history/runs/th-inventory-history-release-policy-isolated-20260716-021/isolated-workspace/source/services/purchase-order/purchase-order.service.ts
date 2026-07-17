import "server-only"

import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { postGoodsReceiptStock } from "@/services/inventory/inventory-stock-event.service"
import { type GoodsReceiptStatus, type Prisma, type PurchaseOrderStatus } from "@prisma/client"
import type { Decimal } from "@prisma/client/runtime/library"
import type {
  BulkStatusUpdateInput,
  ClonePurchaseOrderInput,
  CreatePurchaseOrderInput,
  OrderLineInput,
  POAnalyticsInput,
  ReceiveItemsInput,
  UpdatePurchaseOrderInput,
} from "./purchase-order.schemas"

const toN = (v: Decimal | number | string | null | undefined): number => {
  if (v === null || v === undefined) return 0
  if (typeof v === "number") return v
  if (typeof v === "string") return Number(v) || 0
  return Number(v.toString()) || 0
}

// ── Prisma include (single source of truth) ───────────────────────────────────

export const standardInclude = {
  supplier: {
    select: {
      id: true, name: true, code: true, email: true, phone: true,
      contactPerson: true, organizationId: true, createdAt: true, updatedAt: true,
      address: true, isActive: true, taxId: true, paymentTerms: true, notes: true,
    },
  },
  location: { select: { id: true, name: true, address: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  lines: {
    select: {
      id: true, itemId: true, orderedQuantity: true, receivedQuantity: true,
      unitCost: true, discount: true, taxRate: true, taxAmount: true,
      lineTotal: true, notes: true,
      item: {
        select: {
          id: true, nameEn: true, nameFr: true, sku: true,
          descriptionEn: true, descriptionFr: true, costPrice: true,
          trackSerialNumbers: true, trackBatches: true, trackExpiry: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  organization: { select: { id: true, name: true } },
} satisfies Prisma.PurchaseOrderInclude

type POWithRelations = Prisma.PurchaseOrderGetPayload<{ include: typeof standardInclude }>

// ── Status transition rules ───────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT:              ["SUBMITTED", "CANCELLED"],
  SUBMITTED:          ["APPROVED",  "CANCELLED"],
  APPROVED:           ["CANCELLED"],
  PARTIALLY_RECEIVED: ["RECEIVED",  "CANCELLED"],
  RECEIVED:           ["COMPLETED"],
  COMPLETED:          [],
  CANCELLED:          [],
}

export function canTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

const NON_EDITABLE_STATUSES: PurchaseOrderStatus[] = ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED", "COMPLETED"]
const NON_DELETABLE_STATUSES: PurchaseOrderStatus[] = ["RECEIVED", "PARTIALLY_RECEIVED", "COMPLETED"]
const RECEIVABLE_STATUSES: PurchaseOrderStatus[] = ["APPROVED", "PARTIALLY_RECEIVED"]
const LINE_RECONCILIATION_STATUSES = new Set<PurchaseOrderStatus>(["DRAFT", "SUBMITTED"])

// ── Calculation helpers ───────────────────────────────────────────────────────

function calcLine(qty: number, unitPrice: number, taxRate = 0, discount = 0) {
  const subtotal = qty * unitPrice
  const taxAmount = (subtotal * taxRate) / 100
  return { taxAmount, lineTotal: subtotal + taxAmount - discount }
}

function calcOrderTotals(lines: CreatePurchaseOrderInput["orderLines"], shippingCost = 0) {
  let subtotal = 0, taxAmount = 0, discount = 0
  for (const l of lines) {
    subtotal  += l.quantity * l.unitPrice
    taxAmount += calcLine(l.quantity, l.unitPrice, l.taxRate, l.discount).taxAmount
    discount  += l.discount ?? 0
  }
  return { subtotal, taxAmount, discount, total: subtotal + taxAmount + shippingCost - discount }
}

function lineDataFromOrderLine(line: OrderLineInput) {
  const { taxAmount, lineTotal } = calcLine(line.quantity, line.unitPrice, line.taxRate, line.discount)
  return {
    itemId:          line.itemId,
    orderedQuantity: line.quantity,
    unitCost:        line.unitPrice,
    discount:        line.discount ?? 0,
    taxRate:         line.taxRate ?? 0,
    taxAmount,
    lineTotal,
    notes:           line.notes ?? "",
  }
}

function lineAuditSnapshot(line: {
  id: string
  itemId: string
  orderedQuantity: Decimal | number | string
  receivedQuantity: Decimal | number | string
  unitCost: Decimal | number | string
  discount: Decimal | number | string | null
  taxRate: Decimal | number | string | null
  taxAmount: Decimal | number | string | null
  lineTotal: Decimal | number | string
  notes?: string | null
}) {
  return {
    id:               line.id,
    itemId:           line.itemId,
    orderedQuantity:  toN(line.orderedQuantity),
    receivedQuantity: toN(line.receivedQuantity),
    unitCost:         toN(line.unitCost),
    discount:         toN(line.discount),
    taxRate:          toN(line.taxRate),
    taxAmount:        toN(line.taxAmount),
    lineTotal:        toN(line.lineTotal),
    notes:            line.notes ?? null,
  }
}

function requestedLineAuditSnapshot(line: OrderLineInput) {
  const data = lineDataFromOrderLine(line)
  return {
    itemId:           data.itemId,
    orderedQuantity:  toN(data.orderedQuantity),
    receivedQuantity: 0,
    unitCost:         toN(data.unitCost),
    discount:         toN(data.discount),
    taxRate:          toN(data.taxRate),
    taxAmount:        toN(data.taxAmount),
    lineTotal:        toN(data.lineTotal),
    notes:            data.notes || null,
  }
}

async function reconcileDraftPurchaseOrderLines(
  tx: Prisma.TransactionClient,
  params: {
    purchaseOrderId: string
    organizationId: string
    status: PurchaseOrderStatus
    actorId?: string | null
    lines: OrderLineInput[]
  },
) {
  if (!LINE_RECONCILIATION_STATUSES.has(params.status)) {
    throw new BusinessRuleError(`Purchase order lines can only be reconciled while the order is draft or submitted.`)
  }

  const currentLines = await tx.purchaseOrderLine.findMany({
    where: { purchaseOrderId: params.purchaseOrderId },
    select: {
      id: true,
      itemId: true,
      orderedQuantity: true,
      receivedQuantity: true,
      unitCost: true,
      discount: true,
      taxRate: true,
      taxAmount: true,
      lineTotal: true,
      notes: true,
      goodsReceiptLines: { select: { id: true }, take: 1 },
      supplierInvoiceLines: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  })

  const protectedLine = currentLines.find((line) =>
    toN(line.receivedQuantity) > 0 || line.goodsReceiptLines.length > 0 || line.supplierInvoiceLines.length > 0,
  )
  if (protectedLine) {
    throw new BusinessRuleError("Cannot replace purchase order lines after receipt or invoice evidence exists.")
  }

  const requestedByItemId = new Map(params.lines.map((line) => [line.itemId, line]))
  const reconciled = {
    updated: [] as Array<{ id: string; itemId: string }>,
    created: [] as Array<{ id: string; itemId: string }>,
    removed: [] as Array<{ id: string; itemId: string }>,
  }

  for (const currentLine of currentLines) {
    const requestedLine = requestedByItemId.get(currentLine.itemId)
    if (!requestedLine) {
      await tx.purchaseOrderLine.delete({ where: { id: currentLine.id } })
      reconciled.removed.push({ id: currentLine.id, itemId: currentLine.itemId })
      continue
    }

    await tx.purchaseOrderLine.update({
      where: { id: currentLine.id },
      data: lineDataFromOrderLine(requestedLine),
    })
    reconciled.updated.push({ id: currentLine.id, itemId: currentLine.itemId })
    requestedByItemId.delete(currentLine.itemId)
  }

  for (const requestedLine of requestedByItemId.values()) {
    const created = await tx.purchaseOrderLine.create({
      data: {
        purchaseOrderId:   params.purchaseOrderId,
        ...lineDataFromOrderLine(requestedLine),
        receivedQuantity: 0,
      },
      select: { id: true, itemId: true },
    })
    reconciled.created.push({ id: created.id, itemId: created.itemId })
  }

  await tx.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId:         params.actorId ?? null,
      entityType:     "PurchaseOrder",
      entityId:       params.purchaseOrderId,
      action:         "RECONCILE_PURCHASE_ORDER_LINES",
      changes: {
        status: params.status,
        before: currentLines.map(lineAuditSnapshot),
        after:  params.lines.map(requestedLineAuditSnapshot),
        reconciled,
      },
    },
  })
}

// ── Validation helpers ────────────────────────────────────────────────────────

function assertDateRange(startStr: string, endStr: string) {
  const start = new Date(startStr), end = new Date(endStr)
  if (isNaN(start.getTime())) throw new BusinessRuleError("Invalid order date format")
  if (isNaN(end.getTime()))   throw new BusinessRuleError("Invalid expected delivery date format")
  if (end < start)            throw new BusinessRuleError("Expected delivery date cannot be before order date")
}

function assertUniqueItems(lines: CreatePurchaseOrderInput["orderLines"]) {
  const seen = new Map<string, number>()
  for (const [i, l] of lines.entries()) {
    seen.set(l.itemId, (seen.get(l.itemId) ?? 0) + 1)
    if ((seen.get(l.itemId) ?? 0) > 1) throw new ConflictError(`Duplicate item found at line ${i + 1}`)
  }
}

// ── PO number generation ──────────────────────────────────────────────────────

async function nextPONumber(organizationId: string): Promise<string> {
  const last = await db.purchaseOrder.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  })
  const n = last ? parseInt(last.orderNumber.replace("PO-", ""), 10) : NaN
  return `PO-${(isFinite(n) ? n + 1 : 1).toString().padStart(6, "0")}`
}

async function nextGRNumber(organizationId: string): Promise<string> {
  const last = await db.goodsReceipt.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { receiptNumber: true },
  })
  const n = last ? parseInt(last.receiptNumber.replace("GR-", ""), 10) : NaN
  return `GR-${(isFinite(n) ? n + 1 : 1).toString().padStart(6, "0")}`
}

// ── Search filter ─────────────────────────────────────────────────────────────

function buildSearchFilter(q: string): Prisma.PurchaseOrderWhereInput["OR"] {
  return [
    { orderNumber: { contains: q, mode: "insensitive" } },
    { notes: { contains: q, mode: "insensitive" } },
    { paymentTerms: { contains: q, mode: "insensitive" } },
    { supplier: { is: { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ] } } },
    { location: { is: { name: { contains: q, mode: "insensitive" } } } },
    { lines: { some: { item: { OR: [
      { nameEn: { contains: q, mode: "insensitive" } },
      { nameFr: { contains: q, mode: "insensitive" } },
      { sku:  { contains: q, mode: "insensitive" } },
    ] } } } },
  ]
}

function userName(user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  if (!user) return null
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return name || user.email || "Unknown user"
}

function mapUser<T extends { firstName?: string | null; lastName?: string | null; email?: string | null }>(
  user?: T | null,
) {
  if (!user) return null
  return { ...user, name: userName(user) }
}

function mapLineItem(item: POWithRelations["lines"][number]["item"]) {
  return {
    ...item,
    name: item.nameEn || item.nameFr || item.sku,
    description: item.descriptionEn || item.descriptionFr || null,
    costPrice: toN(item.costPrice),
  }
}

function serialSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28).toUpperCase() || "ITEM"
}

function generateReceiptBatchNumber(params: {
  receiptNumber: string
  sku: string
  lineId: string
}) {
  return `BATCH-${serialSegment(params.receiptNumber)}-${serialSegment(params.sku)}-${serialSegment(params.lineId.slice(-6))}`
}

function generateReceiptSerials(params: {
  receiptNumber: string
  sku: string
  lineId: string
  receivedQuantity: number
  provided?: string[]
}) {
  const provided = params.provided?.filter(Boolean) ?? []
  if (provided.length > params.receivedQuantity) {
    throw new BusinessRuleError(`Serial number count cannot exceed received quantity for "${params.sku}"`)
  }

  const missingCount = params.receivedQuantity - provided.length
  const prefix = `${serialSegment(params.receiptNumber)}-${serialSegment(params.sku)}-${params.lineId.slice(-6).toUpperCase()}`
  const generated = Array.from({ length: missingCount }, (_, index) =>
    `${prefix}-${String(provided.length + index + 1).padStart(3, "0")}`,
  )

  return [...provided, ...generated]
}

// ── Inventory update (used by receiveItems) ───────────────────────────────────

async function applyInventoryReceipt(
  tx: Prisma.TransactionClient,
  params: {
    itemId: string
    locationId: string
    qty: number
    unitCost: number
    organizationId: string
    receiptId: string
    receiptNumber: string
    receiptLineId: string
    receivedById?: string | null
    batchNumber?: string | null
    expiryDate?: Date | null
    serialNumbers?: string[]
  },
) {
  await postGoodsReceiptStock(
    {
      organizationId: params.organizationId,
      receiptId: params.receiptId,
      receiptNumber: params.receiptNumber,
      receivedById: params.receivedById,
      idempotencyKey: `goods-receipt-stock:${params.organizationId}:${params.receiptId}:${params.receiptLineId}`,
      lines: [
        {
          itemId: params.itemId,
          locationId: params.locationId,
          quantity: params.qty,
          unitCost: params.unitCost,
          goodsReceiptLineId: params.receiptLineId,
          notes: "Goods received via purchase order",
          batchNumber: params.batchNumber ?? null,
          expiryDate: params.expiryDate ?? null,
          serialNumbers: params.serialNumbers ?? [],
        },
      ],
    },
    tx,
  )

  if (params.serialNumbers?.length) {
    await tx.serialNumber.createMany({
      data: params.serialNumbers.map((serialNumber) => ({
        serialNumber,
        itemId: params.itemId,
        locationId: params.locationId,
        organizationId: params.organizationId,
        batchNumber: params.batchNumber ?? null,
        expiryDate: params.expiryDate ?? null,
        status: "AVAILABLE",
        notes: "Received via purchase order",
      })),
      skipDuplicates: true,
    })
  }
}

// ── DTO transformer ───────────────────────────────────────────────────────────

export function transformPO(po: POWithRelations) {
  return {
    id:                   po.id,
    orderNumber:          po.orderNumber,
    status:               po.status,
    orderDate:            po.orderDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    actualDeliveryDate:   po.actualDeliveryDate,
    paymentTerms:         po.paymentTerms,
    notes:                po.notes,
    supplierId:           po.supplierId,
    locationId:           po.locationId,
    subtotal:             toN(po.subtotal),
    taxAmount:            toN(po.taxAmount),
    shippingCost:         toN(po.shippingCost),
    discount:             toN(po.discount),
    total:                toN(po.total),
    supplier:             po.supplier,
    location:             po.location,
    organization:         po.organization,
    createdBy:            mapUser(po.createdBy),
    approvedBy:           mapUser(po.approvedBy),
    approvedAt:           po.approvedAt,
    lines: po.lines.map((l) => ({
      id:               l.id,
      itemId:           l.itemId,
      orderedQuantity:  toN(l.orderedQuantity),
      receivedQuantity: toN(l.receivedQuantity),
      unitCost:         toN(l.unitCost),
      discount:         toN(l.discount),
      taxRate:          toN(l.taxRate),
      taxAmount:        toN(l.taxAmount),
      lineTotal:        toN(l.lineTotal),
      notes:            l.notes,
      item:             mapLineItem(l.item),
    })),
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function listPurchaseOrders(organizationId: string) {
  logger.info("purchase-order.list", { organizationId })
  const rows = await db.purchaseOrder.findMany({
    where: { organizationId, deletedAt: null },
    include: standardInclude,
    orderBy: { createdAt: "desc" },
  })
  return rows.map(transformPO)
}

export async function getPurchaseOrderById(id: string, organizationId: string) {
  logger.info("purchase-order.get", { id })
  const po = await db.purchaseOrder.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: standardInclude,
  })
  if (!po) throw new NotFoundError("Purchase order not found")
  return transformPO(po)
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  logger.info("purchase-order.create", { orgId: input.organizationId, supplierId: input.supplierId })

  assertDateRange(input.date, input.expectedDeliveryDate)
  assertUniqueItems(input.orderLines)

  const [supplier, location, items] = await Promise.all([
    db.supplier.findFirst({ where: { id: input.supplierId, organizationId: input.organizationId } }),
    db.location.findFirst({ where: { id: input.locationId, organizationId: input.organizationId } }),
    db.item.findMany({ where: { id: { in: input.orderLines.map(l => l.itemId) }, organizationId: input.organizationId }, select: { id: true } }),
  ])
  if (!supplier) throw new NotFoundError("Supplier not found or does not belong to this organisation")
  if (!location) throw new NotFoundError("Delivery location not found or does not belong to this organisation")
  if (items.length !== input.orderLines.length) throw new NotFoundError("One or more items not found in this organisation")

  const orderNumber = await nextPONumber(input.organizationId)
  const totals      = calcOrderTotals(input.orderLines, input.shippingCost)

  const po = await db.$transaction(async (tx) =>
    tx.purchaseOrder.create({
      data: {
        orderNumber,
        organizationId:      input.organizationId,
        supplierId:          input.supplierId,
        locationId:          input.locationId,
        createdById:         input.createdById,
        orderDate:           new Date(input.date),
        expectedDeliveryDate: new Date(input.expectedDeliveryDate),
        paymentTerms:        input.paymentTerms ?? "Net 30 days",
        notes:               input.notes ?? "",
        status:              "DRAFT",
        subtotal:            totals.subtotal,
        taxAmount:           totals.taxAmount,
        shippingCost:        input.shippingCost ?? 0,
        discount:            totals.discount,
        total:               totals.total,
        lines: {
          create: input.orderLines.map(l => {
            const { taxAmount, lineTotal } = calcLine(l.quantity, l.unitPrice, l.taxRate, l.discount)
            return {
              itemId:           l.itemId,
              orderedQuantity:  l.quantity,
              unitCost:         l.unitPrice,
              discount:         l.discount ?? 0,
              taxRate:          l.taxRate ?? 0,
              taxAmount,
              lineTotal,
              notes:            l.notes ?? "",
              receivedQuantity: 0,
            }
          }),
        },
      },
      include: standardInclude,
    })
  )

  return transformPO(po)
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updatePurchaseOrder(input: UpdatePurchaseOrderInput) {
  logger.info("purchase-order.update", { id: input.id })

  const existing = await db.purchaseOrder.findFirst({
    where: { id: input.id, organizationId: input.organizationId },
    include: standardInclude,
  })
  if (!existing) throw new NotFoundError("Purchase order not found")
  if (NON_EDITABLE_STATUSES.includes(existing.status)) {
    throw new BusinessRuleError(`Cannot edit a purchase order with status: ${existing.status}`)
  }

  const orderDate  = existing.orderDate.toISOString().slice(0, 10)
  const delivDate  = existing.expectedDeliveryDate?.toISOString().slice(0, 10) ?? orderDate
  assertDateRange(input.date ?? orderDate, input.expectedDeliveryDate ?? delivDate)

  if (input.supplierId) {
    const s = await db.supplier.findFirst({ where: { id: input.supplierId, organizationId: input.organizationId } })
    if (!s) throw new NotFoundError("Supplier not found or does not belong to this organisation")
  }
  if (input.locationId) {
    const l = await db.location.findFirst({ where: { id: input.locationId, organizationId: input.organizationId } })
    if (!l) throw new NotFoundError("Location not found or does not belong to this organisation")
  }

  let totals = {
    subtotal:  toN(existing.subtotal),
    taxAmount: toN(existing.taxAmount),
    discount:  toN(existing.discount),
    total:     toN(existing.total),
  }
  if (input.orderLines) {
    if (input.orderLines.length > 0) {
      assertUniqueItems(input.orderLines)
      const items = await db.item.findMany({
        where: { id: { in: input.orderLines.map(l => l.itemId) }, organizationId: input.organizationId },
        select: { id: true },
      })
      if (items.length !== input.orderLines.length) throw new NotFoundError("One or more items not found in this organisation")
      totals = calcOrderTotals(input.orderLines, toN(input.shippingCost ?? existing.shippingCost))
    } else {
      totals = { subtotal: 0, taxAmount: 0, discount: 0, total: input.shippingCost ?? 0 }
    }
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.purchaseOrder.update({
      where: { id: input.id },
      data: {
        orderDate:            input.date ? new Date(input.date) : undefined,
        supplierId:           input.supplierId,
        locationId:           input.locationId,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
        paymentTerms:         input.paymentTerms,
        notes:                input.notes,
        shippingCost:         input.shippingCost ?? existing.shippingCost,
        subtotal:             totals.subtotal,
        taxAmount:            totals.taxAmount,
        discount:             totals.discount,
        total:                totals.total,
      },
    })

    if (input.orderLines) {
      await reconcileDraftPurchaseOrderLines(tx, {
        purchaseOrderId: input.id,
        organizationId:  input.organizationId,
        status:          existing.status,
        actorId:         input.updatedById,
        lines:           input.orderLines,
      })
    }

    return tx.purchaseOrder.findUnique({ where: { id: input.id }, include: standardInclude })
  })

  return transformPO(updated!)
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deletePurchaseOrder(id: string, organizationId: string, deletedById: string) {
  logger.info("purchase-order.delete", { id })
  const po = await db.purchaseOrder.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { id: true, status: true, orderNumber: true, createdById: true, approvedById: true },
  })
  if (!po) throw new NotFoundError("Purchase order not found")
  if (NON_DELETABLE_STATUSES.includes(po.status)) {
    throw new BusinessRuleError(`Cannot delete a purchase order with status: ${po.status}`)
  }
  if (!deletedById || deletedById === "system-user") {
    throw new BusinessRuleError("A real actor identity is required to archive a purchase order.")
  }

  const archivedAt = new Date()
  await db.$transaction(async (tx) => {
    await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: "CANCELLED",
        deletedAt: archivedAt,
        updatedAt: archivedAt,
      },
    })
    await tx.auditLog.create({
      data: {
        organizationId,
        userId: deletedById,
        entityType: "PurchaseOrder",
        entityId: id,
        action: "ARCHIVE_PURCHASE_ORDER",
        changes: {
          before: {
            orderNumber: po.orderNumber,
            status: po.status,
            createdById: po.createdById,
            approvedById: po.approvedById,
          },
          after: {
            status: "CANCELLED",
            deletedAt: archivedAt.toISOString(),
          },
        },
      },
    })
    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId,
      eventType: "purchase_order.archived",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: `purchase-order:archive:${organizationId}:${id}`,
      payload: {
        purchaseOrderId: id,
        orderNumber: po.orderNumber,
        fromStatus: po.status,
        toStatus: "CANCELLED",
        archivedAt: archivedAt.toISOString(),
        archivedById: deletedById,
      },
      occurredAt: archivedAt,
      actorId: deletedById,
      sourceType: "PURCHASE_ORDER",
      sourceId: id,
      metadata: {
        gate: "priority-006-hard-delete-immutability",
        classification: "SOFT_DELETE_ARCHIVE",
      },
    })
    await markBusinessEventAppliedInTx(tx, organizationId, eventResult.event.id)
  })
  return po.orderNumber
}

// ── Workflow transitions ──────────────────────────────────────────────────────

async function transition(
  id: string,
  organizationId: string,
  toStatus: PurchaseOrderStatus,
  extra?: Partial<Parameters<typeof db.purchaseOrder.update>[0]["data"]>,
) {
  const po = await db.purchaseOrder.findFirst({ where: { id, organizationId, deletedAt: null }, include: standardInclude })
  if (!po) throw new NotFoundError("Purchase order not found")
  if (!canTransition(po.status, toStatus)) {
    throw new BusinessRuleError(`Cannot transition purchase order from ${po.status} to ${toStatus}`)
  }
  const updated = await db.purchaseOrder.update({
    where: { id },
    data: { status: toStatus, updatedAt: new Date(), ...extra },
    include: standardInclude,
  })
  return transformPO(updated)
}

export async function submitPurchaseOrder(id: string, organizationId: string) {
  logger.info("purchase-order.submit", { id })
  const po = await db.purchaseOrder.findFirst({ where: { id, organizationId, deletedAt: null }, select: { lines: true, status: true } })
  if (!po) throw new NotFoundError("Purchase order not found")
  if (!po.lines || po.lines.length === 0) throw new BusinessRuleError("Cannot submit a purchase order without line items")
  return transition(id, organizationId, "SUBMITTED")
}

export async function approvePurchaseOrder(id: string, organizationId: string, approvedById: string) {
  logger.info("purchase-order.approve", { id, approvedById })
  if (!approvedById || approvedById === "system-user") {
    throw new BusinessRuleError("A real approver identity is required.")
  }

  const po = await db.purchaseOrder.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: standardInclude,
  })
  if (!po) throw new NotFoundError("Purchase order not found")
  if (!canTransition(po.status, "APPROVED")) {
    throw new BusinessRuleError(`Cannot transition purchase order from ${po.status} to APPROVED`)
  }
  if (po.createdById && po.createdById === approvedById) {
    throw new BusinessRuleError("A purchase order must be approved by a different user than the requester.")
  }

  const approvedAt = new Date()
  const updated = await db.$transaction(async (tx) => {
    const approved = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "APPROVED", approvedById, approvedAt, updatedAt: approvedAt },
      include: standardInclude,
    })
    await tx.auditLog.create({
      data: {
        organizationId,
        userId: approvedById,
        entityType: "PurchaseOrder",
        entityId: id,
        action: "APPROVE_PURCHASE_ORDER",
        changes: {
          before: {
            status: po.status,
            createdById: po.createdById,
          },
          after: {
            status: "APPROVED",
            approvedById,
            approvedAt: approvedAt.toISOString(),
          },
        },
      },
    })
    return approved
  })

  return transformPO(updated)
}

export async function cancelPurchaseOrder(id: string, organizationId: string, reason?: string) {
  logger.info("purchase-order.cancel", { id })
  const po = await db.purchaseOrder.findFirst({ where: { id, organizationId, deletedAt: null }, select: { notes: true, status: true, orderNumber: true } })
  if (!po) throw new NotFoundError("Purchase order not found")
  if (!canTransition(po.status, "CANCELLED")) {
    throw new BusinessRuleError(`Cannot cancel a purchase order with status: ${po.status}`)
  }
  const updated = await db.purchaseOrder.update({
    where: { id },
    data: {
      status: "CANCELLED",
      notes:  reason ? `${po.notes ?? ""}\n\nCancellation reason: ${reason}`.trim() : po.notes,
      updatedAt: new Date(),
    },
    include: standardInclude,
  })
  return transformPO(updated)
}

export async function closePurchaseOrder(id: string, organizationId: string) {
  logger.info("purchase-order.close", { id })
  return transition(id, organizationId, "COMPLETED")
}

// ── Receive items (goods receipt + inventory update) ──────────────────────────

export async function receiveItems(input: ReceiveItemsInput) {
  logger.info("purchase-order.receive", { id: input.purchaseOrderId, orgId: input.organizationId })

  const po = await db.purchaseOrder.findFirst({
    where: { id: input.purchaseOrderId, organizationId: input.organizationId, deletedAt: null },
    include: { ...standardInclude, lines: { include: { item: true } } },
  })
  if (!po) throw new NotFoundError("Purchase order not found")
  if (!RECEIVABLE_STATUSES.includes(po.status)) {
    throw new BusinessRuleError(`Cannot receive items for a purchase order with status: ${po.status}`)
  }

  const receiptNumber = await nextGRNumber(input.organizationId)
  const lineMap = new Map(po.lines.map(l => [l.id, l]))
  const items = input.items.map((item) => {
    const line = lineMap.get(item.lineId)
    if (!line) throw new NotFoundError(`Line ${item.lineId} not found on this purchase order`)

    const sku = line.item.sku || line.item.nameEn || line.itemId
    const normalizedItem = {
      ...item,
      batchNumber: item.batchNumber?.trim() || undefined,
    }
    const itemWithBatch = line.item.trackBatches && !normalizedItem.batchNumber
      ? {
          ...normalizedItem,
          batchNumber: generateReceiptBatchNumber({
            receiptNumber,
            sku,
            lineId: line.id,
          }),
        }
      : normalizedItem

    if (!line.item.trackSerialNumbers) return itemWithBatch

    return {
      ...itemWithBatch,
      serialNumbers: generateReceiptSerials({
        receiptNumber,
        sku,
        lineId: line.id,
        receivedQuantity: item.receivedQuantity,
        provided: item.serialNumbers,
      }),
    }
  })

  for (const [i, item] of items.entries()) {
    const line = lineMap.get(item.lineId)
    if (!line) throw new NotFoundError(`Line ${item.lineId} not found on this purchase order`)

    const itemName = line.item.nameEn || line.item.sku
    const remaining = toN(line.orderedQuantity) - toN(line.receivedQuantity)
    if (item.receivedQuantity > remaining) {
      throw new BusinessRuleError(`Cannot receive ${item.receivedQuantity} of "${itemName}". Only ${remaining} remaining.`)
    }
    if (item.serialNumbers && new Set(item.serialNumbers).size !== item.serialNumbers.length) {
      throw new ConflictError(`Duplicate serial numbers found for item ${i + 1}`)
    }
    if (line.item.trackSerialNumbers) {
      if (!item.serialNumbers || item.serialNumbers.length !== item.receivedQuantity) {
        throw new BusinessRuleError(`Serial numbers required and must match received quantity for "${itemName}"`)
      }
    }
    if (line.item.trackBatches && !item.batchNumber) {
      throw new BusinessRuleError(`Batch number required for "${itemName}"`)
    }
    if (line.item.trackExpiry) {
      if (!item.expiryDate || isNaN(new Date(item.expiryDate).getTime())) {
        throw new BusinessRuleError(`Valid expiry date required for "${itemName}"`)
      }
    }
  }

  const requestedSerials = items.flatMap((item) => item.serialNumbers ?? [])
  if (requestedSerials.length) {
    if (new Set(requestedSerials).size !== requestedSerials.length) {
      throw new ConflictError("Duplicate serial numbers found in this receipt")
    }
    const existingSerials = await db.serialNumber.findMany({
      where: {
        organizationId: input.organizationId,
        serialNumber: { in: requestedSerials },
      },
      select: { serialNumber: true },
    })
    if (existingSerials.length) {
      throw new ConflictError(`Serial number already exists: ${existingSerials.map((serial) => serial.serialNumber).join(", ")}`)
    }
  }

  const effectiveLocationId = input.locationId ?? po.locationId

  const result = await db.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.create({
      data: {
        receiptNumber,
        receiptDate:     new Date(),
        purchaseOrderId: input.purchaseOrderId,
        locationId:      effectiveLocationId,
        organizationId:  input.organizationId,
        receivedById:    input.receivedById,
        status:          "RECEIVED" as GoodsReceiptStatus,
        notes:           input.notes ?? "",
      },
    })

    for (const item of items) {
      const line = lineMap.get(item.lineId)!
      const unitCost = item.unitPrice ?? toN(line.unitCost)

      const receiptLine = await tx.goodsReceiptLine.create({
        data: {
          goodsReceiptId:      receipt.id,
          purchaseOrderLineId: line.id,
          itemId:              line.itemId,
          receivedQuantity:    item.receivedQuantity,
          unitCost,
          lineTotal:           unitCost * item.receivedQuantity,
          notes:               item.notes ?? "",
          batchNumber:         item.batchNumber ?? null,
          expiryDate:          item.expiryDate ? new Date(item.expiryDate) : null,
        },
      })

      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { receivedQuantity: toN(line.receivedQuantity) + item.receivedQuantity },
      })

      await applyInventoryReceipt(tx, {
        itemId: line.itemId,
        locationId: effectiveLocationId,
        qty: item.receivedQuantity,
        unitCost,
        organizationId: input.organizationId,
        receiptId: receipt.id,
        receiptNumber,
        receiptLineId: receiptLine.id,
        receivedById: input.receivedById,
        batchNumber: item.batchNumber ?? null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        serialNumbers: item.serialNumbers ?? [],
      })
    }

    const allLines    = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: input.purchaseOrderId } })
    const totalOrdered  = allLines.reduce((s, l) => s + toN(l.orderedQuantity), 0)
    const totalReceived = allLines.reduce((s, l) => s + toN(l.receivedQuantity), 0)

    const newStatus: PurchaseOrderStatus = totalReceived >= totalOrdered ? "RECEIVED" : "PARTIALLY_RECEIVED"
    if (newStatus !== po.status) {
      await tx.purchaseOrder.update({ where: { id: input.purchaseOrderId }, data: { status: newStatus } })
    }

    return tx.purchaseOrder.findUnique({ where: { id: input.purchaseOrderId }, include: standardInclude })
  })

  return { purchaseOrder: transformPO(result!), receiptNumber }
}

// ── Bulk status update ────────────────────────────────────────────────────────

export async function bulkUpdateStatus(input: BulkStatusUpdateInput) {
  logger.info("purchase-order.bulk-update", { orgId: input.organizationId, count: input.purchaseOrderIds.length })

  const updated: string[] = []
  const failed: { id: string; error: string }[] = []

  await db.$transaction(async (tx) => {
    const pos = await tx.purchaseOrder.findMany({
      where: { id: { in: input.purchaseOrderIds }, organizationId: input.organizationId, deletedAt: null },
      select: { id: true, status: true },
    })
    const found = new Set(pos.map(p => p.id))
    for (const id of input.purchaseOrderIds) {
      if (!found.has(id)) failed.push({ id, error: "Not found in this organisation" })
    }
    for (const po of pos) {
      if (!canTransition(po.status, input.toStatus)) {
        failed.push({ id: po.id, error: `Invalid transition: ${po.status} → ${input.toStatus}` })
        continue
      }
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status:     input.toStatus,
          updatedAt:  new Date(),
          approvedAt: input.toStatus === "APPROVED" ? new Date() : undefined,
          notes:      input.reason ? { set: input.reason } : undefined,
        },
      })
      updated.push(po.id)
    }
  })

  return { updated, failed }
}

// ── Clone ─────────────────────────────────────────────────────────────────────

export async function clonePurchaseOrder(input: ClonePurchaseOrderInput, createdById: string) {
  logger.info("purchase-order.clone", { source: input.id })

  const source = await db.purchaseOrder.findFirst({
    where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
    include: { lines: true },
  })
  if (!source) throw new NotFoundError("Purchase order not found")

  const overrides = input.overrides ?? {}
  const orderNumber = await nextPONumber(input.organizationId)

  const cloned = await db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        orderNumber,
        organizationId:      input.organizationId,
        supplierId:          overrides.supplierId ?? source.supplierId,
        locationId:          overrides.locationId ?? source.locationId,
        orderDate:           overrides.date ? new Date(overrides.date) : new Date(),
        expectedDeliveryDate: overrides.expectedDeliveryDate ? new Date(overrides.expectedDeliveryDate) : source.expectedDeliveryDate,
        paymentTerms:        overrides.paymentTerms ?? source.paymentTerms ?? "Net 30 days",
        notes:               overrides.notes ?? `Cloned from ${source.orderNumber}`,
        shippingCost:        overrides.shippingCost ?? source.shippingCost ?? 0,
        status:              "DRAFT",
        createdById,
        subtotal: 0, taxAmount: 0, discount: 0, total: 0,
      },
    })

    if (source.lines.length > 0) {
      await tx.purchaseOrderLine.createMany({
        data: source.lines.map(l => ({
          purchaseOrderId:  po.id,
          itemId:           l.itemId,
          orderedQuantity:  l.orderedQuantity,
          unitCost:         l.unitCost,
          discount:         l.discount ?? 0,
          taxRate:          l.taxRate ?? 0,
          taxAmount:        l.taxAmount ?? 0,
          lineTotal:        l.lineTotal,
          notes:            l.notes ?? "",
          receivedQuantity: 0,
        })),
      })

      const newLines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: po.id } })
      const sub  = newLines.reduce((s, l) => s + toN(l.unitCost) * toN(l.orderedQuantity), 0)
      const tax  = newLines.reduce((s, l) => s + toN(l.taxAmount), 0)
      const disc = newLines.reduce((s, l) => s + toN(l.discount), 0)
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { subtotal: sub, taxAmount: tax, discount: disc, total: sub + tax + toN(po.shippingCost) - disc },
      })
    }

    return tx.purchaseOrder.findUnique({ where: { id: po.id }, include: standardInclude })
  })

  return transformPO(cloned!)
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getGoodsReceipts(purchaseOrderId: string, organizationId: string) {
  return db.goodsReceipt.findMany({
    where: { purchaseOrderId, organizationId, deletedAt: null },
    include: {
      lines: { include: { item: { select: { id: true, nameEn: true, nameFr: true, sku: true } } } },
      receivedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      location:   { select: { id: true, name: true, address: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getSummary(organizationId: string) {
  const [total, byStatus, valueAgg, overdue] = await Promise.all([
    db.purchaseOrder.count({ where: { organizationId, deletedAt: null } }),
    db.purchaseOrder.groupBy({ by: ["status"], where: { organizationId, deletedAt: null }, _count: { _all: true } }),
    db.purchaseOrder.aggregate({ where: { organizationId, deletedAt: null }, _sum: { total: true } }),
    db.purchaseOrder.count({
      where: {
        organizationId,
        deletedAt: null,
        expectedDeliveryDate: { lt: new Date() },
        status: { notIn: ["RECEIVED", "COMPLETED", "CANCELLED"] },
      },
    }),
  ])

  const statusBreakdown = Object.fromEntries(byStatus.map(r => [r.status.toLowerCase(), r._count._all]))

  return {
    totalOrders: total,
    statusBreakdown: {
      draft:              statusBreakdown["draft"] ?? 0,
      submitted:          statusBreakdown["submitted"] ?? 0,
      approved:           statusBreakdown["approved"] ?? 0,
      partiallyReceived:  statusBreakdown["partially_received"] ?? 0,
      received:           statusBreakdown["received"] ?? 0,
      completed:          statusBreakdown["completed"] ?? 0,
      cancelled:          statusBreakdown["cancelled"] ?? 0,
    },
    totalValue:   toN(valueAgg._sum.total),
    overdueOrders: overdue,
  }
}

export async function getRequiringAttention(organizationId: string, limit = 10) {
  const now = new Date()
  const [overdue, pendingApproval, pendingReceipt] = await Promise.all([
    db.purchaseOrder.findMany({
      where: { organizationId, deletedAt: null, expectedDeliveryDate: { lt: now }, status: { notIn: ["RECEIVED", "COMPLETED", "CANCELLED"] } },
      include: standardInclude,
      orderBy: { expectedDeliveryDate: "asc" },
      take: limit,
    }),
    db.purchaseOrder.findMany({
      where: { organizationId, deletedAt: null, status: { in: ["DRAFT", "SUBMITTED"] } },
      include: standardInclude,
      orderBy: { updatedAt: "asc" },
      take: limit,
    }),
    db.purchaseOrder.findMany({
      where: { organizationId, deletedAt: null, status: { in: ["APPROVED", "PARTIALLY_RECEIVED"] } },
      include: standardInclude,
      orderBy: { updatedAt: "asc" },
      take: limit,
    }),
  ])

  const filtered = pendingReceipt.filter(po =>
    po.lines.some(l => toN(l.receivedQuantity) < toN(l.orderedQuantity))
  )

  return {
    overdue:       overdue.map(transformPO),
    pendingApproval: pendingApproval.map(transformPO),
    pendingReceipt: filtered.map(transformPO),
    counts: { overdue: overdue.length, pendingApproval: pendingApproval.length, pendingReceipt: filtered.length },
  }
}

export async function getAnalytics(input: POAnalyticsInput) {
  const where: Prisma.PurchaseOrderWhereInput = { organizationId: input.organizationId, deletedAt: null }
  if (input.from || input.to) {
    where.orderDate = {}
    if (input.from) (where.orderDate as Prisma.DateTimeFilter).gte = new Date(input.from)
    if (input.to)   (where.orderDate as Prisma.DateTimeFilter).lte = new Date(input.to)
  }

  const [orders, topAgg] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      select: { orderDate: true, total: true, status: true, createdAt: true, approvedAt: true },
      orderBy: { orderDate: "asc" },
    }),
    db.purchaseOrder.groupBy({
      by: ["supplierId"],
      where: { organizationId: input.organizationId, deletedAt: null },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: input.topSuppliersLimit ?? 5,
    }),
  ])

  const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
  const monthly: Record<string, { total: number; count: number }> = {}
  for (const o of orders) {
    const k = monthKey(o.orderDate ?? o.createdAt)
    monthly[k] ??= { total: 0, count: 0 }
    monthly[k].total += toN(o.total)
    monthly[k].count += 1
  }

  const approvalMs = orders.filter(o => o.approvedAt).map(o => o.approvedAt!.getTime() - o.createdAt.getTime())
  const avgApprovalMs = approvalMs.length ? Math.round(approvalMs.reduce((a, b) => a + b, 0) / approvalMs.length) : 0

  const supplierIds = topAgg.map(x => x.supplierId).filter(Boolean) as string[]
  const suppliers   = supplierIds.length
    ? await db.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true, code: true } })
    : []

  const topSuppliers = topAgg.map(x => ({
    supplierId: x.supplierId,
    name:   suppliers.find(s => s.id === x.supplierId)?.name ?? "Unknown",
    code:   suppliers.find(s => s.id === x.supplierId)?.code ?? "",
    total:  toN(x._sum.total),
    orders: x._count._all,
  }))

  return { monthly, avgApprovalMs, topSuppliers }
}

export async function getStatusHistory(id: string, organizationId: string) {
  const po = await db.purchaseOrder.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { id: true, status: true, createdAt: true, approvedAt: true, updatedAt: true },
  })
  if (!po) throw new NotFoundError("Purchase order not found")

  const receipts = await db.goodsReceipt.findMany({
    where: { purchaseOrderId: id, organizationId },
    select: { createdAt: true, status: true, receiptNumber: true },
    orderBy: { createdAt: "asc" },
  })

  const history: Array<{ status: string; at: Date; meta?: Record<string, unknown> }> = [
    { status: "DRAFT", at: po.createdAt },
  ]
  if (po.approvedAt) history.push({ status: "APPROVED", at: po.approvedAt })
  for (const gr of receipts) history.push({ status: gr.status, at: gr.createdAt, meta: { receiptNumber: gr.receiptNumber } })
  if (po.status === "RECEIVED")  history.push({ status: "RECEIVED",  at: po.updatedAt })
  if (po.status === "COMPLETED") history.push({ status: "COMPLETED", at: po.updatedAt })
  if (po.status === "CANCELLED") history.push({ status: "CANCELLED", at: po.updatedAt })
  history.sort((a, b) => a.at.getTime() - b.at.getTime())

  return { id, status: po.status, history }
}

export async function exportToCSV(organizationId: string) {
  const rows = await listPurchaseOrders(organizationId)
  const escape = (v: unknown) => {
    const s = String(v ?? "")
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
  }
  const headers = ["Order Number","Status","Order Date","Expected Delivery","Supplier","Supplier Email","Location","Subtotal","Tax","Shipping","Discount","Total"]
  const csv = [
    headers.map(escape).join(","),
    ...rows.map(po => [
      po.orderNumber, po.status,
      new Date(po.orderDate).toISOString().slice(0, 10),
      po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().slice(0, 10) : "",
      po.supplier?.name ?? "", po.supplier?.email ?? "",
      po.location?.name ?? "",
      po.subtotal, po.taxAmount, po.shippingCost, po.discount, po.total,
    ].map(escape).join(",")),
  ].join("\n")
  return { filename: `purchase-orders-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`, mimeType: "text/csv" as const, csv }
}

export async function getPurchaseOrderFormOptions(organizationId: string) {
  const [suppliers, locations, items] = await Promise.all([
    db.supplier.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true },
    }),
    db.location.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, address: true, type: true },
    }),
    db.item.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: { nameEn: "asc" },
      take: 500,
      select: {
        id: true,
        nameEn: true,
        nameFr: true,
        sku: true,
        descriptionEn: true,
        descriptionFr: true,
        costPrice: true,
        thumbnail: true,
      },
    }),
  ])

  return {
    suppliers: suppliers.map((supplier) => ({
      ...supplier,
      email: supplier.email ?? undefined,
      phone: supplier.phone ?? undefined,
    })),
    locations: locations.map((location) => ({
      ...location,
      address: location.address ?? undefined,
      type: location.type ?? undefined,
    })),
    items: items.map((item) => ({
      id: item.id,
      name: item.nameEn || item.nameFr || item.sku,
      sku: item.sku,
      description: item.descriptionEn || item.descriptionFr || undefined,
      thumbnail: item.thumbnail ?? undefined,
      costPrice: toN(item.costPrice),
    })),
  }
}

export async function searchLocations(organizationId: string, q: string, limit = 10) {
  return db.location.findMany({
    where: {
      organizationId,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { address: { contains: q, mode: "insensitive" } }] } : {}),
    },
    take: limit,
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true },
  })
}
