import fs from "node:fs"
import path from "node:path"

import {
  getPurchaseOrdersRouteSurfaceByRoute,
  purchaseOrdersRouteCatalog,
} from "../purchase-orders-route-data-access"

const purchaseOrdersRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "purchase-orders")

function listPurchaseOrdersRoutePagesWithFiles(
  segments: string[] = ["dashboard", "purchase-orders"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(purchaseOrdersRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listPurchaseOrdersRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(purchaseOrdersRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listPurchaseOrdersRoutePages(): string[] {
  return listPurchaseOrdersRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listPurchaseOrdersRoutePagesWithFiles().map((entry) => entry.file)
  const keys = new Set<string>()

  for (const file of pageFiles) {
    const content = fs.readFileSync(file, "utf8")
    const matches = content.matchAll(routeByKeyPattern)

    for (const match of matches) {
      keys.add(match[1]!)
    }
  }

  return Array.from(keys).sort()
}

describe("purchase-orders route catalog audit", () => {
  it("keeps every purchase-orders route surface and key in a single source of truth", () => {
    const routeEntries = listPurchaseOrdersRoutePages()
    const catalogByRoute = new Map(purchaseOrdersRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(purchaseOrdersRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(purchaseOrdersRouteCatalog.map((entry) => entry.key)).size).toBe(purchaseOrdersRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getPurchaseOrdersRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of purchaseOrdersRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of purchaseOrdersRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
