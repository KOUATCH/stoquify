import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

const modules = [
  ["pos", "/dashboard/pos", "bg-[var(--signal-up)]"],
  ["inventory", "/dashboard/inventory", "bg-[var(--signal-warn)]"],
  ["purchasing", "/dashboard/purchase-orders", "bg-[var(--accent)]"],
  ["finance", "/dashboard/finance", "bg-[var(--signal-info)]"],
  ["accounting", "/dashboard/accounting", "bg-[var(--editorial)]"],
  ["compliance", "/dashboard/compliance", "bg-[var(--signal-down)]"],
  ["reconciliation", "/dashboard/finance/reconciliation", "bg-[var(--signal-info)]"],
  ["payroll", "/dashboard/payroll", "bg-[var(--copper)]"],
  ["customers", "/dashboard/customers", "bg-[var(--signal-up)]"],
  ["suppliers", "/dashboard/purchases/suppliers", "bg-[var(--signal-warn)]"],
  ["users", "/dashboard/settings/users", "bg-[var(--editorial)]"],
  ["roles", "/dashboard/settings/roles", "bg-[var(--copper)]"],
]

export function OperationsMap() {
  const t = useTranslations("landing.operations")

  return (
    <section className="section-divider bg-[var(--ink-1)] px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4">{t("eyebrow")}</div>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
          <p className="body-text text-lg leading-8 text-[var(--text-lo)]">{t("description")}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {modules.map(([key, href, color]) => (
            <Link key={key} href={href} className="glass-panel group rounded-lg p-5 transition hover:-translate-y-1 hover:border-[var(--rule-3)]">
              <div className="flex items-center justify-between">
                <div className="data-text text-xs uppercase tracking-[0.18em] text-[var(--accent-hi)]">{t("moduleLabel")}</div>
                <span className={`h-2 w-8 rounded ${color}`} />
              </div>
              <div className="mt-3 body-text text-xl font-semibold text-[var(--text-hi)]">{t(`modules.${key}.name`)}</div>
              <div className="mt-2 body-text text-sm text-[var(--text-faint)]">{t(`modules.${key}.description`)}</div>
              <div className="mt-6 rounded-lg bg-white/[0.06] px-3 py-2 data-text text-xs text-[var(--signal-info)]">{t(`modules.${key}.meta`)}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
