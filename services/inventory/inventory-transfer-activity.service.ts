import { db } from "@/prisma/db"
import type { TransferActivity } from "@/types/transferLifecycle"

export async function readTransferActivity(organizationId: string, transferId: string): Promise<TransferActivity[]> {
  const events = await db.businessEvent.findMany({
    where: { organizationId, sourceType: "STOCK_TRANSFER", sourceId: transferId, status: "APPLIED" },
    orderBy: { occurredAt: "asc" },
    select: { id: true, eventType: true, actorId: true, locationId: true, occurredAt: true, payload: true },
  })
  const actors = await db.user.findMany({ where: { organizationId, id: { in: events.flatMap(event => event.actorId ? [event.actorId] : []) } },
    select: { id: true, firstName: true, lastName: true },
  })
  const names = new Map(actors.map(actor => [actor.id, `${actor.firstName} ${actor.lastName}`.trim()]))
  return events.map(event => {
    const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload) ? event.payload : {}
    return {
      id: event.id, operation: typeof payload.operation === "string" ? payload.operation : event.eventType,
      occurredAt: event.occurredAt.toISOString(), actor: names.get(event.actorId ?? "") ?? event.actorId ?? "",
      locationId: event.locationId, notes: typeof payload.notes === "string" ? payload.notes : "",
      lines: Array.isArray(payload.lines) ? payload.lines.flatMap(line =>
        line && typeof line === "object" && !Array.isArray(line) && typeof line.lineId === "string" && typeof line.quantity === "number"
          ? [{ lineId: line.lineId, quantity: line.quantity }] : []) : [],
    }
  })
}
