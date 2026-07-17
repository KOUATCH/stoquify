import { AlertTriangle, Ban, CheckCircle2, Clock3, EyeOff, Loader2, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BIKpiState, BISeverity } from "@/services/bi/bi-contracts"

type BIStateBadgeProps = {
  state: BIKpiState
  label?: string
  className?: string
}

const stateLabels: Record<BIKpiState, string> = {
  loading: "Loading",
  empty: "No data",
  ready: "Ready",
  stale: "Stale",
  partial: "Partial",
  blocked: "Blocked",
  redacted: "Redacted",
  permission_denied: "Permission denied",
  module_unavailable: "Module unavailable",
  safe_error: "Unavailable",
}

const stateClasses: Record<BIKpiState, string> = {
  loading: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-text)]",
  empty: "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]",
  ready: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]",
  stale: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-text)]",
  partial: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-text)]",
  blocked: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
  redacted: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-text)]",
  permission_denied: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
  module_unavailable: "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]",
  safe_error: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
}

const severityClasses: Record<BISeverity, string> = {
  info: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-text)]",
  low: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-text)]",
  medium: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-text)]",
  high: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
  critical: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
}

function StateIcon({ state }: { state: BIKpiState }) {
  if (state === "loading") return <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
  if (state === "ready") return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
  if (state === "stale" || state === "partial") return <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
  if (state === "redacted") return <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
  if (state === "permission_denied" || state === "module_unavailable") {
    return <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
  }
  if (state === "blocked" || state === "safe_error") return <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
  return <Ban className="h-3.5 w-3.5" aria-hidden="true" />
}

export function BIStateBadge({ state, label, className }: BIStateBadgeProps) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-md", stateClasses[state], className)}>
      <StateIcon state={state} />
      {label ?? stateLabels[state]}
    </Badge>
  )
}

export function BISeverityBadge({ severity, className }: { severity: BISeverity; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-md capitalize", severityClasses[severity], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {severity}
    </Badge>
  )
}

export { stateLabels as biStateLabels }
