"use client"

import type { CSSProperties, ReactNode } from "react"
import { AlertTriangle, CircleDot, EyeOff, GitBranch, RefreshCw, ShieldCheck } from "lucide-react"

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
import { presentProofTrail, proofTypeLabel } from "./proof-trail-presentation"

type ProofTrailDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  proofTrail: ProofTrailResult | null
  isLoading?: boolean
  error?: string | null
  locale?: "en" | "fr"
}

// Portals do not inherit the dashboard ancestor. Use the same product-token
// aliases locally, without adding the dashboard page's positioning or backdrop.
const portalTokens = Object.fromEntries([
  "canvas", "border-subtle", "text", "text-soft", "info", "info-soft", "brand", "brand-soft",
  "gold", "gold-soft", "success", "success-soft", "danger", "danger-soft", "spruce", "spruce-soft",
].map(token => ["--dash-" + token, "var(--product-" + token + ")"])) as CSSProperties

const drawerCopy = {
  en: { title: "Proof Trail", description: "Evidence chain, blockers, redactions, and next actions for the selected record.", close: "Close proof",
    empty: "Proof trail unavailable. Select a supported record to inspect its evidence chain.", loading: "Loading proof trail.",
    nodes: "Evidence Nodes", edges: "Evidence Edges", blockers: "Blockers", redactions: "Redactions", from: "from", to: "to", unknown: "unknown source",
    noBlockers: "No proof blockers were returned for this record.", audited: "Sensitive proof access was audited.", auditRequired: "Sensitive proof access requires audit logging.",
    freshness: { fresh: "Fresh", stale: "Stale", partial: "Partial", blocked: "Blocked", unknown: "Unknown" } },
  fr: { title: "Piste de preuve", description: "Chaîne de preuve, blocages, masquages et prochaines actions pour le document sélectionné.", close: "Fermer la preuve",
    empty: "Piste de preuve indisponible. Sélectionnez un document pris en charge pour examiner sa chaîne de preuve.", loading: "Chargement de la piste de preuve.",
    nodes: "Éléments de preuve", edges: "Liens entre les preuves", blockers: "Blocages", redactions: "Masquages", from: "depuis", to: "vers", unknown: "source inconnue",
    noBlockers: "Aucun blocage de preuve n’a été renvoyé pour ce document.", audited: "L’accès aux preuves sensibles a été journalisé.", auditRequired: "L’accès aux preuves sensibles doit être journalisé.",
    freshness: { fresh: "À jour", stale: "Ancienne", partial: "Partielle", blocked: "Bloquée", unknown: "Inconnue" } },
} as const

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4 text-sm text-[var(--dash-text-soft)]">
      {text}
    </div>
  )
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4 text-sm text-[var(--dash-text-soft)]">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none text-[var(--dash-info)]" aria-hidden="true" />
        <span role="status">{text}</span>
      </div>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4 text-sm text-[var(--dash-text)]">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--dash-danger)]" aria-hidden="true" />
        <p role="alert">{error}</p>
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

export function ProofTrailDrawer({ open, onOpenChange, proofTrail: sourceProof, isLoading = false, error = null, locale = "en" }: ProofTrailDrawerProps) {
  const t = drawerCopy[locale]
  const proofTrail = sourceProof ? presentProofTrail(sourceProof, locale) : null
  const nodeLabels = new Map(proofTrail?.nodes.map(node => [node.id, node.label]))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent style={portalTokens} lang={locale} closeLabel={t.close} overlayClassName="motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none" className="w-full overflow-y-auto bg-[var(--product-canvas)] text-[var(--dash-text)] [overflow-wrap:anywhere] motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none motion-reduce:transition-none sm:max-w-2xl">
        <SheetHeader className="pr-8">
          <SheetTitle className="text-[var(--dash-text)]">{t.title}</SheetTitle>
          <SheetDescription className="text-[var(--dash-text-soft)]">
            {t.description}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <LoadingState text={t.loading} />
          ) : error ? (
            <ErrorState error={error} />
          ) : !proofTrail ? (
            <EmptyState text={t.empty} />
          ) : (
            <>
              <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceGradeBadge locale={locale} grade={proofTrail.evidenceGrade} reason={proofTrail.reason} />
                  <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                    {t.freshness[proofTrail.freshness]}
                  </Badge>
                  <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                    {proofTrail.sourceModules.map(module => proofTypeLabel(module, locale)).join(", ")}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-[var(--dash-text-soft)]">{proofTrail.reason}</p>
              </div>

              <Section title={t.nodes}>
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
                          <EvidenceGradeBadge locale={locale} grade={node.evidenceGrade} />
                        </div>
                        <p className="mt-1 text-xs text-[var(--dash-text-soft)]">
                          {proofTypeLabel(node.nodeType, locale)} {t.from} {node.sourceTable ?? t.unknown}.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title={t.edges}>
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
                          {nodeLabels.get(edge.fromNodeId) ?? edge.fromNodeId} {t.to} {nodeLabels.get(edge.toNodeId) ?? edge.toNodeId}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {proofTrail.blockers.length ? (
                <Section title={t.blockers}>
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
                <div className="flex gap-2 rounded-lg border border-[var(--dash-info)] bg-[var(--dash-info-soft)] p-3">
                  <CircleDot className="mt-0.5 h-4 w-4 text-[var(--dash-info)]" aria-hidden="true" />
                  <p className="text-sm text-[var(--dash-text)]">{t.noBlockers}</p>
                </div>
              )}

              {proofTrail.redactions.length ? (
                <Section title={t.redactions}>
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
                    {proofTrail.audit.accessLogged ? t.audited : t.auditRequired}
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
