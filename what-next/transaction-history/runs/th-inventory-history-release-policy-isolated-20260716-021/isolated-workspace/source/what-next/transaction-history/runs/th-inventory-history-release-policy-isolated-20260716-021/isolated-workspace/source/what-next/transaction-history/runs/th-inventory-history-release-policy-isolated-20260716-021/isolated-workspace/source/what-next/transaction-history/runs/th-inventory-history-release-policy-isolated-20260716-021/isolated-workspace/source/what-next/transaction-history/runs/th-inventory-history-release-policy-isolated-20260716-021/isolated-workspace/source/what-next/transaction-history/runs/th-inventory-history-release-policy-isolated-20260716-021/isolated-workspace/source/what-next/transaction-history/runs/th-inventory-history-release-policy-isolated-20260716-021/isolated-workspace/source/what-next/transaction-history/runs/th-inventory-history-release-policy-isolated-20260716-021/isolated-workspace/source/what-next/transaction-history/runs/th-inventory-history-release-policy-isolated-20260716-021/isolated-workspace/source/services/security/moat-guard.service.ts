import "server-only"

import type { Prisma } from "@prisma/client"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import {
  evaluateSensitiveAction,
  type SensitiveActionDecision,
  type SensitiveActionId,
} from "@/services/controls/sensitive-action.service"
import {
  type CommercialModuleSlug,
  type ModuleAccessIntent,
  type ModuleEntitlementDecision,
  type ModuleSurfaceType,
  type TenantModuleEntitlement,
} from "@/services/modules/module-control-contracts"
import { evaluateModuleEntitlement } from "@/services/modules/module-entitlement.service"
import {
  evaluateExportSafety,
  type ExportSafetyDecision,
  type ExportSafetyInput,
} from "./export-safety.service"
import {
  evaluateRedaction,
  type RedactionDecision,
  type RedactionEvaluationInput,
} from "./redaction-policy.service"

export type MoatGuardAction =
  | "allow"
  | "observe"
  | "deny"
  | "require_entitlement"
  | "require_permission"
  | "require_fresh_auth"
  | "require_maker_checker"
  | "require_consent"
  | "require_watermark"
  | "redact"
  | "mask"

export type MoatGuardResult = "allow" | "observe" | "redacted" | "deny"

export type MoatGuardConsent = {
  granted: boolean
  scope: string
  consentId?: string | null
  revokedAt?: Date | string | null
}

export type MoatGuardRedactionRequest = Omit<
  RedactionEvaluationInput,
  "actorPermissions" | "moduleDecision" | "hasFreshAuth" | "consentGranted"
>

export type MoatGuardInput = {
  organizationId: string
  userId?: string | null
  actorPermissions: readonly string[]
  moduleSlug?: CommercialModuleSlug | null
  requestedModules?: readonly string[] | null
  explicitEntitlements?: readonly TenantModuleEntitlement[] | null
  moduleMode?: ModuleEntitlementDecision["mode"]
  surfaceType: ModuleSurfaceType
  surface: string
  accessIntent?: ModuleAccessIntent
  requiredPermission?: string | null
  sensitiveAction?: SensitiveActionId | null
  resourceType?: string | null
  resourceId?: string | null
  subjectActorId?: string | null
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
  requiresConsent?: boolean
  consent?: MoatGuardConsent | null
  exportRequest?: Omit<ExportSafetyInput, "organizationId" | "actorId" | "actorPermissions" | "lastAuthAt" | "now"> | null
  redactionRequests?: readonly MoatGuardRedactionRequest[] | null
}

export type MoatGuardDecision = {
  organizationId: string
  userId: string | null
  surfaceType: ModuleSurfaceType
  surface: string
  result: MoatGuardResult
  allowed: boolean
  actions: MoatGuardAction[]
  safeMessage: string
  moduleDecision: ModuleEntitlementDecision | null
  sensitiveActionDecision: SensitiveActionDecision | null
  exportDecision: ExportSafetyDecision | null
  redactionDecisions: RedactionDecision[]
  rbacWildcardPresent: boolean
  rbacWildcardBypassedEntitlement: false
  consent: {
    required: boolean
    granted: boolean
    scope: string | null
    consentId: string | null
    revoked: boolean
  }
}

export function evaluateMoatGuard(input: MoatGuardInput): MoatGuardDecision {
  const actions = new Set<MoatGuardAction>()
  const hasFreshAuth = hasRecentAuth(input.lastAuthAt, input.now)
  const consentState = normalizeConsent(input.requiresConsent, input.consent)
  let allowed = true
  let moduleDecision: ModuleEntitlementDecision | null = null
  let sensitiveActionDecision: SensitiveActionDecision | null = null
  let exportDecision: ExportSafetyDecision | null = null

  if (input.moduleSlug) {
    moduleDecision = evaluateModuleEntitlement({
      organizationId: input.organizationId,
      userId: input.userId,
      moduleSlug: input.moduleSlug,
      requestedModules: input.requestedModules,
      explicitEntitlements: input.explicitEntitlements,
      surfaceType: input.surfaceType,
      surface: input.surface,
      accessIntent: input.accessIntent,
      actorPermissions: input.actorPermissions,
      mode: input.moduleMode,
      now: typeof input.now === "number" ? new Date(input.now) : input.now,
    })

    if (moduleDecision.wouldBlock) {
      actions.add("require_entitlement")
      if (!moduleDecision.allowed) allowed = false
      else actions.add("observe")
    }
  }

  if (input.requiredPermission && !hasRbacPermission(input.actorPermissions, input.requiredPermission)) {
    allowed = false
    actions.add("require_permission")
  }

  if (consentState.required && (!consentState.granted || consentState.revoked)) {
    allowed = false
    actions.add("require_consent")
  }

  if (input.sensitiveAction) {
    sensitiveActionDecision = evaluateSensitiveAction({
      action: input.sensitiveAction,
      actorId: input.userId,
      organizationId: input.organizationId,
      actorPermissions: input.actorPermissions,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      subjectActorId: input.subjectActorId,
      lastAuthAt: input.lastAuthAt,
      now: input.now,
    })

    if (!sensitiveActionDecision.allowed) {
      allowed = false
      if (sensitiveActionDecision.reasonCode === "MISSING_PERMISSION") actions.add("require_permission")
      if (sensitiveActionDecision.reasonCode === "FRESH_AUTH_REQUIRED") actions.add("require_fresh_auth")
      if (sensitiveActionDecision.reasonCode === "SELF_APPROVAL_BLOCKED") actions.add("require_maker_checker")
    }
  }

  if (input.exportRequest) {
    exportDecision = evaluateExportSafety({
      ...input.exportRequest,
      organizationId: input.organizationId,
      actorId: input.userId,
      actorPermissions: input.actorPermissions,
      lastAuthAt: input.lastAuthAt,
      now: input.now,
    })

    if (!exportDecision.allowed) {
      allowed = false
      if (exportDecision.reasonCode === "WATERMARK_REQUIRED") actions.add("require_watermark")
      if (exportDecision.reasonCode === "FRESH_AUTH_REQUIRED") actions.add("require_fresh_auth")
      if (exportDecision.reasonCode === "MISSING_PERMISSION") actions.add("require_permission")
      if (exportDecision.reasonCode === "SELF_APPROVAL_BLOCKED") actions.add("require_maker_checker")
    }
  }

  const redactionDecisions = (input.redactionRequests ?? []).map((request) =>
    evaluateRedaction({
      ...request,
      actorPermissions: input.actorPermissions,
      moduleDecision,
      hasFreshAuth,
      consentGranted: consentState.granted && !consentState.revoked,
    }),
  )

  for (const decision of redactionDecisions) {
    if (decision.allowed) continue
    actions.add(decision.mode)
  }

  if (actions.size === 0) actions.add(allowed ? "allow" : "deny")
  const result = resolveResult(allowed, actions)

  return {
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    surfaceType: input.surfaceType,
    surface: input.surface,
    result,
    allowed,
    actions: Array.from(actions),
    safeMessage: safeMessage(result),
    moduleDecision,
    sensitiveActionDecision,
    exportDecision,
    redactionDecisions,
    rbacWildcardPresent: input.actorPermissions.includes("*"),
    rbacWildcardBypassedEntitlement: false,
    consent: consentState,
  }
}

export async function auditMoatGuardDecision(
  tx: Prisma.TransactionClient,
  decision: MoatGuardDecision,
) {
  return tx.auditLog.create({
    data: {
      entityType: "MoatSecurityGuardDecision",
      entityId: `${decision.surfaceType}:${decision.surface}`,
      action: decision.allowed ? "MOAT_SECURITY_GUARD_ALLOWED" : "MOAT_SECURITY_GUARD_DENIED",
      organizationId: decision.organizationId,
      userId: decision.userId,
      changes: {
        result: decision.result,
        allowed: decision.allowed,
        actions: decision.actions,
        moduleSlug: decision.moduleDecision?.moduleSlug ?? null,
        moduleResult: decision.moduleDecision?.result ?? null,
        moduleWouldBlock: decision.moduleDecision?.wouldBlock ?? null,
        sensitiveAction: decision.sensitiveActionDecision?.input.action ?? null,
        sensitiveActionReasonCode: decision.sensitiveActionDecision?.reasonCode ?? null,
        exportReasonCode: decision.exportDecision?.reasonCode ?? null,
        redactions: decision.redactionDecisions
          .filter((item) => !item.allowed)
          .map((item) => ({
            field: item.field,
            category: item.category,
            mode: item.mode,
            reasonCode: item.reasonCode,
            policy: item.policy,
          })),
        rbacWildcardPresent: decision.rbacWildcardPresent,
        rbacWildcardBypassedEntitlement: decision.rbacWildcardBypassedEntitlement,
        consent: decision.consent,
      } satisfies Prisma.InputJsonObject,
    },
  })
}

function normalizeConsent(required: boolean | undefined, consent: MoatGuardConsent | null | undefined) {
  const revoked = Boolean(consent?.revokedAt)
  return {
    required: Boolean(required),
    granted: Boolean(consent?.granted),
    scope: consent?.scope ?? null,
    consentId: consent?.consentId ?? null,
    revoked,
  }
}

function hasRecentAuth(lastAuthAt: MoatGuardInput["lastAuthAt"], now: MoatGuardInput["now"]) {
  const lastAuthMs = toMillis(lastAuthAt)
  if (!lastAuthMs) return false
  const nowMs = toMillis(now) ?? Date.now()
  return nowMs - lastAuthMs <= 300_000
}

function toMillis(value: Date | number | string | null | undefined) {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

function resolveResult(allowed: boolean, actions: Set<MoatGuardAction>): MoatGuardResult {
  if (!allowed) return "deny"
  if (actions.has("redact") || actions.has("mask")) return "redacted"
  if (actions.has("observe")) return "observe"
  return "allow"
}

function safeMessage(result: MoatGuardResult) {
  if (result === "deny") return "Access denied by Kontava security guard."
  if (result === "redacted") return "Access allowed with protected fields redacted."
  if (result === "observe") return "Access allowed in observe mode with entitlement warnings."
  return "Access allowed."
}
