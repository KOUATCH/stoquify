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
  asOf: z.coerce.date().optional(),
  delegationAuthority: z.enum(["PEOPLE_READ", "APPROVAL_DECISION"]).default("PEOPLE_READ"),
})

const READ_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const
const TENANT_SCOPE_PERMISSIONS = ["hris.people.manage"] as const

export type HrisPeopleAccessScope = {
  organizationId: string
  authority: {
    kind: "TENANT_HRIS_ADMIN" | "REPORTING_RELATIONSHIP" | "DELEGATED_MANAGER_AUTHORITY" | "LOCATION_RESPONSIBILITY_COMPATIBILITY" | "OWN_RECORD"
    label: string
    basis: "HRIS_PERMISSION" | "HrisReportingRelationship" | "HrisManagerDelegation" | "Location.managerId" | "PayrollEmployee.userId"
    reportingLineAuthority: boolean
    effectiveDating: "NOT_APPLICABLE" | "CURRENT_ONLY" | "AS_OF"
    historicalAccessSupported: boolean
    delegationSupported: boolean
  }
  managedLocations: Array<{ id: string; name: string; code: string }>
  employeeIds: string[] | null
  limitations: string[]
  auditEvidence?: {
    asOf: string
    relationshipIds: string[]
    delegationIds: string[]
  }
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

const activeAt = (asOf: Date) => ({
  effectiveFrom: { lte: asOf },
  OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
})

const activeAssignmentAt = (asOf: Date) => ({
  status: "ACTIVE" as const,
  ...activeAt(asOf),
  position: { status: "ACTIVE" as const, ...activeAt(asOf) },
  orgUnit: { status: "ACTIVE" as const, ...activeAt(asOf) },
})

const relationshipSelect = {
  id: true,
  managerEmployeeId: true,
  reportEmployeeId: true,
  reportAssignment: {
    select: {
      orgUnitId: true,
      position: {
        select: {
          location: { select: { id: true, name: true, code: true } },
        },
      },
    },
  },
} as const

type RelationshipRow = {
  id: string
  managerEmployeeId: string
  reportEmployeeId: string
  reportAssignment: {
    orgUnitId: string
    position: { location: { id: string; name: string; code: string } | null }
  }
}

function relationshipWhere(organizationId: string, asOf: Date) {
  const assignment = activeAssignmentAt(asOf)
  return {
    organizationId,
    status: "ACTIVE" as const,
    ...activeAt(asOf),
    managerAssignment: { ...assignment, organizationId },
    reportAssignment: { ...assignment, organizationId },
  }
}

function managedLocations(rows: RelationshipRow[]) {
  const locations = new Map<string, { id: string; name: string; code: string }>()
  for (const row of rows) {
    const location = row.reportAssignment.position.location
    if (location) locations.set(location.id, location)
  }
  return [...locations.values()]
}

async function auditScope(
  client: DbClient,
  parsed: z.output<typeof peopleScopeInputSchema>,
  action: string,
  changes: Record<string, unknown>,
) {
  await client.auditLog.create({
    data: {
      entityType: "HrisOrganizationScope",
      entityId: parsed.employeeId ?? parsed.organizationId,
      action,
      userId: parsed.actorId,
      organizationId: parsed.organizationId,
      changes: safeJson(changes),
    },
  })
}

export async function resolveHrisPeopleAccessScope(
  input: z.input<typeof peopleScopeInputSchema>,
  client: DbClient = db,
): Promise<HrisPeopleAccessScope> {
  const parsed = peopleScopeInputSchema.parse(input)
  const explicitAsOf = input.asOf !== undefined
  const asOf = parsed.asOf ?? new Date()
  assertPeopleReadPermission(parsed.actorPermissions)

  if (parsed.employeeId) {
    const requestedEmployee = await client.payrollEmployee.findFirst({
      where: {
        id: parsed.employeeId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!requestedEmployee) {
      await auditScope(client, parsed, "HRIS_CROSS_TENANT_SCOPE_DENIED", {
        requestedEmployeeId: parsed.employeeId,
        asOf: asOf.toISOString(),
        reason: "EMPLOYEE_NOT_OWNED_BY_TENANT",
      })
      throw new ForbiddenError("Employee is outside the tenant scope.")
    }
  }

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

  const actorEmployee = await client.payrollEmployee.findFirst({
    where: {
      organizationId: parsed.organizationId,
      userId: parsed.actorId,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (actorEmployee) {
    const baseWhere = relationshipWhere(parsed.organizationId, asOf)
    const [directRows, delegations] = await Promise.all([
      client.hrisReportingRelationship.findMany({
        where: { ...baseWhere, managerEmployeeId: actorEmployee.id },
        select: relationshipSelect,
        take: parsed.limit,
      }),
      client.hrisManagerDelegation.findMany({
        where: {
          organizationId: parsed.organizationId,
          delegateEmployeeId: actorEmployee.id,
          authority: parsed.delegationAuthority,
          status: "ACTIVE",
          effectiveFrom: { lte: asOf },
          effectiveTo: { gt: asOf },
        },
        select: { id: true, delegatorEmployeeId: true, scopeOrgUnitId: true },
        take: parsed.limit,
      }),
    ]) as [RelationshipRow[], Array<{ id: string; delegatorEmployeeId: string; scopeOrgUnitId: string | null }>]

    let delegatedRows: RelationshipRow[] = []
    if (delegations.length > 0) {
      const delegatedCandidates = await client.hrisReportingRelationship.findMany({
        where: {
          ...baseWhere,
          managerEmployeeId: { in: [...new Set(delegations.map((item) => item.delegatorEmployeeId))] },
        },
        select: relationshipSelect,
        take: parsed.limit,
      }) as RelationshipRow[]
      delegatedRows = delegatedCandidates.filter((row) => delegations.some((delegation) =>
        delegation.delegatorEmployeeId === row.managerEmployeeId
        && (delegation.scopeOrgUnitId === null || delegation.scopeOrgUnitId === row.reportAssignment.orgUnitId),
      ))
    }

    const directRelationshipIds = new Set(directRows.map((row) => row.id))
    const rows = [...directRows, ...delegatedRows.filter((row) => !directRelationshipIds.has(row.id))]
      .slice(0, parsed.limit)
    const employeeIds = [...new Set(rows.map((row) => row.reportEmployeeId))]
    const matchingDelegationIds = delegations
      .filter((delegation) => delegatedRows.some((row) =>
        row.managerEmployeeId === delegation.delegatorEmployeeId
        && (delegation.scopeOrgUnitId === null || delegation.scopeOrgUnitId === row.reportAssignment.orgUnitId),
      ))
      .map((delegation) => delegation.id)

    if (rows.length > 0) {
      if (parsed.employeeId && !employeeIds.includes(parsed.employeeId)) {
        await auditScope(client, parsed, "HRIS_EFFECTIVE_MANAGER_SCOPE_DENIED", {
          requestedEmployeeId: parsed.employeeId,
          asOf: asOf.toISOString(),
          reason: "OUTSIDE_EFFECTIVE_RELATIONSHIP_SCOPE",
          relationshipIds: rows.map((row) => row.id),
        })
        throw new ForbiddenError("Employee is outside the effective manager scope.")
      }
      const hasDirect = directRows.length > 0
      const scope: HrisPeopleAccessScope = {
        organizationId: parsed.organizationId,
        authority: {
          kind: hasDirect ? "REPORTING_RELATIONSHIP" : "DELEGATED_MANAGER_AUTHORITY",
          label: hasDirect ? "Effective reporting relationship" : "Effective delegated manager authority",
          basis: hasDirect ? "HrisReportingRelationship" : "HrisManagerDelegation",
          reportingLineAuthority: true,
          effectiveDating: "AS_OF",
          historicalAccessSupported: true,
          delegationSupported: true,
        },
        managedLocations: managedLocations(rows),
        employeeIds,
        limitations: [
          "Scope is limited to active tenant-owned relationships at the requested effective time.",
          "Salary, identifiers, payment destinations, and raw documents remain separately permissioned.",
        ],
        auditEvidence: {
          asOf: asOf.toISOString(),
          relationshipIds: rows.map((row) => row.id),
          delegationIds: matchingDelegationIds,
        },
      }
      await auditScope(client, parsed, "HRIS_EFFECTIVE_MANAGER_SCOPE_RESOLVED", {
        requestedEmployeeId: parsed.employeeId ?? null,
        authorityKind: scope.authority.kind,
        asOf: scope.auditEvidence?.asOf,
        relationshipIds: scope.auditEvidence?.relationshipIds,
        delegationIds: scope.auditEvidence?.delegationIds,
        employeeCount: employeeIds.length,
      })
      return scope
    }
  }

  if (explicitAsOf) {
    await auditScope(client, parsed, "HRIS_EFFECTIVE_MANAGER_SCOPE_DENIED", {
      requestedEmployeeId: parsed.employeeId ?? null,
      asOf: asOf.toISOString(),
      reason: "NO_ACTIVE_DURABLE_AUTHORITY",
    })
    throw new ForbiddenError("No active durable HRIS manager authority exists at the requested time.")
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
        kind: "LOCATION_RESPONSIBILITY_COMPATIBILITY",
        label: "Managed-location responsibility (compatibility)",
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

    await auditScope(client, parsed, "HRIS_LOCATION_RESPONSIBILITY_SCOPE_RESOLVED", {
      requestedEmployeeId: parsed.employeeId ?? null,
      authorityKind: scope.authority.kind,
      reportingLineAuthority: scope.authority.reportingLineAuthority,
      managedLocationIds: scope.managedLocations.map((location) => location.id),
      employeeCount: scope.employeeIds?.length ?? 0,
    })

    return scope
  } catch (error) {
    if (error instanceof ForbiddenError) {
      await auditScope(client, parsed, "HRIS_LOCATION_RESPONSIBILITY_SCOPE_DENIED", {
        requestedEmployeeId: parsed.employeeId ?? null,
        reason: "OUTSIDE_CURRENT_LOCATION_RESPONSIBILITY",
        reportingLineAuthority: false,
      })
    }
    if (error instanceof ApplicationError) throw error
    throw new BusinessRuleError("Could not resolve HRIS organization scope.")
  }
}


