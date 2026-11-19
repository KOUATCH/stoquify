import "server-only";
import { Prisma, type User } from "@prisma/client";
import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import { ForbiddenError } from "@/services/_shared/action-errors";
import { isUsableAccount } from "@/services/roles/role-custodian-policy";
import { resolveTenantWideOperatingAuthority } from "@/services/operating-access/operating-access-scope-contracts";
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service";
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts";
import type { FollowUpQuery } from "./contracts";

export type Identity = {
  organizationId: string;
  actorId: string;
  session: { id: string; token: string };
};
export type Party = {
  id: string;
  permissions: string[];
  wide: boolean;
  name: string;
};
export const DIGEST_PERMISSIONS = [
  "dashboard.read",
  "finance.read",
  "accounting.close.read",
  "inventory.read",
  "analytics.read",
];
export const persistenceEnabled = () =>
  process.env.COMMAND_CENTER_PERSISTENCE_ENABLED === "true";
export const deny = () =>
  new ForbiddenError(
    "Current access to this follow-up scope is required. Refresh the page.",
  );

export async function loadAuthority(
  tx: Prisma.TransactionClient,
  identity: Identity,
  query: FollowUpQuery,
  ownerId?: string | null,
) {
  if (!persistenceEnabled())
    throw new ForbiddenError(
      "Saved follow-up is not enabled in this environment.",
    );
  // Match the authority-writer lock order; serialize coordination per tenant.
  const orgs = await tx.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT "id" FROM "organizations" WHERE "id"=${identity.organizationId} AND "isActive"=true AND "deletedAt" IS NULL FOR UPDATE`,
  );
  if (orgs.length !== 1) throw deny();
  const ids = [
    ...new Set([identity.actorId, ...(ownerId ? [ownerId] : [])]),
  ].sort();
  const users = await tx.$queryRaw<User[]>(
    Prisma.sql`SELECT "id","firstName","lastName","email","isActive","isVerified","emailVerified","isLocked","lockedUntil" FROM "users" WHERE "organizationId"=${identity.organizationId} AND "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR SHARE`,
  );
  const roles = await tx.$queryRaw<
    { id: string; code: string; permissions: string[] }[]
  >(
    Prisma.sql`SELECT "id","code","permissions" FROM "roles" WHERE "organizationId"=${identity.organizationId} ORDER BY "id" FOR SHARE`,
  );
  const memberships = await tx.$queryRaw<{ userId: string; roleId: string }[]>(
    Prisma.sql`SELECT m."B" AS "userId",m."A" AS "roleId" FROM "_UserRoles" m JOIN "roles" r ON r."id"=m."A" WHERE r."organizationId"=${identity.organizationId} AND m."B" IN (${Prisma.join(ids)}) ORDER BY m."B",m."A" FOR SHARE OF m`,
  );
  const sessions = await tx.$queryRaw<{ expiresAt: Date }[]>(
    Prisma.sql`SELECT "expiresAt" FROM "sessions" WHERE "id"=${identity.session.id} AND "token"=${identity.session.token} AND "userId"=${identity.actorId} FOR SHARE`,
  );
  const party = (id: string): Party => {
    const user = users.find((u) => u.id === id);
    if (!user || !isUsableAccount(user, new Date())) throw deny();
    const assigned = roles.filter((r) =>
      memberships.some((m) => m.userId === id && m.roleId === r.id),
    );
    const permissions = assigned.flatMap((r) => r.permissions);
    return {
      id,
      permissions,
      wide: Boolean(
        resolveTenantWideOperatingAuthority({
          isSuperUser: permissions.includes("*"),
          roleCodes: assigned.map((r) => r.code),
        }),
      ),
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    };
  };
  const actor = party(identity.actorId),
    owner = ownerId ? party(ownerId) : null;
  const revalidate = () => {
    if (!sessions[0] || sessions[0].expiresAt <= new Date()) throw deny();
  };
  revalidate();
  const has = (permission: string) =>
    hasRbacPermission(actor.permissions, permission);
  if (
    !(query.center === "digest"
      ? DIGEST_PERMISSIONS.some(has)
      : has("dashboard.read"))
  )
    throw deny();
  if (query.center === "owner" && !actor.wide) throw deny();
  if (query.locationId) {
    const locations = await tx.$queryRaw<{ managerId: string | null }[]>(
      Prisma.sql`SELECT "managerId" FROM "locations" WHERE "id"=${query.locationId} AND "organizationId"=${identity.organizationId} AND "isActive"=true AND "deletedAt" IS NULL FOR SHARE`,
    );
    if (
      locations.length !== 1 ||
      (!actor.wide && locations[0].managerId !== actor.id) ||
      (owner && !owner.wide && locations[0].managerId !== owner.id)
    )
      throw deny();
  } else if (
    (query.center !== "digest" && !actor.wide) ||
    (owner && (!actor.wide || !owner.wide))
  ) {
    // Shared tenant aggregates cannot broaden a branch/employee-specific scope.
    throw deny();
  }
  if (
    query.center !== "digest" &&
    !(await moduleAllowed(tx, identity.organizationId, actor, "dashboard"))
  )
    throw deny();
  return { actor, owner, revalidate };
}
export async function moduleAllowed(
  tx: Prisma.TransactionClient,
  org: string,
  party: Party,
  moduleSlug: CommercialModuleSlug,
  write = false,
) {
  const decision = await evaluateModuleAccessInTx(tx, {
    organizationId: org,
    userId: party.id,
    actorPermissions: party.permissions,
    moduleSlug,
    surfaceType: "action",
    surface: "command-center:follow-up",
    accessIntent: write ? "write" : "read",
    mode: "enforce",
  });
  return decision.allowed;
}
