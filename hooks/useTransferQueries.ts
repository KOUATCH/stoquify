"use client"

import {
  createLocationTransfer,
  approveTransfer,
  getTransfers,
} from "@/actions/inventory/inventoryMovementActions"
import type { CreateTransferPayload, LocationTransferDTO, TransferStatus } from "@/types/inventoryMovementTypes"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { useTranslations } from "next-intl"
import { getTransferDetail } from "@/actions/inventory/transferLifecycleActions"
import { getModuleOperationErrorReason } from "@/lib/modules/module-operation-error"

type TransferFilters = {
  search?: string
  awaitingReceipt?: boolean
  status?: TransferStatus
  fromLocationId?: string
  toLocationId?: string
  page?: number
  limit?: number
}

type TransfersActionData = {
  transfers: LocationTransferDTO[]
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean }
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
  const query = useQuery<TransfersActionData>({
    queryKey: TransferKeys.list(organizationId!, filters),
    queryFn: async () => {
      const response = await getTransfers({ organizationId: organizationId!, filters })

      if (!response.success) {
        throw new Error(actionErrorMessage(response.error, "Failed to fetch transfers"))
      }

      return response.data as TransfersActionData
    },
    enabled: !!organizationId,
    placeholderData: (previousData) => previousData,
  })
  return { ...query, data: query.data?.transfers, pagination: query.data?.pagination }
}

/**
 * Hook to fetch a single transfer
 */
export function useTransfer(transferId: string | undefined, organizationId: string | undefined) {
  return useQuery<LocationTransferDTO | null>({
    queryKey: TransferKeys.detail(transferId!, organizationId!),
    queryFn: async () => {
      const response = await getTransferDetail({ organizationId: organizationId!, transferId: transferId! })

      if (!response.success) {
        throw new Error(actionErrorMessage(response.error, "Failed to fetch transfer"))
      }

      return response.data?.transfer ?? null
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
export function useCreateTransfer(options: { inlineStoppedWork?: boolean } = {}) {
  const queryClient = useQueryClient()
  const { formSuccess, formError, error: notifyError } = useNotifications()
  const t = useTranslations("moduleComposition.stop")

  return useMutation({
    meta: { operation: 'create', entity: 'Transfer', suppressErrorNotification: true },
    mutationFn: async (data: CreateTransferPayload) => {
      const response = await createLocationTransfer({ data })

      if (!response.success) {
        const reason = getModuleOperationErrorReason(response.error)
        if (reason) throw Object.assign(new Error(t("deniedMessage")), { code: "FORBIDDEN", reason })
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
      if (getModuleOperationErrorReason(error)) {
        if (!options.inlineStoppedWork) notifyError(t("deniedTitle"), error.message)
      }
      else formError("Create Transfer", error.message || "Failed to create transfer")
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
