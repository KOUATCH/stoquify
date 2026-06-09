/**
 * Script to help update database queries for bilingual support
 * This provides helper functions for common transformations
 */

// Transformation helpers for backwards compatibility
export function transformItemForBackwardsCompatibility(item: any) {
  return {
    ...item,
    name: item.nameEn || item.nameFr || '',
    description: item.descriptionEn || item.descriptionFr || '',
    // Keep original bilingual fields
    nameEn: item.nameEn,
    nameFr: item.nameFr,
    descriptionEn: item.descriptionEn,
    descriptionFr: item.descriptionFr,
  };
}

export function transformCategoryForBackwardsCompatibility(category: any) {
  return {
    ...category,
    title: category.titleEn || category.titleFr || '',
    description: category.descriptionEn || category.descriptionFr || '',
    // Keep original bilingual fields
    titleEn: category.titleEn,
    titleFr: category.titleFr,
    descriptionEn: category.descriptionEn,
    descriptionFr: category.descriptionFr,
  };
}

export function transformUnitForBackwardsCompatibility(unit: any) {
  return {
    ...unit,
    name: unit.nameEn || unit.nameFr || '',
    // Keep original bilingual fields
    nameEn: unit.nameEn,
    nameFr: unit.nameFr,
  };
}

export function transformTaxRateForBackwardsCompatibility(taxRate: any) {
  return {
    ...taxRate,
    taxRateName: taxRate.nameEn || taxRate.nameFr || '',
    name: taxRate.nameEn || taxRate.nameFr || '',
    // Keep original bilingual fields
    nameEn: taxRate.nameEn,
    nameFr: taxRate.nameFr,
  };
}

// Standard select fields for bilingual entities
export const itemBilingualSelect = {
  id: true,
  nameEn: true,
  nameFr: true,
  slug: true,
  sku: true,
  barcode: true,
  descriptionEn: true,
  descriptionFr: true,
  imageUrls: true,
  thumbnail: true,
  costPrice: true,
  sellingPrice: true,
  minStockLevel: true,
  maxStockLevel: true,
  reorderLevel: true,
  reorderQuantity: true,
  isActive: true,
  isDiscontinued: true,
  deletedAt: true,
  organizationId: true,
  categoryId: true,
  brandId: true,
  unitId: true,
  taxRateId: true,
  createdAt: true,
  updatedAt: true,
};

export const categoryBilingualSelect = {
  id: true,
  titleEn: true,
  titleFr: true,
  slug: true,
  descriptionEn: true,
  descriptionFr: true,
  imageUrl: true,
  parentId: true,
  isActive: true,
  deletedAt: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
};

export const brandBilingualSelect = {
  id: true,
  brandName: true,
  slug: true,
  descriptionEn: true,
  descriptionFr: true,
  logoUrl: true,
  isActive: true,
  deletedAt: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
};

export const unitBilingualSelect = {
  id: true,
  nameEn: true,
  nameFr: true,
  symbol: true,
  type: true,
  baseUnit: true,
  conversionRate: true,
  isActive: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
};

export const taxRateBilingualSelect = {
  id: true,
  nameEn: true,
  nameFr: true,
  rate: true,
  type: true,
  isActive: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
};

// Helper to format imageUrls (now an array in DB)
export function formatImageUrls(imageUrls: string[] | string | null): string {
  if (!imageUrls) return '';
  if (Array.isArray(imageUrls)) {
    return imageUrls.join(',');
  }
  return imageUrls;
}

// Helper to parse imageUrls for storage (DB expects array)
export function parseImageUrlsForStorage(imageUrls: string | string[] | null): string[] {
  if (!imageUrls) return [];
  if (Array.isArray(imageUrls)) return imageUrls;
  return imageUrls.split(',').map(url => url.trim()).filter(Boolean);
}
