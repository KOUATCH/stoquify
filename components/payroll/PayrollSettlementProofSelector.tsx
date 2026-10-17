"use client"

import type { SettlementProofOptions, SettlementProofSelection } from "@/services/payroll/payment-settlement-proof-contracts"
import type { Locale } from "@/types/bilingual"

export function PayrollSettlementProofSelector({ options, value, onChange, disabled, current, locale }: {
  options?: SettlementProofOptions; value: SettlementProofSelection | null
  onChange: (value: SettlementProofSelection | null) => void
  disabled: boolean; current: boolean; locale: Locale
}) {
  const fr = locale === "fr"
  const register = options?.register
  const kind = fr ? { provider: "Confirmation du prestataire", statement: "Ligne de relevé", provider_and_statement: "Prestataire et relevé" }
    : { provider: "Provider confirmation", statement: "Statement line", provider_and_statement: "Provider and statement" }
  return <fieldset disabled={disabled} className="grid min-w-0 gap-3 rounded-lg border border-[var(--dash-border-subtle)] p-3">
    <legend className="px-1 text-sm font-medium">{fr ? "Justificatifs du règlement" : "Settlement proof"}</legend>
    <p className="text-sm">{fr ? "Paie comptabilisée : " : "Posted payroll run: "}{register ? `${register.runNumber} · version ${register.version}` : (fr ? "Aucun justificatif admissible. Actualisez ou consultez le responsable de paie." : "No eligible proof. Refresh or contact the payroll controller.")}</p>
    <label className="grid gap-1 text-sm">
      <span>{fr ? "Rapprochement approuvé" : "Approved reconciliation"}</span>
      <select value={current ? value?.matchRecordId ?? "" : ""} required disabled={!register || !options?.matches.length || disabled}
        onChange={event => {
          const match = options?.matches.find(option => option.id === event.target.value)
          onChange(register && match ? { payrollRunId: register.id, runVersion: register.version, runRevision: register.revision, matchRecordId: match.id, matchRevision: match.revision } : null)
        }} className="dashboard-control min-h-10 w-full min-w-0 rounded-md border px-2">
        <option value="">{fr ? "Choisir un justificatif" : "Choose proof"}</option>
        {options?.matches.map(match => <option key={match.id} value={match.id}>{match.reference} · {kind[match.kind]} · {match.amount} {match.currency} · {new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "UTC" }).format(new Date(match.occurredAt))}</option>)}
      </select>
    </label>
    {!options?.matches.length && <p role="status" className="text-sm">{fr ? "Aucun rapprochement approuvé et inutilisé n’est admissible. Vérifiez les sources puis actualisez." : "No eligible unused approved match is available. Review the source records, then refresh."}</p>}
    {value && !current && <p role="alert" className="text-sm">{fr ? "Le justificatif a changé. Vérifiez les sources et choisissez à nouveau." : "The proof changed. Review the sources and select it again."}</p>}
    <p className="text-xs text-[var(--dash-text-soft)]">{fr ? "Les justificatifs enregistrés seront vérifiés à l’envoi. Choisir une preuve ne déclenche aucun paiement." : "Stored proof will be checked when submitted. Selecting proof does not initiate a payment."}</p>
  </fieldset>
}
