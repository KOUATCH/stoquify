"use server"

import { revalidatePath } from "next/cache"

import { safeActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
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
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { BrandCreateDTO, BrandDTO, BrandResponse, UpdateBrandPayload } from "@/types/brand"

const BRAND_LIST_PATH = "/dashboard/inventory/brands"

function actionError<T>(error: unknown, fallback: string, data: T) {
  return {
    success: false,
    data,
    error: safeActionErrorMessage(error, {}, fallback),
  }
}

async function requireBrandAction(
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
    resource: "Brand",
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
    const ctx = await requireBrandAction(organizationId, "inventory.brands.read", {
      surface: "actions/brands/getBrandsAction.ts#getOrgBrands",
      accessIntent: "read",
    })
    const result = await listBrands(ctx.orgId)

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
    const ctx = await requireBrandAction(organizationId, "inventory.brands.read", {
      surface: "actions/brands/getBrandsAction.ts#getBrandById",
      accessIntent: "read",
      resourceId: id,
    })
    const brand = await getBrandByIdService(ctx.orgId, id)

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
    const ctx = await requireBrandAction(data.organizationId, "inventory.brands.create", {
      surface: "actions/brands/getBrandsAction.ts#createBrand",
      accessIntent: "write",
      auditAllowed: true,
    })
    const parsed = BrandCreateSchema.safeParse(normalizeCreateInput(data))

    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      }
    }

    const brand = await createBrandService(ctx.orgId, parsed.data)
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
    const ctx = await requireBrandAction(data.organizationId, "inventory.brands.update", {
      surface: "actions/brands/getBrandsAction.ts#updateBrand",
      accessIntent: "write",
      resourceId: id,
      auditAllowed: true,
    })
    const parsed = BrandUpdateSchema.safeParse(normalizeUpdateInput(data))

    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      }
    }

    const brand = await updateBrandService(ctx.orgId, id, parsed.data)
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
    const ctx = await requireBrandAction(undefined, "inventory.brands.delete", {
      surface: "actions/brands/getBrandsAction.ts#deleteBrand",
      accessIntent: "write",
      resourceId: id,
      auditAllowed: true,
    })
    const brand = await deleteBrandService(ctx.orgId, id)
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
