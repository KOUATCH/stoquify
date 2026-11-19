import "server-only";
import { createHash } from "node:crypto";
import {
  Prisma,
  AdjustmentStatus,
  AdjustmentType,
  PayrollRunStatus,
  PurchaseOrderStatus,
  PayrollEmployeeBalanceCaseStatus,
  SuspenseStatus,
} from "@prisma/client";
import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import {
  getPaymentTruthSnapshot,
  OPEN_SUSPENSE_STATUSES,
} from "@/services/snapshots/payment-truth-snapshot.service";
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service";
import { getInventoryLossSnapshot } from "@/services/snapshots/inventory-loss-snapshot.service";
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service";
import { getPayrollFinanceForecast } from "@/services/payroll/payroll-finance-forecast.service";
import { normalizeSnapshotScope } from "@/services/snapshots/snapshot-utils";
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts";
import type { Condition, FollowUpQuery, SourceKey } from "./contracts";
import { moduleAllowed, type Party } from "./authority";

export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const sources: Record<
  SourceKey,
  {
    module: CommercialModuleSlug;
    permissions: string[];
    path: string;
    current: boolean;
    location: boolean;
  }
> = {
  suspense: {
    module: "payment_reconciliation",
    permissions: ["payments.reconciliation.read"],
    path: "/dashboard/finance/reconciliation",
    current: true,
    location: false,
  },
  stockout: {
    module: "inventory",
    permissions: ["inventory.items.read"],
    path: "/dashboard/inventory/items",
    current: true,
    location: true,
  },
  receiving: {
    module: "purchasing",
    permissions: ["purchases.orders.read"],
    path: "/dashboard/purchase-orders",
    current: true,
    location: true,
  },
  loss: {
    module: "inventory",
    permissions: ["inventory.levels.read"],
    path: "/dashboard/inventory/loss-control",
    current: false,
    location: true,
  },
  close: {
    module: "close_assurance",
    permissions: ["accounting.close.read"],
    path: "/dashboard/accounting/close",
    current: true,
    location: false,
  },
  payroll_forecast: {
    module: "payroll",
    permissions: ["payroll.command.read", "payments.reconciliation.read"],
    path: "/dashboard/payroll",
    current: true,
    location: false,
  },
  employee_balance: {
    module: "payroll",
    permissions: ["payments.reconciliation.read", "payroll.command.read"],
    path: "/dashboard/payroll/payments",
    current: true,
    location: false,
  },
};
export type Observation = {
  source: SourceKey;
  logicalKey: string;
  windowKey: string;
  scopeKey: string;
  condition: Condition;
  revision: string;
  refs: string[];
};
export type Prior = { sourceRefs: string[]; condition: Condition };
export const canReadSource = (party: Party, source: SourceKey) =>
  sources[source].permissions.every((p) =>
    hasRbacPermission(party.permissions, p),
  );
export async function readSources(
  tx: Prisma.TransactionClient,
  org: string,
  actor: Party,
  query: FollowUpQuery,
  prior: (key: string) => Promise<Prior | null>,
  now = new Date(),
) {
  const scope = normalizeSnapshotScope({
    organizationId: org,
    locationId: query.locationId,
    periodStart: query.periodStart,
    periodEnd: query.periodEnd,
    now,
  });
  const scopeKey = scope.locationId ?? "TENANT";
  const observations: Observation[] = [],
    unavailable: SourceKey[] = [];
  for (const source of Object.keys(sources) as SourceKey[]) {
    const config = sources[source];
    if (
      source === "loss" &&
      !scope.locationId &&
      (!actor.wide || !hasRbacPermission(actor.permissions, "dashboard.read"))
    ) {
      unavailable.push(source);
      continue;
    }
    if (
      !canReadSource(actor, source) ||
      (scope.locationId && !config.location) ||
      !(await moduleAllowed(tx, org, actor, config.module))
    ) {
      unavailable.push(source);
      continue;
    }
    if (
      (source === "payroll_forecast" || source === "employee_balance") &&
      !(await moduleAllowed(tx, org, actor, "payment_reconciliation"))
    ) {
      unavailable.push(source);
      continue;
    }
    const windowKey = config.current
      ? "CURRENT_STATE"
      : JSON.stringify([
          scope.periodStart.toISOString(),
          scope.periodEnd.toISOString(),
        ]);
    const logicalKey = digest([
      "command-center-v1",
      org,
      scopeKey,
      source,
      windowKey,
    ]);
    const previous = await prior(logicalKey);
    const previousIds = previous?.sourceRefs ?? [];
    let condition: Condition = "UNKNOWN",
      revision: unknown = null,
      refs: string[] = [];
    const location = scope.locationId ? { locationId: scope.locationId } : {};
    const activeLocation = {
      organizationId: org,
      isActive: true,
      deletedAt: null,
    };
    if (source === "stockout") {
      const snapshot = await getInventoryCashSnapshot(scope, tx);
      const where = {
        ...location,
        location: activeLocation,
        item: { organizationId: org, deletedAt: null, trackInventory: true },
      };
      const rows = await tx.inventoryLevel.findMany({
        where: { ...where, quantityAvailable: { lte: 0 } },
        select: { id: true, version: true, updatedAt: true },
        orderBy: { id: "asc" },
        take: 1001,
      });
      refs = rows.map((r) => r.id);
      revision = rows;
      if (
        refs.length <= 1000 &&
        refs.length === snapshot.metrics.zeroStockLevelCount
      ) {
        condition = refs.length
          ? "ACTIVE"
          : previousIds.length &&
              (await tx.inventoryLevel.count({
                where: {
                  ...where,
                  id: { in: previousIds },
                  quantityAvailable: { gt: 0 },
                },
              })) !== previousIds.length
            ? "UNKNOWN"
            : "CLEAR";
      }
    } else if (source === "suspense") {
      const snapshot = await getPaymentTruthSnapshot(scope, tx);
      const rows = await tx.suspenseItem.findMany({
        where: { organizationId: org, status: { in: OPEN_SUSPENSE_STATUSES } },
        select: { id: true, updatedAt: true },
        orderBy: { id: "asc" },
        take: 1001,
      });
      refs = rows.map((r) => r.id);
      revision = rows;
      if (
        refs.length <= 1000 &&
        refs.length === snapshot.metrics.openSuspenseCount
      )
        condition = refs.length
          ? "ACTIVE"
          : previousIds.length &&
              (await tx.suspenseItem.count({
                where: {
                  organizationId: org,
                  id: { in: previousIds },
                  status: {
                    in: [SuspenseStatus.RESOLVED, SuspenseStatus.WRITTEN_OFF],
                  },
                },
              })) !== previousIds.length
            ? "UNKNOWN"
            : "CLEAR";
    } else if (source === "receiving") {
      const where = {
        organizationId: org,
        deletedAt: null,
        ...location,
        location: activeLocation,
      };
      const rows = await tx.purchaseOrder.findMany({
        where: {
          ...where,
          status: {
            in: [
              PurchaseOrderStatus.SUBMITTED,
              PurchaseOrderStatus.APPROVED,
              PurchaseOrderStatus.PARTIALLY_RECEIVED,
            ],
          },
          expectedDeliveryDate: { lt: now },
        },
        select: { id: true, updatedAt: true },
        orderBy: { id: "asc" },
        take: 1001,
      });
      refs = rows.map((r) => r.id);
      revision = rows;
      if (
        refs.length <= 1000 &&
        refs.length ===
          (await tx.purchaseOrder.count({
            where: {
              organizationId: org,
              deletedAt: null,
              ...location,
              status: {
                in: [
                  PurchaseOrderStatus.SUBMITTED,
                  PurchaseOrderStatus.APPROVED,
                  PurchaseOrderStatus.PARTIALLY_RECEIVED,
                ],
              },
              expectedDeliveryDate: { lt: now },
            },
          }))
      )
        condition = refs.length
          ? "ACTIVE"
          : previousIds.length &&
              (await tx.purchaseOrder.count({
                where: {
                  ...where,
                  id: { in: previousIds },
                  status: {
                    in: [
                      PurchaseOrderStatus.RECEIVED,
                      PurchaseOrderStatus.COMPLETED,
                    ],
                  },
                },
              })) !== previousIds.length
            ? "UNKNOWN"
            : "CLEAR";
    } else if (source === "loss") {
      const snapshot = await getInventoryLossSnapshot(scope, tx);
      // Same completed-loss predicate as inventory-loss-read.service; bind reviews
      // to retained records, not only totals which can match after replacement.
      const rows = await tx.stockAdjustmentLine.findMany({
        where: {
          adjustedQuantity: { lt: 0 },
          adjustment: {
            organizationId: org,
            deletedAt: null,
            status: AdjustmentStatus.COMPLETED,
            type: {
              in: [
                AdjustmentType.CYCLE_COUNT,
                AdjustmentType.PHYSICAL_COUNT,
                AdjustmentType.DAMAGED,
                AdjustmentType.EXPIRED,
                AdjustmentType.THEFT,
                AdjustmentType.WRITE_OFF,
              ],
            },
            adjustmentDate: { gte: scope.periodStart, lte: scope.periodEnd },
            ...location,
          },
        },
        select: {
          id: true,
          updatedAt: true,
          evidenceHash: true,
          adjustment: {
            select: {
              id: true,
              updatedAt: true,
              evidenceHash: true,
              documentHash: true,
            },
          },
        },
        orderBy: { id: "asc" },
        take: 1001,
      });
      refs = rows.map((r) => r.id);
      revision = [snapshot.sourceHash, rows];
      condition =
        snapshot.metrics.sourceTruncated ||
        refs.length > 1000 ||
        refs.length !== snapshot.metrics.lossLineCount
          ? "UNKNOWN"
          : snapshot.metrics.lossLineCount > 0
            ? "ACTIVE"
            : previous
              ? "UNKNOWN"
              : "CLEAR";
    } else if (source === "close") {
      // This shared source tracks retained close obligations across periods;
      // page-specific interval summaries remain separate and unchanged.
      const periods = await tx.accountingPeriod.findMany({
        where: { organizationId: org },
        select: { id: true, startDate: true, endDate: true },
        orderBy: { id: "asc" },
        take: 1001,
      });
      refs = periods.map((p) => p.id);
      if (periods.length > 1000) {
        condition = "UNKNOWN";
        revision = "coverage-limit";
      } else if (!periods.length) {
        condition = previousIds.length ? "UNKNOWN" : "CLEAR";
        revision = "no-retained-periods";
      } else {
        const closeScope = {
          ...scope,
          periodStart: new Date(
            Math.min(...periods.map((p) => p.startDate.getTime())),
          ),
          periodEnd: new Date(
            Math.max(...periods.map((p) => p.endDate.getTime())),
          ),
        };
        const snapshot = await getCloseReadinessSnapshot(closeScope, tx);
        revision = snapshot.sourceHash;
        const m = snapshot.metrics;
        condition =
          m.openFindingCount > 0 ||
          m.blockedCloseRunCount > 0 ||
          m.unavailableEvidenceCount > 0
            ? "ACTIVE"
            : previousIds.every((id) => refs.includes(id)) &&
                m.certifiedCloseRunCount >= m.accountingPeriodCount &&
                snapshot.evidenceGrade === "certified"
              ? "CLEAR"
              : previous
                ? "UNKNOWN"
                : "CLEAR";
      }
    } else if (source === "employee_balance") {
      const rows = await tx.payrollEmployeeBalanceCase.findMany({
        where: {
          organizationId: org,
          status: {
            in: [
              PayrollEmployeeBalanceCaseStatus.OPEN,
              PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED,
            ],
          },
        },
        select: { id: true, updatedAt: true },
        orderBy: { id: "asc" },
        take: 1001,
      });
      refs = rows.map((r) => r.id);
      revision = rows;
      if (refs.length <= 1000)
        condition = refs.length
          ? "ACTIVE"
          : previousIds.length &&
              (await tx.payrollEmployeeBalanceCase.count({
                where: {
                  organizationId: org,
                  id: { in: previousIds },
                  status: PayrollEmployeeBalanceCaseStatus.SETTLED,
                },
              })) !== previousIds.length
            ? "UNKNOWN"
            : "CLEAR";
    } else {
      const organization = await tx.organization.findUniqueOrThrow({
        where: { id: org },
        select: { currency: true },
      });
      // Canonical rolling horizon, shared by daily/weekly/executive projections.
      const start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 86400000);
      end.setUTCHours(23, 59, 59, 999);
      const forecastScope = { ...scope, periodStart: start, periodEnd: end };
      const periods = await tx.payrollPeriod.findMany({
        where: { organizationId: org, payDate: { gte: start, lte: end } },
        select: { id: true },
        orderBy: { id: "asc" },
        take: 1001,
      });
      const declarations = await tx.payrollDeclaration.findMany({
        where: {
          organizationId: org,
          dueDate: { gte: start, lte: end },
          payrollRun: {
            organizationId: org,
            deletedAt: null,
            status: {
              in: [
                PayrollRunStatus.POSTED,
                PayrollRunStatus.PAID,
                PayrollRunStatus.ARCHIVED,
              ],
            },
          },
        },
        select: {
          id: true,
          updatedAt: true,
          payrollRunId: true,
          status: true,
          payloadHash: true,
        },
        orderBy: { id: "asc" },
        take: 1001,
      });
      refs = [
        ...periods.map((p) => "period:" + p.id),
        ...declarations.map((d) => "declaration:" + d.id),
      ];
      const paymentTruth = await getPaymentTruthSnapshot(forecastScope, tx);
      const forecast = await getPayrollFinanceForecast(
        { scope: forecastScope, paymentTruth, currency: organization.currency },
        tx,
      );
      revision = [
        forecast.metrics,
        forecast.sourceMaxUpdatedAt,
        forecast.sourceEvidenceHash,
        declarations,
      ];
      condition =
        refs.length > 1000
          ? "UNKNOWN"
          : forecast.metrics.blockerCodes.length > 0
            ? "ACTIVE"
            : forecast.metrics.authoritative &&
                previousIds.every((id) => refs.includes(id))
              ? "CLEAR"
              : "UNKNOWN";
    }
    // Retain every known active member until positively cleared; deletion or
    // filtering is never proof of completion. Bound references, report uncertainty.
    if (condition === "ACTIVE" && previous?.condition !== "CLEAR")
      refs = [...new Set([...previousIds, ...refs])].sort();
    if (refs.length > 1000) {
      condition = "UNKNOWN";
      refs = previousIds;
    }
    if (condition !== "ACTIVE" && previousIds.length) refs = previousIds;
    if (condition === "UNKNOWN") unavailable.push(source);
    observations.push({
      source,
      scopeKey,
      windowKey,
      logicalKey,
      condition,
      revision: digest([condition, revision]),
      refs,
    });
  }
  return {
    scope: {
      locationId: scope.locationId,
      periodStart: scope.periodStart.toISOString(),
      periodEnd: scope.periodEnd.toISOString(),
    },
    observations,
    unavailable,
  };
}

export async function sourceModulesAllowed(
  tx: Prisma.TransactionClient,
  org: string,
  party: Party,
  source: SourceKey,
  write = false,
) {
  if (!(await moduleAllowed(tx, org, party, sources[source].module, write)))
    return false;
  return (
    !["payroll_forecast", "employee_balance"].includes(source) ||
    (await moduleAllowed(tx, org, party, "payment_reconciliation", write))
  );
}
