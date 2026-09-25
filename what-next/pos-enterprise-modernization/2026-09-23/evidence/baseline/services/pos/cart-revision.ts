import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"

type Amount = Prisma.Decimal | number | string
type CartRevisionSource = {
  id: string; organizationId: string; locationId: string; terminalId: string | null
  sessionId: string | null; customerId: string | null; createdById: string | null
  updatedAt?: Date; notes?: string | null; version?: number
  subtotal: Amount; discount: Amount; taxAmount: Amount; total: Amount
  lines: Array<{ id: string; itemId: string; updatedAt?: Date; quantity: Amount; unitPrice: Amount; discount: Amount; taxRate: Amount; taxAmount: Amount; lineTotal: Amount }>
}

/** Opaque review identity; availability and financial rules are still checked live. */
export function posCartRevision(cart: CartRevisionSource) {
  const amount = (value: Amount) => new Prisma.Decimal(value).toString()
  return hashBusinessPayload({
    revisionSchema: 2, version: cart.version ?? 0, id: cart.id, organizationId: cart.organizationId,
    locationId: cart.locationId, terminalId: cart.terminalId, sessionId: cart.sessionId,
    customerId: cart.customerId, createdById: cart.createdById,
    updatedAt: cart.updatedAt?.toISOString() ?? null, notes: cart.notes ?? null,
    subtotal: amount(cart.subtotal), discount: amount(cart.discount), taxAmount: amount(cart.taxAmount), total: amount(cart.total),
    lines: [...cart.lines].sort((a, b) => a.id.localeCompare(b.id)).map(line => ({
      id: line.id, itemId: line.itemId, updatedAt: line.updatedAt?.toISOString() ?? null,
      quantity: amount(line.quantity), unitPrice: amount(line.unitPrice), discount: amount(line.discount),
      taxRate: amount(line.taxRate), taxAmount: amount(line.taxAmount), lineTotal: amount(line.lineTotal),
    })),
  })
}
