import "server-only"

import { z } from "zod"

import { hasAnyRbacPermission, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getOwnHrisEmployeeProfile } from "@/services/hris/employee.service"
import { getOwnHrisPaymentDestinationStatus } from "@/services/hris/payment-destination.service"
import { getOwnHrisTimeLeaveAttendanceStatus } from "@/services/hris/time-leave.service"

const SELF_SERVICE_READ_PERMISSIONS = [
  "hris.self_service.read",
  "hris.people.read",
  "hris.people.manage",
] as const

export const hrisEmployeeSelfServiceInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).optional().default([]),
})

export type HrisEmployeeSelfServiceInput = z.input<
  typeof hrisEmployeeSelfServiceInputSchema
>

export const HRIS_EMPLOYEE_SELF_SERVICE_OWNERSHIP = {
  profileOwner: "HRIS_PEOPLE_CORE",
  documentOwner: "HRIS_DOCUMENT_EVIDENCE",
  attendanceOwner: "HRIS_TIME_LEAVE_ATTENDANCE",
  paymentDestinationOwner: "HRIS_PAYMENT_DESTINATION_SERVICE",
  payslipOwner: "PAYROLL_PAYSLIP_SELF_SERVICE",
  mutationRule: "REQUESTS_NEVER_MUTATE_APPROVED_HRIS_OR_PAYROLL_TRUTH_DIRECTLY",
} as const

export async function getHrisEmployeeSelfService(
  input: HrisEmployeeSelfServiceInput,
) {
  const parsed = hrisEmployeeSelfServiceInputSchema.parse(input)
  if (!hasAnyRbacPermission(parsed.actorPermissions, SELF_SERVICE_READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for HRIS employee self-service.")
  }

  const profile = await getOwnHrisEmployeeProfile(parsed)
  const [paymentStatus, attendanceStatus] = await Promise.all([
    profile.employee.status === "ACTIVE"
      ? getOwnHrisPaymentDestinationStatus(parsed)
      : Promise.resolve(null),
    getOwnHrisTimeLeaveAttendanceStatus({ ...parsed, limit: 1 }),
  ])
  const latestAttendance = attendanceStatus.snapshots[0] ?? null
  const payment = paymentStatus?.employee ?? null

  return {
    asOf: profile.asOf,
    profile: {
      employeeNumber: profile.employee.employeeNumber,
      displayName: profile.employee.displayName,
      status: profile.employee.status,
      employment: {
        hireDate: profile.employee.employment.hireDate,
        terminationDate: profile.employee.employment.terminationDate,
        countryCode: profile.employee.employment.countryCode,
        locationAssigned: Boolean(profile.employee.employment.locationId),
        department: profile.employee.employment.department,
        jobTitle: profile.employee.employment.jobTitle,
        costCenter: profile.employee.employment.costCenter,
      },
      userMappingState: profile.employee.userMapping.state,
      blockers: [...profile.employee.blockers],
    },
    documents: {
      referenceCount: profile.employee.evidence.referenceCount,
      referenceTypes: [...profile.employee.evidence.referenceTypes],
      taxIdentifierOnFile: profile.employee.evidence.hasTaxIdentifierHash,
      socialIdentifierOnFile: profile.employee.evidence.hasSocialIdentifierHash,
      signedContractEvidenceOnFile:
        profile.employee.contractReadiness.hasSignedDocumentEvidence,
      rawDocumentAccess: "NOT_CONFIGURED" as const,
    },
    contract: {
      activeContractCount: profile.employee.contractReadiness.activeContractCount,
      latestStatus: profile.employee.contractReadiness.latestContractStatus,
    },
    attendance: latestAttendance
      ? {
          status: latestAttendance.status,
          periodStart: latestAttendance.periodStart,
          periodEnd: latestAttendance.periodEnd,
          totals: { ...latestAttendance.totals },
          certificationStatus: latestAttendance.certificationStatus,
          sourceProofPresent: latestAttendance.sourceProofPresent,
          policyProofPresent: latestAttendance.policyProofPresent,
          approvalProofPresent: latestAttendance.approvalProofPresent,
          unresolvedItemCount: latestAttendance.unresolvedItemCount,
          frozenAt: latestAttendance.frozenAt,
        }
      : null,
    paymentDestination: payment
      ? {
          state: payment.paymentDestination.state,
          method: payment.paymentDestination.method,
          maskedDestination: payment.paymentDestination.maskedDestination,
          approvalEvidencePresent:
            payment.paymentDestination.approvalEvidencePresent,
          latestChange: payment.paymentDestination.latestChange
            ? {
                status: payment.paymentDestination.latestChange.status,
                paymentMethod:
                  payment.paymentDestination.latestChange.paymentMethod,
                maskedDestination:
                  payment.paymentDestination.latestChange.maskedDestination,
                requestedAt:
                  payment.paymentDestination.latestChange.requestedAt,
                approvedAt:
                  payment.paymentDestination.latestChange.approvedAt,
                appliedAt: payment.paymentDestination.latestChange.appliedAt,
              }
            : null,
          payrollReleaseStatus: payment.payrollReleaseReadiness.status,
        }
      : null,
    capabilities: {
      payslips: {
        canRead: hasRbacPermission(
          parsed.actorPermissions,
          "payroll.payslips.self.read",
        ),
        canExport: hasRbacPermission(
          parsed.actorPermissions,
          "payroll.payslips.self.export",
        ),
        exportRequiresFreshAuth: true,
      },
      paymentDestinationRequest: {
        canRequest: hasRbacPermission(
          parsed.actorPermissions,
          "hris.self_service.request",
        ),
        freshAuthRequired: true,
        uiStatus: "EVIDENCE_WORKFLOW_REQUIRED" as const,
      },
      leaveRequest: "NOT_CONFIGURED" as const,
      attendanceCorrectionRequest: "NOT_CONFIGURED" as const,
      profileCorrectionRequest: "NOT_CONFIGURED" as const,
    },
    dataOwnership: HRIS_EMPLOYEE_SELF_SERVICE_OWNERSHIP,
  }
}

export type HrisEmployeeSelfServiceResult = Awaited<
  ReturnType<typeof getHrisEmployeeSelfService>
>
