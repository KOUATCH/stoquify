"use server"

import { revalidatePath } from "next/cache"

import { safeActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { getAuthenticatedUser } from "@/config/useAuth"
import { PERMISSIONS } from "@/lib/permissions"
import { AuthRequiredError, ForbiddenError } from "@/services/_shared/action-errors"
import {
  CategoryCreateSchema,
  CategoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from "@/services/category/category.schemas"
import {
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
  getCategoryById as getCategoryByIdService,
  listCategories,
  updateCategory as updateCategoryService,
} from "@/services/category/category.service"
import type { CategoryCreateDTO, CategoryDTO, CategoryResponse, UpdateCategoryPayload } from "@/types/category"

const CATEGORY_LIST_PATH = "/dashboard/inventory/categories"

function actionError<T>(error: unknown, fallback: string, data: T) {
  return {
    success: false,
    data,
    error: safeActionErrorMessage(error, {}, fallback),
  }
}

async function resolveOrgId(explicitOrgId?: string | null, permission?: string) {
  const user = await getAuthenticatedUser()
  const isSuperUser = user.permissions?.includes("*")

  if (!user?.organizationId) {
    throw new AuthRequiredError("No organization found for the current user")
  }

  if (permission && !isSuperUser && !user.permissions?.includes(permission)) {
    throw new ForbiddenError("You do not have permission to manage categories")
  }

  if (explicitOrgId && explicitOrgId !== user.organizationId && !isSuperUser) {
    throw new ForbiddenError("You cannot access categories for another organization")
  }

  return explicitOrgId && isSuperUser ? explicitOrgId : user.organizationId
}

function normalizeImageUrl(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw == null) return null

  const text = String(raw).trim()
  return text.length > 0 ? text : null
}

function normalizeCreateInput(data: CategoryCreateDTO | Record<string, unknown>): CategoryCreateInput {
  return {
    titleEn: String(data.titleEn ?? data.title ?? ""),
    titleFr: data.titleFr == null ? null : String(data.titleFr),
    descriptionEn:
      data.descriptionEn == null && data.description == null
        ? null
        : String(data.descriptionEn ?? data.description),
    descriptionFr: data.descriptionFr == null ? null : String(data.descriptionFr),
    imageUrl: normalizeImageUrl(data.imageUrl),
    parentId:
      data.parentId == null && data.parentCategoryId == null
        ? null
        : String(data.parentId ?? data.parentCategoryId),
    ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
  }
}

function normalizeUpdateInput(data: UpdateCategoryPayload | Record<string, unknown>): CategoryUpdateInput {
  return {
    ...(data.titleEn !== undefined || data.title !== undefined
      ? { titleEn: String(data.titleEn ?? data.title ?? "") }
      : {}),
    ...(data.titleFr !== undefined
      ? { titleFr: data.titleFr == null ? null : String(data.titleFr) }
      : {}),
    ...(data.descriptionEn !== undefined || data.description !== undefined
      ? {
          descriptionEn:
            data.descriptionEn == null && data.description == null
              ? null
              : String(data.descriptionEn ?? data.description),
        }
      : {}),
    ...(data.descriptionFr !== undefined
      ? { descriptionFr: data.descriptionFr == null ? null : String(data.descriptionFr) }
      : {}),
    ...(data.imageUrl !== undefined ? { imageUrl: normalizeImageUrl(data.imageUrl) } : {}),
    ...(data.parentId !== undefined || data.parentCategoryId !== undefined
      ? {
          parentId:
            data.parentId == null && data.parentCategoryId == null
              ? null
              : String(data.parentId ?? data.parentCategoryId),
        }
      : {}),
    ...(data.slug !== undefined ? { slug: String(data.slug) } : {}),
    ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
  }
}

export async function getOrgCategories(organizationId?: string | null): Promise<CategoryResponse> {
  try {
    const orgId = await resolveOrgId(organizationId, PERMISSIONS.READ_CATEGORIES)
    const result = await listCategories(orgId)

    return {
      success: true,
      data: result.data,
      error: null,
    }
  } catch (error) {
    return actionError<CategoryDTO[]>(error, "Failed to fetch categories", [])
  }
}

export const getCategoriesAction = getOrgCategories

export async function getCategoryById(
  id: string,
  organizationId?: string | null,
): Promise<{ success: boolean; data: CategoryDTO | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(organizationId, PERMISSIONS.READ_CATEGORIES)
    const category = await getCategoryByIdService(orgId, id)

    return {
      success: true,
      data: category,
      error: null,
    }
  } catch (error) {
    return actionError<CategoryDTO | null>(error, "Failed to fetch category", null)
  }
}

export async function createCategory(
  data: CategoryCreateDTO,
): Promise<{ success: boolean; data: CategoryDTO | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(data.organizationId, PERMISSIONS.CREATE_CATEGORIES)
    const parsed = CategoryCreateSchema.safeParse(normalizeCreateInput(data))

    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      }
    }

    const category = await createCategoryService(orgId, parsed.data)
    revalidatePath(CATEGORY_LIST_PATH)

    return {
      success: true,
      data: category,
      error: null,
    }
  } catch (error) {
    return actionError<CategoryDTO | null>(error, "Failed to create category", null)
  }
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryPayload,
): Promise<{ success: boolean; data: CategoryDTO | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(data.organizationId, PERMISSIONS.UPDATE_CATEGORIES)
    const parsed = CategoryUpdateSchema.safeParse(normalizeUpdateInput(data))

    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      }
    }

    const category = await updateCategoryService(orgId, id, parsed.data)
    revalidatePath(CATEGORY_LIST_PATH)
    revalidatePath(`${CATEGORY_LIST_PATH}/${id}`)

    return {
      success: true,
      data: category,
      error: null,
    }
  } catch (error) {
    return actionError<CategoryDTO | null>(error, "Failed to update category", null)
  }
}

export async function deleteCategory(
  id: string,
): Promise<{ success: boolean; data: CategoryDTO | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(null, PERMISSIONS.DELETE_CATEGORIES)
    const category = await deleteCategoryService(orgId, id)
    revalidatePath(CATEGORY_LIST_PATH)
    revalidatePath(`${CATEGORY_LIST_PATH}/${id}`)

    return {
      success: true,
      data: category,
      error: null,
    }
  } catch (error) {
    return actionError<CategoryDTO | null>(error, "Failed to archive category", null)
  }
}
