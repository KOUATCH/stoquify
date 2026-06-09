"use client";
import {
  filterByLast7Days,
  filterByThisMonth,
  filterByThisYear,
  filterByToday,
  filterByYesterday,
} from "@/lib/dateFilters";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DateFilters({
  data,
  onFilter,
  setIsDateFilterActive,
  variant = "default",
}: {
  data: any[];
  onFilter: any;
  setIsDateFilterActive: (isDateFilterActive: boolean) => void;
  variant?: "default" | "landing";
}) {
  const options = [
    { value: "life", label: "Life time" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last-7-days", label: "Last 7 days" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This year" },
  ];
  const [selectedFilter, setSelectedFilter] = useState(options[0].value);
  const isLanding = variant === "landing";

  const handleChange = (valueString: string) => {
    if (!valueString) return;

    setSelectedFilter(valueString);
    setIsDateFilterActive(valueString !== "life");
    if (valueString === "life") {
      onFilter(data);
    } else if (valueString === "today") {
      const filteredData = filterByToday(data);
      onFilter(filteredData);
    } else if (valueString === "yesterday") {
      const filteredData = filterByYesterday(data);
      onFilter(filteredData);
    } else if (valueString === "last-7-days") {
      const filteredData = filterByLast7Days(data);
      onFilter(filteredData);
    } else if (valueString === "month") {
      const filteredData = filterByThisMonth(data);
      onFilter(filteredData);
    } else if (valueString === "year") {
      const filteredData = filterByThisYear(data);
      onFilter(filteredData);
    }
  };

  return (
    <div className="w-full sm:w-[150px]">
      <Select
        value={selectedFilter}
        onValueChange={handleChange}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-full rounded-lg",
            isLanding && "dashboard-control border-[var(--dash-border-subtle)] text-[var(--dash-text)]"
          )}
        >
          <SelectValue placeholder="Date filter" />
        </SelectTrigger>
        <SelectContent className={cn(isLanding && "border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]")}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
