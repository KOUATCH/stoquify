"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  getHrisEmployeeDirectory,
  getHrisEmployeeProfile,
  getOwnHrisEmployeeProfile,
  upsertHrisEmployeeProfile,
  type HrisEmployeeDirectoryResult,
  type HrisEmployeeProfileInput,
  type HrisEmployeeProfileReadResult,
} from "@/services/hris/employee.service"

export type {
  HrisEmployeeDirectoryResult,
  HrisEmployeeProfileInput,
  HrisEmployeeProfileReadResult,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function revalidateHrisEmployeePaths() {
  revalidatePath("/dashboard/people", "page")
  revalidatePath("/[locale]/dashboard/people", "page")
  revalidatePath("/dashboard/payroll/employees", "page")
  revalidatePath("/[locale]/dashboard/payroll/employees", "page")
  revalidatePath("/dashboard/payroll/setup", "page")
  revalidatePath("/[locale]/dashboard/payroll/setup", "page")
}

const readHrisEmployeeDirectory = protect<unknown, HrisEmployeeDirectoryResult>(
  {
    permission: "hris.people.read",
    auditResource: "HrisEmployee",
    auditAllowed: false,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const raw = asRecord(input)
    const limit = typeof raw.limit === "number" ? raw.limit : undefined
    const asOf = typeof raw.asOf === "string" || raw.asOf instanceof Date ? new Date(raw.asOf) : undefined

    return getHrisEmployeeDirectory({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      ...(limit ? { limit } : {}),
      ...(asOf ? { asOf } : {}),
    })
  },
)

export async function getHrisEmployeeDirectoryAction(input: unknown = {}) {
  return readHrisEmployeeDirectory(input)
}

const readHrisEmployeeProfile = protect<unknown, HrisEmployeeProfileReadResult>(
  {
    permission: "hris.people.read",
    auditResource: "HrisEmployee",
    auditAllowed: false,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const raw = asRecord(input)
    const employeeId = typeof raw.employeeId === "string" ? raw.employeeId : ""

    return getHrisEmployeeProfile({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      employeeId,
    })
  },
)

export async function getHrisEmployeeProfileAction(input: unknown) {
  return readHrisEmployeeProfile(input)
}

const readOwnHrisEmployeeProfile = protect<unknown, HrisEmployeeProfileReadResult>(
  {
    permission: "hris.self_service.read",
    auditResource: "HrisEmployee",
    auditAllowed: false,
    tenantGuard: "handler-derived",
  },
  async (_input, ctx) => {
    return getOwnHrisEmployeeProfile({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
  },
)

export async function getOwnHrisEmployeeProfileAction(input: unknown = {}) {
  return readOwnHrisEmployeeProfile(input)
}

const writeHrisEmployeeProfile = protect<unknown, Awaited<ReturnType<typeof upsertHrisEmployeeProfile>>>(
  {
    permission: "hris.people.manage",
    auditResource: "HrisEmployee",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const result = await upsertHrisEmployeeProfile({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as HrisEmployeeProfileInput)

    revalidateHrisEmployeePaths()
    return result
  },
)

export async function upsertHrisEmployeeProfileAction(input: unknown) {
  return writeHrisEmployeeProfile(input)
}