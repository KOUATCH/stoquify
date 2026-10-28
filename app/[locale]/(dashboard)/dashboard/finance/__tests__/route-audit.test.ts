import fs from "node:fs"
import path from "node:path"

import { financeRouteCatalog, getFinanceRouteSurfaceByRoute } from "../finance-route-data-access"

const financeRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "finance")

function listFinanceRoutePagesWithFiles(segments: string[] = ["dashboard", "finance"]): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(financeRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listFinanceRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(financeRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listFinanceRoutePages(): string[] {
  return listFinanceRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listFinanceRoutePagesWithFiles().map((entry) => entry.file)
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

describe("finance route catalog audit", () => {
  it("keeps every finance route surface and key in a single source of truth", () => {
    const routeEntries = listFinanceRoutePages()
    const catalogByRoute = new Map(financeRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(financeRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(financeRouteCatalog.map((entry) => entry.key)).size).toBe(financeRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getFinanceRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of financeRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of financeRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })

  it("declares module enforcement requirements for cash-payment-history data actions", () => {
    const surface = getFinanceRouteSurfaceByRoute("/dashboard/finance/cash-payment-history")

    expect(surface?.modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleSlug: "cash_drawer",
        }),
        expect.objectContaining({
          moduleSlug: "payment_reconciliation",
        }),
      ]),
    )
    expect(surface?.modules?.length).toBe(2)
  })
})
