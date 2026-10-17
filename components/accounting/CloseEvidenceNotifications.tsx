"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { getCloseEvidenceNotificationsAction } from "@/actions/accounting/close-evidence-notifications.actions"
import type { CloseEvidenceNotifications as Notifications } from "@/services/accounting/close-evidence-notifications.service"

const copy = {
  en: { title: "Evidence updates", help: "Published in-app updates you can currently access. Publication does not mean someone has read the update. Use the evidence workbench below to act on the current request.", refresh: "Refresh updates", more: "Older updates", loading: "Loading evidence updates…", error: "Updates are unavailable. Refresh to try again.", empty: "No published updates on this page for your current access.", partial: "Some source records need investigation. This list is incomplete.", request: "Evidence requested or reassigned", response: "Evidence response submitted for review", accepted: "Evidence response accepted", reference: "Request", recorded: "Published" },
  fr: { title: "Actualités des justificatifs", help: "Actualités publiées dans l’application auxquelles vous avez actuellement accès. Une publication ne signifie pas que quelqu’un l’a lue. Utilisez l’espace de travail ci-dessous pour traiter la demande actuelle.", refresh: "Actualiser les actualités", more: "Actualités plus anciennes", loading: "Chargement des actualités…", error: "Actualités indisponibles. Actualisez pour réessayer.", empty: "Aucune actualité publiée sur cette page pour vos droits actuels.", partial: "Certains documents sources nécessitent une investigation. Cette liste est incomplète.", request: "Justificatif demandé ou réattribué", response: "Réponse soumise pour examen", accepted: "Réponse acceptée", reference: "Demande", recorded: "Publication" },
}
export function CloseEvidenceNotifications({ periodId, locale = "en" }: { periodId: string; locale?: "en" | "fr" }) {
  const t = copy[locale], [data, setData] = useState<Notifications | null>(null), [loading, setLoading] = useState(true), [failed, setFailed] = useState(false)
  const generation = useRef(0)
  const load = useCallback(async (before?: NonNullable<Notifications["next"]>) => {
    const token = ++generation.current; setLoading(true); setData(null); setFailed(false)
    try {
      const result = await getCloseEvidenceNotificationsAction({ periodId, ...(before ? { before } : {}) })
      if (generation.current !== token) return
      if (!result.success || !result.data || result.data.periodId !== periodId) { setFailed(true); return }
      setData(result.data)
    } catch { if (generation.current === token) setFailed(true) }
    finally { if (generation.current === token) setLoading(false) }
  }, [periodId])
  useEffect(() => { const counter = generation; void load(); return () => { counter.current++ } }, [load])
  const button = "dashboard-button-secondary min-h-11 rounded-lg px-3 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
  return <section aria-labelledby="close-evidence-updates-title" aria-busy={loading} className="min-w-0 space-y-3 border-t border-[var(--dash-border)] pt-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="close-evidence-updates-title" className="font-semibold">{t.title}</h3><button className={button} disabled={loading} onClick={() => void load()} type="button">{t.refresh}</button></div>
    <p className="text-sm text-[var(--dash-text-muted)]">{t.help}</p>
    <div role="status" aria-live="polite">{loading ? t.loading : failed ? t.error : data?.evidenceIssue ? t.partial : !data?.items.length ? t.empty : null}</div>
    {data && <><ul className="space-y-2">{data.items.map(item => <li key={item.id} className="break-words rounded-lg border border-[var(--dash-border)] p-3">
      <p className="font-medium">{item.eventName.endsWith("response_accepted") ? t.accepted : item.eventName.endsWith("response_submitted") ? t.response : t.request}</p>
      <p className="text-sm">{t.reference}: <span className="break-all">{item.requestId}</span></p>
      <p className="text-sm">{t.recorded}: <time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleString(locale)}</time></p>
    </li>)}</ul>{data.next && <button type="button" className={button} disabled={loading} onClick={() => void load(data.next!)}>{t.more}</button>}</>}
  </section>
}
