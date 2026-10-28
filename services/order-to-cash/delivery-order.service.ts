import "server-only"

import {
  AccountingSourceType,
  ComplianceAdapterEnvironment,
  FiscalDocumentType,
  LedgerEntryType,
  PaymentStatus,
  Prisma,
  SalesOrderChannel,
  SalesOrderStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { createCustomerLedgerEntry } from "@/services/accounting/customer-ledger.service"
import {
  CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
  ensurePostedCustomerReceivableDocumentInTx,
} from "@/services/accounting/customer-receivable-document.service"
import {
  postDeliveryGoodsIssueAccounting,
  postDeliveryInvoiceAccounting,
} from "@/services/accounting/postings/post-delivery-order"
import { createFiscalDocumentFromPostedSource } from "@/services/compliance/fiscal-document.service"
import { resolveEInvoicingMetadata } from "@/services/compliance/country-pack-hooks"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  postDeliveryOrderReservation,
  postDeliveryOrderStockIssue,
} from "@/services/inventory/inventory-stock-event.service"
import type {
  ConfirmDeliveryOrderInput,
  CreateDeliveryBillingOutcomeInput,
  CreateDeliveryOrderInput,
  PostDeliveryGoodsIssueInput,
} from "./delivery-order.schemas"

const DELIVERY_EVENT_SCHEMA_VERSION = 1

const deliveryOrderInclude = {
  customer: { select: { id: true, name: true, code: true } },
  location: { select: { id: true, name: true, allowNegativeStock: true } },
  organization: { select: { id: true, countryCode: true, currency: true } },
  lines: {
    include: {
      item: {
        select: {
          id: true,
          sku: true,
          nameEn: true,
          nameFr: true,
          costPrice: true,
          sellingPrice: true,
          trackInventory: true,
          trackSerialNumbers: true,
          trackBatches: true,
          trackExpiry: true,
          taxRate: { select: { rate: true } },
          inventoryLevels: {
            select: { locationId: true, averageCost: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  deliveryReservations: {
    include: { lines: { orderBy: { createdAt: "asc" as const } } },
    orderBy: { createdAt: "desc" as const },
  },
  deliveryGoodsIssues: {
    include: { lines: { orderBy: { createdAt: "asc" as const } } },
    orderBy: { createdAt: "desc" as const },
  },
  deliveryBillingOutcome: {
    include: { lines: { orderBy: { createdAt: "asc" as const } } },
  },
} satisfies Prisma.SalesOrderInclude

export type GovernedDeliveryOrder = Prisma.SalesOrderGetPayload<{
  include: typeof deliveryOrderInclude
}>

function decimal3(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(3)
}

function money(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function json(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function commandPayload(
  commandType: string,
  input: Record<string, unknown>,
) {
  return { commandType, schemaVersion: DELIVERY_EVENT_SCHEMA_VERSION, ...input }
}

async function replayedCommandSource(
  tx: Prisma.TransactionClient,
  organizationId: string,
  commandId: string,
  payload: Record<string, unknown>,
) {
  const existing = await tx.businessEvent.findUnique({
    where: {
      organizationId_eventSource_idempotencyKey: {
        organizationId,
        eventSource: "INTERNAL",
        idempotencyKey: commandId,
      },
    },
  })
  if (!existing) return null

  if (existing.payloadHash !== hashBusinessPayload(payload)) {
    await recordBusinessEventInTx(tx, {
      organizationId,
      eventType: existing.eventType,
      eventSource: "INTERNAL",
      schemaVersion: DELIVERY_EVENT_SCHEMA_VERSION,
      idempotencyKey: commandId,
      payload,
      sourceType: AccountingSourceType.DELIVERY_ORDER,
      sourceId: existing.sourceId ?? undefined,
    })
  }
  if (existing.status !== "APPLIED" || !existing.sourceId) {
    throw new ConflictError("Delivery command exists without an applied recoverable result")
  }
  return existing.sourceId
}

async function loadDeliveryOrderInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  salesOrderId: string,
) {
  const order = await tx.salesOrder.findFirst({
    where: {
      id: salesOrderId,
      organizationId,
      channel: SalesOrderChannel.DELIVERY,
      deletedAt: null,
    },
    include: deliveryOrderInclude,
  })
  if (!order) throw new NotFoundError("Tenant-scoped delivery order not found")
  return order
}

function assertVersion(order: GovernedDeliveryOrder, expectedVersion: number) {
  if (order.version !== expectedVersion) {
    throw new ConflictError("Delivery order changed; refresh before retrying the command")
  }
}

function assertSupportedInventoryItem(item: {
  trackInventory: boolean
  trackSerialNumbers: boolean
  trackBatches: boolean
  trackExpiry: boolean
}) {
  if (!item.trackInventory) {
    throw new BusinessRuleError("Delivery orders currently require inventory-tracked items")
  }
  if (item.trackSerialNumbers || item.trackBatches || item.trackExpiry) {
    throw new BusinessRuleError(
      "Lot, serial, batch, and expiry-controlled delivery items are not supported by this slice",
    )
  }
}

function deterministicNumber(prefix: string, organizationId: string, commandId: string) {
  return `${prefix}-${hashBusinessPayload({ organizationId, commandId }).slice(0, 14).toUpperCase()}`
}

async function recordCommandEvent(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId: string
    locationId: string
    salesOrderId: string
    commandId: string
    eventType: string
    payload: Record<string, unknown>
    outboxEventName: string
  },
) {
  return recordBusinessEventInTx(tx, {
    organizationId: input.organizationId,
    eventType: input.eventType,
    eventSource: "INTERNAL",
    schemaVersion: DELIVERY_EVENT_SCHEMA_VERSION,
    idempotencyKey: input.commandId,
    actorId: input.actorId,
    locationId: input.locationId,
    occurredAt: new Date(),
    sourceType: AccountingSourceType.DELIVERY_ORDER,
    sourceId: input.salesOrderId,
    payload: input.payload,
    metadata: { governedSlice: "delivery-order-to-cash-v1" },
    outboxMessages: [
      {
        channel: "NOTIFICATION",
        eventName: input.outboxEventName,
        payload: {
          salesOrderId: input.salesOrderId,
          commandId: input.commandId,
          eventType: input.eventType,
        },
      },
    ],
  })
}

async function auditDeliveryCommand(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId: string
    salesOrderId: string
    action: string
    eventId: string
    after: Record<string, unknown>
  },
) {
  return tx.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.actorId,
      entityType: "DeliveryOrder",
      entityId: input.salesOrderId,
      action: input.action,
      changes: json({ after: { ...input.after, businessEventId: input.eventId } }),
    },
  })
}

export async function createDeliveryOrder(input: CreateDeliveryOrderInput) {
  return db.$transaction(async (tx) => {
    const payload = commandPayload("CREATE_DELIVERY_ORDER", {
      commandId: input.commandId,
      customerId: input.customerId,
      locationId: input.locationId,
      dueDate: input.dueDate?.toISOString() ?? null,
      deliveryAddress: input.deliveryAddress ?? null,
      notes: input.notes ?? null,
      lines: input.lines,
    })
    const replayedSourceId = await replayedCommandSource(
      tx,
      input.organizationId,
      input.commandId,
      payload,
    )
    if (replayedSourceId) {
      return { order: await loadDeliveryOrderInTx(tx, input.organizationId, replayedSourceId), replayed: true }
    }

    const itemIds = input.lines.map((line) => line.itemId)
    if (new Set(itemIds).size !== itemIds.length) {
      throw new BusinessRuleError("Each delivery order item may appear only once")
    }
    const [customer, location, items] = await Promise.all([
      tx.customer.findFirst({
        where: { id: input.customerId, organizationId: input.organizationId, deletedAt: null },
        select: { id: true },
      }),
      tx.location.findFirst({
        where: { id: input.locationId, organizationId: input.organizationId, isActive: true, deletedAt: null },
        select: { id: true },
      }),
      tx.item.findMany({
        where: {
          id: { in: itemIds },
          organizationId: input.organizationId,
          isActive: true,
          isDiscontinued: false,
          deletedAt: null,
        },
        include: { taxRate: { select: { rate: true } } },
      }),
    ])
    if (!customer) throw new NotFoundError("Tenant-scoped customer not found")
    if (!location) throw new NotFoundError("Tenant-scoped delivery location not found")
    if (items.length !== itemIds.length) throw new NotFoundError("One or more tenant-scoped items were not found")
    const itemsById = new Map(items.map((item) => [item.id, item]))
    const lineData = input.lines.map((requested) => {
      const item = itemsById.get(requested.itemId)
      if (!item) throw new NotFoundError("Tenant-scoped delivery item not found")
      assertSupportedInventoryItem(item)
      const quantity = decimal3(requested.quantity)
      const unitPrice = money(item.sellingPrice)
      const taxRate = new Prisma.Decimal(item.taxRate?.rate ?? 0).toDecimalPlaces(3)
      const subtotal = unitPrice.mul(quantity).toDecimalPlaces(2)
      const taxAmount = subtotal.mul(taxRate).div(100).toDecimalPlaces(2)
      return {
        itemId: item.id,
        quantity,
        unitPrice,
        discount: new Prisma.Decimal(0),
        taxRate,
        taxAmount,
        lineTotal: subtotal.plus(taxAmount).toDecimalPlaces(2),
      }
    })
    const subtotal = lineData.reduce((sum, line) => sum.plus(line.unitPrice.mul(line.quantity)), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const taxAmount = lineData.reduce((sum, line) => sum.plus(line.taxAmount), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const total = subtotal.plus(taxAmount).toDecimalPlaces(2)
    const snapshotHash = hashBusinessPayload(
      lineData.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity.toFixed(3),
        unitPrice: line.unitPrice.toFixed(2),
        taxRate: line.taxRate.toFixed(3),
        taxAmount: line.taxAmount.toFixed(2),
        lineTotal: line.lineTotal.toFixed(2),
      })),
    )
    const now = new Date()
    const order = await tx.salesOrder.create({
      data: {
        organizationId: input.organizationId,
        customerId: input.customerId,
        locationId: input.locationId,
        createdById: input.actorId,
        orderNumber: deterministicNumber("DO", input.organizationId, input.commandId),
        channel: SalesOrderChannel.DELIVERY,
        status: SalesOrderStatus.DRAFT,
        paymentStatus: PaymentStatus.PENDING,
        orderDate: now,
        dueDate: input.dueDate ?? null,
        notes: input.notes ?? null,
        deliveryAddress: input.deliveryAddress ? json(input.deliveryAddress) : undefined,
        priceTaxSnapshotHash: snapshotHash,
        subtotal,
        taxAmount,
        shippingCost: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total,
        lines: { create: lineData },
      },
      include: deliveryOrderInclude,
    })
    const event = await recordCommandEvent(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      locationId: input.locationId,
      salesOrderId: order.id,
      commandId: input.commandId,
      eventType: "delivery.order.created",
      payload,
      outboxEventName: "delivery.order.created",
    })
    await auditDeliveryCommand(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      salesOrderId: order.id,
      action: "DELIVERY_ORDER_CREATED",
      eventId: event.event.id,
      after: { orderNumber: order.orderNumber, total: total.toFixed(2), snapshotHash },
    })
    await markBusinessEventAppliedInTx(tx, input.organizationId, event.event.id)
    return { order, replayed: false }
  })
}

export async function confirmDeliveryOrder(input: ConfirmDeliveryOrderInput) {
  return db.$transaction(async (tx) => {
    const payload = commandPayload("CONFIRM_DELIVERY_ORDER", {
      commandId: input.commandId,
      salesOrderId: input.salesOrderId,
      expectedVersion: input.expectedVersion,
    })
    const replayedSourceId = await replayedCommandSource(tx, input.organizationId, input.commandId, payload)
    if (replayedSourceId) {
      return { order: await loadDeliveryOrderInTx(tx, input.organizationId, replayedSourceId), replayed: true }
    }
    const order = await loadDeliveryOrderInTx(tx, input.organizationId, input.salesOrderId)
    assertVersion(order, input.expectedVersion)
    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BusinessRuleError("Only a draft delivery order can be confirmed")
    }
    order.lines.forEach((line) => assertSupportedInventoryItem(line.item))
    const reservationHash = hashBusinessPayload({
      salesOrderId: order.id,
      locationId: order.locationId,
      lines: order.lines.map((line) => ({ id: line.id, itemId: line.itemId, quantity: line.quantity.toFixed(3) })),
    })
    const event = await recordCommandEvent(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      locationId: order.locationId,
      salesOrderId: order.id,
      commandId: input.commandId,
      eventType: "delivery.order.confirmed",
      payload,
      outboxEventName: "delivery.order.confirmed",
    })
    const reservation = await tx.deliveryReservation.create({
      data: {
        organizationId: input.organizationId,
        salesOrderId: order.id,
        locationId: order.locationId,
        documentHash: reservationHash,
        commandEventId: event.event.id,
        createdById: input.actorId,
        lines: {
          create: order.lines.map((line) => ({
            organizationId: input.organizationId,
            salesOrderLineId: line.id,
            itemId: line.itemId,
            locationId: order.locationId,
            quantity: line.quantity,
          })),
        },
      },
    })
    await postDeliveryOrderReservation(
      {
        organizationId: input.organizationId,
        salesOrderId: order.id,
        orderNumber: order.orderNumber,
        locationId: order.locationId,
        actorId: input.actorId,
        idempotencyKey: `delivery-reservation:${input.commandId}`,
        lines: order.lines.map((line) => ({
          salesOrderLineId: line.id,
          itemId: line.itemId,
          quantity: line.quantity,
          unitCost: line.item.inventoryLevels.find((level) => level.locationId === order.locationId)?.averageCost ?? line.item.costPrice,
        })),
      },
      tx,
    )
    for (const line of order.lines) {
      await tx.salesOrderLine.update({ where: { id: line.id }, data: { reservedQuantity: line.quantity } })
    }
    const transition = await tx.salesOrder.updateMany({
      where: {
        id: order.id,
        organizationId: input.organizationId,
        channel: SalesOrderChannel.DELIVERY,
        status: SalesOrderStatus.DRAFT,
        version: input.expectedVersion,
      },
      data: {
        status: SalesOrderStatus.CONFIRMED,
        version: { increment: 1 },
        confirmedAt: new Date(),
        confirmedById: input.actorId,
      },
    })
    if (transition.count !== 1) throw new ConflictError("Delivery order changed during confirmation")
    await auditDeliveryCommand(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      salesOrderId: order.id,
      action: "DELIVERY_ORDER_CONFIRMED_AND_RESERVED",
      eventId: event.event.id,
      after: { reservationId: reservation.id, reservationHash, accountingImpact: "NONE" },
    })
    await markBusinessEventAppliedInTx(tx, input.organizationId, event.event.id)
    return { order: await loadDeliveryOrderInTx(tx, input.organizationId, order.id), replayed: false }
  })
}

export async function postDeliveryGoodsIssue(input: PostDeliveryGoodsIssueInput) {
  return db.$transaction(async (tx) => {
    const occurredAt = input.occurredAt ?? new Date()
    const payload = commandPayload("POST_DELIVERY_GOODS_ISSUE", {
      commandId: input.commandId,
      salesOrderId: input.salesOrderId,
      expectedVersion: input.expectedVersion,
      occurredAt: input.occurredAt?.toISOString() ?? null,
    })
    const replayedSourceId = await replayedCommandSource(tx, input.organizationId, input.commandId, payload)
    if (replayedSourceId) {
      return { order: await loadDeliveryOrderInTx(tx, input.organizationId, replayedSourceId), replayed: true }
    }
    const order = await loadDeliveryOrderInTx(tx, input.organizationId, input.salesOrderId)
    assertVersion(order, input.expectedVersion)
    if (order.status !== SalesOrderStatus.CONFIRMED) {
      throw new BusinessRuleError("Goods issue requires a confirmed delivery order")
    }
    const reservation = order.deliveryReservations.find((entry) => entry.status === "ACTIVE")
    if (!reservation || reservation.lines.length !== order.lines.length) {
      throw new ConflictError("Active full-order reservation evidence is missing")
    }
    if (order.deliveryGoodsIssues.some((entry) => entry.kind === "ISSUE")) {
      throw new ConflictError("Delivery goods issue already exists")
    }
    const issueNumber = deterministicNumber("GI", input.organizationId, input.commandId)
    const issueLines = order.lines.map((line) => {
      const reserved = reservation.lines.find((entry) => entry.salesOrderLineId === line.id)
      if (!reserved || !new Prisma.Decimal(reserved.quantity).eq(line.quantity)) {
        throw new ConflictError("Reservation quantity no longer matches the delivery order")
      }
      const unitCost = money(
        line.item.inventoryLevels.find((level) => level.locationId === order.locationId)?.averageCost ?? line.item.costPrice,
      )
      return { line, quantity: decimal3(line.quantity), unitCost, totalCost: unitCost.mul(line.quantity).toDecimalPlaces(2) }
    })
    const totalCost = issueLines.reduce((sum, line) => sum.plus(line.totalCost), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const documentHash = hashBusinessPayload({
      salesOrderId: order.id,
      reservationId: reservation.id,
      issueNumber,
      occurredAt: occurredAt.toISOString(),
      lines: issueLines.map(({ line, quantity, unitCost, totalCost: lineCost }) => ({
        salesOrderLineId: line.id,
        itemId: line.itemId,
        quantity: quantity.toFixed(3),
        unitCost: unitCost.toFixed(2),
        totalCost: lineCost.toFixed(2),
      })),
    })
    const event = await recordCommandEvent(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      locationId: order.locationId,
      salesOrderId: order.id,
      commandId: input.commandId,
      eventType: "delivery.order.goods_issue_posted",
      payload,
      outboxEventName: "delivery.order.goods_issue_posted",
    })
    const goodsIssue = await tx.deliveryGoodsIssue.create({
      data: {
        organizationId: input.organizationId,
        salesOrderId: order.id,
        locationId: order.locationId,
        issueNumber,
        documentHash,
        commandEventId: event.event.id,
        totalCost,
        issuedAt: occurredAt,
        issuedById: input.actorId,
        lines: {
          create: issueLines.map(({ line, quantity, unitCost, totalCost: lineCost }) => ({
            organizationId: input.organizationId,
            salesOrderLineId: line.id,
            itemId: line.itemId,
            locationId: order.locationId,
            quantity,
            unitCost,
            totalCost: lineCost,
          })),
        },
      },
    })
    const stock = await postDeliveryOrderStockIssue(
      {
        organizationId: input.organizationId,
        salesOrderId: order.id,
        goodsIssueId: goodsIssue.id,
        issueNumber,
        locationId: order.locationId,
        actorId: input.actorId,
        occurredAt,
        idempotencyKey: `delivery-goods-issue:${input.commandId}`,
        lines: issueLines.map(({ line, quantity, unitCost }) => ({
          salesOrderLineId: line.id,
          itemId: line.itemId,
          quantity,
          unitCost,
        })),
      },
      tx,
    )
    if (!money(stock.totalCost).eq(totalCost)) {
      throw new ConflictError("Inventory valuation does not tie to the goods-issue snapshot")
    }
    const accounting = await postDeliveryGoodsIssueAccounting(
      {
        organizationId: input.organizationId,
        salesOrderId: order.id,
        sourceId: goodsIssue.id,
        sourceNumber: issueNumber,
        actorId: input.actorId,
        postingDate: occurredAt,
        costAmount: totalCost,
        idempotencyKey: `delivery-goods-issue-accounting:${input.commandId}`,
      },
      tx,
    )
    await tx.deliveryGoodsIssue.update({
      where: { id: goodsIssue.id },
      data: {
        ledgerPostingBatchId: accounting.postingBatch.id,
        journalEntryId: accounting.journalEntry.id,
      },
    })
    for (const [index, issueLine] of issueLines.entries()) {
      await tx.deliveryGoodsIssueLine.updateMany({
        where: { goodsIssueId: goodsIssue.id, salesOrderLineId: issueLine.line.id },
        data: { inventoryTransactionId: stock.movementTransactionIds[index] ?? null },
      })
      await tx.salesOrderLine.update({
        where: { id: issueLine.line.id },
        data: { reservedQuantity: new Prisma.Decimal(0), deliveredQuantity: issueLine.quantity },
      })
    }
    for (const line of reservation.lines) {
      await tx.deliveryReservationLine.update({
        where: { id: line.id },
        data: { consumedQuantity: line.quantity },
      })
    }
    await tx.deliveryReservation.update({
      where: { id: reservation.id },
      data: { status: "CONSUMED", consumedAt: occurredAt, version: { increment: 1 } },
    })
    const transition = await tx.salesOrder.updateMany({
      where: {
        id: order.id,
        organizationId: input.organizationId,
        status: SalesOrderStatus.CONFIRMED,
        version: input.expectedVersion,
      },
      data: {
        status: SalesOrderStatus.DELIVERED,
        version: { increment: 1 },
        deliveredAt: occurredAt,
        deliveredById: input.actorId,
      },
    })
    if (transition.count !== 1) throw new ConflictError("Delivery order changed during goods issue")
    await auditDeliveryCommand(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      salesOrderId: order.id,
      action: "DELIVERY_GOODS_ISSUE_POSTED",
      eventId: event.event.id,
      after: {
        goodsIssueId: goodsIssue.id,
        documentHash,
        inventoryTransactionIds: stock.movementTransactionIds,
        totalCost: totalCost.toFixed(2),
        postingBatchId: accounting.postingBatch.id,
        journalEntryId: accounting.journalEntry.id,
      },
    })
    await markBusinessEventAppliedInTx(tx, input.organizationId, event.event.id)
    return { order: await loadDeliveryOrderInTx(tx, input.organizationId, order.id), replayed: false }
  })
}

function normalizeCountryCode(countryCode?: string | null) {
  const normalized = countryCode?.trim().toUpperCase()
  if (!normalized) return null
  if (/^[A-Z]{2}$/.test(normalized)) return normalized
  return null
}

function salesInvoiceAuthority(countryCode: string, issueDate: Date) {
  try {
    const metadata = resolveEInvoicingMetadata({ countryCode, date: issueDate })
    const supported = Array.isArray(metadata.capability.value.supportedDocumentTypes)
      ? metadata.capability.value.supportedDocumentTypes
      : []
    if (!supported.includes(FiscalDocumentType.SALES_INVOICE)) return null
    for (const raw of metadata.authorityChannels.value) {
      if (!raw || typeof raw !== "object") continue
      const channel = raw as Record<string, unknown>
      if (
        typeof channel.code === "string" &&
        Array.isArray(channel.supportedDocumentTypes) &&
        channel.supportedDocumentTypes.includes(FiscalDocumentType.SALES_INVOICE)
      ) {
        return {
          authorityChannel: channel.code,
          adapterKey: typeof channel.adapterKey === "string" ? channel.adapterKey : null,
        }
      }
    }
  } catch {
    return null
  }
  return null
}

async function createDeliveryFiscalInvoice(
  tx: Prisma.TransactionClient,
  input: {
    order: GovernedDeliveryOrder
    billingOutcomeId: string
    invoiceNumber: string
    actorId: string
    issueDate: Date
  },
) {
  const countryCode = normalizeCountryCode(input.order.organization.countryCode)
  if (!countryCode) return null
  const authority = salesInvoiceAuthority(countryCode, input.issueDate)
  if (!authority) return null
  return createFiscalDocumentFromPostedSource(
    {
      organizationId: input.order.organizationId,
      createdById: input.actorId,
      documentType: FiscalDocumentType.SALES_INVOICE,
      sourceType: AccountingSourceType.DELIVERY_INVOICE,
      sourceId: input.billingOutcomeId,
      sourceNumber: input.invoiceNumber,
      sourceDate: input.issueDate,
      issueDate: input.issueDate,
      countryCode,
      currency: input.order.organization.currency || "XAF",
      fiscalPeriodKey: "ANNUAL",
      sequenceScopeKey: `DELIVERY:${input.order.locationId}`,
      idempotencyKey: `delivery-invoice:${input.billingOutcomeId}:fiscal-document`,
      subtotal: money(input.order.subtotal).toFixed(2),
      taxAmount: money(input.order.taxAmount).toFixed(2),
      discountAmount: money(input.order.discount).toFixed(2),
      totalAmount: money(input.order.total).toFixed(2),
      lines: input.order.lines.map((line, index) => ({
        lineNumber: index + 1,
        sourceLineId: line.id,
        itemId: line.itemId,
        description: line.item.nameEn || line.item.nameFr || line.item.sku,
        quantity: decimal3(line.deliveredQuantity).toFixed(3),
        unitPrice: money(line.unitPrice).toFixed(2),
        discountAmount: money(line.discount).toFixed(2),
        taxRateBps: new Prisma.Decimal(line.taxRate).mul(100).toDecimalPlaces(0).toNumber(),
        taxCode: new Prisma.Decimal(line.taxRate).gt(0) ? "VAT" : null,
        taxAmount: money(line.taxAmount).toFixed(2),
        lineSubtotal: money(new Prisma.Decimal(line.unitPrice).mul(line.deliveredQuantity).minus(line.discount)).toFixed(2),
        lineTotal: money(line.lineTotal).toFixed(2),
        linePayload: { salesOrderLineId: line.id, deliveredQuantity: decimal3(line.deliveredQuantity).toFixed(3) },
      })),
      enqueueCertification: true,
      authorityChannel: authority.authorityChannel,
      adapterKey: authority.adapterKey,
      adapterEnvironment: ComplianceAdapterEnvironment.SANDBOX,
      metadata: {
        source: "DELIVERY_BILLING_OUTCOME",
        salesOrderId: input.order.id,
        statutoryEffect: "SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION",
      },
    },
    tx,
  )
}

export async function createDeliveryBillingOutcome(input: CreateDeliveryBillingOutcomeInput) {
  return db.$transaction(async (tx) => {
    const issuedAt = input.issuedAt ?? new Date()
    const payload = commandPayload("CREATE_DELIVERY_BILLING_OUTCOME", {
      commandId: input.commandId,
      salesOrderId: input.salesOrderId,
      expectedVersion: input.expectedVersion,
      issuedAt: input.issuedAt?.toISOString() ?? null,
    })
    const replayedSourceId = await replayedCommandSource(tx, input.organizationId, input.commandId, payload)
    if (replayedSourceId) {
      return { order: await loadDeliveryOrderInTx(tx, input.organizationId, replayedSourceId), replayed: true }
    }
    const order = await loadDeliveryOrderInTx(tx, input.organizationId, input.salesOrderId)
    assertVersion(order, input.expectedVersion)
    if (order.status !== SalesOrderStatus.DELIVERED) {
      throw new BusinessRuleError("Billing requires a delivered order")
    }
    if (order.deliveryBillingOutcome) throw new ConflictError("Delivery order is already billed")
    if (!money(order.shippingCost).eq(0)) {
      throw new BusinessRuleError("Delivery shipping-charge billing is not supported by this slice")
    }
    for (const line of order.lines) {
      if (!new Prisma.Decimal(line.deliveredQuantity).eq(line.quantity) || !new Prisma.Decimal(line.billedQuantity).eq(0)) {
        throw new ConflictError("Only fully delivered, unbilled quantities are eligible for billing")
      }
    }
    const invoiceNumber = deterministicNumber("INV", input.organizationId, input.commandId)
    const documentHash = hashBusinessPayload({
      salesOrderId: order.id,
      invoiceNumber,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      lines: order.lines.map((line) => ({
        salesOrderLineId: line.id,
        deliveredQuantity: line.deliveredQuantity.toFixed(3),
        unitPrice: line.unitPrice.toFixed(2),
        taxAmount: line.taxAmount.toFixed(2),
        lineTotal: line.lineTotal.toFixed(2),
      })),
      total: order.total.toFixed(2),
    })
    const event = await recordCommandEvent(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      locationId: order.locationId,
      salesOrderId: order.id,
      commandId: input.commandId,
      eventType: "delivery.order.billed",
      payload,
      outboxEventName: "delivery.order.billed",
    })
    const billing = await tx.deliveryBillingOutcome.create({
      data: {
        organizationId: input.organizationId,
        salesOrderId: order.id,
        invoiceNumber,
        currency: order.organization.currency || "XAF",
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        discountAmount: order.discount,
        totalAmount: order.total,
        documentHash,
        commandEventId: event.event.id,
        postedAt: issuedAt,
        postedById: input.actorId,
        lines: {
          create: order.lines.map((line) => ({
            organizationId: input.organizationId,
            salesOrderLineId: line.id,
            itemId: line.itemId,
            deliveredQuantity: line.deliveredQuantity,
            billedQuantity: line.deliveredQuantity,
            unitPrice: line.unitPrice,
            discountAmount: line.discount,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
            lineTotal: line.lineTotal,
          })),
        },
      },
    })
    const accounting = await postDeliveryInvoiceAccounting(
      {
        organizationId: input.organizationId,
        salesOrderId: order.id,
        sourceId: billing.id,
        sourceNumber: invoiceNumber,
        actorId: input.actorId,
        postingDate: issuedAt,
        grossAmount: order.total,
        netAmount: new Prisma.Decimal(order.total).minus(order.taxAmount).toDecimalPlaces(2),
        taxAmount: order.taxAmount,
        idempotencyKey: `delivery-invoice-accounting:${input.commandId}`,
      },
      tx,
    )
    const receivable = await ensurePostedCustomerReceivableDocumentInTx(tx, {
      organizationId: input.organizationId,
      customerId: order.customerId,
      salesOrderId: order.id,
      actorId: input.actorId,
      issuedAt,
      initialUnpaidAmount: order.total,
      sourceEventId: event.event.id,
      metadata: { source: "DELIVERY_BILLING_OUTCOME", billingOutcomeId: billing.id },
    })
    const ledgerEntry = await createCustomerLedgerEntry(tx, {
      customerId: order.customerId,
      organizationId: input.organizationId,
      type: LedgerEntryType.SALE,
      debit: order.total,
      enforceCreditLimit: true,
      description: `Delivery invoice ${invoiceNumber}`,
      referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
      referenceId: receivable.document.id,
      entryDate: issuedAt,
    })
    const fiscalDocument = await createDeliveryFiscalInvoice(tx, {
      order,
      billingOutcomeId: billing.id,
      invoiceNumber,
      actorId: input.actorId,
      issueDate: issuedAt,
    })
    await tx.deliveryBillingOutcome.update({
      where: { id: billing.id },
      data: {
        customerReceivableDocumentId: receivable.document.id,
        customerLedgerEntryId: ledgerEntry.id,
        ledgerPostingBatchId: accounting.postingBatch.id,
        journalEntryId: accounting.journalEntry.id,
        fiscalDocumentId: fiscalDocument?.id ?? null,
      },
    })
    for (const line of order.lines) {
      await tx.salesOrderLine.update({ where: { id: line.id }, data: { billedQuantity: line.deliveredQuantity } })
    }
    const transition = await tx.salesOrder.updateMany({
      where: {
        id: order.id,
        organizationId: input.organizationId,
        status: SalesOrderStatus.DELIVERED,
        version: input.expectedVersion,
      },
      data: { status: SalesOrderStatus.COMPLETED, version: { increment: 1 }, paymentStatus: PaymentStatus.PENDING },
    })
    if (transition.count !== 1) throw new ConflictError("Delivery order changed during billing")
    await auditDeliveryCommand(tx, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      salesOrderId: order.id,
      action: "DELIVERY_BILLING_OUTCOME_POSTED",
      eventId: event.event.id,
      after: {
        billingOutcomeId: billing.id,
        invoiceNumber,
        documentHash,
        receivableDocumentId: receivable.document.id,
        customerLedgerEntryId: ledgerEntry.id,
        postingBatchId: accounting.postingBatch.id,
        journalEntryId: accounting.journalEntry.id,
        fiscalDocumentId: fiscalDocument?.id ?? null,
      },
    })
    await markBusinessEventAppliedInTx(tx, input.organizationId, event.event.id)
    return { order: await loadDeliveryOrderInTx(tx, input.organizationId, order.id), replayed: false }
  })
}

export async function getDeliveryOrder(organizationId: string, salesOrderId: string) {
  return loadDeliveryOrderInTx(db as unknown as Prisma.TransactionClient, organizationId, salesOrderId)
}
