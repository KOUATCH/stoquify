"use client"

import { notify } from "@/lib/notifications/notify"
import {
  getItemSuppliers,
  getItemSupplierById,
  getAllOrgItemSuppliers,
  getItemSuppliersByItemId,
  createItemSupplier,
  updateItemSupplier as updateItemSupplierAction,
  deleteItemSupplier
} from "@/actions/suppliers/itemSupplierActions"
import type {
  ItemSupplierDTO,
  UpdateItemSupplierDTO,
  CreateItemSupplierDTO,
  BriefItemSupplierDTO,
} from "@/types/itemSuppliers"
import {
  useMutation,
  useQuery,
  useSuspenseQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query"
// Types
interface ItemSupplierFilters {
  organizationId?: string
  itemId?: string
  supplierId?: string
  isPreferred?: boolean
  dateFrom?: Date
  dateTo?: Date
  searchQuery?: string
  [key: string]: any
}

interface DeleteItemSupplierParams {
  id: string
  organizationId?: string
}

type CreateItemSupplierMutationContext = {
  previousLists: unknown
  previousOrgData: unknown
  tempId: string
}

type UpdateItemSupplierMutationContext = {
  previousDetail: unknown
  previousLists: unknown
}

type DeleteItemSupplierMutationContext = {
  previousData: Map<string, unknown>
  queryKeys: Array<readonly unknown[]>
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const maybeDecimal = value as { toNumber?: () => number }
  if (typeof maybeDecimal.toNumber === "function") {
    return maybeDecimal.toNumber()
  }

  return undefined
}

function toItemSupplierDTO(data: unknown): ItemSupplierDTO {
  const itemSupplier = data as ItemSupplierDTO & { unitCost?: unknown }
  return {
    ...itemSupplier,
    unitCost: toNumberOrUndefined(itemSupplier.unitCost),
  }
}

function toBriefItemSupplierDTO(data: unknown): BriefItemSupplierDTO {
  const itemSupplier = data as BriefItemSupplierDTO & { unitCost?: unknown }
  return {
    ...itemSupplier,
    unitCost: toNumberOrUndefined(itemSupplier.unitCost),
  }
}

function toItemSupplierActionData(data: CreateItemSupplierDTO | UpdateItemSupplierDTO) {
  return {
    itemId: data.itemId,
    supplierId: data.supplierId,
    supplierProductCode: data.supplierSku ?? undefined,
    unitCost: data.unitCost,
    minimumOrderQuantity: data.minOrderQty,
    leadTimeDays: data.leadTime,
    isPreferred: data.isPreferred,
    notes: data.notes ?? undefined,
  }
}

// Centralized Query Keys
export const ItemSupplierKeys = {
  all: ["itemSuppliers"] as const,
  lists: () => [...ItemSupplierKeys.all, "list"] as const,
  list: (filters: ItemSupplierFilters) => [...ItemSupplierKeys.lists(), filters] as const,
  details: () => [...ItemSupplierKeys.all, "detail"] as const,
  detail: (id: string) => [...ItemSupplierKeys.details(), id] as const,
  orgItemSuppliers: (orgId: string) => [...ItemSupplierKeys.all, "organization", orgId] as const,
  briefOrgItemSuppliers: (orgId: string) => [...ItemSupplierKeys.orgItemSuppliers(orgId), "brief"] as const,
  itemSuppliers: (itemId: string) => [...ItemSupplierKeys.all, "item", itemId] as const,
  supplierItems: (supplierId: string) => [...ItemSupplierKeys.all, "supplier", supplierId] as const,
}

// Query Hooks
export function useItemSuppliers(
  filters: ItemSupplierFilters = {},
  options?: Omit<UseQueryOptions<ItemSupplierDTO[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ItemSupplierKeys.list(filters),
    queryFn: async () => {
      const result = await getItemSuppliers(filters.organizationId)
      return result.data?.map(toItemSupplierDTO) || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

export function useItemSupplier(id: string, options?: Omit<UseQueryOptions<ItemSupplierDTO>, "queryKey" | "queryFn">) {
  return useQuery({
    queryKey: ItemSupplierKeys.detail(id),
    queryFn: async () => {
      const result = await getItemSupplierById(id)
      if (!result.success || !result.data) throw new Error(result.error || "Failed to fetch item supplier")
      return toItemSupplierDTO(result.data)
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

export function useOrgItemSuppliers(
  organizationId: string,
  options?: {
    initialData?: BriefItemSupplierDTO[]
    enabled?: boolean
  },
) {
  return useQuery({
    queryKey: ItemSupplierKeys.briefOrgItemSuppliers(organizationId),
    queryFn: async () => {
      const result = await getAllOrgItemSuppliers(organizationId)
      return result.data?.map(toBriefItemSupplierDTO) || []
    },
    enabled: Boolean(organizationId) && (options?.enabled ?? true),
    initialData: options?.initialData,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSuspenseItemSuppliers(organizationId: string) {
  return useSuspenseQuery({
    queryKey: ItemSupplierKeys.briefOrgItemSuppliers(organizationId),
    queryFn: async () => {
      const result = await getAllOrgItemSuppliers(organizationId)
      return result.data?.map(toBriefItemSupplierDTO) || []
    },
  })
}

export function useItemSuppliersForItem(itemId: string) {
  return useQuery({
    queryKey: ItemSupplierKeys.itemSuppliers(itemId),
    queryFn: async () => {
      const result = await getItemSuppliersByItemId(itemId)
      return result.data?.map(toItemSupplierDTO) || []
    },
    enabled: Boolean(itemId),
    staleTime: 5 * 60 * 1000,
  })
}

// Mutation Hooks
export function useCreateItemSupplier(
  options?: UseMutationOptions<ItemSupplierDTO, Error, CreateItemSupplierDTO, CreateItemSupplierMutationContext>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: 'create', entity: 'Item Supplier' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: CreateItemSupplierDTO) => {
      const result = await createItemSupplier(toItemSupplierActionData(data))
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to create item supplier')
      return toItemSupplierDTO(result.data)
    },
    onMutate: async (variables) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ItemSupplierKeys.lists() })

      if (variables.organizationId) {
        await queryClient.cancelQueries({
          queryKey: ItemSupplierKeys.briefOrgItemSuppliers(variables.organizationId),
        })
      }

      // Snapshot previous values
      const previousLists = queryClient.getQueryData(ItemSupplierKeys.lists())
      const previousOrgData = variables.organizationId
        ? queryClient.getQueryData(ItemSupplierKeys.briefOrgItemSuppliers(variables.organizationId))
        : undefined

      // Optimistically update
      const tempId = `temp-${Date.now()}`
      const optimisticItemSupplier = { ...variables, id: tempId } as ItemSupplierDTO

      queryClient.setQueryData(ItemSupplierKeys.lists(), (old: ItemSupplierDTO[] = []) => [
        optimisticItemSupplier,
        ...old,
      ])

      if (variables.organizationId) {
        queryClient.setQueryData(
          ItemSupplierKeys.briefOrgItemSuppliers(variables.organizationId),
          (old: BriefItemSupplierDTO[] = []) => [optimisticItemSupplier as BriefItemSupplierDTO, ...old],
        )
      }

      return { previousLists, previousOrgData, tempId }
    },
    onSuccess: (data, variables, context) => {
      notify.success("Item supplier created successfully", {
        description: `Supplier relationship has been established`,
      })

      // Update with real data
      queryClient.setQueryData(ItemSupplierKeys.detail(data.id), data)

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ItemSupplierKeys.lists() })

      if (variables.organizationId) {
        queryClient.invalidateQueries({
          queryKey: ItemSupplierKeys.briefOrgItemSuppliers(variables.organizationId),
        })
      }
    },
    onError: (error, variables, context) => {
      notify.error("Failed to create item supplier", {
        description: error.message || "Unknown error occurred",
      })

      // Rollback optimistic updates
      if (context?.previousLists) {
        queryClient.setQueryData(ItemSupplierKeys.lists(), context.previousLists)
      }
      if (context?.previousOrgData && variables.organizationId) {
        queryClient.setQueryData(
          ItemSupplierKeys.briefOrgItemSuppliers(variables.organizationId),
          context.previousOrgData,
        )
      }
    },
    ...options,
  })
}

export function useUpdateItemSupplier(
  options?: UseMutationOptions<ItemSupplierDTO, Error, UpdateItemSupplierDTO, UpdateItemSupplierMutationContext>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: 'update', entity: 'Item Supplier' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: UpdateItemSupplierDTO) => {
      const result = await updateItemSupplierAction({
        id: data.id,
        ...toItemSupplierActionData(data)
      })
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to update item supplier')
      return toItemSupplierDTO(result.data)
    },
    onMutate: async (variables) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ItemSupplierKeys.detail(variables.id) })
      await queryClient.cancelQueries({ queryKey: ItemSupplierKeys.lists() })

      // Snapshot previous values
      const previousDetail = queryClient.getQueryData(ItemSupplierKeys.detail(variables.id))
      const previousLists = queryClient.getQueryData(ItemSupplierKeys.lists())

      // Optimistically update detail
      queryClient.setQueryData(ItemSupplierKeys.detail(variables.id), (old: ItemSupplierDTO | undefined) =>
        old ? { ...old, ...variables } : (variables as ItemSupplierDTO),
      )

      // Optimistically update lists
      queryClient.setQueryData(ItemSupplierKeys.lists(), (old: ItemSupplierDTO[] = []) =>
        old.map((item) => (item.id === variables.id ? { ...item, ...variables } : item)),
      )

      return { previousDetail, previousLists }
    },
    onSuccess: (data, variables) => {
      notify.success("Item supplier updated successfully", {
        description: "Supplier information has been updated",
      })

      // Update with server response
      queryClient.setQueryData(ItemSupplierKeys.detail(variables.id), data)

      // Update in lists
      queryClient.setQueryData(ItemSupplierKeys.lists(), (old: ItemSupplierDTO[] = []) =>
        old.map((item) => (item.id === variables.id ? data : item)),
      )

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ItemSupplierKeys.itemSuppliers(data.itemId) })
      queryClient.invalidateQueries({ queryKey: ItemSupplierKeys.supplierItems(data.supplierId) })
    },
    onError: (error, variables, context) => {
      notify.error("Failed to update item supplier", {
        description: error.message || "Unknown error occurred",
      })

      // Rollback optimistic updates
      if (context?.previousDetail) {
        queryClient.setQueryData(ItemSupplierKeys.detail(variables.id), context.previousDetail)
      }
      if (context?.previousLists) {
        queryClient.setQueryData(ItemSupplierKeys.lists(), context.previousLists)
      }
    },
    ...options,
  })
}

export function useDeleteItemSupplier(
  options?: UseMutationOptions<void, Error, DeleteItemSupplierParams, DeleteItemSupplierMutationContext>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: 'delete', entity: 'Item Supplier' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id }: DeleteItemSupplierParams) => {
      const result = await deleteItemSupplier(id)
      if (!result.success) throw new Error(result.error || 'Failed to delete item supplier')
      return undefined
    },
    onMutate: async ({ id, organizationId }): Promise<DeleteItemSupplierMutationContext> => {
      // Build query keys based on available data
      const queryKeys: DeleteItemSupplierMutationContext["queryKeys"] = [
        ItemSupplierKeys.lists(),
        ItemSupplierKeys.detail(id),
        ...(organizationId ? [ItemSupplierKeys.briefOrgItemSuppliers(organizationId)] : []),
      ]

      // Cancel outgoing queries
      await Promise.all(queryKeys.map((key) => queryClient.cancelQueries({ queryKey: key })))

      // Snapshot previous values
      const previousData = new Map()
      queryKeys.forEach((key) => {
        const data = queryClient.getQueryData(key)
        if (data) {
          previousData.set(JSON.stringify(key), data)
        }
      })

      // Helper function to remove item supplier from different data structures
      const removeItemSupplierFromData = (oldData: any) => {
        if (!oldData) return oldData

        if (Array.isArray(oldData)) {
          return oldData.filter((item) => item.id !== id)
        }

        if (oldData.data && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.filter((item: { id: string }) => item.id !== id),
            total: Math.max(0, (oldData.total || oldData.data.length) - 1),
          }
        }

        if (oldData.itemSuppliers && Array.isArray(oldData.itemSuppliers)) {
          return {
            ...oldData,
            itemSuppliers: oldData.itemSuppliers.filter((item: { id: string }) => item.id !== id),
            total: Math.max(0, (oldData.total || oldData.itemSuppliers.length) - 1),
          }
        }

        return oldData
      }

      // Optimistically update all relevant queries
      queryKeys.forEach((key) => {
        queryClient.setQueryData(key, removeItemSupplierFromData)
      })

      return { previousData, queryKeys }
    },
    onSuccess: (_, { id }) => {
      notify.success("Item supplier deleted successfully", {
        description: "Supplier relationship has been removed",
      })

      // Remove from cache completely
      queryClient.removeQueries({ queryKey: ItemSupplierKeys.detail(id) })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ItemSupplierKeys.lists() })
    },
    onError: (error, { id }, context) => {
      notify.error("Failed to delete item supplier", {
        description: error.message || "Unknown error occurred",
      })

      // Rollback all optimistic updates
      if (context?.previousData && context?.queryKeys) {
        context.queryKeys.forEach((key) => {
          const keyString = JSON.stringify(key)
          const previousValue = context.previousData.get(keyString)
          if (previousValue) {
            queryClient.setQueryData(key, previousValue)
          }
        })
      }
    },
    onSettled: (_, error, { id, organizationId }) => {
      if (!error) {
        // Final cleanup
        queryClient.removeQueries({ queryKey: ItemSupplierKeys.detail(id), exact: true })

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ItemSupplierKeys.lists(), refetchType: "none" })

        if (organizationId) {
          queryClient.invalidateQueries({
            queryKey: ItemSupplierKeys.briefOrgItemSuppliers(organizationId),
            refetchType: "none",
          })
        }
      }
    },
    ...options,
  })
}

// Utility hooks
export function useInvalidateItemSuppliers() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ItemSupplierKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: ItemSupplierKeys.lists() }),
    invalidateDetail: (id: string) => queryClient.invalidateQueries({ queryKey: ItemSupplierKeys.detail(id) }),
    invalidateOrg: (orgId: string) =>
      queryClient.invalidateQueries({ queryKey: ItemSupplierKeys.briefOrgItemSuppliers(orgId) }),
  }
}

export function usePrefetchItemSupplier() {
  const queryClient = useQueryClient()

  return {
    prefetchDetail: (id: string) =>
      queryClient.prefetchQuery({
        queryKey: ItemSupplierKeys.detail(id),
        queryFn: async () => {
          const result = await getItemSupplierById(id)
          if (!result.success || !result.data) throw new Error(result.error || "Failed to fetch item supplier")
          return toItemSupplierDTO(result.data)
        },
        staleTime: 5 * 60 * 1000,
      }),
    prefetchList: (filters: ItemSupplierFilters = {}) =>
      queryClient.prefetchQuery({
        queryKey: ItemSupplierKeys.list(filters),
        queryFn: async () => {
          const result = await getItemSuppliers(filters.organizationId)
          return result.data?.map(toItemSupplierDTO) || []
        },
        staleTime: 5 * 60 * 1000,
      }),
  }
}
