"use client"

import { updateItemSupplier as updateItemSupplierAction } from "@/actions/suppliers/itemSupplierActions"
import { notify } from "@/lib/notifications/notify"
import type { ItemSupplierDTO, UpdateItemSupplierDTO } from "@/types/itemSuppliers"
import {
  ItemSupplierKeys as CurrentItemSupplierKeys,
  useCreateItemSupplier,
  useDeleteItemSupplier,
  useItemSupplier,
  useOrgItemSuppliers,
  useSuspenseItemSuppliers,
} from "@/hooks/useItemSupplierQueries"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export const ItemSupplierKeys = CurrentItemSupplierKeys
export const ItemSupplierGreatKeys = CurrentItemSupplierKeys

export {
  useCreateItemSupplier as useCreateAItemSupplier,
  useDeleteItemSupplier as useDeleteAItemSupplier,
  useDeleteItemSupplier as useDeleteAItemSupplier2,
  useDeleteItemSupplier as useDeleteAItemSupplierWithOrg,
  useItemSupplier,
  useOrgItemSuppliers,
  useSuspenseItemSuppliers,
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || undefined
  if (typeof value === "object" && "toNumber" in value) {
    const numericValue = (value as { toNumber: () => number }).toNumber()
    return Number.isFinite(numericValue) ? numericValue : undefined
  }
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function toItemSupplierDTO(data: unknown): ItemSupplierDTO {
  const itemSupplier = data as ItemSupplierDTO & { unitCost?: unknown }

  return {
    ...itemSupplier,
    unitCost: toNumberOrUndefined(itemSupplier.unitCost),
  }
}

export function useUpdateItemSupplier() {
  const queryClient = useQueryClient()

  return useMutation<ItemSupplierDTO, Error, { data: UpdateItemSupplierDTO }>({
    meta: {
      operation: "update",
      entity: "Item Supplier",
      suppressSuccessNotification: true,
      suppressErrorNotification: true,
    },
    mutationFn: async ({ data }) => {
      const result = await updateItemSupplierAction({
        id: data.id,
        itemId: data.itemId,
        supplierId: data.supplierId,
        supplierProductCode: data.supplierSku ?? undefined,
        unitCost: data.unitCost,
        minimumOrderQuantity: data.minOrderQty,
        leadTimeDays: data.leadTime,
        isPreferred: data.isPreferred,
        notes: data.notes ?? undefined,
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update item supplier")
      }
      return toItemSupplierDTO(result.data)
    },
    onSuccess: (updatedItemSupplier, variables) => {
      notify.success("ItemSupplier updated successfully")

      queryClient.setQueryData(
        CurrentItemSupplierKeys.detail(variables.data.id),
        updatedItemSupplier
      )
      queryClient.invalidateQueries({ queryKey: CurrentItemSupplierKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: CurrentItemSupplierKeys.itemSuppliers(updatedItemSupplier.itemId),
      })
      queryClient.invalidateQueries({
        queryKey: CurrentItemSupplierKeys.supplierItems(updatedItemSupplier.supplierId),
      })
    },
    onError: (error) => {
      notify.error("Failed to update ItemSupplier", {
        description: error.message || "Unknown error occurred",
      })
    },
  })
}
