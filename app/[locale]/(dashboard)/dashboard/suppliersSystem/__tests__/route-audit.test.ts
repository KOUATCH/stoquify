import fs from "node:fs"
import path from "node:path"

import { suppliersSystemRouteCatalog, getSuppliersSystemRouteSurfaceByRoute } from "../suppliers-system-route-data-access"

const suppliersSystemRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "suppliersSystem")

function listSuppliersSystemRoutePagesWithFiles(segments: string[] = ["dashboard", "suppliersSystem"]): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(suppliersSystemRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listSuppliersSystemRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(suppliersSystemRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listSuppliersSystemRoutePages(): string[] {
  return listSuppliersSystemRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listSuppliersSystemRoutePagesWithFiles().map((entry) => entry.file)
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

describe("suppliers system route catalog audit", () => {
  it("keeps every suppliers-system route surface and key in a single source of truth", () => {
    const routeEntries = listSuppliersSystemRoutePages()
    const catalogByRoute = new Map(suppliersSystemRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(suppliersSystemRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(suppliersSystemRouteCatalog.map((entry) => entry.key)).size).toBe(suppliersSystemRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getSuppliersSystemRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of suppliersSystemRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of suppliersSystemRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
