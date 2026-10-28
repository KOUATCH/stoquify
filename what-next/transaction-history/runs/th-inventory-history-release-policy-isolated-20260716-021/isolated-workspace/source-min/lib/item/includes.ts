import type { Prisma } from '@prisma/client'

export const itemStandardInclude = {
  brand: {
    select: {
      id: true,
      nameEn: true,
      nameFr: true,
    },
  },
  category: {
    select: {
      id: true,
      titleEn: true,
      titleFr: true,
    },
  },
  unit: {
    select: {
      id: true,
      nameEn: true,
      nameFr: true,
      symbol: true,
    },
  },
  taxRate: {
    select: {
      id: true,
      nameEn: true,
      nameFr: true,
      rate: true,
    },
  },
} satisfies Prisma.ItemInclude

// Centralized include for consistent PO shape
export const purchaseOrderInclude = {
  supplier: {
    select: { id: true, name: true, email: true, phone: true, contactPerson: true },
  },
  location: {
    select: { id: true, name: true, address: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  approvedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  lines: {
    select: {
      id: true,
      itemId: true,
      orderedQuantity: true,
      receivedQuantity: true,
      unitCost: true,
      discount: true,
      taxRate: true,
      taxAmount: true,
      lineTotal: true,
      notes: true,
      item: {
        select: {
          id: true,
          nameEn: true,
          sku: true,
        },
      },
    },
  },
} satisfies Prisma.PurchaseOrderInclude
