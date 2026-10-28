import fs from "node:fs"
import path from "node:path"

import { complianceRouteCatalog, getComplianceRouteSurfaceByRoute } from "../compliance-route-data-access"

const surfaceRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "compliance")

function listComplianceRoutePages(
  segments: string[] = ["dashboard", "compliance"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(surfaceRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listComplianceRoutePages([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(surfaceRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listComplianceRoutePagesByPath(): string[] {
  return listComplianceRoutePages().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^"]+)"\)/g
  const pageFiles = listComplianceRoutePages().map((entry) => entry.file)
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

describe("compliance route catalog audit", () => {
  it("keeps every compliance route surface and key in one source of truth", () => {
    const routeEntries = listComplianceRoutePagesByPath()
    const catalogByRoute = new Map(complianceRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(complianceRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(complianceRouteCatalog.map((entry) => entry.key)).size).toBe(complianceRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getComplianceRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of complianceRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of complianceRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
