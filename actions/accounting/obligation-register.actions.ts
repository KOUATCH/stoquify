"use server"
import { protect } from "@/services/_shared/protect"
import { closeEvidenceWorkControl, closeEvidenceAcceptanceControl } from "@/services/accounting/close-evidence-acceptance-context"
import { getObligationRegister, recordObligationRevision } from "@/services/compliance/obligation-register.service"
import { obligationCommandSchema } from "@/services/compliance/obligation-register.contract"
import { BusinessRuleError } from "@/services/_shared/action-errors"
const modulePolicy = { moduleSlug: "accounting" as const, surface: "firm-obligation-register", mode: "enforce" as const }
const read = protect({ permission: "accounting.close.read", auditResource: "FirmObligation", auditAllowed: false,
  module: { ...modulePolicy, accessIntent: "read" } }, async (raw: unknown, ctx) => getObligationRegister({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, raw))
const save = protect({ permission: "accounting.close.finding.comment", auditResource: "FirmObligation",
  module: { ...modulePolicy, accessIntent: "write" } }, async (raw: unknown, ctx) => {
  const input = obligationCommandSchema.parse(raw)
  if (input.command !== "SAVE") throw new BusinessRuleError("Use the independent review action.")
  return recordObligationRevision({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input)
})
const review = protect({ permission: "accounting.close.accountant.review", auditResource: "FirmObligation", freshAuth: { maxAgeSeconds: 300 },
  module: { ...modulePolicy, accessIntent: "write" } }, async (raw: unknown, ctx) => {
  const input = obligationCommandSchema.parse(raw)
  if (input.command === "SAVE") throw new BusinessRuleError("Use the preparation action.")
  return recordObligationRevision({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx) }, input)
})
export async function getObligationRegisterAction(raw: unknown) { return read(raw) }
export async function saveObligationAction(raw: unknown) { return save(raw) }
export async function reviewObligationAction(raw: unknown) { return review(raw) }
