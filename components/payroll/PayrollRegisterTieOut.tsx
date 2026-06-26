import Link from "next/link"
import {
  AlertTriangle,
  Banknote,
  BookOpenCheck,
  FileCheck2,
  FileText,
  Landmark,
  ShieldCheck,
} from "lucide-react"

import type { PayrollRegisterReadModel } from "@/actions/payroll/payroll-register.actions"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"

type Props = {
  data: PayrollRegisterReadModel | null
  error?: string | null
  locale: Locale
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Pending"
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
}

function money(amount: string, currency: string) {
  return amount.includes("[REDACTED") ? amount : `${amount} ${currency}`
}

function statusTone(value: string) {
  const normalized = value.toUpperCase()
  if (["MATCHED", "POSTED", "PAID", "ARCHIVED", "READY", "RELEASED", "SETTLED", "ACCEPTED", "RECONCILED"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["PENDING", "PREPARED", "PAYMENT_DUE", "PARTIALLY_SETTLED", "MISSING"].includes(normalized)) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100"
  }
  return "border-rose-400/30 bg-rose-400/10 text-rose-100"
}

function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(value)}`}>
      <span className="truncate">{value}</span>
    </span>
  )
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof FileText }) {
  return (
    <div className="min-h-[94px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">{label}</p>
          <p className="mt-2 break-words text-xl font-bold text-white">{value}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/12 text-cyan-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </section>
  )
}

function InlineEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-5 text-slate-200">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </div>
  )
}

function TieOutLine({ label, status, detail }: { label: string; status: string; detail: string }) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 break-words text-xs text-slate-400">{detail}</p>
      </div>
      <Badge value={status} />
    </div>
  )
}

function HashLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)]">
      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">{label}</dt>
      <dd className="min-w-0 break-all text-sm text-slate-100">{value ?? "Pending"}</dd>
    </div>
  )
}

export default function PayrollRegisterTieOut({ data, error, locale }: Props) {
  if (error) {
    return (
      <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold">Payroll register unavailable</h1>
            <p className="mt-1 break-words text-sm text-rose-100">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!data) {
    return <EmptyState title="Payroll register" body="No payroll register data is available." />
  }

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">Payroll register</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{data.payrollRun.runNumber}</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            {data.period.name} / Pay date {dateLabel(data.period.payDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={data.payrollRun.status} />
          <Badge value={data.redaction.payrollAmounts.mode} />
          <Link
            href={localizePath("/dashboard/payroll", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Payroll
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Employees" value={data.summary.lineCount} icon={BookOpenCheck} />
        <Metric label="Net payable" value={money(data.summary.netPayableAmount, data.summary.currency)} icon={Banknote} />
        <Metric label="Paid" value={money(data.summary.paidAmount, data.summary.currency)} icon={Landmark} />
        <Metric label="Blockers" value={data.blockers.length} icon={AlertTriangle} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Tie-out</h2>
          </div>
          <div className="divide-y divide-white/10">
            <TieOutLine
              label="Run lines"
              status={data.tieOut.runLines.status}
              detail={`${money(data.tieOut.runLines.actualAmount, data.tieOut.runLines.currency)} against payroll run net`}
            />
            <TieOutLine
              label="Payslips"
              status={data.tieOut.payslips.status}
              detail={`${data.tieOut.payslips.actualCount}/${data.tieOut.payslips.expectedCount} payslips, ${money(data.tieOut.payslips.actualAmount, data.tieOut.payslips.currency)}`}
            />
            <TieOutLine
              label="Payments"
              status={data.tieOut.payments.status}
              detail={`${money(data.tieOut.payments.actualAmount, data.tieOut.payments.currency)} allocated to payslips`}
            />
            <TieOutLine
              label="Declarations"
              status={data.tieOut.declarations.status}
              detail={`${money(data.tieOut.declarations.actualAmount, data.tieOut.declarations.currency)} statutory/declaration payload total`}
            />
            <TieOutLine
              label="Ledger source links"
              status={data.tieOut.ledger.status}
              detail={`${data.tieOut.ledger.sourceLinkCount} accounting source links`}
            />
            <TieOutLine
              label="Close evidence"
              status={data.tieOut.close.status}
              detail={`${data.tieOut.close.evidenceCount} evidence items, ${data.tieOut.close.findingCount} findings`}
            />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Proof</h2>
          </div>
          <dl className="divide-y divide-white/10">
            <HashLine label="Register hash" value={data.summary.registerHash} />
            <HashLine label="Run document" value={data.payrollRun.documentHash} />
            <HashLine label="Run evidence" value={data.payrollRun.evidenceHash} />
            <HashLine label="Calculation" value={data.payrollRun.calculationHash} />
            <HashLine label="Ledger batch" value={data.payrollRun.ledgerPostingBatchId} />
            <HashLine label="Close run" value={data.tieOut.close.closeRunId} />
          </dl>
        </div>
      </section>

      {data.blockers.length ? (
        <section className="rounded-lg border border-amber-400/25 bg-amber-950/20">
          <div className="border-b border-amber-400/20 px-4 py-3">
            <h2 className="text-sm font-semibold text-amber-50">Blockers</h2>
          </div>
          <div className="divide-y divide-amber-400/15">
            {data.blockers.map((blocker, index) => (
              <div key={`${blocker.code}-${blocker.sourceId ?? index}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-amber-50">{blocker.message}</p>
                  <p className="mt-1 break-all text-xs text-amber-100/70">{blocker.code} / {blocker.source}</p>
                </div>
                <Badge value={blocker.severity} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Register rows</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[220px] px-4 py-3 font-semibold">Employee</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Payslip</th>
                <th className="w-[150px] px-4 py-3 font-semibold">Net</th>
                <th className="w-[150px] px-4 py-3 font-semibold">Paid</th>
                <th className="w-[140px] px-4 py-3 font-semibold">Payslip</th>
                <th className="w-[140px] px-4 py-3 font-semibold">Payment</th>
                <th className="w-[140px] px-4 py-3 font-semibold">Ledger</th>
                <th className="w-[220px] px-4 py-3 font-semibold">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.rows.map((row) => (
                <tr key={row.runLineId} className="align-top">
                  <td className="px-4 py-3">
                    <p className="break-words font-semibold text-white">{row.displayName}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">{row.employeeNumber} / {row.costCenter ?? "No cost center"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="break-words text-slate-100">{row.payslipNumber ?? "Missing"}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.payslipStatus}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{money(row.amounts.netPayableAmount, row.amounts.currency)}</td>
                  <td className="px-4 py-3 font-semibold text-white">{money(row.amounts.paidAmount, row.amounts.currency)}</td>
                  <td className="px-4 py-3"><Badge value={row.tieOut.payslip} /></td>
                  <td className="px-4 py-3"><Badge value={row.tieOut.payment} /></td>
                  <td className="px-4 py-3"><Badge value={row.tieOut.ledger} /></td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 flex-col gap-1 text-xs text-slate-400">
                      <span className="break-all">{row.proof.payslipDocumentHash ?? row.proof.runLineDocumentHash ?? "Pending"}</span>
                      <span className="inline-flex items-center gap-1 text-cyan-200">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        {row.proof.sourceLinks.length} links
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Payment batches</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.paymentBatches.length ? data.paymentBatches.map((batch) => (
              <div key={batch.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-white">{batch.batchNumber}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{batch.evidenceHash ?? batch.bankFileHash ?? "No evidence hash"}</p>
                </div>
                <Badge value={batch.status} />
              </div>
            )) : <InlineEmpty title="Payment batches" body="No payroll payment batches are linked to this register." />}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Declarations</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.declarations.length ? data.declarations.map((declaration) => (
              <div key={declaration.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-white">{declaration.authority} / {declaration.declarationType}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{declaration.payloadHash ?? "No payload hash"}</p>
                </div>
                <Badge value={declaration.status} />
              </div>
            )) : <InlineEmpty title="Declarations" body="No payroll declarations are linked to this register." />}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <FileCheck2 className="h-4 w-4 text-cyan-200" aria-hidden="true" />
        <span className="break-words">Generated from {data.sourceScope.sourceTables.join(", ")}</span>
      </section>
    </main>
  )
}
