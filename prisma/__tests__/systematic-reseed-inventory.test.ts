import { Prisma } from "@prisma/client";
import { planInventoryMinimum } from "../systematic-reseed-inventory";

describe("systematic inventory minimum planning", () => {
  it("fills only the tenant-wide shortage without changing existing locations or requiring 1500 at each", () => {
    const plan = planInventoryMinimum([{ locationId: "a", quantityOnHand: 500 }, { locationId: "b", quantityOnHand: 400 }], ["a", "b"]);
    expect(plan).toEqual({ before: "900.000", deficit: "600.000", allocations: [{ locationId: "a", quantity: "300.000" }, { locationId: "b", quantity: "300.000" }] });
  });

  it("does not add another minimum on rerun or reduce abundant stock", () => {
    expect(planInventoryMinimum([{ locationId: "a", quantityOnHand: 1500 }], ["a"]).allocations).toEqual([]);
    expect(planInventoryMinimum([{ locationId: "a", quantityOnHand: 2200 }], ["a"]).allocations).toEqual([]);
  });

  it("includes items with no existing stock rows and deduplicates stocking locations", () => {
    expect(planInventoryMinimum([], ["b", "a", "a"]).allocations).toEqual([{ locationId: "a", quantity: "750.000" }, { locationId: "b", quantity: "750.000" }]);
  });

  it("keeps bottles and packs in whole units while reaching the aggregate minimum", () => {
    const locations = Array.from({ length: 14 }, (_, index) => `location-${index}`);
    const plan = planInventoryMinimum([{ locationId: locations[0], quantityOnHand: 1337 }], locations, 1500, "1");
    expect(plan.allocations.every((row) => new Prisma.Decimal(row.quantity).isInteger())).toBe(true);
    expect(plan.allocations.reduce((sum, row) => sum.plus(row.quantity), new Prisma.Decimal(1337)).toFixed(3)).toBe("1500.000");
  });

  it("distributes fractional quantities exactly and deterministically", () => {
    const plan = planInventoryMinimum([{ locationId: "a", quantityOnHand: "1499.999" }], ["b", "a", "c"]);
    expect(plan.allocations).toEqual([{ locationId: "a", quantity: "0.001" }]);
    const full = planInventoryMinimum([], ["a", "b", "c", "d", "e", "f", "g"]);
    expect(full.allocations.reduce((sum, row) => sum.plus(row.quantity), new Prisma.Decimal(0)).toFixed(3)).toBe("1500.000");
  });

  it("fails explicitly when stock has no valid destination or the requested minimum is invalid", () => {
    expect(() => planInventoryMinimum([], [])).toThrow("No active stocking location");
    for (const minimum of ["0", "-1", "1.0001", "NaN", "Infinity"]) {
      expect(() => planInventoryMinimum([], ["a"], minimum)).toThrow("stock minimum");
    }
  });
});
