import { Clock3, Database, GitBranch, ShieldCheck } from "lucide-react"

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
}

const trustLabels: Record<BITrustState, string> = {
  operational: "Operational",
  posted: "Posted",
  reconciled: "Reconciled",
  certified: "Certified",
  blocked: "Blocked",
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
}: BIEvidenceBadgeRowProps) {
  const sourceCount = provenance?.sourceModules.length ?? 0

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <EvidenceGradeBadge grade={evidenceGrade} />
      <Badge variant="outline" className={cn("gap-1.5 rounded-md", trustClasses[trustState])}>
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {trustLabels[trustState]}
      </Badge>
      <Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {freshness.state}
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
          Source hash
        </Badge>
      ) : null}
    </div>
  )
}
