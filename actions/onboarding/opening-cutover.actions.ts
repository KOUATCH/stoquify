"use server"
import { protect } from "@/services/_shared/protect"
import { closeEvidenceWorkControl, closeEvidenceAcceptanceControl } from "@/services/accounting/close-evidence-acceptance-context"
import { getOpeningCutoverWorkspace, approveOpeningCutover, applyOpeningCutover, cancelOpeningCutover } from "@/services/onboarding/opening-cutover.service"

const modulePolicy = { moduleSlug: "accounting" as const, surface: "accounting-opening-position", mode: "enforce" as const }
const read = protect({ permission: "accounting.close.read", auditResource: "FinancialOpeningExecution", auditAllowed: false,
  module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) =>
  getOpeningCutoverWorkspace({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
const policy = { permission: "accounting.journal.post" as const, auditResource: "FinancialOpeningExecution",
  freshAuth: { maxAgeSeconds: 300 }, module: { ...modulePolicy, accessIntent: "write" as const } }
const approve = protect(policy, async (input: unknown, ctx) => approveOpeningCutover({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx) }, input))
const apply = protect(policy, async (input: unknown, ctx) => applyOpeningCutover({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx) }, input))
const cancel = protect(policy, async (input: unknown, ctx) => cancelOpeningCutover({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx) }, input))
export async function getOpeningCutoverWorkspaceAction(input: unknown) { return read(input) }
export async function approveOpeningCutoverAction(input: unknown) { return approve(input) }
export async function applyOpeningCutoverAction(input: unknown) { return apply(input) }
export async function cancelOpeningCutoverAction(input: unknown) { return cancel(input) }
