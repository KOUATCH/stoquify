import {
  AccountingSourceType,
  BusinessOutboxStatus,
  ComplianceAdapterEnvironment,
  FiscalDocumentType,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { db } from "@/prisma/db"
import { RegulatoryPackError } from "@/services/regulatory/country-packs/validation"
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"

import { resolveEInvoicingMetadata } from "./country-pack-hooks"
import { createFiscalDocumentFromPostedSource } from "./fiscal-document.service"

const FISCALIZATION_EVENT_NAME = "pos.sale.fiscalization.requested"
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  CAMEROON: "CM",
  CAMEROUN: "CM",
}

export const posFiscalizationRequestSchema = z
  .object({
    organizationId: z.string().trim().min(1),
    salesOrderId: z.string().trim().min(1),
    orderNumber: z.string().trim().min(1),
    actorId: z.string().trim().min(1),
    locationId: z.string().trim().min(1),
    terminalId: z.string().trim().min(1),
    postingBatchId: z.string().trim().min(1),
    issueAt: z.string().datetime(),
    sourcePayloadHash: z.string().trim().min(1),
  })
  .strict()

export type POSFiscalizationRequest = z.infer<
  typeof posFiscalizationRequestSchema
>

export type FiscalizationQueueSummary = {
  pending: number
  locked: number
  deferred: number
  failed: number
  deadLetter: number
  oldestActionableAt: Date | null
}

function normalizeCountryCode(country?: string | null) {
  const normalized = country?.trim().toUpperCase()
  if (!normalized) return null
  if (/^[A-Z]{2}$/.test(normalized)) return normalized
  return COUNTRY_CODE_ALIASES[normalized] ?? null
}

function toDecimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function toFiscalDecimal(value: Prisma.Decimal.Value) {
  return toDecimal(value).toFixed(2)
}

function toFiscalQuantity(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(3).toFixed(3)
}

function toTaxRateBps(value: Prisma.Decimal.Value) {
  return toDecimal(value).mul(100).toDecimalPlaces(0).toNumber()
}

function authorityForPOSReceipt(channels: unknown[]) {
  for (const channel of channels) {
    if (!channel || typeof channel !== "object") continue
    const candidate = channel as Record<string, unknown>
    const documentTypes = Array.isArray(candidate.supportedDocumentTypes)
      ? candidate.supportedDocumentTypes
      : []

    if (
      typeof candidate.code === "string" &&
      documentTypes.includes(FiscalDocumentType.POS_RECEIPT)
    ) {
      return {
        channel: candidate.code,
        adapterKey:
          typeof candidate.adapterKey === "string" && candidate.adapterKey.trim()
            ? candidate.adapterKey
            : null,
      }
    }
  }
  return null
}

function retryAt(attempts: number, now: Date) {
  const seconds = Math.min(3600, 15 * 2 ** Math.max(0, attempts - 1))
  return new Date(now.getTime() + seconds * 1000)
}

function sourceFingerprint(input: {
  salesOrderId: string
  orderNumber: string
  total: Prisma.Decimal.Value
  postingBatchId: string
  issueAt: string
}) {
  return hashBusinessPayload({
    salesOrderId: input.salesOrderId,
    orderNumber: input.orderNumber,
    total: toFiscalDecimal(input.total),
    postingBatchId: input.postingBatchId,
    issueAt: input.issueAt,
  })
}

async function deferRequest(
  id: string,
  workerId: string,
  reason: string,
  now: Date,
) {
  await db.businessEventOutbox.updateMany({
    where: {
      id,
      channel: "FISCALIZATION",
      status: BusinessOutboxStatus.LOCKED,
      lockedBy: workerId,
    },
    data: {
      status: "DEFERRED",
      lockedAt: null,
      lockedBy: null,
      failedAt: now,
      lastErrorCode: "COUNTRY_PACK_PENDING",
      lastErrorMessage: reason.slice(0, 1000),
    },
  })
}

async function failRequest(
  request: {
    id: string
    attempts: number
    maxAttempts: number
  },
  workerId: string,
  error: unknown,
  now: Date,
) {
  const exhausted = request.attempts >= request.maxAttempts
  const message = error instanceof Error ? error.message : String(error)

  await db.businessEventOutbox.updateMany({
    where: {
      id: request.id,
      channel: "FISCALIZATION",
      status: BusinessOutboxStatus.LOCKED,
      lockedBy: workerId,
    },
    data: {
      status: exhausted ? BusinessOutboxStatus.DEAD_LETTER : BusinessOutboxStatus.FAILED,
      availableAt: exhausted ? now : retryAt(request.attempts, now),
      lockedAt: null,
      lockedBy: null,
      failedAt: now,
      lastErrorCode: error instanceof z.ZodError ? "INVALID_PAYLOAD" : "FISCALIZATION_FAILED",
      lastErrorMessage: message.slice(0, 1000),
    },
  })
}

export async function claimFiscalizationRequests(input: {
  organizationId?: string
  workerId: string
  limit?: number
  now?: Date
  staleAfterMs?: number
}) {
  const now = input.now ?? new Date()
  const limit = Math.min(100, Math.max(1, input.limit ?? 25))
  const staleBefore = new Date(now.getTime() - (input.staleAfterMs ?? 5 * 60_000))

  const candidates = await db.businessEventOutbox.findMany({
    where: {
      organizationId: input.organizationId,
      channel: "FISCALIZATION",
      OR: [
        {
          status: {
            in: [BusinessOutboxStatus.PENDING, BusinessOutboxStatus.FAILED],
          },
          availableAt: { lte: now },
        },
        {
          status: BusinessOutboxStatus.LOCKED,
          lockedAt: { lt: staleBefore },
        },
      ],
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true },
  })

  const claimed = []
  for (const candidate of candidates) {
    const result = await db.businessEventOutbox.updateMany({
      where: {
        id: candidate.id,
        channel: "FISCALIZATION",
        OR: [
          {
            status: {
              in: [BusinessOutboxStatus.PENDING, BusinessOutboxStatus.FAILED],
            },
            availableAt: { lte: now },
          },
          {
            status: BusinessOutboxStatus.LOCKED,
            lockedAt: { lt: staleBefore },
          },
        ],
      },
      data: {
        status: BusinessOutboxStatus.LOCKED,
        lockedAt: now,
        lockedBy: input.workerId,
        attempts: { increment: 1 },
      },
    })

    if (result.count === 1) claimed.push(candidate.id)
  }

  return claimed
}

export async function processFiscalizationRequest(input: {
  requestId: string
  workerId: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  const request = await db.businessEventOutbox.findFirst({
    where: {
      id: input.requestId,
      channel: "FISCALIZATION",
      status: BusinessOutboxStatus.LOCKED,
      lockedBy: input.workerId,
    },
  })
  if (!request) throw new NotFoundError("Claimed fiscalization request was not found.")

  try {
    const payload = posFiscalizationRequestSchema.parse(request.payload)
    if (payload.organizationId !== request.organizationId) {
      throw new BusinessRuleError(
        "Fiscalization request tenant does not match its outbox tenant.",
      )
    }

    const sale = await db.salesOrder.findFirst({
      where: {
        id: payload.salesOrderId,
        organizationId: payload.organizationId,
        deletedAt: null,
      },
      include: {
        organization: { select: { country: true, currency: true } },
        lines: {
          orderBy: { createdAt: "asc" },
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                nameEn: true,
                nameFr: true,
              },
            },
          },
        },
      },
    })
    if (!sale) throw new NotFoundError("POS sale for fiscalization was not found.")

    const actualSourceHash = sourceFingerprint({
      salesOrderId: sale.id,
      orderNumber: sale.orderNumber,
      total: sale.total,
      postingBatchId: payload.postingBatchId,
      issueAt: payload.issueAt,
    })
    if (actualSourceHash !== payload.sourcePayloadHash) {
      throw new ConflictError(
        "POS sale changed after its fiscalization request was recorded.",
      )
    }

    const countryCode = normalizeCountryCode(sale.organization.country)
    if (!countryCode) {
      await deferRequest(request.id, input.workerId, "Organization country is not configured.", now)
      return { requestId: request.id, status: "DEFERRED" as const }
    }

    let metadata
    try {
      metadata = resolveEInvoicingMetadata({
        countryCode,
        date: new Date(payload.issueAt),
      })
    } catch (error) {
      if (!(error instanceof RegulatoryPackError)) {
        throw new ApplicationError(
          "INTERNAL_ERROR",
          "Country-pack resolution failed during fiscalization.",
          500,
          false,
        )
      }
      await deferRequest(request.id, input.workerId, error.message, now)
      return { requestId: request.id, status: "DEFERRED" as const }
    }

    const supportedTypes = Array.isArray(metadata.capability.value.supportedDocumentTypes)
      ? metadata.capability.value.supportedDocumentTypes
      : []
    const authority = authorityForPOSReceipt(metadata.authorityChannels.value)
    if (!supportedTypes.includes(FiscalDocumentType.POS_RECEIPT) || !authority) {
      await deferRequest(
        request.id,
        input.workerId,
        "The active country pack does not support POS receipt fiscalization.",
        now,
      )
      return { requestId: request.id, status: "DEFERRED" as const }
    }

    const taxBuckets = new Map<
      string,
      { taxRateBps: number; taxableAmount: Prisma.Decimal; taxAmount: Prisma.Decimal }
    >()
    const lines = sale.lines.map((line, index) => {
      const quantity = toDecimal(line.quantity)
      const unitPrice = toDecimal(line.unitPrice)
      const discount = toDecimal(line.discount)
      const taxableAmount = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        unitPrice.mul(quantity).minus(discount),
      ).toDecimalPlaces(2)
      const taxRateBps = toTaxRateBps(line.taxRate)
      const key = String(taxRateBps)
      const bucket =
        taxBuckets.get(key) ?? {
          taxRateBps,
          taxableAmount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(0),
        }
      bucket.taxableAmount = bucket.taxableAmount.plus(taxableAmount).toDecimalPlaces(2)
      bucket.taxAmount = bucket.taxAmount.plus(line.taxAmount).toDecimalPlaces(2)
      taxBuckets.set(key, bucket)

      return {
        lineNumber: index + 1,
        sourceLineId: line.id,
        itemId: line.itemId,
        description: line.item.nameEn || line.item.nameFr || line.item.sku,
        quantity: toFiscalQuantity(quantity),
        unitPrice: toFiscalDecimal(unitPrice),
        discountAmount: toFiscalDecimal(discount),
        taxRateBps,
        taxCode: taxRateBps > 0 ? "VAT" : null,
        taxAmount: toFiscalDecimal(line.taxAmount),
        lineSubtotal: toFiscalDecimal(taxableAmount),
        lineTotal: toFiscalDecimal(line.lineTotal),
        linePayload: { sku: line.item.sku, itemId: line.item.id },
      }
    })

    const fiscalDocument = await createFiscalDocumentFromPostedSource({
      organizationId: payload.organizationId,
      createdById: payload.actorId,
      documentType: FiscalDocumentType.POS_RECEIPT,
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: sale.id,
      sourceNumber: sale.orderNumber,
      sourceDate: new Date(payload.issueAt),
      issueDate: new Date(payload.issueAt),
      countryCode,
      currency: sale.organization.currency || "XAF",
      fiscalPeriodKey: "ANNUAL",
      sequenceScopeKey: `POS:${payload.locationId}:${payload.terminalId}`,
      idempotencyKey: `pos-sale:${sale.id}:fiscal-document`,
      subtotal: toFiscalDecimal(sale.subtotal),
      taxAmount: toFiscalDecimal(sale.taxAmount),
      discountAmount: toFiscalDecimal(sale.discount),
      totalAmount: toFiscalDecimal(sale.total),
      sourcePayloadHash: payload.sourcePayloadHash,
      taxBreakdown: {
        buckets: Array.from(taxBuckets.values()).map((bucket) => ({
          taxRateBps: bucket.taxRateBps,
          taxableAmount: toFiscalDecimal(bucket.taxableAmount),
          taxAmount: toFiscalDecimal(bucket.taxAmount),
        })),
        totalTaxAmount: toFiscalDecimal(sale.taxAmount),
      },
      lines,
      enqueueCertification: true,
      authorityChannel: authority.channel,
      adapterKey: authority.adapterKey,
      adapterEnvironment: ComplianceAdapterEnvironment.SANDBOX,
      metadata: {
        terminalId: payload.terminalId,
        locationId: payload.locationId,
        source: "DEFERRED_POS_FISCALIZATION_WORKER",
        statutoryEffect: "SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION",
        requestId: request.id,
      },
    })

    await db.$transaction(async (tx) => {
      const completed = await tx.businessEventOutbox.updateMany({
        where: {
          id: request.id,
          organizationId: payload.organizationId,
          status: BusinessOutboxStatus.LOCKED,
          lockedBy: input.workerId,
        },
        data: {
          status: BusinessOutboxStatus.SENT,
          processedAt: now,
          lockedAt: null,
          lockedBy: null,
          failedAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      })
      if (completed.count !== 1) {
        throw new ConflictError(
          "Fiscalization request lease was lost before completion.",
        )
      }

      await recordBusinessEventInTx(tx, {
        organizationId: payload.organizationId,
        eventType: "pos.sale.fiscalized",
        eventSource: "WORKER",
        idempotencyKey: `fiscalization:${request.id}:completed`,
        actorId: payload.actorId,
        locationId: payload.locationId,
        registerId: payload.terminalId,
        sourceType: "POS_SALE",
        sourceId: sale.id,
        postingBatchId: payload.postingBatchId,
        documentHash: payload.sourcePayloadHash,
        payload: {
          requestId: request.id,
          fiscalDocumentId: fiscalDocument.id,
          fiscalDocumentStatus: fiscalDocument.status,
          authorityChannel: fiscalDocument.authorityChannel,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "pos.sale.fiscalized",
            idempotencyKey: `fiscalization:${request.id}:notification`,
            payload: {
              salesOrderId: sale.id,
              fiscalDocumentId: fiscalDocument.id,
              status: fiscalDocument.status,
            },
          },
        ],
      })
    })

    return {
      requestId: request.id,
      status: "SENT" as const,
      fiscalDocumentId: fiscalDocument.id,
    }
  } catch (error) {
    await failRequest(request, input.workerId, error, now)
    if (error instanceof ApplicationError) throw error
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Fiscalization request processing failed.",
      500,
      false,
    )
  }
}

export async function runFiscalizationWorker(input: {
  organizationId?: string
  workerId: string
  limit?: number
  now?: Date
}) {
  const requestIds = await claimFiscalizationRequests(input)
  const results = []

  for (const requestId of requestIds) {
    try {
      results.push(
        await processFiscalizationRequest({
          requestId,
          workerId: input.workerId,
          now: input.now,
        }),
      )
    } catch (error) {
      results.push({
        requestId,
        status: "FAILED" as const,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return results
}

export async function requeueDeferredFiscalization(input: {
  organizationId: string
  countryCode?: string
  now?: Date
}) {
  const deferred = await db.businessEventOutbox.findMany({
    where: {
      organizationId: input.organizationId,
      channel: "FISCALIZATION",
      status: "DEFERRED",
    },
    select: { id: true, payload: true },
  })
  const countryCode = input.countryCode?.trim().toUpperCase()
  const eligible = countryCode
    ? deferred.filter((request) => {
        const parsed = posFiscalizationRequestSchema.safeParse(request.payload)
        return parsed.success
      })
    : deferred

  const result = await db.businessEventOutbox.updateMany({
    where: { id: { in: eligible.map((request) => request.id) } },
    data: {
      status: BusinessOutboxStatus.PENDING,
      availableAt: input.now ?? new Date(),
      failedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  })

  return { requeued: result.count, requestedCountryCode: countryCode ?? null }
}

export async function getFiscalizationQueueSummary(
  organizationId: string,
): Promise<FiscalizationQueueSummary> {
  const [groups, oldest] = await Promise.all([
    db.businessEventOutbox.groupBy({
      by: ["status"],
      where: { organizationId, channel: "FISCALIZATION" },
      _count: { _all: true },
    }),
    db.businessEventOutbox.findFirst({
      where: {
        organizationId,
        channel: "FISCALIZATION",
        status: {
          in: [
            BusinessOutboxStatus.PENDING,
            BusinessOutboxStatus.FAILED,
            BusinessOutboxStatus.LOCKED,
          ],
        },
      },
      orderBy: { availableAt: "asc" },
      select: { availableAt: true },
    }),
  ])
  const count = (status: string) =>
    groups.find((group) => group.status === status)?._count._all ?? 0

  return {
    pending: count("PENDING"),
    locked: count("LOCKED"),
    deferred: count("DEFERRED"),
    failed: count("FAILED"),
    deadLetter: count("DEAD_LETTER"),
    oldestActionableAt: oldest?.availableAt ?? null,
  }
}

export { FISCALIZATION_EVENT_NAME, sourceFingerprint }

