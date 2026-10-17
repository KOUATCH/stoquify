import { z } from "zod"

export const auditActions = ["MEMBER_ACCESS_CHANGED", "DEACTIVATE_USER", "PERMISSION_GRANTED", "PERMISSION_DENIED", "REQUEST_MANUAL_ITEM_STOCK_ADJUSTMENT", "POST_STOCK_ADJUSTMENT", "REVERSE_STOCK_ADJUSTMENT"] as const
export type AuditAction = typeof auditActions[number]
export type AuditFamily = "access" | "items"
const id = z.string().trim().min(1).max(191)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
})
export const auditExplorerInput = z.object({
  family: z.enum(["all", "access", "items"]).default("all"), action: z.enum(auditActions).optional(),
  actorId: id.optional(), entityId: id.optional(), from: day.optional(), through: day.optional(),
  throughId: id.optional(), beforeId: id.optional(),
}).strict().refine(value => !value.from || !value.through || value.from <= value.through)
  .refine(value => !value.beforeId || Boolean(value.throughId))
export type AuditQuery = z.infer<typeof auditExplorerInput>
export type AuditSafeDetails = {
  operation?: "roles" | "reactivate" | "deactivate" | "delta" | "set"
  addedRoles?: number; removedRoles?: number; beforeActive?: boolean; afterActive?: boolean
  permission?: "inventory.items.read" | "inventory.items.create" | "inventory.items.update" | "inventory.items.delete"
  requiresApproval?: boolean
  adjustmentType?: "CYCLE_COUNT" | "PHYSICAL_COUNT" | "DAMAGED" | "EXPIRED" | "THEFT" | "WRITE_OFF" | "FOUND" | "CORRECTION" | "OTHER"
}
export type AuditEntry = {
  id: string; recordedAt: string; family: AuditFamily; entityType: "User" | "SecurityEvent" | "StockAdjustment"
  entityId: string; reference: string; action: AuditAction; actorId: string | null; details: AuditSafeDetails
  detailState: "limited" | "unavailable"; sourceHref: string
}
export type AuditExplorerResult = {
  entries: AuditEntry[]; checkedAt: string; recordedThrough: string | null; throughId: string | null; nextCursor: string | null
  canFilterActor: boolean; accessAvailable: boolean; itemDecisionsAvailable: boolean; stockChangesAvailable: boolean
}

export const itemAuditPermissions = ["inventory.items.read", "inventory.items.create", "inventory.items.update", "inventory.items.delete"] as const

/** No free text, financial values, network identifiers or arbitrary JSON survive. */
export function projectAuditDetails(action: AuditAction, raw: unknown): AuditSafeDetails {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  const details: AuditSafeDetails = {}
  if (action === "MEMBER_ACCESS_CHANGED" || action === "DEACTIVATE_USER") {
    if (action === "DEACTIVATE_USER") details.operation = "deactivate"
    else if (input.operation === "roles" || input.operation === "reactivate") details.operation = input.operation
    for (const key of ["addedRoles", "removedRoles"] as const) if (typeof input[key] === "number" && Number.isInteger(input[key]) && input[key] >= 0 && input[key] <= 1000) details[key] = input[key]
    for (const key of ["beforeActive", "afterActive"] as const) if (typeof input[key] === "boolean") details[key] = input[key]
  }
  if ((action === "PERMISSION_GRANTED" || action === "PERMISSION_DENIED") && itemAuditPermissions.includes(input.permission as typeof itemAuditPermissions[number])) details.permission = input.permission as AuditSafeDetails["permission"]
  if (action === "REQUEST_MANUAL_ITEM_STOCK_ADJUSTMENT") {
    if (input.mode === "delta" || input.mode === "set") details.operation = input.mode
    if (typeof input.requiresApproval === "boolean") details.requiresApproval = input.requiresApproval
  }
  if (action === "POST_STOCK_ADJUSTMENT" && ["CYCLE_COUNT", "PHYSICAL_COUNT", "DAMAGED", "EXPIRED", "THEFT", "WRITE_OFF", "FOUND", "CORRECTION", "OTHER"].includes(input.adjustmentType as string)) details.adjustmentType = input.adjustmentType as AuditSafeDetails["adjustmentType"]
  return details
}
