import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { itemStandardInclude } from './includes'

// Shared
export const idSchema = z.string().min(1, 'ID is required')
export const orgIdSchema = z.string().min(1, 'Organization ID is required')

// Primitive fields
export const basicInfoSchema = z.object({
  nameEn: z.string().max(255).optional(),
  nameFr: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  imageUrls: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
})

export const detailsSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(128),
  barcode: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  weight: z.coerce.number().min(0).optional().nullable(),
  // Optional extra codes fields if present on your model
  upc: z.string().optional().nullable(),
  ean: z.string().optional().nullable(),
  mpn: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
})

export const pricingSchema = z.object({
  costPrice: z.coerce.number().min(0, 'Cost price must be positive or 0'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be positive or 0'),
  tax: z.coerce.number().min(0).optional().nullable(), // If your model stores a tax percent
})

export const relationsSchema = z.object({
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  taxRateId: z.string().optional().nullable(),
})

export const stockSchema = z.object({
  minStockLevel: z.coerce.number().min(0),
  maxStockLevel: z.coerce.number().min(0).optional().nullable(),
  unitOfMeasure: z.string().optional().nullable(), // free text if you store it on Item
})

// Optional app-level tracking flags
export const trackingSchema = z.object({
  isActive: z.coerce.boolean().optional().nullable(),
  isSerialTracked: z.coerce.boolean().optional().nullable(),
  slug: z.string().optional().nullable(),
})

// export const createItemSchema = z.object({
//   organizationId: orgIdSchema,
//   // Core
//   name: basicInfoSchema.shape.name,
//   sku: detailsSchema.shape.sku,
//   // Optionals
//   description: basicInfoSchema.shape.description,
//   imageUrls: basicInfoSchema.shape.imageUrls,
//   thumbnail: basicInfoSchema.shape.thumbnail,
//   barcode: detailsSchema.shape.barcode,
//   dimensions: detailsSchema.shape.dimensions,
//   weight: detailsSchema.shape.weight,
//   upc: detailsSchema.shape.upc,
//   ean: detailsSchema.shape.ean,
//   mpn: detailsSchema.shape.mpn,
//   isbn: detailsSchema.shape.isbn,
//   // Pricing
//   costPrice: pricingSchema.shape.costPrice.default(0),
//   sellingPrice: pricingSchema.shape.sellingPrice.default(0),
//   tax: pricingSchema.shape.tax,
//   // Relations
//   categoryId: relationsSchema.shape.categoryId,
//   brandId: relationsSchema.shape.brandId,
//   unitId: relationsSchema.shape.unitId,
//   taxRateId: relationsSchema.shape.taxRateId,
//   // Stock policy stored at item-level
//   minStockLevel: stockSchema.shape.minStockLevel.default(0),
//   maxStockLevel: stockSchema.shape.maxStockLevel,
//   unitOfMeasure: stockSchema.shape.unitOfMeasure,
//   // Tracking
//   isActive: trackingSchema.shape.isActive.default(true),
//   isSerialTracked: trackingSchema.shape.isSerialTracked.default(false),
//   slug: trackingSchema.shape.slug,
//   // Optional initial inventory to seed a location
//   initialInventory: z
//     .object({
//       locationId: z.string().min(1),
//       quantity: z.coerce.number().int().min(0),
//       unitCost: z.coerce.number().min(0).default(0),
//       notes: z.string().optional(),
//       createdById: z.string().optional(),
//       batchNumber: z.string().optional(),
//       serialNumbers: z.array(z.string()).optional(),
//       expiryDate: z.coerce.date().optional(),
//       referenceNumber: z.string().optional(),
//     })
//     .optional(),
// })

export const listItemsSchema = z.object({
  organizationId: orgIdSchema,
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'nameEn', 'sku', 'sellingPrice', 'costPrice'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().optional(),
  taxRateId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

export const getItemSchema = z.object({
  id: idSchema,
  organizationId: orgIdSchema,
})

export const updateByIdBase = z.object({
  id: idSchema,
  organizationId: orgIdSchema,
})

export const updateBasicInfoSchema = updateByIdBase.merge(basicInfoSchema.partial())
export const updateDetailsSchema = updateByIdBase.merge(detailsSchema.partial())
export const updatePricingSchema = updateByIdBase.merge(pricingSchema.partial())
export const updateRelationsSchema = updateByIdBase.merge(relationsSchema.partial())

export const updateStockSchema = updateByIdBase.merge(
  stockSchema
    .extend({
      // Optional inventory delta to apply to a specific location
      adjustInventory: z
        .object({
          locationId: z.string().min(1),
          deltaQty: z.coerce.number(), // can be positive or negative
          unitCost: z.coerce.number().min(0).default(0),
          notes: z.string().optional(),
          createdById: z.string().optional(),
          batchNumber: z.string().optional(),
          serialNumbers: z.array(z.string()).optional(),
          expiryDate: z.coerce.date().optional(),
          referenceNumber: z.string().optional(),
        })
        .optional(),
    })
    .partial()
)

export const updateTrackingSchema = updateByIdBase.merge(trackingSchema.partial())

export const deleteItemSchema = getItemSchema


// Zod schema for creating an item (align with your Item model)
export const createItemSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  // Core
  nameEn: z.string().min(1, 'English name is required').max(255),
  nameFr: z.string().optional().nullable(),
  sku: z.string().min(1, 'SKU is required').max(128),

  // Optionals
  descriptionEn: z.string().optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  imageUrls: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  weight: z.coerce.number().min(0).optional().nullable(),

  // Optional item codes
  upc: z.string().optional().nullable(),
  ean: z.string().optional().nullable(),
  mpn: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),

  // Pricing
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).optional().nullable(), // percent

  // Relations
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  taxRateId: z.string().optional().nullable(),

  // Stock policy stored at item-level
  minStockLevel: z.coerce.number().min(0).default(0),
  maxStockLevel: z.coerce.number().min(0).optional().nullable(),
  unitOfMeasure: z.string().optional().nullable(),

  // Tracking
  isActive: z.coerce.boolean().optional().nullable(),
  isSerialTracked: z.coerce.boolean().optional().nullable(),
  slug: z.string().optional().nullable(),

  // Optional initial inventory to seed a location
  initialInventory: z
    .object({
      locationId: z.string().min(1),
      quantity: z.coerce.number().int().min(0),
      unitCost: z.coerce.number().min(0).default(0),
      notes: z.string().optional(),
      createdById: z.string().optional(),
      batchNumber: z.string().optional(),
      serialNumbers: z.array(z.string()).optional(),
      expiryDate: z.coerce.date().optional(),
      referenceNumber: z.string().optional(),
    })
    .optional(),
})

// Shared Action result shape
export type ActionResult<T> = { success: true; data: T; message?: string } | { success: false; error: string }

// ItemWithRelations based on our include
export type ItemWithRelations = Prisma.ItemGetPayload<{
  include: typeof itemStandardInclude
}>

// Slug utility
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120)
}

// Note: Revalidation functions moved to @/lib/item/revalidation.ts
// to avoid importing server-only functions in client components

// // Zod schema for creating an item (aligns to imageUrls as a string)
// export const createItemSchema = z.object({
//   organizationId: z.string().min(1, "Organization ID is required"),

//   // Core
//   name: z.string().min(1, "Name is required").max(255),
//   sku: z.string().min(1, "SKU is required").max(128),

//   // Optionals (strings or null)
//   description: z.string().optional().nullable(),
//   imageUrls: z.string().optional().nullable(), // IMPORTANT: string, not string[]
//   thumbnail: z.string().optional().nullable(),
//   barcode: z.string().optional().nullable(),
//   dimensions: z.string().optional().nullable(),
//   weight: z.coerce.number().min(0).optional().nullable(),

//   // Optional item codes
//   upc: z.string().optional().nullable(),
//   ean: z.string().optional().nullable(),
//   mpn: z.string().optional().nullable(),
//   isbn: z.string().optional().nullable(),

//   // Pricing
//   costPrice: z.coerce.number().min(0).default(0),
//   sellingPrice: z.coerce.number().min(0).default(0),
//   tax: z.coerce.number().min(0).optional().nullable(), // percent

//   // Relations
//   categoryId: z.string().optional().nullable(),
//   brandId: z.string().optional().nullable(),
//   unitId: z.string().optional().nullable(),
//   taxRateId: z.string().optional().nullable(),

//   // Stock policy at item-level
//   minStockLevel: z.coerce.number().min(0).default(0),
//   maxStockLevel: z.coerce.number().min(0).optional().nullable(),
//   unitOfMeasure: z.string().optional().nullable(),

//   // Tracking
//   isActive: z.coerce.boolean().optional().nullable(),
//   isSerialTracked: z.coerce.boolean().optional().nullable(),
//   slug: z.string().optional().nullable(),

//   // Optional initial inventory to seed a location
//   initialInventory: z
//     .object({
//       locationId: z.string().min(1),
//       quantity: z.coerce.number().int().min(0),
//       unitCost: z.coerce.number().min(0).default(0),
//       notes: z.string().optional(),
//       createdById: z.string().optional(),
//       batchNumber: z.string().optional(),
//       serialNumbers: z.array(z.string()).optional(),
//       expiryDate: z.coerce.date().optional(),
//       referenceNumber: z.string().optional(),
//     })
//     .optional(),
// })

export type CreateItemInput = z.infer<typeof createItemSchema>
