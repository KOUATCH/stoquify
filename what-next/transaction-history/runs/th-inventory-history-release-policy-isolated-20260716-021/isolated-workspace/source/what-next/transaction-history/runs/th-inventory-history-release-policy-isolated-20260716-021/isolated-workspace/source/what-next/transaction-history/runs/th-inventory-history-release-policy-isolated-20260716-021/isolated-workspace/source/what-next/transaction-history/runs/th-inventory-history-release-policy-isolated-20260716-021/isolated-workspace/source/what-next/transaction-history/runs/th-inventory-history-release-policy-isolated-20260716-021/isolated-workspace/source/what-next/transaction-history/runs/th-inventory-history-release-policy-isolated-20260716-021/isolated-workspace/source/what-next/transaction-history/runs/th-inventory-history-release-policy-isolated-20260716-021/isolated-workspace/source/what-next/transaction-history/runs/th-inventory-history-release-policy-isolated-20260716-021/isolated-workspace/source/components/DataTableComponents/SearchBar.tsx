import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
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
  variant = "default",
}: {
  data: TData[];
  onSearch: (data: TData[]) => void;
  setIsSearchActive: (isSearchActive: boolean) => void;
  placeholder?: string;
  variant?: "default" | "landing";
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const isLanding = variant === "landing";

  const runSearch = (value: string) => {
    const query = value.trim().toLowerCase();
    const filteredData = query
      ? data.filter((item) => stringifySearchValue(item).toLowerCase().includes(query))
      : data;

    setIsSearchActive(Boolean(query));
    onSearch(filteredData);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    runSearch(value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    runSearch("");
  };

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className={cn("h-4 w-4", isLanding ? "text-[var(--dash-text-faint)]" : "text-slate-300")} />
      </div>
      <input
        id="search"
        name="search"
        type="text"
        autoComplete="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearch}
        className={cn(
          "block w-full rounded-lg py-1.5 pl-9 pr-9 shadow-sm sm:text-sm sm:leading-6",
          isLanding
            ? "dashboard-control h-9 text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)]"
            : "border-0 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-rose-600"
        )}
      />
      {searchTerm ? (
        <button
          type="button"
          aria-label="Clear table search"
          onClick={clearSearch}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors",
            isLanding
              ? "text-[var(--dash-text-faint)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
