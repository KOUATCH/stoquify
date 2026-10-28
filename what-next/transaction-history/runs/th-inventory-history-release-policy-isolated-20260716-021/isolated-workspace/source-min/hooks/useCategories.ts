"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createCategory,
  deleteCategory,
  getCategoryById,
  getOrgCategories,
  updateCategory,
} from "@/actions/categories/getCategoriesAction"
import { notify } from "@/lib/notifications/notify"
import type { CategoryCreateDTO, CategoryDTO, UpdateCategoryPayload } from "@/types/category"
import { CategoryKeys } from "@/types/queryKeys"

type CategoryListOptions = {
  initialData?: CategoryDTO[]
  enabled?: boolean
}

function invalidateCategoryLists(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId?: string | null,
) {
  queryClient.invalidateQueries({ queryKey: CategoryKeys.lists() })
  queryClient.invalidateQueries({ queryKey: CategoryKeys.all })

  if (organizationId) {
    queryClient.invalidateQueries({ queryKey: CategoryKeys.orgCategories(organizationId) })
    queryClient.invalidateQueries({ queryKey: CategoryKeys.briefOrgCategories(organizationId) })
    queryClient.invalidateQueries({ queryKey: CategoryKeys.completeOrgCategories(organizationId) })
  }
}

export function useOrgCategories(organizationId: string, options?: CategoryListOptions) {
  return useQuery({
    queryKey: CategoryKeys.orgCategories(organizationId),
    queryFn: async () => {
      const response = await getOrgCategories(organizationId)
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch categories")
      }
      return response.data ?? []
    },
    enabled: options?.enabled ?? Boolean(organizationId),
    initialData: options?.initialData,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useCategory(id: string, organizationId?: string) {
  return useQuery({
    queryKey: CategoryKeys.detail(id),
    queryFn: async () => {
      const response = await getCategoryById(id, organizationId)
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch category")
      }
      return response.data
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: "create", entity: "Category", suppressSuccessNotification: true },
    mutationFn: async (data: CategoryCreateDTO) => {
      const response = await createCategory(data)
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create category")
      }
      return response.data
    },
    onSuccess: (category) => {
      notify.success("Category Created", `${category.titleEn} has been added.`)
      invalidateCategoryLists(queryClient, category.organizationId)
      queryClient.setQueryData(CategoryKeys.detail(category.id), category)
    },
    onError: (error: Error) => {
      notify.error("Category Creation Failed", error.message)
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: "update", entity: "Category", suppressSuccessNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryPayload }) => {
      const response = await updateCategory(id, data)
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to update category")
      }
      return response.data
    },
    onSuccess: (category) => {
      notify.success("Category Updated", `${category.titleEn} has been updated.`)
      queryClient.setQueryData(CategoryKeys.detail(category.id), category)
      invalidateCategoryLists(queryClient, category.organizationId)
    },
    onError: (error: Error) => {
      notify.error("Category Update Failed", error.message)
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    meta: { operation: "archive", entity: "Category", suppressSuccessNotification: true },
    mutationFn: async (id: string) => {
      const response = await deleteCategory(id)
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to archive category")
      }
      return response.data
    },
    onSuccess: (category) => {
      notify.success("Category Archived", `${category.titleEn} has been archived.`)
      queryClient.removeQueries({ queryKey: CategoryKeys.detail(category.id), exact: true })
      invalidateCategoryLists(queryClient, category.organizationId)
    },
    onError: (error: Error) => {
      notify.error("Category Archive Failed", error.message)
    },
  })
}

export function useAllOrgCategories(organizationId: string, options?: CategoryListOptions) {
  return useOrgCategories(organizationId, options)
}

export function useBriefCategoriesByOrgId(orgId: string, options?: CategoryListOptions) {
  return useOrgCategories(orgId, options)
}
