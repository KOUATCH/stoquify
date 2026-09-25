"use client"

import { useRef, useState } from "react"
import { Check, FileCheck2, Loader2, ShieldAlert, X } from "lucide-react"

import {
  createCopilotProposalAction,
  decideCopilotProposalAction,
} from "@/actions/ai/copilot-proposal.actions"
import { Button } from "@/components/ui/button"
import type { CommandDailyBrief } from "@/services/agents/command-agent-contracts"
import type { CopilotProposalDto } from "@/services/ai/copilot-proposal.service"
import type { CreateCopilotProposalInput } from "@/services/ai/copilot-proposal.schemas"

type CopilotProposalControlsProps = {
  runId: string
  priority: CommandDailyBrief["priorities"][number]
  evidence: CommandDailyBrief["evidence"]
  periodStart: string
  periodEnd: string
  asOf: string
  locale: "en" | "fr"
}

const copy = {
  en: {
    prepare: "Prepare proposal",
    preparing: "Preparing...",
    accept: "Accept proposal",
    reject: "Reject proposal",
    accepted: "Proposal accepted",
    rejected: "Proposal rejected",
    expired: "Proposal expired",
    cancelled: "Proposal cancelled",
    noAuthority:
      "Acceptance records human intent only. The copilot cannot execute the workflow.",
    failed: "The proposal could not be recorded safely.",
    evidenceChanged: "The proposal or its evidence is no longer current. Refresh the analysis and review its sources before preparing a new proposal. You can still reject an unexpired draft.",
  },
  fr: {
    prepare: "Preparer la proposition",
    preparing: "Preparation...",
    accept: "Accepter la proposition",
    reject: "Rejeter la proposition",
    accepted: "Proposition acceptee",
    rejected: "Proposition rejetee",
    expired: "Proposition expirée",
    cancelled: "Proposition annulée",
    noAuthority:
      "L'acceptation enregistre uniquement l'intention humaine. Le copilote ne peut pas executer le processus.",
    failed: "La proposition n'a pas pu etre enregistree de maniere sure.",
    evidenceChanged: "La proposition ou ses preuves ne sont plus à jour. Actualisez l’analyse et vérifiez ses sources avant de préparer une nouvelle proposition. Vous pouvez encore rejeter un brouillon non expiré.",
  },
} as const

export function CopilotProposalControls(props: CopilotProposalControlsProps) {
  return <ProposalControls key={`${props.runId}:${props.priority.id}`} {...props} />
}

function ProposalControls({
  runId,
  priority,
  evidence,
  periodStart,
  periodEnd,
  asOf,
  locale,
}: CopilotProposalControlsProps) {
  const t = copy[locale]
  const [proposal, setProposal] = useState<CopilotProposalDto | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<CreateCopilotProposalInput | null>(null)
  const inFlight = useRef(false)

  async function prepare() {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      const selectedEvidence = evidence.filter((item) =>
        priority.evidenceIds.includes(item.id),
      )
      request.current ??= {
        runId,
        proposalType: "NAVIGATE_TO_WORKFLOW",
        targetRoute: priority.href,
        requiredPermission: priority.requiredPermission,
        title: priority.title,
        detail: priority.detail,
        evidence: selectedEvidence.map((item) => ({
          id: item.id,
          subjectType: item.subjectType,
          subjectId: item.subjectId,
          sourceModule: item.sourceModule,
          sourceHash: item.sourceHash,
          evidenceGrade: item.evidenceGrade,
          freshness: item.freshness,
          available: item.available,
        })),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        asOf: new Date(asOf),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        idempotencyKey: `copilot-proposal:${runId}:${priority.id}`,
      }
      const response = await createCopilotProposalAction(request.current)
      if (!response.success) {
        setError(response.code === "BUSINESS_RULE_VIOLATION" || response.code === "NOT_FOUND" || response.code === "CONFLICT"
          ? t.evidenceChanged : response.error || t.failed)
        return
      }
      setProposal(response.data)
    } catch {
      setError(t.failed)
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  async function decide(decision: "ACCEPTED" | "REJECTED") {
    if (!proposal || inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      const response = await decideCopilotProposalAction({
        proposalId: proposal.id,
        decision,
        reason:
          decision === "ACCEPTED"
            ? "Accepted after human review."
            : "Rejected after human review.",
      })
      if (!response.success) {
        setError(response.code === "BUSINESS_RULE_VIOLATION" || response.code === "NOT_FOUND" || response.code === "CONFLICT"
          ? t.evidenceChanged : response.error || t.failed)
        return
      }
      setProposal(response.data)
    } catch {
      setError(t.failed)
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={prepare}
          aria-label={`${t.prepare}: ${priority.title}`}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileCheck2 className="h-4 w-4" aria-hidden="true" />
          )}
          {pending ? t.preparing : t.prepare}
        </Button>
        {error ? (
          <p className="max-w-72 text-right text-xs text-[var(--dash-danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="max-w-sm space-y-2 rounded-lg border border-[var(--dash-border-subtle)] p-2.5">
      <p className="flex items-start gap-1.5 text-xs text-[var(--dash-text-soft)]">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t.noAuthority}
      </p>
      {proposal.status === "DRAFT" ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => decide("REJECTED")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t.reject}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => decide("ACCEPTED")}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            {t.accept}
          </Button>
        </div>
      ) : (
        <p className="text-right text-xs font-medium text-[var(--dash-text)]" role="status">
          {{ ACCEPTED: t.accepted, REJECTED: t.rejected, EXPIRED: t.expired, CANCELLED: t.cancelled }[proposal.status]}
        </p>
      )}
      {error ? (
        <p className="text-right text-xs text-[var(--dash-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
