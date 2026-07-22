"use server"

import { revalidatePath } from "next/cache"

import { safeActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import {
  CategoryCreateSchema,
  type CategoryCreateInput,
} from "@/services/category/category.schemas"
import { createCategory as createCategoryService } from "@/services/category/category.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { CategoryCreateDTO } from "@/types/category"

const CATEGORY_LIST_PATH = "/dashboard/inventory/categories"
const MAX_BULK_CATEGORY_BATCH_SIZE = 100
const MAX_BULK_CATEGORY_FAILURES = 20

type BulkCategoryFailure = {
  index: number
  error: string
}

export type BulkCategoryResult = {
  success: boolean
  data: {
    requestedCount: number
    createdCount: number
    failedCount: number
    failures: BulkCategoryFailure[]
    failuresTruncated: boolean
  }
  error: string | null
}

function normalizeImageUrl(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw == null) return null

  const text = String(raw).trim()
  return text.length > 0 ? text : null
}

function normalizeCreateInput(data: CategoryCreateDTO): CategoryCreateInput {
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

function emptyResult(requestedCount: number, error: string): BulkCategoryResult {
  return {
    success: false,
    data: {
      requestedCount,
      createdCount: 0,
      failedCount: requestedCount,
      failures: [],
      failuresTruncated: requestedCount > 0,
    },
    error,
  }
}

function boundedError(error: unknown, fallback: string) {
  return safeActionErrorMessage(error, {}, fallback).slice(0, 200)
}

export async function createBulkCategories(
  categories: CategoryCreateDTO[],
): Promise<BulkCategoryResult> {
  const requestedCount = categories.length

  try {
    const ctx = await requirePermission("inventory.categories.create", {
      resource: "CategoryBulkImport",
      auditAllowed: true,
    })

    const explicitOrgIds = Array.from(
      new Set(
        categories
          .map((category) => category.organizationId?.trim())
          .filter((organizationId): organizationId is string => Boolean(organizationId)),
      ),
    )
    if (explicitOrgIds.length > 1) {
      return emptyResult(requestedCount, "A category import must target one organization")
    }
    if (explicitOrgIds[0]) {
      await assertCanUseOrganization(ctx, explicitOrgIds[0])
    }

    await observeModuleAccess({
      moduleSlug: "inventory",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/categories/createBulkCategories.ts#createBulkCategories",
      accessIntent: "write",
      mode: "observe",
    })

    if (requestedCount > MAX_BULK_CATEGORY_BATCH_SIZE) {
      return emptyResult(
        requestedCount,
        `Category imports are limited to ${MAX_BULK_CATEGORY_BATCH_SIZE} rows`,
      )
    }

    let createdCount = 0
    let failedCount = 0
    const failures: BulkCategoryFailure[] = []

    for (const [index, category] of categories.entries()) {
      const parsed = CategoryCreateSchema.safeParse(normalizeCreateInput(category))
      if (!parsed.success) {
        failedCount += 1
        if (failures.length < MAX_BULK_CATEGORY_FAILURES) {
          failures.push({
            index,
            error: parsed.error.issues.map((issue) => issue.message).join("; ").slice(0, 200),
          })
        }
        continue
      }

      try {
        await createCategoryService(ctx.orgId, parsed.data)
        createdCount += 1
      } catch (error) {
        failedCount += 1
        if (failures.length < MAX_BULK_CATEGORY_FAILURES) {
          failures.push({ index, error: boundedError(error, "Failed to create category") })
        }
      }
    }

    if (createdCount > 0) revalidatePath(CATEGORY_LIST_PATH)

    return {
      success: failedCount === 0,
      data: {
        requestedCount,
        createdCount,
        failedCount,
        failures,
        failuresTruncated: failedCount > failures.length,
      },
      error: failedCount === 0 ? null : "Some categories could not be created",
    }
  } catch (error) {
    return emptyResult(
      requestedCount,
      boundedError(error, "Failed to create categories"),
    )
  }
}
