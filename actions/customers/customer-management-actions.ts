"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

import { requireOrg } from "@/services/_shared/require-org"
import {
  CustomerCreateSchema,
  CustomerUpdateSchema,
  type CustomerCreateInput,
  type CustomerUpdateInput,
} from "@/services/customer/customer.schemas"
import {
  createCustomerForManagement,
  getCustomerDetailAnalyticsForOrg,
  getCustomerManagementDataForOrg,
  removeCustomerForManagement,
  updateCustomerForManagement,
  type CustomerDetailAnalytics,
  type CustomerManagementData,
  type CustomerManagementRow,
} from "@/services/customer/customer.service"

export type CustomerManagementInput = CustomerCreateInput
export type {
  CustomerDetailAnalytics,
  CustomerManagementData,
  CustomerManagementRow,
}

export type CustomerRemovalResult = {
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
  "Customer not found",
  "Customer was created but could not be reloaded",
  "Customer was updated but could not be reloaded",
])

const CUSTOMER_PERMISSIONS = {
  read: "customers.read",
  analytics: "customers.analytics.read",
  create: "customers.create",
  update: "customers.update",
  delete: "customers.delete",
} as const

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function hasPermission(userPermissions: string[] | undefined, requiredPermission: string) {
  return Boolean(userPermissions?.includes("*") || userPermissions?.includes(requiredPermission))
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "A customer with that code already exists for this organization"
    }

    if (error.code === "P2003") {
      return "Referenced organization or customer record was not found"
    }
  }

  if (error instanceof Error) {
    if (ACTIONABLE_ERROR_MESSAGES.has(error.message)) {
      return error.message
    }

    if (error.message.startsWith("Missing permission: ")) {
      return error.message
    }

    if (error.message.startsWith("Customer with code")) {
      return error.message
    }
  }

  return fallback
}

function parseCreateInput(input: unknown) {
  const parsed = CustomerCreateSchema.safeParse(input)

  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  return {
    success: false as const,
    error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid customer input",
  }
}

function parseUpdateInput(input: unknown) {
  const parsed = CustomerUpdateSchema.safeParse(input)

  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  return {
    success: false as const,
    error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid customer input",
  }
}

async function assertOrganizationAccess(organizationId: string, requiredPermission: string) {
  const requestedOrganizationId = cleanText(organizationId)

  if (!requestedOrganizationId) {
    throw new Error("Organization is required")
  }

  const { orgId, user } = await requireOrg()

  if (orgId !== requestedOrganizationId) {
    throw new Error("You do not have access to this organization")
  }

  if (!hasPermission(user.permissions, requiredPermission)) {
    throw new Error(`Missing permission: ${requiredPermission}`)
  }

  return orgId
}

function revalidateCustomerPaths() {
  revalidatePath("/dashboard/customers", "page")
  revalidatePath("/[locale]/dashboard/customers", "page")
  revalidatePath("/[locale]/dashboard/customers/[id]", "page")
  revalidatePath("/[locale]/dashboard/customers/[id]/edit", "page")
  revalidatePath("/[locale]/dashboard/customers/[id]/orders", "page")
  revalidatePath("/[locale]/dashboard/pos", "page")
  revalidatePath("/[locale]/dashboard/sales", "page")
  revalidatePath("/[locale]/dashboard/finance/receivables", "page")
}

export async function getCustomerManagementData(
  organizationId: string,
): Promise<ActionResult<CustomerManagementData>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, CUSTOMER_PERMISSIONS.read)
    const data = await getCustomerManagementDataForOrg(scopedOrganizationId)

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching customer management data:", error)
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to fetch customer management data"),
    }
  }
}

export async function getCustomerAnalyticsData(
  organizationId: string,
  customerId: string,
): Promise<ActionResult<CustomerDetailAnalytics>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, CUSTOMER_PERMISSIONS.analytics)
    const scopedCustomerId = cleanText(customerId)

    if (!scopedCustomerId) {
      return { success: false, error: "Customer not found" }
    }

    const data = await getCustomerDetailAnalyticsForOrg(scopedOrganizationId, scopedCustomerId)
    return { success: true, data }
  } catch (error) {
    console.error("Error fetching customer analytics data:", error)
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to fetch customer analytics"),
    }
  }
}

export async function createManagedCustomer(
  organizationId: string,
  input: CustomerManagementInput,
): Promise<ActionResult<CustomerManagementRow>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, CUSTOMER_PERMISSIONS.create)
    const parsed = parseCreateInput(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await createCustomerForManagement(scopedOrganizationId, parsed.data)
    revalidateCustomerPaths()

    return { success: true, data: row }
  } catch (error) {
    console.error("Error creating managed customer:", error)
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to create customer"),
    }
  }
}

export async function updateManagedCustomer(
  organizationId: string,
  customerId: string,
  input: CustomerUpdateInput,
): Promise<ActionResult<CustomerManagementRow>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, CUSTOMER_PERMISSIONS.update)
    const scopedCustomerId = cleanText(customerId)

    if (!scopedCustomerId) {
      return { success: false, error: "Customer not found" }
    }

    const parsed = parseUpdateInput(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await updateCustomerForManagement(scopedOrganizationId, scopedCustomerId, parsed.data)
    revalidateCustomerPaths()

    return { success: true, data: row }
  } catch (error) {
    console.error("Error updating managed customer:", error)
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to update customer"),
    }
  }
}

export async function deleteManagedCustomer(
  organizationId: string,
  customerId: string,
): Promise<ActionResult<CustomerRemovalResult>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, CUSTOMER_PERMISSIONS.delete)
    const scopedCustomerId = cleanText(customerId)

    if (!scopedCustomerId) {
      return { success: false, error: "Customer not found" }
    }

    const data = await removeCustomerForManagement(scopedOrganizationId, scopedCustomerId)
    revalidateCustomerPaths()

    return { success: true, data }
  } catch (error) {
    console.error("Error archiving managed customer:", error)
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to archive customer"),
    }
  }
}
