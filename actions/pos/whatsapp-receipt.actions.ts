"use server"

import { z } from "zod"
import { protect } from "@/services/_shared/protect"
import {
  getPOSWhatsAppReceiptCapability,
  getPOSWhatsAppReceiptStatus,
  queuePOSWhatsAppReceipt,
} from "@/services/pos/whatsapp-receipt.service"

const options = {
  permission: "pos.use",
  auditResource: "POSWhatsAppReceipt",
  auditAllowed: false,
}
const posModule = { moduleSlug: "pos", surfaceType: "action", mode: "enforce" } as const

const receiptScope = z.object({
  salesOrderId: z.string().trim().min(1).max(120),
  locationId: z.string().trim().min(1).max(120),
}).strict()

const receiptRequest = receiptScope.extend({
  destination: z.string().trim().min(1).max(64),
  locale: z.enum(["EN", "FR"]),
  whatsAppCustomerOptInConfirmed: z.literal(true),
})

export const getPOSWhatsAppReceiptCapabilityAction = protect({
  ...options,
  module: { ...posModule, surface: "actions/pos/whatsapp-receipt.actions.ts:getPOSWhatsAppReceiptCapabilityAction", accessIntent: "read", audit: false },
}, async (_input: void, ctx) => getPOSWhatsAppReceiptCapability(ctx.orgId))

export const getPOSWhatsAppReceiptStatusAction = protect({
  ...options,
  module: { ...posModule, surface: "actions/pos/whatsapp-receipt.actions.ts:getPOSWhatsAppReceiptStatusAction", accessIntent: "read", audit: false },
}, async (input: unknown, ctx) => getPOSWhatsAppReceiptStatus({
  ...receiptScope.parse(input), organizationId: ctx.orgId, userId: ctx.userId,
}))

export const queuePOSWhatsAppReceiptAction = protect({
  ...options,
  module: { ...posModule, surface: "actions/pos/whatsapp-receipt.actions.ts:queuePOSWhatsAppReceiptAction", accessIntent: "write", audit: true },
}, async (input: unknown, ctx) => queuePOSWhatsAppReceipt({
  ...receiptRequest.parse(input), organizationId: ctx.orgId, userId: ctx.userId,
}))
