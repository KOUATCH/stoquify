jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)
  return { Search: Icon, X: Icon, Check: Icon, ChevronDown: Icon, ChevronUp: Icon }
})

import { fireEvent, render, screen, within } from "@testing-library/react"

import { AccountingDataTable } from "../AccountingDataTable"

const rows = Array.from({ length: 26 }, (_, index) => ({
  id: `entry-${index}`,
  searchText: `JE-${String(index).padStart(3, "0")} Journal entry ${index}`,
  cells: [
    <span key="number">JE-{String(index).padStart(3, "0")}</span>,
    <form key="action">
      <input type="hidden" name="entryId" value={`entry-${index}`} />
      <button type="submit">Review {index}</button>
    </form>,
  ],
}))

describe("AccountingDataTable", () => {
  it("paginates rendered records while keeping each row action bound to its record", () => {
    render(<AccountingDataTable caption="Journals" columns={[{ label: "Entry" }, { label: "Actions" }]} rows={rows} />)

    expect(screen.getByText("JE-000")).toBeVisible()
    expect(screen.queryByText("JE-010")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }))
    const entry = screen.getByText("JE-010").closest("tr")!
    expect(within(entry).getByRole("button", { name: "Review 10" })).toBeVisible()
    expect(entry.querySelector('input[name="entryId"]')).toHaveValue("entry-10")
    fireEvent.click(screen.getByRole("button", { name: "Go to last page" }))
    expect(screen.getByText("JE-025")).toBeVisible()
    expect(screen.getByRole("button", { name: "Go to next page" })).toBeDisabled()
  })

  it("searches across pages, resets the current page, and restores records when cleared", () => {
    render(<AccountingDataTable caption="Journals" columns={[{ label: "Entry" }, { label: "Actions" }]} rows={rows} />)
    fireEvent.click(screen.getByRole("button", { name: "Go to last page" }))
    fireEvent.change(screen.getByRole("searchbox", { name: "Search: Journals" }), { target: { value: "je-003" } })
    expect(screen.getByText("JE-003")).toBeVisible()
    expect(screen.getByText("Page 1 of 1")).toBeVisible()
    expect(screen.getByText("1 of 26 loaded records")).toBeVisible()
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing entry" } })
    expect(screen.getByText("No results.")).toBeVisible()
    expect(screen.getByRole("button", { name: "Go to next page" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Clear table search" }))
    expect(screen.getByText("JE-000")).toBeVisible()
    expect(screen.getByText("Page 1 of 3")).toBeVisible()
  })

  it("keeps localized controls available for empty lists", () => {
    render(<AccountingDataTable caption="Journaux" locale="fr" columns={[{ label: "Écriture" }]} rows={[]} />)
    expect(screen.getByRole("searchbox", { name: "Rechercher: Journaux" })).toBeVisible()
    expect(screen.getByRole("combobox", { name: "Lignes par page" })).toBeVisible()
    expect(screen.getByText("Aucun enregistrement disponible.")).toBeVisible()
    expect(screen.getByText("Page 1 sur 1")).toBeVisible()
    expect(screen.getByRole("button", { name: "Aller à la page suivante" })).toBeDisabled()
  })
})
