import "server-only"

import { Prisma } from "@prisma/client"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"

import {
  OPERATING_ACCESS_REQUIRED_PERMISSION,
  resolveTenantWideOperatingAuthority,
  type AllowedOperatingAccessScope,
  type DeniedOperatingAccessScope,
  type OperatingAccessContext,
  type OperatingAccessScopeDecision,
} from "./operating-access-scope-contracts"

type DbClient = typeof db | Prisma.TransactionClient

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function deniedDecision(
  context: OperatingAccessContext,
  input: Pick<DeniedOperatingAccessScope, "reason" | "authority">,
): DeniedOperatingAccessScope {
  return {
    allowed: false,
    organizationId: context.orgId,
    actorId: context.userId,
    requiredPermission: OPERATING_ACCESS_REQUIRED_PERMISSION,
    authority: input.authority,
    reason: input.reason,
    scope: null,
  }
}

async function writeScopeDecisionAudit(client: DbClient, decision: OperatingAccessScopeDecision) {
  const locationIds =
    decision.allowed && decision.scope.kind === "LOCATIONS" ? decision.scope.locationIds : null

  await client.auditLog.create({
    data: {
      entityType: "OperatingAccessScope",
      entityId: decision.organizationId,
      action: decision.allowed ? "OPERATING_ACCESS_SCOPE_ALLOWED" : "OPERATING_ACCESS_SCOPE_DENIED",
      userId: decision.actorId,
      organizationId: decision.organizationId,
      changes: safeJson({
        requiredPermission: decision.requiredPermission,
        authorityKind: decision.authority.kind,
        authorityBasis: decision.authority.basis,
        locationIds,
        locationCount: locationIds?.length ?? 0,
        reason: decision.allowed ? null : decision.reason,
      }),
    },
  })
}

export async function resolveOperatingAccessScope(
  context: OperatingAccessContext,
  client: DbClient = db,
): Promise<OperatingAccessScopeDecision> {
  if (!hasRbacPermission(context.permissions, OPERATING_ACCESS_REQUIRED_PERMISSION)) {
    const decision = deniedDecision(context, {
      authority: { kind: "DENIED", basis: "RBAC_PERMISSION" },
      reason: "MISSING_DAILY_TRUTH_PERMISSION",
    })
    await writeScopeDecisionAudit(client, decision)
    return decision
  }

  const tenantAuthority = resolveTenantWideOperatingAuthority({
    isSuperUser: context.isSuperUser,
    roleCodes: context.roles.map((role) => role.code),
  })
  if (tenantAuthority) {
    const decision: AllowedOperatingAccessScope = {
      allowed: true,
      organizationId: context.orgId,
      actorId: context.userId,
      requiredPermission: OPERATING_ACCESS_REQUIRED_PERMISSION,
      authority: tenantAuthority,
      scope: {
        kind: "TENANT",
        locationIds: null,
      },
    }
    await writeScopeDecisionAudit(client, decision)
    return decision
  }

  const managedLocations = await client.location.findMany({
    where: {
      organizationId: context.orgId,
      managerId: context.userId,
      isActive: true,
      deletedAt: null,
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
    },
  })

  if (managedLocations.length === 0) {
    const decision = deniedDecision(context, {
      authority: { kind: "DENIED", basis: "LOCATION_ASSIGNMENT" },
      reason: "NO_MANAGED_LOCATIONS",
    })
    await writeScopeDecisionAudit(client, decision)
    return decision
  }

  const decision: AllowedOperatingAccessScope = {
    allowed: true,
    organizationId: context.orgId,
    actorId: context.userId,
    requiredPermission: OPERATING_ACCESS_REQUIRED_PERMISSION,
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
      managedLocations,
    },
    scope: {
      kind: "LOCATIONS",
      locationIds: managedLocations.map((location) => location.id),
    },
  }
  await writeScopeDecisionAudit(client, decision)
  return decision
}
