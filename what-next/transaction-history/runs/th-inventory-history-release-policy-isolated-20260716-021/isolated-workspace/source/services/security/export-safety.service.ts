import "server-only"

import { createHash } from "node:crypto"

import type { Prisma } from "@prisma/client"

import {
  evaluateSensitiveAction,
  getSensitiveActionPolicy,
  type SensitiveActionDecision,
  type SensitiveActionEvaluationInput,
  type SensitiveActionId,
} from "@/services/controls/sensitive-action.service"

export type ExportSensitivity = "operational" | "financial" | "personal" | "statutory"

export type ExportSafetyInput = Omit<SensitiveActionEvaluationInput, "action" | "exportContext"> & {
  action: SensitiveActionId
  exportContext: {
    scope: string
    filtersHash: string
    rowCount: number
    fileType: string
    sensitivity: ExportSensitivity
    watermarkId?: string | null
  }
}

export type ExportSafetyReasonCode =
  | "ALLOWED"
  | "NOT_EXPORT_CONTROL"
  | "WATERMARK_REQUIRED"
  | SensitiveActionDecision["reasonCode"]

export type ExportSafetyDecision = {
  allowed: boolean
  reasonCode: ExportSafetyReasonCode
  safeMessage: string
  action: SensitiveActionId
  organizationId: string
  actorId: string | null
  resourceType: string
  resourceId: string
  exportContext: Required<ExportSafetyInput["exportContext"]>
  sensitiveActionDecision?: SensitiveActionDecision
}

export function buildExportWatermark(input: {
  organizationId: string
  actorId?: string | null
  scope: string
  filtersHash: string
  rowCount: number
  fileType: string
  sensitivity: ExportSensitivity
  issuedAt?: Date | string | number | null
}) {
  const issuedAt = normalizeIssuedAt(input.issuedAt).toISOString()
  const digest = createHash("sha256")
    .update(
      [
        input.organizationId,
        input.actorId ?? "system",
        input.scope,
        input.filtersHash,
        String(input.rowCount),
        input.fileType,
        input.sensitivity,
        issuedAt,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 24)

  return `wm_${digest}`
}

export function evaluateExportSafety(input: ExportSafetyInput): ExportSafetyDecision {
  const policy = getSensitiveActionPolicy(input.action)
  const suppliedWatermark = input.exportContext.watermarkId?.trim() ?? ""
  const exportContext = {
    ...input.exportContext,
    watermarkId: suppliedWatermark || buildExportWatermark({ ...input.exportContext, organizationId: input.organizationId, actorId: input.actorId }),
  }

  if (!policy.exportControl) {
    return {
      allowed: false,
      reasonCode: "NOT_EXPORT_CONTROL",
      safeMessage: "This action is not registered as a controlled export.",
      action: input.action,
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      resourceType: input.resourceType ?? "ExportSafety",
      resourceId: input.resourceId ?? input.action,
      exportContext,
    }
  }

  const sensitiveDecision = evaluateSensitiveAction({
    ...input,
    exportContext,
  })

  if (!sensitiveDecision.allowed) {
    return {
      allowed: false,
      reasonCode: sensitiveDecision.reasonCode,
      safeMessage: sensitiveDecision.safeMessage,
      action: input.action,
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      resourceType: input.resourceType ?? "ExportSafety",
      resourceId: input.resourceId ?? input.action,
      exportContext,
      sensitiveActionDecision: sensitiveDecision,
    }
  }

  if (!suppliedWatermark) {
    return {
      allowed: false,
      reasonCode: "WATERMARK_REQUIRED",
      safeMessage: "Controlled exports must include a durable watermark before release.",
      action: input.action,
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      resourceType: input.resourceType ?? "ExportSafety",
      resourceId: input.resourceId ?? input.action,
      exportContext,
      sensitiveActionDecision: sensitiveDecision,
    }
  }

  return {
    allowed: true,
    reasonCode: "ALLOWED",
    safeMessage: "Controlled export allowed.",
    action: input.action,
    organizationId: input.organizationId,
    actorId: input.actorId ?? null,
    resourceType: input.resourceType ?? "ExportSafety",
    resourceId: input.resourceId ?? input.action,
    exportContext,
    sensitiveActionDecision: sensitiveDecision,
  }
}

export async function auditExportSafetyDecision(
  tx: Prisma.TransactionClient,
  decision: ExportSafetyDecision,
) {
  return tx.auditLog.create({
    data: {
      entityType: decision.resourceType,
      entityId: decision.resourceId,
      action: decision.allowed ? "CONTROLLED_EXPORT_ALLOWED" : "CONTROLLED_EXPORT_DENIED",
      organizationId: decision.organizationId,
      userId: decision.actorId,
      changes: {
        action: decision.action,
        allowed: decision.allowed,
        reasonCode: decision.reasonCode,
        exportContext: decision.exportContext,
        sensitiveActionReasonCode: decision.sensitiveActionDecision?.reasonCode ?? null,
      } satisfies Prisma.InputJsonObject,
    },
  })
}

function normalizeIssuedAt(value: Date | string | number | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}
