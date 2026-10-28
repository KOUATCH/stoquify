"use server"

import { revalidateTag } from "next/cache"

import { logger } from "@/lib/logger"
import { protect } from "@/services/_shared/protect"
import {
  confirmDeliveryOrder,
  createDeliveryBillingOutcome,
  createDeliveryOrder,
  postDeliveryGoodsIssue,
} from "@/services/order-to-cash/delivery-order.service"
import {
  confirmDeliveryOrderSchema,
  createDeliveryBillingOutcomeSchema,
  createDeliveryOrderSchema,
  postDeliveryGoodsIssueSchema,
} from "@/services/order-to-cash/delivery-order.schemas"

const DELIVERY_ACTION_MODULE = {
  moduleSlug: "sales" as const,
  surfaceType: "action" as const,
  accessIntent: "write" as const,
  mode: "enforce" as const,
  audit: true,
}

function record(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {}
}

function revalidateDeliveryTags(locationId?: string) {
  const tags = [
    "sales-orders",
    "customer-orders",
    "customer-ar",
    "finance-dashboard",
    ...(locationId ? [`inventory-${locationId}`] : []),
  ]
  for (const tag of tags) {
    try {
      revalidateTag(tag)
    } catch (error) {
      logger.warn("Delivery order cache revalidation failed after a committed operation", {
        tag,
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }
}

export const createDeliveryOrderAction = protect(
  {
    permission: "sales.orders.create",
    auditResource: "DeliveryOrder",
    auditAllowed: true,
    tenantGuard: "handler-derived",
    module: {
      ...DELIVERY_ACTION_MODULE,
      surface: "actions/order-to-cash/delivery-order.actions.ts:createDeliveryOrderAction",
    },
  },
  async (input: unknown, ctx) => {
    const raw = record(input)
    const parsed = createDeliveryOrderSchema.parse({
      commandId: raw.commandId,
      customerId: raw.customerId,
      locationId: raw.locationId,
      dueDate: raw.dueDate,
      deliveryAddress: raw.deliveryAddress,
      notes: raw.notes,
      lines: raw.lines,
    })
    const result = await createDeliveryOrder({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
    revalidateDeliveryTags(parsed.locationId)
    return result
  },
)

export const confirmDeliveryOrderAction = protect(
  {
    permission: "sales.orders.update",
    auditResource: "DeliveryOrderConfirmation",
    auditAllowed: true,
    tenantGuard: "handler-derived",
    module: {
      ...DELIVERY_ACTION_MODULE,
      surface: "actions/order-to-cash/delivery-order.actions.ts:confirmDeliveryOrderAction",
    },
  },
  async (input: unknown, ctx) => {
    const raw = record(input)
    const parsed = confirmDeliveryOrderSchema.parse({
      commandId: raw.commandId,
      salesOrderId: raw.salesOrderId,
      expectedVersion: raw.expectedVersion,
    })
    const result = await confirmDeliveryOrder({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
    revalidateDeliveryTags(result.order.locationId)
    return result
  },
)

export const postDeliveryGoodsIssueAction = protect(
  {
    permission: "inventory.levels.adjust",
    auditResource: "DeliveryGoodsIssue",
    auditAllowed: true,
    tenantGuard: "handler-derived",
    module: {
      ...DELIVERY_ACTION_MODULE,
      surface: "actions/order-to-cash/delivery-order.actions.ts:postDeliveryGoodsIssueAction",
    },
  },
  async (input: unknown, ctx) => {
    const raw = record(input)
    const parsed = postDeliveryGoodsIssueSchema.parse({
      commandId: raw.commandId,
      salesOrderId: raw.salesOrderId,
      expectedVersion: raw.expectedVersion,
      occurredAt: raw.occurredAt,
    })
    const result = await postDeliveryGoodsIssue({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
    revalidateDeliveryTags(result.order.locationId)
    return result
  },
)

export const createDeliveryBillingOutcomeAction = protect(
  {
    permission: "accounting.journal.post",
    auditResource: "DeliveryBillingOutcome",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      ...DELIVERY_ACTION_MODULE,
      surface: "actions/order-to-cash/delivery-order.actions.ts:createDeliveryBillingOutcomeAction",
    },
  },
  async (input: unknown, ctx) => {
    const raw = record(input)
    const parsed = createDeliveryBillingOutcomeSchema.parse({
      commandId: raw.commandId,
      salesOrderId: raw.salesOrderId,
      expectedVersion: raw.expectedVersion,
      issuedAt: raw.issuedAt,
    })
    const result = await createDeliveryBillingOutcome({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
    revalidateDeliveryTags(result.order.locationId)
    return result
  },
)
