"use client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { filterByDateRange } from "@/lib/dateFilters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import React from "react";
import { DateRange } from "react-day-picker";
export default function DateRangeFilter({
  data,
  onFilter,
  setIsDateFilterActive,
  className,
  variant = "default",
}: {
  data: any[];
  onFilter: any;
  setIsDateFilterActive: (isDateFilterActive: boolean) => void;
  className?: string
  variant?: "default" | "landing"
}) {
  const [date, setDate] = React.useState<DateRange | undefined>();
  const isLanding = variant === "landing";

  const handleChange = (selectedDate?: DateRange) => {
    setDate(selectedDate);

    if (!selectedDate?.from || !selectedDate?.to) {
      setIsDateFilterActive(false);
      onFilter(data);
      return;
    }

    setIsDateFilterActive(true);
    const filteredData = filterByDateRange(
      data,
      selectedDate.from.toISOString(),
      selectedDate.to.toISOString()
    );
    onFilter(filteredData);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "h-9 w-full justify-start rounded-lg text-left font-normal sm:w-[230px]",
              isLanding && "dashboard-button-secondary border-[var(--dash-border-subtle)]",
              !date && (isLanding ? "text-[var(--dash-text-faint)]" : "text-muted-foreground")
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-auto p-0",
            isLanding && "border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]"
          )}
          align="start"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(value) => handleChange(value)}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
