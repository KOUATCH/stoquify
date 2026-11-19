"use client"

import { useMemo, useState } from "react"
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

import { HrisControlledReview } from "./HrisControlledReview"
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

const DECISION_ERRORS = {
  en: {
    authentication: "Sign in again before completing this decision.",
    forbidden: "You no longer have permission to complete this decision. Contact your administrator.",
    conflict: "The request has changed. Refresh the approval queue and review it again before deciding.",
    fallback: "Decision could not be completed. Refresh and verify that the request is still pending.",
  },
  fr: {
    authentication: "Reconnectez-vous avant de terminer cette décision.",
    forbidden: "Vous n'avez plus l'autorisation de terminer cette décision. Contactez votre administrateur.",
    conflict: "La demande a changé. Actualisez la liste des approbations et vérifiez-la avant de décider.",
    fallback: "La décision n'a pas pu être confirmée. Actualisez la liste et vérifiez que la demande est toujours en attente.",
  },
}

function decisionErrorMessage(locale: "en" | "fr", code?: string) {
  const messages = DECISION_ERRORS[locale]
  if (code === "AUTH_REQUIRED" || code === "FRESH_AUTH_REQUIRED") return messages.authentication
  if (code === "FORBIDDEN" || code === "TENANT_SCOPE_VIOLATION" || code === "SOD_VIOLATION") return messages.forbidden
  if (code === "CONFLICT" || code === "CONCURRENCY_CONFLICT" || code === "INVALID_TRANSITION" || code === "NOT_FOUND") return messages.conflict
  return messages.fallback
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
  const t=(en:string,fr:string)=>locale==="fr"?fr:en
  const domainLabel=(domain:HrisApprovalDomain)=>locale==="fr"?({LIFECYCLE:"Emploi",CONTRACT_ACTIVATION:"Contrat",CONTRACT_DOCUMENT:"Document",COMPENSATION_ASSIGNMENT:"Rémunération",SALARY_CHANGE:"Salaire",PAYMENT_DESTINATION:"Paiement"}[domain]):DOMAIN_LABELS[domain]
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL")
  const [domainFilter, setDomainFilter] = useState<"ALL" | HrisApprovalDomain>("ALL")
  const items = useMemo(() => inbox.items.filter((item) => {
    if (queueFilter !== "ALL" && item.stage !== queueFilter) return false
    return domainFilter === "ALL" || item.domain === domainFilter
  }), [domainFilter, inbox.items, queueFilter])
  const approvalTable = useHrPayrollTable({
    rows: items,
    searchText: (item) => JSON.stringify(item),
    dateValue: (item) => item.requestedAt,
    sortOptions: [
      { key: "request", label: t("Request","Demande"), value: (item) => item.title },
      { key: "employee", label: t("Employee","Employé"), value: (item) => item.employee.displayName },
      { key: "requested", label: t("Requested date","Date de demande"), value: (item) => item.requestedAt },
      { key: "stage", label: t("Stage","Étape"), value: (item) => item.stage },
      { key: "readiness", label: t("Readiness","Préparation"), value: (item) => item.readiness.blockerCode },
    ],
  })

  return (
    <>
      <section aria-label={t("Approval summary","Résumé des validations")} className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">{t("Pending","En attente")}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{inbox.summary.visiblePending}</p>
        </div>
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">{t("Review","Vérifier")}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{inbox.summary.review}</p>
        </div>
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">{t("Apply","Appliquer")}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{inbox.summary.apply}</p>
        </div>
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">{t("Actionable","Décisions disponibles")}</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-200">{inbox.summary.actionable}</p>
        </div>
      </section>

      <section aria-labelledby="approval-queue-heading" className="min-w-0">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="approval-queue-heading" className="text-base font-semibold tracking-normal text-white">{t("Approval queue","Liste des validations")}</h2>
            <p className="mt-1 text-sm text-slate-400">{inbox.accessScope.authority.label}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-9 overflow-hidden rounded-md border border-white/10" aria-label={t("Queue stage","Étape de validation")}>
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
                  {filter === "ALL" ? t("All","Tous") : filter === "REVIEW" ? t("Review","Vérifier") : t("Apply","Appliquer")}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="approval-domain-filter">{t("Approval domain","Domaine de validation")}</label>
            <select
              id="approval-domain-filter"
              value={domainFilter}
              onChange={(event) => setDomainFilter(event.target.value as "ALL" | HrisApprovalDomain)}
              className="h-9 rounded-md border border-white/10 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-emerald-400/50"
            >
              <option value="ALL">{t("All domains","Tous les domaines")}</option>
              {(Object.keys(DOMAIN_LABELS) as HrisApprovalDomain[]).map((domain) => (
                <option key={domain} value={domain}>{domainLabel(domain)}</option>
              ))}
            </select>
          </div>
        </div>
        <HrPayrollTableControls table={approvalTable} locale={locale} tableLabel={t("approval queue","liste des validations")} />

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/60 px-5 py-10 text-center">
            <Check className="mx-auto h-7 w-7 text-emerald-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-white">{t("No approvals in this view","Aucune validation dans cette vue")}</p>
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden rounded-lg border border-white/10">
            <div className="dashboard-data-table dashboard-table-shell overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-normal text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("Request","Demande")}</th>
                  <th className="px-4 py-3 font-medium">{t("Employee","Employé")}</th>
                  <th className="px-4 py-3 font-medium">{t("Stage","Étape")}</th>
                  <th className="px-4 py-3 font-medium">{t("Evidence","Preuve")}</th>
                  <th className="px-4 py-3 font-medium">{t("Readiness","Préparation")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("Actions","Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/70 text-slate-200">
                {approvalTable.rows.length ? approvalTable.rows.map((item) => (
                  <tr key={item.id} className="align-top transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{locale==="fr"?domainLabel(item.domain):item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{locale==="fr"?(item.effectiveAt?"Date d’effet : "+new Date(item.effectiveAt).toLocaleDateString(locale):"Décision attendue"):item.subject}</p>
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
                      <p className="mt-1 text-xs text-slate-500">{domainLabel(item.domain)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={item.stage === "REVIEW" ? "text-amber-200" : "text-cyan-200"}>
                        {item.stage === "REVIEW" ? t("Review","Vérifier") : t("Apply","Appliquer")}
                      </span>
                      {!item.decision.eligible ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-rose-200">
                          <ShieldX className="h-3.5 w-3.5" aria-hidden="true" />
                          {(locale==="fr"?"Un valideur indépendant et autorisé est requis":decisionReasonLabel(item.decision.reasonCode))}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={item.evidence.requestEvidencePresent ? "text-emerald-200" : "text-rose-200"}>
                        {item.evidence.requestEvidencePresent ? t("Request proof","Preuve de demande") : t("Proof missing","Preuve manquante")}
                      </span>
                      {item.stage === "APPLY" ? (
                        <p className={`mt-1 text-xs ${item.evidence.approvalEvidencePresent ? "text-emerald-300" : "text-rose-200"}`}>
                          {item.evidence.approvalEvidencePresent ? t("Approval proof","Preuve de validation") : t("Approval proof missing","Preuve de validation manquante")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-amber-200">
                        <CircleAlert className="h-4 w-4" aria-hidden="true" />
                        Blocked
                      </span>
                      <p className="mt-1 text-xs text-slate-500">{t("This source requires an independent decision.","Cette source nécessite une décision indépendante.")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {item.potentialActions.map((action) => {
                          const Icon = actionIcon(action)
                          return (
                            <HrisControlledReview key={action+item.id} locale={locale} target={{domain:item.domain,decision:action,employeeId:item.employee.id,sourceId:item.sourceId}} disabled={!item.decision.eligible} label={locale==="fr"?({APPROVE:"Approuver",REJECT:"Rejeter",APPLY:"Appliquer"}[action]):ACTION_LABELS[action]} onComplete={()=>router.refresh()}/>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t("No approvals match the table filters.","Aucune validation ne correspond aux filtres.")}</td></tr>
                )}
              </tbody>
            </table>
            </div>
            <HrPayrollTablePagination table={approvalTable} locale={locale} />
          </div>
        )}
      </section>



    </>
  )
}
