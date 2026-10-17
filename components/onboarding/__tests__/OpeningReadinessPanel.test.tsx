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
    expect(screen.getAllByRole("link")).toHaveLength(4)
    for (const link of screen.getAllByRole("link")) expect(link.getAttribute("href")).toMatch(new RegExp(`^/${locale}/dashboard/`))
    expect(screen.getAllByText(locale === "en" ? "External opening import unsupported" : "Import d’ouverture externe non pris en charge")).toHaveLength(2)
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(locale === "en" ? "review still required" : "revue encore requise")
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
