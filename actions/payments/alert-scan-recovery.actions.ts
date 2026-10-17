"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requirePermission, isRbacError } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { ApplicationError, ForbiddenError } from "@/services/_shared/action-errors"
import { readAlertScanRecovery, recoverAlertScanPage, type AlertRecoveryActor } from "@/services/reconciliation/alert-scan-recovery.service"

type Code = "RESTRICTED" | "INVALID_INPUT" | "STALE" | "NOT_FOUND" | "UNAVAILABLE"
async function run<T>(operation: (actor: AlertRecoveryActor) => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; code: Code }> {
  try {
    const ctx = await requirePermission("payments.reconciliation.run", { resource: "ReconciliationAlertScan" })
    const { claims } = await requireSession()
    if (claims.tenantId !== ctx.orgId || claims.userId !== ctx.userId) throw new ForbiddenError()
    return { ok: true, data: await operation({ orgId: ctx.orgId, userId: ctx.userId, permissions: ctx.permissions, sessionId: claims.sessionId, sessionToken: claims.sessionToken }) }
  } catch (error) {
    if (isRbacError(error)) return { ok: false, code: "RESTRICTED" }
    if (error instanceof z.ZodError) return { ok: false, code: "INVALID_INPUT" }
    if (error instanceof ApplicationError) {
      if (["AUTH_REQUIRED", "FORBIDDEN", "TENANT_SCOPE_VIOLATION"].includes(error.code)) return { ok: false, code: "RESTRICTED" }
      if (["CONFLICT", "IDEMPOTENCY_CONFLICT"].includes(error.code)) return { ok: false, code: "STALE" }
      if (error.code === "NOT_FOUND") return { ok: false, code: "NOT_FOUND" }
    }
    return { ok: false, code: "UNAVAILABLE" }
  }
}
export async function readAlertScanRecoveryAction(input: unknown) { return run(actor => readAlertScanRecovery(actor, input)) }
export async function recoverAlertScanPageAction(input: unknown) {
  return run(async actor => {
    const result = await recoverAlertScanPage(actor, input)
    try { revalidatePath("/[locale]/dashboard/finance/reconciliation", "page") } catch { /* The committed receipt remains authoritative. */ }
    return result
  })
}
