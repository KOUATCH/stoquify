"use server"
import { protect } from "@/services/_shared/protect"
import { closeEvidenceWorkControl, closeEvidenceAcceptanceControl } from "@/services/accounting/close-evidence-acceptance-context"
import { getOpeningPositionWorkspace, stageOpeningPosition, reviewOpeningPosition } from "@/services/onboarding/opening-position.service"

const modulePolicy = { moduleSlug: "accounting" as const, surface: "accounting-opening-position", mode: "enforce" as const }
const read = protect({ permission: "accounting.close.read", auditResource: "FinancialOpeningRevision", auditAllowed: false,
  module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) =>
  getOpeningPositionWorkspace({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
const stage = protect({ permission: "accounting.close.finding.comment", auditResource: "FinancialOpeningRevision",
  module: { ...modulePolicy, accessIntent: "write" } }, async (input: unknown, ctx) =>
  stageOpeningPosition({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
const review = protect({ permission: "accounting.close.accountant.review", auditResource: "FinancialOpeningRevision",
  freshAuth: { maxAgeSeconds: 300 }, module: { ...modulePolicy, accessIntent: "write" } }, async (input: unknown, ctx) =>
  reviewOpeningPosition({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx) }, input))
export async function getOpeningPositionWorkspaceAction(input: unknown) { return read(input) }
export async function stageOpeningPositionAction(input: unknown) { return stage(input) }
export async function reviewOpeningPositionAction(input: unknown) { return review(input) }
