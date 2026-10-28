"use server"

import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerOrders,
  getCustomers,
  updateCustomer,
} from "@/actions/customers/customerAction2"
import { safeServerActionErrorResult } from "@/actions/_shared/safe-action-responses"
import type { ServerActionResult } from "@/lib/error-handling/types"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import type { Customer, CustomerOrdersResult, CustomerWithStats } from "@/types/customerTypes"
import type { CustomerEditFormData, CustomerFormData } from "@/validations/customer"
import { customerEditSchema, customerSchema } from "@/validations/customer"
import { revalidatePath } from "next/cache"

function assertSuccess<T>(result: ServerActionResult<T>): T {
  if (!result.success) {
    throw new BusinessRuleError(result.error?.userMessage || result.error?.message || "Customer action failed")
  }

  if (result.data === undefined) {
    throw new BusinessRuleError("Customer action returned no data")
  }

  return result.data
}

function revalidateCustomerPaths(customerId?: string): void {
  revalidatePath("/[locale]/dashboard/customers", "page")

  if (customerId) {
    revalidatePath("/[locale]/dashboard/customers/[id]", "page")
    revalidatePath("/[locale]/dashboard/customers/[id]/orders", "page")
  }
}

export async function getCustomersAction(): Promise<ServerActionResult<CustomerWithStats[]>> {
  try {
    return await getCustomers()
  } catch (error) {
    return safeServerActionErrorResult<CustomerWithStats[]>(error, { action: "getCustomersAction" })
  }
}

export async function getCustomerAction(id: string): Promise<ServerActionResult<Customer | null>> {
  try {
    if (!id || id === "new" || id.trim().length === 0) {
      throw new BusinessRuleError("Invalid customer ID provided")
    }

    return await getCustomer(id)
  } catch (error) {
    return safeServerActionErrorResult<Customer | null>(error, { action: "getCustomerAction" })
  }
}

export async function createCustomerAction(data: CustomerFormData): Promise<ServerActionResult<Customer>> {
  try {
    const validatedData = customerSchema.parse(data)
    const result = await createCustomer(validatedData)
    const customer = assertSuccess(result)

    revalidateCustomerPaths(customer.id)

    return { success: true, data: customer }
  } catch (error) {
    return safeServerActionErrorResult<Customer>(error, { action: "createCustomerAction" })
  }
}

export async function updateCustomerAction(data: CustomerEditFormData): Promise<ServerActionResult<Customer>> {
  try {
    const validatedData = customerEditSchema.parse(data)
    const result = await updateCustomer(validatedData)
    const customer = assertSuccess(result)

    revalidateCustomerPaths(customer.id)

    return { success: true, data: customer }
  } catch (error) {
    return safeServerActionErrorResult<Customer>(error, { action: "updateCustomerAction" })
  }
}

export async function deleteCustomerAction(id: string): Promise<ServerActionResult<void>> {
  try {
    if (!id) {
      throw new BusinessRuleError("Customer ID is required")
    }

    const result = await deleteCustomer(id)
    if (!result.success) {
      throw new BusinessRuleError(result.error?.userMessage || result.error?.message || "Customer delete failed")
    }

    revalidateCustomerPaths(id)

    return { success: true, data: undefined }
  } catch (error) {
    return safeServerActionErrorResult<void>(error, { action: "deleteCustomerAction" })
  }
}

export async function getCustomerOrdersAction(customerId: string): Promise<ServerActionResult<CustomerOrdersResult>> {
  try {
    if (!customerId || customerId.trim().length === 0) {
      throw new BusinessRuleError("Invalid customer ID provided")
    }

    const orders = assertSuccess(await getCustomerOrders(customerId))
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)

    return {
      success: true,
      data: {
        orders,
        stats: {
          totalOrders,
          totalRevenue,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        },
      },
    }
  } catch (error) {
    return safeServerActionErrorResult<CustomerOrdersResult>(error, { action: "getCustomerOrdersAction" })
  }
}
