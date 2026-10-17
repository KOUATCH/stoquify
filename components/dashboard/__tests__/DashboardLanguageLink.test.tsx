import { act, render, screen } from "@testing-library/react"
import { DashboardLanguageLink } from "../DashboardLanguageLink"

let mockPathname = "/en/dashboard/sales"
let mockQuery = ""
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockQuery),
}))
jest.mock("lucide-react", () => ({ Globe2: () => <svg aria-hidden="true" /> }))

beforeEach(() => {
  mockPathname = "/en/dashboard/sales"
  mockQuery = ""
  window.history.replaceState({}, "", mockPathname)
})

it("preserves repeated filters, encoded values and fragment when changing language", () => {
  mockQuery = "locationId=branch-1&status=open&status=partial&q=caf%C3%A9+%26+tea"
  window.history.replaceState({}, "", `${mockPathname}?${mockQuery}#results`)
  render(<DashboardLanguageLink locale="en" />)
  expect(screen.getByRole("link", { name: "Passer en français" }))
    .toHaveAttribute("href", `/fr/dashboard/sales?${mockQuery}#results`)
})

it("updates after query-only navigation and clears the old anchor on a new route", () => {
  mockQuery = "period=today"
  window.history.replaceState({}, "", `${mockPathname}?${mockQuery}#results`)
  const { rerender } = render(<DashboardLanguageLink locale="en" />)
  mockQuery = "period=week"
  rerender(<DashboardLanguageLink locale="en" />)
  expect(screen.getByRole("link")).toHaveAttribute("href", "/fr/dashboard/sales?period=week#results")
  mockPathname = "/fr/dashboard/inventory/items"
  mockQuery = ""
  window.history.replaceState({}, "", mockPathname)
  rerender(<DashboardLanguageLink locale="fr" />)
  expect(screen.getByRole("link", { name: "Switch to English" }))
    .toHaveAttribute("href", "/en/dashboard/inventory/items")
})

it("tracks same-page anchor and history navigation without duplicating the locale", () => {
  mockPathname = "/fr/dashboard/owner-war-room"
  const { unmount } = render(<DashboardLanguageLink locale="fr" />)
  act(() => {
    window.history.replaceState({}, "", `${mockPathname}#evidence`)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  })
  expect(screen.getByRole("link")).toHaveAttribute("href", "/en/dashboard/owner-war-room#evidence")
  act(() => {
    window.history.replaceState({}, "", mockPathname)
    window.dispatchEvent(new PopStateEvent("popstate"))
  })
  expect(screen.getByRole("link")).toHaveAttribute("href", "/en/dashboard/owner-war-room")
  unmount()
})
