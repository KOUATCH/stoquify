"use server"

import { revalidatePath } from "next/cache"

import {
  applyApprovedSalaryChange,
  applyApprovedSalaryChangeInputSchema,
  approveSalaryChange,
  approveSalaryChangeInputSchema,
  assignEmployeeRubrique,
  assignEmployeeRubriqueInputSchema,
  getCompensationWorkflow,
  rejectSalaryChange,
  rejectSalaryChangeInputSchema,
  requestSalaryChange,
  requestSalaryChangeInputSchema,
  upsertPayrollRubrique,
  upsertPayrollRubriqueInputSchema,
  type AssignmentMutationResult,
  type CompensationWorkflowResult,
  type RubriqueMutationResult,
  type SalaryChangeMutationResult,
} from "@/services/payroll/compensation.service"
import { protect } from "@/services/_shared/protect"

export type {
  AssignmentMutationResult,
  CompensationWorkflowResult,
  RubriqueMutationResult,
  SalaryChangeMutationResult,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {}
}

function revalidatePayrollCompensationPaths() {
  revalidatePath("/dashboard/payroll", "page")
  revalidatePath("/[locale]/dashboard/payroll", "page")
}

const readCompensation = protect<unknown, CompensationWorkflowResult>(
  {
    permission: "payroll.compensation.read",
    auditResource: "PayrollCompensation",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.compensation.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) =>
    getCompensationWorkflow({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    }),
)

export async function getCompensationWorkflowAction(input: unknown = {}) {
  return readCompensation(input)
}

const upsertRubrique = protect<unknown, RubriqueMutationResult>(
  {
    permission: "payroll.compensation.manage",
    auditResource: "PayrollRubrique",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.compensation.manage",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = upsertPayrollRubriqueInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await upsertPayrollRubrique(parsed)
    revalidatePayrollCompensationPaths()
    return result
  },
)

export async function upsertPayrollRubriqueAction(input: unknown) {
  return upsertRubrique(input)
}

const assignRubrique = protect<unknown, AssignmentMutationResult>(
  {
    permission: "payroll.compensation.manage",
    auditResource: "PayrollEmployeeRubriqueAssignment",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.rubrique.assign",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = assignEmployeeRubriqueInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await assignEmployeeRubrique(parsed)
    revalidatePayrollCompensationPaths()
    return result
  },
)

export async function assignEmployeeRubriqueAction(input: unknown) {
  return assignRubrique(input)
}

const requestSalary = protect<unknown, SalaryChangeMutationResult>(
  {
    permission: "payroll.salary_changes.request",
    auditResource: "PayrollSalaryChangeRequest",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.salary_changes.request",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = requestSalaryChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await requestSalaryChange(parsed)
    revalidatePayrollCompensationPaths()
    return result
  },
)

export async function requestSalaryChangeAction(input: unknown) {
  return requestSalary(input)
}

const approveSalary = protect<unknown, SalaryChangeMutationResult>(
  {
    permission: "payroll.salary_changes.approve",
    auditResource: "PayrollSalaryChangeRequest",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.salary_changes.approve",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = approveSalaryChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await approveSalaryChange(parsed)
    revalidatePayrollCompensationPaths()
    return result
  },
)

export async function approveSalaryChangeAction(input: unknown) {
  return approveSalary(input)
}

const rejectSalary = protect<unknown, SalaryChangeMutationResult>(
  {
    permission: "payroll.salary_changes.approve",
    auditResource: "PayrollSalaryChangeRequest",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.salary_changes.reject",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = rejectSalaryChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await rejectSalaryChange(parsed)
    revalidatePayrollCompensationPaths()
    return result
  },
)

export async function rejectSalaryChangeAction(input: unknown) {
  return rejectSalary(input)
}

const applySalary = protect<unknown, SalaryChangeMutationResult>(
  {
    permission: "payroll.salary_changes.apply",
    auditResource: "PayrollSalaryChangeRequest",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.salary_changes.apply",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = applyApprovedSalaryChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await applyApprovedSalaryChange(parsed)
    revalidatePayrollCompensationPaths()
    return result
  },
)

export async function applyApprovedSalaryChangeAction(input: unknown) {
  return applySalary(input)
}
