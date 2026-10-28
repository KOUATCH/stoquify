"use client"

import { useState } from "react"
import { Eye, LockKeyhole, RefreshCw, ShieldAlert } from "lucide-react"

import { ProofTrailDrawer } from "@/components/evidence/ProofTrailDrawer"
import { Button } from "@/components/ui/button"
import { dashboardToneClass } from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BIProofDrawerSubject } from "@/services/bi/bi-contracts"
import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"

type AvailableProofSubject = Extract<BIProofDrawerSubject, { available: true }>

type BIProofDrawerHostProps = {
  subject: BIProofDrawerSubject | null
  proofTrail: ProofTrailResult | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onOpenSubject?: (subject: AvailableProofSubject) => void
  triggerLabel?: string
  loadingLabel?: string
  isLoading?: boolean
  error?: string | null
  className?: string
}

export function BIProofDrawerHost({
  subject,
  proofTrail,
  open,
  onOpenChange,
  onOpenSubject,
  triggerLabel = "View proof",
  loadingLabel = "Loading proof",
  isLoading = false,
  error = null,
  className,
}: BIProofDrawerHostProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const resolvedOpen = open ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  if (!subject) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        title="No proof subject was supplied."
        className={cn("rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]", className)}
      >
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        {triggerLabel}
      </Button>
    )
  }

  if (!subject.available) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        title={subject.unavailableReason}
        className={cn("rounded-lg", dashboardToneClass("muted"), className)}
      >
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        {subject.label}
      </Button>
    )
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isLoading}
        aria-busy={isLoading || undefined}
        onClick={() => {
          onOpenSubject?.(subject)
          setOpen(true)
        }}
        className={cn("rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]", className)}
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
        {isLoading ? loadingLabel : subject.label || triggerLabel}
      </Button>
      <ProofTrailDrawer open={resolvedOpen} onOpenChange={setOpen} proofTrail={proofTrail} isLoading={isLoading} error={error} />
    </>
  )
}
