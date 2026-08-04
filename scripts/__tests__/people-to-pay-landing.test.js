const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "../..")
const stageKeys = ["people", "payroll", "proof", "close"]
const topLevelKeys = [
  "eyebrow",
  "title",
  "description",
  "flowLabel",
  "flowSummary",
  "flowAria",
  "stageLabel",
  "ownerLabel",
  "inputLabel",
  "proofLabel",
  "stages",
  "liveLabel",
  "statusTitle",
  "statusBody",
  "peopleCta",
  "payrollCta",
  "gatedLabel",
  "boundaryTitle",
  "boundaryBody",
]

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function messages(locale) {
  return JSON.parse(read(`messages/${locale}.json`)).landing.peopleToPay
}

describe("People to pay landing flow", () => {
  const component = read("components/landing/people-to-pay.tsx")
  const page = read("app/[locale]/(home)/page.tsx")
  const navigation = read("components/landing/landing-section-navigation.tsx")
  const en = messages("en")
  const fr = messages("fr")

  it("keeps a complete and equivalent bilingual message contract", () => {
    expect(Object.keys(en)).toEqual(topLevelKeys)
    expect(Object.keys(fr)).toEqual(topLevelKeys)
    expect(Object.keys(en.stages)).toEqual(stageKeys)
    expect(Object.keys(fr.stages)).toEqual(stageKeys)

    for (const localeMessages of [en, fr]) {
      for (const key of stageKeys) {
        expect(localeMessages.stages[key]).toEqual({
          title: expect.any(String),
          owner: expect.any(String),
          copy: expect.any(String),
          input: expect.any(String),
          output: expect.any(String),
          status: expect.any(String),
        })
        expect(localeMessages.stages[key].input.length).toBeGreaterThan(35)
        expect(localeMessages.stages[key].output.length).toBeGreaterThanOrEqual(30)
      }
    }
  })

  it("presents one semantic ordered flow with explicit ownership and evidence", () => {
    expect(component).toContain("<ol")
    expect(component).toContain("data-people-to-pay-flow")
    expect(component).toContain("data-people-stage={key}")
    expect(component).toContain("<dl")
    expect(component).toContain("<dt")
    expect(component).toContain("<dd")
    expect(component).toContain('t("ownerLabel")')
    expect(component).toContain('t("inputLabel")')
    expect(component).toContain('t("proofLabel")')
    expect(component).toContain("data-people-implemented")
    expect(component).toContain("data-people-gated")
    expect(component).not.toContain("embla-carousel")
    expect(component).not.toContain("Autoplay")
  })

  it("preserves the section navigation contract and safe public destinations", () => {
    expect(component).toContain('id="people-to-pay"')
    expect(component).toContain("data-people-to-pay")
    expect(page).toContain("<PeopleToPay />")
    expect(navigation).toContain('{ key: "people", id: "people-to-pay" }')
    expect((component.match(/href="\/#pricing"/g) || [])).toHaveLength(2)
    expect(component).not.toContain("/dashboard/")
    expect(component).not.toContain('href="/register"')
  })

  it("keeps the implemented foundation distinct from the qualified extension", () => {
    expect(en.liveLabel).toBe("available foundation")
    expect(fr.liveLabel).toBe("socle disponible")
    expect(en.boundaryBody).toContain("controlled local pilot")
    expect(fr.boundaryBody).toContain("pilote local contrôlé")
    expect(en.boundaryTitle).toContain("dependency is proven")
    expect(fr.boundaryTitle).toContain("dépendance est prouvée")

    const combined = JSON.stringify([en, fr]).toLowerCase()
    expect(combined).not.toMatch(/instant activation|fully autonomous|guaranteed|100%|certified|sans aucun contrôle/)
  })

  it("uses direct outcome language and professional French accents", () => {
    expect(en.title).toBe("Turn approved people facts into pay you can explain.")
    expect(en.flowSummary).toContain("ownership changes")
    expect(fr.title).toContain("paie explicable")
    expect(JSON.stringify(fr)).toMatch(/[àâçéèêëîïôùûüÿœ]/i)
    expect(fr.stages.close.title).toBe("Comptabiliser et clôturer")
  })
})
