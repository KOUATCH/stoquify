"use server";

import { z } from "zod";

import { requireFreshAuth } from "@/lib/security/auth-session";
import { requireAnyPermission } from "@/lib/security/rbac";
import { err, ok } from "@/services/_shared/action-response";
import { BusinessRuleError } from "@/services/_shared/action-errors";
import {
  getCustomerAROpenItems,
  type AROpenItemResult,
} from "@/services/accounting/ar-open-item.service";
import { hashNormalizedHistoryFilters } from "@/services/history/transaction-history-cursor";
import {
  buildExportWatermark,
  evaluateExportSafety,
} from "@/services/security/export-safety.service";

export type { AROpenItemResult };

const arHistoryFiltersSchema = z
  .object({
    customerId: z.string().trim().min(1).optional(),
    asOf: z.coerce.date().optional(),
    recordedThrough: z.coerce.date().optional(),
  })
  .strict();

const arHistoryReadActionSchema = z
  .object({ filters: arHistoryFiltersSchema.optional() })
  .strict();
const arHistoryExportActionSchema = arHistoryReadActionSchema.extend({
  rowCount: z.number().int().min(0).max(100_000).default(0),
});

export async function getAROpenItemsHistoryAction(input: unknown = {}) {
  try {
    const parsed = arHistoryReadActionSchema.parse(input);
    const ctx = await requireAnyPermission(
      ["finance.receivables.read", "finance.read"],
      {
        resource: "AROpenItemsHistory",
      },
    );
    const data = await getCustomerAROpenItems({
      organizationId: ctx.orgId,
      customerId: parsed.filters?.customerId,
      asOf: parsed.filters?.asOf,
      recordedThrough: parsed.filters?.recordedThrough,
    });
    return ok(data);
  } catch (error) {
    return err(error);
  }
}

export async function prepareAROpenItemsHistoryExportAction(
  input: unknown = {},
) {
  try {
    const parsed = arHistoryExportActionSchema.parse(input);
    const ctx = await requireAnyPermission(
      ["finance.reports.export", "reports.export"],
      {
        resource: "AROpenItemsHistoryExport",
      },
    );
    await requireFreshAuth(300);
    const filtersHash = hashNormalizedHistoryFilters(parsed.filters ?? {});
    const watermarkId = buildExportWatermark({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      scope: "customer-ar-open-items-history",
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
      resourceType: "AROpenItemsHistoryExport",
      resourceId: "customer-ar-open-items-history",
      exportContext: {
        scope: "customer-ar-open-items-history",
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
