import { commitSaleSchema, type CommitSaleInput } from "@/services/pos/pos.schemas"

export type PendingSale = { version: 1; organizationId: string; actorId: string; request: CommitSaleInput }
export function pendingSaleKey(organizationId: string, actorId: string) {
  return `stoquify:pos:pending-sale:v1:${encodeURIComponent(organizationId)}:${encodeURIComponent(actorId)}`
}
export function readPendingSale(storage: Storage, organizationId: string, actorId: string): PendingSale | null {
  const raw = storage.getItem(pendingSaleKey(organizationId, actorId))
  if (raw === null) return null
  const value = JSON.parse(raw) as PendingSale
  if (value.version !== 1 || value.organizationId !== organizationId || value.actorId !== actorId) throw new Error("Pending sale scope is inconsistent")
  return { version: 1, organizationId, actorId, request: commitSaleSchema.parse(value.request) }
}
export function savePendingSale(storage: Storage, value: PendingSale) {
  const checked = { ...value, request: commitSaleSchema.parse(value.request) }
  const raw = JSON.stringify(checked), key = pendingSaleKey(value.organizationId, value.actorId)
  storage.setItem(key, raw)
  if (storage.getItem(key) !== raw) throw new Error("Pending sale could not be retained")
  return checked
}
export function removePendingSale(storage: Storage, organizationId: string, actorId: string) {
  const key = pendingSaleKey(organizationId, actorId)
  storage.removeItem(key)
  if (storage.getItem(key) !== null) throw new Error("Pending sale could not be cleared")
}
