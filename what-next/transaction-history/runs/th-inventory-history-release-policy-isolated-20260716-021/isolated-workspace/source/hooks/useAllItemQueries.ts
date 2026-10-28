import { notify } from "@/lib/notifications/notify"
import { createActionItem } from "@/actions/itemsShow/createActionItem"
import { deleteItem } from "@/actions/itemsShow/deleteItem"
import { getOrgItems } from "@/actions/itemsShow/getOrgItems"
import { getOrgItemsWithInventoryLevels } from "@/actions/itemsShow/getOrgItemsWithInventoryLevels"
import { getOrgItemsWithInventoryLevelsLocation } from "@/actions/itemsShow/getOrgItemsWithInventoryLevelsLocation"
import { updateItemBasicInfoById } from "@/actions/itemsShow/updateItemBasicInfoById"
import { updateItemById } from "@/actions/itemsShow/updateItemById"
import { updateItemDetailsById } from "@/actions/itemsShow/updateItemItemDetailsById"
import { updateItemPricingById } from "@/actions/itemsShow/updateItemPricingById"
import { updateItemRelationsById } from "@/actions/itemsShow/updateItemRelationsById"
import { updateItemStockById } from "@/actions/itemsShow/updateItemStockById"
import type {
  ItemCreateDTO,
  ItemDTO,
  UpdateItemBasicInfoPayload,
  UpdateItemDetailsPayload,
  UpdateItemPayload,
  UpdateItemPricingPayload,
  UpdateItemRelationsPayload,
  UpdateItemStockPayload,
} from "@/types/itemTypes"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
// Query keys for caching
export const ItemKeys = {
  all: ["items"] as const,
  lists: () => [...ItemKeys.all, "list"] as const,
  list: (filters: any) => [...ItemKeys.lists(), { filters }] as const,
  filteredList: (dateFilter: any, searchQuery: string) => [...ItemKeys.lists(), { dateFilter, searchQuery }] as const,
  details: () => [...ItemKeys.all, "detail"] as const,
  detail: (id: string) => [...ItemKeys.details(), id] as const,
  orgItems: (organizationId: string) => [...ItemKeys.all, "org", organizationId] as const,
  briefOrgItems: (organizationId: string) => [...ItemKeys.all, "briefOrg", organizationId] as const,
   orgItemsWithInventoryLevels: (orgId: string) => [...ItemKeys.all, 'organization', orgId, 'inventory'] as const,
   orgItemsWithInventoryLevelsLocation: (orgId: string, locationId: string) => [...ItemKeys.all, 'organization', orgId, 'location', locationId, 'inventory'] as const,
};

export const useOrgItemsNew = (organizationId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ItemKeys.orgItems(organizationId),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required")
      }
      try {
        const result = await getOrgItems(organizationId)
        return result
      } catch (error) {
        console.error("Failed to fetch organization items:", error)
        notify.error("Failed to load items. Please try again.")
        throw error // Re-throw to let React Query handle it
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!organizationId && (options?.enabled ?? true),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export const useOrgItemsWithInventoryLevelsFirst = (organizationId: string, locationId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ItemKeys.orgItemsWithInventoryLevelsLocation(organizationId, locationId),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required")
      }
      try {
        const result = await getOrgItemsWithInventoryLevelsLocation({ orgId: organizationId, locationId })
        return result
      } catch (error) {
        console.error("Failed to fetch organization items:", error)
        notify.error("Failed to load items. Please try again.")
        throw error // Re-throw to let React Query handle it
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!organizationId && (options?.enabled ?? true),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
// hooks/useAllItemQueries.ts
export const useOrgItemsWithInventoryLevels = (organizationId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["orgItemsWithInventoryLevels", organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required")
      }
      try {
        const result = await getOrgItemsWithInventoryLevels(organizationId)
        return result
      } catch (error) {
        console.error("Failed to fetch organization items:", error)
        notify.error("Failed to load items. Please try again.")
        throw error
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!organizationId && (options?.enabled ?? true),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
// hooks/useAllItemQueries.ts
export const useOrgItemsWithInventoryLevelsLocation = (organizationId: string, locationId: string,options?: { enabled?: boolean }) => {
  return useQuery({
    // queryKey: ["orgItemsWithInventoryLevels", organizationId],
    queryKey: ["orgItemsWithInventoryLevels", organizationId, locationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required")
      }
      try {
        const result = await getOrgItemsWithInventoryLevelsLocation({ orgId: organizationId, locationId })
        return result
      } catch (error) {
        console.error("Failed to fetch organization items:", error)
        notify.error("Failed to load items. Please try again.")
        throw error
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!organizationId && (options?.enabled ?? true),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// export const useOrgItemsWithInventoryLevels = (
//   organizationId: string, 
//   options?: { enabled?: boolean }
// ) => {
//   return useQuery({
//     // Use a more specific query key to differentiate from regular items
//     queryKey: ItemKeys.orgItemsWithInventoryLevels(organizationId),
//     queryFn: async () => {
//       if (!organizationId) {
//         throw new Error("Organization ID is required");
//       }
      
//       const result = await getOrgItemsWithInventoryLevels(organizationId);
      
//       // Handle the server action response structure
//       if (!result.success) {
//         // Don't show notification here - let the onError handle it
//         throw new Error(result.error || "Failed to fetch items");
//       }
      
//       // Return the actual data, not the wrapper object
//       return result.data;
//     },
    
//     // Query options
//     staleTime: 5 * 60 * 1000, // 5 minutes
//     enabled: !!organizationId && (options?.enabled ?? true),
//     retry: (failureCount, error) => {
//       // Don't retry on validation errors
//       if (error.message === "Organization ID is required") {
//         return false;
//       }
//       // Retry up to 3 times for other errors
//       return failureCount < 3;
//     },
//     retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
//     // Error and success handlers are not supported here; handle errors in queryFn or with useQuery's returned status.
//   });
// };


export function useCreateAnItem() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { operation: 'create', entity: 'Item' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: ItemCreateDTO) => await createActionItem(data),
    onSuccess: (_data, variables) => {
      notify.success("Item added successfully")
      if (variables.organizationId) {
        queryClient.invalidateQueries({ queryKey: ItemKeys.orgItems(variables.organizationId) })
      } else {
        queryClient.invalidateQueries({ queryKey: ItemKeys.lists() })
      }
    },
    onError: (error: Error) => {
      notify.error("Failed to add Item", {
        description: error.message || "Unknown error occurred",
      })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { operation: 'delete', entity: 'Item' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, organizationId }: { id: string; organizationId?: string }) => await deleteItem(id),
    onMutate: async ({ id, organizationId }) => {
      const queryKeys: Array<readonly unknown[]> = [ItemKeys.lists()]
      if (organizationId) {
        queryKeys.push(ItemKeys.orgItems(organizationId))
        queryKeys.push(ItemKeys.briefOrgItems(organizationId))
      }

      await Promise.all(queryKeys.map((key) => queryClient.cancelQueries({ queryKey: key })))

      const previousData = new Map()

      const removeItemFromData = (oldData: any) => {
        if (!oldData) return oldData
        if (Array.isArray(oldData)) {
          return oldData.filter((item: { id: string }) => item.id !== id)
        }
        if (oldData.data && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.filter((item: { id: string }) => item.id !== id),
            total: Math.max(0, (oldData.total || oldData.data.length) - 1),
          }
        }
        if (oldData.items && Array.isArray(oldData.items)) {
          return {
            ...oldData,
            items: oldData.items.filter((item: { id: string }) => item.id !== id),
            total: Math.max(0, (oldData.total || oldData.items.length) - 1),
          }
        }
        return oldData
      }

      queryKeys.forEach((key) => {
        const data = queryClient.getQueryData(key)
        if (data) {
          previousData.set(JSON.stringify(key), data)
          queryClient.setQueryData(key, removeItemFromData)
        }
      })
      return { previousData, queryKeys }
    },
    onSuccess: () => {
      notify.success("Item deleted successfully")
    },
    onError: (error: Error, _variables, context) => {
      notify.error("Failed to delete Item", {
        description: error.message || "Unknown error occurred",
      })
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
    onSettled: (_data, _error, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ItemKeys.lists() })
      if (organizationId) {
        queryClient.invalidateQueries({ queryKey: ItemKeys.orgItems(organizationId) })
        queryClient.invalidateQueries({ queryKey: ItemKeys.briefOrgItems(organizationId) })
      }
    },
  })
}

export function useUpdateAnItem() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { operation: 'update', entity: 'Item' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemPayload }) => updateItemById({ id, data }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ItemKeys.detail(variables.id) })
      await queryClient.cancelQueries({ queryKey: ItemKeys.lists() })
      if (variables.data.organizationId) {
        await queryClient.cancelQueries({ queryKey: ItemKeys.orgItems(variables.data.organizationId) })
      }

      const previousItemDetail = queryClient.getQueryData(ItemKeys.detail(variables.id))
      const previousItemsList = queryClient.getQueryData(ItemKeys.lists())
      const previousOrgItems = variables.data.organizationId
        ? queryClient.getQueryData(ItemKeys.orgItems(variables.data.organizationId))
        : undefined

      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: UpdateItemPayload | undefined) => {
        return { ...oldData, ...variables.data }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: UpdateItemPayload[] | undefined) => {
        if (!oldData) return [variables.data as UpdateItemPayload]
        return oldData.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item))
      })
      if (variables.data.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(variables.data.organizationId),
          (oldData: { data: UpdateItemPayload[] } | undefined) => {
            if (!oldData) return { data: [variables.data as UpdateItemPayload] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item)),
            }
          },
        )
      }
      return { previousItemDetail, previousItemsList, previousOrgItems }
    },
    onError: (error, variables, context) => {
      notify.error("Failed to update Item", {
        description: error.message || "Unknown error occurred",
      })
      if (context?.previousItemDetail) {
        queryClient.setQueryData(ItemKeys.detail(variables.id), context.previousItemDetail)
      }
      if (context?.previousItemsList) {
        queryClient.setQueryData(ItemKeys.lists(), context.previousItemsList)
      }
      if (context?.previousOrgItems && variables.data.organizationId) {
        queryClient.setQueryData(ItemKeys.orgItems(variables.data.organizationId), context.previousOrgItems)
      }
    },
    onSuccess: (updatedItem, variables) => {
      notify.success("Item updated successfully")
      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: UpdateItemPayload | undefined) => {
        return { ...oldData, ...updatedItem }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: UpdateItemPayload[] | undefined) => {
        if (!oldData) return [updatedItem]
        return oldData.map((item) => (item.id === variables.id ? updatedItem : item))
      })
      if (updatedItem.data?.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(updatedItem.data?.organizationId),
          (oldData: { data: UpdateItemPayload[] } | undefined) => {
            if (!oldData) return { data: [updatedItem] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === updatedItem.data?.id ? updatedItem : item)),
            }
          },
        )
      }
    },
  })
}

export function useUpdateItemBasicInfo() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { operation: 'update', entity: 'Item Basic Info' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemBasicInfoPayload }) =>
      updateItemBasicInfoById({ id, data }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ItemKeys.detail(variables.id) })
      await queryClient.cancelQueries({ queryKey: ItemKeys.lists() })
      if (variables.data.organizationId) {
        await queryClient.cancelQueries({ queryKey: ItemKeys.orgItems(variables.data.organizationId) })
      }

      const previousItemDetail = queryClient.getQueryData(ItemKeys.detail(variables.id))
      const previousItemsList = queryClient.getQueryData(ItemKeys.lists())
      const previousOrgItems = variables.data.organizationId
        ? queryClient.getQueryData(ItemKeys.orgItems(variables.data.organizationId))
        : undefined

      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...variables.data }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [variables.data as ItemDTO]
        return oldData.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item))
      })
      if (variables.data.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(variables.data.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [variables.data as ItemDTO] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item)),
            }
          },
        )
      }
      return { previousItemDetail, previousItemsList, previousOrgItems }
    },
    onError: (error, variables, context) => {
      notify.error("Failed to update item basic info", {
        description: error.message || "Unknown error occurred",
      })
      if (context?.previousItemDetail) {
        queryClient.setQueryData(ItemKeys.detail(variables.id), context.previousItemDetail)
      }
      if (context?.previousItemsList) {
        queryClient.setQueryData(ItemKeys.lists(), context.previousItemsList)
      }
      if (context?.previousOrgItems && variables.data.organizationId) {
        queryClient.setQueryData(ItemKeys.orgItems(variables.data.organizationId), context.previousOrgItems)
      }
    },
    onSuccess: (updatedItem, variables) => {
      notify.success("Item basic info updated successfully")
      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...updatedItem }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [updatedItem]
        return oldData.map((item) => (item.id === variables.id ? updatedItem : item))
      })
      if (updatedItem.data?.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(updatedItem.data?.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [updatedItem] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === updatedItem.data?.id ? updatedItem : item)),
            }
          },
        )
      }
    },
  })
}

export function useUpdateItemDetails() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { operation: 'update', entity: 'Item Details' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemDetailsPayload }) => updateItemDetailsById({ id, data }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ItemKeys.detail(variables.id) })
      await queryClient.cancelQueries({ queryKey: ItemKeys.lists() })
      if (variables.data.organizationId) {
        await queryClient.cancelQueries({ queryKey: ItemKeys.orgItems(variables.data.organizationId) })
      }

      const previousItemDetail = queryClient.getQueryData(ItemKeys.detail(variables.id))
      const previousItemsList = queryClient.getQueryData(ItemKeys.lists())
      const previousOrgItems = variables.data.organizationId
        ? queryClient.getQueryData(ItemKeys.orgItems(variables.data.organizationId))
        : undefined

      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...variables.data }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [variables.data as ItemDTO]
        return oldData.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item))
      })
      if (variables.data.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(variables.data.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [variables.data as ItemDTO] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item)),
            }
          },
        )
      }
      return { previousItemDetail, previousItemsList, previousOrgItems }
    },
    onError: (error, variables, context) => {
      notify.error("Failed to update item details", {
        description: error.message || "Unknown error occurred",
      })
      if (context?.previousItemDetail) {
        queryClient.setQueryData(ItemKeys.detail(variables.id), context.previousItemDetail)
      }
      if (context?.previousItemsList) {
        queryClient.setQueryData(ItemKeys.lists(), context.previousItemsList)
      }
      if (context?.previousOrgItems && variables.data.organizationId) {
        queryClient.setQueryData(ItemKeys.orgItems(variables.data.organizationId), context.previousOrgItems)
      }
    },
    onSuccess: (updatedItem, variables) => {
      notify.success("Item details updated successfully")
      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...updatedItem }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [updatedItem]
        return oldData.map((item) => (item.id === variables.id ? updatedItem : item))
      })
      if (updatedItem.data?.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(updatedItem.data?.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [updatedItem] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === updatedItem.data?.id ? updatedItem : item)),
            }
          },
        )
      }
    },
  })
}

export function useUpdateItemStock() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { operation: 'update', entity: 'Item Stock' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemStockPayload }) => updateItemStockById({ id, data }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ItemKeys.detail(variables.id) })
      await queryClient.cancelQueries({ queryKey: ItemKeys.lists() })
      if (variables.data.organizationId) {
        await queryClient.cancelQueries({ queryKey: ItemKeys.orgItems(variables.data.organizationId) })
      }

      const previousItemDetail = queryClient.getQueryData(ItemKeys.detail(variables.id))
      const previousItemsList = queryClient.getQueryData(ItemKeys.lists())
      const previousOrgItems = variables.data.organizationId
        ? queryClient.getQueryData(ItemKeys.orgItems(variables.data.organizationId))
        : undefined

      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...variables.data }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [variables.data as ItemDTO]
        return oldData.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item))
      })
      if (variables.data.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(variables.data.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [variables.data as ItemDTO] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item)),
            }
          },
        )
      }
      return { previousItemDetail, previousItemsList, previousOrgItems }
    },
    onError: (error, variables, context) => {
      notify.error("Failed to update item stock", {
        description: error.message || "Unknown error occurred",
      })
      if (context?.previousItemDetail) {
        queryClient.setQueryData(ItemKeys.detail(variables.id), context.previousItemDetail)
      }
      if (context?.previousItemsList) {
        queryClient.setQueryData(ItemKeys.lists(), context.previousItemsList)
      }
      if (context?.previousOrgItems && variables.data.organizationId) {
        queryClient.setQueryData(ItemKeys.orgItems(variables.data.organizationId), context.previousOrgItems)
      }
    },
    onSuccess: (updatedItem, variables) => {
      notify.success("Item stock updated successfully")
      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...updatedItem }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [updatedItem]
        return oldData.map((item) => (item.id === variables.id ? updatedItem : item))
      })
      if (updatedItem.data?.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(updatedItem.data?.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [updatedItem] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === updatedItem.data?.id ? updatedItem : item)),
            }
          },
        )
      }
    },
  })
}

export function useUpdateItemPricing() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { operation: 'update', entity: 'Item Pricing' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemPricingPayload }) => updateItemPricingById({ id, data }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ItemKeys.detail(variables.id) })
      await queryClient.cancelQueries({ queryKey: ItemKeys.lists() })
      if (variables.data.organizationId) {
        await queryClient.cancelQueries({ queryKey: ItemKeys.orgItems(variables.data.organizationId) })
      }

      const previousItemDetail = queryClient.getQueryData(ItemKeys.detail(variables.id))
      const previousItemsList = queryClient.getQueryData(ItemKeys.lists())
      const previousOrgItems = variables.data.organizationId
        ? queryClient.getQueryData(ItemKeys.orgItems(variables.data.organizationId))
        : undefined

      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...variables.data }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [variables.data as ItemDTO]
        return oldData.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item))
      })
      if (variables.data.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(variables.data.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [variables.data as ItemDTO] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item)),
            }
          },
        )
      }
      return { previousItemDetail, previousItemsList, previousOrgItems }
    },
    onError: (error, variables, context) => {
      notify.error("Failed to update item pricing", {
        description: error.message || "Unknown error occurred",
      })
      if (context?.previousItemDetail) {
        queryClient.setQueryData(ItemKeys.detail(variables.id), context.previousItemDetail)
      }
      if (context?.previousItemsList) {
        queryClient.setQueryData(ItemKeys.lists(), context.previousItemsList)
      }
      if (context?.previousOrgItems && variables.data.organizationId) {
        queryClient.setQueryData(ItemKeys.orgItems(variables.data.organizationId), context.previousOrgItems)
      }
    },
    onSuccess: (updatedItem, variables) => {
      notify.success("Item pricing updated successfully")
      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...updatedItem }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [updatedItem]
        return oldData.map((item) => (item.id === variables.id ? updatedItem : item))
      })
      if (updatedItem.data?.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(updatedItem.data?.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [updatedItem] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === updatedItem.data?.id ? updatedItem : item)),
            }
          },
        )
      }
    },
  })
}

export function useUpdateItemRelations() {
  console.log("running the update item relations ")
  const queryClient = useQueryClient()
  return useMutation({
    meta: { operation: 'update', entity: 'Item Relations' , suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemRelationsPayload }) =>
      updateItemRelationsById({ id, data }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ItemKeys.detail(variables.id) })
      await queryClient.cancelQueries({ queryKey: ItemKeys.lists() })
      if (variables.data.organizationId) {
        await queryClient.cancelQueries({ queryKey: ItemKeys.orgItems(variables.data.organizationId) })
      }

      const previousItemDetail = queryClient.getQueryData(ItemKeys.detail(variables.id))
      const previousItemsList = queryClient.getQueryData(ItemKeys.lists())
      const previousOrgItems = variables.data.organizationId
        ? queryClient.getQueryData(ItemKeys.orgItems(variables.data.organizationId))
        : undefined

      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...variables.data }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [variables.data as ItemDTO]
        return oldData.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item))
      })
      if (variables.data.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(variables.data.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [variables.data as ItemDTO] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === variables.id ? { ...item, ...variables.data } : item)),
            }
          },
        )
      }
      return { previousItemDetail, previousItemsList, previousOrgItems }
    },
    onError: (error, variables, context) => {
      notify.error("Failed to update item relations", {
        description: error.message || "Unknown error occurred",
      })
      if (context?.previousItemDetail) {
        queryClient.setQueryData(ItemKeys.detail(variables.id), context.previousItemDetail)
      }
      if (context?.previousItemsList) {
        queryClient.setQueryData(ItemKeys.lists(), context.previousItemsList)
      }
      if (context?.previousOrgItems && variables.data.organizationId) {
        queryClient.setQueryData(ItemKeys.orgItems(variables.data.organizationId), context.previousOrgItems)
      }
    },
    onSuccess: (updatedItem, variables) => {
      notify.success("Item relations updated successfully")
      queryClient.setQueryData(ItemKeys.detail(variables.id), (oldData: ItemDTO | undefined) => {
        return { ...oldData, ...updatedItem }
      })
      queryClient.setQueryData(ItemKeys.lists(), (oldData: ItemDTO[] | undefined) => {
        if (!oldData) return [updatedItem]
        return oldData.map((item) => (item.id === variables.id ? updatedItem : item))
      })
      if (updatedItem.data?.organizationId) {
        queryClient.setQueryData(
          ItemKeys.orgItems(updatedItem.data?.organizationId),
          (oldData: { data: ItemDTO[] } | undefined) => {
            if (!oldData) return { data: [updatedItem] }
            return {
              ...oldData,
              data: oldData.data.map((item) => (item.id === updatedItem.data?.id ? updatedItem : item)),
            }
          },
        )
      }
    },
  })
}
