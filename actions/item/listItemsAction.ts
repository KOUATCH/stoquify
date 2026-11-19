'use server'

import { safeLoggedActionErrorMessage } from '@/actions/_shared/safe-action-responses';
import { listItemsSchema } from '@/lib/item/schemas';
import { requirePermission } from '@/lib/security/rbac';
import { ZodError } from 'zod';
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
    let userMessage = 'Failed to list items'
    if (error instanceof ZodError) {
      userMessage = 'Invalid input. Please review the form and try again.'
    } else if (error instanceof Error && 'code' in error) {
      // Codes select fixed public text; exception messages never cross this boundary.
      switch (error.code) {
        case 'UNAUTHENTICATED':
        case 'NO_ACTIVE_ORG':
          userMessage = 'Unauthenticated'
          break
        case 'FORBIDDEN':
          userMessage = 'Forbidden'
          break
        case 'ACCOUNT_LOCKED':
          userMessage = 'Account is locked'
          break
        case 'EMAIL_NOT_VERIFIED':
          userMessage = 'Email verification required'
          break
      }
    }
    const message = safeLoggedActionErrorMessage(
      'List items action failed',
      error,
      { action: 'actions/item/listItemsAction.ts#listItemsAction' },
      userMessage,
    )
    return { success: false, error: message }
  }
}
