"use server"

import { z } from "zod"

import { err, ok } from "@/services/_shared/action-response"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { requireAnyPermission } from "@/lib/security/rbac"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  buildExportWatermark,
  evaluateExportSafety,
} from "@/services/security/export-safety.service"
import {
  cashPaymentHistoryFiltersSchema,
} from "@/services/pos/cash-payment-history.schemas"
import {
  readCashPaymentHistory,
  type CashPaymentHistoryResult,
} from "@/services/pos/cash-payment-history.service"
import { hashNormalizedHistoryFilters } from "@/services/history/transaction-history-cursor"

export type { CashPaymentHistoryResult }

const historyReadActionSchema = z.object({ filters: cashPaymentHistoryFiltersSchema.optional() }).strict()
const historyExportActionSchema = historyReadActionSchema.extend({
  rowCount: z.number().int().min(0).max(100_000).default(0),
})

const managerPermissions = [
  "finance.cash-drawer.read",
  "finance.read",
  "payments.reconciliation.read",
  "finance.payments.read",
]

function hasAny(permissions: readonly string[], candidates: readonly string[]) {
  return candidates.some((permission) => permissions.includes(permission) || permissions.includes("*"))
}

async function enforceCashPaymentModules(ctx: Awaited<ReturnType<typeof requireAnyPermission>>) {
  const cashDecision = await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "cash_drawer",
    surfaceType: "action",
    surface: "actions/pos/cash-payment-history.actions.ts:getCashPaymentHistoryAction",
    accessIntent: "read",
    mode: "enforce",
    audit: true,
  })
  if (!cashDecision.allowed) throw new BusinessRuleError("Cash drawer module is not available.")

  const paymentDecision = await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "payment_reconciliation",
    surfaceType: "action",
    surface: "actions/pos/cash-payment-history.actions.ts:getCashPaymentHistoryAction",
    accessIntent: "read",
    mode: "enforce",
    audit: true,
  })
  if (!paymentDecision.allowed) throw new BusinessRuleError("Payment reconciliation module is not available.")
}

export async function getCashPaymentHistoryAction(input: unknown = {}) {
  try {
    const parsed = historyReadActionSchema.parse(input)
    const ctx = await requireAnyPermission([...managerPermissions, "pos.read", "OPERATE_POS"], {
      resource: "CashPaymentHistory",
    })
    await enforceCashPaymentModules(ctx)
    const accessMode = hasAny(ctx.permissions, managerPermissions) ? "manager" : "own"
    const history = await readCashPaymentHistory({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      actorPermissions: ctx.permissions,
      accessMode,
      filters: parsed.filters,
    })
    return ok(history)
  } catch (error) {
    return err(error)
  }
}

export async function prepareCashPaymentHistoryExportAction(input: unknown = {}) {
  try {
    const parsed = historyExportActionSchema.parse(input)
    const ctx = await requireAnyPermission(["payments.export", "reports.export"], {
      resource: "CashPaymentHistoryExport",
    })
    await requireFreshAuth(300)
    await enforceCashPaymentModules(ctx)
    const filtersHash = hashNormalizedHistoryFilters(parsed.filters ?? {})
    const watermarkId = buildExportWatermark({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      scope: "cash-payment-history",
      filtersHash,
      rowCount: parsed.rowCount,
      fileType: "csv",
      sensitivity: "financial",
    })
    const decision = evaluateExportSafety({
      action: "payment.export",
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: Date.now(),
      resourceType: "CashPaymentHistoryExport",
      resourceId: "cash-payment-history",
      exportContext: {
        scope: "cash-payment-history",
        filtersHash,
        rowCount: parsed.rowCount,
        fileType: "csv",
        sensitivity: "financial",
        watermarkId,
      },
    })
    if (!decision.allowed) throw new BusinessRuleError(decision.safeMessage)
    return ok({ decision })
  } catch (error) {
    return err(error)
  }
}
