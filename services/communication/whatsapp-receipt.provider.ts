import { createHash } from "node:crypto"
import type {
  ReceiptDeliveryProviderInput,
  ReceiptDeliveryResult,
} from "@/services/pos/receipt.service"

const WHATSAPP_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/
const LIVE_SEND_VALUES = new Set(["1", "true", "yes", "on"])

export class WhatsAppReceiptValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WhatsAppReceiptValidationError"
  }
}

type WhatsAppReceiptEnvironment = Partial<Record<string, string | undefined>>

export type WhatsAppReceiptConfigSnapshot = {
  liveSendsEnabled: boolean
  configured: boolean
  missing: string[]
  apiVersion: string
  templateName: string
  templateLanguage: string
  phoneNumberIdConfigured: boolean
  accessTokenConfigured: boolean
}

type WhatsAppReceiptRuntimeConfig = WhatsAppReceiptConfigSnapshot & {
  phoneNumberId?: string
  accessToken?: string
}

type WhatsAppFetch = (
  input: string | URL,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
  },
) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
}>

function enabled(value?: string) {
  return LIVE_SEND_VALUES.has(String(value ?? "").trim().toLowerCase())
}

function optionalTrim(value?: string) {
  const normalized = value?.trim()
  return normalized || undefined
}

function resolveWhatsAppReceiptRuntimeConfig(
  environment: WhatsAppReceiptEnvironment = process.env,
): WhatsAppReceiptRuntimeConfig {
  const liveSendsEnabled = enabled(environment.STOQUIFY_WHATSAPP_RECEIPT_LIVE_SENDS)
  const phoneNumberId = optionalTrim(environment.WHATSAPP_PHONE_NUMBER_ID)
  const accessToken = optionalTrim(environment.WHATSAPP_ACCESS_TOKEN)
  const templateName = optionalTrim(environment.WHATSAPP_RECEIPT_TEMPLATE_NAME) ?? "stoquify_receipt"
  const templateLanguage = optionalTrim(environment.WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE) ?? "en"
  const apiVersion = optionalTrim(environment.WHATSAPP_CLOUD_API_VERSION) ?? "v20.0"
  const missing = [
    phoneNumberId ? null : "WHATSAPP_PHONE_NUMBER_ID",
    accessToken ? null : "WHATSAPP_ACCESS_TOKEN",
    templateName ? null : "WHATSAPP_RECEIPT_TEMPLATE_NAME",
  ].filter(Boolean) as string[]

  return {
    liveSendsEnabled,
    configured: missing.length === 0,
    missing,
    apiVersion,
    templateName,
    templateLanguage,
    phoneNumberIdConfigured: Boolean(phoneNumberId),
    accessTokenConfigured: Boolean(accessToken),
    phoneNumberId,
    accessToken,
  }
}

export function describeWhatsAppReceiptConfig(
  environment: WhatsAppReceiptEnvironment = process.env,
): WhatsAppReceiptConfigSnapshot {
  const config = resolveWhatsAppReceiptRuntimeConfig(environment)
  return {
    liveSendsEnabled: config.liveSendsEnabled,
    configured: config.configured,
    missing: config.missing,
    apiVersion: config.apiVersion,
    templateName: config.templateName,
    templateLanguage: config.templateLanguage,
    phoneNumberIdConfigured: config.phoneNumberIdConfigured,
    accessTokenConfigured: config.accessTokenConfigured,
  }
}

export function normalizeWhatsAppPhoneNumber(destination?: string | null) {
  const compact = destination?.trim().replace(/[\s().-]/g, "")
  if (!compact) {
    throw new WhatsAppReceiptValidationError("WhatsApp receipt destination is required.")
  }

  const normalized = compact.startsWith("00") ? `+${compact.slice(2)}` : compact
  if (!WHATSAPP_PHONE_PATTERN.test(normalized)) {
    throw new WhatsAppReceiptValidationError(
      "WhatsApp receipt destination must be a valid international phone number.",
    )
  }

  return normalized
}

export function redactWhatsAppPhoneNumber(destination: string) {
  const normalized = normalizeWhatsAppPhoneNumber(destination)
  return `${normalized.slice(0, 4)}***${normalized.slice(-4)}`
}

export function hashWhatsAppDestination(destination: string) {
  const normalized = normalizeWhatsAppPhoneNumber(destination)
  return `sha256:${createHash("sha256").update(normalized).digest("hex")}`
}

function safeWhatsAppProviderMessage(status?: number) {
  if (!status) return "WhatsApp receipt delivery failed before the provider accepted the request."
  if (status >= 500) return "WhatsApp receipt provider is temporarily unavailable."
  return "WhatsApp receipt provider rejected the delivery request."
}

function receiptTotalText(input: ReceiptDeliveryProviderInput) {
  return `${input.receipt.receipt.total} ${input.receipt.business.currency}`
}

function buildWhatsAppTemplatePayload(input: ReceiptDeliveryProviderInput, to: string, config: WhatsAppReceiptRuntimeConfig) {
  return {
    messaging_product: "whatsapp",
    to: to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: input.receipt.receipt.orderNumber },
            { type: "text", text: receiptTotalText(input) },
            { type: "text", text: input.receipt.digitalReceiptUrl },
          ],
        },
      ],
    },
  }
}

function providerReferenceFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined
  const messages = (payload as { messages?: unknown }).messages
  if (!Array.isArray(messages)) return undefined
  const first = messages[0]
  if (!first || typeof first !== "object") return undefined
  const id = (first as { id?: unknown }).id
  return typeof id === "string" ? id : undefined
}

export async function sendWhatsAppReceipt(
  input: ReceiptDeliveryProviderInput,
  options: {
    environment?: WhatsAppReceiptEnvironment
    fetcher?: WhatsAppFetch
  } = {},
): Promise<ReceiptDeliveryResult> {
  const normalizedDestination = normalizeWhatsAppPhoneNumber(input.destination)
  const redactedDestination = redactWhatsAppPhoneNumber(normalizedDestination)
  const destinationHash = hashWhatsAppDestination(normalizedDestination)
  const config = resolveWhatsAppReceiptRuntimeConfig(options.environment)

  if (!config.liveSendsEnabled || !config.configured) {
    return {
      channel: "WHATSAPP",
      status: "PENDING",
      destination: redactedDestination,
      destinationHash,
      providerReference: "whatsapp-live-send-disabled",
      retryable: false,
      message: "WhatsApp live receipt sends are disabled or not fully configured; delivery attempt was recorded.",
      digitalReceiptUrl: input.receipt.digitalReceiptUrl,
    }
  }

  const fetcher = options.fetcher ?? globalThis.fetch
  if (!fetcher) {
    return {
      channel: "WHATSAPP",
      status: "FAILED",
      destination: redactedDestination,
      destinationHash,
      retryable: true,
      message: "WhatsApp receipt provider transport is unavailable.",
      digitalReceiptUrl: input.receipt.digitalReceiptUrl,
    }
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`
  const response = await fetcher(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildWhatsAppTemplatePayload(input, normalizedDestination, config)),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return {
      channel: "WHATSAPP",
      status: "FAILED",
      destination: redactedDestination,
      destinationHash,
      retryable: response.status >= 500 || response.status === 429,
      message: safeWhatsAppProviderMessage(response.status),
      digitalReceiptUrl: input.receipt.digitalReceiptUrl,
    }
  }

  return {
    channel: "WHATSAPP",
    status: "SENT",
    destination: redactedDestination,
    destinationHash,
    providerReference: providerReferenceFromPayload(payload),
    retryable: false,
    message: "WhatsApp receipt accepted by provider.",
    digitalReceiptUrl: input.receipt.digitalReceiptUrl,
  }
}
