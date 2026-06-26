# Bilingual Migration - Quick Reference Guide

## Quick Start

### 1. Regenerate Prisma Client (DO THIS FIRST!)
```bash
# Stop your dev server
npm run dev # (Ctrl+C to stop)

# Regenerate Prisma client
npx prisma generate

# Restart dev server
npm run dev
```

## Field Mapping Cheat Sheet

| Entity | Old Field | New Fields | Required |
|--------|-----------|------------|----------|
| **Item** | `name` | `nameEn`, `nameFr` | nameEn ✓ |
| | `description` | `descriptionEn`, `descriptionFr` | Both optional |
| | `imageUrls` (String) | `imageUrls` (String[]) | Changed type |
| **Category** | `title` | `titleEn`, `titleFr` | titleEn ✓ |
| | `description` | `descriptionEn`, `descriptionFr` | Both optional |
| **Unit** | `name` | `nameEn`, `nameFr` | nameEn ✓ |
| **Tax Rate** | `taxRateName` | `nameEn`, `nameFr` | nameEn ✓ |
| **Brand** | `description` | `descriptionEn`, `descriptionFr` | Both optional |

## Common Code Patterns

### Reading Items
```typescript
// ❌ OLD
const items = await db.item.findMany({
  where: { organizationId },
});

// ✅ NEW
const items = await db.item.findMany({
  where: {
    organizationId,
    isActive: true,
    deletedAt: null,
  },
  select: {
    id: true,
    nameEn: true,
    nameFr: true,
    descriptionEn: true,
    descriptionFr: true,
    imageUrls: true, // Now String[]
    // ... other fields
  },
});

// Transform for backwards compatibility
const transformed = items.map(item => ({
  ...item,
  name: item.nameEn,
  description: item.descriptionEn,
  imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls.join(',') : '',
}));
```

### Creating Items
```typescript
// ❌ OLD
await db.item.create({
  data: {
    name: "Product",
    description: "Description",
    imageUrls: "url1,url2",
  },
});

// ✅ NEW
await db.item.create({
  data: {
    nameEn: "Product",
    nameFr: "Produit", // Optional
    descriptionEn: "Description",
    descriptionFr: "Description FR", // Optional
    imageUrls: ["url1", "url2"], // Now an array
  },
});
```

### Updating Items
```typescript
// ❌ OLD
await db.item.update({
  where: { id },
  data: {
    name: "Updated Name",
  },
});

// ✅ NEW
await db.item.update({
  where: { id },
  data: {
    nameEn: "Updated Name",
    nameFr: "Nom Mis à Jour", // Optional
  },
});
```

### Deleting Items (Soft Delete)
```typescript
// ❌ OLD
await db.item.delete({ where: { id } });

// ✅ NEW (Soft Delete)
await db.item.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

### Reading Categories
```typescript
// ✅ NEW
const categories = await db.category.findMany({
  where: {
    organizationId,
    isActive: true,
    deletedAt: null,
  },
  select: {
    id: true,
    titleEn: true,
    titleFr: true,
    descriptionEn: true,
    descriptionFr: true,
    // ... other fields
  },
  orderBy: { titleEn: 'asc' },
});

// Transform
const transformed = categories.map(cat => ({
  ...cat,
  title: cat.titleEn,
  description: cat.descriptionEn,
}));
```

## Helper Functions

### Import Helpers
```typescript
import { getBilingualText } from '@/types/bilingual';
import {
  transformItemForBackwardsCompatibility,
  itemBilingualSelect,
  formatImageUrls,
  parseImageUrlsForStorage,
} from '@/scripts/update-bilingual-queries';
```

### Get Bilingual Text
```typescript
const itemName = getBilingualText(
  item.nameEn,
  item.nameFr,
  userLocale // 'en' or 'fr'
);
```

### Use Standard Selects
```typescript
const items = await db.item.findMany({
  select: itemBilingualSelect,
  where: { organizationId },
});
```

### Transform for Backwards Compatibility
```typescript
const transformed = transformItemForBackwardsCompatibility(item);
// Returns item with added .name property from .nameEn
```

### Handle Image URLs
```typescript
// Convert array to comma-separated string (for display)
const imageString = formatImageUrls(item.imageUrls);

// Convert string to array (for storage)
const imageArray = parseImageUrlsForStorage("url1,url2,url3");
```

## Common Errors & Fixes

### Error: "Column items.name does not exist"
```typescript
// ❌ Wrong
orderBy: { name: 'asc' }

// ✅ Correct
orderBy: { nameEn: 'asc' }
```

### Error: "Type 'string[]' is not assignable to 'string'"
```typescript
// ❌ Wrong
imageUrls: item.imageUrls

// ✅ Correct
imageUrls: formatImageUrls(item.imageUrls)
// or
imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls.join(',') : ''
```

### Error: "Cannot read property 'nameEn' of undefined"
```typescript
// ❌ Wrong
select: { name: true }

// ✅ Correct
select: { nameEn: true, nameFr: true }
```

## Testing Quick Checklist

- [ ] Can create item with English name only
- [ ] Can create item with both English and French
- [ ] Item list displays correctly
- [ ] Item update works
- [ ] Search/filter works
- [ ] Reports display item names correctly
- [ ] Category CRUD works
- [ ] Brand CRUD works

## Files to Update Next

### High Priority (User-Facing)
1. `actions/itemsShow/getBriefOrgItems.ts`
2. `actions/itemsShow/getItemById.ts`
3. `components/inventory/ModernCreateItemForm.tsx`
4. `components/inventory/ModernEditItemForm.tsx`

### Medium Priority
5. `actions/categories/createCategory.ts`
6. `actions/categories/updateCategoryById.ts`
7. `components/categories/ModernCategoryForm.tsx`

### Lower Priority (Analytics)
8. Analytics files with item name references
9. Report generation files

## Where to Get Help

- **Full Guide**: `scripts/bilingual-migration-guide.md`
- **Summary**: `BILINGUAL_MIGRATION_SUMMARY.md`
- **Helpers**: `scripts/update-bilingual-queries.ts`
- **Types**: `types/bilingual.ts`

## Remember

1. **Always filter soft deletes**: `deletedAt: null`
2. **Use nameEn/nameFr**: Not `name`
3. **ImageUrls is array**: Not string
4. **Transform for compatibility**: Use helper functions
5. **Test thoroughly**: Before deploying

---
**Quick Tip**: Search codebase for `.name` to find places needing updates:
```bash
grep -r "\.name" --include="*.ts" --include="*.tsx" actions/
```
