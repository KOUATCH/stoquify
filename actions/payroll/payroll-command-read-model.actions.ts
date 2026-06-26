"use server"

import { protect } from "@/services/_shared/protect"
import {
  getPayrollCommandReadModel,
  type PayrollCommandReadModel,
} from "@/services/payroll/command-read-model.service"

export type { PayrollCommandReadModel }

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {}
}

const getCommandReadModel = protect<unknown, PayrollCommandReadModel>(
  {
    permission: "payroll.command.read",
    auditResource: "PayrollCommandReadModel",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.command.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const raw = asRecord(input)
    const limit = typeof raw.limit === "number" ? raw.limit : undefined
    const asOf = typeof raw.asOf === "string" || raw.asOf instanceof Date ? new Date(raw.asOf) : undefined

    return getPayrollCommandReadModel({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      limit,
      asOf,
    })
  },
)

export async function getPayrollCommandReadModelAction(input: unknown = {}) {
  return getCommandReadModel(input)
}