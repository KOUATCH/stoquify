"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  CircleAlert,
  Clock3,
  ExternalLink,
  Loader2,
  Play,
  ShieldX,
  X,
} from "lucide-react"

import { decideHrisApprovalInboxItemAction } from "@/actions/hris/approval-inbox.actions"
import { localizePath } from "@/i18n/routing"
import {
  HrPayrollTableControls,
  HrPayrollTablePagination,
  useHrPayrollTable,
} from "@/components/hr-payroll/HrPayrollTableControls"
import type {
  HrisApprovalDecision,
  HrisApprovalDomain,
  HrisApprovalInbox,
  HrisApprovalInboxItem,
  HrisApprovalStage,
} from "@/services/hris/approval-inbox.service"

type QueueFilter = "ALL" | HrisApprovalStage

const DOMAIN_LABELS: Record<HrisApprovalDomain, string> = {
  LIFECYCLE: "Lifecycle",
  CONTRACT_ACTIVATION: "Contract",
  CONTRACT_DOCUMENT: "Document",
  COMPENSATION_ASSIGNMENT: "Compensation",
  SALARY_CHANGE: "Salary",
  PAYMENT_DESTINATION: "Payment",
}

const ACTION_LABELS: Record<HrisApprovalDecision, string> = {
  APPROVE: "Approve",
  REJECT: "Reject",
  APPLY: "Apply",
}

function actionIcon(action: HrisApprovalDecision) {
  if (action === "APPROVE") return Check
  if (action === "REJECT") return X
  return Play
}

function decisionReasonLabel(reasonCode: HrisApprovalInboxItem["decision"]["reasonCode"]) {
  if (reasonCode === "MISSING_MANAGE_PERMISSION") return "Manage permission required"
  if (reasonCode === "APPROVER_CANNOT_APPLY") return "A separate operator must apply"
  if (reasonCode === "REQUESTER_CANNOT_APPLY") return "Requester cannot apply"
  if (reasonCode === "REQUESTER_CANNOT_REVIEW") return "Requester cannot review"
  return "Available"
}

export function HrisApprovalInboxView({
  inbox,
  locale,
}: {
  inbox: HrisApprovalInbox
  locale: "en" | "fr"
}) {
  const router = useRouter()
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL")
  const [domainFilter, setDomainFilter] = useState<"ALL" | HrisApprovalDomain>("ALL")
  const [selected, setSelected] = useState<{
    item: HrisApprovalInboxItem
    action: HrisApprovalDecision
  } | null>(null)
  const [decisionReason, setDecisionReason] = useState("")
  const [approvalEvidenceHash, setApprovalEvidenceHash] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const items = useMemo(() => inbox.items.filter((item) => {
    if (queueFilter !== "ALL" && item.stage !== queueFilter) return false
    return domainFilter === "ALL" || item.domain === domainFilter
  }), [domainFilter, inbox.items, queueFilter])
  const approvalTable = useHrPayrollTable({
    rows: items,
    searchText: (item) => JSON.stringify(item),
    dateValue: (item) => item.requestedAt,
    sortOptions: [
      { key: "request", label: "Request", value: (item) => item.title },
      { key: "employee", label: "Employee", value: (item) => item.employee.displayName },
      { key: "requested", label: "Requested date", value: (item) => item.requestedAt },
      { key: "stage", label: "Stage", value: (item) => item.stage },
      { key: "readiness", label: "Readiness", value: (item) => item.readiness.blockerCode },
    ],
  })

  function openDecision(item: HrisApprovalInboxItem, action: HrisApprovalDecision) {
    setSelected({ item, action })
    setDecisionReason("")
    setApprovalEvidenceHash("")
    setError(null)
  }

  function closeDecision() {
    if (isPending) return
    setSelected(null)
    setError(null)
  }

  function submitDecision() {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      try {
        await decideHrisApprovalInboxItemAction({
          domain: selected.item.domain,
          decision: selected.action,
          employeeId: selected.item.employee.id,
          sourceId: selected.item.sourceId,
          decisionReason: selected.action === "APPLY" ? undefined : decisionReason,
          approvalEvidenceHash:
            selected.action === "APPROVE" ? approvalEvidenceHash : undefined,
          idempotencyKey: [
            "hris-approval-inbox",
            selected.action.toLowerCase(),
            selected.item.domain.toLowerCase(),
            selected.item.sourceId,
          ].join(":"),
        })
        setSelected(null)
        router.refresh()
      } catch {
        setError("Decision could not be completed. Refresh and verify that the request is still pending.")
      }
    })
  }

  const decisionReady = selected
    ? selected.action === "APPLY" ||
      (decisionReason.trim().length >= 3 &&
        (selected.action !== "APPROVE" || approvalEvidenceHash.trim().length >= 8))
    : false

  return (
    <>
      <section aria-label="Approval summary" className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-white">{inbox.summary.visiblePending}</p>
        </div>
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">Review</p>
          <p className="mt-1 text-2xl font-semibold text-white">{inbox.summary.review}</p>
        </div>
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">Apply</p>
          <p className="mt-1 text-2xl font-semibold text-white">{inbox.summary.apply}</p>
        </div>
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">Actionable</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-200">{inbox.summary.actionable}</p>
        </div>
      </section>

      <section aria-labelledby="approval-queue-heading" className="min-w-0">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="approval-queue-heading" className="text-base font-semibold tracking-normal text-white">Approval queue</h2>
            <p className="mt-1 text-sm text-slate-400">{inbox.accessScope.authority.label}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-9 overflow-hidden rounded-md border border-white/10" aria-label="Queue stage">
              {(["ALL", "REVIEW", "APPLY"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setQueueFilter(filter)}
                  className={`px-3 text-xs font-medium transition ${
                    queueFilter === filter
                      ? "bg-emerald-500/15 text-emerald-100"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  {filter === "ALL" ? "All" : filter === "REVIEW" ? "Review" : "Apply"}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="approval-domain-filter">Approval domain</label>
            <select
              id="approval-domain-filter"
              value={domainFilter}
              onChange={(event) => setDomainFilter(event.target.value as "ALL" | HrisApprovalDomain)}
              className="h-9 rounded-md border border-white/10 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-emerald-400/50"
            >
              <option value="ALL">All domains</option>
              {(Object.keys(DOMAIN_LABELS) as HrisApprovalDomain[]).map((domain) => (
                <option key={domain} value={domain}>{DOMAIN_LABELS[domain]}</option>
              ))}
            </select>
          </div>
        </div>
        <HrPayrollTableControls table={approvalTable} locale={locale} tableLabel="approval queue" />

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/60 px-5 py-10 text-center">
            <Check className="mx-auto h-7 w-7 text-emerald-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-white">No approvals in this view</p>
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden rounded-lg border border-white/10">
            <div className="dashboard-data-table dashboard-table-shell overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-normal text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Evidence</th>
                  <th className="px-4 py-3 font-medium">Readiness</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/70 text-slate-200">
                {approvalTable.rows.length ? approvalTable.rows.map((item) => (
                  <tr key={item.id} className="align-top transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{item.subject}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {new Date(item.requestedAt).toLocaleDateString(locale)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={localizePath(item.reviewHref, locale)}
                        className="inline-flex items-center gap-1 font-medium text-slate-100 hover:text-emerald-200"
                      >
                        {item.employee.displayName}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      <p className="mt-1 text-xs text-slate-500">{DOMAIN_LABELS[item.domain]}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={item.stage === "REVIEW" ? "text-amber-200" : "text-cyan-200"}>
                        {item.stage === "REVIEW" ? "Review" : "Apply"}
                      </span>
                      {!item.decision.eligible ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-rose-200">
                          <ShieldX className="h-3.5 w-3.5" aria-hidden="true" />
                          {decisionReasonLabel(item.decision.reasonCode)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={item.evidence.requestEvidencePresent ? "text-emerald-200" : "text-rose-200"}>
                        {item.evidence.requestEvidencePresent ? "Request proof" : "Proof missing"}
                      </span>
                      {item.stage === "APPLY" ? (
                        <p className={`mt-1 text-xs ${item.evidence.approvalEvidencePresent ? "text-emerald-300" : "text-rose-200"}`}>
                          {item.evidence.approvalEvidencePresent ? "Approval proof" : "Approval proof missing"}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-amber-200">
                        <CircleAlert className="h-4 w-4" aria-hidden="true" />
                        Blocked
                      </span>
                      <p className="mt-1 text-xs text-slate-500">{item.readiness.blockerCode.replaceAll("_", " ")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {item.potentialActions.map((action) => {
                          const Icon = actionIcon(action)
                          return (
                            <button
                              key={action}
                              type="button"
                              disabled={!item.decision.eligible}
                              onClick={() => openDecision(item, action)}
                              title={item.decision.eligible ? ACTION_LABELS[action] : decisionReasonLabel(item.decision.reasonCode)}
                              className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                action === "REJECT"
                                  ? "border-rose-400/20 text-rose-200 hover:bg-rose-500/10"
                                  : "border-emerald-400/20 text-emerald-200 hover:bg-emerald-500/10"
                              }`}
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                              {ACTION_LABELS[action]}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No approvals match the table filters.</td></tr>
                )}
              </tbody>
            </table>
            </div>
            <HrPayrollTablePagination table={approvalTable} locale={locale} />
          </div>
        )}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={closeDecision}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-decision-title"
            className="w-full max-w-lg rounded-lg border border-white/15 bg-slate-950 p-5 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="approval-decision-title" className="text-base font-semibold text-white">
                  {ACTION_LABELS[selected.action]} {selected.item.title.toLowerCase()}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{selected.item.employee.displayName}</p>
              </div>
              <button
                type="button"
                onClick={closeDecision}
                disabled={isPending}
                title="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {selected.action !== "APPLY" ? (
              <div className="mt-5">
                <label htmlFor="approval-decision-reason" className="text-xs font-medium text-slate-300">Decision reason</label>
                <textarea
                  id="approval-decision-reason"
                  value={decisionReason}
                  onChange={(event) => setDecisionReason(event.target.value)}
                  rows={3}
                  maxLength={800}
                  className="mt-2 w-full resize-none rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
                />
              </div>
            ) : null}

            {selected.action === "APPROVE" ? (
              <div className="mt-4">
                <label htmlFor="approval-evidence-hash" className="text-xs font-medium text-slate-300">Approval evidence hash</label>
                <input
                  id="approval-evidence-hash"
                  value={approvalEvidenceHash}
                  onChange={(event) => setApprovalEvidenceHash(event.target.value)}
                  maxLength={256}
                  autoComplete="off"
                  className="mt-2 h-10 w-full rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-emerald-400/50"
                />
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-4 rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDecision}
                disabled={isPending}
                className="h-9 rounded-md border border-white/10 px-3 text-sm text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDecision}
                disabled={!decisionReady || isPending}
                className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected.action === "REJECT" ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {ACTION_LABELS[selected.action]}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
