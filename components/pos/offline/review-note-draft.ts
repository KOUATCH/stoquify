import { z } from "zod"

type Scope = { organizationId: string; userId: string; conflictId: string }
const schema = z.object({ version: z.literal(1), organizationId: z.string(), userId: z.string(), conflictId: z.string(), note: z.string().max(1000), savedAt: z.number().finite() }).strict()
const key = (scope: Scope) => "stoquify:offline-review-note:v1:" + JSON.stringify([scope.organizationId, scope.userId, scope.conflictId])
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">
export function readReviewNoteDraft(storage: Store, scope: Scope, now = Date.now()) {
  try {
    const raw = storage.getItem(key(scope))
    if (!raw) return { note: null, unavailable: false }
    const parsed = raw.length <= 8000 ? schema.safeParse(JSON.parse(raw)) : null
    if (!parsed?.success || parsed.data.organizationId !== scope.organizationId || parsed.data.userId !== scope.userId || parsed.data.conflictId !== scope.conflictId || parsed.data.savedAt > now || now - parsed.data.savedAt > 86400000) { storage.removeItem(key(scope)); return { note: null, unavailable: false } }
    return { note: parsed.data.note, unavailable: false }
  } catch { return { note: null, unavailable: true } }
}
export function saveReviewNoteDraft(storage: Store, scope: Scope, note: string | null, now = Date.now()) {
  try {
    if (note === null) storage.removeItem(key(scope))
    else storage.setItem(key(scope), JSON.stringify(schema.parse({ version: 1, ...scope, note, savedAt: now })))
    return true
  } catch { return false }
}
