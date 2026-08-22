import { z } from "zod"

import { CAMEROON_PAYMENT_PROVIDER_CODES } from "@/services/regulatory/country-packs/cameroon.constants"
import {
  RECEIPT_CHANNELS,
  receiptChannelRequiresDestination,
  type ReceiptChannel as ReceiptChannelContract,
} from "./receipt-channels"

export const posLocationListSchema = z.object({})

export const receiptChannelSchema = z.enum(RECEIPT_CHANNELS)
export const receiptLocaleSchema = z.enum(["EN", "FR"])

export const posTerminalListSchema = z.object({
  locationId: z.string().min(1).optional(),
})

export const activePOSSessionSchema = z.object({
  terminalId: z.string().min(1, "Terminal is required").optional(),
})

export const openShiftSchema = z.object({
  terminalId: z.string().min(1, "Terminal is required"),
  locationId: z.string().min(1, "Location is required"),
  openingBalance: z.coerce.number().min(0, "Opening float cannot be negative").default(0),
  notes: z.string().trim().max(500).optional(),
})

const explicitClosingCountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(
    z
      .string()
      .min(1, "Closing count is required")
      .regex(
        /^\d{1,12}(?:\.\d{1,2})?$/,
        "Closing count must be a non-negative amount with no more than two decimal places",
      ),
  )

export const closeShiftSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  actualBalance: explicitClosingCountSchema,
  notes: z.string().trim().max(500).optional(),
})

export const posCatalogSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  search: z.string().trim().max(120).optional(),
  categoryId: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(120).default(48),
})

export const posCustomerListSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  search: z.string().trim().max(120).optional(),
  take: z.coerce.number().int().min(1).max(50).default(24),
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
  paymentTransactionId: z.string().trim().min(1).max(191).optional(),
  reference: z.string().trim().max(120).optional(),
  cardLast4: z.string().trim().regex(/^\d{4}$/).optional(),
  cardType: z.string().trim().max(40).optional(),
  authorizationCode: z.string().trim().max(80).optional(),
  mobileMoneyProvider: z.enum(CAMEROON_PAYMENT_PROVIDER_CODES).optional(),
  mobileMoneyPhoneNumber: z.string().trim().max(40).optional(),
  bankName: z.string().trim().max(120).optional(),
}).superRefine((tender, ctx) => {
  const electronic = ["CARD", "MOBILE_MONEY", "BANK_TRANSFER"].includes(tender.method)
  if (electronic && !tender.paymentTransactionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paymentTransactionId"],
      message: "Electronic tenders require provider-authoritative payment transaction evidence",
    })
  }
  if (!electronic && tender.paymentTransactionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paymentTransactionId"],
      message: "Provider payment transaction evidence is only valid for electronic tenders",
    })
  }
})

const receiptDestinationSchema = z.string().trim().max(320, "Receipt destination cannot exceed 320 characters").optional()

function validateReceiptDestination(
  value: { channel: ReceiptChannelContract; destination?: string; whatsAppCustomerOptInConfirmed?: boolean },
  ctx: z.RefinementCtx,
) {
  if (!receiptChannelRequiresDestination(value.channel)) return

  if (!value.destination?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["destination"],
      message:
        value.channel === "EMAIL"
          ? "Email receipt destination is required"
          : value.channel === "WHATSAPP"
            ? "WhatsApp receipt destination is required"
            : "SMS receipt destination is required",
    })
  }

  if (value.channel === "WHATSAPP" && value.whatsAppCustomerOptInConfirmed !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["whatsAppCustomerOptInConfirmed"],
      message: "WhatsApp receipt delivery requires explicit customer consent",
    })
  }
}

export const commitSaleReceiptSchema = z.object({
  channel: receiptChannelSchema.default("NONE"),
  destination: receiptDestinationSchema,
  locale: receiptLocaleSchema.optional(),
  whatsAppCustomerOptInConfirmed: z.boolean().optional(),
}).superRefine(validateReceiptDestination)

export const commitSaleSchema = z.object({
  clientCommitId: z.string()
    .trim()
    .min(8, "Commit identifier must be at least 8 characters")
    .max(191, "Commit identifier must not exceed 191 characters")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
      "Commit identifier contains unsupported characters",
    ),
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

const salesReceiptBaseSchema = z.object({
  salesOrderId: z.string().min(1, "Sales order is required"),
})

export const salesReceiptLookupSchema = salesReceiptBaseSchema.extend({
  receiptAccessToken: z.string().trim().min(1).max(2048).optional(),
})

export const getSalesReceiptSchema = salesReceiptBaseSchema.extend({
  organizationId: z.string().min(1, "Organization is required"),
})

export const sendReceiptSchema = salesReceiptBaseSchema.extend({
  channel: receiptChannelSchema,
  destination: receiptDestinationSchema,
  locale: receiptLocaleSchema.optional(),
  whatsAppCustomerOptInConfirmed: z.boolean().optional(),
}).superRefine(validateReceiptDestination)

export const sendReceiptServiceSchema = salesReceiptBaseSchema.extend({
  channel: receiptChannelSchema,
  destination: receiptDestinationSchema,
  locale: receiptLocaleSchema.optional(),
  whatsAppCustomerOptInConfirmed: z.boolean().optional(),
  organizationId: z.string().min(1, "Organization is required"),
  userId: z.string().min(1, "User is required"),
}).superRefine(validateReceiptDestination)

export const listPublicReceiptAccessTokensActionSchema = z.object({
  organizationId: z.string().trim().min(1).optional(),
  salesOrderId: z.string().trim().min(1, "Sales order is required"),
})

export const searchPublicReceiptSalesActionSchema = z.object({
  organizationId: z.string().trim().min(1).optional(),
  query: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(25).default(10),
  recentDays: z.coerce.number().int().min(1).max(120).default(30),
})

export const revokePublicReceiptAccessTokenActionSchema = z.object({
  organizationId: z.string().trim().min(1).optional(),
  tokenId: z.string().trim().min(1, "Receipt access token is required"),
  salesOrderId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(3, "Revocation reason is required").max(500).optional(),
})

export type SalesReceiptLookupInput = z.infer<typeof salesReceiptLookupSchema>
export type GetSalesReceiptInput = z.infer<typeof getSalesReceiptSchema>
export type ReceiptChannel = z.infer<typeof receiptChannelSchema>
export type ReceiptLocale = z.infer<typeof receiptLocaleSchema>
export type SendReceiptInput = z.infer<typeof sendReceiptSchema>
export type SendReceiptServiceInput = z.infer<typeof sendReceiptServiceSchema>
export type ListPublicReceiptAccessTokensActionInput = z.infer<
  typeof listPublicReceiptAccessTokensActionSchema
>
export type SearchPublicReceiptSalesActionInput = z.infer<
  typeof searchPublicReceiptSalesActionSchema
>
export type RevokePublicReceiptAccessTokenActionInput = z.infer<
  typeof revokePublicReceiptAccessTokenActionSchema
>
export type POSLocationListInput = z.infer<typeof posLocationListSchema>
export type POSTerminalListInput = z.infer<typeof posTerminalListSchema>
export type ActivePOSSessionInput = z.infer<typeof activePOSSessionSchema>
export type OpenShiftInput = z.infer<typeof openShiftSchema>
export type CloseShiftInput = z.infer<typeof closeShiftSchema>
export type POSCatalogInput = z.infer<typeof posCatalogSchema>
export type POSCustomerListInput = z.infer<typeof posCustomerListSchema>
export type ActiveCartInput = z.infer<typeof activeCartSchema>
export type AddCartLineInput = z.infer<typeof addCartLineSchema>
export type UpdateCartLineInput = z.infer<typeof updateCartLineSchema>
export type RemoveCartLineInput = z.infer<typeof removeCartLineSchema>
export type POSTenderMethod = z.infer<typeof posTenderMethodSchema>
export type POSTenderInput = z.infer<typeof posTenderSchema>
export type CommitSaleInput = z.infer<typeof commitSaleSchema>
export type RefundPOSSaleInput = z.infer<typeof refundPOSSaleSchema>
export type VoidPOSSaleInput = z.infer<typeof voidPOSSaleSchema>
