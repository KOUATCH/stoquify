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
  buildOfflineSyncBatchEnvelope,
  enqueueOfflineLocalEvent,
  loadOfflineLocalQueue,
  markOfflineLocalQueueEntries,
  offlineLocalQueuePendingEntries,
  pruneSyncedOfflineLocalQueue,
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
  | { skipped: true; reason: "EMPTY_QUEUE"; pendingCount: 0 }
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

export function useOfflineSyncDashboard(filters: OfflineSyncFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery<OfflineSyncDashboardData>({
    queryKey: offlineSyncKeys.dashboard(filters),
    queryFn: async () => {
      const result = await getOfflineSyncDashboardAction(filters)

      if (!result.success || !result.data) {
        throw new Error(result.error || copy.en.fetchError)
      }

      return result.data
    },
    enabled: options.enabled ?? true,
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
      const state = loadOfflineLocalQueue(queueConfig)
      const pending = offlineLocalQueuePendingEntries(state)

      if (pending.length === 0) {
        return { skipped: true, reason: "EMPTY_QUEUE", pendingCount: 0 }
      }

      const queueIds = pending.map((entry) => entry.queueId)
      const envelope = buildOfflineSyncBatchEnvelope(queueConfig, state)
      if (!envelope) return { skipped: true, reason: "EMPTY_QUEUE", pendingCount: 0 }

      markOfflineLocalQueueEntries(queueConfig, queueIds, "SYNCING")

      const result = await syncOfflineEventsAction(envelope)
      if (!result.success || !result.data) {
        markOfflineLocalQueueEntries(queueConfig, queueIds, "FAILED", result.error || t.syncBlockedBody)
        throw new Error(result.error || t.syncBlockedBody)
      }

      markOfflineLocalQueueEntries(
        queueConfig,
        queueIds,
        result.data.conflictCount > 0 ? "CONFLICT" : "SYNCED",
      )
      if (result.data.conflictCount === 0) {
        pruneSyncedOfflineLocalQueue(queueConfig)
      }

      return {
        ...result.data,
        skipped: false,
        syncedQueueIds: queueIds,
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: offlineSyncKeys.all })

      if (result.skipped) {
        notifications.info(t.queueEmptyTitle, t.queueEmptyBody)
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
