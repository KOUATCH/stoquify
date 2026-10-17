"use client"

import { useState } from "react"
import { format } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker"
import DateFilter from "@/components/ui/date-filter"
import { TableDateRangePicker, type TableDateRangeValue } from "@/components/DataTableComponents/TableDateRangePicker"

const day = (n: number) => new Date(2026, 9, n)
const dateOnly = (date?: Date) => date ? format(date, "yyyy-MM-dd") : null

export default function CalendarFixture({ locale, scenario }: { locale: string; scenario: string }) {
  const [date, setDate] = useState<Date | undefined>(day(15))
  const [range, setRange] = useState<DateRange | undefined>({ from: day(28) })
  const [table, setTable] = useState<TableDateRangeValue>({ from: "2026-10-10", to: "2026-10-12" })
  const [filter, setFilter] = useState<unknown>(null)
  const result = scenario === "table" ? table : scenario === "filter" ? filter
    : scenario.includes("range") ? { from: dateOnly(range?.from), to: dateOnly(range?.to) } : dateOnly(date)

  return <main className="dashboard-landing-theme dark min-h-screen p-4">
    <h1>Calendar compatibility fixture</h1>
    <p>Local synthetic inputs; no application actions or database.</p>
    <div className="dashboard-landing-content mt-4">
      {scenario === "single" && <Calendar mode="single" defaultMonth={day(1)} today={day(17)} selected={date} onSelect={setDate} locale={locale === "fr" ? fr : enUS} disabled={[{ before: day(10) }, { after: day(20) }]} initialFocus />}
      {scenario === "range" && <Calendar mode="range" defaultMonth={day(1)} today={day(17)} selected={range} onSelect={setRange} locale={locale === "fr" ? fr : enUS} numberOfMonths={2} initialFocus />}
      {scenario === "picker" && <DatePicker date={date} onDateChange={setDate} minDate={day(10)} maxDate={day(20)} />}
      {scenario === "range-picker" && <DateRangePicker dateRange={range} onDateRangeChange={setRange} />}
      {scenario === "table" && <TableDateRangePicker locale={locale === "fr" ? "fr" : "en"} value={table} onChange={setTable} fromName="from" toName="to" />}
      {scenario === "filter" && <DateFilter onFilterChange={(value, option) => setFilter({ option, from: dateOnly(value?.from), to: dateOnly(value?.to), startHour: value?.from?.getHours(), endHour: value?.to?.getHours() })} />}
    </div>
    <output data-testid="result" className="block mt-4">{JSON.stringify(result)}</output>
    <button type="button" className="mt-4" onClick={() => { setDate(undefined); setRange(undefined) }}>Fixture reset</button>
  </main>
}
