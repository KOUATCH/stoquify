'use client'

import { createItemAction } from '@/actions/item/items';
// import { createItemAction } from '@/actions/item/createItem';
import { deleteItemAction, getItemAction, updateItemBasicInfoAction, updateItemDetailsAction, updateItemPricingAction, updateItemRelationsAction, updateItemStockAction, updateItemTrackingAction } from '@/actions/item/items';
import { listItemsAction, PaginatedItems } from '@/actions/item/listItemsAction';
// import type { ItemWithRelations, PaginatedItems } from '@/actions/item'
// import {
//   createItemAction,
//   deleteItemAction,
//   getItemAction,
//   listItemsAction,
//   updateItemBasicInfoAction,
//   updateItemDetailsAction,
//   updateItemPricingAction,
//   updateItemRelationsAction,
//   updateItemStockAction,
//   updateItemTrackingAction,
// } from '@/actions/item'
import { itemKeys } from '@/lib/item/itemKeys';
import { ItemWithRelations } from '@/lib/item/schemas';
import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query';

// Shared action result shape from server actions
type ActionResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string }

// Helper to normalize ActionResult<T> -> T or throw
async function callAction<T>(fn: (input: unknown) => Promise<ActionResult<T>>, input: unknown): Promise<T> {
  const res = await fn(input)
  if (!res.success) {
    // Ensure error is a proper Error to be caught by React Query
    throw new Error(res.error || 'Unknown error')
  }
  return res.data
}

/**
  Queries
*/

type UseListItemsParams = {
  organizationId: string
  q?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  categoryId?: string
  brandId?: string
  unitId?: string
  taxRateId?: string
  isActive?: boolean
}

export function useListItems(
  params: UseListItemsParams,
  options?: Omit<UseQueryOptions<PaginatedItems, Error, PaginatedItems>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedItems, Error>({
    queryKey: itemKeys.list(params),
    queryFn: () => callAction(listItemsAction, params),
    enabled: Boolean(params?.organizationId),
    ...options,
  })
}

export function useGetItem(
  id: string | undefined,
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<ItemWithRelations, Error, ItemWithRelations>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<ItemWithRelations, Error>({
    queryKey: itemKeys.detail(id),
    queryFn: () => callAction(getItemAction, { id, organizationId }),
    enabled: Boolean(id && organizationId),
    ...options,
  })
}

/**
  Mutations
*/

type BaseMutationOptions<TVariables, TData> = Omit<UseMutationOptions<TData, Error, TVariables, unknown>, 'mutationFn'>

export function useCreateItem(options?: BaseMutationOptions<unknown, ItemWithRelations>) {
  const qc = useQueryClient()
  return useMutation<ItemWithRelations, Error, unknown>({
    meta: { operation: 'create', entity: 'Item' },
    mutationFn: (input) => callAction(createItemAction, input),
    onSuccess: async (_data, _vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: itemKeys.all }),
      ])
    },
    ...options,
  })
}

export function useUpdateItemBasicInfo(options?: BaseMutationOptions<unknown, ItemWithRelations>) {
  const qc = useQueryClient()
  return useMutation<ItemWithRelations, Error, unknown>({
    meta: { operation: 'update', entity: 'Item Basic Info' },
    mutationFn: (input) => callAction(updateItemBasicInfoAction, input),
    onSuccess: async (data, vars) => {
      const v = (vars ?? {}) as { id?: string }
      if (v.id) {
        qc.setQueryData(itemKeys.detail(v.id), data)
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: itemKeys.all }),
      ])
    },
    ...options,
  })
}

export function useUpdateItemDetails(options?: BaseMutationOptions<unknown, ItemWithRelations>) {
  const qc = useQueryClient()
  return useMutation<ItemWithRelations, Error, unknown>({
    meta: { operation: 'update', entity: 'Item Details' },
    mutationFn: (input) => callAction(updateItemDetailsAction, input),
    onSuccess: async (data, vars) => {
      const v = (vars ?? {}) as { id?: string }
      if (v.id) {
        qc.setQueryData(itemKeys.detail(v.id), data)
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: itemKeys.all }),
      ])
    },
    ...options,
  })
}

export function useUpdateItemPricing(options?: BaseMutationOptions<unknown, ItemWithRelations>) {
  const qc = useQueryClient()
  return useMutation<ItemWithRelations, Error, unknown>({
    meta: { operation: 'update', entity: 'Item Pricing' },
    mutationFn: (input) => callAction(updateItemPricingAction, input),
    onSuccess: async (data, vars) => {
      const v = (vars ?? {}) as { id?: string }
      if (v.id) {
        qc.setQueryData(itemKeys.detail(v.id), data)
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: itemKeys.all }),
      ])
    },
    ...options,
  })
}

export function useUpdateItemRelations(options?: BaseMutationOptions<unknown, ItemWithRelations>) {
  const qc = useQueryClient()
  return useMutation<ItemWithRelations, Error, unknown>({
    meta: { operation: 'update', entity: 'Item Relations' },
    mutationFn: (input) => callAction(updateItemRelationsAction, input),
    onSuccess: async (data, vars) => {
      const v = (vars ?? {}) as { id?: string }
      if (v.id) {
        qc.setQueryData(itemKeys.detail(v.id), data)
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: itemKeys.all }),
      ])
    },
    ...options,
  })
}

export function useUpdateItemStock(options?: BaseMutationOptions<unknown, ItemWithRelations>) {
  const qc = useQueryClient()
  return useMutation<ItemWithRelations, Error, unknown>({
    meta: { operation: 'update', entity: 'Item Stock' },
    mutationFn: (input) => callAction(updateItemStockAction, input),
    onSuccess: async (data, vars) => {
      const v = (vars ?? {}) as { id?: string }
      if (v.id) {
        qc.setQueryData(itemKeys.detail(v.id), data)
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: itemKeys.all }),
      ])
    },
    ...options,
  })
}

export function useUpdateItemTracking(options?: BaseMutationOptions<unknown, ItemWithRelations>) {
  const qc = useQueryClient()
  return useMutation<ItemWithRelations, Error, unknown>({
    meta: { operation: 'update', entity: 'Item Tracking' },
    mutationFn: (input) => callAction(updateItemTrackingAction, input),
    onSuccess: async (data, vars) => {
      const v = (vars ?? {}) as { id?: string }
      if (v.id) {
        qc.setQueryData(itemKeys.detail(v.id), data)
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: itemKeys.all }),
      ])
    },
    ...options,
  })
}

export function useDeleteItem(options?: BaseMutationOptions<{ id: string; organizationId: string }, { id: string }>) {
  const qc = useQueryClient()
  return useMutation<{ id: string }, Error, { id: string; organizationId: string }>({
    mutationFn: (input) => callAction(deleteItemAction, input),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: itemKeys.all }),
        qc.invalidateQueries({ queryKey: itemKeys.org(vars.organizationId) }),
      ])
      if (vars.id) {
        qc.removeQueries({ queryKey: itemKeys.detail(vars.id) })
      }
    },
    ...options,
  })
}
