"use client"

import {
  createLocationTransfer,
  approveTransfer,
  getTransfers,
} from "@/actions/inventory/inventoryMovementActions"
import type { CreateTransferPayload, LocationTransferDTO, TransferStatus } from "@/types/inventoryMovementTypes"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNotifications } from "@/components/notifications/NotificationProvider"

type TransferFilters = {
  search?: string
  status?: TransferStatus
  fromLocationId?: string
  toLocationId?: string
  page?: number
  limit?: number
}

type TransfersActionData = {
  transfers: LocationTransferDTO[]
}

type TransferMutationData = {
  transfer?: LocationTransferDTO
  result?: LocationTransferDTO
  message?: string
}

function actionErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const maybeError = error as { userMessage?: string; message?: string }
    return maybeError.userMessage || maybeError.message || fallback
  }

  return fallback
}

// ============================================================================
// QUERY KEYS
// ============================================================================
export const TransferKeys = {
  all: ["transfers"] as const,
  lists: () => [...TransferKeys.all, "list"] as const,
  list: (organizationId: string, filters?: TransferFilters) => [...TransferKeys.lists(), organizationId, filters] as const,
  details: () => [...TransferKeys.all, "detail"] as const,
  detail: (id: string, organizationId: string) => [...TransferKeys.details(), id, organizationId] as const,
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch transfers with filters
 */
export function useTransfers(
  organizationId: string | undefined,
  filters?: TransferFilters,
) {
  return useQuery<LocationTransferDTO[]>({
    queryKey: TransferKeys.list(organizationId!, filters),
    queryFn: async () => {
      const response = await getTransfers({ organizationId: organizationId!, filters })

      if (!response.success) {
        throw new Error(actionErrorMessage(response.error, "Failed to fetch transfers"))
      }

      return ((response.data as TransfersActionData | undefined)?.transfers ?? []) as LocationTransferDTO[]
    },
    enabled: !!organizationId,
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch a single transfer
 */
export function useTransfer(transferId: string | undefined, organizationId: string | undefined) {
  return useQuery<LocationTransferDTO | null>({
    queryKey: TransferKeys.detail(transferId!, organizationId!),
    queryFn: async () => {
      const response = await getTransfers({ organizationId: organizationId!, filters: { limit: 100 } })

      if (!response.success) {
        throw new Error(actionErrorMessage(response.error, "Failed to fetch transfer"))
      }

      const transfers = (response.data as TransfersActionData | undefined)?.transfers ?? []
      return transfers.find((transfer) => transfer.id === transferId) ?? null
    },
    enabled: !!transferId && !!organizationId,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new transfer
 */
export function useCreateTransfer() {
  const queryClient = useQueryClient()
  const { formSuccess, formError } = useNotifications()

  return useMutation({
    meta: { operation: 'create', entity: 'Transfer' },
    mutationFn: async (data: CreateTransferPayload) => {
      const response = await createLocationTransfer({ data })

      if (!response.success) {
        throw new Error(actionErrorMessage(response.error, "Failed to create transfer"))
      }

      return response.data as TransferMutationData | undefined
    },
    onSuccess: (response) => {
      formSuccess("Create Transfer", response?.message || "Transfer created and is ready for approval")
      queryClient.invalidateQueries({ queryKey: TransferKeys.all })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
    onError: (error: Error) => {
      formError("Create Transfer", error.message || "Failed to create transfer")
    },
  })
}

/**
 * Hook to approve a transfer
 */
export function useApproveTransfer() {
  const queryClient = useQueryClient()
  const { formSuccess, formError } = useNotifications()

  return useMutation({
    meta: { operation: 'approve', entity: 'Transfer' },
    mutationFn: async ({
      transferId,
      organizationId,
      approvedById,
    }: {
      transferId: string
      organizationId: string
      approvedById: string
    }) => {
      const response = await approveTransfer({ transferId, organizationId, approvedById })

      if (!response.success) {
        throw new Error(actionErrorMessage(response.error, "Failed to approve transfer"))
      }

      return response.data as TransferMutationData | undefined
    },
    onSuccess: (response, variables) => {
      formSuccess("Approve Transfer", response?.message || "Transfer approved and is ready for execution")
      queryClient.invalidateQueries({ queryKey: TransferKeys.all })
      queryClient.invalidateQueries({ queryKey: TransferKeys.detail(variables.transferId, variables.organizationId) })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
    onError: (error: Error) => {
      formError("Approve Transfer", error.message || "Failed to approve transfer")
    },
  })
}
