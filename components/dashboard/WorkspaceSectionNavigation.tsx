import { ArrowDown } from "lucide-react"

/** Local section links keep long workspaces navigable without hiding their records. */
export function WorkspaceSectionNavigation({ label, items }: {
  label: string
  items: ReadonlyArray<{ id: string; label: string }>
}) {
  return (
    <nav aria-label={label} className="flex min-w-0 flex-wrap gap-2">
      {items.map((item, index) => (
        <a key={item.id} href={`#${item.id}`} className="dashboard-filter-chip inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--dash-text-soft)] transition-colors hover:border-[var(--dash-brand)] hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">
          <span aria-hidden="true" className="text-xs tabular-nums text-[var(--dash-text-faint)]">{String(index + 1).padStart(2, "0")}</span>
          <span>{item.label}</span>
          <ArrowDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        </a>
      ))}
    </nav>
  )
}
