import { z } from "zod"

import { CAMEROON_PAYMENT_PROVIDER_CODES } from "@/services/regulatory/country-packs/cameroon.constants"

export const posLocationListSchema = z.object({})

export const receiptChannelSchema = z.enum(["PRINT", "EMAIL", "SMS", "WHATSAPP", "NONE"])
export const receiptLocaleSchema = z.enum(["EN", "FR"])

export const posTerminalListSchema = z.object({
  locationId: z.string().min(1).optional(),
})

export const activePOSSessionSchema = z.object({
  terminalId: z.string().min(1, "Terminal is required"),
})

export const openShiftSchema = z.object({
  terminalId: z.string().min(1, "Terminal is required"),
  locationId: z.string().min(1, "Location is required"),
  openingBalance: z.coerce.number().min(0, "Opening float cannot be negative").default(0),
  notes: z.string().trim().max(500).optional(),
})

export const closeShiftSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  actualBalance: z.coerce.number().min(0, "Closing count cannot be negative"),
  notes: z.string().trim().max(500).optional(),
})

export const posCatalogSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  search: z.string().trim().max(120).optional(),
  categoryId: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(120).default(48),
})

export const activeCartSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  terminalId: z.string().min(1, "Terminal is required"),
  sessionId: z.string().min(1).optional(),
})

export const addCartLineSchema = activeCartSchema.extend({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.coerce.number().positive("Quantity must be positive").default(1),
})

export const updateCartLineSchema = z.object({
  salesOrderId: z.string().min(1, "Cart is required"),
  lineId: z.string().min(1, "Line is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
})

export const removeCartLineSchema = z.object({
  salesOrderId: z.string().min(1, "Cart is required"),
  lineId: z.string().min(1, "Line is required"),
})

export const posTenderMethodSchema = z.enum([
  "CASH",
  "CARD",
  "MOBILE_MONEY",
  "BANK_TRANSFER",
  "STORE_CREDIT",
  "ON_ACCOUNT",
])

export const posTenderSchema = z.object({
  method: posTenderMethodSchema,
  amount: z.coerce.number().positive("Tender amount must be positive"),
  reference: z.string().trim().max(120).optional(),
  cardLast4: z.string().trim().regex(/^\d{4}$/).optional(),
  cardType: z.string().trim().max(40).optional(),
  authorizationCode: z.string().trim().max(80).optional(),
  mobileMoneyProvider: z.enum(CAMEROON_PAYMENT_PROVIDER_CODES).optional(),
  mobileMoneyPhoneNumber: z.string().trim().max(40).optional(),
  bankName: z.string().trim().max(120).optional(),
})

export const commitSaleReceiptSchema = z.object({
  channel: receiptChannelSchema.default("NONE"),
  destination: z.string().trim().min(1).optional(),
  locale: receiptLocaleSchema.optional(),
})

export const commitSaleSchema = z.object({
  salesOrderId: z.string().min(1, "Cart is required"),
  locationId: z.string().min(1, "Location is required"),
  terminalId: z.string().min(1, "Terminal is required"),
  sessionId: z.string().min(1, "Session is required"),
  customerId: z.string().min(1).optional(),
  tenders: z.array(posTenderSchema).min(1, "At least one tender is required"),
  notes: z.string().trim().max(500).optional(),
  receipt: commitSaleReceiptSchema.optional(),
})

export const refundPOSSaleSchema = z.object({
  salesOrderId: z.string().min(1, "Sale is required"),
  locationId: z.string().min(1, "Location is required"),
  terminalId: z.string().min(1, "Terminal is required"),
  sessionId: z.string().min(1, "Session is required"),
  reason: z.string().trim().min(3, "Refund reason is required").max(500),
  notes: z.string().trim().max(500).optional(),
})

export const voidPOSSaleSchema = z.object({
  salesOrderId: z.string().min(1, "Sale is required"),
  locationId: z.string().min(1, "Location is required"),
  terminalId: z.string().min(1, "Terminal is required"),
  sessionId: z.string().min(1, "Session is required"),
  reason: z.string().trim().min(3, "Void reason is required").max(500),
  notes: z.string().trim().max(500).optional(),
})

export const salesReceiptLookupSchema = z.object({
  salesOrderId: z.string().min(1, "Sales order is required"),
})

export const getSalesReceiptSchema = salesReceiptLookupSchema.extend({
  organizationId: z.string().min(1, "Organization is required"),
})

export const sendReceiptSchema = salesReceiptLookupSchema.extend({
  channel: receiptChannelSchema,
  destination: z.string().trim().min(1).optional(),
  locale: receiptLocaleSchema.optional(),
})

export const sendReceiptServiceSchema = sendReceiptSchema.extend({
  organizationId: z.string().min(1, "Organization is required"),
  userId: z.string().min(1, "User is required"),
})

export type SalesReceiptLookupInput = z.infer<typeof salesReceiptLookupSchema>
export type GetSalesReceiptInput = z.infer<typeof getSalesReceiptSchema>
export type ReceiptChannel = z.infer<typeof receiptChannelSchema>
export type ReceiptLocale = z.infer<typeof receiptLocaleSchema>
export type SendReceiptInput = z.infer<typeof sendReceiptSchema>
export type SendReceiptServiceInput = z.infer<typeof sendReceiptServiceSchema>
export type POSLocationListInput = z.infer<typeof posLocationListSchema>
export type POSTerminalListInput = z.infer<typeof posTerminalListSchema>
export type ActivePOSSessionInput = z.infer<typeof activePOSSessionSchema>
export type OpenShiftInput = z.infer<typeof openShiftSchema>
export type CloseShiftInput = z.infer<typeof closeShiftSchema>
export type POSCatalogInput = z.infer<typeof posCatalogSchema>
export type ActiveCartInput = z.infer<typeof activeCartSchema>
export type AddCartLineInput = z.infer<typeof addCartLineSchema>
export type UpdateCartLineInput = z.infer<typeof updateCartLineSchema>
export type RemoveCartLineInput = z.infer<typeof removeCartLineSchema>
export type POSTenderMethod = z.infer<typeof posTenderMethodSchema>
export type POSTenderInput = z.infer<typeof posTenderSchema>
export type CommitSaleInput = z.infer<typeof commitSaleSchema>
export type RefundPOSSaleInput = z.infer<typeof refundPOSSaleSchema>
export type VoidPOSSaleInput = z.infer<typeof voidPOSSaleSchema>
