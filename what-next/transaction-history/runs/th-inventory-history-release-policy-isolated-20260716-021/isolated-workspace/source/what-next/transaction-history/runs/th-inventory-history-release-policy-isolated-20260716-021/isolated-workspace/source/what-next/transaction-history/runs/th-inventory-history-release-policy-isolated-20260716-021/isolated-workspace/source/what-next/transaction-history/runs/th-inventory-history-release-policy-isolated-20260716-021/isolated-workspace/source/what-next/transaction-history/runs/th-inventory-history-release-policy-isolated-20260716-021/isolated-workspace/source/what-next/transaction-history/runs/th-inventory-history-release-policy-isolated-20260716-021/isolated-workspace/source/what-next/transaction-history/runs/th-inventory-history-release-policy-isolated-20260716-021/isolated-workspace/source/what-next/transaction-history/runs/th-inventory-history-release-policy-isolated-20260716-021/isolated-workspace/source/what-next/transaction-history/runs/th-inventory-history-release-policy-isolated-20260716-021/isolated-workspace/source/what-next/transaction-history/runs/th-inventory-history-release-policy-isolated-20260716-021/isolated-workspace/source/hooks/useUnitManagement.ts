"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import {
  createManagedUnit,
  deleteManagedUnit,
  getUnitManagementData,
  updateManagedUnit,
  type UnitManagementInput,
  type UnitManagementRow,
  type UnitRemovalResult,
} from "@/actions/units/unit-management-actions"
import { ItemKeys, UnitKeys } from "@/types/queryKeys"
import type { Locale } from "@/types/bilingual"

export const unitManagementKeys = {
  all: ["unit-management"] as const,
  dashboard: (organizationId: string) => [...unitManagementKeys.all, "dashboard", organizationId] as const,
}

const copy = {
  en: {
    createTitle: "Unit created",
    createBody: "The measurement unit is ready for item, purchasing, and sales workflows.",
    updateTitle: "Unit updated",
    updateBody: "The unit record and dependent pickers were refreshed.",
    deleteTitle: "Unit deleted",
    deleteBody: "The unused unit was removed from the catalog.",
    deactivateTitle: "Unit deactivated",
    deactivateBody: "The unit is still referenced by items, so it was deactivated to preserve history.",
    errorTitle: "Unit operation failed",
  },
  fr: {
    createTitle: "Unite creee",
    createBody: "L'unite de mesure est prete pour les articles, achats et ventes.",
    updateTitle: "Unite mise a jour",
    updateBody: "La fiche unite et les listes dependantes ont ete actualisees.",
    deleteTitle: "Unite supprimee",
    deleteBody: "L'unite inutilisee a ete retiree du catalogue.",
    deactivateTitle: "Unite desactivee",
    deactivateBody: "L'unite est encore referencee par des articles; elle a ete desactivee pour preserver l'historique.",
    errorTitle: "Operation unite echouee",
  },
} as const

function invalidateUnitQueries(queryClient: QueryClient, organizationId: string, unitId?: string) {
  queryClient.invalidateQueries({ queryKey: unitManagementKeys.dashboard(organizationId) })
  queryClient.invalidateQueries({ queryKey: UnitKeys.lists() })
  queryClient.invalidateQueries({ queryKey: UnitKeys.orgUnits(organizationId) })
  queryClient.invalidateQueries({ queryKey: UnitKeys.briefOrgUnits(organizationId) })
  queryClient.invalidateQueries({ queryKey: UnitKeys.completeOrgUnits(organizationId) })
  queryClient.invalidateQueries({ queryKey: ItemKeys.orgItems(organizationId) })
  queryClient.invalidateQueries({ queryKey: ItemKeys.briefOrgItems(organizationId) })
  queryClient.invalidateQueries({ queryKey: ItemKeys.completeOrgItems(organizationId) })
  queryClient.invalidateQueries({ queryKey: ["units"] })
  queryClient.invalidateQueries({ queryKey: ["orgUnits"] })
  queryClient.invalidateQueries({ queryKey: ["orgUnits", organizationId] })

  if (unitId) {
    queryClient.invalidateQueries({ queryKey: UnitKeys.detail(unitId) })
    queryClient.invalidateQueries({ queryKey: ["unit", unitId] })
  }
}

export function useUnitManagementData(organizationId: string) {
  return useQuery({
    queryKey: unitManagementKeys.dashboard(organizationId),
    queryFn: async () => {
      const result = await getUnitManagementData(organizationId)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch unit management data")
      }

      return result.data
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateManagedUnit(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "create", entity: "Managed Unit", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: UnitManagementInput) => {
      const result = await createManagedUnit(organizationId, data)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create unit")
      }

      return result.data
    },
    onSuccess: (unit?: UnitManagementRow) => {
      invalidateUnitQueries(queryClient, organizationId, unit?.id)
      notifications.success(t.createTitle, t.createBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useUpdateManagedUnit(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "update", entity: "Managed Unit", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: UnitManagementInput }) => {
      const result = await updateManagedUnit(organizationId, id, data)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update unit")
      }

      return result.data
    },
    onSuccess: (unit?: UnitManagementRow) => {
      invalidateUnitQueries(queryClient, organizationId, unit?.id)
      notifications.success(t.updateTitle, t.updateBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useDeleteManagedUnit(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "delete", entity: "Managed Unit", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (id: string) => {
      const result = await deleteManagedUnit(organizationId, id)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to remove unit")
      }

      return result.data
    },
    onSuccess: (result?: UnitRemovalResult) => {
      invalidateUnitQueries(queryClient, organizationId, result?.id)

      if (result?.mode === "deactivated") {
        notifications.warning(t.deactivateTitle, t.deactivateBody)
        return
      }

      notifications.success(t.deleteTitle, t.deleteBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}
