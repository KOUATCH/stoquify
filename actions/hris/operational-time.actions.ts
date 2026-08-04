"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  approveTimeFoundation,
  approveWorkSchedule,
  assignWorkSchedule,
  buildOperationalAttendanceCertification,
  createTimeFoundation,
  decideOperationalTimeRequest,
  getManagedOperationalTimeInbox,
  getOwnOperationalTime,
  importOperationalTime,
  requestOperationalTime,
  resolveOperationalTimeAnomaly,
} from "@/services/hris/operational-time.service"
import { certifyHrisTimeLeaveAttendance } from "@/services/hris/time-leave.service"

function record(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function refresh() {
  revalidatePath("/dashboard/people/me", "page")
  revalidatePath("/[locale]/dashboard/people/me", "page")
  revalidatePath("/dashboard/people/team", "page")
  revalidatePath("/[locale]/dashboard/people/team", "page")
  revalidatePath("/dashboard/payroll/attendance", "page")
  revalidatePath("/[locale]/dashboard/payroll/attendance", "page")
}

function mutation<T>(
  permission: string,
  resource: string,
  operation: (
    input: Record<string, unknown>,
    context: {
      orgId: string
      userId: string
      permissions: string[]
    },
  ) => Promise<T>,
) {
  return protect<unknown, T>({
    permission,
    auditResource: resource,
    freshAuth: true,
    tenantGuard: "handler-derived",
  }, async (input, context) => {
    const result = await operation(record(input), context)
    refresh()
    return result
  })
}

const createTimeFoundationMutation = mutation(
  "hris.people.manage",
  "HrisTimeFoundation",
  (input, context) => createTimeFoundation({
    ...input,
    organizationId: context.orgId,
    actorId: context.userId,
    actorPermissions: context.permissions,
  } as never),
)

const approveTimeFoundationMutation = mutation(
  "hris.people.manage",
  "HrisTimeFoundation",
  (input, context) => approveTimeFoundation({
    ...input,
    organizationId: context.orgId,
    actorId: context.userId,
    actorPermissions: context.permissions,
  } as never),
)

const assignWorkScheduleMutation = mutation(
  "hris.people.manage",
  "HrisWorkSchedule",
  (input, context) => assignWorkSchedule({
    ...input,
    organizationId: context.orgId,
    actorId: context.userId,
    actorPermissions: context.permissions,
  } as never),
)

const approveWorkScheduleMutation = mutation(
  "hris.people.manage",
  "HrisWorkSchedule",
  (input, context) => approveWorkSchedule({
    ...input,
    organizationId: context.orgId,
    actorId: context.userId,
    actorPermissions: context.permissions,
  } as never),
)

const requestOperationalTimeMutation = mutation(
  "hris.self_service.request",
  "HrisTimeRequest",
  (input, context) => requestOperationalTime({
    ...input,
    organizationId: context.orgId,
    actorId: context.userId,
    actorPermissions: context.permissions,
  } as never),
)

const decideOperationalTimeRequestMutation = mutation(
  "hris.people.manage",
  "HrisTimeRequest",
  (input, context) => decideOperationalTimeRequest({
    ...input,
    organizationId: context.orgId,
    actorId: context.userId,
    actorPermissions: context.permissions,
  } as never),
)

const importOperationalTimeMutation = mutation(
  "hris.people.manage",
  "HrisTimeImportBatch",
  (input, context) => importOperationalTime({
    ...input,
    organizationId: context.orgId,
    actorId: context.userId,
    actorPermissions: context.permissions,
  } as never),
)

const resolveOperationalTimeAnomalyMutation = mutation(
  "hris.people.manage",
  "HrisAttendanceAnomaly",
  (input, context) => resolveOperationalTimeAnomaly({
    ...input,
    organizationId: context.orgId,
    actorId: context.userId,
    actorPermissions: context.permissions,
  } as never),
)

const certifyOperationalAttendanceMutation = mutation(
  "hris.people.read",
  "HrisOperationalAttendanceCertification",
  async (input, context) => {
    const certification = await buildOperationalAttendanceCertification({
      ...input,
      organizationId: context.orgId,
      actorId: context.userId,
      actorPermissions: context.permissions,
    } as never)
    return certifyHrisTimeLeaveAttendance({
      ...certification,
      organizationId: context.orgId,
      actorId: context.userId,
      actorPermissions: context.permissions,
    })
  },
)

const readOwn = protect<unknown, Awaited<ReturnType<typeof getOwnOperationalTime>>>({
  permission: "hris.self_service.read",
  auditResource: "HrisOperationalTimeSelfService",
  auditAllowed: false,
  tenantGuard: "handler-derived",
}, (input, context) => getOwnOperationalTime({
  ...record(input),
  organizationId: context.orgId,
  actorId: context.userId,
  actorPermissions: context.permissions,
} as never))

const readManaged = protect<
  unknown,
  Awaited<ReturnType<typeof getManagedOperationalTimeInbox>>
>({
  permission: "hris.people.read",
  auditResource: "HrisOperationalTimeManagerInbox",
  auditAllowed: false,
  tenantGuard: "handler-derived",
}, (input, context) => getManagedOperationalTimeInbox({
  ...record(input),
  organizationId: context.orgId,
  actorId: context.userId,
  actorPermissions: context.permissions,
} as never))

export const createTimeFoundationAction = async (input: unknown) =>
  createTimeFoundationMutation(input)
export const approveTimeFoundationAction = async (input: unknown) =>
  approveTimeFoundationMutation(input)
export const assignWorkScheduleAction = async (input: unknown) =>
  assignWorkScheduleMutation(input)
export const approveWorkScheduleAction = async (input: unknown) =>
  approveWorkScheduleMutation(input)
export const requestOperationalTimeAction = async (input: unknown) =>
  requestOperationalTimeMutation(input)
export const decideOperationalTimeRequestAction = async (input: unknown) =>
  decideOperationalTimeRequestMutation(input)
export const importOperationalTimeAction = async (input: unknown) =>
  importOperationalTimeMutation(input)
export const resolveOperationalTimeAnomalyAction = async (input: unknown) =>
  resolveOperationalTimeAnomalyMutation(input)
export const certifyOperationalAttendanceAction = async (input: unknown) =>
  certifyOperationalAttendanceMutation(input)
export const getOwnOperationalTimeAction = async (input: unknown = {}) => readOwn(input)
export const getManagedOperationalTimeInboxAction = async (input: unknown = {}) =>
  readManaged(input)
