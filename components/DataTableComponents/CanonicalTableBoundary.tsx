"use client"

import type { ReactNode } from "react"
import {
  type CanonicalTableContract,
  type CanonicalTableQuery,
  type CanonicalTableSelection,
  type CanonicalTableStateKind,
  type TableDensity,
  type TableLocale,
  canonicalTableQueryFingerprint,
  canonicalTableStateAnnouncement,
  formatCanonicalSelection,
} from "./table-system-contract"

export function CanonicalTableBoundary({
  contract,
  locale,
  query,
  state,
  selection,
  density,
  children,
}: {
  contract: CanonicalTableContract
  locale: TableLocale
  query: CanonicalTableQuery
  state: CanonicalTableStateKind
  selection?: CanonicalTableSelection | null
  density?: TableDensity
  children: ReactNode
}) {
  const announcement = [
    canonicalTableStateAnnouncement(state, locale),
    formatCanonicalSelection(selection ?? null, locale),
  ].filter(Boolean).join(". ")

  return (
    <section
      aria-label={contract.labels[locale]}
      aria-busy={state === "loading" || state === "refreshing"}
      data-table-id={contract.id}
      data-table-state={state}
      data-table-version={contract.version}
      data-table-archetype={contract.archetype}
      data-query-fingerprint={canonicalTableQueryFingerprint(query)}
      data-selection-scope={selection?.kind ?? "none"}
      data-density={density ?? "comfortable"}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {children}
    </section>
  )
}
