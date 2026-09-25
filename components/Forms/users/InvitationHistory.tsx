"use client"
import { useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { History, RefreshCw } from "lucide-react"
import { getInvitationHistory } from "@/actions/users/getInvitationHistory"
import type { InvitationHistory as HistoryData } from "@/services/users/user-invitation-history.service"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function InvitationHistory({ inviteId, email }: { inviteId: string; email: string }) {
  const t = useTranslations("userInvitations.history"), locale = useLocale()
  const [open, setOpen] = useState(false), [data, setData] = useState<HistoryData | null>(null), [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC"
  async function load(cursor?: string) {
    const request = ++generation.current
    setPending(true); setError(null)
    try {
      const result = await getInvitationHistory({ inviteId, ...(cursor ? { cursor } : {}) })
      if (request !== generation.current) return
      if (result.status !== 200 || !result.data) { if (result.status === 403) setData(null); setError(result.status === 403 ? "denied" : "failed"); return }
      const next = result.data
      setData(previous => cursor && previous ? { ...previous, nextCursor: next.nextCursor, entries: [...previous.entries, ...next.entries.filter(row => !previous.entries.some(existing => existing.id === row.id))] } : next)
    } catch { if (request === generation.current) setError("failed") }
    finally { if (request === generation.current) setPending(false) }
  }
  function changeOpen(value: boolean) {
    setOpen(value)
    if (value) { setData(null); void load() }
    else { generation.current++; setPending(false) }
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button type="button" className="dashboard-button-secondary"><History aria-hidden="true" className="h-4 w-4" />{t("open")}</Button></DialogTrigger>
    <DialogContent closeLabel={t("close")} style={{ position: "fixed", background: "var(--dash-surface)" }} className="dashboard-landing-theme dark flex max-h-[90dvh] w-[calc(100%-2rem)] min-w-0 flex-col overflow-hidden rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)] before:hidden after:hidden motion-reduce:animate-none [&>*]:min-w-0">
      <DialogHeader><DialogTitle>{t("title")}</DialogTitle><DialogDescription className="break-all text-[var(--dash-text-soft)]">{email}</DialogDescription></DialogHeader>
      <p className="rounded-lg border border-[var(--dash-info)] bg-[var(--dash-info-soft)] p-3 text-sm text-[var(--dash-text)]">{t("deliveryDisabled")}</p>
      <Button type="button" className="dashboard-button-secondary justify-self-start" disabled={pending} onClick={() => void load()}><RefreshCw className="h-4 w-4" aria-hidden="true" />{t("refresh")}</Button>
      <div className="min-h-0 space-y-4 overflow-y-auto">
      {pending && <p role="status" className="text-sm text-[var(--dash-text-soft)]">{t("loading")}</p>}
      {error && <div role="alert" className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-3 text-sm text-[var(--dash-text)]"><p>{t(error)}</p>{data && <p className="mt-2">{t("retained")}</p>}</div>}
      {data && <div className="space-y-4" aria-busy={pending}>
        <p className="text-xs text-[var(--dash-text-faint)]">{t("asOf", { date: date(data.asOf) })}</p>
        {data.reviewRequired && <p className="rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-3 text-sm">{t("reviewRequired")}</p>}
        {data.acceptedAt && <p className="text-sm">{t("acceptedAt", { date: date(data.acceptedAt) })}</p>}
        {data.entries.length ? <ol className="space-y-3">{data.entries.map(entry => <li key={entry.id} className="space-y-2 rounded-lg border border-[var(--dash-border-subtle)] p-3 text-sm">
          <h3 className="font-semibold">{t(`kind.${entry.kind}`)}</h3><p className="text-xs text-[var(--dash-text-soft)]">{date(entry.recordedAt)}</p>
          {!entry.evidenceValid ? <p className="text-[var(--dash-warning)]">{t("unverified")}</p> : <>
            <p>{t("actor", { name: entry.actorName ?? t("actorUnavailable") })}</p>
            {entry.roleName && <p className="break-words">{t("role", { name: entry.roleName })}</p>}
            {entry.reason && <p className="whitespace-pre-wrap break-words">{t("reason", { reason: entry.reason })}</p>}
            {entry.delivery ? <div className="border-t border-[var(--dash-border-subtle)] pt-2">
              <p>{t(`delivery.${["PENDING", "LOCKED", "SENT", "FAILED", "DEFERRED", "DEAD_LETTER", "CANCELLED"].includes(entry.delivery.status) ? entry.delivery.status : "UNKNOWN"}`)}</p>
              <p className="text-xs text-[var(--dash-text-soft)]">{t("attempts", { count: entry.delivery.attempts, date: date(entry.delivery.checkedAt) })}</p>
              {entry.delivery.recovery === "review" && <p className="mt-2">{t("operatorReview")}</p>}
            </div> : entry.kind !== "cancelled" && <p>{t("deliveryUnavailable")}</p>}
          </>}
          <details><summary className="cursor-pointer rounded text-[var(--dash-text-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{t("reference")}</summary><p className="mt-1 break-all font-mono text-xs">{entry.id}</p></details>
        </li>)}</ol> : <p role="status" className="text-sm">{t("empty")}</p>}
        {data.nextCursor && <Button type="button" className="dashboard-button-secondary" disabled={pending} onClick={() => void load(data.nextCursor!)}>{t("more")}</Button>}
      </div>}
      </div>
    </DialogContent>
  </Dialog>
}
