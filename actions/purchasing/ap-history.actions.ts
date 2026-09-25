"use server";

import { z } from "zod";

import { requireFreshAuth } from "@/lib/security/auth-session";
import { requireAnyPermission, type RbacContext } from "@/lib/security/rbac";
import { ok } from "@/services/_shared/action-response";
import { HistoryCursorError } from "@/services/history/transaction-history.types";
import { BusinessRuleError, ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors";
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions";
import { AP_HISTORY_EXPORT_READ_PERMISSIONS, apHistoryExportSchema, prepareAPHistoryExport } from "@/services/purchasing/ap-history-export.service";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { apHistoryFiltersSchema } from "@/services/purchasing/ap-history.schemas";
import {
  readAPHistory,
  type APHistoryResult,
} from "@/services/purchasing/ap-history.service";

export type { APHistoryResult };

const historyReadActionSchema = z
  .object({ filters: apHistoryFiltersSchema.optional() })
  .strict();

const apReadPermissions = [
  "purchasing.ap.invoice.view",
  "finance.payables.read",
  "purchases.suppliers.read",
];

async function enforceAPHistoryModule(
  ctx: RbacContext,
  surface = "actions/purchasing/ap-history.actions.ts:getAPHistoryAction",
) {
  const decision = await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "purchasing",
    surfaceType: "action",
    surface,
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
    const safe = toSafeActionError(error instanceof HistoryCursorError && error.code !== "not_configured" ? new BusinessRuleError("Invalid history cursor or filters. Refresh the history.", "VALIDATION_ERROR") : error);
    return { success: false as const, data: null, error: safe.error, code: safe.code };
  }
}

export async function prepareAPHistoryExportAction(input: unknown = {}) {
  try {
    const parsed = apHistoryExportSchema.parse(input);
    const verified = await exportScope();
    const file = await prepareAPHistoryExport(parsed, { organizationId: verified.ctx.orgId, actorId: verified.ctx.userId, actorPermissions: verified.ctx.permissions, lastAuthAt: verified.claims.lastAuthAt });
    // Recheck current authority before returning private bytes after a potentially slow read.
    const current = await exportScope();
    if (current.ctx.orgId !== file.organizationId || current.ctx.userId !== file.actorId || current.claims.sessionId !== verified.claims.sessionId) throw new ForbiddenError("Export session changed. Retry from the current workspace.");
    // Flight text decoding can consume a leading UTF-8 BOM. Preserve the audited bytes explicitly.
    const { content, ...metadata } = file;
    return { success: true as const, data: { ...metadata, contentBase64: Buffer.from(content, "utf8").toString("base64") }, error: null, code: null };
  } catch (error) {
    const safe = toSafeActionError(error);
    return { success: false as const, data: null, error: safe.error, code: safe.code };
  }
}

async function exportScope() {
  const verified = await requireFreshAuth(300);
  if (!hasAnyRbacPermission(verified.ctx.permissions, ["reports.export"]) || !hasAnyRbacPermission(verified.ctx.permissions, AP_HISTORY_EXPORT_READ_PERMISSIONS)) throw new ForbiddenError("AP read and report export permissions are required.");
  await enforceAPHistoryModule(verified.ctx, "actions/purchasing/ap-history.actions.ts:prepareAPHistoryExportAction");
  return verified;
}
