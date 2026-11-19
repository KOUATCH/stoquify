/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { render, screen, cleanup } from "@testing-library/react"
import { AccountantPortfolio } from "../AccountantPortfolio"
import type { AccountantPortfolio as Portfolio } from "@/services/accounting/accountant-access.service"
import { accountantPortfolioCopy } from "../accountant-portfolio-copy"

jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href, prefetch, ...props }: any) => <a href={href} {...props}>{children}</a> }))
afterEach(cleanup)
function portfolio(clients: Portfolio["clients"] = []): Portfolio {
  return { generatedAt: "2026-10-19T12:00:00Z", accountantUserId: "actor", clientCount: clients.length, clients,
    page: { scope: "AUTHORIZED_CLIENTS_IN_GRANT_PAGE", loadedCount: clients.length, pageSize: 10, search: "A & B",
      nextCursor: "opaque-position", hasMore: true, coverage: "PARTIAL" } }
}

it.each(["en", "fr"])("keeps empty/denied page continuation reachable in %s", locale => {
  render(<AccountantPortfolio portfolio={portfolio()} locale={locale} />)
  const next = screen.getByRole("link", { name: locale === "fr" ? "Continuer le portefeuille" : "Continue portfolio" })
  const url = new URL(next.getAttribute("href")!, "https://example.test")
  expect(url.pathname).toBe(`/${locale}/dashboard/accounting/accountant-portfolio`)
  expect(url.searchParams.get("cursor")).toBe("opaque-position")
  expect(url.searchParams.get("search")).toBe("A & B")
  expect(url.searchParams.get("pageSize")).toBe("10")
  next.focus()
  expect(next).toHaveFocus()
  const restart = screen.getByRole("link", { name: locale === "fr" ? "Revenir au début" : "Restart from first page" })
  expect(new URL(restart.getAttribute("href")!, "https://example.test").searchParams.has("cursor")).toBe(false)
  expect(screen.queryByText("No active client mandates")).not.toBeInTheDocument()
})

describe.each(["en", "fr"] as const)("%s proof presentation", locale => {
  const copy = accountantPortfolioCopy[locale]
  it.each(Object.keys(copy.states) as Array<keyof typeof copy.states>)("presents %s independently of the historical score", state => {
    const data = portfolio([{
      grant: { id: "g", role: "READ_ONLY", expiresAt: "2099-01-01" },
      client: { organizationId: "c", name: "Synthetic", currency: "XAF", countryCode: "CM" },
      selectedPeriod: { id: "p", name: "October" }, checkedAt: "2026-10-19T12:00:00Z", assessmentAsOf: "2026-10-18T12:00:00Z",
      proofState: state, close: { readinessScore: 100, blockerCount: 0 }, currentProof: { grade: "blocked", blockers: [] },
    } as unknown as Portfolio["clients"][number]])
    render(<AccountantPortfolio portfolio={data} locale={locale} />)
    expect(screen.getByText(copy.states[state])).toBeInTheDocument()
    expect(screen.getByText(copy.grades.blocked)).toBeInTheDocument()
    expect(screen.getByText(copy.historical)).toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
  })
  it("does not convert missing values to zero", () => {
    const data = portfolio([{ grant: { id: "g", role: "READ_ONLY", expiresAt: "2099-01-01" }, client: { organizationId: "c", name: "Synthetic", currency: "XAF" }, selectedPeriod: null, close: null, assessmentAsOf: null, checkedAt: "2026-10-19T12:00:00Z", proofState: "NO_PERIOD", currentProof: null } as unknown as Portfolio["clients"][number]])
    render(<AccountantPortfolio portfolio={data} locale={locale} />)
    expect(screen.queryByText("0%")).not.toBeInTheDocument()
    expect(screen.getAllByText(copy.unavailable).length).toBeGreaterThan(3)
    expect(screen.queryByText(copy.noBlockers)).not.toBeInTheDocument()
  })
})

it("does not offer continuation after the final candidate page", () => {
  const data = portfolio()
  data.page = { ...data.page, hasMore: false, nextCursor: null, coverage: "END_OF_SCAN" }
  render(<AccountantPortfolio portfolio={data} />)
  expect(screen.queryByRole("link", { name: "Continue portfolio" })).not.toBeInTheDocument()
})

it.each(["en", "fr"])("labels persisted scores as historical in %s", locale => {
  const data = portfolio([{
    grant: { id: "grant", role: "READ_ONLY", expiresAt: "2099-01-01" },
    client: { organizationId: "client", name: "Client", currency: "XAF", countryCode: "CM" },
    close: { readinessScore: 100, blockerCount: 0, scoreBasis: "HISTORICAL_ASSESSMENT" },
  } as Portfolio["clients"][number]])
  render(<AccountantPortfolio portfolio={data} locale={locale} />)
  expect(screen.getByText(locale === "fr" ? "Dernière préparation évaluée" : "Last assessed readiness")).toBeInTheDocument()
  expect(screen.getByText("100%")).toBeInTheDocument()
  expect(screen.queryByText("Close readiness")).not.toBeInTheDocument()
})
