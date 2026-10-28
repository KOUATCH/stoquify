"use server"

import { revalidatePath } from "next/cache"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { BusinessRuleError, ForbiddenError, getPrismaKnownRequest } from "@/services/_shared/action-errors"
import { requireOrg } from "@/services/_shared/require-org"
import {
  SupplierCreateSchema,
  SupplierUpdateSchema,
  type SupplierCreateInput,
  type SupplierUpdateInput,
} from "@/services/supplier/supplier.schemas"
import {
  createSupplierForManagement,
  getSupplierDetailAnalyticsForOrg,
  getSupplierManagementDataForOrg,
  removeSupplierForManagement,
  updateSupplierForManagement,
  type SupplierDetailAnalytics,
  type SupplierManagementData,
  type SupplierManagementRow,
} from "@/services/supplier/supplier.service"

export type SupplierManagementInput = SupplierCreateInput
export type {
  SupplierDetailAnalytics,
  SupplierManagementData,
  SupplierManagementRow,
}

export type SupplierRemovalResult = {
  id: string
  mode: "archived" | "deactivated"
}

type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

const ACTIONABLE_ERROR_MESSAGES = new Set([
  "Unauthorized: no active organization",
  "Organization is required",
  "You do not have access to this organization",
  "Supplier not found",
  "Supplier was created but could not be reloaded",
  "Supplier was updated but could not be reloaded",
])

const SUPPLIER_PERMISSIONS = {
  read: "purchases.suppliers.read",
  create: "purchases.suppliers.create",
  update: "purchases.suppliers.update",
  delete: "purchases.suppliers.delete",
} as const

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function hasPermission(userPermissions: string[] | undefined, requiredPermission: string) {
  return Boolean(userPermissions?.includes("*") || userPermissions?.includes(requiredPermission))
}

function getActionErrorMessage(error: unknown, fallback: string) {
  const prismaError = getPrismaKnownRequest(error)

  if (prismaError) {
    if (prismaError.code === "P2002") {
      return "A supplier with that code already exists for this organization"
    }

    if (prismaError.code === "P2003") {
      return "Referenced organization or supplier record was not found"
    }
  }

  if (error instanceof Error) {
    if (ACTIONABLE_ERROR_MESSAGES.has(error.message)) {
      return error.message
    }

    if (error.message.startsWith("Missing permission: ")) {
      return error.message
    }

    if (
      error.message.startsWith("Supplier with code") ||
      error.message.startsWith("Cannot delete supplier")
    ) {
      return error.message
    }
  }

  return fallback
}

function parseCreateInput(input: unknown) {
  const parsed = SupplierCreateSchema.safeParse(input)

  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  return {
    success: false as const,
    error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid supplier input",
  }
}

function parseUpdateInput(input: unknown) {
  const parsed = SupplierUpdateSchema.safeParse(input)

  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  return {
    success: false as const,
    error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid supplier input",
  }
}

async function assertOrganizationAccess(organizationId: string, requiredPermission: string) {
  const requestedOrganizationId = cleanText(organizationId)

  if (!requestedOrganizationId) {
    throw new BusinessRuleError("Organization is required")
  }

  const { orgId, user } = await requireOrg()

  if (orgId !== requestedOrganizationId) {
    throw new ForbiddenError("You do not have access to this organization")
  }

  if (!hasPermission(user.permissions, requiredPermission)) {
    throw new ForbiddenError(`Missing permission: ${requiredPermission}`)
  }

  return orgId
}

function revalidateSupplierPaths() {
  revalidatePath("/dashboard/purchases/suppliers", "page")
  revalidatePath("/dashboard/suppliersSystem", "page")
  revalidatePath("/[locale]/dashboard/purchases/suppliers", "page")
  revalidatePath("/[locale]/dashboard/suppliersSystem", "page")
  revalidatePath("/dashboard/inventory/items", "page")
  revalidatePath("/[locale]/dashboard/inventory/items", "page")
}

export async function getSupplierManagementData(
  organizationId: string,
): Promise<ActionResult<SupplierManagementData>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, SUPPLIER_PERMISSIONS.read)
    const data = await getSupplierManagementDataForOrg(scopedOrganizationId)

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching supplier management data",
        error,
        { action: "getSupplierManagementData" },
        getActionErrorMessage(error, "Failed to fetch supplier management data"),
      ),
    }
  }
}

export async function getSupplierAnalyticsData(
  organizationId: string,
  supplierId: string,
): Promise<ActionResult<SupplierDetailAnalytics>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, SUPPLIER_PERMISSIONS.read)
    const scopedSupplierId = cleanText(supplierId)

    if (!scopedSupplierId) {
      return { success: false, error: "Supplier not found" }
    }

    const data = await getSupplierDetailAnalyticsForOrg(scopedOrganizationId, scopedSupplierId)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching supplier analytics data",
        error,
        { action: "getSupplierAnalyticsData" },
        getActionErrorMessage(error, "Failed to fetch supplier analytics"),
      ),
    }
  }
}

export async function createManagedSupplier(
  organizationId: string,
  input: SupplierManagementInput,
): Promise<ActionResult<SupplierManagementRow>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, SUPPLIER_PERMISSIONS.create)
    const parsed = parseCreateInput(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await createSupplierForManagement(scopedOrganizationId, parsed.data)
    revalidateSupplierPaths()

    return { success: true, data: row }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error creating managed supplier",
        error,
        { action: "createManagedSupplier" },
        getActionErrorMessage(error, "Failed to create supplier"),
      ),
    }
  }
}

export async function updateManagedSupplier(
  organizationId: string,
  supplierId: string,
  input: SupplierUpdateInput,
): Promise<ActionResult<SupplierManagementRow>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, SUPPLIER_PERMISSIONS.update)
    const scopedSupplierId = cleanText(supplierId)

    if (!scopedSupplierId) {
      return { success: false, error: "Supplier not found" }
    }

    const parsed = parseUpdateInput(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await updateSupplierForManagement(scopedOrganizationId, scopedSupplierId, parsed.data)
    revalidateSupplierPaths()

    return { success: true, data: row }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating managed supplier",
        error,
        { action: "updateManagedSupplier" },
        getActionErrorMessage(error, "Failed to update supplier"),
      ),
    }
  }
}

export async function deleteManagedSupplier(
  organizationId: string,
  supplierId: string,
): Promise<ActionResult<SupplierRemovalResult>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, SUPPLIER_PERMISSIONS.delete)
    const scopedSupplierId = cleanText(supplierId)

    if (!scopedSupplierId) {
      return { success: false, error: "Supplier not found" }
    }

    const data = await removeSupplierForManagement(scopedOrganizationId, scopedSupplierId)
    revalidateSupplierPaths()

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error archiving managed supplier",
        error,
        { action: "deleteManagedSupplier" },
        getActionErrorMessage(error, "Failed to archive supplier"),
      ),
    }
  }
}
