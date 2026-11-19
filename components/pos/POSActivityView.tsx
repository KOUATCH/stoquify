import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft, ChevronRight, CircleAlert, Clock3, DoorClosed, DoorOpen, ReceiptText, RotateCcw, SearchX, Wallet, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { POSActivityDetail, POSActivityPage, POSActivityRow } from "@/services/pos/pos-activity.types"

import { POSActivityDetailPanel } from "./POSActivityDetailPanel"
import { POSActivityFilters } from "./POSActivityFilters"
import { posActivityCopy, type POSActivityCopy } from "./pos-activity-copy"
import { ActivityCustomer, ActivityStatus, activityHref, activityLinkClass, activityMutedClass, activityPanelClass, activityStatusText, activityStatusTone, posActivityDetailId } from "./pos-activity-presentation"

const eventIcons = {
  sale: ReceiptText,
  return: RotateCcw,
  void: XCircle,
  shift_open: DoorOpen,
  shift_close: DoorClosed,
  drawer: Wallet,
}

function ActivityRow({ row, href, selected, copy, time, money }: {
  row: POSActivityRow
  href: string
  selected: boolean
  copy: POSActivityCopy
  time: Intl.DateTimeFormat
  money: (value: string) => string
}) {
  const EventIcon = eventIcons[row.kind]
  const timeText = time.format(new Date(row.occurredAt))
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        aria-current={selected ? "true" : undefined}
        className={cn(
          activityLinkClass,
          "group grid min-h-20 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-none px-3 py-3 hover:bg-[var(--dash-brand-soft)] focus-visible:relative focus-visible:z-10 focus-visible:ring-inset sm:px-4",
          selected && "bg-[var(--dash-brand-soft)]",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-info)] sm:inline-flex">
            <EventIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold">{copy.kinds[row.kind]}</span>
              <time dateTime={row.occurredAt} className={cn(activityMutedClass, "text-xs tabular-nums")}>{timeText}</time>
            </div>
            <p className="break-words text-sm font-medium [overflow-wrap:anywhere]">{row.reference}</p>
            {row.kind === "sale" && (
              <p className="min-w-0 text-sm leading-5"><ActivityCustomer customer={row.customer} copy={copy} /></p>
            )}
            <p className={cn(activityMutedClass, "flex flex-wrap gap-x-1.5 text-xs leading-5 [overflow-wrap:anywhere]")}>
              <span>{row.location.label}</span>
              {row.terminal && <span>· {row.terminal.label}</span>}
              {row.cashier && <span>· {row.cashier}</span>}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-1.5 sm:gap-2.5">
          <div className="flex max-w-32 flex-col items-end gap-1 text-right sm:max-w-44">
            {row.amount !== null && <span className="break-words text-sm font-semibold tabular-nums [overflow-wrap:anywhere]">{money(row.amount)}</span>}
            <ActivityStatus label={activityStatusText(row.status, copy)} tone={activityStatusTone(row.status)} />
            {row.whatsAppStatus && <span className={cn(activityMutedClass, "text-xs leading-4")}>{copy.whatsApp} · {copy.whatsAppStatuses[row.whatsAppStatus]}</span>}
          </div>
          <ChevronRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--dash-text-soft)] group-hover:text-[var(--dash-text)]" />
        </div>
      </Link>
    </li>
  )
}

export function POSActivityView({ locale, activity, detail, detailError, currentCursor, shiftSummary, attention, attentionActive = false }: {
  locale: string
  activity: POSActivityPage
  detail?: POSActivityDetail | null
  detailError?: boolean
  currentCursor?: string
  shiftSummary?: ReactNode
  attention?: ReactNode
  attentionActive?: boolean
}) {
  const language = locale === "fr" ? "fr" : "en"
  const copy = posActivityCopy[language]
  const localDate = new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" })
  const time = new Intl.DateTimeFormat(language, { timeStyle: "short", timeZone: activity.timezone })
  const currency = new Intl.NumberFormat(language, { style: "currency", currency: activity.currency })
  const money = (value: string) => currency.format(Number(value))
  const path = `/${language}/dashboard/pos/activity`
  const { filters } = activity
  const title = activity.date === activity.today ? copy.title : copy.historyTitle
  const selectedHref = (row: Pick<POSActivityRow, "kind" | "id">) =>
    activityHref(path, activity, { cursor: currentCursor, kind: row.kind, id: row.id })
  const closeHref = activityHref(path, activity, { cursor: currentCursor })
  const searchResetHref = activityHref(path, activity, { search: "" })
  const receiptCriteria = filters.view === "receipts" ? [
    filters.total != null ? `${copy.receiptTotal} ${money(filters.total)}` : null,
    filters.fromTime ? `${copy.fromTime} ${filters.fromTime}` : null,
    filters.toTime ? `${copy.toTime} ${filters.toTime}` : null,
  ].filter(criterion => criterion !== null) : []
  const attentionLink = (className: string) => activity.accessMode === "manager" && (
    <Link href={activityHref(path, activity, { view: "attention" })} prefetch={false} aria-current={attentionActive ? "page" : undefined}
      className={cn(activityLinkClass, "min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-[var(--dash-brand-soft)]", attentionActive ? "bg-[var(--dash-brand-soft)]" : activityMutedClass, className)}>
      <CircleAlert aria-hidden="true" className="size-4" />
      {copy.needsAttention}
    </Link>
  )
  const detailExpanded = detail != null || detailError

  return (
    <div className="dashboard-landing-theme dark min-h-full bg-[var(--dash-canvas)] text-[var(--dash-text)] [color-scheme:dark]" lang={language}>
      <div className="relative mx-auto grid w-full min-w-0 max-w-7xl gap-5 px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
        <header className="grid min-w-0 gap-2">
          <Link href={`/${language}/dashboard/pos`} prefetch={false} className={cn(activityLinkClass, "inline-flex min-h-11 items-center gap-2 justify-self-start text-sm font-medium text-[var(--dash-text-soft)] hover:text-[var(--dash-text)]")}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            {copy.back}
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              <p className={cn(activityMutedClass, "text-sm sm:text-base")}>{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 py-2 text-sm">
              <Clock3 className="size-4 shrink-0 text-[var(--dash-info)]" aria-hidden="true" />
              <time dateTime={activity.date} className="font-medium">{localDate.format(new Date(activity.date))}</time>
              <span className={cn(activityMutedClass, "text-xs")} aria-label={`${copy.timezone} ${activity.timezone}`} title={copy.timezone}>{activity.timezone}</span>
            </div>
          </div>
        </header>

        <section className={cn(activityPanelClass, "grid gap-4 p-3 sm:p-4")} aria-label={copy.filters}>
          <POSActivityFilters
            key={JSON.stringify([activity.date, filters, attentionActive])}
            activity={activity}
            locale={language}
            path={path}
            attention={attentionActive}
          />
          {receiptCriteria.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={copy.activeReceiptCriteria}>
              {receiptCriteria.map(criterion => (
                <span key={criterion} className="rounded-md border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] px-2 py-1 text-sm tabular-nums">{criterion}</span>
              ))}
              <Link href={activityHref(path, activity, { total: null, fromTime: null, toTime: null })} prefetch={false}
                className={cn(activityLinkClass, "inline-flex min-h-11 items-center px-2 text-sm text-[var(--dash-info)] hover:underline")}>
                {copy.clearReceiptCriteria}
              </Link>
            </div>
          )}
          {attentionLink("inline-flex w-fit border border-[var(--dash-border-subtle)] xl:hidden")}
        </section>

        <nav aria-label={copy.views} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap gap-2 rounded-xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-1">
            {([{ view: "all", label: copy.all }, { view: "receipts", label: copy.receipts }] as const).map(tab => (
              <Link
                key={tab.view}
                href={activityHref(path, activity, { view: tab.view })}
                prefetch={false}
                aria-current={!attentionActive && filters.view === tab.view ? "page" : undefined}
                className={cn(activityLinkClass, "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-[var(--dash-brand-soft)]", !attentionActive && filters.view === tab.view ? "bg-[var(--dash-brand-soft)]" : activityMutedClass)}
              >
                {tab.view === "receipts" && <ReceiptText aria-hidden="true" className="size-4" />}
                {tab.label}
              </Link>
            ))}
            {attentionLink("hidden xl:inline-flex")}
          </div>
          {activity.date !== activity.today && (
            <Button asChild variant="outline" className="dashboard-button-secondary min-h-11 rounded-lg">
              <Link href={activityHref(path, activity, { date: activity.today, sessionId: null, view: attentionActive ? "attention" : filters.view })} prefetch={false}>{copy.today}</Link>
            </Button>
          )}
        </nav>

        {!attentionActive && filters.view === "all" && shiftSummary}
        {attentionActive ? attention : <div className={cn("grid min-w-0 items-start gap-4", detailExpanded && "xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]")}>
          <section aria-labelledby="pos-activity-results-heading" className={cn(activityPanelClass, "overflow-hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dash-border-subtle)] px-3 py-3 sm:px-4">
              <h2 id="pos-activity-results-heading" className="min-w-0 text-base font-semibold">{filters.view === "receipts" ? copy.receipts : copy.activity}</h2>
              {filters.search && (
                <Link href={searchResetHref} prefetch={false} className={cn(activityLinkClass, "inline-flex min-h-11 items-center text-sm font-medium text-[var(--dash-info)] hover:underline")}>
                  {copy.clearSearch}
                </Link>
              )}
            </div>
            {activity.rows.length > 0 ? (
              <ol className="divide-y divide-[var(--dash-border-subtle)]">
                {activity.rows.map(row => (
                  <ActivityRow
                    key={`${row.kind}:${row.id}`}
                    row={row}
                    href={selectedHref(row)}
                    selected={detail?.id === row.id && detail?.kind === row.kind}
                    copy={copy}
                    time={time}
                    money={money}
                  />
                ))}
              </ol>
            ) : (
              <div className="grid justify-items-start gap-2 px-3 py-5 sm:px-4">
                <SearchX aria-hidden="true" className="size-5 text-[var(--dash-info)]" />
                <p className="text-sm font-semibold">{filters.view === "receipts" ? copy.emptyReceipts : copy.empty}</p>
                <p className={cn(activityMutedClass, "text-sm")}>{receiptCriteria.length ? copy.emptyReceiptCriteria : filters.search ? copy.emptySearch : copy.emptyHelp}</p>
              </div>
            )}
            {filters.view === "all" && (
              <div className="border-t border-[var(--dash-border-subtle)] px-3 sm:px-4">
                <Link href={`/${language}/dashboard/pos`} prefetch={false} className={cn(activityLinkClass, "inline-flex min-h-11 items-center py-2 text-sm text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] hover:underline")}>
                  {copy.offlineHelp}
                </Link>
              </div>
            )}
            {(currentCursor || activity.nextCursor) && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--dash-border-subtle)] px-3 py-2.5 sm:px-4">
                {currentCursor && (
                  <Button variant="outline" asChild className="dashboard-button-secondary min-h-11 rounded-lg">
                    <Link href={activityHref(path, activity)} prefetch={false}>{copy.first}</Link>
                  </Button>
                )}
                {activity.nextCursor && (
                  <Button variant="outline" asChild className="dashboard-button-secondary min-h-11 rounded-lg">
                    <Link href={activityHref(path, activity, { cursor: activity.nextCursor })} prefetch={false}>
                      {copy.next}
                      <ChevronRight aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </section>
          {detail ? (
            <POSActivityDetailPanel
              key={`${detail.kind}:${detail.id}`}
              activity={activity}
              detail={detail}
              language={language}
              path={path}
              closeHref={closeHref}
              money={money}
            />
          ) : detailError ? (
            <section id={posActivityDetailId} tabIndex={-1} className={cn(activityPanelClass, "grid scroll-mt-20 gap-2 p-4")} aria-labelledby="pos-activity-detail-heading">
              <h2 id="pos-activity-detail-heading" className="font-semibold">{copy.detailUnavailable}</h2>
              <Button asChild variant="outline" className="dashboard-button-secondary min-h-11 justify-self-start rounded-lg">
                <Link href={closeHref} prefetch={false}>{copy.close}</Link>
              </Button>
            </section>
          ) : null}
        </div>}
      </div>
    </div>
  )
}

