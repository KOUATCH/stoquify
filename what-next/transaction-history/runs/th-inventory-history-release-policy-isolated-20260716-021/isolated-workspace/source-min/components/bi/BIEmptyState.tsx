import type { ReactNode } from "react"
import { AlertTriangle, Ban, EyeOff, LockKeyhole, PackageOpen, ShieldAlert } from "lucide-react"

import { cn } from "@/lib/utils"

type BIEmptyStateKind =
  | "empty"
  | "blocked"
  | "redacted"
  | "permission_denied"
  | "module_unavailable"
  | "safe_error"

type BIEmptyStateProps = {
  kind?: BIEmptyStateKind
  title: string
  detail?: string
  action?: ReactNode
  className?: string
}

const kindClasses: Record<BIEmptyStateKind, string> = {
  empty: "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)]",
  blocked: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]",
  redacted: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)]",
  permission_denied: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]",
  module_unavailable: "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)]",
  safe_error: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]",
}

function StateIcon({ kind }: { kind: BIEmptyStateKind }) {
  if (kind === "blocked" || kind === "safe_error") return <AlertTriangle className="h-5 w-5" aria-hidden="true" />
  if (kind === "redacted") return <EyeOff className="h-5 w-5" aria-hidden="true" />
  if (kind === "permission_denied") return <LockKeyhole className="h-5 w-5" aria-hidden="true" />
  if (kind === "module_unavailable") return <ShieldAlert className="h-5 w-5" aria-hidden="true" />
  if (kind === "empty") return <PackageOpen className="h-5 w-5" aria-hidden="true" />
  return <Ban className="h-5 w-5" aria-hidden="true" />
}

export function BIEmptyState({ kind = "empty", title, detail, action, className }: BIEmptyStateProps) {
  return (
    <div className={cn("rounded-lg border p-4 text-[var(--dash-text)]", kindClasses[kind], className)}>
      <div className="flex gap-3">
        <span className="mt-0.5 text-[var(--dash-text-soft)]">
          <StateIcon kind={kind} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          {detail ? <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{detail}</p> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}
