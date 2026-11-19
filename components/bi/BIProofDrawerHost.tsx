"use client"

import { useRef, useState } from "react"
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
  triggerId?: string
  triggerLabel?: string
  loadingLabel?: string
  isLoading?: boolean
  error?: string | null
  className?: string
  locale?: "en" | "fr"
  onCloseAutoFocus?: (event: Event) => void
  keepTriggerFocusableWhileLoading?: boolean
}

export function BIProofDrawerHost({
  subject,
  proofTrail,
  open,
  onOpenChange,
  onOpenSubject,
  triggerId,
  triggerLabel,
  loadingLabel,
  isLoading = false,
  error = null,
  className,
  locale = "en",
  onCloseAutoFocus,
  keepTriggerFocusableWhileLoading = false,
}: BIProofDrawerHostProps) {
  const resolvedTriggerLabel = triggerLabel ?? (locale === "fr" ? "Voir les preuves" : "View proof")
  const resolvedLoadingLabel = loadingLabel ?? (locale === "fr" ? "Chargement des preuves" : "Loading proof")
  const trigger = useRef<HTMLButtonElement>(null)
  const [internalOpen, setInternalOpen] = useState(false)
  const resolvedOpen = open ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  if (!subject) {
    return (
      <Button
        id={triggerId}
        type="button"
        size="sm"
        variant="outline"
        disabled
        title={locale === "fr" ? "Aucune source de preuve n’a été fournie." : "No proof subject was supplied."}
        className={cn("rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]", className)}
      >
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        {resolvedTriggerLabel}
      </Button>
    )
  }

  if (!subject.available) {
    return (
      <Button
        id={triggerId}
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
        id={triggerId}
        type="button"
        size="sm"
        variant="outline"
        ref={trigger}
        disabled={isLoading && !keepTriggerFocusableWhileLoading}
        aria-disabled={isLoading || undefined}
        aria-busy={isLoading || undefined}
        onClick={() => {
          if (isLoading) return
          onOpenSubject?.(subject)
          setOpen(true)
        }}
        className={cn("rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]", className)}
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
        {isLoading ? resolvedLoadingLabel : subject.label || resolvedTriggerLabel}
      </Button>
      <ProofTrailDrawer onCloseAutoFocus={onCloseAutoFocus ?? (event => { event.preventDefault(); trigger.current?.focus() })} locale={locale} open={resolvedOpen} onOpenChange={setOpen} proofTrail={proofTrail} isLoading={isLoading} error={error} />
    </>
  )
}
