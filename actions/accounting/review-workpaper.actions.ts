"use server"
import { protect } from "@/services/_shared/protect"
import { closeEvidenceWorkControl, closeEvidenceAcceptanceControl } from "@/services/accounting/close-evidence-acceptance-context"
import { getReviewWorkpaperBinder, recordWorkpaperDecision, rollForwardWorkpaperStructure, exportReviewWorkpapers } from "@/services/accounting/review-workpaper.service"
import { workpaperDecisionSchema } from "@/services/accounting/review-workpaper.contract"
const modulePolicy = { moduleSlug: "accounting" as const, surface: "accountant-review-workpapers", mode: "enforce" as const }
const read = protect({ permission: "accounting.close.read", auditResource: "ReviewWorkpaper", auditAllowed: false,
  module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) =>
  getReviewWorkpaperBinder({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
const prepare = protect({ permission: "accounting.close.finding.comment", auditResource: "ReviewWorkpaper",
  module: { ...modulePolicy, accessIntent: "write" } }, async (input: unknown, ctx) => {
  const command = workpaperDecisionSchema.parse(input)
  if (command.decision !== "PREPARED") throw new Error("Use the independent review action.")
  return recordWorkpaperDecision({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, command)
})
const review = protect({ permission: "accounting.close.accountant.review", auditResource: "ReviewWorkpaper",
  freshAuth: { maxAgeSeconds: 300 }, module: { ...modulePolicy, accessIntent: "write" } }, async (input: unknown, ctx) =>
  recordWorkpaperDecision({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx) }, input))
const roll = protect({ permission: "accounting.close.finding.comment", auditResource: "ReviewWorkpaper",
  module: { ...modulePolicy, accessIntent: "write" } }, async (input: unknown, ctx) =>
  rollForwardWorkpaperStructure({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
const exportPack = protect({ permission: "accounting.exports.create", auditResource: "ReviewWorkpaper",
  freshAuth: { maxAgeSeconds: 300 }, module: { ...modulePolicy, accessIntent: "export" } }, async (input: unknown, ctx) =>
  exportReviewWorkpapers({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx), lastAuthAt: ctx.freshAuth!.lastAuthAt }, input))
export async function getReviewWorkpaperBinderAction(input: unknown) { return read(input) }
export async function prepareReviewWorkpaperAction(input: unknown) { return prepare(input) }
export async function reviewWorkpaperAction(input: unknown) { return review(input) }
export async function rollForwardWorkpaperAction(input: unknown) { return roll(input) }
export async function exportReviewWorkpapersAction(input: unknown) { return exportPack(input) }
