const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "../..")
const workflowKeys = [
  "pos",
  "inventory",
  "purchasing",
  "suppliers",
  "customers",
  "finance",
  "accounting",
  "compliance",
  "reconciliation",
  "hris",
  "payroll",
  "offline",
  "transfers",
  "locations",
  "controls",
  "analytics",
  "administration",
]
const dailyControlKeys = [
  "inventory",
  "purchasing",
  "finance",
  "accounting",
  "compliance",
  "hris",
  "payroll",
]

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function messages(locale) {
  return JSON.parse(read(`messages/${locale}.json`))
}

describe("landing workflow, HRIS, and daily-control refinement", () => {
  const en = messages("en")
  const fr = messages("fr")
  const workflow = read("components/landing/connected-workflow.tsx")
  const operations = read("components/landing/operations-map.tsx")
  const peopleToPay = read("components/landing/people-to-pay.tsx")
  const dailyControl = read("components/landing/module-deep-dives.tsx")
  const page = read("app/[locale]/(home)/page.tsx")

  it("keeps seventeen equivalent workflow modules with proof signals", () => {
    expect(Object.keys(en.landing.workflow.cards)).toEqual(workflowKeys)
    expect(Object.keys(fr.landing.workflow.cards)).toEqual(workflowKeys)

    for (const localeMessages of [en, fr]) {
      for (const key of workflowKeys) {
        expect(localeMessages.landing.workflow.cards[key]).toEqual({
          title: expect.any(String),
          copy: expect.any(String),
          meta: expect.any(String),
          proof: expect.any(String),
        })
      }
    }
  })

  it("uses Embla and the established responsive, accessible carousel contract", () => {
    expect(workflow).toContain('from "embla-carousel-react"')
    expect(workflow).toContain("flex-[0_0_100%]")
    expect(workflow).toContain("sm:flex-[0_0_50%]")
    expect(workflow).toContain("xl:flex-[0_0_33.333%]")
    expect(workflow).toContain('aria-roledescription="carousel"')
    expect(workflow).toContain('aria-roledescription="slide"')
    expect(workflow).toContain("data-workflow-next")
    expect(workflow).not.toContain("style={{ width:")
    expect(workflow).not.toContain("Autoplay")
  })

  it("presents HRIS as a linked, controlled foundation rather than an unrestricted claim", () => {
    expect(operations).toContain('key: "hris"')
    expect(operations).toContain('href: "/dashboard/people"')
    expect(en.landing.operations.modules.hris.meta).toBe("controlled foundation")
    expect(fr.landing.operations.modules.hris.meta).toBe("socle contrôlé")
    expect(en.landing.peopleToPay.boundaryBody).toContain("controlled local pilot")
    expect(fr.landing.peopleToPay.boundaryBody).toContain("pilote local contrôlé")
    expect(peopleToPay).toContain("data-people-to-pay")
    expect(page).toContain("<PeopleToPay />")
  })

  it("keeps seven bilingual daily-control domains with complete decision evidence", () => {
    expect(Object.keys(en.landing.deepDives.items)).toEqual(dailyControlKeys)
    expect(Object.keys(fr.landing.deepDives.items)).toEqual(dailyControlKeys)

    for (const localeMessages of [en, fr]) {
      for (const key of dailyControlKeys) {
        expect(localeMessages.landing.deepDives.items[key]).toEqual({
          title: expect.any(String),
          role: expect.any(String),
          copy: expect.any(String),
          decision: expect.any(String),
          evidence: expect.any(String),
          labels: {
            a: expect.any(String),
            b: expect.any(String),
            c: expect.any(String),
          },
        })
      }
    }
  })

  it("implements Daily Control as an accessible keyboard tab workbench", () => {
    expect(dailyControl).toContain('role="tablist"')
    expect(dailyControl).toContain('role="tab"')
    expect(dailyControl).toContain('role="tabpanel"')
    expect(dailyControl).toContain('event.key === "ArrowRight"')
    expect(dailyControl).toContain('event.key === "ArrowLeft"')
    expect(dailyControl).toContain("data-daily-control-panel")
    expect(dailyControl).not.toMatch(/\b\d{2}%/)
  })
})
