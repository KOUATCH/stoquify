import { fireEvent, render, screen } from "@testing-library/react"
import AnalyticsError from "../error"
import AnalyticsLoading from "../loading"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

let mockLocale: "en" | "fr" = "en"
const mockRefresh = jest.fn()
jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return { AlertTriangle: Icon, Building2: Icon, Clock3: Icon, LockKeyhole: Icon, PackageX: Icon, SearchX: Icon }
})
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: () => (key: keyof typeof en.analyticsRecovery) => (mockLocale === "fr" ? fr : en).analyticsRecovery[key] }))
jest.mock("next-intl/server", () => ({ getLocale: async () => mockLocale, getTranslations: async () => (key: keyof typeof en.analyticsRecovery) => (mockLocale === "fr" ? fr : en).analyticsRecovery[key] }))
beforeEach(() => { jest.clearAllMocks() })

it.each(["en", "fr"] as const)("announces failure in %s and refreshes the server before resetting the boundary", locale => {
  mockLocale = locale
  const copy = (locale === "fr" ? fr : en).analyticsRecovery, order: string[] = [], reset = jest.fn(() => order.push("reset"))
  mockRefresh.mockImplementation(() => order.push("refresh"))
  const log = jest.spyOn(console, "error").mockImplementation(() => {})
  try {
    render(<AnalyticsError error={new Error("PRIVATE_SQL_OR_PROVIDER_DETAIL")} reset={reset} />)
    expect(screen.getByRole("alert")).toHaveTextContent(copy.errorTitle)
    expect(screen.getByText(copy.errorMessage)).toBeVisible()
    expect(screen.queryByText(/PRIVATE_SQL_OR_PROVIDER_DETAIL/)).not.toBeInTheDocument()
    expect(log).not.toHaveBeenCalled()
    expect(screen.getByRole("link")).toHaveAttribute("href", `/${locale}/dashboard`)
    fireEvent.click(screen.getByRole("button", { name: copy.retry }))
    expect(order).toEqual(["refresh", "reset"])
  } finally { log.mockRestore() }
})
it.each(["en", "fr"] as const)("announces a busy loading state in %s without fabricated figures", async locale => {
  mockLocale = locale
  render(await AnalyticsLoading())
  expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
  expect(screen.getByRole("heading")).toHaveTextContent((locale === "fr" ? fr : en).analyticsRecovery.loadingTitle)
  expect(screen.getByRole("link")).toHaveAttribute("href", `/${locale}/dashboard`)
})
