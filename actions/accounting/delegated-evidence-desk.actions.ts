"use server"
import { protect } from "@/services/_shared/protect"
import { closeEvidenceWorkControl } from "@/services/accounting/close-evidence-acceptance-context"
import { getDelegatedEvidenceDesk } from "@/services/accounting/delegated-evidence-desk.service"
import { requestMissingCloseEvidence } from "@/services/accounting/close-assurance.service"
import { requestMissingCloseEvidenceInputSchema } from "@/services/accounting/close-assurance.schemas"
import { assertAccountantWorkClient } from "@/services/accounting/accountant-work-desk.service"
const options = { permission: "accounting.close.evidence.request", auditResource: "DelegatedEvidenceDesk",
  module: { moduleSlug: "accounting" as const, surface: "accountant-work-desk", accessIntent: "read" as const, mode: "enforce" as const } }
const read = protect({ ...options, auditAllowed: false }, async (input: unknown, ctx) => {
  const control = await closeEvidenceWorkControl(ctx)
  return getDelegatedEvidenceDesk({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, session: control.session }, input)
})
const request = protect({ ...options, module: { ...options.module, accessIntent: "write" as const } }, async (input: unknown, ctx) => {
  const parsed = requestMissingCloseEvidenceInputSchema.required({ clientOrganizationId: true, correlationId: true }).strict().parse(input)
  const control = await closeEvidenceWorkControl(ctx)
  await assertAccountantWorkClient({ homeOrganizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, session: control.session }, parsed.clientOrganizationId, "write")
  return requestMissingCloseEvidence(ctx.orgId, parsed, control)
})
export async function getDelegatedEvidenceDeskAction(input: unknown) { return read(input) }
export async function requestDelegatedEvidenceAction(input: unknown) { return request(input) }
