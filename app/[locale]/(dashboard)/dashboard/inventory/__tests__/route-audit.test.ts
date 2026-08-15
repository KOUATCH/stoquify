import fs from "node:fs"
import path from "node:path"

import { inventoryRouteCatalog, getInventoryRouteSurfaceByRoute } from "../inventory-route-data-access"

const inventoryRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "inventory")

function listInventoryRoutePagesWithFiles(segments: string[] = ["dashboard", "inventory"]): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(inventoryRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      routes.push(...listInventoryRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(inventoryRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listInventoryRoutePages(): string[] {
  return listInventoryRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listInventoryRoutePagesWithFiles().map((entry) => entry.file)
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

describe("inventory route catalog audit", () => {
  it("keeps every inventory route surface and key in a single source of truth", () => {
    const routeEntries = listInventoryRoutePages()
    const catalogByRoute = new Map(inventoryRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(inventoryRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(inventoryRouteCatalog.map((entry) => entry.key)).size).toBe(inventoryRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getInventoryRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of inventoryRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of inventoryRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
