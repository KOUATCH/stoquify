import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { forwardRef } from "react"
import { LandingRouteShell } from "../cinematic-shell"
import { CinematicHero } from "../cinematic-hero"
import { CinematicProduct, CinematicStory } from "../cinematic-product"
import { CinematicPeoplePayroll } from "../cinematic-people-payroll"
import { landingAdditionalWorkflowSources } from "../landing-workflow-library"
import { workflowAtlasWorkflows } from "../workflow-atlas-data"
import { CinematicSetup } from "../cinematic-setup"
import { CinematicBusinessStory } from "../cinematic-business-story"
import { CinematicOffers } from "../cinematic-offers"
import { landingModuleCatalog } from "../landing-module-catalog-data"
import { CinematicChapters } from "../cinematic-chapters"
import { PreviewLogo, PreviewLogoProvider } from "../preview-logo"
import { STOQUIFY_MARK_PATH } from "@/components/global/stoquify-logo-artwork"
import { GettingStartedPage, OfferPage, ProductPage, ProductsPage } from "../public-pages"
import { isProductId, productDestinations } from "../public-page-routes"

let mockLocale = "en"
let mockPathname = "/"
let mockReduced = false
let mockMobile = false
let mockLandscape = false

jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: () => (key: string) => key }))
jest.mock("@/i18n/navigation", () => ({
  usePathname: () => mockPathname,
  Link: forwardRef<HTMLAnchorElement, any>(function MockLink(
    { href, locale, children, prefetch, ...props },
    ref,
  ) {
    return (
      <a
        ref={ref}
        href={`/${locale || mockLocale}${href === "/" ? "" : href}`}
        data-prefetch={prefetch === false ? "false" : undefined}
        {...props}
      >
        {children}
      </a>
    )
  }),
}))

const shell = (children: React.ReactNode, signedIn = false) => (
  <LandingRouteShell
    signedIn={signedIn}
    header={<header>Original header</header>}
    footer={<footer>Original footer</footer>}
  >
    {children}
  </LandingRouteShell>
)

beforeEach(() => {
  mockLocale = "en"
  mockPathname = "/"
  mockReduced = false
  mockMobile = false
  mockLandscape = false
  window.history.replaceState(null, "", "/")
  window.matchMedia = jest.fn((query) => ({
    matches: query.includes("reduced")
      ? mockReduced
      : mockMobile || (mockLandscape && query.includes("pointer: coarse")),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
})
afterEach(() => jest.restoreAllMocks())

test("preview logos share current artwork within each page and work outside the shell", () => {
  const { container } = render(<>
    <PreviewLogoProvider><PreviewLogo /><PreviewLogo /></PreviewLogoProvider>
    <PreviewLogoProvider><PreviewLogo /></PreviewLogoProvider>
    <PreviewLogo />
  </>)
  const logos = screen.getAllByRole("img", { name: "Stoquify" })
  expect(logos).toHaveLength(4)
  const targets = logos.slice(0, 3).map(logo => {
    const href = logo.querySelector("use")!.getAttribute("href")!
    const target = document.getElementById(href.slice(1))!
    expect(target.querySelector("path")).toHaveAttribute("d", STOQUIFY_MARK_PATH)
    expect(target.closest("svg")).toHaveAttribute("aria-hidden", "true")
    expect(logo.querySelector("path")).toBeNull()
    return target
  })
  expect(targets[0]).toBe(targets[1])
  expect(targets[0]).not.toBe(targets[2])
  expect(logos[3].querySelector("path")).toHaveAttribute("d", STOQUIFY_MARK_PATH)
  expect(container.querySelectorAll("defs")).toHaveLength(2)
})

test.each(["en", "fr"])("hero shows the real dashboard capture with sample-data disclosure in %s", (locale) => {
  mockLocale = locale
  const { container } = render(<CinematicHero />)
  expect(container.querySelector(".hero-dashboard-capture")).toHaveAttribute(
    "src", `/landing/cinematic/stoquify-dashboard-${locale}.webp`,
  )
  expect(container.querySelector(".hero-dashboard-disclosure")).toHaveTextContent(
    locale === "fr" ? "Tableau de bord réel · Données d’exemple" : "Actual dashboard · Sample data",
  )
})

test.each(["en", "fr"])(
  "offer selections explain the matching path and preserve truthful localized handoffs in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(<CinematicOffers />)
    const options = screen.getAllByRole("radio")
    const summary = container.querySelector(".offer-selection")!
    const expected =
      locale === "fr"
        ? [
            "Opérations essentielles",
            "Finance et assurance",
            "Personnel et paie",
          ]
        : ["Operations Core", "Finance and Assurance", "People and Payroll"]
    for (const [index, interest] of ["operations", "finance", "people"].entries()) {
      fireEvent.click(options[index])
      expect(options[index]).toBeChecked()
      expect(summary.querySelector('[aria-hidden="false"]')).toHaveTextContent(expected[index])
      expect(
        container.querySelectorAll('.offer-select[aria-pressed="true"]'),
      ).toHaveLength(1)
      expect(container.querySelector(".offer-workflow-link")).toHaveAttribute(
        "href",
        `/${locale}/offers/${interest}`,
      )
      expect(
        container.querySelector(".offer-next-actions .primary"),
      ).toHaveAttribute("href", `/${locale}/contact?interest=${interest}`)
    }
    fireEvent.click(
      container.querySelector('[data-offer="operations"] button')!,
    )
    expect(options[0]).toBeChecked()
    expect(summary).toHaveAttribute("aria-live", "polite")
    expect(container.querySelectorAll(".offer-price")).toHaveLength(3)
    for (const price of container.querySelectorAll(".offer-price")) {
      expect(price).toHaveTextContent(
        locale === "fr" ? "Sur devis" : "Tailored quote",
      )
    }
  },
)

test.each(["en", "fr"])(
  "all module offers connect to their path and preview using accessible tabs in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(<CinematicOffers standalone />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(landingModuleCatalog.length)
    for (const [index, item] of landingModuleCatalog.entries()) {
      fireEvent.click(tabs[index])
      const panel = screen.getByRole("tabpanel")
      expect(panel).toHaveAttribute("aria-labelledby", tabs[index].id)
      expect(panel.querySelector('.catalog-actions a')).toHaveAttribute("href", `/${locale}${item.href}`)
      fireEvent.click(panel.querySelector('a[href="#pricing"]')!)
      expect(container.querySelector(`input[value="${item.path}"]`)).toBeChecked()
    }
    const last = tabs.length - 1
    fireEvent.keyDown(tabs[last], { key: "ArrowDown" })
    expect(tabs[0]).toHaveFocus()
    fireEvent.keyDown(tabs[0], { key: "End" })
    expect(tabs[last]).toHaveFocus()
    fireEvent.keyDown(tabs[last], { key: "Home" })
    expect(tabs[0]).toHaveFocus()
    fireEvent.keyDown(tabs[0], { key: "ArrowUp" })
    expect(tabs[last]).toHaveFocus()
  },
)

test.each(["en", "fr"])(
  "the landing chapters contain one visible offer/pricing journey and keep old bookmarks in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(<CinematicChapters />)
    expect(container.querySelectorAll("#pricing")).toHaveLength(1)
    expect(container.querySelectorAll("#offers")).toHaveLength(1)
    expect(container.querySelector("#pricing")?.closest("details")).toBeNull()
    expect(container.querySelector("[data-adoption-details]")).toBeNull()
    for (const id of [
      "adoption-options",
      "people-to-pay",
      "daily-control",
      "automation",
      "trust",
      "use-cases",
      "start",
    ]) {
      expect(container.querySelector(`#${id}`)).toBeInTheDocument()
    }
    expect(container.querySelector(".offer-faq")).toHaveTextContent(
      locale === "fr" ? "aucun abonnement" : "subscription",
    )
  },
)

test.each(["en", "fr"])(
  "connects setup steps to the matching preview and localized CTA in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(shell(<CinematicSetup />))
    const steps = [
      ...container.querySelectorAll<HTMLButtonElement>(".setup-step button"),
    ]
    const preview = container.querySelector("#setup-preview")!
    expect(steps).toHaveLength(3)
    expect(preview).toHaveAttribute("aria-labelledby", "setup-step-0")
    const activeScene = () => preview.querySelector('.setup-scene[aria-hidden="false"]')!
    expect(activeScene().querySelector(".setup-account")).toBeInTheDocument()
    fireEvent.click(steps[1])
    expect(
      steps.filter((button) => button.getAttribute("aria-expanded") === "true"),
    ).toHaveLength(1)
    expect(preview).toHaveAttribute("aria-labelledby", "setup-step-1")
    expect(activeScene().querySelectorAll(".setup-module-grid > div")).toHaveLength(8)
    expect(activeScene().querySelector(".setup-account")).toBeNull()
    fireEvent.keyDown(steps[1], { key: "End" })
    expect(steps[2]).toHaveFocus()
    expect(preview.querySelectorAll(".setup-check")).toHaveLength(3)
    expect(preview).toHaveTextContent(
      locale === "fr" ? "À vérifier" : "To review",
    )
    fireEvent.keyDown(steps[2], { key: "ArrowDown" })
    expect(steps[0]).toHaveFocus()
    expect(preview).toHaveAttribute("aria-labelledby", "setup-step-0")
    expect(preview).toHaveTextContent(
      locale === "fr" ? "Aucun compte créé" : "No account is created",
    )
    expect(
      within(container.querySelector("#start")!).getByRole("link", {
        name: locale === "fr" ? "Créer votre compte" : "Create your account",
      }),
    ).toHaveAttribute("href", `/${locale}/register`)
  },
)

test("leaves unrelated public routes on the existing chrome", () => {
  mockPathname = "/unrelated-public-page"
  const { container } = render(shell(<main>Workflow content</main>))
  expect(screen.getByText("Original header")).toBeInTheDocument()
  expect(screen.getByText("Original footer")).toBeInTheDocument()
  expect(container.querySelector(".cinematic-home")).toBeNull()
})

test.each(["/privacy", "/terms"])("policy publication route %s shares the public shell", pathname => {
  mockPathname = pathname
  const { container } = render(shell(<main>Policy publication status</main>))
  expect(screen.queryByText("Original header")).toBeNull()
  expect(container.querySelector(".cinematic-home")).not.toBeNull()
  expect(screen.getByRole("link", { name: "Passer en français" })).toHaveAttribute("href", `/fr${pathname}`)
})

test("preserves signed-in dashboard navigation and French routes", () => {
  mockLocale = "fr"
  render(shell(<CinematicHero />, true))
  for (const link of screen.getAllByRole("link", { name: "Ouvrir l’espace" })) {
    expect(link).toHaveAttribute("href", "/fr/dashboard")
  }
  expect(
    screen.getByRole("link", { name: "Switch to English" }),
  ).toHaveAttribute("href", "/en")
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "De la première vente à la clôture du mois.",
  )
  expect(screen.queryByRole("link", { name: "Créer votre compte" })).toBeNull()
})

test("closes the product menu on Escape and restores focus", () => {
  render(shell(<main />))
  const trigger = screen.getByRole("button", { name: "Products" })
  fireEvent.click(trigger)
  expect(trigger).toHaveAttribute("aria-expanded", "true")
  fireEvent.keyDown(document, { key: "Escape" })
  expect(trigger).toHaveAttribute("aria-expanded", "false")
  expect(trigger).toHaveFocus()
})

test("closes mobile navigation after choosing an existing anchor", () => {
  render(shell(<main />))
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }))
  fireEvent.click(
    within(document.getElementById("mobile-menu")!).getByRole("link", {
      name: "Capabilities",
    }),
  )
  expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  )
})

test("mobile menu controls global motion and returns focus without covering page controls", () => {
  const { container } = render(shell(<main />))
  const menu = screen.getByRole("button", { name: "Open menu" })
  fireEvent.click(menu)
  fireEvent.click(within(document.getElementById("mobile-menu")!).getByRole("button", { name: "Pause motion" }))
  expect(container.querySelector('.cinematic-home')).toHaveClass('motion-off')
  expect(menu).toHaveAttribute('aria-expanded', 'false')
  expect(menu).toHaveFocus()
})

function loadScrolledScene(container: HTMLElement) {
  const scene = container.querySelector(".cinema") as HTMLElement
  Object.defineProperty(scene, "offsetHeight", { value: 2000 })
  jest
    .spyOn(scene, "getBoundingClientRect")
    .mockReturnValue({ top: -300 } as DOMRect)
  const image = container.querySelector(".hero-image")!
  Object.defineProperty(image, "clientWidth", { value: 1440 })
  Object.defineProperty(image, "clientHeight", { value: 900 })
  fireEvent.load(image)
}

test.each(["mobile", "reduced", "landscape"])(
  "keeps original artwork static for %s visitors",
  (mode) => {
    mockMobile = mode === "mobile"
    mockLandscape = mode === "landscape"
    mockReduced = mode === "reduced"
    const { container } = render(shell(<CinematicHero />))
    loadScrolledScene(container)
    expect(container.querySelector("video")).toBeNull()
    expect(container.querySelector(".hero-image")).toHaveAttribute(
      "src",
      "/landing/cinematic/sme-bakery-aio.webp",
    )
    expect(container.querySelector(".hero-image")).toHaveStyle({
      transform: "scale(1) translateY(0%)",
    })
    expect(container.querySelector(".hero-copy")).toHaveStyle({ opacity: "1" })
    expect(container.querySelector(".zoom-preview")).toHaveStyle({
      opacity: "1",
    })
    if (mockReduced)
      expect(
        screen.getByRole("button", { name: "Reduced motion enabled" }),
      ).toBeDisabled()
  },
)

test("scroll moves original artwork and pause restores a readable static scene", () => {
  const { container } = render(shell(<CinematicHero />))
  loadScrolledScene(container)
  const image = container.querySelector(".hero-image") as HTMLImageElement
  const movingTransform = image.style.transform
  expect(movingTransform).not.toBe("scale(1) translateY(0%)")
  expect(container.querySelector("video")).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Pause motion" }))
  expect(image).toHaveStyle({ transform: "scale(1) translateY(0%)" })
  expect(container.querySelector(".hero-copy")).toHaveStyle({ opacity: "1" })
  expect(screen.getByRole("button", { name: "Enable motion" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  fireEvent.load(image)
  fireEvent.click(screen.getByRole("button", { name: "Enable motion" }))
  fireEvent.load(image)
  expect(image.style.transform).toBe(movingTransform)
})

test("image failure restores a readable static hero", () => {
  const { container } = render(shell(<CinematicHero />))
  loadScrolledScene(container)
  fireEvent.error(container.querySelector(".hero-image")!)
  expect(container.querySelector(".cinema")).toHaveClass("media-fallback")
  expect(container.querySelector(".hero-copy")).toHaveStyle({ opacity: "1" })
  expect(container.querySelector(".hero-image")).toHaveStyle({
    transform: "scale(1) translateY(0%)",
  })
})

test("selecting inventory updates the preview while retaining its sample disclosure", () => {
  render(<CinematicProduct />)
  fireEvent.click(screen.getByRole("button", { name: "Inventory & locations" }))
  expect(
    screen.getByRole("heading", { name: "Know what is available. And where." }),
  ).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "POS & sales" })).toHaveAttribute(
    "aria-expanded",
    "false",
  )
  expect(
    screen.getByText(
      "Illustrative example · Fictional records · Not live data",
    ),
  ).toBeInTheDocument()
})

test("product menu deep links select the requested preview", () => {
  render(<CinematicProduct />)
  act(() => {
    window.history.replaceState(null, "", "/#flow-tab-2")
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  })
  expect(
    screen.getByRole("heading", { name: "Give every payment an explanation." }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole("button", { name: "Finance & reconciliation" }),
  ).toHaveAttribute("aria-expanded", "true")
})

test("workflow tabs support arrows, End and Home with roving focus", () => {
  render(<CinematicStory />)
  const tabs = screen.getAllByRole("tab")
  expect(tabs).toHaveLength(6)
  fireEvent.keyDown(tabs[0], { key: "ArrowRight" })
  expect(tabs[1]).toHaveFocus()
  expect(screen.getByRole("tabpanel")).toHaveAttribute(
    "aria-labelledby",
    "story-tab-1",
  )
  fireEvent.keyDown(tabs[1], { key: "End" })
  expect(tabs[5]).toHaveAttribute("aria-selected", "true")
  fireEvent.keyDown(tabs[5], { key: "Home" })
  expect(tabs[0]).toHaveFocus()
  expect(tabs[5]).toHaveAttribute("tabindex", "-1")
})

test.each(["en", "fr"])(
  "six story screens include customer invoicing and supplier bills in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(<CinematicStory />)
    const tabs = screen.getAllByRole("tab")
    const firmWorkflow = screen.getByRole("group", {
      name: locale === "fr" ? "Le rôle du cabinet comptable" : "The accounting firm’s role",
    })
    expect(firmWorkflow).toBeVisible()
    expect(firmWorkflow).toHaveTextContent(locale === "fr" ? "Déjà dans Stoquify" : "Already in Stoquify")
    for (const [index, module] of [
      "pos",
      "inventory",
      "receivables",
      "payables",
      "finance",
      "accounting",
    ].entries()) {
      fireEvent.click(tabs[index])
      expect(screen.getByRole("group", {
        name: locale === "fr" ? "Le rôle du cabinet comptable" : "The accounting firm’s role",
      })).toHaveAttribute("data-accounting-context", module)
      expect(
        screen.getByRole("tabpanel").querySelector("[data-module]"),
      ).toHaveAttribute("data-module", module)
      expect(tabs[index]).toHaveAttribute("aria-selected", "true")
    }
    fireEvent.keyDown(tabs[5], { key: "ArrowRight" })
    expect(tabs[0]).toHaveFocus()
    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" })
    expect(tabs[5]).toHaveFocus()
  },
)

test.each(["en", "fr"])(
  "AP and AR deep links retain localized workflow destinations in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(<CinematicProduct />)
    for (const [index, module] of [
      [6, "payables"],
      [7, "receivables"],
    ] as const) {
      act(() => {
        window.history.replaceState(null, "", `/#flow-tab-${index}`)
        window.dispatchEvent(new HashChangeEvent("hashchange"))
      })
      expect(container.querySelector(`#flow-tab-${index}`)).toHaveAttribute(
        "aria-expanded",
        "true",
      )
      expect(container.querySelector(".module-journey")).toHaveAttribute(
        "href",
        `/${locale}/products/${module}`,
      )
    }
    act(() => {
      window.history.replaceState(null, "", "/#flow-tab-99")
      window.dispatchEvent(new HashChangeEvent("hashchange"))
    })
    expect(container.querySelector("#flow-tab-7")).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  },
)

test.each(["en", "fr"])(
  "compact workflow picker updates the preview and destination in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(<CinematicProduct />)
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "6" } })
    expect(container.querySelector("#module-preview [data-module]")).toHaveAttribute("data-module", "payables")
    expect(container.querySelector(".module-journey")).toHaveAttribute("href", `/${locale}/products/payables`)
    expect(container.querySelector("#flow-tab-6")).toHaveAttribute("aria-expanded", "true")
  },
)

test.each(["en", "fr"])(
  "original previews retain their indices in the expanded keyboard workflow library in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(<CinematicProduct />)
    const selectors = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".flow-tab"),
    )
    expect(selectors).toHaveLength(23)
    for (const [index, module] of [
      "pos",
      "inventory",
      "finance",
      "accounting",
      "hris",
      "payroll",
      "payables",
      "receivables",
    ].entries()) {
      fireEvent.click(selectors[index])
      expect(selectors[index]).toHaveAttribute("aria-expanded", "true")
      expect(
        container.querySelector("#module-preview [data-module]"),
      ).toHaveAttribute("data-module", module)
      // Invisible sizing scenes are expensive: keep exactly one complete guide,
      // whether an animated module or a guided workflow owns the preview.
      expect(container.querySelectorAll(".workflow-size-guide")).toHaveLength(1)
      expect(container.querySelector(".workflow-demo-placeholder .workflow-size-guide")).toBeNull()
      expect(
        container.querySelectorAll('.flow-tab[aria-expanded="true"]'),
      ).toHaveLength(1)
      expect(
        container.querySelector(".module-journey:not([hidden])"),
      ).toBeTruthy()
    }
    fireEvent.keyDown(selectors[7], { key: "Home" })
    expect(selectors[0]).toHaveFocus()
    fireEvent.keyDown(selectors[0], { key: "ArrowUp" })
    expect(selectors.at(-1)).toHaveFocus()
    fireEvent.keyDown(selectors.at(-1)!, { key: "ArrowDown" })
    expect(selectors[0]).toHaveFocus()
    fireEvent.keyDown(selectors[0], { key: "End" })
    expect(selectors.at(-1)).toHaveFocus()
    expect(container.querySelectorAll(".workflow-size-guide")).toHaveLength(1)
    expect(container.querySelector(".workflow-demo-placeholder .workflow-size-guide")).toBeTruthy()
  },
)

test("mobile preview fades once on entry and skips motion when paused", () => {
  mockMobile = true
  let now = 0
  let nextFrame: FrameRequestCallback = () => {}
  jest.spyOn(performance, "now").mockImplementation(() => now)
  jest.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
    nextFrame = callback
    return 1
  })
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  const { container, unmount } = render(shell(<><CinematicHero /><section className="workflow-showcase"><div className="product-copy reveal"><h2>Connected workflows</h2></div><div className="demo-stage reveal" /></section></>))
  const showcase = container.querySelector(".workflow-showcase") as HTMLElement
  const stage = container.querySelector(".demo-stage") as HTMLElement
  const image = container.querySelector(".hero-image") as HTMLImageElement
  const bounds = jest.spyOn(stage, "getBoundingClientRect")
  jest.spyOn(container.querySelector(".product-copy")!, "getBoundingClientRect").mockImplementation(() => stage.getBoundingClientRect())
  bounds.mockReturnValue({ top: 1000, bottom: 2000 } as DOMRect)
  fireEvent.load(image)
  expect(showcase.style.getPropertyValue("--mobile-preview-opacity")).toBe("0")
  bounds.mockReturnValue({ top: 200, bottom: 1200 } as DOMRect)
  fireEvent.load(image)
  now = 150
  act(() => nextFrame(now))
  expect(Number(showcase.style.getPropertyValue("--mobile-heading-opacity"))).toBeGreaterThan(0)
  expect(showcase.style.getPropertyValue("--mobile-preview-opacity")).toBe("0")
  now = 525
  act(() => nextFrame(now))
  expect(Number(showcase.style.getPropertyValue("--mobile-heading-opacity"))).toBeGreaterThan(0.5)
  expect(Number(showcase.style.getPropertyValue("--mobile-heading-opacity"))).toBeLessThan(1)
  expect(Number(showcase.style.getPropertyValue("--mobile-preview-opacity"))).toBeCloseTo(0.5)
  now = 600
  act(() => nextFrame(now))
  expect(showcase.style.getPropertyValue("--mobile-heading-opacity")).toBe("1")
  now = 899
  act(() => nextFrame(now))
  expect(Number(showcase.style.getPropertyValue("--mobile-preview-opacity"))).toBeLessThan(1)
  now = 900
  act(() => nextFrame(now))
  expect(showcase.style.getPropertyValue("--mobile-preview-opacity")).toBe("1")
  bounds.mockReturnValue({ top: 1000, bottom: 2000 } as DOMRect)
  fireEvent.load(image)
  expect(showcase.style.getPropertyValue("--mobile-preview-opacity")).toBe("1")
  fireEvent.click(screen.getByRole("button", { name: "Pause motion" }))
  expect(showcase).not.toHaveAttribute("data-mobile-preview")
  fireEvent.click(screen.getByRole("button", { name: "Enable motion" }))
  expect(showcase.style.getPropertyValue("--mobile-preview-opacity")).toBe("1")
  unmount()
  expect(showcase).not.toHaveAttribute("data-mobile-preview")
})

test("bakery all-in-one screen expands on scroll and returns to its original screen bounds", () => {
  const { container, unmount } = render(shell(<><CinematicHero /><section className="workflow-showcase" /></>))
  const scene = container.querySelector(".cinema") as HTMLElement
  const image = container.querySelector(".hero-image") as HTMLImageElement
  const preview = container.querySelector(".zoom-preview") as HTMLElement
  const showcase = container.querySelector(".workflow-showcase") as HTMLElement
  expect(preview).not.toHaveAttribute("data-positioned")
  expect(preview.style.visibility).toBe("")
  Object.defineProperty(image, "clientWidth", { value: 1672 })
  Object.defineProperty(image, "clientHeight", { value: 941 })
  Object.defineProperty(scene, "offsetHeight", { value: 2000 })
  const bounds = jest.spyOn(scene, "getBoundingClientRect")
  bounds.mockReturnValue({ top: 0 } as DOMRect)
  fireEvent.load(image)
  expect(preview.style.left).toBe("928px")
  expect(preview.style.visibility).toBe("visible")
  expect(preview).toHaveAttribute("data-positioned")
  expect(preview.style.top).toBe("594px")
  expect(preview.style.transform).toContain("scale(0.426)")
  expect(preview.style.opacity).toBe("1")
  const restingTransform = preview.style.transform
  bounds.mockReturnValue({ top: -1000 } as DOMRect)
  fireEvent.load(image)
  expect(preview.style.opacity).toBe("1")
  expect(preview.style.transform).not.toBe(restingTransform)
  expect((container.querySelector(".hero-copy") as HTMLElement).inert).toBe(
    true,
  )
  const exitStart = scene.offsetHeight - window.innerHeight
  bounds.mockReturnValue({ top: -exitStart } as DOMRect)
  fireEvent.load(image)
  expect(preview.style.opacity).toBe("1")
  expect(showcase.style.getPropertyValue("--hero-entry-opacity")).toBe("0")
  bounds.mockReturnValue({ top: -(exitStart + window.innerHeight * 0.275) } as DOMRect)
  fireEvent.load(image)
  expect(Number(preview.style.opacity)).toBeCloseTo(0.5)
  expect(Number(showcase.style.getPropertyValue("--hero-entry-opacity"))).toBeCloseTo(0.5)
  bounds.mockReturnValue({ top: -(exitStart + window.innerHeight * 0.55) } as DOMRect)
  fireEvent.load(image)
  expect(Number(preview.style.opacity)).toBeCloseTo(0)
  expect(Number(showcase.style.getPropertyValue("--hero-entry-opacity"))).toBeCloseTo(1)
  bounds.mockReturnValue({ top: 0 } as DOMRect)
  fireEvent.load(image)
  expect(preview.style.opacity).toBe("1")
  expect(preview.style.transform).toBe(restingTransform)
  expect((container.querySelector(".hero-copy") as HTMLElement).inert).toBe(
    false,
  )
  expect(showcase.style.getPropertyValue("--hero-entry-opacity")).toBe("0")
  unmount()
  expect(showcase).not.toHaveAttribute("data-hero-handoff")
  expect(showcase.style.getPropertyValue("--hero-entry-opacity")).toBe("")
})

test.each(["en", "fr"])(
  "switches the whole landing page theme without affecting motion or app theme in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(
      shell(
        <>
          <CinematicHero />
          <CinematicBusinessStory />
        </>,
      ),
    )
    const page = container.querySelector(".cinematic-home")!
    const originalDocumentClass = document.documentElement.className
    const toggle = screen.getByRole("button", {
      name:
        locale === "fr"
          ? "Mode clair pour toute la page"
          : "Light mode for the entire page",
    })
    expect(page).toHaveAttribute("data-theme", "dark")
    fireEvent.click(toggle)
    expect(page).toHaveAttribute("data-theme", "light")
    expect(toggle).toHaveAttribute("aria-pressed", "true")
    expect(page.querySelector("#business-story")).toBeInTheDocument()
    expect(page.querySelector("footer")).toBeInTheDocument()
    expect(page.querySelector(".motion-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    fireEvent.click(toggle)
    expect(page).toHaveAttribute("data-theme", "dark")
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    expect(document.documentElement.className).toBe(originalDocumentClass)
  },
)

test.each(["en", "fr"])(
  "SME story keeps illustrations descriptive and workflow destinations localized in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(<CinematicBusinessStory />)
    const photos = screen.getAllByRole("img").filter(element => element.tagName === "IMG")
    expect(photos).toHaveLength(3)
    const computerScreens = container.querySelectorAll(".sme-computer-screen")
    expect(computerScreens).toHaveLength(3)
    for (const computerScreen of computerScreens) {
      expect(computerScreen.querySelector("svg.preview-logo")).toHaveAttribute("aria-label", "Stoquify")
      expect(computerScreen).toHaveAttribute("aria-hidden", "true")
    }
    for (const photo of photos) {
      expect(photo).toHaveAttribute("loading", "lazy")
      expect(photo.getAttribute("alt")?.length).toBeGreaterThan(30)
      expect(photo).toHaveAttribute("width", "1536")
      expect(photo).toHaveAttribute("height", "1024")
    }
    expect(container.querySelector("#accounting-firm")).toHaveTextContent(
      locale === "fr" ? /cabinet comptable/i : /accounting firm/i,
    )
    for (const workflow of [
      "stockToSale",
      "paymentReconciliation",
      "accountingCloseAssurance",
      "peopleToPay",
    ]) {
      expect(
        container.querySelector(
          `a[href="/${locale}/workflows#workflow-${workflow}"]`,
        ),
      ).toBeInTheDocument()
    }
    expect(container.querySelector("#accounting-close")).toHaveTextContent(
      "SYSCOHADA",
    )
    expect(container.querySelector("#people-payroll")).toHaveTextContent(
      locale === "fr" ? "SIRH" : "HRIS",
    )
  },
)

test.each(["en", "fr"])("discovery pages preserve localized product, offer and protected workspace links in %s", locale => {
  mockLocale = locale
  mockPathname = "/products/receivables"
  const { container, rerender } = render(shell(<ProductPage id="receivables" />))
  expect(container.querySelector(".cinematic-home")).not.toBeNull()
  expect(container.querySelector("#language")).toHaveAttribute("href", `/${locale === "fr" ? "en" : "fr"}/products/receivables`)
  expect(container.querySelector('.detail-actions .primary')).toHaveAttribute("href", `/${locale}/contact?interest=finance`)
  expect(container.querySelector('.detail-actions .outline')).toHaveAttribute("href", `/${locale}/dashboard/finance/receivables`)
  expect(container.querySelector('.detail-actions .outline')).toHaveAttribute("data-prefetch", "false")
  expect(container.querySelectorAll('.detail-product-copy .detail-checklist li')).toHaveLength(3)
  expect(container.querySelector('.detail-preview .preview-logo')).not.toBeNull()
  expect(container.querySelector(`a[href="/${locale}/offers/finance"]`)).not.toBeNull()
  expect(container.querySelector('.detail-preview [data-module="receivables"]')).not.toBeNull()
  rerender(shell(<ProductPage id="receivables" />, true))
  expect(container.querySelector('.detail-actions .primary')).toHaveAttribute("href", `/${locale}/dashboard/finance/receivables`)
  expect(container.querySelector('.detail-product-grid .detail-actions .outline')).toBeNull()
  rerender(shell(<ProductsPage />))
  expect(container.querySelectorAll('.catalog-panel')).toHaveLength(18)
  expect(container.querySelectorAll('.detail-route-grid a[href*="/products/"]')).toHaveLength(8)
  for (const id of Object.keys(productDestinations)) expect(container.querySelector(`.detail-route-grid a[href="/${locale}/products/${id}"]`)).not.toBeNull()
  expect(container.querySelector('.catalog-panel[aria-hidden="false"] .catalog-actions a:last-child')).toHaveAttribute("href", `/${locale}/offers/operations`)
  rerender(shell(<OfferPage id="people" />))
  expect(container.querySelector('a[href$="/products/hris"]')).not.toBeNull()
  expect(container.querySelector('a[href$="/products/payroll"]')).not.toBeNull()
  expect(container.querySelector('a[href$="/get-started"]')).not.toBeNull()
  expect(container.querySelector('.detail-quote .primary')).toHaveAttribute("href", `/${locale}/contact?interest=people`)
  rerender(shell(<GettingStartedPage />))
  expect(container.querySelectorAll('.detail-setup-list a[href*="/dashboard/"]')).toHaveLength(4)
})

test("standalone pricing includes localized firm collaboration and rejects unknown products", () => {
  mockLocale = "fr"
  const { container } = render(<CinematicOffers standalone />)
  expect(container.querySelector('.catalog-firm a')).toHaveAttribute('href', '/fr/#flow-tab-15')
  expect(container.querySelectorAll('.catalog-panel')).toHaveLength(18)
  for (const invalid of ['missing', '__proto__', 'constructor', '../dashboard', 'https://example.com']) expect(isProductId(invalid)).toBe(false)
})


test("workflows shares landing theme controls and preserves its locale destination", () => {
  mockPathname = "/workflows"
  render(shell(<main>Workflow content</main>))
  expect(screen.queryByText("Original header")).toBeNull()
  expect(screen.getByRole("link", { name: "Passer en français" })).toHaveAttribute("href", "/fr/workflows")
  expect(document.querySelector(".theme-toggle")).toBeInTheDocument()
})


test.each(["en", "fr"])("expanded workflows include the firm and every existing atlas family in %s", locale => {
  mockLocale = locale
  const { container } = render(<CinematicProduct />)
  const select = screen.getByRole("combobox")
  const options = Array.from(select.querySelectorAll("option"))
  for (const index of Array.from({ length: 15 }, (_, index) => index + 8)) {
    fireEvent.change(select, { target: { value: String(index) } })
    const visible = container.querySelector('.journey-preview-state[aria-hidden="false"]')!
    expect(visible.querySelectorAll(".journey-stages li").length).toBeGreaterThanOrEqual(4)
    const steps = visible.querySelectorAll(".journey-stages button")
    for (const [step, button] of Array.from(steps).entries()) {
      fireEvent.click(button)
      expect(button).toHaveAttribute("aria-pressed", "true")
      expect(visible.querySelector(".journey-preview")).toHaveAttribute("data-step", String(step))
      expect(visible.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1)
    }
    fireEvent.click(within(visible as HTMLElement).getByRole("button", { name: locale === "fr" ? "Rejouer le parcours" : "Replay workflow" }))
    expect(visible.querySelector(".journey-preview")).toHaveAttribute("data-step", "0")
    expect(container.querySelector("#module-preview [data-module]")).toBeNull()
    expect(container.querySelector(".module-journey")).toHaveAttribute("href", expect.stringMatching(/^\/(en|fr)\//))
    expect(container.querySelector(`#flow-tab-${index}`)).toHaveTextContent(options[index].textContent!)
  }
  for (const workflow of workflowAtlasWorkflows) {
    const originalKeys = ["stockToSale", "customerToCollection", "paymentReconciliation", "accountingCloseAssurance", "peopleToPay", "procureToPay"]
    if (!originalKeys.includes(workflow.key)) expect(container.querySelector(`[data-workflow="${workflow.key}"]`)).toBeInTheDocument()
  }
  expect(landingAdditionalWorkflowSources.filter(item => item.id.startsWith("accountant-"))).toHaveLength(3)
})

test.each(["en", "fr"])("HRIS and payroll chapters expose one accessible panel and retain keyboard navigation in %s", locale => {
  mockLocale = locale
  render(<CinematicPeoplePayroll />)
  const tabs = screen.getAllByRole("tab")
  expect(tabs).toHaveLength(5)
  for (const tab of tabs) {
    fireEvent.click(tab)
    const panel = screen.getByRole("tabpanel")
    expect(panel).toHaveAttribute("aria-labelledby", tab.id)
    expect(panel.querySelectorAll(".people-features details")).toHaveLength(4)
    for (const detail of panel.querySelectorAll(".people-features details")) {
      expect(detail.querySelector("summary")).not.toHaveTextContent(/^$/)
      expect(detail.querySelector("p")).not.toHaveTextContent(/^$/)
    }
    expect(panel).toHaveTextContent(locale === "fr" ? "Données fictives" : "Fictional records")
    expect(tab).toHaveAttribute("tabindex", "0")
  }
  fireEvent.keyDown(tabs[4], { key: "ArrowRight" })
  expect(tabs[0]).toHaveFocus()
  fireEvent.keyDown(tabs[0], { key: "End" })
  expect(tabs[4]).toHaveFocus()
  expect(screen.getByRole("link", { name: locale === "fr" ? "Découvrir le SIRH" : "Explore HRIS" })).toHaveAttribute("href", `/${locale}/products/hris`)
})


test.each(["en", "fr"])("module catalog explains every public module and preserves localized handoffs in %s", locale => {
  mockLocale = locale
  const { container } = render(<CinematicOffers />)
  const tabs = within(container.querySelector('.catalog-menu') as HTMLElement).getAllByRole('tab')
  expect(tabs).toHaveLength(18)
  for (const [index, item] of landingModuleCatalog.entries()) {
    fireEvent.click(tabs[index])
    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAttribute('id', `catalog-panel-${item.id}`)
    expect(panel).toHaveTextContent(item.users[locale === 'fr' ? 1 : 0])
    expect(within(panel).getAllByRole('listitem')).toHaveLength(3)
    expect(panel.querySelector('.catalog-actions a')).toHaveAttribute('href', `/${locale}${item.href}`)
    fireEvent.click(within(panel).getByRole('link', {name: locale === 'fr' ? 'Voir le parcours d’adoption' : 'See the adoption path'}))
    expect(container.querySelector(`input[value="${item.path}"]`)).toBeChecked()
    expect(container.querySelectorAll('.catalog-panel[inert]')).toHaveLength(17)
  }
  fireEvent.keyDown(tabs[17], {key: 'Home'})
  expect(tabs[0]).toHaveFocus()
  fireEvent.keyDown(tabs[0], {key: 'End'})
  expect(tabs[17]).toHaveFocus()
  const select = container.querySelector('.catalog-select select')!
  fireEvent.change(select, {target: {value: '11'}})
  expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'catalog-panel-hris')
  expect(container.querySelector('.catalog-firm a')).toHaveAttribute('href', `/${locale}/#flow-tab-15`)
})

test.each(["en", "fr"])("cost and decision guides expose complete scope and useful localized destinations in %s", locale => {
  mockLocale = locale
  const { container } = render(<CinematicOffers />)
  const costs = container.querySelectorAll('.cost-card')
  expect(costs).toHaveLength(4)
  for (const [index, card] of [...costs].entries()) {
    const trigger = card.querySelector('button')!
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const detail = container.querySelector(`#cost-panel-${index}`)!
    expect(detail).toHaveAttribute('aria-hidden', 'false')
    expect(detail.querySelectorAll('dt')).toHaveLength(3)
    expect(detail.querySelector('a')?.getAttribute('href')).toMatch(new RegExp(`^/${locale}`))
    expect(container.querySelectorAll('.cost-details[inert]')).toHaveLength(3)
    fireEvent.click(trigger)
    expect(container.querySelector('.cost-expansion')).toHaveAttribute('hidden')
  }
  expect(container.querySelectorAll('.decision-group')).toHaveLength(3)
  expect(container.querySelectorAll('.decision-priority details')).toHaveLength(5)
  expect(container.querySelectorAll('.decision-group details')).toHaveLength(7)
  expect(container.querySelector('.decision-more > summary')).not.toHaveTextContent(/^$/)
  expect(container.querySelector('.decision-guide')).toHaveTextContent(locale === 'fr' ? 'cabinet' : 'accounting firm')
  expect(container.querySelector('.quote-checklist')).toHaveTextContent(locale === 'fr' ? 'Montant, devise et taxes' : 'Amount, currency & taxes')
})


test("module presentation covers the available catalog without selling internal modules", () => {
  const fs = jest.requireActual('node:fs') as typeof import('node:fs')
  const path = jest.requireActual('node:path') as typeof import('node:path')
  const source = fs.readFileSync(path.join(process.cwd(), 'services/modules/module-catalog.service.ts'), 'utf8')
  const available = [...source.matchAll(/slug: "([^"]+)",[\s\S]*?status: "([^"]+)"/g)].filter(match => match[2] === 'available').map(match => match[1]).sort()
  expect(landingModuleCatalog.filter(item => item.id !== 'hris').map(item => item.id).sort()).toEqual(available)
  expect(available).not.toContain('content')
  expect(available).not.toContain('administration')
})
