"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  attachPayrollEmployeeEvidenceReferences,
  getPayrollEmployeeSourceData,
  upsertPayrollEmployeeSourceProfile,
  type AttachPayrollEmployeeEvidenceInput,
  type PayrollEmployeeProfileInput,
  type PayrollEmployeeSourceDataResult,
} from "@/services/payroll/employee.service"

export type {
  AttachPayrollEmployeeEvidenceInput,
  PayrollEmployeeProfileInput,
  PayrollEmployeeSourceDataResult,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function revalidatePayrollEmployeePaths() {
  revalidatePath("/dashboard/payroll", "page")
  revalidatePath("/[locale]/dashboard/payroll", "page")
  revalidatePath("/dashboard/payroll/employees", "page")
  revalidatePath("/[locale]/dashboard/payroll/employees", "page")
  revalidatePath("/dashboard/payroll/setup", "page")
  revalidatePath("/[locale]/dashboard/payroll/setup", "page")
}

const readEmployeeSourceData = protect<unknown, PayrollEmployeeSourceDataResult>(
  {
    permission: "payroll.employees.read",
    auditResource: "PayrollEmployee",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.employees.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const raw = asRecord(input)
    const limit = typeof raw.limit === "number" ? raw.limit : undefined
    const asOf = typeof raw.asOf === "string" || raw.asOf instanceof Date ? new Date(raw.asOf) : undefined

    return getPayrollEmployeeSourceData({
      ...raw,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      ...(limit ? { limit } : {}),
      ...(asOf ? { asOf } : {}),
    })
  },
)

export async function getPayrollEmployeeSourceDataAction(input: unknown = {}) {
  return readEmployeeSourceData(input)
}

const upsertEmployeeSourceProfile = protect<unknown, Awaited<ReturnType<typeof upsertPayrollEmployeeSourceProfile>>>(
  {
    permission: "payroll.employees.manage",
    auditResource: "PayrollEmployee",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.employees.manage",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const payload = {
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as PayrollEmployeeProfileInput
    const result = await upsertPayrollEmployeeSourceProfile(payload)
    revalidatePayrollEmployeePaths()
    return result
  },
)

export async function upsertPayrollEmployeeSourceProfileAction(input: unknown) {
  return upsertEmployeeSourceProfile(input)
}

const attachEmployeeEvidence = protect<unknown, Awaited<ReturnType<typeof attachPayrollEmployeeEvidenceReferences>>>(
  {
    permission: "payroll.employees.manage",
    auditResource: "PayrollEmployee",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.employees.evidence",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const payload = {
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as AttachPayrollEmployeeEvidenceInput
    const result = await attachPayrollEmployeeEvidenceReferences(payload)
    revalidatePayrollEmployeePaths()
    return result
  },
)

export async function attachPayrollEmployeeEvidenceReferencesAction(input: unknown) {
  return attachEmployeeEvidence(input)
}
