jest.mock("@/actions/pos/cash-payment-history.actions", () => ({
  getCashPaymentHistoryAction: jest.fn(),
  prepareCashPaymentHistoryExportAction: jest.fn(),
}))
import {
  buildCashPaymentHistoryHref,
  filtersForCashPaymentHistoryAction,
  filtersForCashPaymentHistoryExport,
  parseCashPaymentHistorySearchParams,
} from "../useCashPaymentHistoryWorkbench"

describe("cash payment history URL contract", () => {
  it("sanitizes URL filters before calling the server action", () => {
    const filters = parseCashPaymentHistorySearchParams(
      new URLSearchParams("lane=payment&paymentMethod=MOBILE_MONEY&paymentStatus=PAID&pageSize=100&dateFrom=2026-07-01&cursor=abc&selected=row-1"),
    )

    expect(filtersForCashPaymentHistoryAction(filters)).toEqual({
      lane: "payment",
      paymentMethod: "MOBILE_MONEY",
      paymentStatus: "PAID",
      dateFrom: "2026-07-01",
      pageSize: 100,
      cursor: "abc",
    })
  })

  it("removes cursor and selected row from export filters", () => {
    const filters = parseCashPaymentHistorySearchParams(new URLSearchParams("lane=cash&cashType=SALE&pageSize=25&cursor=abc&selected=cash:1"))

    expect(filtersForCashPaymentHistoryExport(filters)).toEqual({
      lane: "cash",
      cashType: "SALE",
      pageSize: 25,
    })
  })

  it("resets cursor and selection when a filter changes", () => {
    const href = buildCashPaymentHistoryHref(
      "/en/dashboard/finance/cash-payment-history",
      new URLSearchParams("lane=cash&cursor=abc&selected=cash:1&pageSize=25"),
      { paymentStatus: "PAID" },
    )

    expect(href).toBe("/en/dashboard/finance/cash-payment-history?lane=cash&pageSize=25&paymentStatus=PAID")
  })
})
