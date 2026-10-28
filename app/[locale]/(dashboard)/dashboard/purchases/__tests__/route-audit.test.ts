import fs from "node:fs"
import path from "node:path"

import { purchasesRouteCatalog, getPurchasesRouteSurfaceByRoute } from "../purchases-route-data-access"

const purchasesRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "purchases")

function listPurchasesRoutePagesWithFiles(
  segments: string[] = ["dashboard", "purchases"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(purchasesRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listPurchasesRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(purchasesRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listPurchasesRoutePages(): string[] {
  return listPurchasesRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listPurchasesRoutePagesWithFiles().map((entry) => entry.file)
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

describe("purchases route catalog audit", () => {
  it("keeps every purchases route surface and key in a single source of truth", () => {
    const routeEntries = listPurchasesRoutePages()
    const catalogByRoute = new Map(purchasesRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(purchasesRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(purchasesRouteCatalog.map((entry) => entry.key)).size).toBe(purchasesRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getPurchasesRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of purchasesRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of purchasesRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
