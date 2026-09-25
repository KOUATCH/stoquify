"use client"

import { getCustomers } from "@/actions/customers/customerAction2"
import {
  createCustomerAction,
  deleteCustomerAction,
  getCustomerAction,
  getCustomerOrdersAction,
  updateCustomerAction
} from "@/actions/customers/customerActions"
import type { ServerActionResult } from "@/lib/error-handling/types"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { Locale } from "@/types/bilingual"
import type { Customer, CustomerOrdersResult, CustomerWithStats } from "@/types/customerTypes"
import type { CustomerEditFormData, CustomerFormData } from "@/validations/customer"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

function unwrapResult<T>(result: ServerActionResult<T>): T {
  if (!result.success) {
    throw new Error(result.error?.userMessage || result.error?.message || "Customer request failed")
  }

  return result.data as T
}

// Fetch all customers
export function useCustomers() {
  return useQuery<CustomerWithStats[]>({
    queryKey: ["customers"],
    queryFn: async () => unwrapResult(await getCustomers()),
  })
}

// Fetch single customer
export function useCustomer(id: string) {
  return useQuery<Customer | null>({
    queryKey: ["customers", id],
    queryFn: async () => unwrapResult(await getCustomerAction(id)),
    enabled: !!id,
  })
}

// Fetch customer orders
export function useCustomerOrders(customerId: string) {
  return useQuery<CustomerOrdersResult>({
    queryKey: ["customers", customerId, "orders"],
    queryFn: async () => unwrapResult(await getCustomerOrdersAction(customerId)),
    enabled: !!customerId,
  })
}

// Create customer mutation
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: 'create', entity: 'Customer' },
    mutationFn: (data: CustomerFormData) => createCustomerAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}

// Update customer mutation
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: 'update', entity: 'Customer' },
    mutationFn: (data: CustomerEditFormData) => updateCustomerAction(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customers", variables.id] })
    },
  })
}

// Delete customer mutation
export function useDeleteCustomer(locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const copy = {
    en: {
      archived: "Customer archived",
      archiveBody: "The unused customer was removed from active customer lists.",
      deactivated: "Customer deactivated",
      deactivateBody: "The customer is inactive; its history remains available.",
      refresh: "The change was saved, but some views could not refresh. Refresh the customer list before trying another change.",
      failed: "Customer operation failed",
    },
    fr: {
      archived: "Client archivé",
      archiveBody: "Le client inutilisé a été retiré des listes actives.",
      deactivated: "Client désactivé",
      deactivateBody: "Le client est inactif ; son historique reste disponible.",
      refresh: "La modification a été enregistrée, mais certaines vues n’ont pas pu être actualisées. Actualisez la liste avant une autre modification.",
      failed: "Opération client échouée",
    },
  }[locale]

  return useMutation({
    meta: { operation: 'delete', entity: 'Customer', suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (id: string) => unwrapResult(await deleteCustomerAction(id)),
    onSuccess: async receipt => {
      const refreshes = await Promise.allSettled([["customers"], ["customer-management"]].map(async queryKey =>
        queryClient.invalidateQueries({ queryKey }, { throwOnError: true }),
      ))
      const title = receipt.mode === "deactivated" ? copy.deactivated : copy.archived
      if (receipt.cacheStatus === "deferred" || refreshes.some(result => result.status === "rejected")) {
        notifications.warning(title, copy.refresh)
      } else if (receipt.mode === "deactivated") {
        notifications.warning(title, copy.deactivateBody)
      } else {
        notifications.success(title, copy.archiveBody)
      }
    },
    onError: (error: Error) => {
      notifications.error(copy.failed, error.message || copy.failed)
    },
  })
}
