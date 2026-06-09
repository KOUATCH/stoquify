# Client-Safe Authentication Patterns

This document outlines the authentication patterns implemented to resolve NEXT_REDIRECT errors and ensure smooth routing throughout the application.

## Problem Overview

The original authentication implementation caused `NEXT_REDIRECT` errors when:
- Client components called server actions that used `getAuthenticatedUser()`
- Server actions triggered `redirect()` calls during client-side rendering
- Mixed authentication patterns between client and server components

## Solution Architecture

### 1. Client-Safe Authentication Hook

**File**: `hooks/useClientAuth.ts`

```typescript
import { useClientAuth } from '@/hooks/useClientAuth'

// In your component
const { session, status, user, organizationId, isAuthenticated, isLoading } = useClientAuth()
```

**Benefits**:
- Uses NextAuth client-side session management
- Handles redirects properly in client components
- Provides consistent loading and authentication states
- No `NEXT_REDIRECT` errors

### 2. Client-Safe Server Actions

**Pattern**: Instead of using `getAuthenticatedUser()`, use `auth()` directly and return error objects.

**Example**:
```typescript
"use server"

import { auth } from "@/auth"

export async function someActionClientSafe(organizationId?: string) {
  try {
    const session = await auth()

    if (!session?.user) {
      return { success: false, error: "Not authenticated", data: null }
    }

    const userOrgId = organizationId || session.user.organizationId

    if (!userOrgId) {
      return { success: false, error: "No organization ID", data: null }
    }

    // Your logic here

    return { success: true, data: result, error: null }
  } catch (error) {
    return { success: false, error: "Operation failed", data: null }
  }
}
```

### 3. Available Client-Safe Actions

#### Purchase Orders
- `actions/purchaseOrderWorkflow/clientSafePurchaseOrderActions.ts`
  - `getOrgPurchaseOrdersClientSafe()`
  - `getOrgPurchaseOrdersByLocationClientSafe()`

#### Inventory
- `actions/inventory/clientSafeInventoryActions.ts`
  - `getOrgItemsWithInventoryLevelsClientSafe()`
  - `getInventoryStatsClientSafe()`
  - `getInventoryLevelsClientSafe()`

#### Customers
- `actions/customers/clientSafeCustomerActions.ts`
  - `getOrgCustomersClientSafe()`
  - `getCustomerByIdClientSafe()`

#### Locations
- `actions/locations/clientSafeLocationActions.ts`
  - `getOrgLocationsClientSafe()`
  - `getLocationByIdClientSafe()`

### 4. Authentication Utilities

**File**: `utils/clientSafeAuth.ts`

```typescript
import { useRequireAuth, useRequireOrganization, withAuth, withOrgAuth } from '@/utils/clientSafeAuth'

// Hook for components that need authentication
const auth = useRequireAuth()

// Hook for components that need organization access
const auth = useRequireOrganization()

// Higher-order component for protecting routes
export default withAuth(MyComponent)

// Higher-order component for organization-protected routes
export default withOrgAuth(MyComponent)
```

## Migration Guide

### From Old Pattern (❌ Causes NEXT_REDIRECT)
```typescript
// OLD - Client component
"use client"
import { useSession } from "@/lib/auth-client"

function MyComponent() {
  const { data: session, status } = useSession()
  const user = session?.user
  const orgId = user?.organizationId

  // This may call server actions that use getAuthenticatedUser()
  const data = await someServerAction(orgId)
}
```

### To New Pattern (✅ No Redirect Issues)
```typescript
// NEW - Client component
"use client"
import { useClientAuth } from "@/hooks/useClientAuth"

function MyComponent() {
  const { user, organizationId, isLoading, isAuthenticated } = useClientAuth()

  // Handle loading state
  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) return <AuthRequired />
  if (!organizationId) return <OrgRequired />

  // Use client-safe server actions
  const data = await someServerActionClientSafe(organizationId)
}
```

## Files Updated

### Dashboard Pages (34 files updated)
- All POS terminal pages
- All cash drawer management pages
- All inventory management pages
- Purchase order workflow pages
- Sales dashboard pages

### Key Changes Made
1. **Import Replacement**: `useSession` → `useClientAuth`
2. **Session Access**: `session?.user` → `user`
3. **Organization ID**: `session?.user?.organizationId` → `organizationId`
4. **Loading States**: Added proper `isLoading` and `isAuthenticated` checks
5. **Server Actions**: Created client-safe versions for common operations

## Best Practices

### 1. Always Use Client-Safe Patterns in Client Components
```typescript
// ✅ Good
"use client"
import { useClientAuth } from "@/hooks/useClientAuth"

// ❌ Avoid
"use client"
import { useSession } from "@/lib/auth-client"
```

### 2. Handle Loading States Properly
```typescript
const { isLoading, isAuthenticated, organizationId } = useClientAuth()

if (isLoading) return <LoadingComponent />
if (!isAuthenticated) return <AuthRequiredComponent />
if (!organizationId) return <OrgRequiredComponent />
```

### 3. Use Client-Safe Server Actions
```typescript
// ✅ Good - Returns error objects
const result = await getOrgItemsClientSafe(organizationId)
if (!result.success) {
  // Handle error
}

// ❌ Avoid - May throw NEXT_REDIRECT
const items = await getOrgItems(organizationId) // Uses getAuthenticatedUser()
```

### 4. Consistent Error Handling
```typescript
// All client-safe actions return this format
interface ActionResult<T> {
  success: boolean
  data: T | null
  error: string | null
}
```

## Testing Checklist

- [ ] All dashboard pages load without NEXT_REDIRECT errors
- [ ] Navigation between routes works smoothly
- [ ] Authentication states are handled properly
- [ ] Loading states display correctly
- [ ] Error states are handled gracefully
- [ ] Organization-specific data loads correctly

## Performance Benefits

1. **Reduced Server Calls**: Client-side session management
2. **Better UX**: Proper loading states and error handling
3. **No Redirect Loops**: Eliminates authentication-related routing issues
4. **Consistent Patterns**: Standardized authentication across components

## Future Considerations

1. **Additional Server Actions**: Create client-safe versions as needed
2. **Component Library**: Build reusable auth-protected components
3. **Type Safety**: Add stronger TypeScript types for auth patterns
4. **Testing**: Add unit tests for authentication flows