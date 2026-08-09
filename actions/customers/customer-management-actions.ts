"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { protect } from "@/services/_shared/protect"
import {
  prepareCustomerExport,
  type CustomerExportRequest,
  type CustomerExportResult,
} from "@/services/customer/customer-export.service"
import {
  CustomerCreateSchema,
  CustomerExportRequestSchema,
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
  CustomerExportRequest,
  CustomerExportResult,
  CustomerManagementData,
  CustomerManagementRow,
}

export type CustomerRemovalResult = {
  id: string
  mode: "archived" | "deactivated"
}

const organizationInputSchema = z.object({
  organizationId: z.string().trim().min(1, "Organization is required"),
})

const customerIdentityInputSchema = organizationInputSchema.extend({
  customerId: z.string().trim().min(1, "Customer is required"),
})

const createCustomerInputSchema = organizationInputSchema.extend({
  data: CustomerCreateSchema,
})

const updateCustomerInputSchema = customerIdentityInputSchema.extend({
  data: CustomerUpdateSchema,
})

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

const getManagementData = protect<unknown, CustomerManagementData>(
  {
    permission: "customers.read",
    auditResource: "Customer",
    auditAllowed: false,
    module: {
      moduleSlug: "sales",
      surface: "customers.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    organizationInputSchema.parse(input)
    return getCustomerManagementDataForOrg(ctx.orgId)
  },
)

export async function getCustomerManagementData(organizationId: string) {
  return getManagementData({ organizationId })
}

const getAnalyticsData = protect<unknown, CustomerDetailAnalytics>(
  {
    permission: "customers.analytics.read",
    auditResource: "CustomerAnalytics",
    auditAllowed: false,
    module: {
      moduleSlug: "sales",
      surface: "customers.analytics.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = customerIdentityInputSchema.parse(input)
    return getCustomerDetailAnalyticsForOrg(ctx.orgId, parsed.customerId)
  },
)

export async function getCustomerAnalyticsData(
  organizationId: string,
  customerId: string,
) {
  return getAnalyticsData({ organizationId, customerId })
}

const createCustomer = protect<unknown, CustomerManagementRow>(
  {
    permission: "customers.create",
    auditResource: "Customer",
    auditAllowed: true,
    module: {
      moduleSlug: "sales",
      surface: "customers.create",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = createCustomerInputSchema.parse(input)
    const row = await createCustomerForManagement(ctx.orgId, parsed.data)
    revalidateCustomerPaths()
    return row
  },
)

export async function createManagedCustomer(
  organizationId: string,
  input: CustomerManagementInput,
) {
  return createCustomer({ organizationId, data: input })
}

const updateCustomer = protect<unknown, CustomerManagementRow>(
  {
    permission: "customers.update",
    auditResource: "Customer",
    auditAllowed: true,
    module: {
      moduleSlug: "sales",
      surface: "customers.update",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = updateCustomerInputSchema.parse(input)
    const row = await updateCustomerForManagement(ctx.orgId, parsed.customerId, parsed.data)
    revalidateCustomerPaths()
    return row
  },
)

export async function updateManagedCustomer(
  organizationId: string,
  customerId: string,
  input: CustomerUpdateInput,
) {
  return updateCustomer({ organizationId, customerId, data: input })
}

const archiveCustomer = protect<unknown, CustomerRemovalResult>(
  {
    permission: "customers.delete",
    auditResource: "Customer",
    auditAllowed: true,
    module: {
      moduleSlug: "sales",
      surface: "customers.delete",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = customerIdentityInputSchema.parse(input)
    const result = await removeCustomerForManagement(ctx.orgId, parsed.customerId)
    revalidateCustomerPaths()
    return result
  },
)

export async function deleteManagedCustomer(
  organizationId: string,
  customerId: string,
) {
  return archiveCustomer({ organizationId, customerId })
}

const prepareExport = protect<unknown, CustomerExportResult>(
  {
    permission: "customers.export",
    auditResource: "CustomerExport",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "sales",
      surface: "customers.export",
      accessIntent: "export",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = CustomerExportRequestSchema.parse(input)
    const requiredReadPermission =
      parsed.scope === "customer-orders" ? "customers.orders.read" : "customers.read"
    if (!hasRbacPermission(ctx.permissions, requiredReadPermission)) {
      throw new ForbiddenError(`Missing permission: ${requiredReadPermission}`)
    }
    const now = new Date()
    return prepareCustomerExport({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? now,
      now,
    })
  },
)

export async function prepareCustomerExportAction(input: CustomerExportRequest) {
  return prepareExport(input)
}
