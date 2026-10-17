import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import SalesPerformanceExport from "../SalesPerformanceExport"
import { exportSalesPerformanceAction } from "@/actions/analytics/sales-export.actions"
let mockLocale = "en"
jest.mock("next-intl", () => ({ useTranslations: () => (key: keyof typeof en.salesExport) => (mockLocale === "fr" ? fr : en).salesExport[key] }))
jest.mock("@/actions/analytics/sales-export.actions", () => ({ exportSalesPerformanceAction: jest.fn() }))
const action = exportSalesPerformanceAction as jest.Mock
const result = { success: true, data: { report: { current: { value: "10.00" } }, file: { content: "csv", mimeType: "text/csv;charset=utf-8", fileName: "sales.csv" } } }
beforeEach(() => { jest.resetAllMocks(); mockLocale = "en"; URL.createObjectURL = jest.fn(() => "blob:test"); URL.revokeObjectURL = jest.fn(); jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {}) })
afterEach(() => jest.restoreAllMocks())
it.each(["en", "fr"])("refreshes the visible report before downloading identical server output in %s", async locale => {
  mockLocale = locale; const t = (locale === "fr" ? fr : en).salesExport, onReport = jest.fn()
  action.mockResolvedValue(result)
  render(<SalesPerformanceExport scope={{ organizationId: "org", search: "record-only" }} onReport={onReport} />)
  fireEvent.click(screen.getByRole("button", { name: t.download }))
  await screen.findByText(t.done)
  expect(onReport).toHaveBeenCalledWith(result.data.report)
  expect(onReport.mock.invocationCallOrder[0]).toBeLessThan((URL.createObjectURL as jest.Mock).mock.invocationCallOrder[0])
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)
})
it("offers fresh-authentication recovery and never downloads denied output", async () => {
  action.mockResolvedValue({ success: false, code: "FRESH_AUTH_REQUIRED" })
  render(<SalesPerformanceExport scope={{}} onReport={jest.fn()} />)
  fireEvent.click(screen.getByRole("button"))
  expect(await screen.findByText(en.salesExport.freshAuth)).toBeInTheDocument()
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})
it("discards a late export after scope change or unmount", async () => {
  let resolve!: (value: unknown) => void
  action.mockReturnValue(new Promise(done => { resolve = done })); const onReport = jest.fn()
  const view = render(<SalesPerformanceExport key="org1" scope={{ organizationId: "org1" }} onReport={onReport} />)
  fireEvent.click(screen.getByRole("button"))
  view.rerender(<SalesPerformanceExport key="org2" scope={{ organizationId: "org2" }} onReport={onReport} />)
  await act(async () => resolve(result))
  expect(onReport).not.toHaveBeenCalled(); expect(URL.createObjectURL).not.toHaveBeenCalled()
})
