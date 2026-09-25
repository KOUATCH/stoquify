jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)
  return { Search: Icon, X: Icon, Check: Icon, ChevronDown: Icon, ChevronUp: Icon }
})

import { fireEvent, render, screen } from "@testing-library/react"

import { TrialBalanceTable } from "../trial-balance-table"

describe("TrialBalanceTable canonical surface", () => {
  it("keeps ledger totals unchanged when searching accounts from another page", () => {
    const { container } = render(<TrialBalanceTable
      rows={Array.from({ length: 12 }, (_, index) => ({
        accountId: `account-${index}`, code: String(401000 + index), nameEn: `Supplier ${index}`,
        type: "LIABILITY", normalBalance: "CREDIT", activityDebit: "0.00", activityCredit: "100.00", debitBalance: "0.00", creditBalance: "100.00",
      }))}
      totals={{ activityDebit: "0.00", activityCredit: "1200.00", debitBalance: "0.00", creditBalance: "1200.00" }}
      locale="en" currency="XAF"
    />)
    const totalsBefore = container.querySelector("tfoot")!.textContent
    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }))
    expect(screen.getByText("401011")).toBeVisible()
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "401003" } })
    expect(screen.getByText("Supplier 3")).toBeVisible()
    expect(screen.getByText("Page 1 of 1")).toBeVisible()
    expect(container.querySelector("tfoot")!.textContent).toBe(totalsBefore)
  })

  it("exposes the X1 contract, frozen account identity, and numeric totals", () => {
    const { container } = render(
      <TrialBalanceTable
        rows={[
          {
            accountId: "account-1",
            code: "401000",
            nameEn: "Supplier control",
            type: "LIABILITY",
            normalBalance: "CREDIT",
            activityDebit: "0.00",
            activityCredit: "125000.00",
            debitBalance: "0.00",
            creditBalance: "125000.00",
          },
        ]}
        totals={{ activityDebit: "0.00", activityCredit: "125000.00", debitBalance: "0.00", creditBalance: "125000.00" }}
        locale="fr"
        currency="XAF"
      />,
    )

    expect(container.querySelector('[data-table-id="accounting.trial-balance"]')).toBeInTheDocument()
    expect(container.querySelector('[data-column-id="code"][data-frozen="start"]')).toBeInTheDocument()
    expect(container.querySelector('[data-column-id="name"][data-frozen="start"]')).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Densite du tableau" })).toBeInTheDocument()
    expect(screen.getByText("Grand livre poste")).toBeInTheDocument()
  })
})
