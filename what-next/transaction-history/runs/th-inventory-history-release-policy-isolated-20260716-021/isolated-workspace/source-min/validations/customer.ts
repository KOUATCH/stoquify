import { z } from "zod"

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  creditLimit: z.number().min(0, "Credit limit must be positive").optional(),
  paymentTerms: z.number().min(1, "Payment terms must be at least 1 day").default(30),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const customerEditSchema = customerSchema.extend({
  id: z.string(),
})

export type CustomerFormData = z.infer<typeof customerSchema>
export type CustomerEditFormData = z.infer<typeof customerEditSchema>
export type CustomerState = {
  errors?: {
    name?: string[]
    email?: string[]
    phone?: string[]
    creditLimit?: string[]
    paymentTerms?: string[]
  }
  message?: string | null
}