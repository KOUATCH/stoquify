import { z } from "zod"

const idSchema = z.string().trim().min(1)
const hashSchema = z.string().trim().min(8).optional()
const moneyValueSchema = z.union([z.string().trim().min(1), z.number()])
const dateInputSchema = z.union([z.date(), z.string().trim().min(1)]).optional()

export const supplierInvoiceLineInputSchema = z.object({
  purchaseOrderLineId: idSchema.optional(),
  goodsReceiptLineId: idSchema,
  itemId: idSchema.optional(),
  description: z.string().trim().min(1).max(240),
  quantity: moneyValueSchema,
  unitCost: moneyValueSchema,
  taxRate: moneyValueSchema.optional(),
  notes: z.string().trim().max(500).optional(),
})

export const postSupplierInvoiceInputSchema = z.object({
  organizationId: idSchema,
  supplierId: idSchema,
  purchaseOrderId: idSchema.optional(),
  invoiceNumber: z.string().trim().min(1).max(80),
  invoiceDate: dateInputSchema,
  dueDate: dateInputSchema,
  currency: z.string().trim().length(3).default("XAF"),
  createdById: idSchema.optional(),
  approvedById: idSchema.optional(),
  idempotencyKey: z.string().trim().min(8).optional(),
  documentHash: hashSchema,
  evidenceHash: hashSchema,
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(supplierInvoiceLineInputSchema).min(1),
})

export const requestSupplierBankChangeInputSchema = z
  .object({
    organizationId: idSchema,
    supplierId: idSchema,
    bankAccountId: idSchema.optional(),
    requestedById: idSchema,
    bankName: z.string().trim().max(120).optional(),
    accountName: z.string().trim().max(160).optional(),
    accountNumber: z.string().trim().max(80).optional(),
    mobileMoneyProvider: z.string().trim().max(80).optional(),
    mobileMoneyPhone: z.string().trim().max(40).optional(),
    reason: z.string().trim().max(500).optional(),
    documentHash: hashSchema,
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((value) => Boolean(value.accountNumber || value.mobileMoneyPhone), {
    message: "Supplier bank change requires a bank account number or mobile money phone.",
    path: ["accountNumber"],
  })

export const approveSupplierBankChangeInputSchema = z.object({
  organizationId: idSchema,
  changeRequestId: idSchema,
  approvedById: idSchema,
  documentHash: hashSchema,
})

export const supplierPaymentAllocationInputSchema = z.object({
  supplierInvoiceId: idSchema,
  amount: moneyValueSchema,
})

export const releaseSupplierPaymentInputSchema = z.object({
  organizationId: idSchema,
  supplierId: idSchema,
  bankAccountId: idSchema,
  method: z.enum(["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CREDIT", "STORE_CREDIT", "CHEQUE", "MIXED"]),
  requestedById: idSchema,
  approvedById: idSchema,
  releasedById: idSchema.optional(),
  paymentDate: dateInputSchema,
  idempotencyKey: z.string().trim().min(8).optional(),
  documentHash: hashSchema,
  evidenceHash: hashSchema,
  notes: z.string().trim().max(1000).optional(),
  allocations: z.array(supplierPaymentAllocationInputSchema).min(1),
})

export type PostSupplierInvoiceInput = z.input<typeof postSupplierInvoiceInputSchema>
export type RequestSupplierBankChangeInput = z.input<typeof requestSupplierBankChangeInputSchema>
export type ApproveSupplierBankChangeInput = z.input<typeof approveSupplierBankChangeInputSchema>
export type ReleaseSupplierPaymentInput = z.input<typeof releaseSupplierPaymentInputSchema>
