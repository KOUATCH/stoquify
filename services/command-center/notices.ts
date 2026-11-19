import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { shouldNotifyForSignal } from "@/services/signals/signal-notification.service";
import { createBusinessSignalFromFact } from "@/services/signals/business-signal-rules.service";
import type { BusinessSignalType } from "@/services/signals/business-signal-contracts";
import { sources } from "./sources";
import type { FollowUpData, SourceKey } from "./contracts";
import type { Identity } from "./authority";
const signalTypes: Record<SourceKey, BusinessSignalType> = {
  suspense: "open_payment_suspense",
  stockout: "stockout_risk",
  receiving: "purchase_order_receiving_delay",
  loss: "inventory_loss_review",
  close: "close_blocker",
  payroll_forecast: "payroll_exposure",
  employee_balance: "payroll_exposure",
};
export async function queueAssignmentNotice(
  tx: Prisma.TransactionClient,
  org: string,
  row: {
    id: string;
    ownerId: string | null;
    revision: number;
    sourceKey: SourceKey;
  },
) {
  if (!row.ownerId) return;
  // Called only after current actor/recipient source scope and module checks.
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO "command_center_notices" ("id","organizationId","occurrenceId","recipientId","transitionRevision","sourceKey") VALUES (${randomUUID()},${org},${row.id},${row.ownerId},${row.revision},${row.sourceKey}) ON CONFLICT ("organizationId","occurrenceId","recipientId","transitionRevision") DO NOTHING`,
  );
}
export async function visibleNotices(
  tx: Prisma.TransactionClient,
  identity: Identity,
  rows: { id: string; ownerId: string | null; condition: string }[],
) {
  const preferences = await tx.$queryRaw<FollowUpData["preference"][]>(
    Prisma.sql`SELECT "enabled","quietStart","quietEnd" FROM "command_center_preferences" WHERE "organizationId"=${identity.organizationId} AND "actorId"=${identity.actorId}`,
  );
  const preference = preferences[0] ?? {
    enabled: true,
    quietStart: null,
    quietEnd: null,
  };
  const ids = rows
    .filter((r) => r.ownerId === identity.actorId && r.condition === "ACTIVE")
    .map((r) => r.id);
  const notices: FollowUpData["notices"] = [];
  if (!ids.length) return { notices, preference };
  const records = await tx.$queryRaw<
    { id: string; sourceKey: SourceKey; state: string }[]
  >(
    Prisma.sql`SELECT "id","sourceKey","state" FROM "command_center_notices" WHERE "organizationId"=${identity.organizationId} AND "recipientId"=${identity.actorId} AND "occurrenceId" IN (${Prisma.join(ids)}) AND "state" IN ('PENDING','PUBLISHED') ORDER BY "createdAt","id"`,
  );
  const now = new Date();
  for (const row of records) {
    const source = sources[row.sourceKey];
    const signal = createBusinessSignalFromFact(
      {
        organizationId: identity.organizationId,
        signalType: signalTypes[row.sourceKey],
        moduleSlug: source.module,
        sourceModule:
          row.sourceKey === "stockout" || row.sourceKey === "loss"
            ? "inventory"
            : row.sourceKey === "receiving"
              ? "purchasing"
              : row.sourceKey === "close"
                ? "close"
                : row.sourceKey === "suspense"
                  ? "payments"
                  : "payroll",
        subjectType: "command-center.follow-up",
        subjectId: row.id,
        severity: "medium",
        requiredPermission: source.permissions[0],
        actionPath: source.path,
      },
      now,
    );
    const allowed = shouldNotifyForSignal({
      signal,
      now,
      preference: {
        organizationId: identity.organizationId,
        userId: identity.actorId,
        channels: preference.enabled ? ["in_app"] : [],
        enabledSignalTypes: [signal.signalType],
        minimumSeverity: "low",
        quietHours:
          preference.quietStart === null
            ? null
            : {
                startHour: preference.quietStart,
                endHour: preference.quietEnd!,
                timezone: "UTC",
              },
      },
    });
    if (!allowed) continue;
    if (row.state === "PENDING")
      await tx.$executeRaw(
        Prisma.sql`UPDATE "command_center_notices" SET "state"='PUBLISHED',"publishedAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE "id"=${row.id} AND "organizationId"=${identity.organizationId} AND "state"='PENDING'`,
      );
    notices.push({ id: row.id, source: row.sourceKey });
  }
  return { notices, preference };
}
