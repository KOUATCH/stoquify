"use server"

import { db } from "@/prisma/db"
import { err, ok } from "@/services/_shared/action-response"
import { requireOrg } from "@/services/_shared/require-org"
import type { Prisma } from "@prisma/client"

type GetOrgSuppliersInput = {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

type SupplierListItem = {
  id: string
  name: string
  code: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  taxId: string | null
  paymentTerms: number | null
  creditLimit: Prisma.Decimal | null
  notes: string | null
  isActive: boolean
  currentBalance: Prisma.Decimal
  createdAt: Date
  updatedAt: Date
}

export default async function getOrgSuppliers(input: GetOrgSuppliersInput = {}) {
  try {
    const { orgId } = await requireOrg()
    const page = Math.max(1, Number(input.page ?? 1))
    const pageSize = Math.min(200, Math.max(1, Number(input.pageSize ?? 20)))
    const skip = (page - 1) * pageSize
    const search = input.search?.trim()

    const where: Prisma.SupplierWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { contactPerson: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const [suppliers, total] = await Promise.all([
      db.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          code: true,
          contactPerson: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          taxId: true,
          paymentTerms: true,
          creditLimit: true,
          notes: true,
          isActive: true,
          currentBalance: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.supplier.count({ where }),
    ])

    return ok({
      data: suppliers as SupplierListItem[],
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (error) {
    return err(error)
  }
}
