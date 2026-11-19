"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { listAdvisoryEngagementsAction, getAdvisoryDeskAction, getAdvisoryPrivateNotesAction, prepareAdvisoryAction, reviewAdvisoryAction,
  deliverAdvisoryAction, exportAdvisoryAction, getAdvisoryOutcomesAction } from "@/actions/accounting/advisory-outcomes.actions"
import { WORKPAPER_KINDS } from "@/services/accounting/review-workpaper.contract"
import type { AdvisoryDesk, AdvisoryWorkspace } from "@/services/accounting/advisory-outcomes.contract"
const copy = {
  en: { title: "Client advisory", help: "Use reviewed workpaper evidence, obtain an independent narrative review and agree actions with the client before publishing.",
    load: "Load advisory engagements", choose: "Select an engagement", refresh: "Refresh advisory pack", empty: "No active authorized engagement is available.",
    loading: "Checking current permissions and reviewed evidence…", error: "Submission not confirmed. Retry the retained submission.",
    denied: "Current permissions or evidence do not allow this action. Refresh and check the client mandate.", stale: "Sources or decisions changed. Refresh and prepare a new draft.",
    saved: "Saved. Current advisory version loaded.", required: "Complete the conclusion, action, owner, due date and decision reason.",
    observed: "Evidence observed (UTC)", confidence: "Based on reviewed supporting evidence; not an audit opinion.", kind: "Observation", conclusion: "Client-facing conclusion", task: "Follow-up action to agree with client", chooseOwner: "Select an action owner", owner: "Client action owner", due: "Due date (UTC)",
    reason: "Decision reason", private: "Private firm note (excluded from client reports)", notes: "Load private firm note", draft: "Save new draft",
    review: "Independently review", changes: "Request changes", agree: "Agree to these actions", deliver: "Publish agreed pack to client", download: "Download delivered version",
    history: "Retained revisions", none: "No advisory revision yet. Start from current reviewed workpapers.", current: "Sources match", staleLabel: "Review required — sources or review changed",
    fresh: "Confirm your password, then explicitly retry the retained submission.", password: "Password", verify: "Verify identity", verified: "Identity verified. Retry when ready.", retry: "Retry submission",
    metrics: "Measure outcomes for this engagement and period", from: "Observation window start (UTC)", to: "Observation window end (exclusive UTC)",
    baseline: "No baseline established. Improvement and active work time are unmeasured. Durations below are elapsed means, not hours worked.",
    touches: "Durable request touches", waiting: "Client waiting (hours)", resolution: "Response to acceptance (hours)", rework: "Changes requested / review decisions",
    close: "First assessment to recorded close (hours)", activation: "Creation to first engagement activation (hours)", coverage: "Measured / eligible", missing: "Unavailable",
    UNPREPARED: "Not prepared", PREPARED: "Prepared", STALE: "Sources changed — review again", UNAVAILABLE: "Current workpaper proof unavailable",
    DRAFT: "Draft", REVIEWED: "Reviewed", CHANGES_REQUESTED: "Changes requested", CLIENT_AGREED: "Client agreed", DELIVERED: "Published to client workspace",
    CASH: "Cash", RECEIVABLES: "Receivables", PAYABLES: "Payables", INVENTORY: "Inventory", source: "Reviewed source", closing: "Reviewed closing balance", reviewed: "Reviewed by", agreed: "Client agreement", published: "Published by",
  },
  fr: { title: "Conseil client", help: "Utilisez les justificatifs du dossier revu, obtenez une revue indépendante des conclusions et convenez des actions avec le client avant publication.",
    load: "Charger les missions de conseil", choose: "Choisir une mission", refresh: "Actualiser le dossier de conseil", empty: "Aucune mission active autorisée n’est disponible.",
    loading: "Vérification des droits et justificatifs revus…", error: "Envoi non confirmé. Réessayez la soumission conservée.",
    denied: "Les droits ou justificatifs actuels ne permettent pas cette action. Actualisez et vérifiez le mandat client.", stale: "Sources ou décisions modifiées. Actualisez et préparez un nouveau brouillon.",
    saved: "Enregistré. Version actuelle chargée.", required: "Complétez la conclusion, l’action, le responsable, l’échéance et le motif.",
    observed: "Justificatifs observés (UTC)", confidence: "Fondé sur des justificatifs revus ; ne constitue pas une opinion d’audit.", kind: "Observation", conclusion: "Conclusion destinée au client", task: "Action à convenir avec le client", chooseOwner: "Choisir un responsable", owner: "Responsable de l’action chez le client", due: "Échéance (UTC)",
    reason: "Motif de la décision", private: "Note privée du cabinet (exclue des rapports client)", notes: "Charger la note privée du cabinet", draft: "Enregistrer un nouveau brouillon",
    review: "Consigner la revue indépendante", changes: "Demander des corrections", agree: "Accepter ces actions", deliver: "Publier le dossier convenu pour le client", download: "Télécharger la version publiée",
    history: "Versions conservées", none: "Aucune version de conseil. Commencez par un dossier de travail actuellement revu.", current: "Sources concordantes", staleLabel: "Nouvelle revue requise — sources ou revue modifiées",
    fresh: "Confirmez votre mot de passe, puis réessayez explicitement la soumission conservée.", password: "Mot de passe", verify: "Vérifier l’identité", verified: "Identité vérifiée. Réessayez lorsque vous êtes prêt.", retry: "Réessayer la soumission",
    metrics: "Mesurer les résultats pour cette mission et cette période", from: "Début d’observation (UTC)", to: "Fin d’observation exclusive (UTC)",
    baseline: "Aucune référence établie. Amélioration et temps de travail effectif non mesurés. Les durées sont des moyennes écoulées, pas des heures travaillées.",
    touches: "Demandes enregistrées", waiting: "Attente client (heures)", resolution: "Réponse à acceptation (heures)", rework: "Corrections demandées / décisions de revue",
    close: "Première évaluation à clôture enregistrée (heures)", activation: "Création à première activation de mission (heures)", coverage: "Mesuré / admissible", missing: "Indisponible",
    UNPREPARED: "Non préparé", PREPARED: "Préparé", STALE: "Sources modifiées — nouvelle revue requise", UNAVAILABLE: "Justificatifs actuels du dossier indisponibles",
    DRAFT: "Brouillon", REVIEWED: "Revu", CHANGES_REQUESTED: "Corrections demandées", CLIENT_AGREED: "Accord du client", DELIVERED: "Publié dans l’espace client",
    CASH: "Trésorerie", RECEIVABLES: "Créances", PAYABLES: "Dettes", INVENTORY: "Stocks", source: "Source revue", closing: "Solde de clôture revu", reviewed: "Revu par", agreed: "Accord du client", published: "Publié par",
  },
}
type Props = { clientOrganizationId?: string; periodId: string; locale?: "en" | "fr" }
type Pending = { kind: "draft" | "review" | "deliver" | "export"; input: Record<string, unknown> }
type Metrics = NonNullable<Awaited<ReturnType<typeof getAdvisoryOutcomesAction>>["data"]>
export function AdvisoryOutcomesDesk(props: Props) { return <AdvisoryForm key={`${props.clientOrganizationId ?? "home"}:${props.periodId}:${props.locale}`} {...props} /> }
function AdvisoryForm({ clientOrganizationId, periodId, locale = "en" }: Props) {
  const t = copy[locale], scope = { clientOrganizationId, periodId }
  const [workspace, setWorkspace] = useState<AdvisoryWorkspace | null>(null), [engagementId, setEngagementId] = useState("")
  const [desk, setDesk] = useState<AdvisoryDesk | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("")
  const [kind, setKind] = useState<typeof WORKPAPER_KINDS[number]>("CASH"), [conclusion, setConclusion] = useState(""), [task, setTask] = useState("")
  const [ownerId, setOwnerId] = useState(""), [due, setDue] = useState(""), [reason, setReason] = useState(""), [privateNote, setPrivateNote] = useState("")
  const [pending, setPending] = useState<Pending | null>(null), [fresh, setFresh] = useState(false), [password, setPassword] = useState("")
  const [metrics, setMetrics] = useState<Metrics | null>(null), [from, setFrom] = useState(""), [to, setTo] = useState("")
  const epoch = useRef(0), notice = useRef<HTMLParagraphElement>(null)
  const clear = () => { setDesk(null); setMetrics(null); setPrivateNote(""); setConclusion(""); setTask(""); setReason(""); setPassword(""); setPending(null); setFresh(false) }
  useEffect(() => {
    const hide = () => { if (document.hidden) { epoch.current++; clear(); setWorkspace(null); setBusy(false) } }
    const pagehide = () => { epoch.current++; clear(); setWorkspace(null); setBusy(false) }
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", pagehide)
    return () => { epoch.current++; document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", pagehide) }
  }, [])
  async function load(id?: string) {
    const generation = ++epoch.current; clear(); setBusy(true); setMessage("")
    try {
      if (!id) {
        setWorkspace(null)
        const result = await listAdvisoryEngagementsAction(scope)
        if (generation !== epoch.current) return
        if (result.success && result.data) { setWorkspace(result.data); setEngagementId("") } else setMessage(t.denied)
      } else {
        const result = await getAdvisoryDeskAction({ ...scope, engagementId: id })
        if (generation !== epoch.current) return
        if (result.success && result.data) setDesk(result.data); else setMessage(t.denied)
      }
    } catch { if (generation === epoch.current) setMessage(t.error) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  async function submit(command: Pending) {
    if (busy || fresh) return
    const generation = epoch.current; setBusy(true); setPending(command); setMessage("")
    try {
      const action = { draft: prepareAdvisoryAction, review: reviewAdvisoryAction, deliver: deliverAdvisoryAction, export: exportAdvisoryAction }[command.kind]
      const result = await action(command.input)
      if (generation !== epoch.current) return
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") { setFresh(true); setMessage(t.fresh) }
        else if (["FORBIDDEN", "NOT_FOUND", "CONFLICT", "BUSINESS_RULE_VIOLATION", "SOD_VIOLATION", "VALIDATION_ERROR", "AUTH_REQUIRED", "IDEMPOTENCY_CONFLICT"].includes(result.code ?? "")) {
          clear(); setMessage(result.code === "CONFLICT" ? t.stale : t.denied)
        } else setMessage(t.error)
        return
      }
      if (result.data && "contentBase64" in result.data) {
        const bytes = Uint8Array.from(atob(result.data.contentBase64), char => char.charCodeAt(0)), url = URL.createObjectURL(new Blob([bytes], { type: result.data.mimeType }))
        const link = document.createElement("a"); link.href = url; link.download = result.data.fileName; link.click(); URL.revokeObjectURL(url)
      }
      setPending(null); setPrivateNote(""); setReason(""); setMetrics(null)
      const refreshed = await getAdvisoryDeskAction({ ...scope, engagementId })
      if (generation !== epoch.current) return
      setDesk(refreshed.success && refreshed.data ? refreshed.data : null); setMessage(refreshed.success ? t.saved : t.denied)
    } catch { if (generation === epoch.current) setMessage(t.error) }
    finally { if (generation === epoch.current) { setBusy(false); notice.current?.focus() } }
  }
  function decide(command: "DRAFT" | "REVIEW" | "CHANGES_REQUESTED" | "AGREE" | "DELIVER") {
    if (!desk) return
    if (reason.trim().length < 10 || (command === "DRAFT" && (conclusion.trim().length < 10 || task.trim().length < 10 || !ownerId || !due))) { setMessage(t.required); notice.current?.focus(); return }
    void submit({ kind: command === "DELIVER" ? "deliver" : ["REVIEW", "CHANGES_REQUESTED"].includes(command) ? "review" : "draft",
      input: { ...scope, engagementId, command, expectedVersion: desk.latestVersion, expectedSourceHash: desk.sourceHash, expectedReviewHash: desk.reviewHash,
        idempotencyKey: crypto.randomUUID(), reason, ...(command === "DRAFT" ? { privateNote, narrative: { conclusions: [{ kind, text: conclusion }], actions: [{ kind, title: task, ownerId, dueAt: new Date(`${due}T23:59:59.999Z`).toISOString() }] } } : {}) } })
  }
  async function verify() {
    const generation = epoch.current; setBusy(true)
    try { const result = await stepUpWithPasswordAction({ password }); if (generation === epoch.current) { setPassword(""); if (result.success) { setFresh(false); setMessage(t.verified) } else setMessage(t.denied) } }
    catch { if (generation === epoch.current) setMessage(t.error) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  async function auxiliary(mode: "notes" | "metrics") {
    const generation = epoch.current; setBusy(true); setMetrics(null); setPrivateNote("")
    try {
      if (mode === "notes") { const r = await getAdvisoryPrivateNotesAction({ ...scope, engagementId }); if (generation !== epoch.current) return; if (r.success && r.data) setPrivateNote(r.data.privateNote); else { clear(); setMessage(t.denied) } }
      else {
        if (!from || !to) { setMessage(t.required); return }
        const r = await getAdvisoryOutcomesAction({ cohort: [{ ...scope, engagementId }], from: new Date(`${from}T00:00:00Z`).toISOString(), to: new Date(`${to}T00:00:00Z`).toISOString() })
        if (generation !== epoch.current) return
        if (r.success && r.data) setMetrics(r.data); else { clear(); setMessage(t.denied) }
      }
    } catch { if (generation === epoch.current) setMessage(t.error) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  const field = "w-full min-h-[44px] rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface)] p-2 text-[var(--dash-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
  const latest = desk?.revisions[0], actionable = desk && latest?.version === desk.latestVersion && latest.freshness === "CURRENT"
  return <section aria-label={t.title} className="space-y-4 rounded-lg border border-[var(--dash-border)] p-4" aria-busy={busy}>
    <h2 className="text-lg font-semibold">{t.title}</h2><p>{t.help}</p>
    <Button disabled={busy} onClick={() => void load()}>{t.load}</Button>
    {workspace && (workspace.engagements.length ? <label className="block">{t.choose}<select aria-label={t.choose} className={field} value={engagementId} disabled={busy} onChange={e => { setEngagementId(e.target.value); if (e.target.value) void load(e.target.value); else { epoch.current++; clear() } }}><option value="">{t.choose}</option>{workspace.engagements.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label> : <p>{t.empty}</p>)}
    {engagementId && <Button variant="outline" disabled={busy} onClick={() => void load(engagementId)}>{t.refresh}</Button>}
    <p ref={notice} tabIndex={-1} role="status" aria-atomic="true">{busy ? t.loading : message}</p>
    {fresh && <div className="space-y-2"><label>{t.password}<input type="password" autoComplete="current-password" className={field} value={password} onChange={e => setPassword(e.target.value)} /></label><Button disabled={busy || !password} onClick={() => void verify()}>{t.verify}</Button></div>}
    {pending && <Button disabled={busy || fresh} onClick={() => void submit(pending)}>{t.retry}</Button>}
    {desk && <>
      <p>{t.source}: {t[desk.workpaperState as "REVIEWED"] ?? desk.workpaperState}</p>
      {!desk.revisions.length && <p>{t.none}</p>}
      <fieldset disabled={busy || fresh || !!pending} className="space-y-3">
        <legend className="sr-only">{t.title}</legend>
        {desk.firmView && <>
          <label className="block">{t.kind}<select aria-label={t.kind} className={field} value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{WORKPAPER_KINDS.map(k => <option key={k} value={k}>{t[k]}</option>)}</select></label>
          <label className="block">{t.conclusion}<textarea className={field} maxLength={2000} value={conclusion} onChange={e => setConclusion(e.target.value)} /></label>
          <label className="block">{t.task}<textarea className={field} maxLength={500} value={task} onChange={e => setTask(e.target.value)} /></label>
          <div className="grid gap-3 md:grid-cols-2"><label>{t.owner}<select aria-label={t.owner} className={field} value={ownerId} onChange={e => setOwnerId(e.target.value)}><option value="">{t.chooseOwner}</option>{desk.owners.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>{t.due}<input className={field} type="date" value={due} onChange={e => setDue(e.target.value)} /></label></div>
          <label className="block">{t.private}<textarea className={field} maxLength={2000} value={privateNote} onChange={e => setPrivateNote(e.target.value)} /></label><Button variant="outline" onClick={() => void auxiliary("notes")}>{t.notes}</Button>
        </>}
        <label className="block">{t.reason}<textarea className={field} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <div className="flex flex-wrap gap-2">
          {desk.firmView ? <><Button disabled={desk.workpaperState !== "REVIEWED"} onClick={() => decide("DRAFT")}>{t.draft}</Button><Button disabled={!actionable || latest?.state !== "DRAFT"} onClick={() => decide("REVIEW")}>{t.review}</Button><Button variant="outline" disabled={!actionable || latest?.state !== "DRAFT"} onClick={() => decide("CHANGES_REQUESTED")}>{t.changes}</Button><Button disabled={!actionable || latest?.state !== "CLIENT_AGREED"} onClick={() => decide("DELIVER")}>{t.deliver}</Button></> : <Button disabled={!actionable || latest?.state !== "REVIEWED"} onClick={() => decide("AGREE")}>{t.agree}</Button>}
        </div>
      </fieldset>
      <h3 className="font-semibold">{t.history}</h3>
      {desk.revisions.map(row => <details key={row.id} open={row.id === latest?.id} className="rounded-lg border border-[var(--dash-border)] p-3 break-words"><summary className="min-h-[44px] cursor-pointer">{row.version} · {t[row.state]} · {row.freshness === "CURRENT" ? t.current : t.staleLabel}</summary>
        <p>{row.document.periodStart} — {row.document.periodEnd} UTC</p><p>{t.observed}: {row.document.observedAt}</p><p>{t.confidence}</p>
        <p>{t.reviewed}: {row.document.reviewedById ?? t.missing} · {row.document.reviewedAt}</p><p>{t.agreed}: {row.document.agreedById ?? t.missing} · {row.document.agreedAt}</p><p>{t.published}: {row.document.deliveredById ?? t.missing} · {row.document.deliveredAt}</p>
        {row.document.observations.map(o => <div key={o.kind}><h4>{t[o.kind]}</h4>{o.accounts.map(a => <p key={`${a.ledgerAccountId}:${a.currency}`} className="tabular-nums">{a.accountCode} · {a.currency} · {t.closing}: {a.balances?.ledger.closingBalance ?? t.missing}<br />{t.source}: {a.evidenceId} / {a.evidenceHash}</p>)}</div>)}
        {row.document.narrative.conclusions.map(c => <p key={c.kind}>{t[c.kind]}: {c.text}</p>)}
        <ul className="list-disc pl-5">{row.document.narrative.actions.map((a, i) => <li key={i}>{a.title} · {t.owner}: {desk.owners.find(o => o.id === a.ownerId)?.name ?? a.ownerId} · {a.dueAt}</li>)}</ul>
        {row.state === "DELIVERED" && <div className="flex flex-wrap gap-2">{(["pdf", "csv", "json"] as const).map(format => <Button key={format} variant="outline" disabled={busy || fresh || !!pending} onClick={() => void submit({ kind: "export", input: { ...scope, engagementId, revisionId: row.id, format } })}>{t.download} {format.toUpperCase()}</Button>)}</div>}
      </details>)}
      {desk.firmView && <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><label>{t.from}<input className={field} type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>{t.to}<input className={field} type="date" value={to} onChange={e => setTo(e.target.value)} /></label></div><Button disabled={busy || !!pending} onClick={() => void auxiliary("metrics")}>{t.metrics}</Button></div>}
      {metrics && <div className="space-y-2"><p>{metrics.fromInclusive} — {metrics.toExclusive} UTC · {metrics.cohortCount}</p><p>{t.baseline}</p>{metrics.cohorts.map(c => <dl key={c.engagementId} className="grid gap-2 sm:grid-cols-2"><dt>{t.touches}</dt><dd>{c.requestTouches.value}</dd><dt>{t.rework}</dt><dd>{c.reviewerRework.changesRequested} / {c.reviewerRework.reviewedDecisions}</dd>{([[t.waiting, c.clientWaiting], [t.resolution, c.responseToResolution], [t.close, c.closeDuration], [t.activation, c.activation]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value.elapsedMs === null ? t.missing : (value.elapsedMs / 3600000).toFixed(2)} · {t.coverage}: {value.measured}/{value.eligible}</dd></div>)}</dl>)}</div>}
    </>}
  </section>
}
