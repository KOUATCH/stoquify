import "server-only"
import { purchaseLifecycleAuthority, purchaseLifecycleEventKey, purchaseLifecycleScopeSchema, replayPurchaseLifecycle, type PurchaseLifecycleScope } from "./purchase-order-lifecycle"
import { purchaseLifecycleEventType, purchaseLifecycleKindSchema, purchaseLifecycleRequestSchema, type PurchaseLifecycleKind, type PurchaseLifecyclePreview, type PurchaseLifecycleRequest } from "./purchase-order-lifecycle-contracts"
import { assertPurchaseApprovalOrder, purchaseApprovalAuthority, purchaseApprovalCommandSchema, purchaseApprovalEventKey, purchaseApprovalRevision, purchaseApprovalScopeSchema, purchaseApprovalSnapshot, replayPurchaseApproval, type PurchaseApprovalScope } from "./purchase-order-approval"
import type { PurchaseApprovalRequest, PurchaseApprovalPreview } from "./purchase-order-approval-contracts"
import { assertModuleNewWorkInTx } from "@/services/modules/module-admission.service"

import { logger } from "@/lib/logger"
import { CreatePurchaseOrderSchema, ReceiveItemsSchema, ResolveGoodsReceiptInspectionSchema, UpdatePurchaseOrderSchema } from "./purchase-order.schemas"
import { purchaseReceivingAuthority, purchaseReceivingScopeSchema, type PurchaseReceivingScope } from "./purchase-receiving-authority"
import { purchaseQuantitySchema } from "./purchase-quantity"
import { assertPurchaseOrderEditAuthority, purchaseOrderEditEventKey, purchaseOrderEditRevision, purchaseOrderEditSnapshot, replayPurchaseOrderEdit, type PurchaseOrderEditScope } from "./purchase-order-edit-record"
import { db } from "@/prisma/db"
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  getPrismaKnownRequest,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { postGoodsReceiptStock } from "@/services/inventory/inventory-stock-event.service"
import { createReceiptRecognitionSourceInTx, type ReceiptRecognitionSource } from "./receipt-recognition-source"
import { postReceiptRecognitionInTx } from "./receipt-recognition.service"
import { Prisma, type GoodsReceiptStatus, type PurchaseOrderStatus } from "@prisma/client"
import type { Decimal } from "@prisma/client/runtime/library"
import type {
  BulkStatusUpdateInput,
  ClonePurchaseOrderInput,
  CreatePurchaseOrderInput,
  OrderLineInput,
  POAnalyticsInput,
  ReceiveItemsInput,
  ResolveGoodsReceiptInspectionInput,
  UpdatePurchaseOrderInput,
} from "./purchase-order.schemas"
import type {
  PurchaseOrderAnalyticsData,
  PurchaseOrderAnalyticsException,
  PurchaseOrderAnalyticsStatus,
} from "@/types/purchase-order-analytics"
import {
  allocatePurchaseDocumentNumber,
  PURCHASE_DOCUMENT_TYPE,
} from "./purchase-document-number.service"

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

const RECEIVABLE_STATUSES: PurchaseOrderStatus[] = ["APPROVED", "PARTIALLY_RECEIVED"]
const LINE_RECONCILIATION_STATUSES = new Set<PurchaseOrderStatus>(["DRAFT", "SUBMITTED"])

export function canArchivePurchaseOrderStatus(status: PurchaseOrderStatus) {
  return ["DRAFT", "CANCELLED"].includes(status)
}

export function canReceivePurchaseOrderStatus(status: PurchaseOrderStatus) {
  return RECEIVABLE_STATUSES.includes(status)
}

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
  if (!Number.isInteger(params.receivedQuantity) || params.receivedQuantity > 5000) throw new BusinessRuleError("Receive serial-tracked items in whole units, at most 5000 per receipt.")
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
    recognitionSource: ReceiptRecognitionSource
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
      occurredAt: new Date(params.recognitionSource.manifest.effectiveAt),
      documentHash: params.recognitionSource.sourceHash,
      receiptRecognitionNotRequired: params.recognitionSource.inventoryValue.eq(0),
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
    editRevision:         purchaseOrderEditRevision(po),
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
    createdById:          po.createdById,
    approvedById:         po.approvedById,
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

export async function getPurchaseOrderCurrency(organizationId: string) {
  const organization = await db.organization.findFirst({
    where: { id: organizationId },
    select: { currency: true },
  })
  const currency = organization?.currency?.trim().toUpperCase()

  if (!currency) {
    throw new BusinessRuleError("Organization currency is required to present purchase-order values.")
  }

  return currency
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
  return db.$transaction(tx => createPurchaseOrderInTx(tx, input))
}

// Internal composition boundary for durable authoring: numbering, reference
// validation and creation must share the caller's result-receipt transaction.
export async function createPurchaseOrderInTx(tx: Prisma.TransactionClient, input: CreatePurchaseOrderInput) {
  input = CreatePurchaseOrderSchema.parse(input)
  input.orderLines.forEach(line => purchaseQuantitySchema.parse(line.quantity))
  logger.info("purchase-order.create", { orgId: input.organizationId, supplierId: input.supplierId })

  assertDateRange(input.date, input.expectedDeliveryDate)
  assertUniqueItems(input.orderLines)

  await assertModuleNewWorkInTx(tx, { organizationId: input.organizationId, moduleSlug: "purchasing", operation: "purchasing.order.create" })
  await tx.$queryRaw`SELECT id FROM suppliers WHERE id = ${input.supplierId} AND "organizationId" = ${input.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT id FROM locations WHERE id = ${input.locationId} AND "organizationId" = ${input.organizationId} FOR SHARE`
  await tx.$queryRaw(Prisma.sql`SELECT id FROM items WHERE "organizationId" = ${input.organizationId} AND id IN (${Prisma.join(input.orderLines.map(line => line.itemId))}) ORDER BY id FOR SHARE`)

  const [supplier, location, items] = await Promise.all([
    tx.supplier.findFirst({ where: { id: input.supplierId, organizationId: input.organizationId, isActive: true, deletedAt: null } }),
    tx.location.findFirst({ where: { id: input.locationId, organizationId: input.organizationId, isActive: true, deletedAt: null } }),
    tx.item.findMany({ where: { id: { in: input.orderLines.map(l => l.itemId) }, organizationId: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
  ])
  if (!supplier) throw new NotFoundError("Supplier not found or does not belong to this organisation")
  if (!location) throw new NotFoundError("Delivery location not found or does not belong to this organisation")
  if (items.length !== input.orderLines.length) throw new NotFoundError("One or more items not found in this organisation")

  const totals      = calcOrderTotals(input.orderLines, input.shippingCost)

    const orderNumber = await allocatePurchaseDocumentNumber(tx, {
      organizationId: input.organizationId,
      documentType: PURCHASE_DOCUMENT_TYPE.PURCHASE_ORDER,
    })
    const po = await tx.purchaseOrder.create({
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
  return transformPO(po)
}

// ── Update ────────────────────────────────────────────────────────────────────

async function lockedPurchaseOrder(tx: Prisma.TransactionClient, id: string, organizationId: string) {
  await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${id} AND "organizationId" = ${organizationId} AND "deletedAt" IS NULL FOR UPDATE`
  const order = await tx.purchaseOrder.findFirst({ where: { id, organizationId, deletedAt: null }, include: standardInclude })
  if (!order) throw new NotFoundError("Purchase order not found")
  return order
}

export async function getPurchaseOrderDraftForActor(id: string, scope: PurchaseOrderEditScope) {
  return db.$transaction(async tx => {
    await assertPurchaseOrderEditAuthority(tx, scope)
    const order = await tx.purchaseOrder.findFirst({ where: { id, organizationId: scope.organizationId, deletedAt: null }, include: standardInclude })
    if (!order) throw new NotFoundError("Purchase order not found")
    return transformPO(order)
  }, { isolationLevel: "ReadCommitted", timeout: 15000 })
}

export async function updatePurchaseOrder(input: UpdatePurchaseOrderInput) {
  input = UpdatePurchaseOrderSchema.parse(input)
  logger.info("purchase-order.update", { id: input.id })
  const { sessionId: _sessionId, sessionToken: _sessionToken, ...command } = input
  const commandHash = hashBusinessPayload(command)
  return db.$transaction(async (tx) => {
    await assertPurchaseOrderEditAuthority(tx, input)
    const existing = await lockedPurchaseOrder(tx, input.id, input.organizationId)
    const replay = await replayPurchaseOrderEdit(tx, input, commandHash)
    if (replay) return { ...transformPO(existing), editReceipt: replay }
    if (purchaseOrderEditRevision(existing) !== input.expectedRevision) throw new ConflictError("This order changed after you opened it. Compare the current record with your draft before saving.")
    if (existing.status !== "DRAFT") throw new BusinessRuleError(`Cannot edit a purchase order with status: ${existing.status}. Only draft orders can be edited.`)

    const orderDate = existing.orderDate.toISOString().slice(0, 10)
    const delivDate = existing.expectedDeliveryDate?.toISOString().slice(0, 10) ?? orderDate
    assertDateRange(input.date ?? orderDate, input.expectedDeliveryDate ?? delivDate)
    if (input.supplierId) {
      const supplier = await tx.supplier.findFirst({ where: { id: input.supplierId, organizationId: input.organizationId } })
      if (!supplier) throw new NotFoundError("Supplier not found or does not belong to this organisation")
    }
    if (input.locationId) {
      const location = await tx.location.findFirst({ where: { id: input.locationId, organizationId: input.organizationId } })
      if (!location) throw new NotFoundError("Location not found or does not belong to this organisation")
    }
    const shippingCost = input.shippingCost ?? existing.shippingCost
    let totals: { subtotal: Prisma.Decimal | number; taxAmount: Prisma.Decimal | number; discount: Prisma.Decimal | number; total: Prisma.Decimal | number } = {
      subtotal: existing.subtotal, taxAmount: existing.taxAmount, discount: existing.discount, total: existing.total,
    }
    if (input.orderLines) {
      if (input.orderLines.length > 0) {
        assertUniqueItems(input.orderLines)
        const items = await tx.item.findMany({ where: { id: { in: input.orderLines.map(line => line.itemId) }, organizationId: input.organizationId }, select: { id: true } })
        if (items.length !== input.orderLines.length) throw new NotFoundError("One or more items not found in this organisation")
        totals = calcOrderTotals(input.orderLines, toN(shippingCost))
      } else {
        totals = { subtotal: 0, taxAmount: 0, discount: 0, total: shippingCost }
      }
    } else if (input.shippingCost !== undefined) {
      totals.total = new Prisma.Decimal(existing.subtotal).plus(existing.taxAmount).minus(existing.discount).plus(shippingCost)
    }
    await tx.purchaseOrder.update({
      where: { id: input.id, organizationId: input.organizationId, deletedAt: null, status: "DRAFT" },
      data: {
        orderDate:            input.date ? new Date(input.date) : undefined,
        supplierId:           input.supplierId,
        locationId:           input.locationId,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
        paymentTerms:         input.paymentTerms,
        notes:                input.notes,
        shippingCost,
        subtotal:             totals.subtotal,
        taxAmount:            totals.taxAmount,
        discount:             totals.discount,
        total:                totals.total,
        updatedAt:            new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1)),
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

    const updated = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: input.id, organizationId: input.organizationId }, include: standardInclude })
    await assertPurchaseOrderEditAuthority(tx, input)
    const result = { requestReference: input.idempotencyKey, orderId: updated.id, revision: purchaseOrderEditRevision(updated), savedAt: updated.updatedAt.toISOString() }
    const event = await recordBusinessEventInTx(tx, { organizationId: input.organizationId, eventType: "purchase_order.draft_updated", eventSource: "INTERNAL", schemaVersion: 1,
      idempotencyKey: purchaseOrderEditEventKey(input.idempotencyKey), sourceId: input.id, actorId: input.updatedById, occurredAt: updated.updatedAt,
      payload: { entityType: "PurchaseOrder", commandHash, expectedRevision: input.expectedRevision, result }, outboxMessages: [],
    })
    await tx.auditLog.create({ data: { organizationId: input.organizationId, userId: input.updatedById, entityType: "PurchaseOrder", entityId: input.id, action: "UPDATE_PURCHASE_ORDER_DRAFT",
      changes: JSON.parse(JSON.stringify({ before: purchaseOrderEditSnapshot(existing), after: purchaseOrderEditSnapshot(updated), requestReference: input.idempotencyKey, eventId: event.event.id })) as Prisma.InputJsonValue,
    } })
    await markBusinessEventAppliedInTx(tx, input.organizationId, event.event.id)
    return { ...transformPO(updated), editReceipt: { ...result, replayed: false } }
  }, { isolationLevel: "ReadCommitted", timeout: 15000 })
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deletePurchaseOrder(id: string, organizationId: string, deletedById: string, request?: PurchaseLifecycleRequest & PurchaseLifecycleScope) {
  if (!request || request.actorId !== deletedById || request.organizationId !== organizationId || request.kind !== "archive") throw new BusinessRuleError("Review this archive request before confirming.", "REVIEW_REQUIRED")
  return executeLifecycleContext(id, request)
}

function executeLifecycleContext(id: string, context: PurchaseLifecycleRequest & PurchaseLifecycleScope) {
  const { organizationId, actorId, sessionId, sessionToken, ...request } = context
  return executePurchaseOrderLifecycle(id, { organizationId, actorId, sessionId, sessionToken }, request)
}

const lifecycleTarget: Record<PurchaseLifecycleKind, PurchaseOrderStatus> = { submit: "SUBMITTED", cancel: "CANCELLED", complete: "COMPLETED", archive: "CANCELLED" }

async function lifecycleEvidence(tx: Prisma.TransactionClient, po: POWithRelations) {
  const record = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: po.id, organizationId: po.organizationId }, select: {
    organization: { select: { currency: true } },
    _count: { select: { goodsReceipts: true, payments: true, supplierInvoices: true, threeWayMatches: true, acknowledgementEnvelopes: true, purchaseReturns: true, supplierCreditNotes: true } },
    goodsReceipts: { orderBy: { id: "asc" }, select: { id: true, status: true, deletedAt: true, finalizedAt: true, inventoryPostedAt: true, updatedAt: true, lines: { orderBy: { id: "asc" }, select: { purchaseOrderLineId: true, receivedQuantity: true } } } },
  } })
  return { currency: record.organization.currency, labels: { supplier: po.supplier.name, location: po.location.name, lines: po.lines.map(line => ({ id: line.id, nameEn: line.item.nameEn, nameFr: line.item.nameFr ?? line.item.nameEn })).sort((a, b) => a.id.localeCompare(b.id)) }, counts: record._count, receipts: record.goodsReceipts.map(receipt => ({ ...receipt, lines: receipt.lines.map(line => ({ ...line, receivedQuantity: line.receivedQuantity.toString() })), deletedAt: receipt.deletedAt?.toISOString() ?? null, finalizedAt: receipt.finalizedAt?.toISOString() ?? null, inventoryPostedAt: receipt.inventoryPostedAt?.toISOString() ?? null, updatedAt: receipt.updatedAt.toISOString() })) }
}
type LifecycleEvidence = Awaited<ReturnType<typeof lifecycleEvidence>>
const lifecycleRevision = (po: POWithRelations, evidence: LifecycleEvidence) => hashBusinessPayload({ version: 1, order: purchaseApprovalSnapshot(po), evidence })
async function assertLifecycleReady(tx: Prisma.TransactionClient, po: POWithRelations, kind: PurchaseLifecycleKind, evidence: LifecycleEvidence) {
  if (kind === "archive") {
    if (!canArchivePurchaseOrderStatus(po.status)) throw new BusinessRuleError("Cancel a submitted or approved order explicitly before reviewing archive.", "ARCHIVE_STATUS")
    if (Object.values(evidence.counts).some(count => count > 0) || po.lines.some(line => new Prisma.Decimal(line.receivedQuantity).gt(0))) throw new BusinessRuleError("Keep this order available: linked receiving, supplier or financial records require retained access.", "RETAINED_OBLIGATIONS")
  } else {
    await assertPurchaseOrderTransition(tx, po, po.organizationId, lifecycleTarget[kind])
    if ((kind === "cancel" || kind === "complete") && evidence.receipts.some(receipt => !receipt.deletedAt && ["DRAFT", "HELD"].includes(receipt.status))) throw new BusinessRuleError("Resolve draft or held goods receipts before changing the order lifecycle.", "OPEN_RECEIPT")
    if (kind === "complete") {
      const finalized = evidence.receipts.filter(receipt => !receipt.deletedAt && receipt.finalizedAt && receipt.inventoryPostedAt && ["RECEIVED", "COMPLETED"].includes(receipt.status))
      if (po.lines.some(line => finalized.flatMap(receipt => receipt.lines).filter(receiptLine => receiptLine.purchaseOrderLineId === line.id).reduce((sum, receiptLine) => sum.plus(receiptLine.receivedQuantity), new Prisma.Decimal(0)).lt(line.orderedQuantity))) throw new BusinessRuleError("Completion requires finalized receiving evidence for every ordered quantity.", "RECEIPT_EVIDENCE_REQUIRED")
    }
    if (kind === "submit") {
      await assertModuleNewWorkInTx(tx, { organizationId: po.organizationId, moduleSlug: "purchasing", operation: "purchasing.order.submit" })
      const [supplier, location, items] = await Promise.all([
        tx.supplier.findFirst({ where: { id: po.supplierId, organizationId: po.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
        tx.location.findFirst({ where: { id: po.locationId, organizationId: po.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
        tx.item.findMany({ where: { id: { in: po.lines.map(line => line.itemId) }, organizationId: po.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
      ])
      if (!supplier || !location || new Set(items.map(item => item.id)).size !== new Set(po.lines.map(line => line.itemId)).size) throw new BusinessRuleError("Review the supplier, location and items: one or more are no longer available.", "REFERENCE_UNAVAILABLE")
    }
  }
}

export async function getPurchaseOrderLifecyclePreview(id: string, scopeInput: PurchaseLifecycleScope, kindInput: PurchaseLifecycleKind): Promise<PurchaseLifecyclePreview> {
  const scope = purchaseLifecycleScopeSchema.parse(scopeInput), kind = purchaseLifecycleKindSchema.parse(kindInput)
  return db.$transaction(async tx => {
    const authority = await purchaseLifecycleAuthority(tx, scope, kind)
    const po = await lockedPurchaseOrder(tx, id, scope.organizationId), evidence = await lifecycleEvidence(tx, po)
    await assertLifecycleReady(tx, po, kind, evidence)
    return { organizationId: scope.organizationId, actorId: scope.actorId, orderId: id, orderNumber: po.orderNumber, kind, revision: lifecycleRevision(po, evidence), status: po.status,
      supplier: po.supplier.name, location: po.location.name, currency: evidence.currency, total: po.total.toString(), notes: po.notes, requiresFreshAuth: authority.requiresFreshAuth,
      linkedRecords: Object.values(evidence.counts).reduce((sum, count) => sum + count, 0), heldReceipts: evidence.receipts.filter(receipt => !receipt.deletedAt && receipt.status === "HELD").length,
      lines: po.lines.map(line => ({ id: line.id, nameEn: line.item.nameEn, nameFr: line.item.nameFr ?? line.item.nameEn, ordered: line.orderedQuantity.toString(), received: line.receivedQuantity.toString(), total: line.lineTotal.toString() })) }
  }, { isolationLevel: "ReadCommitted", timeout: 15000 })
}

export async function executePurchaseOrderLifecycle(id: string, scopeInput: PurchaseLifecycleScope, requestInput: PurchaseLifecycleRequest) {
  const scope = purchaseLifecycleScopeSchema.parse(scopeInput), request = purchaseLifecycleRequestSchema.parse(requestInput)
  const commandHash = hashBusinessPayload({ id, organizationId: scope.organizationId, actorId: scope.actorId, kind: request.kind, expectedRevision: request.expectedRevision, reason: request.reason ?? null })
  return db.$transaction(async tx => {
    await purchaseLifecycleAuthority(tx, scope, request.kind)
    const replay = await replayPurchaseLifecycle(tx, id, scope, request.kind, request.idempotencyKey, commandHash)
    if (replay) return { id, lifecycleReceipt: replay }
    // Lock retained rows as well so a concurrent archive can still recover its exact receipt.
    await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${id} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
    const concurrentReplay = await replayPurchaseLifecycle(tx, id, scope, request.kind, request.idempotencyKey, commandHash)
    if (concurrentReplay) return { id, lifecycleReceipt: concurrentReplay }
    const po = await tx.purchaseOrder.findFirst({ where: { id, organizationId: scope.organizationId, deletedAt: null }, include: standardInclude })
    if (!po) throw new NotFoundError("Purchase order not found")
    const evidence = await lifecycleEvidence(tx, po)
    if (lifecycleRevision(po, evidence) !== request.expectedRevision) throw new ConflictError("The order or its linked records changed after review. Review the current record.")
    await assertLifecycleReady(tx, po, request.kind, evidence)
    if ((await purchaseLifecycleAuthority(tx, scope, request.kind)).requiresFreshAuth) throw new BusinessRuleError("Verify your current password before cancelling or archiving.", "FRESH_AUTH_REQUIRED")
    const recordedAt = new Date(Math.max(Date.now(), po.updatedAt.getTime() + 1)), toStatus = lifecycleTarget[request.kind]
    await tx.purchaseOrder.update({ where: { id, organizationId: scope.organizationId, deletedAt: null, status: po.status }, data: {
      status: toStatus, updatedAt: recordedAt, deletedAt: request.kind === "archive" ? recordedAt : undefined,
      // The reason belongs to the immutable decision evidence; original order notes remain intact.
    } })
    const result = { requestReference: request.idempotencyKey, orderId: id, kind: request.kind, reviewedRevision: request.expectedRevision, actorId: scope.actorId, recordedAt: recordedAt.toISOString(), fromStatus: po.status, toStatus, archived: request.kind === "archive" }
    const event = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, eventType: purchaseLifecycleEventType(request.kind), eventSource: "INTERNAL", schemaVersion: 1,
      idempotencyKey: purchaseLifecycleEventKey(request.idempotencyKey), sourceId: id, actorId: scope.actorId, occurredAt: recordedAt,
      payload: { entityType: "PurchaseOrder", commandHash, reason: request.reason ?? null, result }, outboxMessages: [] })
    await tx.auditLog.create({ data: { organizationId: scope.organizationId, userId: scope.actorId, entityType: "PurchaseOrder", entityId: id,
      action: ({ submit: "SUBMIT_PURCHASE_ORDER", cancel: "CANCEL_PURCHASE_ORDER", complete: "COMPLETE_PURCHASE_ORDER", archive: "ARCHIVE_PURCHASE_ORDER" })[request.kind],
      changes: { before: purchaseApprovalSnapshot(po), evidence, reason: request.reason ?? null, after: result, eventId: event.event.id } as Prisma.InputJsonValue,
    } })
    await markBusinessEventAppliedInTx(tx, scope.organizationId, event.event.id)
    return { id, lifecycleReceipt: { ...result, replayed: false } }
  }, { isolationLevel: "ReadCommitted", timeout: 15000 })
}

async function assertPurchaseOrderTransition(tx: Prisma.TransactionClient, po: POWithRelations, organizationId: string, toStatus: PurchaseOrderStatus) {
  if (!canTransition(po.status, toStatus)) throw new BusinessRuleError(`Cannot transition purchase order from ${po.status} to ${toStatus}`)
  if (toStatus === "SUBMITTED" && po.lines.length === 0) throw new BusinessRuleError("Cannot submit a purchase order without line items")
  if (toStatus === "COMPLETED") {
    const held = await tx.goodsReceipt.findFirst({ where: { purchaseOrderId: po.id, organizationId, status: "HELD", deletedAt: null }, select: { receiptNumber: true } })
    if (held) throw new BusinessRuleError(`Purchase order cannot be completed while goods receipt ${held.receiptNumber} is held for inspection.`)
    if (!po.lines.length || po.lines.some(line => new Prisma.Decimal(line.receivedQuantity).lt(line.orderedQuantity))) throw new BusinessRuleError("Purchase order completion requires all ordered quantities to be received.")
  }
}

export async function submitPurchaseOrder(id: string, organizationId: string, request?: PurchaseLifecycleRequest & PurchaseLifecycleScope) {
  if (!request || request.organizationId !== organizationId || request.kind !== "submit") throw new BusinessRuleError("Review this submission before confirming.", "REVIEW_REQUIRED")
  return executeLifecycleContext(id, request)
}

export async function getPurchaseOrderApprovalPreview(id: string, scopeInput: PurchaseApprovalScope): Promise<PurchaseApprovalPreview> {
  const scope = purchaseApprovalScopeSchema.parse(scopeInput)
  return db.$transaction(async tx => {
    const authority = await purchaseApprovalAuthority(tx, scope)
    const po = await lockedPurchaseOrder(tx, id, scope.organizationId)
    assertPurchaseApprovalOrder(po, scope.actorId)
    const organization = await tx.organization.findUniqueOrThrow({ where: { id: scope.organizationId }, select: { currency: true } })
    return { organizationId: scope.organizationId, actorId: scope.actorId, orderId: po.id, orderNumber: po.orderNumber, revision: purchaseApprovalRevision(po),
      requester: [po.createdBy?.firstName, po.createdBy?.lastName].filter(Boolean).join(" ") || po.createdById!, supplier: po.supplier.name, location: po.location.name, currency: organization.currency,
      total: po.total.toString(), orderDate: po.orderDate.toISOString(), expectedDeliveryDate: po.expectedDeliveryDate?.toISOString() ?? null,
      paymentTerms: po.paymentTerms, notes: po.notes, shippingCost: (po.shippingCost ?? 0).toString(), taxAmount: (po.taxAmount ?? 0).toString(), discount: (po.discount ?? 0).toString(),
      requiresFreshAuth: !authority.fresh, lines: po.lines.map(line => ({ id: line.id, nameEn: line.item.nameEn, nameFr: line.item.nameFr ?? line.item.nameEn, quantity: line.orderedQuantity.toString(), unitCost: line.unitCost.toString(), total: line.lineTotal.toString(), taxRate: (line.taxRate ?? 0).toString(), discount: (line.discount ?? 0).toString(), notes: line.notes })) }
  }, { timeout: 15000 })
}

export async function approvePurchaseOrder(id: string, organizationId: string, approvedById: string, context: PurchaseApprovalRequest & PurchaseApprovalScope) {
  logger.info("purchase-order.approve", { id, approvedById })
  if (!approvedById || approvedById === "system-user") {
    throw new BusinessRuleError("A real approver identity is required.")
  }
  const input = purchaseApprovalCommandSchema.parse(context)
  if (input.organizationId !== organizationId || input.actorId !== approvedById) throw new BusinessRuleError("Approval identity does not match the command.", "TENANT_SCOPE_VIOLATION")
  const commandHash = hashBusinessPayload({ id, organizationId, approvedById, expectedRevision: input.expectedRevision })
  return db.$transaction(async (tx) => {
    await purchaseApprovalAuthority(tx, input)
    // Recovery can read the retained approval after a later cancellation/archive.
    const replay = await replayPurchaseApproval(tx, id, input, input.idempotencyKey, commandHash)
    if (replay) return { id, approvalReceipt: replay }
    const po = await lockedPurchaseOrder(tx, id, organizationId)
    // A concurrent identical request may have committed while this waited for the order lock.
    const concurrentReplay = await replayPurchaseApproval(tx, id, input, input.idempotencyKey, commandHash)
    if (concurrentReplay) return { id, approvalReceipt: concurrentReplay }
    if (purchaseApprovalRevision(po) !== input.expectedRevision) throw new ConflictError("This order changed after review. Review the current order before approving.")
    assertPurchaseApprovalOrder(po, approvedById)
    if (!(await purchaseApprovalAuthority(tx, input)).fresh) throw new BusinessRuleError("Verify your current password before approving.", "FRESH_AUTH_REQUIRED")
    const approvedAt = new Date()
    await tx.purchaseOrder.update({
      where: { id, organizationId, deletedAt: null, status: "SUBMITTED" },
      data: { status: "APPROVED", approvedById, approvedAt, updatedAt: approvedAt },
      include: standardInclude,
    })
    const result = { requestReference: input.idempotencyKey, orderId: id, reviewedRevision: input.expectedRevision, approvedById, approvedAt: approvedAt.toISOString() }
    const event = await recordBusinessEventInTx(tx, { organizationId, eventType: "purchase_order.approved", eventSource: "INTERNAL", schemaVersion: 1,
      idempotencyKey: purchaseApprovalEventKey(input.idempotencyKey), sourceId: id, actorId: approvedById, occurredAt: approvedAt,
      payload: { entityType: "PurchaseOrder", commandHash, result }, outboxMessages: [] })
    await tx.auditLog.create({
      data: {
        organizationId,
        userId: approvedById,
        entityType: "PurchaseOrder",
        entityId: id,
        action: "APPROVE_PURCHASE_ORDER",
        changes: {
          before: purchaseApprovalSnapshot(po),
          after: {
            status: "APPROVED",
            approvedById,
            approvedAt: approvedAt.toISOString(),
          },
          requestReference: input.idempotencyKey,
          eventId: event.event.id,
        },
      },
    })
    await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
    return { id, approvalReceipt: { ...result, replayed: false } }
  }, { timeout: 15000 })
}

export async function cancelPurchaseOrder(id: string, organizationId: string, reason?: string, request?: PurchaseLifecycleRequest & PurchaseLifecycleScope) {
  if (!request || request.organizationId !== organizationId || request.kind !== "cancel" || request.reason !== reason) throw new BusinessRuleError("Review this cancellation before confirming.", "REVIEW_REQUIRED")
  return executeLifecycleContext(id, request)
}

export async function closePurchaseOrder(id: string, organizationId: string, request?: PurchaseLifecycleRequest & PurchaseLifecycleScope) {
  if (!request || request.organizationId !== organizationId || request.kind !== "complete") throw new BusinessRuleError("Review this completion before confirming.", "REVIEW_REQUIRED")
  return executeLifecycleContext(id, request)
}

// ── Receive items (goods receipt + inventory update) ──────────────────────────

function receiveItemsPayloadHash(input: ReceiveItemsInput) {
  return hashBusinessPayload({
    schemaVersion: 2,
    purchaseOrderId: input.purchaseOrderId,
    organizationId: input.organizationId,
    receivedById: input.receivedById,
    locationId: input.locationId ?? null,
    notes: input.notes?.trim() ?? "",
    inspectionOutcome: input.inspectionOutcome,
    inspectionReason: input.inspectionReason?.trim() ?? null,
    inspectionEvidenceNotes: input.inspectionEvidenceNotes?.trim() ?? null,
    items: input.items
      .map((item) => ({
        lineId: item.lineId,
        receivedQuantity: item.receivedQuantity,
        unitPrice: item.unitPrice ?? null,
        notes: item.notes?.trim() ?? "",
        serialNumbers: [...(item.serialNumbers ?? [])].map((serial) => serial.trim()).sort(),
        batchNumber: item.batchNumber?.trim() ?? null,
        expiryDate: item.expiryDate ?? null,
      }))
      .sort((left, right) => left.lineId.localeCompare(right.lineId)),
  })
}

function assertReceiptReplay(
  existing: { payloadHash: string | null; purchaseOrderId: string },
  input: ReceiveItemsInput,
  payloadHash: string,
) {
  if (existing.purchaseOrderId !== input.purchaseOrderId || existing.payloadHash !== payloadHash) {
    throw new ConflictError("This receipt idempotency key was already used with a different payload.")
  }
}

export async function receiveItems(input: ReceiveItemsInput, scopeInput?: PurchaseReceivingScope, client?: Prisma.TransactionClient) {
  input = ReceiveItemsSchema.parse(input)
  const scope = purchaseReceivingScopeSchema.parse(scopeInput)
  if (scope.organizationId !== input.organizationId || scope.actorId !== input.receivedById) throw new ForbiddenError("The receiving actor must match the current session.")
  const transaction = <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => client ? work(client) : db.$transaction(work, { timeout: 15000 })
  logger.info("purchase-order.receive", { id: input.purchaseOrderId, orgId: input.organizationId })
  const payloadHash = receiveItemsPayloadHash(input)

  try {
    const result = await transaction(async (tx) => {
      await purchaseReceivingAuthority(tx, scope, "receive")
      await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN purchase_orders p ON p."supplierId" = s.id WHERE p.id = ${input.purchaseOrderId} AND p."organizationId" = ${input.organizationId} AND s."organizationId" = ${input.organizationId} FOR UPDATE OF s`
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "purchase_orders"
        WHERE "id" = ${input.purchaseOrderId}
          AND "organizationId" = ${input.organizationId}
          AND "deletedAt" IS NULL
        FOR UPDATE
      `)
      if (locked.length !== 1) throw new NotFoundError("Purchase order not found")

      const existingReceipt = await tx.goodsReceipt.findFirst({
        where: {
          organizationId: input.organizationId,
          idempotencyKey: input.idempotencyKey,
        },
        select: {
          receiptNumber: true,
          purchaseOrderId: true,
          payloadHash: true,
          status: true,
        },
      })
      if (existingReceipt) {
        assertReceiptReplay(existingReceipt, input, payloadHash)
        const replayPurchaseOrder = await tx.purchaseOrder.findFirst({
          where: { id: input.purchaseOrderId, organizationId: input.organizationId, deletedAt: null },
          include: standardInclude,
        })
        if (!replayPurchaseOrder) throw new NotFoundError("Purchase order not found")
        return {
          purchaseOrder: replayPurchaseOrder,
          receiptNumber: existingReceipt.receiptNumber,
          receiptStatus: existingReceipt.status,
          inspectionOutcome: input.inspectionOutcome,
          replayed: true,
        }
      }

      const po = await tx.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, organizationId: input.organizationId, deletedAt: null },
        include: { ...standardInclude, lines: { include: { item: true } } },
      })
      if (!po) throw new NotFoundError("Purchase order not found")
      if (!canReceivePurchaseOrderStatus(po.status)) {
        throw new BusinessRuleError(`Cannot receive items for a purchase order with status: ${po.status}`)
      }

      const effectiveLocationId = input.locationId ?? po.locationId
      const location = await tx.location.findFirst({ where: { id: effectiveLocationId, organizationId: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } })
      if (!location) throw new NotFoundError("The receiving location is unavailable in this organization.")

      const receiptNumber = await allocatePurchaseDocumentNumber(tx, {
        organizationId: input.organizationId,
        documentType: PURCHASE_DOCUMENT_TYPE.GOODS_RECEIPT,
      })
      const lineMap = new Map(po.lines.map((line) => [line.id, line]))
      const serialUnits = input.items.reduce((sum, item) => sum + (lineMap.get(item.lineId)?.item.trackSerialNumbers ? item.receivedQuantity : 0), 0)
      if (serialUnits > 5000) throw new BusinessRuleError("Receive at most 5000 serial-tracked units in one request.")
      const items = input.items.map((item) => {
        const line = lineMap.get(item.lineId)
        if (!line) throw new NotFoundError(`Line ${item.lineId} not found on this purchase order`)

        if (line.item.organizationId !== input.organizationId || !line.item.isActive || line.item.deletedAt) throw new BusinessRuleError("An item is no longer available for receiving.")
        if (item.unitPrice !== undefined && !line.unitCost.eq(item.unitPrice)) throw new BusinessRuleError("Receiving must use the approved order cost. Review a commercial amendment before changing costs.", "CONFLICT")

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

      const heldReceiptQuantities = await tx.goodsReceiptLine.groupBy({
        by: ["purchaseOrderLineId"],
        where: {
          purchaseOrderLineId: { in: items.map((item) => item.lineId) },
          goodsReceipt: {
            organizationId: input.organizationId,
            purchaseOrderId: input.purchaseOrderId,
            status: "HELD",
            deletedAt: null,
          },
        },
        _sum: { receivedQuantity: true },
      })
      const heldQuantityByLine = new Map(
        heldReceiptQuantities.map((line) => [line.purchaseOrderLineId, line._sum.receivedQuantity ?? new Prisma.Decimal(0)]),
      )

      for (const [index, item] of items.entries()) {
        const line = lineMap.get(item.lineId)
        if (!line) throw new NotFoundError(`Line ${item.lineId} not found on this purchase order`)

        const itemName = line.item.nameEn || line.item.sku
        const heldQuantity = heldQuantityByLine.get(line.id) ?? 0
        const remaining = line.orderedQuantity.minus(line.receivedQuantity).minus(heldQuantity)
        if (remaining.lt(item.receivedQuantity)) {
          throw new BusinessRuleError(`Cannot receive ${item.receivedQuantity} of "${itemName}". Only ${remaining} remaining.`)
        }
        if (item.serialNumbers && new Set(item.serialNumbers).size !== item.serialNumbers.length) {
          throw new ConflictError(`Duplicate serial numbers found for item ${index + 1}`)
        }
        if (line.item.trackSerialNumbers && item.serialNumbers?.length !== item.receivedQuantity) {
          throw new BusinessRuleError(`Serial numbers required and must match received quantity for "${itemName}"`)
        }
        if (line.item.trackBatches && !item.batchNumber) {
          throw new BusinessRuleError(`Batch number required for "${itemName}"`)
        }
        if (line.item.trackExpiry && (!item.expiryDate || isNaN(new Date(item.expiryDate).getTime()))) {
          throw new BusinessRuleError(`Valid expiry date required for "${itemName}"`)
        }
      }

      const requestedSerials = items.flatMap((item) => item.serialNumbers ?? [])
      if (requestedSerials.length) {
        if (new Set(requestedSerials).size !== requestedSerials.length) {
          throw new ConflictError("Duplicate serial numbers found in this receipt")
        }
        const existingSerials = await tx.serialNumber.findMany({
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

      const finalizedAt = new Date()
      const inspectionPassed = input.inspectionOutcome === "PASSED"
      const receiptStatus: GoodsReceiptStatus = inspectionPassed ? "RECEIVED" : "HELD"
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          receiptDate: finalizedAt,
          purchaseOrderId: input.purchaseOrderId,
          locationId: effectiveLocationId,
          organizationId: input.organizationId,
          receivedById: input.receivedById,
          status: receiptStatus,
          idempotencyKey: input.idempotencyKey,
          payloadHash,
          finalizedAt,
          inventoryPostedAt: inspectionPassed ? finalizedAt : null,
          notes: input.notes ?? "",
        },
      })

      await tx.goodsReceiptInspection.create({
        data: {
          organizationId: input.organizationId,
          goodsReceiptId: receipt.id,
          outcome: input.inspectionOutcome,
          inspectedById: input.receivedById,
          reason: input.inspectionReason?.trim() || null,
          evidenceNotes: input.inspectionEvidenceNotes?.trim() || null,
          inspectedAt: finalizedAt,
        },
      })

      const persistedLines = new Map<string, string>()
      for (const item of items) {
        const line = lineMap.get(item.lineId)!
        const unitCost = toN(line.unitCost)
        const receiptLine = await tx.goodsReceiptLine.create({
          data: {
            goodsReceiptId: receipt.id,
            purchaseOrderLineId: line.id,
            itemId: line.itemId,
            receivedQuantity: item.receivedQuantity,
            unitCost,
            lineTotal: line.unitCost.mul(item.receivedQuantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
            notes: item.notes ?? "",
            batchNumber: item.batchNumber ?? null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            serialNumbers: item.serialNumbers ?? [],
          },
        })
        persistedLines.set(line.id, receiptLine.id)
      }
      const recognitionSource = inspectionPassed ? await createReceiptRecognitionSourceInTx(tx, input.organizationId, receipt.id, input.receivedById) : null
      for (const item of items) {
        const line = lineMap.get(item.lineId)!, unitCost = toN(line.unitCost)
        if (inspectionPassed) { // Only accepted inspection outcomes may post inventory.
          const lineClaim = await tx.purchaseOrderLine.updateMany({
            where: {
              id: line.id,
              purchaseOrderId: input.purchaseOrderId,
              receivedQuantity: line.receivedQuantity,
            },
            data: {
              receivedQuantity: { increment: item.receivedQuantity },
            },
          })
          if (lineClaim.count !== 1) {
            throw new ConflictError("Purchase order receipt quantities changed concurrently. Refresh and retry.")
          }

          if (recognitionSource!.manifest.lines.find(candidate => candidate.receiptLineId === persistedLines.get(line.id))!.stockTracked) await applyInventoryReceipt(tx, {
            itemId: line.itemId,
            locationId: effectiveLocationId,
            qty: item.receivedQuantity,
            unitCost,
            organizationId: input.organizationId,
            receiptId: receipt.id,
            receiptNumber,
            receiptLineId: persistedLines.get(line.id)!,
            recognitionSource: recognitionSource!,
            receivedById: input.receivedById,
            batchNumber: item.batchNumber ?? null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            serialNumbers: item.serialNumbers ?? [],
          })
        }
      }

      if (inspectionPassed) {
        const allLines = await tx.purchaseOrderLine.findMany({
          where: { purchaseOrderId: input.purchaseOrderId },
        })
        const newStatus: PurchaseOrderStatus = allLines.every(line => line.receivedQuantity.gte(line.orderedQuantity)) ? "RECEIVED" : "PARTIALLY_RECEIVED"
        if (newStatus !== po.status) {
          await tx.purchaseOrder.update({
            where: { id: input.purchaseOrderId },
            data: { status: newStatus },
          })
        }
      }

      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { id: input.purchaseOrderId },
        include: standardInclude,
      })
      if (!purchaseOrder) throw new NotFoundError("Purchase order not found")
      if (recognitionSource) await postReceiptRecognitionInTx(tx, { organizationId: input.organizationId, receiptId: receipt.id, actorId: input.receivedById })
      await tx.auditLog.create({ data: { organizationId: input.organizationId, userId: input.receivedById, entityType: "GoodsReceipt", entityId: receipt.id, action: "RECORD_GOODS_RECEIPT", changes: { purchaseOrderId: po.id, receiptNumber, status: receiptStatus, inspectionOutcome: input.inspectionOutcome, payloadHash, requestReference: input.idempotencyKey } } })
      return {
        purchaseOrder,
        receiptNumber,
        receiptStatus,
        inspectionOutcome: input.inspectionOutcome,
        replayed: false,
      }
    })

    return {
      purchaseOrder: transformPO(result.purchaseOrder),
      receiptNumber: result.receiptNumber,
      receiptStatus: result.receiptStatus,
      inspectionOutcome: result.inspectionOutcome,
      replayed: result.replayed,
    }
  } catch (error) {
    if (error instanceof ApplicationError) throw error
    if (client) throw error
    if (getPrismaKnownRequest(error)?.code !== "P2002") {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Goods receipt could not be completed safely.",
        500,
        false,
      )
    }

    return transaction(async tx => {
    await purchaseReceivingAuthority(tx, scope, "receive")
    const existingReceipt = await tx.goodsReceipt.findFirst({
      where: {
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey,
      },
      select: {
        receiptNumber: true,
        purchaseOrderId: true,
        payloadHash: true,
        status: true,
      },
    })
    if (!existingReceipt) {
      throw new ConflictError("A concurrent goods receipt conflict was detected. Refresh and retry.")
    }
    assertReceiptReplay(existingReceipt, input, payloadHash)

    const purchaseOrder = await tx.purchaseOrder.findFirst({
      where: { id: input.purchaseOrderId, organizationId: input.organizationId, deletedAt: null },
      include: standardInclude,
    })
    if (!purchaseOrder) throw new NotFoundError("Purchase order not found")
    return {
      purchaseOrder: transformPO(purchaseOrder),
      receiptNumber: existingReceipt.receiptNumber,
      receiptStatus: existingReceipt.status,
      inspectionOutcome: input.inspectionOutcome,
      replayed: true,
    }
    })
  }
}

function inspectionResolutionPayloadHash(input: ResolveGoodsReceiptInspectionInput) {
  return hashBusinessPayload({
    schemaVersion: 1,
    goodsReceiptId: input.goodsReceiptId,
    organizationId: input.organizationId,
    resolvedById: input.resolvedById,
    decision: input.decision,
    reason: input.reason.trim(),
  })
}

function assertInspectionResolutionReplay(
  existing: { goodsReceiptId: string; payloadHash: string },
  input: ResolveGoodsReceiptInspectionInput,
  payloadHash: string,
) {
  if (existing.goodsReceiptId !== input.goodsReceiptId || existing.payloadHash !== payloadHash) {
    throw new ConflictError("This inspection resolution idempotency key was already used with a different payload.")
  }
}

export async function resolveGoodsReceiptInspection(input: ResolveGoodsReceiptInspectionInput, scopeInput?: PurchaseReceivingScope, client?: Prisma.TransactionClient) {
  input = ResolveGoodsReceiptInspectionSchema.parse(input)
  const scope = purchaseReceivingScopeSchema.parse(scopeInput)
  if (scope.organizationId !== input.organizationId || scope.actorId !== input.resolvedById) throw new ForbiddenError("The inspection resolver must match the current session.")
  const transaction = <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => client ? work(client) : db.$transaction(work, { timeout: 15000 })
  logger.info("purchase-order.resolve-receipt-inspection", {
    receiptId: input.goodsReceiptId,
    orgId: input.organizationId,
    decision: input.decision,
  })
  const payloadHash = inspectionResolutionPayloadHash(input)

  try {
    return await transaction(async (tx) => {
      const authority = await purchaseReceivingAuthority(tx, scope, "resolve")
      const parent = await tx.goodsReceipt.findFirst({ where: { id: input.goodsReceiptId, organizationId: input.organizationId, deletedAt: null }, select: { purchaseOrderId: true } })
      if (!parent) throw new NotFoundError("Goods receipt not found")
      await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN purchase_orders p ON p."supplierId" = s.id WHERE p.id = ${parent.purchaseOrderId} AND p."organizationId" = ${input.organizationId} AND s."organizationId" = ${input.organizationId} FOR UPDATE OF s`
      await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${parent.purchaseOrderId} AND "organizationId" = ${input.organizationId} FOR UPDATE`
      const lockedReceipt = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "goods_receipts"
        WHERE "id" = ${input.goodsReceiptId}
          AND "organizationId" = ${input.organizationId}
          AND "deletedAt" IS NULL
        FOR UPDATE
      `)
      if (lockedReceipt.length !== 1) throw new NotFoundError("Goods receipt not found")

      const existingCommand = await tx.goodsReceiptInspectionResolution.findFirst({
        where: {
          organizationId: input.organizationId,
          idempotencyKey: input.idempotencyKey,
        },
        select: {
          goodsReceiptId: true,
          payloadHash: true,
          decision: true,
          goodsReceipt: {
            select: { receiptNumber: true, purchaseOrderId: true, status: true },
          },
        },
      })
      if (existingCommand) {
        assertInspectionResolutionReplay(existingCommand, input, payloadHash)
        return {
          goodsReceiptId: existingCommand.goodsReceiptId,
          receiptNumber: existingCommand.goodsReceipt.receiptNumber,
          purchaseOrderId: existingCommand.goodsReceipt.purchaseOrderId,
          receiptStatus: existingCommand.goodsReceipt.status,
          decision: existingCommand.decision,
          replayed: true,
        }
      }

      const receipt = await tx.goodsReceipt.findFirst({
        where: {
          id: input.goodsReceiptId,
          organizationId: input.organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
          receiptNumber: true,
          purchaseOrderId: true,
          locationId: true,
          status: true,
          inspection: { select: { id: true, outcome: true, inspectedById: true } },
          inspectionResolution: { select: { id: true } },
          lines: {
            select: {
              id: true,
              purchaseOrderLineId: true,
              itemId: true,
              receivedQuantity: true,
              unitCost: true,
              batchNumber: true,
              expiryDate: true,
              serialNumbers: true,
            },
          },
        },
      })
      if (!receipt) throw new NotFoundError("Goods receipt not found")
      if (!receipt.inspection || receipt.inspection.outcome === "PASSED") {
        throw new BusinessRuleError("Only a failed or incomplete inspection can be resolved.")
      }
      if (receipt.inspectionResolution) {
        throw new ConflictError("This goods receipt inspection has already been resolved.")
      }
      if (receipt.status !== "HELD") {
        throw new BusinessRuleError(`Cannot resolve a goods receipt with status: ${receipt.status}`)
      }
      if (!authority.fresh) throw new BusinessRuleError("Verify your current password before resolving this inspection.", "FRESH_AUTH_REQUIRED")
      if (input.decision === "ACCEPT" && receipt.inspection.inspectedById === input.resolvedById) throw new BusinessRuleError("A different authorized receiver must review and accept a failed or incomplete inspection.", "SOD_VIOLATION")
      const order = await tx.purchaseOrder.findFirst({ where: { id: receipt.purchaseOrderId, organizationId: input.organizationId, deletedAt: null }, select: { status: true } })
      if (!order || !["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"].includes(order.status)) throw new BusinessRuleError("This order is not available for inspection resolution.")
      const location = await tx.location.findFirst({ where: { id: receipt.locationId, organizationId: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } })
      if (input.decision === "ACCEPT" && !location) throw new BusinessRuleError("The retained receiving location must be active before inventory can be released.")

      const lockedOrder = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "purchase_orders"
        WHERE "id" = ${receipt.purchaseOrderId}
          AND "organizationId" = ${input.organizationId}
          AND "deletedAt" IS NULL
        FOR UPDATE
      `)
      if (lockedOrder.length !== 1) throw new NotFoundError("Purchase order not found")

      const resolvedAt = new Date()
      await tx.goodsReceiptInspectionResolution.create({
        data: {
          organizationId: input.organizationId,
          goodsReceiptId: receipt.id,
          inspectionId: receipt.inspection.id,
          decision: input.decision,
          resolvedById: input.resolvedById,
          reason: input.reason.trim(),
          idempotencyKey: input.idempotencyKey,
          payloadHash,
          resolvedAt,
        },
      })

      const receiptStatus: GoodsReceiptStatus = input.decision === "ACCEPT" ? "RECEIVED" : "REJECTED"
      await tx.goodsReceipt.update({ where: { id: receipt.id }, data: { status: receiptStatus, inventoryPostedAt: input.decision === "ACCEPT" ? resolvedAt : null } })
      const recognitionSource = input.decision === "ACCEPT" ? await createReceiptRecognitionSourceInTx(tx, input.organizationId, receipt.id, input.resolvedById) : null

      if (input.decision === "ACCEPT") {
        const serialNumbers = receipt.lines.flatMap((line) => line.serialNumbers)
        if (new Set(serialNumbers).size !== serialNumbers.length) {
          throw new ConflictError("Duplicate serial numbers found in this held receipt")
        }
        if (serialNumbers.length) {
          const existingSerials = await tx.serialNumber.findMany({
            where: {
              organizationId: input.organizationId,
              serialNumber: { in: serialNumbers },
            },
            select: { serialNumber: true },
          })
          if (existingSerials.length) {
            throw new ConflictError(
              `Serial number already exists: ${existingSerials.map((serial) => serial.serialNumber).join(", ")}`,
            )
          }
        }

        for (const line of receipt.lines) {
          const orderLine = await tx.purchaseOrderLine.findFirst({
            where: {
              id: line.purchaseOrderLineId,
              purchaseOrderId: receipt.purchaseOrderId,
            },
            select: {
              id: true,
              orderedQuantity: true,
              receivedQuantity: true,
              item: { select: { nameEn: true, sku: true, organizationId: true, isActive: true, deletedAt: true } },
            },
          })
          if (!orderLine) throw new NotFoundError("Purchase order receipt line not found")
          if (orderLine.item.organizationId !== input.organizationId || !orderLine.item.isActive || orderLine.item.deletedAt) throw new BusinessRuleError("The retained item must be active before inventory can be released.")

          const acceptedQuantity = toN(line.receivedQuantity)
          const remaining = orderLine.orderedQuantity.minus(orderLine.receivedQuantity)
          if (remaining.lt(line.receivedQuantity)) {
            throw new BusinessRuleError(
              `Cannot accept held quantity for "${orderLine.item.nameEn || orderLine.item.sku}". Only ${remaining} remaining.`,
            )
          }

          const lineClaim = await tx.purchaseOrderLine.updateMany({
            where: {
              id: orderLine.id,
              purchaseOrderId: receipt.purchaseOrderId,
              receivedQuantity: orderLine.receivedQuantity,
            },
            data: { receivedQuantity: { increment: line.receivedQuantity } },
          })
          if (lineClaim.count !== 1) {
            throw new ConflictError("Purchase order receipt quantities changed concurrently. Refresh and retry.")
          }

          if (recognitionSource!.manifest.lines.find(candidate => candidate.receiptLineId === line.id)!.stockTracked) await applyInventoryReceipt(tx, {
            itemId: line.itemId,
            locationId: receipt.locationId,
            qty: acceptedQuantity,
            unitCost: toN(line.unitCost),
            organizationId: input.organizationId,
            receiptId: receipt.id,
            receiptNumber: receipt.receiptNumber,
            receiptLineId: line.id,
            recognitionSource: recognitionSource!,
            receivedById: input.resolvedById,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
            serialNumbers: line.serialNumbers,
          })
        }

        const orderLines = await tx.purchaseOrderLine.findMany({
          where: { purchaseOrderId: receipt.purchaseOrderId },
          select: { orderedQuantity: true, receivedQuantity: true },
        })
        const purchaseOrderStatus: PurchaseOrderStatus = order.status === "CANCELLED" ? "CANCELLED" : orderLines.every(line => line.receivedQuantity.gte(line.orderedQuantity))
          ? "RECEIVED"
          : "PARTIALLY_RECEIVED"
        await tx.purchaseOrder.update({
          where: { id: receipt.purchaseOrderId },
          data: { status: purchaseOrderStatus },
        })
      }

      if (recognitionSource) await postReceiptRecognitionInTx(tx, { organizationId: input.organizationId, receiptId: receipt.id, actorId: input.resolvedById })

      await tx.auditLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.resolvedById,
          entityType: "GoodsReceipt",
          entityId: receipt.id,
          action: "RESOLVE_GOODS_RECEIPT_INSPECTION",
          changes: {
            inspectionOutcome: receipt.inspection.outcome,
            decision: input.decision,
            reason: input.reason.trim(),
            receiptStatus,
          },
        },
      })

      return {
        goodsReceiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        purchaseOrderId: receipt.purchaseOrderId,
        receiptStatus,
        decision: input.decision,
        replayed: false,
      }
    })
  } catch (error) {
    if (error instanceof ApplicationError) throw error
    if (client) throw error
    if (getPrismaKnownRequest(error)?.code !== "P2002") {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Goods receipt inspection resolution could not be completed safely.",
        500,
        false,
      )
    }

    return transaction(async tx => {
    await purchaseReceivingAuthority(tx, scope, "resolve")
    const existingCommand = await tx.goodsReceiptInspectionResolution.findFirst({
      where: {
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey,
      },
      select: {
        goodsReceiptId: true,
        payloadHash: true,
        decision: true,
        goodsReceipt: {
          select: { receiptNumber: true, purchaseOrderId: true, status: true },
        },
      },
    })
    if (!existingCommand) {
      throw new ConflictError("A concurrent inspection resolution conflict was detected. Refresh and retry.")
    }
    assertInspectionResolutionReplay(existingCommand, input, payloadHash)
    return {
      goodsReceiptId: existingCommand.goodsReceiptId,
      receiptNumber: existingCommand.goodsReceipt.receiptNumber,
      purchaseOrderId: existingCommand.goodsReceipt.purchaseOrderId,
      receiptStatus: existingCommand.goodsReceipt.status,
      decision: existingCommand.decision,
      replayed: true,
    }
    })
  }
}

// ── Bulk status update ────────────────────────────────────────────────────────

export async function bulkUpdateStatus(input: BulkStatusUpdateInput, scope?: PurchaseLifecycleScope) {
  if (!input.purchaseOrderIds.length) throw new BusinessRuleError("Select at least one purchase order.")
  if (input.toStatus === "APPROVED") throw new BusinessRuleError("Purchase orders cannot be approved in bulk. Use the canonical approval workflow for each order.")
  const kind = ({ SUBMITTED: "submit", CANCELLED: "cancel", COMPLETED: "complete" } as const)[input.toStatus as "SUBMITTED" | "CANCELLED" | "COMPLETED"]
  if (!kind) throw new BusinessRuleError("Use the receiving workflow to record received quantities and receipt status.")
  if (!scope || scope.organizationId !== input.organizationId || !input.reviewedRequests) throw new BusinessRuleError("Review each selected order before confirming the batch.", "REVIEW_REQUIRED")
  const ids = [...new Set(input.purchaseOrderIds)].sort(), requests = new Map(input.reviewedRequests.map(value => [value.id, value.request]))
  if (requests.size !== input.reviewedRequests.length || requests.size !== ids.length || ids.some(id => !requests.has(id)) || input.reviewedRequests.some(value => value.request.kind !== kind || (value.request.reason ?? "") !== (input.reason?.trim() ?? ""))) throw new BusinessRuleError("The reviewed batch does not match the selected orders and decision.", "REVIEW_REQUIRED")
  const updated: string[] = [], failed: Array<{ id: string; error: string }> = []
  // Each order owns one atomic receipt. Partial batches retry the same per-order commands.
  for (const id of ids) {
    try { await executePurchaseOrderLifecycle(id, scope, requests.get(id)!); updated.push(id) }
    catch (error) { if (!(error instanceof ApplicationError) || !error.expose) throw error; failed.push({ id, error: error.message }) }
  }
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

  const cloned = await db.$transaction(async (tx) => {
    await assertModuleNewWorkInTx(tx, { organizationId: input.organizationId, moduleSlug: "purchasing", operation: "purchasing.order.clone" })

    // A clone is new work: inherited and overridden references must belong to
    // the current tenant and remain selectable, just like the active form catalogue.
    const supplierId = overrides.supplierId ?? source.supplierId
    const locationId = overrides.locationId ?? source.locationId
    const itemIds = [...new Set(source.lines.map((line) => line.itemId))]
    const [supplier, location, items] = await Promise.all([
      tx.supplier.findFirst({ where: { id: supplierId, organizationId: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
      tx.location.findFirst({ where: { id: locationId, organizationId: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
      tx.item.findMany({ where: { id: { in: itemIds }, organizationId: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
    ])
    if (!supplier) throw new NotFoundError("Supplier is unavailable for a new purchase order in this organisation.")
    if (!location) throw new NotFoundError("Delivery location is unavailable for a new purchase order in this organisation.")
    if (items.length !== itemIds.length) throw new NotFoundError("One or more items are unavailable for a new purchase order in this organisation.")

    const orderNumber = await allocatePurchaseDocumentNumber(tx, {
      organizationId: input.organizationId,
      documentType: PURCHASE_DOCUMENT_TYPE.PURCHASE_ORDER,
    })
    const po = await tx.purchaseOrder.create({
      data: {
        orderNumber,
        organizationId:      input.organizationId,
        supplierId:          overrides.supplierId ?? source.supplierId,
        locationId:          overrides.locationId ?? source.locationId,
        orderDate:           overrides.date ? new Date(overrides.date) : new Date(),
        expectedDeliveryDate: overrides.expectedDeliveryDate ? new Date(overrides.expectedDeliveryDate) : source.expectedDeliveryDate,
        paymentTerms:        overrides.paymentTerms ?? source.paymentTerms ?? "Net 30 days",
        notes:               overrides.notes ?? source.notes ?? `Cloned from ${source.orderNumber}`,
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
      inspection: {
        include: {
          inspectedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      inspectionResolution: {
        include: {
          resolvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
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

const ANALYTICS_STATUS_ORDER: PurchaseOrderAnalyticsStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
]

const OPEN_ANALYTICS_STATUSES = new Set<PurchaseOrderAnalyticsStatus>([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "PARTIALLY_RECEIVED",
])

function analyticsDate(value: string, inclusiveEnd = false) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError(`Invalid purchase-order analytics date: ${value}`)
  }
  if (inclusiveEnd && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999)
  }
  return date
}

function roundMetric(value: number, precision = 2) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function percentMetric(numerator: number, denominator: number) {
  return denominator > 0 ? roundMetric((numerator / denominator) * 100, 1) : 0
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.ceil(percentileValue * sorted.length) - 1)
  return sorted[index] ?? 0
}

function daysBetween(earlier: Date, later: Date) {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 86_400_000))
}

export async function getAnalytics(input: POAnalyticsInput): Promise<PurchaseOrderAnalyticsData> {
  const from = input.from ? analyticsDate(input.from) : null
  const to = input.to ? analyticsDate(input.to, true) : null
  const where: Prisma.PurchaseOrderWhereInput = {
    organizationId: input.organizationId,
    deletedAt: null,
    ...(from || to
      ? {
          orderDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  }

  const [orders, organization] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderDate: true,
        expectedDeliveryDate: true,
        actualDeliveryDate: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        total: true,
        supplier: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
        lines: {
          select: {
            orderedQuantity: true,
            receivedQuantity: true,
            unitCost: true,
            lineTotal: true,
            item: { select: { id: true, sku: true, nameEn: true, nameFr: true } },
          },
        },
        goodsReceipts: {
          where: { deletedAt: null, status: { not: "CANCELLED" } },
          select: { receiptDate: true, createdAt: true, status: true },
          orderBy: { receiptDate: "asc" },
        },
      },
      orderBy: { orderDate: "asc" },
    }),
    db.organization.findFirst({
      where: { id: input.organizationId },
      select: { currency: true },
    }),
  ])

  const now = new Date()
  const activeOrders = orders.filter(order => order.status !== "CANCELLED")
  const totalSpend = activeOrders.reduce((sum, order) => sum + toN(order.total), 0)
  let orderedUnits = 0
  let receivedUnits = 0
  let openCommitmentValue = 0
  let overdueValue = 0
  let overdueOrders = 0
  let onTimeOrders = 0
  let onTimeSampleSize = 0

  const approvalHours = orders
    .filter(order => order.approvedAt)
    .map(order => Math.max(0, (order.approvedAt!.getTime() - order.createdAt.getTime()) / 3_600_000))

  const monthlyMap = new Map<string, { orderCount: number; totalSpend: number; receivedOrders: number }>()
  const statusMap = new Map<PurchaseOrderAnalyticsStatus, { orders: number; totalValue: number }>(
    ANALYTICS_STATUS_ORDER.map(status => [status, { orders: 0, totalValue: 0 }]),
  )
  const supplierMap = new Map<string, {
    supplierId: string
    name: string
    code: string
    orders: number
    totalSpend: number
    openCommitmentValue: number
    overdueOrders: number
    orderedUnits: number
    receivedUnits: number
    onTimeOrders: number
    onTimeSampleSize: number
  }>()
  const locationMap = new Map<string, {
    locationId: string
    name: string
    orders: number
    totalSpend: number
    openCommitmentValue: number
    overdueOrders: number
    orderedUnits: number
    receivedUnits: number
  }>()
  const itemMap = new Map<string, {
    itemId: string
    sku: string
    nameEn: string
    nameFr: string | null
    orderedUnits: number
    receivedUnits: number
    totalSpend: number
  }>()
  const agingMap = new Map<"0_7" | "8_30" | "31_60" | "61_PLUS", { orders: number; openCommitmentValue: number }>([
    ["0_7", { orders: 0, openCommitmentValue: 0 }],
    ["8_30", { orders: 0, openCommitmentValue: 0 }],
    ["31_60", { orders: 0, openCommitmentValue: 0 }],
    ["61_PLUS", { orders: 0, openCommitmentValue: 0 }],
  ])
  const exceptions: PurchaseOrderAnalyticsException[] = []

  for (const order of orders) {
    const status = order.status as PurchaseOrderAnalyticsStatus
    const isCancelled = status === "CANCELLED"
    const isOpen = OPEN_ANALYTICS_STATUSES.has(status)
    const orderValue = toN(order.total)
    const statusEntry = statusMap.get(status)!
    statusEntry.orders += 1
    statusEntry.totalValue += orderValue

    const month = `${order.orderDate.getUTCFullYear()}-${String(order.orderDate.getUTCMonth() + 1).padStart(2, "0")}`
    const monthEntry = monthlyMap.get(month) ?? { orderCount: 0, totalSpend: 0, receivedOrders: 0 }
    monthEntry.orderCount += 1
    if (!isCancelled) monthEntry.totalSpend += orderValue
    if (status === "RECEIVED" || status === "COMPLETED") monthEntry.receivedOrders += 1
    monthlyMap.set(month, monthEntry)

    let orderOrderedUnits = 0
    let orderReceivedUnits = 0
    let orderOpenCommitment = 0
    for (const line of order.lines) {
      const lineOrdered = toN(line.orderedQuantity)
      const lineReceived = Math.min(lineOrdered, toN(line.receivedQuantity))
      const remaining = Math.max(0, lineOrdered - lineReceived)
      const unitCost = toN(line.unitCost)
      orderOrderedUnits += lineOrdered
      orderReceivedUnits += lineReceived
      orderOpenCommitment += remaining * unitCost

      if (!isCancelled) {
        const itemEntry = itemMap.get(line.item.id) ?? {
          itemId: line.item.id,
          sku: line.item.sku,
          nameEn: line.item.nameEn,
          nameFr: line.item.nameFr,
          orderedUnits: 0,
          receivedUnits: 0,
          totalSpend: 0,
        }
        itemEntry.orderedUnits += lineOrdered
        itemEntry.receivedUnits += lineReceived
        itemEntry.totalSpend += toN(line.lineTotal)
        itemMap.set(line.item.id, itemEntry)
      }
    }

    if (!isCancelled) {
      orderedUnits += orderOrderedUnits
      receivedUnits += orderReceivedUnits
      if (isOpen) openCommitmentValue += orderOpenCommitment
    }

    const isOverdue = Boolean(isOpen && order.expectedDeliveryDate && order.expectedDeliveryDate.getTime() < now.getTime())
    const daysOpen = daysBetween(order.orderDate, now)
    const daysOverdue = isOverdue && order.expectedDeliveryDate
      ? daysBetween(order.expectedDeliveryDate, now)
      : 0
    if (isOverdue) {
      overdueOrders += 1
      overdueValue += orderOpenCommitment
    }

    const latestReceipt = order.goodsReceipts.length
      ? order.goodsReceipts.reduce((latest, receipt) => {
          const receiptDate = receipt.receiptDate ?? receipt.createdAt
          return receiptDate.getTime() > latest.getTime() ? receiptDate : latest
        }, order.goodsReceipts[0]!.receiptDate ?? order.goodsReceipts[0]!.createdAt)
      : null
    const deliveryEvidence = order.actualDeliveryDate ?? latestReceipt
    const hasDeliverySample = Boolean(
      order.expectedDeliveryDate &&
      deliveryEvidence &&
      (status === "RECEIVED" || status === "COMPLETED"),
    )
    const deliveredOnTime = Boolean(
      hasDeliverySample &&
      deliveryEvidence!.getTime() <= order.expectedDeliveryDate!.getTime(),
    )
    if (hasDeliverySample) {
      onTimeSampleSize += 1
      if (deliveredOnTime) onTimeOrders += 1
    }

    const supplierEntry = supplierMap.get(order.supplier.id) ?? {
      supplierId: order.supplier.id,
      name: order.supplier.name,
      code: order.supplier.code ?? "",
      orders: 0,
      totalSpend: 0,
      openCommitmentValue: 0,
      overdueOrders: 0,
      orderedUnits: 0,
      receivedUnits: 0,
      onTimeOrders: 0,
      onTimeSampleSize: 0,
    }
    supplierEntry.orders += 1
    if (!isCancelled) {
      supplierEntry.totalSpend += orderValue
      supplierEntry.orderedUnits += orderOrderedUnits
      supplierEntry.receivedUnits += orderReceivedUnits
      if (isOpen) supplierEntry.openCommitmentValue += orderOpenCommitment
    }
    if (isOverdue) supplierEntry.overdueOrders += 1
    if (hasDeliverySample) {
      supplierEntry.onTimeSampleSize += 1
      if (deliveredOnTime) supplierEntry.onTimeOrders += 1
    }
    supplierMap.set(order.supplier.id, supplierEntry)

    const locationEntry = locationMap.get(order.location.id) ?? {
      locationId: order.location.id,
      name: order.location.name,
      orders: 0,
      totalSpend: 0,
      openCommitmentValue: 0,
      overdueOrders: 0,
      orderedUnits: 0,
      receivedUnits: 0,
    }
    locationEntry.orders += 1
    if (!isCancelled) {
      locationEntry.totalSpend += orderValue
      locationEntry.orderedUnits += orderOrderedUnits
      locationEntry.receivedUnits += orderReceivedUnits
      if (isOpen) locationEntry.openCommitmentValue += orderOpenCommitment
    }
    if (isOverdue) locationEntry.overdueOrders += 1
    locationMap.set(order.location.id, locationEntry)

    if (isOpen) {
      const bucket = daysOpen <= 7 ? "0_7" : daysOpen <= 30 ? "8_30" : daysOpen <= 60 ? "31_60" : "61_PLUS"
      const agingEntry = agingMap.get(bucket)!
      agingEntry.orders += 1
      agingEntry.openCommitmentValue += orderOpenCommitment

      const issue = isOverdue
        ? "OVERDUE"
        : status === "SUBMITTED" && daysOpen >= 3
          ? "APPROVAL_WAIT"
          : status === "PARTIALLY_RECEIVED"
            ? "PARTIAL_RECEIPT"
            : status === "APPROVED" && daysOpen >= 7
              ? "RECEIPT_WAIT"
              : null
      if (issue) {
        exceptions.push({
          id: order.id,
          orderNumber: order.orderNumber,
          supplierName: order.supplier.name,
          locationName: order.location.name,
          status,
          issue,
          risk: isOverdue && daysOverdue > 7 ? "high" : "medium",
          orderDate: order.orderDate.toISOString(),
          expectedDeliveryDate: order.expectedDeliveryDate?.toISOString() ?? null,
          daysOpen,
          daysOverdue,
          totalValue: roundMetric(orderValue),
          openCommitmentValue: roundMetric(orderOpenCommitment),
          receiptRate: percentMetric(orderReceivedUnits, orderOrderedUnits),
        })
      }
    }
  }

  const supplierPerformance = Array.from(supplierMap.values())
    .map(entry => ({
      supplierId: entry.supplierId,
      name: entry.name,
      code: entry.code,
      orders: entry.orders,
      totalSpend: roundMetric(entry.totalSpend),
      openCommitmentValue: roundMetric(entry.openCommitmentValue),
      overdueOrders: entry.overdueOrders,
      receiptRate: percentMetric(entry.receivedUnits, entry.orderedUnits),
      onTimeRate: percentMetric(entry.onTimeOrders, entry.onTimeSampleSize),
      onTimeSampleSize: entry.onTimeSampleSize,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, input.topSuppliersLimit ?? 5)

  const approvalAverage = approvalHours.length
    ? approvalHours.reduce((sum, value) => sum + value, 0) / approvalHours.length
    : 0
  const completedOrders = orders.filter(order => order.status === "RECEIVED" || order.status === "COMPLETED").length
  const cancelledOrders = orders.filter(order => order.status === "CANCELLED").length
  const expectedDeliverySample = activeOrders.filter(order => order.expectedDeliveryDate).length
  const approvalEvidencePopulation = orders.filter(order =>
    ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED"].includes(order.status),
  )
  const deliveryEvidencePopulation = orders.filter(order => order.status === "RECEIVED" || order.status === "COMPLETED")
  const deliveryEvidenceCount = deliveryEvidencePopulation.filter(order =>
    Boolean(order.actualDeliveryDate || order.goodsReceipts.length),
  ).length

  exceptions.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === "high" ? -1 : 1
    return b.daysOverdue - a.daysOverdue || b.daysOpen - a.daysOpen
  })

  return {
    generatedAt: now.toISOString(),
    currency: organization?.currency?.trim().toUpperCase() || "XAF",
    period: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    totals: {
      orders: orders.length,
      activeOrders: activeOrders.length,
      totalSpend: roundMetric(totalSpend),
      averageOrderValue: roundMetric(activeOrders.length ? totalSpend / activeOrders.length : 0),
      openCommitmentValue: roundMetric(openCommitmentValue),
      overdueOrders,
      overdueValue: roundMetric(overdueValue),
      orderedUnits: roundMetric(orderedUnits, 3),
      receivedUnits: roundMetric(receivedUnits, 3),
      receiptRate: percentMetric(receivedUnits, orderedUnits),
      cancellationRate: percentMetric(cancelledOrders, orders.length),
      completionRate: percentMetric(completedOrders, activeOrders.length),
      onTimeRate: percentMetric(onTimeOrders, onTimeSampleSize),
      onTimeSampleSize,
      supplierConcentrationRate: percentMetric(supplierPerformance[0]?.totalSpend ?? 0, totalSpend),
      approvalCycle: {
        averageHours: roundMetric(approvalAverage, 1),
        medianHours: roundMetric(percentile(approvalHours, 0.5), 1),
        p90Hours: roundMetric(percentile(approvalHours, 0.9), 1),
        sampleSize: approvalHours.length,
      },
    },
    monthly: Array.from(monthlyMap.entries()).map(([month, value]) => ({
      month,
      orderCount: value.orderCount,
      totalSpend: roundMetric(value.totalSpend),
      receivedOrders: value.receivedOrders,
    })),
    statusBreakdown: ANALYTICS_STATUS_ORDER.map(status => ({
      status,
      orders: statusMap.get(status)!.orders,
      totalValue: roundMetric(statusMap.get(status)!.totalValue),
    })),
    supplierPerformance,
    locationPerformance: Array.from(locationMap.values())
      .map(entry => ({
        locationId: entry.locationId,
        name: entry.name,
        orders: entry.orders,
        totalSpend: roundMetric(entry.totalSpend),
        openCommitmentValue: roundMetric(entry.openCommitmentValue),
        overdueOrders: entry.overdueOrders,
        receiptRate: percentMetric(entry.receivedUnits, entry.orderedUnits),
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend),
    itemPerformance: Array.from(itemMap.values())
      .map(entry => ({
        ...entry,
        orderedUnits: roundMetric(entry.orderedUnits, 3),
        receivedUnits: roundMetric(entry.receivedUnits, 3),
        totalSpend: roundMetric(entry.totalSpend),
        receiptRate: percentMetric(entry.receivedUnits, entry.orderedUnits),
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10),
    aging: Array.from(agingMap.entries()).map(([bucket, value]) => ({
      bucket,
      orders: value.orders,
      openCommitmentValue: roundMetric(value.openCommitmentValue),
    })),
    exceptions: exceptions.slice(0, 12),
    dataQuality: {
      expectedDeliveryCoverage: percentMetric(expectedDeliverySample, activeOrders.length),
      approvalEvidenceCoverage: percentMetric(
        approvalEvidencePopulation.filter(order => order.approvedAt).length,
        approvalEvidencePopulation.length,
      ),
      deliveryEvidenceCoverage: percentMetric(deliveryEvidenceCount, deliveryEvidencePopulation.length),
      expectedDeliverySampleSize: activeOrders.length,
      approvalEvidenceSampleSize: approvalEvidencePopulation.length,
      deliveryEvidenceSampleSize: deliveryEvidencePopulation.length,
    },
  }
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
