"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  getPayrollRegister,
  payrollRegisterInputSchema,
  preparePayrollRegisterExport,
  preparePayrollRegisterExportInputSchema,
  type PayrollRegisterExportResult,
  type PayrollRegisterReadModel,
} from "@/services/payroll/payroll-register.service"

export type { PayrollRegisterExportResult, PayrollRegisterReadModel }

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {}
}

function revalidatePayrollRegisterPaths() {
  revalidatePath("/dashboard/payroll/register", "page")
  revalidatePath("/[locale]/dashboard/payroll/register", "page")
}

const getRegister = protect<unknown, PayrollRegisterReadModel>(
  {
    permission: "payroll.reports.read",
    auditResource: "PayrollRegister",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.reports.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = payrollRegisterInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })

    return getPayrollRegister(parsed)
  },
)

export async function getPayrollRegisterAction(input: unknown = {}) {
  return getRegister(input)
}

const prepareRegisterExport = protect<unknown, PayrollRegisterExportResult>(
  {
    permission: "payroll.exports.create",
    auditResource: "PayrollRegister",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.exports.create",
      accessIntent: "export",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const now = new Date()
    const parsed = preparePayrollRegisterExportInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? now,
      now,
    })
    const result = await preparePayrollRegisterExport(parsed)
    revalidatePayrollRegisterPaths()
    return result
  },
)

export async function preparePayrollRegisterExportAction(input: unknown) {
  return prepareRegisterExport(input)
}
