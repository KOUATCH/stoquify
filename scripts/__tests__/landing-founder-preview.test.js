const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "../..")
const previewFiles = [
  "app/[locale]/(home)/landing-preview/founder-journey/page.tsx",
  "components/landing-preview/founder-journey/founder-journey-preview.tsx",
  "components/landing-preview/founder-journey/preview-bar.tsx",
  "components/landing-preview/founder-journey/preview-hero.tsx",
  "components/landing-preview/founder-journey/preview-sections.tsx",
]
const baselinePath =
  "what-next/ui-ux/landing-founder-preview/2026-07-27/baseline/current-landing-hashes-before.json"

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function messages(locale) {
  return JSON.parse(read(`messages/${locale}.json`)).landingPreview.founderJourney
}

function shape(value) {
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).map((key) => [key, shape(value[key])]))
  }
  return typeof value
}

function sha256(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex")
}

describe("isolated landing founder preview", () => {
  const route = read(previewFiles[0])
  const composition = read(previewFiles[1])
  const hero = read(previewFiles[3])
  const sections = read(previewFiles[4])
  const previewSource = previewFiles.map(read).join("\n")
  const en = messages("en")
  const fr = messages("fr")

  it("is a no-index preview route isolated from the current landing composition", () => {
    const currentPage = read("app/[locale]/(home)/page.tsx")

    expect(route).toContain('index: false')
    expect(route).toContain('follow: false')
    expect(route).toContain('noimageindex: true')
    expect(route).toContain("<FounderJourneyPreview />")
    expect(composition).toContain("data-founder-preview")
    expect(currentPage).not.toContain("landing-preview")
    expect(currentPage).not.toContain("FounderJourneyPreview")
  })

  it("renders exactly seven focused sections with the expected journey and buyer pathways", () => {
    const sectionMarkers = (hero + sections).match(/data-preview-section="[^"]+"/g) || []

    expect(sectionMarkers).toEqual([
      'data-preview-section="hero"',
      'data-preview-section="problem"',
      'data-preview-section="journey"',
      'data-preview-section="proof"',
      'data-preview-section="pathways"',
      'data-preview-section="trust"',
      'data-preview-section="adoption"',
    ])
    expect(sections).toContain('key: "foundation"')
    expect(sections).toContain('key: "operation"')
    expect(sections).toContain('key: "control"')
    expect(sections).toContain('key: "growth"')
    expect(sections).toContain('key: "retail"')
    expect(sections).toContain('key: "inventory"')
    expect(sections).toContain('key: "finance"')
    expect(sections).toContain('key: "leadership"')
  })

  it("keeps English and French complete, equivalent, and truth-qualified", () => {
    expect(shape(fr)).toEqual(shape(en))
    expect(Object.keys(en.journey.stages)).toEqual(["foundation", "operation", "control", "growth"])
    expect(Object.keys(en.pathways.items)).toEqual(["retail", "inventory", "finance", "leadership"])

    for (const localeMessages of [en, fr]) {
      expect(localeMessages.hero.brand).toBe("Stoquify")
      expect(localeMessages.hero.copy.length).toBeGreaterThan(90)
      expect(localeMessages.problem.signals).toBeDefined()
      expect(localeMessages.proof.signals).toBeDefined()
      expect(localeMessages.trust.items).toBeDefined()
      expect(localeMessages.adoption.steps).toBeDefined()
    }

    const combined = JSON.stringify([en, fr]).toLowerCase()
    expect(JSON.stringify(fr)).toMatch(/[àâçéèêëîïôùûüÿœ]/i)
    expect(combined).not.toMatch(/instant activation|guaranteed|100%|fully autonomous|sans aucun contrôle/)
  })

  it("uses approved product evidence, non-carousel interaction, and review-safe links", () => {
    expect(hero).toContain('/images/product-command-branch-close-2026-07-18.png')
    expect(sections).toContain('/images/product-command-branch-close-2026-07-18.png')
    expect(sections).toContain('data-visual-classification="redacted-product"')
    expect(hero).toContain('href="#adoption"')
    expect(hero).toContain('href="#proof"')
    expect(sections).toContain('href="/#pricing"')
    expect(sections).toContain('href="/"')
    expect(previewSource).not.toContain("embla-carousel")
    expect(previewSource).not.toContain("Autoplay")
    expect(previewSource).not.toContain('href="/register"')
    expect(previewSource).not.toContain("/dashboard")
  })

  it("leaves every frozen current-landing source byte-for-byte unchanged", () => {
    const baseline = JSON.parse(read(baselinePath))

    for (const file of baseline.files) {
      const absolutePath = path.join(root, file.path)
      expect(fs.statSync(absolutePath).size).toBe(file.bytes)
      expect(sha256(file.path)).toBe(file.sha256)
    }
  })
})
