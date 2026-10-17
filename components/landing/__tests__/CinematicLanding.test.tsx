import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { forwardRef } from "react"
import { LandingRouteShell } from "../cinematic-shell"
import { CinematicHero } from "../cinematic-hero"
import { CinematicProduct, CinematicStory } from "../cinematic-product"

let mockLocale = "en"
let mockPathname = "/"
let mockReduced = false
let mockMobile = false

jest.mock("next-intl", () => ({ useLocale: () => mockLocale }))
jest.mock("@/i18n/navigation", () => ({
  usePathname: () => mockPathname,
  Link: forwardRef<HTMLAnchorElement, any>(function MockLink({ href, locale, children, ...props }, ref) {
    return <a ref={ref} href={`/${locale || mockLocale}${href === "/" ? "" : href}`} {...props}>{children}</a>
  }),
}))

const shell = (children: React.ReactNode, signedIn = false) => <LandingRouteShell signedIn={signedIn} header={<header>Original header</header>} footer={<footer>Original footer</footer>}>{children}</LandingRouteShell>

beforeEach(() => {
  mockLocale = "en"; mockPathname = "/"; mockReduced = false; mockMobile = false
  window.history.replaceState(null, "", "/")
  window.matchMedia = jest.fn(query => ({ matches: query.includes("reduced") ? mockReduced : mockMobile, media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn() }))
  jest.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {})
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

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
  expect(screen.getByRole("link", { name: "Ouvrir l’espace" })).toHaveAttribute("href", "/fr/dashboard")
  expect(screen.getByRole("link", { name: "Switch to English" })).toHaveAttribute("href", "/en")
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Votre activité. Enfin connectée.")
  expect(screen.getByRole("link", { name: "Créer votre compte" })).toHaveAttribute("href", "/fr/register")
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
  fireEvent.click(within(document.getElementById("mobile-menu")!).getByRole("link", { name: "Capabilities" }))
  expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false")
})

test.each(["mobile", "reduced"])("does not attach or load the video for %s visitors", mode => {
  mockMobile = mode === "mobile"; mockReduced = mode === "reduced"
  const { container } = render(shell(<CinematicHero />))
  expect(container.querySelector("video")).not.toHaveAttribute("src")
  expect(HTMLMediaElement.prototype.load).not.toHaveBeenCalled()
  if (mockReduced) expect(screen.getByRole("button", { name: "Reduced motion enabled" })).toBeDisabled()
})

test("pause removes the video source and keeps calls to action available", () => {
  const { container } = render(shell(<CinematicHero />))
  expect(container.querySelector("video")).toHaveAttribute("src", "/landing/cinematic/hero-scrub.mp4")
  fireEvent.click(screen.getByRole("button", { name: "Pause motion" }))
  expect(container.querySelector("video")).not.toHaveAttribute("src")
  expect(container.querySelector(".hero-copy")).toHaveStyle({ opacity: "1" })
  expect(screen.getByRole("button", { name: "Enable motion" })).toHaveAttribute("aria-pressed", "true")
})

test("video failure restores a readable static hero", () => {
  const { container } = render(shell(<CinematicHero />))
  fireEvent.error(container.querySelector("video")!)
  expect(container.querySelector(".cinema")).toHaveClass("media-fallback")
  expect(container.querySelector(".hero-copy")).toHaveStyle({ opacity: "1" })
  expect(container.querySelector("video")).toHaveStyle({ opacity: "0" })
})

test("selecting inventory updates the preview while retaining its sample disclosure", () => {
  render(<CinematicProduct />)
  fireEvent.click(screen.getByRole("button", { name: "Inventory & movements" }))
  expect(screen.getByRole("heading", { name: "Inventory movements" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Sales & daily activity" })).toHaveAttribute("aria-expanded", "false")
  expect(screen.getByText("Main shop · Illustrative example · Not live data")).toBeInTheDocument()
})

test("product menu deep links select the requested preview", () => {
  render(<CinematicProduct />)
  act(() => { window.history.replaceState(null, "", "/#flow-tab-2"); window.dispatchEvent(new HashChangeEvent("hashchange")) })
  expect(screen.getByRole("heading", { name: "Payment review" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Payments & evidence" })).toHaveAttribute("aria-expanded", "true")
})

test("workflow tabs support arrows, End and Home with roving focus", () => {
  render(<CinematicStory />)
  const tabs = screen.getAllByRole("tab")
  fireEvent.keyDown(tabs[0], { key: "ArrowRight" })
  expect(tabs[1]).toHaveFocus()
  expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "story-tab-1")
  fireEvent.keyDown(tabs[1], { key: "End" })
  expect(tabs[2]).toHaveAttribute("aria-selected", "true")
  fireEvent.keyDown(tabs[2], { key: "Home" })
  expect(tabs[0]).toHaveFocus()
  expect(tabs[2]).toHaveAttribute("tabindex", "-1")
})
