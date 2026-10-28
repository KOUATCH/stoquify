"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  applyApprovedHrisEmployeeLifecycle,
  approveHrisEmployeeLifecycle,
  getHrisEmployeeLifecycleTimeline,
  rejectHrisEmployeeLifecycle,
  requestHrisEmployeeLifecycle,
  type HrisLifecycleApplyInput,
  type HrisLifecycleDecisionInput,
  type HrisLifecycleRequestInput,
  type HrisLifecycleTimelineInput,
} from "@/services/hris/lifecycle.service"

export type {
  HrisLifecycleApplyInput,
  HrisLifecycleDecisionInput,
  HrisLifecycleRequestInput,
  HrisLifecycleTimelineInput,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function revalidateLifecyclePaths() {
  revalidatePath("/dashboard/people", "page")
  revalidatePath("/[locale]/dashboard/people", "page")
  revalidatePath("/dashboard/payroll/employees", "page")
  revalidatePath("/[locale]/dashboard/payroll/employees", "page")
  revalidatePath("/dashboard/payroll/command-center", "page")
  revalidatePath("/[locale]/dashboard/payroll/command-center", "page")
}

const readLifecycleTimeline = protect<unknown, Awaited<ReturnType<typeof getHrisEmployeeLifecycleTimeline>>>(
  {
    permission: "hris.people.read",
    auditResource: "HrisEmployeeLifecycle",
    auditAllowed: false,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const raw = asRecord(input)
    return getHrisEmployeeLifecycleTimeline({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      employeeId: typeof raw.employeeId === "string" ? raw.employeeId : "",
      limit: typeof raw.limit === "number" ? raw.limit : undefined,
    })
  },
)

export async function getHrisEmployeeLifecycleTimelineAction(input: unknown) {
  return readLifecycleTimeline(input)
}

function lifecycleMutation<T>(
  operation: (input: T) => Promise<unknown>,
) {
  return protect<unknown, Awaited<ReturnType<typeof operation>>>(
    {
      permission: "hris.people.manage",
      auditResource: "HrisEmployeeLifecycle",
      freshAuth: true,
      tenantGuard: "handler-derived",
    },
    async (input, ctx) => {
      const result = await operation({
        ...asRecord(input),
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        actorPermissions: ctx.permissions,
      } as T)
      revalidateLifecyclePaths()
      return result
    },
  )
}

const requestLifecycle = lifecycleMutation<HrisLifecycleRequestInput>(requestHrisEmployeeLifecycle)
const approveLifecycle = lifecycleMutation<HrisLifecycleDecisionInput>(approveHrisEmployeeLifecycle)
const rejectLifecycle = lifecycleMutation<HrisLifecycleDecisionInput>(rejectHrisEmployeeLifecycle)
const applyLifecycle = lifecycleMutation<HrisLifecycleApplyInput>(applyApprovedHrisEmployeeLifecycle)

export async function requestHrisEmployeeLifecycleAction(input: unknown) {
  return requestLifecycle(input)
}

export async function approveHrisEmployeeLifecycleAction(input: unknown) {
  return approveLifecycle(input)
}

export async function rejectHrisEmployeeLifecycleAction(input: unknown) {
  return rejectLifecycle(input)
}

export async function applyApprovedHrisEmployeeLifecycleAction(input: unknown) {
  return applyLifecycle(input)
}
