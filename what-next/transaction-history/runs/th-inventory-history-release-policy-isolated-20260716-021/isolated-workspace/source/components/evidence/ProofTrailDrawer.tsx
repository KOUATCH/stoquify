"use client"

import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, CircleDot, EyeOff, GitBranch, RefreshCw, ShieldCheck } from "lucide-react"

import { EvidenceGradeBadge } from "@/components/evidence/EvidenceGradeBadge"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"

type ProofTrailDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  proofTrail: ProofTrailResult | null
  isLoading?: boolean
  error?: string | null
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4 text-sm text-[var(--dash-text-soft)]">
      Proof trail unavailable. Select a supported record to inspect its evidence chain.
    </div>
  )
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4 text-sm text-[var(--dash-text-soft)]">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin text-[var(--dash-info)]" aria-hidden="true" />
        <span>Loading proof trail.</span>
      </div>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4 text-sm text-[var(--dash-text)]">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--dash-danger)]" aria-hidden="true" />
        <p>{error}</p>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="text-sm font-semibold text-[var(--dash-text)]">{title}</h3>
      {children}
    </section>
  )
}

export function ProofTrailDrawer({ open, onOpenChange, proofTrail, isLoading = false, error = null }: ProofTrailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto bg-[var(--dash-bg)] text-[var(--dash-text)] sm:max-w-2xl">
        <SheetHeader className="pr-8">
          <SheetTitle className="text-[var(--dash-text)]">Proof Trail</SheetTitle>
          <SheetDescription className="text-[var(--dash-text-soft)]">
            Evidence chain, blockers, redactions, and next actions for the selected record.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} />
          ) : !proofTrail ? (
            <EmptyState />
          ) : (
            <>
              <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceGradeBadge grade={proofTrail.evidenceGrade} reason={proofTrail.reason} />
                  <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                    {proofTrail.freshness}
                  </Badge>
                  <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                    {proofTrail.sourceModules.join(", ")}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-[var(--dash-text-soft)]">{proofTrail.reason}</p>
              </div>

              <Section title="Evidence Nodes">
                <div className="space-y-2">
                  {proofTrail.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-3"
                    >
                      {node.redacted ? (
                        <EyeOff className="mt-0.5 h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
                      ) : node.evidenceGrade === "blocked" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--dash-danger)]" aria-hidden="true" />
                      ) : (
                        <CircleDot className="mt-0.5 h-4 w-4 text-[var(--dash-info)]" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[var(--dash-text)]">{node.label}</span>
                          <EvidenceGradeBadge grade={node.evidenceGrade} />
                        </div>
                        <p className="mt-1 text-xs text-[var(--dash-text-soft)]">
                          {node.nodeType} from {node.sourceTable ?? "unknown source"}.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Evidence Edges">
                <div className="space-y-2">
                  {proofTrail.edges.map((edge, index) => (
                    <div
                      key={`${edge.fromNodeId}-${edge.toNodeId}-${index}`}
                      className="flex gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-3"
                    >
                      <GitBranch className="mt-0.5 h-4 w-4 text-[var(--dash-brand)]" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-[var(--dash-text)]">{edge.label}</p>
                        <p className="text-xs text-[var(--dash-text-soft)]">
                          {edge.fromNodeId} to {edge.toNodeId}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {proofTrail.blockers.length ? (
                <Section title="Blockers">
                  <div className="space-y-2">
                    {proofTrail.blockers.map((blocker) => (
                      <div
                        key={blocker.id}
                        className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-3"
                      >
                        <div className="flex gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--dash-danger)]" aria-hidden="true" />
                          <div>
                            <p className="text-sm font-semibold text-[var(--dash-text)]">{blocker.title}</p>
                            <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{blocker.detail}</p>
                            {blocker.nextAction ? (
                              <p className="mt-2 text-xs font-medium text-[var(--dash-text)]">{blocker.nextAction}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : (
                <div className="flex gap-2 rounded-lg border border-[var(--dash-success)] bg-[var(--dash-success-soft)] p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--dash-success)]" aria-hidden="true" />
                  <p className="text-sm text-[var(--dash-text)]">No proof blockers were returned for this record.</p>
                </div>
              )}

              {proofTrail.redactions.length ? (
                <Section title="Redactions">
                  <div className="space-y-2">
                    {proofTrail.redactions.map((redaction) => (
                      <div
                        key={redaction.id}
                        className="flex gap-2 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-3"
                      >
                        <EyeOff className="mt-0.5 h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold text-[var(--dash-text)]">{redaction.field}</p>
                          <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{redaction.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              {proofTrail.audit.sensitiveAccess ? (
                <div className="flex gap-2 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-[var(--dash-spruce)]" aria-hidden="true" />
                  <p className="text-sm text-[var(--dash-text-soft)]">
                    Sensitive proof access {proofTrail.audit.accessLogged ? "was audited" : "requires audit logging"}.
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
