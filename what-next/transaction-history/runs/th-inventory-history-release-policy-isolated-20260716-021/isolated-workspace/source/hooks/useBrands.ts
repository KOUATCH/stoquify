"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createBrand,
  deleteBrand,
  getBrandById,
  getOrgBrands,
  updateBrand,
} from "@/actions/brands/getBrandsAction"
import { notify } from "@/lib/notifications/notify"
import type { BrandCreateDTO, BrandDTO, UpdateBrandPayload } from "@/types/brand"
import { BrandKeys } from "@/types/queryKeys"

type BrandListOptions = {
  initialData?: BrandDTO[]
  enabled?: boolean
}

function invalidateBrandLists(queryClient: ReturnType<typeof useQueryClient>, organizationId?: string | null) {
  queryClient.invalidateQueries({ queryKey: BrandKeys.lists() })
  queryClient.invalidateQueries({ queryKey: BrandKeys.all })

  if (organizationId) {
    queryClient.invalidateQueries({ queryKey: BrandKeys.orgBrands(organizationId) })
    queryClient.invalidateQueries({ queryKey: BrandKeys.briefOrgBrands(organizationId) })
    queryClient.invalidateQueries({ queryKey: BrandKeys.completeOrgBrands(organizationId) })
  }
}

export function useOrgBrands(organizationId: string, options?: BrandListOptions) {
  return useQuery({
    queryKey: BrandKeys.orgBrands(organizationId),
    queryFn: async () => {
      const response = await getOrgBrands(organizationId)
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch brands")
      }
      return response.data ?? []
    },
    enabled: options?.enabled ?? Boolean(organizationId),
    initialData: options?.initialData,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useBrand(id: string, organizationId?: string) {
  return useQuery({
    queryKey: BrandKeys.detail(id),
    queryFn: async () => {
      const response = await getBrandById(id, organizationId)
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch brand")
      }
      return response.data
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useCreateBrand() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: "create", entity: "Brand", suppressSuccessNotification: true },
    mutationFn: async (data: BrandCreateDTO) => {
      const response = await createBrand(data)
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create brand")
      }
      return response.data
    },
    onSuccess: (brand) => {
      notify.success("Brand Created", `${brand.nameEn} has been added.`)
      invalidateBrandLists(queryClient, brand.organizationId)
      queryClient.setQueryData(BrandKeys.detail(brand.id), brand)
    },
    onError: (error: Error) => {
      notify.error("Brand Creation Failed", error.message)
    },
  })
}

export function useUpdateBrand() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: "update", entity: "Brand", suppressSuccessNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: UpdateBrandPayload }) => {
      const response = await updateBrand(id, data)
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to update brand")
      }
      return response.data
    },
    onSuccess: (brand) => {
      notify.success("Brand Updated", `${brand.nameEn} has been updated.`)
      queryClient.setQueryData(BrandKeys.detail(brand.id), brand)
      invalidateBrandLists(queryClient, brand.organizationId)
    },
    onError: (error: Error) => {
      notify.error("Brand Update Failed", error.message)
    },
  })
}

export function useDeleteBrand() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: "archive", entity: "Brand", suppressSuccessNotification: true },
    mutationFn: async (id: string) => {
      const response = await deleteBrand(id)
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to archive brand")
      }
      return response.data
    },
    onSuccess: (brand) => {
      notify.success("Brand Archived", `${brand.nameEn} has been archived.`)
      queryClient.removeQueries({ queryKey: BrandKeys.detail(brand.id), exact: true })
      invalidateBrandLists(queryClient, brand.organizationId)
    },
    onError: (error: Error) => {
      notify.error("Brand Archive Failed", error.message)
    },
  })
}

export function useAllOrgBrands(organizationId: string, options?: BrandListOptions) {
  return useOrgBrands(organizationId, options)
}

export function useBriefBrandsByOrgId(orgId: string, options?: BrandListOptions) {
  return useOrgBrands(orgId, options)
}
