"use client"

import { format } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"

export type TableDateRangeValue = {
  from?: string
  to?: string
}

type TableDateRangePickerProps = {
  value?: TableDateRangeValue
  defaultValue?: TableDateRangeValue
  onChange?: (value: TableDateRangeValue) => void
  locale?: Locale
  placeholder?: string
  ariaLabel?: string
  fromName?: string
  toName?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  variant?: "default" | "landing"
}

function parseDateOnly(value?: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDateOnly(value?: Date) {
  return value ? format(value, "yyyy-MM-dd") : undefined
}

export function TableDateRangePicker({
  value,
  defaultValue,
  onChange,
  locale = "en",
  placeholder,
  ariaLabel,
  fromName,
  toName,
  disabled = false,
  className,
  triggerClassName,
  variant = "landing",
}: TableDateRangePickerProps) {
  const [internalValue, setInternalValue] = useState<TableDateRangeValue>(defaultValue ?? {})
  const currentValue = value ?? internalValue
  const dateLocale = locale === "fr" ? fr : enUS
  const resolvedPlaceholder = placeholder ?? (locale === "fr" ? "Période" : "Date range")

  const selected = useMemo<DateRange | undefined>(() => {
    const from = parseDateOnly(currentValue.from)
    const to = parseDateOnly(currentValue.to)
    return from || to ? { from, to } : undefined
  }, [currentValue.from, currentValue.to])

  const handleSelect = (nextRange?: DateRange) => {
    const nextValue = {
      from: formatDateOnly(nextRange?.from),
      to: formatDateOnly(nextRange?.to),
    }
    if (value === undefined) setInternalValue(nextValue)
    onChange?.(nextValue)
  }

  const rangeLabel = selected?.from
    ? selected.to
      ? format(selected.from, "LLL dd, y", { locale: dateLocale }) + " - " + format(selected.to, "LLL dd, y", { locale: dateLocale })
      : format(selected.from, "LLL dd, y", { locale: dateLocale })
    : resolvedPlaceholder

  return (
    <div className={cn("grid gap-2", className)}>
      {fromName ? <input type="hidden" name={fromName} value={currentValue.from ?? ""} /> : null}
      {toName ? <input type="hidden" name={toName} value={currentValue.to ?? ""} /> : null}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel ?? resolvedPlaceholder}
            className={cn(
              "h-9 w-full justify-start rounded-lg text-left font-normal sm:w-[230px]",
              variant === "landing" && "dashboard-button-secondary border-[var(--dash-border-subtle)]",
              !selected && (variant === "landing" ? "text-[var(--dash-text-faint)]" : "text-muted-foreground"),
              triggerClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{rangeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-auto p-0",
            variant === "landing" && "border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]",
          )}
          align="start"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selected?.from}
            selected={selected}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={dateLocale}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
