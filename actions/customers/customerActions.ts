"use server"

import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerOrders,
  getCustomers,
  updateCustomer,
} from "@/actions/customers/customerAction2"
import type { ServerActionResult } from "@/lib/error-handling/types"
import type { Customer, CustomerOrdersResult, CustomerWithStats } from "@/types/customerTypes"
import type { CustomerEditFormData, CustomerFormData } from "@/validations/customer"
import { customerEditSchema, customerSchema } from "@/validations/customer"
import { revalidatePath } from "next/cache"

function assertSuccess<T>(result: ServerActionResult<T>): T {
  if (!result.success) {
    throw new Error(result.error?.userMessage || result.error?.message || "Customer action failed")
  }

  if (result.data === undefined) {
    throw new Error("Customer action returned no data")
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
  return getCustomers()
}

export async function getCustomerAction(id: string): Promise<ServerActionResult<Customer | null>> {
  if (!id || id === "new" || id.trim().length === 0) {
    throw new Error("Invalid customer ID provided")
  }

  return getCustomer(id)
}

export async function createCustomerAction(data: CustomerFormData): Promise<ServerActionResult<Customer>> {
  const validatedData = customerSchema.parse(data)
  const result = await createCustomer(validatedData)
  const customer = assertSuccess(result)

  revalidateCustomerPaths(customer.id)

  return { success: true, data: customer }
}

export async function updateCustomerAction(data: CustomerEditFormData): Promise<ServerActionResult<Customer>> {
  const validatedData = customerEditSchema.parse(data)
  const result = await updateCustomer(validatedData)
  const customer = assertSuccess(result)

  revalidateCustomerPaths(customer.id)

  return { success: true, data: customer }
}

export async function deleteCustomerAction(id: string): Promise<ServerActionResult<void>> {
  if (!id) {
    throw new Error("Customer ID is required")
  }

  const result = await deleteCustomer(id)
  if (!result.success) {
    throw new Error(result.error?.userMessage || result.error?.message || "Customer delete failed")
  }

  revalidateCustomerPaths(id)

  return { success: true, data: undefined }
}

export async function getCustomerOrdersAction(customerId: string): Promise<ServerActionResult<CustomerOrdersResult>> {
  if (!customerId || customerId.trim().length === 0) {
    throw new Error("Invalid customer ID provided")
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
}
