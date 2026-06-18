"use server"

import { revalidatePath } from "next/cache"

import { safeActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { getAuthenticatedUser } from "@/config/useAuth"
import { AuthRequiredError, ForbiddenError } from "@/services/_shared/action-errors"
import {
  BrandCreateSchema,
  BrandUpdateSchema,
  type BrandCreateInput,
  type BrandUpdateInput,
} from "@/services/brand/brand.schemas"
import {
  createBrand as createBrandService,
  deleteBrand as deleteBrandService,
  getBrandById as getBrandByIdService,
  listBrands,
  updateBrand as updateBrandService,
} from "@/services/brand/brand.service"
import type { BrandCreateDTO, BrandDTO, BrandResponse, UpdateBrandPayload } from "@/types/brand"

const BRAND_LIST_PATH = "/dashboard/inventory/brands"

function actionError<T>(error: unknown, fallback: string, data: T) {
  return {
    success: false,
    data,
    error: safeActionErrorMessage(error, {}, fallback),
  }
}

async function resolveOrgId(explicitOrgId?: string | null) {
  const user = await getAuthenticatedUser()

  if (!user?.organizationId) {
    throw new AuthRequiredError("No organization found for the current user")
  }

  if (explicitOrgId && explicitOrgId !== user.organizationId && !user.permissions?.includes("*")) {
    throw new ForbiddenError("You cannot access brands for another organization")
  }

  return user.organizationId
}

function normalizeCreateInput(data: BrandCreateDTO | Record<string, unknown>): BrandCreateInput {
  return {
    nameEn: String(data.nameEn ?? data.brandName ?? ""),
    nameFr: data.nameFr == null ? null : String(data.nameFr),
    descriptionEn: data.descriptionEn == null ? null : String(data.descriptionEn),
    descriptionFr: data.descriptionFr == null ? null : String(data.descriptionFr),
    logoUrl: data.logoUrl == null ? null : String(data.logoUrl),
  }
}

function normalizeUpdateInput(data: UpdateBrandPayload | Record<string, unknown>): BrandUpdateInput {
  return {
    ...(data.nameEn !== undefined || data.brandName !== undefined
      ? { nameEn: String(data.nameEn ?? data.brandName ?? "") }
      : {}),
    ...(data.nameFr !== undefined ? { nameFr: data.nameFr == null ? null : String(data.nameFr) } : {}),
    ...(data.descriptionEn !== undefined
      ? { descriptionEn: data.descriptionEn == null ? null : String(data.descriptionEn) }
      : {}),
    ...(data.descriptionFr !== undefined
      ? { descriptionFr: data.descriptionFr == null ? null : String(data.descriptionFr) }
      : {}),
    ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl == null ? null : String(data.logoUrl) } : {}),
    ...(data.slug !== undefined ? { slug: String(data.slug) } : {}),
    ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
  }
}

export async function getOrgBrands(organizationId?: string | null): Promise<BrandResponse> {
  try {
    const orgId = await resolveOrgId(organizationId)
    const result = await listBrands(orgId)

    return {
      success: true,
      data: result.data,
      error: null,
    }
  } catch (error) {
    return actionError<BrandDTO[]>(error, "Failed to fetch brands", [])
  }
}

export const getBrandsAction = getOrgBrands

export async function getBrandById(
  id: string,
  organizationId?: string | null,
): Promise<{ success: boolean; data: BrandDTO | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(organizationId)
    const brand = await getBrandByIdService(orgId, id)

    return {
      success: true,
      data: brand,
      error: null,
    }
  } catch (error) {
    return actionError<BrandDTO | null>(error, "Failed to fetch brand", null)
  }
}

export async function createBrand(
  data: BrandCreateDTO,
): Promise<{ success: boolean; data: BrandDTO | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(data.organizationId)
    const parsed = BrandCreateSchema.safeParse(normalizeCreateInput(data))

    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      }
    }

    const brand = await createBrandService(orgId, parsed.data)
    revalidatePath(BRAND_LIST_PATH)

    return {
      success: true,
      data: brand,
      error: null,
    }
  } catch (error) {
    return actionError<BrandDTO | null>(error, "Failed to create brand", null)
  }
}

export async function updateBrand(
  id: string,
  data: UpdateBrandPayload,
): Promise<{ success: boolean; data: BrandDTO | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(data.organizationId)
    const parsed = BrandUpdateSchema.safeParse(normalizeUpdateInput(data))

    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      }
    }

    const brand = await updateBrandService(orgId, id, parsed.data)
    revalidatePath(BRAND_LIST_PATH)
    revalidatePath(`${BRAND_LIST_PATH}/${id}`)

    return {
      success: true,
      data: brand,
      error: null,
    }
  } catch (error) {
    return actionError<BrandDTO | null>(error, "Failed to update brand", null)
  }
}

export async function deleteBrand(
  id: string,
): Promise<{ success: boolean; data: BrandDTO | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId()
    const brand = await deleteBrandService(orgId, id)
    revalidatePath(BRAND_LIST_PATH)
    revalidatePath(`${BRAND_LIST_PATH}/${id}`)

    return {
      success: true,
      data: brand,
      error: null,
    }
  } catch (error) {
    return actionError<BrandDTO | null>(error, "Failed to archive brand", null)
  }
}
