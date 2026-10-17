"use server"
import { protect } from "@/services/_shared/protect"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
import { proposeNoActivityEvidence, decideNoActivityEvidence, readNoActivityEvidence, proposeNoActivitySchema, decideNoActivitySchema, readNoActivitySchema } from "@/services/reconciliation/no-activity-evidence.service"

const modulePolicy = { moduleSlug: "payment_reconciliation" as const, surface: "actions/payments/no-activity-evidence.actions.ts", surfaceType: "action" as const, accessIntent: "write" as const, mode: "enforce" as const, audit: true }
const propose = protect({ permission: "payments.reconciliation.run", auditResource: "ReconciliationNoActivityEvidence", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 }, module: modulePolicy }, async (input: unknown, ctx) => {
  const assurance = ctx.freshAuth
  if (!assurance || assurance.claims.userId !== ctx.userId || assurance.claims.tenantId !== ctx.orgId || assurance.claims.assuranceOrganizationId !== ctx.orgId || assurance.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || assurance.claims.lastAuthAt !== assurance.lastAuthAt.getTime()) throw new ForbiddenError("Fresh authentication is required.")
  return proposeNoActivityEvidence(proposeNoActivitySchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, lastAuthAt: assurance.lastAuthAt })
})
const decide = protect({ permission: "payments.reconciliation.sign", auditResource: "ReconciliationNoActivityEvidence", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 }, module: modulePolicy }, async (input: unknown, ctx) => {
  const assurance = ctx.freshAuth
  if (!assurance || assurance.claims.userId !== ctx.userId || assurance.claims.tenantId !== ctx.orgId || assurance.claims.assuranceOrganizationId !== ctx.orgId || assurance.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || assurance.claims.lastAuthAt !== assurance.lastAuthAt.getTime()) throw new ForbiddenError("Fresh authentication is required.")
  return decideNoActivityEvidence(decideNoActivitySchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, lastAuthAt: assurance.lastAuthAt })
})
export async function proposeNoActivityEvidenceAction(input: unknown) { return propose(input) }
export async function decideNoActivityEvidenceAction(input: unknown) { return decide(input) }
const read = protect({ permission: "payments.reconciliation.read", auditResource: "ReconciliationNoActivityEvidence", module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) =>
  readNoActivityEvidence(readNoActivitySchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }))
export async function readNoActivityEvidenceAction(input: unknown) { return read(input) }
