import Link from "next/link"
import { ArrowUpRight, Eye, LockKeyhole, ShieldAlert } from "lucide-react"

import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow"
import { BIEmptyState } from "@/components/bi/BIEmptyState"
import { BIStateBadge } from "@/components/bi/BIStateBadge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BIDrillThrough, BIKpiCard as BIKpiCardData } from "@/services/bi/bi-contracts"

type BIKpiCardProps = {
  card: BIKpiCardData
  locale?: string
  currencyCode?: string
  className?: string
}

type BIDrillThroughButtonProps = {
  drillThrough: BIDrillThrough
}

const blockedStates = new Set(["blocked", "redacted", "permission_denied", "module_unavailable", "safe_error"])

export function BIKpiCard({ card, locale = "en", currencyCode = "XAF", className }: BIKpiCardProps) {
  const blocked = blockedStates.has(card.state)

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4 text-[var(--dash-text)]",
        "transition hover:border-[var(--dash-brand)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{card.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-[var(--dash-text-soft)]">{card.detail}</p>
        </div>
        <BIStateBadge state={card.state} />
      </div>

      {blocked ? (
        <BIEmptyState
          kind={toEmptyStateKind(card.state)}
          title={blockedTitle(card)}
          detail={card.blockers[0]?.detail ?? (card.drillThrough.available ? undefined : card.drillThrough.unavailableReason)}
          className="mt-4"
        />
      ) : (
        <p className="mt-4 text-2xl font-semibold tracking-normal">
          {formatBIValue(card.value, card.format, card.unit, locale, currencyCode)}
        </p>
      )}

      <BIEvidenceBadgeRow
        className="mt-4"
        evidenceGrade={card.evidenceGrade}
        trustState={card.trustState}
        freshness={card.freshness}
        provenance={card.provenance}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <BIDrillThroughButton drillThrough={card.drillThrough} />
        {card.actionLink ? (
          <Button
            asChild={!card.actionLink.disabled}
            size="sm"
            variant="outline"
            className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]"
            disabled={card.actionLink.disabled}
            title={card.actionLink.disabledReason ?? undefined}
          >
            {card.actionLink.disabled ? (
              <span>
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                {card.actionLink.label}
              </span>
            ) : (
              <Link href={card.actionLink.href}>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                {card.actionLink.label}
              </Link>
            )}
          </Button>
        ) : null}
      </div>
    </article>
  )
}

export function BIDrillThroughButton({ drillThrough }: BIDrillThroughButtonProps) {
  if (!drillThrough.available) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]"
        disabled
        title={drillThrough.unavailableReason}
      >
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        {drillThrough.label}
      </Button>
    )
  }

  if (!drillThrough.href) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]"
        disabled
        title="Proof-only drill-through needs a proof drawer host."
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
        {drillThrough.label}
      </Button>
    )
  }

  return (
    <Button
      asChild
      size="sm"
      variant="outline"
      className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]"
    >
      <Link href={drillThrough.href}>
        <Eye className="h-4 w-4" aria-hidden="true" />
        {drillThrough.label}
      </Link>
    </Button>
  )
}

function blockedTitle(card: BIKpiCardData) {
  if (card.state === "redacted") return "This KPI is redacted"
  if (card.state === "permission_denied") return "You do not have access to this KPI"
  if (card.state === "module_unavailable") return "This module is not available"
  if (card.state === "safe_error") return "This KPI is temporarily unavailable"
  return card.blockers[0]?.title ?? "This KPI is blocked"
}

function toEmptyStateKind(state: BIKpiCardData["state"]) {
  if (state === "redacted") return "redacted"
  if (state === "permission_denied") return "permission_denied"
  if (state === "module_unavailable") return "module_unavailable"
  if (state === "safe_error") return "safe_error"
  if (state === "blocked") return "blocked"
  return "empty"
}

function formatBIValue(
  value: BIKpiCardData["value"],
  format: BIKpiCardData["format"],
  unit: string,
  locale: string,
  currencyCode: string,
) {
  if (value === null || value === undefined || value === "") return "No value"
  if (typeof value === "string") return value

  if (format === "currency") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (format === "percent") {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value)
  }

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: format === "score" ? 1 : 2,
  }).format(value)

  return unit ? `${formatted} ${unit}` : formatted
}
