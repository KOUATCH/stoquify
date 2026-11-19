/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { getAccountantPortfolioAction } from "@/actions/accounting/accountant-access.actions"
import { AccountantPortfolioWorkspace } from "../AccountantPortfolioWorkspace"

jest.mock("@/actions/accounting/accountant-access.actions", () => ({ getAccountantPortfolioAction: jest.fn() }))
jest.mock("../AccountantWorkDesk", () => ({ AccountantWorkDesk: () => <div>Private work desk</div> }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href, prefetch, ...props }: any) => <a href={href} {...props}>{children}</a> }))
const list = getAccountantPortfolioAction as jest.Mock
function data(name = "Synthetic client") {
  return { generatedAt: "2026-10-19T12:00:00Z", accountantUserId: "actor", clientCount: 1,
    clients: [{ client: { organizationId: "c & 1", name, countryCode: "CM", currency: "XAF" },
      grant: { id: "g", role: "READ_ONLY", expiresAt: "2099-01-01" },
      selectedPeriod: { id: "period & 1", name: "October 2026" }, checkedAt: "2026-10-19T12:00:00Z", assessmentAsOf: "2026-10-18T12:00:00Z",
      proofState: "STALE", close: { readinessScore: 100, blockerCount: 0 }, currentProof: { grade: "blocked", blockers: [{ id: "close-evidence-stale", title: "Evidence invalidated", nextAction: "Refresh evidence" }] } }],
    page: { loadedCount: 1, pageSize: 10, search: "", nextCursor: "next-position", hasMore: true, coverage: "PARTIAL" } }
}
beforeEach(() => { list.mockReset(); list.mockResolvedValue({ success: true, data: data() }); window.history.replaceState(null, "", "/") })
afterEach(cleanup)

it.each(["en", "fr"])("searches and resets cursor with keyboard recovery in %s", async locale => {
  render(<AccountantPortfolioWorkspace locale={locale} initialInput={{ cursor: "old", pageSize: 10 }} />)
  await screen.findByText("Synthetic client")
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "New & client" } })
  list.mockResolvedValueOnce({ success: true, data: { ...data("Filtered"), page: { ...data().page, search: "New & client" } } })
  fireEvent.submit(screen.getByRole("searchbox").closest("form")!)
  expect(screen.queryByText("Synthetic client")).not.toBeInTheDocument()
  expect(screen.queryByText("Private work desk")).not.toBeInTheDocument()
  await screen.findByText("Filtered")
  expect(list).toHaveBeenLastCalledWith({ search: "New & client", pageSize: 10 })
  expect(screen.getByRole("heading", { name: locale === "fr" ? "Portefeuille des clients autorisés" : "Authorized client portfolio" })).toHaveFocus()
  expect(new URL(window.location.href).searchParams.get("search")).toBe("New & client")
})

it.each(["FORBIDDEN", "AUTH_REQUIRED", "DATABASE_UNAVAILABLE"])("purges private state on %s and retries without losing search", async code => {
  list.mockResolvedValueOnce({ success: true, data: { ...data(), page: { ...data().page, search: "Safe search" } } })
  render(<AccountantPortfolioWorkspace initialInput={{ search: "Safe search" }} />)
  await screen.findByText("Synthetic client")
  list.mockResolvedValueOnce({ success: false, code, error: "Internal server detail must not render" })
  fireEvent.click(screen.getByRole("button", { name: "Refresh access and evidence" }))
  await screen.findByRole("button", { name: "Retry" })
  expect(screen.queryByText("Synthetic client")).not.toBeInTheDocument()
  expect(screen.queryByText("Private work desk")).not.toBeInTheDocument()
  expect(screen.queryByText("Internal server detail must not render")).not.toBeInTheDocument()
  expect(screen.getByRole("searchbox")).toHaveValue("Safe search")
  if (code === "AUTH_REQUIRED") {
    const recovery = new URL(screen.getByRole("link", { name: "Sign in again" }).getAttribute("href")!, "https://example.test")
    expect(recovery.pathname).toBe("/en/login")
    expect(recovery.searchParams.get("callbackUrl")).toContain("search=Safe+search")
  }
  fireEvent.click(screen.getByRole("button", { name: "Retry" }))
  await screen.findByText("Synthetic client")
})

it("ignores late responses after visibility loss and reauthorizes on return", async () => {
  let resolve!: (response: unknown) => void
  list.mockReturnValueOnce(new Promise(r => { resolve = r }))
  render(<AccountantPortfolioWorkspace />)
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" })
  fireEvent(document, new Event("visibilitychange"))
  await act(async () => resolve({ success: true, data: data("Late private client") }))
  expect(screen.queryByText("Late private client")).not.toBeInTheDocument()
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
  fireEvent(document, new Event("visibilitychange"))
  await screen.findByText("Synthetic client")
  expect(list).toHaveBeenCalledTimes(2)
})

it("traverses 105 synthetic authorized clients without presenting a total", async () => {
  list.mockImplementation(async (input: any) => {
    const start = Number(input.cursor ?? 0), count = Math.min(20, 105 - start), next = start + count
    const clients = Array.from({ length: count }, (_, i) => ({ ...data().clients[0], grant: { ...data().clients[0].grant, id: `grant-${start + i}` }, client: { ...data().clients[0].client, name: `Synthetic ${start + i}` } }))
    return { success: true, data: { ...data(), clients, clientCount: count, page: { ...data().page, pageSize: 20, loadedCount: count, nextCursor: next < 105 ? String(next) : null, hasMore: next < 105 } } }
  })
  render(<AccountantPortfolioWorkspace initialInput={{ pageSize: 20 }} />)
  for (let start = 0; start < 105; start += 20) {
    await screen.findByText(`Synthetic ${start}`)
    expect(screen.getAllByRole("article")).toHaveLength(Math.min(20, 105 - start))
    if (start < 100) fireEvent.click(screen.getByRole("link", { name: "Continue portfolio" }))
  }
  expect(screen.queryByRole("link", { name: "Continue portfolio" })).not.toBeInTheDocument()
  expect(screen.getByText(/End of this scan/)).toBeInTheDocument()
})

it("restarts invalid cursors and preserves evidence client and period", async () => {
  list.mockResolvedValueOnce({ success: false, code: "BUSINESS_RULE_VIOLATION" })
  render(<AccountantPortfolioWorkspace initialInput={{ cursor: "old", search: "Saved" }} />)
  fireEvent.click(await screen.findByRole("button", { name: "Restart from first page" }))
  await screen.findByText("Synthetic client")
  expect(list).toHaveBeenLastCalledWith({ search: "Saved", pageSize: 10 })
  const href = screen.getByRole("link", { name: /Open ledger evidence:/ }).getAttribute("href")!
  const query = new URL(href, "https://example.test").searchParams
  expect(query.get("clientOrganizationId")).toBe("c & 1")
  expect(query.get("periodId")).toBe("period & 1")
  expect(screen.getByText("100%")).toBeInTheDocument()
  expect(screen.getByText("Evidence stale")).toBeInTheDocument()
  expect(screen.getByText("Blocked")).toBeInTheDocument()
})

it("removes known-expired mandates and ignores stale refresh responses", async () => {
  jest.useFakeTimers()
  try {
    const result = data()
    result.clients[0].grant.expiresAt = new Date(Date.now() + 1000).toISOString()
    list.mockResolvedValueOnce({ success: true, data: result })
    list.mockResolvedValueOnce({ success: true, data: { ...data(), clients: [], clientCount: 0, page: { ...data().page, loadedCount: 0 } } })
    render(<AccountantPortfolioWorkspace />)
    await act(async () => {})
    expect(screen.getByText("Synthetic client")).toBeInTheDocument()
    await act(async () => { jest.advanceTimersByTime(1001) })
    expect(screen.queryByText("Synthetic client")).not.toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(2)
    expect(screen.getByRole("link", { name: "Continue portfolio" })).toBeInTheDocument()
  } finally { jest.useRealTimers() }
})

it("reauthorizes when server navigation changes the query props", async () => {
  const { rerender } = render(<AccountantPortfolioWorkspace initialInput={{ search: "one" }} />)
  await screen.findByText("Synthetic client")
  list.mockResolvedValueOnce({ success: true, data: data("Second client") })
  rerender(<AccountantPortfolioWorkspace initialInput={{ search: "two", cursor: "position" }} />)
  await screen.findByText("Second client")
  expect(list).toHaveBeenLastCalledWith({ search: "two", cursor: "position" })
  expect(screen.getByRole("searchbox")).toHaveValue("two")
})
