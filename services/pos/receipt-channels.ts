export const RECEIPT_DELIVERY_CHANNELS = ["PRINT", "EMAIL", "SMS", "WHATSAPP"] as const
export const RECEIPT_CHANNELS = [...RECEIPT_DELIVERY_CHANNELS, "NONE"] as const
export const RECEIPT_CHANNEL_UI_ORDER = ["NONE", ...RECEIPT_DELIVERY_CHANNELS] as const

export type DeliverableReceiptChannel = (typeof RECEIPT_DELIVERY_CHANNELS)[number]
export type ReceiptChannel = (typeof RECEIPT_CHANNELS)[number]
export type ReceiptDestinationKind = "none" | "email" | "phone"

const RECEIPT_DESTINATION_KIND = {
  NONE: "none",
  PRINT: "none",
  EMAIL: "email",
  SMS: "phone",
  WHATSAPP: "phone",
} as const satisfies Record<ReceiptChannel, ReceiptDestinationKind>

export function receiptDestinationKind(channel: ReceiptChannel): ReceiptDestinationKind {
  return RECEIPT_DESTINATION_KIND[channel]
}

export function receiptChannelRequiresDestination(channel: ReceiptChannel) {
  return receiptDestinationKind(channel) !== "none"
}

export function normalizeReceiptDestination(channel: ReceiptChannel, destination?: string | null) {
  if (!receiptChannelRequiresDestination(channel)) return undefined
  const normalized = destination?.trim()
  return normalized || undefined
}

export function receiptDeliveryProviderMethod(channel: DeliverableReceiptChannel) {
  switch (channel) {
    case "EMAIL":
      return "sendEmailReceipt"
    case "SMS":
      return "sendSmsReceipt"
    case "WHATSAPP":
      return "sendWhatsAppReceipt"
    case "PRINT":
      return "sendPrintReceipt"
  }
}
