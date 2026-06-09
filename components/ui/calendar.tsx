"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 text-[#f7faf8]", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold text-[#f7faf8]",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 border-[rgba(84,112,122,0.62)] bg-[rgba(37,57,67,0.72)] p-0 text-[#d3ddd8] opacity-80 hover:bg-[rgba(73,198,229,0.14)] hover:text-[#f7faf8] hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "rounded-md w-8 font-normal text-[0.8rem] text-[#a9b8b2]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-[rgba(73,198,229,0.14)] [&:has([aria-selected].day-outside)]:bg-[rgba(73,198,229,0.08)] [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal text-[#d3ddd8] hover:bg-[rgba(73,198,229,0.14)] hover:text-[#f7faf8] aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-[#2f7df6] text-white hover:bg-[#5796ff] hover:text-white focus:bg-[#5796ff] focus:text-white",
        day_today: "bg-[rgba(215,168,79,0.18)] text-[#f7faf8]",
        day_outside:
          "day-outside text-[#7e9189] aria-selected:bg-[rgba(73,198,229,0.08)] aria-selected:text-[#a9b8b2]",
        day_disabled: "text-[#7e9189] opacity-50",
        day_range_middle:
          "aria-selected:bg-[rgba(73,198,229,0.14)] aria-selected:text-[#f7faf8]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
