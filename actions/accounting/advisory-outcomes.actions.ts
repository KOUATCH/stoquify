"use server"
import { protect } from "@/services/_shared/protect"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { closeEvidenceWorkControl, closeEvidenceAcceptanceControl } from "@/services/accounting/close-evidence-acceptance-context"
import { advisoryCommandSchema } from "@/services/accounting/advisory-outcomes.contract"
import { listAdvisoryEngagements, getAdvisoryDesk, getAdvisoryPrivateNotes, executeAdvisoryCommand, exportAdvisoryPack, getAdvisoryOutcomes } from "@/services/accounting/advisory-outcomes.service"
const modulePolicy = { moduleSlug: "accounting" as const, surface: "accountant-advisory-outcomes", mode: "enforce" as const }
const list = protect({ permission: "accounting.close.read", auditResource: "FirmAdvisoryRevision", auditAllowed: false,
  module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) => listAdvisoryEngagements({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
const read = protect({ permission: "accounting.close.read", auditResource: "FirmAdvisoryRevision", auditAllowed: false,
  module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) => getAdvisoryDesk({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
const notes = protect({ permission: "accounting.close.finding.comment", auditResource: "FirmAdvisoryRevision", auditAllowed: false,
  module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) => getAdvisoryPrivateNotes({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
const draft = protect({ permission: "accounting.close.finding.comment", auditResource: "FirmAdvisoryRevision",
  module: { ...modulePolicy, accessIntent: "write" } }, async (input: unknown, ctx) => {
  const command = advisoryCommandSchema.parse(input)
  if (!["DRAFT", "AGREE"].includes(command.command)) throw new BusinessRuleError("Use the review or delivery action.")
  return executeAdvisoryCommand({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, command)
})
const review = protect({ permission: "accounting.close.accountant.review", auditResource: "FirmAdvisoryRevision", freshAuth: { maxAgeSeconds: 300 },
  module: { ...modulePolicy, accessIntent: "write" } }, async (input: unknown, ctx) => {
  const command = advisoryCommandSchema.parse(input)
  if (!["REVIEW", "CHANGES_REQUESTED"].includes(command.command)) throw new BusinessRuleError("Use the preparation or delivery action.")
  return executeAdvisoryCommand({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx) }, command)
})
const deliver = protect({ permission: "accounting.exports.create", auditResource: "FirmAdvisoryRevision", freshAuth: { maxAgeSeconds: 300 },
  module: { ...modulePolicy, accessIntent: "export" } }, async (input: unknown, ctx) => {
  const command = advisoryCommandSchema.parse(input)
  if (command.command !== "DELIVER") throw new BusinessRuleError("Use the preparation or review action.")
  return executeAdvisoryCommand({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx), lastAuthAt: ctx.freshAuth!.lastAuthAt }, command)
})
const exportPack = protect({ permission: "accounting.exports.create", auditResource: "FirmAdvisoryRevision", freshAuth: { maxAgeSeconds: 300 },
  module: { ...modulePolicy, accessIntent: "export" } }, async (input: unknown, ctx) =>
  exportAdvisoryPack({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx), lastAuthAt: ctx.freshAuth!.lastAuthAt }, input))
const metrics = protect({ permission: "accounting.close.accountant.invite", auditResource: "FirmAdvisoryOutcomes", auditAllowed: false,
  module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) => getAdvisoryOutcomes({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
export async function listAdvisoryEngagementsAction(input: unknown) { return list(input) }
export async function getAdvisoryDeskAction(input: unknown) { return read(input) }
export async function getAdvisoryPrivateNotesAction(input: unknown) { return notes(input) }
export async function prepareAdvisoryAction(input: unknown) { return draft(input) }
export async function reviewAdvisoryAction(input: unknown) { return review(input) }
export async function deliverAdvisoryAction(input: unknown) { return deliver(input) }
export async function exportAdvisoryAction(input: unknown) { return exportPack(input) }
export async function getAdvisoryOutcomesAction(input: unknown) { return metrics(input) }
