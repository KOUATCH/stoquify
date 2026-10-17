import "server-only"

import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"

export const closeEvidencePageSchema = z.object({
  kind: z.enum(["findings", "recipients", "requests", "reviews", "tracking", "supervision"]),
  cursor: z.string().min(1).max(2000),
}).strict()
export type CloseEvidencePage = z.infer<typeof closeEvidencePageSchema>
type Scope = { organizationId: string; actorId: string; periodId: string; kind: CloseEvidencePage["kind"] }
const cursorSchema = z.object({
  organizationId: z.string(), actorId: z.string(), periodId: z.string(),
  kind: closeEvidencePageSchema.shape.kind, id: z.string().min(1), createdAt: z.string().datetime().optional(),
}).strict()

// Cursors are positions, never authorization. Every page still applies current
// tenant, period, role and object filters. No private evidence is carried here.
export function readCloseEvidenceCursor(scope: Scope, cursor?: string) {
  if (!cursor) return null
  try {
    const value = cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")))
    if (Object.entries(scope).some(([key, expected]) => value[key as keyof Scope] !== expected) ||
      (scope.kind !== "recipients" && !value.createdAt)) throw new Error()
    return { id: value.id, createdAt: value.createdAt ? new Date(value.createdAt) : undefined }
  } catch { throw new BusinessRuleError("This evidence page is no longer valid. Refresh the selected period.") }
}

export function closeEvidenceNextCursor(scope: Scope, row: { id: string; createdAt?: Date } | undefined) {
  return row ? Buffer.from(JSON.stringify({ ...scope, id: row.id, ...(row.createdAt ? { createdAt: row.createdAt.toISOString() } : {}) })).toString("base64url") : null
}

export function closeEvidenceAfter(cursor: ReturnType<typeof readCloseEvidenceCursor>) {
  return cursor ? { OR: [{ createdAt: { gt: cursor.createdAt! } }, { createdAt: cursor.createdAt!, id: { gt: cursor.id } }] } : {}
}
