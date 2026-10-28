import { fireEvent, render, screen } from "@testing-library/react"

import { TrialBalanceTable, type TrialBalanceRow } from "../trial-balance-table"

const totals = {
  activityDebit: "7800.00",
  activityCredit: "7800.00",
  debitBalance: "3900.00",
  creditBalance: "3900.00",
}

function buildRows(count: number): TrialBalanceRow[] {
  return Array.from({ length: count }, (_, index) => ({
    accountId: `account-${index + 1}`,
    code: `${570000 + index}`,
    nameEn: index === 10 ? "Regional clearing" : `Account ${index + 1}`,
    type: index % 2 === 0 ? "ASSET" : "LIABILITY",
    normalBalance: index % 2 === 0 ? "DEBIT" : "CREDIT",
    activityDebit: index === 11 ? "0.00" : "100.00",
    activityCredit: index === 11 ? "0.00" : "100.00",
    debitBalance: "0.00",
    creditBalance: "0.00",
  }))
}

describe("TrialBalanceTable", () => {
  it("paginates long reports without hiding report totals", () => {
    render(<TrialBalanceTable rows={buildRows(12)} totals={totals} />)

    expect(screen.getByText("Account 1")).toBeInTheDocument()
    expect(screen.queryByText("Regional clearing")).not.toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === "Page 1 of 2")).toBeInTheDocument()
    expect(screen.getByText("Report totals")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    expect(screen.queryByText("Account 1")).not.toBeInTheDocument()
    expect(screen.getByText("Regional clearing")).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === "Page 2 of 2")).toBeInTheDocument()
  })

  it("filters by account search, type, and posted activity", () => {
    render(<TrialBalanceTable rows={buildRows(12)} totals={totals} />)

    fireEvent.change(screen.getByLabelText("Search accounts"), { target: { value: "Regional" } })
    expect(screen.getByText("Regional clearing")).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === "Showing 1–1 of 1 accounts (12 total)")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "LIABILITY" } })
    expect(screen.getByText("Account 2")).toBeInTheDocument()
    expect(screen.queryByText("Account 1")).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Posted activity"), { target: { value: "with-activity" } })
    expect(screen.queryByText("Account 12")).not.toBeInTheDocument()
  })
})
