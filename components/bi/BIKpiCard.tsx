import Link from "next/link"
import { localizePath } from "@/i18n/routing"
import { ArrowUpRight, Eye, LockKeyhole, ShieldAlert } from "lucide-react"

import { biLocale, biCopy } from "@/lib/dashboard/bi-presentation"
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
  locale?: string
}

const blockedStates = new Set(["blocked", "redacted", "permission_denied", "module_unavailable", "safe_error"])

export function BIKpiCard({ card, locale = "en", currencyCode = "XAF", className }: BIKpiCardProps) {
  const blocked = blockedStates.has(card.state)

  return (
    <article
      className={cn(
        "min-w-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4 text-[var(--dash-text)]",
        "transition hover:border-[var(--dash-brand)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-full flex-1 basis-48">
          <h3 className="break-words text-sm font-semibold">{card.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-[var(--dash-text-soft)]">{card.detail}</p>
        </div>
        <BIStateBadge state={card.state} locale={locale} className="max-w-full shrink-0 whitespace-normal [&_svg]:shrink-0" />
      </div>

      {blocked ? (
        <BIEmptyState
          kind={toEmptyStateKind(card.state)}
          title={blockedTitle(card, locale)}
          detail={card.blockers[0]?.detail ?? (card.drillThrough.available ? undefined : card.drillThrough.unavailableReason)}
          className="mt-4"
        />
      ) : (
        <p className="mt-4 break-words text-2xl font-semibold tracking-normal">
          {formatBIValue(card.value, card.format, card.unit, locale, currencyCode)}
        </p>
      )}

      <BIEvidenceBadgeRow
        locale={locale}
        className="mt-4"
        evidenceGrade={card.evidenceGrade}
        trustState={card.trustState}
        freshness={card.freshness}
        provenance={card.provenance}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <BIDrillThroughButton drillThrough={card.drillThrough} locale={locale} />
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
              <Link href={localizePath(card.actionLink.href, biLocale(locale))}>
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

export function BIDrillThroughButton({ drillThrough, locale = "en" }: BIDrillThroughButtonProps) {
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
        title={biCopy[biLocale(locale)].proofUnavailable}
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
      <Link href={localizePath(drillThrough.href, biLocale(locale))}>
        <Eye className="h-4 w-4" aria-hidden="true" />
        {drillThrough.label}
      </Link>
    </Button>
  )
}

function blockedTitle(card: BIKpiCardData, locale: string) {
  const t = biCopy[biLocale(locale)].kpi
  if (card.state === "redacted") return t.redacted
  if (card.state === "permission_denied") return t.permission_denied
  if (card.state === "module_unavailable") return t.module_unavailable
  if (card.state === "safe_error") return t.safe_error
  return card.blockers[0]?.title ?? t.blocked
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
  if (value === null || value === undefined || value === "") return biCopy[biLocale(locale)].noValue
  if (typeof value === "string") return value

  if (format === "currency") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
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
