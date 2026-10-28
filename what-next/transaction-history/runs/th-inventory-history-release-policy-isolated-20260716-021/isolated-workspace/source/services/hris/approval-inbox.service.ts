import "server-only"

import {
  PayrollContractStatus,
  PayrollPaymentDestinationChangeStatus,
  PayrollRubriqueAssignmentStatus,
  PayrollSalaryChangeStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import {
  approveHrisCompensationAssignment,
  approveHrisSalaryChange,
  applyApprovedHrisSalaryChange,
  pendingHrisCompensationAssignmentFromMetadata,
  rejectHrisSalaryChange,
} from "@/services/hris/compensation.service"
import { approveHrisContractActivation } from "@/services/hris/contract.service"
import {
  approveHrisContractDocumentEvidence,
  pendingHrisContractDocumentEvidenceFromMetadata,
} from "@/services/hris/document-evidence.service"
import {
  applyApprovedHrisEmployeeLifecycle,
  approveHrisEmployeeLifecycle,
  pendingHrisLifecycleFromMetadata,
  rejectHrisEmployeeLifecycle,
} from "@/services/hris/lifecycle.service"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import {
  applyApprovedHrisPaymentDestinationChange,
  approveHrisPaymentDestinationChange,
  rejectHrisPaymentDestinationChange,
} from "@/services/hris/payment-destination.service"
import { hrisContractActivationPending } from "@/services/payroll/contract.service"

const READ_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const
const MANAGE_PERMISSIONS = ["hris.people.manage"] as const

export const hrisApprovalDomainSchema = z.enum([
  "LIFECYCLE",
  "CONTRACT_ACTIVATION",
  "CONTRACT_DOCUMENT",
  "COMPENSATION_ASSIGNMENT",
  "SALARY_CHANGE",
  "PAYMENT_DESTINATION",
])

export const hrisApprovalStageSchema = z.enum(["REVIEW", "APPLY"])
export const hrisApprovalDecisionSchema = z.enum(["APPROVE", "REJECT", "APPLY"])

const actorSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
})

export const hrisApprovalInboxReadInputSchema = actorSchema.extend({
  domain: hrisApprovalDomainSchema.optional(),
  stage: hrisApprovalStageSchema.optional(),
  limit: z.number().int().positive().max(100).default(50),
}).strict()

export const hrisApprovalInboxDecisionInputSchema = actorSchema.extend({
  domain: hrisApprovalDomainSchema,
  decision: hrisApprovalDecisionSchema,
  employeeId: z.string().trim().min(1),
  sourceId: z.string().trim().min(1),
  decisionReason: z.string().trim().min(3).max(800).optional(),
  approvalEvidenceHash: z.string().trim().min(8).max(256).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.decision !== "APPLY" && !value.decisionReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["decisionReason"],
      message: "Approval and rejection decisions require a reason.",
    })
  }
  if (value.decision === "APPROVE" && !value.approvalEvidenceHash) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["approvalEvidenceHash"],
      message: "Approval requires evidence.",
    })
  }
})

export type HrisApprovalDomain = z.output<typeof hrisApprovalDomainSchema>
export type HrisApprovalStage = z.output<typeof hrisApprovalStageSchema>
export type HrisApprovalDecision = z.output<typeof hrisApprovalDecisionSchema>
export type HrisApprovalInboxReadInput = z.input<typeof hrisApprovalInboxReadInputSchema>
export type HrisApprovalInboxDecisionInput = z.input<typeof hrisApprovalInboxDecisionInputSchema>

export type HrisApprovalInboxItem = {
  id: string
  domain: HrisApprovalDomain
  stage: HrisApprovalStage
  sourceId: string
  employee: {
    id: string
    displayName: string
  }
  title: string
  subject: string
  requestedAt: string
  effectiveAt: string | null
  potentialActions: HrisApprovalDecision[]
  decision: {
    eligible: boolean
    reasonCode:
      | "ACTION_ALLOWED"
      | "MISSING_MANAGE_PERMISSION"
      | "REQUESTER_CANNOT_REVIEW"
      | "REQUESTER_CANNOT_APPLY"
      | "APPROVER_CANNOT_APPLY"
  }
  evidence: {
    requestEvidencePresent: boolean
    approvalEvidencePresent: boolean
    rawDetailsIncluded: false
  }
  readiness: {
    status: "BLOCKED"
    blockerCode: string
    impact:
      | "PAYROLL_INPUT"
      | "CONTRACT_ELIGIBILITY"
      | "COMPENSATION_ACTIVATION"
      | "PAYMENT_RELEASE"
  }
  reviewHref: string
}

type ApprovalInboxClient = typeof db | Prisma.TransactionClient

type ApprovalCandidate = Omit<HrisApprovalInboxItem, "decision"> & {
  requestedById: string
  approvedById: string | null
}

const DOMAIN_ACTIONS: Record<HrisApprovalDomain, readonly HrisApprovalDecision[]> = {
  LIFECYCLE: ["APPROVE", "REJECT", "APPLY"],
  CONTRACT_ACTIVATION: ["APPROVE"],
  CONTRACT_DOCUMENT: ["APPROVE"],
  COMPENSATION_ASSIGNMENT: ["APPROVE"],
  SALARY_CHANGE: ["APPROVE", "REJECT", "APPLY"],
  PAYMENT_DESTINATION: ["APPROVE", "REJECT", "APPLY"],
}

function assertPermission(
  actorPermissions: readonly string[],
  required: readonly string[],
  action: string,
) {
  if (!hasAnyRbacPermission(actorPermissions, required)) {
    throw new ForbiddenError(`Missing permission for ${action}.`)
  }
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

export function approvalDecisionEligibility(input: {
  actorId: string
  actorPermissions: readonly string[]
  domain: HrisApprovalDomain
  stage: HrisApprovalStage
  requestedById: string
  approvedById?: string | null
}) {
  if (!hasAnyRbacPermission(input.actorPermissions, MANAGE_PERMISSIONS)) {
    return { eligible: false as const, reasonCode: "MISSING_MANAGE_PERMISSION" as const }
  }
  if (input.actorId === input.requestedById) {
    return {
      eligible: false as const,
      reasonCode: input.stage === "REVIEW"
        ? "REQUESTER_CANNOT_REVIEW" as const
        : "REQUESTER_CANNOT_APPLY" as const,
    }
  }
  if (
    input.stage === "APPLY" &&
    (input.domain === "SALARY_CHANGE" || input.domain === "PAYMENT_DESTINATION") &&
    input.approvedById === input.actorId
  ) {
    return { eligible: false as const, reasonCode: "APPROVER_CANNOT_APPLY" as const }
  }
  return { eligible: true as const, reasonCode: "ACTION_ALLOWED" as const }
}

function toInboxItem(
  candidate: ApprovalCandidate,
  actor: { actorId: string; actorPermissions: readonly string[] },
): HrisApprovalInboxItem {
  const { requestedById, approvedById, ...item } = candidate
  return {
    ...item,
    decision: approvalDecisionEligibility({
      ...actor,
      domain: candidate.domain,
      stage: candidate.stage,
      requestedById,
      approvedById,
    }),
  }
}

function employeeScopeFilter(employeeIds: string[] | null) {
  return employeeIds === null ? {} : { employeeId: { in: employeeIds } }
}

function directEmployeeScopeFilter(employeeIds: string[] | null) {
  return employeeIds === null ? {} : { id: { in: employeeIds } }
}

function summaryByDomain(items: HrisApprovalInboxItem[]) {
  const summary: Record<HrisApprovalDomain, number> = {
    LIFECYCLE: 0,
    CONTRACT_ACTIVATION: 0,
    CONTRACT_DOCUMENT: 0,
    COMPENSATION_ASSIGNMENT: 0,
    SALARY_CHANGE: 0,
    PAYMENT_DESTINATION: 0,
  }
  for (const item of items) summary[item.domain] += 1
  return summary
}

export async function getHrisApprovalInbox(
  input: HrisApprovalInboxReadInput,
  client: ApprovalInboxClient = db,
) {
  const parsed = hrisApprovalInboxReadInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, READ_PERMISSIONS, "HRIS approval inbox read")
  const scope = await resolveHrisPeopleAccessScope(parsed, client)
  const scopedEmployees = scope.employeeIds
  const relatedScope = employeeScopeFilter(scopedEmployees)
  const rowLimit = parsed.limit

  const [employees, contracts, assignments, salaryChanges, paymentChanges] =
    await Promise.all([
      client.payrollEmployee.findMany({
        where: {
          organizationId: parsed.organizationId,
          deletedAt: null,
          ...directEmployeeScopeFilter(scopedEmployees),
        },
        select: { id: true, displayName: true, metadata: true, updatedAt: true },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: rowLimit,
      }),
      client.payrollContract.findMany({
        where: {
          organizationId: parsed.organizationId,
          deletedAt: null,
          status: PayrollContractStatus.DRAFT,
          ...relatedScope,
        },
        select: {
          id: true,
          employeeId: true,
          contractNumber: true,
          effectiveFrom: true,
          metadata: true,
          employee: { select: { displayName: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: Math.min(rowLimit * 2, 200),
      }),
      client.payrollEmployeeRubriqueAssignment.findMany({
        where: {
          organizationId: parsed.organizationId,
          deletedAt: null,
          status: PayrollRubriqueAssignmentStatus.DRAFT,
          ...relatedScope,
        },
        select: {
          id: true,
          employeeId: true,
          effectiveFrom: true,
          evidenceDocumentHash: true,
          metadata: true,
          employee: { select: { displayName: true } },
          rubrique: { select: { code: true, label: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: rowLimit,
      }),
      client.payrollSalaryChangeRequest.findMany({
        where: {
          organizationId: parsed.organizationId,
          deletedAt: null,
          status: { in: [PayrollSalaryChangeStatus.REQUESTED, PayrollSalaryChangeStatus.APPROVED] },
          ...relatedScope,
        },
        select: {
          id: true,
          employeeId: true,
          status: true,
          requestedById: true,
          approvedById: true,
          requestedAt: true,
          effectiveFrom: true,
          evidenceDocumentHash: true,
          approvalEvidenceHash: true,
          employee: { select: { displayName: true } },
        },
        orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
        take: rowLimit,
      }),
      client.payrollPaymentDestinationChangeRequest.findMany({
        where: {
          organizationId: parsed.organizationId,
          deletedAt: null,
          status: {
            in: [
              PayrollPaymentDestinationChangeStatus.REQUESTED,
              PayrollPaymentDestinationChangeStatus.APPROVED,
            ],
          },
          ...relatedScope,
        },
        select: {
          id: true,
          employeeId: true,
          status: true,
          paymentMethod: true,
          requestedById: true,
          approvedById: true,
          requestedAt: true,
          evidenceDocumentHash: true,
          approvalEvidenceHash: true,
          employee: { select: { displayName: true } },
        },
        orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
        take: rowLimit,
      }),
    ])

  const candidates: ApprovalCandidate[] = []

  for (const employee of employees) {
    const pending = pendingHrisLifecycleFromMetadata(employee.metadata)
    if (!pending) continue
    const review = pending.status === "REQUESTED"
    candidates.push({
      id: `LIFECYCLE:${pending.requestId}`,
      domain: "LIFECYCLE",
      stage: review ? "REVIEW" : "APPLY",
      sourceId: pending.requestId,
      employee: { id: employee.id, displayName: employee.displayName },
      title: "Lifecycle change",
      subject: `${pending.type} to ${pending.targetStatus}`,
      requestedAt: pending.requestedAt,
      effectiveAt: pending.effectiveAt,
      requestedById: pending.requestedById,
      approvedById: pending.approvedById ?? null,
      potentialActions: review ? ["APPROVE", "REJECT"] : ["APPLY"],
      evidence: {
        requestEvidencePresent: Boolean(pending.evidenceHash),
        approvalEvidencePresent: Boolean(pending.approvalEvidenceHash),
        rawDetailsIncluded: false,
      },
      readiness: {
        status: "BLOCKED",
        blockerCode: "LIFECYCLE_REQUEST_PENDING",
        impact: "PAYROLL_INPUT",
      },
      reviewHref: `/dashboard/people/${employee.id}`,
    })
  }

  for (const contract of contracts) {
    const document = pendingHrisContractDocumentEvidenceFromMetadata(contract.metadata)
    if (document) {
      candidates.push({
        id: `CONTRACT_DOCUMENT:${contract.id}`,
        domain: "CONTRACT_DOCUMENT",
        stage: "REVIEW",
        sourceId: contract.id,
        employee: { id: contract.employeeId, displayName: contract.employee.displayName },
        title: "Contract document",
        subject: contract.contractNumber,
        requestedAt: document.capturedAt,
        effectiveAt: contract.effectiveFrom.toISOString(),
        requestedById: document.capturedById,
        approvedById: null,
        potentialActions: ["APPROVE"],
        evidence: {
          requestEvidencePresent: Boolean(document.artifactHash && document.malwareScanEvidenceHash),
          approvalEvidencePresent: false,
          rawDetailsIncluded: false,
        },
        readiness: {
          status: "BLOCKED",
          blockerCode: "DOCUMENT_EVIDENCE_PENDING",
          impact: "CONTRACT_ELIGIBILITY",
        },
        reviewHref: `/dashboard/people/${contract.employeeId}`,
      })
    }

    const activation = hrisContractActivationPending(contract.metadata)
    if (activation) {
      candidates.push({
        id: `CONTRACT_ACTIVATION:${contract.id}`,
        domain: "CONTRACT_ACTIVATION",
        stage: "REVIEW",
        sourceId: contract.id,
        employee: { id: contract.employeeId, displayName: contract.employee.displayName },
        title: "Contract activation",
        subject: contract.contractNumber,
        requestedAt: activation.requestedAt,
        effectiveAt: contract.effectiveFrom.toISOString(),
        requestedById: activation.requestedById,
        approvedById: null,
        potentialActions: ["APPROVE"],
        evidence: {
          requestEvidencePresent: Boolean(activation.requestEvidenceHash),
          approvalEvidencePresent: false,
          rawDetailsIncluded: false,
        },
        readiness: {
          status: "BLOCKED",
          blockerCode: "CONTRACT_ACTIVATION_PENDING",
          impact: "CONTRACT_ELIGIBILITY",
        },
        reviewHref: `/dashboard/people/${contract.employeeId}`,
      })
    }
  }

  for (const assignment of assignments) {
    const pending = pendingHrisCompensationAssignmentFromMetadata(assignment.metadata)
    if (!pending) continue
    candidates.push({
      id: `COMPENSATION_ASSIGNMENT:${assignment.id}`,
      domain: "COMPENSATION_ASSIGNMENT",
      stage: "REVIEW",
      sourceId: assignment.id,
      employee: { id: assignment.employeeId, displayName: assignment.employee.displayName },
      title: "Compensation assignment",
      subject: `${assignment.rubrique.label} (${assignment.rubrique.code})`,
      requestedAt: pending.requestedAt,
      effectiveAt: assignment.effectiveFrom.toISOString(),
      requestedById: pending.requestedById,
      approvedById: null,
      potentialActions: ["APPROVE"],
      evidence: {
        requestEvidencePresent: Boolean(assignment.evidenceDocumentHash),
        approvalEvidencePresent: false,
        rawDetailsIncluded: false,
      },
      readiness: {
        status: "BLOCKED",
        blockerCode: "COMPENSATION_ASSIGNMENT_PENDING",
        impact: "COMPENSATION_ACTIVATION",
      },
      reviewHref: `/dashboard/people/${assignment.employeeId}`,
    })
  }

  for (const change of salaryChanges) {
    const review = change.status === PayrollSalaryChangeStatus.REQUESTED
    candidates.push({
      id: `SALARY_CHANGE:${change.id}`,
      domain: "SALARY_CHANGE",
      stage: review ? "REVIEW" : "APPLY",
      sourceId: change.id,
      employee: { id: change.employeeId, displayName: change.employee.displayName },
      title: "Salary change",
      subject: `Effective ${change.effectiveFrom.toISOString().slice(0, 10)}`,
      requestedAt: change.requestedAt.toISOString(),
      effectiveAt: change.effectiveFrom.toISOString(),
      requestedById: change.requestedById,
      approvedById: change.approvedById,
      potentialActions: review ? ["APPROVE", "REJECT"] : ["APPLY"],
      evidence: {
        requestEvidencePresent: Boolean(change.evidenceDocumentHash),
        approvalEvidencePresent: Boolean(change.approvalEvidenceHash),
        rawDetailsIncluded: false,
      },
      readiness: {
        status: "BLOCKED",
        blockerCode: "COMPENSATION_CHANGE_PENDING",
        impact: "PAYROLL_INPUT",
      },
      reviewHref: `/dashboard/people/${change.employeeId}`,
    })
  }

  for (const change of paymentChanges) {
    const review = change.status === PayrollPaymentDestinationChangeStatus.REQUESTED
    candidates.push({
      id: `PAYMENT_DESTINATION:${change.id}`,
      domain: "PAYMENT_DESTINATION",
      stage: review ? "REVIEW" : "APPLY",
      sourceId: change.id,
      employee: { id: change.employeeId, displayName: change.employee.displayName },
      title: "Payment destination",
      subject: change.paymentMethod,
      requestedAt: change.requestedAt.toISOString(),
      effectiveAt: null,
      requestedById: change.requestedById,
      approvedById: change.approvedById,
      potentialActions: review ? ["APPROVE", "REJECT"] : ["APPLY"],
      evidence: {
        requestEvidencePresent: Boolean(change.evidenceDocumentHash),
        approvalEvidencePresent: Boolean(change.approvalEvidenceHash),
        rawDetailsIncluded: false,
      },
      readiness: {
        status: "BLOCKED",
        blockerCode: "PAYMENT_DESTINATION_CHANGE_PENDING",
        impact: "PAYMENT_RELEASE",
      },
      reviewHref: `/dashboard/people/${change.employeeId}`,
    })
  }

  const allItems = candidates
    .map((candidate) => toInboxItem(candidate, parsed))
    .sort((left, right) => {
      if (left.stage !== right.stage) return left.stage === "REVIEW" ? -1 : 1
      return left.requestedAt.localeCompare(right.requestedAt) || left.id.localeCompare(right.id)
    })
  const items = allItems
    .filter((item) => !parsed.domain || item.domain === parsed.domain)
    .filter((item) => !parsed.stage || item.stage === parsed.stage)
    .slice(0, parsed.limit)

  await client.auditLog.create({
    data: {
      entityType: "HrisApprovalInbox",
      entityId: parsed.organizationId,
      action: "HRIS_APPROVAL_INBOX_READ",
      userId: parsed.actorId,
      organizationId: parsed.organizationId,
      changes: safeJson({
        returnedCount: items.length,
        visiblePendingCount: allItems.length,
        actionableCount: allItems.filter((item) => item.decision.eligible).length,
        selfApprovalBlockedCount: allItems.filter((item) =>
          item.decision.reasonCode === "REQUESTER_CANNOT_REVIEW" ||
          item.decision.reasonCode === "REQUESTER_CANNOT_APPLY" ||
          item.decision.reasonCode === "APPROVER_CANNOT_APPLY"
        ).length,
        authorityKind: scope.authority.kind,
        rawAuthorityIncluded: false,
        compensationValuesIncluded: false,
        paymentDestinationValuesIncluded: false,
      }),
    },
  })

  return {
    organizationId: parsed.organizationId,
    asOf: new Date().toISOString(),
    items,
    summary: {
      visiblePending: allItems.length,
      returned: items.length,
      review: allItems.filter((item) => item.stage === "REVIEW").length,
      apply: allItems.filter((item) => item.stage === "APPLY").length,
      actionable: allItems.filter((item) => item.decision.eligible).length,
      selfApprovalBlocked: allItems.filter((item) => !item.decision.eligible).length,
      byDomain: summaryByDomain(allItems),
    },
    readiness: {
      status: allItems.length === 0 ? "READY" as const : "BLOCKED" as const,
      blockerCount: allItems.length,
      blockerCodes: Array.from(new Set(allItems.map((item) => item.readiness.blockerCode))).sort(),
    },
    accessScope: {
      organizationId: scope.organizationId,
      authority: scope.authority,
      managedLocationCount: scope.managedLocations.length,
    },
    redaction: {
      requesterIdentifiersIncluded: false,
      compensationValuesIncluded: false,
      paymentDestinationValuesIncluded: false,
      documentHashesIncluded: false,
      rawDocumentsIncluded: false,
    },
    dataOwnership: {
      owner: "HRIS_APPROVAL_INBOX_PROJECTION",
      persistence: "DOMAIN_WORKFLOWS_ONLY",
      mutationAuthority: "DOMAIN_SERVICES",
      payrollReadinessOwner: "HRIS_PAYROLL_READINESS_CONTRACT",
    },
  }
}

function eventIdFromResult(result: unknown) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null
  const record = result as Record<string, unknown>
  if (typeof record.businessEventId === "string") return record.businessEventId
  if (typeof record.approvalBusinessEventId === "string") {
    return record.approvalBusinessEventId
  }
  return null
}

export async function decideHrisApprovalInboxItem(
  input: HrisApprovalInboxDecisionInput,
  client: ApprovalInboxClient = db,
) {
  const parsed = hrisApprovalInboxDecisionInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "HRIS approval inbox decision")
  if (!DOMAIN_ACTIONS[parsed.domain].includes(parsed.decision)) {
    throw new BusinessRuleError(
      `${parsed.decision} is not supported for ${parsed.domain} approvals.`,
    )
  }
  await resolveHrisPeopleAccessScope({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: parsed.actorPermissions,
    employeeId: parsed.employeeId,
    limit: 1,
  }, client)

  const common = {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: parsed.actorPermissions,
    employeeId: parsed.employeeId,
    idempotencyKey: parsed.idempotencyKey,
  }
  let result: unknown

  switch (parsed.domain) {
    case "LIFECYCLE":
      result = parsed.decision === "APPROVE"
        ? await approveHrisEmployeeLifecycle({
            ...common,
            requestId: parsed.sourceId,
            decisionReason: parsed.decisionReason ?? "Approved",
            approvalEvidenceHash: parsed.approvalEvidenceHash,
          }, client)
        : parsed.decision === "REJECT"
          ? await rejectHrisEmployeeLifecycle({
              ...common,
              requestId: parsed.sourceId,
              decisionReason: parsed.decisionReason ?? "Rejected",
            }, client)
          : await applyApprovedHrisEmployeeLifecycle({
              ...common,
              requestId: parsed.sourceId,
            }, client)
      break
    case "CONTRACT_ACTIVATION":
      result = await approveHrisContractActivation({
        ...common,
        contractId: parsed.sourceId,
        decisionReason: parsed.decisionReason ?? "Approved",
        approvalEvidenceHash: parsed.approvalEvidenceHash ?? "",
      }, client)
      break
    case "CONTRACT_DOCUMENT":
      result = await approveHrisContractDocumentEvidence({
        ...common,
        contractId: parsed.sourceId,
        decisionReason: parsed.decisionReason ?? "Approved",
        approvalEvidenceHash: parsed.approvalEvidenceHash ?? "",
      }, client)
      break
    case "COMPENSATION_ASSIGNMENT":
      result = await approveHrisCompensationAssignment({
        ...common,
        assignmentId: parsed.sourceId,
        decisionReason: parsed.decisionReason ?? "Approved",
        approvalEvidenceHash: parsed.approvalEvidenceHash ?? "",
      }, client)
      break
    case "SALARY_CHANGE":
      result = parsed.decision === "APPROVE"
        ? await approveHrisSalaryChange({
            ...common,
            salaryChangeRequestId: parsed.sourceId,
            decisionReason: parsed.decisionReason ?? "Approved",
            approvalEvidenceHash: parsed.approvalEvidenceHash ?? "",
          }, client)
        : parsed.decision === "REJECT"
          ? await rejectHrisSalaryChange({
              ...common,
              salaryChangeRequestId: parsed.sourceId,
              decisionReason: parsed.decisionReason ?? "Rejected",
            }, client)
          : await applyApprovedHrisSalaryChange({
              ...common,
              salaryChangeRequestId: parsed.sourceId,
            }, client)
      break
    case "PAYMENT_DESTINATION":
      result = parsed.decision === "APPROVE"
        ? await approveHrisPaymentDestinationChange({
            ...common,
            paymentDestinationChangeRequestId: parsed.sourceId,
            decisionReason: parsed.decisionReason ?? "Approved",
            approvalEvidenceHash: parsed.approvalEvidenceHash ?? "",
          }, client)
        : parsed.decision === "REJECT"
          ? await rejectHrisPaymentDestinationChange({
              ...common,
              paymentDestinationChangeRequestId: parsed.sourceId,
              decisionReason: parsed.decisionReason ?? "Rejected",
            }, client)
          : await applyApprovedHrisPaymentDestinationChange({
              ...common,
              paymentDestinationChangeRequestId: parsed.sourceId,
            }, client)
      break
  }

  return {
    domain: parsed.domain,
    decision: parsed.decision,
    employeeId: parsed.employeeId,
    sourceId: parsed.sourceId,
    status: "COMPLETED" as const,
    businessEventId: eventIdFromResult(result),
  }
}

export type HrisApprovalInbox = Awaited<ReturnType<typeof getHrisApprovalInbox>>
