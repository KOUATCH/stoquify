import { purchaseQuantitySchema } from "../purchase-quantity"
import { GoodsReceiptItemSchema, OrderLineSchema } from "../purchase-order.schemas"

it.each([0.001, 0.125, 8.125, 999999999.999])("keeps the supported quantity %s through ordering and receiving", quantity => {
  expect(OrderLineSchema.parse({itemId:'item',quantity,unitPrice:2500}).quantity).toBe(quantity)
  expect(GoodsReceiptItemSchema.parse({lineId:'line',receivedQuantity:quantity}).receivedQuantity).toBe(quantity)
})
it.each([0,-1,0.0001,8.1255,1000000000,NaN,Infinity])("rejects invalid precision or range %s without rounding", quantity => {
  expect(purchaseQuantitySchema.safeParse(quantity).success).toBe(false)
})
