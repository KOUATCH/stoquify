import fs from "node:fs"
import path from "node:path"

import {
  managerActionRouteCatalog,
  getManagerActionRouteSurfaceByRoute,
} from "../manager-action-route-data-access"

const managerActionRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "manager-action-center")

function listManagerActionRoutePagesWithFiles(
  segments: string[] = ["dashboard", "manager-action-center"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(managerActionRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listManagerActionRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(managerActionRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listManagerActionRoutePages(): string[] {
  return listManagerActionRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listManagerActionRoutePagesWithFiles().map((entry) => entry.file)
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

describe("manager-action-center route catalog audit", () => {
  it("keeps every manager-action-center route surface and key in a single source of truth", () => {
    const routeEntries = listManagerActionRoutePages()
    const catalogByRoute = new Map(managerActionRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(managerActionRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(managerActionRouteCatalog.map((entry) => entry.key)).size).toBe(managerActionRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getManagerActionRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of managerActionRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of managerActionRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
