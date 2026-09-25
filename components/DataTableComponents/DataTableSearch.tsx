"use client"

import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function DataTableSearch({
  value,
  onChange,
  placeholder = "Search table data...",
  ariaLabel = placeholder,
  clearButtonLabel = "Clear table search",
  variant = "landing",
  type = "search",
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  clearButtonLabel?: string
  variant?: "default" | "landing"
  type?: "text" | "search"
}) {
  const isLanding = variant === "landing"
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search aria-hidden="true" className={cn("h-4 w-4", isLanding ? "text-[var(--dash-text-faint)]" : "text-slate-300")} />
      </div>
      <input
        type={type}
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "block w-full rounded-lg py-1.5 pl-9 pr-9 shadow-sm sm:text-sm sm:leading-6",
          isLanding
            ? "dashboard-control h-9 text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)]"
            : "border-0 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-rose-600",
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label={clearButtonLabel}
          onClick={() => onChange("")}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors",
            isLanding
              ? "text-[var(--dash-text-faint)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
          )}
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
