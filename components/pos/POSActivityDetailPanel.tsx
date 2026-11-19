import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight, Printer, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { POSActivityDetail, POSActivityPage } from "@/services/pos/pos-activity.types"

import { POSActivityReceiptDelivery } from "./POSActivityReceiptDelivery"
import { posActivityCopy } from "./pos-activity-copy"
import { ActivityCustomer, ActivityStatus, activityHref, activityLinkClass, activityMutedClass, activityPanelClass, activityStatusText, activityStatusTone, posActivityDetailId } from "./pos-activity-presentation"

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className={cn(activityMutedClass, "text-xs")}>{label}</dt>
      <dd className="break-words text-sm font-medium tabular-nums [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-3 border-t border-[var(--dash-border-subtle)] px-3 py-4 sm:px-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

export function POSActivityDetailPanel({ detail, activity, language, path, closeHref, money }: {
  detail: POSActivityDetail
  activity: Pick<POSActivityPage, "date" | "timezone" | "filters">
  language: keyof typeof posActivityCopy
  path: string
  closeHref: string
  money: (value: string) => string
}) {
  const copy = posActivityCopy[language]
  const timestamp = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short", timeZone: activity.timezone })
  const dateParts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: activity.timezone })
  const printQuery = new URLSearchParams({ locationId: detail.location.id })
  if (detail.printMode === "reprint") printQuery.set("orderNumber", detail.reference)
  else if (detail.saleId) printQuery.set("saleId", detail.saleId)
  const printHref = `/${language}/pos-receipt?${printQuery}`
  const canPrint = detail.canReprint && detail.printMode !== null && detail.saleId !== null
  const whatsAppStatus = detail.whatsAppStatus
  const correction = detail.kind === "return" || detail.kind === "void"
  const cash = detail.drawerBalances
  const factsClass = "grid grid-cols-2 gap-x-4 gap-y-3"

  return (
    <section id={posActivityDetailId} tabIndex={-1} aria-labelledby="pos-activity-detail-heading" className={cn(activityPanelClass, "scroll-mt-20")}>
      <header className="grid min-w-0 gap-2 px-3 py-4 sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn(activityMutedClass, "text-sm font-medium")}>{copy.kinds[detail.kind]}</p>
              <ActivityStatus label={activityStatusText(detail.status, copy)} tone={activityStatusTone(detail.status)} />
            </div>
            <h2 id="pos-activity-detail-heading" className="break-words text-lg font-semibold [overflow-wrap:anywhere]">{detail.reference}</h2>
            {detail.kind === "sale" && (
              <dl className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
                <dt className={activityMutedClass}>{copy.customer}</dt>
                <dd className="min-w-0"><ActivityCustomer customer={detail.customer} copy={copy} /></dd>
              </dl>
            )}
            <p className={cn(activityMutedClass, "text-sm")}>
              <time dateTime={detail.occurredAt}>{timestamp.format(new Date(detail.occurredAt))}</time>
            </p>
          </div>
          <Button asChild variant="outline" size="icon" className="dashboard-button-secondary size-11 shrink-0 rounded-lg">
            <Link href={closeHref} prefetch={false} aria-label={copy.close} title={copy.close}>
              <X aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>

      {correction && detail.amount !== null && (
        <Section title={detail.kind === "return" ? copy.refundAmount : copy.voidAmount}>
          <p className="break-words text-lg font-semibold tabular-nums [overflow-wrap:anywhere]">{money(detail.amount)}</p>
        </Section>
      )}

      {detail.kind === "sale" && (
        <Section title={copy.receipt}>
          {canPrint ? (
            <Button asChild variant="outline" className="dashboard-button-secondary min-h-11 justify-self-start whitespace-normal rounded-lg">
              <a href={printHref} target="_blank" rel="noopener noreferrer">
                <Printer aria-hidden="true" />
                {copy.print}
              </a>
            </Button>
          ) : (
            <p className={cn(activityMutedClass, "text-sm")}>{copy.printUnavailable}</p>
          )}
          <div className="space-y-2.5">
            <h4 className="text-sm font-medium">{copy.whatsApp}</h4>
            {whatsAppStatus ? (
              <div className="space-y-1.5">
                <ActivityStatus label={copy.whatsAppStatuses[whatsAppStatus]} tone={activityStatusTone(whatsAppStatus)} />
                <p className={cn(activityMutedClass, "text-sm")}>{copy.whatsAppHelp[whatsAppStatus]}</p>
              </div>
            ) : detail.canSendWhatsApp && detail.saleId ? (
              <POSActivityReceiptDelivery language={language} salesOrderId={detail.saleId} locationId={detail.location.id} />
            ) : (
              <p className={cn(activityMutedClass, "text-sm")}>{copy.whatsAppNotRequested}</p>
            )}
          </div>
        </Section>
      )}

      <Section title={copy.registerContext}>
        <dl className={factsClass}>
          <Fact label={copy.location}>{detail.location.label}</Fact>
          <Fact label={copy.terminal}>{detail.terminal?.label ?? copy.unrecorded}</Fact>
          <Fact label={copy.shift}>{detail.session?.label ?? copy.unrecorded}</Fact>
          <Fact label={copy.cashier}>{detail.cashier ?? copy.unrecorded}</Fact>
          {!correction && detail.amount !== null && !detail.totals && <Fact label={copy.amount}>{money(detail.amount)}</Fact>}
        </dl>
      </Section>

      {detail.lines.length > 0 && (
        <Section title={correction ? copy.originalItems : copy.items}>
          <ul className="divide-y divide-[var(--dash-border-subtle)]">
            {detail.lines.map(line => (
              <li key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-sm font-medium [overflow-wrap:anywhere]">{line.name}</p>
                  <p className={cn(activityMutedClass, "break-words text-xs tabular-nums [overflow-wrap:anywhere]")}>
                    {line.quantity} × {money(line.unitPrice)}{line.sku && ` · ${line.sku}`}
                  </p>
                </div>
                <p className="max-w-28 break-words text-right text-sm font-medium tabular-nums [overflow-wrap:anywhere]">{money(line.total)}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {detail.totals && (
        <Section title={correction ? copy.originalTotals : copy.totals}>
          <dl className={factsClass}>
            <Fact label={copy.subtotal}>{money(detail.totals.subtotal)}</Fact>
            <Fact label={copy.discount}>{money(detail.totals.discount)}</Fact>
            <Fact label={copy.tax}>{money(detail.totals.tax)}</Fact>
            <Fact label={copy.total}><strong>{money(detail.totals.total)}</strong></Fact>
          </dl>
        </Section>
      )}

      {detail.tenders.length > 0 && (
        <Section title={correction ? copy.originalTenders : copy.tenders}>
          <ul className="divide-y divide-[var(--dash-border-subtle)]">
            {detail.tenders.map(tender => (
              <li key={tender.id} className="grid min-w-0 gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{copy.tendersByKind[tender.method as keyof typeof copy.tendersByKind] ?? tender.method}</p>
                  <p className="break-words text-sm font-semibold tabular-nums [overflow-wrap:anywhere]">{money(tender.amount)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ActivityStatus label={activityStatusText(tender.status, copy)} tone={activityStatusTone(tender.status)} />
                  {tender.reference && <span className={cn(activityMutedClass, "break-words text-xs [overflow-wrap:anywhere]")}>{tender.reference}</span>}
                </div>
                {(tender.cashTendered !== null || tender.changeGiven !== null) && (
                  <dl className={factsClass}>
                    {tender.cashTendered !== null && <Fact label={copy.cashTendered}>{money(tender.cashTendered)}</Fact>}
                    {tender.changeGiven !== null && <Fact label={copy.changeGiven}>{money(tender.changeGiven)}</Fact>}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {detail.corrections.length > 0 && (
        <Section title={copy.corrections}>
          <ul className="grid gap-2">
            {detail.corrections.map(link => {
              const occurred = new Date(link.occurredAt)
              const parts = Object.fromEntries(dateParts.formatToParts(occurred).map(part => [part.type, part.value]))
              const businessDate = `${parts.year}-${parts.month}-${parts.day}`
              const href = activityHref(path, activity, { date: businessDate, view: "all", search: "", kind: link.kind, id: link.id })
              return (
                <li key={`${link.kind}:${link.id}`}>
                  <Link href={href} prefetch={false} className={cn(activityLinkClass, "flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[var(--dash-border-subtle)] px-2.5 py-2 hover:bg-[var(--dash-brand-soft)]")}>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium">{copy.kinds[link.kind]}</p>
                      <time dateTime={link.occurredAt} className={cn(activityMutedClass, "block text-xs")}>{timestamp.format(occurred)}</time>
                    </div>
                    <div className="flex min-w-0 items-center justify-end gap-1.5">
                      {link.amount !== null && <span className="max-w-24 break-words text-right text-sm tabular-nums [overflow-wrap:anywhere]">{money(link.amount)}</span>}
                      <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {cash && (
        <Section title={copy.drawerBalances}>
          <dl className={factsClass}>
            {cash.opening !== null && <Fact label={copy.openingFloat}>{money(cash.opening)}</Fact>}
            {cash.expected !== null && <Fact label={copy.expectedCash}>{money(cash.expected)}</Fact>}
            {cash.closing !== null && <Fact label={copy.countedCash}>{money(cash.closing)}</Fact>}
            {cash.variance !== null && <Fact label={copy.cashDifference}>{money(cash.variance)}</Fact>}
            {cash.before !== null && <Fact label={copy.beforeCash}>{money(cash.before)}</Fact>}
            {cash.after !== null && <Fact label={copy.afterCash}>{money(cash.after)}</Fact>}
          </dl>
        </Section>
      )}

    </section>
  )
}
