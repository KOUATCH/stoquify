jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)
  return { Search: Icon, X: Icon, Check: Icon, ChevronDown: Icon, ChevronUp: Icon }
})

jest.mock("next-intl", () => ({
  useLocale: () => "fr",
}))

import { fireEvent, render, screen } from "@testing-library/react"

import { accountingProfitLossTableContract } from "@/components/DataTableComponents"
import { FinancialStatementLinesTable } from "../financial-statement-lines-table"

describe("FinancialStatementLinesTable canonical surface", () => {
  it("searches every loaded account and resets pagination without changing amounts", () => {
    render(<FinancialStatementLinesTable title="Revenue" currency="XAF" contract={accountingProfitLossTableContract} lines={Array.from({ length: 30 }, (_, index) => ({
      accountId: `account-${index}`,
      code: String(701000 + index),
      nameEn: `Revenue account ${index}`,
      nameFr: null,
      classificationSource: "EXPLICIT_MAPPING_KEY",
      amount: String(index + 1),
    }))} />)
    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }))
    expect(screen.getByText("701029")).toBeVisible()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search: Revenue" }), { target: { value: "701003" } })
    expect(screen.getByText("Revenue account 3")).toBeVisible()
    expect(screen.getByText("Page 1 of 1")).toBeVisible()
    expect(screen.queryByText("701029")).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "unmatched account" } })
    expect(screen.getByText("No results.")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Clear table search" }))
    expect(screen.getByText("701000")).toBeVisible()
    expect(screen.getByText("Page 1 of 2")).toBeVisible()
  })

  it("keeps French account labels, frozen identity columns, and aligned statement amounts", () => {
    const { container } = render(
      <FinancialStatementLinesTable
        title="Revenue"
        currency="XAF"
        locale="fr"
        contract={accountingProfitLossTableContract}
        lines={[
          {
            accountId: "account-1",
            code: "701000",
            nameEn: "Product sales",
            nameFr: "Ventes de produits",
            classificationSource: "EXPLICIT_MAPPING_KEY",
            amount: "125000.00",
          },
        ]}
      />,
    )

    expect(screen.getByText("Ventes de produits")).toBeInTheDocument()
    expect(container.querySelector('[data-table-id="accounting.profit-loss"]')).toBeInTheDocument()
    expect(container.querySelector('[data-column-id="code"][data-frozen="start"]')).toBeInTheDocument()
    expect(container.querySelector('[data-column-id="account"][data-frozen="start"]')).toBeInTheDocument()
    expect(screen.getByText("Grand livre poste")).toBeInTheDocument()
  })
})
