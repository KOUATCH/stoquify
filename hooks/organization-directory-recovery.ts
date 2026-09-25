import { z } from "zod"
import { directoryExportInput, type DirectoryExportInput } from "@/services/organization/organization-directory-input"

const savedRequest = z.object({ savedAt: z.number(), command: directoryExportInput }).strict()
const key = (organizationId: string, actorId: string, locale: string) => `organization-directory-export:v1:${encodeURIComponent(organizationId)}:${encodeURIComponent(actorId)}:${locale}`
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

// Retain only retry identity and reviewed filters, never file contents or authentication.
export function readDirectoryExportRequest(store: Store, organizationId: string, actorId: string, locale: "en" | "fr", now = Date.now()) {
  const storageKey = key(organizationId, actorId, locale)
  const raw = store.getItem(storageKey)
  if (!raw) return null
  let parsed: ReturnType<typeof savedRequest.safeParse>
  try { parsed = savedRequest.safeParse(JSON.parse(raw)) } catch { store.removeItem(storageKey); return null }
  if (!parsed.success || parsed.data.command.locale !== locale || parsed.data.savedAt > now || now - parsed.data.savedAt > 86400000) { store.removeItem(storageKey); return null }
  return parsed.data.command
}

export function saveDirectoryExportRequest(store: Store, organizationId: string, actorId: string, locale: "en" | "fr", command: DirectoryExportInput | null) {
  const storageKey = key(organizationId, actorId, locale)
  if (command) store.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), command: directoryExportInput.parse(command) }))
  else store.removeItem(storageKey)
}
