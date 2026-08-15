import fs from "node:fs"
import path from "node:path"

import { analyticsRouteCatalog, getAnalyticsRouteSurfaceByRoute } from "../analytics-route-data-access"

const analyticsRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "analytics")

function listAnalyticsRoutePagesWithFiles(
  segments: string[] = ["dashboard", "analytics"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(analyticsRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listAnalyticsRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(analyticsRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listAnalyticsRoutePages(): string[] {
  return listAnalyticsRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listAnalyticsRoutePagesWithFiles().map((entry) => entry.file)
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

describe("analytics route catalog audit", () => {
  it("keeps every analytics route surface and key in a single source of truth", () => {
    const routeEntries = listAnalyticsRoutePages()
    const catalogByRoute = new Map(analyticsRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(analyticsRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(analyticsRouteCatalog.map((entry) => entry.key)).size).toBe(analyticsRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getAnalyticsRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of analyticsRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of analyticsRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
