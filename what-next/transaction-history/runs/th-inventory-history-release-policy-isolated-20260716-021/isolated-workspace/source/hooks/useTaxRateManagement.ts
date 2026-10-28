"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import {
  createManagedTaxRate,
  deleteManagedTaxRate,
  getTaxRateManagementData,
  updateManagedTaxRate,
  type TaxRateManagementInput,
  type TaxRateManagementRow,
  type TaxRateRemovalResult,
} from "@/actions/taxRate/tax-rate-management-actions"
import { ItemKeys, TaxRateKeys } from "@/types/queryKeys"
import type { Locale } from "@/types/bilingual"

export const taxRateManagementKeys = {
  all: ["tax-rate-management"] as const,
  dashboard: (organizationId: string) => [...taxRateManagementKeys.all, "dashboard", organizationId] as const,
}

const copy = {
  en: {
    createTitle: "Tax rate created",
    createBody: "The tax rate is ready for item, pricing, sales, and purchasing workflows.",
    updateTitle: "Tax rate updated",
    updateBody: "The tax rate record and dependent item pickers were refreshed.",
    deleteTitle: "Tax rate deleted",
    deleteBody: "The unused tax rate was removed from the catalog.",
    deactivateTitle: "Tax rate deactivated",
    deactivateBody: "The tax rate is still referenced by items, so it was deactivated to preserve history.",
    errorTitle: "Tax rate operation failed",
  },
  fr: {
    createTitle: "Taux de taxe cree",
    createBody: "Le taux est pret pour les articles, prix, ventes et achats.",
    updateTitle: "Taux de taxe mis a jour",
    updateBody: "Le taux et les listes dependantes ont ete actualises.",
    deleteTitle: "Taux de taxe supprime",
    deleteBody: "Le taux inutilise a ete retire du catalogue.",
    deactivateTitle: "Taux de taxe desactive",
    deactivateBody: "Le taux est encore reference par des articles; il a ete desactive pour preserver l'historique.",
    errorTitle: "Operation taux de taxe echouee",
  },
} as const

function invalidateTaxRateQueries(queryClient: QueryClient, organizationId: string, taxRateId?: string) {
  queryClient.invalidateQueries({ queryKey: taxRateManagementKeys.dashboard(organizationId) })
  queryClient.invalidateQueries({ queryKey: TaxRateKeys.lists() })
  queryClient.invalidateQueries({ queryKey: TaxRateKeys.orgTaxRates(organizationId) })
  queryClient.invalidateQueries({ queryKey: TaxRateKeys.briefOrgTaxRates(organizationId) })
  queryClient.invalidateQueries({ queryKey: TaxRateKeys.completeOrgTaxRates(organizationId) })
  queryClient.invalidateQueries({ queryKey: ItemKeys.orgItems(organizationId) })
  queryClient.invalidateQueries({ queryKey: ItemKeys.briefOrgItems(organizationId) })
  queryClient.invalidateQueries({ queryKey: ItemKeys.completeOrgItems(organizationId) })
  queryClient.invalidateQueries({ queryKey: ["taxRates"] })
  queryClient.invalidateQueries({ queryKey: ["orgTaxRates"] })
  queryClient.invalidateQueries({ queryKey: ["orgTaxRates", organizationId] })

  if (taxRateId) {
    queryClient.invalidateQueries({ queryKey: TaxRateKeys.detail(taxRateId) })
    queryClient.invalidateQueries({ queryKey: ["taxRate", taxRateId] })
  }
}

export function useTaxRateManagementData(organizationId: string) {
  return useQuery({
    queryKey: taxRateManagementKeys.dashboard(organizationId),
    queryFn: async () => {
      const result = await getTaxRateManagementData(organizationId)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch tax rate management data")
      }

      return result.data
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateManagedTaxRate(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "create", entity: "Managed Tax Rate", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: TaxRateManagementInput) => {
      const result = await createManagedTaxRate(organizationId, data)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create tax rate")
      }

      return result.data
    },
    onSuccess: (taxRate?: TaxRateManagementRow) => {
      invalidateTaxRateQueries(queryClient, organizationId, taxRate?.id)
      notifications.success(t.createTitle, t.createBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useUpdateManagedTaxRate(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "update", entity: "Managed Tax Rate", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: TaxRateManagementInput }) => {
      const result = await updateManagedTaxRate(organizationId, id, data)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update tax rate")
      }

      return result.data
    },
    onSuccess: (taxRate?: TaxRateManagementRow) => {
      invalidateTaxRateQueries(queryClient, organizationId, taxRate?.id)
      notifications.success(t.updateTitle, t.updateBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useDeleteManagedTaxRate(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "delete", entity: "Managed Tax Rate", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (id: string) => {
      const result = await deleteManagedTaxRate(organizationId, id)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to remove tax rate")
      }

      return result.data
    },
    onSuccess: (result?: TaxRateRemovalResult) => {
      invalidateTaxRateQueries(queryClient, organizationId, result?.id)

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
