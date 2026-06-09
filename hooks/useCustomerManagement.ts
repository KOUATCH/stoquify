"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import {
  createManagedCustomer,
  deleteManagedCustomer,
  getCustomerAnalyticsData,
  getCustomerManagementData,
  updateManagedCustomer,
  type CustomerDetailAnalytics,
  type CustomerManagementInput,
  type CustomerManagementRow,
  type CustomerRemovalResult,
} from "@/actions/customers/customer-management-actions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { Locale } from "@/types/bilingual"
import { CustomerKeys } from "@/types/queryKeys"

export const customerManagementKeys = {
  all: ["customer-management"] as const,
  dashboard: (organizationId: string) =>
    [...customerManagementKeys.all, "dashboard", organizationId] as const,
  analytics: (organizationId: string, customerId: string) =>
    [...customerManagementKeys.all, "analytics", organizationId, customerId] as const,
}

const copy = {
  en: {
    createTitle: "Customer created",
    createBody: "The customer is ready for POS, sales orders, receipts, and receivables.",
    updateTitle: "Customer updated",
    updateBody: "The customer record and dependent sales views were refreshed.",
    archiveTitle: "Customer archived",
    archiveBody: "The unused customer was removed from active customer lists.",
    deactivateTitle: "Customer deactivated",
    deactivateBody: "The customer has history, so it was deactivated to preserve records.",
    errorTitle: "Customer operation failed",
  },
  fr: {
    createTitle: "Client cree",
    createBody: "Le client est pret pour POS, commandes, recus et creances.",
    updateTitle: "Client mis a jour",
    updateBody: "La fiche client et les vues de vente dependantes ont ete actualisees.",
    archiveTitle: "Client archive",
    archiveBody: "Le client inutilise a ete retire des listes actives.",
    deactivateTitle: "Client desactive",
    deactivateBody: "Le client a de l'historique; il a ete desactive pour preserver les donnees.",
    errorTitle: "Operation client echouee",
  },
} as const

function invalidateCustomerQueries(queryClient: QueryClient, organizationId: string, customerId?: string) {
  queryClient.invalidateQueries({ queryKey: customerManagementKeys.dashboard(organizationId) })
  queryClient.invalidateQueries({ queryKey: CustomerKeys.lists() })
  queryClient.invalidateQueries({ queryKey: CustomerKeys.orgCustomers(organizationId) })
  queryClient.invalidateQueries({ queryKey: CustomerKeys.briefOrgCustomers(organizationId) })
  queryClient.invalidateQueries({ queryKey: CustomerKeys.completeOrgCustomers(organizationId) })
  queryClient.invalidateQueries({ queryKey: ["customers"] })
  queryClient.invalidateQueries({ queryKey: ["orgCustomers"] })
  queryClient.invalidateQueries({ queryKey: ["orgCustomers", organizationId] })

  if (customerId) {
    queryClient.invalidateQueries({ queryKey: CustomerKeys.detail(customerId) })
    queryClient.invalidateQueries({ queryKey: customerManagementKeys.analytics(organizationId, customerId) })
    queryClient.invalidateQueries({ queryKey: ["customers", customerId] })
    queryClient.invalidateQueries({ queryKey: ["customer", customerId] })
  }
}

export function useCustomerManagementData(organizationId: string) {
  return useQuery({
    queryKey: customerManagementKeys.dashboard(organizationId),
    queryFn: async () => {
      const result = await getCustomerManagementData(organizationId)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch customer management data")
      }

      return result.data
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCustomerAnalyticsData(
  organizationId: string,
  customerId: string | null,
) {
  return useQuery<CustomerDetailAnalytics>({
    queryKey: customerManagementKeys.analytics(organizationId, customerId ?? ""),
    queryFn: async () => {
      const result = await getCustomerAnalyticsData(organizationId, customerId ?? "")

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch customer analytics")
      }

      return result.data
    },
    enabled: !!organizationId && !!customerId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateManagedCustomer(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "create", entity: "Managed Customer", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: CustomerManagementInput) => {
      const result = await createManagedCustomer(organizationId, data)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create customer")
      }

      return result.data
    },
    onSuccess: (customer?: CustomerManagementRow) => {
      invalidateCustomerQueries(queryClient, organizationId, customer?.id)
      notifications.success(t.createTitle, t.createBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useUpdateManagedCustomer(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "update", entity: "Managed Customer", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: CustomerManagementInput }) => {
      const result = await updateManagedCustomer(organizationId, id, data)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update customer")
      }

      return result.data
    },
    onSuccess: (customer?: CustomerManagementRow) => {
      invalidateCustomerQueries(queryClient, organizationId, customer?.id)
      notifications.success(t.updateTitle, t.updateBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useDeleteManagedCustomer(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "delete", entity: "Managed Customer", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (id: string) => {
      const result = await deleteManagedCustomer(organizationId, id)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to archive customer")
      }

      return result.data
    },
    onSuccess: (result?: CustomerRemovalResult) => {
      invalidateCustomerQueries(queryClient, organizationId, result?.id)

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
