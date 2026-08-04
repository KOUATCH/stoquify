const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "../..")
const stageKeys = ["foundation", "launch", "control", "growth"]

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function messages(locale) {
  return JSON.parse(read(`messages/${locale}.json`))
}

describe("landing early-stage founder journey", () => {
  const en = messages("en")
  const fr = messages("fr")
  const operations = read("components/landing/operations-map.tsx")
  const page = read("app/[locale]/(home)/page.tsx")

  it("keeps four equivalent, truth-qualified stages in English and French", () => {
    for (const localeMessages of [en, fr]) {
      const journey = localeMessages.landing.operations.founderJourney

      expect(journey).toEqual({
        eyebrow: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        stageLabel: expect.any(String),
        cta: expect.any(String),
        stages: expect.any(Object),
      })
      expect(Object.keys(journey.stages)).toEqual(stageKeys)

      for (const key of stageKeys) {
        expect(journey.stages[key]).toEqual({
          title: expect.any(String),
          copy: expect.any(String),
          boundary: expect.any(String),
        })
        expect(journey.stages[key].copy.length).toBeGreaterThan(70)
        expect(journey.stages[key].boundary.length).toBeGreaterThan(35)
      }
    }
  })

  it("uses an ordered, non-carousel journey inside the existing OperationsMap section", () => {
    expect(operations).toContain("data-founder-journey")
    expect(operations).toContain("data-founder-journey-title")
    expect(operations).toContain("data-founder-stage={key}")
    expect(operations).toContain("<ol")
    expect(operations).toContain("founderStages.map")
    expect(operations).not.toContain("embla-carousel")
    expect(operations).not.toContain("Autoplay")
    expect(page).toContain("<OperationsMap />")
    expect(page).not.toContain("<FounderJourney")
  })

  it("keeps the journey on the qualified adoption path and away from protected routes", () => {
    expect(operations).toContain('data-founder-journey-cta')
    expect(operations).toContain('href="/#pricing"')
    expect(operations).not.toContain('href="/register"')
    expect(operations).not.toContain("/dashboard/")
    expect(en.landing.operations.founderJourney.cta).toBe("Plan your rollout")
    expect(fr.landing.operations.founderJourney.cta).toBe("Planifier votre déploiement")
  })

  it("keeps French accents and rejects unsupported launch or autonomy promises", () => {
    const french = JSON.stringify(fr.landing.operations.founderJourney)
    const combined = JSON.stringify([
      en.landing.operations.founderJourney,
      fr.landing.operations.founderJourney,
    ]).toLowerCase()

    expect(french).toMatch(/[àâçéèêëîïôùûüÿœ]/i)
    expect(fr.landing.operations.founderJourney.title).toContain("maîtrisée")
    expect(combined).not.toMatch(/in minutes|instant activation|guaranteed|100%|autonomous|sans aucun contrôle/)
  })
})
