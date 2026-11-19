import "server-only"
import {Prisma} from "@prisma/client"
import {db} from "@/prisma/db"
import {currentHrisActor,lockedOwnEmployee,selfServiceTransaction,type SelfServiceClient} from "./self-service-boundary.service"

import { z } from "zod"

import { hasAnyRbacPermission, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getOwnHrisEmployeeProfile } from "@/services/hris/employee.service"
import { getOwnHrisPaymentDestinationStatus } from "@/services/hris/payment-destination.service"
import { getOwnOperationalTime } from "@/services/hris/operational-time.service"
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

async function buildHrisEmployeeSelfService(
  input: HrisEmployeeSelfServiceInput, client:Prisma.TransactionClient,
) {
  const parsed = hrisEmployeeSelfServiceInputSchema.parse(input)
  if (!hasAnyRbacPermission(parsed.actorPermissions, SELF_SERVICE_READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for HRIS employee self-service.")
  }

  const profile = await getOwnHrisEmployeeProfile(parsed,client)
  const [paymentStatus, attendanceStatus, operationalTime] = await Promise.all([
    profile.employee.status === "ACTIVE"
      ? getOwnHrisPaymentDestinationStatus(parsed,client)
      : Promise.resolve(null),
    getOwnHrisTimeLeaveAttendanceStatus({ ...parsed, limit: 1 },client),
    getOwnOperationalTime({ ...parsed, limit: 20 },client),
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
      rawDocumentAccess: "PROTECTED_WORKSPACE" as const,
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
    operationalTime: {
      employeeId: operationalTime.employeeId,
      correctionEntries: operationalTime.correctionEntries,
      balances: operationalTime.balances,
      requests: operationalTime.requests.map((request) => ({
        ...request,
        periodStart: request.periodStart.toISOString(),
        periodEnd: request.periodEnd.toISOString(),
        requestedAt: request.requestedAt.toISOString(),
      })),
    },    capabilities: {
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
      leaveRequest: hasRbacPermission(
        parsed.actorPermissions,
        "hris.self_service.request",
      )
        ? "AVAILABLE" as const
        : "PERMISSION_REQUIRED" as const,
      overtimeRequest: hasRbacPermission(
        parsed.actorPermissions,
        "hris.self_service.request",
      )
        ? "AVAILABLE" as const
        : "PERMISSION_REQUIRED" as const,
      attendanceCorrectionRequest: hasRbacPermission(
        parsed.actorPermissions,
        "hris.self_service.request",
      )
        ? "AVAILABLE" as const
        : "PERMISSION_REQUIRED" as const,
      profileCorrectionRequest: "REVIEWED_WORKSPACE" as const,
    },
    dataOwnership: HRIS_EMPLOYEE_SELF_SERVICE_OWNERSHIP,
  }
}

export async function getHrisEmployeeSelfService(input:HrisEmployeeSelfServiceInput,client:SelfServiceClient=db){const parsed=hrisEmployeeSelfServiceInputSchema.parse(input);return selfServiceTransaction(client,async tx=>{const actor=await currentHrisActor(tx,parsed);await lockedOwnEmployee(tx,actor,false);return buildHrisEmployeeSelfService(actor,tx)})}

export type HrisEmployeeSelfServiceResult = Awaited<
  ReturnType<typeof getHrisEmployeeSelfService>
>
