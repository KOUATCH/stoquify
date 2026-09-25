"use client"

import { useQuery } from "@tanstack/react-query"
import { getInventoryLevels } from "@/actions/inventory/inventoryActions"

export function useTransferSourceInventory(organizationId: string, locationId: string) {
  return useQuery({
    queryKey: ["inventory", "transfer-source", organizationId, locationId],
    queryFn: async () => {
      const response = await getInventoryLevels({
        organizationId,
        filters: { locationId, transferEligible: true },
      })
      if (!response.success) throw new Error("Unable to load source inventory")
      return response.data ?? []
    },
    enabled: Boolean(organizationId && locationId),
    retry: false,
  })
}
