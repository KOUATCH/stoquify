"use server"

import { z } from "zod"

import { BusinessRuleError } from "@/services/_shared/action-errors"
import { protect } from "@/services/_shared/protect"
import {
  getModuleControlCenterData,
  observeModuleAccess,
} from "@/services/modules/module-entitlement.service"
import {
  isCommercialModuleSlug,
  type ModuleControlCenterData,
  type ModuleEntitlementDecision,
  type ModuleSurfaceType,
} from "@/services/modules/module-control-contracts"

export type { ModuleControlCenterData, ModuleEntitlementDecision }

const observeInputSchema = z.object({
  moduleSlug: z.string().min(1),
  surfaceType: z.enum(["navigation", "page", "action", "api", "report", "export", "job"]),
  surface: z.string().trim().min(1),
  accessIntent: z.enum(["read", "write", "export", "job"]).optional(),
})

const getControlCenter = protect<unknown, ModuleControlCenterData>(
  { permission: "MANAGE_SYSTEM_SETTINGS", auditResource: "ModuleControlCenter", auditAllowed: true },
  async (_input, ctx) =>
    getModuleControlCenterData({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    }),
)

const observeAccess = protect<unknown, ModuleEntitlementDecision>(
  { permission: "dashboard.read", auditResource: "ModuleEntitlementObserve", auditAllowed: true },
  async (input, ctx) => {
    const parsed = observeInputSchema.parse(input && typeof input === "object" ? input : {})
    if (!isCommercialModuleSlug(parsed.moduleSlug)) {
      throw new BusinessRuleError("Unsupported module slug")
    }

    return observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: parsed.moduleSlug,
      surfaceType: parsed.surfaceType as ModuleSurfaceType,
      surface: parsed.surface,
      accessIntent: parsed.accessIntent,
    })
  },
)

export async function getModuleControlCenterAction(input: unknown = {}) {
  return getControlCenter(input)
}

export async function observeModuleAccessAction(input: unknown) {
  return observeAccess(input)
}
