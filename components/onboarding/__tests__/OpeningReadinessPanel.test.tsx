/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { OpeningReadinessPanel } from "../OpeningReadinessPanel"
import { buildOpeningReadiness } from "@/services/onboarding/opening-readiness"

let mockLocale = "en"
jest.mock("next-intl", () => ({ useLocale: () => mockLocale }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, prefetch: _prefetch, ...props }: any) => <a {...props}>{children}</a> }))
const data = buildOpeningReadiness([], [])

describe("opening readiness panel", () => {
  beforeEach(() => { mockLocale = "en" })
  it.each(["en", "fr"])("renders the outstanding requirements and locale-aware routes in %s", (locale) => {
    mockLocale = locale
    render(<OpeningReadinessPanel data={data} refreshing={false} onRefresh={jest.fn()} />)
    expect(screen.getAllByRole("link")).toHaveLength(5)
    for (const link of screen.getAllByRole("link")) expect(link.getAttribute("href")).toMatch(new RegExp(`^/${locale}/dashboard/`))
    expect(screen.getAllByText(locale === "en" ? "Not verified here" : "Non vérifié ici")).toHaveLength(5)
    expect(screen.getAllByRole("link").filter(link => link.getAttribute("href")?.endsWith("/accounting/opening-position"))).toHaveLength(3)
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(locale === "en" ? "separate financial review" : "revue financière distincte")
  })
  it("offers explicit refresh and disables duplicate refresh while pending", () => {
    const refresh = jest.fn()
    const { rerender } = render(<OpeningReadinessPanel data={data} refreshing={false} onRefresh={refresh} />)
    fireEvent.click(screen.getByRole("button", { name: "Refresh evidence" }))
    expect(refresh).toHaveBeenCalledTimes(1)
    rerender(<OpeningReadinessPanel data={data} refreshing onRefresh={refresh} />)
    expect(screen.getByRole("button", { name: "Refreshing evidence…" })).toBeDisabled()
  })
})
