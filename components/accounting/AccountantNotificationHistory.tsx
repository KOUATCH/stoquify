"use client"
import { useEffect, useId, useRef, useState } from "react"
import { getAccountantNotificationHistoryAction } from "@/actions/accounting/accountant-work-desk.actions"
import type { AccountantNotificationHistory as History } from "@/services/accounting/accountant-notification-history.service"
const copy = {
  en: { open: "Notification history", close: "Close notification history", title: "Published notification history", scope: "Historical in-app publications, including accepted and closed work. They do not establish current readiness, personal receipt or permission to act.", refresh: "Latest publications", more: "Older publications", loading: "Loading authorized history…", error: "History could not be loaded. Retry with latest publications.", empty: "No publications on this page.", partial: "Some retained source records need investigation. This page is incomplete.", request: "Evidence requested or reassigned", response: "Response submitted for review", accepted: "Response accepted", reference: "Request", period: "Period", at: "Published (UTC)" },
  fr: { open: "Historique des notifications", close: "Fermer l’historique des notifications", title: "Historique des notifications publiées", scope: "Publications historiques dans l’application, y compris les travaux acceptés et clôturés. Elles ne prouvent ni la préparation actuelle, ni leur lecture, ni l’autorisation d’agir.", refresh: "Dernières publications", more: "Publications plus anciennes", loading: "Chargement de l’historique autorisé…", error: "Historique indisponible. Réessayez avec les dernières publications.", empty: "Aucune publication sur cette page.", partial: "Certains documents sources nécessitent une investigation. Cette page est incomplète.", request: "Justificatif demandé ou réattribué", response: "Réponse soumise pour examen", accepted: "Réponse acceptée", reference: "Demande", period: "Période", at: "Publication (UTC)" },
}
const button = "dashboard-button-secondary min-h-11 max-w-full whitespace-normal rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
export function AccountantNotificationHistory({ clientOrganizationId, clientName, locale, disabled, onDenied }: { clientOrganizationId: string; clientName: string; locale: "en" | "fr"; disabled?: boolean; onDenied: () => void }) {
  const t = copy[locale], sectionId = useId(), trigger = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null), generation = useRef(0)
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [failed, setFailed] = useState(false), [data, setData] = useState<History | null>(null)
  useEffect(() => { const counter = generation; return () => { counter.current++ } }, [])
  useEffect(() => { if (open) heading.current?.focus() }, [open])
  async function load(cursor?: string) {
    const token = ++generation.current; setLoading(true); setData(null); setFailed(false)
    try {
      const result = await getAccountantNotificationHistoryAction({ clientOrganizationId, ...(cursor ? { cursor } : {}) })
      if (token !== generation.current) return
      if (!result.success) {
        if (["FORBIDDEN", "AUTH_REQUIRED"].includes(result.code || "")) { onDenied(); return }
        setFailed(true); return
      }
      if (result.data.clientOrganizationId !== clientOrganizationId) { setFailed(true); return }
      setData(result.data)
    } catch { if (token === generation.current) setFailed(true) }
    finally { if (token === generation.current) setLoading(false) }
  }
  function toggle() {
    if (open) { generation.current++; setData(null); setLoading(false); setOpen(false); trigger.current?.focus() }
    else { setOpen(true); void load() }
  }
  return <div className="min-w-0 space-y-3">
    <button type="button" ref={trigger} className={button} disabled={disabled} aria-expanded={open} aria-controls={sectionId} aria-label={`${open ? t.close : t.open}: ${clientName}`} onClick={toggle}>{open ? t.close : t.open}</button>
    {open && <section id={sectionId} aria-labelledby={`${sectionId}-heading`} aria-busy={loading} className="min-w-0 space-y-3 rounded-lg border border-[var(--dash-border)] p-3">
      <h4 id={`${sectionId}-heading`} ref={heading} tabIndex={-1} className="font-semibold">{t.title}</h4><p className="text-sm text-[var(--dash-text-soft)]">{t.scope}</p>
      <button type="button" className={button} disabled={disabled || loading} onClick={() => void load()}>{t.refresh}</button>
      <div role="status" aria-live="polite">{loading ? t.loading : failed ? t.error : data?.incomplete ? t.partial : !data?.items.length ? t.empty : null}</div>
      {data && <><ul className="space-y-2">{data.items.map(item => <li key={item.id} className="min-w-0 break-words rounded-lg border border-[var(--dash-border)] p-3">
        <p className="font-medium">{item.eventName.endsWith("response_accepted") ? t.accepted : item.eventName.endsWith("response_submitted") ? t.response : t.request}</p>
        <p>{t.period}: {item.periodName}</p><p>{t.reference}: <span className="break-all">{item.requestId}</span></p>
        <p>{t.at}: <time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleString(locale, { timeZone: "UTC" })}</time></p>
      </li>)}</ul>{data.nextCursor && <button type="button" className={button} disabled={disabled || loading} onClick={() => void load(data.nextCursor!)}>{t.more}</button>}</>}
    </section>}
  </div>
}
