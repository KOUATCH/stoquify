"use server"
import { protect } from "@/services/_shared/protect"
import { closeEvidenceAcceptanceControl, closeEvidenceWorkControl } from "@/services/accounting/close-evidence-acceptance-context"
import { executeFirmEngagementCommand, getFirmEngagement } from "@/services/accounting/firm-engagement.service"
import { getFirmEngagementWorkspace, getAccountantInvitationDelivery } from "@/services/accounting/firm-engagement-workspace.service"
import { getAccountantHandoverSummary } from "@/services/accounting/accountant-work-desk.service"
import { z } from "zod"

const options = { permission: "accounting.close.accountant.invite", auditResource: "FirmEngagement",
  module: { moduleSlug: "accounting" as const, surface: "firm-engagement", mode: "enforce" as const } }
const command = protect({ ...options, freshAuth: { maxAgeSeconds: 300 }, module: { ...options.module, accessIntent: "write" } }, async (input: unknown, ctx) => {
  const control = closeEvidenceAcceptanceControl(ctx)
  return executeFirmEngagementCommand({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, session: control.session }, input)
})
const read = protect({ ...options, auditAllowed: false, module: { ...options.module, accessIntent: "read" } }, async (input: unknown, ctx) => {
  const control = await closeEvidenceWorkControl(ctx)
  return getFirmEngagement({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, session: control.session }, input)
})
export async function executeFirmEngagementCommandAction(input: unknown) { return command(input) }
export async function getFirmEngagementAction(input: unknown) { return read(input) }
const workspace = protect({ ...options, auditAllowed: false, module: { ...options.module, accessIntent: "read" } }, async (input: unknown, ctx) => {
  const control = await closeEvidenceWorkControl(ctx)
  return getFirmEngagementWorkspace({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, session: control.session }, input)
})
const delivery = protect({ ...options, auditAllowed: false, module: { ...options.module, accessIntent: "read" } }, async (_input: unknown, ctx) => {
  const control = await closeEvidenceWorkControl(ctx)
  return getAccountantInvitationDelivery({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, session: control.session })
})
export async function getFirmEngagementWorkspaceAction(input: unknown = {}) { return workspace(input) }
export async function getAccountantInvitationDeliveryAction() { return delivery({}) }
const handoverSummary = protect({ ...options, auditAllowed: false, module: { ...options.module, accessIntent: "read" } }, async (input: unknown, ctx) => {
  const parsed = z.object({ clientOrganizationId: z.string().min(1).max(191) }).strict().parse(input)
  await closeEvidenceWorkControl(ctx)
  return getAccountantHandoverSummary({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }, parsed.clientOrganizationId)
})
export async function getFirmHandoverSummaryAction(input: unknown) { return handoverSummary(input) }
