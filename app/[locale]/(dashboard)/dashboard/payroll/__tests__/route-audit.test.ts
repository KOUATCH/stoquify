import fs from "node:fs"
import path from "node:path"

import { payrollRouteCatalog, getPayrollRouteSurfaceByRoute } from "../payroll-route-data-access"

const payrollRoot = path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "payroll")

function listPayrollRoutePagesWithFiles(
  segments: string[] = ["dashboard", "payroll"],
): { route: string; file: string }[] {
  const routes: { route: string; file: string }[] = []

  for (const entry of fs.readdirSync(path.join(payrollRoot, ...segments.slice(2)), { withFileTypes: true })) {
    if (entry.name === "__tests__") {
      continue
    }

    if (entry.isDirectory()) {
      routes.push(...listPayrollRoutePagesWithFiles([...segments, entry.name]))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push({ route: `/${segments.join("/")}`, file: path.join(payrollRoot, ...segments.slice(2), entry.name) })
    }
  }

  return routes
}

function listPayrollRoutePages(): string[] {
  return listPayrollRoutePagesWithFiles().map((entry) => entry.route).sort()
}

function collectRouteByKeysFromPages(): string[] {
  const routeByKeyPattern = /routeByKey\("([^\"]+)"\)/g
  const pageFiles = listPayrollRoutePagesWithFiles().map((entry) => entry.file)
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

describe("payroll route catalog audit", () => {
  it("keeps every payroll route surface and key in a single source of truth", () => {
    const routeEntries = listPayrollRoutePages()
    const catalogByRoute = new Map(payrollRouteCatalog.map((entry) => [entry.route, entry]))
    const catalogByKey = new Map(payrollRouteCatalog.map((entry) => [entry.key, entry]))
    const routeByKeys = collectRouteByKeysFromPages()

    expect(new Set(payrollRouteCatalog.map((entry) => entry.key)).size).toBe(payrollRouteCatalog.length)

    expect(catalogByRoute.size).toBe(routeEntries.length)

    for (const route of routeEntries) {
      expect(catalogByRoute.has(route)).toBe(true)
      expect(getPayrollRouteSurfaceByRoute(route)).toBeDefined()
    }

    for (const route of payrollRouteCatalog.map((entry) => entry.route)) {
      expect(routeEntries.includes(route)).toBe(true)
    }

    for (const key of routeByKeys) {
      expect(catalogByKey.has(key)).toBe(true)
    }

    for (const key of payrollRouteCatalog.map((entry) => entry.key)) {
      expect(routeByKeys.includes(key)).toBe(true)
    }
  })
})
