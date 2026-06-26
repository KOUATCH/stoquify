# Bilingual Schema Migration - Implementation Summary

## Executive Summary

Your database has been updated to support **bilingual content (English/French)** for core entities. This migration affects items, categories, brands, units, tax rates, customers, suppliers, and more. The codebase has been systematically updated to handle these changes while maintaining backwards compatibility.

## What Changed

### Database Schema Changes

#### 1. Items Table
- `name` → `nameEn` (required) + `nameFr` (optional)
- `description` → `descriptionEn` + `descriptionFr`
- `imageUrls` changed from `String` to `String[]` (array)
- Added: `deletedAt` for soft deletes
- Fields: `barcode`, `upc`, `ean`, `mpn`, `isbn`, `color` now available
- Decimal precision improved for quantities and prices

#### 2. Categories Table
- `title` → `titleEn` (required) + `titleFr` (optional)
- `description` → `descriptionEn` + `descriptionFr`
- Added: `deletedAt` for soft deletes

#### 3. Brands Table
- `description` → `descriptionEn` + `descriptionFr`
- Added: `deletedAt` for soft deletes
- `logoUrl` field available

#### 4. Units Table
- `name` → `nameEn` (required) + `nameFr` (optional)

#### 5. Tax Rates Table
- `taxRateName` → `nameEn` (required) + `nameFr` (optional)

#### 6. Customers & Suppliers
- Added: `preferredLocale` (EN/FR) - user's language preference
- Added: `currentBalance` - for ledger tracking
- Added: `deletedAt` - soft delete support

## Files Updated

### ✅ Type Definitions
- `types/bilingual.ts` - NEW: Helper functions for bilingual text
- `types/item.ts` - Updated for bilingual fields
- `types/itemTypes.ts` - Updated DTOs and payloads
- `types/brand.ts` - Updated for bilingual descriptions
- `types/unit.ts` - Updated for bilingual names

### ✅ Server Actions - Items
- `actions/itemsShow/getOrgItemsWithInventoryLevels.ts` - Queries nameEn/nameFr
- `actions/itemsShow/createActionItem.ts` - Uses nameEn for slug generation
- `actions/itemsShow/getOrgItems.ts` - Transforms bilingual fields with backwards compatibility

### ✅ Server Actions - Categories
- `actions/categories/getOrgCategories.ts` - Queries titleEn/titleFr with backwards compatibility

### ✅ Server Actions - Brands
- `actions/brands/getBrandsAction.ts` - Includes bilingual descriptions and soft delete filter

### 📋 Utility Scripts Created
- `scripts/bilingual-migration-guide.md` - Detailed migration guide
- `scripts/update-bilingual-queries.ts` - Helper functions for transformations

## Backwards Compatibility Strategy

All transformed data includes computed fields for backwards compatibility:

```typescript
// Example transformation
{
  ...item,
  nameEn: "Product",
  nameFr: "Produit",
  name: "Product", // computed from nameEn for backwards compatibility
}
```

This allows existing code that references `name` to continue working while new code can use `nameEn`/`nameFr`.

## Helper Functions Available

### types/bilingual.ts

```typescript
// Get text in preferred locale
getBilingualText(enText, frText, locale) // locale: 'en' | 'fr'

// Get field name for queries
getBilingualFieldName('name', 'fr') // returns 'nameFr'
```

### scripts/update-bilingual-queries.ts

```typescript
// Transform functions
transformItemForBackwardsCompatibility(item)
transformCategoryForBackwardsCompatibility(category)
transformUnitForBackwardsCompatibility(unit)
transformTaxRateForBackwardsCompatibility(taxRate)

// Standard select objects
itemBilingualSelect
categoryBilingualSelect
brandBilingualSelect
unitBilingualSelect
taxRateBilingualSelect

// Image URL helpers
formatImageUrls(imageUrls) // Array to comma-separated string
parseImageUrlsForStorage(imageUrls) // String to array for DB
```

## Next Steps Required

### 1. Regenerate Prisma Client ⚠️ CRITICAL
```bash
# Stop your dev server first, then run:
npx prisma generate

# Then restart your dev server
npm run dev
```

### 2. Remaining Server Actions to Update

#### Items
- [ ] `actions/itemsShow/getBriefOrgItems.ts`
- [ ] `actions/itemsShow/getItemById.ts`
- [ ] `actions/itemsShow/updateItemBasicInfoById.ts` (partially done)
- [ ] `actions/itemsShow/updateItemById.ts`
- [ ] `actions/itemsShow/getSimpleOrgItems.ts`
- [ ] `actions/item/*` (if exists)

#### Categories
- [ ] `actions/categories/createCategory.ts`
- [ ] `actions/categories/updateCategoryById.ts`
- [ ] `actions/categories/getCategoryById.ts`

#### Brands
- [ ] `actions/brands/createBrands.ts`
- [ ] `actions/brands/updateBrandById.ts`
- [ ] `actions/brands/getBrandById.ts`

#### Units
- [ ] `actions/units/getUnitsAction.ts`
- [ ] All unit CRUD operations

#### Analytics/Reports (Lower Priority)
- [ ] Update analytics queries that reference item names
- [ ] Update sales reports
- [ ] Update daily sales report item names

### 3. React Components to Update

#### Forms
- [ ] `components/inventory/ModernCreateItemForm.tsx`
- [ ] `components/inventory/ModernEditItemForm.tsx`
- [ ] `components/categories/ModernCategoryForm.tsx`
- [ ] Any brand/unit forms

#### Display Components
- [ ] Item list/grid components
- [ ] Category displays
- [ ] Brand displays
- [ ] Any component displaying item/category/brand names

### 4. Hooks to Update
- [ ] `hooks/useItems.ts`
- [ ] `hooks/useAllCategoriesqueries.ts`
- [ ] `hooks/useAllBrandQueries.ts`
- [ ] `hooks/useAllUnitQueries.ts`

### 5. Testing Checklist

#### Create Operations
- [ ] Create item with English name only
- [ ] Create item with both English and French names
- [ ] Create category bilingually
- [ ] Create brand with descriptions

#### Read Operations
- [ ] List items (verify English names display)
- [ ] View item details
- [ ] Filter/search items
- [ ] Category hierarchy display

#### Update Operations
- [ ] Update item basic info (bilingual)
- [ ] Update category
- [ ] Update brand

#### Reports
- [ ] Sales analytics (verify names display)
- [ ] Inventory reports
- [ ] Daily sales reports

## Code Patterns

### Query Pattern
```typescript
const items = await db.item.findMany({
  where: {
    organizationId: orgId,
    isActive: true,
    deletedAt: null, // Soft delete filter
  },
  select: {
    id: true,
    nameEn: true,
    nameFr: true,
    descriptionEn: true,
    descriptionFr: true,
    imageUrls: true, // Now an array
    // ... other fields
  },
});

// Transform for backwards compatibility
const transformed = items.map(item => ({
  ...item,
  name: item.nameEn, // Default to English
  description: item.descriptionEn,
  imageUrls: item.imageUrls.join(','), // Array to string
}));
```

### Create Pattern
```typescript
await db.item.create({
  data: {
    nameEn: "Product Name",
    nameFr: "Nom du Produit",
    descriptionEn: "Description",
    descriptionFr: "Description en français",
    imageUrls: ["url1", "url2"], // Array format
    // ... other fields
  },
});
```

### Soft Delete Pattern
```typescript
// Instead of delete, set deletedAt
await db.item.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

## Breaking Changes

### ⚠️ Critical Breaking Changes

1. **Field Names**
   - `item.name` → `item.nameEn`
   - `category.title` → `category.titleEn`
   - `unit.name` → `unit.nameEn`
   - `taxRate.taxRateName` → `taxRate.nameEn`

2. **ImageUrls Format**
   - Changed from `String` to `String[]`
   - Queries need to handle array format
   - Display code needs to parse arrays

3. **Soft Deletes**
   - Always filter: `deletedAt: null` in queries
   - Use update instead of delete for soft deletes

## Common Errors & Solutions

### Error: "Column items.name does not exist"
**Solution**: Update query to use `nameEn` instead of `name`

### Error: "Type string[] is not assignable to type string"
**Solution**: Use `formatImageUrls()` helper or `.join(',')` to convert array to string

### Error: "Prisma client out of sync"
**Solution**: Run `npx prisma generate`

## Performance Considerations

- **Soft deletes**: Always include `deletedAt: null` in where clauses for performance
- **Bilingual queries**: Consider user's preferred locale to return appropriate field
- **Indexes**: Database has indexes on `nameEn`, `titleEn` for performance

## Locale Support

The system now supports:
- `EN` (English) - Default
- `FR` (French) - Optional

User preference stored in:
- `User.preferredLocale`
- `Customer.preferredLocale`
- `Supplier.preferredLocale`
- `Organization.defaultLocale`

## Migration Status

### ✅ Completed
- Type definitions updated
- Core item actions updated (3 files)
- Category actions updated (1 file)
- Brand actions updated (1 file)
- Helper utilities created
- Migration documentation created

### 📋 In Progress / Pending
- Remaining server actions (~30+ files)
- React components (~15+ files)
- Hooks (~10+ files)
- Analytics/Reports (multiple files)

## Support & Resources

- **Migration Guide**: `scripts/bilingual-migration-guide.md`
- **Helper Functions**: `scripts/update-bilingual-queries.ts`
- **Type Utilities**: `types/bilingual.ts`

## Rollback Plan

If issues arise:
1. The Prisma schema can be reverted by restoring from backup
2. Database migrations can be rolled back
3. Transformed responses maintain backwards compatibility, so old code should still work

---

**Last Updated**: $(date)
**Migration Phase**: Initial Implementation Complete
**Next Phase**: Systematic update of remaining files
