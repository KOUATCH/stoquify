"use server";

import { z } from "zod";

import { requireFreshAuth } from "@/lib/security/auth-session";
import { requireAnyPermission } from "@/lib/security/rbac";
import { err, ok } from "@/services/_shared/action-response";
import { ForbiddenError } from "@/services/_shared/action-errors";
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions";
import { prepareAROpenItemsExport } from "@/services/accounting/ar-open-item-export.service";
import {
  getCustomerAROpenItems,
  type AROpenItemResult,
} from "@/services/accounting/ar-open-item.service";

export type { AROpenItemResult };

const arHistoryFiltersSchema = z
  .object({
    customerId: z.string().trim().min(1).max(200).optional(),
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
    const current = await requireAnyPermission(["finance.receivables.read", "finance.read"], { resource: "AROpenItemsHistory" });
    if (current.orgId !== ctx.orgId || current.userId !== ctx.userId) throw new ForbiddenError("History workspace changed. Refresh the current workspace.");
    return ok({ ...data, scope: { organizationId: ctx.orgId, actorUserId: ctx.userId } });
  } catch (error) {
    return err(error);
  }
}

export async function prepareAROpenItemsHistoryExportAction(
  input: unknown = {},
) {
  try {
    const parsed = arHistoryExportActionSchema.parse(input);
    const freshAuth = await exportScope();
    const ctx = freshAuth.ctx;
    const exportFile = await prepareAROpenItemsExport({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: freshAuth.claims.lastAuthAt,
      filters: parsed.filters,
    });
    const current = await exportScope();
    if (current.ctx.orgId !== ctx.orgId || current.ctx.userId !== ctx.userId || current.claims.sessionId !== freshAuth.claims.sessionId) throw new ForbiddenError("Export session changed. Retry from the current workspace.");
    return ok({ ...exportFile, scope: { organizationId: ctx.orgId, actorUserId: ctx.userId } });
  } catch (error) {
    return err(error);
  }
}

async function exportScope() {
  const verified = await requireFreshAuth(300);
  if (!hasAnyRbacPermission(verified.ctx.permissions, ["finance.receivables.read", "finance.read"]) || !hasAnyRbacPermission(verified.ctx.permissions, ["finance.reports.export", "reports.export"])) throw new ForbiddenError("AR read and report export permissions are required.");
  return verified;
}
