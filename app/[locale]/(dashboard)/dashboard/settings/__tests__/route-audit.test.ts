import fs from "node:fs"
import path from "node:path"

import { getSettingsRouteSurfaceByRoute, settingsRouteCatalog } from "../settings-route-data-access"

const settingsRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "settings")

function listSettingsRoutePagesWithFiles(segments: string[] = ["dashboard", "settings"]): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(settingsRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      routes.push(...listSettingsRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(settingsRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listSettingsRoutePages(): string[] {
  return listSettingsRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listSettingsRoutePagesWithFiles().map((entry) => entry.file)
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

describe("settings route catalog audit", () => {
  it("keeps every settings route surface and key in a single source of truth", () => {
    const routeEntries = listSettingsRoutePages()
    const catalogByRoute = new Map(settingsRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(settingsRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(settingsRouteCatalog.map((entry) => entry.key)).size).toBe(settingsRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getSettingsRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of settingsRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of settingsRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
