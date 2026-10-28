"use server"

import { revalidatePath } from "next/cache"

import { safeActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
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
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { CategoryCreateDTO, CategoryDTO, CategoryResponse, UpdateCategoryPayload } from "@/types/category"

const CATEGORY_LIST_PATH = "/dashboard/inventory/categories"

function actionError<T>(error: unknown, fallback: string, data: T) {
  return {
    success: false,
    data,
    error: safeActionErrorMessage(error, {}, fallback),
  }
}

async function requireCategoryAction(
  explicitOrgId: string | null | undefined,
  permission: string,
  options: {
    surface: string
    accessIntent: "read" | "write"
    resourceId?: string
    auditAllowed?: boolean
  },
) {
  const ctx = await requirePermission(permission, {
    resource: "Category",
    ...(options.resourceId ? { resourceId: options.resourceId } : {}),
    ...(options.auditAllowed !== undefined ? { auditAllowed: options.auditAllowed } : {}),
  })
  const requestedOrganizationId = explicitOrgId?.trim()
  if (requestedOrganizationId) {
    await assertCanUseOrganization(ctx, requestedOrganizationId)
  }
  await observeModuleAccess({
    moduleSlug: "inventory",
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    surfaceType: "action",
    surface: options.surface,
    accessIntent: options.accessIntent,
    mode: "observe",
  })
  return ctx
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
    const ctx = await requireCategoryAction(organizationId, "inventory.categories.read", {
      surface: "actions/categories/getCategoriesAction.ts#getOrgCategories",
      accessIntent: "read",
    })
    const result = await listCategories(ctx.orgId)

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
    const ctx = await requireCategoryAction(organizationId, "inventory.categories.read", {
      surface: "actions/categories/getCategoriesAction.ts#getCategoryById",
      accessIntent: "read",
      resourceId: id,
    })
    const category = await getCategoryByIdService(ctx.orgId, id)

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
    const ctx = await requireCategoryAction(data.organizationId, "inventory.categories.create", {
      surface: "actions/categories/getCategoriesAction.ts#createCategory",
      accessIntent: "write",
      auditAllowed: true,
    })
    const parsed = CategoryCreateSchema.safeParse(normalizeCreateInput(data))

    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      }
    }

    const category = await createCategoryService(ctx.orgId, parsed.data)
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
    const ctx = await requireCategoryAction(data.organizationId, "inventory.categories.update", {
      surface: "actions/categories/getCategoriesAction.ts#updateCategory",
      accessIntent: "write",
      resourceId: id,
      auditAllowed: true,
    })
    const parsed = CategoryUpdateSchema.safeParse(normalizeUpdateInput(data))

    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      }
    }

    const category = await updateCategoryService(ctx.orgId, id, parsed.data)
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
    const ctx = await requireCategoryAction(undefined, "inventory.categories.delete", {
      surface: "actions/categories/getCategoriesAction.ts#deleteCategory",
      accessIntent: "write",
      resourceId: id,
      auditAllowed: true,
    })
    const category = await deleteCategoryService(ctx.orgId, id)
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
