'use server'

import { itemStandardInclude } from '@/lib/item/includes';
import { listItemsSchema } from '@/lib/item/schemas';
import { db } from '@/prisma/db';
// import { db } from '@/prisma/db'
// import { itemStandardInclude } from '@/lib/items/includes'
// import { listItemsSchema } from '@/lib/items/schemas'
import { Prisma } from '@prisma/client';

// Shared result type
export type ActionResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string }

// Item payload types
export type ItemWithRelations = Prisma.ItemGetPayload<{
  include: typeof itemStandardInclude
}>

export type PaginatedItems = {
  data: ItemWithRelations[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Normalizer to support both calling styles:
// 1) listItemsAction({ organizationId, q, page, pageSize, ... })
// 2) listItemsAction(organizationId, q?, page?, pageSize?)
function normalizeArgs(args: unknown[]) {
  if (args.length === 0) {
    return {}
  }

  const [first, second, third, fourth] = args

  // Positional form: first is string organizationId
  if (typeof first === 'string') {
    return {
      organizationId: first,
      q: typeof second === 'string' ? second : undefined,
      page: typeof third === 'number' ? third : undefined,
      pageSize: typeof fourth === 'number' ? fourth : undefined,
    }
  }

  // Object form
  if (typeof first === 'object' && first !== null) {
    return first
  }

  // Fallback to let Zod surface a clear error
  return first
}

/**
 * Lists Items with search, filters, sorting, and pagination.
 * Accepts both object input and positional args for backward compatibility.
 */
export async function listItemsAction(
  ...args: unknown[]
): Promise<ActionResult<PaginatedItems>> {
  try {
    const input = normalizeArgs(args)
    const params = listItemsSchema.parse(input)

    const {
      organizationId,
      q,
      page,
      pageSize,
      sortBy,
      sortOrder,
      categoryId,
      brandId,
      unitId,
      taxRateId,
      isActive,
    } = params

    const where: Prisma.ItemWhereInput = {
      organizationId,
      ...(q
        ? {
            OR: [
              { nameEn: { contains: q, mode: 'insensitive' } },
              { nameFr: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { barcode: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(unitId ? { unitId } : {}),
      ...(taxRateId ? { taxRateId } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    }

    const [total, rows] = await Promise.all([
      db.item.count({ where }),
      db.item.findMany({
        where,
        include: itemStandardInclude,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return {
      success: true,
      data: {
        data: rows,
        total,
        page,
        pageSize,
        totalPages,
      },
    }
  } catch (error) {
    console.error('listItemsAction error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to list items'
    return { success: false, error: message }
  }
}
