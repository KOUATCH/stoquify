import fs from "node:fs"
import path from "node:path"

import { accountingRouteCatalog, getAccountingRouteSurfaceByRoute } from "../accounting-route-data-access"

const accountingRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "accounting")

function listAccountingRoutePagesWithFiles(segments: string[] = ["dashboard", "accounting"]): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(accountingRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      routes.push(...listAccountingRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(accountingRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listAccountingRoutePages(): string[] {
  return listAccountingRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listAccountingRoutePagesWithFiles().map((entry) => entry.file)
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

describe("accounting route catalog audit", () => {
  it("keeps every accounting route surface and key in a single source of truth", () => {
    const routeEntries = listAccountingRoutePages()
    const catalogByRoute = new Map(accountingRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(accountingRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(accountingRouteCatalog.map((entry) => entry.key)).size).toBe(accountingRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getAccountingRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of accountingRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of accountingRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
