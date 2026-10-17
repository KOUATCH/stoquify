"use client"

import { payrollUiText, payrollStatusText } from "./payroll-ui-copy"

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
import {
  HrPayrollTableControls,
  HrPayrollTablePagination,
  useHrPayrollTable,
} from "@/components/hr-payroll/HrPayrollTableControls"

type Props = {
  data: PayrollRegisterReadModel | null
  error?: string | null
  locale: Locale
}

function dateLabel(value: string | null | undefined, locale: Locale = "en") {
  if (!value) return payrollUiText("Pending", locale)
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value))
}

function money(amount: string, currency: string) {
  return amount.includes("[REDACTED") ? amount : `${amount} ${currency}`
}

function statusTone(value: string) {
  const normalized = value.toUpperCase()
  if (["PAID", "RELEASED"].includes(normalized)) return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
  if (["MATCHED", "POSTED", "ARCHIVED", "READY", "SETTLED", "ACCEPTED", "RECONCILED"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["PENDING", "PREPARED", "PAYMENT_DUE", "PARTIALLY_SETTLED", "MISSING"].includes(normalized)) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100"
  }
  return "border-rose-400/30 bg-rose-400/10 text-rose-100"
}

function Badge({ value, label = value, locale = "en" }: { value: string; label?: string; locale?: Locale }) {
  return (
    <span className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(value)}`}>
      <span className="truncate">{label === value ? payrollStatusText(value, locale) : label}</span>
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

function TieOutLine({ label, status, detail, locale }: { label: string; status: string; detail: string; locale: Locale }) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 break-words text-xs text-slate-400">{detail}</p>
      </div>
      <Badge locale={locale} value={status} />
    </div>
  )
}

function HashLine({ locale = "en", label, value }: { label: string; value: string | null } & { locale?: Locale }) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)]">
      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">{label}</dt>
      <dd className="min-w-0 break-all text-sm text-slate-100">{value ?? payrollUiText("Pending", locale)}</dd>
    </div>
  )
}

function componentFamilyLabel(value: string, locale: Locale = "en") {
  switch (value) {
    case "TAXABLE_ALLOWANCE":
      return payrollUiText("Taxable allowance", locale)
    case "BENEFIT_IN_KIND":
      return payrollUiText("Benefit-in-kind", locale)
    case "PAID_LEAVE":
      return payrollUiText("Paid leave", locale)
    case "UNPAID_LEAVE":
      return payrollUiText("Unpaid leave", locale)
    case "OVERTIME":
      return payrollUiText("Overtime", locale)
    default:
      return value
  }
}

export default function PayrollRegisterTieOut({ data, error, locale }: Props) {
  const paymentCopy = locale === "fr" ? {
    allocated: "Montant affecté", tieOut: "Contrôle des affectations", released: "Paiement transmis",
    explanation: "Les montants affectés incluent les instructions de paiement en préparation, approuvées ou transmises, hors lots annulés ou en échec. Une affectation, un contrôle concordant ou la transmission du paiement ne prouve pas son règlement. Consultez les preuves de règlement dans le suivi des paiements.",
    review: "Consulter les preuves de règlement", detail: "affectés aux bulletins",
  } : {
    allocated: "Allocated amount", tieOut: "Allocation tie-out", released: "Payment released",
    explanation: "Allocated amounts include draft, approved and released payment instructions, excluding cancelled or failed batches. An allocation, a matched tie-out or payment release does not prove settlement. Review settlement evidence in the payments workspace.",
    review: "Review settlement evidence", detail: "allocated to payslips",
  }
  const registerTable = useHrPayrollTable({
    rows: data?.rows ?? [],
    searchText: (row) => JSON.stringify(row),
    dateValue: () => data?.period.payDate,
    sortOptions: [
      { key: "employee", label: payrollUiText("Employee", locale), value: (row) => row.displayName },
      { key: "payslip", label: payrollUiText("Payslip", locale), value: (row) => row.payslipNumber },
      { key: "net", label: payrollUiText("Net payable", locale), value: (row) => Number(row.amounts.netPayableAmount) },
      { key: "allocated", label: paymentCopy.allocated, value: (row) => Number(row.amounts.allocatedAmount) },
      { key: "status", label: paymentCopy.tieOut, value: (row) => row.tieOut.payment },
    ],
  })

  if (error) {
    return (
      <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold">{payrollUiText("Payroll register unavailable", locale)}</h1>
            <p className="mt-1 break-words text-sm text-rose-100">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!data) {
    return <EmptyState title={payrollUiText("Payroll register", locale)} body={payrollUiText("No payroll register data is available.", locale)} />
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">{payrollUiText("Register tie-out", locale)}</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{payrollUiText("Payroll register", locale)}</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            {data.payrollRun.runNumber} / {data.period.name}  {payrollUiText("/ Pay date", locale)} {dateLabel(data.period.payDate, locale)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge locale={locale} value={data.payrollRun.status} label={data.payrollRun.status === "PAID" ? paymentCopy.released : data.payrollRun.status} />
          <Badge locale={locale} value={data.redaction.payrollAmounts.mode} />
          <Link
            href={localizePath("/dashboard/payroll", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-brand)]"
          >
             {payrollUiText("Payroll", locale)} </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={payrollUiText("Employees", locale)} value={data.summary.lineCount} icon={BookOpenCheck} />
        <Metric label={payrollUiText("Net payable", locale)} value={money(data.summary.netPayableAmount, data.summary.currency)} icon={Banknote} />
        <Metric label={paymentCopy.allocated} value={money(data.summary.allocatedAmount, data.summary.currency)} icon={Landmark} />
        <Metric label={payrollUiText("Blockers", locale)} value={data.blockers.length} icon={AlertTriangle} />
      </section>

      <section className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">
        <p>{paymentCopy.explanation}</p>
        <Link href={localizePath("/dashboard/payroll/payments", locale)} className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--dash-brand)]">
          {paymentCopy.review}
        </Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">{payrollUiText("Tie-out", locale)}</h2>
          </div>
          <div className="divide-y divide-white/10">
            <TieOutLine locale={locale}
              label={payrollUiText("Run lines", locale)}
              status={data.tieOut.runLines.status}
              detail={`${money(data.tieOut.runLines.actualAmount, data.tieOut.runLines.currency)} ${locale === "fr" ? "comparés au net du cycle de paie" : "against payroll run net"}`}
            />
            <TieOutLine locale={locale}
              label={payrollUiText("Payslips", locale)}
              status={data.tieOut.payslips.status}
              detail={`${data.tieOut.payslips.actualCount}/${data.tieOut.payslips.expectedCount} ${locale === "fr" ? "bulletins" : "payslips"}, ${money(data.tieOut.payslips.actualAmount, data.tieOut.payslips.currency)}`}
            />
            <TieOutLine locale={locale}
              label={paymentCopy.tieOut}
              status={data.tieOut.payments.status}
              detail={`${money(data.tieOut.payments.actualAmount, data.tieOut.payments.currency)} ${paymentCopy.detail}`}
            />
            <TieOutLine locale={locale}
              label={payrollUiText("Declarations", locale)}
              status={data.tieOut.declarations.status}
              detail={`${money(data.tieOut.declarations.actualAmount, data.tieOut.declarations.currency)} ${locale === "fr" ? "au total des déclarations réglementaires" : "statutory/declaration payload total"}`}
            />
            <TieOutLine locale={locale}
              label={payrollUiText("Ledger source links", locale)}
              status={data.tieOut.ledger.status}
              detail={`${data.tieOut.ledger.sourceLinkCount} ${locale === "fr" ? "liens vers les sources comptables" : "accounting source links"}`}
            />
            <TieOutLine locale={locale}
              label={payrollUiText("Close evidence", locale)}
              status={data.tieOut.close.status}
              detail={`${data.tieOut.close.evidenceCount} ${locale === "fr" ? "preuves" : "evidence items"}, ${data.tieOut.close.findingCount} ${locale === "fr" ? "constats" : "findings"}`}
            />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">{payrollUiText("Proof", locale)}</h2>
          </div>
          <dl className="divide-y divide-white/10">
            <HashLine locale={locale} label={payrollUiText("Register hash", locale)} value={data.summary.registerHash} />
            <HashLine locale={locale} label={payrollUiText("Run document", locale)} value={data.payrollRun.documentHash} />
            <HashLine locale={locale} label={payrollUiText("Run evidence", locale)} value={data.payrollRun.evidenceHash} />
            <HashLine locale={locale} label={payrollUiText("Calculation", locale)} value={data.payrollRun.calculationHash} />
            <HashLine locale={locale} label={payrollUiText("Ledger batch", locale)} value={data.payrollRun.ledgerPostingBatchId} />
            <HashLine locale={locale} label={payrollUiText("Close run", locale)} value={data.tieOut.close.closeRunId} />
          </dl>
        </div>
      </section>

      {data.blockers.length ? (
        <section className="rounded-lg border border-amber-400/25 bg-amber-950/20">
          <div className="border-b border-amber-400/20 px-4 py-3">
            <h2 className="text-sm font-semibold text-amber-50">{payrollUiText("Blockers", locale)}</h2>
          </div>
          <div className="divide-y divide-amber-400/15">
            {data.blockers.map((blocker, index) => (
              <div key={`${blocker.code}-${blocker.sourceId ?? index}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-amber-50">{blocker.message}</p>
                  <p className="mt-1 break-all text-xs text-amber-100/70">{blocker.code} / {blocker.source}</p>
                </div>
                <Badge locale={locale} value={blocker.severity} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{payrollUiText("Register rows", locale)}</h2>
        </div>
        <HrPayrollTableControls table={registerTable} locale={locale} tableLabel={payrollUiText("payroll register rows", locale)} />
        <div className="dashboard-data-table dashboard-table-shell overflow-x-auto">
          <table className="min-w-[1240px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[220px] px-4 py-3 font-semibold">{payrollUiText("Employee", locale)}</th>
                <th className="w-[170px] px-4 py-3 font-semibold">{payrollUiText("Payslip", locale)}</th>
                <th className="w-[150px] px-4 py-3 font-semibold">{payrollUiText("Net", locale)}</th>
                <th className="w-[150px] px-4 py-3 font-semibold">{paymentCopy.allocated}</th>
                <th className="w-[140px] px-4 py-3 font-semibold">{payrollUiText("Payslip", locale)}</th>
                <th className="w-[140px] px-4 py-3 font-semibold">{paymentCopy.tieOut}</th>
                <th className="w-[140px] px-4 py-3 font-semibold">{payrollUiText("Ledger", locale)}</th>
                <th className="w-[360px] px-4 py-3 font-semibold">{payrollUiText("Proof", locale)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {registerTable.rows.length ? registerTable.rows.map((row) => (
                <tr key={row.runLineId} className="align-top">
                  <td className="px-4 py-3">
                    <p className="break-words font-semibold text-white">{row.displayName}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">{row.employeeNumber} / {row.costCenter ?? payrollUiText("No cost center", locale)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="break-words text-slate-100">{row.payslipNumber ?? payrollUiText("Missing", locale)}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.payslipStatus ? payrollStatusText(row.payslipStatus, locale) : row.payslipStatus}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{money(row.amounts.netPayableAmount, row.amounts.currency)}</td>
                  <td className="px-4 py-3 font-semibold text-white">{money(row.amounts.allocatedAmount, row.amounts.currency)}</td>
                  <td className="px-4 py-3"><Badge locale={locale} value={row.tieOut.payslip} /></td>
                  <td className="px-4 py-3"><Badge locale={locale} value={row.tieOut.payment} /></td>
                  <td className="px-4 py-3"><Badge locale={locale} value={row.tieOut.ledger} /></td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 flex-col gap-1 text-xs text-slate-400">
                      <span className="break-all">{row.proof.payslipDocumentHash ?? row.proof.runLineDocumentHash ?? payrollUiText("Pending", locale)}</span>
                      <span className="inline-flex items-center gap-1 text-cyan-200">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        {row.proof.sourceLinks.length}  {payrollUiText("links", locale)} </span>
                      <div className="mt-2 grid gap-1">
                        {row.componentProof.effectiveComponents
                          .filter((component) => component.status !== "PENDING" || component.componentCount > 0 || component.issues.length > 0)
                          .map((component) => (
                            <span key={`${row.runLineId}-${component.family}`} className="grid gap-2 rounded-md border border-white/10 bg-black/10 px-2 py-1 sm:grid-cols-[minmax(0,1fr)_auto]">
                              <span className="min-w-0 truncate text-slate-300">{componentFamilyLabel(component.family, locale)}</span>
                              <span className="font-semibold text-slate-100">{money(component.amount, component.currency)}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{payrollUiText("No register rows match the table filters.", locale)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <HrPayrollTablePagination table={registerTable} locale={locale} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">{payrollUiText("Payment batches", locale)}</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.paymentBatches.length ? data.paymentBatches.map((batch) => (
              <div key={batch.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-white">{batch.batchNumber}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{batch.evidenceHash ?? batch.bankFileHash ?? payrollUiText("No evidence hash", locale)}</p>
                </div>
                <Badge locale={locale} value={batch.status} />
              </div>
            )) : <InlineEmpty title={payrollUiText("Payment batches", locale)} body={payrollUiText("No payroll payment batches are linked to this register.", locale)} />}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">{payrollUiText("Declarations", locale)}</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.declarations.length ? data.declarations.map((declaration) => (
              <div key={declaration.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-white">{declaration.authority} / {declaration.declarationType}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{declaration.payloadHash ?? payrollUiText("No payload hash", locale)}</p>
                </div>
                <Badge locale={locale} value={declaration.status} />
              </div>
            )) : <InlineEmpty title={payrollUiText("Declarations", locale)} body={payrollUiText("No payroll declarations are linked to this register.", locale)} />}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <FileCheck2 className="h-4 w-4 text-cyan-200" aria-hidden="true" />
        <span className="break-words">{payrollUiText("Generated from", locale)} {data.sourceScope.sourceTables.join(", ")}</span>
      </section>
    </div>
  )
}
