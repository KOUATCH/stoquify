const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "../..")

const navigation = [
  ["product", "product", "product-gallery.tsx", "ProductGallery"],
  ["workflow", "workflow", "connected-workflow.tsx", "ConnectedWorkflow"],
  ["platform", "modules", "operations-map.tsx", "OperationsMap"],
  ["people", "people-to-pay", "people-to-pay.tsx", "PeopleToPay"],
  ["controls", "daily-control", "module-deep-dives.tsx", "ModuleDeepDives"],
  ["automation", "automation", "automation-section.tsx", "AutomationSection"],
  ["trust", "trust", "trust-section.tsx", "TrustSection"],
  ["useCases", "use-cases", "use-cases.tsx", "UseCases"],
  ["pricing", "pricing", "pricing-section.tsx", "PricingSection"],
]

const headerKeys = [
  "homeAria",
  "subtitle",
  "navAria",
  ...navigation.map(([key]) => key),
  "explore",
  "exploreAria",
  "login",
  "dashboard",
  "startFree",
  "openNavigation",
  "languageLabel",
  "languageAria",
]

const bannedFrenchWords = [
  "systeme",
  "operationnel",
  "acces",
  "controle",
  "cloture",
  "equipe",
  "securite",
  "perimetre",
  "donnees",
  "comptabilite",
  "conformite",
  "tresorerie",
  "regles",
  "identite",
  "roles",
  "deploiement",
  "creer",
  "verification",
  "protege",
  "telephone",
  "prenom",
  "etape",
  "resultat",
  "evenement",
  "ecart",
  "ecriture",
  "salarie",
  "declarations",
  "operateur",
  "responsabilite",
  "dependances",
  "certifiees",
  "reecrire",
  "confidentialite",
  "completez",
  "capturee",
  "assigne",
  "liee",
  "liees",
  "fragmentees",
  "maitriser",
  "different",
  "consequence",
  "expliquee",
  "quantite",
  "reliee",
  "reliees",
  "decision",
  "conservee",
  "precedent",
  "precise",
  "delimite",
  "delimites",
  "credit",
  "reponses",
  "approuves",
  "preservent",
  "tracables",
  "gerez",
  "rentabilite",
  "clarte",
  "enregistre",
  "resolution",
  "createur",
  "renforces",
  "adapte",
  "presentes",
  "scenario",
  "etendez",
  "proximite",
  "connectivite",
  "reintegrez",
  "maitrisez",
  "decaissement",
  "sequence",
  "separer",
  "resolus",
  "revisez",
  "entites",
  "reellement",
  "parametres",
  "operer",
  "commercants",
  "pilotees",
  "deconnectes",
  "controler",
  "cloturer",
  "qualifies",
  "confirmee",
  "separes",
  "ingerer",
  "matieres",
  "implementation",
  "ulterieure",
  "regionaux",
  "materiel",
  "disponibilite",
  "instantanee",
  "utilises",
  "disciplinees",
  "deconnecter",
  "masques",
  "implemente",
  "deplacer",
  "proteger",
  "presentez",
  "conservees",
  "rapproches",
  "prets",
]

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function messages(locale) {
  return JSON.parse(read(`messages/${locale}.json`))
}

function collectStrings(value, result = []) {
  if (typeof value === "string") result.push(value)
  else if (Array.isArray(value)) value.forEach((child) => collectStrings(child, result))
  else if (value && typeof value === "object") {
    Object.values(value).forEach((child) => collectStrings(child, result))
  }
  return result
}

describe("landing navigation and French public localization contract", () => {
  const en = messages("en")
  const fr = messages("fr")
  const navigationSource = read("components/landing/landing-section-navigation.tsx")
  const headerSource = read("components/landing/landing-header.tsx")
  const pageSource = read("app/[locale]/(home)/page.tsx")
  const authSource = read("components/auth/auth-copy.ts")

  it("keeps the bilingual navigation catalog complete and ordered", () => {
    expect(Object.keys(en.landing.header)).toEqual(headerKeys)
    expect(Object.keys(fr.landing.header)).toEqual(headerKeys)

    let previousPosition = -1
    for (const [key, id] of navigation) {
      const position = navigationSource.indexOf(`{ key: "${key}", id: "${id}" }`)
      expect(position).toBeGreaterThan(previousPosition)
      previousPosition = position
      expect(en.landing.header[key]).toEqual(expect.any(String))
      expect(fr.landing.header[key]).toEqual(expect.any(String))
    }
  })

  it("maps every menu item to one stable section in rendered page order", () => {
    let previousPosition = -1

    for (const [, id, file, component] of navigation) {
      const componentSource = read(`components/landing/${file}`)
      expect(componentSource).toContain(`id="${id}"`)
      expect(componentSource).toContain("scroll-mt-20")

      const position = pageSource.indexOf(`<${component}`)
      expect(position).toBeGreaterThan(previousPosition)
      previousPosition = position
    }
  })

  it("provides compact desktop disclosure, complete mobile links, and scrollspy state", () => {
    expect(headerSource).toContain("data-landing-header")
    expect(headerSource).toContain("data-landing-mobile-menu")
    expect(navigationSource).toContain('data-landing-nav="desktop"')
    expect(navigationSource).toContain('data-landing-nav="mobile"')
    expect(navigationSource).toContain("data-landing-nav-more")
    expect(navigationSource).toContain("aria-current={active ? \"location\" : undefined}")
    expect(navigationSource).toContain('window.addEventListener("scroll"')
    expect(navigationSource).toContain('window.addEventListener("hashchange"')
    expect(navigationSource).toContain("new ResizeObserver")
    expect(navigationSource).toContain("pageHeight > window.innerHeight + 4")
    expect(navigationSource).toContain('closest("details")?.removeAttribute("open")')
  })

  it("uses corrected French accents and removes public-facing anglicisms", () => {
    const landingText = collectStrings(fr.landing).join("\n")
    const authStart = authSource.indexOf("\n  fr: {")
    const authText = [...authSource.slice(authStart).matchAll(/"([^"]*)"/g)]
      .map((match) => match[1])
      .join("\n")
    const publicFrench = `${landingText}\n${authText}`

    expect(fr.landing.header.controls).toBe("Contrôle quotidien")
    expect(fr.landing.header.useCases).toBe("Scénarios")
    expect(fr.landing.header.startFree).toBe("Planifier")
    expect(publicFrench).toContain("Système opérationnel OHADA")
    expect(publicFrench).toContain("synchronisation hors ligne")
    expect(publicFrench).not.toMatch(/Ã|Â|�|synchronisationhronisation/)
    expect(publicFrench).not.toMatch(/\b(?:matching|reporting|replay|cash|runs paie)\b/i)

    for (const word of bannedFrenchWords) {
      expect(publicFrench).not.toMatch(new RegExp(`\\b${word}\\b`, "i"))
    }
  })
  it("keeps internal auth-copy keys stable across both locales", () => {
    expect(authSource.match(/\breconciliation:\s*{/g)).toHaveLength(2)
    expect(authSource.match(/\bsync:\s*"/g)).toHaveLength(2)
  })

})
