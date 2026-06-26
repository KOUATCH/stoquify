"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  getPayrollPayslipSelfService,
  payrollPayslipSelfServiceInputSchema,
  preparePayrollPayslipExport,
  preparePayrollPayslipExportInputSchema,
  type PayrollPayslipExportResult,
  type PayrollPayslipSelfServiceReadModel,
} from "@/services/payroll/payslip-self-service.service"

export type {
  PayrollPayslipExportResult,
  PayrollPayslipSelfServiceReadModel,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {}
}

function revalidatePayrollPayslipPaths() {
  revalidatePath("/dashboard/payroll/payslips", "page")
  revalidatePath("/[locale]/dashboard/payroll/payslips", "page")
}

const getMyPayslips = protect<unknown, PayrollPayslipSelfServiceReadModel>(
  {
    permission: "payroll.payslips.self.read",
    auditResource: "PayrollPayslip",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payslips.self.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = payrollPayslipSelfServiceInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })

    return getPayrollPayslipSelfService(parsed)
  },
)

export async function getMyPayrollPayslipsAction(input: unknown = {}) {
  return getMyPayslips(input)
}

const prepareMyPayslipExport = protect<unknown, PayrollPayslipExportResult>(
  {
    permission: "payroll.payslips.self.export",
    auditResource: "PayrollPayslip",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payslips.self.export",
      accessIntent: "export",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = preparePayrollPayslipExportInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: new Date(),
      now: new Date(),
    })
    const result = await preparePayrollPayslipExport(parsed)
    revalidatePayrollPayslipPaths()
    return result
  },
)

export async function prepareMyPayrollPayslipExportAction(input: unknown) {
  return prepareMyPayslipExport(input)
}
