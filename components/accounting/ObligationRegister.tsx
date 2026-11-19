"use client"
import { useEffect, useId, useRef, useState } from "react"
import { getObligationRegisterAction, saveObligationAction, reviewObligationAction } from "@/actions/accounting/obligation-register.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { ObligationCode, ObligationCommand, ObligationItem, ObligationRegister as Register } from "@/services/compliance/obligation-register.contract"

const button = "dashboard-button-primary min-h-11 rounded-lg px-3 py-2 text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
const field = "dashboard-control min-h-11 w-full rounded-lg p-2"
const names = {
  en: { CLOSE_EVIDENCE_COLLECTION: "Close evidence collection", CM_VAT_MONTHLY: "Cameroon VAT — country review required", CM_CNPS_EVIDENCE: "Cameroon CNPS — restricted payroll evidence" },
  fr: { CLOSE_EVIDENCE_COLLECTION: "Collecte des justificatifs de clôture", CM_VAT_MONTHLY: "TVA Cameroun — examen pays requis", CM_CNPS_EVIDENCE: "CNPS Cameroun — justificatifs de paie restreints" },
}
const states: Record<string, [string, string]> = {
  UNKNOWN: ["Unknown / review required", "Inconnu / examen requis"], NOT_APPLICABLE: ["Not applicable (recorded decision)", "Non applicable (décision enregistrée)"],
  OPEN: ["Open", "Ouvert"], OVERDUE: ["Overdue", "En retard"], FULFILLED_WITH_EVIDENCE: ["Fulfilled with reviewed evidence", "Réalisé avec justificatif examiné"],
  UNSCHEDULED: ["Unscheduled", "Non planifié"], DUE: ["Scheduled", "Planifié"], OPERATIONAL: ["Operational", "Opérationnel"],
  UNREVIEWED: ["Qualified country review required", "Examen pays qualifié requis"], EXPIRED: ["Source refresh overdue", "Actualisation de la source en retard"], UNSUPPORTED: ["Country coverage unavailable", "Couverture pays indisponible"],
  PREPARED: ["Prepared", "Préparé"], REVIEWED: ["Evidence reviewed", "Justificatif examiné"], CHANGES_REQUESTED: ["Changes requested", "Modifications demandées"],
  NONE: ["No available evidence", "Aucun justificatif disponible"], CLOSE_PACK: ["Retained Close pack (not certification)", "Dossier de clôture conservé (sans certification)"],
  MANUAL_SUBMISSION: ["Manual submission evidence", "Justificatif de dépôt manuel"], MANUAL_ACKNOWLEDGEMENT: ["Manually captured acknowledgement", "Accusé saisi manuellement"],
  SANDBOX: ["Sandbox evidence", "Justificatif de test"], UNVERIFIED_AUTHORITY: ["Unverified authority evidence", "Justificatif d’autorité non vérifié"], REDACTED: ["Payroll evidence restricted", "Justificatif de paie restreint"],
}

export function ObligationRegister({ clientOrganizationId, locale = "en" }: { clientOrganizationId?: string; locale?: string }) {
  const language = locale === "fr" ? "fr" : "en", fr = language === "fr", id = useId(), epoch = useRef(0)
  const scope = useRef(clientOrganizationId); scope.current = clientOrganizationId
  const [data, setData] = useState<Register | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("")
  const [payroll, setPayroll] = useState(false), [selected, setSelected] = useState<ObligationItem | null>(null)
  const [code, setCode] = useState<ObligationCode>("CLOSE_EVIDENCE_COLLECTION"), [period, setPeriod] = useState("")
  const [applicability, setApplicability] = useState<ObligationCommand["applicability"]>("UNKNOWN"), [due, setDue] = useState("")
  const [evidence, setEvidence] = useState(""), [reason, setReason] = useState(""), [claim, setClaim] = useState(false)
  const [pending, setPending] = useState<ObligationCommand | null>(null), [fresh, setFresh] = useState(false), [password, setPassword] = useState("")
  const text = (en: string, french: string) => fr ? french : en
  const state = (s: string) => states[s]?.[fr ? 1 : 0] ?? s
  function resetDraft() { setSelected(null); setCode("CLOSE_EVIDENCE_COLLECTION"); setPeriod(""); setApplicability("UNKNOWN"); setDue(""); setEvidence(""); setReason(""); setClaim(false) }
  function clear() { epoch.current++; setData(null); setPending(null); setFresh(false); setPassword(""); setBusy(false); resetDraft() }
  useEffect(() => {
    clear()
    const hide = () => { if (document.visibilityState === "hidden") clear() }
    const pagehide = () => clear()
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", pagehide)
    return () => { epoch.current++; document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", pagehide) }
  // Client changes invalidate every private response and draft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientOrganizationId])
  async function load(includePayroll = payroll) {
    const generation = ++epoch.current, client = clientOrganizationId
    setBusy(true); setData(null); resetDraft(); setMessage("")
    try {
      const result = await getObligationRegisterAction({ clientOrganizationId: client, includePayroll })
      if (generation !== epoch.current || scope.current !== client) return
      if (!result.success) { setPending(null); setFresh(false); setMessage(text("Access unavailable or session expired. Reload after restoring access.", "Accès indisponible ou session expirée. Rechargez après rétablissement de l’accès.")); return }
      setData(result.data); setPeriod(result.data.periods[0]?.id ?? "")
    } catch { if (generation === epoch.current) setMessage(text("Unable to load. Retry.", "Chargement impossible. Réessayez.")) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  async function execute(command: ObligationCommand) {
    const generation = ++epoch.current, client = clientOrganizationId
    setBusy(true); setPending(command); setMessage("")
    try {
      const result = await (command.command === "SAVE" ? saveObligationAction(command) : reviewObligationAction(command))
      if (generation !== epoch.current || scope.current !== client) return
      if (!result.success) {
        const error = result.code
        if (error === "FRESH_AUTH_REQUIRED") { setFresh(true); return }
        if (["FORBIDDEN", "AUTH_REQUIRED", "UNAUTHORIZED"].includes(error ?? "")) { clear(); setMessage(text("Access denied. Reload after reauthorization.", "Accès refusé. Rechargez après réautorisation.")); return }
        if (error === "CONFLICT" || error === "NOT_FOUND" || error === "BUSINESS_RULE_VIOLATION" || error === "SOD_VIOLATION") {
          setPending(null); setMessage(text("The source, evidence, version or independent review requirements changed. Reload and prepare again.", "La source, le justificatif, la version ou les conditions d’examen indépendant ont changé. Rechargez et préparez à nouveau.")); return
        }
        setMessage(text("Outcome uncertain. Reload the register or retry this exact command.", "Résultat incertain. Rechargez le registre ou réessayez la même commande.")); return
      }
      setPending(null); setFresh(false); await load(); setMessage(text("Revision recorded; current register reloaded.", "Révision enregistrée ; registre rechargé."))
    } catch { if (generation === epoch.current) setMessage(text("Outcome uncertain. Retry the retained command.", "Résultat incertain. Réessayez la commande conservée.")) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  function make(command: ObligationCommand["command"]) {
    if (!data) return
    const review = command !== "SAVE", row = selected
    if (review && !row) return
    const c = review ? row!.code : code, source = data.sources.find(s => s.code === c)!
    void execute({ clientOrganizationId, command, code: c, periodId: review ? row!.periodId : period,
      instanceId: row?.instanceId, expectedVersion: row?.version ?? 0, applicability: review ? row!.applicability : applicability,
      dueAt: review ? row!.dueAt : due ? `${due}T23:59:59.000Z` : null, claimOwnership: review ? false : claim,
      evidenceId: review ? row!.evidenceId : evidence || null, reason, expectedSourceHash: source.sourceHash, idempotencyKey: crypto.randomUUID() })
  }
  function edit(row: ObligationItem) { setSelected(row); setCode(row.code); setPeriod(row.periodId); setApplicability(row.applicability); setDue(row.dueAt?.slice(0, 10) ?? ""); setEvidence(row.evidenceId ?? ""); setReason(""); setClaim(false) }
  const disabled = busy || !!pending
  return <section data-testid="obligation-register" className="dashboard-glass-panel my-4 min-w-0 space-y-4 rounded-lg p-4" aria-labelledby={`${id}-heading`} aria-busy={busy}>
    <h3 id={`${id}-heading`} className="text-lg font-semibold">{text("Obligations and evidence register", "Registre des obligations et justificatifs")}</h3>
    <p className="text-sm text-[var(--dash-text-soft)]">{text("Operational targets are not legal deadlines. No statutory obligation is verified in this pilot. Manual or sandbox evidence is never accepted live filing. Private data clears when this tab is hidden.", "Les objectifs opérationnels ne sont pas des échéances légales. Aucune obligation légale n’est validée dans ce pilote. Un justificatif manuel ou de test n’est jamais un dépôt accepté en production. Les données privées sont effacées lorsque cet onglet est masqué.")}</p>
    <div className="flex flex-wrap items-center gap-3"><button type="button" className={button} disabled={busy} onClick={() => void load()}>{text("Load / refresh register", "Charger / actualiser le registre")}</button>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={payroll} disabled={busy} onChange={e => { clear(); setPayroll(e.target.checked) }} />{text("Include restricted payroll evidence (client payroll role required)", "Inclure les justificatifs de paie restreints (rôle paie du client requis)")}</label></div>
    <p role="status" aria-live="polite">{busy ? text("Loading…", "Chargement…") : message}</p>
    {pending && <button type="button" className={button} disabled={busy || fresh} onClick={() => void execute(pending)}>{text("Retry exact command", "Réessayer la même commande")}</button>}
    {fresh && <form className="space-y-2" onSubmit={async e => { e.preventDefault(); const generation = epoch.current; setBusy(true); try {
      const result = await stepUpWithPasswordAction({ password }); if (generation !== epoch.current) return
      setPassword(""); if (result.success) { setFresh(false); setMessage(text("Identity confirmed. Retry the retained command explicitly.", "Identité confirmée. Réessayez explicitement la commande conservée.")) }
      else setMessage(text("Password confirmation failed.", "La confirmation du mot de passe a échoué."))
    } catch { if (generation === epoch.current) setMessage(text("Confirmation unavailable. Retry.", "Confirmation indisponible. Réessayez.")) } finally { if (generation === epoch.current) setBusy(false) } }}>
      <label htmlFor={`${id}-password`}>{text("Confirm password", "Confirmer le mot de passe")}</label><input id={`${id}-password`} className={field} autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      <button className={button} disabled={busy} type="submit">{text("Confirm identity", "Confirmer l’identité")}</button></form>}
    {data && <>
      <p className="text-sm">{data.countryCode} · {text("Checked", "Vérifié à")} {data.observedAt} · {text("Latest 100 evidence choices; up to 100 obligations and 500 retained revisions.", "100 justificatifs récents ; jusqu’à 100 obligations et 500 révisions conservées.")}</p>
      <details><summary className="min-h-11 cursor-pointer">{text("Country source coverage", "Couverture des sources pays")}</summary><ul className="space-y-3">{data.sources.map(s => <li key={s.code} className="break-words"><strong>{names[language][s.code]}</strong> — {state(s.coverage)}<p>{s.sourceVersion} · {s.sourceCheckedOn ?? "—"} · {text("Refresh by", "Actualiser avant")} {s.refreshBy ?? "—"}</p>{s.officialSources.map(ref => <a key={ref.url} className="block min-h-11 break-all underline" href={ref.url} target="_blank" rel="noreferrer">{ref.url}</a>)}</li>)}</ul></details>
      {!data.items.length && <p>{text("No obligations recorded. Create an operational reminder below.", "Aucune obligation enregistrée. Créez un rappel opérationnel ci-dessous.")}</p>}
      <ul className="space-y-3">{data.items.map(row => <li key={row.instanceId} className="min-w-0 space-y-2 break-words rounded-lg border border-[var(--dash-border-subtle)] p-3">
        <h4 className="font-semibold">{names[language][row.code]} · {data.periods.find(p => p.id === row.periodId)?.name}</h4>
        <p>{state(row.status)} · {state(row.deadlineState)} · {row.dueAt ?? "—"}</p><p>{text("Responsible", "Responsable")}: {row.ownerId === data.actorId ? text("You", "Vous") : row.ownerId}</p>
        <p>{state(row.decision)} · {state(row.evidenceClass)}</p>
        {(row.sourceChanged || row.evidenceChanged) && <p>{text("Source or evidence changed. Prepare and independently review a new revision.", "La source ou le justificatif a changé. Préparez une nouvelle révision et faites-la examiner indépendamment.")}</p>}
        <button className={button} disabled={disabled || row.payrollRedacted} onClick={() => edit(row)}>{text("Open / edit", "Ouvrir / modifier")}</button>
        <details><summary className="min-h-11 cursor-pointer">{text("Retained history", "Historique conservé")} ({row.history.length})</summary>{row.history.map(h => <p key={h.version} className="my-2 text-sm">v{h.version} · {h.at} · {state(h.decision)} · {h.sourceVersion} · {h.dueAt ?? "—"} · {h.reason}</p>)}</details>
      </li>)}</ul>
      <form className="space-y-3 border-t border-[var(--dash-border-subtle)] pt-4" onSubmit={e => { e.preventDefault(); make("SAVE") }}>
        <h4 className="font-semibold">{selected ? text("Revise selected obligation", "Réviser l’obligation sélectionnée") : text("New obligation", "Nouvelle obligation")}</h4>
        <label className="block">{text("Obligation", "Obligation")}<select className={field} value={code} disabled={disabled || !!selected} onChange={e => { setCode(e.target.value as ObligationCode); setEvidence("") }}>{data.sources.map(s => <option key={s.code} value={s.code} disabled={s.code === "CM_CNPS_EVIDENCE" && !data.payrollIncluded}>{names[language][s.code]}</option>)}</select></label>
        <label className="block">{text("Period", "Période")}<select className={field} required value={period} disabled={disabled || !!selected} onChange={e => { setPeriod(e.target.value); setEvidence("") }}><option value="">—</option>{data.periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="block">{text("Applicability", "Applicabilité")}<select className={field} disabled={disabled} value={applicability} onChange={e => setApplicability(e.target.value as ObligationCommand["applicability"])}><option value="UNKNOWN">{state("UNKNOWN")}</option><option value="APPLICABLE">{text("Applicable (operational decision)", "Applicable (décision opérationnelle)")}</option><option value="NOT_APPLICABLE">{state("NOT_APPLICABLE")}</option></select></label>
        <label className="block">{text("Operational target date (end of day UTC; not a legal deadline)", "Date cible opérationnelle (fin de journée UTC ; non légale)")}<input className={field} type="date" disabled={disabled} value={due} onChange={e => setDue(e.target.value)} /></label>
        <label className="block">{text("Existing domain evidence", "Justificatif du domaine existant")}<select className={field} value={evidence} disabled={disabled} onChange={e => setEvidence(e.target.value)}><option value="">—</option>{data.evidence.filter(e => e.code === code && e.periodId === period).map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={disabled} checked={claim} onChange={e => setClaim(e.target.checked)} />{text("Assign responsibility to me", "M’attribuer la responsabilité")}</label>
        <label className="block">{text("Reason / review conclusion (no payroll personal details)", "Motif / conclusion (sans données personnelles de paie)")}<textarea className={field} minLength={10} maxLength={600} required disabled={disabled} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <div className="flex flex-wrap gap-3"><button className={button} type="submit" disabled={disabled || !period}>{text("Save new revision", "Enregistrer une révision")}</button>
          {selected && <><button className={button} type="button" disabled={disabled || reason.trim().length < 10 || selected.history[0]?.actorId === data.actorId || selected.decision !== "PREPARED"} onClick={() => make("REVIEW")}>{text("Review retained evidence", "Examiner le justificatif conservé")}</button><button className={button} type="button" disabled={disabled || reason.trim().length < 10} onClick={() => make("RETURN")}>{text("Request changes", "Demander des modifications")}</button><button className={button} type="button" disabled={disabled} onClick={resetDraft}>{text("New obligation", "Nouvelle obligation")}</button></>}
        </div><p className="text-sm">{text("Review applies to the retained preparation. Save edits first; a different reviewer must review them.", "L’examen porte sur la préparation conservée. Enregistrez les modifications avant l’examen par une autre personne.")}</p>
      </form>
    </>}
  </section>
}
