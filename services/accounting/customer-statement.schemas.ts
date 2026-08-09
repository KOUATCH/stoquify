import { z } from "zod"

const id = z.string().trim().min(1).max(191)
const boundedKey = z.string().trim().min(8).max(191)
const sha256Evidence = z.string().regex(/^sha256:[0-9a-f]{64}$/)

export const createCustomerStatementInputSchema = z.object({
  customerId: id,
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  currency: z.string().trim().min(3).max(3).transform((value) => value.toUpperCase()),
  idempotencyKey: boundedKey,
  correlationId: boundedKey,
})

export const queueCustomerStatementDeliveryInputSchema = z.object({
  statementSnapshotId: id,
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  destination: z.string().trim().min(3).max(254),
  consentBasis: z.enum(["EXPLICIT", "RECIPIENT_REQUESTED"]),
  consentEvidenceHash: sha256Evidence,
  consentCapturedAt: z.coerce.date(),
  allowDispute: z.boolean().optional(),
  allowPromiseToPay: z.boolean().optional(),
  locale: z.enum(["EN", "FR"]).optional(),
  tokenTtlSeconds: z.number().int().min(300).max(90 * 24 * 60 * 60).optional(),
  idempotencyKey: boundedKey,
  correlationId: boundedKey,
})

export const revokeCustomerStatementAccessInputSchema = z.object({
  tokenId: id,
  reason: z.string().trim().min(3).max(500),
})
