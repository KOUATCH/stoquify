const fs = require("fs")
const os = require("os")
const path = require("path")

const { buildModuleSurfaceInventory } = require("../module-surface-inventory")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "module-surface-inventory-enforce-"))
}

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, "utf8")
}

describe("module surface inventory enforce-mode detection", () => {
  it("marks explicitly enforced module gates without leaving an enforcement-candidate gap", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "services/modules/module-catalog.service.ts",
      `export const MODULE_CATALOG = [{ slug: "pos", routePrefixes: ["/dashboard/pos"], dependencies: [] }]`,
    )
    writeFile(root, "config/sidebar.ts", "export const sidebarLinks = []")
    writeFile(
      root,
      "actions/pos/tender.actions.ts",
      `
      const action = protect({
        permission: "pos.use",
        module: {
          moduleSlug: "pos",
          surface: "actions/pos/tender.actions.ts:commitPOSSaleAction",
          accessIntent: "write",
          mode: "enforce",
        },
      }, async () => null)
      `,
    )

    const report = buildModuleSurfaceInventory(root, { mode: "report" })
    const action = report.records.find((record) => record.file === "actions/pos/tender.actions.ts")

    expect(action).toMatchObject({
      surfaceType: "action",
      moduleSlug: "pos",
      permission: "pos.use",
      guard: "protect",
      observeOrEnforce: "enforce",
      classification: "mapped",
    })
    expect(action.classification).not.toContain("enforcement candidate")
  })
  it("marks FinanceRouteAccess pages with module blocks as enforced", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "services/modules/module-catalog.service.ts",
      `export const MODULE_CATALOG = [{ slug: "payment_reconciliation", routePrefixes: ["/dashboard/finance/reconciliation"], dependencies: [] }]`,
    )
    writeFile(root, "config/sidebar.ts", "export const sidebarLinks = []")
    writeFile(
      root,
      "app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx",
      `
      export default function Page({ params }) {
        return FinanceRouteAccess({
          params,
          permissions: ["payments.reconciliation.read"],
          resource: "PaymentReconciliationWorkbench",
          title: "Payment reconciliation",
          module: {
            moduleSlug: "payment_reconciliation",
            surface: "/dashboard/finance/reconciliation",
            accessIntent: "read",
          },
          children: null,
        })
      }
      `,
    )

    const report = buildModuleSurfaceInventory(root, { mode: "report" })
    const page = report.records.find(
      (record) => record.file === "app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx",
    )

    expect(page).toMatchObject({
      surfaceType: "page",
      moduleSlug: "payment_reconciliation",
      permission: "payments.reconciliation.read",
      guard: "FinanceRouteAccess",
      observeOrEnforce: "enforce",
      classification: "mapped",
    })
    expect(page.classification).not.toContain("enforcement candidate")
  })
})