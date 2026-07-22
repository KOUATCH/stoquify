const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "../..")
const expectedUseCases = [
  "branchControl",
  "posControl",
  "offlineContinuity",
  "inventoryTruth",
  "purchasingPayables",
  "receivables",
  "paymentReconciliation",
  "accountingClose",
  "complianceCountry",
  "payrollEvidence",
  "ownerCommand",
  "accountantCollaboration",
  "accessApprovals",
  "groupOversight",
]

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function messages(locale) {
  return JSON.parse(read(`messages/${locale}.json`))
}

describe("landing public content contract", () => {
  const en = messages("en")
  const fr = messages("fr")
  const carousel = read("components/landing/use-cases.tsx")
  const deepDives = read("components/landing/module-deep-dives.tsx")
  const productGallery = read("components/landing/product-gallery.tsx")
  const hero = read("components/landing/hero.tsx")
  const heroDashboard = read("components/landing/hero-dashboard.tsx")
  const landingHeader = read("components/landing/landing-header.tsx")
  const finalCta = read("components/landing/final-cta.tsx")
  const pricing = read("components/landing/pricing-section.tsx")
  const operationsMap = read("components/landing/operations-map.tsx")
  const peopleToPay = read("components/landing/people-to-pay.tsx")
  const authLayout = read("components/auth/AuthLayout.tsx")
  const authCopy = read("components/auth/auth-copy.ts")

  it("keeps fourteen equivalent, proof-oriented use cases in English and French", () => {
    expect(Object.keys(en.landing.useCases.items)).toEqual(expectedUseCases)
    expect(Object.keys(fr.landing.useCases.items)).toEqual(expectedUseCases)

    for (const localeMessages of [en, fr]) {
      for (const key of expectedUseCases) {
        expect(localeMessages.landing.useCases.items[key]).toEqual({
          label: expect.any(String),
          title: expect.any(String),
          copy: expect.any(String),
          proof: expect.any(String),
        })
      }
    }
  })

  it("uses the installed carousel engine with responsive slide widths and accessible controls", () => {
    expect(carousel).toContain('from "embla-carousel-react"')
    expect(carousel).toContain("flex-[0_0_100%]")
    expect(carousel).toContain("sm:flex-[0_0_50%]")
    expect(carousel).toContain("xl:flex-[0_0_33.333%]")
    expect(carousel).toContain('aria-roledescription="carousel"')
    expect(carousel).toContain('aria-roledescription="slide"')
    expect(carousel).toContain('aria-label={t("previous")}')
    expect(carousel).toContain('aria-label={t("next")}')
    expect(carousel).not.toContain("Autoplay")
  })

  it("removes unsupported decorative percentages from the module deep dives", () => {
    expect(deepDives).not.toContain("style={{ width:")
    expect(deepDives).not.toMatch(/\b\d{2}%/)
    expect(deepDives).toContain('t("controlSignal")')
  })

  it("uses yesterday's branch-close screenshot as unobstructed product evidence", () => {
    const sourceScreenshot = fs.readFileSync(path.join(
      root,
      "what-next",
      "referrals",
      "screenshots",
      "daily-truth-review-command-ui-2026-07-18",
      "read-only-desktop.png",
    ))
    const publicScreenshot = fs.readFileSync(path.join(
      root,
      "public",
      "images",
      "product-command-branch-close-2026-07-18.png",
    ))

    expect(publicScreenshot.equals(sourceScreenshot)).toBe(true)
    expect(publicScreenshot.readUInt32BE(16)).toBe(1440)
    expect(publicScreenshot.readUInt32BE(20)).toBe(1000)
    expect(productGallery).toContain("data-product-command-evidence")
    expect(productGallery).toContain("<figure")
    expect(productGallery).toContain("<figcaption")
    expect(productGallery).toContain("/images/product-command-branch-close-2026-07-18.png")
    expect(productGallery).toContain("aspect-[6/5]")
    expect(productGallery).toContain("sm:aspect-[36/25]")
    expect(productGallery).not.toContain("/images/dash.webp")
    expect(en.landing.gallery.screenshotAlt).toContain("read-only branch daily-close evidence")
    expect(fr.landing.gallery.screenshotAlt).toContain("lecture seule")
  })

  it("keeps public CTAs qualified and free from confusing protected module links", () => {
    expect(landingHeader).toContain('href="/#pricing"')
    expect(hero).toContain('href="/#pricing"')
    expect(finalCta).toContain('href="/#pricing"')
    expect(pricing).toContain('href="/register"')
    expect(operationsMap).not.toContain('/dashboard/')
    expect(peopleToPay).not.toContain('/dashboard/people')
    expect(peopleToPay).not.toContain('/dashboard/payroll')
    expect(peopleToPay).toContain('href="/#pricing"')
    expect(operationsMap).toContain('href: "/#pricing"')
    expect(operationsMap).toContain('key: "retailControl"')
    expect(operationsMap).toContain('key: "cashClose"')
    expect(operationsMap).toContain('key: "procurement"')
    expect(operationsMap).toContain('key: "regulatedOps"')
    expect(operationsMap).not.toContain('key: "payroll"')
    expect(en.landing.hero.primaryCta).toBe('Plan rollout')
    expect(fr.landing.hero.primaryCta).toBe('Planifier le déploiement')
    expect(en.landing.pricing.cta.note).toContain('not instant self-service activation')
    expect(fr.landing.pricing.cta.note).toContain('libre-service instantanée')
  })

  it("labels public visuals and sample operating data", () => {
    expect(hero).toContain('proofKeys')
    expect(heroDashboard).toContain('t("sampleLabel")')
    expect(en.landing.dashboard.sampleLabel).toContain('Sample')
    expect(fr.landing.dashboard.sampleLabel).toContain('exemple')
    expect(productGallery).toContain('data-visual-classification="redacted-product"')
    expect(en.landing.gallery.preview.classification).toBe('Redacted product screenshot')
    expect(fr.landing.gallery.preview.classification).toBe('Capture produit masquée')
  })

  it("keeps the auth journey additions compact and bilingual", () => {
    expect(authLayout).toContain("journeyCards.map")
    expect(authLayout).toContain("min-h-[116px]")
    expect(authCopy).toContain('"Access checks"')
    expect(authCopy).toContain('"Contrôles d\'accès"')
    expect(authCopy).not.toContain("permission-aware")
    expect(authCopy).not.toContain("command center operationnel")
    expect(authCopy).not.toContain("gates modules")
  })
})
