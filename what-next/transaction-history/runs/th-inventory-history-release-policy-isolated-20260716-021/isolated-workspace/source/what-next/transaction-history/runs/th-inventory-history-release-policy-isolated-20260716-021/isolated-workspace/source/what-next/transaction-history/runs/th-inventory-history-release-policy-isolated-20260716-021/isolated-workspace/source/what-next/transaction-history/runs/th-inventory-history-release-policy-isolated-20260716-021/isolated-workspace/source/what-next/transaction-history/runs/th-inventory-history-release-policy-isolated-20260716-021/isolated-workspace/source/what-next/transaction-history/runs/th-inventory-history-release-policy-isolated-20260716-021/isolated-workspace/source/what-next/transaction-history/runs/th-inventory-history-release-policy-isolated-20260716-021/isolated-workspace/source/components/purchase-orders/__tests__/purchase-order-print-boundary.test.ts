import fs from "fs"
import path from "path"

const exportSurfaces = [
  "components/purchase-orders/ModernPurchaseOrderDetailPage.tsx",
  "components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx",
]

describe("purchase-order print/export boundary", () => {
  it.each(exportSurfaces)("does not build client-trusted purchase-order PDF API URLs in %s", (relativePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")

    expect(source).not.toContain("/api/purchase-orders/")
    expect(source).not.toContain("pdf?organizationId=")
    expect(source).not.toMatch(/window\.open\([^)]*purchase-orders/i)
    expect(source).toContain("window.print()")
  })
})
