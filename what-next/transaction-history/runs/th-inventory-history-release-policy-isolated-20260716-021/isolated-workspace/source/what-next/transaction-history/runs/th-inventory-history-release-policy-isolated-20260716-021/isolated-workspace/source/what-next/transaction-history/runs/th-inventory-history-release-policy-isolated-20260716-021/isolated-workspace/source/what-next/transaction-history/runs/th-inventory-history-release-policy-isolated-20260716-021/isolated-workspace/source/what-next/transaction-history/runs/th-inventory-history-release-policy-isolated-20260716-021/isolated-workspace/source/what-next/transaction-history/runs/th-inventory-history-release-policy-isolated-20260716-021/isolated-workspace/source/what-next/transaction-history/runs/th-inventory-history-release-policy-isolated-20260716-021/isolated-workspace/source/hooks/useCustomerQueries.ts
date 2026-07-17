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
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: 'delete', entity: 'Customer' },
    mutationFn: (id: string) => deleteCustomerAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}
