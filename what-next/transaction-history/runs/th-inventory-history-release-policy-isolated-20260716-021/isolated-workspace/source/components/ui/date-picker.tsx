"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  showTimeSelect?: boolean
  disabled?: boolean
  className?: string
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  showTimeSelect: _showTimeSelect,
  disabled = false,
  className,
  align = "start",
  side = "bottom",
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onDateChange?.(selectedDate)
    setOpen(false)
  }

  const modifiers = React.useMemo(() => {
    const disabled = []
    if (minDate) disabled.push({ before: minDate })
    if (maxDate) disabled.push({ after: maxDate })
    return disabled.length > 0 ? { disabled } : undefined
  }, [minDate, maxDate])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align} side={side}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={modifiers?.disabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
  minDate?: Date
  maxDate?: Date
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Pick a date range",
  disabled = false,
  className,
  align = "start",
  side = "bottom",
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleDateSelect = (range: DateRange | undefined) => {
    onDateRangeChange?.(range)
    if (range?.from && range?.to) {
      setOpen(false)
    }
  }

  const modifiers = React.useMemo(() => {
    const disabled = []
    if (minDate) disabled.push({ before: minDate })
    if (maxDate) disabled.push({ after: maxDate })
    return disabled.length > 0 ? { disabled } : undefined
  }, [minDate, maxDate])

  const formatDateRange = () => {
    if (!dateRange?.from) return placeholder
    if (!dateRange.to) return format(dateRange.from, "LLL dd, y")
    return `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange?.from && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{formatDateRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align} side={side}>
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleDateSelect}
          disabled={modifiers?.disabled}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface TimePickerProps {
  time?: string
  onTimeChange?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TimePicker({
  time,
  onTimeChange,
  placeholder = "Select time",
  disabled = false,
  className,
}: TimePickerProps) {
  const [hours, setHours] = React.useState(time ? time.split(':')[0] : '09')
  const [minutes, setMinutes] = React.useState(time ? time.split(':')[1] : '00')

  React.useEffect(() => {
    if (time) {
      const [h, m] = time.split(':')
      setHours(h)
      setMinutes(m)
    }
  }, [time])

  React.useEffect(() => {
    onTimeChange?.(`${hours}:${minutes}`)
  }, [hours, minutes, onTimeChange])

  return (
    <div className={cn("flex gap-2 items-center", className)}>
      <select
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i.toString().padStart(2, '0')}>
            {i.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {Array.from({ length: 60 }, (_, i) => (
          <option key={i} value={i.toString().padStart(2, '0')}>
            {i.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  )
}

interface DateTimePickerProps {
  datetime?: Date
  onDateTimeChange?: (datetime: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

export function DateTimePicker({
  datetime,
  onDateTimeChange,
  placeholder = "Pick date and time",
  disabled = false,
  className,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(datetime)
  const [time, setTime] = React.useState<string>(
    datetime ? format(datetime, 'HH:mm') : '09:00'
  )

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate)
    if (newDate && time) {
      const [hours, minutes] = time.split(':')
      const combined = new Date(newDate)
      combined.setHours(parseInt(hours), parseInt(minutes))
      onDateTimeChange?.(combined)
    } else {
      onDateTimeChange?.(undefined)
    }
  }

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    if (date && newTime) {
      const [hours, minutes] = newTime.split(':')
      const combined = new Date(date)
      combined.setHours(parseInt(hours), parseInt(minutes))
      onDateTimeChange?.(combined)
    }
  }

  React.useEffect(() => {
    if (datetime) {
      setDate(datetime)
      setTime(format(datetime, 'HH:mm'))
    }
  }, [datetime])

  return (
    <div className={cn("space-y-2", className)}>
      <DatePicker
        date={date}
        onDateChange={handleDateChange}
        placeholder="Pick a date"
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
      />
      <TimePicker
        time={time}
        onTimeChange={handleTimeChange}
        disabled={disabled || !date}
        placeholder="Select time"
      />
    </div>
  )
}
