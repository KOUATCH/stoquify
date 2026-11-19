import type { BusinessOutboxStatus, Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import {
  queueWhatsAppReceiptDeliveryInTx,
  WHATSAPP_RECEIPT_EVENT_NAME,
  WHATSAPP_RECEIPT_EVENT_TYPE,
  WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN,
  WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
  WHATSAPP_RECEIPT_RETRYABLE_REJECTION,
  whatsAppReceiptIdempotencyKey,
} from "@/services/communication/whatsapp-receipt-outbox.service"
import {
  describeWhatsAppReceiptConfig,
  hashWhatsAppDestination,
  normalizeWhatsAppPhoneNumber,
} from "@/services/communication/whatsapp-receipt.provider"
import type { ReceiptLocale } from "./pos.schemas"
import { issuePublicReceiptAccessToken } from "./public-receipt-token-registry.service"
import { isPublicReceiptTokenSigningConfigured } from "./public-receipt-token"
import { getPOSReceiptPrintPreview } from "./receipt.service"

type POSReceiptScope = {
  organizationId: string
  userId: string
  salesOrderId: string
  locationId: string
}

export type POSWhatsAppReceiptStatus = {
  reference: string
  status: "QUEUED" | "RETRYING" | "ACCEPTED" | "UNCERTAIN" | "FAILED" | "UNAVAILABLE"
}

type POSReceiptOutboxRow = {
  id: string
  idempotencyKey: string
  status: BusinessOutboxStatus
  lastErrorCode: string | null
}

function publicReceiptOrigin() {
  try {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "")
    if (appUrl.protocol === "https:" && appUrl.href === `${appUrl.origin}/`) return appUrl.origin
  } catch {
    // Missing or invalid origins disable the delivery option.
  }
  return null
}

export function getPOSWhatsAppReceiptCapability(organizationId: string) {
  const configuredOrganizationId = process.env.STOQUIFY_WHATSAPP_RECEIPT_ORGANIZATION_ID?.trim()
  const provider = describeWhatsAppReceiptConfig()
  return { available: Boolean(configuredOrganizationId && configuredOrganizationId === organizationId &&
    provider.liveSendsEnabled && provider.configured && publicReceiptOrigin() && isPublicReceiptTokenSigningConfigured()) }
}

async function requireCommittedReceiptSale(client: Prisma.TransactionClient, input: POSReceiptScope) {
  const commitment = await client.pOSCommitResult.findFirst({
    where: {
      organizationId: input.organizationId,
      actorId: input.userId,
      salesOrderId: input.salesOrderId,
      locationId: input.locationId,
      status: { in: ["COMMITTED", "COMPLETED"] },
      salesOrder: { is: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        channel: "POS",
        status: "COMPLETED",
        deletedAt: null,
        location: { is: { organizationId: input.organizationId, isActive: true, deletedAt: null } },
        customer: { is: { organizationId: input.organizationId } },
        terminal: { is: { organizationId: input.organizationId, locationId: input.locationId } },
        session: { is: { organizationId: input.organizationId, locationId: input.locationId, userId: input.userId } },
      } },
    },
    select: { id: true },
  })
  if (!commitment) throw new NotFoundError("Confirmed receipt is unavailable.")
}

async function getReceiptOutbox(client: Prisma.TransactionClient, input: POSReceiptScope) {
  const rows = await client.businessEventOutbox.findMany({
    where: {
      organizationId: input.organizationId,
      channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
      eventName: WHATSAPP_RECEIPT_EVENT_NAME,
      businessEvent: { is: {
        organizationId: input.organizationId,
        eventType: WHATSAPP_RECEIPT_EVENT_TYPE,
        sourceType: "POS_SALE",
        sourceId: input.salesOrderId,
      } },
    },
    select: { id: true, idempotencyKey: true, status: true, lastErrorCode: true },
    take: 2,
  })
  if (rows.length > 1) throw new ConflictError("Multiple receipt delivery requests need review.")
  return rows[0] ?? null
}

function toPOSStatus(row: Omit<POSReceiptOutboxRow, "idempotencyKey">): POSWhatsAppReceiptStatus {
  const reference = row.id
  switch (row.status) {
    case "SENT": return { reference, status: "ACCEPTED" }
    case "PENDING":
    case "LOCKED": return { reference, status: "QUEUED" }
    case "DEFERRED": return { reference, status: "UNAVAILABLE" }
    case "FAILED":
      return { reference, status: row.lastErrorCode === WHATSAPP_RECEIPT_RETRYABLE_REJECTION ? "RETRYING" : "UNCERTAIN" }
    default:
      return { reference, status: row.lastErrorCode === WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN ? "UNCERTAIN" : "FAILED" }
  }
}

/** Call with sale IDs selected by an authorized activity read in the same scope. */
export async function getPOSWhatsAppReceiptStatusesForScopedSales(
  client: Prisma.TransactionClient,
  organizationId: string,
  salesOrderIds: readonly string[],
) {
  const statuses = new Map<string, POSWhatsAppReceiptStatus["status"]>()
  if (salesOrderIds.length === 0) return statuses

  const rows = await client.businessEventOutbox.findMany({
    where: {
      organizationId,
      channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
      eventName: WHATSAPP_RECEIPT_EVENT_NAME,
      businessEvent: { is: {
        organizationId,
        eventType: WHATSAPP_RECEIPT_EVENT_TYPE,
        sourceType: "POS_SALE",
        sourceId: { in: [...salesOrderIds] },
      } },
    },
    select: { id: true, status: true, lastErrorCode: true, businessEvent: { select: { sourceId: true } } },
  })
  for (const row of rows) {
    const salesOrderId = row.businessEvent.sourceId
    if (!salesOrderId) continue
    statuses.set(salesOrderId, statuses.has(salesOrderId) ? "UNCERTAIN" : toPOSStatus(row).status)
  }
  return statuses
}

export async function getPOSWhatsAppReceiptStatus(input: POSReceiptScope) {
  await requireCommittedReceiptSale(db, input)
  const row = await getReceiptOutbox(db, input)
  return row ? toPOSStatus(row) : null
}

export async function queuePOSWhatsAppReceipt(input: POSReceiptScope & {
  destination: string
  locale: ReceiptLocale
  whatsAppCustomerOptInConfirmed: true
}): Promise<POSWhatsAppReceiptStatus> {
  if (input.whatsAppCustomerOptInConfirmed !== true) throw new BusinessRuleError("Confirm customer consent before requesting a WhatsApp receipt.")
  const origin = publicReceiptOrigin()
  if (!origin || !getPOSWhatsAppReceiptCapability(input.organizationId).available) throw new BusinessRuleError("WhatsApp receipt delivery is unavailable.")

  let destination: string
  try {
    destination = normalizeWhatsAppPhoneNumber(input.destination)
  } catch {
    throw new BusinessRuleError("Enter a valid international WhatsApp number.")
  }
  const key = whatsAppReceiptIdempotencyKey(input.salesOrderId, hashWhatsAppDestination(destination))

  return db.$transaction(async (tx) => {
    // Serialize this sale's receipt requests so changing the number cannot
    // create a second intent while the first request is being accepted.
    await tx.$queryRaw`SELECT id FROM sales_orders WHERE id = ${input.salesOrderId} AND "organizationId" = ${input.organizationId} AND "locationId" = ${input.locationId} FOR NO KEY UPDATE`
    await requireCommittedReceiptSale(tx, input)
    const existing = await getReceiptOutbox(tx, input)
    if (existing) {
      if (existing.idempotencyKey !== key) throw new ConflictError("A WhatsApp receipt request already exists for this sale.")
      return toPOSStatus(existing)
    }

    const receipt = await getPOSReceiptPrintPreview({
      organizationId: input.organizationId,
      locationId: input.locationId,
      locale: input.locale,
      selection: { salesOrderId: input.salesOrderId, actorId: input.userId },
    }, tx)
    if (receipt.certification.legalDeliveryBlocked) throw new BusinessRuleError("Fiscal review blocks delivery for this receipt.")

    const { token } = await issuePublicReceiptAccessToken({
      organizationId: input.organizationId,
      salesOrderId: input.salesOrderId,
      issuedById: input.userId,
    }, tx)
    const link = new URL(`/digital-receipt/${encodeURIComponent(input.salesOrderId)}`, origin)
    link.searchParams.set("token", token)
    await queueWhatsAppReceiptDeliveryInTx(tx, {
      receipt: { ...receipt, digitalReceiptUrl: link.href },
      destination,
      locale: input.locale,
      organizationId: input.organizationId,
      userId: input.userId,
    })
    const queued = await getReceiptOutbox(tx, input)
    if (!queued || queued.idempotencyKey !== key) throw new ConflictError("WhatsApp receipt request could not be confirmed.")
    await tx.auditLog.create({ data: {
      entityType: "SalesOrder",
      entityId: input.salesOrderId,
      action: "POS_WHATSAPP_RECEIPT_CONSENT_CONFIRMED",
      organizationId: input.organizationId,
      userId: input.userId,
      changes: { locationId: input.locationId, outboxId: queued.id, customerOptInConfirmed: true },
    } })
    return toPOSStatus(queued)
  })
}
