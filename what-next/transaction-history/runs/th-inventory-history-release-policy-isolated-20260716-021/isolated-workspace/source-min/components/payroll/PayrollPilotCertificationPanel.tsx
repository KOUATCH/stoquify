"use client"

import type { FormEvent } from "react"
import { useState, useTransition } from "react"
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react"

import {
  certifyPayrollPilotCycleAction,
  type PayrollPilotCycleCertificationCertificate,
} from "@/actions/payroll/payroll-pilot-certification.actions"
import type { PayrollCommandReadModel } from "@/actions/payroll/payroll-command-read-model.actions"

type Props = {
  data: PayrollCommandReadModel
}

type Notice =
  | { kind: "success"; certificate: PayrollPilotCycleCertificationCertificate }
  | { kind: "error"; code: string; message: string }

type SignoffRole = "payrollAdmin" | "accountingController" | "securityPrivacy" | "operationsOwner"

const SIGNOFFS: Array<{ role: SignoffRole; label: string }> = [
  { role: "payrollAdmin", label: "Payroll admin" },
  { role: "accountingController", label: "Accounting controller" },
  { role: "securityPrivacy", label: "Security/privacy" },
  { role: "operationsOwner", label: "Operations owner" },
]

function inputClass() {
  return "mt-1 min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-teal-300/0 transition focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/20"
}

function badge(value: string | null | undefined) {
  return value ?? "Missing"
}

function emptySignoffs() {
  return Object.fromEntries(
    SIGNOFFS.map(({ role }) => [
      role,
      { approvedById: "", approvedAt: "", evidenceHash: "" },
    ]),
  ) as Record<SignoffRole, { approvedById: string; approvedAt: string; evidenceHash: string }>
}

export default function PayrollPilotCertificationPanel({ data }: Props) {
  const certificationInput = data.evidence.pilotCertificationInput
  const [signoffs, setSignoffs] = useState(() => emptySignoffs())
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateSignoff(
    role: SignoffRole,
    field: "approvedById" | "approvedAt" | "evidenceHash",
    value: string,
  ) {
    setSignoffs((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [field]: value,
      },
    }))
  }

  function submit(persistCertificate: boolean) {
    setNotice(null)
    startTransition(() => {
      void certifyPayrollPilotCycleAction({
        payrollRunId: certificationInput.payrollRunId,
        expectedSourceRegisterHash: certificationInput.expectedSourceRegisterHash,
        expectedAdapterChaosReleaseGateHash:
          certificationInput.expectedAdapterChaosReleaseGateHash,
        expectedProofBackfillCertificateHash:
          certificationInput.expectedProofBackfillCertificateHash,
        persistCertificate,
        signoffBundle: signoffs,
      }).then((result) => {
        if (result.success) {
          setNotice({ kind: "success", certificate: result.data })
          return
        }
        setNotice({ kind: "error", code: result.code, message: result.error })
      })
    })
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(false)
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-200" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Pilot certification gate</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {certificationInput.runNumber ?? "No current payroll run"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-200">
            {badge(data.evidence.pilotCertification.status)}
          </span>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-200">
            {certificationInput.inputComplete ? "INPUT_READY" : "INPUT_BLOCKED"}
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Register hash</p>
            <p className="mt-2 break-all text-xs text-slate-200">
              {badge(certificationInput.expectedSourceRegisterHash)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Adapter chaos hash</p>
            <p className="mt-2 break-all text-xs text-slate-200">
              {badge(certificationInput.expectedAdapterChaosReleaseGateHash)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Backfill certificate</p>
            <p className="mt-2 break-all text-xs text-slate-200">
              {badge(certificationInput.expectedProofBackfillCertificateHash)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Backfill status</p>
            <p className="mt-2 break-all text-xs text-slate-200">
              {badge(certificationInput.proofBackfillStatus)}
            </p>
          </div>
        </div>

        {certificationInput.missingInputs.length ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-50">
            Missing pilot inputs: {certificationInput.missingInputs.join(", ")}
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-2">
          {SIGNOFFS.map(({ role, label }) => (
            <div key={role} className="rounded-lg border border-white/10 bg-black/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">{label}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <label className="text-xs text-slate-400">
                  Approver
                  <input
                    className={inputClass()}
                    value={signoffs[role].approvedById}
                    onChange={(event) => updateSignoff(role, "approvedById", event.target.value)}
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Approved at
                  <input
                    className={inputClass()}
                    value={signoffs[role].approvedAt}
                    onChange={(event) => updateSignoff(role, "approvedAt", event.target.value)}
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Evidence hash
                  <input
                    className={inputClass()}
                    value={signoffs[role].evidenceHash}
                    onChange={(event) => updateSignoff(role, "evidenceHash", event.target.value)}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/10 p-3 md:flex-row md:items-center md:justify-end">
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending || !certificationInput.payrollRunId}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              Evaluate pilot
            </button>
            <button
              type="button"
              disabled={isPending || !certificationInput.inputComplete}
              onClick={() => submit(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-400/30 bg-teal-400/10 px-3 py-2 text-sm font-semibold text-teal-50 transition hover:bg-teal-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              Persist certificate
            </button>
          </div>
        </div>

        {notice ? (
          <div
            role="status"
            className={`rounded-lg border p-3 text-sm ${notice.kind === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-50" : "border-rose-400/30 bg-rose-400/10 text-rose-50"}`}
          >
            <div className="flex items-start gap-2">
              {notice.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">
                  {notice.kind === "success" ? notice.certificate.status : notice.code}
                </p>
                <p className="mt-1 break-words text-xs">
                  {notice.kind === "success"
                    ? `${notice.certificate.certificateHash}; missing signoffs ${notice.certificate.signoff.missingRoles.length}`
                    : notice.message}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  )
}