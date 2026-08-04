"use server"

import { revalidatePath, revalidateTag } from "next/cache"

import { protect, type ProtectedActionResponse } from "@/services/_shared/protect"
import {
  getOfflineSyncDashboard,
  ingestOfflineSyncBatch,
  registerOfflineDevice,
  replayPendingOfflineSaleEnvelope,
  type OfflineSyncBatchResult,
  type OfflineSyncDashboardData,
  type OfflineSyncDeviceDTO,
  type OfflineSaleReplayResult,
  type OfflineSyncErrorCode,
} from "@/services/pos/offline-sync.service"

export type {
  OfflineSyncBatchResult,
  OfflineSyncDashboardData,
  OfflineSyncDeviceDTO,
  OfflineSaleReplayResult,
}

type OfflineActionErrorCode = OfflineSyncErrorCode | Exclude<
  ProtectedActionResponse<never> extends infer Result
    ? Result extends { code: infer Code }
      ? Code
      : never
    : never,
  undefined
>

function offlineActionErrorCode(
  result: Extract<ProtectedActionResponse<unknown>, { success: false }>,
): OfflineActionErrorCode {
  const explicitCodes: OfflineSyncErrorCode[] = [
    "IDEMPOTENCY_CONFLICT",
    "SEQUENCE_CONFLICT",
    "DEVICE_REVOKED",
    "DEVICE_SIGNATURE_INVALID",
    "OFFLINE_POLICY_EXPIRED",
    "STALE_REFERENCE_SNAPSHOT",
    "AUTHORITY_UNAVAILABLE",
    "PROVISIONAL_RECEIPT_PENDING",
    "SYSTEM_ERROR",
  ]
  const explicit = explicitCodes.find((code) => result.error.includes(code))
  if (explicit) return explicit
  if (result.code) {
    return result.code === "INTERNAL_ERROR" ? "SYSTEM_ERROR" : result.code
  }
  if (result.status === 401) return "AUTH_REQUIRED"
  if (result.status === 403) return "FORBIDDEN"
  if (result.status === 409) return "CONFLICT"
  return "SYSTEM_ERROR"
}

async function withOfflineActionContract<T>(
  response: Promise<ProtectedActionResponse<T>>,
) {
  const result = await response
  return result.success
    ? { ...result, ok: true as const }
    : {
        ...result,
        ok: false as const,
        errorCode: offlineActionErrorCode(result),
      }
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
  return withOfflineActionContract(getDashboard(input))
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
  return withOfflineActionContract(enrollDevice(input))
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
  return withOfflineActionContract(syncBatch(input))
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
  return withOfflineActionContract(replayOfflineSale(input))
}
