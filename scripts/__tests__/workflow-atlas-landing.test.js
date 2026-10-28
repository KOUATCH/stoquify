const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "../..")

const roleKeys = [
  "owner",
  "cashier",
  "stock",
  "purchasing",
  "hrPayroll",
  "accountant",
  "compliance",
  "admin",
]

const outcomeKeys = [
  "sell",
  "stock",
  "buy",
  "collect",
  "payPeople",
  "declare",
  "reconcile",
  "close",
  "comply",
  "decide",
  "administer",
  "release",
]

const workflowKeys = [
  "sellToCash",
  "stockToSale",
  "procureToPay",
  "customerToCollection",
  "peopleToPay",
  "payrollStatutoryProof",
  "paymentReconciliation",
  "accountingCloseAssurance",
  "complianceCountryEvidence",
  "ownerDailyControl",
  "adminAccessControl",
  "workflowAssuranceGates",
]

const requiredTopLevelKeys = [
  "dailyHubEyebrow",
  "dailyHubTitle",
  "dailyHubBody",
  "prospectLabel",
  "prospectTitle",
  "prospectBody",
  "userLabel",
  "userTitle",
  "userBody",
  "roleHubLabel",
  "outcomeChooserLabel",
  "outcomeContext",
  "outcomeOptionLabel",
  "selectionAnnouncement",
  "selectionLabel",
  "selectedRoleLabel",
  "selectedOutcomeLabel",
  "recommendedLabel",
  "bestNextActionLabel",
  "mapLabel",
  "sourceLabel",
  "controlPointLabel",
  "proofLabel",
  "destinationLabel",
  "quickLaunchLabel",
  "routeHelp",
  "openProtected",
  "resetFilters",
  "noMatchesTitle",
  "noMatchesBody",
  "mapIndexLabel",
  "mapIndexTitle",
  "mapIndexBody",
  "libraryLabel",
  "libraryTitle",
  "libraryBody",
  "fastPathLabel",
  "jumpToPlaybook",
]

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function messages(locale) {
  return JSON.parse(read(`messages/${locale}.json`)).landing.workflowAtlas
}

function dashboardPageForRoute(route) {
  const parts = route.split("/").filter(Boolean)
  expect(parts[0]).toBe("dashboard")
  return path.join(root, "app", "[locale]", "(dashboard)", "dashboard", ...parts.slice(1), "page.tsx")
}

describe("Workflow Atlas landing page", () => {
  const data = read("components/landing/workflow-atlas-data.ts")
  const component = read("components/landing/workflow-atlas.tsx")
  const page = read("app/[locale]/(home)/workflows/page.tsx")
  const header = read("components/landing/landing-header.tsx")
  const en = messages("en")
  const fr = messages("fr")

  it("adds a dedicated public workflow atlas route and discoverable header link", () => {
    expect(page).toContain('import { WorkflowAtlas }')
    expect(page).toContain("<WorkflowAtlas />")
    expect(header).toContain('href="/workflows"')
    expect(header).toContain('t("workflowAtlas")')
    expect(component).toContain("data-workflow-atlas")
    expect(component).toContain('id="workflow-atlas"')
  })

  it("keeps role lenses, outcome chooser, and workflow inventory complete", () => {
    for (const role of roleKeys) {
      expect(data).toContain(`key: "${role}"`)
      expect(en.roles[role]).toEqual(expect.any(String))
      expect(fr.roles[role]).toEqual(expect.any(String))
    }

    for (const outcome of outcomeKeys) {
      expect(data).toContain(`key: "${outcome}"`)
      expect(data).toContain(`outcome: "${outcome}"`)
      expect(en.outcomes[outcome]).toEqual(expect.any(String))
      expect(fr.outcomes[outcome]).toEqual(expect.any(String))
    }

    expect(component).toContain("data-workflow-atlas-role={key}")
    expect(component).toContain("data-workflow-atlas-outcome={key}")
    expect(data).toContain("getWorkflowAtlasOutcomesForRole")
    expect(data).toContain("getWorkflowAtlasWorkflowsForSelection")
    expect(component).toContain("getWorkflowAtlasOutcomesForRole(activeRole)")
    expect(component).toContain("getWorkflowAtlasWorkflowsForSelection(activeRole, activeOutcome)")
    expect(component).toContain("if (!outcomeStillAvailable) setActiveOutcome(\"all\")")
    expect(component).toContain("data-workflow-atlas-outcome-count={key}")
    expect(component).toContain("data-workflow-atlas-live")
    expect(Object.keys(en.roles)).toEqual(["all", ...roleKeys])
    expect(Object.keys(fr.roles)).toEqual(["all", ...roleKeys])
    expect(Object.keys(en.outcomes)).toEqual(["all", ...outcomeKeys])
    expect(Object.keys(fr.outcomes)).toEqual(["all", ...outcomeKeys])
    expect(Object.keys(en.workflows)).toEqual(workflowKeys)
    expect(Object.keys(fr.workflows)).toEqual(workflowKeys)
  })

  it("turns the page into a daily role-and-outcome launchpad", () => {
    expect(component).toContain("useState<ActiveRole>")
    expect(component).toContain("useState<ActiveOutcome>")
    expect(component).toContain("data-workflow-hero-command")
    expect(component).toContain("data-workflow-hero-metrics")
    expect(component).toContain("data-workflow-decision-bar")
    expect(component).toContain("data-workflow-audience-panels")
    expect(component).toContain("data-workflow-launchpad")
    expect(component).toContain("data-workflow-recommendations")
    expect(component).toContain("data-workflow-best-next-action")
    expect(component).toContain("data-workflow-visual-map")
    expect(component).toContain("data-workflow-map-index")
    expect(component).toContain("data-workflow-playbook-library")
    expect(component).toContain("workflow.dailyRoute.href")
    expect(component).not.toContain("prisma")
    expect(component).not.toContain("getSession")
  })

  it("keeps a bilingual playbook contract for every workflow", () => {
    for (const key of requiredTopLevelKeys) {
      expect(en[key]).toEqual(expect.any(String))
      expect(fr[key]).toEqual(expect.any(String))
    }

    for (const key of workflowKeys) {
      expect(data).toContain(`key: "${key}"`)
      expect(data).toContain("dailyRoute:")
      for (const localeMessages of [en, fr]) {
        const workflow = localeMessages.workflows[key]
        expect(workflow.shortTitle).toEqual(expect.any(String))
        expect(workflow.title).toEqual(expect.any(String))
        expect(workflow.promise.length).toBeGreaterThan(40)
        expect(workflow.handoff.length).toBeGreaterThan(35)
        expect(workflow.dailyUse.length).toBeGreaterThan(35)
        expect(workflow.nextAction.length).toBeGreaterThan(35)
        expect(workflow.source).toEqual(expect.any(String))
        expect(workflow.destination).toEqual(expect.any(String))
        expect(Object.keys(workflow.steps).length).toBeGreaterThanOrEqual(5)
        expect(Object.keys(workflow.controls).length).toBeGreaterThanOrEqual(4)
        expect(Object.keys(workflow.evidence).length).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it("keeps dashboard destinations protected and backed by real static dashboard pages", () => {
    const routes = [...new Set([...data.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]))]

    expect(routes).toEqual(
      expect.arrayContaining([
        "/dashboard/pos",
        "/dashboard/people",
        "/dashboard/payroll/runs",
        "/dashboard/finance/reconciliation",
        "/dashboard/accounting/close",
        "/dashboard/assurance/control-tower",
        "/dashboard/settings/security",
      ]),
    )
    expect(routes.every((route) => route.startsWith("/dashboard/"))).toBe(true)

    for (const route of routes) {
      expect(fs.existsSync(dashboardPageForRoute(route))).toBe(true)
    }
  })

  it("keeps the People to Pay workflow explicit across HRIS, payroll, declarations, and ledger proof", () => {
    expect(data).toContain('key: "peopleToPay"')
    expect(data).toContain('outcome: "payPeople"')
    expect(data).toContain('href: "/dashboard/people"')
    expect(data).toContain('href: "/dashboard/payroll/runs"')
    expect(data).toContain('href: "/dashboard/payroll/payslips"')
    expect(data).toContain('key: "payrollStatutoryProof"')
    expect(data).toContain('href: "/dashboard/payroll/declarations"')
    expect(en.workflows.peopleToPay.title).toBe("People to pay, without losing control")
    expect(fr.workflows.peopleToPay.title).toContain("sans perdre le contrôle")
    expect(en.workflows.peopleToPay.dailyUse).toContain("HRIS-to-payroll")
    expect(fr.workflows.peopleToPay.dailyUse).toContain("SIRH vers paie")
    expect(en.workflows.payrollStatutoryProof.evidence.ledgerReference).toBe("Ledger reference")
    expect(fr.workflows.payrollStatutoryProof.evidence.ledgerReference).toBe("Référence grand livre")
  })
})


