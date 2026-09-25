import { z } from "zod"

// PurchaseOrderLine and GoodsReceiptLine persist Decimal(12,3). Reject extra
// precision instead of allowing a form or database write to truncate it.
export const purchaseQuantitySchema = z.number().finite().positive().max(999_999_999.999)
  .refine(value => /^\d{1,9}(?:\.\d{1,3})?$/.test(String(value)), "Use a positive quantity with at most three decimal places")
