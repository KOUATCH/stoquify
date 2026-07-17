import "server-only"

import { PayrollContractStatus } from "@prisma/client"
import { z } from "zod"

import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import {
  approvePayrollContractActivationFromHris,
  getEmployeeContractWorkflow,
  requestPayrollContractActivationFromHris,
  type PayrollContractMutationResult,
  type PayrollContractWorkflowContract,
} from "@/services/payroll/contract.service"
import {
  resolveHrisPeopleAccessScope,
} from "@/services/hris/org.service"

type ContractClient = NonNullable<Parameters<typeof getEmployeeContractWorkflow>[1]>

const contractReadInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1),
})

const contractActivationRequestInputSchema = contractReadInputSchema.extend({
  contractId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(500),
  requestEvidenceHash: z.string().trim().min(8).max(256),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

const contractActivationApprovalInputSchema = contractReadInputSchema.extend({
  contractId: z.string().trim().min(1),
  decisionReason: z.string().trim().min(3).max(500),
  approvalEvidenceHash: z.string().trim().min(8).max(256),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export type HrisContractRecord = {
  id: string
  employeeId: string
  contractNumber: string
  type: PayrollContractWorkflowContract["type"]
  status: PayrollContractWorkflowContract["status"]
  effectiveFrom: string
  effectiveTo: string | null
  workingHoursPerMonth: string | null
  classification: string | null
  echelon: string | null
  convention: string | null
  documentEvidencePresent: boolean
  activationBusinessEventPresent: boolean
  approvalStatus: PayrollContractWorkflowContract["hrisApprovalStatus"]
  makerCheckerProven: boolean
  payrollReadiness: "READY" | "BLOCKED" | "LEGACY_REVIEW_REQUIRED"
}

function mapContract(contract: PayrollContractWorkflowContract): HrisContractRecord {
  const active = contract.status === PayrollContractStatus.ACTIVE
  const proofComplete = contract.signedDocumentHashPresent && Boolean(contract.activatedBusinessEventId)
  const makerCheckerProven = contract.hrisApprovalStatus === "APPROVED"

  return {
    id: contract.id,
    employeeId: contract.employeeId,
    contractNumber: contract.contractNumber,
    type: contract.type,
    status: contract.status,
    effectiveFrom: contract.effectiveFrom,
    effectiveTo: contract.effectiveTo,
    workingHoursPerMonth: contract.workingHoursPerMonth,
    classification: contract.classification,
    echelon: contract.echelon,
    convention: contract.convention,
    documentEvidencePresent: contract.signedDocumentHashPresent,
    activationBusinessEventPresent: Boolean(contract.activatedBusinessEventId),
    approvalStatus: contract.hrisApprovalStatus,
    makerCheckerProven,
    payrollReadiness: active && proofComplete
      ? makerCheckerProven ? "READY" : "LEGACY_REVIEW_REQUIRED"
      : "BLOCKED",
  }
}

function mapMutation(result: PayrollContractMutationResult) {
  return {
    contract: mapContract(result.contract),
    businessEventId: result.businessEventId,
  }
}

function safeAccessScope(scope: Awaited<ReturnType<typeof resolveHrisPeopleAccessScope>>) {
  return {
    organizationId: scope.organizationId,
    authority: scope.authority,
    managedLocationCount: scope.managedLocations.length,
  }
}

export async function getHrisEmployeeContractRegister(
  input: z.input<typeof contractReadInputSchema>,
  client: ContractClient = db,
) {
  const parsed = contractReadInputSchema.parse(input)
  const accessScope = await resolveHrisPeopleAccessScope(parsed, client)
  const result = await getEmployeeContractWorkflow({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: ["payroll.contracts.read"],
    employeeId: parsed.employeeId,
  }, client)
  const employee = result.employees[0]

  await client.auditLog.create({
    data: {
      entityType: "HrisContractRegister",
      entityId: parsed.employeeId,
      action: "HRIS_CONTRACT_REGISTER_READ",
      userId: parsed.actorId,
      organizationId: parsed.organizationId,
      changes: {
        returnedContracts: employee?.contracts.length ?? 0,
        authorityKind: accessScope.authority.kind,
        salaryIncluded: false,
        rawDocumentIncluded: false,
      },
    },
  })

  return {
    organizationId: result.organizationId,
    asOf: result.asOf,
    employee: employee ? {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      displayName: employee.displayName,
      status: employee.status,
      payrollEligible: employee.payrollEligible,
      activeContractId: employee.activeContractId,
      contracts: employee.contracts.map(mapContract),
    } : null,
    accessScope: safeAccessScope(accessScope),
    dataOwnership: {
      sourceOwner: "HRIS_CONTRACT_SERVICE",
      compatibilityStorage: "PayrollContract",
      payrollConsumption: "APPROVED_CONTRACT_PROOF_ONLY",
    } as const,
  }
}

export async function requestHrisContractActivation(
  input: z.input<typeof contractActivationRequestInputSchema>,
  client: ContractClient = db,
) {
  const parsed = contractActivationRequestInputSchema.parse(input)
  await resolveHrisPeopleAccessScope(parsed, client)
  return requestPayrollContractActivationFromHris({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: parsed.actorPermissions,
    employeeId: parsed.employeeId,
    contractId: parsed.contractId,
    reasonHash: `sha256:${hashBusinessPayload({ reason: parsed.reason })}`,
    requestEvidenceHash: parsed.requestEvidenceHash,
    idempotencyKey: parsed.idempotencyKey,
  }, client)
}

export async function approveHrisContractActivation(
  input: z.input<typeof contractActivationApprovalInputSchema>,
  client: ContractClient = db,
) {
  const parsed = contractActivationApprovalInputSchema.parse(input)
  await resolveHrisPeopleAccessScope(parsed, client)
  return mapMutation(await approvePayrollContractActivationFromHris({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: parsed.actorPermissions,
    employeeId: parsed.employeeId,
    contractId: parsed.contractId,
    decisionReasonHash: `sha256:${hashBusinessPayload({ decisionReason: parsed.decisionReason })}`,
    approvalEvidenceHash: parsed.approvalEvidenceHash,
    idempotencyKey: parsed.idempotencyKey,
  }, client))
}

export type HrisEmployeeContractRegister = Awaited<ReturnType<typeof getHrisEmployeeContractRegister>>
export type HrisContractAccessScope = ReturnType<typeof safeAccessScope>
