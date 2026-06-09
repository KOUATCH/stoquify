import type { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { moneyToNumber } from "./money"
import {
  getSalesReceiptSchema,
  salesReceiptLookupSchema,
  sendReceiptServiceSchema,
  type ReceiptChannel,
  type ReceiptLocale,
  type SendReceiptServiceInput,
} from "./pos.schemas"

export type ReceiptDeliveryStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED"

export type SalesReceiptPayload = {
  receipt: {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    customerPhone: string
    total: number
    subtotal: number
    tax: number
    taxRate: number
    discount: number
    paymentMethod: string
    paymentStatus: string
    cashier: string
    terminal: string
    sessionNumber: string
    locale: ReceiptLocale
    createdAt: string
    items: Array<{
      id: string
      name: string
      sku: string
      quantity: number
      unitPrice: number
      totalPrice: number
      taxRate: number
    }>
    payments: Array<{
      id: string
      paymentNumber: string
      method: string
      amount: number
      status: string
      cashTendered?: number
      changeGiven?: number
      createdAt: string
    }>
  }
  business: {
    name: string
    address: string
    city: string
    phone: string
    email: string
    website: string
    taxId: string
    currency: string
  }
  location: {
    name: string
    address: string
    city: string
    phone: string
  }
  generatedAt: string
  digitalReceiptUrl: string
}

export type ReceiptDeliveryResult = {
  channel: ReceiptChannel
  status: ReceiptDeliveryStatus
  destination?: string
  providerReference?: string
  retryable: boolean
  message: string
  digitalReceiptUrl: string
}

export type ReceiptDeliveryProviderInput = {
  receipt: SalesReceiptPayload
  destination?: string
  locale: ReceiptLocale
}

export interface ReceiptDeliveryProvider {
  sendPrintReceipt(input: ReceiptDeliveryProviderInput): Promise<ReceiptDeliveryResult>
  sendEmailReceipt(input: ReceiptDeliveryProviderInput): Promise<ReceiptDeliveryResult>
  sendSmsReceipt(input: ReceiptDeliveryProviderInput): Promise<ReceiptDeliveryResult>
  sendWhatsAppReceipt(input: ReceiptDeliveryProviderInput): Promise<ReceiptDeliveryResult>
}

class StubReceiptDeliveryProvider implements ReceiptDeliveryProvider {
  async sendPrintReceipt(input: ReceiptDeliveryProviderInput): Promise<ReceiptDeliveryResult> {
    return this.pending("PRINT", input)
  }

  async sendEmailReceipt(input: ReceiptDeliveryProviderInput): Promise<ReceiptDeliveryResult> {
    return this.pending("EMAIL", input)
  }

  async sendSmsReceipt(input: ReceiptDeliveryProviderInput): Promise<ReceiptDeliveryResult> {
    return this.pending("SMS", input)
  }

  async sendWhatsAppReceipt(input: ReceiptDeliveryProviderInput): Promise<ReceiptDeliveryResult> {
    return this.pending("WHATSAPP", input)
  }

  private async pending(
    channel: Exclude<ReceiptChannel, "NONE">,
    input: ReceiptDeliveryProviderInput,
  ): Promise<ReceiptDeliveryResult> {
    return {
      channel,
      status: "PENDING",
      destination: input.destination,
      providerReference: `stub-${channel.toLowerCase()}-${Date.now()}`,
      retryable: false,
      message: `${channel} receipt provider is not configured; delivery attempt was recorded.`,
      digitalReceiptUrl: input.receipt.digitalReceiptUrl,
    }
  }
}

const defaultReceiptProvider = new StubReceiptDeliveryProvider()

function displayName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || fallback || "Cashier"
}

function digitalReceiptUrl(salesOrderId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
  return baseUrl ? `${baseUrl}/digital-receipt/${salesOrderId}` : `/digital-receipt/${salesOrderId}`
}

function normalizePhoneNumber(raw?: string | null) {
  if (!raw) return null
  const trimmed = raw.trim()
  const digits = trimmed.replace(/[^\d]/g, "")

  if (digits.length < 8) return null
  return `+${digits}`
}

function tenderLabel(method: string) {
  return method === "CREDIT" ? "ON_ACCOUNT" : method
}

function cleanJson(input: Record<string, unknown>): Prisma.JsonObject {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Prisma.JsonObject
}

async function findSalesReceipt(salesOrderId: string, organizationId?: string): Promise<SalesReceiptPayload> {
  const sale = await db.salesOrder.findFirst({
    where: {
      id: salesOrderId,
      deletedAt: null,
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          address: true,
          country: true,
          state: true,
          currency: true,
          slug: true,
          defaultLocale: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          email: true,
        },
      },
      terminal: {
        select: {
          id: true,
          name: true,
          terminalNumber: true,
        },
      },
      session: {
        select: {
          id: true,
          sessionNumber: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          preferredLocale: true,
          currentBalance: true,
        },
      },
      lines: {
        include: {
          item: {
            select: {
              id: true,
              nameEn: true,
              nameFr: true,
              sku: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      payments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          paymentNumber: true,
          method: true,
          amount: true,
          status: true,
          cashTendered: true,
          changeGiven: true,
          createdAt: true,
        },
      },
    },
  })

  if (!sale || sale.status === "DRAFT" || sale.status === "CANCELLED") {
    throw new Error("Receipt not found")
  }

  const locale = (sale.customer?.preferredLocale || sale.organization.defaultLocale || "EN") as ReceiptLocale
  const cashier = sale.session?.user
    ? displayName(sale.session.user.firstName, sale.session.user.lastName, sale.session.user.email)
    : displayName(sale.createdBy?.firstName, sale.createdBy?.lastName, sale.createdBy?.email)
  const primaryPayment = sale.payments[0]
  const firstTaxRate = sale.lines.find((line) => moneyToNumber(line.taxRate) > 0)?.taxRate

  return {
    receipt: {
      id: sale.id,
      orderNumber: sale.orderNumber,
      customerName: sale.customer.name,
      customerEmail: sale.customer.email || "",
      customerPhone: sale.customer.phone || "",
      total: moneyToNumber(sale.total),
      subtotal: moneyToNumber(sale.subtotal),
      tax: moneyToNumber(sale.taxAmount),
      taxRate: moneyToNumber(firstTaxRate),
      discount: moneyToNumber(sale.discount),
      paymentMethod: primaryPayment ? tenderLabel(primaryPayment.method) : sale.paymentStatus,
      paymentStatus: sale.paymentStatus,
      cashier,
      terminal: sale.terminal?.terminalNumber || sale.terminal?.name || "",
      sessionNumber: sale.session?.sessionNumber || "",
      locale,
      createdAt: sale.orderDate.toISOString(),
      items: sale.lines.map((line) => ({
        id: line.id,
        name: locale === "FR" ? line.item.nameFr || line.item.nameEn : line.item.nameEn,
        sku: line.item.sku,
        quantity: moneyToNumber(line.quantity),
        unitPrice: moneyToNumber(line.unitPrice),
        totalPrice: moneyToNumber(line.lineTotal),
        taxRate: moneyToNumber(line.taxRate),
      })),
      payments: sale.payments.map((payment) => ({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        method: tenderLabel(payment.method),
        amount: moneyToNumber(payment.amount),
        status: payment.status,
        cashTendered: payment.cashTendered ? moneyToNumber(payment.cashTendered) : undefined,
        changeGiven: payment.changeGiven ? moneyToNumber(payment.changeGiven) : undefined,
        createdAt: payment.createdAt.toISOString(),
      })),
    },
    business: {
      name: sale.organization.name,
      address: sale.organization.address || "",
      city: [sale.organization.state, sale.organization.country].filter(Boolean).join(", "),
      phone: sale.location.phone || "",
      email: sale.location.email || "",
      website: "",
      taxId: "",
      currency: sale.organization.currency,
    },
    location: {
      name: sale.location.name,
      address: sale.location.address || "",
      city: "",
      phone: sale.location.phone || "",
    },
    generatedAt: new Date().toISOString(),
    digitalReceiptUrl: digitalReceiptUrl(sale.id),
  }
}

async function recordDeliveryAudit(
  input: SendReceiptServiceInput,
  receipt: SalesReceiptPayload,
  result: ReceiptDeliveryResult,
) {
  await db.auditLog.create({
    data: {
      entityType: "SalesOrder",
      entityId: input.salesOrderId,
      action: `RECEIPT_${input.channel}`,
      organizationId: input.organizationId,
      userId: input.userId,
      changes: cleanJson({
        channel: result.channel,
        status: result.status,
        destination: result.destination,
        providerReference: result.providerReference,
        retryable: result.retryable,
        message: result.message,
        orderNumber: receipt.receipt.orderNumber,
        digitalReceiptUrl: receipt.digitalReceiptUrl,
      }),
    },
  })
}

export async function getSalesReceipt(rawInput: unknown): Promise<SalesReceiptPayload> {
  const input = getSalesReceiptSchema.parse(rawInput)
  return findSalesReceipt(input.salesOrderId, input.organizationId)
}

export async function getPublicSalesReceipt(rawInput: unknown): Promise<SalesReceiptPayload> {
  const input = salesReceiptLookupSchema.parse(rawInput)
  const receipt = await findSalesReceipt(input.salesOrderId)

  return {
    ...receipt,
    receipt: {
      ...receipt.receipt,
      customerEmail: "",
      customerPhone: "",
    },
  }
}

export async function sendReceipt(
  rawInput: unknown,
  provider: ReceiptDeliveryProvider = defaultReceiptProvider,
): Promise<ReceiptDeliveryResult> {
  const input = sendReceiptServiceSchema.parse(rawInput)
  const receipt = await findSalesReceipt(input.salesOrderId, input.organizationId)
  const locale = input.locale || receipt.receipt.locale

  if (input.channel === "NONE") {
    const result: ReceiptDeliveryResult = {
      channel: "NONE",
      status: "SKIPPED",
      retryable: false,
      message: "Receipt delivery skipped by cashier.",
      digitalReceiptUrl: receipt.digitalReceiptUrl,
    }
    await recordDeliveryAudit(input, receipt, result)
    return result
  }

  const destination = input.channel === "WHATSAPP"
    ? normalizePhoneNumber(input.destination || receipt.receipt.customerPhone) || undefined
    : input.destination

  if (input.channel === "WHATSAPP" && !destination) {
    const result: ReceiptDeliveryResult = {
      channel: "WHATSAPP",
      status: "FAILED",
      retryable: false,
      message: "A valid customer phone number is required for WhatsApp receipt delivery.",
      digitalReceiptUrl: receipt.digitalReceiptUrl,
    }
    await recordDeliveryAudit(input, receipt, result)
    throw new Error(result.message)
  }

  const providerInput = { receipt, destination, locale }
  const result =
    input.channel === "WHATSAPP"
      ? await provider.sendWhatsAppReceipt(providerInput)
      : input.channel === "SMS"
        ? await provider.sendSmsReceipt(providerInput)
        : input.channel === "EMAIL"
          ? await provider.sendEmailReceipt(providerInput)
          : await provider.sendPrintReceipt(providerInput)

  await recordDeliveryAudit(input, receipt, result)
  return result
}
