"use client"
import { useEffect, useId, useRef, useState } from "react"
import { getCloseNotificationOperationsAction, retryCloseNotificationAction } from "@/actions/accounting/close-notification-operations.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { CloseNotificationOperations as Operations } from "@/services/accounting/close-notification-operations.service"
const copy = {
  en: { open: "Notification delivery controls", title: "Notification delivery", scope: "Processing status and actual in-app publication are separate. A retry queues the original event for the worker to validate; it does not approve evidence or confirm delivery.", refresh: "Refresh delivery", more: "Older deliveries", empty: "No notification deliveries on this page.", error: "Delivery status could not be loaded. Refresh to retry.", denied: "Current permission is required. Delivery records have been cleared.", loading: "Loading delivery status…", published: "Published in the app (UTC)", unverified: "No verified in-app publication", attempts: "Attempts / current limit", available: "Next attempt eligible (UTC)", requested: "Retry requested. Publication is not yet confirmed; the configured worker must process it.", retry: "Request retry", select: "Review retry", reason: "Reason for retry", explain: "Explain the investigation or resolved operational issue. The original payload, financial records and evidence will remain unchanged.", uncertain: "The result is uncertain. Retry this same request to recover its recorded outcome.", stale: "Delivery changed. Refresh and inspect the latest state before making another request.", cancel: "Cancel", password: "Current password", verify: "Confirm identity", fresh: "Confirm your identity, then submit the same retry request.", verified: "Identity confirmed. Submit the same retry request.", status: { PENDING: "Queued", LOCKED: "Worker processing", DEFERRED: "Deferred", SENT: "Processing acknowledged", FAILED: "Failed", DEAD_LETTER: "Retry limit reached", CANCELLED: "Cancelled" }, guidance: { SOURCE_REVIEW: "Retained source requires investigation. Automatic repair is unavailable.", WORKER_LEASE: "A worker owns this attempt. Expired leases are recovered by the worker.", POLICY_HOLD: "This state requires its owning policy; manual retry is unavailable.", ALREADY_QUEUED: "Already queued for the configured worker.", PUBLISHED: "Publication is retained and processing is acknowledged.", BACKOFF: "Wait until the retry time; automatic backoff remains effective.", RETRY_AVAILABLE: "An authorized retry can be requested after investigation." } },
  fr: { open: "Contrôles de diffusion des notifications", title: "Diffusion des notifications", scope: "Le traitement et la publication réelle dans l’application sont distincts. Une relance remet l’événement original en file pour validation ; elle n’approuve pas les justificatifs et ne confirme pas la diffusion.", refresh: "Actualiser la diffusion", more: "Diffusions plus anciennes", empty: "Aucune diffusion de notification sur cette page.", error: "Diffusion indisponible. Actualisez pour réessayer.", denied: "Une autorisation actuelle est requise. Les données ont été effacées de cet écran.", loading: "Chargement de la diffusion…", published: "Publication dans l’application (UTC)", unverified: "Aucune publication vérifiée dans l’application", attempts: "Tentatives / limite actuelle", available: "Prochaine tentative admissible (UTC)", requested: "Relance demandée. La publication reste à confirmer après traitement par le service configuré.", retry: "Demander la relance", select: "Examiner la relance", reason: "Motif de la relance", explain: "Expliquez l’investigation ou le problème opérationnel résolu. Le contenu original, les écritures et les justificatifs restent inchangés.", uncertain: "Résultat incertain. Renvoyez la même demande pour retrouver son résultat enregistré.", stale: "La diffusion a changé. Actualisez et examinez son état avant une nouvelle demande.", cancel: "Annuler", password: "Mot de passe actuel", verify: "Confirmer l’identité", fresh: "Confirmez votre identité, puis renvoyez la même demande.", verified: "Identité confirmée. Renvoyez la même demande.", status: { PENDING: "En attente", LOCKED: "Traitement en cours", DEFERRED: "Différé", SENT: "Traitement confirmé", FAILED: "Échec", DEAD_LETTER: "Limite de tentatives atteinte", CANCELLED: "Annulé" }, guidance: { SOURCE_REVIEW: "La source conservée nécessite une investigation. Aucune réparation automatique.", WORKER_LEASE: "Une tentative est en cours. Le service récupère les verrous expirés.", POLICY_HOLD: "Cet état dépend de sa politique d’origine. Relance manuelle indisponible.", ALREADY_QUEUED: "Déjà en attente du service configuré.", PUBLISHED: "Publication conservée et traitement confirmé.", BACKOFF: "Attendez l’échéance de relance ; le délai automatique reste applicable.", RETRY_AVAILABLE: "Une relance autorisée peut être demandée après investigation." } },
}
type Command = { periodId: string; outboxId: string; expectedRevision: string; reason: string; correlationId: string }
const button = "dashboard-button-secondary min-h-11 max-w-full whitespace-normal rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
const field = "mt-2 block min-h-11 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 text-[var(--dash-text)]"
const authCopy = { en: { failed: "Identity could not be confirmed. Check your password and try again.", locked: "Too many identity checks. Wait before trying again." }, fr: { failed: "Identité non confirmée. Vérifiez le mot de passe et réessayez.", locked: "Trop de vérifications d’identité. Patientez avant de réessayer." } }
export function CloseNotificationOperations({ periodId, locale = "en" }: { periodId: string; locale?: string }) {
  const t = copy[locale === "fr" ? "fr" : "en"], section = useId(), generation = useRef(0), heading = useRef<HTMLHeadingElement>(null), passwordInput = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false), [data, setData] = useState<Operations | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("")
  const [selected, setSelected] = useState<Operations["items"][number] | null>(null), [reason, setReason] = useState(""), [command, setCommand] = useState<Command | null>(null), [fresh, setFresh] = useState(false), [password, setPassword] = useState("")
  useEffect(() => { const counter = generation; return () => { counter.current++ } }, [])
  useEffect(() => { if (fresh) passwordInput.current?.focus(); else if (open) heading.current?.focus() }, [fresh, open])
  function clear() { setSelected(null); setCommand(null); setReason(""); setFresh(false); setPassword("") }
  async function load(before?: Operations["next"]) {
    const token = ++generation.current; setBusy(true); setData(null); setMessage("")
    try {
      const result = await getCloseNotificationOperationsAction({ periodId, ...(before ? { before } : {}) })
      if (token !== generation.current) return
      if (!result.success) { clear(); setMessage(["FORBIDDEN", "AUTH_REQUIRED"].includes(result.code || "") ? t.denied : t.error) }
      else if (result.data.periodId !== periodId) { clear(); setMessage(t.error) }
      else setData(result.data)
    } catch { if (token === generation.current) setMessage(t.error) }
    finally { if (token === generation.current) setBusy(false) }
  }
  async function submit() {
    if (!selected || busy || fresh || !data?.writable) return
    const pending = command ?? { periodId, outboxId: selected.id, expectedRevision: selected.revision, reason: reason.trim(), correlationId: crypto.randomUUID() }
    setCommand(pending); setBusy(true); setMessage(""); const token = ++generation.current
    try {
      const result = await retryCloseNotificationAction(pending)
      if (token !== generation.current) return
      if (result.success) { clear(); setData(null); setMessage(t.requested) }
      else if (result.code === "FRESH_AUTH_REQUIRED") { setFresh(true); setMessage(t.fresh) }
      else if (["FORBIDDEN", "AUTH_REQUIRED"].includes(result.code || "")) { clear(); setData(null); setMessage(t.denied) }
      else if (["CONFLICT", "BUSINESS_RULE_VIOLATION", "NOT_FOUND", "VALIDATION_ERROR"].includes(result.code || "")) { clear(); setData(null); setMessage(t.stale) }
      else setMessage(t.uncertain)
    } catch { if (token === generation.current) setMessage(t.uncertain) }
    finally { if (token === generation.current) setBusy(false) }
  }
  async function verify() {
    setBusy(true); const token = ++generation.current
    try {
      const result = await stepUpWithPasswordAction({ password }); if (token !== generation.current) return; setPassword("")
      if (result.success) { setFresh(false); setMessage(t.verified) }
      else if (result.code === "AUTH_REQUIRED") { clear(); setData(null); setMessage(t.denied) }
      else setMessage(authCopy[locale === "fr" ? "fr" : "en"][result.code === "RATE_LIMITED" ? "locked" : "failed"])
    }
    catch { if (token === generation.current) setMessage(t.fresh) }
    finally { if (token === generation.current) setBusy(false) }
  }
  return <div className="min-w-0 space-y-3">
    <button type="button" className={button} disabled={busy || !!command} aria-expanded={open} aria-controls={section} onClick={() => { if (open) { generation.current++; setData(null); clear(); setOpen(false) } else { setOpen(true); void load() } }}>{t.open}</button>
    {open && <section id={section} aria-labelledby={`${section}-heading`} aria-busy={busy} className="min-w-0 space-y-3 rounded-lg border border-[var(--dash-border)] p-3">
      <h3 ref={heading} tabIndex={-1} id={`${section}-heading`} className="font-semibold">{t.title}</h3><p>{t.scope}</p>
      <button type="button" className={button} disabled={busy || !!command} onClick={() => { clear(); void load() }}>{t.refresh}</button>
      <p role="status" aria-live="polite">{busy ? t.loading : message}</p>
      {data && !data.items.length && <p>{t.empty}</p>}
      {data && <><ul className="space-y-3">{data.items.map(row => <li key={row.id} className="min-w-0 space-y-2 break-words rounded-lg border border-[var(--dash-border)] p-3">
        <p className="font-semibold">{t.status[row.status]}</p><p className="break-all">{row.requestId || row.id}</p><p>{t.attempts}: {row.attempts} / {row.maxAttempts}</p>
        <p>{row.publishedAt ? <>{t.published}: <time dateTime={row.publishedAt}>{new Date(row.publishedAt).toLocaleString(locale, { timeZone: "UTC" })}</time></> : t.unverified}</p>
        {row.reason === "BACKOFF" && <p>{t.available}: <time dateTime={row.availableAt}>{new Date(row.availableAt).toLocaleString(locale, { timeZone: "UTC" })}</time></p>}
        <p>{t.guidance[row.reason]}</p>{row.retryAvailable && data.writable && <button type="button" className={button} disabled={busy || !!command} onClick={() => { setSelected(row); setReason(""); setMessage("") }}>{t.select}</button>}
      </li>)}</ul>{data.next && <button type="button" className={button} disabled={busy || !!command} onClick={() => { clear(); void load(data.next) }}>{t.more}</button>}</>}
      {selected && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit() }}><p>{t.explain}</p><p className="break-all">{selected.requestId || selected.id}</p><label className="block">{t.reason}<textarea className={field} value={reason} required minLength={10} maxLength={2000} disabled={busy || !!command} onChange={event => setReason(event.target.value)} /></label>
        {fresh && <><label className="block">{t.password}<input ref={passwordInput} className={field} type="password" autoComplete="current-password" value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /></label><button type="button" className={button} disabled={busy || !password} onClick={() => void verify()}>{t.verify}</button></>}
        <div className="flex flex-wrap gap-3"><button type="submit" className={button} disabled={busy || fresh || !data?.writable || reason.trim().length < 10}>{t.retry}</button>{!command && <button type="button" className={button} disabled={busy} onClick={clear}>{t.cancel}</button>}</div>
      </form>}
    </section>}
  </div>
}
