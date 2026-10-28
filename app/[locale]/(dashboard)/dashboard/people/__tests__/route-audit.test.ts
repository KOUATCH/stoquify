import fs from "node:fs"
import path from "node:path"

import { peopleRouteCatalog, getPeopleRouteSurfaceByRoute } from "../people-route-data-access"

const peopleRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "people")

function listPeopleRoutePagesWithFiles(
  segments: string[] = ["dashboard", "people"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(peopleRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listPeopleRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(peopleRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listPeopleRoutePages(): string[] {
  return listPeopleRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listPeopleRoutePagesWithFiles().map((entry) => entry.file)
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

describe("people route catalog audit", () => {
  it("keeps every people route surface and key in a single source of truth", () => {
    const routeEntries = listPeopleRoutePages()
    const catalogByRoute = new Map(peopleRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(peopleRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(peopleRouteCatalog.map((entry) => entry.key)).size).toBe(peopleRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getPeopleRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of peopleRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of peopleRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
