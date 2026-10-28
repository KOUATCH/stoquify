"use client"

import { notify } from "@/lib/notifications/notify"
import {
  getInventoryTransactions,
  getStockMovementSummary,
  reserveInventory,
} from "@/actions/inventory/inventoryMovementActions"
import type { TransactionType } from "@/types/inventoryMovementTypes"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
// ============================================================================
// QUERY KEYS
// ============================================================================
export const InventoryMovementKeys = {
  all: ["inventoryMovements"] as const,
  transactions: (organizationId: string, filters?: any) =>
    [...InventoryMovementKeys.all, "transactions", organizationId, filters] as const,
  summary: (organizationId: string, filters?: any) =>
    [...InventoryMovementKeys.all, "summary", organizationId, filters] as const,
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback
  if (typeof error === "string") return error
  if (typeof error === "object") {
    const details = error as { userMessage?: string; message?: string }
    return details.userMessage || details.message || fallback
  }
  return fallback
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch inventory transactions
 */
export function useInventoryTransactions(
  organizationId: string | undefined,
  filters?: {
    itemId?: string
    locationId?: string
    type?: TransactionType
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
) {
  return useQuery({
    queryKey: InventoryMovementKeys.transactions(organizationId!, filters),
    queryFn: async () => {
      const response = await getInventoryTransactions(organizationId!, filters)
      if (!response.success) throw new Error(getActionErrorMessage(response.error, "Failed to fetch inventory transactions"))
      return response.data ?? []
    },
    enabled: !!organizationId,
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch stock movement summary
 */
export function useStockMovementSummary(
  organizationId: string | undefined,
  filters?: {
    itemId?: string
    locationId?: string
    dateFrom?: string
    dateTo?: string
  },
) {
  return useQuery({
    queryKey: InventoryMovementKeys.summary(organizationId!, filters),
    queryFn: async () => {
      const response = await getStockMovementSummary({
        organizationId: organizationId!,
        itemId: filters?.itemId,
        locationId: filters?.locationId,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
      })
      if (!response.success) throw new Error(getActionErrorMessage(response.error, "Failed to fetch stock movement summary"))
      return response.data
    },
    enabled: !!organizationId,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to reserve inventory
 */
export function useInventoryReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: 'reserve', entity: 'Inventory', suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: ({
      itemId,
      locationId,
      quantity,
      reason,
      organizationId,
      expiresAt,
    }: {
      itemId: string
      locationId: string
      quantity: number
      reason: string
      organizationId: string
      expiresAt?: Date
    }) => reserveInventory(itemId, locationId, quantity, reason, organizationId, expiresAt),
    onSuccess: (response, variables) => {
      notify.success(response.data?.message || "Inventory reserved successfully")
      queryClient.invalidateQueries({ queryKey: InventoryMovementKeys.all })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to reserve inventory")
    },
  })
}
