import { z } from "zod"
import { statementRecipientCommandSchema, type StatementRecipientCommand } from "@/services/accounting/customer-statement.schemas"

export const statementRecipientDraftSchema = z.object({
  actionType: z.enum(["DISPUTE", "PROMISE_TO_PAY"]),
  requestedAmount: z.string().max(32),
  customerReceivableDocumentId: z.string().max(191),
  promisedFor: z.string().max(40),
  note: z.string().max(500),
}).strict()
export type StatementRecipientDraft = z.infer<typeof statementRecipientDraftSchema>
const retainedSchema = z.object({
  version: z.literal(1), draft: statementRecipientDraftSchema,
  command: statementRecipientCommandSchema.nullable(),
}).strict()
export type RetainedStatementResponse = z.infer<typeof retainedSchema>
export const emptyStatementResponse = (): RetainedStatementResponse => ({
  version: 1, command: null,
  draft: { actionType: "PROMISE_TO_PAY", requestedAmount: "", customerReceivableDocumentId: "", promisedFor: "", note: "" },
})

// Scope recovery to this statement AND this issued link without retaining the bearer token.
export async function statementResponseStorageKey(statementId: string, token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  const fingerprint = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("")
  return `stoquify:statement-response:v1:${encodeURIComponent(statementId)}:${fingerprint}`
}

export function readStatementResponse(storage: Pick<Storage, "getItem">, key: string) {
  const raw = storage.getItem(key)
  if (raw === null) return emptyStatementResponse()
  if (raw.length > 10_000) throw new Error("Retained response is invalid")
  const retained = retainedSchema.parse(JSON.parse(raw))
  // Pending command details, not separately editable local text, are what will be retried.
  if (retained.command) retained.draft = {
    actionType: retained.command.actionType, requestedAmount: retained.command.requestedAmount,
    customerReceivableDocumentId: retained.command.customerReceivableDocumentId ?? "",
    promisedFor: retained.command.promisedFor ?? "", note: retained.command.note,
  }
  return retained
}

export function writeStatementResponse(storage: Pick<Storage, "setItem">, key: string, value: RetainedStatementResponse) {
  storage.setItem(key, JSON.stringify(retainedSchema.parse(value)))
}

export function prepareStatementResponse(draft: StatementRecipientDraft): StatementRecipientCommand {
  return statementRecipientCommandSchema.parse({
    ...draft,
    requestedAmount: draft.requestedAmount.trim().replace(",", "."),
    customerReceivableDocumentId: draft.actionType === "DISPUTE" ? draft.customerReceivableDocumentId : null,
    promisedFor: draft.actionType === "PROMISE_TO_PAY" ? draft.promisedFor : null,
    idempotencyKey: `statement-recipient:${crypto.randomUUID()}`,
    correlationId: `statement-correlation:${crypto.randomUUID()}`,
  })
}
