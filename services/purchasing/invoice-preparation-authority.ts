import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { ForbiddenError } from "@/services/_shared/action-errors"

export const invoicePreparationScopeSchema = z.object({ organizationId: z.string().min(1), actorId: z.string().min(1), sessionId: z.string().min(1), sessionToken: z.string().min(1) }).strict()
export type InvoicePreparationScope = z.infer<typeof invoicePreparationScopeSchema>

export async function invoicePreparationAuthority(tx: Prisma.TransactionClient, scope: InvoicePreparationScope, operation: "load" | "review" | "submit") {
  // These are preparation sources, including prices; ordinary AP viewing does not grant preparation access.
  const access = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "purchasing", surfaceType: "action", surface: `actions/purchasing/invoice-preparation.actions.ts:${operation}InvoicePreparation`, accessIntent: operation === "load" ? "read" : "write", mode: "enforce" })
  if (!access.allowed) throw new ForbiddenError("Current purchasing access is required.")
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, "purchasing.ap.invoice.post")) throw new ForbiddenError("Current invoice preparation authority is required.")
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId} AND "userId" = ${scope.actorId} FOR SHARE`
  const session = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: now } }, select: { id: true } })
  if (!session) throw new ForbiddenError("Your session expired or was revoked. Sign in again.")
}
