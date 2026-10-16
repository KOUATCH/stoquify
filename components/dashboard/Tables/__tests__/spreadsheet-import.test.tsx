/** @jest-environment jsdom */
import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import TableHeader from "../TableHeader"
import ModalTableHeader from "../ModalTableheader"
import { readSpreadsheet, SpreadsheetImportError } from "@/lib/imports/read-spreadsheet"
import { createBulkCategories } from "@/actions/categories/createBulkCategories"
import { notify } from "@/lib/notifications/notify"

jest.mock("lucide-react", () => ({ Check: () => null, CloudUpload: () => null, Loader2: () => null, PlusCircle: () => null, X: () => null }))
jest.mock("@/lib/imports/read-spreadsheet", () => ({ readSpreadsheet: jest.fn(), SpreadsheetImportError: class extends Error {} }))
jest.mock("@/actions/categories/createBulkCategories", () => ({ createBulkCategories: jest.fn() }))
jest.mock("@/lib/notifications/notify", () => ({ notify: { error: jest.fn() } }))
jest.mock("@/lib/exportDataToExcel", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/components/ui/dialog", () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  return Object.fromEntries(["Dialog", "DialogClose", "DialogContent", "DialogDescription", "DialogFooter", "DialogHeader", "DialogTitle", "DialogTrigger"].map((key) => [key, Wrapper]))
})
jest.mock("@/components/ui/scroll-area", () => ({ ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

const parse = readSpreadsheet as jest.Mock
const save = createBulkCategories as jest.Mock
const props = { title: "Categories", href: "/categories", linkTitle: "Add", data: [], model: "category", modalForm: <div /> }
function choose(container: HTMLElement) {
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["fixture"], "import.xlsx")] } })
}
describe("spreadsheet preview and save gates", () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, "log").mockImplementation(() => {}) })
  afterEach(() => jest.restoreAllMocks())
  it.each([TableHeader, ModalTableHeader])("rejects invalid preview and save without displaying success (%p)", async (Header) => {
    parse.mockRejectedValue(new SpreadsheetImportError("Use at most 100 data rows"))
    const { container } = render(<Header {...props} />)
    choose(container)
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    await waitFor(() => expect(notify.error).toHaveBeenCalledTimes(1))
    expect(screen.queryByText("Stop Preview")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Save Data" }))
    await waitFor(() => expect(notify.error).toHaveBeenCalledTimes(2))
    expect(save).not.toHaveBeenCalled()
    expect(screen.queryByText(/Data Synced Successfully/)).not.toBeInTheDocument()
  })
  it("parses again for save and passes the existing category mapping only after validation", async () => {
    parse.mockResolvedValue([{ Title: "Food", Description: "Pantry" }]); save.mockResolvedValue({ success: true })
    const { container } = render(<TableHeader {...props} />)
    choose(container)
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    await waitFor(() => expect(screen.getByText("Stop Preview")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "Save Data" }))
    await waitFor(() => expect(screen.getByText(/Data Synced Successfully/)).toBeInTheDocument())
    expect(parse).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenCalledWith([expect.objectContaining({ titleEn: "Food", slug: "food-", isActive: true })])
  })
  it("does not turn a failed server import into success", async () => {
    parse.mockResolvedValue([{ Title: "Food" }]); save.mockResolvedValue({ success: false })
    const { container } = render(<TableHeader {...props} />)
    choose(container)
    fireEvent.click(screen.getByRole("button", { name: "Save Data" }))
    await waitFor(() => expect(notify.error).toHaveBeenCalled())
    expect(screen.queryByText(/Data Synced Successfully/)).not.toBeInTheDocument()
  })
})
