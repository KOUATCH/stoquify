"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import {
  createManagedSupplier,
  deleteManagedSupplier,
  getSupplierAnalyticsData,
  getSupplierManagementData,
  updateManagedSupplier,
  type SupplierDetailAnalytics,
  type SupplierManagementInput,
  type SupplierManagementRow,
  type SupplierRemovalResult,
} from "@/actions/suppliers/supplier-management-actions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { Locale } from "@/types/bilingual"
import { ItemKeys, SupplierKeys } from "@/types/queryKeys"

export const supplierManagementKeys = {
  all: ["supplier-management"] as const,
  dashboard: (organizationId: string) =>
    [...supplierManagementKeys.all, "dashboard", organizationId] as const,
  analytics: (organizationId: string, supplierId: string) =>
    [...supplierManagementKeys.all, "analytics", organizationId, supplierId] as const,
}

const copy = {
  en: {
    createTitle: "Supplier created",
    createBody: "The supplier is ready for item links, purchase orders, and payable workflows.",
    updateTitle: "Supplier updated",
    updateBody: "The supplier record and dependent purchasing views were refreshed.",
    archiveTitle: "Supplier archived",
    archiveBody: "The unused supplier was removed from active purchasing lists.",
    deactivateTitle: "Supplier deactivated",
    deactivateBody: "The supplier has history, so it was deactivated to preserve records.",
    errorTitle: "Supplier operation failed",
  },
  fr: {
    createTitle: "Fournisseur cree",
    createBody: "Le fournisseur est pret pour les articles, commandes d'achat et dettes.",
    updateTitle: "Fournisseur mis a jour",
    updateBody: "La fiche fournisseur et les vues d'achat dependantes ont ete actualisees.",
    archiveTitle: "Fournisseur archive",
    archiveBody: "Le fournisseur inutilise a ete retire des listes actives.",
    deactivateTitle: "Fournisseur desactive",
    deactivateBody: "Le fournisseur a de l'historique; il a ete desactive pour preserver les donnees.",
    errorTitle: "Operation fournisseur echouee",
  },
} as const

function invalidateSupplierQueries(queryClient: QueryClient, organizationId: string, supplierId?: string) {
  queryClient.invalidateQueries({ queryKey: supplierManagementKeys.dashboard(organizationId) })
  queryClient.invalidateQueries({ queryKey: SupplierKeys.lists() })
  queryClient.invalidateQueries({ queryKey: SupplierKeys.orgSuppliers(organizationId) })
  queryClient.invalidateQueries({ queryKey: SupplierKeys.briefOrgSuppliers(organizationId) })
  queryClient.invalidateQueries({ queryKey: SupplierKeys.completeOrgSuppliers(organizationId) })
  queryClient.invalidateQueries({ queryKey: ItemKeys.orgItems(organizationId) })
  queryClient.invalidateQueries({ queryKey: ItemKeys.briefOrgItems(organizationId) })
  queryClient.invalidateQueries({ queryKey: ItemKeys.completeOrgItems(organizationId) })
  queryClient.invalidateQueries({ queryKey: ["suppliers"] })
  queryClient.invalidateQueries({ queryKey: ["orgSuppliers"] })
  queryClient.invalidateQueries({ queryKey: ["orgSuppliers", organizationId] })

  if (supplierId) {
    queryClient.invalidateQueries({ queryKey: SupplierKeys.detail(supplierId) })
    queryClient.invalidateQueries({ queryKey: supplierManagementKeys.analytics(organizationId, supplierId) })
    queryClient.invalidateQueries({ queryKey: ["supplier", supplierId] })
  }
}

export function useSupplierManagementData(organizationId: string) {
  return useQuery({
    queryKey: supplierManagementKeys.dashboard(organizationId),
    queryFn: async () => {
      const result = await getSupplierManagementData(organizationId)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch supplier management data")
      }

      return result.data
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useSupplierAnalyticsData(
  organizationId: string,
  supplierId: string | null,
) {
  return useQuery<SupplierDetailAnalytics>({
    queryKey: supplierManagementKeys.analytics(organizationId, supplierId ?? ""),
    queryFn: async () => {
      const result = await getSupplierAnalyticsData(organizationId, supplierId ?? "")

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch supplier analytics")
      }

      return result.data
    },
    enabled: !!organizationId && !!supplierId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateManagedSupplier(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "create", entity: "Managed Supplier", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: SupplierManagementInput) => {
      const result = await createManagedSupplier(organizationId, data)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create supplier")
      }

      return result.data
    },
    onSuccess: (supplier?: SupplierManagementRow) => {
      invalidateSupplierQueries(queryClient, organizationId, supplier?.id)
      notifications.success(t.createTitle, t.createBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useUpdateManagedSupplier(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "update", entity: "Managed Supplier", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: SupplierManagementInput }) => {
      const result = await updateManagedSupplier(organizationId, id, data)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update supplier")
      }

      return result.data
    },
    onSuccess: (supplier?: SupplierManagementRow) => {
      invalidateSupplierQueries(queryClient, organizationId, supplier?.id)
      notifications.success(t.updateTitle, t.updateBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useDeleteManagedSupplier(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "delete", entity: "Managed Supplier", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (id: string) => {
      const result = await deleteManagedSupplier(organizationId, id)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to archive supplier")
      }

      return result.data
    },
    onSuccess: (result?: SupplierRemovalResult) => {
      invalidateSupplierQueries(queryClient, organizationId, result?.id)

      if (result?.mode === "deactivated") {
        notifications.warning(t.deactivateTitle, t.deactivateBody)
        return
      }

      notifications.success(t.archiveTitle, t.archiveBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}
