import { act, fireEvent, render, screen } from "@testing-library/react"
import { BusinessRecordSearch } from "../BusinessRecordSearch"
import { searchBusinessRecordsAction } from "@/actions/search/business-record-search.actions"
const push = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("@/actions/search/business-record-search.actions", () => ({ searchBusinessRecordsAction: jest.fn() }))
const hit = { id: "item", title: "Flour", reference: "FLOUR", domain: "items", href: "/dashboard/inventory/items/item" }
const data = { query: "flour", hits: [hit], partialDomains: [] }
const change = jest.fn()
const props = { query: "flour", onQueryChange: change, pages: [], locale: "en" as const, authority: "actor:org-a" }
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); (searchBusinessRecordsAction as jest.Mock).mockResolvedValue({ success: true, data }) })
afterEach(() => jest.useRealTimers())
const load = async () => { await act(async () => { await jest.advanceTimersByTimeAsync(251) }) }

it("debounces queries and lets the keyboard open a localized record", async () => {
  render(<BusinessRecordSearch {...props} />)
  expect(searchBusinessRecordsAction).not.toHaveBeenCalled()
  await load()
  expect(screen.getByRole("option", { name: /Flour/ })).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" })
  expect(screen.getByRole("option", { name: /Flour/ })).toHaveAttribute("aria-selected", "true")
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
  expect(push).toHaveBeenCalledWith("/en/dashboard/inventory/items/item")
  expect(change).toHaveBeenCalledWith("")
})

it("suppresses old results immediately when query changes and ignores late responses", async () => {
  let finish: (value: unknown) => void = () => {}
  ;(searchBusinessRecordsAction as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const view = render(<BusinessRecordSearch {...props} />)
  await load()
  view.rerender(<BusinessRecordSearch {...props} query="sugar" />)
  await act(async () => { finish({ success: true, data }) })
  expect(screen.queryByRole("option", { name: /Flour/ })).not.toBeInTheDocument()
})

it("removes records on authority changes before new results arrive", async () => {
  const view = render(<BusinessRecordSearch {...props} />)
  await load()
  expect(screen.getByRole("option", { name: /Flour/ })).toBeInTheDocument()
  view.rerender(<BusinessRecordSearch {...props} authority="actor:org-b" />)
  expect(screen.queryByRole("option", { name: /Flour/ })).not.toBeInTheDocument()
})

it("retains query on failure and offers explicit retry", async () => {
  ;(searchBusinessRecordsAction as jest.Mock).mockResolvedValueOnce({ success: false })
  render(<BusinessRecordSearch {...props} />)
  await load()
  expect(screen.getByRole("combobox")).toHaveValue("flour")
  fireEvent.click(screen.getByRole("button", { name: "Retry" }))
  await load()
  expect(screen.getByRole("option", { name: /Flour/ })).toBeInTheDocument()
})

it("shows pages alongside partial record results and localizes failure context", async () => {
  ;(searchBusinessRecordsAction as jest.Mock).mockResolvedValue({ success: true, data: { ...data, partialDomains: ["customers"] } })
  render(<BusinessRecordSearch {...props} locale="fr" pages={[{ href: "/dashboard/inventory", title: "Inventaire", context: "Stocks" }]} />)
  await load()
  expect(screen.getByRole("group", { name: "Pages" })).toBeInTheDocument()
  expect(screen.getByRole("group", { name: "Documents" })).toBeInTheDocument()
  expect(screen.getByText("Résultats partiels : Clients")).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
  expect(change).toHaveBeenCalledWith("")
})

it("does not query a one-character input", async () => {
  render(<BusinessRecordSearch {...props} query="f" />)
  await load()
  expect(searchBusinessRecordsAction).not.toHaveBeenCalled()
  expect(screen.getByRole("status")).toHaveTextContent("at least two")
})
