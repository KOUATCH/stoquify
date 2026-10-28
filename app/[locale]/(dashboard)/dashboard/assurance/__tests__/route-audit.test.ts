import fs from "node:fs"
import path from "node:path"

import { assuranceRouteCatalog, getAssuranceRouteSurfaceByRoute } from "../assurance-route-data-access"

const assuranceRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "assurance")

function listAssuranceRoutePagesWithFiles(
  segments: string[] = ["dashboard", "assurance"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(assuranceRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listAssuranceRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(assuranceRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listAssuranceRoutePages(): string[] {
  return listAssuranceRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listAssuranceRoutePagesWithFiles().map((entry) => entry.file)
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

describe("assurance route catalog audit", () => {
  it("keeps every assurance route surface and key in a single source of truth", () => {
    const routeEntries = listAssuranceRoutePages()
    const catalogByRoute = new Map(assuranceRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(assuranceRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(assuranceRouteCatalog.map((entry) => entry.key)).size).toBe(assuranceRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getAssuranceRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of assuranceRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of assuranceRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
