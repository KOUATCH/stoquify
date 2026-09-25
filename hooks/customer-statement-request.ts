import { z } from "zod"
import { queueCustomerStatementDeliveryInputSchema, retryCustomerStatementInputSchema, type RetryCustomerStatementInput } from "@/services/accounting/customer-statement.schemas"

const keyText = z.string().min(8).max(191)
const statementRequest = z.object({ customerId: z.string().min(1).max(191), periodStart: z.string().datetime(), periodEnd: z.string().datetime(), currency: z.string().length(3), idempotencyKey: keyText, correlationId: keyText }).strict()
const deliveryRequest = queueCustomerStatementDeliveryInputSchema.extend({ consentCapturedAt: z.string().datetime() }).strict()
const storedRequest = z.object({ version: z.literal(1), organizationId: z.string(), actorId: z.string(), customerId: z.string(), statement: statementRequest.nullable(), delivery: deliveryRequest.nullable(), historicalStatementId: z.string().min(1).max(191).optional(), retry: retryCustomerStatementInputSchema.optional() }).strict()
export type StatementRequest = z.infer<typeof statementRequest>
export type StatementDeliveryRequest = z.infer<typeof deliveryRequest>
export type StatementRequestScope = { organizationId: string; actorId: string; customerId: string }
export type StatementRequests = { statement: StatementRequest | null; delivery: StatementDeliveryRequest | null; historicalStatementId?: string; retry?: RetryCustomerStatementInput }
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">
const storageKey = (scope: StatementRequestScope) => `customer-statement-request:v1:${encodeURIComponent(scope.organizationId)}:${encodeURIComponent(scope.actorId)}:${encodeURIComponent(scope.customerId)}`

export function readStatementRequests(store: Store, scope: StatementRequestScope): StatementRequests {
  const raw = store.getItem(storageKey(scope))
  if (!raw) return { statement: null, delivery: null }
  const value = storedRequest.parse(JSON.parse(raw))
  if (value.organizationId !== scope.organizationId || value.actorId !== scope.actorId || value.customerId !== scope.customerId || (value.statement && value.statement.customerId !== scope.customerId) || (value.delivery && !value.statement && !value.historicalStatementId) || (value.historicalStatementId && (value.statement || (value.delivery && value.delivery.statementSnapshotId !== value.historicalStatementId)))) throw new Error("Statement recovery scope mismatch")
  if (value.retry && value.retry.customerId !== scope.customerId) throw new Error("Statement retry scope mismatch")
  return { statement: value.statement, delivery: value.delivery, ...(value.historicalStatementId ? { historicalStatementId: value.historicalStatementId } : {}), ...(value.retry ? { retry: value.retry } : {}) }
}

export function saveStatementRequests(store: Store, scope: StatementRequestScope, requests: StatementRequests) {
  if (!requests.statement && !requests.delivery && !requests.historicalStatementId && !requests.retry) { store.removeItem(storageKey(scope)); return }
  const value = storedRequest.parse({ version: 1, ...scope, ...requests })
  store.setItem(storageKey(scope), JSON.stringify(value))
}
