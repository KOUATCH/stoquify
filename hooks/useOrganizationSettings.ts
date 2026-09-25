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
    success: "Organisation mise à jour",
    successBody: "Les paramètres de l’organisation ont été mis à jour.",
    error: "Échec de mise à jour",
    currency: "La devise a été mise à jour.",
    timezone: "Le fuseau horaire a été mis à jour.",
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

export class OrganizationSettingsWorkflowError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'OrganizationSettingsWorkflowError' }
}

export function organizationSettingsError(code: string, locale: Locale) {
  const messages: Record<string, [string, string]> = {
    FRESH_AUTH_REQUIRED: ['Confirm your password, then review and save again.', 'Confirmez votre mot de passe, puis vérifiez et enregistrez à nouveau.'],
    CONFLICT: ['The saved profile changed. Load the latest version and compare it with your draft before saving.', 'Le profil enregistré a changé. Chargez la dernière version et comparez-la à votre brouillon avant de l’enregistrer.'],
    VALIDATION_ERROR: ['Check the name, currency, timezone and calendar values.', 'Vérifiez le nom, la devise, le fuseau horaire et les valeurs du calendrier.'],
    FORBIDDEN: ['You no longer have permission to update this organization. Your draft is kept on this page.', 'Vous n’avez plus le droit de modifier cette organisation. Votre brouillon reste sur cette page.'],
    NOT_FOUND: ['This organization is no longer available. Reload your workspace.', 'Cette organisation n’est plus disponible. Rechargez votre espace de travail.'],
    BUSINESS_RULE_VIOLATION: ['This operating change needs a separate migration review. Your saved settings have not changed.', 'Ce changement nécessite une revue de migration distincte. Les paramètres enregistrés sont inchangés.'],
    UNCERTAIN: ['The save could not be confirmed. Load the saved profile and compare it with your draft before trying again.', 'L’enregistrement n’a pas pu être confirmé. Chargez le profil enregistré et comparez-le à votre brouillon avant de réessayer.'],
  }
  return (messages[code] ?? messages.UNCERTAIN)[locale === 'fr' ? 1 : 0]
}

async function saveProfile(action: () => ReturnType<typeof updateOrganizationSettings>, organizationId: string, locale: Locale) {
  try {
    const result = await action()
    if (!result.success) {
      const code = 'code' in result && result.code ? result.code : 'UNCERTAIN'
      throw new OrganizationSettingsWorkflowError(code, organizationSettingsError(code, locale))
    }
    if (!result.data || result.data.id !== organizationId || !Number.isFinite(new Date(result.data.updatedAt).getTime())) {
      throw new OrganizationSettingsWorkflowError('UNCERTAIN', organizationSettingsError('UNCERTAIN', locale))
    }
    return result.data
  } catch (error) {
    if (error instanceof OrganizationSettingsWorkflowError) throw error
    throw new OrganizationSettingsWorkflowError('UNCERTAIN', organizationSettingsError('UNCERTAIN', locale))
  }
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

  return useMutation({
    retry: false,
    meta: { operation: 'update', entity: 'Organization Settings' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({
      organizationId,
      data,
      expectedUpdatedAt,
    }: {
      organizationId: string
      data: OrganizationSettingsMutationData
      expectedUpdatedAt: string
    }) => {
      return saveProfile(() => updateOrganizationSettings(organizationId, data, expectedUpdatedAt), organizationId, locale)
    },
    onSuccess: async (data, variables) => {
      await queryClient.cancelQueries({ queryKey: organizationQueryKeys.settings(variables.organizationId) })
      queryClient.setQueryData(organizationQueryKeys.settings(variables.organizationId), (previous: { canUpdate?: boolean } | undefined) => ({ ...data, canUpdate: previous?.canUpdate ?? false }))
      invalidateOrganizationQueries(queryClient, variables.organizationId)
    },
  })
}

// Hook for updating currency
export function useUpdateCurrency(locale: Locale = 'en') {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const copy = notificationCopy[locale]

  return useMutation({
    retry: false,
    meta: { operation: 'update', entity: 'Currency' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ organizationId, currency, expectedUpdatedAt }: { organizationId: string, currency: string, expectedUpdatedAt: string }) => {
      return saveProfile(() => updateOrganizationCurrency(organizationId, currency, expectedUpdatedAt), organizationId, locale)
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
    retry: false,
    meta: { operation: 'update', entity: 'Timezone' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ organizationId, timezone, expectedUpdatedAt }: { organizationId: string, timezone: string, expectedUpdatedAt: string }) => {
      return saveProfile(() => updateOrganizationTimezone(organizationId, timezone, expectedUpdatedAt), organizationId, locale)
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
