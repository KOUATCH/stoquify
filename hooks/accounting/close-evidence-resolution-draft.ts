import { z } from "zod"
import { closeRecoveryCommandSchema } from "@/services/accounting/close-evidence-resolution.schemas"

export type CloseRecoveryDraftScope = { organizationId: string; actorId: string; periodId: string; requestId: string }
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">
const textMap = (max: number) => z.record(z.string().min(1).max(200), z.string().max(max)).refine(value => Object.keys(value).length <= 100)
const schema = z.object({
  version: z.literal(1), savedAt: z.number().finite(), revision: z.string().regex(/^[a-f0-9]{64}$/),
  selected: z.object({ request: z.string().max(200), response: z.string().max(200), acceptance: z.string().max(200) }).strict(),
  reason: z.string().max(4000), exclusions: textMap(2000), notes: textMap(4000), closeReasons: textMap(4000), pending: closeRecoveryCommandSchema.nullable(),
}).strict()
export type CloseRecoveryDraft = Omit<z.infer<typeof schema>, "version" | "savedAt">
export const closeRecoveryDraftKey = (scope: CloseRecoveryDraftScope) => `close-recovery:v1:${[scope.organizationId, scope.actorId, scope.periodId, scope.requestId].map(encodeURIComponent).join(":")}`
export function readCloseRecoveryDraft(store: Store, scope: CloseRecoveryDraftScope, now = Date.now()) {
  const key = closeRecoveryDraftKey(scope), raw = store.getItem(key)
  if (!raw) return null
  try {
    const parsed = raw.length <= 2000000 ? schema.safeParse(JSON.parse(raw)) : null
    if (parsed?.success && parsed.data.savedAt <= now && now - parsed.data.savedAt <= 86400000) {
      const { pending } = parsed.data
      if (!pending || pending.kind !== "propose" || (pending.input.periodId === scope.periodId && pending.input.requestId === scope.requestId && pending.input.expectedRevision === parsed.data.revision)) return parsed.data
    }
  } catch { /* Stored data is untrusted and never establishes authority. */ }
  store.removeItem(key); return null
}
export function saveCloseRecoveryDraft(store: Store, scope: CloseRecoveryDraftScope, draft: CloseRecoveryDraft | null) {
  const key = closeRecoveryDraftKey(scope)
  if (!draft) store.removeItem(key)
  else store.setItem(key, JSON.stringify(schema.parse({ ...draft, version: 1, savedAt: Date.now() })))
}
