"use server"
import { protect } from "@/services/_shared/protect"
import { closeEvidenceNotificationsInput, getCloseEvidenceNotifications } from "@/services/accounting/close-evidence-notifications.service"
const read = protect({ permission: "accounting.close.read", auditResource: "CloseEvidenceNotification", auditAllowed: false,
  module: { moduleSlug: "close_assurance", surface: "close-evidence-notifications", accessIntent: "read", mode: "enforce" } }, async (input: unknown, ctx) =>
  getCloseEvidenceNotifications({ organizationId: ctx.orgId, actorId: ctx.userId }, closeEvidenceNotificationsInput.parse(input)))
export async function getCloseEvidenceNotificationsAction(input: unknown) { return read(input) }
