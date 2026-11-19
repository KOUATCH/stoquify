"use client"

import { useId, useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { POSActivityPage } from "@/services/pos/pos-activity.types"

import { posActivityCopy } from "./pos-activity-copy"

const selectClass = "dashboard-control min-h-11 w-full min-w-0 rounded-lg bg-[var(--dash-surface)] px-3 text-sm"
const labelClass = "grid min-w-0 content-start gap-1.5 text-sm font-medium"
const criteriaInputClass = "dashboard-control min-h-11 w-full min-w-0 rounded-lg bg-[var(--dash-surface)]"

export function POSActivityFilters({ activity, locale, path, attention = false }: {
  activity: Pick<POSActivityPage, "date" | "today" | "filters" | "options" | "currency">
  locale: keyof typeof posActivityCopy
  path: string
  attention?: boolean
}) {
  const copy = posActivityCopy[locale]
  const { filters, options } = activity
  const [locationId, setLocation] = useState(filters.locationId ?? "")
  const [terminalId, setTerminal] = useState(filters.terminalId ?? "")
  const [sessionId, setSession] = useState(filters.sessionId ?? "")
  const [receiptCriteriaOpen, setReceiptCriteriaOpen] = useState(false)
  const receiptCriteriaId = useId()
  const receipts = filters.view === "receipts" && !attention
  const terminals = options.terminals.filter(option => !locationId || option.locationId === locationId)
  const sessions = options.sessions.filter(option => (
    (!locationId || option.locationId === locationId) && (!terminalId || option.terminalId === terminalId)
  ))

  return (
    <form action={path} method="get" aria-label={copy.filters} className="grid gap-4">
      <input name="view" type="hidden" value={attention ? "attention" : filters.view} />
      {!attention && <div className={cn("grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]", receipts && "xl:grid-cols-[minmax(0,1fr)_minmax(23rem,1fr)_auto]")}>
        <label className={labelClass}>
          {copy.search}
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--dash-text-soft)]" aria-hidden="true" />
            <Input
              name="search"
              type="search"
              autoComplete="off"
              maxLength={120}
              defaultValue={filters.search}
              placeholder={copy.searchPlaceholder}
              className={cn(criteriaInputClass, "pl-9")}
            />
          </span>
        </label>
        <Button type="submit" className={cn("dashboard-button-primary min-h-11 rounded-lg sm:col-start-2 sm:row-start-1", receipts && "xl:col-start-3")}>
          {copy.apply}
        </Button>
        {receipts && (
          <>
            <Button type="button" variant="outline" aria-expanded={receiptCriteriaOpen} aria-controls={receiptCriteriaId}
              onClick={() => setReceiptCriteriaOpen(open => !open)}
              className="dashboard-button-secondary min-h-11 justify-self-start rounded-lg sm:col-span-2 xl:hidden">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              {copy.receiptCriteria}
            </Button>
            <fieldset id={receiptCriteriaId} className={cn("min-w-0 grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:grid", receiptCriteriaOpen ? "grid" : "hidden")}>
              <legend className="sr-only">{copy.receiptCriteria}</legend>
              <label className={cn(labelClass, "col-span-2 sm:col-span-1")}>
                {copy.receiptTotal} ({activity.currency})
                <Input name="total" inputMode="decimal" maxLength={15} autoComplete="off" defaultValue={filters.total ?? ""} className={criteriaInputClass} />
              </label>
              <label className={labelClass}>
                {copy.fromTime}
                <Input name="fromTime" type="time" defaultValue={filters.fromTime ?? ""} className={criteriaInputClass} />
              </label>
              <label className={labelClass}>
                {copy.toTime}
                <Input name="toTime" type="time" defaultValue={filters.toTime ?? ""} className={criteriaInputClass} />
              </label>
            </fieldset>
          </>
        )}
      </div>}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className={labelClass}>
          {copy.date}
          <Input type="date" name="date" defaultValue={activity.date} max={activity.today} required className="dashboard-control min-h-11 w-full min-w-0 rounded-lg bg-[var(--dash-surface)]" />
        </label>
        <label className={labelClass}>
          {copy.location}
          <select name="locationId" value={locationId} className={selectClass} onChange={event => {
            setLocation(event.target.value)
            setTerminal("")
            setSession("")
          }}>
            <option value="">{copy.allLocations}</option>
            {options.locations.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          {copy.terminal}
          <select name="terminalId" value={terminalId} className={selectClass} onChange={event => {
            setTerminal(event.target.value)
            setSession("")
          }}>
            <option value="">{copy.allTerminals}</option>
            {terminals.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          {copy.shift}
          <select name="sessionId" value={sessionId} className={selectClass} onChange={event => setSession(event.target.value)}>
            <option value="">{copy.allShifts}</option>
            {sessions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {attention && <Button type="submit" className="dashboard-button-primary min-h-11 justify-self-start rounded-lg">{copy.apply}</Button>}
    </form>
  )
}
