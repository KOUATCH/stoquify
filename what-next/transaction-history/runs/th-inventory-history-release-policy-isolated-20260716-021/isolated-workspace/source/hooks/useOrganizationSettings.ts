"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNotifications } from '@/components/notifications/NotificationProvider'
import {
  createOrganizationSettings,
  getOrganizationManagementRows,
  getOrganizationSettings,
  updateOrganizationSettings,
  updateOrganizationCurrency,
  updateOrganizationTimezone,
  updateInventoryStartDate,
  updateFiscalYearStart
} from '@/actions/organization/organization-settings-actions'
import type { OrganizationManagementRow } from '@/actions/organization/organization-settings-actions'
import type { Locale } from '@/types/bilingual'

type OrganizationSettingsMutationData = {
  name?: string
  industry?: string
  country?: string
  state?: string
  address?: string
  currency?: string
  timezone?: string
  defaultLocale?: Locale
  inventoryStartDate?: Date | null
  fiscalYearStart?: string
}

type CreateOrganizationSettingsMutationData = {
  name: string
  slug?: string
  industry?: string | null
  country?: string | null
  state?: string | null
  address?: string | null
  currency?: string
  timezone?: string
  defaultLocale?: Locale
}

const notificationCopy = {
  en: {
    success: "Organization Updated",
    successBody: "Organization settings updated successfully.",
    error: "Organization Update Failed",
    currency: "Currency updated successfully.",
    timezone: "Timezone updated successfully.",
    createSuccess: "Organization Created",
    createSuccessBody: "The organization was created and added to the management table.",
    createError: "Organization Creation Failed",
  },
  fr: {
    success: "Organisation mise a jour",
    successBody: "Les parametres de l'organisation ont ete mis a jour.",
    error: "Echec de mise a jour",
    currency: "La devise a ete mise a jour.",
    timezone: "Le fuseau horaire a ete mis a jour.",
    createSuccess: "Organisation creee",
    createSuccessBody: "L'organisation a ete ajoutee a la table de gestion.",
    createError: "Echec de creation",
  },
} as const

// Query keys
export const organizationQueryKeys = {
  settings: (organizationId: string) => ['organization-settings', organizationId],
  managementRows: (organizationId: string) => ['organization-settings', 'management-rows', organizationId],
  all: ['organization-settings'],
}

function invalidateOrganizationQueries(queryClient: ReturnType<typeof useQueryClient>, organizationId: string) {
  queryClient.invalidateQueries({
    queryKey: organizationQueryKeys.settings(organizationId)
  })
  queryClient.invalidateQueries({
    queryKey: organizationQueryKeys.managementRows(organizationId)
  })
}

// Hook for fetching organization settings
export function useOrganizationSettings(organizationId: string) {
  return useQuery({
    queryKey: organizationQueryKeys.settings(organizationId),
    queryFn: async () => {
      const result = await getOrganizationSettings(organizationId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch organization settings')
      }
      return result.data
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook for fetching organization table rows
export function useOrganizationManagementRows(organizationId: string) {
  return useQuery<OrganizationManagementRow[]>({
    queryKey: organizationQueryKeys.managementRows(organizationId),
    queryFn: async () => {
      const result = await getOrganizationManagementRows(organizationId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch organization management rows')
      }
      return result.data
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// Hook for creating organization records from the management table
export function useCreateOrganizationSettings(scopeOrganizationId: string, locale: Locale = 'en') {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const copy = notificationCopy[locale]

  return useMutation({
    meta: { operation: 'create', entity: 'Organization Settings' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: CreateOrganizationSettingsMutationData) => {
      const result = await createOrganizationSettings(data)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create organization')
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.managementRows(scopeOrganizationId)
      })
      queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.all
      })

      notifications.success(copy.createSuccess, copy.createSuccessBody)
    },
    onError: (error: Error) => {
      notifications.error(copy.createError, error.message || copy.createError)
    },
  })
}

// Hook for updating organization settings
export function useUpdateOrganizationSettings(locale: Locale = 'en') {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const copy = notificationCopy[locale]

  return useMutation({
    meta: { operation: 'update', entity: 'Organization Settings' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({
      organizationId,
      data
    }: {
      organizationId: string
      data: OrganizationSettingsMutationData
    }) => {
      const result = await updateOrganizationSettings(organizationId, data)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update organization settings')
      }

      return result.data
    },
    onSuccess: (data, variables) => {
      invalidateOrganizationQueries(queryClient, variables.organizationId)

      notifications.success(copy.success, copy.successBody)
    },
    onError: (error: Error) => {
      notifications.error(copy.error, error.message || copy.error)
    },
  })
}

// Hook for updating currency
export function useUpdateCurrency(locale: Locale = 'en') {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const copy = notificationCopy[locale]

  return useMutation({
    meta: { operation: 'update', entity: 'Currency' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ organizationId, currency }: { organizationId: string, currency: string }) => {
      const result = await updateOrganizationCurrency(organizationId, currency)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update currency')
      }

      return result.data
    },
    onSuccess: (data, variables) => {
      invalidateOrganizationQueries(queryClient, variables.organizationId)

      notifications.success(copy.success, copy.currency)
    },
    onError: (error: Error) => {
      notifications.error(copy.error, error.message || copy.error)
    },
  })
}

// Hook for updating timezone
export function useUpdateTimezone(locale: Locale = 'en') {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const copy = notificationCopy[locale]

  return useMutation({
    meta: { operation: 'update', entity: 'Timezone' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ organizationId, timezone }: { organizationId: string, timezone: string }) => {
      const result = await updateOrganizationTimezone(organizationId, timezone)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update timezone')
      }

      return result.data
    },
    onSuccess: (data, variables) => {
      invalidateOrganizationQueries(queryClient, variables.organizationId)

      notifications.success(copy.success, copy.timezone)
    },
    onError: (error: Error) => {
      notifications.error(copy.error, error.message || copy.error)
    },
  })
}
