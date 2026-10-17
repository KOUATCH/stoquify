"use server"
import { protect } from "@/services/_shared/protect"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
import { proposeBankBalanceEvidence, decideBankBalanceEvidence, readBankBalanceEvidence, proposeBankBalanceSchema, decideBankBalanceSchema, readBankBalanceSchema } from "@/services/reconciliation/bank-balance-evidence.service"

const modulePolicy = { moduleSlug: "payment_reconciliation" as const, surface: "actions/payments/bank-balance-evidence.actions.ts", surfaceType: "action" as const, accessIntent: "write" as const, mode: "enforce" as const, audit: true }
const propose = protect({ permission: "payments.reconciliation.run", auditResource: "BankBalanceEvidence", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 }, module: modulePolicy }, async (input: unknown, ctx) => {
  const assurance = ctx.freshAuth
  if (!assurance || assurance.claims.userId !== ctx.userId || assurance.claims.tenantId !== ctx.orgId || assurance.claims.assuranceOrganizationId !== ctx.orgId || assurance.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || assurance.claims.lastAuthAt !== assurance.lastAuthAt.getTime()) throw new ForbiddenError("Fresh authentication is required.")
  return proposeBankBalanceEvidence(proposeBankBalanceSchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, lastAuthAt: assurance.lastAuthAt })
})
const decide = protect({ permission: "payments.reconciliation.sign", auditResource: "BankBalanceEvidence", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 }, module: modulePolicy }, async (input: unknown, ctx) => {
  const assurance = ctx.freshAuth
  if (!assurance || assurance.claims.userId !== ctx.userId || assurance.claims.tenantId !== ctx.orgId || assurance.claims.assuranceOrganizationId !== ctx.orgId || assurance.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || assurance.claims.lastAuthAt !== assurance.lastAuthAt.getTime()) throw new ForbiddenError("Fresh authentication is required.")
  return decideBankBalanceEvidence(decideBankBalanceSchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, lastAuthAt: assurance.lastAuthAt })
})
export async function proposeBankBalanceEvidenceAction(input: unknown) { return propose(input) }
export async function decideBankBalanceEvidenceAction(input: unknown) { return decide(input) }
const read = protect({ permission: "payments.reconciliation.read", auditResource: "BankBalanceEvidence", module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) =>
  readBankBalanceEvidence(readBankBalanceSchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }))
export async function readBankBalanceEvidenceAction(input: unknown) { return read(input) }
