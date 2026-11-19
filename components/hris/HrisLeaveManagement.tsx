"use client"
import { useEffect, useRef, useState } from "react"
import { HrisLeaveConversion } from "./HrisLeaveConversion"
import type { getManagedLeaveWorkspace } from "@/services/hris/leave-entitlement.service"
export type LeaveWorkspace = Awaited<ReturnType<typeof getManagedLeaveWorkspace>>
export type LeaveExecute = (command: "READ" | "ADJUST" | "EXECUTE" | "DECIDE", input: Record<string, unknown>) => Promise<{ success: boolean; data?: any; error?: string | null }>
export function HrisLeaveManagement({ initial, locale, execute }: { initial: LeaveWorkspace; locale: "en" | "fr"; execute: LeaveExecute }) {
  const [data, setData] = useState(initial), [busy, setBusy] = useState(false), [message, setMessage] = useState("")
  const locked = useRef(false), alert = useRef<HTMLParagraphElement>(null), attempts = useRef(new Map<string, string>())
  useEffect(() => { if (!busy && message) alert.current?.focus() }, [busy, message])
  const t = (en: string, fr: string) => locale === "fr" ? fr : en
  const movementLabel = (value: string) => ({ OPENING_BALANCE: t("Opening balance", "Solde initial"), ACCRUAL: t("Accrual", "Acquisition"), CARRY_OVER: t("Carryover", "Report"), EXPIRY: t("Expiry", "Expiration"), MANUAL_ADJUSTMENT: t("Reviewed adjustment", "Ajustement vérifié"), CORRECTION: t("Correction", "Correction"), LEAVE_APPROVED: t("Approved leave", "Congé approuvé"), LEAVE_CANCELLED: t("Cancelled leave refund", "Restitution du congé annulé") }[value] ?? t("Retained movement", "Mouvement conservé"))
  const control = "dashboard-control w-full min-w-0 rounded border p-2"
  async function send(command: Parameters<LeaveExecute>[0], values: Record<string, unknown>) {
    if (locked.current) return
    locked.current = true; setBusy(true); setMessage("")
    const payload = { ...values, employeeId: initial.employeeId }
    const identity = JSON.stringify([command, payload])
    try {
      if (!attempts.current.has(identity)) {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity))
        attempts.current.set(identity, `leave-adjust:${Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("")}`)
      }
      const result = await execute(command, { ...payload, idempotencyKey: attempts.current.get(identity) })
      if (!result.success) throw new Error(result.error || "Unavailable")
      const refreshed = command === "READ" ? result : await execute("READ", { employeeId: initial.employeeId })
      if (!refreshed.success) throw new Error(t("Saved; refresh status before another change.", "Enregistré ; actualisez le statut avant toute autre modification."))
      setData(refreshed.data); setMessage(t("Status refreshed. Review the movements below.", "Statut actualisé. Consultez les mouvements ci-dessous."))
    } catch (error) { setMessage(error instanceof Error ? error.message : t("Unable to confirm. Refresh before retrying.", "Confirmation impossible. Actualisez avant de réessayer.")) }
    finally { locked.current = false; setBusy(false) }
  }
  return <main className="dashboard-landing-theme dark min-h-screen p-4"><div className="dashboard-landing-content mx-auto max-w-5xl space-y-5">
    <h1 className="text-2xl font-semibold">{t("Leave balances", "Soldes de congés")} · {data.displayName}</h1>
    <p>{t("Only approved employee policies appear. Credits minus debits equals the current balance; future movements are listed separately. Undefined rules require HR review.", "Seules les politiques approuvées de cet employé sont affichées. Crédits moins débits égale le solde actuel ; les mouvements futurs sont séparés. Les règles non définies exigent une validation RH.")}</p>
    <a className="underline" href={`/${locale}/dashboard/people/setup`}>{t("Prepare or independently review policy rules", "Préparer ou valider indépendamment les règles")}</a>
    {message && <p role="status" tabIndex={-1} ref={alert}>{message}</p>}
    <button disabled={busy} className="dashboard-btn-secondary p-2" onClick={() => send("READ", {})}>{t("Refresh status", "Actualiser le statut")}</button>
    {data.unresolvedPolicyCount > 0 && <p role="note">{t("Some employer policies have unresolved rules. Review them in setup before posting.", "Certaines politiques ont des règles non résolues. Vérifiez leur configuration avant toute écriture.")}</p>}
    {!data.policies.length && <p>{t("No reviewed policy enrolls this employee yet.", "Aucune politique validée ne couvre encore cet employé.")}</p>}
    {data.policies.map(policy => <section key={policy.leavePolicyId} className="space-y-3 rounded-lg border border-white/20 p-4">
      <h2 className="text-lg font-semibold">{policy.name} · {policy.version} · {policy.effectiveFrom}–{policy.effectiveTo ?? "—"}</h2>
      <p>{policy.credits} − {policy.debits} = <strong>{policy.availableMinutes} min</strong> · {t("Future credits / debits", "Crédits / débits futurs")} {policy.futureCredits} / {policy.futureDebits} min</p>
      <p>{t("As of", "Au")} {data.asOf.slice(0, 10)} · {policy.settled ? t("Closed; retained history", "Clôturé ; historique conservé") : policy.retired ? t("Retired; retained history", "Retiré ; historique conservé") : t("Open", "Ouvert")}</p>
      <details><summary>{t("Explain this balance", "Expliquer ce solde")}</summary><ul className="space-y-2 py-3">{policy.movements.map(row => <li key={row.id} className="break-all text-sm">{row.effectiveAt.slice(0, 10)} · {movementLabel(row.entryType)} · {row.deltaMinutes} min · {row.sourceId}</li>)}</ul></details>
      <form onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); send("EXECUTE", { leavePolicyId: policy.leavePolicyId, throughDate: f.get("throughDate") }) }}>
        <fieldset disabled={busy} className="flex flex-wrap items-end gap-2"><label>{t("Execute approved rules through", "Exécuter les règles approuvées jusqu’au")}<input className={control} name="throughDate" type="date" max={data.asOf.slice(0, 10)} required /></label><button className="dashboard-btn-secondary p-2">{t("Execute due credits / settlement", "Exécuter les droits / la clôture dus")}</button></fieldset>
      </form>
      {!policy.settled && !policy.retired && <form onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); send("ADJUST", { leavePolicyId: policy.leavePolicyId, deltaMinutes: Number(f.get("minutes")), effectiveAt: f.get("effectiveAt"), reason: f.get("reason"), sourceEvidenceHash: f.get("evidence") }) }}>
        <fieldset disabled={busy} className="grid gap-3 md:grid-cols-2"><legend>{t("Reviewed manual adjustment", "Ajustement manuel vérifié")}</legend>
          <label>{t("Minutes (+ or −)", "Minutes (+ ou −)")}<input className={control} name="minutes" type="number" step="1" required /></label>
          <label>{t("Effective work date", "Date de travail applicable")}<input className={control} name="effectiveAt" type="date" min={policy.effectiveFrom} max={policy.effectiveTo ?? undefined} required /></label>
          <label>{t("Reason", "Motif")}<textarea className={control} name="reason" minLength={8} required /></label>
          <label>{t("Reviewed evidence reference", "Référence de preuve vérifiée")}<input className={control} name="evidence" minLength={8} required /></label>
          <button className="dashboard-btn-primary p-2">{t("Post adjustment", "Enregistrer l’ajustement")}</button>
        </fieldset>
      </form>}
    </section>)}
    <section><h2 className="text-lg font-semibold">{t("Cancellation review", "Validation des annulations")}</h2>{data.requests.filter(row => row.cancellationStatus === "REQUESTED").map(request => <form key={request.id} className="my-3 rounded-lg border border-white/20 p-4" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); send("DECIDE", { requestId: request.id, decision: f.get("decision"), reason: f.get("reason"), evidenceHash: f.get("evidence") }) }}>
      <p>{request.periodStart}–{request.periodEnd} · {request.minutes} min</p><HrisLeaveConversion value={request.conversion} locale={locale}/><fieldset disabled={busy || !request.canReviewCancellation} className="grid gap-3 md:grid-cols-2">
        <label>{t("Decision", "Décision")}<select name="decision" className={control}><option value="APPROVE">{t("Approve cancellation", "Approuver l’annulation")}</option><option value="REJECT">{t("Reject cancellation", "Refuser l’annulation")}</option></select></label>
        <label>{t("Reason", "Motif")}<textarea name="reason" className={control} minLength={8} required /></label><label>{t("Reviewed evidence reference", "Référence de preuve vérifiée")}<input name="evidence" className={control} minLength={8} required /></label>
        <button className="dashboard-btn-primary p-2">{t("Record decision", "Enregistrer la décision")}</button>
      </fieldset>{!request.canReviewCancellation && <p>{t("Another HR reviewer must decide your request.", "Un autre valideur RH doit décider votre demande.")}</p>}
    </form>)}</section>
  </div></main>
}
