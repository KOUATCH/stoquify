import fs from "node:fs"
import path from "node:path"

import { getPurchaseOrdersRouteSurface } from "../purchase-orders-route-data-access"

describe("purchase-order analytics route access", () => {
  it("uses the purchasing read permission and module boundary", () => {
    expect(getPurchaseOrdersRouteSurface("purchase-orders-analytics")).toEqual(expect.objectContaining({
      route: "/dashboard/purchase-orders/analytics",
      resource: "PurchaseOrder",
      permissions: ["purchases.orders.read"],
      module: expect.objectContaining({
        moduleSlug: "purchasing",
        accessIntent: "read",
      }),
    }))
  })

  it("loads analytics only inside the shared server access wrapper", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "app/[locale]/(dashboard)/dashboard/purchase-orders/analytics/page.tsx",
      ),
      "utf8",
    )

    expect(source).toContain("withPurchaseOrdersSurfaceAccess")
    expect(source.indexOf("onAllowed:")).toBeLessThan(source.indexOf("await getAnalytics"))
  })
})
