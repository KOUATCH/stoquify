import "server-only"
import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { invoicePreparationDecisionSchema } from "./invoice-preparation-contracts"
import { invoiceCorrectionCommandSchema } from "./invoice-correction-contracts"
import { invoicePreparationSourceHash } from "./invoice-source-evidence"

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
type Source = Prisma.SupplierInvoiceGetPayload<{ include: { lines: true; threeWayMatches: true } }>

export async function readInvoicePreparationEvidence(tx: Prisma.TransactionClient, invoice: Source, organizationId: string) {
  const pointer = record(invoice.metadata).currentPreparationEventId
  const corrected = pointer !== undefined && pointer !== null
  const event = await tx.businessEvent.findFirst({ where: { organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, ...(corrected ? { id: typeof pointer === "string" ? pointer : "", eventType: "purchase.supplier_invoice.reprepared" } : { eventType: "purchase.supplier_invoice.prepared", idempotencyKey: invoice.idempotencyKey ?? "" }) } })
  const prepared = invoicePreparationDecisionSchema.safeParse(record(event?.payload).result)
  const payload = record(event?.payload), correction = corrected ? invoiceCorrectionCommandSchema.safeParse(payload.command) : null
  const correctionValid = !corrected || !!correction?.success && prepared.success && payload.commandHash === hashBusinessPayload(correction.data) && correction.data.draft.invoiceId === invoice.id && correction.data.idempotencyKey === prepared.data.requestReference && correction.data.expectedRevision === prepared.data.reviewedRevision && correction.data.draft.reason === payload.reason && correction.data.draft.preparation.documentReference === prepared.data.documentReference && correction.data.draft.preparation.documentSha256 === prepared.data.documentSha256 && typeof payload.beforeSourceHash === "string" && /^[a-f0-9]{64}$/.test(payload.beforeSourceHash)
  const valid = !!event && prepared.success && invoice.organizationId === organizationId && !!invoice.createdById && event.eventSource === "INTERNAL" && event.schemaVersion === 1 && event.status === "APPLIED" && !!event.processedAt && event.payloadHash === hashBusinessPayload(event.payload) && event.actorId === invoice.createdById && prepared.data.actorId === invoice.createdById && prepared.data.organizationId === organizationId && prepared.data.invoiceId === invoice.id && prepared.data.invoiceNumber === invoice.invoiceNumber && prepared.data.total === invoice.total.toFixed(2) && prepared.data.currency === invoice.currency && prepared.data.recordedAt === event.occurredAt.toISOString() && event.idempotencyKey === `${corrected ? "invoice-correction" : "invoice-preparation"}:${prepared.data.requestReference}` && (corrected || event.idempotencyKey === invoice.idempotencyKey) && invoice.documentHash === `sha256:${prepared.data.documentSha256}` && record(event.payload).sourceHash === invoicePreparationSourceHash(invoice) && (!corrected || record(event.payload).operation === "correction" && typeof record(event.payload).beforeSourceHash === "string" && typeof record(event.payload).reason === "string")
  return { event, prepared, valid: valid && correctionValid }
}
