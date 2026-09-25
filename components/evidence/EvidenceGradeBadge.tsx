"use client"

import { biLocale, biGradeCopy, biCopy } from "@/lib/dashboard/bi-presentation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"

const gradeClasses: Record<EvidenceGrade, string> = {
  raw: "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]",
  operational: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-text)]",
  posted: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-text)]",
  reconciled: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]",
  certified: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-text)]",
  blocked: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
}

type EvidenceGradeBadgeProps = {
  grade: EvidenceGrade
  locale?: string
  reason?: string
  className?: string
}

export function EvidenceGradeBadge({ grade, reason, className, locale = "en" }: EvidenceGradeBadgeProps) {
  const label = biGradeCopy[biLocale(locale)][grade]
  const evidence = biCopy[biLocale(locale)].evidence
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-md", gradeClasses[grade], className)}
      title={reason}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      <span className="sr-only">{`${evidence}: `}</span>
      {label}
      {reason ? <span className="sr-only">. {reason}</span> : null}
    </Badge>
  )
}
