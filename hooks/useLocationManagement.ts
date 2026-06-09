"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import {
  archiveManagedLocation,
  createManagedLocation,
  getLocationManagementData,
  updateManagedLocation,
  type LocationManagementInput,
  type LocationManagementRow,
} from "@/actions/locations/location-management-actions"
import { LocationKeys } from "@/types/queryKeys"
import type { Locale } from "@/types/bilingual"

export const locationManagementKeys = {
  all: ["location-management"] as const,
  dashboard: (organizationId: string) => [...locationManagementKeys.all, "dashboard", organizationId] as const,
}

const copy = {
  en: {
    createTitle: "Location created",
    createBody: "The location is now available in the management dashboard.",
    updateTitle: "Location updated",
    updateBody: "The location record and table metrics were refreshed.",
    archiveTitle: "Location archived",
    archiveBody: "The location was removed from active management.",
    errorTitle: "Location operation failed",
  },
  fr: {
    createTitle: "Lieu cree",
    createBody: "Le lieu est maintenant disponible dans le tableau de gestion.",
    updateTitle: "Lieu mis a jour",
    updateBody: "Le dossier du lieu et les indicateurs ont ete actualises.",
    archiveTitle: "Lieu archive",
    archiveBody: "Le lieu a ete retire de la gestion active.",
    errorTitle: "Operation lieu echouee",
  },
} as const

function invalidateLocationQueries(queryClient: QueryClient, organizationId: string, locationId?: string) {
  queryClient.invalidateQueries({ queryKey: locationManagementKeys.dashboard(organizationId) })
  queryClient.invalidateQueries({ queryKey: LocationKeys.lists() })
  queryClient.invalidateQueries({ queryKey: LocationKeys.orgLocations(organizationId) })
  queryClient.invalidateQueries({ queryKey: LocationKeys.briefOrgLocations(organizationId) })
  queryClient.invalidateQueries({ queryKey: LocationKeys.completeOrgLocations(organizationId) })
  queryClient.invalidateQueries({ queryKey: ["locations"] })
  queryClient.invalidateQueries({ queryKey: ["orgLocations"] })

  if (locationId) {
    queryClient.invalidateQueries({ queryKey: LocationKeys.detail(locationId) })
    queryClient.invalidateQueries({ queryKey: ["location", locationId] })
  }
}

export function useLocationManagementData(organizationId: string) {
  return useQuery({
    queryKey: locationManagementKeys.dashboard(organizationId),
    queryFn: async () => {
      const result = await getLocationManagementData(organizationId)

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch location management data")
      }

      return result.data
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateManagedLocation(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: 'create', entity: 'Managed Location' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: LocationManagementInput) => {
      const result = await createManagedLocation(organizationId, data)

      if (!result.success) {
        throw new Error(result.error || "Failed to create location")
      }

      return result.data
    },
    onSuccess: (location?: LocationManagementRow) => {
      invalidateLocationQueries(queryClient, organizationId, location?.id)
      notifications.success(t.createTitle, t.createBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useUpdateManagedLocation(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: 'update', entity: 'Managed Location' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: LocationManagementInput }) => {
      const result = await updateManagedLocation(organizationId, id, data)

      if (!result.success) {
        throw new Error(result.error || "Failed to update location")
      }

      return result.data
    },
    onSuccess: (location?: LocationManagementRow) => {
      invalidateLocationQueries(queryClient, organizationId, location?.id)
      notifications.success(t.updateTitle, t.updateBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useArchiveManagedLocation(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: 'archive', entity: 'Managed Location' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (id: string) => {
      const result = await archiveManagedLocation(organizationId, id)

      if (!result.success) {
        throw new Error(result.error || "Failed to archive location")
      }

      return result.data
    },
    onSuccess: (location?: { id: string }) => {
      invalidateLocationQueries(queryClient, organizationId, location?.id)
      notifications.success(t.archiveTitle, t.archiveBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}
