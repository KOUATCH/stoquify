import fs from "node:fs"
import path from "node:path"

import { salesRouteCatalog, getSalesRouteSurfaceByRoute } from "../sales-route-data-access"

const salesRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "sales")

function listSalesRoutePagesWithFiles(
  segments: string[] = ["dashboard", "sales"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(salesRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listSalesRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(salesRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listSalesRoutePages(): string[] {
  return listSalesRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listSalesRoutePagesWithFiles().map((entry) => entry.file)
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

describe("sales route catalog audit", () => {
  it("keeps every sales route surface and key in a single source of truth", () => {
    const routeEntries = listSalesRoutePages()
    const catalogByRoute = new Map(salesRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(salesRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(salesRouteCatalog.map((entry) => entry.key)).size).toBe(salesRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getSalesRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of salesRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of salesRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
