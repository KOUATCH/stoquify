"use server"

import type { ServerActionResult } from "@/lib/error-handling/types"
import { requirePermission } from "@/lib/security/rbac"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import {
  archiveLegacyCustomerForOrg,
  createLegacyCustomerForOrg,
  getLegacyCustomerByIdForOrg,
  getLegacyCustomerOrdersForOrg,
  getLegacyCustomersForOrg,
  updateLegacyCustomerForOrg,
} from "@/services/customer/customer.service"
import type { CustomerCreateInput, CustomerUpdateInput } from "@/services/customer/customer.schemas"
import type {
  Customer,
  CustomerOrder,
  CustomerWithStats,
} from "@/types/customerTypes"
import type { CustomerEditFormData, CustomerFormData } from "@/validations/customer"

type CustomerPermission = "customers.read" | "customers.create" | "customers.update" | "customers.delete"

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

async function requireCustomerAccess(
  permission: CustomerPermission,
  options: { resourceId?: string; auditAllowed?: boolean } = {},
): Promise<string> {
  const ctx = await requirePermission(permission, {
    resource: "Customer",
    ...(options.resourceId ? { resourceId: options.resourceId } : {}),
    ...(options.auditAllowed !== undefined ? { auditAllowed: options.auditAllowed } : {}),
  })

  if (!ctx.orgId) {
    throw new BusinessRuleError("Organization ID is required")
  }

  return ctx.orgId
}

function toCreateInput(data: CustomerFormData): CustomerCreateInput {
  return {
    name: data.name.trim(),
    code: emptyToNull(data.code),
    email: emptyToNull(data.email),
    phone: emptyToNull(data.phone),
    address: emptyToNull(data.address),
    taxId: emptyToNull(data.taxId),
    creditLimit: data.creditLimit ?? null,
    paymentTerms: data.paymentTerms ?? 30,
    notes: emptyToNull(data.notes),
    isActive: data.isActive ?? true,
    preferredLocale: "EN",
  }
}

function toUpdateInput(data: CustomerEditFormData): CustomerUpdateInput {
  return {
    name: data.name.trim(),
    code: emptyToNull(data.code),
    email: emptyToNull(data.email),
    phone: emptyToNull(data.phone),
    address: emptyToNull(data.address),
    taxId: emptyToNull(data.taxId),
    creditLimit: data.creditLimit ?? null,
    paymentTerms: data.paymentTerms ?? 30,
    notes: emptyToNull(data.notes),
    isActive: data.isActive ?? true,
    preferredLocale: "EN",
  }
}

export async function getCustomers(): Promise<ServerActionResult<CustomerWithStats[]>> {
  const organizationId = await requireCustomerAccess("customers.read")
  const result = await getLegacyCustomersForOrg(organizationId)

  return { success: true, data: result }
}

export async function getCustomer(id: string, _organizationId?: string): Promise<ServerActionResult<Customer | null>> {
  if (!id) {
    throw new BusinessRuleError("Customer ID is required")
  }

  const organizationId = await requireCustomerAccess("customers.read", { resourceId: id })
  const customer = await getLegacyCustomerByIdForOrg(organizationId, id)

  return { success: true, data: customer }
}

export async function createCustomer(data: CustomerFormData): Promise<ServerActionResult<Customer>> {
  if (!data.name) {
    throw new BusinessRuleError("Customer name is required")
  }

  const organizationId = await requireCustomerAccess("customers.create", { auditAllowed: true })
  const customer = await createLegacyCustomerForOrg(organizationId, toCreateInput(data))

  return { success: true, data: customer }
}

export async function updateCustomer(data: CustomerEditFormData): Promise<ServerActionResult<Customer>> {
  if (!data.id) {
    throw new BusinessRuleError("Customer ID is required")
  }

  if (!data.name) {
    throw new BusinessRuleError("Customer name is required")
  }

  const organizationId = await requireCustomerAccess("customers.update", {
    resourceId: data.id,
    auditAllowed: true,
  })
  const customer = await updateLegacyCustomerForOrg(organizationId, data.id, toUpdateInput(data))

  return { success: true, data: customer }
}

export async function getCustomerOrders(customerId: string): Promise<ServerActionResult<CustomerOrder[]>> {
  if (!customerId) {
    throw new BusinessRuleError("Customer ID is required")
  }

  const organizationId = await requireCustomerAccess("customers.read", { resourceId: customerId })
  const result = await getLegacyCustomerOrdersForOrg(organizationId, customerId)

  return { success: true, data: result }
}

export async function deleteCustomer(id: string): Promise<ServerActionResult<void>> {
  if (!id) {
    throw new BusinessRuleError("Customer ID is required")
  }

  const organizationId = await requireCustomerAccess("customers.delete", {
    resourceId: id,
    auditAllowed: true,
  })
  await archiveLegacyCustomerForOrg(organizationId, id)

  return { success: true, data: undefined }
}
