"use server"

import { revalidatePath } from "next/cache"

import {
  createPayrollContract,
  createPayrollContractInputSchema,
  getEmployeeContractWorkflow,
  resolvePayrollEmployeeForUser,
  resolvePayrollEmployeeForUserInputSchema,
  terminatePayrollContract,
  terminatePayrollContractInputSchema,
  updatePayrollContract,
  updatePayrollContractInputSchema,
  type PayrollContractMutationResult,
  type PayrollEmployeeContractWorkflowResult,
  type PayrollEmployeeUserResolution,
} from "@/services/payroll/contract.service"
import { protect } from "@/services/_shared/protect"

export type {
  PayrollContractMutationResult,
  PayrollEmployeeContractWorkflowResult,
  PayrollEmployeeUserResolution,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {}
}

function revalidatePayrollContractPaths() {
  revalidatePath("/dashboard/payroll", "page")
  revalidatePath("/[locale]/dashboard/payroll", "page")
  revalidatePath("/dashboard/payroll/contracts", "page")
  revalidatePath("/[locale]/dashboard/payroll/contracts", "page")
}

const getEmployeeContracts = protect<unknown, PayrollEmployeeContractWorkflowResult>(
  {
    permission: "payroll.contracts.read",
    auditResource: "PayrollContract",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.contracts.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const raw = asRecord(input)
    return getEmployeeContractWorkflow({
      ...raw,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
  },
)

export async function getEmployeeContractWorkflowAction(input: unknown = {}) {
  return getEmployeeContracts(input)
}

const resolveEmployeeForUser = protect<unknown, PayrollEmployeeUserResolution>(
  {
    permission: "payroll.contracts.read",
    auditResource: "PayrollEmployee",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.employee_user.resolve",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = resolvePayrollEmployeeForUserInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    return resolvePayrollEmployeeForUser(parsed)
  },
)

export async function resolvePayrollEmployeeForUserAction(input: unknown) {
  return resolveEmployeeForUser(input)
}

const createContract = protect<unknown, PayrollContractMutationResult>(
  {
    permission: "payroll.contracts.manage",
    auditResource: "PayrollContract",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.contracts.create",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = createPayrollContractInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await createPayrollContract(parsed)
    revalidatePayrollContractPaths()
    return result
  },
)

export async function createPayrollContractAction(input: unknown) {
  return createContract(input)
}

const updateContract = protect<unknown, PayrollContractMutationResult>(
  {
    permission: "payroll.contracts.manage",
    auditResource: "PayrollContract",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.contracts.update",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = updatePayrollContractInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await updatePayrollContract(parsed)
    revalidatePayrollContractPaths()
    return result
  },
)

export async function updatePayrollContractAction(input: unknown) {
  return updateContract(input)
}

const terminateContract = protect<unknown, PayrollContractMutationResult>(
  {
    permission: "payroll.contracts.manage",
    auditResource: "PayrollContract",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.contracts.terminate",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = terminatePayrollContractInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await terminatePayrollContract(parsed)
    revalidatePayrollContractPaths()
    return result
  },
)

export async function terminatePayrollContractAction(input: unknown) {
  return terminateContract(input)
}
