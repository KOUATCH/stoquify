import { cn } from "@/lib/utils"
import type { POSActivityKind, POSActivityPage, POSActivityRow } from "@/services/pos/pos-activity.types"

import type { POSActivityCopy } from "./pos-activity-copy"

export const posActivityDetailId = "pos-activity-detail"

export const activityLinkClass = "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dash-surface)]"
export const activityPanelClass = "dashboard-glass-panel min-w-0 rounded-xl"
export const activityMutedClass = "text-[var(--dash-text-soft)]"

export function ActivityCustomer({ customer, copy }: { customer: POSActivityRow["customer"]; copy: POSActivityCopy }) {
  if (!customer) return <span className={activityMutedClass}>{copy.customerUnrecorded}</span>

  return (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-baseline gap-x-2 [overflow-wrap:anywhere]">
      <span className="min-w-0 font-medium">{customer.name}</span>
      {customer.phoneLastFour && (
        <span className={cn(activityMutedClass, "whitespace-nowrap text-xs tabular-nums")}>
          <span aria-hidden="true">•••• {customer.phoneLastFour}</span>
          <span className="sr-only">{copy.phoneEnding.replace("{digits}", customer.phoneLastFour)}</span>
        </span>
      )}
    </span>
  )
}

type ActivityQuery = Omit<Partial<POSActivityPage["filters"]>, "view"> & {
  view?: POSActivityPage["filters"]["view"] | "attention"
  date?: string
  cursor?: string | null
  kind?: POSActivityKind
  id?: string
}

export function activityHref(path: string, activity: Pick<POSActivityPage, "date" | "filters">, overrides: ActivityQuery = {}) {
  const query = { date: activity.date, ...activity.filters, ...overrides }
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query)) {
    if (query.view !== "receipts" && (name === "total" || name === "fromTime" || name === "toTime")) continue
    if (query.view === "attention" && name === "search") continue
    if (value != null && value !== "") params.set(name, value)
    else if (name === "locationId" || name === "terminalId" || name === "sessionId") params.set(name, "")
  }
  return `${path}?${params.toString()}${query.id ? `#${posActivityDetailId}` : ""}`
}

export function activityStatusText(status: string, copy: POSActivityCopy) {
  return copy.statuses[status as keyof typeof copy.statuses] ?? status.toLowerCase().replaceAll("_", " ")
}

export function ActivityStatus({ label, tone }: { label: string; tone: "neutral" | "warning" | "danger" | "brand" | "positive" }) {
  const tones = {
    neutral: "border-[var(--dash-border-subtle)] text-[var(--dash-text)]",
    warning: "border-[var(--dash-warning)]/35 bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    danger: "border-[var(--dash-danger)]/35 bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    brand: "border-[var(--dash-brand)]/35 bg-[var(--dash-brand-soft)] text-[var(--dash-text)]",
    positive: "border-[var(--dash-spruce)]/35 bg-[var(--dash-spruce-soft)] text-[var(--dash-text)]",
  }
  return <span className={cn("inline-flex max-w-full rounded-md border px-2 py-0.5 text-xs font-medium leading-5", tones[tone])}>{label}</span>
}

export function activityStatusTone(status: string) {
  switch (status) {
    case "ACCEPTED": case "COMPLETED": case "CONFIRMED": case "POSTED":
      return "positive"
    case "FAILED": case "REJECTED": case "CANCELLED": case "VOIDED":
      return "danger"
    case "UNCERTAIN": case "RETRYING": case "PENDING": case "UNAVAILABLE":
      return "warning"
    case "QUEUED": case "OPEN":
      return "brand"
    default:
      return "neutral"
  }
}
