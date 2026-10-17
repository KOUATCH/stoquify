"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getOfflineSyncDashboardAction,
  registerOfflineDeviceAction,
  syncOfflineEventsAction,
  type OfflineSyncBatchResult,
  type OfflineSyncDashboardData,
  type OfflineSyncDeviceDTO,
} from "@/actions/pos/sync.actions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import {
  claimOfflineLocalQueueBatch,
  enqueueOfflineLocalEvent,
  settleOfflineLocalQueueBatch,
  type EnqueueOfflineLocalEventInput,
  type OfflineLocalQueueConfig,
  type OfflineLocalQueueEntry,
} from "@/lib/pos/offline-local-queue"
import type { Locale } from "@/types/bilingual"

type OfflineSyncFilters = {
  locationId?: string | null
  terminalId?: string | null
  limit?: number
}

type UseOfflineLocalQueueConfig = {
  organizationKey: string
  deviceId?: string | null
  terminalId?: string | null
  locationId?: string | null
  sessionId?: string | null
  storage?: Storage
}

type OfflineQueueFlushResult =
  | { skipped: true; reason: "EMPTY_QUEUE" | "LEASE_ACTIVE" | "CONFLICT_REVIEW"; pendingCount: number }
  | (OfflineSyncBatchResult & { skipped?: false; syncedQueueIds: string[] })

const copy = {
  en: {
    fetchError: "Offline POS sync evidence is unavailable.",
    deviceRegisteredTitle: "Offline device enrolled",
    deviceRegisteredBody: "This terminal can now queue tamper-evident offline events.",
    syncAcceptedTitle: "Offline sync processed",
    syncAcceptedBody: "The server recorded the offline evidence and updated certification blockers.",
    syncBlockedTitle: "Offline sync blocked",
    syncBlockedBody: "A manager must review the offline sync conflict queue.",
    queueStoredTitle: "Offline sale queued",
    queueStoredBody: "The provisional receipt evidence was saved locally until sync is available.",
    queueEmptyTitle: "Offline queue empty",
    queueEmptyBody: "There are no queued offline POS events to sync.",
    queueBusyBody: "Another sync attempt is still active. Unconfirmed events become retryable after its recovery lease expires.",
  },
  fr: {
    fetchError: "Les preuves de synchronisation POS hors ligne sont indisponibles.",
    deviceRegisteredTitle: "Terminal hors ligne enrole",
    deviceRegisteredBody: "Ce terminal peut maintenant conserver des preuves hors ligne tracables.",
    syncAcceptedTitle: "Synchronisation hors ligne traitee",
    syncAcceptedBody: "Le serveur a enregistre les preuves et mis a jour les blocages de certification.",
    syncBlockedTitle: "Synchronisation hors ligne bloquee",
    syncBlockedBody: "Un responsable doit examiner la file des conflits hors ligne.",
    queueStoredTitle: "Vente hors ligne en file",
    queueStoredBody: "La preuve du recu provisoire a ete conservee localement jusqu'a la synchronisation.",
    queueEmptyTitle: "File hors ligne vide",
    queueEmptyBody: "Aucun evenement POS hors ligne n'est en attente de synchronisation.",
    queueBusyBody: "Une synchronisation est en cours. Les evenements non confirmes pourront etre renvoyes apres expiration du delai de reprise.",
  },
} as const

export const offlineSyncKeys = {
  all: ["pos-offline-sync"] as const,
  dashboard: (filters: OfflineSyncFilters = {}) =>
    [
      ...offlineSyncKeys.all,
      "dashboard",
      filters.locationId ?? "all-locations",
      filters.terminalId ?? "all-terminals",
      filters.limit ?? 25,
    ] as const,
}

export type OfflineReviewAccess = { organizationId?: string; userId?: string; canRead: boolean; canReview: boolean }

export function useOfflineSyncDashboard(filters: OfflineSyncFilters, options: { enabled?: boolean; access: OfflineReviewAccess }) {
  const { organizationId, userId, canRead } = options.access
  return useQuery<OfflineSyncDashboardData>({
    queryKey: [...offlineSyncKeys.dashboard(filters), organizationId, userId],
    queryFn: async () => {
      const result = await getOfflineSyncDashboardAction(filters)

      if (!result.success || !result.data) {
        throw new Error(result.error || copy.en.fetchError)
      }

      return result.data
    },
    enabled: (options.enabled ?? true) && Boolean(organizationId && userId && canRead),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useRegisterOfflineDevice(locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation<OfflineSyncDeviceDTO, Error, unknown>({
    mutationFn: async (input) => {
      const result = await registerOfflineDeviceAction(input)

      if (!result.success || !result.data) {
        throw new Error(result.error || t.syncBlockedBody)
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offlineSyncKeys.all })
      notifications.success(t.deviceRegisteredTitle, t.deviceRegisteredBody)
    },
    onError: (error) => {
      notifications.error(t.syncBlockedTitle, error.message || t.syncBlockedBody)
    },
  })
}

export function useSyncOfflineEvents(locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation<OfflineSyncBatchResult, Error, unknown>({
    mutationFn: async (input) => {
      const result = await syncOfflineEventsAction(input)

      if (!result.success || !result.data) {
        throw new Error(result.error || t.syncBlockedBody)
      }

      return result.data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: offlineSyncKeys.all })

      if (result.conflictCount > 0) {
        notifications.warning(t.syncBlockedTitle, t.syncBlockedBody)
        return
      }

      notifications.success(t.syncAcceptedTitle, t.syncAcceptedBody)
    },
    onError: (error) => {
      notifications.error(t.syncBlockedTitle, error.message || t.syncBlockedBody)
    },
  })
}

function requireLocalQueueConfig(config: UseOfflineLocalQueueConfig): OfflineLocalQueueConfig {
  if (!config.deviceId || !config.terminalId || !config.locationId) {
    throw new Error("Offline POS queue requires an enrolled device, terminal, and location.")
  }

  return {
    organizationKey: config.organizationKey,
    deviceId: config.deviceId,
    terminalId: config.terminalId,
    locationId: config.locationId,
    sessionId: config.sessionId ?? undefined,
    storage: config.storage,
  }
}

export function useEnqueueOfflinePOSEvent(
  config: UseOfflineLocalQueueConfig,
  locale: Locale = "en",
) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation<OfflineLocalQueueEntry, Error, EnqueueOfflineLocalEventInput>({
    mutationFn: async (input) => enqueueOfflineLocalEvent(requireLocalQueueConfig(config), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offlineSyncKeys.all })
      notifications.warning(t.queueStoredTitle, t.queueStoredBody)
    },
    onError: (error) => {
      notifications.error(t.syncBlockedTitle, error.message || t.syncBlockedBody)
    },
  })
}

export function useFlushOfflinePOSQueue(
  config: UseOfflineLocalQueueConfig,
  locale: Locale = "en",
) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation<OfflineQueueFlushResult, Error, void>({
    mutationFn: async () => {
      const queueConfig = requireLocalQueueConfig(config)
      const claim = await claimOfflineLocalQueueBatch(queueConfig)
      if (claim.skipped) return claim
      try {
        // Re-send the immutable identity when an earlier response was lost. The
        // ingestion service resolves duplicates before applying sequence checks.
        const result = await syncOfflineEventsAction(claim.envelope)
        if (!result.success || !result.data) throw new Error(result.error || t.syncBlockedBody)
        const data = result.data
        if (!data.batchId || data.device.id !== queueConfig.deviceId ||
            ![data.acceptedCount, data.duplicateCount, data.conflictCount].every(value => Number.isSafeInteger(value) && value >= 0) ||
            (data.conflictCount === 0 && data.acceptedCount + data.duplicateCount !== claim.queueIds.length)) {
          throw new Error("Offline sync acknowledgement is incomplete. Evidence is retained for recovery.")
        }
        await settleOfflineLocalQueueBatch(queueConfig, claim, {
          status: data.conflictCount > 0 ? "CONFLICT" : "SYNCED",
          serverBatchId: data.batchId,
        })
        // Keep acknowledged envelopes and attempt evidence locally; ingestion
        // acknowledgement does not certify payment, fiscal or economic finality.
        return { ...data, skipped: false, syncedQueueIds: data.conflictCount > 0 ? [] : claim.queueIds }
      } catch (error) {
        await settleOfflineLocalQueueBatch(queueConfig, claim, { status: "UNCERTAIN" })
        throw error
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: offlineSyncKeys.all })

      if (result.skipped) {
        if (result.reason === "CONFLICT_REVIEW") notifications.warning(t.syncBlockedTitle, t.syncBlockedBody)
        else if (result.reason === "LEASE_ACTIVE") notifications.info(t.syncBlockedTitle, t.queueBusyBody)
        else notifications.info(t.queueEmptyTitle, t.queueEmptyBody)
        return
      }

      if (result.conflictCount > 0) {
        notifications.warning(t.syncBlockedTitle, t.syncBlockedBody)
        return
      }

      notifications.success(t.syncAcceptedTitle, t.syncAcceptedBody)
    },
    onError: (error) => {
      notifications.error(t.syncBlockedTitle, error.message || t.syncBlockedBody)
    },
  })
}
