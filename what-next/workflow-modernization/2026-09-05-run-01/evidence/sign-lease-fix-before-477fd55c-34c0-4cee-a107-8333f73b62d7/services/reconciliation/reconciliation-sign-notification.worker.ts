import "server-only"
import { z } from "zod"
import { db } from "@/prisma/db"
import { ConflictError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { runBusinessEventOutboxWorker } from "@/services/events/business-event-outbox.service"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"

const eventName = "payment.reconciliation.signed"
const inputSchema = z.object({
  organizationId: z.string().trim().min(1).max(128),
  workerId: z.string().trim().min(1).max(128),
  limit: z.number().int().min(1).max(100).default(25),
}).strict()
const payloadSchema = z.object({
  runId: z.string().min(1), providerAccountId: z.string().min(1),
  certificateHash: z.string().min(1), sourceVersionHash: z.string().min(1),
  signedAt: z.string().datetime(), correlationId: z.string().min(1),
}).strict()

// Internal tenant-explicit worker. Delivery means durable publication in the
// existing workspace inbox, not external dispatch or a personal read receipt.
export async function runReconciliationSignNotificationWorker(input: z.input<typeof inputSchema>) {
  const args = inputSchema.parse(input)
  return runBusinessEventOutboxWorker({ ...args, channels: ["NOTIFICATION"], eventNames: [eventName] }, async message => {
    await db.$transaction(async tx => {
      const retained = await tx.businessEventOutbox.findFirst({ where: {
        id: message.id, organizationId: args.organizationId, channel: "NOTIFICATION", eventName,
        status: "LOCKED", lockedBy: args.workerId, attempts: message.attempts,
      }, include: { businessEvent: true } })
      if (!retained || message.organizationId !== args.organizationId || retained.payloadHash !== message.payloadHash
        || hashBusinessPayload(retained.payload) !== retained.payloadHash || hashBusinessPayload(message.payload) !== retained.payloadHash)
        throw new ConflictError("Reconciliation notification lease or evidence changed.")
      const payload = payloadSchema.parse(retained.payload), event = retained.businessEvent
      const eventPayload = event.payload as Record<string, unknown>
      if (event.organizationId !== args.organizationId || event.eventType !== eventName || event.eventSource !== "SYSTEM"
        || event.sourceType !== "PAYMENT_RECONCILIATION" || event.sourceId !== payload.runId
        || event.documentHash !== payload.certificateHash || hashBusinessPayload(event.payload) !== event.payloadHash
        || Object.entries(payload).some(([key, value]) => eventPayload?.[key] !== value)
        || !await tx.ledgerAuditEvent.findFirst({ where: { organizationId: args.organizationId,
          resourceType: "ReconciliationRun", resourceId: payload.runId, action: "PAYMENT_RECONCILIATION_RUN_SIGN",
          actorId: event.actorId, metadata: { path: ["certificateHash"], equals: payload.certificateHash } }, select: { id: true } }))
        throw new ConflictError("Retained reconciliation signature evidence requires review.")
      // A later source correction can reopen the run. Publish the historical
      // observation without treating current readiness as signed or healthy.
      await publishPaymentReconciliationNotification({
        type: "payment-reconciliation.run.signed", organizationId: args.organizationId,
        providerAccountId: payload.providerAccountId, evidenceRef: { reconciliationRunId: payload.runId },
        correlationId: payload.correlationId, dedupeKey: event.id,
      }, tx)
    })
  })
}
