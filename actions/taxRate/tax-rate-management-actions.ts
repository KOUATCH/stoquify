"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth-server"
import { db } from "@/prisma/db"
import { Prisma } from "@prisma/client"
import {
  createTaxRateForManagement,
  getTaxRateManagementDataForOrg,
  removeTaxRateForManagement,
  updateTaxRateForManagement,
  type TaxRateManagementData,
  type TaxRateManagementRow,
  type TaxRateRemovalResult,
} from "@/services/tax-rate/tax-rate.service"
import {
  TaxRateManagementSchema,
  type TaxRateManagementInput,
} from "@/services/tax-rate/tax-rate.schemas"

export type {
  TaxRateManagementData,
  TaxRateManagementInput,
  TaxRateManagementRow,
  TaxRateRemovalResult,
}

type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

const ACTIONABLE_ERROR_MESSAGES = new Set([
  "Unauthorized",
  "Organization is required",
  "Organization not found or inactive",
  "You do not have access to this organization",
  "Tax rate not found",
  "Tax rate was created but could not be reloaded",
  "Tax rate was updated but could not be reloaded",
  "This tax rate is used by items. Deactivate it instead of deleting.",
])

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "A tax rate with that name already exists for this organization"
    }

    if (error.code === "P2003") {
      const fieldName = String(error.meta?.field_name ?? error.meta?.constraint ?? "")

      if (fieldName.includes("organizationId") || fieldName.includes("tax_rates_organizationId_fkey")) {
        return "Organization not found or inactive"
      }

      if (fieldName.includes("taxRateId") || fieldName.includes("items_taxRateId_fkey")) {
        return "This tax rate is used by items. Deactivate it instead of deleting."
      }

      return "Referenced record not found"
    }
  }

  if (error instanceof Error) {
    if (ACTIONABLE_ERROR_MESSAGES.has(error.message)) {
      return error.message
    }

    if (error.message.startsWith("Tax rate ")) {
      return error.message
    }
  }

  return fallback
}

function getValidationMessage(input: unknown) {
  const parsed = TaxRateManagementSchema.safeParse(input)

  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  return {
    success: false as const,
    error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid tax rate input",
  }
}

async function assertOrganizationAccess(organizationId: string) {
  const requestedOrganizationId = cleanText(organizationId)

  if (!requestedOrganizationId) {
    throw new Error("Organization is required")
  }

  const session = await getSession()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const user = await db.user.findFirst({
    where: {
      id: session.user.id,
      isActive: true,
    },
    select: {
      organizationId: true,
      roles: {
        select: {
          permissions: true,
        },
      },
    },
  })

  if (!user) {
    throw new Error("Unauthorized")
  }

  const permissions = new Set([
    ...((session.user as any).permissions ?? []),
    ...user.roles.flatMap((role) => role.permissions ?? []),
  ])

  if (user.organizationId !== requestedOrganizationId && !permissions.has("*")) {
    throw new Error("You do not have access to this organization")
  }

  const organization = await db.organization.findFirst({
    where: {
      id: requestedOrganizationId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!organization) {
    throw new Error("Organization not found or inactive")
  }

  return organization.id
}

function revalidateTaxRatePaths() {
  revalidatePath("/dashboard/settings/tax-rates", "page")
  revalidatePath("/dashboard/inventory/items", "page")
  revalidatePath("/[locale]/dashboard/settings/tax-rates", "page")
  revalidatePath("/[locale]/dashboard/inventory/items", "page")
  revalidatePath("/[locale]/dashboard/pos", "page")
}

export async function getTaxRateManagementData(
  organizationId: string,
): Promise<ActionResult<TaxRateManagementData>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const data = await getTaxRateManagementDataForOrg(scopedOrganizationId)

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("Error fetching tax rate management data:", error)
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to fetch tax rate management data"),
    }
  }
}

export async function createManagedTaxRate(
  organizationId: string,
  input: TaxRateManagementInput,
): Promise<ActionResult<TaxRateManagementRow>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const parsed = getValidationMessage(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await createTaxRateForManagement(scopedOrganizationId, parsed.data)
    revalidateTaxRatePaths()

    return { success: true, data: row }
  } catch (error) {
    console.error("Error creating managed tax rate:", error)
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to create tax rate"),
    }
  }
}

export async function updateManagedTaxRate(
  organizationId: string,
  taxRateId: string,
  input: TaxRateManagementInput,
): Promise<ActionResult<TaxRateManagementRow>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const scopedTaxRateId = cleanText(taxRateId)

    if (!scopedTaxRateId) {
      return { success: false, error: "Tax rate not found" }
    }

    const parsed = getValidationMessage(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await updateTaxRateForManagement(scopedOrganizationId, scopedTaxRateId, parsed.data)
    revalidateTaxRatePaths()

    return { success: true, data: row }
  } catch (error) {
    console.error("Error updating managed tax rate:", error)
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to update tax rate"),
    }
  }
}

export async function deleteManagedTaxRate(
  organizationId: string,
  taxRateId: string,
): Promise<ActionResult<TaxRateRemovalResult>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const scopedTaxRateId = cleanText(taxRateId)

    if (!scopedTaxRateId) {
      return { success: false, error: "Tax rate not found" }
    }

    const data = await removeTaxRateForManagement(scopedOrganizationId, scopedTaxRateId)
    revalidateTaxRatePaths()

    return { success: true, data }
  } catch (error) {
    console.error("Error deleting managed tax rate:", error)
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to remove tax rate"),
    }
  }
}
