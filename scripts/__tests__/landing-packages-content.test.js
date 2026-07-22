const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "../..")
const pathKeys = ["operations", "finance", "people"]
const extensionKeys = ["retail", "reconciliation", "production", "intelligence"]
const driverKeys = ["platform", "retail", "people", "regulated"]
const serviceKeys = ["onboarding", "country", "providers", "assurance"]

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function messages(locale) {
  return JSON.parse(read(`messages/${locale}.json`))
}

describe("landing packages and adoption contract", () => {
  const en = messages("en")
  const fr = messages("fr")
  const component = read("components/landing/pricing-section.tsx")
  const prompt = read("docs/landing page/landing-packages-adoption-commercial-strategy-prompt.md")
  const strategy = read("docs/landing page/landing-packages-adoption-commercial-strategy.md")

  it("keeps equivalent bilingual paths, extensions, drivers, and delivery services", () => {
    for (const localeMessages of [en, fr]) {
      const pricing = localeMessages.landing.pricing

      expect(pathKeys.every((key) => Object.hasOwn(pricing.paths, key))).toBe(true)
      expect(extensionKeys.every((key) => Object.hasOwn(pricing.extensions, key))).toBe(true)
      expect(Object.keys(pricing.delivery.drivers)).toEqual(driverKeys)
      expect(Object.keys(pricing.delivery.services)).toEqual(serviceKeys)

      for (const key of pathKeys) {
        expect(Object.keys(pricing.paths[key].points)).toEqual(["a", "b", "c"])
        expect(pricing.paths[key]).toEqual(expect.objectContaining({
          name: expect.any(String),
          outcome: expect.any(String),
          bestFor: expect.any(String),
          dependency: expect.any(String),
          commercial: expect.any(String),
        }))
      }
    }
  })

  it("uses an accessible keyboard tab workbench with focused browser hooks", () => {
    expect(component).toContain('"use client"')
    expect(component).toContain('role="tablist"')
    expect(component).toContain('role="tab"')
    expect(component).toContain('role="tabpanel"')
    expect(component).toContain('"ArrowLeft"')
    expect(component).toContain('"ArrowRight"')
    expect(component).toContain('"Home"')
    expect(component).toContain('"End"')
    expect(component).toContain("data-adoption-section")
    expect(component).toContain("data-platform-foundation")
    expect(component).toContain("data-adoption-path")
    expect(component).toContain("data-adoption-extension")
    expect(component).toContain("data-adoption-service")
  })

  it("keeps the public model quote-led and free of fictional checkout or prices", () => {
    const publicPricing = JSON.stringify({
      en: en.landing.pricing,
      fr: fr.landing.pricing,
    })

    expect(publicPricing).not.toMatch(/(?:\$\s*\d|(?:USD|EUR|XAF|FCFA|GBP)\s*\d|\d\s*(?:USD|EUR|XAF|FCFA|GBP))/i)
    expect(publicPricing).not.toMatch(/buy now|acheter maintenant|instant checkout/i)
    expect(en.landing.pricing.delivery.modelTitle).toContain("Quote-led")
    expect(fr.landing.pricing.delivery.modelTitle).toContain("Sur devis")
    expect(en.landing.pricing.cta.note).toContain("not instant self-service")
    expect(fr.landing.pricing.cta.note).toContain("libre-service instantanée")
  })

  it("preserves dependency, source-data, and controlled-release boundaries", () => {
    expect(en.landing.pricing.paths.finance.dependency).toContain("Finance and accounting")
    expect(en.landing.pricing.paths.people.dependency).toContain("Country")
    expect(en.landing.pricing.extensions.intelligence.copy).toContain("does not hold")
    expect(en.landing.pricing.extensions.production.status).toBe("controlled beta")
    expect(strategy).toContain("package catalog is still a proposal")
    expect(strategy).toContain("provider events must never directly grant or revoke runtime access")
  })

  it("saves a scoped execution prompt and records explicit non-claims", () => {
    expect(prompt).toContain("From a thorough inspection of the live repository")
    expect(prompt).toContain("Do not implement package database tables")
    expect(strategy).toContain("## Non-Claims")
    expect(strategy).toContain("No package, subscription, billing, entitlement, or provisioning runtime was implemented.")
  })
})
