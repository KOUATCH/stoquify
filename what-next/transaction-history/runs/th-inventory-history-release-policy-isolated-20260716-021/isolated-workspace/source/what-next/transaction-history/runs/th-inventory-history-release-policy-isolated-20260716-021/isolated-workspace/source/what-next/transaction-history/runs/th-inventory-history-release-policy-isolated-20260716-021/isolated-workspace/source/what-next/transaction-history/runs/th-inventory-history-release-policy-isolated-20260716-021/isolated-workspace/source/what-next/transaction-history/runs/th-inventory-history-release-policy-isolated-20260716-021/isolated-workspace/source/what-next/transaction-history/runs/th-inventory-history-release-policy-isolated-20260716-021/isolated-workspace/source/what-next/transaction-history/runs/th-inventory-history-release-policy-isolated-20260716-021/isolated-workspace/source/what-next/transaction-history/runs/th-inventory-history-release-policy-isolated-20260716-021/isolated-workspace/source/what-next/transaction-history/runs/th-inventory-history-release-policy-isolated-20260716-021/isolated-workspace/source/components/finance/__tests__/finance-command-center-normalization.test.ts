import {
  buildFinanceActionQueueItems,
  buildFinanceEvidenceEvents,
  buildFinanceStatusItems,
  financeAlertHref,
  financeAlertTone,
  financeConfidenceTone,
} from "@/components/finance/finance-command-center-normalization"
import type {
  FinanceAlert,
  FinanceRecentPayment,
  FinanceSummary,
} from "@/services/finance/finance-dashboard.service"

const actionLabels = {
  OVERDUE_AR: "Receivables",
  OVERDUE_AP: "Payables",
  NEGATIVE_MARGIN: "Cash flow",
  PENDING_PAYMENTS: "Payments",
  CASH_GAP: "Cash flow",
  PAYROLL_FORECAST_PROOF: "Payroll",
  READY: "Assurance",
}

const riskLabels = {
  critical: "Critical",
  warning: "Warning",
  watch: "Watch",
  ready: "Ready",
}

const localizeHref = (href: string) => `/en${href}`
const money = (value: number | null | undefined) => `XAF ${value ?? 0}`

describe("finance command center normalization", () => {
  it("turns critical finance alerts into localized blocking action items", () => {
    const alerts: FinanceAlert[] = [
      {
        id: "overdue-ar",
        code: "OVERDUE_AR",
        severity: "critical",
        count: 3,
        amount: 125000,
      },
      {
        id: "ready",
        code: "READY",
        severity: "success",
        count: 0,
      },
    ]

    const items = buildFinanceActionQueueItems(alerts, {
      alertText: (alert) => `${alert.code}:${alert.amount ?? 0}`,
      localizeHref,
      actionLabels,
      riskLabels,
      ownerLabel: "Finance owner",
      proofSource: "Finance read model",
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: "overdue-ar",
      title: "OVERDUE_AR:125000",
      tone: "danger",
      riskLabel: "Critical",
      owner: "Finance owner",
      action: {
        label: "Receivables",
        href: "/en/dashboard/finance/receivables",
        variant: "primary",
      },
      proof: {
        state: "pending",
        source: "Finance read model",
      },
    })
    expect(financeAlertTone(alerts[0])).toBe("danger")
    expect(financeAlertHref("CASH_GAP")).toBe("/dashboard/finance/cash-flow")
  })

  it("routes payroll forecast proof alerts to the payroll proof action", () => {
    const alerts: FinanceAlert[] = [
      {
        id: "payroll-forecast-proof",
        code: "PAYROLL_FORECAST_PROOF",
        severity: "warning",
        count: 1,
        amount: 170000,
        actionHref: "/dashboard/payroll/declarations",
        message: "Payroll declaration proof is missing.",
        blockerCodes: ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"],
        redactionCount: 1,
      },
    ]

    const items = buildFinanceActionQueueItems(alerts, {
      alertText: (alert) => alert.message ?? alert.code,
      localizeHref,
      actionLabels,
      riskLabels,
      ownerLabel: "Finance owner",
      proofSource: "Finance read model",
    })

    expect(items).toEqual([
      expect.objectContaining({
        id: "payroll-forecast-proof",
        title: "Payroll declaration proof is missing.",
        tone: "warning",
        action: expect.objectContaining({
          label: "Payroll",
          href: "/en/dashboard/payroll/declarations",
          variant: "secondary",
        }),
        proof: { state: "pending", source: "Finance read model" },
      }),
    ])
    expect(financeAlertHref(alerts[0])).toBe("/dashboard/payroll/declarations")
  })

  it("builds status strip items that surface pending payments and drawer variance", () => {
    const summary: FinanceSummary = {
      cashPosition: 900000,
      netCashFlow: -100000,
      revenue: 700000,
      expenses: 150000,
      purchases: 200000,
      grossProfit: 450000,
      grossMargin: 64,
      paymentsCollected: 500000,
      paymentsPending: 85000,
      refunds: 5000,
      receivables: 250000,
      payables: 175000,
      workingCapital: 75000,
      openReceivableCount: 4,
      openPayableCount: 2,
      overdueReceivableAmount: 125000,
      overduePayableAmount: 50000,
      taxCollected: 70000,
      taxOnPurchases: 20000,
      drawerVariance: -1500,
      financeConfidence: 62,
    }

    const items = buildFinanceStatusItems(summary, {
      money,
      labels: {
        paymentsCollected: "Collected",
        pendingPayments: "Pending",
        netTax: "Net tax",
        drawerVariance: "Drawer variance",
        proofSource: "Finance read model",
      },
    })

    expect(items.find((item) => item.id === "pending-payments")).toMatchObject({
      value: "XAF 85000",
      state: "pending",
      proof: { state: "pending" },
    })
    expect(items.find((item) => item.id === "drawer-variance")).toMatchObject({
      value: "XAF -1500",
      state: "warning",
      proof: { state: "pending" },
    })
    expect(financeConfidenceTone(summary.financeConfidence)).toBe("danger")
  })

  it("maps recent payments into evidence events without changing the payment data", () => {
    const payments: FinanceRecentPayment[] = [
      {
        id: "payment-1",
        paymentNumber: "PAY-001",
        amount: 25000,
        method: "CASH",
        status: "PAID",
        direction: "in",
        counterparty: "Retail customer",
        processedBy: "Cashier A",
        createdAt: "2026-06-26T08:30:00.000Z",
      },
      {
        id: "payment-2",
        paymentNumber: "PAY-002",
        amount: 15000,
        method: "BANK_TRANSFER",
        status: "PENDING",
        direction: "out",
        counterparty: "Supplier B",
        processedBy: "Finance lead",
        createdAt: "2026-06-26T09:00:00.000Z",
      },
    ]

    const events = buildFinanceEvidenceEvents(payments, {
      money,
      localizeHref,
      formatDateTime: (value) => value ?? "No time",
      labels: {
        proofSource: "Finance read model",
        methodLabel: (method) => method,
        statusLabel: (status) => status,
      },
    })

    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({
      id: "payment-1",
      title: "PAY-001",
      summary: "Retail customer / CASH / XAF 25000",
      actor: "Cashier A",
      href: "/en/dashboard/finance/payments",
      proof: { state: "posted" },
    })
    expect(events[1]).toMatchObject({
      tone: "danger",
      stateLabel: "PENDING",
      proof: { state: "pending" },
    })
  })
})
