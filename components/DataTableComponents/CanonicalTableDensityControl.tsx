"use client"

import type { TableDensity, TableLocale } from "./table-system-contract"

const COPY = {
  en: { label: "Table density", comfortable: "Comfortable", compact: "Compact" },
  fr: { label: "Densite du tableau", comfortable: "Confortable", compact: "Compacte" },
} as const

export function CanonicalTableDensityControl({
  density,
  locale,
  onDensityChange,
}: {
  density: TableDensity
  locale: TableLocale
  onDensityChange: (density: TableDensity) => void
}) {
  const copy = COPY[locale]
  return (
    <div
      role="group"
      aria-label={copy.label}
      className="inline-flex rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-1"
    >
      {(["comfortable", "compact"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={density === value}
          onClick={() => onDensityChange(value)}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--dash-text-soft)] transition-colors aria-pressed:bg-[var(--dash-brand-soft)] aria-pressed:text-[var(--dash-brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]"
        >
          {copy[value]}
        </button>
      ))}
    </div>
  )
}
