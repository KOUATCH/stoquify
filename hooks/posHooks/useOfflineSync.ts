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
import type { Locale } from "@/types/bilingual"

type OfflineSyncFilters = {
  locationId?: string | null
  terminalId?: string | null
  limit?: number
}

const copy = {
  en: {
    fetchError: "Offline POS sync evidence is unavailable.",
    deviceRegisteredTitle: "Offline device enrolled",
    deviceRegisteredBody: "This terminal can now queue tamper-evident offline events.",
    syncAcceptedTitle: "Offline sync processed",
    syncAcceptedBody: "The server recorded the offline evidence and updated certification blockers.",
    syncBlockedTitle: "Offline sync blocked",
    syncBlockedBody: "A manager must review the offline sync conflict queue.",
  },
  fr: {
    fetchError: "Les preuves de synchronisation POS hors ligne sont indisponibles.",
    deviceRegisteredTitle: "Terminal hors ligne enrole",
    deviceRegisteredBody: "Ce terminal peut maintenant conserver des preuves hors ligne tracables.",
    syncAcceptedTitle: "Synchronisation hors ligne traitee",
    syncAcceptedBody: "Le serveur a enregistre les preuves et mis a jour les blocages de certification.",
    syncBlockedTitle: "Synchronisation hors ligne bloquee",
    syncBlockedBody: "Un responsable doit examiner la file des conflits hors ligne.",
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
