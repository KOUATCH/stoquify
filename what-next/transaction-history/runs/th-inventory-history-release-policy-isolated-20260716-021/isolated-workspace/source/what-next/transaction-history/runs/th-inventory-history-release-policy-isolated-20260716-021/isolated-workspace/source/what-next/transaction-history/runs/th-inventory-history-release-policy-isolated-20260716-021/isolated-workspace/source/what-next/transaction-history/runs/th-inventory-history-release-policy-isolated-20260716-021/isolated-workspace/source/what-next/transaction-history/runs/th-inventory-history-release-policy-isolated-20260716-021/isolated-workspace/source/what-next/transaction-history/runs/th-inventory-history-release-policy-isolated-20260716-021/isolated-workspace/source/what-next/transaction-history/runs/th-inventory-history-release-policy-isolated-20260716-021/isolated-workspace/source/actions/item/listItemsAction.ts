'use server'

import { listItemsSchema } from '@/lib/item/schemas';
import { requirePermission } from '@/lib/security/rbac';
import {
  listItemsWithRelations,
  type PaginatedItemsWithRelations,
} from '@/services/item/item.service';

export type { ItemWithRelations } from '@/services/item/item.service';

// Shared result type
export type ActionResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string }

export type PaginatedItems = PaginatedItemsWithRelations

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
    const ctx = await requirePermission('inventory.items.read', {
      resource: 'Item',
      auditAllowed: false,
    })
    const data = await listItemsWithRelations({
      ...params,
      organizationId: ctx.orgId,
    })

    return {
      success: true,
      data,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to list items'
    return { success: false, error: message }
  }
}
