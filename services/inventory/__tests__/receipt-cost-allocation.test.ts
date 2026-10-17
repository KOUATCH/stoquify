import { Prisma } from "@prisma/client"
import { allocateReceiptCost, receiptCostAllocationSchema } from "../receipt-cost-allocation"

describe("receipt remaining cost allocation", () => {
  it("consumes the final cent across fractional draws without inventing value", () => {
    let consumedQuantity = new Prisma.Decimal(0), consumedValue = new Prisma.Decimal(0)
    const amounts = ["0.300", "0.300", "0.400"].map(quantity => {
      const proof = allocateReceiptCost({ sourceQuantity: 1, sourceValue: "0.01", consumedQuantity, consumedValue, quantity })
      expect(receiptCostAllocationSchema.safeParse(proof).success).toBe(true)
      consumedQuantity = consumedQuantity.plus(quantity)
      consumedValue = consumedValue.plus(proof.allocatedValue)
      return proof.allocatedValue
    })
    expect(amounts).toEqual(["0.00", "0.00", "0.01"])
    expect(consumedValue.toFixed(2)).toBe("0.01")
  })

  it("does not reprice a retained draw after reversing an earlier zero-value draw", () => {
    // A historical draw of .200 carries .01. An earlier .400/.00 was reversed.
    const next = allocateReceiptCost({ sourceQuantity: 1, sourceValue: "0.01", consumedQuantity: ".200", consumedValue: ".01", quantity: ".100" })
    expect(next.allocatedValue).toBe("0.00")
    const restored = allocateReceiptCost({ sourceQuantity: 1, sourceValue: ".01", consumedQuantity: ".100", consumedValue: 0, quantity: ".900" })
    expect(restored.allocatedValue).toBe("0.01")
  })

  it.each(["0.00", "0.01", "0.02", "17.29", "999999.99"])("conserves %s across a full source partition", sourceValue => {
    let consumedQuantity = new Prisma.Decimal(0), consumedValue = new Prisma.Decimal(0)
    for (const quantity of ["0.001", "0.099", "0.250", "0.150", "0.500"]) {
      const proof = allocateReceiptCost({ sourceQuantity: 1, sourceValue, consumedQuantity, consumedValue, quantity })
      const amount = new Prisma.Decimal(proof.allocatedValue)
      expect(amount.gte(0) && amount.lte(new Prisma.Decimal(sourceValue).minus(consumedValue))).toBe(true)
      consumedQuantity = consumedQuantity.plus(quantity)
      consumedValue = consumedValue.plus(amount)
    }
    expect(consumedValue.toFixed(2)).toBe(sourceValue)
  })

  it.each([
    { quantity: "1.001" }, { quantity: 0 }, { consumedValue: ".02" },
    { sourceValue: "0.001" }, { consumedQuantity: "0.0001" },
    { sourceQuantity: "NaN" }, { sourceValue: "Infinity" }, { consumedValue: "-0.01" },
    { consumedQuantity: 0, consumedValue: ".01" },
  ])("rejects an invalid or overdrawn source: %j", override => {
    expect(() => allocateReceiptCost({ sourceQuantity: 1, sourceValue: ".01", consumedQuantity: 0, consumedValue: 0, quantity: ".3", ...override })).toThrow()
  })

  it("rejects a persisted allocation with a changed amount or policy", () => {
    const proof = allocateReceiptCost({ sourceQuantity: 1, sourceValue: ".01", consumedQuantity: 0, consumedValue: 0, quantity: ".3" })
    expect(receiptCostAllocationSchema.safeParse({ ...proof, allocatedValue: "0.01" }).success).toBe(false)
    expect(receiptCostAllocationSchema.safeParse({ ...proof, algorithm: "UNREVIEWED" }).success).toBe(false)
  })
})
