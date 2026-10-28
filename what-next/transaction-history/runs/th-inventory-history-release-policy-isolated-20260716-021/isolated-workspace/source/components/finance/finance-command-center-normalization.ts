import type {
  ActionQueueItemData,
  DashboardTone,
  EvidenceTimelineEvent,
  ProofBadgeProps,
  StatusStripItem,
} from "@/components/dashboard/primitives"
import type {
  FinanceAlert,
  FinanceRecentPayment,
  FinanceSummary,
} from "@/services/finance/finance-dashboard.service"

type Formatter = (value: number | null | undefined) => string

export type FinanceAlertActionLabels = Record<FinanceAlert["code"], string>

export type FinanceRiskLabels = {
  critical: string
  warning: string
  watch: string
  ready: string
}

export type FinanceStatusLabels = {
  paymentsCollected: string
  pendingPayments: string
  netTax: string
  drawerVariance: string
  proofSource: string
}

export type FinanceEvidenceLabels = {
  proofSource: string
  methodLabel: (method: string) => string
  statusLabel: (status: string) => string
}

export function financeConfidenceTone(value: number | null | undefined): DashboardTone {
  const confidence = value ?? 0
  if (confidence >= 85) return "success"
  if (confidence >= 65) return "gold"
  return "danger"
}


export function financeAlertTone(alert: FinanceAlert): DashboardTone {
  if (alert.code === "READY" || alert.severity === "success") return "success"
  if (alert.severity === "critical") return "danger"
  if (alert.severity === "warning") return "warning"
  return "info"
}

export function financeAlertHref(alertOrCode: FinanceAlert | FinanceAlert["code"]): string | undefined {
  const code = typeof alertOrCode === "string" ? alertOrCode : alertOrCode.code
  if (typeof alertOrCode !== "string" && code === "PAYROLL_FORECAST_PROOF") return alertOrCode.actionHref
  if (code === "OVERDUE_AR") return "/dashboard/finance/receivables"
  if (code === "OVERDUE_AP") return "/dashboard/finance/payables"
  if (code === "PENDING_PAYMENTS") return "/dashboard/finance/payments"
  if (code === "NEGATIVE_MARGIN" || code === "CASH_GAP") return "/dashboard/finance/cash-flow"
  return undefined
}

function financeAlertProofState(alert: FinanceAlert): ProofBadgeProps["state"] {
  if (alert.code === "READY" || alert.severity === "success") return "verified"
  if (alert.severity === "critical" || alert.severity === "warning") return "pending"
  return "operational"
}

function financeRiskLabel(alert: FinanceAlert, labels: FinanceRiskLabels) {
  if (alert.code === "READY" || alert.severity === "success") return labels.ready
  if (alert.severity === "critical") return labels.critical
  if (alert.severity === "warning") return labels.warning
  return labels.watch
}

export function buildFinanceActionQueueItems(
  alerts: FinanceAlert[],
  options: {
    alertText: (alert: FinanceAlert) => string
    localizeHref: (href: string) => string
    actionLabels: FinanceAlertActionLabels
    riskLabels: FinanceRiskLabels
    ownerLabel: string
    proofSource: string
  },
): ActionQueueItemData[] {
  return alerts
    .filter((alert) => alert.code !== "READY")
    .map((alert) => {
      const href = financeAlertHref(alert)

      return {
        id: alert.id,
        title: options.alertText(alert),
        tone: financeAlertTone(alert),
        riskLabel: financeRiskLabel(alert, options.riskLabels),
        owner: options.ownerLabel,
        action: href
          ? {
              label: options.actionLabels[alert.code],
              href: options.localizeHref(href),
              variant: alert.severity === "critical" ? "primary" : "secondary",
            }
          : undefined,
        proof: {
          state: financeAlertProofState(alert),
          source: options.proofSource,
        },
      }
    })
}

export function buildFinanceStatusItems(
  summary: FinanceSummary,
  options: {
    labels: FinanceStatusLabels
    money: Formatter
  },
): StatusStripItem[] {
  const netTax = summary.taxCollected - summary.taxOnPurchases
  const drawerIsBalanced = Math.abs(summary.drawerVariance) < 0.01

  return [
    {
      id: "payments-collected",
      label: options.labels.paymentsCollected,
      value: options.money(summary.paymentsCollected),
      state: "ready",
      proof: { state: "verified", source: options.labels.proofSource },
    },
    {
      id: "pending-payments",
      label: options.labels.pendingPayments,
      value: options.money(summary.paymentsPending),
      state: summary.paymentsPending > 0 ? "pending" : "ready",
      proof: {
        state: summary.paymentsPending > 0 ? "pending" : "verified",
        source: options.labels.proofSource,
      },
    },
    {
      id: "net-tax",
      label: options.labels.netTax,
      value: options.money(netTax),
      state: "info",
      proof: { state: "operational", source: options.labels.proofSource },
    },
    {
      id: "drawer-variance",
      label: options.labels.drawerVariance,
      value: options.money(summary.drawerVariance),
      state: drawerIsBalanced ? "ready" : "warning",
      proof: {
        state: drawerIsBalanced ? "verified" : "pending",
        source: options.labels.proofSource,
      },
    },
  ]
}

export function buildFinanceEvidenceEvents(
  payments: FinanceRecentPayment[],
  options: {
    labels: FinanceEvidenceLabels
    money: Formatter
    formatDateTime: (value: string | null | undefined) => string
    localizeHref: (href: string) => string
    maxEvents?: number
  },
): EvidenceTimelineEvent[] {
  return payments.slice(0, options.maxEvents ?? 5).map((payment) => ({
    id: payment.id,
    title: payment.paymentNumber,
    summary: `${payment.counterparty} / ${options.labels.methodLabel(payment.method)} / ${options.money(payment.amount)}`,
    timestamp: options.formatDateTime(payment.createdAt),
    actor: payment.processedBy,
    source: options.labels.proofSource,
    stateLabel: options.labels.statusLabel(payment.status),
    tone: payment.direction === "out" ? "danger" : payment.status === "PENDING" ? "gold" : "success",
    href: options.localizeHref("/dashboard/finance/payments"),
    proof: {
      state: payment.status === "PAID" ? "posted" : payment.status === "PENDING" ? "pending" : "operational",
      source: options.labels.proofSource,
    },
  }))
}
