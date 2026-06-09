# Bilingual Schema Migration Guide

## Overview
The database has been updated to support bilingual fields (English/French) for items, categories, brands, units, and tax rates.

## Schema Changes

### Items (items table)
| Old Field | New Fields | Notes |
|-----------|------------|-------|
| `name` | `nameEn`, `nameFr` | nameEn is required, nameFr is optional |
| `description` | `descriptionEn`, `descriptionFr` | Both optional |
| `imageUrls` | `imageUrls` | Changed from String to String[] (array) |

### Categories (categories table)
| Old Field | New Fields | Notes |
|-----------|------------|-------|
| `title` | `titleEn`, `titleFr` | titleEn is required, titleFr is optional |
| `description` | `descriptionEn`, `descriptionFr` | Both optional |
| Added: `deletedAt` | `deletedAt` | Soft delete support |

### Brands (brands table)
| Old Field | New Fields | Notes |
|-----------|------------|-------|
| `description` | `descriptionEn`, `descriptionFr` | Both optional |
| Added: `deletedAt` | `deletedAt` | Soft delete support |

### Units (units table)
| Old Field | New Fields | Notes |
|-----------|------------|-------|
| `name` | `nameEn`, `nameFr` | nameEn is required, nameFr is optional |

### Tax Rates (tax_rates table)
| Old Field | New Fields | Notes |
|-----------|------------|-------|
| `taxRateName` | `nameEn`, `nameFr` | nameEn is required, nameFr is optional |

### Customers & Suppliers
| Added Field | Type | Notes |
|-------------|------|-------|
| `preferredLocale` | Locale (EN/FR) | User's preferred language |
| `currentBalance` | Decimal | Ledger balance tracking |
| `deletedAt` | DateTime | Soft delete support |

### Daily Sales Report Items
| Old Field | New Fields | Notes |
|-----------|------------|-------|
| `itemName` | `itemNameEn`, `itemNameFr` | Both required to preserve historical data |

## Migration Steps

### 1. Update Type Definitions ✅
- [x] types/item.ts
- [x] types/itemTypes.ts
- [x] types/brand.ts
- [x] types/unit.ts
- [ ] types/inventory.ts (if exists)

### 2. Update Server Actions

#### Item Actions
- [x] actions/itemsShow/getOrgItemsWithInventoryLevels.ts
- [x] actions/itemsShow/createActionItem.ts
- [x] actions/itemsShow/getOrgItems.ts
- [ ] actions/itemsShow/getBriefOrgItems.ts
- [ ] actions/itemsShow/getItemById.ts
- [ ] actions/itemsShow/updateItemBasicInfoById.ts
- [ ] actions/itemsShow/updateItemById.ts

#### Category Actions
- [ ] actions/categories/*

#### Brand Actions
- [ ] actions/brands/*

#### Unit Actions
- [ ] actions/units/*

### 3. Update Components
- [ ] components/inventory/ModernCreateItemForm.tsx
- [ ] components/inventory/ModernEditItemForm.tsx
- [ ] components/categories/ModernCategoryForm.tsx
- [ ] components/brands/* (if exists)

### 4. Update Hooks
- [ ] hooks/useItems.ts
- [ ] hooks/useAllCategoriesqueries.ts
- [ ] hooks/useAllBrandQueries.ts
- [ ] hooks/useAllUnitQueries.ts

## Code Patterns

### Querying with Bilingual Fields
```typescript
// Before
const item = await db.item.findUnique({
  select: {
    id: true,
    name: true,
    description: true,
  }
});

// After
const item = await db.item.findUnique({
  select: {
    id: true,
    nameEn: true,
    nameFr: true,
    descriptionEn: true,
    descriptionFr: true,
  }
});

// Transform for backwards compatibility
const transformed = {
  ...item,
  name: item.nameEn, // default to English
  description: item.descriptionEn,
};
```

### Creating with Bilingual Fields
```typescript
// Before
await db.item.create({
  data: {
    name: "Product",
    description: "Description",
  }
});

// After
await db.item.create({
  data: {
    nameEn: "Product",
    nameFr: "Produit",
    descriptionEn: "Description",
    descriptionFr: "Description en français",
  }
});
```

### Using the Bilingual Helper
```typescript
import { getBilingualText } from '@/types/bilingual';

const itemName = getBilingualText(item.nameEn, item.nameFr, userLocale);
```

## Utilities Created

### types/bilingual.ts
- `BilingualText` type
- `getBilingualText()` function
- `getBilingualFieldName()` function

## Testing Checklist

- [ ] Create new item with English name only
- [ ] Create new item with both English and French names
- [ ] View item list (should show English names)
- [ ] Edit item and update bilingual fields
- [ ] Search/filter items
- [ ] Generate reports (ensure legacy queries work)
- [ ] Test category CRUD operations
- [ ] Test brand CRUD operations
- [ ] Test unit CRUD operations

## Backwards Compatibility

All transformed data includes a `name` field computed from `nameEn` for backwards compatibility with existing code that hasn't been updated yet.

## Next Steps

1. Stop dev server
2. Run `npx prisma generate` to regenerate Prisma client
3. Systematically update remaining server actions
4. Update React components to use new field names
5. Update forms to support bilingual input
6. Test thoroughly before deployment
