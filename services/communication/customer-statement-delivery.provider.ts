import { Resend } from "resend"

import type { CustomerStatementDeliveryChannel } from "@prisma/client"

type ProviderEnvironment = Record<string, string | undefined>

export type CustomerStatementProviderInput = {
  channel: CustomerStatementDeliveryChannel
  destination: string
  accessUrl: string
  statementNumber: string
  closingBalance: string
  currency: string
  businessName: string
  locale: "EN" | "FR"
  referralCode: string
}

export type CustomerStatementProviderResult = {
  status: "SENT" | "DEFERRED" | "FAILED"
  providerReference?: string
  retryable: boolean
  message: string
}

const LIVE_VALUES = new Set(["1", "true", "yes", "on"])

function enabled(value?: string) {
  return LIVE_VALUES.has(String(value ?? "").trim().toLowerCase())
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function emailCopy(input: CustomerStatementProviderInput) {
  const french = input.locale === "FR"
  const title = french
    ? `Relevé client ${input.statementNumber}`
    : `Customer statement ${input.statementNumber}`
  const intro = french
    ? `${input.businessName} vous a envoyé un relevé client sécurisé.`
    : `${input.businessName} sent you a secure customer statement.`
  const action = french ? "Consulter le relevé" : "View statement"
  const balance = french ? "Solde de clôture" : "Closing balance"
  return {
    subject: title + " — " + input.businessName,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.5"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(intro)}</p><p><strong>${escapeHtml(balance)}:</strong> ${escapeHtml(input.closingBalance)} ${escapeHtml(input.currency)}</p><p><a href="${escapeHtml(input.accessUrl)}" style="background:#0f766e;color:white;padding:12px 18px;text-decoration:none;border-radius:6px">${escapeHtml(action)}</a></p><p style="color:#64748b;font-size:12px">Powered by Stoquify · ${escapeHtml(input.referralCode)}</p></body></html>`,
  }
}

async function sendEmail(
  input: CustomerStatementProviderInput,
  environment: ProviderEnvironment,
): Promise<CustomerStatementProviderResult> {
  const apiKey = environment.RESEND_API_KEY?.trim()
  const from = environment.RESEND_FROM_EMAIL?.trim()
  if (
    !enabled(environment.STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS) ||
    !apiKey ||
    !from
  ) {
    return {
      status: "DEFERRED",
      retryable: false,
      message: "Statement email delivery is disabled or not fully configured.",
    }
  }

  try {
    const resend = new Resend(apiKey)
    const copy = emailCopy(input)
    const { data, error } = await resend.emails.send({
      from,
      to: input.destination,
      subject: copy.subject,
      html: copy.html,
    })
    if (error) {
      return {
        status: "FAILED",
        retryable: true,
        message: "Statement email provider rejected the request.",
      }
    }
    return {
      status: "SENT",
      providerReference: data?.id,
      retryable: false,
      message: "Statement email was accepted by the provider.",
    }
  } catch {
    return {
      status: "FAILED",
      retryable: true,
      message: "Statement email provider is temporarily unavailable.",
    }
  }
}

function whatsAppPayload(
  input: CustomerStatementProviderInput,
  environment: ProviderEnvironment,
) {
  return {
    messaging_product: "whatsapp",
    to: input.destination.replace(/^\+/, ""),
    type: "template",
    template: {
      name:
        environment.WHATSAPP_STATEMENT_TEMPLATE_NAME?.trim() ||
        "stoquify_customer_statement",
      language: {
        code:
          environment.WHATSAPP_STATEMENT_TEMPLATE_LANGUAGE?.trim() ||
          (input.locale === "FR" ? "fr" : "en"),
      },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: input.businessName },
            { type: "text", text: input.statementNumber },
            {
              type: "text",
              text: input.closingBalance + " " + input.currency,
            },
            { type: "text", text: input.accessUrl },
          ],
        },
      ],
    },
  }
}

function whatsAppReference(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined
  const messages = (payload as { messages?: unknown }).messages
  if (!Array.isArray(messages)) return undefined
  const first = messages[0]
  if (!first || typeof first !== "object") return undefined
  const id = (first as { id?: unknown }).id
  return typeof id === "string" ? id : undefined
}

async function sendWhatsApp(
  input: CustomerStatementProviderInput,
  environment: ProviderEnvironment,
  fetcher: typeof globalThis.fetch,
): Promise<CustomerStatementProviderResult> {
  const phoneNumberId = environment.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = environment.WHATSAPP_ACCESS_TOKEN?.trim()
  if (
    !enabled(environment.STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS) ||
    !phoneNumberId ||
    !accessToken
  ) {
    return {
      status: "DEFERRED",
      retryable: false,
      message: "Statement WhatsApp delivery is disabled or not fully configured.",
    }
  }

  try {
    const apiVersion =
      environment.WHATSAPP_CLOUD_API_VERSION?.trim() || "v20.0"
    const response = await fetcher(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsAppPayload(input, environment)),
      },
    )
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        status: "FAILED",
        retryable: response.status >= 500 || response.status === 429,
        message: "Statement WhatsApp provider rejected the request.",
      }
    }
    return {
      status: "SENT",
      providerReference: whatsAppReference(payload),
      retryable: false,
      message: "Statement WhatsApp message was accepted by the provider.",
    }
  } catch {
    return {
      status: "FAILED",
      retryable: true,
      message: "Statement WhatsApp provider is temporarily unavailable.",
    }
  }
}

export async function sendCustomerStatementDelivery(
  input: CustomerStatementProviderInput,
  options: {
    environment?: ProviderEnvironment
    fetcher?: typeof globalThis.fetch
  } = {},
) {
  const environment = options.environment ?? process.env
  if (input.channel === "EMAIL") return sendEmail(input, environment)
  return sendWhatsApp(
    input,
    environment,
    options.fetcher ?? globalThis.fetch,
  )
}
