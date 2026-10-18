import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { forwardRef } from "react"
import { LandingRouteShell } from "../cinematic-shell"
import { CinematicHero } from "../cinematic-hero"
import { CinematicProduct, CinematicStory } from "../cinematic-product"
import { CinematicSetup } from "../cinematic-setup"
import { CinematicBusinessStory } from "../cinematic-business-story"
import { CinematicOffers } from "../cinematic-offers"
import { CinematicChapters } from "../cinematic-chapters"

let mockLocale = "en"
let mockPathname = "/"
let mockReduced = false
let mockMobile = false
let mockLandscape = false

jest.mock("next-intl", () => ({ useLocale: () => mockLocale }))
jest.mock("@/i18n/navigation", () => ({
  usePathname: () => mockPathname,
  Link: forwardRef<HTMLAnchorElement, any>(function MockLink(
    { href, locale, children, ...props },
    ref,
  ) {
    return (
      <a
        ref={ref}
        href={`/${locale || mockLocale}${href === "/" ? "" : href}`}
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
    for (const [index, workflow] of [
      "stockToSale",
      "accountingCloseAssurance",
      "peopleToPay",
    ].entries()) {
      fireEvent.click(options[index])
      expect(options[index]).toBeChecked()
      expect(summary).toHaveTextContent(expected[index])
      expect(
        container.querySelectorAll('.offer-select[aria-pressed="true"]'),
      ).toHaveLength(1)
      expect(container.querySelector(".offer-workflow-link")).toHaveAttribute(
        "href",
        `/${locale}/workflows#workflow-${workflow}`,
      )
      expect(
        container.querySelector(".offer-next-actions .primary"),
      ).toHaveAttribute("href", `/${locale}/register`)
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
    const { container } = render(<CinematicOffers />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(8)
    for (const [index, path] of [
      "operations",
      "operations",
      "finance",
      "finance",
      "people",
      "people",
      "finance",
      "finance",
    ].entries()) {
      fireEvent.click(tabs[index])
      expect(screen.getByRole("tabpanel")).toHaveAttribute(
        "aria-labelledby",
        tabs[index].id,
      )
      expect(
        container.querySelector('.offer-links a[href*="flow-tab"]'),
      ).toHaveAttribute("href", `#flow-tab-${index}`)
      fireEvent.click(
        container.querySelector('.offer-links a[href="#pricing"]')!,
      )
      expect(container.querySelector(`input[value="${path}"]`)).toBeChecked()
    }
    fireEvent.keyDown(tabs[7], { key: "ArrowRight" })
    expect(tabs[0]).toHaveFocus()
    fireEvent.keyDown(tabs[0], { key: "End" })
    expect(tabs[7]).toHaveFocus()
    fireEvent.keyDown(tabs[7], { key: "Home" })
    expect(tabs[0]).toHaveFocus()
    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" })
    expect(tabs[7]).toHaveFocus()
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
    expect(preview.querySelector(".setup-account")).toBeInTheDocument()
    fireEvent.click(steps[1])
    expect(
      steps.filter((button) => button.getAttribute("aria-expanded") === "true"),
    ).toHaveLength(1)
    expect(preview).toHaveAttribute("aria-labelledby", "setup-step-1")
    expect(preview.querySelectorAll(".setup-module-grid > div")).toHaveLength(8)
    expect(preview.querySelector(".setup-account")).toBeNull()
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

test("leaves non-home public routes on the existing chrome", () => {
  mockPathname = "/workflows"
  const { container } = render(shell(<main>Workflow content</main>))
  expect(screen.getByText("Original header")).toBeInTheDocument()
  expect(screen.getByText("Original footer")).toBeInTheDocument()
  expect(container.querySelector(".cinematic-home")).toBeNull()
})

test("preserves signed-in dashboard navigation and French routes", () => {
  mockLocale = "fr"
  render(shell(<CinematicHero />, true))
  expect(screen.getByRole("link", { name: "Ouvrir l’espace" })).toHaveAttribute(
    "href",
    "/fr/dashboard",
  )
  expect(
    screen.getByRole("link", { name: "Switch to English" }),
  ).toHaveAttribute("href", "/en")
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "De la première vente à la clôture du mois.",
  )
  expect(
    screen.getByRole("link", { name: "Créer votre compte" }),
  ).toHaveAttribute("href", "/fr/register")
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
    for (const [index, module] of [
      "pos",
      "inventory",
      "receivables",
      "payables",
      "finance",
      "accounting",
    ].entries()) {
      fireEvent.click(tabs[index])
      expect(
        container.querySelector("#story-panel [data-module]"),
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
    for (const [index, workflow] of [
      [6, "procureToPay"],
      [7, "customerToCollection"],
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
        `/${locale}/workflows#workflow-${workflow}`,
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
  "all eight previews respond to selection and keyboard in %s",
  (locale) => {
    mockLocale = locale
    const { container } = render(<CinematicProduct />)
    const selectors = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".flow-tab"),
    )
    expect(selectors).toHaveLength(8)
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
    expect(selectors[7]).toHaveFocus()
    fireEvent.keyDown(selectors[7], { key: "ArrowDown" })
    expect(selectors[0]).toHaveFocus()
    fireEvent.keyDown(selectors[0], { key: "End" })
    expect(selectors[7]).toHaveFocus()
  },
)

test("bakery all-in-one screen expands on scroll and returns to its original screen bounds", () => {
  const { container } = render(shell(<CinematicHero />))
  const scene = container.querySelector(".cinema") as HTMLElement
  const image = container.querySelector(".hero-image") as HTMLImageElement
  const preview = container.querySelector(".zoom-preview") as HTMLElement
  expect(preview.style.visibility).toBe("hidden")
  Object.defineProperty(image, "clientWidth", { value: 1672 })
  Object.defineProperty(image, "clientHeight", { value: 941 })
  Object.defineProperty(scene, "offsetHeight", { value: 2000 })
  const bounds = jest.spyOn(scene, "getBoundingClientRect")
  bounds.mockReturnValue({ top: 0 } as DOMRect)
  fireEvent.load(image)
  expect(preview.style.left).toBe("928px")
  expect(preview.style.visibility).toBe("visible")
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
  bounds.mockReturnValue({ top: 0 } as DOMRect)
  fireEvent.load(image)
  expect(preview.style.opacity).toBe("1")
  expect(preview.style.transform).toBe(restingTransform)
  expect((container.querySelector(".hero-copy") as HTMLElement).inert).toBe(
    false,
  )
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
    const photos = screen.getAllByRole("img")
    expect(photos).toHaveLength(2)
    const computerScreens = container.querySelectorAll(".sme-computer-screen")
    expect(computerScreens).toHaveLength(2)
    for (const computerScreen of computerScreens) {
      expect(computerScreen).toHaveTextContent("stoquify")
      expect(computerScreen).toHaveAttribute("aria-hidden", "true")
    }
    for (const photo of photos) {
      expect(photo).toHaveAttribute("loading", "lazy")
      expect(photo.getAttribute("alt")?.length).toBeGreaterThan(30)
      expect(photo).toHaveAttribute("width", "1200")
      expect(photo).toHaveAttribute("height", "800")
    }
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
