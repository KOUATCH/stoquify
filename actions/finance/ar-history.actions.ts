"use server";

import { z } from "zod";

import { requireFreshAuth } from "@/lib/security/auth-session";
import { requireAnyPermission } from "@/lib/security/rbac";
import { err, ok } from "@/services/_shared/action-response";
import { prepareAROpenItemsExport } from "@/services/accounting/ar-open-item-export.service";
import {
  getCustomerAROpenItems,
  type AROpenItemResult,
} from "@/services/accounting/ar-open-item.service";

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
  rowCount: z.number().int().min(0).max(100_000).optional(),
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
    const freshAuth = await requireFreshAuth(300);
    const exportFile = await prepareAROpenItemsExport({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: freshAuth.claims.lastAuthAt,
      filters: parsed.filters,
    });
    return ok(exportFile);
  } catch (error) {
    return err(error);
  }
}
