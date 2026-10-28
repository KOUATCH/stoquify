"use server"

import {
  exportAccountantTrustPack,
  getAccountantPortalData,
  type AccountantPortalData,
  type AccountantTrustPackExport,
} from "@/services/accounting/data-trust.service"
import {
  FreshAuthRequiredError,
  SESSION_ASSURANCE_LEVEL,
} from "@/lib/security/auth-session"
import { resolveAccountantClientAccess } from "@/services/accounting/accountant-access.service"
import {
  accountantPortalInputSchema,
  exportAccountantTrustPackInputSchema,
} from "@/services/accounting/data-trust.schemas"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"

export type { AccountantPortalData, AccountantTrustPackExport }

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {}
}

const getPortal = protect<unknown, AccountantPortalData>(
  {
    permission: "accounting.audit.read",
    auditResource: "AccountantPortal",
    auditAllowed: false,
  },
  async (input, ctx) => {
    const parsed = accountantPortalInputSchema.parse(asRecord(input))
    const access = await resolveAccountantClientAccess({
      homeOrganizationId: ctx.orgId,
      clientOrganizationId: parsed?.clientOrganizationId,
      accountantUserId: ctx.userId,
      capability: "READ",
    })
    return getAccountantPortalData({
      organizationId: access.organizationId,
      periodId: parsed?.periodId,
      startDate: parsed?.startDate,
      endDate: parsed?.endDate,
      limit: parsed?.limit,
    })
  },
)

export async function getAccountantPortalAction(input: unknown = {}) {
  return getPortal(input)
}

const exportTrustPack = protect<unknown, AccountantTrustPackExport>(
  {
    permission: "accounting.exports.create",
    auditResource: "AccountantTrustPack",
    freshAuth: { maxAgeSeconds: 300 },
  },
  async (input, ctx) => {
    const lastAuthAt = verifiedFreshAuthTime(ctx)
    const parsed = exportAccountantTrustPackInputSchema.parse(asRecord(input))
    const access = await resolveAccountantClientAccess({
      homeOrganizationId: ctx.orgId,
      clientOrganizationId: parsed?.clientOrganizationId,
      accountantUserId: ctx.userId,
      capability: "EXPORT",
    })
    return exportAccountantTrustPack({
      organizationId: access.organizationId,
      exportedById: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt,
      periodId: parsed?.periodId,
      startDate: parsed?.startDate,
      endDate: parsed?.endDate,
      fileType: parsed?.fileType ?? "json",
      includeLedgerRows: parsed?.includeLedgerRows ?? false,
    })
  },
)

export async function exportAccountantTrustPackAction(input: unknown = {}) {
  return exportTrustPack(input)
}

function verifiedFreshAuthTime(ctx: ProtectedActionContext): Date {
  const freshAuth = ctx.freshAuth
  if (
    !freshAuth ||
    freshAuth.claims.userId !== ctx.userId ||
    freshAuth.claims.tenantId !== ctx.orgId ||
    freshAuth.claims.assuranceOrganizationId !== ctx.orgId ||
    !Number.isFinite(freshAuth.claims.assuranceLevel) ||
    freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
    freshAuth.claims.lastAuthAt !== freshAuth.lastAuthAt.getTime()
  ) {
    throw new FreshAuthRequiredError()
  }

  return freshAuth.lastAuthAt
}
