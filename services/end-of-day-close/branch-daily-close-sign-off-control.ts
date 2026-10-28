import "server-only"

import {
  evaluateSensitiveAction,
  getSensitiveActionPolicy,
  type SensitiveActionEvaluationInput,
} from "@/services/controls/sensitive-action.service"
import type { ModuleEntitlementEvaluationInput } from "@/services/modules/module-control-contracts"
import { evaluateModuleEntitlement } from "@/services/modules/module-entitlement.service"

const BRANCH_DAILY_CLOSE_SIGN_OFF_ACTION = "branch.daily-close.sign" as const
const sensitiveActionPolicy = getSensitiveActionPolicy(BRANCH_DAILY_CLOSE_SIGN_OFF_ACTION)

export const BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL = {
  ...sensitiveActionPolicy,
  moduleSlug: "dashboard",
  accessIntent: "write",
  surfaceType: "action",
  surface: BRANCH_DAILY_CLOSE_SIGN_OFF_ACTION,
  moduleControlMode: "enforce",
} as const

export type BranchDailyCloseSignOffControl = typeof BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL

export type BranchDailyCloseSignOffControlEvaluationInput = Omit<
  SensitiveActionEvaluationInput,
  "action"
> & Pick<ModuleEntitlementEvaluationInput, "requestedModules" | "explicitEntitlements">

export function evaluateBranchDailyCloseSignOffControl(
  input: BranchDailyCloseSignOffControlEvaluationInput,
) {
  const { requestedModules, explicitEntitlements, ...sensitiveActionInput } = input
  const sensitiveAction = evaluateSensitiveAction({
    ...sensitiveActionInput,
    action: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.action,
  })
  const moduleEntitlement = evaluateModuleEntitlement({
    organizationId: input.organizationId,
    userId: input.actorId,
    moduleSlug: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.moduleSlug,
    requestedModules,
    explicitEntitlements,
    surfaceType: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.surfaceType,
    surface: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.surface,
    accessIntent: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.accessIntent,
    actorPermissions: input.actorPermissions,
    mode: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.moduleControlMode,
    now: typeof input.now === "number" ? new Date(input.now) : input.now,
  })

  return {
    allowed: sensitiveAction.allowed && moduleEntitlement.allowed,
    sensitiveAction,
    moduleEntitlement,
  }
}
