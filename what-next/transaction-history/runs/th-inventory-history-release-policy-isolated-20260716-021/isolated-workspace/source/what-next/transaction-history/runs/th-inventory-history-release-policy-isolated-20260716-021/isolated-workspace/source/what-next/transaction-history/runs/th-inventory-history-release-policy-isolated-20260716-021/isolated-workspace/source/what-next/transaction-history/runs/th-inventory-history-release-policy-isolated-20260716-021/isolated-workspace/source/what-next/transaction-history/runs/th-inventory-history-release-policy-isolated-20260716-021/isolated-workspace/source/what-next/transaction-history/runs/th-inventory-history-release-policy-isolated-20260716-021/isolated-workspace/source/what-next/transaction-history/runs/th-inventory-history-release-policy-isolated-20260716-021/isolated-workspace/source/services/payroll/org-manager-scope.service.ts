import "server-only"

import { Prisma } from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"

type DbClient = typeof db | Prisma.TransactionClient

const READ_PERMISSIONS = ["hris.people.read", "payroll.employees.read", "payroll.command.read"] as const

const managerScopedEmployeesInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(250).default(100),
})

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function assertPayrollEmployeeLocationInOrganization(
  client: DbClient,
  organizationId: string,
  locationId?: string | null,
) {
  const normalizedLocationId = locationId?.trim() || null
  if (!normalizedLocationId) return null

  const location = await client.location.findFirst({
    where: {
      id: normalizedLocationId,
      organizationId,
      deletedAt: null,
    },
    select: { id: true },
  })
  if (!location) throw new NotFoundError("Employee location was not found in this organization.")

  return location.id
}

export async function getPayrollOrgManagerScopedEmployees(
  input: z.input<typeof managerScopedEmployeesInputSchema>,
  client: DbClient = db,
) {
  const parsed = managerScopedEmployeesInputSchema.parse(input)
  if (!hasAnyRbacPermission(parsed.actorPermissions, READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for manager-scoped payroll employee access.")
  }

  const managedLocations = await client.location.findMany({
    where: {
      organizationId: parsed.organizationId,
      managerId: parsed.actorId,
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
    },
  })

  const managedLocationIds = managedLocations.map((location) => location.id)
  const employees = managedLocationIds.length === 0
    ? []
    : await client.payrollEmployee.findMany({
        where: {
          organizationId: parsed.organizationId,
          deletedAt: null,
          locationId: { in: managedLocationIds },
          ...(parsed.employeeId ? { id: parsed.employeeId } : {}),
        },
        orderBy: [{ displayName: "asc" }],
        take: parsed.limit,
        select: {
          id: true,
          employeeNumber: true,
          displayName: true,
          status: true,
          locationId: true,
          department: true,
          jobTitle: true,
          costCenter: true,
        },
      })

  if (parsed.employeeId && employees.length === 0) {
    await client.auditLog.create({
      data: {
        entityType: "PayrollEmployee",
        entityId: parsed.employeeId,
        action: "PAYROLL_ORG_MANAGER_SCOPE_DENIED",
        userId: parsed.actorId,
        organizationId: parsed.organizationId,
        changes: safeJson({
          requestedEmployeeId: parsed.employeeId,
          managedLocationIds,
          reason: "OUTSIDE_MANAGER_ASSIGNED_SCOPE",
        }),
      },
    })
    throw new ForbiddenError("Payroll employee is outside the manager's assigned scope.")
  }

  await client.auditLog.create({
    data: {
      entityType: "PayrollEmployee",
      entityId: parsed.employeeId ?? parsed.organizationId,
      action: "PAYROLL_ORG_MANAGER_SCOPE_READ",
      userId: parsed.actorId,
      organizationId: parsed.organizationId,
      changes: safeJson({
        requestedEmployeeId: parsed.employeeId ?? null,
        managedLocationIds,
        returnedCount: employees.length,
      }),
    },
  })

  return {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    authority: {
      kind: "LOCATION_RESPONSIBILITY" as const,
      basis: "Location.managerId" as const,
      reportingLineAuthority: false as const,
      effectiveDating: "CURRENT_ONLY" as const,
    },
    managedLocations,
    employees,
    summary: {
      managedLocationCount: managedLocations.length,
      employeeCount: employees.length,
      scoped: true,
    },
  }
}
