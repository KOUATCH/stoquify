import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { BusinessRuleError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { resolveAccountantClientAccess, toAccountantAccessGrantDto } from "./accountant-access.service"
import { accountantPortfolioInputSchema, type AccountantPortfolioInput } from "./accountant-access.schemas"
import { readAccountantPortfolioProof } from "./accountant-portfolio-proof.service"
import { accountantScopeKeys } from "./managed-accountant-access.service"

export type AccountantPortfolioActor = {
  homeOrganizationId: string
  actorId: string
  actorPermissions: readonly string[]
}
type PortfolioClient = Awaited<ReturnType<typeof readAccountantPortfolioProof>> & {
  grant: ReturnType<typeof toAccountantAccessGrantDto>
  client: { organizationId: string; name: string; countryCode: string | null; currency: string }
}
export type AccountantPortfolio = {
  generatedAt: string
  accountantUserId: string
  /** Number returned on this page, never a whole-portfolio total. */
  clientCount: number
  clients: PortfolioClient[]
  page: {
    scope: "AUTHORIZED_CLIENTS_IN_GRANT_PAGE"
    loadedCount: number
    pageSize: number
    search: string
    nextCursor: string | null
    hasMore: boolean
    coverage: "PARTIAL" | "END_OF_SCAN"
  }
}

const cursorSchema = z.object({
  version: z.literal(1), actorId: z.string(), homeOrganizationId: z.string(),
  search: z.string(), pageSize: z.number(), after: z.string().min(1).max(191),
}).strict()

async function assertActor(actor: AccountantPortfolioActor) {
  if (!hasRbacPermission(actor.actorPermissions, "accounting.audit.read")) throw new ForbiddenError("Accountant read access is required.")
  const user = await db.user.findFirst({
    where: { id: actor.actorId, organizationId: actor.homeOrganizationId, isActive: true },
    include: { roles: true, organization: true },
  })
  if (!user || !isUsableAccount(user, new Date()) || !user.organization.isActive || user.organization.deletedAt) {
    throw new ForbiddenError("Active accountant membership is required.")
  }
  const permissions = expandPermissions(user.roles.filter(r => r.organizationId === actor.homeOrganizationId).flatMap(r => r.permissions))
  if (!hasRbacPermission(permissions, "accounting.audit.read")) throw new ForbiddenError("Current accountant read access is required.")
  await assertModule(actor.homeOrganizationId, actor.actorId, permissions, "accounting")
  return permissions
}

async function assertModule(
  organizationId: string, actorId: string, permissions: readonly string[],
  moduleSlug: "accounting" | "close_assurance",
) {
  const decision = await observeModuleAccess({
    organizationId, userId: actorId, actorPermissions: permissions, moduleSlug,
    surfaceType: "action", surface: "accountant-portfolio", accessIntent: "read", mode: "enforce", audit: false,
  })
  if (!decision.allowed) throw new ForbiddenError("Accountant workspace access is unavailable.")
}

async function assertClient(actor: AccountantPortfolioActor, organizationId: string, grantId: string, permissions: readonly string[]) {
  const access = await resolveAccountantClientAccess({
    homeOrganizationId: actor.homeOrganizationId, clientOrganizationId: organizationId,
    accountantUserId: actor.actorId, capability: "READ",
  })
  if (access.mode !== "DELEGATED_ACCOUNTANT" || access.grant?.id !== grantId) throw new ForbiddenError("Client mandate changed.")
  await assertModule(organizationId, actor.actorId, permissions, "close_assurance")
  return access.grant
}

export async function getAccountantPortfolio(
  actor: AccountantPortfolioActor, input: AccountantPortfolioInput = {},
): Promise<AccountantPortfolio> {
  const parsed = accountantPortfolioInputSchema.parse(input)
  const permissions = await assertActor(actor)
  const scope = { version: 1 as const, actorId: actor.actorId, homeOrganizationId: actor.homeOrganizationId, search: parsed.search, pageSize: parsed.pageSize }
  let after: string | undefined
  if (parsed.cursor) {
    try {
      const cursor = cursorSchema.parse(JSON.parse(Buffer.from(parsed.cursor, "base64url").toString("utf8")))
      if (Object.entries(scope).some(([key, value]) => cursor[key as keyof typeof cursor] !== value)) throw new Error()
      after = cursor.after
    } catch { throw new BusinessRuleError("This portfolio page is no longer valid. Restart the portfolio search.") }
  }
  const now = new Date()
  const candidates = await db.accountantAccessGrant.findMany({
    where: {
      accountantUserId: actor.actorId, organizationId: { not: actor.homeOrganizationId },
      status: "ACTIVE", effectiveFrom: { lte: now }, expiresAt: { gt: now }, activeScopeKey: { not: null },
      organization: { is: { isActive: true, deletedAt: null,
        ...(parsed.search ? { name: { contains: parsed.search, mode: "insensitive" as const } } : {}) } },
      ...(after ? { id: { gt: after } } : {}),
    },
    select: { id: true, organizationId: true }, orderBy: { id: "asc" }, take: parsed.pageSize + 1,
  })
  const page = candidates.slice(0, parsed.pageSize)
  const clients: PortfolioClient[] = []
  // Sequential bounded transactions avoid bursting the pool across tenants.
  for (const candidate of page) {
    try {
      await assertClient(actor, candidate.organizationId, candidate.id, permissions)
      const row = await db.$transaction(async tx => {
        const checkedAt = new Date()
        const grant = await tx.accountantAccessGrant.findFirst({
          where: { id: candidate.id, organizationId: candidate.organizationId, accountantUserId: actor.actorId,
            activeScopeKey: { in: accountantScopeKeys(candidate.organizationId, actor.actorId) }, status: "ACTIVE",
            effectiveFrom: { lte: checkedAt }, expiresAt: { gt: checkedAt },
            organization: { is: { isActive: true, deletedAt: null } } },
          include: { organization: { select: { id: true, name: true, countryCode: true, currency: true } } },
        })
        if (!grant) throw new ForbiddenError("Client mandate changed.")
        const proof = await readAccountantPortfolioProof(tx, candidate.organizationId, checkedAt)
        return { ...proof, grant: toAccountantAccessGrantDto(grant, checkedAt), client: {
          organizationId: grant.organization.id, name: grant.organization.name,
          countryCode: grant.organization.countryCode, currency: grant.organization.currency,
        } }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
      clients.push(row)
    } catch (error) {
      if (!(error instanceof ForbiddenError) && !(error instanceof NotFoundError)) throw error
      // No client identity, proof or denial reason leaves this boundary.
    }
  }
  const currentPermissions = await assertActor(actor)
  const authorized: PortfolioClient[] = []
  // Recheck ALL accumulated rows after fan-out, including the first client.
  for (const row of clients) {
    try {
      row.grant = await assertClient(actor, row.client.organizationId, row.grant.id, currentPermissions)
      authorized.push(row)
    } catch (error) {
      if (!(error instanceof ForbiddenError) && !(error instanceof NotFoundError)) throw error
    }
  }
  await assertActor(actor)
  const hasMore = candidates.length > page.length
  const nextCursor = hasMore ? Buffer.from(JSON.stringify({ ...scope, after: page[page.length - 1]!.id })).toString("base64url") : null
  return {
    generatedAt: new Date().toISOString(), accountantUserId: actor.actorId, clientCount: authorized.length, clients: authorized,
    page: { scope: "AUTHORIZED_CLIENTS_IN_GRANT_PAGE", loadedCount: authorized.length, pageSize: parsed.pageSize,
      search: parsed.search, nextCursor, hasMore, coverage: hasMore ? "PARTIAL" : "END_OF_SCAN" },
  }
}
