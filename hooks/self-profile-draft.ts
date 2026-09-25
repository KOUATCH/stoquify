import { z } from "zod"
import { selfProfileCommand, type SelfProfileCommand, type SelfProfileFields } from "@/services/users/self-profile-input"

// Drafts can be temporarily incomplete; authoritative commands remain strict.
const draft = z.object({ savedAt: z.number(), expectedHash: z.string().regex(/^[a-f0-9]{64}$/), fields: z.object({ firstName: z.string().max(100), lastName: z.string().max(100), jobTitle: z.string().max(100) }).strict(), pending: selfProfileCommand.nullable() }).strict()
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">
const key = (organizationId: string, actorId: string) => `self-profile:v1:${encodeURIComponent(organizationId)}:${encodeURIComponent(actorId)}`
export function readSelfProfileDraft(store: Store, organizationId: string, actorId: string, now = Date.now()) {
  const storageKey = key(organizationId, actorId), raw = store.getItem(storageKey)
  if (!raw) return null
  try { const result = draft.safeParse(JSON.parse(raw)); if (result.success && result.data.savedAt <= now && now - result.data.savedAt <= 86400000) return result.data } catch { /* Invalid local metadata is never a save authority. */ }
  store.removeItem(storageKey); return null
}
export function saveSelfProfileDraft(store: Store, organizationId: string, actorId: string, value: { expectedHash: string; fields: SelfProfileFields; pending: SelfProfileCommand | null } | null) {
  const storageKey = key(organizationId, actorId)
  if (!value) store.removeItem(storageKey)
  else store.setItem(storageKey, JSON.stringify(draft.parse({ ...value, savedAt: Date.now() })))
}
