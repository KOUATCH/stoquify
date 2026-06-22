import "server-only"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"

export type SensitiveFieldCategory =
  | "payroll_person_amount"
  | "supplier_bank_detail"
  | "payment_provider_reference"
  | "reconciliation_suspense_detail"
  | "fiscal_authority_payload"
  | "compliance_submission_payload"
  | "audit_security_context"
  | "close_certification_evidence"
  | "partner_data"
  | "export_data"
  | "proof_hidden_identifier"

export type RedactionMode = "allow" | "mask" | "redact"
export type RedactionReasonCode =
  | "ALLOWED"
  | "MISSING_PERMISSION"
  | "MODULE_NOT_ENTITLED"
  | "FRESH_AUTH_REQUIRED"
  | "CONSENT_REQUIRED"

export type RedactionPolicy = {
  category: SensitiveFieldCategory
  policy: string
  label: string
  requiredPermissions: string[]
  moduleSlug?: ModuleEntitlementDecision["moduleSlug"]
  requireFreshAuth?: boolean
  requireConsent?: boolean
  deniedMode: Exclude<RedactionMode, "allow">
  replacement: string
  auditSensitive: boolean
}

export type RedactionEvaluationInput = {
  field: string
  category: SensitiveFieldCategory
  actorPermissions: readonly string[]
  moduleDecision?: ModuleEntitlementDecision | null
  hasFreshAuth?: boolean
  consentGranted?: boolean
}

export type RedactionDecision = {
  field: string
  category: SensitiveFieldCategory
  mode: RedactionMode
  allowed: boolean
  reasonCode: RedactionReasonCode
  policy: string
  requiredPermissions: string[]
  moduleSlug?: ModuleEntitlementDecision["moduleSlug"]
  safeMessage: string
  replacement: string
  auditSensitive: boolean
}

export type AppliedRedaction = {
  field: string
  category: SensitiveFieldCategory
  mode: Exclude<RedactionMode, "allow">
  reasonCode: Exclude<RedactionReasonCode, "ALLOWED">
  policy: string
}

export const REDACTION_POLICIES: Record<SensitiveFieldCategory, RedactionPolicy> = {
  payroll_person_amount: {
    category: "payroll_person_amount",
    policy: "kontava-payroll-person-redaction-policy",
    label: "Payroll person-level amount",
    requiredPermissions: ["payroll.payslips.read", "EMPLOYEE_SALARY_READ"],
    moduleSlug: "payroll",
    deniedMode: "redact",
    replacement: "[REDACTED:PAYROLL]",
    auditSensitive: true,
  },
  supplier_bank_detail: {
    category: "supplier_bank_detail",
    policy: "kontava-supplier-bank-redaction-policy",
    label: "Supplier bank detail",
    requiredPermissions: ["purchasing.supplier.bank.approve", "MANAGE_FINANCIAL_CONTROLS"],
    moduleSlug: "purchasing",
    requireFreshAuth: true,
    deniedMode: "redact",
    replacement: "[REDACTED:BANK]",
    auditSensitive: true,
  },
  payment_provider_reference: {
    category: "payment_provider_reference",
    policy: "kontava-payment-provider-reference-mask-policy",
    label: "Payment provider reference",
    requiredPermissions: ["payments.reconciliation.read", "payments.reconciliation.match"],
    moduleSlug: "payment_reconciliation",
    deniedMode: "mask",
    replacement: "[MASKED:PAYMENT]",
    auditSensitive: true,
  },
  reconciliation_suspense_detail: {
    category: "reconciliation_suspense_detail",
    policy: "kontava-reconciliation-suspense-redaction-policy",
    label: "Reconciliation suspense detail",
    requiredPermissions: [
      "payments.reconciliation.exception.resolve",
      "payments.reconciliation.suspense.post",
    ],
    moduleSlug: "payment_reconciliation",
    deniedMode: "redact",
    replacement: "[REDACTED:SUSPENSE]",
    auditSensitive: true,
  },
  fiscal_authority_payload: {
    category: "fiscal_authority_payload",
    policy: "kontava-fiscal-authority-payload-redaction-policy",
    label: "Fiscal authority payload",
    requiredPermissions: ["compliance.documents.read", "compliance.metadata.read"],
    moduleSlug: "compliance",
    deniedMode: "redact",
    replacement: "[REDACTED:FISCAL]",
    auditSensitive: true,
  },
  compliance_submission_payload: {
    category: "compliance_submission_payload",
    policy: "kontava-compliance-submission-payload-redaction-policy",
    label: "Compliance submission payload",
    requiredPermissions: ["compliance.documents.read", "compliance.metadata.read"],
    moduleSlug: "compliance",
    deniedMode: "redact",
    replacement: "[REDACTED:COMPLIANCE]",
    auditSensitive: true,
  },
  audit_security_context: {
    category: "audit_security_context",
    policy: "kontava-audit-security-context-redaction-policy",
    label: "Audit security context",
    requiredPermissions: ["reports.audit.view", "controls.audit.read"],
    moduleSlug: "reports",
    deniedMode: "redact",
    replacement: "[REDACTED:AUDIT_CONTEXT]",
    auditSensitive: true,
  },
  close_certification_evidence: {
    category: "close_certification_evidence",
    policy: "kontava-close-certification-summary-policy",
    label: "Close certification evidence",
    requiredPermissions: ["accounting.close.read", "accounting.exports.create"],
    moduleSlug: "close_assurance",
    deniedMode: "mask",
    replacement: "[MASKED:CLOSE]",
    auditSensitive: true,
  },
  partner_data: {
    category: "partner_data",
    policy: "kontava-partner-consent-redaction-policy",
    label: "Partner shared data",
    requiredPermissions: ["data.export", "reports.export"],
    requireConsent: true,
    deniedMode: "redact",
    replacement: "[REDACTED:PARTNER]",
    auditSensitive: true,
  },
  export_data: {
    category: "export_data",
    policy: "kontava-sensitive-export-redaction-policy",
    label: "Sensitive export data",
    requiredPermissions: ["data.export", "accounting.exports.create", "reports.export"],
    deniedMode: "redact",
    replacement: "[REDACTED:EXPORT]",
    auditSensitive: true,
  },
  proof_hidden_identifier: {
    category: "proof_hidden_identifier",
    policy: "kontava-proof-hidden-identifier-policy",
    label: "Proof-trail hidden identifier",
    requiredPermissions: ["accounting.journal.read", "payments.reconciliation.read", "accounting.close.read"],
    deniedMode: "redact",
    replacement: "[REDACTED:IDENTIFIER]",
    auditSensitive: true,
  },
}

export function getRedactionPolicy(category: SensitiveFieldCategory) {
  return REDACTION_POLICIES[category]
}

export function evaluateRedaction(input: RedactionEvaluationInput): RedactionDecision {
  const policy = getRedactionPolicy(input.category)

  const denied = (reasonCode: Exclude<RedactionReasonCode, "ALLOWED">): RedactionDecision => ({
    field: input.field,
    category: input.category,
    mode: policy.deniedMode,
    allowed: false,
    reasonCode,
    policy: policy.policy,
    requiredPermissions: policy.requiredPermissions,
    moduleSlug: policy.moduleSlug,
    safeMessage: `${policy.label} is protected and has been ${policy.deniedMode === "mask" ? "masked" : "redacted"}.`,
    replacement: policy.replacement,
    auditSensitive: policy.auditSensitive,
  })

  if (policy.moduleSlug && input.moduleDecision?.moduleSlug === policy.moduleSlug && input.moduleDecision.wouldBlock) {
    return denied("MODULE_NOT_ENTITLED")
  }

  if (policy.requireConsent && !input.consentGranted) {
    return denied("CONSENT_REQUIRED")
  }

  if (policy.requiredPermissions.length > 0 && !hasAnyRbacPermission(input.actorPermissions, policy.requiredPermissions)) {
    return denied("MISSING_PERMISSION")
  }

  if (policy.requireFreshAuth && !input.hasFreshAuth) {
    return denied("FRESH_AUTH_REQUIRED")
  }

  return {
    field: input.field,
    category: input.category,
    mode: "allow",
    allowed: true,
    reasonCode: "ALLOWED",
    policy: policy.policy,
    requiredPermissions: policy.requiredPermissions,
    moduleSlug: policy.moduleSlug,
    safeMessage: `${policy.label} access allowed.`,
    replacement: policy.replacement,
    auditSensitive: policy.auditSensitive,
  }
}

export function maskSensitiveValue(value: unknown, visibleLast = 4) {
  const text = value === null || value === undefined ? "" : String(value)
  if (!text) return "[MASKED]"
  if (text.length <= visibleLast) return `[MASKED:${"*".repeat(text.length)}]`
  return `${"*".repeat(Math.max(4, text.length - visibleLast))}${text.slice(-visibleLast)}`
}

export function applyFieldRedactions<T extends Record<string, unknown>>(
  record: T,
  decisions: readonly RedactionDecision[],
): { data: T; redactions: AppliedRedaction[] } {
  const data = clonePlainRecord(record)
  const redactions: AppliedRedaction[] = []

  for (const decision of decisions) {
    if (decision.allowed) continue

    const deniedMode = decision.mode === "allow" ? "redact" : decision.mode
    const deniedReasonCode = decision.reasonCode === "ALLOWED" ? "MISSING_PERMISSION" : decision.reasonCode
    const currentValue = getPathValue(data, decision.field)
    setPathValue(
      data,
      decision.field,
      deniedMode === "mask" ? maskSensitiveValue(currentValue) : decision.replacement,
    )
    redactions.push({
      field: decision.field,
      category: decision.category,
      mode: deniedMode,
      reasonCode: deniedReasonCode,
      policy: decision.policy,
    })
  }

  return { data: data as T, redactions }
}

function clonePlainRecord<T extends Record<string, unknown>>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T
}

function getPathValue(target: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined
    return (current as Record<string, unknown>)[segment]
  }, target)
}

function setPathValue(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".").filter(Boolean)
  if (parts.length === 0) return

  let cursor = target
  for (const segment of parts.slice(0, -1)) {
    const next = cursor[segment]
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as Record<string, unknown>
  }
  cursor[parts[parts.length - 1]] = value
}
