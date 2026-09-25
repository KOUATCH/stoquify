"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, Check, ChevronLeft, ChevronRight, LayoutGrid, List, Search, Wallet } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { dashboardControlClass, dashboardEmptyClass, dashboardPanelClass, dashboardSeverityClass, dashboardValueTone } from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { CashDrawerDashboardDrawer } from "@/services/pos/drawer-dashboard.service"

type Props = {
  drawers: CashDrawerDashboardDrawer[]
  money: (value: number) => string
  formatDateTime: (value: string | null) => string
  netMovement: number
}

export function DrawerCommandCenter({ drawers, money, formatDateTime, netMovement }: Props) {
  const t = useTranslations("cashDrawerDashboard")
  const headingId = useId()
  const detailId = useId()
  const railRef = useRef<HTMLDivElement>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [allDrawers, setAllDrawers] = useState(false)
  const [attentionOnly, setAttentionOnly] = useState(false)
  const needsAttention = (drawer: CashDrawerDashboardDrawer) => drawer.severity === "critical" || drawer.severity === "warning"
  const attentionCount = drawers.filter(needsAttention).length
  const query = search.trim().toLocaleLowerCase()
  const filteredDrawers = drawers.filter((drawer) =>
    (!attentionOnly || needsAttention(drawer)) &&
    [drawer.name, drawer.drawerNumber, drawer.locationName, drawer.terminalName, drawer.terminalNumber]
      .some((value) => value.toLocaleLowerCase().includes(query)),
  )
  const selected = filteredDrawers.find((drawer) => drawer.id === selectedId) ?? filteredDrawers[0]
  const selectedIndex = selected ? filteredDrawers.findIndex((drawer) => drawer.id === selected.id) : -1
  const currentId = selected?.id ?? null

  // Commit the fallback so a removed drawer cannot unexpectedly regain selection later.
  useEffect(() => { setSelectedId(currentId) }, [currentId])

  useEffect(() => {
    if (allDrawers || !currentId) return
    const rail = railRef.current
    const button = buttons.current.get(currentId)
    if (!rail || !button) return
    const left = button.offsetLeft
    const right = left + button.offsetWidth
    if (left < rail.scrollLeft || right > rail.scrollLeft + rail.clientWidth) {
      // Only scroll the rail, never the page or keyboard focus. No animated motion.
      rail.scrollTo({ left: Math.max(0, left - 4), behavior: "instant" })
    }
  }, [currentId, selectedIndex, allDrawers])

  function selectAdjacent(index: number, focus = false) {
    const drawer = filteredDrawers[index]
    if (!drawer) return
    setSelectedId(drawer.id)
    if (focus) buttons.current.get(drawer.id)?.focus({ preventScroll: true })
  }

  function clearFilters() {
    setSearch("")
    setAttentionOnly(false)
  }

  return (
    <Card id="drawers" className={cn(dashboardPanelClass, "min-w-0 scroll-mt-24 overflow-hidden")}>
      <CardHeader className="gap-2 p-4 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet aria-hidden="true" className="h-4 w-4 text-[var(--dash-brand-strong)]" />
              {t("sections.drawerHealth")}
            </CardTitle>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t("commandCenter.description")}</p>
          </div>
          <span className="rounded-full border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 py-1.5 text-xs tabular-nums text-[var(--dash-text-soft)]">{t("summary.netMovement", { amount: money(netMovement) })}</span>
        </div>
        {drawers.length > 0 && <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-xs text-[var(--dash-text-soft)]">{t("commandCenter.total", { count: drawers.length })}</span>
          {attentionCount > 0 && <Button
            variant="outline" size="sm" aria-pressed={attentionOnly}
            className={cn(dashboardSeverityClass("warning"), "h-auto min-h-9 whitespace-normal text-left")}
            onClick={() => { setAttentionOnly(!attentionOnly); setSearch("") }}
          >
            <AlertTriangle aria-hidden="true" />{t("commandCenter.attention", { count: attentionCount })}
          </Button>}
          <Button variant="ghost" size="sm" className="min-h-9" aria-pressed={allDrawers} onClick={() => setAllDrawers(!allDrawers)}>
            {allDrawers ? <LayoutGrid aria-hidden="true" /> : <List aria-hidden="true" />}
            {allDrawers ? t("commandCenter.cards") : t("commandCenter.allDrawers")}
          </Button>
        </div>}
      </CardHeader>
      <CardContent className="min-w-0 p-4 pt-0">
        {drawers.length === 0 ? <div className={dashboardEmptyClass}>{t("empty.drawers")}</div> : <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(0,2fr)_minmax(210px,1fr)]">
          <div className="min-w-0 space-y-3 rounded-xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 basis-36">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--dash-text-soft)]" />
              <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                aria-label={t("commandCenter.search")} placeholder={t("commandCenter.search")}
                className={cn(dashboardControlClass, "h-9 pl-9")} />
            </div>
            {(search || attentionOnly) && <Button variant="ghost" size="sm" className="min-h-9" onClick={clearFilters}>{t("commandCenter.clear")}</Button>}
            <div className="flex items-center gap-1.5">
              <span role="status" className="mr-1 text-xs font-medium tabular-nums text-[var(--dash-text-soft)]">
                {t("commandCenter.position", { current: selectedIndex + 1, count: filteredDrawers.length })}
              </span>
              <Button variant="outline" size="icon" className={cn(dashboardControlClass, "h-9 w-9 rounded-full")} aria-label={t("commandCenter.previous")}
                disabled={selectedIndex <= 0} onClick={() => selectAdjacent(selectedIndex - 1)}><ChevronLeft aria-hidden="true" /></Button>
              <Button variant="outline" size="icon" className={cn(dashboardControlClass, "h-9 w-9 rounded-full")} aria-label={t("commandCenter.next")}
                disabled={selectedIndex < 0 || selectedIndex === filteredDrawers.length - 1} onClick={() => selectAdjacent(selectedIndex + 1)}><ChevronRight aria-hidden="true" /></Button>
            </div>
          </div>

          {filteredDrawers.length === 0 ? <div className={dashboardEmptyClass}>
            <p>{t("commandCenter.noResults")}</p>
            <Button variant="link" className="mt-2 text-[var(--dash-brand-strong)]" onClick={clearFilters}>{t("commandCenter.clear")}</Button>
          </div> : <>
            <div ref={railRef} role="group" aria-label={t("commandCenter.drawerSelection")}
              className={cn("relative min-w-0 gap-3 p-1", allDrawers
                ? "grid max-h-[320px] overflow-y-auto [scrollbar-width:thin]"
                : "flex items-start snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin]")}
            >
              {filteredDrawers.map((drawer, index) => <button
                key={drawer.id} type="button"
                ref={(node) => { if (node) buttons.current.set(drawer.id, node); else buttons.current.delete(drawer.id) }}
                aria-pressed={drawer.id === currentId} aria-controls={detailId}
                aria-label={t("commandCenter.select", { name: drawer.name, location: drawer.locationName })}
                onClick={() => setSelectedId(drawer.id)}
                onKeyDown={(event) => {
                  const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? filteredDrawers.length - 1 : null
                  if (next !== null) { event.preventDefault(); selectAdjacent(next, true) }
                }}
                style={{ background: drawer.id === currentId
                  ? "linear-gradient(145deg, var(--dash-brand-soft), var(--dash-surface-raised) 72%)"
                  : "linear-gradient(145deg, var(--dash-surface-raised), var(--dash-surface) 80%)" }}
                className={cn("group relative min-w-0 overflow-hidden rounded-xl border text-left outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dash-surface)]",
                  allDrawers ? "grid grid-cols-2 gap-x-3 gap-y-2 p-3" : "w-[78%] shrink-0 snap-start p-2.5 md:w-[calc((100%-12px)/2)]",
                  drawer.id === currentId ? "border-[var(--dash-brand-strong)] shadow-[0_12px_30px_-20px_var(--dash-brand-strong)]" : "border-[var(--dash-border-subtle)] hover:border-[var(--dash-text-soft)]")}
              >
                <span aria-hidden="true" className={cn("absolute inset-x-3 top-0 h-px", drawer.id === currentId ? "bg-[var(--dash-brand-strong)]" : "bg-[var(--dash-border)]")} />
                <div className={cn("min-w-0", allDrawers && "col-span-2")}>
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug tracking-tight" title={drawer.name}>{drawer.name}</span>
                    {drawer.id === currentId && <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--dash-brand-strong)] text-[var(--dash-surface)]"><Check aria-hidden="true" className="h-3 w-3" /></span>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--dash-text-soft)]" title={`${drawer.locationName} / ${drawer.terminalName}`}>{drawer.locationName}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--dash-text-muted)]">
                      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", drawer.isOpen ? "bg-[var(--dash-success)]" : "bg-[var(--dash-text-soft)]")} />
                      {drawer.isOpen ? t("drawer.open") : t("drawer.closed")}
                    </span>
                    {needsAttention(drawer) && <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs", dashboardSeverityClass(drawer.severity))}>
                      <AlertTriangle aria-hidden="true" className="h-3 w-3" />{t(`commandCenter.severity.${drawer.severity}`)}
                    </span>}
                  </div>
                </div>
                <div className={cn("min-w-0", !allDrawers && "mt-2")}>
                  <span className="block text-xs text-[var(--dash-text-soft)]">{t("drawer.current")}</span>
                  <span className={cn("mt-0.5 block break-words font-semibold tracking-tight tabular-nums", allDrawers ? "text-sm" : "text-lg xl:text-xl")}>{money(drawer.currentBalance)}</span>
                </div>
                <div className={cn("min-w-0 text-xs", allDrawers ? "text-right" : "mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-[var(--dash-border-subtle)] pt-1.5")}>
                  <span className="text-[var(--dash-text-soft)]">{t("drawer.variance")}</span>{" "}
                  <span className={cn("break-words font-medium tabular-nums", allDrawers && "block", dashboardValueTone(drawer.variance))}>{money(drawer.variance)}</span>
                </div>
              </button>)}
            </div>
          </>}
          </div>

            {selected && <section id={detailId} aria-labelledby={headingId} className="min-w-0 rounded-xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-3 xl:p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-brand-strong)]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--dash-brand-strong)]" />{t("commandCenter.selected")}</p>
                <Badge variant="outline" className={dashboardSeverityClass(selected.isOpen ? "success" : "info")}>
                  {selected.isOpen ? t("drawer.open") : t("drawer.closed")}
                </Badge>
              </div>
              <h3 id={headingId} className="break-words text-sm font-semibold leading-snug">{selected.name}</h3>
              <p className="mt-1 break-words text-xs text-[var(--dash-text-soft)]">{selected.locationName} / {selected.terminalName}</p>
              <dl className="my-3 grid grid-cols-2 gap-3">
                <div className="col-span-2 min-w-0 border-b border-[var(--dash-border-subtle)] pb-3">
                  <dt className="text-xs text-[var(--dash-text-soft)]">{t("drawer.current")}</dt>
                  <dd className="mt-1 break-words text-xl font-semibold tracking-tight tabular-nums">{money(selected.currentBalance)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-[var(--dash-text-soft)]">{t("drawer.expected")}</dt>
                  <dd className="mt-1 break-words text-sm font-medium tabular-nums">{money(selected.expectedBalance)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-[var(--dash-text-soft)]">{t("drawer.variance")}</dt>
                  <dd className={cn("mt-1 break-words text-sm font-medium tabular-nums", dashboardValueTone(selected.variance))}>{money(selected.variance)}</dd>
                  {needsAttention(selected) && <p className="mt-1 text-xs">{t(`commandCenter.severity.${selected.severity}`)}</p>}
                </div>
              </dl>
              <div className="grid gap-3 border-t border-[var(--dash-border-subtle)] pt-3">
                <dl className="space-y-2 text-xs">
                  {[
                    [t("drawer.session"), selected.activeSessionNumber ?? t("common.notAvailable")],
                    [t("drawer.cashier"), selected.activeCashierName ?? t("common.notAvailable")],
                    [t("drawer.lastEvent"), formatDateTime(selected.lastEventAt)],
                  ].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                    <dt className="text-[var(--dash-text-soft)]">{label}</dt><dd className="min-w-0 break-words font-medium">{value}</dd>
                  </div>)}
                </dl>
                <div>
                  <p className="mb-2 text-xs text-[var(--dash-text-soft)]">{t("commandCenter.periodMovement")}</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    {[
                      [t("metrics.cashSales"), selected.periodCashSales],
                      [t("legend.cashIn"), selected.periodCashIn],
                      [t("legend.cashOut"), selected.periodCashOut],
                      [t("summary.refunds"), selected.periodRefunds],
                    ].map(([label, value]) => <div key={label} className="min-w-0">
                      <dt className="text-xs text-[var(--dash-text-soft)]">{label}</dt><dd className="mt-1 break-words font-medium tabular-nums">{money(Number(value))}</dd>
                    </div>)}
                  </dl>
                </div>
              </div>
            </section>}
        </div>}
      </CardContent>
    </Card>
  )
}
