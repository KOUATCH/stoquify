"use client";
import { filterByDateRange } from "@/lib/dateFilters";
import React from "react";
import {
  TableDateRangePicker,
  type TableDateRangeValue,
} from "./TableDateRangePicker";
export default function DateRangeFilter({
  data,
  onFilter,
  setIsDateFilterActive,
  className,
  locale = "en",
  placeholder,
  resetKey,
  variant = "default",
}: {
  data: any[];
  onFilter: any;
  setIsDateFilterActive: (isDateFilterActive: boolean) => void;
  className?: string
  locale?: "en" | "fr"
  placeholder?: string
  resetKey?: number
  variant?: "default" | "landing"
}) {
  const [date, setDate] = React.useState<TableDateRangeValue>({});

  React.useEffect(() => {
    setDate({});
  }, [resetKey]);

  const handleChange = (selectedDate: TableDateRangeValue) => {
    setDate(selectedDate);

    if (!selectedDate.from || !selectedDate.to) {
      setIsDateFilterActive(false);
      onFilter(data);
      return;
    }

    setIsDateFilterActive(true);
    const filteredData = filterByDateRange(
      data,
      selectedDate.from,
      selectedDate.to
    );
    onFilter(filteredData);
  };

  return (
    <TableDateRangePicker
      value={date}
      onChange={handleChange}
      className={className}
      locale={locale}
      placeholder={placeholder}
      variant={variant}
    />
  );
}
