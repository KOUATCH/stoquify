import { DataTableSearch } from "./DataTableSearch";
import React, { useState } from "react";

function stringifySearchValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stringifySearchValue).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(stringifySearchValue)
      .join(" ");
  }
  return String(value);
}

export default function SearchBar<TData>({
  data,
  onSearch,
  setIsSearchActive,
  placeholder = "Search table data...",
  clearButtonLabel = "Clear table search",
  resetKey,
  variant = "default",
}: {
  data: TData[];
  onSearch: (data: TData[]) => void;
  setIsSearchActive: (isSearchActive: boolean) => void;
  placeholder?: string;
  clearButtonLabel?: string;
  resetKey?: number;
  variant?: "default" | "landing";
}) {
  const [searchTerm, setSearchTerm] = useState("");

  React.useEffect(() => {
    setSearchTerm("");
  }, [resetKey]);

  const runSearch = (value: string) => {
    const query = value.trim().toLowerCase();
    const filteredData = query
      ? data.filter((item) => stringifySearchValue(item).toLowerCase().includes(query))
      : data;

    setIsSearchActive(Boolean(query));
    onSearch(filteredData);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    runSearch(value);
  };

  return (
    <DataTableSearch
      type="text"
      value={searchTerm}
      onChange={handleSearch}
      placeholder={placeholder}
      clearButtonLabel={clearButtonLabel}
      variant={variant}
    />
  );
}
