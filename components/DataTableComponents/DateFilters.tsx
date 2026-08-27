"use client";
import {
  filterByLast7Days,
  filterByThisMonth,
  filterByThisYear,
  filterByToday,
  filterByYesterday,
} from "@/lib/dateFilters";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
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
  className,
  locale = "en",
  label,
  copy,
  resetKey,
  variant = "default",
}: {
  data: any[];
  onFilter: any;
  setIsDateFilterActive: (isDateFilterActive: boolean) => void;
  className?: string;
  locale?: "en" | "fr";
  label?: string;
  copy?: Partial<{
    allTime: string;
    today: string;
    yesterday: string;
    last7Days: string;
    thisMonth: string;
    thisYear: string;
  }>;
  resetKey?: number;
  variant?: "default" | "landing";
}) {
  const defaultCopy = locale === "fr"
    ? {
      allTime: "Toutes les dates",
      today: "Aujourd'hui",
      yesterday: "Hier",
      last7Days: "7 derniers jours",
      thisMonth: "Ce mois-ci",
      thisYear: "Cette année",
    }
    : {
      allTime: "All time",
      today: "Today",
      yesterday: "Yesterday",
      last7Days: "Last 7 days",
      thisMonth: "This month",
      thisYear: "This year",
    };
  const resolvedCopy = { ...defaultCopy, ...copy };
  const resolvedLabel = label ?? (locale === "fr" ? "Filtrer" : "Filter");
  const options = [
    { value: "life", label: resolvedCopy.allTime },
    { value: "today", label: resolvedCopy.today },
    { value: "yesterday", label: resolvedCopy.yesterday },
    { value: "last-7-days", label: resolvedCopy.last7Days },
    { value: "month", label: resolvedCopy.thisMonth },
    { value: "year", label: resolvedCopy.thisYear },
  ];
  const [selectedFilter, setSelectedFilter] = useState(options[0].value);
  const isLanding = variant === "landing";

  useEffect(() => {
    setSelectedFilter("life");
  }, [resetKey]);

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
    <div className={cn("w-full sm:w-[150px]", className)}>
      <Select
        value={selectedFilter}
        onValueChange={handleChange}
      >
        <SelectTrigger
          aria-label={resolvedLabel}
          className={cn(
            "h-9 w-full rounded-lg",
            isLanding && "dashboard-control border-[var(--dash-border-subtle)] text-[var(--dash-text)]"
          )}
        >
          <SelectValue placeholder={resolvedLabel} />
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
