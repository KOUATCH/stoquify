import "server-only"

import {
  PayrollDeclarationEvidenceTransition,
  PayrollDeclarationStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  recordCloseCertificationInvalidationsForSourceInTx,
  type CloseCertificationInvalidationSourceCode,
} from "@/services/accounting/close-assurance-pack.service"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

type DbClient = typeof db | Prisma.TransactionClient
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0]
type CloseSourceCode = Exclude<CloseCertificationInvalidationSourceCode, "CUSTOM">

const idSchema = z.string().trim().min(1)
const hashSchema = z.string().trim().min(1)
const dateInputSchema = z.union([z.date(), z.string().trim().min(1), z.number()])

export const payrollDeclarationLifecycleTransitionSchema = z.enum([
  "submit",
  "accept",
  "reject",
  "mark_payment_due",
  "mark_paid",
  "reconcile",
  "archive",
  "amend",
])

export const recordPayrollDeclarationEvidenceInputSchema = z.object({
  organizationId: idSchema,
  declarationId: idSchema,
  transition: payrollDeclarationLifecycleTransitionSchema,
  actorId: idSchema,
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  authorityChannel: z.string().trim().min(1).default("MANUAL_PORTAL"),
  authorityEnvironment: z.string().trim().min(1).default("MANUAL_PORTAL"),
  authorityReference: z.string().trim().min(1).optional(),
  authorityStatus: z.string().trim().min(1),
  submittedAt: dateInputSchema.optional(),
  submittedById: idSchema.optional(),
  approvedById: idSchema.optional(),
  submittedPayloadHash: hashSchema.optional(),
  authorityResponseHash: hashSchema.optional(),
  portalReceiptHash: hashSchema.optional(),
  supportingFileHash: hashSchema.optional(),
  sourceRegisterHash: hashSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
  idempotencyKey: idSchema,
  metadata: z.unknown().optional(),
})

export type PayrollDeclarationLifecycleTransition = z.infer<typeof payrollDeclarationLifecycleTransitionSchema>
export type RecordPayrollDeclarationEvidenceInput = z.input<typeof recordPayrollDeclarationEvidenceInputSchema>

const TRANSITION_CONFIG = {
  submit: {
    transition: PayrollDeclarationEvidenceTransition.SUBMIT,
    allowedFrom: [PayrollDeclarationStatus.PREPARED],
    nextStatus: PayrollDeclarationStatus.SUBMITTED,
    eventType: "payroll.declaration.submitted",
    auditAction: "PAYROLL_DECLARATION_SUBMITTED_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_SUBMITTED" as CloseSourceCode,
    staleReason: "Payroll declaration manual submission evidence changed certified close evidence.",
    requireMakerChecker: true,
    requireSubmittedPayloadHash: true,
    requireAuthorityReference: false,
  },
  accept: {
    transition: PayrollDeclarationEvidenceTransition.ACCEPT,
    allowedFrom: [PayrollDeclarationStatus.SUBMITTED],
    nextStatus: PayrollDeclarationStatus.ACCEPTED,
    eventType: "payroll.declaration.accepted",
    auditAction: "PAYROLL_DECLARATION_ACCEPTED_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_ACCEPTED" as CloseSourceCode,
    staleReason: "Payroll declaration authority acceptance evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: true,
  },
  reject: {
    transition: PayrollDeclarationEvidenceTransition.REJECT,
    allowedFrom: [PayrollDeclarationStatus.SUBMITTED],
    nextStatus: PayrollDeclarationStatus.REJECTED,
    eventType: "payroll.declaration.rejected",
    auditAction: "PAYROLL_DECLARATION_REJECTED_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_REJECTED" as CloseSourceCode,
    staleReason: "Payroll declaration authority rejection evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
  mark_payment_due: {
    transition: PayrollDeclarationEvidenceTransition.MARK_PAYMENT_DUE,
    allowedFrom: [PayrollDeclarationStatus.ACCEPTED],
    nextStatus: PayrollDeclarationStatus.PAYMENT_DUE,
    eventType: "payroll.declaration.payment_due",
    auditAction: "PAYROLL_DECLARATION_PAYMENT_DUE_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_PAYMENT_DUE" as CloseSourceCode,
    staleReason: "Payroll declaration payment due evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: true,
  },
  mark_paid: {
    transition: PayrollDeclarationEvidenceTransition.MARK_PAID,
    allowedFrom: [PayrollDeclarationStatus.PAYMENT_DUE],
    nextStatus: PayrollDeclarationStatus.PAID,
    eventType: "payroll.declaration.paid",
    auditAction: "PAYROLL_DECLARATION_PAID_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_PAID" as CloseSourceCode,
    staleReason: "Payroll declaration payment evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
  reconcile: {
    transition: PayrollDeclarationEvidenceTransition.RECONCILE,
    allowedFrom: [PayrollDeclarationStatus.PAID],
    nextStatus: PayrollDeclarationStatus.RECONCILED,
    eventType: "payroll.declaration.reconciled",
    auditAction: "PAYROLL_DECLARATION_RECONCILED_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_RECONCILED" as CloseSourceCode,
    staleReason: "Payroll declaration reconciliation evidence changed certified close evidence.",
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
  archive: {
    transition: PayrollDeclarationEvidenceTransition.ARCHIVE,
    allowedFrom: [PayrollDeclarationStatus.ACCEPTED, PayrollDeclarationStatus.RECONCILED],
    nextStatus: PayrollDeclarationStatus.ARCHIVED,
    eventType: "payroll.declaration.archived",
    auditAction: "PAYROLL_DECLARATION_ARCHIVED_EVIDENCE_RECORDED",
    sourceCode: null,
    staleReason: null,
    requireMakerChecker: false,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
  amend: {
    transition: PayrollDeclarationEvidenceTransition.AMEND,
    allowedFrom: [
      PayrollDeclarationStatus.SUBMITTED,
      PayrollDeclarationStatus.ACCEPTED,
      PayrollDeclarationStatus.REJECTED,
      PayrollDeclarationStatus.PAYMENT_DUE,
      PayrollDeclarationStatus.PAID,
      PayrollDeclarationStatus.RECONCILED,
      PayrollDeclarationStatus.ARCHIVED,
    ],
    nextStatus: null,
    eventType: "payroll.declaration.amended",
    auditAction: "PAYROLL_DECLARATION_AMENDMENT_EVIDENCE_RECORDED",
    sourceCode: "PAYROLL_DECLARATION_AMENDED" as CloseSourceCode,
    staleReason: "Payroll declaration amendment evidence changed certified close evidence.",
    requireMakerChecker: true,
    requireSubmittedPayloadHash: false,
    requireAuthorityReference: false,
  },
} satisfies Record<PayrollDeclarationLifecycleTransition, {
  transition: PayrollDeclarationEvidenceTransition
  allowedFrom: PayrollDeclarationStatus[]
  nextStatus: PayrollDeclarationStatus | null
  eventType: string
  auditAction: string
  sourceCode: CloseSourceCode | null
  staleReason: string | null
  requireMakerChecker: boolean
  requireSubmittedPayloadHash: boolean
  requireAuthorityReference: boolean
}>

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function"
}

async function inTransaction<T>(client: DbClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (hasTransaction(client)) return client.$transaction((tx) => work(tx))
  return work(client as Prisma.TransactionClient)
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function parseDate(value: Date | string | number | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return fallback
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

function assertManualOnly(authorityEnvironment: string) {
  const normalized = authorityEnvironment.trim().toUpperCase()
  const allowed = new Set(["MANUAL_PORTAL", "MANUAL_EVIDENCE", "AUTHORITY_PORTAL"])
  if (!allowed.has(normalized)) {
    throw new BusinessRuleError("Payroll declaration evidence can only be captured for a manual authority workflow until a reviewed production adapter exists.")
  }
}

function assertEvidenceRequirements(
  parsed: z.output<typeof recordPayrollDeclarationEvidenceInputSchema>,
  config: (typeof TRANSITION_CONFIG)[PayrollDeclarationLifecycleTransition],
) {
  if (config.requireSubmittedPayloadHash && !parsed.submittedPayloadHash) {
    throw new BusinessRuleError("Manual declaration submission evidence requires the submitted payload hash.")
  }
  if (config.requireAuthorityReference && !parsed.authorityReference) {
    throw new BusinessRuleError("Authority reference is required for this declaration transition.")
  }
  if (config.requireMakerChecker) {
    if (!parsed.approvedById) {
      throw new BusinessRuleError("This payroll declaration transition requires independent approval evidence.")
    }
    if (parsed.approvedById === parsed.actorId) {
      throw new BusinessRuleError("This payroll declaration transition requires a separate approver.")
    }
  }
  const hasEvidenceHash = Boolean(
    parsed.submittedPayloadHash ||
      parsed.authorityResponseHash ||
      parsed.portalReceiptHash ||
      parsed.supportingFileHash,
  )
  if (!hasEvidenceHash) {
    throw new BusinessRuleError("Payroll declaration lifecycle evidence requires at least one immutable evidence hash.")
  }
}

function assertAllowedTransition(
  currentStatus: PayrollDeclarationStatus,
  config: (typeof TRANSITION_CONFIG)[PayrollDeclarationLifecycleTransition],
) {
  const allowedFrom: readonly PayrollDeclarationStatus[] = config.allowedFrom
  if (!allowedFrom.includes(currentStatus)) {
    throw new BusinessRuleError(`Payroll declaration cannot transition from ${currentStatus} with this manual evidence action.`)
  }
}

function evidencePayload(input: {
  parsed: z.output<typeof recordPayrollDeclarationEvidenceInputSchema>
  declaration: {
    id: string
    payrollRunId: string
    authority: string
    declarationType: string
    status: PayrollDeclarationStatus
    amount: Prisma.Decimal
    currency: string
    payloadHash: string | null
    countryPackResolutionHash: string
  }
  nextStatus: PayrollDeclarationStatus
  transition: PayrollDeclarationEvidenceTransition
  capturedAt: Date
}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_DECLARATION_MANUAL_EVIDENCE",
    version: 1,
    declarationId: input.declaration.id,
    payrollRunId: input.declaration.payrollRunId,
    transition: input.transition,
    previousStatus: input.declaration.status,
    nextStatus: input.nextStatus,
    authority: input.declaration.authority,
    declarationType: input.declaration.declarationType,
    amount: input.declaration.amount.toFixed(2),
    currency: input.declaration.currency,
    declarationPayloadHash: input.declaration.payloadHash,
    countryPackResolutionHash: input.declaration.countryPackResolutionHash,
    authorityChannel: input.parsed.authorityChannel,
    authorityEnvironment: input.parsed.authorityEnvironment,
    authorityReference: input.parsed.authorityReference ?? null,
    authorityStatus: input.parsed.authorityStatus,
    submittedAt: input.parsed.submittedAt ? parseDate(input.parsed.submittedAt, input.capturedAt).toISOString() : null,
    submittedById: input.parsed.submittedById ?? null,
    approvedById: input.parsed.approvedById ?? null,
    evidenceCapturedById: input.parsed.actorId,
    submittedPayloadHash: input.parsed.submittedPayloadHash ?? null,
    authorityResponseHash: input.parsed.authorityResponseHash ?? null,
    portalReceiptHash: input.parsed.portalReceiptHash ?? null,
    supportingFileHash: input.parsed.supportingFileHash ?? null,
    sourceRegisterHash: input.parsed.sourceRegisterHash ?? null,
    automationCapabilityStatus: "AUTOMATION_BLOCKED",
    productionSubmissionSupported: false,
    capturedAt: input.capturedAt.toISOString(),
  }
}

export async function recordPayrollDeclarationEvidence(
  input: RecordPayrollDeclarationEvidenceInput,
  client: DbClient = db,
) {
  const parsed = recordPayrollDeclarationEvidenceInputSchema.parse(input)
  const config = TRANSITION_CONFIG[parsed.transition]
  assertManualOnly(parsed.authorityEnvironment)
  assertEvidenceRequirements(parsed, config)
  const now = parseDate(parsed.now, new Date())

  return inTransaction(client, async (tx) => {
    const declaration = await tx.payrollDeclaration.findFirst({
      where: {
        id: parsed.declarationId,
        organizationId: parsed.organizationId,
      },
      include: { payrollRun: { include: { payrollPeriod: true } } },
    })
    if (!declaration) throw new NotFoundError("Payroll declaration not found")

    const nextStatus = config.nextStatus ?? declaration.status
    assertAllowedTransition(declaration.status, config)

    const evidence = evidencePayload({
      parsed,
      declaration,
      nextStatus,
      transition: config.transition,
      capturedAt: now,
    })
    const evidenceHash = prefixedHash(evidence)

    const existingEvidence = await tx.payrollDeclarationEvidence.findFirst({
      where: {
        organizationId: parsed.organizationId,
        declarationId: declaration.id,
        transition: config.transition,
        idempotencyKey: parsed.idempotencyKey,
      },
    })
    if (existingEvidence) {
      if (existingEvidence.evidenceHash !== evidenceHash) {
        throw new ConflictError("Payroll declaration evidence idempotency key was reused with a different payload.")
      }
      return {
        declaration,
        evidence: existingEvidence,
        businessEventId: null,
        idempotent: true,
        automationCapabilityStatus: "AUTOMATION_BLOCKED" as const,
        productionSubmissionSupported: false,
      }
    }

    const controlDecision = evaluateSensitiveAction({
      action: "payroll.declaration.lifecycle",
      actorId: parsed.actorId,
      organizationId: parsed.organizationId,
      actorPermissions: parsed.actorPermissions,
      subjectActorId: config.requireMakerChecker ? parsed.approvedById ?? null : null,
      lastAuthAt: parsed.lastAuthAt,
      now,
      resourceType: "PayrollDeclaration",
      resourceId: declaration.id,
      amount: declaration.amount,
      currency: declaration.currency,
      metadata: {
        transition: parsed.transition,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        automationCapabilityStatus: "AUTOMATION_BLOCKED",
      },
    })
    await auditSensitiveActionDecision(tx, controlDecision)
    assertSensitiveActionAllowed(controlDecision)

    const createdEvidence = await tx.payrollDeclarationEvidence.create({
      data: {
        organizationId: parsed.organizationId,
        declarationId: declaration.id,
        transition: config.transition,
        previousStatus: declaration.status,
        nextStatus,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        authorityChannel: parsed.authorityChannel,
        authorityEnvironment: parsed.authorityEnvironment,
        authorityReference: parsed.authorityReference ?? null,
        authorityStatus: parsed.authorityStatus,
        submittedAt: parsed.submittedAt ? parseDate(parsed.submittedAt, now) : null,
        submittedById: parsed.submittedById ?? null,
        approvedById: parsed.approvedById ?? null,
        evidenceCapturedById: parsed.actorId,
        evidenceHash,
        submittedPayloadHash: parsed.submittedPayloadHash ?? null,
        authorityResponseHash: parsed.authorityResponseHash ?? null,
        portalReceiptHash: parsed.portalReceiptHash ?? null,
        supportingFileHash: parsed.supportingFileHash ?? null,
        sourceRegisterHash: parsed.sourceRegisterHash ?? null,
        countryPackResolutionHash: declaration.countryPackResolutionHash,
        automationCapabilityStatus: "AUTOMATION_BLOCKED",
        productionSubmissionSupported: false,
        notes: parsed.notes ?? null,
        idempotencyKey: parsed.idempotencyKey,
        metadata: safeJson({
          ...asRecord(parsed.metadata),
          evidence,
          manualAuthorityWorkflowOnly: true,
          productionAdapterBlockedReason: "EXPERT_REVIEWED_PRODUCTION_SUBMISSION_MAPPING_MISSING",
        }),
      },
    })

    const updatedDeclaration = config.nextStatus
      ? await tx.payrollDeclaration.update({
          where: { id: declaration.id },
          data: {
            status: config.nextStatus,
            metadata: safeJson({
              ...asRecord(declaration.metadata),
              latestManualEvidenceHash: evidenceHash,
              latestManualEvidenceId: createdEvidence.id,
              latestManualTransition: parsed.transition,
              latestManualTransitionAt: now.toISOString(),
              automationCapabilityStatus: "AUTOMATION_BLOCKED",
              productionSubmissionSupported: false,
            }),
          },
          include: { payrollRun: { include: { payrollPeriod: true } } },
        })
      : declaration

    const eventResult = await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
      organizationId: parsed.organizationId,
      eventType: config.eventType,
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: `payroll-declaration:${declaration.id}:${config.transition}:${parsed.idempotencyKey}`,
      payload: {
        declarationId: declaration.id,
        payrollRunId: declaration.payrollRunId,
        transition: config.transition,
        previousStatus: declaration.status,
        nextStatus,
        evidenceId: createdEvidence.id,
        evidenceHash,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        authorityChannel: parsed.authorityChannel,
        authorityEnvironment: parsed.authorityEnvironment,
        authorityStatus: parsed.authorityStatus,
        automationCapabilityStatus: "AUTOMATION_BLOCKED",
        productionSubmissionSupported: false,
      },
      occurredAt: now,
      actorId: parsed.actorId,
      sourceType: "PAYROLL_DECLARATION",
      sourceId: declaration.id,
      documentHash: evidenceHash,
      metadata: {
        manualAuthorityWorkflowOnly: true,
        productionAdapterBlockedReason: "EXPERT_REVIEWED_PRODUCTION_SUBMISSION_MAPPING_MISSING",
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: config.eventType.replace(/\./g, "_"),
          destination: "payroll",
          payload: {
            severity: parsed.transition === "reject" || parsed.transition === "amend" ? "warning" : "info",
            declarationId: declaration.id,
            payrollRunId: declaration.payrollRunId,
            transition: config.transition,
            nextStatus,
            automationCapabilityStatus: "AUTOMATION_BLOCKED",
          },
        },
      ],
    })
    await markBusinessEventAppliedInTx(tx as unknown as BusinessEventTx, parsed.organizationId, eventResult.event.id)

    if (config.sourceCode && config.staleReason) {
      await recordCloseCertificationInvalidationsForSourceInTx(
        tx,
        parsed.organizationId,
        {
          sourceCode: config.sourceCode,
          sourceId: declaration.id,
          periodStart: declaration.periodStart,
          periodEnd: declaration.periodEnd,
          staleReason: config.staleReason,
          newEvidenceHash: evidenceHash,
          correlationId: eventResult.event.id,
        },
        {
          actorId: parsed.actorId,
          now,
        },
      )
    }

    await tx.auditLog.create({
      data: {
        entityType: "PayrollDeclaration",
        entityId: declaration.id,
        action: config.auditAction,
        userId: parsed.actorId,
        organizationId: parsed.organizationId,
        changes: safeJson({
          before: { status: declaration.status },
          after: {
            status: nextStatus,
            evidenceId: createdEvidence.id,
            evidenceHash,
            businessEventId: eventResult.event.id,
            automationCapabilityStatus: "AUTOMATION_BLOCKED",
            productionSubmissionSupported: false,
          },
        }),
      },
    })

    return {
      declaration: updatedDeclaration,
      evidence: createdEvidence,
      businessEventId: eventResult.event.id,
      idempotent: false,
      automationCapabilityStatus: "AUTOMATION_BLOCKED" as const,
      productionSubmissionSupported: false,
    }
  })
}
