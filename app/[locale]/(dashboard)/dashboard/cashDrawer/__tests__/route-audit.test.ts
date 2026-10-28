import fs from "node:fs"
import path from "node:path"

import { cashDrawerRouteCatalog, getCashDrawerRouteSurfaceByRoute } from "../cash-drawer-route-data-access"

const cashDrawerRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "cashDrawer")

function listCashDrawerRoutePagesWithFiles(
  segments: string[] = ["dashboard", "cashDrawer"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(cashDrawerRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listCashDrawerRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({
        route: `/${segments.join("/")}`,
        file: path.join(cashDrawerRoot, ...segments.slice(2), entry.name),
      })
    }
  }

  return routes
}

function listCashDrawerRoutePages(): string[] {
  return listCashDrawerRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listCashDrawerRoutePagesWithFiles().map((entry) => entry.file)
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

describe("cashDrawer route catalog audit", () => {
  it("keeps every cashDrawer route surface and key in a single source of truth", () => {
    const routeEntries = listCashDrawerRoutePages()
    const catalogByRoute = new Map(cashDrawerRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(cashDrawerRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(cashDrawerRouteCatalog.map((entry) => entry.key)).size).toBe(cashDrawerRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getCashDrawerRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of cashDrawerRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of cashDrawerRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
