import "server-only"

import { Prisma } from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ApplicationError, BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { getPayrollOrgManagerScopedEmployees } from "@/services/payroll/org-manager-scope.service"

type DbClient = typeof db | Prisma.TransactionClient

const peopleScopeInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(250).default(100),
})

const READ_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const
const TENANT_SCOPE_PERMISSIONS = ["hris.people.manage"] as const

export type HrisPeopleAccessScope = {
  organizationId: string
  authority: {
    kind: "TENANT_HRIS_ADMIN" | "LOCATION_RESPONSIBILITY" | "OWN_RECORD"
    label: string
    basis: "HRIS_PERMISSION" | "Location.managerId" | "PayrollEmployee.userId"
    reportingLineAuthority: false
    effectiveDating: "NOT_APPLICABLE" | "CURRENT_ONLY"
    historicalAccessSupported: false
    delegationSupported: false
  }
  managedLocations: Array<{ id: string; name: string; code: string }>
  employeeIds: string[] | null
  limitations: string[]
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function assertPeopleReadPermission(actorPermissions: readonly string[]) {
  if (!hasAnyRbacPermission(actorPermissions, READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for HRIS people scope resolution.")
  }
}

export function ownHrisRecordAccessScope(organizationId: string): HrisPeopleAccessScope {
  return {
    organizationId,
    authority: {
      kind: "OWN_RECORD",
      label: "Own employee record",
      basis: "PayrollEmployee.userId",
      reportingLineAuthority: false,
      effectiveDating: "CURRENT_ONLY",
      historicalAccessSupported: false,
      delegationSupported: false,
    },
    managedLocations: [],
    employeeIds: null,
    limitations: [
      "Own-record authority does not grant access to another employee.",
      "Salary, identifiers, payment destinations, and raw documents remain separately permissioned.",
    ],
  }
}

export async function resolveHrisPeopleAccessScope(
  input: z.input<typeof peopleScopeInputSchema>,
  client: DbClient = db,
): Promise<HrisPeopleAccessScope> {
  const parsed = peopleScopeInputSchema.parse(input)
  assertPeopleReadPermission(parsed.actorPermissions)

  if (hasAnyRbacPermission(parsed.actorPermissions, TENANT_SCOPE_PERMISSIONS)) {
    return {
      organizationId: parsed.organizationId,
      authority: {
        kind: "TENANT_HRIS_ADMIN",
        label: "Tenant HRIS administration",
        basis: "HRIS_PERMISSION",
        reportingLineAuthority: false,
        effectiveDating: "NOT_APPLICABLE",
        historicalAccessSupported: false,
        delegationSupported: false,
      },
      managedLocations: [],
      employeeIds: null,
      limitations: [
        "Tenant HRIS permission is an administrative access grant, not a reporting-line relationship.",
        "Salary, identifiers, payment destinations, and raw documents remain separately permissioned.",
      ],
    }
  }

  try {
    const compatibilityScope = await getPayrollOrgManagerScopedEmployees({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      employeeId: parsed.employeeId,
      limit: parsed.limit,
    }, client)

    const scope: HrisPeopleAccessScope = {
      organizationId: parsed.organizationId,
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        label: "Managed-location responsibility",
        basis: "Location.managerId",
        reportingLineAuthority: false,
        effectiveDating: "CURRENT_ONLY",
        historicalAccessSupported: false,
        delegationSupported: false,
      },
      managedLocations: compatibilityScope.managedLocations,
      employeeIds: compatibilityScope.employees.map((employee) => employee.id),
      limitations: [
        "Employees in a managed location are not represented as direct reports.",
        "Current Location.managerId evidence does not prove historical authority.",
        "Delegation and temporary approver coverage are not yet modeled.",
        "Salary, identifiers, payment destinations, and raw documents remain excluded.",
      ],
    }

    await client.auditLog.create({
      data: {
        entityType: "HrisOrganizationScope",
        entityId: parsed.employeeId ?? parsed.organizationId,
        action: "HRIS_LOCATION_RESPONSIBILITY_SCOPE_RESOLVED",
        userId: parsed.actorId,
        organizationId: parsed.organizationId,
        changes: safeJson({
          requestedEmployeeId: parsed.employeeId ?? null,
          authorityKind: scope.authority.kind,
          reportingLineAuthority: scope.authority.reportingLineAuthority,
          managedLocationIds: scope.managedLocations.map((location) => location.id),
          employeeCount: scope.employeeIds?.length ?? 0,
        }),
      },
    })

    return scope
  } catch (error) {
    if (error instanceof ForbiddenError) {
      await client.auditLog.create({
        data: {
          entityType: "HrisOrganizationScope",
          entityId: parsed.employeeId ?? parsed.organizationId,
          action: "HRIS_LOCATION_RESPONSIBILITY_SCOPE_DENIED",
          userId: parsed.actorId,
          organizationId: parsed.organizationId,
          changes: safeJson({
            requestedEmployeeId: parsed.employeeId ?? null,
            reason: "OUTSIDE_CURRENT_LOCATION_RESPONSIBILITY",
            reportingLineAuthority: false,
          }),
        },
      })
    }
    if (error instanceof ApplicationError) throw error
    throw new BusinessRuleError("Could not resolve HRIS organization scope.")
  }
}


