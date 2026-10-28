import fs from "node:fs"
import path from "node:path"

import {
  dailyDigestRouteCatalog,
  getDailyDigestRouteSurfaceByRoute,
} from "../daily-digest-route-data-access"

const dailyDigestRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "daily-digest")

function listDailyDigestRoutePagesWithFiles(
  segments: string[] = ["dashboard", "daily-digest"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(dailyDigestRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listDailyDigestRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(dailyDigestRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listDailyDigestRoutePages(): string[] {
  return listDailyDigestRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listDailyDigestRoutePagesWithFiles().map((entry) => entry.file)
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

describe("daily-digest route catalog audit", () => {
  it("keeps every daily-digest route surface and key in a single source of truth", () => {
    const routeEntries = listDailyDigestRoutePages()
    const catalogByRoute = new Map(dailyDigestRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(dailyDigestRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(dailyDigestRouteCatalog.map((entry) => entry.key)).size).toBe(dailyDigestRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getDailyDigestRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of dailyDigestRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of dailyDigestRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
