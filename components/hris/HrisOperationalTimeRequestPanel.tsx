"use client"
import {useHrisFreshAuth} from "./useHrisFreshAuth"

import { useEffect, useRef, useState, useTransition } from "react"
import { requestOwnOperationalTimeAction, cancelOwnLeaveRequestAction } from "@/actions/hris/own-time.actions"
import { HrisLeaveConversion } from "./HrisLeaveConversion"


type RequestRow = { conversion?: unknown; id: string; type: string; status: string; periodStart: string; periodEnd: string; requestedMinutes: number; requestedAt: string }
type CorrectionEntry = { id: string; workDate: string; workedMinutes: number; absenceMinutes: number; scheduledMinutes: number; sourceHash: string }
type Props = {
  employeeId?: string
  requests: RequestRow[]
  balances: Array<{ leavePolicyId: string; availableMinutes: number; name?: string; version?: number; effectiveFrom?: string; effectiveTo?: string | null; credits?: number; debits?: number; futureCredits?: number; futureDebits?: number; settled?: boolean; retired?: boolean }>
  correctionEntries?: CorrectionEntry[]
  enabled: boolean
  locale?: string
}

const inputClass = "mt-1 min-h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white"

async function digest(value: string) {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return `sha256:${Array.from(new Uint8Array(result)).map(byte => byte.toString(16).padStart(2, "0")).join("")}`
}

export function HrisOperationalTimeRequestPanel({ employeeId, requests, balances, correctionEntries = [], enabled, locale = "en" }: Props) {
  const recovery=useHrisFreshAuth(locale.startsWith("fr")?"fr":"en",employeeId??"own-time")
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [type, setType] = useState("LEAVE")
  const [entryId, setEntryId] = useState("")
  const [policyId, setPolicyId] = useState("")
  const [quantityUnit, setQuantityUnit] = useState("MINUTES")
  const messageRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (failed && message) messageRef.current?.focus() }, [failed, message])
  const fr = locale.startsWith("fr")
  const text = (en: string, french: string) => fr ? french : en
  const selected = correctionEntries.find(entry => entry.id === entryId)
  const correction = type === "ATTENDANCE_CORRECTION"
  const typeLabel = (value: string) => value === "LEAVE" ? text("Leave", "Congé") : value === "OVERTIME"
    ? text("Overtime", "Heures supplémentaires") : text("Attendance correction", "Correction de présence")
  const statusLabel = (value: string) => ({ REQUESTED: text("Awaiting review", "En attente de validation"), APPROVED: text("Approved", "Approuvée"), REJECTED: text("Rejected", "Refusée"), CANCELLED: text("Cancelled", "Annulée") }[value] ?? value)

  function submit(formData: FormData) {
    startTransition(async () => {
      setMessage(null)
      setFailed(false)
      try {
        if (correction && !selected) throw new Error("missing entry")
        const periodStart = correction ? selected!.workDate : String(formData.get("periodStart") ?? "")
        const periodEnd = correction ? selected!.workDate : String(formData.get("periodEnd") ?? "")
        const proposedWorkedMinutes = correction ? Number(formData.get("proposedWorkedMinutes")) : undefined
        const proposedAbsenceMinutes = correction ? Number(formData.get("proposedAbsenceMinutes")) : undefined
        const rawQuantity = Number(formData.get("requestedMinutes"))
        const requestedMinutes = correction ? Math.max(1, proposedWorkedMinutes! + proposedAbsenceMinutes!) : type === "LEAVE" && quantityUnit !== "MINUTES" ? 1 : rawQuantity
        const payload = {
          ...(type === "LEAVE" && quantityUnit !== "MINUTES" ? { quantity: rawQuantity, quantityUnit } : {}),
          ...(type === "LEAVE" && String(formData.get("allocations") ?? "").trim() ? { allocations: String(formData.get("allocations")).trim().split(/\n/).map(line => { const [workDate, minutes] = line.trim().split(/[,\s]+/); return { workDate, minutes: Number(minutes) } }) } : {}),
          type, periodStart, periodEnd, requestedMinutes, reason: String(formData.get("reason") ?? ""),
          leavePolicyId: type === "LEAVE" ? policyId || undefined : undefined,
          targetTimeEntryId: correction ? selected!.id : undefined,
          expectedEntryHash: correction ? selected!.sourceHash : undefined,
          proposedWorkedMinutes, proposedAbsenceMinutes,
        }
        const evidence = await digest(JSON.stringify(payload))
        const result = await recovery.run(()=>requestOwnOperationalTimeAction({ ...payload, requestEvidenceHash: evidence, idempotencyKey: `time-request:${evidence}` }))
        setFailed(!result.success)
        setMessage(result.success ? text("Request submitted for independent review.", "Demande transmise pour validation indépendante.") : result.error)
      } catch {
        setFailed(true)
        setMessage(text("The request could not be confirmed. Your entries are retained; retry or refresh the selected source if it changed.", "La demande n’a pas pu être confirmée. Vos valeurs sont conservées ; réessayez ou actualisez la source si elle a changé."))
      }
    })
  }

  return (
    <section aria-labelledby="operational-time-heading" className="border-t border-white/10 pt-4">
      {recovery.dialog}
      <h2 id="operational-time-heading" className="text-base font-semibold text-white">
        {text("Leave, overtime and attendance corrections", "Congés, heures supplémentaires et corrections de présence")}
      </h2>
      {message ? <p ref={messageRef} tabIndex={-1} role={failed ? "alert" : "status"} className="mt-3 text-sm text-sky-200">{message}</p> : null}
      {enabled ? (
        <form onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget)) }} aria-busy={pending} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-300">{text("Request type", "Type de demande")}
            <select value={type} onChange={event => setType(event.target.value)} className={inputClass} disabled={pending}>
              {["LEAVE", "OVERTIME", "ATTENDANCE_CORRECTION"].map(value => <option key={value} value={value}>{typeLabel(value)}</option>)}
            </select>
          </label>
          {type === "LEAVE" && <label>{text("Leave policy", "Politique de congés")}<select required value={policyId} onChange={event => setPolicyId(event.target.value)} disabled={pending} className={inputClass}><option value="">{text("Select the applicable policy", "Choisir la politique applicable")}</option>{balances.filter(row => !row.settled && !row.retired).map(row => <option key={row.leavePolicyId} value={row.leavePolicyId}>{row.name ?? row.leavePolicyId} · {row.version ?? ""} · {row.effectiveFrom ?? ""}–{row.effectiveTo ?? ""}</option>)}</select></label>}
          {correction ? (
            <>
              <label className="text-sm text-slate-300">{text("Imported work entry", "Présence importée")}
                <select value={entryId} onChange={event => setEntryId(event.target.value)} className={inputClass} required disabled={pending}>
                  <option value="">{text("Select an entry", "Sélectionner une présence")}</option>
                  {correctionEntries.map(entry => <option key={entry.id} value={entry.id}>{entry.workDate.slice(0, 10)} — {entry.workedMinutes} / {entry.scheduledMinutes} min</option>)}
                </select>
              </label>
              {selected ? <p className="text-sm text-slate-300 md:col-span-2">
                {text("Current worked / absence minutes:", "Minutes actuelles travaillées / absentes :")} {selected.workedMinutes} / {selected.absenceMinutes}
              </p> : <p className="text-sm text-amber-200 md:col-span-2">{text("Choose a validated entry to review its current values.", "Choisissez une présence validée pour consulter ses valeurs actuelles.")}</p>}
              <label className="text-sm text-slate-300">{text("Corrected worked minutes", "Minutes travaillées corrigées")}
                <input key={entryId + "-worked"} defaultValue={selected?.workedMinutes} name="proposedWorkedMinutes" type="number" min="0" step="1" required disabled={pending} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">{text("Corrected absence minutes", "Minutes d’absence corrigées")}
                <input key={entryId + "-absence"} defaultValue={selected?.absenceMinutes} name="proposedAbsenceMinutes" type="number" min="0" step="1" required disabled={pending} className={inputClass} />
              </label>
            </>
          ) : (
            <>
              <label className="text-sm text-slate-300">{quantityUnit === "MINUTES" ? text("Minutes", "Minutes") : text("Quantity for one work date", "Quantité pour une date de travail")}<input name="requestedMinutes" type="number" min="0.01" step="any" required disabled={pending} className={inputClass} /></label>
              <label className="text-sm text-slate-300">{text("Start", "Début")}<input name="periodStart" type="date" required disabled={pending} className={inputClass} /></label>
              <label className="text-sm text-slate-300">{text("End", "Fin")}<input name="periodEnd" type="date" required disabled={pending} className={inputClass} /></label>
            </>
          )}
          {type === "LEAVE" && <><label>{text("Unit", "Unité")}<select className={inputClass} value={quantityUnit} onChange={event => setQuantityUnit(event.target.value)} disabled={pending}><option value="MINUTES">Minutes</option><option value="HOURS">{text("Hours (one date)", "Heures (une date)")}</option><option value="DAYS">{text("Days (one date)", "Jours (une date)")}</option></select></label><label>{text("Partial multi-day allocation: date, minutes, one per line (optional)", "Répartition partielle sur plusieurs jours : date, minutes, une ligne par date (facultatif)")}<textarea className={inputClass} name="allocations" disabled={pending} /></label></>}
          <label className="text-sm text-slate-300 md:col-span-2">{text("Reason", "Motif")}<textarea name="reason" minLength={8} required disabled={pending} className="mt-1 min-h-24 w-full rounded-md border border-white/10 bg-slate-950 p-3 text-white" /></label>
          <button type="submit" disabled={pending || (type === "LEAVE" && !policyId) || (correction && !selected)} className="min-h-11 rounded-md bg-emerald-500 px-4 font-medium text-slate-950 disabled:opacity-50 md:col-span-2">
            {pending ? text("Submitting…", "Envoi…") : text("Submit request", "Envoyer la demande")}
          </button>
        </form>
      ) : <p className="mt-3 text-sm text-amber-200">{text("Request permission is required.", "L’autorisation de demande est requise.")}</p>}
      <div className="mt-4 space-y-2">{balances.map(row => <p key={row.leavePolicyId}>{row.name ?? row.leavePolicyId}: {row.credits ?? row.availableMinutes} − {row.debits ?? 0} = {row.availableMinutes} min · {text("Future credits / debits", "Crédits / débits futurs")}: {row.futureCredits ?? 0} / {row.futureDebits ?? 0} min</p>)}<p>{text("60 minutes = 1 hour. Day lengths follow your reviewed schedule; an overnight shift belongs to its start date. Split requests at a policy change.", "60 minutes = 1 heure. La durée d’un jour dépend de votre horaire validé ; un poste de nuit appartient à sa date de début. Scindez les demandes à chaque changement de politique.")}</p></div>
      <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
        {requests.length ? requests.map(request => (
          <div key={request.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
            <span className="text-white">{typeLabel(request.type)}</span>
            <span className="text-slate-300">{request.requestedMinutes} minutes</span>
            <span className="text-slate-300">{statusLabel(request.status)}</span>
            <HrisLeaveConversion value={request.conversion} locale={locale} />
            {enabled && employeeId && request.type === "LEAVE" && ["REQUESTED", "APPROVED"].includes(request.status) && <form className="w-full" onSubmit={event => { event.preventDefault(); const reason = String(new FormData(event.currentTarget).get("cancelReason") ?? ""); startTransition(async () => { try { const evidence = await digest(JSON.stringify([request.id, reason])); const result = await recovery.run(()=>cancelOwnLeaveRequestAction({ employeeId, requestId: request.id, reason, idempotencyKey: `cancel:${evidence}` })); setFailed(!result.success); setMessage(result.success ? text("Cancellation recorded; approved leave requires independent HR review.", "Annulation enregistrée ; les congés approuvés exigent une validation RH indépendante.") : result.error) } catch { setFailed(true); setMessage(text("Unable to confirm; retry the same cancellation or refresh.", "Confirmation impossible ; réessayez la même annulation ou actualisez.")) } }) }}><label>{text("Cancellation reason", "Motif d’annulation")}<input name="cancelReason" className={inputClass} minLength={8} required disabled={pending} /></label><button disabled={pending} className="dashboard-btn-secondary mt-2 p-2">{text("Request cancellation", "Demander l’annulation")}</button></form>}
          </div>
        )) : <p className="py-4 text-sm text-slate-400">{text("No time requests yet.", "Aucune demande pour le moment.")}</p>}
      </div>
    </section>
  )
}
