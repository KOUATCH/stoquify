"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { listOfflineConflictHistoryAction, listOfflineConflictTimelineAction } from "@/actions/pos/offline-review.actions"
import type { OfflineReviewAccess } from "@/hooks/posHooks/useOfflineSync"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Cursor = { at: string; id: string } | null
const buttonClass = "h-auto min-h-10 max-w-full whitespace-normal px-[8px] py-2"
function usePage() {
  const [pages, setPages] = useState<Cursor[]>([null])
  return { cursor: pages[pages.length - 1], hasPrevious: pages.length > 1, next: (cursor: Cursor) => { if (cursor) setPages(current => [...current, cursor]) }, previous: () => setPages(current => current.slice(0, -1)), reset: () => setPages([null]) }
}
function date(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) }

export function OfflineConflictHistory({ access, locationId, terminalId, onSelect, disabled }: { access: OfflineReviewAccess; locationId: string; terminalId: string; onSelect: (id: string) => void; disabled: boolean }) {
  const t = useTranslations("pos.offlineReview"), locale = useLocale(), paging = usePage()
  const [status, setStatus] = useState<"OPEN" | "CLOSED" | "ALL">("OPEN"), [reference, setReference] = useState(""), [search, setSearch] = useState("")
  const query = useQuery({ queryKey: ["pos-offline-history", access.organizationId, access.userId, locationId, terminalId, status, search, paging.cursor], enabled: Boolean(access.canRead && access.organizationId && access.userId), queryFn: async () => {
    const result = await listOfflineConflictHistoryAction({ locationId, terminalId, status, reference: search, cursor: paging.cursor })
    if (!result.success) throw new Error("Offline history unavailable")
    return result.data
  } })
  return <section aria-label={t("historyTitle")} className="min-w-0 space-y-3 [overflow-wrap:anywhere]">
    <h3 className="font-medium">{t("historyTitle")}</h3>
    <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); paging.reset(); setSearch(reference.trim()) }}>
      <div className="min-w-0 space-y-1"><label htmlFor="offline-history-status">{t("historyFilter")}</label><select id="offline-history-status" className="block min-h-10 max-w-full rounded border border-[var(--dash-border-subtle)] bg-[var(--dash-chrome)] p-2" value={status} disabled={disabled} onChange={event => { setStatus(event.target.value as typeof status); paging.reset() }}>
        {(["OPEN", "CLOSED", "ALL"] as const).map(value => <option key={value} value={value}>{t(`historyStatus.${value}`)}</option>)}
      </select></div>
      <div className="min-w-0 flex-1 space-y-1"><label htmlFor="offline-history-reference">{t("historyReference")}</label><Input id="offline-history-reference" value={reference} onChange={event => setReference(event.target.value)} maxLength={200} disabled={disabled} /></div>
      <Button className={buttonClass} type="submit" variant="outline" disabled={disabled}>{t("searchHistory")}</Button>
    </form>
    {query.isFetching ? <p aria-live="polite">{t("historyLoading")}</p> : null}
    {query.isError ? <div role="alert"><p>{t("historyFailed")}</p><Button className={buttonClass} variant="outline" onClick={() => query.refetch()}>{t("retryHistory")}</Button></div> : null}
    {query.data && !query.isError ? <>
      <p>{t("historyCount", { shown: query.data.items.length, total: query.data.total })} · {t("historyObserved", { time: date(query.data.observedAt, locale) })}</p>
      {!query.data.items.length ? <p>{t("historyEmpty")}</p> : <ul className="space-y-2">{query.data.items.map(row => <li key={row.id} className="min-w-0 rounded-md border border-[var(--dash-border-subtle)] p-[8px]">
        <Button className={buttonClass} variant="outline" disabled={disabled || query.isFetching} onClick={() => onSelect(row.id)}>{t("open")} · {row.id.slice(-8)}</Button>
        <p>{t(`historyRowStatus.${row.status}`)} · {row.device} · {date(row.createdAt, locale)}</p><p className="break-all">{row.id}</p>
      </li>)}</ul>}
      <div className="flex flex-wrap gap-2"><Button className={buttonClass} variant="outline" disabled={!paging.hasPrevious || disabled || query.isFetching} onClick={paging.previous}>{t("previousHistory")}</Button><Button className={buttonClass} variant="outline" disabled={!query.data.nextCursor || disabled || query.isFetching} onClick={() => paging.next(query.data.nextCursor)}>{t("olderHistory")}</Button><Button className={buttonClass} variant="outline" disabled={disabled || query.isFetching} onClick={() => { paging.reset(); void query.refetch() }}>{t("refreshHistory")}</Button></div>
    </> : null}
  </section>
}

export function OfflineConflictTimeline({ access, conflictId }: { access: OfflineReviewAccess; conflictId: string }) {
  const t = useTranslations("pos.offlineReview"), locale = useLocale(), paging = usePage()
  const query = useQuery({ queryKey: ["pos-offline-timeline", access.organizationId, access.userId, conflictId, paging.cursor], enabled: Boolean(access.canRead && access.organizationId && access.userId), queryFn: async () => {
    const result = await listOfflineConflictTimelineAction({ conflictId, cursor: paging.cursor })
    if (!result.success) throw new Error("Offline timeline unavailable")
    return result.data
  } })
  return <section aria-label={t("timelineTitle")} className="min-w-0 space-y-2">
    <h4 className="font-medium">{t("timelineTitle")}</h4><p className="text-sm">{t("timelineScope")}</p>
    {query.isFetching ? <p aria-live="polite">{t("historyLoading")}</p> : null}
    {query.isError ? <div role="alert"><p>{t("historyFailed")}</p><Button className={buttonClass} variant="outline" onClick={() => query.refetch()}>{t("retryHistory")}</Button></div> : null}
    {query.data && !query.isError ? <>
      {!query.data.items.length ? <p>{t("timelineEmpty")}</p> : <ol className="space-y-2">{query.data.items.map(row => <li key={row.id} className="min-w-0 rounded-md border border-[var(--dash-border-subtle)] p-[8px]">
        <p>{t(`timelineKind.${row.kind}`)} · {date(row.at, locale)}</p><p className="break-all">{t("timelineActor")}: {row.actorId ?? t("none")}</p>
        <p className="whitespace-pre-wrap">{row.note ?? t("none")}</p><p className="break-all">{t("timelineReference")}: {row.id}</p>
        {row.replayEventId ? <p className="break-all">{t("event")}: {row.replayEventId}</p> : null}{row.postingBatchId ? <p className="break-all">{t("postingReference")} {row.postingBatchId}</p> : null}
      </li>)}</ol>}
      <div className="flex flex-wrap gap-2"><Button className={buttonClass} variant="outline" disabled={!paging.hasPrevious || query.isFetching} onClick={paging.previous}>{t("previousHistory")}</Button><Button className={buttonClass} variant="outline" disabled={!query.data.nextCursor || query.isFetching} onClick={() => paging.next(query.data.nextCursor)}>{t("olderHistory")}</Button></div>
    </> : null}
  </section>
}
