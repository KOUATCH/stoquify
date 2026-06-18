"use client";

import { notify } from "@/lib/notifications/notify"
import {
  approvePurchaseOrder,
  bulkUpdatePurchaseOrderStatus,
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseOrder,
  deletePurchaseOrder,
  getOrgPurchaseOrderById,
  getOrgPurchaseOrders,
  getPurchaseOrdersSummary,
  GoodsReceiptPayload,
  receiveItems,
  submitPurchaseOrder,
  updatePurchaseOrder
} from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction";
import {
  GoodsReceiptWithRelations,
  getGoodsReceiptsForPurchaseOrder
} from "@/actions/purchaseOrderWorkflow/GoodsReceiptAndSummary";
import { CreatePurchaseOrderPayload, PaginatedPurchaseOrdersResponse, PurchaseOrderFilters, PurchaseOrderResponse, PurchaseOrderWithRelations, UpdatePurchaseOrderDTO } from "@/types/purchase-orders-system-types";
import type { PurchaseOrderStatus } from "@/services/purchase-order/purchase-order.schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
// Types
interface BulkDeletePurchaseOrdersResponseData {
  deletedCount: number;
  failedCount?: number;
  errors?: string[];
}

interface BaseMutationVariables {
  organizationId: string;
}

interface QueryError {
  message: string;
  code?: string;
  statusCode?: number;
}

// ============================================================================
// QUERY KEYS
// ============================================================================
export const purchaseOrderKeys = {
  all: ["purchase-orders"] as const,
  lists: () => [...purchaseOrderKeys.all, "list"] as const,
  list: (organizationId: string, filters?: Partial<PurchaseOrderFilters>) => [
    ...purchaseOrderKeys.lists(),
    organizationId,
    ...(filters ? [filters] : []),
  ] as const,
  details: () => [...purchaseOrderKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseOrderKeys.details(), id] as const,
  goodsReceipts: (purchaseOrderId: string) => [
    ...purchaseOrderKeys.detail(purchaseOrderId),
    "goods-receipts",
  ] as const,
  summary: (organizationId: string) => [
    ...purchaseOrderKeys.all,
    "summary",
    organizationId,
  ] as const,
} as const;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch a paginated list of purchase orders with optimized caching
 */
export function usePurchaseOrders(
  organizationId: string,
  filters?: Partial<PurchaseOrderFilters>,
) {
  const queryKey = useMemo(
    () => purchaseOrderKeys.list(organizationId, filters),
    [organizationId, filters],
  );

  return useQuery<PaginatedPurchaseOrdersResponse, QueryError>({
    queryKey,
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const result = await getOrgPurchaseOrders(organizationId, filters);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch purchase orders");
      }

      // Transform the result to match PaginatedPurchaseOrdersResponse if needed
      if ('data' in result && Array.isArray(result.data)) {
        return {
          data: result.data,
          pagination: {
            page: 1,
            limit: 20,
            total: result.data.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
            pageStart: 1,
          },
          filters: {
            organizationId: organizationId || "",
          },
        };
      }

      return result as unknown as PaginatedPurchaseOrdersResponse;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => {
      if (error?.statusCode === 404 || error?.statusCode === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch a single purchase order by ID with proper error handling
 */
export function usePurchaseOrderById(
  id: string | undefined,
  organizationId: string | undefined,
) {
  const queryKey = useMemo(
    () => (id ? purchaseOrderKeys.detail(id) : []),
    [id],
  );

  return useQuery<PurchaseOrderWithRelations, QueryError>({
    queryKey,
    queryFn: async () => {
      if (!id || !organizationId) {
        throw new Error("Purchase order ID and organization ID are required");
      }
      const result = await getOrgPurchaseOrderById(id, organizationId);
      return result as unknown as PurchaseOrderWithRelations;
    },
    enabled: !!id && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      if (error?.statusCode === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to fetch purchase orders summary with caching optimization
 */
export function usePurchaseOrdersSummary(organizationId: string | undefined) {
  const queryKey = useMemo(
    () => (organizationId ? purchaseOrderKeys.summary(organizationId) : []),
    [organizationId],
  );

  return useQuery<Awaited<ReturnType<typeof getPurchaseOrdersSummary>>, QueryError>({
    queryKey,
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      return await getPurchaseOrdersSummary(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: (failureCount, error) => {
      if (error?.statusCode === 404 || error?.statusCode === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to fetch goods receipts for a purchase order with optimized performance
 */
export function useGoodsReceiptsForPurchaseOrder(
  purchaseOrderId: string | undefined,
  organizationId: string | undefined,
) {
  const queryKey = useMemo(
    () => (purchaseOrderId ? purchaseOrderKeys.goodsReceipts(purchaseOrderId) : []),
    [purchaseOrderId],
  );

  return useQuery<GoodsReceiptWithRelations[], QueryError>({
    queryKey,
    queryFn: async () => {
      if (!purchaseOrderId || !organizationId) {
        throw new Error("Purchase order ID and organization ID are required");
      }
      const result = await getGoodsReceiptsForPurchaseOrder(purchaseOrderId, organizationId);
      return result as unknown as GoodsReceiptWithRelations[];
    },
    enabled: !!purchaseOrderId && !!organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: (failureCount, error) => {
      if (error?.statusCode === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Enhanced error handler for mutations
 */
const handleMutationError = (error: QueryError) => {
  const message = error?.message || "An unexpected error occurred";

  // Log error for debugging
  console.error("Purchase Order Mutation Error:", error);

  // Show user-friendly notification
  if (error?.statusCode === 403) {
    notify.error("You don't have permission to perform this action");
  } else if (error?.statusCode === 404) {
    notify.error("The requested resource was not found");
  } else if (error?.statusCode === 409) {
    notify.error("This action conflicts with the current state");
  } else {
    notify.error(message);
  }
};

/**
 * Enhanced base mutation options with improved cache invalidation
 */
const getBaseMutationOptions = <TData extends { data?: any; message?: string }>(
  queryClient: ReturnType<typeof useQueryClient>,
) => ({
  onSuccess: (data: TData, variables: BaseMutationVariables) => {
    // Show success message
    if (data?.message) {
      notify.success(data.message);
    }

    // Invalidate relevant queries with granular control
    const { organizationId } = variables;

    if (organizationId) {
      // Invalidate organization-specific queries
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrderKeys.summary(organizationId)
      });
    }

    // Invalidate specific item if available
    if (data?.data?.id) {
      queryClient.invalidateQueries({
        queryKey: purchaseOrderKeys.detail(data.data.id)
      });
      queryClient.invalidateQueries({
        queryKey: purchaseOrderKeys.goodsReceipts(data.data.id)
      });
    }
  },
  onError: handleMutationError,
});

/**
 * Hook to create a new purchase order with enhanced validation
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<PurchaseOrderWithRelations>,
    QueryError,
    CreatePurchaseOrderPayload & BaseMutationVariables
  >({
    meta: { operation: 'create', entity: 'Purchase Order' },
    mutationFn: async (payload) => {
      if (!payload.organizationId) {
        throw new Error("Organization ID is required");
      }
      return await createPurchaseOrder(payload);
    },
    ...getBaseMutationOptions(queryClient),
  });
}

/**
 * Hook to update an existing purchase order with optimistic updates
 */
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<PurchaseOrderWithRelations>,
    QueryError,
    UpdatePurchaseOrderDTO & BaseMutationVariables
  >({
    meta: { operation: 'update', entity: 'Purchase Order' },
    mutationFn: async (payload) => {
      if (!payload.id || !payload.organizationId) {
        throw new Error("Purchase order ID and organization ID are required");
      }
      return await updatePurchaseOrder(payload);
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: purchaseOrderKeys.detail(variables.id),
      });

      // Snapshot previous value
      const previousPO = queryClient.getQueryData(
        purchaseOrderKeys.detail(variables.id),
      );

      // Optimistically update
      if (previousPO) {
        queryClient.setQueryData(
          purchaseOrderKeys.detail(variables.id),
          (old: any) => ({ ...old, ...variables }),
        );
      }

      return { previousPO };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousPO' in context && context.previousPO) {
        queryClient.setQueryData(
          purchaseOrderKeys.detail(variables.id),
          context.previousPO,
        );
      }
      handleMutationError(error);
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: purchaseOrderKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Hook to delete a purchase order with confirmation
 */
export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<null>,
    QueryError,
    { id: string; organizationId: string }
  >({
    mutationFn: async ({ id, organizationId }) => {
      if (!id || !organizationId) {
        throw new Error("Purchase order ID and organization ID are required");
      }
      return await deletePurchaseOrder(id, organizationId);
    },
    onSuccess: (data, variables) => {
      // Remove from cache immediately
      queryClient.removeQueries({
        queryKey: purchaseOrderKeys.detail(variables.id),
      });
      queryClient.removeQueries({
        queryKey: purchaseOrderKeys.goodsReceipts(variables.id),
      });

      // Show success message
      notify.success(data?.message || "Purchase order deleted successfully");

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrderKeys.summary(variables.organizationId),
      });
    },
    onError: handleMutationError,
  });
}

/**
 * Hook to submit a purchase order for approval
 */
export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<PurchaseOrderWithRelations>,
    QueryError,
    { id: string; organizationId: string }
  >({
    mutationFn: async ({ id, organizationId }) => {
      if (!id || !organizationId) {
        throw new Error("Purchase order ID and organization ID are required");
      }
      return await submitPurchaseOrder(id, organizationId);
    },
    ...getBaseMutationOptions(queryClient),
  });
}

/**
 * Hook to approve a purchase order with enhanced validation
 */
export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<PurchaseOrderWithRelations>,
    QueryError,
    { id: string; organizationId: string; approvedBy?: string | null }
  >({
    mutationFn: async ({ id, organizationId, approvedBy }) => {
      if (!id || !organizationId) {
        throw new Error("Purchase order ID and organization ID are required");
      }
      return await approvePurchaseOrder(id, organizationId, approvedBy);
    },
    ...getBaseMutationOptions(queryClient),
  });
}

/**
 * Hook to cancel a purchase order with reason tracking
 */
export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<Pick<PurchaseOrderWithRelations, "id" | "orderNumber" | "status">>,
    QueryError,
    { id: string; organizationId: string; reason?: string }
  >({
    mutationFn: async ({ id, organizationId, reason }) => {
      if (!id || !organizationId) {
        throw new Error("Purchase order ID and organization ID are required");
      }
      return await cancelPurchaseOrder(id, organizationId, reason);
    },
    ...getBaseMutationOptions(queryClient),
  });
}

/**
 * Hook to close a purchase order with validation
 */
export function useClosePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<Pick<PurchaseOrderWithRelations, "id" | "orderNumber" | "status">>,
    QueryError,
    { id: string; organizationId: string }
  >({
    mutationFn: async ({ id, organizationId }) => {
      if (!id || !organizationId) {
        throw new Error("Purchase order ID and organization ID are required");
      }
      return await closePurchaseOrder(id, organizationId);
    },
    ...getBaseMutationOptions(queryClient),
  });
}

/**
 * Hook to receive items for a purchase order with validation
 */
export function useReceiveItems() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<PurchaseOrderWithRelations>,
    QueryError,
    GoodsReceiptPayload
  >({
    meta: { operation: 'receive', entity: 'Items' },
    mutationFn: async (payload) => {
      if (!payload.organizationId || !payload.id) {
        throw new Error("Organization ID and purchase order ID are required");
      }
      const result = await receiveItems(payload);
      if (!result.success) {
        throw new Error(result.error || "Failed to receive items");
      }
      return result;
    },
    onSuccess: (data, variables) => {
      // Additional cache invalidation for goods receipts
      if (variables.id) {
        queryClient.invalidateQueries({
          queryKey: purchaseOrderKeys.goodsReceipts(variables.id),
        });
      }

      // Use base mutation options
      const baseMutationOptions = getBaseMutationOptions(queryClient);
      baseMutationOptions.onSuccess(data, variables);
    },
    onError: handleMutationError,
  });
}

/**
 * Hook for bulk updating purchase order statuses with progress tracking
 */
export function useBulkUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<{ updated: string[]; failed: { id: string; error: string }[] }>,
    QueryError,
    {
      ids: string[];
      organizationId: string;
      newStatus: PurchaseOrderStatus;
      reason?: string;
    }
  >({
    mutationFn: async ({ ids, organizationId, newStatus, reason }) => {
      if (!ids?.length || !organizationId || !newStatus) {
        throw new Error("IDs, organization ID, and new status are required");
      }
      return await bulkUpdatePurchaseOrderStatus({
        organizationId,
        purchaseOrderIds: ids,
        toStatus: newStatus,
        reason,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate specific items that were updated
      variables.ids.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: purchaseOrderKeys.detail(id),
        });
      });

      // Show success message with count
      if (data?.data?.updated?.length) {
        notify.success(`Updated ${data.data.updated.length} purchase order(s)`);
      }

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrderKeys.summary(variables.organizationId),
      });
    },
    onError: handleMutationError,
  });
}

/**
 * Bulk delete implementation (since it's missing from actions)
 */
const bulkDeletePurchaseOrders = async (
  ids: string[],
  organizationId: string,
): Promise<PurchaseOrderResponse<BulkDeletePurchaseOrdersResponseData>> => {
  try {
    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await deletePurchaseOrder(id, organizationId);
        deletedCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Failed to delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      error: `Deleted ${deletedCount} purchase order(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      data: { deletedCount, failedCount, errors: errors.length > 0 ? errors : undefined },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bulk delete failed',
      data: { deletedCount: 0, failedCount: ids.length, errors: [error instanceof Error ? error.message : 'Unknown error'] },
    };
  }
};

/**
 * Hook for bulk deleting purchase orders with detailed feedback
 */
export function useBulkDeletePurchaseOrders() {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderResponse<BulkDeletePurchaseOrdersResponseData>,
    QueryError,
    { ids: string[]; organizationId: string }
  >({
    mutationFn: async ({ ids, organizationId }) => {
      if (!ids?.length || !organizationId) {
        throw new Error("IDs and organization ID are required");
      }
      return await bulkDeletePurchaseOrders(ids, organizationId);
    },
    onSuccess: (data, variables) => {
      // Remove deleted items from cache
      variables.ids.forEach((id) => {
        queryClient.removeQueries({
          queryKey: purchaseOrderKeys.detail(id),
        });
        queryClient.removeQueries({
          queryKey: purchaseOrderKeys.goodsReceipts(id),
        });
      });

      // Show detailed success message
      if (data?.data) {
        const { deletedCount, failedCount } = data.data;
        notify.success(
          `Deleted ${deletedCount} purchase order(s)${
            failedCount ? `, ${failedCount} failed` : ""
          }`,
        );
      }

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseOrderKeys.summary(variables.organizationId),
      });
    },
    onError: handleMutationError,
  });
}

// ============================================================================
// COMBINED PURCHASE ORDER ACTIONS HOOK
// ============================================================================

/**
 * Combined hook providing all purchase order mutation actions with centralized state management
 */
export function usePurchaseOrderActions() {
  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();
  const deleteMutation = useDeletePurchaseOrder();
  const submitMutation = useSubmitPurchaseOrder();
  const approveMutation = useApprovePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const closeMutation = useClosePurchaseOrder();
  const receiveItemsMutation = useReceiveItems();
  const bulkUpdateMutation = useBulkUpdatePurchaseOrderStatus();
  const bulkDeleteMutation = useBulkDeletePurchaseOrders();

  // Memoized loading state
  const isLoading = useMemo(
    () =>
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      submitMutation.isPending ||
      approveMutation.isPending ||
      cancelMutation.isPending ||
      closeMutation.isPending ||
      receiveItemsMutation.isPending ||
      bulkUpdateMutation.isPending ||
      bulkDeleteMutation.isPending,
    [
      createMutation.isPending,
      updateMutation.isPending,
      deleteMutation.isPending,
      submitMutation.isPending,
      approveMutation.isPending,
      cancelMutation.isPending,
      closeMutation.isPending,
      receiveItemsMutation.isPending,
      bulkUpdateMutation.isPending,
      bulkDeleteMutation.isPending,
    ],
  );

  // Memoized error state (returns first error encountered)
  const error = useMemo(
    () =>
      createMutation.error ||
      updateMutation.error ||
      deleteMutation.error ||
      submitMutation.error ||
      approveMutation.error ||
      cancelMutation.error ||
      closeMutation.error ||
      receiveItemsMutation.error ||
      bulkUpdateMutation.error ||
      bulkDeleteMutation.error,
    [
      createMutation.error,
      updateMutation.error,
      deleteMutation.error,
      submitMutation.error,
      approveMutation.error,
      cancelMutation.error,
      closeMutation.error,
      receiveItemsMutation.error,
      bulkUpdateMutation.error,
      bulkDeleteMutation.error,
    ],
  );

  // Enhanced action functions with better error handling
  const actions = useMemo(
    () => ({
      createPO: createMutation.mutate,
      updatePO: updateMutation.mutate,
      deletePO: deleteMutation.mutate,
      submitPO: submitMutation.mutate,
      approvePO: approveMutation.mutate,
      cancelPO: cancelMutation.mutate,
      closePO: closeMutation.mutate,
      receiveItemsPO: receiveItemsMutation.mutate,
      bulkUpdateStatus: bulkUpdateMutation.mutate,
      bulkDelete: bulkDeleteMutation.mutate,
    }),
    [
      createMutation.mutate,
      updateMutation.mutate,
      deleteMutation.mutate,
      submitMutation.mutate,
      approveMutation.mutate,
      cancelMutation.mutate,
      closeMutation.mutate,
      receiveItemsMutation.mutate,
      bulkUpdateMutation.mutate,
      bulkDeleteMutation.mutate,
    ],
  );

  return {
    // Actions
    ...actions,

    // Individual loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSubmitting: submitMutation.isPending,
    isApproving: approveMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isClosing: closeMutation.isPending,
    isReceiving: receiveItemsMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,

    // Combined loading state
    isLoading,

    // Individual errors
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    submitError: submitMutation.error,
    approveError: approveMutation.error,
    cancelError: cancelMutation.error,
    closeError: closeMutation.error,
    receiveError: receiveItemsMutation.error,
    bulkUpdateError: bulkUpdateMutation.error,
    bulkDeleteError: bulkDeleteMutation.error,

    // Combined error state
    error,

    // Success states for optimistic UI
    isCreateSuccess: createMutation.isSuccess,
    isUpdateSuccess: updateMutation.isSuccess,
    isDeleteSuccess: deleteMutation.isSuccess,
    isSubmitSuccess: submitMutation.isSuccess,
    isApproveSuccess: approveMutation.isSuccess,
    isCancelSuccess: cancelMutation.isSuccess,
    isCloseSuccess: closeMutation.isSuccess,
    isReceiveSuccess: receiveItemsMutation.isSuccess,
    isBulkUpdateSuccess: bulkUpdateMutation.isSuccess,
    isBulkDeleteSuccess: bulkDeleteMutation.isSuccess,

    // Reset functions for clearing errors
    resetCreateError: createMutation.reset,
    resetUpdateError: updateMutation.reset,
    resetDeleteError: deleteMutation.reset,
    resetSubmitError: submitMutation.reset,
    resetApproveError: approveMutation.reset,
    resetCancelError: cancelMutation.reset,
    resetCloseError: closeMutation.reset,
    resetReceiveError: receiveItemsMutation.reset,
    resetBulkUpdateError: bulkUpdateMutation.reset,
    resetBulkDeleteError: bulkDeleteMutation.reset,
  };
}

// ============================================================================
// PURCHASE ORDER FILTERS HOOK
// ============================================================================

/**
 * Valid purchase order statuses for filtering
 */
const VALID_PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;

/**
 * Valid sort fields for purchase orders
 */
const VALID_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "orderNumber",
  "status",
  "total",
  "expectedDeliveryDate",
] as const;

type PurchaseOrderSortField = (typeof VALID_SORT_FIELDS)[number];

/**
 * Enhanced hook for managing purchase order filters with type safety and validation
 */
export function usePurchaseOrderFilters(organizationId?: string): PurchaseOrderFilters {
  const searchParams = useSearchParams();

  // Helper functions for parsing and validation
  const parseStatus = useCallback((statusParam: string | null): PurchaseOrderStatus | undefined => {
    if (!statusParam) return undefined;
    return VALID_PURCHASE_ORDER_STATUSES.includes(statusParam as PurchaseOrderStatus)
      ? (statusParam as PurchaseOrderStatus)
      : undefined;
  }, []);

  const parseNumber = useCallback((value: string | null): number | undefined => {
    if (!value) return undefined;
    const parsed = Number(value);
    return isNaN(parsed) || parsed < 0 ? undefined : parsed;
  }, []);

  const parsePositiveInteger = useCallback((value: string | null, defaultValue: number): number => {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
  }, []);

  const parseSortField = useCallback((value: string | null): PurchaseOrderSortField => {
    if (!value) return "createdAt";
    return VALID_SORT_FIELDS.includes(value as PurchaseOrderSortField) ? (value as PurchaseOrderSortField) : "createdAt";
  }, []);

  const parseSortOrder = useCallback((value: string | null): "asc" | "desc" => {
    return value === "asc" ? "asc" : "desc";
  }, []);

  const parseDate = useCallback((value: string | null): string | undefined => {
    if (!value) return undefined;

    // Basic date validation
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : value;
  }, []);

  // Memoized filters with comprehensive validation
  const filters = useMemo((): PurchaseOrderFilters => {
    const params = new URLSearchParams(searchParams.toString());

    // Extract and validate search params
    const search = params.get("search")?.trim() || undefined;
    const status = parseStatus(params.get("status"));
    const supplierId = params.get("supplierId")?.trim() || undefined;
    const locationId = params.get("locationId")?.trim() || undefined;
    const createdBy = params.get("createdBy")?.trim() || undefined;

    // Date filters with validation
    const dateFrom = parseDate(params.get("dateFrom"));
    const dateTo = parseDate(params.get("dateTo"));
    const expectedDeliveryFrom = parseDate(params.get("expectedDeliveryFrom"));
    const expectedDeliveryTo = parseDate(params.get("expectedDeliveryTo"));

    // Numeric filters with validation
    const minTotal = parseNumber(params.get("minTotal"));
    const maxTotal = parseNumber(params.get("maxTotal"));

    // Pagination and sorting
    const page = parsePositiveInteger(params.get("page"), 1);
    const limit = parsePositiveInteger(params.get("limit"), 20);
    const sortBy = parseSortField(params.get("sortBy"));
    const sortOrder = parseSortOrder(params.get("sortOrder"));

    // Validate date ranges
    let validDateFrom = dateFrom;
    let validDateTo = dateTo;
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      validDateFrom = undefined;
      validDateTo = undefined;
    }

    let validExpectedDeliveryFrom = expectedDeliveryFrom;
    let validExpectedDeliveryTo = expectedDeliveryTo;
    if (expectedDeliveryFrom && expectedDeliveryTo && new Date(expectedDeliveryFrom) > new Date(expectedDeliveryTo)) {
      validExpectedDeliveryFrom = undefined;
      validExpectedDeliveryTo = undefined;
    }

    // Validate total ranges
    let validMinTotal = minTotal;
    let validMaxTotal = maxTotal;
    if (minTotal !== undefined && maxTotal !== undefined && minTotal > maxTotal) {
      validMinTotal = undefined;
      validMaxTotal = undefined;
    }

    return {
      organizationId: organizationId || "",
      search,
      status,
      supplierId,
      locationId,
      dateFrom: validDateFrom,
      dateTo: validDateTo,
      expectedDeliveryFrom: validExpectedDeliveryFrom,
      expectedDeliveryTo: validExpectedDeliveryTo,
      minTotal: validMinTotal,
      maxTotal: validMaxTotal,
      createdBy,
      page,
      limit: Math.min(limit, 100), // Cap limit at 100 for performance
      sortBy,
      sortOrder,
    };
  }, [
    searchParams,
    organizationId,
    parseStatus,
    parseNumber,
    parsePositiveInteger,
    parseSortField,
    parseSortOrder,
    parseDate,
  ]);

  return filters;
}

/**
 * Hook to check if any filters are currently active (excluding pagination)
 */
export function useHasActiveFilters(organizationId?: string): boolean {
  const filters = usePurchaseOrderFilters(organizationId);

  return useMemo(() => {
    return !!(
      filters.search ||
      filters.status ||
      filters.supplierId ||
      filters.locationId ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.expectedDeliveryFrom ||
      filters.expectedDeliveryTo ||
      filters.minTotal !== undefined ||
      filters.maxTotal !== undefined ||
      filters.createdBy ||
      filters.sortBy !== "createdAt" ||
      filters.sortOrder !== "desc"
    );
  }, [filters]);
}
