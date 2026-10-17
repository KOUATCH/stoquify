"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { protect } from "@/services/_shared/protect"
import { acceptMissingCloseEvidenceResponseInputSchema } from "@/services/accounting/close-assurance.schemas"
import {
  assertAccountantWorkClient, getAccountantWorkDesk, getAccountantWorkDetail, getAccountantWorkClientPage,
} from "@/services/accounting/accountant-work-desk.service"
import { acceptMissingCloseEvidenceResponse } from "@/services/accounting/close-assurance.service"
import { closeEvidenceAcceptanceControl } from "@/services/accounting/close-evidence-acceptance-context"
import { accountantNotificationHistoryInput, getAccountantNotificationHistory } from "@/services/accounting/accountant-notification-history.service"

const identifier = z.string().trim().min(1).max(200)
const listInput = z.object({ afterGrantId: identifier.optional(), clientPage: z.object({ clientOrganizationId: identifier, kind: z.enum(["requests", "reviews"]), cursor: z.string().min(1).max(2000) }).strict().optional() }).strict()
  .refine(input => !(input.afterGrantId && input.clientPage), "Choose a client page or a client-list page.")
const detailInput = z.object({ clientOrganizationId: identifier, requestId: identifier }).strict()
const options = {
  permission: "accounting.close.accountant.review",
  auditResource: "AccountantWorkDesk",
  auditAllowed: false,
  module: { moduleSlug: "accounting" as const, surface: "accountant-work-desk", accessIntent: "read" as const, mode: "enforce" as const },
}
const list = protect(options, async (input: unknown, ctx) => {
  const parsed = listInput.parse(input)
  if (parsed.clientPage) return getAccountantWorkClientPage({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }, parsed.clientPage)
  return getAccountantWorkDesk({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }, parsed.afterGrantId)
})
const detail = protect(options, async (input: unknown, ctx) => {
  const parsed = detailInput.parse(input)
  return getAccountantWorkDetail({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }, parsed.clientOrganizationId, parsed.requestId)
})
const accept = protect({ ...options, freshAuth: { maxAgeSeconds: 300 } }, async (input: unknown, ctx) => {
  const control = closeEvidenceAcceptanceControl(ctx, true)
  const parsed = acceptMissingCloseEvidenceResponseInputSchema.extend({ clientOrganizationId: identifier }).strict().parse(input)
  await assertAccountantWorkClient({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }, parsed.clientOrganizationId, "write")
  const result = await acceptMissingCloseEvidenceResponse(ctx.orgId, parsed, control)
  revalidatePath("/dashboard/accounting", "page")
  revalidatePath("/dashboard/accounting/close", "page")
  revalidatePath("/dashboard/accounting/close/" + result.periodId, "page")
  revalidatePath("/dashboard/accounting/accountant-portfolio", "page")
  return result
})

export async function getAccountantWorkDeskAction(input: unknown = {}) { return list(input) }
export async function getAccountantWorkDetailAction(input: unknown) { return detail(input) }
export async function acceptAccountantWorkItemAction(input: unknown) { return accept(input) }
const history = protect(options, async (input: unknown, ctx) => getAccountantNotificationHistory(
  { homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }, accountantNotificationHistoryInput.parse(input)))
export async function getAccountantNotificationHistoryAction(input: unknown) { return history(input) }
