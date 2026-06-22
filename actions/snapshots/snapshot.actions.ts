"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  getBranchOperatingSnapshot,
} from "@/services/snapshots/branch-operating-snapshot.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import {
  rebuildSnapshotBundle,
  type SnapshotBundleInput,
} from "@/services/snapshots/snapshot-rebuild.service"
import type {
  BranchOperatingMetrics,
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotBuildRunResult,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"

export type {
  BranchOperatingMetrics,
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotBuildRunResult,
  SnapshotResult,
  TenantOperatingMetrics,
}

const snapshotInputSchema = z.object({
  locationId: z.string().trim().min(1).nullable().optional(),
  periodStart: z.coerce.date().nullable().optional(),
  periodEnd: z.coerce.date().nullable().optional(),
  maxAgeMinutes: z.number().int().positive().max(60 * 24 * 31).nullable().optional(),
  includeBranch: z.boolean().optional(),
})

function asSnapshotInput(input: unknown): Omit<SnapshotBundleInput, "organizationId"> {
  const parsed = snapshotInputSchema.parse(input && typeof input === "object" ? input : {})
  return {
    locationId: parsed.locationId ?? null,
    periodStart: parsed.periodStart ?? null,
    periodEnd: parsed.periodEnd ?? null,
    maxAgeMinutes: parsed.maxAgeMinutes ?? null,
    includeBranch: parsed.includeBranch,
  }
}

const getTenantOperating = protect<unknown, SnapshotResult<TenantOperatingMetrics>>(
  { permission: "dashboard.read", auditResource: "KontavaTenantOperatingSnapshot", auditAllowed: false },
  async (input, ctx) => {
    const parsed = asSnapshotInput(input)
    return getTenantOperatingSnapshot({ ...parsed, organizationId: ctx.orgId })
  },
)

const getBranchOperating = protect<unknown, SnapshotResult<BranchOperatingMetrics>>(
  { permission: "dashboard.read", auditResource: "KontavaBranchOperatingSnapshot", auditAllowed: false },
  async (input, ctx) => {
    const parsed = asSnapshotInput(input)
    return getBranchOperatingSnapshot({ ...parsed, organizationId: ctx.orgId })
  },
)

const getPaymentTruth = protect<unknown, SnapshotResult<PaymentTruthMetrics>>(
  { permission: "payments.reconciliation.read", auditResource: "KontavaPaymentTruthSnapshot", auditAllowed: true },
  async (input, ctx) => {
    const parsed = asSnapshotInput(input)
    return getPaymentTruthSnapshot({ ...parsed, organizationId: ctx.orgId })
  },
)

const getInventoryCash = protect<unknown, SnapshotResult<InventoryCashMetrics>>(
  { permission: "inventory.read", auditResource: "KontavaInventoryCashSnapshot", auditAllowed: false },
  async (input, ctx) => {
    const parsed = asSnapshotInput(input)
    return getInventoryCashSnapshot({ ...parsed, organizationId: ctx.orgId })
  },
)

const getCloseReadiness = protect<unknown, SnapshotResult<CloseReadinessMetrics>>(
  { permission: "accounting.close.read", auditResource: "KontavaCloseReadinessSnapshot", auditAllowed: true },
  async (input, ctx) => {
    const parsed = asSnapshotInput(input)
    return getCloseReadinessSnapshot({ ...parsed, organizationId: ctx.orgId })
  },
)

const rebuildBundle = protect<unknown, SnapshotBuildRunResult>(
  { permission: "dashboard.read", auditResource: "KontavaSnapshotBuildRun", auditAllowed: true },
  async (input, ctx) => {
    const parsed = asSnapshotInput(input)
    return rebuildSnapshotBundle({ ...parsed, organizationId: ctx.orgId })
  },
)

export async function getTenantOperatingSnapshotAction(input: unknown = {}) {
  return getTenantOperating(input)
}

export async function getBranchOperatingSnapshotAction(input: unknown = {}) {
  return getBranchOperating(input)
}

export async function getPaymentTruthSnapshotAction(input: unknown = {}) {
  return getPaymentTruth(input)
}

export async function getInventoryCashSnapshotAction(input: unknown = {}) {
  return getInventoryCash(input)
}

export async function getCloseReadinessSnapshotAction(input: unknown = {}) {
  return getCloseReadiness(input)
}

export async function rebuildSnapshotBundleAction(input: unknown = {}) {
  return rebuildBundle(input)
}

