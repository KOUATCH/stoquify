"use server"

import {
  exportAccountantTrustPack,
  getAccountantPortalData,
  type AccountantPortalData,
  type AccountantTrustPackExport,
} from "@/services/accounting/data-trust.service"
import {
  accountantPortalInputSchema,
  exportAccountantTrustPackInputSchema,
} from "@/services/accounting/data-trust.schemas"
import { protect } from "@/services/_shared/protect"

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
    return getAccountantPortalData({
      organizationId: ctx.orgId,
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
    const parsed = exportAccountantTrustPackInputSchema.parse(asRecord(input))
    return exportAccountantTrustPack({
      organizationId: ctx.orgId,
      exportedById: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: new Date(),
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
