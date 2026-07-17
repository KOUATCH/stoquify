"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  applyApprovedHrisSalaryChange,
  approveHrisCompensationAssignment,
  approveHrisSalaryChange,
  getHrisEmployeeCompensation,
  rejectHrisSalaryChange,
  requestHrisCompensationAssignment,
  requestHrisSalaryChange,
  type HrisCompensationAssignmentApprovalInput,
  type HrisCompensationAssignmentRequestInput,
  type HrisCompensationReadInput,
  type HrisSalaryChangeApplyInput,
  type HrisSalaryChangeApprovalInput,
  type HrisSalaryChangeRequestInput,
  type HrisSalaryChangeRejectionInput,
} from "@/services/hris/compensation.service"

export type {
  HrisCompensationAssignmentApprovalInput,
  HrisCompensationAssignmentRequestInput,
  HrisCompensationReadInput,
  HrisSalaryChangeApplyInput,
  HrisSalaryChangeApprovalInput,
  HrisSalaryChangeRequestInput,
  HrisSalaryChangeRejectionInput,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function revalidateCompensationPaths() {
  revalidatePath("/dashboard/people", "page")
  revalidatePath("/[locale]/dashboard/people", "page")
  revalidatePath("/dashboard/payroll/compensation", "page")
  revalidatePath("/[locale]/dashboard/payroll/compensation", "page")
  revalidatePath("/dashboard/payroll/command-center", "page")
  revalidatePath("/[locale]/dashboard/payroll/command-center", "page")
}

const readCompensation = protect<
  unknown,
  Awaited<ReturnType<typeof getHrisEmployeeCompensation>>
>(
  {
    permission: "hris.people.read",
    auditResource: "HrisEmployeeCompensation",
    auditAllowed: false,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => getHrisEmployeeCompensation({
    ...asRecord(input),
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
  } as HrisCompensationReadInput),
)

export async function getHrisEmployeeCompensationAction(input: unknown) {
  return readCompensation(input)
}

function compensationMutation<TInput, TResult>(
  operation: (input: TInput) => Promise<TResult>,
) {
  return protect<unknown, TResult>(
    {
      permission: "hris.people.manage",
      auditResource: "HrisEmployeeCompensation",
      freshAuth: true,
      tenantGuard: "handler-derived",
    },
    async (input, ctx) => {
      const result = await operation({
        ...asRecord(input),
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        actorPermissions: ctx.permissions,
      } as TInput)
      revalidateCompensationPaths()
      return result
    },
  )
}

const requestAssignment = compensationMutation<
  HrisCompensationAssignmentRequestInput,
  Awaited<ReturnType<typeof requestHrisCompensationAssignment>>
>(requestHrisCompensationAssignment)

const approveAssignment = compensationMutation<
  HrisCompensationAssignmentApprovalInput,
  Awaited<ReturnType<typeof approveHrisCompensationAssignment>>
>(approveHrisCompensationAssignment)

const requestSalary = compensationMutation<
  HrisSalaryChangeRequestInput,
  Awaited<ReturnType<typeof requestHrisSalaryChange>>
>(requestHrisSalaryChange)

const approveSalary = compensationMutation<
  HrisSalaryChangeApprovalInput,
  Awaited<ReturnType<typeof approveHrisSalaryChange>>
>(approveHrisSalaryChange)

const rejectSalary = compensationMutation<
  HrisSalaryChangeRejectionInput,
  Awaited<ReturnType<typeof rejectHrisSalaryChange>>
>(rejectHrisSalaryChange)

const applySalary = compensationMutation<
  HrisSalaryChangeApplyInput,
  Awaited<ReturnType<typeof applyApprovedHrisSalaryChange>>
>(applyApprovedHrisSalaryChange)

export async function requestHrisCompensationAssignmentAction(input: unknown) {
  return requestAssignment(input)
}

export async function approveHrisCompensationAssignmentAction(input: unknown) {
  return approveAssignment(input)
}

export async function requestHrisSalaryChangeAction(input: unknown) {
  return requestSalary(input)
}

export async function approveHrisSalaryChangeAction(input: unknown) {
  return approveSalary(input)
}

export async function rejectHrisSalaryChangeAction(input: unknown) {
  return rejectSalary(input)
}

export async function applyApprovedHrisSalaryChangeAction(input: unknown) {
  return applySalary(input)
}
