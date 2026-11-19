import { fireEvent, render, screen } from "@testing-library/react"
import PublicNotFound from "@/app/not-found"

let mockPathname = "/en/missing"
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }))

test.each([
  ["/en/missing", "en"],
  ["/fr/missing", "fr"],
  ["/fr", "fr"],
  ["/missing", "en"],
])("missing-page recovery preserves the language at %s", (pathname, locale) => {
  mockPathname = pathname
  const back = jest.spyOn(window.history, "back").mockImplementation(() => {})
  render(<PublicNotFound />)
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    locale === "fr" ? "Cette page est introuvable" : "This page could not be found",
  )
  expect(document.documentElement.lang).toBe(locale)
  expect(screen.getByRole("img", { name: "Stoquify" })).toBeVisible()
  for (const link of screen.getAllByRole("link")) {
    expect(link).toHaveAttribute("href", `/${locale}`)
  }
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Retour" : "Go back" }))
  expect(back).toHaveBeenCalledTimes(1)
  back.mockRestore()
})
