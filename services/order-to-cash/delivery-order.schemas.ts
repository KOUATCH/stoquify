import { z } from "zod"

const idSchema = z.string().trim().min(1).max(191)
const quantitySchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(?:\.\d{1,3})?$/.test(value), {
    message: "Quantity must be positive with at most three decimal places",
  })
  .refine((value) => Number(value) > 0, { message: "Quantity must be greater than zero" })

export const createDeliveryOrderSchema = z
  .object({
    commandId: idSchema,
    customerId: idSchema,
    locationId: idSchema,
    dueDate: z.coerce.date().optional().nullable(),
    deliveryAddress: z.record(z.unknown()).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    lines: z
      .array(
        z
          .object({
            itemId: idSchema,
            quantity: quantitySchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict()

const transitionSchema = z
  .object({
    commandId: idSchema,
    salesOrderId: idSchema,
    expectedVersion: z.coerce.number().int().nonnegative(),
  })
  .strict()

export const confirmDeliveryOrderSchema = transitionSchema
export const postDeliveryGoodsIssueSchema = transitionSchema.extend({
  occurredAt: z.coerce.date().optional(),
})
export const createDeliveryBillingOutcomeSchema = transitionSchema.extend({
  issuedAt: z.coerce.date().optional(),
})

export type CreateDeliveryOrderInput = z.infer<typeof createDeliveryOrderSchema> & {
  organizationId: string
  actorId: string
}
export type ConfirmDeliveryOrderInput = z.infer<typeof confirmDeliveryOrderSchema> & {
  organizationId: string
  actorId: string
}
export type PostDeliveryGoodsIssueInput = z.infer<typeof postDeliveryGoodsIssueSchema> & {
  organizationId: string
  actorId: string
}
export type CreateDeliveryBillingOutcomeInput = z.infer<
  typeof createDeliveryBillingOutcomeSchema
> & {
  organizationId: string
  actorId: string
}
