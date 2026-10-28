import "server-only"

import { PayrollContractStatus, Prisma } from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"

type DbClient = typeof db | Prisma.TransactionClient
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0]

const READ_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const
const MANAGE_PERMISSIONS = ["hris.people.manage"] as const

const evidenceReadInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1),
  contractId: z.string().trim().min(1),
  purpose: z.enum(["METADATA_READ", "REDACTED_EXPORT", "RAW_DOWNLOAD"]),
})

const evidenceRequestInputSchema = evidenceReadInputSchema.omit({ purpose: true }).extend({
  artifactHash: z.string().trim().min(12).max(256),
  malwareScanEvidenceHash: z.string().trim().min(12).max(256),
  malwareScanProvider: z.string().trim().min(2).max(120),
  malwareScannedAt: z.coerce.date(),
  signedAt: z.coerce.date(),
  retentionPolicyCode: z.string().trim().min(2).max(120),
  retentionBasis: z.string().trim().min(3).max(240),
  retainUntil: z.coerce.date(),
  legalHold: z.boolean().default(false),
  legalHoldReason: z.string().trim().min(3).max(500).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
}).superRefine((value, ctx) => {
  if (value.retainUntil <= value.signedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["retainUntil"], message: "Retention must extend beyond signing." })
  }
  if (value.legalHold && !value.legalHoldReason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["legalHoldReason"], message: "Legal hold requires a reason." })
  }
})

const evidenceApprovalInputSchema = evidenceReadInputSchema.omit({ purpose: true }).extend({
  decisionReason: z.string().trim().min(3).max(500),
  approvalEvidenceHash: z.string().trim().min(12).max(256),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

const documentEvidencePendingSchema = z.object({
  requestId: z.string().min(1),
  capturedById: z.string().min(1),
  capturedAt: z.string().datetime(),
  artifactHash: z.string().min(12),
  malwareScanEvidenceHash: z.string().min(12),
  malwareScanProvider: z.string().min(2),
  malwareScannedAt: z.string().datetime(),
  signedAt: z.string().datetime(),
  retentionPolicyCode: z.string().min(2),
  retentionBasis: z.string().min(3),
  retainUntil: z.string().datetime(),
  legalHold: z.boolean(),
  legalHoldReasonHash: z.string().min(12).nullable(),
})

const documentEvidenceCurrentSchema = documentEvidencePendingSchema.extend({
  status: z.literal("APPROVED"),
  approvedById: z.string().min(1),
  approvedAt: z.string().datetime(),
  approvalEvidenceHash: z.string().min(12),
  decisionReasonHash: z.string().min(12),
  approvalBusinessEventId: z.string().min(1),
})

function assertPermission(actorPermissions: readonly string[], required: readonly string[], action: string) {
  if (!hasAnyRbacPermission(actorPermissions, required)) {
    throw new ForbiddenError(`Missing permission for ${action}.`)
  }
}

function hasRootTransaction(client: DbClient): client is typeof db {
  return typeof (client as { $transaction?: unknown }).$transaction === "function"
}

async function inTransaction<T>(client: DbClient, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (hasRootTransaction(client)) return client.$transaction((tx) => fn(tx))
  return fn(client as Prisma.TransactionClient)
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function evidenceProjection(metadata: unknown) {
  return metadataRecord(metadataRecord(metadata).hrisDocumentEvidence)
}

function pendingEvidence(metadata: unknown) {
  const parsed = documentEvidencePendingSchema.safeParse(evidenceProjection(metadata).pending)
  return parsed.success ? parsed.data : null
}

export function pendingHrisContractDocumentEvidenceFromMetadata(metadata: unknown) {
  return pendingEvidence(metadata)
}

function currentEvidence(metadata: unknown) {
  const parsed = documentEvidenceCurrentSchema.safeParse(evidenceProjection(metadata).current)
  return parsed.success ? parsed.data : null
}

function withEvidenceProjection(
  metadata: unknown,
  pending: z.output<typeof documentEvidencePendingSchema> | null,
  current: z.output<typeof documentEvidenceCurrentSchema> | null,
) {
  return safeJson({
    ...metadataRecord(metadata),
    hrisDocumentEvidence: {
      version: 1,
      pending,
      current,
      rawStorageIntegrated: false,
      downloadAccessIntegrated: false,
      updatedAt: new Date().toISOString(),
    },
  })
}

async function findContract(
  client: Prisma.TransactionClient | DbClient,
  input: { organizationId: string; employeeId: string; contractId: string },
) {
  const contract = await client.payrollContract.findFirst({
    where: {
      id: input.contractId,
      employeeId: input.employeeId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      employeeId: true,
      contractNumber: true,
      status: true,
      signedDocumentHash: true,
      activatedBusinessEventId: true,
      metadata: true,
    },
  })
  if (!contract) throw new NotFoundError("HRIS contract document evidence was not found for this employee and tenant.")
  return contract
}

async function recordEvidenceEvent(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId: string
    contractId: string
    eventType: "hris.contract.document.requested" | "hris.contract.document.approved"
    idempotencyKey: string
    payload: Record<string, unknown>
    documentHash: string
  },
) {
  const result = await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
    organizationId: input.organizationId,
    eventType: input.eventType,
    eventSource: "INTERNAL",
    schemaVersion: 1,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    actorId: input.actorId,
    sourceType: "HRIS_CONTRACT_DOCUMENT",
    sourceId: input.contractId,
    documentHash: input.documentHash,
    metadata: { gate: "stoquify-hris-07-contract-document-evidence" },
  })
  await markBusinessEventAppliedInTx(tx as unknown as BusinessEventTx, input.organizationId, result.event.id)
  return result.event.id
}

export async function requestHrisContractDocumentEvidence(
  input: z.input<typeof evidenceRequestInputSchema>,
  client: DbClient = db,
) {
  const parsed = evidenceRequestInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "HRIS contract document evidence request")
  await resolveHrisPeopleAccessScope(parsed, client)

  return inTransaction(client, async (tx) => {
    const contract = await findContract(tx, parsed)
    if (contract.status !== PayrollContractStatus.DRAFT) {
      throw new BusinessRuleError("Signed document evidence can only be replaced while a contract is draft.")
    }
    if (contract.signedDocumentHash) {
      throw new ConflictError("Contract already has approved signed document evidence.")
    }
    const openRequest = pendingEvidence(contract.metadata)
    if (openRequest) {
      if (openRequest.capturedById === parsed.actorId && openRequest.artifactHash === parsed.artifactHash) {
        return { contractId: contract.id, status: "PENDING_REVIEW" as const, requestId: openRequest.requestId }
      }
      throw new ConflictError("Contract already has document evidence pending review.")
    }

    const reasonHash = parsed.legalHoldReason
      ? `sha256:${hashBusinessPayload({ reason: parsed.legalHoldReason })}`
      : null
    const eventId = await recordEvidenceEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      contractId: contract.id,
      eventType: "hris.contract.document.requested",
      idempotencyKey: parsed.idempotencyKey ?? ["hris-contract-document-request", parsed.organizationId, contract.id].join(":"),
      documentHash: parsed.artifactHash,
      payload: {
        contractId: contract.id,
        employeeId: contract.employeeId,
        malwareScanEvidencePresent: true,
        retentionPolicyCode: parsed.retentionPolicyCode,
        retainUntil: parsed.retainUntil.toISOString(),
        legalHold: parsed.legalHold,
      },
    })
    const pending = {
      requestId: eventId,
      capturedById: parsed.actorId,
      capturedAt: new Date().toISOString(),
      artifactHash: parsed.artifactHash,
      malwareScanEvidenceHash: parsed.malwareScanEvidenceHash,
      malwareScanProvider: parsed.malwareScanProvider,
      malwareScannedAt: parsed.malwareScannedAt.toISOString(),
      signedAt: parsed.signedAt.toISOString(),
      retentionPolicyCode: parsed.retentionPolicyCode,
      retentionBasis: parsed.retentionBasis,
      retainUntil: parsed.retainUntil.toISOString(),
      legalHold: parsed.legalHold,
      legalHoldReasonHash: reasonHash,
    }
    await tx.payrollContract.update({
      where: { id: contract.id, organizationId: parsed.organizationId },
      data: { metadata: withEvidenceProjection(contract.metadata, pending, currentEvidence(contract.metadata)) },
    })
    await tx.auditLog.create({
      data: {
        entityType: "HrisContractDocumentEvidence",
        entityId: contract.id,
        action: "HRIS_CONTRACT_DOCUMENT_EVIDENCE_REQUESTED",
        userId: parsed.actorId,
        organizationId: parsed.organizationId,
        changes: safeJson({
          employeeId: contract.employeeId,
          requestId: eventId,
          malwareScanEvidencePresent: true,
          retentionPolicyCode: parsed.retentionPolicyCode,
          retainUntil: parsed.retainUntil.toISOString(),
          legalHold: parsed.legalHold,
          rawDocumentStored: false,
        }),
      },
    })
    return { contractId: contract.id, status: "PENDING_REVIEW" as const, requestId: eventId }
  })
}

export async function approveHrisContractDocumentEvidence(
  input: z.input<typeof evidenceApprovalInputSchema>,
  client: DbClient = db,
) {
  const parsed = evidenceApprovalInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "HRIS contract document evidence approval")
  await resolveHrisPeopleAccessScope(parsed, client)

  return inTransaction(client, async (tx) => {
    const contract = await findContract(tx, parsed)
    const pending = pendingEvidence(contract.metadata)
    if (!pending) throw new NotFoundError("Pending HRIS contract document evidence was not found.")
    if (pending.capturedById === parsed.actorId) {
      throw new ForbiddenError("Document evidence capturer cannot approve their own evidence.")
    }
    if (contract.status !== PayrollContractStatus.DRAFT) {
      throw new BusinessRuleError("Only draft-contract evidence can be approved.")
    }

    const decisionReasonHash = `sha256:${hashBusinessPayload({ decisionReason: parsed.decisionReason })}`
    const eventId = await recordEvidenceEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      contractId: contract.id,
      eventType: "hris.contract.document.approved",
      idempotencyKey: parsed.idempotencyKey ?? ["hris-contract-document-approve", parsed.organizationId, contract.id, pending.requestId].join(":"),
      documentHash: parsed.approvalEvidenceHash,
      payload: {
        contractId: contract.id,
        employeeId: contract.employeeId,
        requestId: pending.requestId,
        capturedById: pending.capturedById,
        approvedById: parsed.actorId,
        decisionReasonHash,
        artifactIntegrityProofPresent: true,
      },
    })
    const current = {
      ...pending,
      status: "APPROVED" as const,
      approvedById: parsed.actorId,
      approvedAt: new Date().toISOString(),
      approvalEvidenceHash: parsed.approvalEvidenceHash,
      decisionReasonHash,
      approvalBusinessEventId: eventId,
    }
    await tx.payrollContract.update({
      where: { id: contract.id, organizationId: parsed.organizationId },
      data: {
        signedDocumentHash: pending.artifactHash,
        metadata: withEvidenceProjection(contract.metadata, null, current),
      },
    })
    await tx.auditLog.create({
      data: {
        entityType: "HrisContractDocumentEvidence",
        entityId: contract.id,
        action: "HRIS_CONTRACT_DOCUMENT_EVIDENCE_APPROVED",
        userId: parsed.actorId,
        organizationId: parsed.organizationId,
        changes: safeJson({
          employeeId: contract.employeeId,
          requestId: pending.requestId,
          approvalBusinessEventId: eventId,
          makerChecker: true,
          malwareScanEvidencePresent: true,
          rawDocumentStored: false,
        }),
      },
    })
    return {
      contractId: contract.id,
      status: "APPROVED" as const,
      approvalBusinessEventId: eventId,
      documentEvidencePresent: true,
    }
  })
}

export async function evaluateHrisContractDocumentAccess(
  input: z.input<typeof evidenceReadInputSchema>,
  client: DbClient = db,
) {
  const parsed = evidenceReadInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, READ_PERMISSIONS, "HRIS contract document evidence read")
  const accessScope = await resolveHrisPeopleAccessScope(parsed, client)
  const contract = await findContract(client, parsed)
  const current = currentEvidence(contract.metadata)
  const pending = pendingEvidence(contract.metadata)
  const rawDownload = parsed.purpose === "RAW_DOWNLOAD"
  const governanceStatus = current
    ? "APPROVED"
    : pending
      ? "PENDING_REVIEW"
      : contract.signedDocumentHash
        ? "LEGACY_UNGOVERNED"
        : "MISSING"
  const retainUntil = current?.retainUntil ?? pending?.retainUntil ?? null
  const legalHold = current?.legalHold ?? pending?.legalHold ?? false
  const retentionStatus = legalHold
    ? "LEGAL_HOLD"
    : retainUntil
      ? new Date(retainUntil) > new Date() ? "RETAIN" : "EXPIRED_REVIEW_REQUIRED"
      : "UNDECIDED"

  const result = {
    organizationId: parsed.organizationId,
    contract: {
      id: contract.id,
      employeeId: contract.employeeId,
      contractNumber: contract.contractNumber,
      status: contract.status,
    },
    purpose: parsed.purpose,
    decision: {
      allowed: !rawDownload,
      reasonCode: rawDownload ? "RAW_DOCUMENT_ACCESS_NOT_IMPLEMENTED" as const : "SAFE_METADATA_ONLY" as const,
    },
    evidence: {
      status: governanceStatus,
      documentEvidencePresent: Boolean(contract.signedDocumentHash || pending),
      makerCheckerProven: Boolean(current),
      malwareScanEvidencePresent: Boolean(current?.malwareScanEvidenceHash ?? pending?.malwareScanEvidenceHash),
      retentionPolicyCode: current?.retentionPolicyCode ?? pending?.retentionPolicyCode ?? null,
      retainUntil,
      retentionStatus,
      legalHold,
      activationBusinessEventPresent: Boolean(contract.activatedBusinessEventId),
    },
    rawAccess: {
      available: false,
      url: null,
      token: null,
      objectKey: null,
      prerequisites: ["SHORT_LIVED_GRANT", "AUTHORIZED_STORAGE", "MALWARE_SCAN", "RETENTION_CHECK", "LEGAL_HOLD_CHECK"],
    },
    accessScope: {
      organizationId: accessScope.organizationId,
      authority: accessScope.authority,
      managedLocationCount: accessScope.managedLocations.length,
    },
    exportPolicy: parsed.purpose === "REDACTED_EXPORT" ? "HASHES_AND_ACTOR_DETAILS_EXCLUDED" as const : null,
  }

  await client.auditLog.create({
    data: {
      entityType: "HrisContractDocumentEvidence",
      entityId: contract.id,
      action: rawDownload ? "HRIS_CONTRACT_DOCUMENT_RAW_ACCESS_DENIED" : parsed.purpose === "REDACTED_EXPORT"
        ? "HRIS_CONTRACT_DOCUMENT_REDACTED_EXPORT"
        : "HRIS_CONTRACT_DOCUMENT_METADATA_READ",
      userId: parsed.actorId,
      organizationId: parsed.organizationId,
      changes: safeJson({
        purpose: parsed.purpose,
        allowed: result.decision.allowed,
        governanceStatus,
        authorityKind: accessScope.authority.kind,
        rawDocumentIncluded: false,
      }),
    },
  })

  return result
}
