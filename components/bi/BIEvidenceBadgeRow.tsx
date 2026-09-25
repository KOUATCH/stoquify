import { Clock3, Database, GitBranch, ShieldCheck } from "lucide-react"

import { biLocale, biGradeCopy, biCopy } from "@/lib/dashboard/bi-presentation"
import { EvidenceGradeBadge } from "@/components/evidence/EvidenceGradeBadge"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BIFreshness, BIProvenance, BITrustState } from "@/services/bi/bi-contracts"

type BIEvidenceBadgeRowProps = {
  evidenceGrade: Parameters<typeof EvidenceGradeBadge>[0]["grade"]
  trustState: BITrustState
  freshness: BIFreshness
  provenance?: BIProvenance | null
  className?: string
  locale?: string
}

const trustClasses: Record<BITrustState, string> = {
  operational: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-text)]",
  posted: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-text)]",
  reconciled: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]",
  certified: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-text)]",
  blocked: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
}

export function BIEvidenceBadgeRow({
  evidenceGrade,
  trustState,
  freshness,
  provenance,
  className,
  locale = "en",
}: BIEvidenceBadgeRowProps) {
  const sourceCount = provenance?.sourceModules.length ?? 0
  const t = biCopy[biLocale(locale)]
  const sourceDate = freshness.sourceMaxUpdatedAt ? new Date(freshness.sourceMaxUpdatedAt) : null
  const validSourceDate = sourceDate && Number.isFinite(sourceDate.getTime()) ? sourceDate : null
  const freshnessState = freshness.stale && freshness.state === "fresh" ? "stale" : freshness.state

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <EvidenceGradeBadge grade={evidenceGrade} locale={locale} />
      <Badge variant="outline" className={cn("gap-1.5 rounded-md", trustClasses[trustState])}>
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {biGradeCopy[biLocale(locale)][trustState]}
      </Badge>
      <Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {t[freshnessState]}
      </Badge>
      {sourceCount > 0 ? (
        <Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
          <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
          {sourceCount} source{sourceCount === 1 ? "" : "s"}
        </Badge>
      ) : null}
      {provenance?.sourceHash ? (
        <Badge
          variant="outline"
          className="gap-1.5 rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]"
          title={provenance.sourceHash}
        >
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          {biCopy[biLocale(locale)].sourceHash}
        </Badge>
      ) : null}
      {freshness.stale ? (
        <div className="w-full min-w-0 rounded-md border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-2 text-xs leading-5 text-[var(--dash-text)] [overflow-wrap:anywhere]">
          <p className="font-semibold">{t.staleSource}</p>
          {validSourceDate ? (
            <p>{t.sourceUpdated}: <time dateTime={freshness.sourceMaxUpdatedAt!}>{new Intl.DateTimeFormat(biLocale(locale) === "fr" ? "fr-FR" : "en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(validSourceDate)} UTC</time></p>
          ) : <p>{t.sourceTimeMissing}</p>}
          {freshness.maxAgeMinutes !== null && Number.isFinite(freshness.maxAgeMinutes) && freshness.maxAgeMinutes > 0 ? <p>{t.freshnessLimit}: {freshness.maxAgeMinutes} {t.minutes}</p> : null}
          <p>{t.staleGuidance}</p>
        </div>
      ) : null}
    </div>
  )
}
