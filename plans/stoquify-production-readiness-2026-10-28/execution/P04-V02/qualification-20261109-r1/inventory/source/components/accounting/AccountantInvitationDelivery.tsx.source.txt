"use client"
import { useEffect, useRef, useState } from "react"
import { getAccountantInvitationDeliveryAction } from "@/actions/accounting/firm-engagement.actions"
import { firmEngagementCopy } from "./firm-engagement-copy"

type Result = Extract<Awaited<ReturnType<typeof getAccountantInvitationDeliveryAction>>, { success: true }>["data"]
export function AccountantInvitationDelivery({ locale = "en" }: { locale?: "en" | "fr" }) {
  const t = firmEngagementCopy[locale], sequence = useRef(0)
  const [data, setData] = useState<Result | null>(null), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  async function load() {
    const revision = ++sequence.current
    setData(null); setBusy(true); setFailed(false)
    try { const r = await getAccountantInvitationDeliveryAction()
      if (revision === sequence.current) { if (r.success) setData(r.data); else setFailed(true) }
    } catch { if (revision === sequence.current) setFailed(true) }
    finally { if (revision === sequence.current) setBusy(false) }
  }
  useEffect(() => {
    void load()
    const change = () => { ++sequence.current; setData(null); if (!document.hidden) void load() }
    document.addEventListener("visibilitychange", change)
    return () => { ++sequence.current; document.removeEventListener("visibilitychange", change) }
  }, [])
  const label = (v: string) => (t.statuses as Record<string, string>)[v] ?? v
  return <section id="accountant-invitation-delivery" aria-labelledby="invitation-delivery-title" aria-busy={busy} className="dashboard-glass-panel min-w-0 space-y-4 rounded-lg p-5">
    <h2 id="invitation-delivery-title" className="text-xl font-semibold">{t.deliveryTitle}</h2><p>{t.deliveryHelp}</p>
    <button className="dashboard-button-secondary min-h-11 rounded-lg px-3 focus-visible:outline focus-visible:outline-2" disabled={busy} onClick={() => void load()}>{t.refresh}</button>
    {busy && <p role="status">{t.loading}</p>}{failed && <p role="alert">{t.unavailable}</p>}
    {data?.partial && <p role="status">{t.partial}</p>}
    {data && !data.rows.length && <p>{t.deliveryEmpty}</p>}
    <ul className="space-y-3">{data?.rows.map(row => <li key={row.id} className="rounded-lg border border-[var(--dash-border)] p-3">
      <p className="break-all">{row.email} · {t.roles[row.scope]}</p>
      <p>{t.acceptance}: {label(row.acceptance)} · {t.delivery}: {label(row.delivery)}</p>
      <p>{t.attempts}: {row.attempts ?? "—"} / {row.maxAttempts ?? "—"}</p>
      {row.retryAt && <p>{t.retryAt}: {new Date(row.retryAt).toLocaleString(locale)}</p>}
      <p>{t.expiry}: {new Date(row.expiresAt).toLocaleString(locale)}</p>
    </li>)}</ul>
  </section>
}
