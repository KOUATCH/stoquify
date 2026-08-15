import fs from "node:fs"
import path from "node:path"

import { changePasswordRouteCatalog, getChangePasswordRouteSurfaceByRoute } from "../change-password-route-data-access"

const surfaceRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "change-password")

function listChangePasswordRoutePages(
  segments: string[] = ["dashboard", "change-password"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(surfaceRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listChangePasswordRoutePages([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(surfaceRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listChangePasswordRoutePagesByPath(): string[] {
  return listChangePasswordRoutePages().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^"]+)"\)/g
  const pageFiles = listChangePasswordRoutePages().map((entry) => entry.file)
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

describe("change-password route catalog audit", () => {
  it("keeps every change-password route surface and key in one source of truth", () => {
    const routeEntries = listChangePasswordRoutePagesByPath()
    const catalogByRoute = new Map(changePasswordRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(changePasswordRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(changePasswordRouteCatalog.map((entry) => entry.key)).size).toBe(changePasswordRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getChangePasswordRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of changePasswordRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of changePasswordRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
