"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  CircleAlert,
  FileClock,
  Search,
  ShieldCheck,
  ShieldX,
} from "lucide-react"

import { localizePath } from "@/i18n/routing"
import type {
  HrisMovementDomain,
  HrisMovementHistory,
  HrisMovementProofState,
  HrisMovementRisk,
} from "@/services/hris/movement-history.service"

const DOMAIN_LABELS: Record<HrisMovementDomain, string> = {
  EMPLOYEE: "Employee",
  LIFECYCLE: "Lifecycle",
  CONTRACT: "Contract",
  DOCUMENT: "Document",
  COMPENSATION: "Compensation",
  PAYMENT_DESTINATION: "Payment destination",
  ATTENDANCE: "Attendance",
  PAYROLL: "Payroll",
  PAYSLIP: "Payslip",
}

const PROOF_LABELS: Record<HrisMovementProofState, string> = {
  AUDIT_AND_EVENT: "Event + audit",
  EVENT_ONLY: "Event proof",
  SOURCE_RECORD_ONLY: "Source record",
  FAILED_EVENT: "Failed event",
  UNPROVEN: "Unproven",
}

const RISK_LABELS: Record<HrisMovementRisk, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
}

function proofClass(state: HrisMovementProofState) {
  if (state === "AUDIT_AND_EVENT") return "text-emerald-200"
  if (state === "EVENT_ONLY") return "text-cyan-200"
  if (state === "SOURCE_RECORD_ONLY") return "text-amber-200"
  return "text-rose-200"
}

function riskClass(risk: HrisMovementRisk) {
  if (risk === "LOW") return "text-slate-300"
  if (risk === "MEDIUM") return "text-cyan-200"
  if (risk === "HIGH") return "text-amber-200"
  return "text-rose-200"
}

function ProofIcon({ state }: { state: HrisMovementProofState }) {
  if (state === "AUDIT_AND_EVENT") return <ShieldCheck className="h-4 w-4" aria-hidden="true" />
  if (state === "EVENT_ONLY") return <FileClock className="h-4 w-4" aria-hidden="true" />
  if (state === "SOURCE_RECORD_ONLY") return <CircleAlert className="h-4 w-4" aria-hidden="true" />
  return <ShieldX className="h-4 w-4" aria-hidden="true" />
}

function formatDate(value: string, locale: "en" | "fr") {
  return new Date(value).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function HrisMovementHistoryView({
  history,
  locale,
}: {
  history: HrisMovementHistory
  locale: "en" | "fr"
}) {
  const [domain, setDomain] = useState<"ALL" | HrisMovementDomain>("ALL")
  const [proof, setProof] = useState<"ALL" | HrisMovementProofState>("ALL")
  const [risk, setRisk] = useState<"ALL" | HrisMovementRisk>("ALL")
  const [query, setQuery] = useState("")

  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return history.items.filter((item) => {
      if (domain !== "ALL" && item.domain !== domain) return false
      if (proof !== "ALL" && item.proof.state !== proof) return false
      if (risk !== "ALL" && item.risk !== risk) return false
      if (!normalizedQuery) return true
      return [
        item.employee.displayName,
        item.employee.employeeNumber,
        item.employee.department ?? "",
        item.title,
        item.source.label,
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [domain, history.items, proof, query, risk])

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section aria-label="Movement summary" className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">Movements</p>
          <p className="mt-1 text-2xl font-semibold text-white">{history.summary.matched}</p>
        </div>
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">Event + audit</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-200">{history.summary.auditAndEvent}</p>
        </div>
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">Event proof</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-200">{history.summary.eventOnly}</p>
        </div>
        <div className="bg-slate-950/90 p-4">
          <p className="text-xs uppercase tracking-normal text-slate-400">Exceptions</p>
          <p className={history.summary.exceptions === 0 ? "mt-1 text-2xl font-semibold text-white" : "mt-1 text-2xl font-semibold text-rose-200"}>
            {history.summary.exceptions}
          </p>
        </div>
      </section>

      {history.accessScope.employeeScopeTruncated ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-amber-400/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>Employee scope reached the 500-record safety limit. Narrow the employee, department, or location filter before relying on completeness.</p>
        </div>
      ) : null}

      <section aria-labelledby="movement-history-heading" className="min-w-0">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="movement-history-heading" className="text-base font-semibold text-white">Movement history</h2>
            <p className="mt-1 text-sm text-slate-400">{items.length} visible movement{items.length === 1 ? "" : "s"}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(190px,1fr)_150px_160px_130px]">
            <label className="relative min-w-0">
              <span className="sr-only">Search movements</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search movements"
                className="h-9 w-full rounded-md border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/40"
              />
            </label>
            <label>
              <span className="sr-only">Movement domain</span>
              <select
                value={domain}
                onChange={(event) => setDomain(event.target.value as "ALL" | HrisMovementDomain)}
                className="h-9 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-emerald-400/40"
              >
                <option value="ALL">All domains</option>
                {Object.entries(DOMAIN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Proof state</span>
              <select
                value={proof}
                onChange={(event) => setProof(event.target.value as "ALL" | HrisMovementProofState)}
                className="h-9 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-emerald-400/40"
              >
                <option value="ALL">All proof states</option>
                {Object.entries(PROOF_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Risk level</span>
              <select
                value={risk}
                onChange={(event) => setRisk(event.target.value as "ALL" | HrisMovementRisk)}
                className="h-9 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-emerald-400/40"
              >
                <option value="ALL">All risk</option>
                {Object.entries(RISK_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/60 px-5 py-10 text-center">
            <FileClock className="mx-auto h-7 w-7 text-slate-500" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-white">No matching movements</p>
            <p className="mt-1 text-sm text-slate-400">Change the active filters to inspect another evidence set.</p>
          </div>
        ) : (
          <div className="min-w-0 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-normal text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Recorded</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Movement</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Proof</th>
                  <th className="w-12 px-3 py-3"><span className="sr-only">Open employee</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/70 text-slate-200">
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-white">{formatDate(item.recordedAt, locale)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Effective {formatDate(item.effectiveAt, locale)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{item.employee.displayName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.employee.employeeNumber}</p>
                    </td>
                    <td className="max-w-[300px] px-4 py-3">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{item.summary}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{item.source.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.outcome}</p>
                    </td>
                    <td className="px-4 py-3">{item.actor.label}</td>
                    <td className={`px-4 py-3 font-medium ${riskClass(item.risk)}`}>{RISK_LABELS[item.risk]}</td>
                    <td className={`px-4 py-3 ${proofClass(item.proof.state)}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <ProofIcon state={item.proof.state} />
                        {item.proof.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={localizePath(item.detailHref, locale)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white"
                        title={`Open ${item.employee.displayName} profile`}
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Open {item.employee.displayName} profile</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
