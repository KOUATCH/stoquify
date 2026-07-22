"use server";

import { z } from "zod";

import { requireFreshAuth } from "@/lib/security/auth-session";
import { requireAnyPermission } from "@/lib/security/rbac";
import { err, ok } from "@/services/_shared/action-response";
import { BusinessRuleError } from "@/services/_shared/action-errors";
import { hashNormalizedHistoryFilters } from "@/services/history/transaction-history-cursor";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { apHistoryFiltersSchema } from "@/services/purchasing/ap-history.schemas";
import {
  readAPHistory,
  type APHistoryResult,
} from "@/services/purchasing/ap-history.service";
import {
  buildExportWatermark,
  evaluateExportSafety,
} from "@/services/security/export-safety.service";

export type { APHistoryResult };

const historyReadActionSchema = z
  .object({ filters: apHistoryFiltersSchema.optional() })
  .strict();
const historyExportActionSchema = historyReadActionSchema.extend({
  rowCount: z.number().int().min(0).max(100_000).default(0),
});

const apReadPermissions = [
  "purchasing.ap.invoice.view",
  "finance.payables.read",
  "purchases.suppliers.read",
];

async function enforceAPHistoryModule(
  ctx: Awaited<ReturnType<typeof requireAnyPermission>>,
) {
  const decision = await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "purchasing",
    surfaceType: "action",
    surface: "actions/purchasing/ap-history.actions.ts:getAPHistoryAction",
    accessIntent: "read",
    mode: "enforce",
    audit: true,
  });
  if (!decision.allowed)
    throw new BusinessRuleError("Purchasing module is not available.");
}

export async function getAPHistoryAction(input: unknown = {}) {
  try {
    const parsed = historyReadActionSchema.parse(input);
    const ctx = await requireAnyPermission(apReadPermissions, {
      resource: "APHistory",
    });
    await enforceAPHistoryModule(ctx);
    const history = await readAPHistory({
      organizationId: ctx.orgId,
      actorUserId: ctx.userId,
      actorPermissions: ctx.permissions,
      filters: parsed.filters,
    });
    return ok(history);
  } catch (error) {
    return err(error);
  }
}

export async function prepareAPHistoryExportAction(input: unknown = {}) {
  try {
    const parsed = historyExportActionSchema.parse(input);
    const ctx = await requireAnyPermission(
      ["finance.reports.export", "reports.export"],
      {
        resource: "APHistoryExport",
      },
    );
    await requireFreshAuth(300);
    await enforceAPHistoryModule(ctx);
    const filtersHash = hashNormalizedHistoryFilters(parsed.filters ?? {});
    const watermarkId = buildExportWatermark({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      scope: "supplier-ap-history",
      filtersHash,
      rowCount: parsed.rowCount,
      fileType: "csv",
      sensitivity: "financial",
    });
    const decision = evaluateExportSafety({
      action: "report.export",
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: Date.now(),
      resourceType: "APHistoryExport",
      resourceId: "supplier-ap-history",
      exportContext: {
        scope: "supplier-ap-history",
        filtersHash,
        rowCount: parsed.rowCount,
        fileType: "csv",
        sensitivity: "financial",
        watermarkId,
      },
    });
    if (!decision.allowed) throw new BusinessRuleError(decision.safeMessage);
    return ok({ decision });
  } catch (error) {
    return err(error);
  }
}
