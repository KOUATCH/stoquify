import type { ActionResponse } from "@/services/_shared/types"
import { toSafeActionError } from "@/services/_shared/action-errors"

export type POSReadScope = { organizationId: string; actorId: string }
export type POSReadResult<T> =
  | { success: true; data: T; error: null; scope: POSReadScope }
  | Extract<ActionResponse<T>, { success: false }>

export type POSReadSuccess<T> = Extract<POSReadResult<T>, { success: true }>
export function posReadResult<T>(data: T, ctx: { orgId: string; userId: string }): POSReadSuccess<T> {
  return { success: true, data, error: null, scope: { organizationId: ctx.orgId, actorId: ctx.userId } }
}

export function posReadError(error: unknown): Extract<ActionResponse<never>, { success: false }> {
  return { success: false, data: null, error: toSafeActionError(error).error }
}
