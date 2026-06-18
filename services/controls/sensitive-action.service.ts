import { Prisma } from "@prisma/client"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError } from "@/services/_shared/action-errors"

export type SensitiveActionRiskTier = "low" | "medium" | "high" | "critical"
export type AssuranceLevel = "L0" | "L1" | "L2" | "L3" | "L4"

export type SensitiveActionId =
  | "pos.sale.commit"
  | "pos.refund.process"
  | "pos.void.process"
  | "payment.provider-account.manage"
  | "payment.reconciliation.import"
  | "payment.reconciliation.run"
  | "payment.reconciliation.match"
  | "payment.reconciliation.override"
  | "payment.reconciliation.exception.assign"
  | "payment.reconciliation.exception.resolve"
  | "payment.reconciliation.suspense.propose"
  | "payment.reconciliation.suspense.post"
  | "payment.reconciliation.sign"
  | "payment.reconciliation.certificate.export"
  | "payment.export"
  | "supplier.bank-change.approve"
  | "supplier.payment.approve"
  | "supplier.payment.release"
  | "payroll.run.approve"
  | "payroll.payment.release"
  | "accounting.export"
  | "accounting.journal.post"
  | "accounting.journal.reverse"
  | "accounting.period.close"
  | "accounting.setup.lock"
  | "roles.permissions.assign"

export type SensitiveActionPolicy = {
  action: SensitiveActionId
  permission: string
  riskTier: SensitiveActionRiskTier
  requiredAssurance: AssuranceLevel
  freshAuthMaxAgeSeconds?: number
  blockSelfApproval?: boolean
  exportControl?: boolean
  auditAction: string
  detectorSignals: string[]
}

export const SENSITIVE_ACTION_POLICIES: Record<SensitiveActionId, SensitiveActionPolicy> = {
  "pos.sale.commit": {
    action: "pos.sale.commit",
    permission: "pos.use",
    riskTier: "high",
    requiredAssurance: "L0",
    auditAction: "POS_SALE_COMMIT_CONTROL",
    detectorSignals: ["provider_reference_missing", "duplicate_capture_attempt"],
  },
  "pos.refund.process": {
    action: "pos.refund.process",
    permission: "pos.transactions.refund",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "POS_REFUND_CONTROL",
    detectorSignals: ["refund_spike", "refund_after_hours", "refund_own_sale"],
  },
  "pos.void.process": {
    action: "pos.void.process",
    permission: "pos.transactions.void",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "POS_VOID_CONTROL",
    detectorSignals: ["void_frequency", "void_own_sale", "void_after_hours"],
  },
  "payment.provider-account.manage": {
    action: "payment.provider-account.manage",
    permission: "payments.provider-account.manage",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "PAYMENT_PROVIDER_ACCOUNT_MANAGE_CONTROL",
    detectorSignals: ["settlement_account_changed", "suspense_account_changed", "provider_mapping_changed"],
  },
  "payment.reconciliation.import": {
    action: "payment.reconciliation.import",
    permission: "payments.reconciliation.import",
    riskTier: "high",
    requiredAssurance: "L0",
    auditAction: "PAYMENT_RECONCILIATION_IMPORT_CONTROL",
    detectorSignals: ["duplicate_statement_file", "provider_signature_invalid", "replayed_provider_event"],
  },
  "payment.reconciliation.run": {
    action: "payment.reconciliation.run",
    permission: "payments.reconciliation.run",
    riskTier: "high",
    requiredAssurance: "L0",
    auditAction: "PAYMENT_RECONCILIATION_RUN_CONTROL",
    detectorSignals: ["unmatched_provider_line", "settlement_drift"],
  },
  "payment.reconciliation.match": {
    action: "payment.reconciliation.match",
    permission: "payments.reconciliation.match",
    riskTier: "high",
    requiredAssurance: "L0",
    auditAction: "PAYMENT_RECONCILIATION_MATCH_CONTROL",
    detectorSignals: ["low_confidence_match", "manual_match_cluster", "amount_match_tolerance_used"],
  },
  "payment.reconciliation.override": {
    action: "payment.reconciliation.override",
    permission: "payments.reconciliation.override",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "PAYMENT_RECONCILIATION_OVERRIDE_CONTROL",
    detectorSignals: ["manual_override", "override_after_signoff", "critical_exception_override"],
  },
  "payment.reconciliation.exception.assign": {
    action: "payment.reconciliation.exception.assign",
    permission: "payments.reconciliation.exception.assign",
    riskTier: "high",
    requiredAssurance: "L0",
    auditAction: "PAYMENT_RECONCILIATION_EXCEPTION_ASSIGN_CONTROL",
    detectorSignals: ["critical_exception_reassigned", "exception_sla_at_risk"],
  },
  "payment.reconciliation.exception.resolve": {
    action: "payment.reconciliation.exception.resolve",
    permission: "payments.reconciliation.exception.resolve",
    riskTier: "high",
    requiredAssurance: "L0",
    auditAction: "PAYMENT_RECONCILIATION_EXCEPTION_RESOLVE_CONTROL",
    detectorSignals: ["critical_exception_resolved", "resolution_without_evidence", "reopened_exception"],
  },
  "payment.reconciliation.suspense.propose": {
    action: "payment.reconciliation.suspense.propose",
    permission: "payments.reconciliation.suspense.propose",
    riskTier: "high",
    requiredAssurance: "L0",
    auditAction: "PAYMENT_RECONCILIATION_SUSPENSE_PROPOSE_CONTROL",
    detectorSignals: ["suspense_candidate_created", "aged_unmatched_amount", "suspense_threshold_exceeded"],
  },
  "payment.reconciliation.suspense.post": {
    action: "payment.reconciliation.suspense.post",
    permission: "payments.reconciliation.suspense.post",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "PAYMENT_RECONCILIATION_SUSPENSE_POST_CONTROL",
    detectorSignals: ["suspense_posting", "period_close_with_suspense", "high_value_suspense"],
  },
  "payment.reconciliation.sign": {
    action: "payment.reconciliation.sign",
    permission: "payments.reconciliation.sign",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "PAYMENT_RECONCILIATION_SIGN_CONTROL",
    detectorSignals: ["self_signoff_attempt", "critical_exception_open"],
  },
  "payment.reconciliation.certificate.export": {
    action: "payment.reconciliation.certificate.export",
    permission: "payments.reconciliation.certificate.export",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    exportControl: true,
    auditAction: "PAYMENT_RECONCILIATION_CERTIFICATE_EXPORT_CONTROL",
    detectorSignals: ["certificate_export", "mass_reconciliation_export", "after_hours_export"],
  },
  "payment.export": {
    action: "payment.export",
    permission: "payments.export",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    exportControl: true,
    auditAction: "PAYMENT_EXPORT_CONTROL",
    detectorSignals: ["mass_export", "after_hours_export", "repeated_failed_export"],
  },
  "supplier.bank-change.approve": {
    action: "supplier.bank-change.approve",
    permission: "purchasing.supplier.bank.approve",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "SUPPLIER_BANK_CHANGE_APPROVE_CONTROL",
    detectorSignals: ["supplier_bank_change_approval", "self_approval_attempt", "payment_after_bank_change"],
  },
  "supplier.payment.approve": {
    action: "supplier.payment.approve",
    permission: "purchasing.ap.payment.approve",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "SUPPLIER_PAYMENT_APPROVE_CONTROL",
    detectorSignals: ["supplier_payment_approval", "self_approval_attempt", "payment_threshold_review"],
  },
  "supplier.payment.release": {
    action: "supplier.payment.release",
    permission: "purchasing.ap.payment.release",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "SUPPLIER_PAYMENT_RELEASE_CONTROL",
    detectorSignals: ["supplier_payment_release", "payment_after_bank_change", "after_hours_disbursement"],
  },
  "payroll.run.approve": {
    action: "payroll.run.approve",
    permission: "payroll.runs.approve",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "PAYROLL_RUN_APPROVE_CONTROL",
    detectorSignals: ["payroll_run_approval", "self_approval_attempt", "ghost_employee_risk"],
  },
  "payroll.payment.release": {
    action: "payroll.payment.release",
    permission: "payroll.payments.release",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "PAYROLL_PAYMENT_RELEASE_CONTROL",
    detectorSignals: ["payroll_payment_release", "bank_file_divergence", "after_hours_disbursement"],
  },
  "accounting.export": {
    action: "accounting.export",
    permission: "accounting.exports.create",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    exportControl: true,
    auditAction: "ACCOUNTING_EXPORT_CONTROL",
    detectorSignals: ["statutory_export", "mass_export", "after_hours_export"],
  },
  "accounting.journal.post": {
    action: "accounting.journal.post",
    permission: "accounting.journal.post",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "JOURNAL_POST_CONTROL",
    detectorSignals: ["manual_journal_post", "round_amount_journal"],
  },
  "accounting.journal.reverse": {
    action: "accounting.journal.reverse",
    permission: "accounting.journal.reverse",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "JOURNAL_REVERSE_CONTROL",
    detectorSignals: ["post_finalization_reversal", "reversal_after_hours"],
  },
  "accounting.period.close": {
    action: "accounting.period.close",
    permission: "accounting.period.close",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "PERIOD_CLOSE_CONTROL",
    detectorSignals: ["close_with_suspense", "close_after_hours"],
  },
  "accounting.setup.lock": {
    action: "accounting.setup.lock",
    permission: "accounting.setup.manage",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "ACCOUNTING_SETUP_LOCK_CONTROL",
    detectorSignals: ["setup_lock_self_approval", "mapping_change_before_lock"],
  },
  "roles.permissions.assign": {
    action: "roles.permissions.assign",
    permission: "roles.permissions.assign",
    riskTier: "critical",
    requiredAssurance: "L1",
    freshAuthMaxAgeSeconds: 300,
    blockSelfApproval: true,
    auditAction: "ROLE_PERMISSION_ASSIGN_CONTROL",
    detectorSignals: ["privilege_escalation", "self_role_grant"],
  },
}

export type SensitiveActionEvaluationInput = {
  action: SensitiveActionId
  actorId?: string | null
  organizationId: string
  actorPermissions: readonly string[]
  resourceType?: string | null
  resourceId?: string | null
  subjectActorId?: string | null
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
  amount?: Prisma.Decimal | Prisma.Decimal.Value | null
  currency?: string | null
  exportContext?: {
    scope: string
    filtersHash: string
    rowCount: number
    fileType: string
    sensitivity: "operational" | "financial" | "personal" | "statutory"
    watermarkId: string
  } | null
  metadata?: Record<string, unknown>
}

export type SensitiveActionDecision =
  | {
      allowed: true
      reasonCode: "ALLOWED"
      policy: SensitiveActionPolicy
      detectorInputs: Prisma.JsonObject
      input: SensitiveActionEvaluationInput
    }
  | {
      allowed: false
      reasonCode: "MISSING_PERMISSION" | "SELF_APPROVAL_BLOCKED" | "FRESH_AUTH_REQUIRED"
      safeMessage: string
      policy: SensitiveActionPolicy
      detectorInputs: Prisma.JsonObject
      input: SensitiveActionEvaluationInput
    }

function toMillis(value: Date | number | string | null | undefined) {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

function cleanJson(input: Record<string, unknown>): Prisma.JsonObject {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Prisma.JsonObject
}

function buildDetectorInputs(input: SensitiveActionEvaluationInput, policy: SensitiveActionPolicy) {
  return cleanJson({
    action: input.action,
    riskTier: policy.riskTier,
    actorId: input.actorId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    subjectActorId: input.subjectActorId,
    amount: input.amount !== null && input.amount !== undefined ? new Prisma.Decimal(input.amount).toFixed(2) : undefined,
    currency: input.currency,
    exportContext: input.exportContext,
    detectorSignals: policy.detectorSignals,
    metadata: input.metadata,
  })
}

export function getSensitiveActionPolicy(action: SensitiveActionId) {
  return SENSITIVE_ACTION_POLICIES[action]
}

export function evaluateSensitiveAction(input: SensitiveActionEvaluationInput): SensitiveActionDecision {
  const policy = getSensitiveActionPolicy(input.action)
  const detectorInputs = buildDetectorInputs(input, policy)

  if (!hasRbacPermission(input.actorPermissions, policy.permission)) {
    return {
      allowed: false,
      reasonCode: "MISSING_PERMISSION",
      safeMessage: "You are not allowed to perform this action.",
      policy,
      detectorInputs,
      input,
    }
  }

  if (policy.blockSelfApproval && input.actorId && input.subjectActorId && input.subjectActorId === input.actorId) {
    return {
      allowed: false,
      reasonCode: "SELF_APPROVAL_BLOCKED",
      safeMessage: "This action requires independent approval.",
      policy,
      detectorInputs,
      input,
    }
  }

  if (policy.freshAuthMaxAgeSeconds) {
    const nowMs = toMillis(input.now) ?? Date.now()
    const lastAuthAtMs = toMillis(input.lastAuthAt)

    if (!lastAuthAtMs || nowMs - lastAuthAtMs > policy.freshAuthMaxAgeSeconds * 1000) {
      return {
        allowed: false,
        reasonCode: "FRESH_AUTH_REQUIRED",
        safeMessage: "Fresh authentication required.",
        policy,
        detectorInputs,
        input,
      }
    }
  }

  return {
    allowed: true,
    reasonCode: "ALLOWED",
    policy,
    detectorInputs,
    input,
  }
}

export async function auditSensitiveActionDecision(
  tx: Prisma.TransactionClient,
  decision: SensitiveActionDecision,
) {
  return tx.auditLog.create({
    data: {
      entityType: decision.input.resourceType || "SensitiveAction",
      entityId: decision.input.resourceId || decision.input.action,
      action: decision.allowed ? decision.policy.auditAction : `${decision.policy.auditAction}_DENIED`,
      organizationId: decision.input.organizationId,
      userId: decision.input.actorId || null,
      changes: cleanJson({
        action: decision.input.action,
        permission: decision.policy.permission,
        riskTier: decision.policy.riskTier,
        requiredAssurance: decision.policy.requiredAssurance,
        reasonCode: decision.reasonCode,
        allowed: decision.allowed,
        exportControl: decision.policy.exportControl,
        exportContext: decision.input.exportContext,
        detectorInputs: decision.detectorInputs,
      }),
    },
  })
}

export async function evaluateAndAuditSensitiveAction(
  tx: Prisma.TransactionClient,
  input: SensitiveActionEvaluationInput,
) {
  const decision = evaluateSensitiveAction(input)
  await auditSensitiveActionDecision(tx, decision)
  return decision
}

export function assertSensitiveActionAllowed(decision: SensitiveActionDecision) {
  if (decision.allowed) return decision

  if (decision.reasonCode === "FRESH_AUTH_REQUIRED") {
    throw new BusinessRuleError(decision.safeMessage, "FRESH_AUTH_REQUIRED")
  }

  throw new BusinessRuleError(decision.safeMessage)
}

export async function enforceSensitiveAction(
  tx: Prisma.TransactionClient,
  input: SensitiveActionEvaluationInput,
) {
  const decision = await evaluateAndAuditSensitiveAction(tx, input)
  return assertSensitiveActionAllowed(decision)
}
