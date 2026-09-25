import { z } from "zod"
import { accountSessionCommand, type AccountSessionCommand } from "@/services/security/account-session-input"
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">
const saved = z.object({ savedAt: z.number(), command: accountSessionCommand }).strict()
const key = (organizationId: string, actorId: string, sessionId: string) => `account-sessions:v1:${encodeURIComponent(organizationId)}:${encodeURIComponent(actorId)}:${encodeURIComponent(sessionId)}`
// A retry identity and reviewed digest only; no authentication tokens or device data.
export function readAccountSessionRequest(store: Store, organizationId: string, actorId: string, sessionId: string, now = Date.now()) {
  const storageKey = key(organizationId, actorId, sessionId), raw = store.getItem(storageKey)
  if (!raw) return null
  try {
    const parsed = saved.safeParse(JSON.parse(raw))
    if (parsed.success && parsed.data.savedAt <= now && now - parsed.data.savedAt <= 86400000) return parsed.data.command
  } catch { /* Invalid saved data cannot authorize a command. */ }
  store.removeItem(storageKey)
  return null
}
export function saveAccountSessionRequest(store: Store, organizationId: string, actorId: string, sessionId: string, command: AccountSessionCommand | null) {
  const storageKey = key(organizationId, actorId, sessionId)
  if (command) store.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), command: accountSessionCommand.parse(command) }))
  else store.removeItem(storageKey)
}
