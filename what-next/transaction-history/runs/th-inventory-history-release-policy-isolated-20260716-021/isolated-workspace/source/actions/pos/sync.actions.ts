"use server"

import { revalidatePath, revalidateTag } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  getOfflineSyncDashboard,
  ingestOfflineSyncBatch,
  registerOfflineDevice,
  replayPendingOfflineSaleEnvelope,
  type OfflineSyncBatchResult,
  type OfflineSyncDashboardData,
  type OfflineSyncDeviceDTO,
  type OfflineSaleReplayResult,
} from "@/services/pos/offline-sync.service"

export type {
  OfflineSyncBatchResult,
  OfflineSyncDashboardData,
  OfflineSyncDeviceDTO,
  OfflineSaleReplayResult,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function revalidateOfflineSync() {
  revalidateTag("pos-offline-sync")
  revalidateTag("pos-sessions")
  revalidatePath("/[locale]/dashboard/pos", "page")
  revalidatePath("/[locale]/dashboard/accounting/accountant-portal", "page")
}

const getDashboard = protect<unknown, OfflineSyncDashboardData>(
  {
    permission: "pos.transactions.read",
    auditResource: "POSOfflineSync",
    auditAllowed: false,
  },
  async (input, ctx) => {
    return getOfflineSyncDashboard({
      ...asRecord(input),
      organizationId: ctx.orgId,
    })
  },
)

export async function getOfflineSyncDashboardAction(input: unknown = {}) {
  return getDashboard(input)
}

const enrollDevice = protect<unknown, OfflineSyncDeviceDTO>(
  {
    permission: "pos.session.start",
    auditResource: "POSOfflineDevice",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const payload = {
      ...asRecord(input),
      organizationId: ctx.orgId,
      userId: ctx.userId,
    } as Parameters<typeof registerOfflineDevice>[0]
    const device = await registerOfflineDevice(payload)
    revalidateOfflineSync()
    return device
  },
)

export async function registerOfflineDeviceAction(input: unknown) {
  return enrollDevice(input)
}

const syncBatch = protect<unknown, OfflineSyncBatchResult>(
  {
    permission: "pos.use",
    auditResource: "POSOfflineSyncBatch",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const payload = {
      ...asRecord(input),
      organizationId: ctx.orgId,
      userId: ctx.userId,
    } as Parameters<typeof ingestOfflineSyncBatch>[0]
    const result = await ingestOfflineSyncBatch(payload)
    revalidateOfflineSync()
    return result
  },
)

export async function syncOfflineEventsAction(input: unknown) {
  return syncBatch(input)
}

const replayOfflineSale = protect<unknown, OfflineSaleReplayResult>(
  {
    permission: "pos.use",
    auditResource: "POSOfflineEvent",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const payload = {
      ...asRecord(input),
      organizationId: ctx.orgId,
      userId: ctx.userId,
    } as Parameters<typeof replayPendingOfflineSaleEnvelope>[0]
    const result = await replayPendingOfflineSaleEnvelope(payload)
    revalidateOfflineSync()
    return result
  },
)

export async function replayOfflineSaleEnvelopeAction(input: unknown) {
  return replayOfflineSale(input)
}
