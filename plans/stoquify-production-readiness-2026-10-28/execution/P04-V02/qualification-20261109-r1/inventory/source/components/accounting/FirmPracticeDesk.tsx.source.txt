"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { listAdvisoryEngagementsAction } from "@/actions/accounting/advisory-outcomes.actions"
import { getFirmPracticeDeskAction, executeFirmPracticeCommandAction, exportFirmPracticeSnapshotAction } from "@/actions/accounting/firm-practice.actions"
import type { FirmPracticeDesk as Desk } from "@/services/accounting/firm-practice.service"
import type { PracticeRecord, PracticePayload } from "@/services/accounting/firm-practice.contract"

const copy = {
  en: { title: "Firm workload and fee budgets", help: "Plan this engagement, declare work manually and retain corrections. Client waiting and review durations in Advisory outcomes are context, not labor hours.",
    load: "Load firm engagements", choose: "Choose a firm engagement", own: "My effort", manager: "Engagement workload", fees: "Load confidential fee budgets", hideFees: "Hide fee budgets",
    loading: "Checking current access…", denied: "Current access does not permit this view or action. Refresh and check the mandate, assignment and permissions.",
    retryMessage: "Submission not confirmed. Retry the retained submission before making another change.", saved: "Saved. Current revisions loaded.", empty: "No active firm engagement is available.",
    unknown: "Unknown", unassigned: "Unassigned", former: "Former or unavailable assignee", plan: "Planned minutes", recorded: "Recorded minutes", variance: "Recorded minus planned", partial: "Manual declarations are partial. Missing effort is unknown, not zero. A plan is not staff capacity.",
    PLAN: "Effort plan", EFFORT: "Manual effort", FEE: "Fee budget", kind: "Record type", assignee: "Assignee", minutes: "Minutes", date: "Work date (UTC)", amount: "Fee budget amount", currency: "Currency",
    reason: "Reason (at least 10 characters; no client evidence or private documents)", save: "Save record", correct: "Correct", cancel: "Cancel correction", review: "Independently review", history: "Retained records and revisions", noRecords: "No records in this scope yet.",
    required: "Complete the required fields. Enter zero explicitly if that is the declared value.", fresh: "Confirm your password, then retry the retained submission.", password: "Password", verify: "Verify identity", verified: "Identity verified. Retry when ready.", retry: "Retry submission",
    observed: "Observed (UTC)", scope: "Coverage: selected engagement and period only", ownScope: "Coverage: your assignments only", none: "No reference", advisory: "Related advisory version", rework: "Related review decision", referenceLimit: "Reference choices show the latest 20 items of each type.",
    reviewed: "Independently reviewed", unreviewed: "Awaiting independent review", versions: "Revision history", corrected: "Corrections retained", feeHelp: "Budgets are estimates, not invoices, collected revenue or profit. Each currency stays separate.", hourly: "Budget per planned hour (plan subtotal)", draftRate: "A planning ratio only; missing plans may make this incomplete.",
  },
  fr: { title: "Charge du cabinet et budgets d’honoraires", help: "Planifiez cette mission, déclarez le travail manuellement et conservez les corrections. Les délais du conseil apportent du contexte, pas des heures travaillées.",
    load: "Charger les missions du cabinet", choose: "Choisir une mission du cabinet", own: "Mon travail", manager: "Charge de la mission", fees: "Charger les budgets confidentiels", hideFees: "Masquer les budgets",
    loading: "Vérification des droits actuels…", denied: "Les droits actuels ne permettent pas cette vue ou action. Actualisez et vérifiez le mandat, l’affectation et les permissions.",
    retryMessage: "Envoi non confirmé. Réessayez la soumission conservée avant toute autre modification.", saved: "Enregistré. Versions actuelles chargées.", empty: "Aucune mission active du cabinet n’est disponible.",
    unknown: "Inconnu", unassigned: "Non affecté", former: "Responsable ancien ou indisponible", plan: "Minutes prévues", recorded: "Minutes déclarées", variance: "Déclaré moins prévu", partial: "Les déclarations sont partielles. Le temps absent est inconnu, pas nul. Un plan n’est pas une capacité disponible.",
    PLAN: "Plan de travail", EFFORT: "Travail déclaré", FEE: "Budget d’honoraires", kind: "Type de saisie", assignee: "Responsable", minutes: "Minutes", date: "Date du travail (UTC)", amount: "Montant du budget", currency: "Devise",
    reason: "Motif (au moins 10 caractères ; aucun justificatif client ni document privé)", save: "Enregistrer", correct: "Corriger", cancel: "Annuler la correction", review: "Consigner la revue indépendante", history: "Saisies et versions conservées", noRecords: "Aucune saisie dans ce périmètre.",
    required: "Complétez les champs requis. Saisissez explicitement zéro si c’est la valeur déclarée.", fresh: "Confirmez votre mot de passe, puis réessayez la soumission conservée.", password: "Mot de passe", verify: "Vérifier l’identité", verified: "Identité vérifiée. Réessayez lorsque vous êtes prêt.", retry: "Réessayer la soumission",
    observed: "Observé (UTC)", scope: "Périmètre : mission et période sélectionnées uniquement", ownScope: "Périmètre : vos affectations uniquement", none: "Sans référence", advisory: "Version de conseil liée", rework: "Décision de revue liée", referenceLimit: "Les choix affichent les 20 éléments les plus récents de chaque type.",
    reviewed: "Revue indépendante effectuée", unreviewed: "Revue indépendante attendue", versions: "Historique des versions", corrected: "Corrections conservées", feeHelp: "Les budgets sont des estimations, pas des factures, recettes ou bénéfices. Chaque devise reste séparée.", hourly: "Budget par heure prévue (sous-total du plan)", draftRate: "Ratio de planification uniquement ; des plans manquants peuvent le rendre incomplet.",
  },
}
type Props = { clientOrganizationId?: string; periodId: string; locale?: "en" | "fr" }
type Pending = { input: Record<string, unknown>; exporting: boolean }
const field = "min-h-11 w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface)] px-3 py-2 text-[var(--dash-text)]"
export function FirmPracticeDesk(props: Props) {
  if (!props.clientOrganizationId) return null
  return <PracticeForm key={`${props.clientOrganizationId}:${props.periodId}:${props.locale}`} {...props} />
}
function PracticeForm({ clientOrganizationId, periodId, locale = "en" }: Props) {
  const t = copy[locale], scope = { clientOrganizationId, periodId }, epoch = useRef(0)
  const [engagements, setEngagements] = useState<Array<{ id: string; label: string }> | null>(null), [engagementId, setEngagementId] = useState("")
  const [desk, setDesk] = useState<Desk | null>(null), [mode, setMode] = useState<"own" | "manager">("own"), [economics, setEconomics] = useState(false)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [pending, setPending] = useState<Pending | null>(null)
  const [fresh, setFresh] = useState(false), [password, setPassword] = useState(""), [editing, setEditing] = useState<PracticeRecord | null>(null)
  const [kind, setKind] = useState<PracticePayload["kind"]>("EFFORT"), [assigneeId, setAssigneeId] = useState("")
  const [minutes, setMinutes] = useState(""), [workDate, setWorkDate] = useState(""), [amount, setAmount] = useState(""), [currency, setCurrency] = useState("XAF")
  const [reason, setReason] = useState(""), [advisory, setAdvisory] = useState(""), [rework, setRework] = useState("")
  const cohort = desk?.cohorts[0]
  const resetForm = () => { setEditing(null); setKind("EFFORT"); setMinutes(""); setWorkDate(""); setAmount(""); setReason(""); setAdvisory(""); setRework(""); setAssigneeId("") }
  const clear = () => { setDesk(null); setPending(null); setFresh(false); setPassword(""); resetForm() }
  useEffect(() => {
    const hide = () => { if (document.hidden) { epoch.current++; clear(); setEngagements(null); setBusy(false); setMessage("") } }
    const leave = () => { epoch.current++; clear(); setEngagements(null); setBusy(false); setMessage("") }
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", leave)
    return () => { epoch.current++; document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", leave) }
  }, [])
  async function load(id?: string, nextMode = mode, includeEconomics = false) {
    const generation = ++epoch.current; clear(); setBusy(true); setMessage(""); setEconomics(includeEconomics); setMode(nextMode)
    try {
      if (!id) {
        setEngagements(null)
        const result = await listAdvisoryEngagementsAction(scope)
        if (generation !== epoch.current) return
        if (result.success && result.data?.firmView) { setEngagements(result.data.engagements); setEngagementId("") } else setMessage(t.denied)
      } else {
        const result = await getFirmPracticeDeskAction({ cohort: [{ ...scope, engagementId: id }], mode: nextMode, includeEconomics })
        if (generation !== epoch.current) return
        if (result.success) setDesk(result.data); else setMessage(t.denied)
      }
    } catch { if (generation === epoch.current) setMessage(t.retryMessage) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  async function submit(input: Record<string, unknown>, exporting = false) {
    if (busy || fresh) return
    const generation = epoch.current; setBusy(true); setPending({ input, exporting }); setMessage("")
    try {
      const result = exporting ? await exportFirmPracticeSnapshotAction(input) : await executeFirmPracticeCommandAction(input)
      if (generation !== epoch.current) return
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") { setDesk(null); setFresh(true); setMessage(t.fresh) }
        else if (result.retryable) setMessage(t.retryMessage)
        else { clear(); setMessage(t.denied) }
        return
      }
      if (exporting && "contentBase64" in result.data) {
        const bytes = Uint8Array.from(atob(result.data.contentBase64), character => character.charCodeAt(0))
        const url = URL.createObjectURL(new Blob([bytes], { type: result.data.mimeType }))
        const link = document.createElement("a"); link.href = url; link.download = result.data.fileName; link.click(); URL.revokeObjectURL(url)
      }
      setPending(null); resetForm()
      const refreshed = await getFirmPracticeDeskAction({ cohort: [{ ...scope, engagementId }], mode, includeEconomics: economics })
      if (generation !== epoch.current) return
      setDesk(refreshed.success ? refreshed.data : null); setMessage(refreshed.success ? t.saved : t.denied)
    } catch { if (generation === epoch.current) setMessage(t.retryMessage) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  function save() {
    if (!cohort || reason.trim().length < 10 || (kind === "FEE" ? !amount : minutes === "") || (kind === "EFFORT" && !workDate)) { setMessage(t.required); return }
    const payload = kind === "PLAN" ? { kind, assigneeId: assigneeId || null, minutes: Number(minutes) } : kind === "FEE" ? { kind, currency, amount } :
      { kind, minutes: Number(minutes), workDate, advisoryRevisionId: advisory || null, reviewDecisionId: rework || null }
    const recordKey = editing?.recordKey ?? (kind === "PLAN" ? `plan:${assigneeId || "unassigned"}` : kind === "FEE" ? `fee:${currency}` : `effort:${crypto.randomUUID()}`)
    const previous = cohort.records.find(row => row.recordKey === recordKey)
    void submit({ ...scope, engagementId, command: "SAVE", recordKey, expectedVersion: editing?.version ?? previous?.version ?? 0,
      idempotencyKey: crypto.randomUUID(), reason, payload })
  }
  function edit(row: PracticeRecord) {
    resetForm(); setEditing(row); setKind(row.payload.kind)
    if (row.payload.kind === "FEE") { setAmount(row.payload.amount); setCurrency(row.payload.currency) }
    else { setMinutes(String(row.payload.minutes)); if (row.payload.kind === "PLAN") setAssigneeId(row.payload.assigneeId ?? "")
      else { setWorkDate(row.payload.workDate); setAdvisory(row.payload.advisoryRevisionId ?? ""); setRework(row.payload.reviewDecisionId ?? "") } }
  }
  const person = (id: string | null) => id === null ? t.unassigned : cohort?.staff.find(row => row.id === id)?.name ?? t.former
  const referenceState = (state: string) => ({ DRAFT: ["Draft", "Brouillon"], PREPARED: ["Prepared", "Préparé"], REVIEWED: ["Reviewed", "Revu"],
    CHANGES_REQUESTED: ["Changes requested", "Corrections demandées"], CLIENT_AGREED: ["Client agreed", "Accord client"],
    DELIVERED: ["Published", "Publié"], APPROVED_FOR_CLOSE: ["Approved for close", "Approuvé pour clôture"] } as Record<string, string[]>)[state]?.[locale === "en" ? 0 : 1] ?? (locale === "en" ? "Recorded decision" : "Décision enregistrée")
  return <section aria-label={t.title} className="dashboard-glass-panel space-y-4 rounded-xl p-4 sm:p-6">
    <h2 className="text-xl font-semibold">{t.title}</h2><p>{t.help}</p>
    <Button disabled={busy || !!pending} onClick={() => void load()}>{t.load}</Button>
    {engagements && <label className="block">{t.choose}<select aria-label={t.choose} className={field} value={engagementId} disabled={busy || !!pending} onChange={e => { setEngagementId(e.target.value); if (e.target.value) void load(e.target.value, "own") }}>
      <option value="">{t.choose}</option>{engagements.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>}
    {engagements?.length === 0 && <p>{t.empty}</p>}
    <p role="status" aria-live="polite">{busy ? t.loading : message}</p>
    {fresh && <div className="space-y-2"><label className="block">{t.password}<input type="password" autoComplete="current-password" className={field} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <Button disabled={busy || !password} onClick={async () => { const generation = epoch.current; setBusy(true); const value = password; setPassword("");
        try { const result = await stepUpWithPasswordAction({ password: value }); if (generation === epoch.current) { if (result.success) { setFresh(false); setMessage(t.verified) } else setMessage(t.denied) } }
        catch { if (generation === epoch.current) setMessage(t.retryMessage) } finally { if (generation === epoch.current) setBusy(false) } }}>{t.verify}</Button></div>}
    {pending && <Button disabled={busy || fresh} onClick={() => void submit(pending.input, pending.exporting)}>{t.retry}</Button>}
    {cohort && desk && <>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || !!pending} onClick={() => void load(engagementId, "own")}>{t.own}</Button>
        {cohort.canManage && <Button disabled={busy || !!pending} onClick={() => void load(engagementId, "manager")}>{t.manager}</Button>}
        {cohort.canReadEconomics && <Button disabled={busy || !!pending} onClick={() => void load(engagementId, "manager", !economics)}>{economics ? t.hideFees : t.fees}</Button>}</div>
      <p>{mode === "manager" ? t.scope : t.ownScope} — {cohort.periodName}</p><p>{t.observed}: {desk.observedAt}</p><p>{t.partial}</p>
      <Button disabled={busy || !!pending} variant="outline" onClick={() => void submit({ cohort: [{ ...scope, engagementId }], mode, includeEconomics: economics }, true)}>{locale === "en" ? "Download current scope (JSON)" : "Télécharger ce périmètre (JSON)"}</Button>
      <div className="grid gap-3 sm:grid-cols-2">{cohort.summary.allocation.map(row => <article className="rounded-lg border border-[var(--dash-border)] p-3" key={row.assigneeId ?? "unassigned"}>
        <h3 className="font-semibold">{person(row.assigneeId)}</h3><p>{t.plan}: {row.plannedMinutes ?? t.unknown}</p><p>{t.recorded}: {row.recordedMinutes ?? t.unknown}</p><p>{t.variance}: {row.effortVarianceMinutes ?? t.unknown}</p>
      </article>)}</div>
      {economics && <div><p>{t.feeHelp}</p>{cohort.summary.economics.map(row => <p key={row.currency}>{row.currency} {row.feeBudget} — {t.hourly}: {row.feePerPlannedHour ?? t.unknown}</p>)}<p>{t.draftRate}</p></div>}
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); save() }}>
        <fieldset disabled={busy || !!pending} className="space-y-3">
          <label className="block">{t.kind}<select aria-label={t.kind} className={field} value={kind} disabled={!!editing} onChange={e => { resetForm(); setKind(e.target.value as PracticePayload["kind"]) }}>
            <option value="EFFORT">{t.EFFORT}</option>{mode === "manager" && <option value="PLAN">{t.PLAN}</option>}{economics && <option value="FEE">{t.FEE}</option>}</select></label>
          {kind === "PLAN" && <label className="block">{t.assignee}<select aria-label={t.assignee} className={field} value={assigneeId} disabled={!!editing} onChange={e => setAssigneeId(e.target.value)}><option value="">{t.unassigned}</option>{cohort.staff.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
          {kind !== "FEE" && <label className="block">{t.minutes}<input className={field} type="number" min={0} max={kind === "EFFORT" ? 1440 : 1000000} step={1} required value={minutes} onChange={e => setMinutes(e.target.value)} /></label>}
          {kind === "EFFORT" && <><label className="block">{t.date}<input className={field} type="date" required value={workDate} onChange={e => setWorkDate(e.target.value)} /></label>
            <label className="block">{t.advisory}<select aria-label={t.advisory} className={field} value={advisory} onChange={e => setAdvisory(e.target.value)}><option value="">{t.none}</option>{cohort.advisoryReferences.map(row => <option key={row.id} value={row.id}>#{row.version} — {referenceState(row.state)}</option>)}</select></label>
            <label className="block">{t.rework}<select aria-label={t.rework} className={field} value={rework} onChange={e => setRework(e.target.value)}><option value="">{t.none}</option>{cohort.reviewReferences.map(row => <option key={row.id} value={row.id}>{row.createdAt.slice(0, 10)} — {referenceState(row.status)}</option>)}</select></label>{cohort.referencesPartial && <p>{t.referenceLimit}</p>}</>}
          {kind === "FEE" && <><label className="block">{t.currency}<select aria-label={t.currency} className={field} value={currency} disabled={!!editing} onChange={e => setCurrency(e.target.value)}>{["XAF", "XOF", "EUR", "USD"].map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="block">{t.amount}<input className={field} inputMode="decimal" placeholder="0.00" pattern="(0|[1-9][0-9]{0,11})\.[0-9]{2}" required value={amount} onChange={e => setAmount(e.target.value)} /></label></>}
          <label className="block">{t.reason}<textarea className={field} required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
          <Button type="submit">{t.save}</Button>{editing && <Button type="button" variant="outline" onClick={resetForm}>{t.cancel}</Button>}
        </fieldset>
      </form>
      <h3 className="font-semibold">{t.history}</h3><p>{t.corrected}: {cohort.summary.corrections}</p>{!cohort.records.length && <p>{t.noRecords}</p>}
      {cohort.records.map(row => <article key={row.id} className="space-y-2 rounded-lg border border-[var(--dash-border)] p-3">
        <p>{t[row.payload.kind]} — {row.payload.kind === "FEE" ? `${row.payload.currency} ${row.payload.amount}` : `${person(row.subjectUserId)}: ${row.payload.minutes} ${t.minutes.toLowerCase()}`} — #{row.version}</p>
        <p>{row.reviewedById ? t.reviewed : t.unreviewed}</p>
        {(row.payload.kind !== "EFFORT" || row.recordedById === desk.actorId) && <Button disabled={busy || !!pending || (row.payload.kind !== "EFFORT" && mode !== "manager")} variant="outline" onClick={() => edit(row)}>{t.correct}</Button>}
        {mode === "manager" && !row.reviewedById && row.actorId !== desk.actorId && row.recordedById !== desk.actorId && <Button disabled={busy || !!pending || reason.trim().length < 10} variant="outline" onClick={() => void submit({ ...scope, engagementId, command: "REVIEW", recordKey: row.recordKey, expectedVersion: row.version, idempotencyKey: crypto.randomUUID(), reason })}>{t.review}</Button>}
        <details><summary className="min-h-11 cursor-pointer py-2">{t.versions}</summary>{cohort.history.filter(item => item.recordKey === row.recordKey).map(item => <p className="break-words" key={item.id}>#{item.version} — {item.createdAt} — {item.actorId} — {item.reason}</p>)}</details>
      </article>)}
    </>}
  </section>
}
