# Server Actions and Hooks Guide

This guide explains how the application has been transformed from API routes to server actions and React Query hooks following Next.js App Router best practices.

## Architecture Overview

### Before (API Routes)
```typescript 
// Old API route
app/api/purchases/orders/[id]/route.ts
```

### After (Server Actions + Hooks)
```typescript
// Server action
actions/purchaseOrders/purchaseOrderActions.ts

// React Query hook
hooks/usePurchaseOrders.ts
```

## Server Actions

Server actions are defined with the `"use server"` directive and handle data mutations and queries on the server side.

### Purchase Orders
**File:** `actions/purchaseOrders/purchaseOrderActions.ts`

```typescript
import { getPurchaseOrder, updatePurchaseOrder } from '@/actions/purchaseOrders/purchaseOrderActions'

// Get a purchase order
const order = await getPurchaseOrder(id)

// Update a purchase order
await updatePurchaseOrder(id, updateData)
```

### Locations
**File:** `actions/locations/locationActions.ts`

```typescript
import { getLocations, getLocation } from '@/actions/locations/locationActions'

// Get all locations
const locations = await getLocations()

// Get specific location
const location = await getLocation(id)
```

### Items
**File:** `actions/items/itemActions.ts`

```typescript
import { getAvailableProducts, getItem } from '@/actions/items/itemActions'

// Get available products
const products = await getAvailableProducts(true) // activeOnly

// Get specific item
const item = await getItem(id)
```

## React Query Hooks

Hooks wrap server actions and provide caching, loading states, and optimizations.

### Purchase Order Hooks
**File:** `hooks/usePurchaseOrders.ts`

```typescript
import { usePurchaseOrder, useUpdatePurchaseOrder, useReceiveItems } from '@/hooks/usePurchaseOrders'

function Component() {
  // Query hooks
  const { data: order, isLoading, error } = usePurchaseOrder(orderId)

  // Mutation hooks
  const updateMutation = useUpdatePurchaseOrder()
  const receiveMutation = useReceiveItems()

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({ id: orderId, data: updateData })
    } catch (error) {
      console.error('Update failed:', error)
    }
  }

  const handleReceive = async () => {
    try {
      await receiveMutation.mutateAsync({
        purchaseOrderId: orderId,
        locationId: selectedLocationId,
        lines: itemsToReceive
      })
    } catch (error) {
      console.error('Receive failed:', error)
    }
  }
}
```

### Location Hooks
**File:** `hooks/useLocations.ts`

```typescript
import { useLocations, useLocation, useDefaultLocation } from '@/hooks/useLocations'

function Component() {
  const { data: locations, isLoading } = useLocations()
  const { data: location } = useLocation(locationId)
  const { data: defaultLocation } = useDefaultLocation()
}
```

### Item Hooks
**File:** `hooks/useItems.ts`

```typescript
import {
  useAvailableProducts,
  useProductsInStock,
  useProductSearch
} from '@/hooks/useItems'

function Component() {
  const { data: products } = useAvailableProducts() // Active products only
  const { data: inStock } = useProductsInStock() // Products with stock > 0
  const { data: searchResults } = useProductSearch(searchTerm) // Filtered products
}
```

## Benefits

### 1. **Type Safety**
Server actions provide end-to-end type safety from client to server.

### 2. **Automatic Caching**
React Query handles caching, background updates, and stale data automatically.

### 3. **Loading States**
Built-in loading and error states:
```typescript
const { data, isLoading, error, isPending } = useQuery(...)
const mutation = useMutation(...)

if (mutation.isPending) return <LoadingSpinner />
if (error) return <ErrorMessage />
```

### 4. **Optimistic Updates**
```typescript
const { optimisticUpdate } = useOptimisticPurchaseOrderUpdate()

// Update UI immediately, revert if server action fails
optimisticUpdate(orderId, (old) => ({ ...old, status: 'updated' }))
```

### 5. **Automatic Revalidation**
Server actions automatically trigger cache invalidation:
```typescript
const updateMutation = useUpdatePurchaseOrder()

// After successful update, related queries are automatically refetched
await updateMutation.mutateAsync({ id, data })
```

## Migration Examples

### Before (Fetch API)
```typescript
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/purchases/orders/${id}`)
      const data = await response.json()
      setData(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [id])
```

### After (Server Actions + Hooks)
```typescript
const { data, isLoading, error } = usePurchaseOrder(id)

// That's it! Loading, error handling, and caching are handled automatically
```

## Best Practices

1. **Use server actions for all data operations**
2. **Wrap server actions with React Query hooks**
3. **Leverage automatic cache invalidation**
4. **Use optimistic updates for better UX**
5. **Handle loading and error states consistently**
6. **Implement proper TypeScript types**

## Error Handling

```typescript
const mutation = useMutation({
  mutationFn: serverAction,
  onError: (error) => {
    notifications.error("Operation Failed", error.message)
  },
  onSuccess: () => {
    notifications.success("Success", "Operation completed")
  }
})
```