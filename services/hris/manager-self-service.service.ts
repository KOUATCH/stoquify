import "server-only"

import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getHrisApprovalInbox } from "@/services/hris/approval-inbox.service"
import { getHrisEmployeeDirectory } from "@/services/hris/employee.service"
import { getManagedOperationalTimeInbox } from "@/services/hris/operational-time.service"

const READ_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const

const managerSelfServiceInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  limit: z.number().int().positive().max(100).default(50),
}).strict()

export type HrisManagerSelfServiceInput = z.input<typeof managerSelfServiceInputSchema>

function assertManagerReadPermission(actorPermissions: readonly string[]) {
  if (!hasAnyRbacPermission(actorPermissions, READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for managed workforce read.")
  }
}

function safeApprovalSubject(domain: string) {
  switch (domain) {
    case "LIFECYCLE":
      return "Employment lifecycle change awaiting review"
    case "CONTRACT_ACTIVATION":
      return "Contract activation awaiting review"
    case "CONTRACT_DOCUMENT":
      return "Contract evidence awaiting review"
    case "COMPENSATION_ASSIGNMENT":
      return "Compensation assignment awaiting review"
    case "SALARY_CHANGE":
      return "Compensation change awaiting review"
    case "PAYMENT_DESTINATION":
      return "Payment instruction change awaiting review"
    default:
      return "HRIS change awaiting review"
  }
}

export async function getHrisManagerSelfService(input: HrisManagerSelfServiceInput) {
  const parsed = managerSelfServiceInputSchema.parse(input)
  assertManagerReadPermission(parsed.actorPermissions)

  const [directory, inbox, operationalTime] = await Promise.all([
    getHrisEmployeeDirectory(parsed),
    getHrisApprovalInbox(parsed),
    getManagedOperationalTimeInbox(parsed),
  ])

  const allowedEmployeeIds = new Set(directory.employees.map((employee) => employee.id))
  const managedLocationsById = new Map(
    directory.accessScope.managedLocations.map((location) => [location.id, location]),
  )

  const workforce = directory.employees.map((employee) => {
    const location = employee.employment.locationId
      ? managedLocationsById.get(employee.employment.locationId) ?? null
      : null
    const ready = employee.contractReadiness.activeContractCount > 0
      && employee.attendanceReadiness.frozenSnapshotCount > 0
      && employee.blockers.length === 0

    return {
      profileHref: `/dashboard/people/${employee.id}`,
      displayName: employee.displayName,
      status: employee.status,
      employment: {
        jobTitle: employee.employment.jobTitle,
        department: employee.employment.department,
        countryCode: employee.employment.countryCode,
        location: location ? { name: location.name, code: location.code } : null,
      },
      contract: {
        activeCount: employee.contractReadiness.activeContractCount,
        latestStatus: employee.contractReadiness.latestContractStatus,
        signedEvidenceOnFile: employee.contractReadiness.hasSignedDocumentEvidence,
      },
      attendance: {
        frozenSnapshotCount: employee.attendanceReadiness.frozenSnapshotCount,
        latestCertifiedPeriodEnd: employee.attendanceReadiness.latestFrozenPeriodEnd,
        certifiedSourceOnFile: employee.attendanceReadiness.hasFrozenAttendanceSource,
      },
      readiness: {
        status: ready ? "READY" as const : "ATTENTION_REQUIRED" as const,
        blockerCount: employee.blockers.length,
        blockerCodes: [...employee.blockers],
      },
    }
  })

  const approvals = inbox.items
    .filter((item) => allowedEmployeeIds.has(item.employee.id))
    .map((item) => ({
      domain: item.domain,
      stage: item.stage,
      title: item.title,
      subject: safeApprovalSubject(item.domain),
      employee: {
        displayName: item.employee.displayName,
        profileHref: `/dashboard/people/${item.employee.id}`,
      },
      requestedAt: item.requestedAt,
      effectiveAt: item.effectiveAt,
      decision: item.decision,
      evidence: {
        requestEvidencePresent: item.evidence.requestEvidencePresent,
        approvalEvidencePresent: item.evidence.approvalEvidencePresent,
      },
      readiness: {
        blockerCode: item.readiness.blockerCode,
        impact: item.readiness.impact,
      },
    }))

  const readyCount = workforce.filter((employee) => employee.readiness.status === "READY").length

  return {
    organizationId: parsed.organizationId,
    asOf: directory.asOf,
    scope: {
      authority: directory.accessScope.authority,
      managedLocations: directory.accessScope.managedLocations.map((location) => ({
        name: location.name,
        code: location.code,
      })),
      limitations: [...directory.accessScope.limitations],
      directReportsClaimed: false as const,
    },
    summary: {
      workforceCount: workforce.length,
      readyCount,
      attentionCount: workforce.length - readyCount,
      visiblePendingApprovals: approvals.length,
      actionableApprovals: approvals.filter((item) => item.decision.eligible).length,
    },
    workforce,
    approvals,
    operationalTime: {
      requests: operationalTime.requests.map((request) => ({
        ...request,
        periodStart: request.periodStart.toISOString(),
        periodEnd: request.periodEnd.toISOString(),
        requestedAt: request.requestedAt.toISOString(),
      })),
    },
    capabilities: {
      approvalDecisions: {
        available: approvals.some((item) => item.decision.eligible),
        authority: "HRIS_PEOPLE_MANAGE_AND_SEPARATION_OF_DUTIES",
      },
      reportingLineWorkflows: {
        available: false as const,
        reasonCode: "REPORTING_LINE_AUTHORITY_NOT_MODELED",
      },
      leaveRequests: {
        available: true as const,
        pendingCount: operationalTime.requests.filter((item) => item.type === "LEAVE").length,
      },
      overtimeRequests: {
        available: true as const,
        pendingCount: operationalTime.requests.filter((item) => item.type === "OVERTIME").length,
      },
      attendanceCorrections: {
        available: true as const,
        pendingCount: operationalTime.requests.filter((item) => item.type === "ATTENDANCE_CORRECTION").length,
      },
      onboardingOffboardingTasks: {
        available: false as const,
        reasonCode: "TASK_LEDGER_NOT_CONFIGURED",
      },
      rawDocumentAccess: {
        available: false as const,
        reasonCode: "RAW_DOCUMENT_ACCESS_NOT_CONFIGURED",
      },
    },
    redaction: {
      employeeNumbersIncluded: false as const,
      userIdentifiersIncluded: false as const,
      salaryValuesIncluded: false as const,
      taxAndSocialIdentifiersIncluded: false as const,
      paymentDestinationValuesIncluded: false as const,
      documentHashesIncluded: false as const,
      rawDocumentsIncluded: false as const,
      approvalSourceIdsIncluded: false as const,
    },
    dataOwnership: {
      workforceOwner: "HRIS_PEOPLE_CORE",
      approvalOwner: "HRIS_APPROVAL_INBOX_PROJECTION",
      scopeOwner: "HRIS_ORGANIZATION_SCOPE",
      mutationAuthority: "DOMAIN_SERVICES_ONLY",
    },
  }
}

export type HrisManagerSelfServiceResult = Awaited<ReturnType<typeof getHrisManagerSelfService>>
