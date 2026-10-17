"use server"
import { protect } from "@/services/_shared/protect"
import { closeEvidenceAcceptanceControl } from "@/services/accounting/close-evidence-acceptance-context"
import { getCloseNotificationOperations, retryCloseNotification, closeNotificationOperationsInput, retryCloseNotificationInput } from "@/services/accounting/close-notification-operations.service"
const options = { permission: "accounting.close.accountant.review", auditResource: "CloseNotificationOperations", auditAllowed: false,
  module: { moduleSlug: "close_assurance" as const, surface: "close-notification-operations", accessIntent: "read" as const, mode: "enforce" as const } }
const read = protect(options, async (input: unknown, ctx) => getCloseNotificationOperations({ organizationId: ctx.orgId, actorId: ctx.userId }, closeNotificationOperationsInput.parse(input)))
const retry = protect({ ...options, module: { ...options.module, accessIntent: "write" }, freshAuth: { maxAgeSeconds: 300 } }, async (input: unknown, ctx) => {
  const control = closeEvidenceAcceptanceControl(ctx)
  return retryCloseNotification({ organizationId: ctx.orgId, actorId: ctx.userId }, retryCloseNotificationInput.parse(input), control.session)
})
export async function getCloseNotificationOperationsAction(input: unknown) { return read(input) }
export async function retryCloseNotificationAction(input: unknown) { return retry(input) }
