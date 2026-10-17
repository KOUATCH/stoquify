"use server"
import { protect } from "@/services/_shared/protect"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
import { proposeBalanceSheetEvidence, decideBalanceSheetEvidence, readBalanceSheetEvidence, proposeBalanceSheetSchema, decideBalanceSheetSchema, readBalanceSheetSchema } from "@/services/accounting/balance-sheet-evidence.service"

const modulePolicy = { moduleSlug: "close_assurance" as const, surface: "actions/accounting/balance-sheet-evidence.actions.ts", surfaceType: "action" as const, accessIntent: "write" as const, mode: "enforce" as const, audit: true }
const propose = protect({ permission: "accounting.close.run", auditResource: "BalanceSheetEvidence", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 }, module: modulePolicy }, async (input: unknown, ctx) => {
  const assurance = ctx.freshAuth
  if (!assurance || assurance.claims.userId !== ctx.userId || assurance.claims.tenantId !== ctx.orgId || assurance.claims.assuranceOrganizationId !== ctx.orgId || assurance.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || assurance.claims.lastAuthAt !== assurance.lastAuthAt.getTime()) throw new ForbiddenError("Fresh authentication is required.")
  return proposeBalanceSheetEvidence(proposeBalanceSheetSchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, lastAuthAt: assurance.lastAuthAt })
})
const decide = protect({ permission: "accounting.close.certify", auditResource: "BalanceSheetEvidence", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 }, module: modulePolicy }, async (input: unknown, ctx) => {
  const assurance = ctx.freshAuth
  if (!assurance || assurance.claims.userId !== ctx.userId || assurance.claims.tenantId !== ctx.orgId || assurance.claims.assuranceOrganizationId !== ctx.orgId || assurance.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || assurance.claims.lastAuthAt !== assurance.lastAuthAt.getTime()) throw new ForbiddenError("Fresh authentication is required.")
  return decideBalanceSheetEvidence(decideBalanceSheetSchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, lastAuthAt: assurance.lastAuthAt })
})
export async function proposeBalanceSheetEvidenceAction(input: unknown) { return propose(input) }
export async function decideBalanceSheetEvidenceAction(input: unknown) { return decide(input) }
const read = protect({ permission: "accounting.close.read", auditResource: "BalanceSheetEvidence", module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) =>
  readBalanceSheetEvidence(readBalanceSheetSchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }))
export async function readBalanceSheetEvidenceAction(input: unknown) { return read(input) }
